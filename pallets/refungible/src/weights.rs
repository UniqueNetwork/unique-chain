// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_refungible
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-01-18, STEPS: `50`, REPEAT: 80, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// target/release/unique-collator
// benchmark
// pallet
// --pallet
// pallet-refungible
// --wasm-execution
// compiled
// --extrinsic
// *
// --template
// .maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/refungible/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]
#![allow(missing_docs)]
#![allow(clippy::unnecessary_cast)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_refungible.
pub trait WeightInfo {
	fn create_item() -> Weight;
	fn create_multiple_items(b: u32, ) -> Weight;
	fn create_multiple_items_ex_multiple_items(b: u32, ) -> Weight;
	fn create_multiple_items_ex_multiple_owners(b: u32, ) -> Weight;
	fn burn_item_partial() -> Weight;
	fn burn_item_fully() -> Weight;
	fn transfer_normal() -> Weight;
	fn transfer_creating() -> Weight;
	fn transfer_removing() -> Weight;
	fn transfer_creating_removing() -> Weight;
	fn approve() -> Weight;
	fn approve_from() -> Weight;
	fn transfer_from_normal() -> Weight;
	fn transfer_from_creating() -> Weight;
	fn transfer_from_removing() -> Weight;
	fn transfer_from_creating_removing() -> Weight;
	fn burn_from() -> Weight;
	fn set_token_property_permissions(b: u32, ) -> Weight;
	fn set_token_properties(b: u32, ) -> Weight;
	fn delete_token_properties(b: u32, ) -> Weight;
	fn repartition_item() -> Weight;
	fn token_owner() -> Weight;
	fn set_allowance_for_all() -> Weight;
	fn allowance_for_all() -> Weight;
	fn repair_item() -> Weight;
}

