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
	traits::{Zero},
};
use sp_std::convert::TryInto;

use frame_system::{self as system};

/// The balance type of this module.
pub type BalanceOf<T> =
	<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

// pub const YEAR: u32 = 5_259_600; // 6-second block 
pub const YEAR: u32 = 2_629_800; // 12-second block 
pub const TOTAL_YEARS_UNTIL_FLAT: u32 = 9;
pub const START_INFLATION_PERCENT: u32 = 10;
pub const END_INFLATION_PERCENT: u32 = 4;

pub trait Config: system::Config {
	type Currency: Currency<Self::AccountId>;
	type TreasuryAccountId: Get<Self::AccountId>;
	type InflationBlockInterval: Get<Self::BlockNumber>;
}

decl_storage! {
	trait Store for Module<T: Config> as Inflation {
		/// starting year total issuance
		pub StartingYearTotalIssuance get(fn starting_year_total_issuance): BalanceOf<T>;

		/// Current block inflation
		pub BlockInflation get(fn block_inflation): BalanceOf<T>;
	}
}

decl_module! {
	pub struct Module<T: Config> for enum Call
	where
		origin: T::Origin,
	{
		const InflationBlockInterval: T::BlockNumber = T::InflationBlockInterval::get();

		fn on_initialize(now: T::BlockNumber) -> Weight
		{
			let mut consumed_weight = 0;
			let mut add_weight = |reads, writes, weight| {
				consumed_weight += T::DbWeight::get().reads_writes(reads, writes);
				consumed_weight += weight;
			};

			let block_interval: u32 = T::InflationBlockInterval::get().try_into().unwrap_or(0);

			// TODO: Rewrite inflation to use block timestamp instead of block number
			// let _now = <timestamp::Module<T>>::get();

			// Recalculate inflation on the first block of the year (or if it is not initialized yet)
			if (now % T::BlockNumber::from(YEAR)).is_zero() || <BlockInflation<T>>::get().is_zero() {
				let current_year: u32 = (now / T::BlockNumber::from(YEAR)).try_into().unwrap_or(0);

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

				add_weight(7, 6, 28_300_000);
			}

			// Apply inflation every InflationBlockInterval blocks and in the 1st block to initialize Treasury account
			else if (now % T::BlockNumber::from(block_interval)).is_zero() {
				T::Currency::deposit_into_existing(&T::TreasuryAccountId::get(), <BlockInflation<T>>::get()).ok();

				add_weight(3, 2, 12_900_000);
			}

			consumed_weight
		}

	}
}
