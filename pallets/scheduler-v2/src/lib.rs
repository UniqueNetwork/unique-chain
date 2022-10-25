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

//! # Scheduler
//! A Pallet for scheduling dispatches.
//!
//! - [`Config`]
//! - [`Call`]
//! - [`Pallet`]
//!
//! ## Overview
//!
//! This Pallet exposes capabilities for scheduling dispatches to occur at a
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
//! * `schedule` - schedule a dispatch, which may be periodic, to occur at a specified block and
//!   with a specified priority.
//! * `cancel` - cancel a scheduled dispatch, specified by block number and index.
//! * `schedule_named` - augments the `schedule` interface with an additional `Vec<u8>` parameter
//!   that can be used for identification.
//! * `cancel_named` - the named complement to the cancel function.

// Ensure we're `no_std` when compiling for Wasm.
#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
#[cfg(test)]
mod mock;
#[cfg(test)]
mod tests;
pub mod weights;

use codec::{Codec, Decode, Encode, MaxEncodedLen};
use frame_support::{
	dispatch::{DispatchError, DispatchResult, Dispatchable, GetDispatchInfo, Parameter, PostDispatchInfo},
	traits::{
		schedule::{self, DispatchTime, LOWEST_PRIORITY},
		EnsureOrigin, Get, IsType, OriginTrait, PrivilegeCmp, StorageVersion, PreimageRecipient,
		ConstU32, UnfilteredDispatchable,
	},
	weights::Weight, unsigned::TransactionValidityError,
};

use frame_system::{self as system};
use scale_info::TypeInfo;
use sp_runtime::{
	traits::{BadOrigin, One, Saturating, Zero, Hash},
	BoundedVec, RuntimeDebug, DispatchErrorWithPostInfo,
};
use sp_core::H160;
use sp_std::{borrow::Borrow, cmp::Ordering, marker::PhantomData, prelude::*};
pub use weights::WeightInfo;

pub use pallet::*;

/// Just a simple index for naming period tasks.
pub type PeriodicIndex = u32;
/// The location of a scheduled task that can be used to remove it.
pub type TaskAddress<BlockNumber> = (BlockNumber, u32);

pub type EncodedCall = BoundedVec<u8, ConstU32<128>>;

#[derive(Clone, Eq, PartialEq, Encode, Decode, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub enum ScheduledCall<T: Config> {
	Inline(EncodedCall),
	PreimageLookup { hash: T::Hash, unbounded_len: u32 },
}

impl<T: Config> ScheduledCall<T> {
	pub fn new(call: <T as Config>::RuntimeCall) -> Result<Self, DispatchError> {
		let encoded = call.encode();
		let len = encoded.len();

		match EncodedCall::try_from(encoded.clone()) {
			Ok(bounded) => Ok(Self::Inline(bounded)),
			Err(_) => {
				let hash = <T as system::Config>::Hashing::hash_of(&encoded);
				<T as Config>::Preimages::note_preimage(
					encoded
						.try_into()
						.map_err(|_| <Error<T>>::TooBigScheduledCall)?,
				);

				Ok(Self::PreimageLookup {
					hash,
					unbounded_len: len as u32,
				})
			}
		}
	}

	/// The maximum length of the lookup that is needed to peek `Self`.
	pub fn lookup_len(&self) -> Option<u32> {
		match self {
			Self::Inline(..) => None,
			Self::PreimageLookup { unbounded_len, .. } => Some(*unbounded_len),
		}
	}

	/// Returns whether the image will require a lookup to be peeked.
	pub fn lookup_needed(&self) -> bool {
		match self {
			Self::Inline(_) => false,
			Self::PreimageLookup { .. } => true,
		}
	}

	fn decode(mut data: &[u8]) -> Result<<T as Config>::RuntimeCall, DispatchError> {
		<T as Config>::RuntimeCall::decode(&mut data)
			.map_err(|_| <Error<T>>::ScheduledCallCorrupted.into())
	}
}

pub trait SchedulerPreimages<T: Config>: PreimageRecipient<T::Hash> {
	fn drop(call: &ScheduledCall<T>);

