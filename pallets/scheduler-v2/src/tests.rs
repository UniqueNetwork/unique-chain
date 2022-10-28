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

// Copyright (C) 2017-2022 Parity Technologies (UK) Ltd.
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

//! # Scheduler tests.

use super::*;
use crate::mock::{
	logger, new_test_ext, root, run_to_block, LoggerCall, RuntimeCall, Scheduler, Test, *,
};
use frame_support::{
	assert_noop, assert_ok,
	traits::{Contains, OnInitialize}, assert_err,
};

#[test]
fn basic_scheduling_works() {
	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		});
		assert!(!<Test as frame_system::Config>::BaseCallFilter::contains(
			&call
		));
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		run_to_block(3);
		assert!(logger::log().is_empty());
		run_to_block(4);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
		run_to_block(100);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
	});
}

#[test]
fn schedule_after_works() {
	new_test_ext().execute_with(|| {
		run_to_block(2);
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		});
		assert!(!<Test as frame_system::Config>::BaseCallFilter::contains(
			&call
		));
		// This will schedule the call 3 blocks after the next block... so block 3 + 3 = 6
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::After(3),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		run_to_block(5);
		assert!(logger::log().is_empty());
		run_to_block(6);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
		run_to_block(100);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
	});
}

#[test]
fn schedule_after_zero_works() {
	new_test_ext().execute_with(|| {
		run_to_block(2);
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		});
		assert!(!<Test as frame_system::Config>::BaseCallFilter::contains(
			&call
		));
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::After(0),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		// Will trigger on the next block.
		run_to_block(3);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
		run_to_block(100);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
	});
}

#[test]
fn periodic_scheduling_works() {
	new_test_ext().execute_with(|| {
		// at #4, every 3 blocks, 3 times.
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			Some((3, 3)),
			127,
			root(),
			<ScheduledCall<Test>>::new(RuntimeCall::Logger(logger::Call::log {
				i: 42,
				weight: Weight::from_ref_time(10)
			}))
			.unwrap()
		));
		run_to_block(3);
		assert!(logger::log().is_empty());
		run_to_block(4);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
		run_to_block(6);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
		run_to_block(7);
		assert_eq!(logger::log(), vec![(root(), 42u32), (root(), 42u32)]);
		run_to_block(9);
		assert_eq!(logger::log(), vec![(root(), 42u32), (root(), 42u32)]);
		run_to_block(10);
		assert_eq!(
			logger::log(),
			vec![(root(), 42u32), (root(), 42u32), (root(), 42u32)]
		);
		run_to_block(100);
		assert_eq!(
			logger::log(),
			vec![(root(), 42u32), (root(), 42u32), (root(), 42u32)]
		);
	});
}

#[test]
fn cancel_named_scheduling_works_with_normal_cancel() {
	new_test_ext().execute_with(|| {
		// at #4.
		Scheduler::do_schedule_named(
			[1u8; 32],
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(RuntimeCall::Logger(LoggerCall::log {
				i: 69,
				weight: Weight::from_ref_time(10),
			}))
			.unwrap(),
		)
		.unwrap();
		let i = Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(RuntimeCall::Logger(LoggerCall::log {
				i: 42,
				weight: Weight::from_ref_time(10),
			}))
			.unwrap(),
		)
		.unwrap();
		run_to_block(3);
		assert!(logger::log().is_empty());
		assert_ok!(Scheduler::do_cancel_named(None, [1u8; 32]));
		assert_ok!(Scheduler::do_cancel(None, i));
		run_to_block(100);
		assert!(logger::log().is_empty());
	});
}

