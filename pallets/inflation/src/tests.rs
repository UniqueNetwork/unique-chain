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
use frame_support::{
	assert_ok, parameter_types,
	traits::{
		fungible::{Balanced, Inspect},
		tokens::Precision,
		ConstU32, Everything, OnInitialize,
	},
	weights::Weight,
};
use frame_system::RawOrigin;
use sp_core::H256;
use sp_runtime::{
	traits::{BlakeTwo256, BlockNumberProvider, IdentityLookup},
	BuildStorage,
};

use crate as pallet_inflation;

type Block = frame_system::mocking::MockBlockU32<Test>;

// 6-second blocks
// const YEAR: u32 = 2_629_800; // 12-second blocks
// Expected 100-block inflation for year 1 is 100 * 100_000_000 / YEAR = FIRST_YEAR_BLOCK_INFLATION
const YEAR: u32 = 5_259_600;
const FIRST_YEAR_BLOCK_INFLATION: u64 = 1901;

parameter_types! {
	pub const ExistentialDeposit: u64 = 1;
	pub const MaxLocks: u32 = 50;
}

impl pallet_balances::Config for Test {
	type AccountStore = System;
	type Balance = u64;
	type DustRemoval = ();
	type RuntimeEvent = ();
	type ExistentialDeposit = ExistentialDeposit;
	type WeightInfo = ();
	type MaxLocks = MaxLocks;
	type MaxReserves = ();
	type ReserveIdentifier = ();
	type FreezeIdentifier = ();
	type MaxHolds = ();
	type MaxFreezes = ();
	type RuntimeHoldReason = RuntimeHoldReason;
}

frame_support::construct_runtime!(
	pub enum Test {
		Balances: pallet_balances,
		System: frame_system,
		Inflation: pallet_inflation,
	}
);

parameter_types! {
	pub const BlockHashCount: u32 = 250;
	pub BlockWeights: frame_system::limits::BlockWeights =
		frame_system::limits::BlockWeights::simple_max(Weight::from_parts(1024, 0));
	pub const SS58Prefix: u8 = 42;
}

impl frame_system::Config for Test {
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
	type RuntimeEvent = ();
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
	pub TreasuryAccountId: u64 = 1234;
	pub const InflationBlockInterval: u32 = 100; // every time per how many blocks inflation is applied
	pub static MockBlockNumberProvider: u32 = 0;
}

impl BlockNumberProvider for MockBlockNumberProvider {
	type BlockNumber = u32;

	fn current_block_number() -> Self::BlockNumber {
		Self::get()
	}
}

impl pallet_inflation::Config for Test {
	type Currency = Balances;
	type TreasuryAccountId = TreasuryAccountId;
	type InflationBlockInterval = InflationBlockInterval;
	type BlockNumberProvider = MockBlockNumberProvider;
}

pub fn new_test_ext() -> sp_io::TestExternalities {
	<frame_system::GenesisConfig<Test>>::default()
		.build_storage()
		.unwrap()
		.into()
}

macro_rules! block_inflation {
	// Block inflation doesn't have any argumets
	() => {
		// Return BlockInflation state variable current value
		<pallet_inflation::BlockInflation<Test>>::get()
	};
}

#[test]
fn uninitialized_inflation() {
	new_test_ext().execute_with(|| {
		let initial_issuance: u64 = 1_000_000_000;
		let _ = <Balances as Balanced<_>>::deposit(&1234, initial_issuance, Precision::Exact);
		assert_eq!(Balances::free_balance(1234), initial_issuance);

		// BlockInflation should be set after inflation is started
		// first inflation deposit should be equal to BlockInflation
		MockBlockNumberProvider::set(1);

		assert_eq!(block_inflation!(), 0);
	});
}

