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
	traits::{
		Contains, tokens::currency::Currency as CurrencyT, OnUnbalanced as OnUnbalancedT, Get, Everything,
		fungibles,
	},
	weights::{Weight, WeightToFeePolynomial, WeightToFee},
	parameter_types, match_types,
};
use frame_system::EnsureRoot;
use sp_runtime::{
	traits::{Saturating, CheckedConversion, Zero},
	SaturatedConversion,
};
use pallet_xcm::XcmPassthrough;
use polkadot_parachain::primitives::Sibling;
use xcm::v1::{BodyId, Junction::*, MultiLocation, NetworkId, Junctions::*};
use xcm::latest::{
	AssetId::{Concrete},
	Fungibility::Fungible as XcmFungible,
	MultiAsset, Error as XcmError,
};
use xcm_builder::{
	AccountId32Aliases, AllowTopLevelPaidExecutionFrom, CurrencyAdapter, EnsureXcmOrigin,
	FixedWeightBounds, FungiblesAdapter, LocationInverter, NativeAsset, ParentAsSuperuser, RelayChainAsNative,
	SiblingParachainAsNative, SiblingParachainConvertsVia, SignedAccountId32AsNative,
	SignedToAccountId32, SovereignSignedViaLocation, TakeWeightCredit, ParentIsPreset,
	ConvertedConcreteAssetId
};
use xcm_executor::{Config, XcmExecutor, Assets};
use xcm_executor::traits::{Convert as ConvertXcm, JustTry, MatchesFungible, WeightTrader, FilterAssetLocation};
use pallet_foreing_assets::{
	AssetIds, AssetIdMapping, XcmForeignAssetIdMapping, CurrencyId, NativeCurrency,
	UsingAnyCurrencyComponents, TryAsForeing, ForeignAssetId,
};
use sp_std::{borrow::Borrow, marker::PhantomData, vec, vec::Vec};
use crate::{
	Runtime, Call, Event, Origin, Balances, ParachainInfo, ParachainSystem, PolkadotXcm, XcmpQueue,
	xcm_config::Barrier
};
#[cfg(feature = "foreign-assets")]
use crate::ForeingAssets;

use up_common::{
	types::{AccountId, Balance},
	constants::*,
};

parameter_types! {
	pub const RelayLocation: MultiLocation = MultiLocation::parent();
	pub const RelayNetwork: NetworkId = NetworkId::Polkadot;
	pub RelayOrigin: Origin = cumulus_pallet_xcm::Origin::Relay.into();
	pub Ancestry: MultiLocation = Parachain(ParachainInfo::parachain_id().into()).into();
}

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
}

match_types! {
	pub type ParentOrParentsUnitPlurality: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(Plurality { id: BodyId::Unit, .. }) }
	};
}

/*
pub type Barrier = (
	TakeWeightCredit,
	AllowTopLevelPaidExecutionFrom<Everything>,
	// ^^^ Parent & its unit plurality gets free execution
);
 */

pub struct UsingOnlySelfCurrencyComponents<
	WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
	AssetId: Get<MultiLocation>,
	AccountId,
	Currency: CurrencyT<AccountId>,
	OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
>(
	Weight,
	Currency::Balance,
	PhantomData<(WeightToFee, AssetId, AccountId, Currency, OnUnbalanced)>,
);
impl<
		WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
		AssetId: Get<MultiLocation>,
		AccountId,
		Currency: CurrencyT<AccountId>,
		OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
	> WeightTrader
	for UsingOnlySelfCurrencyComponents<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn new() -> Self {
		Self(0, Zero::zero(), PhantomData)
	}

	fn buy_weight(&mut self, weight: Weight, payment: Assets) -> Result<Assets, XcmError> {
		let amount: Currency::Balance = (0 as u32).into();
		//let amount = WeightToFee::weight_to_fee(&weight);
		let u128_amount: u128 = amount.try_into().map_err(|_| XcmError::Overflow)?;

		// location to this parachain through relay chain
		let option1: xcm::v1::AssetId = Concrete(MultiLocation {
			parents: 1,
			interior: X1(Parachain(ParachainInfo::parachain_id().into())),
		});
		// direct location
		let option2: xcm::v1::AssetId = Concrete(MultiLocation {
			parents: 0,
			interior: Here,
		});

		let required = if payment.fungible.contains_key(&option1) {
			(option1, u128_amount).into()
		} else if payment.fungible.contains_key(&option2) {
			(option2, u128_amount).into()
		} else {
			(Concrete(MultiLocation::default()), u128_amount).into()
		};

		let unused = payment
			.checked_sub(required)
			.map_err(|_| XcmError::TooExpensive)?;
		self.0 = self.0.saturating_add(weight);
		self.1 = self.1.saturating_add(amount);
		Ok(unused)
	}

	fn refund_weight(&mut self, weight: Weight) -> Option<MultiAsset> {
		let weight = weight.min(self.0);
		let amount = WeightToFee::weight_to_fee(&weight);
		self.0 -= weight;
		self.1 = self.1.saturating_sub(amount);
		let amount: u128 = amount.saturated_into();
		if amount > 0 {
			Some((AssetId::get(), amount).into())
		} else {
			None
		}
	}
}
impl<
		WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
		AssetId: Get<MultiLocation>,
		AccountId,
		Currency: CurrencyT<AccountId>,
		OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
	> Drop
	for UsingOnlySelfCurrencyComponents<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn drop(&mut self) {
		OnUnbalanced::on_unbalanced(Currency::issue(self.1));
	}
}