	fn peek(
		call: &ScheduledCall<T>,
	) -> Result<(<T as pallet::Config>::RuntimeCall, Option<u32>), DispatchError>;

	/// Convert the given scheduled `call` value back into its original instance. If successful,
	/// `drop` any data backing it. This will not break the realisability of independently
	/// created instances of `ScheduledCall` which happen to have identical data.
	fn realize(
		call: &ScheduledCall<T>,
	) -> Result<(<T as pallet::Config>::RuntimeCall, Option<u32>), DispatchError>;
}

impl<T: Config, PP: PreimageRecipient<T::Hash>> SchedulerPreimages<T> for PP {
	fn drop(call: &ScheduledCall<T>) {
		match call {
			ScheduledCall::Inline(_) => {}
			ScheduledCall::PreimageLookup { hash, .. } => Self::unrequest_preimage(hash),
		}
	}

	fn peek(
		call: &ScheduledCall<T>,
	) -> Result<(<T as pallet::Config>::RuntimeCall, Option<u32>), DispatchError> {
		match call {
			ScheduledCall::Inline(data) => Ok((ScheduledCall::<T>::decode(data)?, None)),
			ScheduledCall::PreimageLookup {
				hash,
				unbounded_len,
			} => {
				let (preimage, len) = Self::get_preimage(hash)
					.ok_or(<Error<T>>::PreimageNotFound)
					.map(|preimage| (preimage, *unbounded_len))?;

				Ok((ScheduledCall::<T>::decode(preimage.as_slice())?, Some(len)))
			}
		}
	}

	fn realize(
		call: &ScheduledCall<T>,
	) -> Result<(<T as pallet::Config>::RuntimeCall, Option<u32>), DispatchError> {
		let r = Self::peek(call)?;
		Self::drop(call);
		Ok(r)
	}
}

pub enum ScheduledEnsureOriginSuccess<AccountId> {
	Root,
	Signed(AccountId),
	Unsigned,
}

pub type TaskName = [u8; 32];

/// Information regarding an item to be executed in the future.
#[cfg_attr(any(feature = "std", test), derive(PartialEq, Eq))]
#[derive(Clone, RuntimeDebug, Encode, Decode, MaxEncodedLen, TypeInfo)]
pub struct Scheduled<Name, Call, BlockNumber, PalletsOrigin, AccountId> {
	/// The unique identity for this task, if there is one.
	maybe_id: Option<Name>,

	/// This task's priority.
	priority: schedule::Priority,

	/// The call to be dispatched.
	call: Call,

	/// If the call is periodic, then this points to the information concerning that.
	maybe_periodic: Option<schedule::Period<BlockNumber>>,

	/// The origin with which to dispatch the call.
	origin: PalletsOrigin,
	_phantom: PhantomData<AccountId>,
}

pub type ScheduledOf<T> = Scheduled<
	TaskName,
	ScheduledCall<T>,
	<T as frame_system::Config>::BlockNumber,
	<T as Config>::PalletsOrigin,
	<T as frame_system::Config>::AccountId,
>;

struct WeightCounter {
	used: Weight,
	limit: Weight,
}

impl WeightCounter {
	fn check_accrue(&mut self, w: Weight) -> bool {
		let test = self.used.saturating_add(w);
		if test.any_gt(self.limit) {
			false
		} else {
			self.used = test;
			true
		}
	}

	fn can_accrue(&mut self, w: Weight) -> bool {
		self.used.saturating_add(w).all_lte(self.limit)
	}
}

pub(crate) trait MarginalWeightInfo: WeightInfo {
	fn service_task(maybe_lookup_len: Option<usize>, named: bool, periodic: bool) -> Weight {
		let base = Self::service_task_base();
		let mut total = match maybe_lookup_len {
			None => base,
			Some(l) => Self::service_task_fetched(l as u32),
		};
		if named {
			total.saturating_accrue(Self::service_task_named().saturating_sub(base));
		}
		if periodic {
			total.saturating_accrue(Self::service_task_periodic().saturating_sub(base));
		}
		total
	}
}