#[test]
fn cancel_named_periodic_scheduling_works() {
	new_test_ext().execute_with(|| {
		// at #4, every 3 blocks, 3 times.
		Scheduler::do_schedule_named(
			[1u8; 32],
			DispatchTime::At(4),
			Some((3, 3)),
			127,
			root(),
			<ScheduledCall<Test>>::new(RuntimeCall::Logger(LoggerCall::log {
				i: 42,
				weight: Weight::from_ref_time(10),
			}))
			.unwrap(),
		)
		.unwrap();
		// same id results in error.
		assert!(Scheduler::do_schedule_named(
			[1u8; 32],
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(RuntimeCall::Logger(LoggerCall::log {
				i: 69,
				weight: Weight::from_ref_time(10)
			}))
			.unwrap(),
		)
		.is_err());
		// different id is ok.
		Scheduler::do_schedule_named(
			[2u8; 32],
			DispatchTime::At(8),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(RuntimeCall::Logger(LoggerCall::log {
				i: 69,
				weight: Weight::from_ref_time(10),
			}))
			.unwrap(),
		)
		.unwrap();
		run_to_block(3);
		assert!(logger::log().is_empty());
		run_to_block(4);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
		run_to_block(6);
		assert_ok!(Scheduler::do_cancel_named(None, [1u8; 32]));
		run_to_block(100);
		assert_eq!(logger::log(), vec![(root(), 42u32), (root(), 69u32)]);
	});
}

#[test]
fn scheduler_respects_weight_limits() {
	let max_weight: Weight = <Test as Config>::MaximumWeight::get();
	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: max_weight / 3 * 2,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: max_weight / 3 * 2,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		// 69 and 42 do not fit together
		run_to_block(4);
		assert_eq!(logger::log(), vec![(root(), 42u32)]);
		run_to_block(5);
		assert_eq!(logger::log(), vec![(root(), 42u32), (root(), 69u32)]);
	});
}

/// Permanently overweight calls are not deleted but also not executed.
#[test]
fn scheduler_does_not_delete_permanently_overweight_call() {
	let max_weight: Weight = <Test as Config>::MaximumWeight::get();
	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: max_weight,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		// Never executes.
		run_to_block(100);
		assert_eq!(logger::log(), vec![]);

		// Assert the `PermanentlyOverweight` event.
		assert_eq!(
			System::events().last().unwrap().event,
			crate::Event::PermanentlyOverweight {
				task: (4, 0),
				id: None
			}
			.into(),
		);
		// The call is still in the agenda.
		assert!(Agenda::<Test>::get(4).agenda[0].is_some());
	});
}

#[test]
fn scheduler_periodic_tasks_always_find_place() {
	let max_weight: Weight = <Test as Config>::MaximumWeight::get();
	let max_per_block = <Test as Config>::MaxScheduledPerBlock::get();

	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: (max_weight / 3) * 2,
		});
		let call = <ScheduledCall<Test>>::new(call).unwrap();

		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			Some((4, u32::MAX)),
			127,
			root(),
			call.clone(),
		));
		// Executes 5 times till block 20.
		run_to_block(20);
		assert_eq!(logger::log().len(), 5);

		// Block 28 will already be full.
		for _ in 0..max_per_block {
			assert_ok!(Scheduler::do_schedule(
				DispatchTime::At(28),
				None,
				120,
				root(),
				call.clone(),
			));
		}

		run_to_block(24);
		assert_eq!(logger::log().len(), 6);

		// The periodic task should be postponed
		assert_eq!(<Agenda<Test>>::get(29).agenda.len(), 1);

		run_to_block(27); // will call on_initialize(28)
		assert_eq!(logger::log().len(), 6);

		run_to_block(28); // will call on_initialize(29)
		assert_eq!(logger::log().len(), 7);
	});
}

#[test]
fn scheduler_respects_priority_ordering() {
	let max_weight: Weight = <Test as Config>::MaximumWeight::get();
	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: max_weight / 3,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			1,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: max_weight / 3,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			0,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		run_to_block(4);
		assert_eq!(logger::log(), vec![(root(), 69u32), (root(), 42u32)]);
	});
}

#[test]
fn scheduler_respects_priority_ordering_with_soft_deadlines() {
	new_test_ext().execute_with(|| {
		let max_weight: Weight = <Test as Config>::MaximumWeight::get();
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: max_weight / 5 * 2,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			255,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: max_weight / 5 * 2,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 2600,
			weight: max_weight / 5 * 4,
		});
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			126,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));

		// 2600 does not fit with 69 or 42, but has higher priority, so will go through
		run_to_block(4);
		assert_eq!(logger::log(), vec![(root(), 2600u32)]);
		// 69 and 42 fit together
		run_to_block(5);
		assert_eq!(
			logger::log(),
			vec![(root(), 2600u32), (root(), 69u32), (root(), 42u32)]
		);
	});
}

