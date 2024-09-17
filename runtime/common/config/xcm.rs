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

use cumulus_primitives_core::{AggregateMessageOrigin, ParaId};
use frame_support::{
	parameter_types,
	traits::{
		ConstU32, EnqueueWithOrigin, Everything, Get, Nothing, ProcessMessageError, TransformOrigin,
	},
};
use frame_system::EnsureRoot;
use orml_traits::location::AbsoluteReserveProvider;
use orml_xcm_support::MultiNativeAsset;
use pallet_evm::account::CrossAccountId;
use pallet_foreign_assets::FreeForAll;
use pallet_xcm::XcmPassthrough;
use parachains_common::message_queue::{NarrowOriginToSibling, ParaIdToSibling};
use polkadot_parachain_primitives::primitives::Sibling;
use polkadot_runtime_common::xcm_sender::NoPriceForMessageDelivery;
use sp_core::H160;
use sp_runtime::traits::MaybeEquivalence;
use sp_std::marker::PhantomData;
use staging_xcm::latest::prelude::*;
use staging_xcm_builder::{
	unique_instances::{
		RestoreOnCreate, SimpleStash, StashOnDestroy, UniqueInstancesAdapter, UniqueInstancesDepositAdapter, UniqueInstancesOps,
		derivatives::{
			EnsureNotDerivativeInstance, MatchDerivativeInstances, DerivativeRegisterParams, MatchDerivativeRegisterParams,
			RegisterOnCreate,
		},
	},
	AccountId32Aliases, AccountKey20Aliases, AsPrefixedGeneralIndex, EnsureXcmOrigin,
	FixedWeightBounds, FrameTransactionalProcessor, MatchInClassInstances,
	MatchedConvertedConcreteId, ParentIsPreset, RelayChainAsNative, SiblingParachainAsNative,
	SiblingParachainConvertsVia, SignedAccountId32AsNative, SignedToAccountId32,
	SovereignSignedViaLocation,
};
use staging_xcm_executor::{
	traits::{Properties, ShouldExecute},
	XcmExecutor,
};
use up_common::{constants::MAXIMUM_BLOCK_WEIGHT, types::AccountId};
use up_data_structs::{CollectionId, TokenId};
use pallet_xnft::{DerivativeIdParamsRegistry, DerivativeInstancesRegistry};

#[cfg(feature = "governance")]
use crate::runtime_common::config::governance;
use crate::{
	runtime_common::config::{
		ethereum::CrossAccountId as ConfigCrossAccountId, parachain::RelayMsgOrigin,
		substrate::TreasuryCrossAccount,
	},
	xcm_barrier::Barrier,
	AllPalletsWithSystem, Balances, ForeignAssets, MessageQueue, Nonfungible, ParachainInfo,
	ParachainSystem, PolkadotXcm, RelayNetwork, Runtime, RuntimeCall, RuntimeEvent, RuntimeOrigin,
	XcmpQueue, Xnft,
};

parameter_types! {
	pub const RelayLocation: Location = Location::parent();
	pub RelayOrigin: RuntimeOrigin = cumulus_pallet_xcm::Origin::Relay.into();
	pub UniversalLocation: InteriorLocation = (
		GlobalConsensus(crate::RelayNetwork::get()),
		Parachain(ParachainInfo::get().into()),
	).into();
	pub SelfLocation: Location = Location::new(1, Parachain(ParachainInfo::get().into()));
	pub HereLocation: Location = Location::here();

	// One XCM operation is 1_000_000 weight - almost certainly a conservative estimate.
	pub UnitWeightCost: Weight = Weight::from_parts(1_000_000, 1000); // ?
	pub const MaxInstructions: u32 = 100;
	pub const MessageQueueServiceWeight: Weight = MAXIMUM_BLOCK_WEIGHT.saturating_div(4); // TODO
}

/// Type for specifying how a `Location` can be converted into an `AccountId`. This is used
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

