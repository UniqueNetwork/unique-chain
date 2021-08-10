//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

//! The Substrate Node Template runtime. This can be compiled with `#[no_std]`, ready for Wasm.

#![cfg_attr(not(feature = "std"), no_std)]
// `construct_runtime!` does a lot of recursion and requires us to increase the limit to 256.
#![recursion_limit = "1024"]
#![allow(clippy::from_over_into, clippy::identity_op)]
#![allow(clippy::fn_to_numeric_cast_with_truncation)]
// Make the WASM binary available.
#[cfg(feature = "std")]
include!(concat!(env!("OUT_DIR"), "/wasm_binary.rs"));

use sp_api::impl_runtime_apis;
use sp_core::{crypto::KeyTypeId, OpaqueMetadata, H256, U256, H160};
// #[cfg(any(feature = "std", test))]
// pub use sp_runtime::BuildStorage;

use sp_runtime::{
	Permill, Perbill, Percent, create_runtime_str, generic, impl_opaque_keys,
	traits::{
		AccountIdLookup, ConvertInto, BlakeTwo256, Block as BlockT, IdentifyAccount, Verify,
		AccountIdConversion,
	},
	transaction_validity::{TransactionSource, TransactionValidity},
	ApplyExtrinsicResult, MultiSignature,
};

use sp_std::prelude::*;

#[cfg(feature = "std")]
use sp_version::NativeVersion;
use sp_version::RuntimeVersion;
pub use pallet_transaction_payment::{
	Multiplier, TargetedFeeAdjustment, FeeDetails, RuntimeDispatchInfo,
};
// A few exports that help ease life for downstream crates.
pub use pallet_balances::Call as BalancesCall;
pub use pallet_evm::{EnsureAddressTruncated, HashedAddressMapping, Runner};
pub use frame_support::{
	construct_runtime, match_type,
	dispatch::DispatchResult,
	PalletId, parameter_types, StorageValue, ConsensusEngineId,
	traits::{
		All, Currency, ExistenceRequirement, Get, IsInVec, KeyOwnerProofSystem, LockIdentifier,
		OnUnbalanced, Randomness, FindAuthor,
	},
	weights::{
		constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
		DispatchClass, DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
		WeightToFeePolynomial, WeightToFeeCoefficient, WeightToFeeCoefficients,
	},
};
use nft_data_structs::*;
// use pallet_contracts::weights::WeightInfo;
// #[cfg(any(feature = "std", test))]
use frame_system::{
	self as system, EnsureRoot, EnsureSigned,
	limits::{BlockWeights, BlockLength},
};
use sp_arithmetic::{
	traits::{BaseArithmetic, Unsigned},
};
use smallvec::smallvec;
use codec::{Encode, Decode};
use pallet_evm::{Account as EVMAccount, FeeCalculator, OnMethodCall};
use fp_rpc::TransactionStatus;
use sp_core::crypto::Public;
use sp_runtime::{
	traits::{Dispatchable},
};

// pub use pallet_timestamp::Call as TimestampCall;
pub use sp_consensus_aura::sr25519::AuthorityId as AuraId;

// Polkadot imports
use pallet_xcm::XcmPassthrough;
use polkadot_parachain::primitives::Sibling;
use xcm::v0::Xcm;
use xcm::v0::{BodyId, Junction::*, MultiAsset, MultiLocation, MultiLocation::*, NetworkId};
use xcm_builder::{
	AccountId32Aliases, AllowTopLevelPaidExecutionFrom, AllowUnpaidExecutionFrom, CurrencyAdapter,
	EnsureXcmOrigin, FixedWeightBounds, IsConcrete, LocationInverter, NativeAsset,
	ParentAsSuperuser, ParentIsDefault, RelayChainAsNative, SiblingParachainAsNative,
	SiblingParachainConvertsVia, SignedAccountId32AsNative, SignedToAccountId32,
	SovereignSignedViaLocation, TakeWeightCredit, UsingComponents,
};
use xcm_executor::{Config, XcmExecutor};

// mod chain_extension;
// use crate::chain_extension::{NFTExtension, Imbalance};

/// An index to a block.
pub type BlockNumber = u32;

/// Alias to 512-bit hash when used in the context of a transaction signature on the chain.
pub type Signature = MultiSignature;

/// Some way of identifying an account on the chain. We intentionally make it equivalent
/// to the public key of our transaction signing scheme.
pub type AccountId = <<Signature as Verify>::Signer as IdentifyAccount>::AccountId;

/// The type for looking up accounts. We don't expect more than 4 billion of them, but you
/// never know...
pub type AccountIndex = u32;

/// Balance of an account.
pub type Balance = u128;

/// Index of a transaction in the chain.
pub type Index = u32;

/// A hash of some data used by the chain.
pub type Hash = sp_core::H256;

/// Digest item type.
pub type DigestItem = generic::DigestItem<Hash>;

mod nft_weights;

/// Opaque types. These are used by the CLI to instantiate machinery that don't need to know
/// the specifics of the runtime. They can then be made to be agnostic over specific formats
/// of data like extrinsics, allowing for them to continue syncing the network through upgrades
/// to even the core data structures.
pub mod opaque {
	use super::*;

	pub use sp_runtime::OpaqueExtrinsic as UncheckedExtrinsic;

	/// Opaque block type.
	pub type Block = generic::Block<Header, UncheckedExtrinsic>;

	pub type SessionHandlers = ();

	impl_opaque_keys! {
		pub struct SessionKeys {
			pub aura: Aura,
		}
	}
}

/// This runtime version.
pub const VERSION: RuntimeVersion = RuntimeVersion {
	spec_name: create_runtime_str!("nft"),
	impl_name: create_runtime_str!("nft"),
	authoring_version: 1,
	spec_version: 3,
	impl_version: 1,
	apis: RUNTIME_API_VERSIONS,
	transaction_version: 1,
};

pub const MILLISECS_PER_BLOCK: u64 = 12000;

pub const SLOT_DURATION: u64 = MILLISECS_PER_BLOCK;