impl<T: WeightInfo> MarginalWeightInfo for T {}

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{dispatch::PostDispatchInfo, pallet_prelude::*};
	use system::pallet_prelude::*;

	/// The current storage version.
	const STORAGE_VERSION: StorageVersion = StorageVersion::new(0);

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	#[pallet::storage_version(STORAGE_VERSION)]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// The aggregated origin which the dispatch will take.
		type RuntimeOrigin: OriginTrait<PalletsOrigin = Self::PalletsOrigin>
			+ From<Self::PalletsOrigin>
			+ IsType<<Self as system::Config>::RuntimeOrigin>
			+ Clone;

		/// The caller origin, overarching type of all pallets origins.
		type PalletsOrigin: From<system::RawOrigin<Self::AccountId>>
			+ Codec
			+ Clone
			+ Eq
			+ TypeInfo
			+ MaxEncodedLen;

		/// The aggregated call type.
		type RuntimeCall: Parameter
			+ Dispatchable<RuntimeOrigin = <Self as Config>::RuntimeOrigin, PostInfo = PostDispatchInfo>
			+ UnfilteredDispatchable<RuntimeOrigin = <Self as system::Config>::RuntimeOrigin>
			+ GetDispatchInfo
			+ From<system::Call<Self>>;

		/// The maximum weight that may be scheduled per block for any dispatchables.
		#[pallet::constant]
		type MaximumWeight: Get<Weight>;

		/// Required origin to schedule or cancel calls.
		type ScheduleOrigin: EnsureOrigin<
			<Self as system::Config>::RuntimeOrigin,
			Success = ScheduledEnsureOriginSuccess<Self::AccountId>,
		>;

		/// Compare the privileges of origins.
		///
		/// This will be used when canceling a task, to ensure that the origin that tries
		/// to cancel has greater or equal privileges as the origin that created the scheduled task.
		///
		/// For simplicity the [`EqualPrivilegeOnly`](frame_support::traits::EqualPrivilegeOnly) can
		/// be used. This will only check if two given origins are equal.
		type OriginPrivilegeCmp: PrivilegeCmp<Self::PalletsOrigin>;

		/// The maximum number of scheduled calls in the queue for a single block.
		#[pallet::constant]
		type MaxScheduledPerBlock: Get<u32>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;

		/// The preimage provider with which we look up call hashes to get the call.
		type Preimages: SchedulerPreimages<Self>;

		/// The helper type used for custom transaction fee logic.
		type CallExecutor: DispatchCall<Self, H160>;

		/// Required origin to set/change calls' priority.
		type PrioritySetOrigin: EnsureOrigin<<Self as system::Config>::RuntimeOrigin>;
	}

	#[pallet::storage]
	pub type IncompleteSince<T: Config> = StorageValue<_, T::BlockNumber>;

	/// Items to be executed, indexed by the block number that they should be executed on.
	#[pallet::storage]
	pub type Agenda<T: Config> = StorageMap<
		_,
		Twox64Concat,
		T::BlockNumber,
		BoundedVec<Option<ScheduledOf<T>>, T::MaxScheduledPerBlock>,
		ValueQuery,
	>;

	/// Lookup from a name to the block number and index of the task.
	#[pallet::storage]
	pub(crate) type Lookup<T: Config> =
		StorageMap<_, Twox64Concat, TaskName, TaskAddress<T::BlockNumber>>;

	/// Events type.
	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Scheduled some task.
		Scheduled { when: T::BlockNumber, index: u32 },
		/// Canceled some task.
		Canceled { when: T::BlockNumber, index: u32 },
		/// Dispatched some task.
		Dispatched {
			task: TaskAddress<T::BlockNumber>,
			id: Option<[u8; 32]>,
			result: DispatchResult,
		},
		/// Scheduled task's priority has changed
		PriorityChanged {
			when: T::BlockNumber,
			index: u32,
			priority: schedule::Priority,
		},
		/// The call for the provided hash was not found so the task has been aborted.
		CallUnavailable {
			task: TaskAddress<T::BlockNumber>,
			id: Option<[u8; 32]>,
		},
		/// The given task was unable to be renewed since the agenda is full at that block.
		PeriodicFailed {
			task: TaskAddress<T::BlockNumber>,
			id: Option<[u8; 32]>,
		},
		/// The given task can never be executed since it is overweight.
		PermanentlyOverweight {
			task: TaskAddress<T::BlockNumber>,
			id: Option<[u8; 32]>,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Failed to schedule a call
		FailedToSchedule,
		/// There is no place for a new task in the agenda
		AgendaIsExhausted,
		/// Scheduled call is corrupted
		ScheduledCallCorrupted,
		/// Scheduled call preimage is not found
		PreimageNotFound,
		/// Scheduled call is too big
		TooBigScheduledCall,
		/// Cannot find the scheduled call.
		NotFound,
		/// Given target block number is in the past.
		TargetBlockNumberInPast,
		/// Attempt to use a non-named function on a named task.
		Named,
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		/// Execute the scheduled calls
		fn on_initialize(now: T::BlockNumber) -> Weight {
			let mut weight_counter = WeightCounter {
				used: Weight::zero(),
				limit: T::MaximumWeight::get(),
			};
			Self::service_agendas(&mut weight_counter, now, u32::max_value());
			weight_counter.used
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Anonymously schedule a task.
		#[pallet::weight(<T as Config>::WeightInfo::schedule(T::MaxScheduledPerBlock::get()))]
		pub fn schedule(
			origin: OriginFor<T>,
			when: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: Option<schedule::Priority>,
			call: Box<<T as Config>::RuntimeCall>,
		) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;

			if priority.is_some() {
				T::PrioritySetOrigin::ensure_origin(origin.clone())?;
			}

			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_schedule(
				DispatchTime::At(when),
				maybe_periodic,
				priority.unwrap_or(LOWEST_PRIORITY),
				origin.caller().clone(),
				<ScheduledCall<T>>::new(*call)?,
			)?;
			Ok(())
		}

		/// Cancel an anonymously scheduled task.
		#[pallet::weight(<T as Config>::WeightInfo::cancel(T::MaxScheduledPerBlock::get()))]
		pub fn cancel(origin: OriginFor<T>, when: T::BlockNumber, index: u32) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_cancel(Some(origin.caller().clone()), (when, index))?;
			Ok(())
		}

		/// Schedule a named task.
		#[pallet::weight(<T as Config>::WeightInfo::schedule_named(T::MaxScheduledPerBlock::get()))]
		pub fn schedule_named(
			origin: OriginFor<T>,
			id: TaskName,
			when: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: Option<schedule::Priority>,
			call: Box<<T as Config>::RuntimeCall>,
		) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;

			if priority.is_some() {
				T::PrioritySetOrigin::ensure_origin(origin.clone())?;
			}

			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_schedule_named(
				id,
				DispatchTime::At(when),
				maybe_periodic,
				priority.unwrap_or(LOWEST_PRIORITY),
				origin.caller().clone(),
				<ScheduledCall<T>>::new(*call)?,
			)?;
			Ok(())
		}

		/// Cancel a named scheduled task.
		#[pallet::weight(<T as Config>::WeightInfo::cancel_named(T::MaxScheduledPerBlock::get()))]
		pub fn cancel_named(origin: OriginFor<T>, id: TaskName) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_cancel_named(Some(origin.caller().clone()), id)?;
			Ok(())
		}

		/// Anonymously schedule a task after a delay.
		///
		/// # <weight>
		/// Same as [`schedule`].
		/// # </weight>
		#[pallet::weight(<T as Config>::WeightInfo::schedule(T::MaxScheduledPerBlock::get()))]
		pub fn schedule_after(
			origin: OriginFor<T>,
			after: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: Option<schedule::Priority>,
			call: Box<<T as Config>::RuntimeCall>,
		) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;

			if priority.is_some() {
				T::PrioritySetOrigin::ensure_origin(origin.clone())?;
			}

			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_schedule(
				DispatchTime::After(after),
				maybe_periodic,
				priority.unwrap_or(LOWEST_PRIORITY),
				origin.caller().clone(),
				<ScheduledCall<T>>::new(*call)?,
			)?;
			Ok(())
		}

		/// Schedule a named task after a delay.
		///
		/// # <weight>
		/// Same as [`schedule_named`](Self::schedule_named).
		/// # </weight>
		#[pallet::weight(<T as Config>::WeightInfo::schedule_named(T::MaxScheduledPerBlock::get()))]
		pub fn schedule_named_after(
			origin: OriginFor<T>,
			id: TaskName,
			after: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: Option<schedule::Priority>,
			call: Box<<T as Config>::RuntimeCall>,
		) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;

			if priority.is_some() {
				T::PrioritySetOrigin::ensure_origin(origin.clone())?;
			}

			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_schedule_named(
				id,
				DispatchTime::After(after),
				maybe_periodic,
				priority.unwrap_or(LOWEST_PRIORITY),
				origin.caller().clone(),
				<ScheduledCall<T>>::new(*call)?,
			)?;
			Ok(())
		}

		#[pallet::weight(<T as Config>::WeightInfo::change_named_priority(T::MaxScheduledPerBlock::get()))]
		pub fn change_named_priority(
			origin: OriginFor<T>,
			id: TaskName,
			priority: schedule::Priority,
		) -> DispatchResult {
			T::PrioritySetOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_change_named_priority(origin.caller().clone(), id, priority)
		}
	}
}

