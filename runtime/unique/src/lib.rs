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

//! The Substrate Node Template runtime. This can be compiled with `#[no_std]`, ready for Wasm.

#![cfg_attr(not(feature = "std"), no_std)]
// `construct_runtime!` does a lot of recursion and requires us to increase the limit to 256.
#![recursion_limit = "1024"]
#![allow(clippy::from_over_into, clippy::identity_op)]
#![allow(clippy::fn_to_numeric_cast_with_truncation)]

use codec::{Decode, Encode};
use fp_rpc::TransactionStatus;
use fp_self_contained::*;
pub use frame_support::{
	ConsensusEngineId, construct_runtime,
	dispatch::DispatchResult,
	match_types, PalletId, parameter_types, StorageValue,
	traits::{
		ConstU32, Currency, Everything, ExistenceRequirement, FindAuthor, Get, Imbalance, IsInVec,
		KeyOwnerProofSystem, LockIdentifier, NamedReservableCurrency,
		OnUnbalanced as OnUnbalancedT, OnUnbalanced, PrivilegeCmp, Randomness,
		tokens::currency::Currency as CurrencyT,
	},
	weights::{
		ConstantMultiplier,
		constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
		DispatchClass, DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
		WeightToFee, WeightToFeeCoefficient, WeightToFeeCoefficients, WeightToFeePolynomial,
	},
};
use frame_system::{
	self as frame_system, EnsureRoot, EnsureSigned,
	limits::{BlockLength, BlockWeights},
};
pub use pallet_balances::Call as BalancesCall;
pub use pallet_evm::{
	Account as EVMAccount, account::CrossAccountId as _, EnsureAddressTruncated, FeeCalculator,
	GasWeightMapping, HashedAddressMapping, OnMethodCall, Runner,
};
pub use pallet_transaction_payment::{
	FeeDetails, Multiplier, RuntimeDispatchInfo, TargetedFeeAdjustment,
};
use smallvec::smallvec;
use sp_api::impl_runtime_apis;
use sp_arithmetic::{
	traits::{BaseArithmetic, Unsigned},
};
// pub use pallet_timestamp::Call as TimestampCall;
pub use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_core::{crypto::KeyTypeId, H160, H256, OpaqueMetadata, U256};
use sp_runtime::{
	ApplyExtrinsicResult, create_runtime_str, DispatchError, DispatchErrorWithPostInfo, generic,
	generic::Era,
	impl_opaque_keys, Perbill, Percent, Permill, RuntimeAppPublic,
	traits::{
		AccountIdConversion, AccountIdLookup, Applyable, BlakeTwo256, Block as BlockT,
		BlockNumberProvider, Dispatchable, DispatchInfoOf, Member, PostDispatchInfoOf,
	},
	transaction_validity::{TransactionSource, TransactionValidity, TransactionValidityError},
};
use sp_std::{cmp::Ordering, prelude::*};
#[cfg(feature = "std")]
use sp_version::NativeVersion;
use sp_version::RuntimeVersion;
pub use xcm_config::*;

use pallet_unique_scheduler::DispatchCall;
use unique_runtime_common::{
	constants::*,
	dispatch::{CollectionDispatch, CollectionDispatchT},
	eth_sponsoring::UniqueEthSponsorshipHandler,
	impl_common_runtime_apis,
	sponsoring::UniqueSponsorshipHandler,
	types::*,
	weights::CommonWeights,
};
use up_data_structs::{
	CollectionId, CollectionLimits, CollectionStats,
	mapping::{CrossTokenAddressMapping, EvmTokenAddressMapping},
	Property, PropertyKeyPermission, RmrkBaseId, RmrkBaseInfo, RmrkCollectionId,
	RmrkCollectionInfo, RmrkInstanceInfo, RmrkNftChild, RmrkNftId, RmrkPartType, RmrkPropertyInfo,
	RmrkPropertyKey, RmrkResourceId, RmrkResourceInfo, RmrkTheme, RmrkThemeName, RpcCollection,
	TokenChild, TokenData, TokenId,
};