pub struct LocationToCrossAccountId;
impl staging_xcm_executor::traits::ConvertLocation<ConfigCrossAccountId>
	for LocationToCrossAccountId
{
	fn convert_location(location: &Location) -> Option<ConfigCrossAccountId> {
		LocationToAccountId::convert_location(location)
			.map(ConfigCrossAccountId::from_sub)
			.or_else(|| {
				let eth_address =
					AccountKey20Aliases::<RelayNetwork, H160>::convert_location(location)?;

				Some(ConfigCrossAccountId::from_eth(eth_address))
			})
	}
}

/// No local origins on this chain are allowed to dispatch XCM sends/executions.
pub type LocalOriginToLocation = (SignedToAccountId32<RuntimeOrigin, AccountId, RelayNetwork>,);

/// The means for routing XCM messages which are not for local execution into the right message
/// queues.
pub type XcmRouter = (
	// Two routers - use UMP to communicate with the relay chain:
	cumulus_primitives_utility::ParentAsUmp<ParachainSystem, PolkadotXcm, ()>,
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
	SovereignSignedViaLocation<LocationToAccountId, RuntimeOrigin>,
	// Native converter for Relay-chain (Parent) location; will converts to a `Relay` origin when
	// recognised.
	RelayChainAsNative<RelayOrigin, RuntimeOrigin>,
	// Native converter for sibling Parachains; will convert to a `SiblingPara` origin when
	// recognised.
	SiblingParachainAsNative<cumulus_pallet_xcm::Origin, RuntimeOrigin>,
	// Native signed account converter; this just converts an `AccountId32` origin into a normal
	// `Origin::Signed` origin of the same 32-byte value.
	SignedAccountId32AsNative<RelayNetwork, RuntimeOrigin>,
	// Xcm origins can be represented natively under the Xcm pallet's Xcm origin.
	XcmPassthrough<RuntimeOrigin>,
);

pub trait TryPass {
	fn try_pass<Call>(
		origin: &Location,
		message: &mut [Instruction<Call>],
	) -> Result<(), ProcessMessageError>;
}

#[impl_trait_for_tuples::impl_for_tuples(30)]
impl TryPass for Tuple {
	fn try_pass<Call>(
		origin: &Location,
		message: &mut [Instruction<Call>],
	) -> Result<(), ProcessMessageError> {
		for_tuples!( #(
			Tuple::try_pass(origin, message)?;
		)* );

		Ok(())
	}
}

/// Deny executing the XCM if it matches any of the Deny filter regardless of anything else.
/// If it passes the Deny, and matches one of the Allow cases then it is let through.
pub struct DenyThenTry<Deny, Allow>(PhantomData<Deny>, PhantomData<Allow>)
where
	Deny: TryPass,
	Allow: ShouldExecute;

impl<Deny, Allow> ShouldExecute for DenyThenTry<Deny, Allow>
where
	Deny: TryPass,
	Allow: ShouldExecute,
{
	fn should_execute<Call>(
		origin: &Location,
		message: &mut [Instruction<Call>],
		max_weight: Weight,
		properties: &mut Properties,
	) -> Result<(), ProcessMessageError> {
		Deny::try_pass(origin, message)?;
		Allow::should_execute(origin, message, max_weight, properties)
	}
}

pub type Weigher = FixedWeightBounds<UnitWeightCost, RuntimeCall, MaxInstructions>;

pub type IsReserve = MultiNativeAsset<AbsoluteReserveProvider>;

pub type Trader = FreeForAll;

pub struct GeneralIndexAsCollectionId;
impl MaybeEquivalence<u128, CollectionId> for GeneralIndexAsCollectionId {
	fn convert(&a: &u128) -> Option<CollectionId> {
		Some(CollectionId(a.try_into().ok()?))
	}

	fn convert_back(_: &CollectionId) -> Option<u128> {
		None
	}
}

