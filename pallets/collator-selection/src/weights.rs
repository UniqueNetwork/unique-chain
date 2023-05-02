#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{
	traits::Get,
	weights::{constants::RocksDbWeight, Weight},
};
use sp_std::marker::PhantomData;

// The weight info trait for `pallet_collator_selection`.
pub trait WeightInfo {
	fn add_invulnerable(_b: u32) -> Weight;
	fn remove_invulnerable(_b: u32) -> Weight;
	fn get_license(_c: u32) -> Weight;
	fn onboard(_c: u32) -> Weight;
	fn offboard(_c: u32) -> Weight;
	fn release_license(_c: u32) -> Weight;
	fn force_release_license(_c: u32) -> Weight;
	fn note_author() -> Weight;
	fn new_session(_c: u32, _r: u32) -> Weight;
}

/// Weights for pallet_collator_selection using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	fn add_invulnerable(b: u32) -> Weight {
		Weight::from_ref_time(18_563_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(68_000 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	fn remove_invulnerable(b: u32) -> Weight {
		Weight::from_ref_time(18_563_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(68_000 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	fn get_license(c: u32) -> Weight {
		Weight::from_ref_time(71_196_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(198_000 as u64).saturating_mul(c as u64))
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	fn onboard(c: u32) -> Weight {
		Weight::from_ref_time(71_196_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(198_000 as u64).saturating_mul(c as u64))
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	fn offboard(c: u32) -> Weight {
		Weight::from_ref_time(55_336_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(151_000 as u64).saturating_mul(c as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	fn release_license(c: u32) -> Weight {
		Weight::from_ref_time(55_336_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(151_000 as u64).saturating_mul(c as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	fn force_release_license(c: u32) -> Weight {
		Weight::from_ref_time(55_336_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(151_000 as u64).saturating_mul(c as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	fn note_author() -> Weight {
		Weight::from_ref_time(71_461_000 as u64)
			.saturating_add(T::DbWeight::get().reads(3 as u64))
			.saturating_add(T::DbWeight::get().writes(4 as u64))
	}
	fn new_session(r: u32, c: u32) -> Weight {
		Weight::from_ref_time(0 as u64)
			// Standard Error: 1_010_000
			.saturating_add(Weight::from_ref_time(109_961_000 as u64).saturating_mul(r as u64))
			// Standard Error: 1_010_000
			.saturating_add(Weight::from_ref_time(151_952_000 as u64).saturating_mul(c as u64))
			.saturating_add(T::DbWeight::get().reads((1 as u64).saturating_mul(r as u64)))
			.saturating_add(T::DbWeight::get().reads((2 as u64).saturating_mul(c as u64)))
			.saturating_add(T::DbWeight::get().writes((2 as u64).saturating_mul(r as u64)))
			.saturating_add(T::DbWeight::get().writes((2 as u64).saturating_mul(c as u64)))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	fn add_invulnerable(b: u32) -> Weight {
		Weight::from_ref_time(18_563_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(68_000 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	fn remove_invulnerable(b: u32) -> Weight {
		Weight::from_ref_time(18_563_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(68_000 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	fn get_license(c: u32) -> Weight {
		Weight::from_ref_time(71_196_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(198_000 as u64).saturating_mul(c as u64))
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	fn onboard(c: u32) -> Weight {
		Weight::from_ref_time(71_196_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(198_000 as u64).saturating_mul(c as u64))
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	fn offboard(c: u32) -> Weight {
		Weight::from_ref_time(55_336_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(151_000 as u64).saturating_mul(c as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	fn release_license(c: u32) -> Weight {
		Weight::from_ref_time(55_336_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(151_000 as u64).saturating_mul(c as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	fn force_release_license(c: u32) -> Weight {
		Weight::from_ref_time(55_336_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(151_000 as u64).saturating_mul(c as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	fn note_author() -> Weight {
		Weight::from_ref_time(71_461_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(3 as u64))
			.saturating_add(RocksDbWeight::get().writes(4 as u64))
	}
	fn new_session(r: u32, c: u32) -> Weight {
		Weight::from_ref_time(0 as u64)
			// Standard Error: 1_010_000
			.saturating_add(Weight::from_ref_time(109_961_000 as u64).saturating_mul(r as u64))
			// Standard Error: 1_010_000
			.saturating_add(Weight::from_ref_time(151_952_000 as u64).saturating_mul(c as u64))
			.saturating_add(RocksDbWeight::get().reads((1 as u64).saturating_mul(r as u64)))
			.saturating_add(RocksDbWeight::get().reads((2 as u64).saturating_mul(c as u64)))
			.saturating_add(RocksDbWeight::get().writes((2 as u64).saturating_mul(r as u64)))
			.saturating_add(RocksDbWeight::get().writes((2 as u64).saturating_mul(c as u64)))
	}
}
