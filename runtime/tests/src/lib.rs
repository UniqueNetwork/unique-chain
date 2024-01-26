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

#![allow(clippy::from_over_into)]

use frame_support::{
	pallet_prelude::Weight,
	parameter_types,
	traits::{fungible::Inspect, ConstU32, ConstU64, Everything},
	weights::IdentityFee,
	PalletId,
};
use frame_system as system;
use pallet_ethereum::PostLogContent;
use pallet_evm::{
	account::CrossAccountId, AddressMapping, BackwardsAddressMapping, EnsureAddressNever,
	SubstrateBlockHashMapping,
};
use pallet_transaction_payment::CurrencyAdapter;
use parity_scale_codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;
use sp_core::{H160, H256, U256};
use sp_runtime::{
	traits::{BlakeTwo256, IdentityLookup},
	BuildStorage,
};
use up_data_structs::mapping::{CrossTokenAddressMapping, EvmTokenAddressMapping};

mod dispatch;

use dispatch::CollectionDispatchT;

mod weights;

use weights::CommonWeights;

type Block = frame_system::mocking::MockBlockU32<Test>;

#[cfg(test)]
mod tests;

// Configure a mock runtime to test the pallet.
frame_support::construct_runtime!(
	pub enum Test {
		System: frame_system,
		Timestamp: pallet_timestamp,
		Unique: pallet_unique,
		Balances: pallet_balances,
		Common: pallet_common,
		Fungible: pallet_fungible,
		Refungible: pallet_refungible,
		Nonfungible: pallet_nonfungible,
		Structure: pallet_structure,
		TransactionPayment: pallet_transaction_payment,
		Ethereum: pallet_ethereum,
		EVM: pallet_evm,
	}
);

parameter_types! {
	pub const BlockHashCount: u32 = 250;
	pub const SS58Prefix: u8 = 42;
}

impl system::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type BaseCallFilter = Everything;
	type Block = Block;
	type BlockWeights = ();
	type BlockLength = ();
	type DbWeight = ();
	type RuntimeOrigin = RuntimeOrigin;
	type RuntimeCall = RuntimeCall;
	type Nonce = u64;
	type Hash = H256;
	type Hashing = BlakeTwo256;
	type AccountId = u64;
	type Lookup = IdentityLookup<Self::AccountId>;
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
	pub const MaxLocks: u32 = 50;
}
//frame_system::Module<Test>;
impl pallet_balances::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type AccountStore = System;
	type Balance = u64;
	type DustRemoval = ();
	type ExistentialDeposit = ExistentialDeposit;
	type WeightInfo = ();
	type MaxLocks = MaxLocks;
	type MaxReserves = ();
	type ReserveIdentifier = [u8; 8];
	type MaxFreezes = MaxLocks;
	type FreezeIdentifier = [u8; 8];
	type MaxHolds = MaxLocks;
	type RuntimeHoldReason = RuntimeHoldReason;
	type RuntimeFreezeReason = RuntimeFreezeReason;
}

parameter_types! {
	pub const OperationalFeeMultiplier: u8 = 5;
}

impl pallet_transaction_payment::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type OnChargeTransaction = CurrencyAdapter<pallet_balances::Pallet<Test>, ()>;
	type LengthToFee = IdentityFee<u64>;
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
	pub const CollectionCreationPrice: u32 = 100;
	pub TreasuryAccountId: u64 = 1234;
	pub ForeignAssetPalletId: PalletId = PalletId(*b"frgnasts");
	pub EthereumChainId: u32 = 1111;
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

impl Default for TestCrossAccountId {
	fn default() -> Self {
		Self::from_sub(0)
	}
}

parameter_types! {
	pub BlockGasLimit: U256 = 0u32.into();
	pub WeightPerGas: Weight = Weight::from_parts(20, 0);
	pub const PostBlockAndTxnHashes: PostLogContent = PostLogContent::BlockAndTxnHashes;
}

