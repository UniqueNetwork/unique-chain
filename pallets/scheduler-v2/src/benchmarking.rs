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

// Copyright (C) 2020-2022 Parity Technologies (UK) Ltd.
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
use frame_benchmarking::{account, benchmarks};
use frame_support::{
	ensure,
	traits::{schedule::Priority, PreimageRecipient},
};
use frame_system::RawOrigin;
use sp_std::{prelude::*, vec};
use sp_io::hashing::blake2_256;

use crate::{Pallet as Scheduler, ScheduledCall, EncodedCall};
use frame_system::Call as SystemCall;

const SEED: u32 = 0;

const BLOCK_NUMBER: u32 = 2;

/// Add `n` items to the schedule.
///
/// For `resolved`:
/// - `
/// - `None`: aborted (hash without preimage)
/// - `Some(true)`: hash resolves into call if possible, plain call otherwise
/// - `Some(false)`: plain call
fn fill_schedule<T: Config>(when: T::BlockNumber, n: u32) -> Result<(), &'static str> {
	let t = DispatchTime::At(when);
	let origin: <T as Config>::PalletsOrigin = frame_system::RawOrigin::Root.into();
	for i in 0..n {
		let call = make_call::<T>(None);
		let period = Some(((i + 100).into(), 100));
		let name = u32_to_name(i);
		Scheduler::<T>::do_schedule_named(name, t, period, 0, origin.clone(), call)?;
	}
	ensure!(
		Agenda::<T>::get(when).agenda.len() == n as usize,
		"didn't fill schedule"
	);
	Ok(())
}

/// Generate a name for a scheduled task from an unsigned integer.
fn u32_to_name(i: u32) -> TaskName {
	i.using_encoded(blake2_256)
}

/// A utility for creating simple scheduled tasks.
///
/// # Arguments
/// * `periodic` - makes the task periodic.
/// 	Sets the task's period and repetition count to `100`.
/// * `named` - gives a name to the task: `u32_to_name(0)`.
/// * `signed` - determines the origin of the task.
/// 	If true, it will have the Signed origin. Otherwise it will have the Root origin.
/// 	See [`make_origin`] for details.
/// * maybe_lookup_len - sets optional lookup length. It is used to benchmark task fetching from the `Preimages` store.
/// * priority - the task's priority.
fn make_task<T: Config>(
	periodic: bool,
	named: bool,
	signed: bool,
	maybe_lookup_len: Option<u32>,
	priority: Priority,
) -> ScheduledOf<T> {
	let call = make_call::<T>(maybe_lookup_len);
	let maybe_periodic = match periodic {
		true => Some((100u32.into(), 100)),
		false => None,
	};
	let maybe_id = match named {
		true => Some(u32_to_name(0)),
		false => None,
	};
	let origin = make_origin::<T>(signed);
	Scheduled {
		maybe_id,
		priority,
		call,
		maybe_periodic,
		origin,
		_phantom: PhantomData,
	}
}

/// Creates a `SystemCall::remark` scheduled call with a given `len` in bytes.
/// Returns `None` if the call is too large to encode.
fn bounded<T: Config>(len: u32) -> Option<ScheduledCall<T>> {
	let call = <<T as Config>::RuntimeCall>::from(SystemCall::remark {
		remark: vec![0; len as usize],
	});
	ScheduledCall::new(call).ok()
}

/// Creates a scheduled call and maximizes its size.
///
/// If the `maybe_lookup_len` is not supplied, the task will create the maximal `Inline` scheduled call.
///
/// Otherwise, the function will take the length value from the `maybe_lookup_len`
/// and find a minimal length value that ensures that the scheduled call will require a Preimage lookup.
fn make_call<T: Config>(maybe_lookup_len: Option<u32>) -> ScheduledCall<T> {
	let bound = EncodedCall::bound() as u32;
	let mut len = match maybe_lookup_len {
		Some(len) => {
			len.min(<T::Preimages as PreimageRecipient<T::Hash>>::MaxSize::get() - 2)
				.max(bound) - 3
		}
		None => bound.saturating_sub(4),
	};

	loop {
		let c = match bounded::<T>(len) {
			Some(x) => x,
			None => {
				len -= 1;
				continue;
			}
		};
		if c.lookup_needed() == maybe_lookup_len.is_some() {
			break c;
		}
		if maybe_lookup_len.is_some() {
			len += 1;
		} else {
			if len > 0 {
				len -= 1;
			} else {
				break c;
			}
		}
	}
}