// These time units are defined in number of blocks.
pub const MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_BLOCK as BlockNumber);
pub const HOURS: BlockNumber = MINUTES * 60;
pub const DAYS: BlockNumber = HOURS * 24;

parameter_types! {
	pub const DefaultSponsoringRateLimit: BlockNumber = 1 * DAYS;
}

#[derive(codec::Encode, codec::Decode)]
pub enum XCMPMessage<XAccountId, XBalance> {
	/// Transfer tokens to the given account from the Parachain account.
	TransferToken(XAccountId, XBalance),
}

/// The version information used to identify this runtime when compiled natively.
#[cfg(feature = "std")]
pub fn native_version() -> NativeVersion {
	NativeVersion {
		runtime_version: VERSION,
		can_author_with: Default::default(),
	}
}

type NegativeImbalance = <Balances as Currency<AccountId>>::NegativeImbalance;

pub struct DealWithFees;
impl OnUnbalanced<NegativeImbalance> for DealWithFees {
	fn on_unbalanceds<B>(mut fees_then_tips: impl Iterator<Item = NegativeImbalance>) {
		if let Some(fees) = fees_then_tips.next() {
			// for fees, 100% to treasury
			let mut split = fees.ration(100, 0);
			if let Some(tips) = fees_then_tips.next() {
				// for tips, if any, 100% to treasury
				tips.ration_merge_into(100, 0, &mut split);
			}
			Treasury::on_unbalanced(split.0);
			// Author::on_unbalanced(split.1);
		}
	}
}

/// We assume that ~10% of the block weight is consumed by `on_initalize` handlers.
/// This is used to limit the maximal weight of a single extrinsic.
const AVERAGE_ON_INITIALIZE_RATIO: Perbill = Perbill::from_percent(10);
/// We allow `Normal` extrinsics to fill up the block up to 75%, the rest can be used
/// by  Operational  extrinsics.
const NORMAL_DISPATCH_RATIO: Perbill = Perbill::from_percent(75);
/// We allow for 2 seconds of compute with a 6 second average block time.
const MAXIMUM_BLOCK_WEIGHT: Weight = WEIGHT_PER_SECOND / 2;

parameter_types! {
	pub const BlockHashCount: BlockNumber = 2400;
	pub RuntimeBlockLength: BlockLength =
		BlockLength::max_with_normal_ratio(5 * 1024 * 1024, NORMAL_DISPATCH_RATIO);
	pub const AvailableBlockRatio: Perbill = Perbill::from_percent(75);
	pub const MaximumBlockLength: u32 = 5 * 1024 * 1024;
	pub RuntimeBlockWeights: BlockWeights = BlockWeights::builder()
		.base_block(BlockExecutionWeight::get())
		.for_class(DispatchClass::all(), |weights| {
			weights.base_extrinsic = ExtrinsicBaseWeight::get();
		})
		.for_class(DispatchClass::Normal, |weights| {
			weights.max_total = Some(NORMAL_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT);
		})
		.for_class(DispatchClass::Operational, |weights| {
			weights.max_total = Some(MAXIMUM_BLOCK_WEIGHT);
			// Operational transactions have some extra reserved space, so that they
			// are included even if block reached `MAXIMUM_BLOCK_WEIGHT`.
			weights.reserved = Some(
				MAXIMUM_BLOCK_WEIGHT - NORMAL_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT
			);
		})
		.avg_block_initialization(AVERAGE_ON_INITIALIZE_RATIO)
		.build_or_panic();
	pub const Version: RuntimeVersion = VERSION;
	pub const SS58Prefix: u8 = 42;
}

parameter_types! {
	pub const ChainId: u64 = 8888;
}

impl pallet_evm::Config for Runtime {
	type BlockGasLimit = BlockGasLimit;
	type FeeCalculator = ();
	type GasWeightMapping = ();
	type BlockHashMapping = pallet_ethereum::EthereumBlockHashMapping;
	type CallOrigin = EnsureAddressTruncated;
	type WithdrawOrigin = EnsureAddressTruncated;
	type AddressMapping = HashedAddressMapping<Self::Hashing>;
	type Precompiles = ();
	type Currency = Balances;
	type Event = Event;
	type OnMethodCall = (
		pallet_nft::NftErcSupport<Self>,
		pallet_evm_contract_helpers::HelpersOnMethodCall<Self>,
	);
	type OnCreate = pallet_evm_contract_helpers::HelpersOnCreate<Self>;
	type ChainId = ChainId;
	type Runner = pallet_evm::runner::stack::Runner<Self>;
	type OnChargeTransaction = pallet_evm_transaction_payment::OnChargeTransaction<Self>;
	type TransactionValidityHack = pallet_evm_transaction_payment::TransactionValidityHack<Self>;
	type FindAuthor = EthereumFindAuthor<Aura>;
}

pub struct EthereumFindAuthor<F>(core::marker::PhantomData<F>);
impl<F: FindAuthor<u32>> FindAuthor<H160> for EthereumFindAuthor<F> {
	fn find_author<'a, I>(digests: I) -> Option<H160>
	where
		I: 'a + IntoIterator<Item = (ConsensusEngineId, &'a [u8])>,
	{
		if let Some(author_index) = F::find_author(digests) {
			let authority_id = Aura::authorities()[author_index as usize].clone();
			return Some(H160::from_slice(&authority_id.to_raw_vec()[4..24]));
		}
		None
	}
}

parameter_types! {
	pub BlockGasLimit: U256 = U256::from(u32::max_value());
}

impl pallet_ethereum::Config for Runtime {
	type Event = Event;
	type StateRoot = pallet_ethereum::IntermediateStateRoot;
	type EvmSubmitLog = pallet_evm::Pallet<Self>;
}

impl pallet_randomness_collective_flip::Config for Runtime {}

