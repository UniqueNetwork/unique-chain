// Template adopted from https://github.com/paritytech/substrate/blob/master/.maintain/frame-weight-template.hbs

//! Autogenerated weights for pallet_unique_scheduler_v2
//!
//! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
//! DATE: 2022-10-28, STEPS: `50`, REPEAT: 80, LOW RANGE: `[]`, HIGH RANGE: `[]`
//! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024

// Executed Command:
// target/release/unique-collator
// benchmark
// pallet
// --pallet
// pallet-unique-scheduler-v2
// --wasm-execution
// compiled
// --extrinsic
// *
// --template
// .maintain/frame-weight-template.hbs
// --steps=50
// --repeat=80
// --heap-pages=4096
// --output=./pallets/scheduler-v2/src/weights.rs

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]
#![allow(missing_docs)]
#![allow(clippy::unnecessary_cast)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

/// Weight functions needed for pallet_unique_scheduler_v2.
pub trait WeightInfo {
	fn service_agendas_base() -> Weight;
	fn service_agenda_base(s: u32, ) -> Weight;
	fn service_task_base() -> Weight;
	fn service_task_named() -> Weight;
	fn service_task_periodic() -> Weight;
	fn execute_dispatch_signed() -> Weight;
	fn execute_dispatch_unsigned() -> Weight;
	fn schedule(s: u32, ) -> Weight;
	fn cancel(s: u32, ) -> Weight;
	fn schedule_named(s: u32, ) -> Weight;
	fn cancel_named(s: u32, ) -> Weight;
	fn change_named_priority(s: u32, ) -> Weight;
}