impl<T: Config> Pallet<T> {
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

	fn place_task(
		when: T::BlockNumber,
		what: ScheduledOf<T>,
	) -> Result<TaskAddress<T::BlockNumber>, (DispatchError, ScheduledOf<T>)> {
		let maybe_name = what.maybe_id;
		let index = Self::push_to_agenda(when, what)?;
		let address = (when, index);
		if let Some(name) = maybe_name {
			Lookup::<T>::insert(name, address)
		}
		Self::deposit_event(Event::Scheduled {
			when: address.0,
			index: address.1,
		});
		Ok(address)
	}

	fn push_to_agenda(
		when: T::BlockNumber,
		what: ScheduledOf<T>,
	) -> Result<u32, (DispatchError, ScheduledOf<T>)> {
		let mut agenda = Agenda::<T>::get(when);
		let index = if (agenda.len() as u32) < T::MaxScheduledPerBlock::get() {
			// will always succeed due to the above check.
			let _ = agenda.try_push(Some(what));
			agenda.len() as u32 - 1
		} else {
			if let Some(hole_index) = agenda.iter().position(|i| i.is_none()) {
				agenda[hole_index] = Some(what);
				hole_index as u32
			} else {
				return Err((<Error<T>>::AgendaIsExhausted.into(), what));
			}
		};
		Agenda::<T>::insert(when, agenda);
		Ok(index)
	}

