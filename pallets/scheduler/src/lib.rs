// This file is part of Substrate.

// Copyright (C) 2017-2021 Parity Technologies (UK) Ltd.
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

//! # Scheduler
//! A module for scheduling dispatches.
//!
//! - [`Config`]
//! - [`Call`]
//! - [`Module`]
//!
//! ## Overview
//!
//! This module exposes capabilities for scheduling dispatches to occur at a
//! specified block number or at a specified period. These scheduled dispatches
//! may be named or anonymous and may be canceled.
//!
//! **NOTE:** The scheduled calls will be dispatched with the default filter
//! for the origin: namely `frame_system::Config::BaseCallFilter` for all origin
//! except root which will get no filter. And not the filter contained in origin
//! use to call `fn schedule`.
//!
//! If a call is scheduled using proxy or whatever mecanism which adds filter,
//! then those filter will not be used when dispatching the schedule call.
//!
//! ## Interface
//!
//! ### Dispatchable Functions
//!
//! * `schedule` - schedule a dispatch, which may be periodic, to occur at a
//!   specified block and with a specified priority.
//! * `cancel` - cancel a scheduled dispatch, specified by block number and
//!   index.
//! * `schedule_named` - augments the `schedule` interface with an additional
//!   `Vec<u8>` parameter that can be used for identification.
//! * `cancel_named` - the named complement to the cancel function.

// Ensure we're `no_std` when compiling for Wasm.
#![cfg_attr(not(feature = "std"), no_std)]
#![allow(clippy::type_complexity, clippy::boxed_local, clippy::unused_unit)]

mod benchmarking;
pub mod weights;

use sp_std::{prelude::*, marker::PhantomData, borrow::Borrow, cmp};
use codec::{Encode, Decode, Codec};
use sp_runtime::{
	RuntimeDebug,
	traits::{Zero, One, BadOrigin, Saturating},
	transaction_validity::TransactionValidityError,
	DispatchErrorWithPostInfo,
};
use frame_support::{
	decl_module, decl_storage, decl_event, decl_error,
	dispatch::{Dispatchable, DispatchError, DispatchResult, Parameter},
	traits::{
		Get,
		schedule::{self, DispatchTime},
		OriginTrait, EnsureOrigin, IsType,
	},
	weights::{GetDispatchInfo, Weight, PostDispatchInfo},
};
use frame_system::{self as system, ensure_signed};
pub use weights::WeightInfo;
use up_sponsorship::SponsorshipHandler;
use scale_info::TypeInfo;
use sp_core::H160;

/// Our pallet's configuration trait. All our types and constants go in here. If the
/// pallet is dependent on specific other pallets, then their configuration traits
/// should be added to our implied traits list.
///
/// `system::Config` should always be included in our implied traits.
/// //
pub trait Config: system::Config {
	/// The overarching event type.
	type Event: From<Event<Self>> + Into<<Self as system::Config>::Event>;

	/// The aggregated origin which the dispatch will take.
	type Origin: OriginTrait<PalletsOrigin = Self::PalletsOrigin>
		+ From<Self::PalletsOrigin>
		+ IsType<<Self as system::Config>::Origin>;

	/// The caller origin, overarching type of all pallets origins.
	type PalletsOrigin: From<system::RawOrigin<Self::AccountId>> + Codec + TypeInfo + Clone + Eq;

	/// The aggregated call type.
	type Call: Parameter
		+ Dispatchable<Origin = <Self as Config>::Origin>
		+ GetDispatchInfo
		+ From<system::Call<Self>>;

	/// The maximum weight that may be scheduled per block for any dispatchables of less priority
	/// than `schedule::HARD_DEADLINE`.
	type MaximumWeight: Get<Weight>;

	/// Required origin to schedule or cancel calls.
	type ScheduleOrigin: EnsureOrigin<<Self as system::Config>::Origin>;

	/// The maximum number of scheduled calls in the queue for a single block.
	/// Not strictly enforced, but used for weight estimation.
	type MaxScheduledPerBlock: Get<u32>;

	/// Sponsoring function.
	type SponsorshipHandler: SponsorshipHandler<Self::AccountId, <Self as Config>::Call>;

	/// Weight information for extrinsics in this pallet.
	type WeightInfo: WeightInfo;

