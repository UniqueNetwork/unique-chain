// Creating mock runtime here

use crate::{Module, Config};

use frame_support::{
    impl_outer_origin, parameter_types,
    weights::{Weight, IdentityFee},
};
use frame_system as system;
use system::limits::{BlockLength, BlockWeights};
use transaction_payment::{self, CurrencyAdapter};
use sp_core::H256;
use sp_runtime::{
    testing::Header,
    traits::{BlakeTwo256, IdentityLookup},
    Perbill,
};
use pallet_contracts::WeightInfo;
pub use pallet_balances;

impl_outer_origin! {
    pub enum Origin for Test {}
}

// For testing the pallet, we construct most of a mock runtime. This means
// first constructing a configuration type (`Test`) which `impl`s each of the
// configuration traits of pallets we want to use.
#[derive(Clone, Eq, PartialEq)]
pub struct Test;
parameter_types! {
    pub const BlockHashCount: u64 = 250;
	pub TestBlockWeights: BlockWeights = BlockWeights::default();
	pub TestBlockLength: BlockLength = BlockLength::default();
	pub SS58Prefix: u8 = 0;
}

impl system::Config for Test {
	type BaseCallFilter = ();
	type Origin = Origin;
	type Call = ();
	type Index = u64;
	type BlockNumber = u64;
	type Hash = H256;
	type Hashing = BlakeTwo256;
	type AccountId = u64;
	type Lookup = IdentityLookup<Self::AccountId>;
	type Header = Header;
	type Event = ();
	type BlockHashCount = BlockHashCount;
	type BlockWeights = TestBlockWeights;
	type DbWeight = ();
	type BlockLength = TestBlockLength;
	type Version = ();
	type PalletInfo = ();
	type AccountData = pallet_balances::AccountData<u64>;
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type SS58Prefix = SS58Prefix;
	type SystemWeightInfo = ();
}

parameter_types! {
	pub const ExistentialDeposit: u64 = 1;
	pub const MaxLocks: u32 = 50;
}

type System = frame_system::Module<Test>;
impl pallet_balances::Config for Test {
    type AccountStore = System;
    type Balance = u64;
    type DustRemoval = ();
    type Event = ();
	type ExistentialDeposit = ExistentialDeposit;
	type WeightInfo = ();
	type MaxLocks = MaxLocks;
}

parameter_types! {
	pub const TransactionByteFee: u64 = 1;
}

impl transaction_payment::Config for Test {
	type OnChargeTransaction = CurrencyAdapter<pallet_balances::Module<Test>, ()>;
	type TransactionByteFee = TransactionByteFee;
	type WeightToFee = IdentityFee<u64>;
	type FeeMultiplierUpdate = ();
}


parameter_types! {
	pub const MinimumPeriod: u64 = 1;
}
impl pallet_timestamp::Config for Test {
	type Moment = u64;
	type OnTimestampSet = ();
	type MinimumPeriod = MinimumPeriod;
	type WeightInfo = ();
}

type Timestamp = pallet_timestamp::Module<Test>;
type Randomness = pallet_randomness_collective_flip::Module<Test>;

parameter_types! {
	pub const TombstoneDeposit: u64 = 1;
	pub const DepositPerContract: u64 = 1;
	pub const DepositPerStorageByte: u64 = 1;
	pub const DepositPerStorageItem: u64 = 1;
	pub RentFraction: Perbill = Perbill::from_rational_approximation(1u32, 30 * 24 * 60 * 10);
	pub const SurchargeReward: u64 = 1;
	pub const SignedClaimHandicap: u32 = 2;
	pub const MaxDepth: u32 = 32;
	pub const MaxValueSize: u32 = 16 * 1024;
	pub DeletionWeightLimit: Weight = Perbill::from_percent(10) *
		TestBlockWeights::get().max_block;
	pub DeletionQueueDepth: u32 = ((DeletionWeightLimit::get() / (
		<Test as pallet_contracts::Config>::WeightInfo::on_initialize_per_queue_item(1) -
		<Test as pallet_contracts::Config>::WeightInfo::on_initialize_per_queue_item(0)
	)) / 5) as u32;
}

impl pallet_contracts::Config for Test {
	type Time = Timestamp;
	type Randomness = Randomness;
	type Currency = pallet_balances::Module<Test>;
	type Event = ();
	type RentPayment = ();
	type SignedClaimHandicap = SignedClaimHandicap;
	type TombstoneDeposit = TombstoneDeposit;
	type DepositPerContract = DepositPerContract;
	type DepositPerStorageByte = DepositPerStorageByte;
	type DepositPerStorageItem = DepositPerStorageItem;
	type RentFraction = RentFraction;
	type SurchargeReward = SurchargeReward;
	type DeletionWeightLimit = DeletionWeightLimit;
	type MaxDepth = MaxDepth;
	type DeletionQueueDepth = DeletionQueueDepth;
	type MaxValueSize = MaxValueSize;
	type ChainExtension = ();
	type WeightPrice = ();
	type WeightInfo = pallet_contracts::weights::SubstrateWeight<Self>;
}

impl Config for Test {
	type Event = ();
	type WeightInfo = ();

}
pub type TemplateModule = Module<Test>;


// This function basically just builds a genesis storage key/value store according to
// our desired mockup.
pub fn new_test_ext() -> sp_io::TestExternalities {
    system::GenesisConfig::default()
        .build_storage::<Test>()
        .unwrap()
        .into()
}