impl system::Config for Runtime {
	/// The data to be stored in an account.
	type AccountData = pallet_balances::AccountData<Balance>;
	/// The identifier used to distinguish between accounts.
	type AccountId = AccountId;
	/// The basic call filter to use in dispatchable.
	type BaseCallFilter = ();
	/// Maximum number of block number to block hash mappings to keep (oldest pruned first).
	type BlockHashCount = BlockHashCount;
	/// The maximum length of a block (in bytes).
	type BlockLength = RuntimeBlockLength;
	/// The index type for blocks.
	type BlockNumber = BlockNumber;
	/// The weight of the overhead invoked on the block import process, independent of the extrinsics included in that block.
	type BlockWeights = RuntimeBlockWeights;
	/// The aggregated dispatch type that is available for extrinsics.
	type Call = Call;
	/// The weight of database operations that the runtime can invoke.
	type DbWeight = RocksDbWeight;
	/// The ubiquitous event type.
	type Event = Event;
	/// The type for hashing blocks and tries.
	type Hash = Hash;
	/// The hashing algorithm used.
	type Hashing = BlakeTwo256;
	/// The header type.
	type Header = generic::Header<BlockNumber, BlakeTwo256>;
	/// The index type for storing how many extrinsics an account has signed.
	type Index = Index;
	/// The lookup mechanism to get account ID from whatever is passed in dispatchers.
	type Lookup = AccountIdLookup<AccountId, ()>;
	/// What to do if an account is fully reaped from the system.
	type OnKilledAccount = ();
	/// What to do if a new account is created.
	type OnNewAccount = ();
	type OnSetCode = cumulus_pallet_parachain_system::ParachainSetCode<Self>;
	/// The ubiquitous origin type.
	type Origin = Origin;
	/// This type is being generated by `construct_runtime!`.
	type PalletInfo = PalletInfo;
	/// This is used as an identifier of the chain. 42 is the generic substrate prefix.
	type SS58Prefix = SS58Prefix;
	/// Weight information for the extrinsics of this pallet.
	type SystemWeightInfo = system::weights::SubstrateWeight<Self>;
	/// Version of the runtime.
	type Version = Version;
}

parameter_types! {
	pub const MinimumPeriod: u64 = SLOT_DURATION / 2;
}

impl pallet_timestamp::Config for Runtime {
	/// A timestamp: milliseconds since the unix epoch.
	type Moment = u64;
	type OnTimestampSet = ();
	type MinimumPeriod = MinimumPeriod;
	type WeightInfo = ();
}

parameter_types! {
	// pub const ExistentialDeposit: u128 = 500;
	pub const ExistentialDeposit: u128 = 0;
	pub const MaxLocks: u32 = 50;
}

impl pallet_balances::Config for Runtime {
	type MaxLocks = MaxLocks;
	type MaxReserves = ();
	type ReserveIdentifier = [u8; 8];
	/// The type for recording an account's balance.
	type Balance = Balance;
	/// The ubiquitous event type.
	type Event = Event;
	type DustRemoval = Treasury;
	type ExistentialDeposit = ExistentialDeposit;
	type AccountStore = System;
	type WeightInfo = pallet_balances::weights::SubstrateWeight<Self>;
}

pub const MICROUNIQUE: Balance = 1_000_000_000;
pub const MILLIUNIQUE: Balance = 1_000 * MICROUNIQUE;
pub const CENTIUNIQUE: Balance = 10 * MILLIUNIQUE;
pub const UNIQUE: Balance = 100 * CENTIUNIQUE;

pub const fn deposit(items: u32, bytes: u32) -> Balance {
	items as Balance * 15 * CENTIUNIQUE + (bytes as Balance) * 6 * CENTIUNIQUE
}

/*
parameter_types! {
	pub TombstoneDeposit: Balance = deposit(
		1,
		sp_std::mem::size_of::<pallet_contracts::Pallet<Runtime>> as u32,
	);
	pub DepositPerContract: Balance = TombstoneDeposit::get();
	pub const DepositPerStorageByte: Balance = deposit(0, 1);
	pub const DepositPerStorageItem: Balance = deposit(1, 0);
	pub RentFraction: Perbill = Perbill::from_rational(1u32, 30 * DAYS);
	pub const SurchargeReward: Balance = 150 * MILLIUNIQUE;
	pub const SignedClaimHandicap: u32 = 2;
	pub const MaxDepth: u32 = 32;
	pub const MaxValueSize: u32 = 16 * 1024;
	pub const MaxCodeSize: u32 = 1024 * 1024 * 25; // 25 Mb
	// The lazy deletion runs inside on_initialize.
	pub DeletionWeightLimit: Weight = AVERAGE_ON_INITIALIZE_RATIO *
		RuntimeBlockWeights::get().max_block;
	// The weight needed for decoding the queue should be less or equal than a fifth
	// of the overall weight dedicated to the lazy deletion.
	pub DeletionQueueDepth: u32 = ((DeletionWeightLimit::get() / (
			<Runtime as pallet_contracts::Config>::WeightInfo::on_initialize_per_queue_item(1) -
			<Runtime as pallet_contracts::Config>::WeightInfo::on_initialize_per_queue_item(0)
		)) / 5) as u32;
	pub Schedule: pallet_contracts::Schedule<Runtime> = Default::default();
}

impl pallet_contracts::Config for Runtime {
	type Time = Timestamp;
	type Randomness = RandomnessCollectiveFlip;
	type Currency = Balances;
	type Event = Event;
	type RentPayment = ();
	type SignedClaimHandicap = SignedClaimHandicap;
	type TombstoneDeposit = TombstoneDeposit;
	type DepositPerContract = DepositPerContract;
	type DepositPerStorageByte = DepositPerStorageByte;
	type DepositPerStorageItem = DepositPerStorageItem;
	type RentFraction = RentFraction;
	type SurchargeReward = SurchargeReward;
	type WeightPrice = pallet_transaction_payment::Pallet<Self>;
	type WeightInfo = pallet_contracts::weights::SubstrateWeight<Self>;
	type ChainExtension = NFTExtension;
	type DeletionQueueDepth = DeletionQueueDepth;
	type DeletionWeightLimit = DeletionWeightLimit;
	type Schedule = Schedule;
	type CallStack = [pallet_contracts::Frame<Self>; 31];
}
*/