// Make the WASM binary available.
#[cfg(feature = "std")]
include!(concat!(env!("OUT_DIR"), "/wasm_binary.rs"));

// #[cfg(any(feature = "std", test))]
// pub use sp_runtime::BuildStorage;

pub mod xcm_config;

pub const RUNTIME_NAME: &str = "unique";
pub const TOKEN_SYMBOL: &str = "UNQ";

type CrossAccountId = pallet_evm::account::BasicCrossAccountId<Runtime>;

impl RuntimeInstance for Runtime {
	type CrossAccountId = self::CrossAccountId;
	type TransactionConverter = self::TransactionConverter;

	fn get_transaction_converter() -> TransactionConverter {
		TransactionConverter
	}
}

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
pub type DigestItem = generic::DigestItem;

/// Opaque types. These are used by the CLI to instantiate machinery that don't need to know
/// the specifics of the runtime. They can then be made to be agnostic over specific formats
/// of data like extrinsics, allowing for them to continue syncing the network through upgrades
/// to even the core data structures.
pub mod opaque {
	use sp_std::prelude::*;
	use sp_runtime::impl_opaque_keys;
	use super::Aura;

	pub use unique_runtime_common::types::*;

	impl_opaque_keys! {
		pub struct SessionKeys {
			pub aura: Aura,
		}
	}
}

/// This runtime version.
pub const VERSION: RuntimeVersion = RuntimeVersion {
	spec_name: create_runtime_str!(RUNTIME_NAME),
	impl_name: create_runtime_str!(RUNTIME_NAME),
	authoring_version: 1,
	spec_version: 923000,
	impl_version: 0,
	apis: RUNTIME_API_VERSIONS,
	transaction_version: 1,
	state_version: 0,
};

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
	pub const SS58Prefix: u16 = 7391;
}

parameter_types! {
	pub const ChainId: u64 = 8880;
}

pub struct FixedFee;
impl FeeCalculator for FixedFee {
	fn min_gas_price() -> (U256, u64) {
		(MIN_GAS_PRICE.into(), 0)
	}
}

// Assuming slowest ethereum opcode is SSTORE, with gas price of 20000 as our worst case
// (contract, which only writes a lot of data),
// approximating on top of our real store write weight
parameter_types! {
	pub const WritesPerSecond: u64 = WEIGHT_PER_SECOND / <Runtime as frame_system::Config>::DbWeight::get().write;
	pub const GasPerSecond: u64 = WritesPerSecond::get() * 20000;
	pub const WeightPerGas: u64 = WEIGHT_PER_SECOND / GasPerSecond::get();
}

/// Limiting EVM execution to 50% of block for substrate users and management tasks
/// EVM transaction consumes more weight than substrate's, so we can't rely on them being
/// scheduled fairly
const EVM_DISPATCH_RATIO: Perbill = Perbill::from_percent(50);
parameter_types! {
	pub BlockGasLimit: U256 = U256::from(NORMAL_DISPATCH_RATIO * EVM_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT / WeightPerGas::get());
}

pub enum FixedGasWeightMapping {}
impl GasWeightMapping for FixedGasWeightMapping {
	fn gas_to_weight(gas: u64) -> Weight {
		gas.saturating_mul(WeightPerGas::get())
	}
	fn weight_to_gas(weight: Weight) -> u64 {
		weight / WeightPerGas::get()
	}
}

impl pallet_evm::account::Config for Runtime {
	type CrossAccountId = pallet_evm::account::BasicCrossAccountId<Self>;
	type EvmAddressMapping = pallet_evm::HashedAddressMapping<Self::Hashing>;
	type EvmBackwardsAddressMapping = fp_evm_mapping::MapBackwardsAddressTruncated;
}