/// Weights for pallet_unique_scheduler_v2 using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	// Storage: Scheduler IncompleteSince (r:1 w:1)
	fn service_agendas_base() -> Weight {
		Weight::from_ref_time(5_253_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Scheduler Agenda (r:1 w:1)
	fn service_agenda_base(s: u32, ) -> Weight {
		Weight::from_ref_time(3_858_000 as u64)
			// Standard Error: 2_617
			.saturating_add(Weight::from_ref_time(579_704 as u64).saturating_mul(s as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: System LastRuntimeUpgrade (r:1 w:0)
	fn service_task_base() -> Weight {
		Weight::from_ref_time(10_536_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
	}
	// Storage: System LastRuntimeUpgrade (r:1 w:0)
	// Storage: Scheduler Lookup (r:0 w:1)
	fn service_task_named() -> Weight {
		Weight::from_ref_time(12_018_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: System LastRuntimeUpgrade (r:1 w:0)
	fn service_task_periodic() -> Weight {
		Weight::from_ref_time(10_669_000 as u64)
			.saturating_add(T::DbWeight::get().reads(1 as u64))
	}
	// Storage: System Account (r:1 w:1)
	// Storage: System AllExtrinsicsLen (r:1 w:1)
	// Storage: System BlockWeight (r:1 w:1)
	// Storage: Configuration WeightToFeeCoefficientOverride (r:1 w:0)
	// Storage: TransactionPayment NextFeeMultiplier (r:1 w:0)
	fn execute_dispatch_signed() -> Weight {
		Weight::from_ref_time(36_083_000 as u64)
			.saturating_add(T::DbWeight::get().reads(5 as u64))
			.saturating_add(T::DbWeight::get().writes(3 as u64))
	}
	fn execute_dispatch_unsigned() -> Weight {
		Weight::from_ref_time(4_386_000 as u64)
	}
	// Storage: Scheduler Agenda (r:1 w:1)
	fn schedule(s: u32, ) -> Weight {
		Weight::from_ref_time(17_257_000 as u64)
			// Standard Error: 2_791
			.saturating_add(Weight::from_ref_time(574_832 as u64).saturating_mul(s as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	// Storage: Scheduler Agenda (r:1 w:1)
	// Storage: Scheduler Lookup (r:0 w:1)
	fn cancel(s: u32, ) -> Weight {
		Weight::from_ref_time(19_803_000 as u64)
			// Standard Error: 1_177
			.saturating_add(Weight::from_ref_time(475_027 as u64).saturating_mul(s as u64))
			.saturating_add(T::DbWeight::get().reads(1 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Scheduler Lookup (r:1 w:1)
	// Storage: Scheduler Agenda (r:1 w:1)
	fn schedule_named(s: u32, ) -> Weight {
		Weight::from_ref_time(18_746_000 as u64)
			// Standard Error: 2_997
			.saturating_add(Weight::from_ref_time(635_697 as u64).saturating_mul(s as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Scheduler Lookup (r:1 w:1)
	// Storage: Scheduler Agenda (r:1 w:1)
	fn cancel_named(s: u32, ) -> Weight {
		Weight::from_ref_time(20_983_000 as u64)
			// Standard Error: 1_850
			.saturating_add(Weight::from_ref_time(518_812 as u64).saturating_mul(s as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	// Storage: Scheduler Lookup (r:1 w:0)
	// Storage: Scheduler Agenda (r:1 w:1)
	fn change_named_priority(s: u32, ) -> Weight {
		Weight::from_ref_time(21_591_000 as u64)
			// Standard Error: 4_187
			.saturating_add(Weight::from_ref_time(531_231 as u64).saturating_mul(s as u64))
			.saturating_add(T::DbWeight::get().reads(2 as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
}

// For backwards compatibility and tests
impl WeightInfo for () {
	// Storage: Scheduler IncompleteSince (r:1 w:1)
	fn service_agendas_base() -> Weight {
		Weight::from_ref_time(5_253_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Scheduler Agenda (r:1 w:1)
	fn service_agenda_base(s: u32, ) -> Weight {
		Weight::from_ref_time(3_858_000 as u64)
			// Standard Error: 2_617
			.saturating_add(Weight::from_ref_time(579_704 as u64).saturating_mul(s as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: System LastRuntimeUpgrade (r:1 w:0)
	fn service_task_base() -> Weight {
		Weight::from_ref_time(10_536_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
	}
	// Storage: System LastRuntimeUpgrade (r:1 w:0)
	// Storage: Scheduler Lookup (r:0 w:1)
	fn service_task_named() -> Weight {
		Weight::from_ref_time(12_018_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: System LastRuntimeUpgrade (r:1 w:0)
	fn service_task_periodic() -> Weight {
		Weight::from_ref_time(10_669_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
	}
	// Storage: System Account (r:1 w:1)
	// Storage: System AllExtrinsicsLen (r:1 w:1)
	// Storage: System BlockWeight (r:1 w:1)
	// Storage: Configuration WeightToFeeCoefficientOverride (r:1 w:0)
	// Storage: TransactionPayment NextFeeMultiplier (r:1 w:0)
	fn execute_dispatch_signed() -> Weight {
		Weight::from_ref_time(36_083_000 as u64)
			.saturating_add(RocksDbWeight::get().reads(5 as u64))
			.saturating_add(RocksDbWeight::get().writes(3 as u64))
	}
	fn execute_dispatch_unsigned() -> Weight {
		Weight::from_ref_time(4_386_000 as u64)
	}
	// Storage: Scheduler Agenda (r:1 w:1)
	fn schedule(s: u32, ) -> Weight {
		Weight::from_ref_time(17_257_000 as u64)
			// Standard Error: 2_791
			.saturating_add(Weight::from_ref_time(574_832 as u64).saturating_mul(s as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	// Storage: Scheduler Agenda (r:1 w:1)
	// Storage: Scheduler Lookup (r:0 w:1)
	fn cancel(s: u32, ) -> Weight {
		Weight::from_ref_time(19_803_000 as u64)
			// Standard Error: 1_177
			.saturating_add(Weight::from_ref_time(475_027 as u64).saturating_mul(s as u64))
			.saturating_add(RocksDbWeight::get().reads(1 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Scheduler Lookup (r:1 w:1)
	// Storage: Scheduler Agenda (r:1 w:1)
	fn schedule_named(s: u32, ) -> Weight {
		Weight::from_ref_time(18_746_000 as u64)
			// Standard Error: 2_997
			.saturating_add(Weight::from_ref_time(635_697 as u64).saturating_mul(s as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Scheduler Lookup (r:1 w:1)
	// Storage: Scheduler Agenda (r:1 w:1)
	fn cancel_named(s: u32, ) -> Weight {
		Weight::from_ref_time(20_983_000 as u64)
			// Standard Error: 1_850
			.saturating_add(Weight::from_ref_time(518_812 as u64).saturating_mul(s as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	// Storage: Scheduler Lookup (r:1 w:0)
	// Storage: Scheduler Agenda (r:1 w:1)
	fn change_named_priority(s: u32, ) -> Weight {
		Weight::from_ref_time(21_591_000 as u64)
			// Standard Error: 4_187
			.saturating_add(Weight::from_ref_time(531_231 as u64).saturating_mul(s as u64))
			.saturating_add(RocksDbWeight::get().reads(2 as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
}