parameter_types! {
	pub const TransactionByteFee: Balance = 501 * MICROUNIQUE; // Targeting 0.1 Unique per NFT transfer
}

/// Linear implementor of `WeightToFeePolynomial`
pub struct LinearFee<T>(sp_std::marker::PhantomData<T>);

impl<T> WeightToFeePolynomial for LinearFee<T>
where
	T: BaseArithmetic + From<u32> + Copy + Unsigned,
{
	type Balance = T;

	fn polynomial() -> WeightToFeeCoefficients<Self::Balance> {
		smallvec!(WeightToFeeCoefficient {
			coeff_integer: 146_700u32.into(), // Targeting 0.1 Unique per NFT transfer
			coeff_frac: Perbill::zero(),
			negative: false,
			degree: 1,
		})
	}
}

impl pallet_transaction_payment::Config for Runtime {
	type OnChargeTransaction = pallet_transaction_payment::CurrencyAdapter<Balances, DealWithFees>;
	type TransactionByteFee = TransactionByteFee;
	type WeightToFee = LinearFee<Balance>;
	type FeeMultiplierUpdate = ();
}

parameter_types! {
	pub const ProposalBond: Permill = Permill::from_percent(5);
	pub const ProposalBondMinimum: Balance = 1 * UNIQUE;
	pub const SpendPeriod: BlockNumber = 5 * MINUTES;
	pub const Burn: Permill = Permill::from_percent(0);
	pub const TipCountdown: BlockNumber = 1 * DAYS;
	pub const TipFindersFee: Percent = Percent::from_percent(20);
	pub const TipReportDepositBase: Balance = 1 * UNIQUE;
	pub const DataDepositPerByte: Balance = 1 * CENTIUNIQUE;
	pub const BountyDepositBase: Balance = 1 * UNIQUE;
	pub const BountyDepositPayoutDelay: BlockNumber = 1 * DAYS;
	pub const TreasuryModuleId: PalletId = PalletId(*b"py/trsry");
	pub const BountyUpdatePeriod: BlockNumber = 14 * DAYS;
	pub const MaximumReasonLength: u32 = 16384;
	pub const BountyCuratorDeposit: Permill = Permill::from_percent(50);
	pub const BountyValueMinimum: Balance = 5 * UNIQUE;
	pub const MaxApprovals: u32 = 100;
}

impl pallet_treasury::Config for Runtime {
	type PalletId = TreasuryModuleId;
	type Currency = Balances;
	type ApproveOrigin = EnsureRoot<AccountId>;
	type RejectOrigin = EnsureRoot<AccountId>;
	type Event = Event;
	type OnSlash = ();
	type ProposalBond = ProposalBond;
	type ProposalBondMinimum = ProposalBondMinimum;
	type SpendPeriod = SpendPeriod;
	type Burn = Burn;
	type BurnDestination = ();
	type SpendFunds = ();
	type WeightInfo = pallet_treasury::weights::SubstrateWeight<Self>;
	type MaxApprovals = MaxApprovals;
}

impl pallet_sudo::Config for Runtime {
	type Event = Event;
	type Call = Call;
}

parameter_types! {
	pub const MinVestedTransfer: Balance = 10 * UNIQUE;
}

impl pallet_vesting::Config for Runtime {
	type Event = Event;
	type Currency = Balances;
	type BlockNumberToBalance = ConvertInto;
	type MinVestedTransfer = MinVestedTransfer;
	type WeightInfo = ();
}

parameter_types! {
	pub const ReservedDmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT / 4;
	pub const ReservedXcmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT / 4;
}

impl cumulus_pallet_parachain_system::Config for Runtime {
	type Event = Event;
	type OnValidationData = ();
	type SelfParaId = parachain_info::Pallet<Self>;
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
	pub const RelayLocation: MultiLocation = X1(Parent);
	pub const RelayNetwork: NetworkId = NetworkId::Polkadot;
	pub RelayOrigin: Origin = cumulus_pallet_xcm::Origin::Relay.into();
	pub Ancestry: MultiLocation = X1(Parachain(ParachainInfo::parachain_id().into()));
}

/// Type for specifying how a `MultiLocation` can be converted into an `AccountId`. This is used
/// when determining ownership of accounts for asset transacting and when attempting to use XCM
/// `Transact` in order to determine the dispatch Origin.
pub type LocationToAccountId = (
	// The parent (Relay-chain) origin converts to the default `AccountId`.
	ParentIsDefault<AccountId>,
	// Sibling parachain origins convert to AccountId via the `ParaId::into`.
	SiblingParachainConvertsVia<Sibling, AccountId>,
	// Straight up local `AccountId32` origins just alias directly to `AccountId`.
	AccountId32Aliases<RelayNetwork, AccountId>,
);

/// Means for transacting assets on this chain.
pub type LocalAssetTransactor = CurrencyAdapter<
	// Use this currency:
	Balances,
	// Use this currency when it is a fungible asset matching the given location or name:
	IsConcrete<RelayLocation>,
	// Do a simple punn to convert an AccountId32 MultiLocation into a native chain account ID:
	LocationToAccountId,
	// Our chain's account ID type (we can't get away without mentioning it explicitly):
	AccountId,
	// We don't track any teleports.
	(),
>;

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
	pub const WeightPrice: (MultiLocation, u128) = (X1(Parent), 1_200 * UNIQUE);
}

match_type! {
	pub type ParentOrParentsUnitPlurality: impl Contains<MultiLocation> = {
		X1(Parent) | X2(Parent, Plurality { id: BodyId::Unit, .. })
	};
}

pub type Barrier = (
	TakeWeightCredit,
	AllowTopLevelPaidExecutionFrom<All<MultiLocation>>,
	AllowUnpaidExecutionFrom<ParentOrParentsUnitPlurality>,
	// ^^^ Parent & its unit plurality gets free execution
);