#[test]
fn on_initialize_weight_is_correct() {
	new_test_ext().execute_with(|| {
		let call_weight = Weight::from_ref_time(25);

		// Named
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 3,
			weight: call_weight + Weight::from_ref_time(1),
		});
		assert_ok!(Scheduler::do_schedule_named(
			[1u8; 32],
			DispatchTime::At(3),
			None,
			255,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: call_weight + Weight::from_ref_time(2),
		});
		// Anon Periodic
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(2),
			Some((1000, 3)),
			128,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: call_weight + Weight::from_ref_time(3),
		});
		// Anon
		assert_ok!(Scheduler::do_schedule(
			DispatchTime::At(2),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));
		// Named Periodic
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 2600,
			weight: call_weight + Weight::from_ref_time(4),
		});
		assert_ok!(Scheduler::do_schedule_named(
			[2u8; 32],
			DispatchTime::At(1),
			Some((1000, 3)),
			126,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		));

		// Will include the named periodic only
		assert_eq!(
			Scheduler::on_initialize(1),
			TestWeightInfo::service_agendas_base()
				+ TestWeightInfo::service_agenda_base(1)
				+ <TestWeightInfo as MarginalWeightInfo>::service_task(None, true, true)
				+ TestWeightInfo::execute_dispatch_unsigned()
				+ call_weight + Weight::from_ref_time(4)
		);
		assert_eq!(IncompleteSince::<Test>::get(), None);
		assert_eq!(logger::log(), vec![(root(), 2600u32)]);

		// Will include anon and anon periodic
		assert_eq!(
			Scheduler::on_initialize(2),
			TestWeightInfo::service_agendas_base()
				+ TestWeightInfo::service_agenda_base(2)
				+ <TestWeightInfo as MarginalWeightInfo>::service_task(None, false, true)
				+ TestWeightInfo::execute_dispatch_unsigned()
				+ call_weight + Weight::from_ref_time(3)
				+ <TestWeightInfo as MarginalWeightInfo>::service_task(None, false, false)
				+ TestWeightInfo::execute_dispatch_unsigned()
				+ call_weight + Weight::from_ref_time(2)
		);
		assert_eq!(IncompleteSince::<Test>::get(), None);
		assert_eq!(
			logger::log(),
			vec![(root(), 2600u32), (root(), 69u32), (root(), 42u32)]
		);

		// Will include named only
		assert_eq!(
			Scheduler::on_initialize(3),
			TestWeightInfo::service_agendas_base()
				+ TestWeightInfo::service_agenda_base(1)
				+ <TestWeightInfo as MarginalWeightInfo>::service_task(None, true, false)
				+ TestWeightInfo::execute_dispatch_unsigned()
				+ call_weight + Weight::from_ref_time(1)
		);
		assert_eq!(IncompleteSince::<Test>::get(), None);
		assert_eq!(
			logger::log(),
			vec![
				(root(), 2600u32),
				(root(), 69u32),
				(root(), 42u32),
				(root(), 3u32)
			]
		);

		// Will contain none
		let actual_weight = Scheduler::on_initialize(4);
		assert_eq!(
			actual_weight,
			TestWeightInfo::service_agendas_base() + TestWeightInfo::service_agenda_base(0)
		);
	});
}

#[test]
fn root_calls_works() {
	new_test_ext().execute_with(|| {
		let call = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: Weight::from_ref_time(10),
		}));
		let call2 = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		}));
		assert_ok!(Scheduler::schedule_named(
			RuntimeOrigin::root(),
			[1u8; 32],
			4,
			None,
			Some(127),
			call,
		));
		assert_ok!(Scheduler::schedule(
			RuntimeOrigin::root(),
			4,
			None,
			Some(127),
			call2
		));
		run_to_block(3);
		// Scheduled calls are in the agenda.
		assert_eq!(Agenda::<Test>::get(4).agenda.len(), 2);
		assert!(logger::log().is_empty());
		assert_ok!(Scheduler::cancel_named(RuntimeOrigin::root(), [1u8; 32]));
		assert_ok!(Scheduler::cancel(RuntimeOrigin::root(), 4, 1));
		// Scheduled calls are made NONE, so should not effect state
		run_to_block(100);
		assert!(logger::log().is_empty());
	});
}

