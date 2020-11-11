// Creating mock runtime here

use crate::{Module, Trait};

use pallet_contracts::{
	ContractAddressFor, TrieId, TrieIdGenerator,
};

use frame_support::{
    impl_outer_origin, parameter_types,
    weights::{
      //  constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight},
        Weight, IdentityFee,
    },
};
use frame_system as system;
use transaction_payment;
use sp_core::H256;
use sp_runtime::{
    testing::Header,
    traits::{BlakeTwo256, IdentityLookup, Saturating},
    Perbill,
};
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
    pub const MaximumBlockWeight: Weight = 1024;
    pub const MaximumBlockLength: u32 = 2 * 1024;
    pub const AvailableBlockRatio: Perbill = Perbill::from_percent(75);
    pub MaximumExtrinsicWeight: Weight = AvailableBlockRatio::get()
    .saturating_sub(Perbill::from_percent(10)) * MaximumBlockWeight::get();
}

impl system::Trait for Test {
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
	type MaximumBlockWeight = MaximumBlockWeight;
	type DbWeight = ();
	type BlockExecutionWeight = ();
	type ExtrinsicBaseWeight = ();
	type MaximumExtrinsicWeight = MaximumBlockWeight;
	type MaximumBlockLength = MaximumBlockLength;
	type AvailableBlockRatio = AvailableBlockRatio;
	type Version = ();
	type PalletInfo = ();
	type AccountData = pallet_balances::AccountData<u64>;
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type SystemWeightInfo = ();
}

parameter_types! {
	pub const ExistentialDeposit: u64 = 1;
	pub const MaxLocks: u32 = 50;
}

type System = frame_system::Module<Test>;
impl pallet_balances::Trait for Test {
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
impl transaction_payment::Trait for Test {
	type Currency = pallet_balances::Module<Test>;
	type OnTransactionPayment = ();
	type TransactionByteFee = TransactionByteFee;
	type WeightToFee = IdentityFee<u64>;
	type FeeMultiplierUpdate = ();
}


parameter_types! {
	pub const MinimumPeriod: u64 = 1;
}
impl pallet_timestamp::Trait for Test {
	type Moment = u64;
	type OnTimestampSet = ();
	type MinimumPeriod = MinimumPeriod;
	type WeightInfo = ();
}

type Timestamp = pallet_timestamp::Module<Test>;
type Randomness = pallet_randomness_collective_flip::Module<Test>;

parameter_types! {
	pub const TombstoneDeposit: u64 = 1;
	pub const RentByteFee: u64 = 1;
	pub const RentDepositOffset: u64 = 1;
	pub const SurchargeReward: u64 = 1;
}

pub struct DummyTrieIdGenerator;
impl TrieIdGenerator<u64> for DummyTrieIdGenerator {
	fn trie_id(account_id: &u64) -> TrieId {
		let new_seed = *account_id + 1;
		let mut res = vec![];
		res.extend_from_slice(&new_seed.to_le_bytes());
		res.extend_from_slice(&account_id.to_le_bytes());
		res
	}
}

pub struct DummyContractAddressFor;
impl ContractAddressFor<H256, u64> for DummyContractAddressFor {
	fn contract_address_for(_code_hash: &H256, _data: &[u8], origin: &u64) -> u64 {
		*origin + 1
	}
}

impl pallet_contracts::Trait for Test {
	type Time = Timestamp;
	type Randomness = Randomness;
	type Currency = pallet_balances::Module<Test>;
	type Event = ();
	type DetermineContractAddress = DummyContractAddressFor;
	type TrieIdGenerator = DummyTrieIdGenerator;
	type RentPayment = ();
	type SignedClaimHandicap = pallet_contracts::DefaultSignedClaimHandicap;
	type TombstoneDeposit = TombstoneDeposit;
	type StorageSizeOffset = pallet_contracts::DefaultStorageSizeOffset;
	type RentByteFee = RentByteFee;
	type RentDepositOffset = RentDepositOffset;
	type SurchargeReward = SurchargeReward;
	type MaxDepth = pallet_contracts::DefaultMaxDepth;
	type MaxValueSize = pallet_contracts::DefaultMaxValueSize;
	type WeightPrice = ();
}

impl Trait for Test {
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