pub struct XcmConfig;
impl Config for XcmConfig {
	type Call = Call;
	type XcmSender = XcmRouter;
	// How to withdraw and deposit an asset.
	type AssetTransactor = LocalAssetTransactor;
	type OriginConverter = XcmOriginToTransactDispatchOrigin;
	type IsReserve = NativeAsset;
	type IsTeleporter = NativeAsset; // <- should be enough to allow teleportation of ROC
	type LocationInverter = LocationInverter<Ancestry>;
	type Barrier = Barrier;
	type Weigher = FixedWeightBounds<UnitWeightCost, Call>;
	type Trader = UsingComponents<IdentityFee<Balance>, RelayLocation, AccountId, Balances, ()>;
	type ResponseHandler = (); // Don't handle responses for now.
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
	cumulus_primitives_utility::ParentAsUmp<ParachainSystem>,
	// ..and XCMP to communicate with the sibling chains.
	XcmpQueue,
);

impl pallet_evm_coder_substrate::Config for Runtime {
	type EthereumTransactionSender = pallet_ethereum::Module<Self>;
}

impl pallet_xcm::Config for Runtime {
	type Event = Event;
	type SendXcmOrigin = EnsureXcmOrigin<Origin, LocalOriginToLocation>;
	type XcmRouter = XcmRouter;
	type ExecuteXcmOrigin = EnsureXcmOrigin<Origin, LocalOriginToLocation>;
	type XcmExecuteFilter = All<(MultiLocation, Xcm<Call>)>;
	type XcmExecutor = XcmExecutor<XcmConfig>;
	type XcmTeleportFilter = All<(MultiLocation, Vec<MultiAsset>)>;
	type XcmReserveTransferFilter = ();
	type Weigher = FixedWeightBounds<UnitWeightCost, Call>;
}

impl cumulus_pallet_xcm::Config for Runtime {
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig>;
}

impl cumulus_pallet_xcmp_queue::Config for Runtime {
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig>;
	type ChannelInfo = ParachainSystem;
}

impl cumulus_pallet_dmp_queue::Config for Runtime {
	type Event = Event;
	type XcmExecutor = XcmExecutor<XcmConfig>;
	type ExecuteOverweightOrigin = frame_system::EnsureRoot<AccountId>;
}

impl pallet_aura::Config for Runtime {
	type AuthorityId = AuraId;
}

parameter_types! {
	pub const CollectionNumberLimit: u32 = 100000;
	pub const AccountTokenOwnershipLimit: u32 = 1000000;
	pub const CollectionAdminsLimit: u64 = 5;
	pub const CustomDataLimit: u32 = 2048;
	pub const NftSponsorTransferTimeout: u32 = 5;
	pub const FungibleSponsorTransferTimeout: u32 = 5;
	pub const ReFungibleSponsorTransferTimeout: u32 = 5;
	pub const OffchainSchemaLimit: u32 = 1024;
	pub const VariableOnChainSchemaLimit: u32 = 1024;
	pub const ConstOnChainSchemaLimit: u32 = 1024;
	pub const MaxItemsPerBatch: u32 = 200;
}

pub struct ChainLimits;
impl nft_data_structs::ChainLimits for ChainLimits {
    type CollectionNumberLimit = CollectionNumberLimit;
    type AccountTokenOwnershipLimit = AccountTokenOwnershipLimit;
    type CollectionAdminsLimit = CollectionAdminsLimit;
    type CustomDataLimit = CustomDataLimit;
    type NftSponsorTransferTimeout = NftSponsorTransferTimeout;
    type FungibleSponsorTransferTimeout = FungibleSponsorTransferTimeout;
    type ReFungibleSponsorTransferTimeout = ReFungibleSponsorTransferTimeout;
    type OffchainSchemaLimit = OffchainSchemaLimit;
    type VariableOnChainSchemaLimit = VariableOnChainSchemaLimit;
    type ConstOnChainSchemaLimit = ConstOnChainSchemaLimit;
    type MaxItemsPerBatch = MaxItemsPerBatch;
}

parameter_types! {
	pub TreasuryAccountId: AccountId = TreasuryModuleId::get().into_account();
	pub const CollectionCreationPrice: Balance = 100 * UNIQUE;
}

/// Used for the pallet nft in `./nft.rs`
impl pallet_nft::Config for Runtime {
	type Event = Event;
	type WeightInfo = nft_weights::WeightInfo;

	type EvmBackwardsAddressMapping = pallet_nft::MapBackwardsAddressTruncated;
	type EvmAddressMapping = HashedAddressMapping<Self::Hashing>;
	type CrossAccountId = pallet_nft::BasicCrossAccountId<Self>;

	type Currency = Balances;
	type CollectionCreationPrice = CollectionCreationPrice;
	type TreasuryAccountId = TreasuryAccountId;
	type ChainLimits = ChainLimits;
}

parameter_types! {
	pub const InflationBlockInterval: BlockNumber = 100; // every time per how many blocks inflation is applied
}

/// Used for the pallet inflation
impl pallet_inflation::Config for Runtime {
	type Currency = Balances;
	type TreasuryAccountId = TreasuryAccountId;
	type InflationBlockInterval = InflationBlockInterval;
}

parameter_types! {
	pub MaximumSchedulerWeight: Weight = Perbill::from_percent(50) *
		RuntimeBlockWeights::get().max_block;
	pub const MaxScheduledPerBlock: u32 = 50;
}

pub struct Sponsoring;
impl SponsoringResolve<AccountId, Call> for Sponsoring {
	fn resolve(who: &AccountId, call: &Call) -> Option<AccountId>
	where
		Call: Dispatchable<Info = DispatchInfo>,
		AccountId: AsRef<[u8]>,
	{
		pallet_nft_transaction_payment::Module::<Runtime>::withdraw_type(who, call)
	}
}

type SponsorshipHandler = (
	pallet_nft::NftSponsorshipHandler<Runtime>,
	//pallet_contract_helpers::ContractSponsorshipHandler<Runtime>,
);