pub struct AssetInstanceAsTokenId;
impl MaybeEquivalence<AssetInstance, TokenId> for AssetInstanceAsTokenId {
	fn convert(a: &AssetInstance) -> Option<TokenId> {
		match a {
			AssetInstance::Index(index) => Some(TokenId((*index).try_into().ok()?)),
			_ => None,
		}
	}

	fn convert_back(_: &TokenId) -> Option<AssetInstance> {
		None
	}
}

pub type TreasuryNftStash = SimpleStash<TreasuryCrossAccount, Nonfungible>;

pub type NftsMatcher = MatchedConvertedConcreteId<
	CollectionId,
	TokenId,
	Everything,
	AsPrefixedGeneralIndex<HereLocation, CollectionId, GeneralIndexAsCollectionId>,
	AssetInstanceAsTokenId,
>;

pub type ParamsRegitry = DerivativeIdParamsRegistry<Xnft>;
pub type DerivativeNftsRegistry = DerivativeInstancesRegistry<Xnft>;

pub type OriginalNftsMatcher = EnsureNotDerivativeInstance<
	DerivativeNftsRegistry,
	MatchInClassInstances<NftsMatcher>,
>;

pub type DerivativeNftsMatcher = MatchDerivativeInstances<DerivativeNftsRegistry>;

pub type OriginalNftsTransactor = UniqueInstancesAdapter<
	ConfigCrossAccountId,
	LocationToCrossAccountId,
	(OriginalNftsMatcher, DerivativeNftsMatcher),
	UniqueInstancesOps<
		RestoreOnCreate<TreasuryNftStash>,
		Nonfungible,
		StashOnDestroy<TreasuryNftStash>,
	>,
>;

pub type DerivativeNftsRegistrar = UniqueInstancesDepositAdapter<
	ConfigCrossAccountId,
	LocationToCrossAccountId,
	DerivativeRegisterParams<CollectionId>,
	MatchDerivativeRegisterParams<ParamsRegitry>,
	RegisterOnCreate<DerivativeNftsRegistry, Nonfungible>,
>;

pub struct XcmExecutorConfig<T>(PhantomData<T>);
impl<T> staging_xcm_executor::Config for XcmExecutorConfig<T>
where
	T: pallet_configuration::Config,
{
	type RuntimeCall = RuntimeCall;
	type XcmSender = XcmRouter;
	// How to withdraw and deposit an asset.
	type AssetTransactor = (ForeignAssets, OriginalNftsTransactor, DerivativeNftsRegistrar);
	type OriginConverter = XcmOriginToTransactDispatchOrigin;
	type IsReserve = IsReserve;
	type IsTeleporter = (); // Teleportation is disabled
	type UniversalLocation = UniversalLocation;
	type Barrier = Barrier;
	type Weigher = Weigher;
	type Trader = Trader;
	type ResponseHandler = PolkadotXcm;
	type SubscriptionService = PolkadotXcm;
	type PalletInstancesInfo = AllPalletsWithSystem;
	type MaxAssetsIntoHolding = ConstU32<8>;

	type AssetTrap = PolkadotXcm;
	type AssetClaims = PolkadotXcm;
	type AssetLocker = ();
	type AssetExchanger = ();
	type FeeManager = ();
	type MessageExporter = ();
	type UniversalAliases = Nothing;
	type CallDispatcher = RuntimeCall;
	type SafeCallFilter = Nothing;
	type Aliasers = Nothing;
	type TransactionalProcessor = FrameTransactionalProcessor;
}

