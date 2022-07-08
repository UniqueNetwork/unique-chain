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

// Original license
// This file is part of Substrate.

// Copyright (C) 2020-2021 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//! Scheduler pallet benchmarking.

use super::*;
use frame_benchmarking::{benchmarks, account};
use frame_support::{
	ensure,
	traits::{OnInitialize},
};
use frame_system::RawOrigin;
use sp_runtime::traits::Hash;
use sp_std::{prelude::*, vec};

use crate::Pallet as Scheduler;
use frame_system::Pallet as System;
use frame_support::traits::Currency;

const BLOCK_NUMBER: u32 = 2;

/// Add `n` named items to the schedule.
///
/// For `resolved`:
/// - `None`: aborted (hash without preimage)
/// - `Some(true)`: hash resolves into call if possible, plain call otherwise
/// - `Some(false)`: plain call
fn fill_schedule<T: Config>(
	when: T::BlockNumber,
	n: u32,
	periodic: bool,
	resolved: Option<bool>,
) -> Result<(), &'static str> {
	let t = DispatchTime::At(when);
	let caller = account("user", 0, 1);

	// Give the sender account max funds for transfer (their account will never reasonably be killed).
	T::Currency::make_free_balance_be(&caller, T::Currency::minimum_balance());

	for i in 0..n {
		let (call, hash) = call_and_hash::<T>(i);
		let call_or_hash = match resolved {
			Some(_) => call.into(),
			None => CallOrHashOf::<T>::Hash(hash),
		};
		let period = match periodic {
			true => Some(((i + 100).into(), 100)),
			false => None,
		};

		let slice_id: [u8; 4] = i.encode().try_into().unwrap();
		let mut id: [u8; 16] = [0; 16];
		id[..4].clone_from_slice(&slice_id);

		let origin = frame_system::RawOrigin::Signed(caller.clone()).into();
		Scheduler::<T>::do_schedule_named(id, t, period, 0, origin, call_or_hash)?;
	}
	ensure!(
		Agenda::<T>::get(when).len() == n as usize,
		"didn't fill schedule"
	);
	Ok(())
}

fn call_and_hash<T: Config>(i: u32) -> (<T as Config>::Call, T::Hash) {
	// Essentially a no-op call.
	let call: <T as Config>::Call = frame_system::Call::remark { remark: i.encode() }.into();
	let hash = T::Hashing::hash_of(&call);
	(call, hash)
}

benchmarks! {
	on_initialize_periodic_named_resolved {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, true, Some(true))?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
		assert_eq!(System::<T>::event_count(), s);
		for i in 0..s {
			assert_eq!(Agenda::<T>::get(when + (i + 100).into()).len(), 1 as usize);
		}
	}

	on_initialize_named_resolved {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, false, Some(true))?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
		assert_eq!(System::<T>::event_count(), s);
		assert!(Agenda::<T>::iter().count() == 0);
	}

	on_initialize_periodic {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, true, Some(false))?;
	}: { Scheduler::<T>::on_initialize(when); }
	verify {
		assert_eq!(System::<T>::event_count(), s);
		for i in 0..s {
			assert_eq!(Agenda::<T>::get(when + (i + 100).into()).len(), 1 as usize);
		}
	}

	on_initialize_periodic_resolved {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, true, Some(true))?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
		assert_eq!(System::<T>::event_count(), s );
		for i in 0..s {
			assert_eq!(Agenda::<T>::get(when + (i + 100).into()).len(), 1 as usize);
		}
	}

	on_initialize_aborted {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, false, None)?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
		assert_eq!(System::<T>::event_count(), 0);
	}

	on_initialize_named_aborted {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, false, Some(false))?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
	}

	on_initialize_named {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, false, None)?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
		assert_eq!(System::<T>::event_count(), 0);
	}

	on_initialize {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, false, Some(false))?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
		assert_eq!(System::<T>::event_count(), s);
		assert!(Agenda::<T>::iter().count() == 0);
	}

	on_initialize_resolved {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		fill_schedule::<T>(when, s, false, Some(true))?;
	}: { Scheduler::<T>::on_initialize(BLOCK_NUMBER.into()); }
	verify {
		assert_eq!(System::<T>::event_count(), s);
		assert!(Agenda::<T>::iter().count() == 0);
	}

	schedule_named {
		let caller: T::AccountId = account("user", 0, 1);
		let origin: RawOrigin<T::AccountId> = frame_system::RawOrigin::Signed(caller.clone());
		let s in 0 .. T::MaxScheduledPerBlock::get();
		let slice_id: [u8; 4] = s.encode().try_into().unwrap();
		let mut id: [u8; 16] =  [0; 16];
		id[..4].clone_from_slice(&slice_id);
		let when = BLOCK_NUMBER.into();
		let periodic = Some((T::BlockNumber::one(), 100));
		let priority = 0;
		// Essentially a no-op call.
		let inner_call = frame_system::Call::set_storage { items: vec![] }.into();
		let call = Box::new(CallOrHashOf::<T>::Value(inner_call));
		fill_schedule::<T>(when, s, true, Some(false))?;
	}: _(origin, id, when, periodic, priority, call)
	verify {
		ensure!(
			Agenda::<T>::get(when).len() == (s + 1) as usize,
			"didn't add to schedule"
		);
	}

	cancel_named {
		let caller: T::AccountId = account("user", 0, 1);
		let origin: RawOrigin<T::AccountId> = frame_system::RawOrigin::Signed(caller.clone());
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		let id = 0.encode().try_into().unwrap_or([0; MAX_TASK_ID_LENGTH_IN_BYTES as usize]);
		fill_schedule::<T>(when, s, true, Some(false))?;
	}: _(origin, id)
	verify {
		ensure!(
			Lookup::<T>::get(id).is_none(),
			"didn't remove from lookup"
		);
		// Removed schedule is NONE
		ensure!(
			Agenda::<T>::get(when)[0].is_none(),
			"didn't remove from schedule"
		);
	}

    // FIXME: no mock in crate
	// impl_benchmark_test_suite!(Scheduler, crate::mock::new_test_ext(), crate::mock::Test);
}
