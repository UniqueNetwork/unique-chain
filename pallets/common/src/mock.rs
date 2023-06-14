use crate::{CommonCollectionOperations, Config, dispatch::CollectionDispatch};
use frame_support::{
	ConsensusEngineId, parameter_types,
	pallet_prelude::*,
	traits::{ConstU32, Everything, FindAuthor},
};
use sp_core::{H160, H256, U256};
use sp_runtime::{testing::Header, traits::IdentityLookup};
use sp_std::{boxed::Box, prelude::*};
use codec::{Encode, Decode, MaxEncodedLen};
use scale_info::TypeInfo;

use pallet_evm::{
	EnsureAddressNever, EnsureAddressRoot, FeeCalculator, AddressMapping, account::CrossAccountId,
	BackwardsAddressMapping,
};
use up_data_structs::{
	CollectionId, CreateCollectionData, CollectionFlags,
	mapping::{CrossTokenAddressMapping, EvmTokenAddressMapping},
};

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

frame_support::construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system,
		Balances: pallet_balances::{Pallet, Call, Storage, Event<T>},
		Common: crate::{Pallet, Storage, Event<T>},
		EVM: pallet_evm::{Pallet, Config, Call, Storage, Event<T>},
		Timestamp: pallet_timestamp::{Pallet, Call, Storage},
	}
);

parameter_types! {
	pub const BlockHashCount: u64 = 250;
	pub const SS58Prefix: u8 = 42;
}

impl frame_system::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type BaseCallFilter = Everything;
	type BlockWeights = ();
	type BlockLength = ();
	type DbWeight = ();
	type RuntimeOrigin = RuntimeOrigin;
	type RuntimeCall = RuntimeCall;
	type Index = u64;
	type BlockNumber = u64;
	type Hash = H256;
	type Hashing = ::sp_runtime::traits::BlakeTwo256;
	type AccountId = u64;
	type Lookup = IdentityLookup<Self::AccountId>;
	type Header = Header;
	type BlockHashCount = BlockHashCount;
	type Version = ();
	type PalletInfo = PalletInfo;
	type AccountData = pallet_balances::AccountData<u64>;
	type OnNewAccount = ();
	type OnKilledAccount = ();
	type SystemWeightInfo = ();
	type SS58Prefix = SS58Prefix;
	type OnSetCode = ();
	type MaxConsumers = ConstU32<16>;
}

parameter_types! {
	pub const ExistentialDeposit: u64 = 1;
	pub const MaxLocks: u32 = 10;
}
impl pallet_balances::Config for Test {
	type Balance = u64;
	type DustRemoval = ();
	type RuntimeEvent = RuntimeEvent;
	type ExistentialDeposit = ExistentialDeposit;
	type AccountStore = System;
	type WeightInfo = ();
	type MaxLocks = MaxLocks;
	type MaxReserves = ();
	type ReserveIdentifier = [u8; 8];
	type FreezeIdentifier = ();
	type MaxFreezes = ();
	type HoldIdentifier = ();
	type MaxHolds = ();
}

impl Config for Test {
	type WeightInfo = ();
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type CollectionCreationPrice = ();
	type CollectionDispatch = CollectionDispatchMock;
	type TreasuryAccountId = ();
	type ContractAddress = ();
	type EvmTokenAddressMapping = EvmTokenAddressMapping;
	type CrossTokenAddressMapping = CrossTokenAddressMapping<Self::AccountId>;
}

impl pallet_evm_coder_substrate::Config for Test {}

parameter_types! {
	pub const MinimumPeriod: u64 = 1000;
}
impl pallet_timestamp::Config for Test {
	type Moment = u64;
	type OnTimestampSet = ();
	type MinimumPeriod = MinimumPeriod;
	type WeightInfo = ();
}

pub struct FixedGasPrice;
impl FeeCalculator for FixedGasPrice {
	fn min_gas_price() -> (U256, Weight) {
		// Return some meaningful gas price and weight
		(1_000_000_000u128.into(), Weight::from_parts(7u64, 0))
	}
}

