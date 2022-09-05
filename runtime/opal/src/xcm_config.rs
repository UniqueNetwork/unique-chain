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

/*
parameter_types! {
	pub const ReservedDmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT / 4;
	pub const ReservedXcmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT / 4;
}

impl cumulus_pallet_parachain_system::Config for Runtime {
	type Event = Event;
	type SelfParaId = parachain_info::Pallet<Self>;
	type OnSystemEvent = ();
	type OutboundXcmpMessageSource = XcmpQueue;
	type DmpMessageHandler = DmpQueue;
	type ReservedDmpWeight = ReservedDmpWeight;
	type ReservedXcmpWeight = ReservedXcmpWeight;
	type XcmpMessageHandler = XcmpQueue;
}

impl parachain_info::Config for Runtime {}

impl cumulus_pallet_aura_ext::Config for Runtime {}
 */

parameter_types! {
	pub const RelayLocation: MultiLocation = MultiLocation::parent();
	pub const RelayNetwork: NetworkId = NetworkId::Polkadot;
	pub RelayOrigin: Origin = cumulus_pallet_xcm::Origin::Relay.into();
	pub Ancestry: MultiLocation = Parachain(ParachainInfo::parachain_id().into()).into();
	pub SelfLocation: MultiLocation = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));
}

/*
/// Type for specifying how a `MultiLocation` can be converted into an `AccountId`. This is used
/// when determining ownership of accounts for asset transacting and when attempting to use XCM
/// `Transact` in order to determine the dispatch Origin.
pub type LocationToAccountId = (
	// The parent (Relay-chain) origin converts to the default `AccountId`.
	ParentIsPreset<AccountId>,
	// Sibling parachain origins convert to AccountId via the `ParaId::into`.
	SiblingParachainConvertsVia<Sibling, AccountId>,
	// Straight up local `AccountId32` origins just alias directly to `AccountId`.
	AccountId32Aliases<RelayNetwork, AccountId>,
);

pub struct OnlySelfCurrency;

impl<B: TryFrom<u128>> MatchesFungible<B> for OnlySelfCurrency {
	fn matches_fungible(a: &MultiAsset) -> Option<B> {
		match (&a.id, &a.fun) {
			(Concrete(_), XcmFungible(ref amount)) => CheckedConversion::checked_from(*amount),
			_ => None,
		}
	}
}

/// Means for transacting assets on this chain.
pub type LocalAssetTransactor = CurrencyAdapter<
	// Use this currency:
	Balances,
	// Use this currency when it is a fungible asset matching the given location or name:
	OnlySelfCurrency,
	// Do a simple punn to convert an AccountId32 MultiLocation into a native chain account ID:
	LocationToAccountId,
	// Our chain's account ID type (we can't get away without mentioning it explicitly):
	AccountId,
	// We don't track any teleports.
	(),
>;

 */

/*
parameter_types! {
	pub CheckingAccount: AccountId = PolkadotXcm::check_account();
}

/// Allow checking in assets that have issuance > 0.
pub struct NonZeroIssuance<AccountId, ForeingAssets>(PhantomData<(AccountId, ForeingAssets)>);
impl<AccountId, ForeingAssets> Contains<<ForeingAssets as fungibles::Inspect<AccountId>>::AssetId>
	for NonZeroIssuance<AccountId, ForeingAssets>
where
	ForeingAssets: fungibles::Inspect<AccountId>,
{
	fn contains(id: &<ForeingAssets as fungibles::Inspect<AccountId>>::AssetId) -> bool {
		!ForeingAssets::total_issuance(*id).is_zero()
	}
}

pub struct AsInnerId<AssetId, ConvertAssetId>(PhantomData<(AssetId, ConvertAssetId)>);
impl<AssetId: Clone + PartialEq, ConvertAssetId: ConvertXcm<AssetId, AssetId>>
	ConvertXcm<MultiLocation, AssetId> for AsInnerId<AssetId, ConvertAssetId>
where
	AssetId: Borrow<AssetId>,
	AssetId: TryAsForeing<AssetId, ForeignAssetId>,
	AssetIds: Borrow<AssetId>,
{
	fn convert_ref(id: impl Borrow<MultiLocation>) -> Result<AssetId, ()> {
		let id = id.borrow();

		log::trace!(
			target: "xcm::AsInnerId::Convert",
			"AsInnerId {:?}",
			id
		);

		let parent = MultiLocation::parent();
		let here = MultiLocation::here();
		let self_location = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));

		if *id == parent {
			return ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Parent));
		}

		if *id == here || *id == self_location {
			return ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Here));
		}

		match XcmForeignAssetIdMapping::<Runtime>::get_currency_id(id.clone()) {
			Some(AssetIds::ForeignAssetId(foreign_asset_id)) => {
				ConvertAssetId::convert_ref(AssetIds::ForeignAssetId(foreign_asset_id))
			}
			_ => ConvertAssetId::convert_ref(AssetIds::ForeignAssetId(0)),
		}
	}

	fn reverse_ref(what: impl Borrow<AssetId>) -> Result<MultiLocation, ()> {
		log::trace!(
			target: "xcm::AsInnerId::Reverse",
			"AsInnerId",
		);

		let asset_id = what.borrow();

		let parent_id =
			ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Parent)).unwrap();
		let here_id =
			ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Here)).unwrap();

		if asset_id.clone() == parent_id {
			return Ok(MultiLocation::parent());
		}

		if asset_id.clone() == here_id {
			return Ok(MultiLocation::new(
				1,
				X1(Parachain(ParachainInfo::get().into())),
			));
		}

		match <AssetId as TryAsForeing<AssetId, ForeignAssetId>>::try_as_foreing(asset_id.clone()) {
			Some(fid) => match XcmForeignAssetIdMapping::<Runtime>::get_multi_location(fid) {
				Some(location) => Ok(location),
				None => Err(()),
			},
			None => Err(()),
		}
	}
}

/// Means for transacting assets besides the native currency on this chain.
pub type FungiblesTransactor = FungiblesAdapter<
	// Use this fungibles implementation:
	ForeingAssets,
	// Use this currency when it is a fungible asset matching the given location or name:
	ConvertedConcreteAssetId<AssetIds, Balance, AsInnerId<AssetIds, JustTry>, JustTry>,
	// Convert an XCM MultiLocation into a local account id:
	LocationToAccountId,
	// Our chain's account ID type (we can't get away without mentioning it explicitly):
	AccountId,
	// We only want to allow teleports of known assets. We use non-zero issuance as an indication
	// that this asset is known.
	NonZeroIssuance<AccountId, ForeingAssets>,
	// The account to use for tracking teleports.
	CheckingAccount,
>;

/// Means for transacting assets on this chain.
pub type AssetTransactors = FungiblesTransactor;
 */

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

