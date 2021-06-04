#[cfg(test)]
mod tests {
	use crate as pallet_inflation;

	use frame_system;
	use frame_support::{traits::{Currency}, parameter_types};
	use frame_support::{traits::OnInitialize};
	use sp_core::H256;
	use sp_runtime::{traits::{BlakeTwo256, IdentityLookup}, testing::Header};

	type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
	type Block = frame_system::mocking::MockBlock<Test>;

	const YEAR: u64 = 5_259_600;

	parameter_types! {
		pub const ExistentialDeposit: u64 = 1;
		pub const MaxLocks: u32 = 50;
	}
	
	impl pallet_balances::Config for Test {
		type AccountStore = System;
		type Balance = u64;
		type DustRemoval = ();
		type Event = ();
		type ExistentialDeposit = ExistentialDeposit;
		type WeightInfo = ();
		type MaxLocks = MaxLocks;
	}
	
	frame_support::construct_runtime!(
		pub enum Test where
			Block = Block,
			NodeBlock = Block,
			UncheckedExtrinsic = UncheckedExtrinsic,
		{
			Balances: pallet_balances::{Module, Call, Storage},
			System: frame_system::{Module, Call, Config, Storage, Event<T>},
			Inflation: pallet_inflation::{Module, Call, Storage},
		}
	);

	parameter_types! {
		pub const BlockHashCount: u64 = 250;
		pub BlockWeights: frame_system::limits::BlockWeights =
			frame_system::limits::BlockWeights::simple_max(1024);
		pub const SS58Prefix: u8 = 42;
	}

	impl frame_system::Config for Test {
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
		pub TreasuryAccountId: u64 = 1234;
		pub const InflationBlockInterval: u32 = 100; // every time per how many blocks inflation is applied
	}
		
	impl pallet_inflation::Config for Test {
		type Currency = Balances;
		type TreasuryAccountId = TreasuryAccountId;
		type InflationBlockInterval = InflationBlockInterval;
	}

	// Build genesis storage according to the mock runtime.
	pub fn new_test_ext() -> sp_io::TestExternalities {
		frame_system::GenesisConfig::default().build_storage::<Test>().unwrap().into()
	}

	#[test]
	fn inflation_works() {
		new_test_ext().execute_with(|| {
			// Total issuance = 1_000_000_000
			let initial_issuance: u64 = 1_000_000_000;
			let _ = <Balances as Currency<_>>::deposit_creating(&1234, initial_issuance);
			assert_eq!(Balances::free_balance(1234), initial_issuance);

			// BlockInflation should be set after 1st block and 
			// first inflation deposit should be equal to BlockInflation
			Inflation::on_initialize(1);

			// SBP M2 review: Verify expected block inflation for year 1
			assert_eq!(Inflation::block_inflation(), 1901);
			assert_eq!(Balances::free_balance(1234) - initial_issuance, Inflation::block_inflation());
		});
	}

	#[test]
	fn inflation_second_deposit() {
		new_test_ext().execute_with(|| {
			// Total issuance = 1_000_000_000
			let initial_issuance: u64 = 1_000_000_000;
			let _ = <Balances as Currency<_>>::deposit_creating(&1234, initial_issuance);
			assert_eq!(Balances::free_balance(1234), initial_issuance);
			Inflation::on_initialize(1);

			// Next inflation deposit happens when block is multiple of InflationBlockInterval
			let mut block: u32 = 2;
			let balance_before: u64 = Balances::free_balance(1234);
			while block % InflationBlockInterval::get() != 0 {
				Inflation::on_initialize(block as u64);
				block += 1;
			}
			let balance_just_before: u64 = Balances::free_balance(1234);
			assert_eq!(balance_before, balance_just_before);

			// The block with inflation
			Inflation::on_initialize(block as u64);
			let balance_after: u64 = Balances::free_balance(1234);
			assert_eq!(balance_after - balance_just_before, Inflation::block_inflation());
		});
	}

