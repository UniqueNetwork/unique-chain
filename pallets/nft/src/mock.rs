#![allow(clippy::from_over_into)]

use crate as pallet_template;
use sp_core::H256;
use frame_support::{parameter_types, traits::Everything, weights::IdentityFee};
use sp_runtime::{
	traits::{BlakeTwo256, IdentityLookup},
	testing::Header,
};
use pallet_transaction_payment::{CurrencyAdapter};
use frame_system as system;
use pallet_evm::AddressMapping;
use crate::{CrossAccountId};
use codec::{Encode, Decode};
use scale_info::TypeInfo;

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

// Configure a mock runtime to test the pallet.
frame_support::construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
		TemplateModule: pallet_template::{Pallet, Call, Storage},
		Balances: pallet_balances::{Pallet, Call, Storage},
		Common: pallet_common::{Pallet, Storage, Event<T>},
		Fungible: pallet_fungible::{Pallet, Storage},
		Refungible: pallet_refungible::{Pallet, Storage},
		Nonfungible: pallet_nonfungible::{Pallet, Storage},
	}
);

parameter_types! {
	pub const BlockHashCount: u64 = 250;
	pub const SS58Prefix: u8 = 42;
}

impl system::Config for Test {
	type BaseCallFilter = Everything;
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
	type OnSetCode = ();
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
	type MaxReserves = ();
	type ReserveIdentifier = [u8; 8];
}

parameter_types! {
	pub const TransactionByteFee: u64 = 1;
	pub const OperationalFeeMultiplier: u8 = 5;
}

impl pallet_transaction_payment::Config for Test {
	type OnChargeTransaction = CurrencyAdapter<pallet_balances::Pallet<Test>, ()>;
	type TransactionByteFee = TransactionByteFee;
	type WeightToFee = IdentityFee<u64>;
	type FeeMultiplierUpdate = ();
	type OperationalFeeMultiplier = OperationalFeeMultiplier;
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

parameter_types! {
	pub const CollectionCreationPrice: u32 = 0;
	pub TreasuryAccountId: u64 = 1234;
	pub EthereumChainId: u32 = 1111;
}

pub struct TestEvmAddressMapping;
impl AddressMapping<u64> for TestEvmAddressMapping {
	fn into_account_id(_addr: sp_core::H160) -> u64 {
		unimplemented!()
	}
}

impl pallet_common::Config for Test {
	type Event = ();
	type EvmBackwardsAddressMapping = TestEvmBackwardsAddressMapping;
	type EvmAddressMapping = TestEvmAddressMapping;
	type CrossAccountId = TestCrossAccountId;
	type Currency = Balances;
	type CollectionCreationPrice = CollectionCreationPrice;
	type TreasuryAccountId = TreasuryAccountId;
}

impl pallet_fungible::Config for Test {
	type WeightInfo = pallet_fungible::weights::SubstrateWeight<Self>;
}
impl pallet_refungible::Config for Test {
	type WeightInfo = pallet_refungible::weights::SubstrateWeight<Self>;
}
impl pallet_nonfungible::Config for Test {
	type WeightInfo = pallet_nonfungible::weights::SubstrateWeight<Self>;
}

pub struct TestEvmBackwardsAddressMapping;
impl pallet_common::account::EvmBackwardsAddressMapping<u64> for TestEvmBackwardsAddressMapping {
	fn from_account_id(_account_id: u64) -> sp_core::H160 {
		unimplemented!()
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, Debug, Default, TypeInfo)]
pub struct TestCrossAccountId(u64, sp_core::H160);
impl CrossAccountId<u64> for TestCrossAccountId {
	fn from_sub(sub: u64) -> Self {
		let mut eth = [0; 20];
		eth[12..20].copy_from_slice(&sub.to_be_bytes());
		Self(sub, sp_core::H160(eth))
	}
	fn as_sub(&self) -> &u64 {
		&self.0
	}
	fn from_eth(eth: sp_core::H160) -> Self {
		let mut sub_raw = [0; 8];
		sub_raw.copy_from_slice(&eth.0[0..8]);
		let sub = u64::from_be_bytes(sub_raw);
		Self(sub, eth)
	}
	fn as_eth(&self) -> &sp_core::H160 {
		&self.1
	}
	fn conv_eq(&self, other: &Self) -> bool {
		true
	}
	// fn default() -> Self {
	// 	0
	// } 
}

pub struct TestEtheremTransactionSender;
impl pallet_ethereum::EthereumTransactionSender for TestEtheremTransactionSender {
	fn submit_logs_transaction(
		_tx: pallet_ethereum::Transaction,
		_logs: Vec<pallet_ethereum::Log>,
	) -> Result<(), sp_runtime::DispatchError> {
		Ok(())
	}
}

impl pallet_evm_coder_substrate::Config for Test {
	type EthereumTransactionSender = TestEtheremTransactionSender;
}

impl pallet_template::Config for Test {
	// type Event = ();
	type WeightInfo = ();
	// type CollectionCreationPrice = CollectionCreationPrice;
	// type Currency = pallet_balances::Pallet<Test>;
	// type TreasuryAccountId = TreasuryAccountId;
	// type EvmAddressMapping = TestEvmAddressMapping;
	// type EvmBackwardsAddressMapping = TestEvmBackwardsAddressMapping;
	// type CrossAccountId = TestCrossAccountId;
}

// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	system::GenesisConfig::default()
		.build_storage::<Test>()
		.unwrap()
		.into()
}