impl pallet_scheduler::Config for Runtime {
	type Event = Event;
	type Origin = Origin;
	type PalletsOrigin = OriginCaller;
	type Call = Call;
	type MaximumWeight = MaximumSchedulerWeight;
	type ScheduleOrigin = EnsureSigned<AccountId>;
	type MaxScheduledPerBlock = MaxScheduledPerBlock;
	type SponsorshipHandler = SponsorshipHandler;
	type WeightInfo = ();
}

impl pallet_nft_transaction_payment::Config for Runtime {
	type SponsorshipHandler = SponsorshipHandler;
}

impl pallet_evm_transaction_payment::Config for Runtime {
	type SponsorshipHandler = (
		pallet_nft::NftEthSponsorshipHandler<Self>,
		pallet_evm_contract_helpers::HelpersContractSponsoring<Self>,
	);
	type Currency = Balances;
}

impl pallet_nft_charge_transaction::Config for Runtime {}

// impl pallet_contract_helpers::Config for Runtime {
//	 type DefaultSponsoringRateLimit = DefaultSponsoringRateLimit;
// }

parameter_types! {
	// 0x842899ECF380553E8a4de75bF534cdf6fBF64049
	pub const HelpersContractAddress: H160 = H160([
		0x84, 0x28, 0x99, 0xec, 0xf3, 0x80, 0x55, 0x3e, 0x8a, 0x4d, 0xe7, 0x5b, 0xf5, 0x34, 0xcd, 0xf6, 0xfb, 0xf6, 0x40, 0x49,
	]);
}

impl pallet_evm_contract_helpers::Config for Runtime {
	type ContractAddress = HelpersContractAddress;
	type DefaultSponsoringRateLimit = DefaultSponsoringRateLimit;
}

construct_runtime!(
	pub enum Runtime where
		Block = Block,
		NodeBlock = opaque::Block,
		UncheckedExtrinsic = UncheckedExtrinsic
	{
		ParachainSystem: cumulus_pallet_parachain_system::{Pallet, Call, Storage, Inherent, Event<T>} = 20,
		ParachainInfo: parachain_info::{Pallet, Storage, Config} = 21,

		Aura: pallet_aura::{Pallet, Config<T>} = 22,
		AuraExt: cumulus_pallet_aura_ext::{Pallet, Config} = 23,

		Balances: pallet_balances::{Pallet, Call, Storage, Config<T>, Event<T>} = 30,
		RandomnessCollectiveFlip: pallet_randomness_collective_flip::{Pallet, Storage} = 31,
		Timestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent} = 32,
		TransactionPayment: pallet_transaction_payment::{Pallet, Storage} = 33,
		Treasury: pallet_treasury::{Pallet, Call, Storage, Config, Event<T>} = 34,
		Sudo: pallet_sudo::{Pallet, Call, Storage, Config<T>, Event<T>} = 35,
		System: system::{Pallet, Call, Storage, Config, Event<T>} = 36,
		Vesting: pallet_vesting::{Pallet, Call, Config<T>, Storage, Event<T>} = 37,
		// Contracts: pallet_contracts::{Pallet, Call, Storage, Event<T>} = 38,

		// XCM helpers.
		XcmpQueue: cumulus_pallet_xcmp_queue::{Pallet, Call, Storage, Event<T>} = 50,
		PolkadotXcm: pallet_xcm::{Pallet, Call, Event<T>, Origin} = 51,
		CumulusXcm: cumulus_pallet_xcm::{Pallet, Call, Event<T>, Origin} = 52,
		DmpQueue: cumulus_pallet_dmp_queue::{Pallet, Call, Storage, Event<T>} = 53,

		// Unique Pallets
		Inflation: pallet_inflation::{Pallet, Call, Storage} = 60,
		Nft: pallet_nft::{Pallet, Call, Config<T>, Storage, Event<T>} = 61,
		Scheduler: pallet_scheduler::{Pallet, Call, Storage, Event<T>} = 62,
		NftPayment: pallet_nft_transaction_payment::{Pallet, Call, Storage} = 63,
		Charging: pallet_nft_charge_transaction::{Pallet, Call, Storage } = 64,
		// ContractHelpers: pallet_contract_helpers::{Pallet, Call, Storage} = 65,

		// Frontier
		EVM: pallet_evm::{Pallet, Config, Call, Storage, Event<T>} = 100,
		Ethereum: pallet_ethereum::{Pallet, Config, Call, Storage, Event, ValidateUnsigned} = 101,

		EvmCoderSubstrate: pallet_evm_coder_substrate::{Pallet, Storage} = 150,
		EvmContractHelpers: pallet_evm_contract_helpers::{Pallet, Storage} = 151,
		EvmTransactionPayment: pallet_evm_transaction_payment::{Pallet} = 152,
	}
);

pub struct TransactionConverter;

impl fp_rpc::ConvertTransaction<UncheckedExtrinsic> for TransactionConverter {
	fn convert_transaction(&self, transaction: pallet_ethereum::Transaction) -> UncheckedExtrinsic {
		UncheckedExtrinsic::new_unsigned(
			pallet_ethereum::Call::<Runtime>::transact(transaction).into(),
		)
	}
}

impl fp_rpc::ConvertTransaction<opaque::UncheckedExtrinsic> for TransactionConverter {
	fn convert_transaction(
		&self,
		transaction: pallet_ethereum::Transaction,
	) -> opaque::UncheckedExtrinsic {
		let extrinsic = UncheckedExtrinsic::new_unsigned(
			pallet_ethereum::Call::<Runtime>::transact(transaction).into(),
		);
		let encoded = extrinsic.encode();
		opaque::UncheckedExtrinsic::decode(&mut &encoded[..])
			.expect("Encoded extrinsic is always valid")
	}
}

