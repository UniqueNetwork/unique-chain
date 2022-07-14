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
	traits::{
		Contains, Currency as CurrencyT, Everything, fungibles, OnUnbalanced as OnUnbalancedT,
	},
	weights::{WeightToFee, WeightToFeePolynomial},
};
use frame_system::EnsureRoot;
use orml_traits::{location::AbsoluteReserveProvider, parameter_type_with_key};
use pallet_xcm::XcmPassthrough;
use polkadot_parachain::primitives::Sibling;
use sp_arithmetic::traits::{SaturatedConversion, Saturating};
use sp_runtime::traits::{CheckedConversion, Convert, Zero};
use sp_std::{borrow::Borrow, marker::PhantomData};
use xcm::{
	latest::{Error as XcmError, MultiAsset, Xcm},
	opaque::latest::Junction,
	prelude::{Concrete, Fungible as XcmFungible},
	v1::{BodyId, Junction::*, Junctions::*, MultiLocation, NetworkId},
};
use xcm_builder::{
	AccountId32Aliases, AllowTopLevelPaidExecutionFrom, AllowUnpaidExecutionFrom, CurrencyAdapter,
	EnsureXcmOrigin, FixedWeightBounds, FungiblesAdapter, LocationInverter, ParentAsSuperuser,
	ParentIsPreset, RelayChainAsNative, SiblingParachainAsNative, SiblingParachainConvertsVia,
	SignedAccountId32AsNative, SignedToAccountId32, SovereignSignedViaLocation, TakeWeightCredit,
};
use xcm_executor::{
	{Assets, Config, XcmExecutor},
	traits::{
		Convert as ConvertXcm, Error as MatchError, FilterAssetLocation, JustTry, MatchesFungible,
		MatchesFungibles, ShouldExecute, WeightTrader,
	},
};

use pallet_foreing_assets::{AssetIdMapping, AssetIds, CurrencyId, XcmForeignAssetIdMapping};
use unique_runtime_common::{
	constants::{MAXIMUM_BLOCK_WEIGHT, UNIQUE},
	types::{AccountId, Balance},
};

use crate::{
	AssetId, Balances, Call, DmpQueue, Event, ForeingAssets, LinearFee, Origin, ParachainInfo,
	ParachainSystem, PolkadotXcm, Runtime, XcmpQueue,
};

parameter_types! {
	pub const ReservedDmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT / 4;
	pub const ReservedXcmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT / 4;
}

impl cumulus_pallet_parachain_system::Config for Runtime {
	type Event = Event;
	type SelfParaId = parachain_info::Pallet<Self>;
	type OnSystemEvent = ();
	// type DownwardMessageHandlers = cumulus_primitives_utility::UnqueuedDmpAsParent<
	// 	MaxDownwardMessageWeight,
	// 	XcmExecutor<XcmConfig>,
	// 	Call,
	// >;
	type OutboundXcmpMessageSource = XcmpQueue;
	type DmpMessageHandler = DmpQueue;
	type ReservedDmpWeight = ReservedDmpWeight;
	type ReservedXcmpWeight = ReservedXcmpWeight;
	type XcmpMessageHandler = XcmpQueue;
}

impl parachain_info::Config for Runtime {}

impl cumulus_pallet_aura_ext::Config for Runtime {}

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

// impl<T: TryFrom<u32>, B: TryFrom<u128>> MatchesFungible<B> for OnlySelfCurrency<T> {
// 	fn matches_fungible(a: &MultiAsset) -> Option<B> {
// 		match (&a.id, &a.fun) {
// 			(Concrete(_), XcmFungible(ref amount)) => CheckedConversion::checked_from(*amount),
// 			_ => None,
// 		}
// 	}
// }

// impl<T: Get<MultiLocation>, B: TryFrom<u128>> MatchesFungible<B> for IsConcrete<T> {
// 	fn matches_fungible(a: &MultiAsset) -> Option<B> {
// 		match (&a.id, &a.fun) {
// 			(Concrete(ref id), Fungible(ref amount)) if id == &T::get() =>
// 				CheckedConversion::checked_from(*amount),
// 			_ => None,
// 		}
// 	}
// }

/// A `MatchesFungible` implementation. It matches concrete fungible assets
/// whose `id` could be converted into `CurrencyId`.
///
pub struct IsNativeConcrete<CurrencyId, CurrencyIdConvert>(
	PhantomData<(CurrencyId, CurrencyIdConvert)>,
);

impl<CurrencyId, CurrencyIdConvert, Amount> MatchesFungible<Amount>
	for IsNativeConcrete<CurrencyId, CurrencyIdConvert>