impl pallet_ethereum::Config for Test {
	type RuntimeEvent = RuntimeEvent;
	type StateRoot = pallet_ethereum::IntermediateStateRoot<Self>;
	type PostLogContent = PostBlockAndTxnHashes;
	type ExtraDataLength = ConstU32<32>;
}

impl pallet_evm::Config for Test {
	type WeightInfo = pallet_evm::weights::SubstrateWeight<Self>;
	type CrossAccountId = TestCrossAccountId;
	type AddressMapping = TestEvmAddressMapping;
	type BackwardsAddressMapping = TestEvmBackwardsAddressMapping;
	type RuntimeEvent = RuntimeEvent;
	type FeeCalculator = ();
	type GasWeightMapping = pallet_evm::FixedGasWeightMapping<Self>;
	type WeightPerGas = WeightPerGas;
	type CallOrigin = EnsureAddressNever<Self>;
	type WithdrawOrigin = EnsureAddressNever<Self>;
	type Currency = Balances;
	type PrecompilesType = ();
	type PrecompilesValue = ();
	type Runner = pallet_evm::runner::stack::Runner<Self>;
	type ChainId = ConstU64<0>;
	type BlockGasLimit = BlockGasLimit;
	type OnMethodCall = ();
	type OnCreate = ();
	type OnChargeTransaction = ();
	type OnCheckEvmTransaction = ();
	type FindAuthor = ();
	type BlockHashMapping = SubstrateBlockHashMapping<Self>;
	type Timestamp = Timestamp;
	type GasLimitPovSizeRatio = ConstU64<0>;
}
impl pallet_evm_coder_substrate::Config for Test {}

impl pallet_common::Config for Test {
	type WeightInfo = ();
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type CollectionCreationPrice = CollectionCreationPrice;
	type TreasuryAccountId = TreasuryAccountId;

	type CollectionDispatch = CollectionDispatchT<Self>;
	type EvmTokenAddressMapping = EvmTokenAddressMapping;
	type CrossTokenAddressMapping = CrossTokenAddressMapping<Self::AccountId>;
	type ContractAddress = EvmCollectionHelpersAddress;
}

impl pallet_structure::Config for Test {
	type WeightInfo = ();
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
}
impl pallet_fungible::Config for Test {
	type WeightInfo = ();
}
impl pallet_refungible::Config for Test {
	type WeightInfo = ();
}
impl pallet_nonfungible::Config for Test {
	type WeightInfo = ();
}
parameter_types! {
	pub const Decimals: u8 = 18;
	pub Name: String = "Test".to_string();
	pub Symbol: String = "TST".to_string();
}
impl pallet_balances_adapter::Config for Test {
	type Inspect = Balances;
	type Mutate = Balances;
	type CurrencyBalance = <Balances as Inspect<Self::AccountId>>::Balance;
	type Decimals = Decimals;
	type Name = Name;
	type Symbol = Symbol;
	type XcmDepositorPalletId = ForeignAssetPalletId;
	type WeightInfo = ();
}

parameter_types! {
	// 0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f
	pub const EvmCollectionHelpersAddress: H160 = H160([
		0x6c, 0x4e, 0x9f, 0xe1, 0xae, 0x37, 0xa4, 0x1e, 0x93, 0xce, 0xe4, 0x29, 0xe8, 0xe1, 0x88, 0x1a, 0xbd, 0xcb, 0xb5, 0x4f,
	]);
}

impl pallet_unique::Config for Test {
	type WeightInfo = ();
	type CommonWeightInfo = CommonWeights<Self>;
	type RefungibleExtensionsWeightInfo = CommonWeights<Self>;
	type StructureWeightInfo = pallet_structure::weights::SubstrateWeight<Self>;
}

// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	<system::GenesisConfig<Test>>::default()
		.build_storage()
		.unwrap()
		.into()
}
