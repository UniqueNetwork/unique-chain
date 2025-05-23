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

//! # Inflation
//!
//! The inflation pallet is designed to increase the number of tokens at certain intervals.
//! With each iteration, increases the `total_issuance` value for the native token.
//! Executing an `on_initialize` hook at the beginning of each block, causing inflation to begin.
//!
//! ## Interface
//!
//! ### Dispatchable Functions
//!
//! * `start_inflation` - This method sets the inflation start date. Can be only called once.
//!   Inflation start block can be backdated and will catch up. The method will create Treasury
//!   account if it does not exist and perform the first inflation deposit.

// #![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

#[cfg(test)]
mod tests;

use frame_support::traits::{
	fungible::{Balanced, Inspect, Mutate},
	tokens::Precision,
	Get,
};
use frame_system::pallet_prelude::BlockNumberFor;
pub use pallet::*;
use sp_runtime::{traits::BlockNumberProvider, Perbill};
use up_common::constants::RELAY_DAYS;

type BalanceOf<T> =
	<<T as Config>::Currency as Inspect<<T as frame_system::Config>::AccountId>>::Balance;

pub const YEAR: u32 = RELAY_DAYS * 365 + RELAY_DAYS / 4; // 365 days plus quater of a day as average for leap year
														 // pub const YEAR: u32 = 2_629_800; // 12-second block