where
	CurrencyIdConvert: TryFrom<u64>, // Convert<MultiLocation, Option<CurrencyId>>,
	Amount: TryFrom<u128>,
{
	fn matches_fungible(a: &MultiAsset) -> Option<Amount> {
		match (&a.id, &a.fun) {
			(Concrete(_), XcmFungible(ref amount)) => CheckedConversion::checked_from(*amount),
			_ => None,
		}

		// if let (Fungible(ref amount), Concrete(ref location)) = (&a.fun, &a.id) {
		// 	if CurrencyIdConvert::convert(location.clone()).is_some() {
		// 		return CheckedConversion::checked_from(*amount);
		// 	}
		// }
		// None
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

parameter_types! {
	pub StatemintLocation: MultiLocation = MultiLocation::new(1, X1(Parachain(1000)));
	// ALWAYS ensure that the index in PalletInstance stays up-to-date with
	// Statemint's Assets pallet index
	pub StatemintAssetsPalletLocation: MultiLocation =
		MultiLocation::new(1, X2(Parachain(2000), PalletInstance(122)));

	// pub KaruraPalletLocation: MultiLocation =
	// 	MultiLocation::new(1, X2(Parachain(2000), PalletInstance(50)));

	pub KaruraPalletLocation: MultiLocation =
		MultiLocation::new(1, X1(Parachain(2000)));

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

pub struct ConvertedConcreteAssetId2<AssetId, Balance, ConvertAssetId, ConvertBalance>(
	PhantomData<(AssetId, Balance, ConvertAssetId, ConvertBalance)>,
);

impl<
		AssetId: Clone,
		Balance: Clone,
		//ConvertAssetId: ConvertXcm<u128, AssetId>,
		ConvertAssetId: ConvertXcm<MultiLocation, AssetId>,
		ConvertBalance: ConvertXcm<u128, Balance>,
	> MatchesFungibles<AssetId, Balance>
	for ConvertedConcreteAssetId2<AssetId, Balance, ConvertAssetId, ConvertBalance>
{
	fn matches_fungibles(a: &MultiAsset) -> Result<(AssetId, Balance), MatchError> {
		//Err(MatchError::AssetNotFound)
		// match (&a.id, &a.fun) {
		// 	(Concrete(_), XcmFungible(ref amount)) => CheckedConversion::checked_from(*amount),
		// 	_ => None,
		// }

		let (amount, id) = match (&a.fun, &a.id) {
			(XcmFungible(ref amount), Concrete(ref id)) => (amount, id),
			_ => return Err(MatchError::AssetNotFound),
		};

		let what =
            // ConvertAssetId::convert_ref(id).map_err(|_| MatchError::AssetIdConversionFailed)?;AssetNotFound
            ConvertAssetId::convert_ref(id).map_err(|_| MatchError::AssetIdConversionFailed)?;
		let amount = ConvertBalance::convert_ref(amount)
			.map_err(|_| MatchError::AmountToBalanceConversionFailed)?;
		Ok((what, amount))
	}
}

//pub struct JustTry2;
// impl<Source: TryFrom<Dest> + Clone, Dest: TryFrom<Source> + Clone> ConvertXcm<Source, Dest>
// 	for JustTry2
// {
// 	fn convert(value: Source) -> Result<Dest, Source> {  // Result<Dest, Source>
// 		Dest::try_from(value.clone()).map_err(|_| value)
// 	}
// 	fn reverse(value: Dest) -> Result<Source, Dest> {
// 		Source::try_from(value.clone()).map_err(|_| value)
// 	}
// }

/// Converter struct implementing `AssetIdConversion` converting a numeric asset ID (must be `TryFrom/TryInto<u128>`) into
/// a `GeneralIndex` junction, prefixed by some `MultiLocation` value. The `MultiLocation` value will typically be a
/// `PalletInstance` junction.
pub struct AsIndex<Prefix, AssetId, ConvertAssetId>(PhantomData<(Prefix, AssetId, ConvertAssetId)>);

impl<Prefix: Get<MultiLocation>, AssetId: Clone, ConvertAssetId: ConvertXcm<u128, AssetId>>
	ConvertXcm<MultiLocation, AssetId> for AsIndex<Prefix, AssetId, ConvertAssetId>
{
	fn convert_ref(id: impl Borrow<MultiLocation>) -> Result<AssetId, ()> {
		let _prefix = Prefix::get();
		let id = id.borrow();

		log::info!(
			target: "xcm::AsIndex::Convert",
			"AsIndex {:?}",
			id.interior(), //.at(prefix.interior().len()) //.interior(),
		);
		ConvertAssetId::convert_ref(999)

		// if prefix.parent_count() != id.parent_count() ||
		// 	prefix
		// 		.interior()
		// 		.iter()
		// 		.enumerate()
		// 		.any(|(index, junction)| id.interior().at(index) != Some(junction))
		// {
		// 	return Err(())
		// }
		// match id.interior().at(prefix.interior().len()) {
		// 	Some(Junction::GeneralIndex(id)) => ConvertAssetId::convert_ref(id),
		// 	Some(Junction::GeneralKey(id)) => ConvertAssetId::convert_ref(122),
		// 	_ => ConvertAssetId::convert_ref(999),
		// //	_ => Err(()),
		// }
	}
	fn reverse_ref(what: impl Borrow<AssetId>) -> Result<MultiLocation, ()> {
		let mut location = Prefix::get();
		let id = ConvertAssetId::reverse_ref(what)?;
		location
			.push_interior(Junction::GeneralIndex(id))
			.map_err(|_| ())?;
		Ok(location)
	}
}

/// Means for transacting assets besides the native currency on this chain.
pub type FungiblesTransactor = FungiblesAdapter<
	// Use this fungibles implementation:
	ForeingAssets,
	// Use this currency when it is a fungible asset matching the given location or name:
	// IsNativeConcrete<
	//  	AssetId,
	// 	AsPrefixedGeneralIndex<StatemintAssetsPalletLocation, AssetId, JustTry>,
	// >,
	ConvertedConcreteAssetId2<
		AssetId,
		Balance,
		//AsPrefixedGeneralIndex<StatemintAssetsPalletLocation, AssetId, JustTry>,
		AsIndex<KaruraPalletLocation, AssetId, JustTry>,
		JustTry,
	>,
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
pub type AssetTransactors = FungiblesTransactor; // (LocalAssetTransactor, FungiblesTransactor);

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
		_max_weight: Weight,
		_weight_credit: &mut Weight,
	) -> Result<(), ()> {
		// log::trace!(
		// 	target: "xcm::barriers",
		// 	"TakeWeightCredit origin: {:?}, message: {:?}, max_weight: {:?}, weight_credit: {:?}",
		// 	_origin, _message, max_weight, weight_credit,
		// );
		// *weight_credit = weight_credit.checked_sub(max_weight).ok_or(())?;
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

//use xcm::opaque::latest::{prelude::XcmError, Fungibility::Fungible as XcmFungible};

pub struct UsingAnyCurrencyComponents<
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
	for UsingAnyCurrencyComponents<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn new() -> Self {
		Self(0, Zero::zero(), PhantomData)
	}

	fn buy_weight(&mut self, weight: Weight, payment: Assets) -> Result<Assets, XcmError> {
		let amount = WeightToFee::weight_to_fee(&weight);
		let u128_amount: u128 = amount.try_into().map_err(|_| XcmError::Overflow)?;

		let asset_id = payment
			.fungible
			.iter()
			.next()
			.map_or(Err(XcmError::TooExpensive), |v| Ok(v.0))?;

		// // location to this parachain through relay chain
		// let option1: xcm::v1::AssetId = Concrete(MultiLocation {
		// 	parents: 1,
		// 	interior: X1(Parachain(ParachainInfo::parachain_id().into())),
		// });
		// // direct location
		// let option2: xcm::v1::AssetId = Concrete(MultiLocation {
		// 	parents: 0,
		// 	interior: Here,
		// });

		// let required = if payment.fungible.contains_key(&option1) {
		// 	(option1, u128_amount).into()
		// } else if payment.fungible.contains_key(&option2) {
		// 	(option2, u128_amount).into()
		// } else {
		// 	(Concrete(MultiLocation::default()), u128_amount).into()
		// };

		// let first_asset: xcm::v1::AssetId = payment.fungible.iter().next().unwrap().0.into();

		// First fungible pays fee
		let required = MultiAsset {
			id: asset_id.clone(),
			fun: XcmFungible(u128_amount),
		};

		//		let required: MultiAsset = (first_asset, u128_amount).into();

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
	> Drop for UsingAnyCurrencyComponents<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn drop(&mut self) {
		OnUnbalanced::on_unbalanced(Currency::issue(self.1));
	}
}

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
		let amount = WeightToFee::weight_to_fee(&weight);
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

pub struct AllAsset;

impl FilterAssetLocation for AllAsset {
	fn filter_asset_location(_asset: &MultiAsset, _origin: &MultiLocation) -> bool {
		true
	}
}

pub struct XcmConfig;

impl Config for XcmConfig {
	type Call = Call;
	type XcmSender = XcmRouter;
	// How to withdraw and deposit an asset.
	type AssetTransactor = AssetTransactors;
	type OriginConverter = XcmOriginToTransactDispatchOrigin;
	type IsReserve = AllAsset;
	//NativeAsset;
	type IsTeleporter = ();
	// Teleportation is disabled
	type LocationInverter = LocationInverter<Ancestry>;
	type Barrier = Barrier;
	type Weigher = FixedWeightBounds<UnitWeightCost, Call, MaxInstructions>;
	type Trader =
		UsingAnyCurrencyComponents<LinearFee<Balance>, RelayLocation, AccountId, Balances, ()>;
	type ResponseHandler = ();
	// Don't handle responses for now.
	type SubscriptionService = PolkadotXcm;

	type AssetTrap = PolkadotXcm;
	type AssetClaims = PolkadotXcm;
}

// parameter_types! {
// 	pub const MaxDownwardMessageWeight: Weight = MAXIMUM_BLOCK_WEIGHT / 10;
// }

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

impl pallet_evm_coder_substrate::Config for Runtime {}

impl pallet_xcm::Config for Runtime {
	type Event = Event;
	type SendXcmOrigin = EnsureXcmOrigin<Origin, LocalOriginToLocation>;
	type XcmRouter = XcmRouter;
	type ExecuteXcmOrigin = EnsureXcmOrigin<Origin, LocalOriginToLocation>;
	type XcmExecuteFilter = Everything;
	type XcmExecutor = XcmExecutor<XcmConfig>;
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

pub struct CurrencyIdConvert;

impl Convert<AssetIds, Option<MultiLocation>> for CurrencyIdConvert {
	fn convert(id: AssetIds) -> Option<MultiLocation> {
		// match id {
		// 	// CurrencyId::ForeignAsset(foreign_asset_id) => {
		// 	// 	XcmForeignAssetIdMapping::<Runtime>::get_multi_location(foreign_asset_id)
		// 	// }
		// 	foreign_asset_id => {
		// 		Ok(XcmForeignAssetIdMapping::<Runtime>::get_multi_location(foreign_asset_id))
		// 	}
		// 	_ => Err(id),
		// }

		match id {
			AssetIds::ForeignAssetId(foreign_asset_id) => {
				XcmForeignAssetIdMapping::<Runtime>::get_multi_location(foreign_asset_id)
			} //_ => None,
		}
	}
}

impl Convert<MultiLocation, Option<CurrencyId>> for CurrencyIdConvert {
	fn convert(location: MultiLocation) -> Option<CurrencyId> {
		if let Some(currency_id) =
			XcmForeignAssetIdMapping::<Runtime>::get_currency_id(location.clone())
		{
			return Some(currency_id);
		}

		None
	}
}
// impl Convert<AssetIds, Option<MultiLocation>> for CurrencyIdConvert {
// 	fn convert(id: AssetIds) -> Result<Option<MultiLocation>, AssetIds> {
// 		match id {
// 			foreign_asset_id => {
// 				Ok(XcmForeignAssetIdMapping::<Runtime>::get_multi_location2(foreign_asset_id))
// 			}
// 			_ => Err(id),
// 		}
// 	}
// }

// impl Convert<MultiAsset, Option<CurrencyId>> for CurrencyIdConvert {
// 	fn convert(asset: MultiAsset) -> Result<Option<CurrencyId>, MultiAsset> {
// 		if let MultiAsset {
// 			id: Concrete(location), ..
// 		} = asset
// 		{
// 			Self::convert(location)
// 		} else {
// 			Err(asset)
// 		}
// 	}
// }
// impl Convert<AssetIds, Option<MultiLocation>> for CurrencyIdConvert {
// 	fn convert(id: AssetIds) -> Result<Option<MultiLocation>, AssetIds> {
// 		match id {
// 			foreign_asset_id => {
// 				Ok(XcmForeignAssetIdMapping::<Runtime>::get_multi_location2(foreign_asset_id))
// 			}
// 			_ => Err(id),
// 		}
// 	}
// }

parameter_types! {
	pub SelfLocation: MultiLocation = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));
}

parameter_types! {
	pub const BaseXcmWeight: Weight = 100_000_000; // TODO: recheck this
	pub const MaxAssetsForTransfer: usize = 2;
}

parameter_type_with_key! {
	pub ParachainMinFee: |_location: MultiLocation| -> Option<u128> {
		Some(u128::MAX)
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
	type CurrencyId = AssetIds;
	type CurrencyIdConvert = CurrencyIdConvert;
	type AccountIdToMultiLocation = AccountIdToMultiLocation;
	type SelfLocation = SelfLocation;
	type XcmExecutor = XcmExecutor<XcmConfig>;
	type Weigher = FixedWeightBounds<UnitWeightCost, Call, MaxInstructions>;
	type BaseXcmWeight = BaseXcmWeight;
	type LocationInverter = LocationInverter<Ancestry>;
	type MaxAssetsForTransfer = MaxAssetsForTransfer;
	type MinXcmFee = ParachainMinFee;
	type MultiLocationsFilter = Everything;
	type ReserveProvider = AbsoluteReserveProvider;
}
