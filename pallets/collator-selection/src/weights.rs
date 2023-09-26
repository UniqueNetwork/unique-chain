// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_collator_selection
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2023-09-26, STEPS: `50`, REPEAT: `80`, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! WORST CASE MAP SIZE: `1000000`
//! HOSTNAME: `bench-host`, CPU: `Intel(R) Core(TM) i7-8700 CPU @ 3.20GHz`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// target/release/unique-collator
// benchmark
// pallet
// --pallet
// pallet-collator-selection
// --wasm-execution
// compiled
// --extrinsic
// *
// --template=.maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/collator-selection/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_collator_selection.
pub trait WeightInfo {
	fn add_invulnerable(b: u32, ) -> Weight;
	fn remove_invulnerable(b: u32, ) -> Weight;
	fn get_license(c: u32, ) -> Weight;
	fn onboard(c: u32, ) -> Weight;
	fn offboard(c: u32, ) -> Weight;
	fn release_license(c: u32, ) -> Weight;
	fn force_release_license(c: u32, ) -> Weight;
	fn note_author() -> Weight;
	fn new_session(r: u32, c: u32, ) -> Weight;
}

/// Weights for pallet_collator_selection using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	/// Storage: Session NextKeys (r:1 w:0)
	/// Proof Skipped: Session NextKeys (max_values: None, max_size: None, mode: Measured)
	/// Storage: CollatorSelection Invulnerables (r:1 w:1)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Candidates (r:1 w:0)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// The range of component `b` is `[1, 7]`.
	fn add_invulnerable(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `403 + b * (45 ±0)`
		//  Estimated: `3873 + b * (45 ±0)`
		// Minimum execution time: 13_780_000 picoseconds.
		Weight::from_parts(14_067_943, 3873)
			// Standard Error: 1_187
			.saturating_add(Weight::from_parts(168_052, 0).saturating_mul(b.into()))
			.saturating_add(T::DbWeight::get().reads(3_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
			.saturating_add(Weight::from_parts(0, 45).saturating_mul(b.into()))
	}
	/// Storage: CollatorSelection Invulnerables (r:1 w:1)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// The range of component `b` is `[1, 7]`.
	fn remove_invulnerable(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `96 + b * (32 ±0)`
		//  Estimated: `1806`
		// Minimum execution time: 8_583_000 picoseconds.
		Weight::from_parts(8_833_981, 1806)
			// Standard Error: 1_399
			.saturating_add(Weight::from_parts(140_293, 0).saturating_mul(b.into()))
			.saturating_add(T::DbWeight::get().reads(1_u64))
			.saturating_add(T::DbWeight::get().writes(1_u64))
	}
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:1)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Session NextKeys (r:1 w:0)
	/// Proof Skipped: Session NextKeys (max_values: None, max_size: None, mode: Measured)
	/// Storage: Configuration CollatorSelectionLicenseBondOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionLicenseBondOverride (max_values: Some(1), max_size: Some(16), added: 511, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:1 w:1)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 9]`.
	fn get_license(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `668 + c * (46 ±0)`
		//  Estimated: `4131 + c * (47 ±0)`
		// Minimum execution time: 29_155_000 picoseconds.
		Weight::from_parts(31_569_846, 4131)
			// Standard Error: 10_912
			.saturating_add(Weight::from_parts(547_194, 0).saturating_mul(c.into()))
			.saturating_add(T::DbWeight::get().reads(4_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
			.saturating_add(Weight::from_parts(0, 47).saturating_mul(c.into()))
	}
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:0)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Invulnerables (r:1 w:0)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: Configuration CollatorSelectionDesiredCollatorsOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionDesiredCollatorsOverride (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Configuration CollatorSelectionKickThresholdOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionKickThresholdOverride (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 7]`.
	fn onboard(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `414 + c * (54 ±0)`
		//  Estimated: `3529`
		// Minimum execution time: 17_999_000 picoseconds.
		Weight::from_parts(18_533_629, 3529)
			// Standard Error: 3_238
			.saturating_add(Weight::from_parts(299_090, 0).saturating_mul(c.into()))
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 8]`.
	fn offboard(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `111 + c * (32 ±0)`
		//  Estimated: `1806`
		// Minimum execution time: 9_845_000 picoseconds.
		Weight::from_parts(10_209_005, 1806)
			// Standard Error: 1_137
			.saturating_add(Weight::from_parts(156_275, 0).saturating_mul(c.into()))
			.saturating_add(T::DbWeight::get().reads(1_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:1)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:1 w:1)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 8]`.
	fn release_license(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `328 + c * (103 ±0)`
		//  Estimated: `3834`
		// Minimum execution time: 28_700_000 picoseconds.
		Weight::from_parts(29_499_805, 3834)
			// Standard Error: 16_180
			.saturating_add(Weight::from_parts(880_131, 0).saturating_mul(c.into()))
			.saturating_add(T::DbWeight::get().reads(3_u64))
			.saturating_add(T::DbWeight::get().writes(4_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:1)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:1 w:1)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 8]`.
	fn force_release_license(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `328 + c * (103 ±0)`
		//  Estimated: `3834`
		// Minimum execution time: 27_941_000 picoseconds.
		Weight::from_parts(28_960_442, 3834)
			// Standard Error: 17_391
			.saturating_add(Weight::from_parts(885_880, 0).saturating_mul(c.into()))
			.saturating_add(T::DbWeight::get().reads(3_u64))
			.saturating_add(T::DbWeight::get().writes(4_u64))
	}
	/// Storage: System Account (r:2 w:2)
	/// Proof: System Account (max_values: None, max_size: Some(128), added: 2603, mode: MaxEncodedLen)
	/// Storage: System BlockWeight (r:1 w:1)
	/// Proof: System BlockWeight (max_values: Some(1), max_size: Some(48), added: 543, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	fn note_author() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `157`
		//  Estimated: `6196`
		// Minimum execution time: 22_833_000 picoseconds.
		Weight::from_parts(23_223_000, 6196)
			.saturating_add(T::DbWeight::get().reads(3_u64))
			.saturating_add(T::DbWeight::get().writes(4_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:0)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: Configuration CollatorSelectionKickThresholdOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionKickThresholdOverride (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:8 w:0)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Invulnerables (r:1 w:0)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: System BlockWeight (r:1 w:1)
	/// Proof: System BlockWeight (max_values: Some(1), max_size: Some(48), added: 543, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LicenseDepositOf (r:7 w:7)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:7 w:7)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// Storage: System Account (r:8 w:8)
	/// Proof: System Account (max_values: None, max_size: Some(128), added: 2603, mode: MaxEncodedLen)
	/// The range of component `r` is `[1, 8]`.
	/// The range of component `c` is `[1, 8]`.
	fn new_session(r: u32, c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `727 + c * (84 ±0) + r * (254 ±0)`
		//  Estimated: `26857 + c * (2519 ±0) + r * (2844 ±4)`
		// Minimum execution time: 15_283_000 picoseconds.
		Weight::from_parts(15_615_000, 26857)
			// Standard Error: 188_448
			.saturating_add(Weight::from_parts(15_548_718, 0).saturating_mul(c.into()))
			.saturating_add(T::DbWeight::get().reads(5_u64))
			.saturating_add(T::DbWeight::get().reads((2_u64).saturating_mul(c.into())))
			.saturating_add(T::DbWeight::get().writes(1_u64))
			.saturating_add(T::DbWeight::get().writes((2_u64).saturating_mul(c.into())))
			.saturating_add(Weight::from_parts(0, 2519).saturating_mul(c.into()))
			.saturating_add(Weight::from_parts(0, 2844).saturating_mul(r.into()))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	/// Storage: Session NextKeys (r:1 w:0)
	/// Proof Skipped: Session NextKeys (max_values: None, max_size: None, mode: Measured)
	/// Storage: CollatorSelection Invulnerables (r:1 w:1)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Candidates (r:1 w:0)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// The range of component `b` is `[1, 7]`.
	fn add_invulnerable(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `403 + b * (45 ±0)`
		//  Estimated: `3873 + b * (45 ±0)`
		// Minimum execution time: 13_780_000 picoseconds.
		Weight::from_parts(14_067_943, 3873)
			// Standard Error: 1_187
			.saturating_add(Weight::from_parts(168_052, 0).saturating_mul(b.into()))
			.saturating_add(RocksDbWeight::get().reads(3_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
			.saturating_add(Weight::from_parts(0, 45).saturating_mul(b.into()))
	}
	/// Storage: CollatorSelection Invulnerables (r:1 w:1)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// The range of component `b` is `[1, 7]`.
	fn remove_invulnerable(b: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `96 + b * (32 ±0)`
		//  Estimated: `1806`
		// Minimum execution time: 8_583_000 picoseconds.
		Weight::from_parts(8_833_981, 1806)
			// Standard Error: 1_399
			.saturating_add(Weight::from_parts(140_293, 0).saturating_mul(b.into()))
			.saturating_add(RocksDbWeight::get().reads(1_u64))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
	}
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:1)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Session NextKeys (r:1 w:0)
	/// Proof Skipped: Session NextKeys (max_values: None, max_size: None, mode: Measured)
	/// Storage: Configuration CollatorSelectionLicenseBondOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionLicenseBondOverride (max_values: Some(1), max_size: Some(16), added: 511, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:1 w:1)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 9]`.
	fn get_license(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `668 + c * (46 ±0)`
		//  Estimated: `4131 + c * (47 ±0)`
		// Minimum execution time: 29_155_000 picoseconds.
		Weight::from_parts(31_569_846, 4131)
			// Standard Error: 10_912
			.saturating_add(Weight::from_parts(547_194, 0).saturating_mul(c.into()))
			.saturating_add(RocksDbWeight::get().reads(4_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
			.saturating_add(Weight::from_parts(0, 47).saturating_mul(c.into()))
	}
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:0)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Invulnerables (r:1 w:0)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: Configuration CollatorSelectionDesiredCollatorsOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionDesiredCollatorsOverride (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: Configuration CollatorSelectionKickThresholdOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionKickThresholdOverride (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 7]`.
	fn onboard(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `414 + c * (54 ±0)`
		//  Estimated: `3529`
		// Minimum execution time: 17_999_000 picoseconds.
		Weight::from_parts(18_533_629, 3529)
			// Standard Error: 3_238
			.saturating_add(Weight::from_parts(299_090, 0).saturating_mul(c.into()))
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 8]`.
	fn offboard(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `111 + c * (32 ±0)`
		//  Estimated: `1806`
		// Minimum execution time: 9_845_000 picoseconds.
		Weight::from_parts(10_209_005, 1806)
			// Standard Error: 1_137
			.saturating_add(Weight::from_parts(156_275, 0).saturating_mul(c.into()))
			.saturating_add(RocksDbWeight::get().reads(1_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:1)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:1 w:1)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 8]`.
	fn release_license(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `328 + c * (103 ±0)`
		//  Estimated: `3834`
		// Minimum execution time: 28_700_000 picoseconds.
		Weight::from_parts(29_499_805, 3834)
			// Standard Error: 16_180
			.saturating_add(Weight::from_parts(880_131, 0).saturating_mul(c.into()))
			.saturating_add(RocksDbWeight::get().reads(3_u64))
			.saturating_add(RocksDbWeight::get().writes(4_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:1)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LicenseDepositOf (r:1 w:1)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:1 w:1)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// The range of component `c` is `[1, 8]`.
	fn force_release_license(c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `328 + c * (103 ±0)`
		//  Estimated: `3834`
		// Minimum execution time: 27_941_000 picoseconds.
		Weight::from_parts(28_960_442, 3834)
			// Standard Error: 17_391
			.saturating_add(Weight::from_parts(885_880, 0).saturating_mul(c.into()))
			.saturating_add(RocksDbWeight::get().reads(3_u64))
			.saturating_add(RocksDbWeight::get().writes(4_u64))
	}
	/// Storage: System Account (r:2 w:2)
	/// Proof: System Account (max_values: None, max_size: Some(128), added: 2603, mode: MaxEncodedLen)
	/// Storage: System BlockWeight (r:1 w:1)
	/// Proof: System BlockWeight (max_values: Some(1), max_size: Some(48), added: 543, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:0 w:1)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	fn note_author() -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `157`
		//  Estimated: `6196`
		// Minimum execution time: 22_833_000 picoseconds.
		Weight::from_parts(23_223_000, 6196)
			.saturating_add(RocksDbWeight::get().reads(3_u64))
			.saturating_add(RocksDbWeight::get().writes(4_u64))
	}
	/// Storage: CollatorSelection Candidates (r:1 w:0)
	/// Proof: CollatorSelection Candidates (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: Configuration CollatorSelectionKickThresholdOverride (r:1 w:0)
	/// Proof: Configuration CollatorSelectionKickThresholdOverride (max_values: Some(1), max_size: Some(4), added: 499, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LastAuthoredBlock (r:8 w:0)
	/// Proof: CollatorSelection LastAuthoredBlock (max_values: None, max_size: Some(44), added: 2519, mode: MaxEncodedLen)
	/// Storage: CollatorSelection Invulnerables (r:1 w:0)
	/// Proof: CollatorSelection Invulnerables (max_values: Some(1), max_size: Some(321), added: 816, mode: MaxEncodedLen)
	/// Storage: System BlockWeight (r:1 w:1)
	/// Proof: System BlockWeight (max_values: Some(1), max_size: Some(48), added: 543, mode: MaxEncodedLen)
	/// Storage: CollatorSelection LicenseDepositOf (r:7 w:7)
	/// Proof: CollatorSelection LicenseDepositOf (max_values: None, max_size: Some(64), added: 2539, mode: MaxEncodedLen)
	/// Storage: Balances Holds (r:7 w:7)
	/// Proof: Balances Holds (max_values: None, max_size: Some(369), added: 2844, mode: MaxEncodedLen)
	/// Storage: System Account (r:8 w:8)
	/// Proof: System Account (max_values: None, max_size: Some(128), added: 2603, mode: MaxEncodedLen)
	/// The range of component `r` is `[1, 8]`.
	/// The range of component `c` is `[1, 8]`.
	fn new_session(r: u32, c: u32, ) -> Weight {
		// Proof Size summary in bytes:
		//  Measured:  `727 + c * (84 ±0) + r * (254 ±0)`
		//  Estimated: `26857 + c * (2519 ±0) + r * (2844 ±4)`
		// Minimum execution time: 15_283_000 picoseconds.
		Weight::from_parts(15_615_000, 26857)
			// Standard Error: 188_448
			.saturating_add(Weight::from_parts(15_548_718, 0).saturating_mul(c.into()))
			.saturating_add(RocksDbWeight::get().reads(5_u64))
			.saturating_add(RocksDbWeight::get().reads((2_u64).saturating_mul(c.into())))
			.saturating_add(RocksDbWeight::get().writes(1_u64))
			.saturating_add(RocksDbWeight::get().writes((2_u64).saturating_mul(c.into())))
			.saturating_add(Weight::from_parts(0, 2519).saturating_mul(c.into()))
			.saturating_add(Weight::from_parts(0, 2844).saturating_mul(r.into()))
	}
}

