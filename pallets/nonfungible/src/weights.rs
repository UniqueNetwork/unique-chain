// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_nonfungible
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-01-18, STEPS: `50`, REPEAT: 80, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// target/release/unique-collator
// benchmark
// pallet
// --pallet
// pallet-nonfungible
// --wasm-execution
// compiled
// --extrinsic
// *
// --template
// .maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/nonfungible/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]
#![allow(missing_docs)]
#![allow(clippy::unnecessary_cast)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_nonfungible.
pub trait WeightInfo {
	fn create_item() -> Weight;
	fn create_multiple_items(b: u32, ) -> Weight;
	fn create_multiple_items_ex(b: u32, ) -> Weight;
	fn burn_item() -> Weight;
	fn burn_recursively_self_raw() -> Weight;
	fn burn_recursively_breadth_plus_self_plus_self_per_each_raw(b: u32, ) -> Weight;
	fn transfer() -> Weight;
	fn approve() -> Weight;
	fn approve_from() -> Weight;
	fn transfer_from() -> Weight;
	fn burn_from() -> Weight;
	fn set_token_property_permissions(b: u32, ) -> Weight;
	fn set_token_properties(b: u32, ) -> Weight;
	fn delete_token_properties(b: u32, ) -> Weight;
	fn token_owner() -> Weight;
	fn set_allowance_for_all() -> Weight;
	fn allowance_for_all() -> Weight;
	fn repair_item() -> Weight;
}