parameter_types! {
	pub CheckingAccount: AccountId = PolkadotXcm::check_account();
}
/// Allow checking in assets that have issuance > 0.
#[cfg(feature = "foreign-assets")]
pub struct NonZeroIssuance<AccountId, ForeingAssets>(PhantomData<(AccountId, ForeingAssets)>);

#[cfg(feature = "foreign-assets")]
impl<AccountId, ForeingAssets> Contains<<ForeingAssets as fungibles::Inspect<AccountId>>::AssetId>
for NonZeroIssuance<AccountId, ForeingAssets>
	where
		ForeingAssets: fungibles::Inspect<AccountId>,
{
	fn contains(id: &<ForeingAssets as fungibles::Inspect<AccountId>>::AssetId) -> bool {
		!ForeingAssets::total_issuance(*id).is_zero()
	}
}

#[cfg(feature = "foreign-assets")]
pub struct AsInnerId<AssetId, ConvertAssetId>(PhantomData<(AssetId, ConvertAssetId)>);
#[cfg(feature = "foreign-assets")]
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
#[cfg(feature = "foreign-assets")]
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
#[cfg(feature = "foreign-assets")]
pub type AssetTransactors = FungiblesTransactor;

#[cfg(not(feature = "foreign-assets"))]
pub type AssetTransactors = LocalAssetTransactor;

#[cfg(feature = "foreign-assets")]
pub struct AllAsset;
#[cfg(feature = "foreign-assets")]
impl FilterAssetLocation for AllAsset {
	fn filter_asset_location(asset: &MultiAsset, origin: &MultiLocation) -> bool {
		true
	}
}

#[cfg(feature = "foreign-assets")]
pub type IsReserve = AllAsset;
#[cfg(not(feature = "foreign-assets"))]
pub type IsReserve = NativeAsset;

#[cfg(feature = "foreign-assets")]
type Trader<T> =
	UsingAnyCurrencyComponents<
		pallet_configuration::WeightToFee<T, Balance>,
		RelayLocation, AccountId, Balances, ()>;
#[cfg(not(feature = "foreign-assets"))]
type Trader<T> = UsingOnlySelfCurrencyComponents<
	pallet_configuration::WeightToFee<T, Balance>,
	RelayLocation,
	AccountId,
	Balances,
	(),
>;

pub struct XcmConfig<T>(PhantomData<T>);
impl<T> Config for XcmConfig<T>
where
	T: pallet_configuration::Config,
{
	type Call = Call;
	type XcmSender = XcmRouter;
	// How to withdraw and deposit an asset.
	type AssetTransactor = AssetTransactors;
	type OriginConverter = XcmOriginToTransactDispatchOrigin;
	type IsReserve = IsReserve;
	type IsTeleporter = (); // Teleportation is disabled
	type LocationInverter = LocationInverter<Ancestry>;
	type Barrier = Barrier;
	type Weigher = FixedWeightBounds<UnitWeightCost, Call, MaxInstructions>;
	type Trader = Trader<T>;
	type ResponseHandler = (); // Don't handle responses for now.
	type SubscriptionService = PolkadotXcm;

	type AssetTrap = PolkadotXcm;
	type AssetClaims = PolkadotXcm;
}

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

impl cumulus_pallet_xcm::Config for Runtime {
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
}

impl cumulus_pallet_xcmp_queue::Config for Runtime {
	type WeightInfo = ();
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
	type ChannelInfo = ParachainSystem;
	type VersionWrapper = ();
	type ExecuteOverweightOrigin = frame_system::EnsureRoot<AccountId>;
	type ControllerOrigin = EnsureRoot<AccountId>;
	type ControllerOriginConverter = XcmOriginToTransactDispatchOrigin;
}

impl cumulus_pallet_dmp_queue::Config for Runtime {
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig<Self>>;
	type ExecuteOverweightOrigin = frame_system::EnsureRoot<AccountId>;
}