	/// The helper type used for custom transaction fee logic.
	type CallExecutor: DispatchCall<Self, H160>;
}

/// A Scheduler-Runtime interface for finer payment handling.
pub trait DispatchCall<T: frame_system::Config + Config, SelfContainedSignedInfo> {
	/// The type that encodes information that can be passed from pre_dispatch to post-dispatch.
	type Pre: Default + Codec + Clone + TypeInfo;

	/// Resolve the call dispatch, including any post-dispatch operations.
	fn dispatch_call(
		pre_dispatch: Self::Pre,
		function: <T as Config>::Call,
	) -> Result<
		Result<PostDispatchInfo, DispatchErrorWithPostInfo<PostDispatchInfo>>,
		TransactionValidityError,
	>;

	/// Prepare for the scheduled call (e.g. by withdrawing the fee in advance).
	fn pre_dispatch(
		signer: T::AccountId,
		function: <T as Config>::Call,
	) -> Result<Self::Pre, TransactionValidityError>;

	/// Perform a clean-up after a cancelled call (e.g. by returning the remaining fee).
	fn cancel_dispatch(pre_dispatch: Self::Pre) -> Result<(), TransactionValidityError>;
}

pub const MAX_TASK_ID_LENGTH_IN_BYTES: u8 = 16;

pub const PERIODIC_CALLS_LIMIT: u32 = 100;

// pub type SelfWeightInfo<T> = <T as system::Config>::WeightInfo;

/// Just a simple index for naming period tasks.
pub type PeriodicIndex = u32;
/// The location of a scheduled task that can be used to remove it.
pub type TaskAddress<BlockNumber> = (BlockNumber, u32);

/*#[cfg_attr(any(feature = "std", test), derive(PartialEq, Eq))] todo remove completely?
#[derive(Clone, RuntimeDebug, Encode, Decode)]
struct ScheduledV1<Call, BlockNumber> {
	maybe_id: Option<Vec<u8>>,
	priority: schedule::Priority,
	call: Call,
	maybe_periodic: Option<schedule::Period<BlockNumber>>,
}*/

/// Information regarding an item to be executed in the future.
#[cfg_attr(any(feature = "std", test), derive(PartialEq, Eq))]
#[derive(Clone, RuntimeDebug, Encode, Decode, TypeInfo)]
pub struct Scheduled<Call, BlockNumber, PalletsOrigin, AccountId, PreDispatch> {
	/// The unique identity for this task, if there is one.
	maybe_id: Option<Vec<u8>>,
	/// This task's priority.
	priority: schedule::Priority,
	/// The call to be dispatched.
	call: Call,
	/// If the call is periodic, then this points to the information concerning that.
	maybe_periodic: Option<schedule::Period<BlockNumber>>,
	/// The origin to dispatch the call.
	origin: PalletsOrigin,
	/// The information regarding the call's preparation for dispatch, in particular the fee, to be sent to post-dispatch.
	pre_dispatch: PreDispatch,
	_phantom: PhantomData<AccountId>,
}

/// The current version of Scheduled struct.
/*pub type Scheduled<Call, BlockNumber, PalletsOrigin, AccountId, PreDispatch> =
	ScheduledV2<Call, BlockNumber, PalletsOrigin, AccountId, PreDispatch>;*/

// A value placed in storage that represents the current version of the Scheduler storage.
// This value is used by the `on_runtime_upgrade` logic to determine whether we run
// storage migration logic.
/*#[derive(Encode, Decode, Clone, Copy, PartialEq, Eq, RuntimeDebug, TypeInfo)] todo remove completely?
enum Releases {
	V1,
	V2,
}

impl Default for Releases {
	fn default() -> Self {
		Releases::V1
	}
}*/

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo)]
pub struct CallSpec {
	module: u32,
	method: u32,
}