impl pallet_evm::Config for Runtime {
	type BlockGasLimit = BlockGasLimit;
	type FeeCalculator = FixedFee;
	type GasWeightMapping = FixedGasWeightMapping;
	type BlockHashMapping = pallet_ethereum::EthereumBlockHashMapping<Self>;
	type CallOrigin = EnsureAddressTruncated<Self>;
	type WithdrawOrigin = EnsureAddressTruncated<Self>;
	type AddressMapping = HashedAddressMapping<Self::Hashing>;
	type PrecompilesType = ();
	type PrecompilesValue = ();
	type Currency = Balances;
	type Event = Event;
	type OnMethodCall = (
		pallet_evm_migration::OnMethodCall<Self>,
		pallet_evm_contract_helpers::HelpersOnMethodCall<Self>,
		CollectionDispatchT<Self>,
		pallet_unique::eth::CollectionHelpersOnMethodCall<Self>,
	);
	type OnCreate = pallet_evm_contract_helpers::HelpersOnCreate<Self>;
	type ChainId = ChainId;
	type Runner = pallet_evm::runner::stack::Runner<Self>;
	type OnChargeTransaction = pallet_evm::EVMCurrencyAdapter<Balances, DealWithFees>;
	type TransactionValidityHack = pallet_evm_transaction_payment::TransactionValidityHack<Self>;
	type FindAuthor = EthereumFindAuthor<Aura>;
}

impl pallet_evm_migration::Config for Runtime {
	type WeightInfo = pallet_evm_migration::weights::SubstrateWeight<Self>;
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

impl pallet_ethereum::Config for Runtime {
	type Event = Event;
	type StateRoot = pallet_ethereum::IntermediateStateRoot<Self>;
}

impl pallet_randomness_collective_flip::Config for Runtime {}

impl frame_system::Config for Runtime {
	/// The data to be stored in an account.
	type AccountData = pallet_balances::AccountData<Balance>;
	/// The identifier used to distinguish between accounts.
	type AccountId = AccountId;
	/// The basic call filter to use in dispatchable.
	type BaseCallFilter = Everything;
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
	type SystemWeightInfo = frame_system::weights::SubstrateWeight<Self>;
	/// Version of the runtime.
	type Version = Version;
	type MaxConsumers = ConstU32<16>;
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
	pub const MaxReserves: u32 = 50;
}

impl pallet_balances::Config for Runtime {
	type MaxLocks = MaxLocks;
	type MaxReserves = MaxReserves;
	type ReserveIdentifier = [u8; 16];
	/// The type for recording an account's balance.
	type Balance = Balance;
	/// The ubiquitous event type.
	type Event = Event;
	type DustRemoval = Treasury;
	type ExistentialDeposit = ExistentialDeposit;
	type AccountStore = System;
	type WeightInfo = pallet_balances::weights::SubstrateWeight<Self>;
}

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
	/// This value increases the priority of `Operational` transactions by adding
	/// a "virtual tip" that's equal to the `OperationalFeeMultiplier * final_fee`.
	pub const OperationalFeeMultiplier: u8 = 5;
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
			coeff_integer: WEIGHT_TO_FEE_COEFF.into(),
			coeff_frac: Perbill::zero(),
			negative: false,
			degree: 1,
		})
	}
}

impl pallet_transaction_payment::Config for Runtime {
	type OnChargeTransaction = pallet_transaction_payment::CurrencyAdapter<Balances, DealWithFees>;
	type LengthToFee = ConstantMultiplier<Balance, TransactionByteFee>;
	type OperationalFeeMultiplier = OperationalFeeMultiplier;
	type WeightToFee = LinearFee<Balance>;
	type FeeMultiplierUpdate = ();
}