/// Weights for pallet_refungible using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible Balance (r:0 w:1)
	// Storage: Refungible TotalSupply (r:0 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	fn create_item() -> Weight {
		Weight::from_ref_time(37_536_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(6 as u64))
	}
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible Balance (r:0 w:4)
	// Storage: Refungible TotalSupply (r:0 w:4)
	// Storage: Refungible Owned (r:0 w:4)
	fn create_multiple_items(b: u32, ) -> Weight {
		Weight::from_ref_time(16_345_581 as u64)
			// Standard Error: 5_346
			.saturating_add(Weight::from_ref_time(9_281_076 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(3 as u64))
			.saturating_add(T::DbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
			.saturating_add(T::DbWeight::get().writes((4 as u64).saturating_mul(b as u64)))
	}
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible AccountBalance (r:4 w:4)
	// Storage: Refungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible Balance (r:0 w:4)
	// Storage: Refungible TotalSupply (r:0 w:4)
	// Storage: Refungible Owned (r:0 w:4)
	fn create_multiple_items_ex_multiple_items(b: u32, ) -> Weight {
		Weight::from_ref_time(11_246_602 as u64)
			// Standard Error: 8_015
			.saturating_add(Weight::from_ref_time(11_043_114 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().reads((2 as u64).saturating_mul(b as u64)))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
			.saturating_add(T::DbWeight::get().writes((5 as u64).saturating_mul(b as u64)))
	}
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible TotalSupply (r:0 w:1)
	// Storage: Refungible AccountBalance (r:4 w:4)
	// Storage: Refungible Balance (r:0 w:4)
	// Storage: Refungible Owned (r:0 w:4)
	fn create_multiple_items_ex_multiple_owners(b: u32, ) -> Weight {
		Weight::from_ref_time(31_350_923 as u64)
			// Standard Error: 4_061
			.saturating_add(Weight::from_ref_time(6_007_108 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(3 as u64))
			.saturating_add(T::DbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(T::DbWeight::get().writes(3 as u64))
			.saturating_add(T::DbWeight::get().writes((3 as u64).saturating_mul(b as u64)))
	}
	// Storage: Refungible Balance (r:3 w:1)
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	fn burn_item_partial() -> Weight {
		Weight::from_ref_time(47_342_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(4 as u64))
	}
	// Storage: Refungible Balance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokensBurnt (r:1 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	// Storage: Refungible TokenProperties (r:0 w:1)
	fn burn_item_fully() -> Weight {
		Weight::from_ref_time(40_664_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(6 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	fn transfer_normal() -> Weight {
		Weight::from_ref_time(31_585_000 as u64)
			.saturating_add(T::DbWeight::get().reads(3 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_creating() -> Weight {
		Weight::from_ref_time(35_015_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(4 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_removing() -> Weight {
		Weight::from_ref_time(38_209_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(4 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:2)
	fn transfer_creating_removing() -> Weight {
		Weight::from_ref_time(38_549_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(6 as u64))
	}
	// Storage: Refungible Balance (r:1 w:0)
	// Storage: Refungible Allowance (r:0 w:1)
	fn approve() -> Weight {
		Weight::from_ref_time(24_503_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible Balance (r:1 w:0)
	// Storage: Refungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(24_584_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible Balance (r:1 w:0)
	// Storage: Refungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(20_649_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	fn transfer_from_normal() -> Weight {
		Weight::from_ref_time(41_001_000 as u64)
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(3 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_from_creating() -> Weight {
		Weight::from_ref_time(43_884_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(5 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_from_removing() -> Weight {
		Weight::from_ref_time(47_515_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(5 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:2)
	fn transfer_from_creating_removing() -> Weight {
		Weight::from_ref_time(47_087_000 as u64)
			.saturating_add(T::DbWeight::get().reads(6 as u64))
			.saturating_add(T::DbWeight::get().writes(7 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokensBurnt (r:1 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	// Storage: Refungible TokenProperties (r:0 w:1)
	fn burn_from() -> Weight {
		Weight::from_ref_time(52_735_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(7 as u64))
	}
	// Storage: Common CollectionPropertyPermissions (r:1 w:1)
	fn set_token_property_permissions(b: u32, ) -> Weight {
		Weight::from_ref_time(5_232_000 as u64)
			// Standard Error: 43_746
			.saturating_add(Weight::from_ref_time(12_961_609 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn set_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(18_287_762 as u64)
			// Standard Error: 31_915
			.saturating_add(Weight::from_ref_time(7_070_524 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn delete_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(15_075_000 as u64)
			// Standard Error: 69_091
			.saturating_add(Weight::from_ref_time(22_793_781 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible Balance (r:1 w:1)
	fn repartition_item() -> Weight {
		Weight::from_ref_time(25_147_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Refungible Balance (r:2 w:0)
	fn token_owner() -> Weight {
		Weight::from_ref_time(9_921_000 as u64)
			.saturating_add(T::DbWeight::get().reads(2 as u64))
	}
	// Storage: Refungible CollectionAllowance (r:0 w:1)
	fn set_allowance_for_all() -> Weight {
		Weight::from_ref_time(17_822_000 as u64)
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible CollectionAllowance (r:1 w:0)
	fn allowance_for_all() -> Weight {
		Weight::from_ref_time(5_265_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
	}
	// Storage: Refungible TokenProperties (r:1 w:1)
	fn repair_item() -> Weight {
		Weight::from_ref_time(7_229_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible Balance (r:0 w:1)
	// Storage: Refungible TotalSupply (r:0 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	fn create_item() -> Weight {
		Weight::from_ref_time(37_536_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(6 as u64))
	}
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible Balance (r:0 w:4)
	// Storage: Refungible TotalSupply (r:0 w:4)
	// Storage: Refungible Owned (r:0 w:4)
	fn create_multiple_items(b: u32, ) -> Weight {
		Weight::from_ref_time(16_345_581 as u64)
			// Standard Error: 5_346
			.saturating_add(Weight::from_ref_time(9_281_076 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(3 as u64))
			.saturating_add(RocksDbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
			.saturating_add(RocksDbWeight::get().writes((4 as u64).saturating_mul(b as u64)))
	}
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible AccountBalance (r:4 w:4)
	// Storage: Refungible TokenProperties (r:4 w:4)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible Balance (r:0 w:4)
	// Storage: Refungible TotalSupply (r:0 w:4)
	// Storage: Refungible Owned (r:0 w:4)
	fn create_multiple_items_ex_multiple_items(b: u32, ) -> Weight {
		Weight::from_ref_time(11_246_602 as u64)
			// Standard Error: 8_015
			.saturating_add(Weight::from_ref_time(11_043_114 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().reads((2 as u64).saturating_mul(b as u64)))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
			.saturating_add(RocksDbWeight::get().writes((5 as u64).saturating_mul(b as u64)))
	}
	// Storage: Refungible TokensMinted (r:1 w:1)
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	// Storage: Refungible TotalSupply (r:0 w:1)
	// Storage: Refungible AccountBalance (r:4 w:4)
	// Storage: Refungible Balance (r:0 w:4)
	// Storage: Refungible Owned (r:0 w:4)
	fn create_multiple_items_ex_multiple_owners(b: u32, ) -> Weight {
		Weight::from_ref_time(31_350_923 as u64)
			// Standard Error: 4_061
			.saturating_add(Weight::from_ref_time(6_007_108 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(3 as u64))
			.saturating_add(RocksDbWeight::get().reads((1 as u64).saturating_mul(b as u64)))
			.saturating_add(RocksDbWeight::get().writes(3 as u64))
			.saturating_add(RocksDbWeight::get().writes((3 as u64).saturating_mul(b as u64)))
	}
	// Storage: Refungible Balance (r:3 w:1)
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	fn burn_item_partial() -> Weight {
		Weight::from_ref_time(47_342_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(4 as u64))
	}
	// Storage: Refungible Balance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokensBurnt (r:1 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	// Storage: Refungible TokenProperties (r:0 w:1)
	fn burn_item_fully() -> Weight {
		Weight::from_ref_time(40_664_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(6 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	fn transfer_normal() -> Weight {
		Weight::from_ref_time(31_585_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(3 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_creating() -> Weight {
		Weight::from_ref_time(35_015_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(4 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_removing() -> Weight {
		Weight::from_ref_time(38_209_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(4 as u64))
	}
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:2)
	fn transfer_creating_removing() -> Weight {
		Weight::from_ref_time(38_549_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(6 as u64))
	}
	// Storage: Refungible Balance (r:1 w:0)
	// Storage: Refungible Allowance (r:0 w:1)
	fn approve() -> Weight {
		Weight::from_ref_time(24_503_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible Balance (r:1 w:0)
	// Storage: Refungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(24_584_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible Balance (r:1 w:0)
	// Storage: Refungible Allowance (r:0 w:1)
	fn approve_from() -> Weight {
		Weight::from_ref_time(20_649_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	fn transfer_from_normal() -> Weight {
		Weight::from_ref_time(41_001_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(3 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_from_creating() -> Weight {
		Weight::from_ref_time(43_884_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(5 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:1)
	fn transfer_from_removing() -> Weight {
		Weight::from_ref_time(47_515_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(5 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:2 w:2)
	// Storage: Refungible AccountBalance (r:2 w:2)
	// Storage: Refungible TotalSupply (r:1 w:0)
	// Storage: Refungible Owned (r:0 w:2)
	fn transfer_from_creating_removing() -> Weight {
		Weight::from_ref_time(47_087_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(6 as u64))
			.saturating_add(RocksDbWeight::get().writes(7 as u64))
	}
	// Storage: Refungible Allowance (r:1 w:1)
	// Storage: Refungible Balance (r:1 w:1)
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible AccountBalance (r:1 w:1)
	// Storage: Refungible TokensBurnt (r:1 w:1)
	// Storage: Refungible Owned (r:0 w:1)
	// Storage: Refungible TokenProperties (r:0 w:1)
	fn burn_from() -> Weight {
		Weight::from_ref_time(52_735_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(7 as u64))
	}
	// Storage: Common CollectionPropertyPermissions (r:1 w:1)
	fn set_token_property_permissions(b: u32, ) -> Weight {
		Weight::from_ref_time(5_232_000 as u64)
			// Standard Error: 43_746
			.saturating_add(Weight::from_ref_time(12_961_609 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn set_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(18_287_762 as u64)
			// Standard Error: 31_915
			.saturating_add(Weight::from_ref_time(7_070_524 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible TokenProperties (r:1 w:1)
	// Storage: Common CollectionPropertyPermissions (r:1 w:0)
	fn delete_token_properties(b: u32, ) -> Weight {
		Weight::from_ref_time(15_075_000 as u64)
			// Standard Error: 69_091
			.saturating_add(Weight::from_ref_time(22_793_781 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible TotalSupply (r:1 w:1)
	// Storage: Refungible Balance (r:1 w:1)
	fn repartition_item() -> Weight {
		Weight::from_ref_time(25_147_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Refungible Balance (r:2 w:0)
	fn token_owner() -> Weight {
		Weight::from_ref_time(9_921_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
	}
	// Storage: Refungible CollectionAllowance (r:0 w:1)
	fn set_allowance_for_all() -> Weight {
		Weight::from_ref_time(17_822_000 as u64)
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Refungible CollectionAllowance (r:1 w:0)
	fn allowance_for_all() -> Weight {
		Weight::from_ref_time(5_265_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
	}
	// Storage: Refungible TokenProperties (r:1 w:1)
	fn repair_item() -> Weight {
		Weight::from_ref_time(7_229_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
}