decl_storage! {
	trait Store for Module<T: Config> as Scheduler {
		/// Items to be executed, indexed by the block number that they should be executed on.
		pub Agenda: map hasher(twox_64_concat) T::BlockNumber
			=> Vec<Option<Scheduled<
				<T as Config>::Call,
				T::BlockNumber,
				T::PalletsOrigin,
				T::AccountId,
				<<T as Config>::CallExecutor as DispatchCall<T, H160>>::Pre
			>>>;

		/*pub SpecAgenda: map hasher(twox_64_concat) T::BlockNumber todo remove completely?
			=> Vec<Option<CallSpec>>;*/

		/// Lookup from identity to the block number and index of the task.
		Lookup: map hasher(twox_64_concat) Vec<u8> => Option<TaskAddress<T::BlockNumber>>;

		// / Storage version of the pallet.
		// /
		// / New networks start with last version.
		//StorageVersion build(|_| Releases::V2): Releases; todo remove completely?
	}
}

decl_event!(
	pub enum Event<T> where <T as system::Config>::BlockNumber {
		/// Scheduled some task. \[when, index\]
		Scheduled(BlockNumber, u32),
		/// Canceled some task. \[when, index\]
		Canceled(BlockNumber, u32),
		/// Dispatched some task. \[task, id, result\]
		Dispatched(TaskAddress<BlockNumber>, Option<Vec<u8>>, DispatchResult),
	}
);

decl_error! {
	pub enum Error for Module<T: Config> {
		/// Failed to schedule a call
		FailedToSchedule,
		/// Cannot find the scheduled call.
		NotFound,
		/// Given target block number is in the past.
		TargetBlockNumberInPast,
		/// Reschedule failed because it does not change scheduled time.
		RescheduleNoChange,
	}
}