pub type Barrier = (
	TakeWeightCredit,
	AllowTopLevelPaidExecutionFrom<Everything>,
	AllowUnpaidExecutionFrom<ParentOrParentsUnitPlurality>,
	// ^^^ Parent & its unit plurality gets free execution
	AllowAllDebug,
);

pub struct AllAsset;
impl FilterAssetLocation for AllAsset {
	fn filter_asset_location(asset: &MultiAsset, origin: &MultiLocation) -> bool {
		true
	}
}

/* /// CHANGEME!!!
pub struct XcmConfig;
impl Config for XcmConfig {
	type Call = Call;
	type XcmSender = XcmRouter;
	// How to withdraw and deposit an asset.
	type AssetTransactor = AssetTransactors;
	type OriginConverter = XcmOriginToTransactDispatchOrigin;
	type IsReserve = AllAsset; //NativeAsset;
	type IsTeleporter = (); // Teleportation is disabled
	type LocationInverter = LocationInverter<Ancestry>;
	type Barrier = Barrier;
	type Weigher = FixedWeightBounds<UnitWeightCost, Call, MaxInstructions>;
	type Trader =
		FreeForAll<LinearFee<Balance>, RelayLocation, AccountId, Balances, ()>;
	type ResponseHandler = (); // Don't handle responses for now.
	type SubscriptionService = PolkadotXcm;
	type AssetTrap = PolkadotXcm;
	type AssetClaims = PolkadotXcm;
}
 */

/*
/// No local origins on this chain are allowed to dispatch XCM sends/executions.
pub type LocalOriginToLocation = (SignedToAccountId32<Origin, AccountId, RelayNetwork>,);

/// The means for routing XCM messages which are not for local execution into the right message
/// queues.
pub type XcmRouter = (
	// Two routers - use UMP to communicate with the relay chain:
	cumulus_primitives_utility::ParentAsUmp<ParachainSystem, ()>,
	// ..and XCMP to communicate with the sibling chains.
	XcmpQueue,
);
 */

/*
impl pallet_xcm::Config for Runtime {
	type Event = Event;
	type SendXcmOrigin = EnsureXcmOrigin<Origin, LocalOriginToLocation>;
	type XcmRouter = XcmRouter;
	type ExecuteXcmOrigin = EnsureXcmOrigin<Origin, LocalOriginToLocation>;
	type XcmExecuteFilter = Everything;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
	type XcmTeleportFilter = Everything;
	type XcmReserveTransferFilter = Everything;
	type Weigher = FixedWeightBounds<UnitWeightCost, Call, MaxInstructions>;
	type LocationInverter = LocationInverter<Ancestry>;
	type Origin = Origin;
	type Call = Call;
	const VERSION_DISCOVERY_QUEUE_SIZE: u32 = 100;
	type AdvertisedXcmVersion = pallet_xcm::CurrentXcmVersion;
}
 */

/*
impl cumulus_pallet_xcm::Config for Runtime {
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig>;
}

impl cumulus_pallet_xcmp_queue::Config for Runtime {
	type WeightInfo = ();
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig>;
	type ChannelInfo = ParachainSystem;
	type VersionWrapper = ();
	type ExecuteOverweightOrigin = frame_system::EnsureRoot<AccountId>;
	type ControllerOrigin = EnsureRoot<AccountId>;
	type ControllerOriginConverter = XcmOriginToTransactDispatchOrigin;
}

impl cumulus_pallet_dmp_queue::Config for Runtime {
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig>;
	type ExecuteOverweightOrigin = frame_system::EnsureRoot<AccountId>;
}
 */

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