/// The address format for describing accounts.
pub type Address = sp_runtime::MultiAddress<AccountId, ()>;
/// Block header type as expected by this runtime.
pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
/// Block type as expected by this runtime.
pub type Block = generic::Block<Header, UncheckedExtrinsic>;
/// A Block signed with a Justification
pub type SignedBlock = generic::SignedBlock<Block>;
/// BlockId type as expected by this runtime.
pub type BlockId = generic::BlockId<Block>;
/// The SignedExtension to the basic transaction logic.
pub type SignedExtra = (
	system::CheckSpecVersion<Runtime>,
	// system::CheckTxVersion<Runtime>,
	system::CheckGenesis<Runtime>,
	system::CheckEra<Runtime>,
	system::CheckNonce<Runtime>,
	system::CheckWeight<Runtime>,
	pallet_nft_charge_transaction::ChargeTransactionPayment<Runtime>,
	//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
);
/// Unchecked extrinsic type as expected by this runtime.
pub type UncheckedExtrinsic = generic::UncheckedExtrinsic<Address, Call, Signature, SignedExtra>;
/// Extrinsic type that has already been checked.
pub type CheckedExtrinsic = generic::CheckedExtrinsic<AccountId, Call, SignedExtra>;
/// Executive: handles dispatch to the various modules.
pub type Executive = frame_executive::Executive<
	Runtime,
	Block,
	frame_system::ChainContext<Runtime>,
	Runtime,
	AllPallets,
>;

impl_opaque_keys! {
	pub struct SessionKeys {
		pub aura: Aura,
	}
}