decl_module! {
	/// Scheduler module declaration.
	pub struct Module<T: Config> for enum Call
	where
		origin: <T as system::Config>::Origin
	{
		type Error = Error<T>;
		fn deposit_event() = default;

		/// Anonymously schedule a task.
		///
		/// # <weight>
		/// - S = Number of already scheduled calls
		/// - Base Weight: 22.29 + .126 * S µs
		/// - DB Weight:
		///     - Read: Agenda
		///     - Write: Agenda
		/// - Will use base weight of 25 which should be good for up to 30 scheduled calls
		/// # </weight>
		#[weight = <T as Config>::WeightInfo::schedule(T::MaxScheduledPerBlock::get())]
		fn schedule(origin,
			when: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: schedule::Priority,
			call: Box<<T as Config>::Call>,
		)
		{
			let origin = <T as Config>::Origin::from(origin);
			Self::do_schedule_nameless(DispatchTime::At(when), maybe_periodic, priority, origin.caller().clone(), *call)?;
		}

		/// Cancel an anonymously scheduled task.
		///
		/// # <weight>
		/// - S = Number of already scheduled calls
		/// - Base Weight: 22.15 + 2.869 * S µs
		/// - DB Weight:
		///     - Read: Agenda
		///     - Write: Agenda, Lookup
		/// - Will use base weight of 100 which should be good for up to 30 scheduled calls
		/// # </weight>
		#[weight = <T as Config>::WeightInfo::cancel(T::MaxScheduledPerBlock::get())]
		fn cancel(origin, when: T::BlockNumber, index: u32) {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_cancel(Some(origin.caller().clone()), (when, index))?;
		}

		/// Schedule a named task.
		///
		/// # <weight>
		/// - S = Number of already scheduled calls
		/// - Base Weight: 29.6 + .159 * S µs
		/// - DB Weight:
		///     - Read: Agenda, Lookup
		///     - Write: Agenda, Lookup
		/// - Will use base weight of 35 which should be good for more than 30 scheduled calls
		/// # </weight>
		#[weight = <T as Config>::WeightInfo::schedule_named(T::MaxScheduledPerBlock::get())]
		fn schedule_named(origin,
			id: Vec<u8>,
			when: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: schedule::Priority,
			call: Box<<T as Config>::Call>,
		) {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_schedule_named(
				id, DispatchTime::At(when), maybe_periodic, priority, origin.caller().clone(), *call
			)?;
		}

		/// Cancel a named scheduled task.
		///
		/// # <weight>
		/// - S = Number of already scheduled calls
		/// - Base Weight: 24.91 + 2.907 * S µs
		/// - DB Weight:
		///     - Read: Agenda, Lookup
		///     - Write: Agenda, Lookup
		/// - Will use base weight of 100 which should be good for up to 30 scheduled calls
		/// # </weight>
		#[weight = <T as Config>::WeightInfo::cancel_named(T::MaxScheduledPerBlock::get())]
		fn cancel_named(origin, id: Vec<u8>) {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_cancel_named(Some(origin.caller().clone()), id)?;
		}

		/// Anonymously schedule a task after a delay.
		///
		/// # <weight>
		/// Same as [`schedule`].
		/// # </weight>
		#[weight = <T as Config>::WeightInfo::schedule(T::MaxScheduledPerBlock::get())]
		fn schedule_after(origin,
			after: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: schedule::Priority,
			call: Box<<T as Config>::Call>,
		) {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_schedule_nameless(
				DispatchTime::After(after), maybe_periodic, priority, origin.caller().clone(), *call
			)?;
		}

		/// Schedule a named task after a delay.
		///
		/// # <weight>
		/// Same as [`schedule_named`].
		/// # </weight>
		#[weight = <T as Config>::WeightInfo::schedule_named(T::MaxScheduledPerBlock::get())]
		fn schedule_named_after(origin,
			id: Vec<u8>,
			after: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: schedule::Priority,
			call: Box<<T as Config>::Call>,
		) {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_schedule_named(
				id, DispatchTime::After(after), maybe_periodic, priority, origin.caller().clone(), *call
			)?;
		}

		/// Execute the scheduled calls
		///
		/// # <weight>
		/// - S = Number of already scheduled calls
		/// - N = Named scheduled calls
		/// - P = Periodic Calls
		/// - Base Weight: 9.243 + 23.45 * S µs
		/// - DB Weight:
		///     - Read: Agenda + Lookup * N + Agenda(Future) * P
		///     - Write: Agenda + Lookup * N  + Agenda(future) * P
		/// # </weight>
		fn on_initialize(now: T::BlockNumber) -> Weight {
			let limit = T::MaximumWeight::get();
			let mut queued = Agenda::<T>::take(now)
				.into_iter()
				.enumerate()
				.filter_map(|(index, s)| s.map(|inner| (index as u32, inner)))
				.collect::<Vec<_>>();
			if queued.len() as u32 > T::MaxScheduledPerBlock::get() {
				log::warn!(
					target: "runtime::scheduler",
					"Warning: This block has more items queued in Scheduler than \
					expected from the runtime configuration. An update might be needed."
				);
			}
			queued.sort_by_key(|(_, s)| s.priority);
			let base_weight: Weight = T::DbWeight::get().reads_writes(1, 2); // Agenda + Agenda(next)
			let mut total_weight: Weight = 0; // T::WeightInfo::on_initialize(0)
			queued.into_iter()
				.enumerate()
				.scan(base_weight, |cumulative_weight, (order, (index, s))| {
					*cumulative_weight = cumulative_weight
						.saturating_add(s.call.get_dispatch_info().weight);

					let origin = <<T as Config>::Origin as From<T::PalletsOrigin>>::from(
						s.origin.clone()
					).into();

					if ensure_signed(origin).is_ok() {
						 // AccountData for inner call origin accountdata.
						*cumulative_weight = cumulative_weight
							.saturating_add(T::DbWeight::get().reads_writes(1, 1));
					}

					if s.maybe_id.is_some() {
						// Remove/Modify Lookup
						*cumulative_weight = cumulative_weight.saturating_add(T::DbWeight::get().writes(1));
					}
					if s.maybe_periodic.is_some() {
						// Read/Write Agenda for future block
						*cumulative_weight = cumulative_weight.saturating_add(T::DbWeight::get().reads_writes(1, 1));
					}

					Some((order, index, *cumulative_weight, s))
				})
				.filter_map(|(order, index, cumulative_weight, mut s)| {
					// We allow a scheduled call if:
					// - It's priority is `HARD_DEADLINE`
					// - It does not push the weight past the limit
					// or, alternatively,
					// - It is the first item in the schedule
					if s.priority <= schedule::HARD_DEADLINE && cumulative_weight <= limit || order == 0 {
						let r = T::CallExecutor::dispatch_call(s.pre_dispatch.clone(), s.call.clone());

						if let Err(_) = r {
							log::warn!(
								target: "runtime::scheduler",
								"Warning: Scheduler has failed to execute a post-dispatch transaction. \
								This block might have become invalid.",
							);
							// todo possibly force a skip/return here, do something with the error
						}

						let r = r.unwrap(); // todo dangerous! but it shouldn't come to that, and if it does, the error is critical, is it safe to panic?

						let maybe_id = s.maybe_id.clone();
						if let Some((period, count)) = s.maybe_periodic {
							if count > 1 {
								s.maybe_periodic = Some((period, count - 1));
							} else {
								s.maybe_periodic = None;
							}
							let next = now + period;
							// If scheduled is named, place it's information in `Lookup`
							if let Some(ref id) = s.maybe_id {
								let next_index = Agenda::<T>::decode_len(now + period).unwrap_or(0);
								Lookup::<T>::insert(id, (next, next_index as u32));
							}
							Agenda::<T>::append(next, Some(s));
						} else if let Some(ref id) = s.maybe_id {
									  Lookup::<T>::remove(id);
								  }
						Self::deposit_event(RawEvent::Dispatched(
							(now, index),
							maybe_id,
							r.map(|_| ()).map_err(|e| e.error)
						));
						total_weight = cumulative_weight;
						None
					} else {
						Some(Some(s))
					}
				})
				.for_each(|unused| {
					let next = now + One::one();
					Agenda::<T>::append(next, unused);
				});

			total_weight
		}
	}
}