	fn do_schedule(
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: ScheduledCall<T>,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		let when = Self::resolve_time(when)?;

		// sanitize maybe_periodic
		let maybe_periodic = maybe_periodic
			.filter(|p| p.1 > 1 && !p.0.is_zero())
			// Remove one from the number of repetitions since we will schedule one now.
			.map(|(p, c)| (p, c - 1));
		let task = Scheduled {
			maybe_id: None,
			priority,
			call,
			maybe_periodic,
			origin,
			_phantom: PhantomData,
		};
		Self::place_task(when, task).map_err(|x| x.0)
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
						if matches!(
							T::OriginPrivilegeCmp::cmp_privilege(o, &s.origin),
							Some(Ordering::Less) | None
						) {
							return Err(BadOrigin.into());
						}
					};
					Ok(s.take())
				},
			)
		})?;
		if let Some(s) = scheduled {
			T::Preimages::drop(&s.call);

			if let Some(id) = s.maybe_id {
				Lookup::<T>::remove(id);
			}
			Self::deposit_event(Event::Canceled { when, index });
			Ok(())
		} else {
			return Err(Error::<T>::NotFound.into());
		}
	}

	fn do_schedule_named(
		id: TaskName,
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: ScheduledCall<T>,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		// ensure id it is unique
		if Lookup::<T>::contains_key(&id) {
			return Err(Error::<T>::FailedToSchedule.into());
		}

		let when = Self::resolve_time(when)?;

		// sanitize maybe_periodic
		let maybe_periodic = maybe_periodic
			.filter(|p| p.1 > 1 && !p.0.is_zero())
			// Remove one from the number of repetitions since we will schedule one now.
			.map(|(p, c)| (p, c - 1));

		let task = Scheduled {
			maybe_id: Some(id),
			priority,
			call,
			maybe_periodic,
			origin,
			_phantom: Default::default(),
		};
		Self::place_task(when, task).map_err(|x| x.0)
	}

	fn do_cancel_named(origin: Option<T::PalletsOrigin>, id: TaskName) -> DispatchResult {
		Lookup::<T>::try_mutate_exists(id, |lookup| -> DispatchResult {
			if let Some((when, index)) = lookup.take() {
				let i = index as usize;
				Agenda::<T>::try_mutate(when, |agenda| -> DispatchResult {
					if let Some(s) = agenda.get_mut(i) {
						if let (Some(ref o), Some(ref s)) = (origin, s.borrow()) {
							if matches!(
								T::OriginPrivilegeCmp::cmp_privilege(o, &s.origin),
								Some(Ordering::Less) | None
							) {
								return Err(BadOrigin.into());
							}
							T::Preimages::drop(&s.call);
						}
						*s = None;
					}
					Ok(())
				})?;
				Self::deposit_event(Event::Canceled { when, index });
				Ok(())
			} else {
				return Err(Error::<T>::NotFound.into());
			}
		})
	}

	fn do_change_named_priority(
		origin: T::PalletsOrigin,
		id: TaskName,
		priority: schedule::Priority,
	) -> DispatchResult {
		match Lookup::<T>::get(id) {
			Some((when, index)) => {
				let i = index as usize;
				Agenda::<T>::try_mutate(when, |agenda| {
					if let Some(Some(s)) = agenda.get_mut(i) {
						if matches!(
							T::OriginPrivilegeCmp::cmp_privilege(&origin, &s.origin),
							Some(Ordering::Less) | None
						) {
							return Err(BadOrigin.into());
						}

						s.priority = priority;
						Self::deposit_event(Event::PriorityChanged {
							when,
							index,
							priority,
						});
					}
					Ok(())
				})
			}
			None => Err(Error::<T>::NotFound.into()),
		}
	}
}

