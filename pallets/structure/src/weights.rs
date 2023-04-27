// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_structure
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-04-27, STEPS: `50`, REPEAT: `80`, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! WORST CASE MAP SIZE: `1000000`
//! HOSTNAME: `bench-host`, CPU: `Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// target/release/unique-collator
// benchmark
// pallet
// --pallet
// pallet-structure
// --wasm-execution
// compiled
// --extrinsic
// *
// --template=.maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/structure/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_structure.
pub trait WeightInfo {
	fn find_parent() -> Weight;
}

/// Weights for pallet_structure using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	/// Storage: Common CollectionById (r:1 w:0)
	/// Proof: Common CollectionById (max_values: None, max_size: Some(860), added: 3335, mode: MaxEncodedLen)
	/// Storage: Nonfungible TokenData (r:1 w:0)
	/// Proof: Nonfungible TokenData (max_values: None, max_size: Some(57), added: 2532, mode: MaxEncodedLen)
	fn find_parent() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `634`
		//  Estimated: `7847`
		// Minimum execution time: 12_072_000 picoseconds.
		Weight::from_parts(12_515_000, 7847)
			.saturating_add(T::DbWeight::get().reads(2_u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	/// Storage: Common CollectionById (r:1 w:0)
	/// Proof: Common CollectionById (max_values: None, max_size: Some(860), added: 3335, mode: MaxEncodedLen)
	/// Storage: Nonfungible TokenData (r:1 w:0)
	/// Proof: Nonfungible TokenData (max_values: None, max_size: Some(57), added: 2532, mode: MaxEncodedLen)
	fn find_parent() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `634`
		//  Estimated: `7847`
		// Minimum execution time: 12_072_000 picoseconds.
		Weight::from_parts(12_515_000, 7847)
			.saturating_add(RocksDbWeight::get().reads(2_u64))
	}
}