impl<T: Config> Module<T> {
	fn resolve_time(when: DispatchTime<T::BlockNumber>) -> Result<T::BlockNumber, DispatchError> {
		let now = frame_system::Pallet::<T>::block_number();

		let when = match when {
			DispatchTime::At(x) => x,
			// The current block has already completed it's scheduled tasks, so
			// Schedule the task at lest one block after this current block.
			DispatchTime::After(x) => now.saturating_add(x).saturating_add(One::one()),
		};

		if when <= now {
			return Err(Error::<T>::TargetBlockNumberInPast.into());
		}

		Ok(when)
	}

	fn do_schedule(
		maybe_id: Option<Vec<u8>>,
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: <T as Config>::Call,
	) -> Result<(T::BlockNumber, u32), DispatchError> {
		let when = Self::resolve_time(when)?;

		let sender = ensure_signed(
			<<T as Config>::Origin as From<T::PalletsOrigin>>::from(origin.clone()).into(),
		)
		.unwrap_or_default(); // todo sponsoring doesn't work with the line below -- found sponsoring is already checked for in transaction_payment
					  //let who_will_pay = T::SponsorshipHandler::get_sponsor(&sender, &call).unwrap_or(sender);
					  //let sponsor = T::PalletsOrigin::from(system::RawOrigin::Signed(who_will_pay.clone()));
					  //let r = call.clone().dispatch(sponsor.into());

		let pre_dispatch = match T::CallExecutor::pre_dispatch(sender.clone(), call.clone()) {
			Ok(pre_dispatch) => pre_dispatch,
			Err(_) => return Err(Error::<T>::FailedToSchedule.into()),
		};

		// todo continually pre-dispatch according to maybe_periodic -- but it's called only once?
		// no, reschedule and cancel rely on scheduled being only the next instance
		// actually can count with OnChargePayment, so no need to run around. expand Pre with unspent_total_fee and single_fee, deduct single_fee

		// sanitize maybe_periodic
		let maybe_periodic = maybe_periodic
			.filter(|p| p.1 > 1 && !p.0.is_zero())
			// Limit the repetitions to 100 calls and remove one from the number of repetitions since we will schedule one now.
			.map(|(p, c)| (p, cmp::min(c, PERIODIC_CALLS_LIMIT) - 1));

		if let Some(periodic) = maybe_periodic {
			for _i in 0..=periodic.1 {
				// displace to runtime and count the total required fee, then deduct. find a way to use OnChargePayment
				// send constants and priority to runtime for fee computation, too. should create constants here or just declare them in runtime?
				// roadblock - they will return on post_dispatch -- oh! tips?
			}
		}

		let s = Some(Scheduled {
			maybe_id,
			priority,
			call,
			maybe_periodic,
			origin,
			pre_dispatch,
			_phantom: PhantomData::<T::AccountId>::default(),
		});
		Agenda::<T>::append(when, s);
		let index = Agenda::<T>::decode_len(when).unwrap_or(1) as u32 - 1;
		if index > T::MaxScheduledPerBlock::get() {
			log::warn!(
				target: "runtime::scheduler",
				"Warning: There are more items queued in the Scheduler than \
				expected from the runtime configuration. An update might be needed.",
			);
		}

		Ok((when, index))
	}