enum ServiceTaskError {
	/// Could not be executed due to missing preimage.
	Unavailable,
	/// Could not be executed due to weight limitations.
	Overweight,
}
use ServiceTaskError::*;

/// A Scheduler-Runtime interface for finer payment handling.
pub trait DispatchCall<T: frame_system::Config + Config, SelfContainedSignedInfo> {
	/// Resolve the call dispatch, including any post-dispatch operations.
	fn dispatch_call(
		signer: Option<T::AccountId>,
		function: <T as Config>::RuntimeCall,
	) -> Result<
		Result<PostDispatchInfo, DispatchErrorWithPostInfo<PostDispatchInfo>>,
		TransactionValidityError,
	>;
}

impl<T: Config> Pallet<T> {
	/// Service up to `max` agendas queue starting from earliest incompletely executed agenda.
	fn service_agendas(weight: &mut WeightCounter, now: T::BlockNumber, max: u32) {
		if !weight.check_accrue(T::WeightInfo::service_agendas_base()) {
			return;
		}

		let mut incomplete_since = now + One::one();
		let mut when = IncompleteSince::<T>::take().unwrap_or(now);
		let mut executed = 0;

		let max_items = T::MaxScheduledPerBlock::get();
		let mut count_down = max;
		let service_agenda_base_weight = T::WeightInfo::service_agenda_base(max_items);
		while count_down > 0 && when <= now && weight.can_accrue(service_agenda_base_weight) {
			if !Self::service_agenda(weight, &mut executed, now, when, u32::max_value()) {
				incomplete_since = incomplete_since.min(when);
			}
			when.saturating_inc();
			count_down.saturating_dec();
		}
		incomplete_since = incomplete_since.min(when);
		if incomplete_since <= now {
			IncompleteSince::<T>::put(incomplete_since);
		}
	}