impl_runtime_apis! {
	impl pallet_nft::NftApi<Block>
		for Runtime
	{
		fn eth_contract_code(account: H160) -> Option<Vec<u8>> {
			<pallet_nft::NftErcSupport<Runtime>>::get_code(&account)
		}
	}

	impl sp_api::Core<Block> for Runtime {
		fn version() -> RuntimeVersion {
			VERSION
		}

		fn execute_block(block: Block) {
			Executive::execute_block(block)
		}

		fn initialize_block(header: &<Block as BlockT>::Header) {
			Executive::initialize_block(header)
		}
	}

	impl sp_api::Metadata<Block> for Runtime {
		fn metadata() -> OpaqueMetadata {
			Runtime::metadata().into()
		}
	}

	impl sp_block_builder::BlockBuilder<Block> for Runtime {
		fn apply_extrinsic(extrinsic: <Block as BlockT>::Extrinsic) -> ApplyExtrinsicResult {
			Executive::apply_extrinsic(extrinsic)
		}

		fn finalize_block() -> <Block as BlockT>::Header {
			Executive::finalize_block()
		}

		fn inherent_extrinsics(data: sp_inherents::InherentData) -> Vec<<Block as BlockT>::Extrinsic> {
			data.create_extrinsics()
		}

		fn check_inherents(
			block: Block,
			data: sp_inherents::InherentData,
		) -> sp_inherents::CheckInherentsResult {
			data.check_extrinsics(&block)
		}

		// fn random_seed() -> <Block as BlockT>::Hash {
		//     RandomnessCollectiveFlip::random_seed().0
		// }
	}

	impl sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block> for Runtime {
		fn validate_transaction(
			source: TransactionSource,
			tx: <Block as BlockT>::Extrinsic,
			hash: <Block as BlockT>::Hash,
		) -> TransactionValidity {
			Executive::validate_transaction(source, tx, hash)
		}
	}

	impl sp_offchain::OffchainWorkerApi<Block> for Runtime {
		fn offchain_worker(header: &<Block as BlockT>::Header) {
			Executive::offchain_worker(header)
		}
	}

	impl fp_rpc::EthereumRuntimeRPCApi<Block> for Runtime {
		fn chain_id() -> u64 {
			<Runtime as pallet_evm::Config>::ChainId::get()
		}

		fn account_basic(address: H160) -> EVMAccount {
			EVM::account_basic(&address)
		}

		fn gas_price() -> U256 {
			<Runtime as pallet_evm::Config>::FeeCalculator::min_gas_price()
		}

		fn account_code_at(address: H160) -> Vec<u8> {
			EVM::account_codes(address)
		}

		fn author() -> H160 {
			<pallet_evm::Module<Runtime>>::find_author()
		}

		fn storage_at(address: H160, index: U256) -> H256 {
			let mut tmp = [0u8; 32];
			index.to_big_endian(&mut tmp);
			EVM::account_storages(address, H256::from_slice(&tmp[..]))
		}

		fn call(
			from: H160,
			to: H160,
			data: Vec<u8>,
			value: U256,
			gas_limit: U256,
			gas_price: Option<U256>,
			nonce: Option<U256>,
			estimate: bool,
		) -> Result<pallet_evm::CallInfo, sp_runtime::DispatchError> {
			let config = if estimate {
				let mut config = <Runtime as pallet_evm::Config>::config().clone();
				config.estimate = true;
				Some(config)
			} else {
				None
			};

			<Runtime as pallet_evm::Config>::Runner::call(
				from,
				to,
				data,
				value,
				gas_limit.low_u64(),
				gas_price,
				nonce,
				config.as_ref().unwrap_or_else(|| <Runtime as pallet_evm::Config>::config()),
			).map_err(|err| err.into())
		}

		fn create(
			from: H160,
			data: Vec<u8>,
			value: U256,
			gas_limit: U256,
			gas_price: Option<U256>,
			nonce: Option<U256>,
			estimate: bool,
		) -> Result<pallet_evm::CreateInfo, sp_runtime::DispatchError> {
			let config = if estimate {
				let mut config = <Runtime as pallet_evm::Config>::config().clone();
				config.estimate = true;
				Some(config)
			} else {
				None
			};

			<Runtime as pallet_evm::Config>::Runner::create(
				from,
				data,
				value,
				gas_limit.low_u64(),
				gas_price,
				nonce,
				config.as_ref().unwrap_or_else(|| <Runtime as pallet_evm::Config>::config()),
			).map_err(|err| err.into())
		}

		fn current_transaction_statuses() -> Option<Vec<TransactionStatus>> {
			Ethereum::current_transaction_statuses()
		}

		fn current_block() -> Option<pallet_ethereum::Block> {
			Ethereum::current_block()
		}

		fn current_receipts() -> Option<Vec<pallet_ethereum::Receipt>> {
			Ethereum::current_receipts()
		}

		fn current_all() -> (
			Option<pallet_ethereum::Block>,
			Option<Vec<pallet_ethereum::Receipt>>,
			Option<Vec<TransactionStatus>>
		) {
			(
				Ethereum::current_block(),
				Ethereum::current_receipts(),
				Ethereum::current_transaction_statuses()
			)
		}

		fn extrinsic_filter(xts: Vec<<Block as sp_api::BlockT>::Extrinsic>) -> Vec<pallet_ethereum::Transaction> {
			xts.into_iter().filter_map(|xt| match xt.function {
				Call::Ethereum(pallet_ethereum::Call::transact(t)) => Some(t),
				_ => None
			}).collect()
		}
	}

	impl sp_session::SessionKeys<Block> for Runtime {
		fn decode_session_keys(
			encoded: Vec<u8>,
		) -> Option<Vec<(Vec<u8>, KeyTypeId)>> {
			SessionKeys::decode_into_raw_public_keys(&encoded)
		}

		fn generate_session_keys(seed: Option<Vec<u8>>) -> Vec<u8> {
			SessionKeys::generate(seed)
		}
	}

	impl sp_consensus_aura::AuraApi<Block, AuraId> for Runtime {
		fn slot_duration() -> sp_consensus_aura::SlotDuration {
			sp_consensus_aura::SlotDuration::from_millis(Aura::slot_duration())
		}

		fn authorities() -> Vec<AuraId> {
			Aura::authorities()
		}
	}

	impl cumulus_primitives_core::CollectCollationInfo<Block> for Runtime {
		fn collect_collation_info() -> cumulus_primitives_core::CollationInfo {
			ParachainSystem::collect_collation_info()
		}
	}

	impl frame_system_rpc_runtime_api::AccountNonceApi<Block, AccountId, Index> for Runtime {
		fn account_nonce(account: AccountId) -> Index {
			System::account_nonce(account)
		}
	}

	impl pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance> for Runtime {
		fn query_info(uxt: <Block as BlockT>::Extrinsic, len: u32) -> RuntimeDispatchInfo<Balance> {
			TransactionPayment::query_info(uxt, len)
		}
		fn query_fee_details(uxt: <Block as BlockT>::Extrinsic, len: u32) -> FeeDetails<Balance> {
			TransactionPayment::query_fee_details(uxt, len)
		}
	}

	/*
	impl pallet_contracts_rpc_runtime_api::ContractsApi<Block, AccountId, Balance, BlockNumber, Hash>
		for Runtime
	{
		fn call(
			origin: AccountId,
			dest: AccountId,
			value: Balance,
			gas_limit: u64,
			input_data: Vec<u8>,
		) -> pallet_contracts_primitives::ContractExecResult {
			Contracts::bare_call(origin, dest, value, gas_limit, input_data, false)
		}

		fn instantiate(
			origin: AccountId,
			endowment: Balance,
			gas_limit: u64,
			code: pallet_contracts_primitives::Code<Hash>,
			data: Vec<u8>,
			salt: Vec<u8>,
		) -> pallet_contracts_primitives::ContractInstantiateResult<AccountId, BlockNumber>
		{
			Contracts::bare_instantiate(origin, endowment, gas_limit, code, data, salt, true, false)
		}

		fn get_storage(
			address: AccountId,
			key: [u8; 32],
		) -> pallet_contracts_primitives::GetStorageResult {
			Contracts::get_storage(address, key)
		}

		fn rent_projection(
			address: AccountId,
		) -> pallet_contracts_primitives::RentProjectionResult<BlockNumber> {
			Contracts::rent_projection(address)
		}
	}
	*/

	#[cfg(feature = "runtime-benchmarks")]
	impl frame_benchmarking::Benchmark<Block> for Runtime {
		fn dispatch_benchmark(
			config: frame_benchmarking::BenchmarkConfig
		) -> Result<Vec<frame_benchmarking::BenchmarkBatch>, sp_runtime::RuntimeString> {
			use frame_benchmarking::{Benchmarking, BenchmarkBatch, add_benchmark, TrackedStorageKey};

			let whitelist: Vec<TrackedStorageKey> = vec![
				// Alice account
				hex_literal::hex!("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d").to_vec().into(),
				// // Total Issuance
				// hex_literal::hex!("c2261276cc9d1f8598ea4b6a74b15c2f57c875e4cff74148e4628f264b974c80").to_vec().into(),
				// // Execution Phase
				// hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef7ff553b5a9862a516939d82b3d3d8661a").to_vec().into(),
				// // Event Count
				// hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef70a98fdbe9ce6c55837576c60c7af3850").to_vec().into(),
				// // System Events
				// hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7").to_vec().into(),
			];

			let mut batches = Vec::<BenchmarkBatch>::new();
			let params = (&config, &whitelist);

			add_benchmark!(params, batches, pallet_nft, Nft);
			add_benchmark!(params, batches, pallet_inflation, Inflation);

			if batches.is_empty() { return Err("Benchmark not found for this pallet.".into()) }
			Ok(batches)
		}
	}
}

struct CheckInherents;

impl cumulus_pallet_parachain_system::CheckInherents<Block> for CheckInherents {
	fn check_inherents(
		block: &Block,
		relay_state_proof: &cumulus_pallet_parachain_system::RelayChainStateProof,
	) -> sp_inherents::CheckInherentsResult {
		let relay_chain_slot = relay_state_proof
			.read_slot()
			.expect("Could not read the relay chain slot from the proof");

		let inherent_data =
			cumulus_primitives_timestamp::InherentDataProvider::from_relay_chain_slot_and_duration(
				relay_chain_slot,
				sp_std::time::Duration::from_secs(6),
			)
			.create_inherent_data()
			.expect("Could not create the timestamp inherent data");

		inherent_data.check_extrinsics(block)
	}
}

cumulus_pallet_parachain_system::register_validate_block!(
	Runtime = Runtime,
	BlockExecutor = cumulus_pallet_aura_ext::BlockExecutor::<Runtime, Executive>,
	CheckInherents = CheckInherents,
);
