#![cfg(feature = "runtime-benchmarks")]

use super::*;

use sp_std::prelude::*;
use frame_system::RawOrigin;
use frame_benchmarking::{benchmarks};
use frame_support::traits::OnInitialize;

benchmarks! {

	// on_initialize {
		// let block1: T::BlockNumber = T::BlockNumber::from(1u32);
		// let block2: T::BlockNumber = T::BlockNumber::from(2u32);
		// Inflation::<T>::on_initialize(block1); // Create Treasury account
	// }: { Inflation::<T>::on_initialize(block2); } // Benchmark deposit_into_existing path

}