/// Creates an origin for a scheduled call.
///
/// If `signed` is true, it creates the Signed origin from a default account `account("origin", 0, SEED)`.
/// Otherwise, it creates the Root origin.
fn make_origin<T: Config>(signed: bool) -> <T as Config>::PalletsOrigin {
	match signed {
		true => frame_system::RawOrigin::Signed(account("origin", 0, SEED)).into(),
		false => frame_system::RawOrigin::Root.into(),
	}
}

/// Creates a dummy `WeightCounter` with the maximum possible weight limit.
fn dummy_counter() -> WeightCounter {
	WeightCounter {
		used: Weight::zero(),
		limit: Weight::MAX,
	}
}

benchmarks! {
	// `service_agendas` when no work is done.
	// (multiple agendas - scheduled tasks in several blocks)
	service_agendas_base {
		let now = T::BlockNumber::from(BLOCK_NUMBER);
		IncompleteSince::<T>::put(now - One::one());
	}: {
		Scheduler::<T>::service_agendas(&mut dummy_counter(), now, 0);
	} verify {
		assert_eq!(IncompleteSince::<T>::get(), Some(now - One::one()));
	}

	// `service_agenda` when no work is done.
	// (only one agenda - scheduled tasks in a single block)
	service_agenda_base {
		let now = BLOCK_NUMBER.into();
		let s in 0 .. T::MaxScheduledPerBlock::get();
		fill_schedule::<T>(now, s)?;
		let mut executed = 0;
	}: {
		Scheduler::<T>::service_agenda(&mut dummy_counter(), &mut executed, now, now, 0);
	} verify {
		assert_eq!(executed, 0);
	}

	// `service_task` when the task is a non-periodic, non-named, non-fetched call which is not
	// dispatched (e.g. due to being overweight).
	service_task_base {
		let now = BLOCK_NUMBER.into();
		let task = make_task::<T>(false, false, false, None, 0);
		// prevent any tasks from actually being executed as we only want the surrounding weight.
		let mut counter = WeightCounter { used: Weight::zero(), limit: Weight::zero() };
	}: {
		let result = Scheduler::<T>::service_task(&mut counter, now, now, 0, true, task);
	} verify {
		//assert_eq!(result, Ok(()));
	}

	// TODO uncomment if we will use the Preimages
	// // `service_task` when the task is a non-periodic, non-named, fetched call (with a known
	// // preimage length) and which is not dispatched (e.g. due to being overweight).
	// service_task_fetched {
	// 	let s in (EncodedCall::bound() as u32) .. (<T::Preimages as PreimageRecipient<T::Hash>>::MaxSize::get());
	// 	let now = BLOCK_NUMBER.into();
	// 	let task = make_task::<T>(false, false, false, Some(s), 0);
	// 	// prevent any tasks from actually being executed as we only want the surrounding weight.
	// 	let mut counter = WeightCounter { used: Weight::zero(), limit: Weight::zero() };
	// }: {
	// 	let result = Scheduler::<T>::service_task(&mut counter, now, now, 0, true, task);
	// } verify {
	// }

	// `service_task` when the task is a non-periodic, named, non-fetched call which is not
	// dispatched (e.g. due to being overweight).
	service_task_named {
		let now = BLOCK_NUMBER.into();
		let task = make_task::<T>(false, true, false, None, 0);
		// prevent any tasks from actually being executed as we only want the surrounding weight.
		let mut counter = WeightCounter { used: Weight::zero(), limit: Weight::zero() };
	}: {
		let result = Scheduler::<T>::service_task(&mut counter, now, now, 0, true, task);
	} verify {
	}

	// `service_task` when the task is a periodic, non-named, non-fetched call which is not
	// dispatched (e.g. due to being overweight).
	service_task_periodic {
		let now = BLOCK_NUMBER.into();
		let task = make_task::<T>(true, false, false, None, 0);
		// prevent any tasks from actually being executed as we only want the surrounding weight.
		let mut counter = WeightCounter { used: Weight::zero(), limit: Weight::zero() };
	}: {
		let result = Scheduler::<T>::service_task(&mut counter, now, now, 0, true, task);
	} verify {
	}

	// `execute_dispatch` when the origin is `Signed`, not counting the dispatable's weight.
	execute_dispatch_signed {
		let mut counter = WeightCounter { used: Weight::zero(), limit: Weight::MAX };
		let origin = make_origin::<T>(true);
		let call = T::Preimages::realize(&make_call::<T>(None)).unwrap().0;
	}: {
		assert!(Scheduler::<T>::execute_dispatch(&mut counter, origin, call).is_ok());
	}
	verify {
	}

	// `execute_dispatch` when the origin is not `Signed`, not counting the dispatable's weight.
	execute_dispatch_unsigned {
		let mut counter = WeightCounter { used: Weight::zero(), limit: Weight::MAX };
		let origin = make_origin::<T>(false);
		let call = T::Preimages::realize(&make_call::<T>(None)).unwrap().0;
	}: {
		assert!(Scheduler::<T>::execute_dispatch(&mut counter, origin, call).is_ok());
	}
	verify {
	}

	schedule {
		let s in 0 .. (T::MaxScheduledPerBlock::get() - 1);
		let when = BLOCK_NUMBER.into();
		let periodic = Some((T::BlockNumber::one(), 100));
		let priority = Some(0);
		// Essentially a no-op call.
		let call = Box::new(SystemCall::set_storage { items: vec![] }.into());

		fill_schedule::<T>(when, s)?;
	}: _(RawOrigin::Root, when, periodic, priority, call)
	verify {
		ensure!(
			Agenda::<T>::get(when).agenda.len() == (s + 1) as usize,
			"didn't add to schedule"
		);
	}

	cancel {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();

		fill_schedule::<T>(when, s)?;
		assert_eq!(Agenda::<T>::get(when).agenda.len(), s as usize);
	}: _(RawOrigin::Root, when, 0)
	verify {
		ensure!(
			Lookup::<T>::get(u32_to_name(0)).is_none(),
			"didn't remove from lookup"
		);
		// Removed schedule is NONE
		ensure!(
			Agenda::<T>::get(when).agenda[0].is_none(),
			"didn't remove from schedule"
		);
	}

	schedule_named {
		let s in 0 .. (T::MaxScheduledPerBlock::get() - 1);
		let id = u32_to_name(s);
		let when = BLOCK_NUMBER.into();
		let periodic = Some((T::BlockNumber::one(), 100));
		let priority = Some(0);
		// Essentially a no-op call.
		let call = Box::new(SystemCall::set_storage { items: vec![] }.into());

		fill_schedule::<T>(when, s)?;
	}: _(RawOrigin::Root, id, when, periodic, priority, call)
	verify {
		ensure!(
			Agenda::<T>::get(when).agenda.len() == (s + 1) as usize,
			"didn't add to schedule"
		);
	}

	cancel_named {
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();

		fill_schedule::<T>(when, s)?;
	}: _(RawOrigin::Root, u32_to_name(0))
	verify {
		ensure!(
			Lookup::<T>::get(u32_to_name(0)).is_none(),
			"didn't remove from lookup"
		);
		// Removed schedule is NONE
		ensure!(
			Agenda::<T>::get(when).agenda[0].is_none(),
			"didn't remove from schedule"
		);
	}

	change_named_priority {
		let origin: RawOrigin<T::AccountId> = frame_system::RawOrigin::Root;
		let s in 1 .. T::MaxScheduledPerBlock::get();
		let when = BLOCK_NUMBER.into();
		let idx = s - 1;
		let id = u32_to_name(idx);
		let priority = 42;
		fill_schedule::<T>(when, s)?;
	}: _(origin, id, priority)
	verify {
		ensure!(
			Agenda::<T>::get(when).agenda[idx as usize].clone().unwrap().priority == priority,
			"didn't change the priority"
		);
	}

	impl_benchmark_test_suite!(Scheduler, crate::mock::new_test_ext(), crate::mock::Test);
}
