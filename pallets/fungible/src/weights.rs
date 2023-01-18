// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_fungible
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-01-18, STEPS: `50`, REPEAT: 80, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// target/release/unique-collator
// benchmark
// pallet
// --pallet
// pallet-fungible
// --wasm-execution
// compiled
// --extrinsic
// *
// --template
// .maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/fungible/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]
#![allow(missing_docs)]
#![allow(clippy::unnecessary_cast)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_fungible.
pub trait WeightInfo {
	fn create_item() -> Weight;
	fn create_multiple_items_ex(b: u32, ) -> Weight;
	fn burn_item() -> Weight;
	fn transfer() -> Weight;
	fn approve() -> Weight;
	fn approve_from() -> Weight;
	fn transfer_from() -> Weight;
	fn burn_from() -> Weight;
}

/// Weights for pallet_fungible using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:1 w:1)
	fn create_item() -> Weight {
		Weight::from_ref_time(20_203_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:4 w:4)
	fn create_multiple_items_ex(b: u32, ) -> Weight {
		Weight::from_ref_time(19_426_730 as u64)
			// Standard Error: 5_132
			.saturating_add(Weight::from_ref_time(3_579_196 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
			.saturating_add(T::DbWeight::get().writes((1 as u64).saturating_mul(b as u64)))
	}
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:1 w:1)
	fn burn_item() -> Weight {
		Weight::from_ref_time(21_871_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Fungible Balance (r:2 w:2)
	fn transfer() -> Weight {
		Weight::from_ref_time(22_677_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Fungible Balance (r:1 w:0)
	// Storage: Fungible Allowance (r:0 w:1)
	fn approve() -> Weight {
		Weight::from_ref_time(22_109_000 as u64)
<<<<<<< HEAD
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Fungible Balance (r:1 w:0)
	// Storage: Fungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(22_434_000 as u64)
=======
>>>>>>> b48e2456 (chore: run benchmarks)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Fungible Balance (r:1 w:0)
	// Storage: Fungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(22_434_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Fungible Allowance (r:1 w:1)
	// Storage: Fungible Balance (r:2 w:2)
	fn transfer_from() -> Weight {
		Weight::from_ref_time(31_777_000 as u64)
			.saturating_add(T::DbWeight::get().reads(3 as u64))
			.saturating_add(T::DbWeight::get().writes(3 as u64))
	}
	// Storage: Fungible Allowance (r:1 w:1)
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:1 w:1)
	fn burn_from() -> Weight {
		Weight::from_ref_time(32_101_000 as u64)
			.saturating_add(T::DbWeight::get().reads(3 as u64))
			.saturating_add(T::DbWeight::get().writes(3 as u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:1 w:1)
	fn create_item() -> Weight {
		Weight::from_ref_time(20_203_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:4 w:4)
	fn create_multiple_items_ex(b: u32, ) -> Weight {
		Weight::from_ref_time(19_426_730 as u64)
			// Standard Error: 5_132
			.saturating_add(Weight::from_ref_time(3_579_196 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
			.saturating_add(RocksDbWeight::get().writes((1 as u64).saturating_mul(b as u64)))
	}
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:1 w:1)
	fn burn_item() -> Weight {
		Weight::from_ref_time(21_871_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Fungible Balance (r:2 w:2)
	fn transfer() -> Weight {
		Weight::from_ref_time(22_677_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Fungible Balance (r:1 w:0)
	// Storage: Fungible Allowance (r:0 w:1)
	fn approve() -> Weight {
		Weight::from_ref_time(22_109_000 as u64)
<<<<<<< HEAD
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Fungible Balance (r:1 w:0)
	// Storage: Fungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(22_434_000 as u64)
=======
>>>>>>> b48e2456 (chore: run benchmarks)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Fungible Balance (r:1 w:0)
	// Storage: Fungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(22_434_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Fungible Allowance (r:1 w:1)
	// Storage: Fungible Balance (r:2 w:2)
	fn transfer_from() -> Weight {
		Weight::from_ref_time(31_777_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(3 as u64))
			.saturating_add(RocksDbWeight::get().writes(3 as u64))
	}
	// Storage: Fungible Allowance (r:1 w:1)
	// Storage: Fungible TotalSupply (r:1 w:1)
	// Storage: Fungible Balance (r:1 w:1)
	fn burn_from() -> Weight {
		Weight::from_ref_time(32_101_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(3 as u64))
			.saturating_add(RocksDbWeight::get().writes(3 as u64))
	}
}
