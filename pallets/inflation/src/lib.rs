//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
pub use std::*;

pub use serde::{Serialize, Deserialize};

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

#[cfg(test)]
mod tests;

pub use frame_support::{
	construct_runtime, decl_module, decl_storage, ensure,
	traits::{
		Currency, ExistenceRequirement, Get, Imbalance, KeyOwnerProofSystem, OnUnbalanced,
		Randomness, IsSubType, WithdrawReasons,
	},
	weights::{
		constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
		DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
		WeightToFeePolynomial, DispatchClass,
	},
	StorageValue, transactional,
};

// #[cfg(feature = "runtime-benchmarks")]
pub use frame_support::dispatch::DispatchResult;

use sp_runtime::{
	Perbill,
	traits::{BlockNumberProvider},
};
use sp_std::convert::TryInto;

use frame_system::{self as system};

/// The balance type of this module.
pub type BalanceOf<T> =
	<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

pub const YEAR: u32 = 5_259_600; // 6-second block
// pub const YEAR: u32 = 2_629_800; // 12-second block
pub const TOTAL_YEARS_UNTIL_FLAT: u32 = 9;
pub const START_INFLATION_PERCENT: u32 = 10;
pub const END_INFLATION_PERCENT: u32 = 4;

pub trait Config: system::Config {
	type Currency: Currency<Self::AccountId>;
	type TreasuryAccountId: Get<Self::AccountId>;
	type InflationBlockInterval: Get<Self::BlockNumber>;

	// The block number provider
	type BlockNumberProvider: BlockNumberProvider<BlockNumber = Self::BlockNumber>;
}

decl_storage! {
	trait Store for Module<T: Config> as Inflation {
		/// starting year total issuance
		pub StartingYearTotalIssuance get(fn starting_year_total_issuance): BalanceOf<T>;

		/// Current block inflation
		pub BlockInflation get(fn block_inflation): BalanceOf<T>;

		/// Next (relay) block when inflation is applied. This value is approximate.
		pub NextInflationBlock get(fn next_inflation_block): T::BlockNumber;

		/// Next (relay) block when inflation is recalculated. This value is approximate.
		pub NextRecalculationBlock get(fn next_recalculation_block): T::BlockNumber;
	}
}

decl_module! {
	pub struct Module<T: Config> for enum Call
	where
		origin: T::Origin,
	{
		const InflationBlockInterval: T::BlockNumber = T::InflationBlockInterval::get();

		fn on_initialize() -> Weight
		{
			let mut consumed_weight = 0;
			let mut add_weight = |reads, writes, weight| {
				consumed_weight += T::DbWeight::get().reads_writes(reads, writes);
				consumed_weight += weight;
			};

			let block_interval: u32 = T::InflationBlockInterval::get().try_into().unwrap_or(0);
			let _now = T::BlockNumberProvider::current_block_number();
			let next_recalculation: T::BlockNumber = <NextRecalculationBlock<T>>::get();
			let next_inflation: T::BlockNumber = <NextInflationBlock<T>>::get();
			add_weight(2, 0, 5_000_000);

			// Recalculate inflation on the first block of the year (or if it is not initialized yet)
			if _now >= next_recalculation {
				let current_year: u32 = (next_recalculation / T::BlockNumber::from(YEAR)).try_into().unwrap_or(0);

				let one_percent = Perbill::from_percent(1);

				if current_year <= TOTAL_YEARS_UNTIL_FLAT {
					let amount: BalanceOf<T> = Perbill::from_rational(
						block_interval * (START_INFLATION_PERCENT * TOTAL_YEARS_UNTIL_FLAT - current_year * (START_INFLATION_PERCENT - END_INFLATION_PERCENT)),
						YEAR * TOTAL_YEARS_UNTIL_FLAT
					) * ( one_percent * T::Currency::total_issuance() );
					<BlockInflation<T>>::put(amount);
				}
				else {
					let amount: BalanceOf<T> = Perbill::from_rational(
						block_interval * END_INFLATION_PERCENT,
						YEAR
					) * (one_percent * T::Currency::total_issuance());
					<BlockInflation<T>>::put(amount);
				}
				<StartingYearTotalIssuance<T>>::set(T::Currency::total_issuance());

				// First time deposit
				T::Currency::deposit_creating(&T::TreasuryAccountId::get(), <BlockInflation<T>>::get());

				// Update recalculation and inflation blocks
				<NextRecalculationBlock<T>>::set(next_recalculation + YEAR.into());
				<NextInflationBlock<T>>::set(next_recalculation + block_interval.into() + YEAR.into());

				add_weight(7, 8, 28_300_000);
			}

			// Apply inflation every InflationBlockInterval blocks and in the 1st block to initialize Treasury account
			else if _now >= next_inflation {
				T::Currency::deposit_into_existing(&T::TreasuryAccountId::get(), <BlockInflation<T>>::get()).ok();

				// Update inflation block
				<NextInflationBlock<T>>::set(next_inflation + block_interval.into());

				add_weight(3, 3, 12_900_000);
			}

			consumed_weight
		}

	}
}