/// Weights for pallet_nonfungible using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Nonfungible TokensMinted (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Nonfungible TokenData (r:0 w:1)
	// Storage: Nonfungible Owned (r:0 w:1)
	fn create_item() -> Weight {
		Weight::from_ref_time(34_815_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokensMinted (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Nonfungible TokenData (r:0 w:4)
	// Storage: Nonfungible Owned (r:0 w:4)
	fn create_multiple_items(b: u32, ) -> Weight {
		Weight::from_ref_time(18_772_483 as u64)
			// Standard Error: 5_664
			.saturating_add(Weight::from_ref_time(7_602_706 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(3 as u64))
			.saturating_add(T::DbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
			.saturating_add(T::DbWeight::get().writes((3 as u64).saturating_mul(b as u64)))
	}
	// Storage: Nonfungible TokensMinted (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:4 w:4)
	// Storage: Nonfungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Nonfungible TokenData (r:0 w:4)
	// Storage: Nonfungible Owned (r:0 w:4)
	fn create_multiple_items_ex(b: u32, ) -> Weight {
		Weight::from_ref_time(15_449_226 as u64)
			// Standard Error: 6_012
			.saturating_add(Weight::from_ref_time(9_325_591 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().reads((2 as u64).saturating_mul(b as u64)))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
			.saturating_add(T::DbWeight::get().writes((4 as u64).saturating_mul(b as u64)))
	}
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	fn burn_item() -> Weight {
		Weight::from_ref_time(35_221_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	fn burn_recursively_self_raw() -> Weight {
		Weight::from_ref_time(45_504_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	// Storage: Common CollectionById (r:1 w:0)
	fn burn_recursively_breadth_plus_self_plus_self_per_each_raw(b: u32, ) -> Weight {
		Weight::from_ref_time(45_539_000 as u64)
			// Standard Error: 1_047_413
			.saturating_add(Weight::from_ref_time(216_998_419 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(7 as u64))
			.saturating_add(T::DbWeight::get().reads((4 as u64).saturating_mul(b as u64)))
			.saturating_add(T::DbWeight::get().writes(6 as u64))
			.saturating_add(T::DbWeight::get().writes((4 as u64).saturating_mul(b as u64)))
	}
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:2 w:2)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:2)
	fn transfer() -> Weight {
		Weight::from_ref_time(30_047_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	// Storage: Nonfungible Allowance (r:1 w:1)
	fn approve() -> Weight {
		Weight::from_ref_time(24_476_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	// Storage: Nonfungible Allowance (r:1 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(22_818_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	// Storage: Nonfungible Allowance (r:1 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(18_965_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible Allowance (r:1 w:1)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:2 w:2)
	// Storage: Nonfungible Owned (r:0 w:2)
	fn transfer_from() -> Weight {
		Weight::from_ref_time(37_251_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(6 as u64))
	}
	// Storage: Nonfungible Allowance (r:1 w:1)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	fn burn_from() -> Weight {
		Weight::from_ref_time(43_202_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(6 as u64))
	}
	// Storage: Common CollectionPropertyPermissions (r:1 w:1)
	fn set_token_property_permissions(b: u32, ) -> Weight {
		Weight::from_ref_time(5_282_000 as u64)
			// Standard Error: 45_166
			.saturating_add(Weight::from_ref_time(12_937_288 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn set_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(31_850_484 as u64)
			// Standard Error: 9_618
			.saturating_add(Weight::from_ref_time(4_721_947 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn delete_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(13_795_000 as u64)
			// Standard Error: 28_239
			.saturating_add(Weight::from_ref_time(12_840_446 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	fn token_owner() -> Weight {
		Weight::from_ref_time(7_088_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
	}
	// Storage: Nonfungible CollectionAllowance (r:0 w:1)
	fn set_allowance_for_all() -> Weight {
		Weight::from_ref_time(17_607_000 as u64)
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible CollectionAllowance (r:1 w:0)
	fn allowance_for_all() -> Weight {
		Weight::from_ref_time(5_315_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
	}
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	fn repair_item() -> Weight {
		Weight::from_ref_time(7_638_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	// Storage: Nonfungible TokensMinted (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Nonfungible TokenData (r:0 w:1)
	// Storage: Nonfungible Owned (r:0 w:1)
	fn create_item() -> Weight {
		Weight::from_ref_time(34_815_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokensMinted (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Nonfungible TokenData (r:0 w:4)
	// Storage: Nonfungible Owned (r:0 w:4)
	fn create_multiple_items(b: u32, ) -> Weight {
		Weight::from_ref_time(18_772_483 as u64)
			// Standard Error: 5_664
			.saturating_add(Weight::from_ref_time(7_602_706 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(3 as u64))
			.saturating_add(RocksDbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
			.saturating_add(RocksDbWeight::get().writes((3 as u64).saturating_mul(b as u64)))
	}
	// Storage: Nonfungible TokensMinted (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:4 w:4)
	// Storage: Nonfungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Nonfungible TokenData (r:0 w:4)
	// Storage: Nonfungible Owned (r:0 w:4)
	fn create_multiple_items_ex(b: u32, ) -> Weight {
		Weight::from_ref_time(15_449_226 as u64)
			// Standard Error: 6_012
			.saturating_add(Weight::from_ref_time(9_325_591 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().reads((2 as u64).saturating_mul(b as u64)))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
			.saturating_add(RocksDbWeight::get().writes((4 as u64).saturating_mul(b as u64)))
	}
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	fn burn_item() -> Weight {
		Weight::from_ref_time(35_221_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	fn burn_recursively_self_raw() -> Weight {
		Weight::from_ref_time(45_504_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	// Storage: Common CollectionById (r:1 w:0)
	fn burn_recursively_breadth_plus_self_plus_self_per_each_raw(b: u32, ) -> Weight {
		Weight::from_ref_time(45_539_000 as u64)
			// Standard Error: 1_047_413
			.saturating_add(Weight::from_ref_time(216_998_419 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(7 as u64))
			.saturating_add(RocksDbWeight::get().reads((4 as u64).saturating_mul(b as u64)))
			.saturating_add(RocksDbWeight::get().writes(6 as u64))
			.saturating_add(RocksDbWeight::get().writes((4 as u64).saturating_mul(b as u64)))
	}
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:2 w:2)
	// Storage: Nonfungible Allowance (r:1 w:0)
	// Storage: Nonfungible Owned (r:0 w:2)
	fn transfer() -> Weight {
		Weight::from_ref_time(30_047_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(5 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	// Storage: Nonfungible Allowance (r:1 w:1)
	fn approve() -> Weight {
		Weight::from_ref_time(24_476_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	// Storage: Nonfungible Allowance (r:1 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(22_818_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	// Storage: Nonfungible Allowance (r:1 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(18_965_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible Allowance (r:1 w:1)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:2 w:2)
	// Storage: Nonfungible Owned (r:0 w:2)
	fn transfer_from() -> Weight {
		Weight::from_ref_time(37_251_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(6 as u64))
	}
	// Storage: Nonfungible Allowance (r:1 w:1)
	// Storage: Nonfungible TokenData (r:1 w:1)
	// Storage: Nonfungible TokenChildren (r:1 w:0)
	// Storage: Nonfungible TokensBurnt (r:1 w:1)
	// Storage: Nonfungible AccountBalance (r:1 w:1)
	// Storage: Nonfungible Owned (r:0 w:1)
	// Storage: Nonfungible TokenProperties (r:0 w:1)
	fn burn_from() -> Weight {
		Weight::from_ref_time(43_202_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(6 as u64))
	}
	// Storage: Common CollectionPropertyPermissions (r:1 w:1)
	fn set_token_property_permissions(b: u32, ) -> Weight {
		Weight::from_ref_time(5_282_000 as u64)
			// Standard Error: 45_166
			.saturating_add(Weight::from_ref_time(12_937_288 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn set_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(31_850_484 as u64)
			// Standard Error: 9_618
			.saturating_add(Weight::from_ref_time(4_721_947 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn delete_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(13_795_000 as u64)
			// Standard Error: 28_239
			.saturating_add(Weight::from_ref_time(12_840_446 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible TokenData (r:1 w:0)
	fn token_owner() -> Weight {
		Weight::from_ref_time(7_088_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
	}
	// Storage: Nonfungible CollectionAllowance (r:0 w:1)
	fn set_allowance_for_all() -> Weight {
		Weight::from_ref_time(17_607_000 as u64)
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Nonfungible CollectionAllowance (r:1 w:0)
	fn allowance_for_all() -> Weight {
		Weight::from_ref_time(5_315_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
	}
	// Storage: Nonfungible TokenProperties (r:1 w:1)
	fn repair_item() -> Weight {
		Weight::from_ref_time(7_638_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
}