pub const TOTAL_YEARS_UNTIL_FLAT: u32 = 9;
pub const START_INFLATION_PERCENT: u32 = 10;
pub const END_INFLATION_PERCENT: u32 = 4;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type Currency: Balanced<Self::AccountId>
			+ Inspect<Self::AccountId>
			+ Mutate<Self::AccountId>;
		type TreasuryAccountId: Get<Self::AccountId>;

		// The block number provider, which should be callable from `on_initialize` hook.
		type OnInitializeBlockNumberProvider: BlockNumberProvider<
			BlockNumber = BlockNumberFor<Self>,
		>;

		/// Number of blocks that pass between treasury balance updates due to inflation
		#[pallet::constant]
		type InflationBlockInterval: Get<BlockNumberFor<Self>>;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	/// starting year total issuance
	#[pallet::storage]
	pub type StartingYearTotalIssuance<T: Config> =
		StorageValue<Value = BalanceOf<T>, QueryKind = ValueQuery>;

	/// Current inflation for `InflationBlockInterval` number of blocks
	#[pallet::storage]
	pub type BlockInflation<T: Config> = StorageValue<Value = BalanceOf<T>, QueryKind = ValueQuery>;

	/// Next target (relay) block when inflation will be applied
	#[pallet::storage]
	pub type NextInflationBlock<T: Config> =
		StorageValue<Value = BlockNumberFor<T>, QueryKind = ValueQuery>;

	/// Next target (relay) block when inflation is recalculated
	#[pallet::storage]
	pub type NextRecalculationBlock<T: Config> =
		StorageValue<Value = BlockNumberFor<T>, QueryKind = ValueQuery>;

	/// Relay block when inflation has started
	#[pallet::storage]
	pub type StartBlock<T: Config> =
		StorageValue<Value = BlockNumberFor<T>, QueryKind = ValueQuery>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_initialize(_: BlockNumberFor<T>) -> Weight
		where
			BlockNumberFor<T>: From<u32>,
		{
			let mut consumed_weight = Weight::zero();
			let mut add_weight = |reads, writes, weight| {
				consumed_weight += T::DbWeight::get().reads_writes(reads, writes);
				consumed_weight += weight;
			};

			let block_interval: u32 = T::InflationBlockInterval::get().try_into().unwrap_or(0);
			let current_relay_block = T::OnInitializeBlockNumberProvider::current_block_number();
			let next_inflation: BlockNumberFor<T> = <NextInflationBlock<T>>::get();
			add_weight(1, 0, Weight::from_parts(5_000_000, 0));

			// Apply inflation every InflationBlockInterval blocks
			// If next_inflation == 0, this means inflation wasn't yet initialized
			if (next_inflation != 0u32.into()) && (current_relay_block >= next_inflation) {
				// Recalculate inflation on the first block of the year (or if it is not initialized yet)
				// Do the "current_relay_block >= next_recalculation" check in the "current_relay_block >= next_inflation"
				// block because it saves InflationBlockInterval DB reads for NextRecalculationBlock.
				let next_recalculation: BlockNumberFor<T> = <NextRecalculationBlock<T>>::get();
				add_weight(1, 0, Weight::zero());
				if current_relay_block >= next_recalculation {
					Self::recalculate_inflation(next_recalculation);
					add_weight(0, 4, Weight::from_parts(5_000_000, 0));
				}

				T::Currency::mint_into(&T::TreasuryAccountId::get(), <BlockInflation<T>>::get())
					.ok();

				// Update inflation block
				<NextInflationBlock<T>>::set(next_inflation + block_interval.into());

				add_weight(3, 3, Weight::from_parts(10_000_000, 0));
			}

			consumed_weight
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// This method sets the inflation start date. Can be only called once.
		/// Inflation start block can be backdated and will catch up. The method will create Treasury
		/// account if it does not exist and perform the first inflation deposit.
		///
		/// # Permissions
		///
		/// * Root
		///
		/// # Arguments
		///
		/// * inflation_start_relay_block: The relay chain block at which inflation should start
		#[pallet::call_index(0)]
		// Constant weights are deprecated,
		// but in this case writing benchmark is not feasible, `start_inflation` call
		// might be even moved to GenesisConfig
		#[pallet::weight(Weight::from_parts(0, 0))]
		pub fn start_inflation(
			origin: OriginFor<T>,
			inflation_start_relay_block: BlockNumberFor<T>,
		) -> DispatchResult
		where
			BlockNumberFor<T>: From<u32>,
		{
			ensure_root(origin)?;

			// Start inflation if it has not been yet initialized
			if <StartBlock<T>>::get() == 0u32.into() {
				// Set inflation global start block
				<StartBlock<T>>::set(inflation_start_relay_block);

				// Recalculate inflation. This can be backdated and will catch up.
				Self::recalculate_inflation(inflation_start_relay_block);
				let block_interval: u32 = T::InflationBlockInterval::get().try_into().unwrap_or(0);
				<NextInflationBlock<T>>::set(inflation_start_relay_block + block_interval.into());

				// First time deposit - create Treasury account so that we can call deposit_into_existing everywhere else
				let _ = T::Currency::deposit(
					&T::TreasuryAccountId::get(),
					<BlockInflation<T>>::get(),
					Precision::Exact,
				)?;
			}

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	pub fn recalculate_inflation(recalculation_block: BlockNumberFor<T>) {
		let current_year: u32 = ((recalculation_block - <StartBlock<T>>::get())
			/ BlockNumberFor::<T>::from(YEAR))
		.try_into()
		.unwrap_or(0);
		let block_interval: u32 = T::InflationBlockInterval::get().try_into().unwrap_or(0);

		let one_percent = Perbill::from_percent(1);

		if current_year <= TOTAL_YEARS_UNTIL_FLAT {
			let amount: BalanceOf<T> = Perbill::from_rational(
				block_interval
					* (START_INFLATION_PERCENT * TOTAL_YEARS_UNTIL_FLAT
						- current_year * (START_INFLATION_PERCENT - END_INFLATION_PERCENT)),
				YEAR * TOTAL_YEARS_UNTIL_FLAT,
			) * (one_percent * T::Currency::total_issuance());
			<BlockInflation<T>>::put(amount);
		} else {
			let amount: BalanceOf<T> =
				Perbill::from_rational(block_interval * END_INFLATION_PERCENT, YEAR)
					* (one_percent * T::Currency::total_issuance());
			<BlockInflation<T>>::put(amount);
		}
		<StartingYearTotalIssuance<T>>::set(T::Currency::total_issuance());

		// Update recalculation and inflation blocks
		<NextRecalculationBlock<T>>::set(recalculation_block + YEAR.into());
	}
}