	#[test]
	fn inflation_in_1_year() {
		new_test_ext().execute_with(|| {
			// Total issuance = 1_000_000_000
			let initial_issuance: u64 = 1_000_000_000;
			let _ = <Balances as Currency<_>>::deposit_creating(&1234, initial_issuance);
			assert_eq!(Balances::free_balance(1234), initial_issuance);
			Inflation::on_initialize(1);
			let block_inflation_year_0 = Inflation::block_inflation();

			// SBP M2 review: go through all the block inflations for year 1,
			// total issuance will be updated accordingly
			for block in (100..YEAR).step_by(100) {
                Inflation::on_initialize(block);
            }
            assert_eq!(
                initial_issuance + (1901 * (YEAR / 100)),
                <Balances as Currency<_>>::total_issuance()
            );

			Inflation::on_initialize(YEAR);
			let block_inflation_year_1 = Inflation::block_inflation();
			// SBP M2 review: Verify expected block inflation for year 2
			assert_eq!(block_inflation_year_1, 1952);

			// SBP M2 review: this is actually not true
			// Assert that year 1 inflation is less than year 0
			// assert!(block_inflation_year_0 > block_inflation_year_1);
		});
	}

	#[test]
	fn inflation_in_1_to_9_years() {
		new_test_ext().execute_with(|| {
			// Total issuance = 1_000_000_000
			let initial_issuance: u64 = 1_000_000_000;
			let _ = <Balances as Currency<_>>::deposit_creating(&1234, initial_issuance);
			assert_eq!(Balances::free_balance(1234), initial_issuance);
			Inflation::on_initialize(1);

			for year in 1..=9 {
				let block_inflation_year_before = Inflation::block_inflation();
				Inflation::on_initialize(YEAR * year);
				let block_inflation_year_after = Inflation::block_inflation();

				// SBP M2 review: this is actually not true (not for the first few years)
				// Assert that next year inflation is less than previous year inflation
				assert!(block_inflation_year_before > block_inflation_year_after);
			}

		});
	}

	#[test]
	fn inflation_after_year_10_is_flat() {
		new_test_ext().execute_with(|| {
			// Total issuance = 1_000_000_000
			let initial_issuance: u64 = 1_000_000_000;
			let _ = <Balances as Currency<_>>::deposit_creating(&1234, initial_issuance);
			assert_eq!(Balances::free_balance(1234), initial_issuance);
			Inflation::on_initialize(YEAR * 9);

			for year in 10..=20 {
				let block_inflation_year_before = Inflation::block_inflation();
				Inflation::on_initialize(YEAR * year);
				let block_inflation_year_after = Inflation::block_inflation();

				// Assert that next year inflation is equal to previous year inflation
				assert_eq!(block_inflation_year_before, block_inflation_year_after);
			}
		});
	}

	#[test]
	fn inflation_rate_by_year() {
		new_test_ext().execute_with(|| {
			let payouts: u64 = YEAR / InflationBlockInterval::get() as u64;

			// Inflation starts at 10% and does down by 2/3% every year until year 9 (included), 
			// then it is flat.
			let payout_by_year: [u64; 11] = [
				1000,
				933,
				867,
				800,
				733,
				667,
				600,
				533,
				467,
				400,
				400
			];

			// For accuracy total issuance = payout0 * payouts * 10;
			let initial_issuance: u64 = payout_by_year[0] * payouts * 10;
			let _ = <Balances as Currency<_>>::deposit_creating(&1234, initial_issuance);
			assert_eq!(Balances::free_balance(1234), initial_issuance);

			for year in 0..=10 {
				// Year first block
				Inflation::on_initialize(year*YEAR);
				let mut actual_payout = Inflation::block_inflation();
				assert_eq!(actual_payout, payout_by_year[year as usize]);

				// Year second block
				Inflation::on_initialize(year*YEAR+1);
				actual_payout = Inflation::block_inflation();
				assert_eq!(actual_payout, payout_by_year[year as usize]);

				// Year middle block
				Inflation::on_initialize(year*YEAR + YEAR/2);
				actual_payout = Inflation::block_inflation();
				assert_eq!(actual_payout, payout_by_year[year as usize]);

				// Year last block
				Inflation::on_initialize((year + 1)*YEAR-1);
				actual_payout = Inflation::block_inflation();
				assert_eq!(actual_payout, payout_by_year[year as usize]);
			}
		});
	}
}
