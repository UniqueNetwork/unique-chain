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

// Original license:
// This file is part of Substrate.

// Copyright (C) 2021 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{
	traits::Get,
	weights::{constants::RocksDbWeight, Weight},
};
use sp_std::marker::PhantomData;

// todo:collator re-generate weights
// The weight info trait for `pallet_collator_selection`.
pub trait WeightInfo {
	fn set_invulnerables(_b: u32) -> Weight;
	fn set_desired_candidates() -> Weight;
	fn set_license_bond() -> Weight;
	fn register_as_candidate(_c: u32) -> Weight;
	fn leave_intent(_c: u32) -> Weight;
	fn note_author() -> Weight;
	fn new_session(_c: u32, _r: u32) -> Weight;
}

/// Weights for pallet_collator_selection using the Substrate node and recommended hardware.
pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	fn set_invulnerables(b: u32) -> Weight {
		Weight::from_ref_time(18_563_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(68_000 as u64).saturating_mul(b as u64))
			.saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	fn set_desired_candidates() -> Weight {
		Weight::from_ref_time(16_363_000 as u64).saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	fn set_license_bond() -> Weight {
		Weight::from_ref_time(16_840_000 as u64).saturating_add(T::DbWeight::get().writes(1 as u64))
	}
	fn register_as_candidate(c: u32) -> Weight {
		Weight::from_ref_time(71_196_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(198_000 as u64).saturating_mul(c as u64))
			.saturating_add(T::DbWeight::get().reads(4 as u64))
			.saturating_add(T::DbWeight::get().writes(2 as u64))
	}
	fn leave_intent(c: u32) -> Weight {
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
	fn set_invulnerables(b: u32) -> Weight {
		Weight::from_ref_time(18_563_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(68_000 as u64).saturating_mul(b as u64))
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	fn set_desired_candidates() -> Weight {
		Weight::from_ref_time(16_363_000 as u64)
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	fn set_license_bond() -> Weight {
		Weight::from_ref_time(16_840_000 as u64)
			.saturating_add(RocksDbWeight::get().writes(1 as u64))
	}
	fn register_as_candidate(c: u32) -> Weight {
		Weight::from_ref_time(71_196_000 as u64)
			// Standard Error: 0
			.saturating_add(Weight::from_ref_time(198_000 as u64).saturating_mul(c as u64))
			.saturating_add(RocksDbWeight::get().reads(4 as u64))
			.saturating_add(RocksDbWeight::get().writes(2 as u64))
	}
	fn leave_intent(c: u32) -> Weight {
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
