// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

use cumulus_pallet_xcm;
use frame_support::{
	{match_types, parameter_types, weights::Weight},
	pallet_prelude::Get,
	traits::{Contains, Everything, fungibles},
};
use frame_system::EnsureRoot;
use orml_traits::{location::AbsoluteReserveProvider, parameter_type_with_key};
use pallet_xcm::XcmPassthrough;
use polkadot_parachain::primitives::Sibling;
use sp_runtime::traits::{AccountIdConversion, CheckedConversion, Convert, Zero};
use sp_std::{borrow::Borrow, marker::PhantomData, vec, vec::Vec};
use xcm::{
	latest::{MultiAsset, Xcm},
	prelude::{Concrete, Fungible as XcmFungible},
	v1::{BodyId, Junction::*, Junctions::*, MultiLocation, NetworkId},
};
use xcm_builder::{
	AccountId32Aliases, AllowTopLevelPaidExecutionFrom, AllowUnpaidExecutionFrom, EnsureXcmOrigin,
	FixedWeightBounds, FungiblesAdapter, LocationInverter, ParentAsSuperuser, ParentIsPreset,
	RelayChainAsNative, SiblingParachainAsNative, SiblingParachainConvertsVia,
	SignedAccountId32AsNative, SignedToAccountId32, SovereignSignedViaLocation, TakeWeightCredit,
	ConvertedConcreteAssetId,
};
use xcm_executor::{
	{Config, XcmExecutor},
	traits::{Convert as ConvertXcm, FilterAssetLocation, JustTry, MatchesFungible, ShouldExecute},
};

use up_common::{
	constants::{MAXIMUM_BLOCK_WEIGHT, UNIQUE},
	types::{AccountId, Balance},
};

use crate::{
	Balances, Call, DmpQueue, Event, ForeingAssets, Origin, ParachainInfo, ParachainSystem,
	PolkadotXcm, Runtime, XcmpQueue,
};
use crate::runtime_common::config::substrate::{TreasuryModuleId, MaxLocks, MaxReserves};
use crate::runtime_common::config::pallets::TreasuryAccountId;
use crate::runtime_common::config::xcm::*;
use crate::*;

use pallet_foreing_assets::{
	AssetIds, AssetIdMapping, XcmForeignAssetIdMapping, CurrencyId, NativeCurrency, FreeForAll,
	TryAsForeing, ForeignAssetId,
};

// Signed version of balance
pub type Amount = i128;

parameter_types! {
	pub const RelayLocation: MultiLocation = MultiLocation::parent();
	pub const RelayNetwork: NetworkId = NetworkId::Polkadot;
	pub RelayOrigin: Origin = cumulus_pallet_xcm::Origin::Relay.into();
	pub Ancestry: MultiLocation = Parachain(ParachainInfo::parachain_id().into()).into();
	pub SelfLocation: MultiLocation = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));
}

/// This is the type we use to convert an (incoming) XCM origin into a local `Origin` instance,
/// ready for dispatching a transaction with Xcm's `Transact`. There is an `OriginKind` which can
/// biases the kind of local `Origin` it will become.
pub type XcmOriginToTransactDispatchOrigin = (
	// Sovereign account converter; this attempts to derive an `AccountId` from the origin location
	// using `LocationToAccountId` and then turn that into the usual `Signed` origin. Useful for
	// foreign chains who want to have a local sovereign account on this chain which they control.
	SovereignSignedViaLocation<LocationToAccountId, Origin>,
	// Native converter for Relay-chain (Parent) location; will converts to a `Relay` origin when
	// recognised.
	RelayChainAsNative<RelayOrigin, Origin>,
	// Native converter for sibling Parachains; will convert to a `SiblingPara` origin when
	// recognised.
	SiblingParachainAsNative<cumulus_pallet_xcm::Origin, Origin>,
	// Superuser converter for the Relay-chain (Parent) location. This will allow it to issue a
	// transaction from the Root origin.
	ParentAsSuperuser<Origin>,
	// Native signed account converter; this just converts an `AccountId32` origin into a normal
	// `Origin::Signed` origin of the same 32-byte value.
	SignedAccountId32AsNative<RelayNetwork, Origin>,
	// Xcm origins can be represented natively under the Xcm pallet's Xcm origin.
	XcmPassthrough<Origin>,
);

parameter_types! {
	// One XCM operation is 1_000_000 weight - almost certainly a conservative estimate.
	pub UnitWeightCost: Weight = 1_000_000;
	// 1200 UNIQUEs buy 1 second of weight.
	pub const WeightPrice: (MultiLocation, u128) = (MultiLocation::parent(), 1_200 * UNIQUE);
	pub const MaxInstructions: u32 = 100;
	pub const MaxAuthorities: u32 = 100_000;
}

match_types! {
	pub type ParentOrParentsUnitPlurality: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(Plurality { id: BodyId::Unit, .. }) }
	};
}

