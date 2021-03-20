use crate as pallet_template;
use sp_core::H256;
use frame_support::{ 
	parameter_types,
	weights::IdentityFee,
};
use sp_runtime::{
	traits::{BlakeTwo256, IdentityLookup}, 
	testing::Header, 
	Perbill,
};
use pallet_transaction_payment::{ CurrencyAdapter};
use frame_system as system;

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>; 

// Configure a mock runtime to test the pallet.
frame_support::construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Module, Call, Config, Storage, Event<T>},
		TemplateModule: pallet_template::{Module, Call, Storage},
	}
);

parameter_types! {
	pub const BlockHashCount: u64 = 250;
	pub const SS58Prefix: u8 = 42;
}

impl system::Config for Test {
	type BaseCallFilter = ();
	type BlockWeights = ();
	type BlockLength = ();
	type DbWeight = ();
	type Origin = Origin;
	type Call = Call;
	type Index = u64;
	type BlockNumber = u64;
	type Hash = H256;
	type Hashing = BlakeTwo256;
	type AccountId = u64;
	type Lookup = IdentityLookup<Self::AccountId>;
	type Header = Header;
	type Event = ();
	type BlockHashCount = BlockHashCount;
	type Version = ();
	type PalletInfo = PalletInfo;
	type AccountData = pallet_balances::AccountData<u64>;
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type SystemWeightInfo = ();
	type SS58Prefix = SS58Prefix;
}

parameter_types! {
	pub const ExistentialDeposit: u64 = 1;
	pub const MaxLocks: u32 = 50;
}
//frame_system::Module<Test>;
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

impl pallet_transaction_payment::Config for Test {
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
	pub DeletionWeightLimit: u64 = u64::MAX;//Perbill::from_percent(10);
	pub DeletionQueueDepth: u32 = 10;
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
	type MaxCodeSize = ();
	type WeightPrice = ();
	type WeightInfo = pallet_contracts::weights::SubstrateWeight<Self>;
}

parameter_types! {
	pub const CollectionCreationPrice: u64 = 1_000_000_000_000;
}

impl pallet_template::Config for Test {
	type Event = ();
	type WeightInfo = ();
	type CollectionCreationPrice = CollectionCreationPrice;
}

// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	system::GenesisConfig::default().build_storage::<Test>().unwrap().into()
}