	fn do_schedule_nameless(
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: <T as Config>::Call,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		let address = Self::do_schedule(None, when, maybe_periodic, priority, origin, call)?;
		let (when, index) = address;

		Self::deposit_event(RawEvent::Scheduled(when, index));

		Ok(address)
	}

	fn do_cancel(
		origin: Option<T::PalletsOrigin>,
		(when, index): TaskAddress<T::BlockNumber>,
	) -> Result<(), DispatchError> {
		let scheduled = Agenda::<T>::try_mutate(when, |agenda| {
			agenda.get_mut(index as usize).map_or(
				Ok(None),
				|s| -> Result<Option<Scheduled<_, _, _, _, _>>, DispatchError> {
					if let (Some(ref o), Some(ref s)) = (origin, s.borrow()) {
						if *o != s.origin {
							return Err(BadOrigin.into());
						}
					};
					Ok(s.take())
				},
			)
		})?;
		if let Some(s) = scheduled {
			if let Some(id) = s.maybe_id {
				Lookup::<T>::remove(id);
			}
			if let Err(_) = T::CallExecutor::cancel_dispatch(s.pre_dispatch.clone()) {
				log::warn!(
					target: "runtime::scheduler",
					"Warning: Scheduler has failed to execute a post-dispatch transaction. \
					This block might have become invalid.",
				);
			} // maybe do something with the error?
			Self::deposit_event(RawEvent::Canceled(when, index));
			Ok(())
		} else {
			Err(Error::<T>::NotFound.into())
		}
	}

	fn do_reschedule(
		(when, index): TaskAddress<T::BlockNumber>,
		new_time: DispatchTime<T::BlockNumber>,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		let new_time = Self::resolve_time(new_time)?;

		if new_time == when {
			return Err(Error::<T>::RescheduleNoChange.into());
		}

		Agenda::<T>::try_mutate(when, |agenda| -> DispatchResult {
			let task = agenda.get_mut(index as usize).ok_or(Error::<T>::NotFound)?;
			let task = task.take().ok_or(Error::<T>::NotFound)?;
			Agenda::<T>::append(new_time, Some(task));
			Ok(())
		})?;

		let new_index = Agenda::<T>::decode_len(new_time).unwrap_or(1) as u32 - 1;
		Self::deposit_event(RawEvent::Canceled(when, index));
		Self::deposit_event(RawEvent::Scheduled(new_time, new_index));

		Ok((new_time, new_index))
	}

	fn do_schedule_named(
		id: Vec<u8>,
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: <T as Config>::Call,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		// ensure id length does not exceed expectations & is unique
		if id.len() > MAX_TASK_ID_LENGTH_IN_BYTES.try_into().unwrap()
			|| Lookup::<T>::contains_key(&id)
		{
			return Err(Error::<T>::FailedToSchedule.into());
		}

		let address = Self::do_schedule(
			Some(id.clone()),
			when,
			maybe_periodic,
			priority,
			origin,
			call,
		)?;
		let (when, index) = address;

		Lookup::<T>::insert(&id, &address);
		Self::deposit_event(RawEvent::Scheduled(when, index));
		Ok(address)
	}

	fn do_cancel_named(origin: Option<T::PalletsOrigin>, id: Vec<u8>) -> DispatchResult {
		Lookup::<T>::try_mutate_exists(id, |lookup| -> DispatchResult {
			if let Some((when, index)) = lookup.take() {
				let i = index as usize;
				Agenda::<T>::try_mutate(when, |agenda| -> DispatchResult {
					if let Some(s) = agenda.get_mut(i) {
						if let (Some(ref o), Some(ref s)) = (origin, s.borrow()) {
							if *o != s.origin {
								return Err(BadOrigin.into());
							}
							if let Err(_) = T::CallExecutor::cancel_dispatch(s.pre_dispatch.clone())
							{
								log::warn!(
									target: "runtime::scheduler",
									"Warning: Scheduler has failed to execute a post-dispatch transaction. \
									This block might have become invalid.",
								);
							} // maybe do something with the error?
						}
						*s = None;
					}
					Ok(())
				})?;
				Self::deposit_event(RawEvent::Canceled(when, index));
				Ok(())
			} else {
				Err(Error::<T>::NotFound.into())
			}
		})
	}