/// Execution barrier that just takes `max_weight` from `weight_credit`.
///
/// Useful to allow XCM execution by local chain users via extrinsics.
/// E.g. `pallet_xcm::reserve_asset_transfer` to transfer a reserve asset
/// out of the local chain to another one.
pub struct AllowAllDebug;
impl ShouldExecute for AllowAllDebug {
	fn should_execute<Call>(
		_origin: &MultiLocation,
		_message: &mut Xcm<Call>,
		max_weight: Weight,
		weight_credit: &mut Weight,
	) -> Result<(), ()> {
		Ok(())
	}
}

pub type Barrier = DenyThenTry<
	DenyTransact,
	(
		TakeWeightCredit,
		AllowTopLevelPaidExecutionFrom<Everything>,
		AllowUnpaidExecutionFrom<ParentOrParentsUnitPlurality>,
		// ^^^ Parent & its unit plurality gets free execution
		AllowAllDebug,
	)
>;

pub struct AllAsset;
impl FilterAssetLocation for AllAsset {
	fn filter_asset_location(asset: &MultiAsset, origin: &MultiLocation) -> bool {
		true
	}
}

pub struct CurrencyIdConvert;
impl Convert<AssetIds, Option<MultiLocation>> for CurrencyIdConvert {
	fn convert(id: AssetIds) -> Option<MultiLocation> {
		match id {
			AssetIds::NativeAssetId(NativeCurrency::Here) => Some(MultiLocation::new(
				1,
				X1(Parachain(ParachainInfo::get().into())),
			)),
			AssetIds::NativeAssetId(NativeCurrency::Parent) => Some(MultiLocation::parent()),
			AssetIds::ForeignAssetId(foreign_asset_id) => {
				XcmForeignAssetIdMapping::<Runtime>::get_multi_location(foreign_asset_id)
			}
		}
	}
}
impl Convert<MultiLocation, Option<CurrencyId>> for CurrencyIdConvert {
	fn convert(location: MultiLocation) -> Option<CurrencyId> {
		if location == MultiLocation::here()
			|| location == MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())))
		{
			return Some(AssetIds::NativeAssetId(NativeCurrency::Here));
		}

		if location == MultiLocation::parent() {
			return Some(AssetIds::NativeAssetId(NativeCurrency::Parent));
		}

		if let Some(currency_id) =
			XcmForeignAssetIdMapping::<Runtime>::get_currency_id(location.clone())
		{
			return Some(currency_id);
		}

		None
	}
}

pub fn get_all_module_accounts() -> Vec<AccountId> {
	vec![TreasuryModuleId::get().into_account_truncating()]
}

pub struct DustRemovalWhitelist;
impl Contains<AccountId> for DustRemovalWhitelist {
	fn contains(a: &AccountId) -> bool {
		get_all_module_accounts().contains(a)
	}
}

parameter_type_with_key! {
	pub ExistentialDeposits: |currency_id: CurrencyId| -> Balance {
		match currency_id {
			CurrencyId::NativeAssetId(symbol) => match symbol {
				NativeCurrency::Here => 0,
				NativeCurrency::Parent=> 0,
			},
			_ => 100_000
		}
	};
}

impl orml_tokens::Config for Runtime {
	type Event = Event;
	type Balance = Balance;
	type Amount = Amount;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type ExistentialDeposits = ExistentialDeposits;
	type OnDust = orml_tokens::TransferDust<Runtime, TreasuryAccountId>;
	type MaxLocks = MaxLocks;
	type MaxReserves = MaxReserves;
	// TODO: Add all module accounts
	type DustRemovalWhitelist = DustRemovalWhitelist;
	/// The id type for named reserves.
	type ReserveIdentifier = ();
	type OnNewTokenAccount = ();
	type OnKilledTokenAccount = ();
}

parameter_types! {
	pub const BaseXcmWeight: Weight = 100_000_000; // TODO: recheck this
	pub const MaxAssetsForTransfer: usize = 2;
}

parameter_type_with_key! {
	pub ParachainMinFee: |_location: MultiLocation| -> Option<u128> {
		Some(100_000_000_000)
	};
}

pub struct AccountIdToMultiLocation;
impl Convert<AccountId, MultiLocation> for AccountIdToMultiLocation {
	fn convert(account: AccountId) -> MultiLocation {
		X1(AccountId32 {
			network: NetworkId::Any,
			id: account.into(),
		})
		.into()
	}
}

impl orml_xtokens::Config for Runtime {
	type Event = Event;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type CurrencyIdConvert = CurrencyIdConvert;
	type AccountIdToMultiLocation = AccountIdToMultiLocation;
	type SelfLocation = SelfLocation;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
	type Weigher = FixedWeightBounds<UnitWeightCost, Call, MaxInstructions>;
	type BaseXcmWeight = BaseXcmWeight;
	type LocationInverter = LocationInverter<Ancestry>;
	type MaxAssetsForTransfer = MaxAssetsForTransfer;
	type MinXcmFee = ParachainMinFee;
	type MultiLocationsFilter = Everything;
	type ReserveProvider = AbsoluteReserveProvider;
}
