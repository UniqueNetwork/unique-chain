// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_nonfungible
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-10-13, STEPS: `50`, REPEAT: `80`, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! WORST CASE MAP SIZE: `1000000`
//! HOSTNAME: `bench-host`, CPU: `Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz`
//! EXECUTION: , WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// ./target/production/unique-collator
// benchmark
// pallet
// --pallet
// pallet-nonfungible
// --wasm-execution
// compiled
// --extrinsic
// *
// --template=.maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/nonfungible/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_nonfungible.
pub trait WeightInfo {
	fn create_item() -> Weight;
	fn create_multiple_items(b: u32, ) -> Weight;
	fn create_multiple_items_ex(b: u32, ) -> Weight;
	fn burn_item() -> Weight;
	fn transfer_raw() -> Weight;
	fn approve() -> Weight;
	fn approve_from() -> Weight;
	fn check_allowed_raw() -> Weight;
	fn burn_from() -> Weight;
	fn load_token_properties() -> Weight;
	fn write_token_properties(b: u32, ) -> Weight;
	fn set_token_property_permissions(b: u32, ) -> Weight;
	fn set_allowance_for_all() -> Weight;
	fn allowance_for_all() -> Weight;
	fn repair_item() -> Weight;
}

/// Weights for pallet_nonfungible using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	/// Storage: `Nonfungible::TokensMinted` (r:1 w:1)
	/// Proof: `Nonfungible::TokensMinted` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:0 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:1)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	fn create_item() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3530`
		// Minimum execution time: 25_209_000 picoseconds.
		Weight::from_parts(25_648_000, 3530)
			.saturating_add(T::DbWeight::get().reads(2_u64))
			.saturating_add(T::DbWeight::get().writes(4_u64))
	}
	/// Storage: `Nonfungible::TokensMinted` (r:1 w:1)
	/// Proof: `Nonfungible::TokensMinted` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:0 w:200)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:200)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 200]`.
	fn create_multiple_items(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3530`
		// Minimum execution time: 6_239_000 picoseconds.
		Weight::from_parts(11_021_733, 3530)
			// Standard Error: 3_013
			.saturating_add(Weight::from_parts(9_580_947, 0).saturating_mul(b.into()))
			.saturating_add(T::DbWeight::get().reads(2_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
			.saturating_add(T::DbWeight::get().writes((2_u64).saturating_mul(b.into())))
	}
	/// Storage: `Nonfungible::TokensMinted` (r:1 w:1)
	/// Proof: `Nonfungible::TokensMinted` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:200 w:200)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:0 w:200)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:200)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 200]`.
	fn create_multiple_items_ex(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3481 + b * (2540 ±0)`
		// Minimum execution time: 6_278_000 picoseconds.
		Weight::from_parts(5_169_950, 3481)
			// Standard Error: 3_419
			.saturating_add(Weight::from_parts(13_514_569, 0).saturating_mul(b.into()))
			.saturating_add(T::DbWeight::get().reads(1_u64))
			.saturating_add(T::DbWeight::get().reads((1_u64).saturating_mul(b.into())))
			.saturating_add(T::DbWeight::get().writes(1_u64))
			.saturating_add(T::DbWeight::get().writes((3_u64).saturating_mul(b.into())))
			.saturating_add(Weight::from_parts(0, 2540).saturating_mul(b.into()))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenChildren` (r:1 w:0)
	/// Proof: `Nonfungible::TokenChildren` (`max_values`: None, `max_size`: Some(41), added: 2516, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokensBurnt` (r:1 w:1)
	/// Proof: `Nonfungible::TokensBurnt` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:0)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:1)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenProperties` (r:0 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn burn_item() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `380`
		//  Estimated: `3530`
		// Minimum execution time: 39_015_000 picoseconds.
		Weight::from_parts(39_562_000, 3530)
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(5_u64))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:2 w:2)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:0)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:2)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	fn transfer_raw() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `380`
		//  Estimated: `6070`
		// Minimum execution time: 32_930_000 picoseconds.
		Weight::from_parts(33_398_000, 6070)
			.saturating_add(T::DbWeight::get().reads(4_u64))
			.saturating_add(T::DbWeight::get().writes(5_u64))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:0)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:1)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	fn approve() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `326`
		//  Estimated: `3522`
		// Minimum execution time: 17_411_000 picoseconds.
		Weight::from_parts(17_790_000, 3522)
			.saturating_add(T::DbWeight::get().reads(2_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:0)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:1)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	fn approve_from() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `313`
		//  Estimated: `3522`
		// Minimum execution time: 17_707_000 picoseconds.
		Weight::from_parts(18_035_000, 3522)
			.saturating_add(T::DbWeight::get().reads(2_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::Allowance` (r:1 w:0)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	fn check_allowed_raw() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `362`
		//  Estimated: `3522`
		// Minimum execution time: 6_353_000 picoseconds.
		Weight::from_parts(6_515_000, 3522)
			.saturating_add(T::DbWeight::get().reads(1_u64))
	}
	/// Storage: `Nonfungible::Allowance` (r:1 w:1)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:1 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenChildren` (r:1 w:0)
	/// Proof: `Nonfungible::TokenChildren` (`max_values`: None, `max_size`: Some(41), added: 2516, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokensBurnt` (r:1 w:1)
	/// Proof: `Nonfungible::TokensBurnt` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:1)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenProperties` (r:0 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn burn_from() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `463`
		//  Estimated: `3530`
		// Minimum execution time: 47_086_000 picoseconds.
		Weight::from_parts(47_687_000, 3530)
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(6_u64))
	}
	/// Storage: `Nonfungible::TokenProperties` (r:1 w:0)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn load_token_properties() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `279`
		//  Estimated: `36269`
		// Minimum execution time: 4_868_000 picoseconds.
		Weight::from_parts(4_994_000, 36269)
			.saturating_add(T::DbWeight::get().reads(1_u64))
	}
	/// Storage: `Nonfungible::TokenProperties` (r:0 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 64]`.
	fn write_token_properties(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `0`
		//  Estimated: `0`
		// Minimum execution time: 860_000 picoseconds.
		Weight::from_parts(886_000, 0)
			// Standard Error: 70_909
			.saturating_add(Weight::from_parts(38_734_650, 0).saturating_mul(b.into()))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: `Common::CollectionPropertyPermissions` (r:1 w:1)
	/// Proof: `Common::CollectionPropertyPermissions` (`max_values`: None, `max_size`: Some(16726), added: 19201, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 64]`.
	fn set_token_property_permissions(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `314`
		//  Estimated: `20191`
		// Minimum execution time: 3_151_000 picoseconds.
		Weight::from_parts(3_276_000, 20191)
			// Standard Error: 169_159
			.saturating_add(Weight::from_parts(38_018_122, 0).saturating_mul(b.into()))
			.saturating_add(T::DbWeight::get().reads(1_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::CollectionAllowance` (r:0 w:1)
	/// Proof: `Nonfungible::CollectionAllowance` (`max_values`: None, `max_size`: Some(111), added: 2586, mode: `MaxEncodedLen`)
	fn set_allowance_for_all() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `0`
		//  Estimated: `0`
		// Minimum execution time: 11_146_000 picoseconds.
		Weight::from_parts(11_344_000, 0)
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::CollectionAllowance` (r:1 w:0)
	/// Proof: `Nonfungible::CollectionAllowance` (`max_values`: None, `max_size`: Some(111), added: 2586, mode: `MaxEncodedLen`)
	fn allowance_for_all() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3576`
		// Minimum execution time: 5_413_000 picoseconds.
		Weight::from_parts(5_593_000, 3576)
			.saturating_add(T::DbWeight::get().reads(1_u64))
	}
	/// Storage: `Nonfungible::TokenProperties` (r:1 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn repair_item() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `279`
		//  Estimated: `36269`
		// Minimum execution time: 4_968_000 picoseconds.
		Weight::from_parts(5_138_000, 36269)
			.saturating_add(T::DbWeight::get().reads(1_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	/// Storage: `Nonfungible::TokensMinted` (r:1 w:1)
	/// Proof: `Nonfungible::TokensMinted` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:0 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:1)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	fn create_item() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3530`
		// Minimum execution time: 25_209_000 picoseconds.
		Weight::from_parts(25_648_000, 3530)
			.saturating_add(RocksDbWeight::get().reads(2_u64))
			.saturating_add(RocksDbWeight::get().writes(4_u64))
	}
	/// Storage: `Nonfungible::TokensMinted` (r:1 w:1)
	/// Proof: `Nonfungible::TokensMinted` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:0 w:200)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:200)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 200]`.
	fn create_multiple_items(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3530`
		// Minimum execution time: 6_239_000 picoseconds.
		Weight::from_parts(11_021_733, 3530)
			// Standard Error: 3_013
			.saturating_add(Weight::from_parts(9_580_947, 0).saturating_mul(b.into()))
			.saturating_add(RocksDbWeight::get().reads(2_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
			.saturating_add(RocksDbWeight::get().writes((2_u64).saturating_mul(b.into())))
	}
	/// Storage: `Nonfungible::TokensMinted` (r:1 w:1)
	/// Proof: `Nonfungible::TokensMinted` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:200 w:200)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:0 w:200)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:200)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 200]`.
	fn create_multiple_items_ex(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3481 + b * (2540 ±0)`
		// Minimum execution time: 6_278_000 picoseconds.
		Weight::from_parts(5_169_950, 3481)
			// Standard Error: 3_419
			.saturating_add(Weight::from_parts(13_514_569, 0).saturating_mul(b.into()))
			.saturating_add(RocksDbWeight::get().reads(1_u64))
			.saturating_add(RocksDbWeight::get().reads((1_u64).saturating_mul(b.into())))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
			.saturating_add(RocksDbWeight::get().writes((3_u64).saturating_mul(b.into())))
			.saturating_add(Weight::from_parts(0, 2540).saturating_mul(b.into()))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenChildren` (r:1 w:0)
	/// Proof: `Nonfungible::TokenChildren` (`max_values`: None, `max_size`: Some(41), added: 2516, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokensBurnt` (r:1 w:1)
	/// Proof: `Nonfungible::TokensBurnt` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:0)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:1)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenProperties` (r:0 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn burn_item() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `380`
		//  Estimated: `3530`
		// Minimum execution time: 39_015_000 picoseconds.
		Weight::from_parts(39_562_000, 3530)
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(5_u64))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:2 w:2)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:0)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:2)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	fn transfer_raw() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `380`
		//  Estimated: `6070`
		// Minimum execution time: 32_930_000 picoseconds.
		Weight::from_parts(33_398_000, 6070)
			.saturating_add(RocksDbWeight::get().reads(4_u64))
			.saturating_add(RocksDbWeight::get().writes(5_u64))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:0)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:1)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	fn approve() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `326`
		//  Estimated: `3522`
		// Minimum execution time: 17_411_000 picoseconds.
		Weight::from_parts(17_790_000, 3522)
			.saturating_add(RocksDbWeight::get().reads(2_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::TokenData` (r:1 w:0)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Allowance` (r:1 w:1)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	fn approve_from() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `313`
		//  Estimated: `3522`
		// Minimum execution time: 17_707_000 picoseconds.
		Weight::from_parts(18_035_000, 3522)
			.saturating_add(RocksDbWeight::get().reads(2_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::Allowance` (r:1 w:0)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	fn check_allowed_raw() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `362`
		//  Estimated: `3522`
		// Minimum execution time: 6_353_000 picoseconds.
		Weight::from_parts(6_515_000, 3522)
			.saturating_add(RocksDbWeight::get().reads(1_u64))
	}
	/// Storage: `Nonfungible::Allowance` (r:1 w:1)
	/// Proof: `Nonfungible::Allowance` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenData` (r:1 w:1)
	/// Proof: `Nonfungible::TokenData` (`max_values`: None, `max_size`: Some(57), added: 2532, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenChildren` (r:1 w:0)
	/// Proof: `Nonfungible::TokenChildren` (`max_values`: None, `max_size`: Some(41), added: 2516, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokensBurnt` (r:1 w:1)
	/// Proof: `Nonfungible::TokensBurnt` (`max_values`: None, `max_size`: Some(16), added: 2491, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::AccountBalance` (r:1 w:1)
	/// Proof: `Nonfungible::AccountBalance` (`max_values`: None, `max_size`: Some(65), added: 2540, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::Owned` (r:0 w:1)
	/// Proof: `Nonfungible::Owned` (`max_values`: None, `max_size`: Some(74), added: 2549, mode: `MaxEncodedLen`)
	/// Storage: `Nonfungible::TokenProperties` (r:0 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn burn_from() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `463`
		//  Estimated: `3530`
		// Minimum execution time: 47_086_000 picoseconds.
		Weight::from_parts(47_687_000, 3530)
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(6_u64))
	}
	/// Storage: `Nonfungible::TokenProperties` (r:1 w:0)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn load_token_properties() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `279`
		//  Estimated: `36269`
		// Minimum execution time: 4_868_000 picoseconds.
		Weight::from_parts(4_994_000, 36269)
			.saturating_add(RocksDbWeight::get().reads(1_u64))
	}
	/// Storage: `Nonfungible::TokenProperties` (r:0 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 64]`.
	fn write_token_properties(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `0`
		//  Estimated: `0`
		// Minimum execution time: 860_000 picoseconds.
		Weight::from_parts(886_000, 0)
			// Standard Error: 70_909
			.saturating_add(Weight::from_parts(38_734_650, 0).saturating_mul(b.into()))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: `Common::CollectionPropertyPermissions` (r:1 w:1)
	/// Proof: `Common::CollectionPropertyPermissions` (`max_values`: None, `max_size`: Some(16726), added: 19201, mode: `MaxEncodedLen`)
	/// The range of component `b` is `[0, 64]`.
	fn set_token_property_permissions(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `314`
		//  Estimated: `20191`
		// Minimum execution time: 3_151_000 picoseconds.
		Weight::from_parts(3_276_000, 20191)
			// Standard Error: 169_159
			.saturating_add(Weight::from_parts(38_018_122, 0).saturating_mul(b.into()))
			.saturating_add(RocksDbWeight::get().reads(1_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::CollectionAllowance` (r:0 w:1)
	/// Proof: `Nonfungible::CollectionAllowance` (`max_values`: None, `max_size`: Some(111), added: 2586, mode: `MaxEncodedLen`)
	fn set_allowance_for_all() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `0`
		//  Estimated: `0`
		// Minimum execution time: 11_146_000 picoseconds.
		Weight::from_parts(11_344_000, 0)
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: `Nonfungible::CollectionAllowance` (r:1 w:0)
	/// Proof: `Nonfungible::CollectionAllowance` (`max_values`: None, `max_size`: Some(111), added: 2586, mode: `MaxEncodedLen`)
	fn allowance_for_all() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `142`
		//  Estimated: `3576`
		// Minimum execution time: 5_413_000 picoseconds.
		Weight::from_parts(5_593_000, 3576)
			.saturating_add(RocksDbWeight::get().reads(1_u64))
	}
	/// Storage: `Nonfungible::TokenProperties` (r:1 w:1)
	/// Proof: `Nonfungible::TokenProperties` (`max_values`: None, `max_size`: Some(32804), added: 35279, mode: `MaxEncodedLen`)
	fn repair_item() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `279`
		//  Estimated: `36269`
		// Minimum execution time: 4_968_000 picoseconds.
		Weight::from_parts(5_138_000, 36269)
			.saturating_add(RocksDbWeight::get().reads(1_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
}