	fn do_reschedule_named(
		id: Vec<u8>,
		new_time: DispatchTime<T::BlockNumber>,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		let new_time = Self::resolve_time(new_time)?;

		Lookup::<T>::try_mutate_exists(
			id,
			|lookup| -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
				let (when, index) = lookup.ok_or(Error::<T>::NotFound)?;

				if new_time == when {
					return Err(Error::<T>::RescheduleNoChange.into());
				}

				Agenda::<T>::try_mutate(when, |agenda| -> DispatchResult {
					let task = agenda.get_mut(index as usize).ok_or(Error::<T>::NotFound)?;
					let task = task.take().ok_or(Error::<T>::NotFound)?;
					Agenda::<T>::append(new_time, Some(task));

					Ok(())
				})?;

				let new_index = Agenda::<T>::decode_len(new_time).unwrap_or(1) as u32 - 1;
				Self::deposit_event(RawEvent::Canceled(when, index));
				Self::deposit_event(RawEvent::Scheduled(new_time, new_index));

				*lookup = Some((new_time, new_index));

				Ok((new_time, new_index))
			},
		)
	}
}

impl<T: Config> schedule::Anon<T::BlockNumber, <T as Config>::Call, T::PalletsOrigin>
	for Module<T>
{
	type Address = TaskAddress<T::BlockNumber>;

	fn schedule(
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: <T as Config>::Call,
	) -> Result<Self::Address, DispatchError> {
		Self::do_schedule_nameless(when, maybe_periodic, priority, origin, call)
	}

	fn cancel((when, index): Self::Address) -> Result<(), ()> {
		Self::do_cancel(None, (when, index)).map_err(|_| ())
	}

	fn reschedule(
		address: Self::Address,
		when: DispatchTime<T::BlockNumber>,
	) -> Result<Self::Address, DispatchError> {
		Self::do_reschedule(address, when)
	}

	fn next_dispatch_time((when, index): Self::Address) -> Result<T::BlockNumber, ()> {
		Agenda::<T>::get(when)
			.get(index as usize)
			.ok_or(())
			.map(|_| when)
	}
}

impl<T: Config> schedule::Named<T::BlockNumber, <T as Config>::Call, T::PalletsOrigin>
	for Module<T>
{
	type Address = TaskAddress<T::BlockNumber>;

	fn schedule_named(
		id: Vec<u8>,
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: <T as Config>::Call,
	) -> Result<Self::Address, ()> {
		Self::do_schedule_named(id, when, maybe_periodic, priority, origin, call).map_err(|_| ())
	}

	fn cancel_named(id: Vec<u8>) -> Result<(), ()> {
		Self::do_cancel_named(None, id).map_err(|_| ())
	}

	fn reschedule_named(
		id: Vec<u8>,
		when: DispatchTime<T::BlockNumber>,
	) -> Result<Self::Address, DispatchError> {
		Self::do_reschedule_named(id, when)
	}

	fn next_dispatch_time(id: Vec<u8>) -> Result<T::BlockNumber, ()> {
		Lookup::<T>::get(id)
			.and_then(|(when, index)| Agenda::<T>::get(when).get(index as usize).map(|_| when))
			.ok_or(())
	}
}

#[cfg(test)]
#[allow(clippy::from_over_into)]
mod tests {
	use super::*;

	use frame_support::{
		ord_parameter_types, parameter_types, traits::Contains, weights::constants::RocksDbWeight,
	};
	use sp_core::H256;
	use sp_runtime::{
		Perbill,
		testing::Header,
		traits::{BlakeTwo256, IdentityLookup},
	};
	use frame_system::{EnsureOneOf, EnsureRoot, EnsureSignedBy};
	use crate as scheduler;

	mod logger {
		use super::*;
		use std::cell::RefCell;