parameter_types! {
	pub const ProposalBond: Permill = Permill::from_percent(5);
	pub const ProposalBondMinimum: Balance = 1 * UNIQUE;
	pub const ProposalBondMaximum: Balance = 1000 * UNIQUE;
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
	type ProposalBondMaximum = ProposalBondMaximum;
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

pub struct RelayChainBlockNumberProvider<T>(sp_std::marker::PhantomData<T>);

impl<T: cumulus_pallet_parachain_system::Config> BlockNumberProvider
	for RelayChainBlockNumberProvider<T>
{
	type BlockNumber = BlockNumber;

	fn current_block_number() -> Self::BlockNumber {
		cumulus_pallet_parachain_system::Pallet::<T>::validation_data()
			.map(|d| d.relay_parent_number)
			.unwrap_or_default()
	}
}

parameter_types! {
	pub const MinVestedTransfer: Balance = 10 * UNIQUE;
	pub const MaxVestingSchedules: u32 = 28;
}

impl orml_vesting::Config for Runtime {
	type Event = Event;
	type Currency = pallet_balances::Pallet<Runtime>;
	type MinVestedTransfer = MinVestedTransfer;
	type VestedTransferOrigin = EnsureSigned<AccountId>;
	type WeightInfo = ();
	type MaxVestingSchedules = MaxVestingSchedules;
	type BlockNumberProvider = RelayChainBlockNumberProvider<Runtime>;
}

impl pallet_aura::Config for Runtime {
	type AuthorityId = AuraId;
	type DisabledValidators = ();
	type MaxAuthorities = MaxAuthorities;
}

parameter_types! {
	pub TreasuryAccountId: AccountId = TreasuryModuleId::get().into_account_truncating();
	pub const CollectionCreationPrice: Balance = 2 * UNIQUE;
}

impl pallet_common::Config for Runtime {
	type WeightInfo = pallet_common::weights::SubstrateWeight<Self>;
	type Event = Event;
	type Currency = Balances;
	type CollectionCreationPrice = CollectionCreationPrice;
	type TreasuryAccountId = TreasuryAccountId;
	type CollectionDispatch = CollectionDispatchT<Self>;

	type EvmTokenAddressMapping = EvmTokenAddressMapping;
	type CrossTokenAddressMapping = CrossTokenAddressMapping<Self::AccountId>;
	type ContractAddress = EvmCollectionHelpersAddress;
}

impl pallet_structure::Config for Runtime {
	type Event = Event;
	type Call = Call;
	type WeightInfo = pallet_structure::weights::SubstrateWeight<Self>;
}

impl pallet_fungible::Config for Runtime {
	type WeightInfo = pallet_fungible::weights::SubstrateWeight<Self>;
}
impl pallet_refungible::Config for Runtime {
	type WeightInfo = pallet_refungible::weights::SubstrateWeight<Self>;
}
impl pallet_nonfungible::Config for Runtime {
	type WeightInfo = pallet_nonfungible::weights::SubstrateWeight<Self>;
}

impl pallet_unique::Config for Runtime {
	type Event = Event;
	type WeightInfo = pallet_unique::weights::SubstrateWeight<Self>;
	type CommonWeightInfo = CommonWeights<Self>;
}

parameter_types! {
	pub const InflationBlockInterval: BlockNumber = 100; // every time per how many blocks inflation is applied
}

/// Used for the pallet inflation
impl pallet_inflation::Config for Runtime {
	type Currency = Balances;
	type TreasuryAccountId = TreasuryAccountId;
	type InflationBlockInterval = InflationBlockInterval;
	type BlockNumberProvider = RelayChainBlockNumberProvider<Runtime>;
}

parameter_types! {
	pub MaximumSchedulerWeight: Weight = Perbill::from_percent(50) *
		RuntimeBlockWeights::get().max_block;
	pub const MaxScheduledPerBlock: u32 = 50;
}

type ChargeTransactionPayment = pallet_charge_transaction::ChargeTransactionPayment<Runtime>;

fn get_signed_extras(from: <Runtime as frame_system::Config>::AccountId) -> SignedExtraScheduler {
	(
		frame_system::CheckSpecVersion::<Runtime>::new(),
		frame_system::CheckGenesis::<Runtime>::new(),
		frame_system::CheckEra::<Runtime>::from(Era::Immortal),
		frame_system::CheckNonce::<Runtime>::from(frame_system::Pallet::<Runtime>::account_nonce(
			from,
		)),
		frame_system::CheckWeight::<Runtime>::new(),
		// sponsoring transaction logic
		// pallet_charge_transaction::ChargeTransactionPayment::<Runtime>::new(0),
	)
}

pub struct SchedulerPaymentExecutor;
impl<T: frame_system::Config + pallet_unique_scheduler::Config, SelfContainedSignedInfo>
	DispatchCall<T, SelfContainedSignedInfo> for SchedulerPaymentExecutor
where
	<T as frame_system::Config>::Call: Member
		+ Dispatchable<Origin = Origin, Info = DispatchInfo>
		+ SelfContainedCall<SignedInfo = SelfContainedSignedInfo>
		+ GetDispatchInfo
		+ From<frame_system::Call<Runtime>>,
	SelfContainedSignedInfo: Send + Sync + 'static,
	Call: From<<T as frame_system::Config>::Call>
		+ From<<T as pallet_unique_scheduler::Config>::Call>
		+ SelfContainedCall<SignedInfo = SelfContainedSignedInfo>,
	sp_runtime::AccountId32: From<<T as frame_system::Config>::AccountId>,
{
	fn dispatch_call(
		signer: <T as frame_system::Config>::AccountId,
		call: <T as pallet_unique_scheduler::Config>::Call,
	) -> Result<
		Result<PostDispatchInfo, DispatchErrorWithPostInfo<PostDispatchInfo>>,
		TransactionValidityError,
	> {
		let dispatch_info = call.get_dispatch_info();
		let extrinsic = fp_self_contained::CheckedExtrinsic::<
			AccountId,
			Call,
			SignedExtraScheduler,
			SelfContainedSignedInfo,
		> {
			signed:
				CheckedSignature::<AccountId, SignedExtraScheduler, SelfContainedSignedInfo>::Signed(
					signer.clone().into(),
					get_signed_extras(signer.into()),
				),
			function: call.into(),
		};

		extrinsic.apply::<Runtime>(&dispatch_info, 0)
	}

	fn reserve_balance(
		id: [u8; 16],
		sponsor: <T as frame_system::Config>::AccountId,
		call: <T as pallet_unique_scheduler::Config>::Call,
		count: u32,
	) -> Result<(), DispatchError> {
		let dispatch_info = call.get_dispatch_info();
		let weight: Balance = ChargeTransactionPayment::traditional_fee(0, &dispatch_info, 0)
			.saturating_mul(count.into());

		<Balances as NamedReservableCurrency<AccountId>>::reserve_named(
			&id,
			&(sponsor.into()),
			weight,
		)
	}

	fn pay_for_call(
		id: [u8; 16],
		sponsor: <T as frame_system::Config>::AccountId,
		call: <T as pallet_unique_scheduler::Config>::Call,
	) -> Result<u128, DispatchError> {
		let dispatch_info = call.get_dispatch_info();
		let weight: Balance = ChargeTransactionPayment::traditional_fee(0, &dispatch_info, 0);
		Ok(
			<Balances as NamedReservableCurrency<AccountId>>::unreserve_named(
				&id,
				&(sponsor.into()),
				weight,
			),
		)
	}

	fn cancel_reserve(
		id: [u8; 16],
		sponsor: <T as frame_system::Config>::AccountId,
	) -> Result<u128, DispatchError> {
		Ok(
			<Balances as NamedReservableCurrency<AccountId>>::unreserve_named(
				&id,
				&(sponsor.into()),
				u128::MAX,
			),
		)
	}
}

parameter_types! {
	pub const NoPreimagePostponement: Option<u32> = Some(10);
	pub const Preimage: Option<u32> = Some(10);
}

/// Used the compare the privilege of an origin inside the scheduler.
pub struct OriginPrivilegeCmp;

impl PrivilegeCmp<OriginCaller> for OriginPrivilegeCmp {
	fn cmp_privilege(_left: &OriginCaller, _right: &OriginCaller) -> Option<Ordering> {
		Some(Ordering::Equal)
	}
}

impl pallet_unique_scheduler::Config for Runtime {
	type Event = Event;
	type Origin = Origin;
	type Currency = Balances;
	type PalletsOrigin = OriginCaller;
	type Call = Call;
	type MaximumWeight = MaximumSchedulerWeight;
	type ScheduleOrigin = EnsureSigned<AccountId>;
	type MaxScheduledPerBlock = MaxScheduledPerBlock;
	type WeightInfo = ();
	type CallExecutor = SchedulerPaymentExecutor;
	type OriginPrivilegeCmp = OriginPrivilegeCmp;
	type PreimageProvider = ();
	type NoPreimagePostponement = NoPreimagePostponement;
}

type EvmSponsorshipHandler = (
	UniqueEthSponsorshipHandler<Runtime>,
	pallet_evm_contract_helpers::HelpersContractSponsoring<Runtime>,
);
type SponsorshipHandler = (
	UniqueSponsorshipHandler<Runtime>,
	//pallet_contract_helpers::ContractSponsorshipHandler<Runtime>,
	pallet_evm_transaction_payment::BridgeSponsorshipHandler<Runtime>,
);

impl pallet_evm_transaction_payment::Config for Runtime {
	type EvmSponsorshipHandler = EvmSponsorshipHandler;
	type Currency = Balances;
}

impl pallet_charge_transaction::Config for Runtime {
	type SponsorshipHandler = SponsorshipHandler;
}

// impl pallet_contract_helpers::Config for Runtime {
//	 type DefaultSponsoringRateLimit = DefaultSponsoringRateLimit;
// }

parameter_types! {
	// 0x842899ECF380553E8a4de75bF534cdf6fBF64049
	pub const HelpersContractAddress: H160 = H160([
		0x84, 0x28, 0x99, 0xec, 0xf3, 0x80, 0x55, 0x3e, 0x8a, 0x4d, 0xe7, 0x5b, 0xf5, 0x34, 0xcd, 0xf6, 0xfb, 0xf6, 0x40, 0x49,
	]);

	// 0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f
	pub const EvmCollectionHelpersAddress: H160 = H160([
		0x6c, 0x4e, 0x9f, 0xe1, 0xae, 0x37, 0xa4, 0x1e, 0x93, 0xce, 0xe4, 0x29, 0xe8, 0xe1, 0x88, 0x1a, 0xbd, 0xcb, 0xb5, 0x4f,
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
		ParachainSystem: cumulus_pallet_parachain_system::{Pallet, Call, Config, Storage, Inherent, Event<T>, ValidateUnsigned} = 20,
		ParachainInfo: parachain_info::{Pallet, Storage, Config} = 21,

		Aura: pallet_aura::{Pallet, Config<T>} = 22,
		AuraExt: cumulus_pallet_aura_ext::{Pallet, Config} = 23,

		Balances: pallet_balances::{Pallet, Call, Storage, Config<T>, Event<T>} = 30,
		RandomnessCollectiveFlip: pallet_randomness_collective_flip::{Pallet, Storage} = 31,
		Timestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent} = 32,
		TransactionPayment: pallet_transaction_payment::{Pallet, Storage} = 33,
		Treasury: pallet_treasury::{Pallet, Call, Storage, Config, Event<T>} = 34,
		Sudo: pallet_sudo::{Pallet, Call, Storage, Config<T>, Event<T>} = 35,
		System: frame_system::{Pallet, Call, Storage, Config, Event<T>} = 36,
		Vesting: orml_vesting::{Pallet, Storage, Call, Event<T>, Config<T>} = 37,
		// Vesting: pallet_vesting::{Pallet, Call, Config<T>, Storage, Event<T>} = 37,
		// Contracts: pallet_contracts::{Pallet, Call, Storage, Event<T>} = 38,

		// XCM helpers.
		XcmpQueue: cumulus_pallet_xcmp_queue::{Pallet, Call, Storage, Event<T>} = 50,
		PolkadotXcm: pallet_xcm::{Pallet, Call, Event<T>, Origin} = 51,
		CumulusXcm: cumulus_pallet_xcm::{Pallet, Call, Event<T>, Origin} = 52,
		DmpQueue: cumulus_pallet_dmp_queue::{Pallet, Call, Storage, Event<T>} = 53,

		// Unique Pallets
		Inflation: pallet_inflation::{Pallet, Call, Storage} = 60,
		Unique: pallet_unique::{Pallet, Call, Storage, Event<T>} = 61,
		Scheduler: pallet_unique_scheduler::{Pallet, Call, Storage, Event<T>} = 62,
		// free = 63
		Charging: pallet_charge_transaction::{Pallet, Call, Storage } = 64,
		// ContractHelpers: pallet_contract_helpers::{Pallet, Call, Storage} = 65,
		Common: pallet_common::{Pallet, Storage, Event<T>} = 66,
		Fungible: pallet_fungible::{Pallet, Storage} = 67,
		Refungible: pallet_refungible::{Pallet, Storage} = 68,
		Nonfungible: pallet_nonfungible::{Pallet, Storage} = 69,
		Structure: pallet_structure::{Pallet, Call, Storage, Event<T>} = 70,

		// Frontier
		EVM: pallet_evm::{Pallet, Config, Call, Storage, Event<T>} = 100,
		Ethereum: pallet_ethereum::{Pallet, Config, Call, Storage, Event, Origin} = 101,

		EvmCoderSubstrate: pallet_evm_coder_substrate::{Pallet, Storage} = 150,
		EvmContractHelpers: pallet_evm_contract_helpers::{Pallet, Storage} = 151,
		EvmTransactionPayment: pallet_evm_transaction_payment::{Pallet} = 152,
		EvmMigration: pallet_evm_migration::{Pallet, Call, Storage} = 153,
	}
);

pub struct TransactionConverter;

impl fp_rpc::ConvertTransaction<UncheckedExtrinsic> for TransactionConverter {
	fn convert_transaction(&self, transaction: pallet_ethereum::Transaction) -> UncheckedExtrinsic {
		UncheckedExtrinsic::new_unsigned(
			pallet_ethereum::Call::<Runtime>::transact { transaction }.into(),
		)
	}
}

impl fp_rpc::ConvertTransaction<opaque::UncheckedExtrinsic> for TransactionConverter {
	fn convert_transaction(
		&self,
		transaction: pallet_ethereum::Transaction,
	) -> opaque::UncheckedExtrinsic {
		let extrinsic = UncheckedExtrinsic::new_unsigned(
			pallet_ethereum::Call::<Runtime>::transact { transaction }.into(),
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
	frame_system::CheckSpecVersion<Runtime>,
	// system::CheckTxVersion<Runtime>,
	frame_system::CheckGenesis<Runtime>,
	frame_system::CheckEra<Runtime>,
	frame_system::CheckNonce<Runtime>,
	frame_system::CheckWeight<Runtime>,
	pallet_charge_transaction::ChargeTransactionPayment<Runtime>,
	//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
	pallet_ethereum::FakeTransactionFinalizer<Runtime>,
);
pub type SignedExtraScheduler = (
	frame_system::CheckSpecVersion<Runtime>,
	frame_system::CheckGenesis<Runtime>,
	frame_system::CheckEra<Runtime>,
	frame_system::CheckNonce<Runtime>,
	frame_system::CheckWeight<Runtime>,
	// pallet_charge_transaction::ChargeTransactionPayment<Runtime>,
);
/// Unchecked extrinsic type as expected by this runtime.
pub type UncheckedExtrinsic =
	fp_self_contained::UncheckedExtrinsic<Address, Call, Signature, SignedExtra>;
/// Extrinsic type that has already been checked.
pub type CheckedExtrinsic = fp_self_contained::CheckedExtrinsic<AccountId, Call, SignedExtra, H160>;
/// Executive: handles dispatch to the various modules.
pub type Executive = frame_executive::Executive<
	Runtime,
	Block,
	frame_system::ChainContext<Runtime>,
	Runtime,
	AllPalletsReversedWithSystemFirst,
>;

impl_opaque_keys! {
	pub struct SessionKeys {
		pub aura: Aura,
	}
}

impl fp_self_contained::SelfContainedCall for Call {
	type SignedInfo = H160;

	fn is_self_contained(&self) -> bool {
		match self {
			Call::Ethereum(call) => call.is_self_contained(),
			_ => false,
		}
	}

	fn check_self_contained(&self) -> Option<Result<Self::SignedInfo, TransactionValidityError>> {
		match self {
			Call::Ethereum(call) => call.check_self_contained(),
			_ => None,
		}
	}

	fn validate_self_contained(
		&self,
		info: &Self::SignedInfo,
		dispatch_info: &DispatchInfoOf<Call>,
		len: usize,
	) -> Option<TransactionValidity> {
		match self {
			Call::Ethereum(call) => call.validate_self_contained(info, dispatch_info, len),
			_ => None,
		}
	}

	fn pre_dispatch_self_contained(
		&self,
		info: &Self::SignedInfo,
	) -> Option<Result<(), TransactionValidityError>> {
		match self {
			Call::Ethereum(call) => call.pre_dispatch_self_contained(info),
			_ => None,
		}
	}

	fn apply_self_contained(
		self,
		info: Self::SignedInfo,
	) -> Option<sp_runtime::DispatchResultWithInfo<PostDispatchInfoOf<Self>>> {
		match self {
			call @ Call::Ethereum(pallet_ethereum::Call::transact { .. }) => Some(call.dispatch(
				Origin::from(pallet_ethereum::RawOrigin::EthereumTransaction(info)),
			)),
			_ => None,
		}
	}
}

macro_rules! dispatch_unique_runtime {
	($collection:ident.$method:ident($($name:ident),*)) => {{
		let collection = <Runtime as pallet_common::Config>::CollectionDispatch::dispatch(<pallet_common::CollectionHandle<Runtime>>::try_get($collection)?);
		let dispatch = collection.as_dyn();

		Ok::<_, DispatchError>(dispatch.$method($($name),*))
	}};
}

impl_common_runtime_apis! {
	#![custom_apis]

	impl rmrk_rpc::RmrkApi<
		Block,
		AccountId,
		RmrkCollectionInfo<AccountId>,
		RmrkInstanceInfo<AccountId>,
		RmrkResourceInfo,
		RmrkPropertyInfo,
		RmrkBaseInfo<AccountId>,
		RmrkPartType,
		RmrkTheme
	> for Runtime {
		fn last_collection_idx() -> Result<RmrkCollectionId, DispatchError> {
			Ok(Default::default())
		}

		fn collection_by_id(_collection_id: RmrkCollectionId) -> Result<Option<RmrkCollectionInfo<AccountId>>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_by_id(_collection_id: RmrkCollectionId, _nft_by_id: RmrkNftId) -> Result<Option<RmrkInstanceInfo<AccountId>>, DispatchError> {
			Ok(Default::default())
		}

		fn account_tokens(_account_id: AccountId, _collection_id: RmrkCollectionId) -> Result<Vec<RmrkNftId>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_children(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId) -> Result<Vec<RmrkNftChild>, DispatchError> {
			Ok(Default::default())
		}

		fn collection_properties(_collection_id: RmrkCollectionId, _filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_properties(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId, _filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_resources(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId) -> Result<Vec<RmrkResourceInfo>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_resource_priority(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId, _resource_id: RmrkResourceId) -> Result<Option<u32>, DispatchError> {
			Ok(Default::default())
		}

		fn base(_base_id: RmrkBaseId) -> Result<Option<RmrkBaseInfo<AccountId>>, DispatchError> {
			Ok(Default::default())
		}

		fn base_parts(_base_id: RmrkBaseId) -> Result<Vec<RmrkPartType>, DispatchError> {
			Ok(Default::default())
		}

		fn theme_names(_base_id: RmrkBaseId) -> Result<Vec<RmrkThemeName>, DispatchError> {
			Ok(Default::default())
		}

		fn theme(_base_id: RmrkBaseId, _theme_name: RmrkThemeName, _filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Option<RmrkTheme>, DispatchError> {
			Ok(Default::default())
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