impl pallet_xcm::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type SendXcmOrigin = EnsureXcmOrigin<RuntimeOrigin, ()>;
	type XcmRouter = XcmRouter;
	type ExecuteXcmOrigin = EnsureXcmOrigin<RuntimeOrigin, LocalOriginToLocation>;
	type XcmExecuteFilter = Everything;
	type XcmExecutor = XcmExecutor<XcmExecutorConfig<Self>>;
	type XcmTeleportFilter = Everything;
	type XcmReserveTransferFilter = Everything;
	type Weigher = FixedWeightBounds<UnitWeightCost, RuntimeCall, MaxInstructions>;
	type RuntimeOrigin = RuntimeOrigin;
	type RuntimeCall = RuntimeCall;
	const VERSION_DISCOVERY_QUEUE_SIZE: u32 = 100;
	type AdvertisedXcmVersion = pallet_xcm::CurrentXcmVersion;
	type UniversalLocation = UniversalLocation;
	type Currency = Balances;
	type CurrencyMatcher = ();
	type TrustedLockers = ();
	type SovereignAccountOf = LocationToAccountId;
	type MaxLockers = ConstU32<8>;
	type WeightInfo = crate::weights::xcm::SubstrateWeight<Runtime>;
	type AdminOrigin = EnsureRoot<AccountId>;
	type MaxRemoteLockConsumers = ConstU32<0>;
	type RemoteLockConsumerIdentifier = ();
}

impl pallet_xnft::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;

	type DerivativeIdParams = CollectionId;
	type DerivativeId = (CollectionId, TokenId);
}

#[cfg(feature = "runtime-benchmarks")]
impl pallet_xcm::benchmarking::Config for Runtime {
	type DeliveryHelper = ();

	fn reachable_dest() -> Option<Location> {
		Some(Parent.into())
	}

	fn get_asset() -> Asset {
		(Location::here(), 1_000_000_000_000_000_000u128).into()
	}
}

impl cumulus_pallet_xcm::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type XcmExecutor = XcmExecutor<XcmExecutorConfig<Self>>;
}

impl pallet_message_queue::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type WeightInfo = pallet_message_queue::weights::SubstrateWeight<Self>;

	#[cfg(not(feature = "runtime-benchmarks"))]
	type MessageProcessor = staging_xcm_builder::ProcessXcmMessage<
		AggregateMessageOrigin,
		XcmExecutor<XcmExecutorConfig<Self>>,
		RuntimeCall,
	>;

	#[cfg(feature = "runtime-benchmarks")]
	type MessageProcessor =
		pallet_message_queue::mock_helpers::NoopMessageProcessor<AggregateMessageOrigin>;

	type Size = u32;
	// The XCMP queue pallet is only ever able to handle the `Sibling(ParaId)` origin:
	type QueueChangeHandler = NarrowOriginToSibling<XcmpQueue>;
	type QueuePausedQuery = NarrowOriginToSibling<XcmpQueue>;
	type HeapSize = ConstU32<{ 64 * 1024 }>;
	type MaxStale = ConstU32<8>;
	type ServiceWeight = MessageQueueServiceWeight;
}

impl cumulus_pallet_xcmp_queue::Config for Runtime {
	type WeightInfo = cumulus_pallet_xcmp_queue::weights::SubstrateWeight<Self>;
	type RuntimeEvent = RuntimeEvent;
	type XcmpQueue = TransformOrigin<MessageQueue, AggregateMessageOrigin, ParaId, ParaIdToSibling>;
	type MaxInboundSuspended = ConstU32<1000>;

	type ChannelInfo = ParachainSystem;
	type VersionWrapper = PolkadotXcm;

	#[cfg(feature = "governance")]
	type ControllerOrigin = governance::RootOrTechnicalCommitteeMember;

	#[cfg(not(feature = "governance"))]
	type ControllerOrigin = frame_system::EnsureRoot<AccountId>;

	type ControllerOriginConverter = XcmOriginToTransactDispatchOrigin;
	type PriceForSiblingDelivery = NoPriceForMessageDelivery<ParaId>;
}

impl cumulus_pallet_dmp_queue::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type WeightInfo = cumulus_pallet_dmp_queue::weights::SubstrateWeight<Self>;
	type DmpSink = EnqueueWithOrigin<MessageQueue, RelayMsgOrigin>;
}