#[test]
fn inflation_works() {
	new_test_ext().execute_with(|| {
		// Total issuance = 1_000_000_000
		let initial_issuance: u64 = 1_000_000_000;
		let _ = <Balances as Balanced<_>>::deposit(&1234, initial_issuance, Precision::Exact);
		assert_eq!(Balances::free_balance(1234), initial_issuance);

		// BlockInflation should be set after inflation is started
		// first inflation deposit should be equal to BlockInflation
		MockBlockNumberProvider::set(1);

		// Start inflation as sudo
		assert_ok!(Inflation::start_inflation(RawOrigin::Root.into(), 1));
		assert_eq!(block_inflation!(), FIRST_YEAR_BLOCK_INFLATION);
		assert_eq!(
			Balances::free_balance(1234) - initial_issuance,
			block_inflation!()
		);

		// Trigger inflation
		MockBlockNumberProvider::set(102);
		Inflation::on_initialize(0);
		assert_eq!(
			Balances::free_balance(1234) - initial_issuance,
			2 * block_inflation!()
		);
	});
}

#[test]
fn inflation_second_deposit() {
	new_test_ext().execute_with(|| {
		// Total issuance = 1_000_000_000
		let initial_issuance = 1_000_000_000;
		let _ = <Balances as Balanced<_>>::deposit(&1234, initial_issuance, Precision::Exact);
		assert_eq!(Balances::free_balance(1234), initial_issuance);
		MockBlockNumberProvider::set(1);

		// Start inflation as sudo
		assert_ok!(Inflation::start_inflation(RawOrigin::Root.into(), 1));

		// Next inflation deposit happens when block is greater then or equal to NextInflationBlock
		let mut block = 2;
		let balance_before = Balances::free_balance(1234);
		while block < <pallet_inflation::NextInflationBlock<Test>>::get() {
			MockBlockNumberProvider::set(block);
			Inflation::on_initialize(0);
			block += 1;
		}
		let balance_just_before = Balances::free_balance(1234);
		assert_eq!(balance_before, balance_just_before);

		// The block with inflation
		MockBlockNumberProvider::set(block);
		Inflation::on_initialize(0);
		let balance_after = Balances::free_balance(1234);
		assert_eq!(balance_after - balance_just_before, block_inflation!());
	});
}

#[test]
fn inflation_in_1_year() {
	new_test_ext().execute_with(|| {
		// Total issuance = 1_000_000_000
		let initial_issuance: u64 = 1_000_000_000;
		let _ = <Balances as Balanced<_>>::deposit(&1234, initial_issuance, Precision::Exact);
		assert_eq!(Balances::free_balance(1234), initial_issuance);
		MockBlockNumberProvider::set(1);

		// Start inflation as sudo
		assert_ok!(Inflation::start_inflation(RawOrigin::Root.into(), 1));

		// Go through all the block inflations for year 1,
		// total issuance will be updated accordingly
		// Inflation is set to start in block 1, so first iteration is block 101
		for block in (101..YEAR).step_by(100) {
			MockBlockNumberProvider::set(block);
			Inflation::on_initialize(0);
		}
		assert_eq!(
			initial_issuance + (FIRST_YEAR_BLOCK_INFLATION * ((YEAR as u64) / 100)),
			<Balances as Inspect<_>>::total_issuance()
		);

		MockBlockNumberProvider::set(YEAR + 1);
		Inflation::on_initialize(0);
		let block_inflation_year_2 = block_inflation!();
		// Expected 100-block inflation for year 2: 100 * 9.33% * initial issuance * 110% / YEAR == 1951
		let expecter_year_2_inflation: u64 = (initial_issuance
			+ FIRST_YEAR_BLOCK_INFLATION * (YEAR as u64) / 100)
			* 933 * 100 / (10000 * (YEAR as u64));
		assert_eq!(block_inflation_year_2 / 10, expecter_year_2_inflation / 10); // divide by 10 for approx. equality
	});
}

