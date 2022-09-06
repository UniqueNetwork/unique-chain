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

use frame_support::{
	{match_types, parameter_types, weights::Weight},
	pallet_prelude::Get,
	traits::{Contains, Everything},
};
use orml_traits::{location::AbsoluteReserveProvider, parameter_type_with_key};
use sp_runtime::traits::{AccountIdConversion, Convert};
use sp_std::{vec, vec::Vec};
use xcm::{
	latest::Xcm,
	v1::{BodyId, Junction::*, Junctions::*, MultiLocation, NetworkId},
};
use xcm_builder::{
	AllowTopLevelPaidExecutionFrom, AllowUnpaidExecutionFrom, FixedWeightBounds, LocationInverter,
	TakeWeightCredit,
};
use xcm_executor::{XcmExecutor, traits::ShouldExecute};

use up_common::types::{AccountId, Balance};
use crate::{
	Call, Event, ParachainInfo, Runtime,
	runtime_common::config::{
		substrate::{TreasuryModuleId, MaxLocks, MaxReserves},
		pallets::TreasuryAccountId,
		xcm::*,
	},
};

use pallet_foreing_assets::{
	AssetIds, AssetIdMapping, XcmForeignAssetIdMapping, CurrencyId, NativeCurrency,
};

// Signed version of balance
pub type Amount = i128;

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
		_max_weight: Weight,
		_weight_credit: &mut Weight,
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
	),
>;

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

pub struct DustRemovalWhitelist;
impl Contains<AccountId> for DustRemovalWhitelist {
	fn contains(a: &AccountId) -> bool {
		get_all_module_accounts().contains(a)
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

parameter_types! {
	pub const BaseXcmWeight: Weight = 100_000_000; // TODO: recheck this
	pub const MaxAssetsForTransfer: usize = 2;

	pub Ancestry: MultiLocation = Parachain(ParachainInfo::parachain_id().into()).into();
	pub SelfLocation: MultiLocation = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));
}

parameter_type_with_key! {
	pub ParachainMinFee: |_location: MultiLocation| -> Option<u128> {
		Some(100_000_000_000)
	};
}

pub fn get_all_module_accounts() -> Vec<AccountId> {
	vec![TreasuryModuleId::get().into_account_truncating()]
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