	/// Returns `true` if the agenda was fully completed, `false` if it should be revisited at a
	/// later block.
	fn service_agenda(
		weight: &mut WeightCounter,
		executed: &mut u32,
		now: T::BlockNumber,
		when: T::BlockNumber,
		max: u32,
	) -> bool {
		let mut agenda = Agenda::<T>::get(when);
		let mut ordered = agenda
			.iter()
			.enumerate()
			.filter_map(|(index, maybe_item)| {
				maybe_item
					.as_ref()
					.map(|item| (index as u32, item.priority))
			})
			.collect::<Vec<_>>();
		ordered.sort_by_key(|k| k.1);
		let within_limit =
			weight.check_accrue(T::WeightInfo::service_agenda_base(ordered.len() as u32));
		debug_assert!(
			within_limit,
			"weight limit should have been checked in advance"
		);

		// Items which we know can be executed and have postponed for execution in a later block.
		let mut postponed = (ordered.len() as u32).saturating_sub(max);
		// Items which we don't know can ever be executed.
		let mut dropped = 0;

		for (agenda_index, _) in ordered.into_iter().take(max as usize) {
			let task = match agenda[agenda_index as usize].take() {
				None => continue,
				Some(t) => t,
			};
			let base_weight = T::WeightInfo::service_task(
				task.call.lookup_len().map(|x| x as usize),
				task.maybe_id.is_some(),
				task.maybe_periodic.is_some(),
			);
			if !weight.can_accrue(base_weight) {
				postponed += 1;
				break;
			}
			let result = Self::service_task(weight, now, when, agenda_index, *executed == 0, task);
			agenda[agenda_index as usize] = match result {
				Err((Unavailable, slot)) => {
					dropped += 1;
					slot
				}
				Err((Overweight, slot)) => {
					postponed += 1;
					slot
				}
				Ok(()) => {
					*executed += 1;
					None
				}
			};
		}
		if postponed > 0 || dropped > 0 {
			Agenda::<T>::insert(when, agenda);
		} else {
			Agenda::<T>::remove(when);
		}
		postponed == 0
	}

	/// Service (i.e. execute) the given task, being careful not to overflow the `weight` counter.
	///
	/// This involves:
	/// - removing and potentially replacing the `Lookup` entry for the task.
	/// - realizing the task's call which can include a preimage lookup.
	/// - Rescheduling the task for execution in a later agenda if periodic.
	fn service_task(
		weight: &mut WeightCounter,
		now: T::BlockNumber,
		when: T::BlockNumber,
		agenda_index: u32,
		is_first: bool,
		mut task: ScheduledOf<T>,
	) -> Result<(), (ServiceTaskError, Option<ScheduledOf<T>>)> {
		let (call, lookup_len) = match T::Preimages::peek(&task.call) {
			Ok(c) => c,
			Err(_) => {
				if let Some(ref id) = task.maybe_id {
					Lookup::<T>::remove(id);
				}

				return Err((Unavailable, Some(task)));
			},
		};

		weight.check_accrue(T::WeightInfo::service_task(
			lookup_len.map(|x| x as usize),
			task.maybe_id.is_some(),
			task.maybe_periodic.is_some(),
		));

		match Self::execute_dispatch(weight, task.origin.clone(), call) {
			Err(Unavailable) => {
				debug_assert!(false, "Checked to exist with `peek`");

				if let Some(ref id) = task.maybe_id {
					Lookup::<T>::remove(id);
				}

				Self::deposit_event(Event::CallUnavailable {
					task: (when, agenda_index),
					id: task.maybe_id,
				});
				Err((Unavailable, Some(task)))
			}
			Err(Overweight) if is_first => {
				T::Preimages::drop(&task.call);

				if let Some(ref id) = task.maybe_id {
					Lookup::<T>::remove(id);
				}

				Self::deposit_event(Event::PermanentlyOverweight {
					task: (when, agenda_index),
					id: task.maybe_id,
				});
				Err((Unavailable, Some(task)))
			}
			Err(Overweight) => {
				// Preserve Lookup -- the task will be postponed.
				Err((Overweight, Some(task)))
			},
			Ok(result) => {
				Self::deposit_event(Event::Dispatched {
					task: (when, agenda_index),
					id: task.maybe_id,
					result,
				});

				let is_canceled = task.maybe_id.as_ref()
					.map(|id| !Lookup::<T>::contains_key(id))
					.unwrap_or(false);

				match &task.maybe_periodic {
					&Some((period, count)) if !is_canceled => {
						if count > 1 {
							task.maybe_periodic = Some((period, count - 1));
						} else {
							task.maybe_periodic = None;
						}
						let wake = now.saturating_add(period);
						match Self::place_task(wake, task) {
							Ok(_) => {}
							Err((_, task)) => {
								// TODO: Leave task in storage somewhere for it to be rescheduled
								// manually.
								T::Preimages::drop(&task.call);
								Self::deposit_event(Event::PeriodicFailed {
									task: (when, agenda_index),
									id: task.maybe_id,
								});
							}
						}
					},
					_ => {
						if let Some(ref id) = task.maybe_id {
							Lookup::<T>::remove(id);
						}

						T::Preimages::drop(&task.call)
					},
				}
				Ok(())
			}
		}
	}