		thread_local! {
			static LOG: RefCell<Vec<(OriginCaller, u32)>> = RefCell::new(Vec::new());
		}
		pub trait Config: system::Config {
			type Event: From<Event> + Into<<Self as system::Config>::Event>;
		}
		decl_event! {
			pub enum Event {
				Logged(u32, Weight),
			}
		}
		decl_module! {
			pub struct Module<T: Config> for enum Call
			where
				origin: <T as system::Config>::Origin,
					<T as system::Config>::Origin: OriginTrait<PalletsOrigin = OriginCaller>
			{
				fn deposit_event() = default;

				#[weight = *weight]
				fn log(origin, i: u32, weight: Weight) {
					Self::deposit_event(Event::Logged(i, weight));
					LOG.with(|log| {
						log.borrow_mut().push((origin.caller().clone(), i));
					})
				}

				#[weight = *weight]
				fn log_without_filter(origin, i: u32, weight: Weight) {
					Self::deposit_event(Event::Logged(i, weight));
					LOG.with(|log| {
						log.borrow_mut().push((origin.caller().clone(), i));
					})
				}
			}
		}
	}

	type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
	type Block = frame_system::mocking::MockBlock<Test>;

	frame_support::construct_runtime!(
		pub enum Test where
			Block = Block,
			NodeBlock = Block,
			UncheckedExtrinsic = UncheckedExtrinsic,
		{
			System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
			Logger: logger::{Pallet, Call, Event},
			Scheduler: scheduler::{Pallet, Call, Storage, Event<T>},
		}
	);

	// Scheduler must dispatch with root and no filter, this tests base filter is indeed not used.
	pub struct BaseFilter;
	impl Contains<Call> for BaseFilter {
		fn contains(call: &Call) -> bool {
			!matches!(call, Call::Logger(logger::Call::log { .. }))
		}
	}

	pub struct DummyExecutor;
	impl<T: frame_system::Config + Config, SelfContainedSignedInfo>
		DispatchCall<T, SelfContainedSignedInfo> for DummyExecutor
	{
		type Pre = ();

		fn dispatch_call(
			_pre: Self::Pre,
			_call: <T as Config>::Call,
		) -> Result<
			Result<PostDispatchInfo, DispatchErrorWithPostInfo<PostDispatchInfo>>,
			TransactionValidityError,
		> {
			todo!()
		}

		fn pre_dispatch(
			_signer: <T as frame_system::Config>::AccountId,
			_call: <T as Config>::Call,
		) -> Result<Self::Pre, TransactionValidityError> {
			todo!()
		}

		fn cancel_dispatch(_pre: Self::Pre) -> Result<(), TransactionValidityError> {
			todo!()
		}
	}

	parameter_types! {
		pub const BlockHashCount: u64 = 250;
		pub BlockWeights: frame_system::limits::BlockWeights =
			frame_system::limits::BlockWeights::simple_max(2_000_000_000_000);
	}
	impl system::Config for Test {
		type BaseCallFilter = BaseFilter;
		type BlockWeights = ();
		type BlockLength = ();
		type DbWeight = RocksDbWeight;
		type Origin = Origin;
		type Call = Call;
		type Index = u64;
		type BlockNumber = u64;
		type Hash = H256;
		type Hashing = BlakeTwo256;
		type AccountId = u64;
		type Lookup = IdentityLookup<Self::AccountId>;
		type Header = Header;
		type Event = Event;
		type BlockHashCount = BlockHashCount;
		type Version = ();
		type PalletInfo = PalletInfo;
		type AccountData = ();
		type OnNewAccount = ();
		type OnKilledAccount = ();
		type SystemWeightInfo = ();
		type SS58Prefix = ();
		type OnSetCode = ();
	}
	impl logger::Config for Test {
		type Event = Event;
	}
	parameter_types! {
		pub MaximumSchedulerWeight: Weight = Perbill::from_percent(80) * BlockWeights::get().max_block;
		pub const MaxScheduledPerBlock: u32 = 10;
	}
	ord_parameter_types! {
		pub const One: u64 = 1;
	}

	impl Config for Test {
		type Event = Event;
		type Origin = Origin;
		type PalletsOrigin = OriginCaller;
		type Call = Call;
		type MaximumWeight = MaximumSchedulerWeight;
		type ScheduleOrigin = EnsureOneOf<u64, EnsureRoot<u64>, EnsureSignedBy<One, u64>>;
		type MaxScheduledPerBlock = MaxScheduledPerBlock;
		type SponsorshipHandler = ();
		type WeightInfo = ();
		type CallExecutor = DummyExecutor;
	}
}
