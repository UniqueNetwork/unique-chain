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

use sp_core::{H256, U256};
use frame_support::{
	parameter_types,
	traits::{Everything, ConstU32, ConstU64},
	weights::IdentityFee,
};
use sp_runtime::{
	traits::{BlakeTwo256, IdentityLookup},
	testing::Header,
};
use pallet_transaction_payment::{CurrencyAdapter};
use frame_system as system;
use pallet_evm::{
	AddressMapping, account::CrossAccountId, EnsureAddressNever, SubstrateBlockHashMapping,
};
use fp_evm_mapping::EvmBackwardsAddressMapping;
use parity_scale_codec::{Encode, Decode, MaxEncodedLen};
use scale_info::TypeInfo;

use unique_runtime_common::{dispatch::CollectionDispatchT, weights::CommonWeights};
use up_data_structs::mapping::{CrossTokenAddressMapping, EvmTokenAddressMapping};

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

#[cfg(test)]
mod tests;

// Configure a mock runtime to test the pallet.
frame_support::construct_runtime!(
	pub enum Test where
		Block = Block,
		NodeBlock = Block,
		UncheckedExtrinsic = UncheckedExtrinsic,
	{
		System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
		Unique: pallet_unique::{Pallet, Call, Storage},
		Balances: pallet_balances::{Pallet, Call, Storage},
		Common: pallet_common::{Pallet, Storage, Event<T>},
		Fungible: pallet_fungible::{Pallet, Storage},
		Refungible: pallet_refungible::{Pallet, Storage},
		Nonfungible: pallet_nonfungible::{Pallet, Storage},
		EVM: pallet_evm::{Pallet, Config, Call, Storage, Event<T>},
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
	type MaxConsumers = ConstU32<16>;
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
	pub const OperationalFeeMultiplier: u8 = 5;
}

impl pallet_transaction_payment::Config for Test {
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
	pub EthereumChainId: u32 = 1111;
}

pub struct TestEvmAddressMapping;
impl AddressMapping<u64> for TestEvmAddressMapping {
	fn into_account_id(_addr: sp_core::H160) -> u64 {
		unimplemented!()
	}
}

pub struct TestEvmBackwardsAddressMapping;
impl EvmBackwardsAddressMapping<u64> for TestEvmBackwardsAddressMapping {
	fn from_account_id(_account_id: u64) -> sp_core::H160 {
		unimplemented!()
	}
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, PartialOrd, Ord, Debug, TypeInfo, MaxEncodedLen)]
pub struct TestCrossAccountId(u64, sp_core::H160);
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
		Self(sub, sp_core::H160(eth))
	}
	fn from_eth(eth: sp_core::H160) -> Self {
		let mut sub_raw = [0; 8];
		sub_raw.copy_from_slice(&eth.0[0..8]);
		let sub = u64::from_be_bytes(sub_raw);
		Self(sub, eth)
	}
	fn conv_eq(&self, other: &Self) -> bool {
		self.as_sub() == other.as_sub()
	}
}

impl Default for TestCrossAccountId {
	fn default() -> Self {
		Self::from_sub(0)
	}
}

parameter_types! {
	pub BlockGasLimit: U256 = 0u32.into();
}

impl pallet_evm::Config for Test {
	type Event = ();
	type FeeCalculator = ();
	type GasWeightMapping = ();
	type CallOrigin = EnsureAddressNever<Self::CrossAccountId>;
	type WithdrawOrigin = EnsureAddressNever<Self::CrossAccountId>;
	type AddressMapping = TestEvmAddressMapping;
	type Currency = Balances;
	type PrecompilesType = ();
	type PrecompilesValue = ();
	type Runner = pallet_evm::runner::stack::Runner<Self>;
	type ChainId = ConstU64<0>;
	type BlockGasLimit = BlockGasLimit;
	type OnMethodCall = ();
	type OnCreate = ();
	type OnChargeTransaction = ();
	type FindAuthor = ();
	type BlockHashMapping = SubstrateBlockHashMapping<Self>;
	type TransactionValidityHack = ();
}
impl pallet_evm_coder_substrate::Config for Test {
	type GasWeightMapping = ();
}

impl pallet_common::Config for Test {
	type WeightInfo = ();
	type Event = ();
	type Currency = Balances;
	type CollectionCreationPrice = CollectionCreationPrice;
	type TreasuryAccountId = TreasuryAccountId;

	type CollectionDispatch = CollectionDispatchT<Self>;
	type EvmTokenAddressMapping = EvmTokenAddressMapping;
	type CrossTokenAddressMapping = CrossTokenAddressMapping<Self::AccountId>;
}

impl pallet_evm::account::Config for Test {
	type CrossAccountId = TestCrossAccountId;
	type EvmAddressMapping = TestEvmAddressMapping;
	type EvmBackwardsAddressMapping = TestEvmBackwardsAddressMapping;
}

impl pallet_structure::Config for Test {
	type WeightInfo = ();
	type Event = ();
	type Call = Call;
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

impl pallet_unique::Config for Test {
	type Event = ();
	type WeightInfo = ();
	type CommonWeightInfo = CommonWeights<Self>;
}

// Build genesis storage according to the mock runtime.
pub fn new_test_ext() -> sp_io::TestExternalities {
	system::GenesisConfig::default()
		.build_storage::<Test>()
		.unwrap()
		.into()
}