	/// Make a dispatch to the given `call` from the given `origin`, ensuring that the `weight`
	/// counter does not exceed its limit and that it is counted accurately (e.g. accounted using
	/// post info if available).
	///
	/// NOTE: Only the weight for this function will be counted (origin lookup, dispatch and the
	/// call itself).
	fn execute_dispatch(
		weight: &mut WeightCounter,
		origin: T::PalletsOrigin,
		call: <T as Config>::RuntimeCall,
	) -> Result<DispatchResult, ServiceTaskError> {
		let dispatch_origin: <T as Config>::RuntimeOrigin = origin.into();
		let base_weight = match dispatch_origin.clone().as_signed() {
			Some(_) => T::WeightInfo::execute_dispatch_signed(),
			_ => T::WeightInfo::execute_dispatch_unsigned(),
		};
		let call_weight = call.get_dispatch_info().weight;
		// We only allow a scheduled call if it cannot push the weight past the limit.
		let max_weight = base_weight.saturating_add(call_weight);

		if !weight.can_accrue(max_weight) {
			return Err(Overweight);
		}

		// let scheduled_origin =
		// 	<<T as Config>::Origin as From<T::PalletsOrigin>>::from(origin.clone());
		let ensured_origin = T::ScheduleOrigin::ensure_origin(dispatch_origin.into());

		let r = match ensured_origin {
			Ok(ScheduledEnsureOriginSuccess::Root) => {
				Ok(call.dispatch_bypass_filter(frame_system::RawOrigin::Root.into()))
			},
			Ok(ScheduledEnsureOriginSuccess::Signed(sender)) => {
				// Execute transaction via chain default pipeline
				// That means dispatch will be processed like any user's extrinsic e.g. transaction fees will be taken
				T::CallExecutor::dispatch_call(Some(sender), call.clone())
			},
			Ok(ScheduledEnsureOriginSuccess::Unsigned) => {
				// Unsigned version of the above
				T::CallExecutor::dispatch_call(None, call.clone())
			}
			Err(e) => Ok(Err(e.into())),
		};

		let (maybe_actual_call_weight, result) = match r {
			Ok(result) => match result {
				Ok(post_info) => (post_info.actual_weight, Ok(())),
				Err(error_and_info) => (
					error_and_info.post_info.actual_weight,
					Err(error_and_info.error),
				),
			},
			Err(_) => {
				log::error!(
					target: "runtime::scheduler",
					"Warning: Scheduler has failed to execute a post-dispatch transaction. \
					This block might have become invalid.");
				(None, Err(DispatchError::CannotLookup))
			}
		};
		let call_weight = maybe_actual_call_weight.unwrap_or(call_weight);
		weight.check_accrue(base_weight);
		weight.check_accrue(call_weight);
		Ok(result)
	}
}