#[test]
fn fails_to_schedule_task_in_the_past() {
	new_test_ext().execute_with(|| {
		run_to_block(3);

		let call1 = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: Weight::from_ref_time(10),
		}));
		let call2 = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		}));
		let call3 = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		}));

		assert_noop!(
			Scheduler::schedule_named(RuntimeOrigin::root(), [1u8; 32], 2, None, Some(127), call1),
			Error::<Test>::TargetBlockNumberInPast,
		);

		assert_noop!(
			Scheduler::schedule(RuntimeOrigin::root(), 2, None, Some(127), call2),
			Error::<Test>::TargetBlockNumberInPast,
		);

		assert_noop!(
			Scheduler::schedule(RuntimeOrigin::root(), 3, None, Some(127), call3),
			Error::<Test>::TargetBlockNumberInPast,
		);
	});
}

#[test]
fn should_use_origin() {
	new_test_ext().execute_with(|| {
		let call = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: Weight::from_ref_time(10),
		}));
		let call2 = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		}));
		assert_ok!(Scheduler::schedule_named(
			system::RawOrigin::Signed(1).into(),
			[1u8; 32],
			4,
			None,
			None,
			call,
		));
		assert_ok!(Scheduler::schedule(
			system::RawOrigin::Signed(1).into(),
			4,
			None,
			None,
			call2,
		));
		run_to_block(3);
		// Scheduled calls are in the agenda.
		assert_eq!(Agenda::<Test>::get(4).agenda.len(), 2);
		assert!(logger::log().is_empty());
		assert_ok!(Scheduler::cancel_named(
			system::RawOrigin::Signed(1).into(),
			[1u8; 32]
		));
		assert_ok!(Scheduler::cancel(system::RawOrigin::Signed(1).into(), 4, 1));
		// Scheduled calls are made NONE, so should not effect state
		run_to_block(100);
		assert!(logger::log().is_empty());
	});
}

#[test]
fn should_check_origin() {
	new_test_ext().execute_with(|| {
		let call = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 69,
			weight: Weight::from_ref_time(10),
		}));
		let call2 = Box::new(RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		}));
		assert_noop!(
			Scheduler::schedule_named(
				system::RawOrigin::Signed(2).into(),
				[1u8; 32],
				4,
				None,
				None,
				call
			),
			BadOrigin
		);
		assert_noop!(
			Scheduler::schedule(system::RawOrigin::Signed(2).into(), 4, None, None, call2),
			BadOrigin
		);
	});
}

#[test]
fn should_check_origin_for_cancel() {
	new_test_ext().execute_with(|| {
		let call = Box::new(RuntimeCall::Logger(LoggerCall::log_without_filter {
			i: 69,
			weight: Weight::from_ref_time(10),
		}));
		let call2 = Box::new(RuntimeCall::Logger(LoggerCall::log_without_filter {
			i: 42,
			weight: Weight::from_ref_time(10),
		}));
		assert_ok!(Scheduler::schedule_named(
			system::RawOrigin::Signed(1).into(),
			[1u8; 32],
			4,
			None,
			None,
			call,
		));
		assert_ok!(Scheduler::schedule(
			system::RawOrigin::Signed(1).into(),
			4,
			None,
			None,
			call2,
		));
		run_to_block(3);
		// Scheduled calls are in the agenda.
		assert_eq!(Agenda::<Test>::get(4).agenda.len(), 2);
		assert!(logger::log().is_empty());
		assert_noop!(
			Scheduler::cancel_named(system::RawOrigin::Signed(2).into(), [1u8; 32]),
			BadOrigin
		);
		assert_noop!(
			Scheduler::cancel(system::RawOrigin::Signed(2).into(), 4, 1),
			BadOrigin
		);
		assert_noop!(
			Scheduler::cancel_named(system::RawOrigin::Root.into(), [1u8; 32]),
			BadOrigin
		);
		assert_noop!(
			Scheduler::cancel(system::RawOrigin::Root.into(), 4, 1),
			BadOrigin
		);
		run_to_block(5);
		assert_eq!(
			logger::log(),
			vec![
				(system::RawOrigin::Signed(1).into(), 69u32),
				(system::RawOrigin::Signed(1).into(), 42u32)
			]
		);
	});
}

