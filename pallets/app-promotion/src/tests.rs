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

#![cfg(test)]
#![allow(clippy::from_over_into)]
use crate as pallet_promotion;

use frame_benchmarking::{add_benchmark, BenchmarkBatch};
use frame_support::{
	assert_ok, parameter_types,
	traits::{Currency, OnInitialize, Everything, ConstU32},
};
use frame_system::RawOrigin;
use sp_core::H256;
use sp_runtime::{
	traits::{BlakeTwo256, BlockNumberProvider, IdentityLookup},
	testing::Header,
	Perbill,
};

// type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
// type Block = frame_system::mocking::MockBlock<Test>;

// parameter_types! {
// 	pub const BlockHashCount: u64 = 250;
// 	pub BlockWeights: frame_system::limits::BlockWeights =
// 		frame_system::limits::BlockWeights::simple_max(1024);
// 	pub const SS58Prefix: u8 = 42;
// 	pub TreasuryAccountId: u64 = 1234;
// 	pub const InflationBlockInterval: u32 = 100; // every time per how many blocks inflation is applied
// 	pub static MockBlockNumberProvider: u64 = 0;
// 	pub const ExistentialDeposit: u64 = 1;
// 	pub const MaxLocks: u32 = 50;
// }

// impl BlockNumberProvider for MockBlockNumberProvider {
// 	type BlockNumber = u64;

// 	fn current_block_number() -> Self::BlockNumber {
// 		Self::get()
// 	}
// }

// frame_support::construct_runtime!(
// 	pub enum Test where
// 		Block = Block,
// 		NodeBlock = Block,
// 		UncheckedExtrinsic = UncheckedExtrinsic,
// 	{
// 		Balances: pallet_balances::{Pallet, Call, Storage},
// 		System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
// 		Promotion: pallet_promotion::{Pallet, Call, Storage}
// 	}
// );

// impl frame_system::Config for Test {
// 	type BaseCallFilter = Everything;
// 	type BlockWeights = ();
// 	type BlockLength = ();
// 	type DbWeight = ();
// 	type Origin = Origin;
// 	type Call = Call;
// 	type Index = u64;
// 	type BlockNumber = u64;
// 	type Hash = H256;
// 	type Hashing = BlakeTwo256;
// 	type AccountId = u64;
// 	type Lookup = IdentityLookup<Self::AccountId>;
// 	type Header = Header;
// 	type Event = ();
// 	type BlockHashCount = BlockHashCount;
// 	type Version = ();
// 	type PalletInfo = PalletInfo;
// 	type AccountData = pallet_balances::AccountData<u64>;
// 	type OnNewAccount = ();
// 	type OnKilledAccount = ();
// 	type SystemWeightInfo = ();
// 	type SS58Prefix = SS58Prefix;
// 	type OnSetCode = ();
// 	type MaxConsumers = ConstU32<16>;
// }

// impl pallet_balances::Config for Test {
// 	type AccountStore = System;
// 	type Balance = u64;
// 	type DustRemoval = ();
// 	type Event = ();
// 	type ExistentialDeposit = ExistentialDeposit;
// 	type WeightInfo = ();
// 	type MaxLocks = MaxLocks;
// 	type MaxReserves = ();
// 	type ReserveIdentifier = [u8; 8];
// }

// impl pallet_promotion::Config for Test {
// 	type Currency = Balances;

// 	type TreasuryAccountId = TreasuryAccountId;

// 	type BlockNumberProvider = MockBlockNumberProvider;
// }

// pub fn new_test_ext() -> sp_io::TestExternalities {
// 	frame_system::GenesisConfig::default()
// 		.build_storage::<Test>()
// 		.unwrap()
// 		.into()
// }

// #[test]
// fn test_benchmark() {
// 	new_test_ext().execute_with(|| {
// 		test_benchmark_stake::<Test>();
// 	} )
// }