pub struct FindAuthorTruncated;
impl FindAuthor<H160> for FindAuthorTruncated {
	fn find_author<'a, I>(_digests: I) -> Option<H160>
	where
		I: 'a + IntoIterator<Item = (ConsensusEngineId, &'a [u8])>,
	{
		unimplemented!()
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, Debug, TypeInfo, MaxEncodedLen)]
pub struct TestCrossAccountId(u64, sp_core::H160, bool);
impl CrossAccountId<u64> for TestCrossAccountId {
	fn as_sub(&self) -> &u64 {
		&self.0
	}
	fn as_eth(&self) -> &sp_core::H160 {
		&self.1
	}
	fn from_sub(sub: u64) -> Self {
		let mut eth = [0; 20];
		eth[12..20].copy_from_slice(&sub.to_be_bytes());
		Self(sub, sp_core::H160(eth), true)
	}
	fn from_eth(eth: sp_core::H160) -> Self {
		let mut sub_raw = [0; 8];
		sub_raw.copy_from_slice(&eth.0[0..8]);
		let sub = u64::from_be_bytes(sub_raw);
		Self(sub, eth, false)
	}
	fn conv_eq(&self, other: &Self) -> bool {
		self.as_sub() == other.as_sub()
	}
	fn is_canonical_substrate(&self) -> bool {
		self.2
	}
}

pub struct TestEvmAddressMapping;
impl AddressMapping<u64> for TestEvmAddressMapping {
	fn into_account_id(_addr: sp_core::H160) -> u64 {
		unimplemented!()
	}
}

pub struct TestEvmBackwardsAddressMapping;
impl BackwardsAddressMapping<u64> for TestEvmBackwardsAddressMapping {
	fn from_account_id(_account_id: u64) -> sp_core::H160 {
		unimplemented!()
	}
}

impl Default for TestCrossAccountId {
	fn default() -> Self {
		Self::from_sub(0)
	}
}

parameter_types! {
	pub BlockGasLimit: U256 = U256::max_value();
	pub WeightPerGas: Weight = Weight::from_parts(20_000, 0);
}

impl pallet_evm::Config for Test {
	type FeeCalculator = FixedGasPrice;
	type GasWeightMapping = pallet_evm::FixedGasWeightMapping<Self>;
	type WeightPerGas = WeightPerGas;

	type BlockHashMapping = pallet_evm::SubstrateBlockHashMapping<Self>;
	type CallOrigin = EnsureAddressRoot<Self>;

	type WithdrawOrigin = EnsureAddressNever<Self>;
	type Currency = Balances;

	type RuntimeEvent = RuntimeEvent;
	type PrecompilesType = ();
	type PrecompilesValue = ();
	type ChainId = ();
	type BlockGasLimit = BlockGasLimit;
	type Runner = pallet_evm::runner::stack::Runner<Self>;
	type OnChargeTransaction = ();
	type OnCreate = ();
	type FindAuthor = FindAuthorTruncated;
	type Timestamp = Timestamp;
	type WeightInfo = ();
	type CrossAccountId = TestCrossAccountId;
	type AddressMapping = TestEvmAddressMapping;
	type BackwardsAddressMapping = TestEvmBackwardsAddressMapping;
	type OnMethodCall = ();
	type TransactionValidityHack = ();
}

pub struct CollectionDispatchMock;

impl<T: Config> CollectionDispatch<T> for CollectionDispatchMock {
	fn check_is_internal(&self) -> DispatchResult {
		todo!()
	}

	fn create(
		_: <T>::CrossAccountId,
		_: <T>::CrossAccountId,
		_: CreateCollectionData<<T>::AccountId>,
		_: CollectionFlags,
	) -> Result<CollectionId, DispatchError> {
		todo!()
	}

	fn destroy(_: <T>::CrossAccountId, _: CollectionId) -> DispatchResult {
		todo!()
	}

	fn dispatch(_: CollectionId) -> Result<Self, DispatchError>
	where
		Self: Sized,
	{
		todo!()
	}

	fn as_dyn(&self) -> &dyn CommonCollectionOperations<T> {
		todo!()
	}
}

// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	frame_system::GenesisConfig::default()
		.build_storage::<Test>()
		.unwrap()
		.into()
}