/// Cancelling a call and then scheduling a second call for the same
/// block results in different addresses.
#[test]
fn schedule_does_not_resuse_addr() {
	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		});

		// Schedule both calls.
		let addr_1 = Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call.clone()).unwrap(),
		)
		.unwrap();
		// Cancel the call.
		assert_ok!(Scheduler::do_cancel(None, addr_1));
		let addr_2 = Scheduler::do_schedule(
			DispatchTime::At(4),
			None,
			127,
			root(),
			<ScheduledCall<Test>>::new(call).unwrap(),
		)
		.unwrap();

		// Should not re-use the address.
		assert!(addr_1 != addr_2);
	});
}

#[test]
fn schedule_agenda_overflows() {
	let max: u32 = <Test as Config>::MaxScheduledPerBlock::get();

	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		});
		let call = <ScheduledCall<Test>>::new(call).unwrap();

		// Schedule the maximal number allowed per block.
		for _ in 0..max {
			Scheduler::do_schedule(DispatchTime::At(4), None, 127, root(), call.clone()).unwrap();
		}

		// One more time and it errors.
		assert_noop!(
			Scheduler::do_schedule(DispatchTime::At(4), None, 127, root(), call,),
			<Error<Test>>::AgendaIsExhausted,
		);

		run_to_block(4);
		// All scheduled calls are executed.
		assert_eq!(logger::log().len() as u32, max);
	});
}

/// Cancelling and scheduling does not overflow the agenda but fills holes.
#[test]
fn cancel_and_schedule_fills_holes() {
	let max: u32 = <Test as Config>::MaxScheduledPerBlock::get();
	assert!(
		max > 3,
		"This test only makes sense for MaxScheduledPerBlock > 3"
	);

	new_test_ext().execute_with(|| {
		let call = RuntimeCall::Logger(LoggerCall::log {
			i: 42,
			weight: Weight::from_ref_time(10),
		});
		let call = <ScheduledCall<Test>>::new(call).unwrap();
		let mut addrs = Vec::<_>::default();

		// Schedule the maximal number allowed per block.
		for _ in 0..max {
			addrs.push(
				Scheduler::do_schedule(DispatchTime::At(4), None, 127, root(), call.clone())
					.unwrap(),
			);
		}
		// Cancel three of them.
		for addr in addrs.into_iter().take(3) {
			Scheduler::do_cancel(None, addr).unwrap();
		}
		// Schedule three new ones.
		for i in 0..3 {
			let (_block, index) =
				Scheduler::do_schedule(DispatchTime::At(4), None, 127, root(), call.clone())
					.unwrap();
			assert_eq!(i, index);
		}

		run_to_block(4);
		// Maximum number of calls are executed.
		assert_eq!(logger::log().len() as u32, max);
	});
}

#[test]
fn cannot_schedule_too_big_tasks() {
	new_test_ext().execute_with(|| {
		let call = Box::new(<<Test as Config>::RuntimeCall>::from(SystemCall::remark {
			remark: vec![0; EncodedCall::bound() - 4],
		}));

		assert_ok!(Scheduler::schedule(RuntimeOrigin::root(), 4, None, Some(127), call));

		let call = Box::new(<<Test as Config>::RuntimeCall>::from(SystemCall::remark {
			remark: vec![0; EncodedCall::bound() - 3],
		}));

		assert_err!(Scheduler::schedule(RuntimeOrigin::root(), 4, None, Some(127), call), <Error<Test>>::TooBigScheduledCall);
	});
}