#[test]
fn inflation_start_large_kusama_block() {
	new_test_ext().execute_with(|| {
		// Total issuance = 1_000_000_000
		let initial_issuance = 1_000_000_000;
		let start_block = 10457457;
		let _ = <Balances as Balanced<_>>::deposit(&1234, initial_issuance, Precision::Exact);
		assert_eq!(Balances::free_balance(1234), initial_issuance);
		MockBlockNumberProvider::set(start_block);

		// Start inflation as sudo
		assert_ok!(Inflation::start_inflation(
			RawOrigin::Root.into(),
			start_block
		));

		// Go through all the block inflations for year 1,
		// total issuance will be updated accordingly
		// Inflation is set to start in block 1, so first iteration is block 101
		for block in (101..YEAR).step_by(100) {
			MockBlockNumberProvider::set(start_block + block);
			Inflation::on_initialize(0);
		}
		assert_eq!(
			initial_issuance + (FIRST_YEAR_BLOCK_INFLATION * ((YEAR as u64) / 100)),
			<Balances as Inspect<_>>::total_issuance()
		);

		MockBlockNumberProvider::set(start_block + YEAR + 1);
		Inflation::on_initialize(0);
		let block_inflation_year_2 = block_inflation!();
		// Expected 100-block inflation for year 2: 100 * 9.33% * initial issuance * 110% / YEAR == 1951
		let expecter_year_2_inflation: u64 = (initial_issuance
			+ FIRST_YEAR_BLOCK_INFLATION * (YEAR as u64) / 100)
			* 933 * 100 / (10000 * (YEAR as u64));
		assert_eq!(block_inflation_year_2 / 10, expecter_year_2_inflation / 10); // divide by 10 for approx. equality
	});
}

#[test]
fn inflation_after_year_10_is_flat() {
	new_test_ext().execute_with(|| {
		// Total issuance = 1_000_000_000
		let initial_issuance: u64 = 1_000_000_000;
		let _ = <Balances as Balanced<_>>::deposit(&1234, initial_issuance, Precision::Exact);
		assert_eq!(Balances::free_balance(1234), initial_issuance);
		MockBlockNumberProvider::set(YEAR * 9 + 1);

		// Start inflation as sudo
		assert_ok!(Inflation::start_inflation(RawOrigin::Root.into(), 1));

		// Let inflation catch up
		for _year in 1..=9 {
			Inflation::on_initialize(0);
		}

		for year in 10..=20 {
			let block_inflation_year_before = block_inflation!();
			MockBlockNumberProvider::set(YEAR * year + 1);
			Inflation::on_initialize(0);
			let block_inflation_year_after = block_inflation!();

			// Assert that next year inflation is equal to previous year inflation
			assert_eq!(block_inflation_year_before, block_inflation_year_after);
		}
	});
}

#[test]
fn inflation_rate_by_year() {
	new_test_ext().execute_with(|| {
		let payouts = (YEAR / InflationBlockInterval::get()) as u64;

		// Inflation starts at 10% and does down by 2/3% every year until year 9 (included),
		// then it is flat.
		let payout_by_year: [u64; 11] = [1000, 933, 867, 800, 733, 667, 600, 533, 467, 400, 400];

		// For accuracy total issuance = payout0 * payouts * 10;
		let initial_issuance = payout_by_year[0] * payouts * 10;
		let _ = <Balances as Balanced<_>>::deposit(&1234, initial_issuance, Precision::Exact);
		assert_eq!(Balances::free_balance(1234), initial_issuance);

		// Start inflation as sudo
		assert_ok!(Inflation::start_inflation(RawOrigin::Root.into(), 1));

		for year in 0..=10 {
			// Year first block
			MockBlockNumberProvider::set(YEAR * year + 1);
			Inflation::on_initialize(0);
			let mut actual_payout = block_inflation!();
			assert_eq!(actual_payout, payout_by_year[year as usize]);

			// Year second block
			MockBlockNumberProvider::set(YEAR * year + 2);
			Inflation::on_initialize(0);
			actual_payout = block_inflation!();
			assert_eq!(actual_payout, payout_by_year[year as usize]);

			// Year middle block
			MockBlockNumberProvider::set(year * YEAR + YEAR / 2);
			Inflation::on_initialize(0);
			actual_payout = block_inflation!();
			assert_eq!(actual_payout, payout_by_year[year as usize]);

			// Year last block
			MockBlockNumberProvider::set((year + 1) * YEAR);
			Inflation::on_initialize(0);
			actual_payout = block_inflation!();
			assert_eq!(actual_payout, payout_by_year[year as usize]);
		}
	});
}
