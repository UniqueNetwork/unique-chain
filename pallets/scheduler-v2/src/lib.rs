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
#![deny(missing_docs)]

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
#[cfg(test)]
mod mock;
#[cfg(test)]
mod tests;
pub mod weights;

use codec::{Codec, Decode, Encode, MaxEncodedLen};
use frame_support::{
	dispatch::{
		DispatchError, DispatchResult, Dispatchable, GetDispatchInfo, Parameter, PostDispatchInfo,
	},
	traits::{
		schedule::{self, DispatchTime, LOWEST_PRIORITY},
		EnsureOrigin, Get, IsType, OriginTrait, PrivilegeCmp, StorageVersion, PreimageRecipient,
		ConstU32, UnfilteredDispatchable,
	},
	weights::Weight,
	unsigned::TransactionValidityError,
};

use frame_system::{self as system};
use scale_info::TypeInfo;
use sp_runtime::{
	traits::{BadOrigin, One, Saturating, Zero, Hash},
	BoundedVec, RuntimeDebug, DispatchErrorWithPostInfo,
};
use sp_core::H160;
use sp_std::{cmp::Ordering, marker::PhantomData, prelude::*};
pub use weights::WeightInfo;

pub use pallet::*;

/// Just a simple index for naming period tasks.
pub type PeriodicIndex = u32;
/// The location of a scheduled task that can be used to remove it.
pub type TaskAddress<BlockNumber> = (BlockNumber, u32);

/// A an encoded bounded `Call`. Its encoding must be at most 128 bytes.
pub type EncodedCall = BoundedVec<u8, ConstU32<128>>;

#[derive(Clone, Eq, PartialEq, Encode, Decode, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
/// A scheduled call is stored as is or as a preimage hash to lookup.
/// This enum represents both variants.
pub enum ScheduledCall<T: Config> {
	/// A an encoded bounded `Call`. Its encoding must be at most 128 bytes.
	Inline(EncodedCall),

	/// A Blake2-256 hash of the call together with an upper limit for its size.
	PreimageLookup {
		/// A call hash to lookup
		hash: T::Hash,

		/// The length of the decoded call
		unbounded_len: u32,
	},
}

impl<T: Config> ScheduledCall<T> {
	/// Convert an otherwise unbounded or large value into a type ready for placing in storage.
	///
	/// NOTE: Once this API is used, you should use either `drop` or `realize`.
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

	// Decodes a runtime call
	fn decode(mut data: &[u8]) -> Result<<T as Config>::RuntimeCall, DispatchError> {
		<T as Config>::RuntimeCall::decode(&mut data)
			.map_err(|_| <Error<T>>::ScheduledCallCorrupted.into())
	}
}

/// Weight Info for the Preimages fetches.
pub trait SchedulerPreimagesWeightInfo<W: WeightInfo> {
	/// Get the weight of a task fetches with a given decoded length.
	fn service_task_fetched(call_length: u32) -> Weight;
}

impl<W: WeightInfo> SchedulerPreimagesWeightInfo<W> for () {
	fn service_task_fetched(_call_length: u32) -> Weight {
		W::service_task_base()
	}
}

/// A scheduler's interface for managing preimages to hashes
/// and looking up preimages from their hash on-chain.
pub trait SchedulerPreimages<T: Config>:
	PreimageRecipient<T::Hash> + SchedulerPreimagesWeightInfo<T::WeightInfo>
{
	/// No longer request that the data for decoding the given `call` is available.
	fn drop(call: &ScheduledCall<T>);

	/// Convert the given `call` instance back into its original instance, also returning the
	/// exact size of its encoded form if it needed to be looked-up from a stored preimage.
	///
	/// NOTE: This does not remove any data needed for realization. If you will no longer use the
	/// `call`, use `realize` instead or use `drop` afterwards.
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

impl<T: Config, PP: PreimageRecipient<T::Hash> + SchedulerPreimagesWeightInfo<T::WeightInfo>>
	SchedulerPreimages<T> for PP
{
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

/// Scheduler's supported origins.
pub enum ScheduledEnsureOriginSuccess<AccountId> {
	/// A scheduled transaction has the Root origin.
	Root,

	/// A specific account has signed a scheduled transaction.
	Signed(AccountId),
}

/// An identifier of a scheduled task.
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

/// Information regarding an item to be executed in the future.
pub type ScheduledOf<T> = Scheduled<
	TaskName,
	ScheduledCall<T>,
	<T as frame_system::Config>::BlockNumber,
	<T as Config>::PalletsOrigin,
	<T as frame_system::Config>::AccountId,
>;

#[derive(Encode, Decode, MaxEncodedLen, TypeInfo)]
#[scale_info(skip_type_params(T))]
/// A structure for storing scheduled tasks in a block.
/// The `BlockAgenda` tracks the available free space for a new task in a block.4
///
/// The agenda's maximum amount of tasks is `T::MaxScheduledPerBlock`.
pub struct BlockAgenda<T: Config> {
	agenda: BoundedVec<Option<ScheduledOf<T>>, T::MaxScheduledPerBlock>,
	free_places: u32,
}

impl<T: Config> BlockAgenda<T> {
	/// Tries to push a new scheduled task into the block's agenda.
	/// If there is a free place, the new task will take it,
	/// and the `BlockAgenda` will record that the number of free places has decreased.
	///
	/// An error containing the scheduled task will be returned if there are no free places.
	///
	/// The complexity of the check for the *existence* of a free place is O(1).
	/// The complexity of *finding* the free slot is O(n).
	fn try_push(&mut self, scheduled: ScheduledOf<T>) -> Result<u32, ScheduledOf<T>> {
		if self.free_places == 0 {
			return Err(scheduled);
		}

		self.free_places = self.free_places.saturating_sub(1);

		if (self.agenda.len() as u32) < T::MaxScheduledPerBlock::get() {
			// will always succeed due to the above check.
			let _ = self.agenda.try_push(Some(scheduled));
			Ok((self.agenda.len() - 1) as u32)
		} else {
			match self.agenda.iter().position(|i| i.is_none()) {
				Some(hole_index) => {
					self.agenda[hole_index] = Some(scheduled);
					Ok(hole_index as u32)
				}
				None => unreachable!("free_places was greater than 0; qed"),
			}
		}
	}

	/// Sets a slot by the given index and the slot value.
	///
	/// ### Panics
	/// If the index is out of range, the function will panic.
	fn set_slot(&mut self, index: u32, slot: Option<ScheduledOf<T>>) {
		self.agenda[index as usize] = slot;
	}

	/// Returns an iterator containing references to the agenda's slots.
	fn iter(&self) -> impl Iterator<Item = &'_ Option<ScheduledOf<T>>> + '_ {
		self.agenda.iter()
	}

	/// Returns an immutable reference to a scheduled task if there is one under the given index.
	///
	///  The function returns `None` if:
	/// * The `index` is out of range
	/// * No scheduled task occupies the agenda slot under the given index.
	fn get(&self, index: u32) -> Option<&ScheduledOf<T>> {
		match self.agenda.get(index as usize) {
			Some(Some(scheduled)) => Some(scheduled),
			_ => None,
		}
	}

	/// Returns a mutable reference to a scheduled task if there is one under the given index.
	///
	///  The function returns `None` if:
	/// * The `index` is out of range
	/// * No scheduled task occupies the agenda slot under the given index.
	fn get_mut(&mut self, index: u32) -> Option<&mut ScheduledOf<T>> {
		match self.agenda.get_mut(index as usize) {
			Some(Some(scheduled)) => Some(scheduled),
			_ => None,
		}
	}

	/// Take a scheduled task by the given index.
	///
	/// If there is a task under the index, the function will:
	/// * Free the corresponding agenda slot.
	/// * Decrease the number of free places.
	/// * Return the scheduled task.
	///
	/// The function returns `None` if there is no task under the index.
	fn take(&mut self, index: u32) -> Option<ScheduledOf<T>> {
		let removed = self.agenda.get_mut(index as usize)?.take();

		if removed.is_some() {
			self.free_places = self.free_places.saturating_add(1);
		}

		removed
	}
}

impl<T: Config> Default for BlockAgenda<T> {
	fn default() -> Self {
		let agenda = Default::default();
		let free_places = T::MaxScheduledPerBlock::get();

		Self {
			agenda,
			free_places,
		}
	}
}
/// A structure for tracking the used weight
/// and checking if it does not exceed the weight limit.
struct WeightCounter {
	used: Weight,
	limit: Weight,
}

impl WeightCounter {
	/// Checks if the weight `w` can be accommodated by the counter.
	///
	/// If there is room for the additional weight `w`,
	/// the function will update the used weight and return true.
	fn check_accrue(&mut self, w: Weight) -> bool {
		let test = self.used.saturating_add(w);
		if test.any_gt(self.limit) {
			false
		} else {
			self.used = test;
			true
		}
	}

	/// Checks if the weight `w` can be accommodated by the counter.
	fn can_accrue(&mut self, w: Weight) -> bool {
		self.used.saturating_add(w).all_lte(self.limit)
	}
}

pub(crate) struct MarginalWeightInfo<T: Config>(sp_std::marker::PhantomData<T>);

impl<T: Config> MarginalWeightInfo<T> {
	/// Return the weight of servicing a single task.
	fn service_task(maybe_lookup_len: Option<usize>, named: bool, periodic: bool) -> Weight {
		let base = T::WeightInfo::service_task_base();
		let mut total = match maybe_lookup_len {
			None => base,
			Some(l) => T::Preimages::service_task_fetched(l as u32),
		};
		if named {
			total.saturating_accrue(T::WeightInfo::service_task_named().saturating_sub(base));
		}
		if periodic {
			total.saturating_accrue(T::WeightInfo::service_task_periodic().saturating_sub(base));
		}
		total
	}
}

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
		/// The overarching event type.
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
			+ Dispatchable<
				RuntimeOrigin = <Self as Config>::RuntimeOrigin,
				PostInfo = PostDispatchInfo,
			> + UnfilteredDispatchable<RuntimeOrigin = <Self as system::Config>::RuntimeOrigin>
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

	/// It contains the block number from which we should service tasks.
	/// It's used for delaying the servicing of future blocks' agendas if we had overweight tasks.
	#[pallet::storage]
	pub type IncompleteSince<T: Config> = StorageValue<_, T::BlockNumber>;

	/// Items to be executed, indexed by the block number that they should be executed on.
	#[pallet::storage]
	pub type Agenda<T: Config> =
		StorageMap<_, Twox64Concat, T::BlockNumber, BlockAgenda<T>, ValueQuery>;

	/// Lookup from a name to the block number and index of the task.
	#[pallet::storage]
	pub(crate) type Lookup<T: Config> =
		StorageMap<_, Twox64Concat, TaskName, TaskAddress<T::BlockNumber>>;

	/// Events type.
	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Scheduled some task.
		Scheduled {
			/// The block number in which the scheduled task should be executed.
			when: T::BlockNumber,

			/// The index of the block's agenda slot.
			index: u32,
		},
		/// Canceled some task.
		Canceled {
			/// The block number in which the canceled task has been.
			when: T::BlockNumber,

			/// The index of the block's agenda slot that had become available.
			index: u32,
		},
		/// Dispatched some task.
		Dispatched {
			/// The task's address - the block number and the block's agenda index.
			task: TaskAddress<T::BlockNumber>,

			/// The task's name if it is not anonymous.
			id: Option<[u8; 32]>,

			/// The task's execution result.
			result: DispatchResult,
		},
		/// Scheduled task's priority has changed
		PriorityChanged {
			/// The task's address - the block number and the block's agenda index.
			task: TaskAddress<T::BlockNumber>,

			/// The new priority of the task.
			priority: schedule::Priority,
		},
		/// The call for the provided hash was not found so the task has been aborted.
		CallUnavailable {
			/// The task's address - the block number and the block's agenda index.
			task: TaskAddress<T::BlockNumber>,

			/// The task's name if it is not anonymous.
			id: Option<[u8; 32]>,
		},
		/// The given task can never be executed since it is overweight.
		PermanentlyOverweight {
			/// The task's address - the block number and the block's agenda index.
			task: TaskAddress<T::BlockNumber>,

			/// The task's name if it is not anonymous.
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
		///
		/// Only `T::ScheduleOrigin` is allowed to schedule a task.
		/// Only `T::PrioritySetOrigin` is allowed to set the task's priority.
		#[pallet::call_index(0)]
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
		///
		/// The `T::OriginPrivilegeCmp` decides whether the given origin is allowed to cancel the task or not.
		#[pallet::call_index(1)]
		#[pallet::weight(<T as Config>::WeightInfo::cancel(T::MaxScheduledPerBlock::get()))]
		pub fn cancel(origin: OriginFor<T>, when: T::BlockNumber, index: u32) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::RuntimeOrigin::from(origin);
			Self::do_cancel(Some(origin.caller().clone()), (when, index))?;
			Ok(())
		}

		/// Schedule a named task.
		///
		/// Only `T::ScheduleOrigin` is allowed to schedule a task.
		/// Only `T::PrioritySetOrigin` is allowed to set the task's priority.
		#[pallet::call_index(2)]
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
		///
		/// The `T::OriginPrivilegeCmp` decides whether the given origin is allowed to cancel the task or not.
		#[pallet::call_index(3)]
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
		#[pallet::call_index(4)]
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
		/// Only `T::ScheduleOrigin` is allowed to schedule a task.
		/// Only `T::PrioritySetOrigin` is allowed to set the task's priority.
		///
		/// # <weight>
		/// Same as [`schedule_named`](Self::schedule_named).
		/// # </weight>
		#[pallet::call_index(5)]
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

		/// Change a named task's priority.
		///
		/// Only the `T::PrioritySetOrigin` is allowed to change the task's priority.
		#[pallet::call_index(6)]
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
	/// Converts the `DispatchTime` to the `BlockNumber`.
	///
	/// Returns an error if the block number is in the past.
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

	/// Places the mandatory task.
	///
	/// It will try to place the task into the block pointed by the `when` parameter.
	///
	/// If the block has no room for a task,
	/// the function will search for a future block that can accommodate the task.
	fn mandatory_place_task(when: T::BlockNumber, what: ScheduledOf<T>) {
		Self::place_task(when, what, true).expect("mandatory place task always succeeds; qed");
	}

	/// Tries to place a task `what` into the given block `when`.
	///
	/// Returns an error if the block has no room for the task.
	fn try_place_task(
		when: T::BlockNumber,
		what: ScheduledOf<T>,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		Self::place_task(when, what, false)
	}

	/// If `is_mandatory` is true, the function behaves like [`mandatory_place_task`](Self::mandatory_place_task);
	/// otherwise it acts like [`try_place_task`](Self::try_place_task).
	///
	/// The function also updates the `Lookup` storage.
	fn place_task(
		mut when: T::BlockNumber,
		what: ScheduledOf<T>,
		is_mandatory: bool,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		let maybe_name = what.maybe_id;
		let index = Self::push_to_agenda(&mut when, what, is_mandatory)?;
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

	/// Pushes the scheduled task into the block's agenda.
	///
	/// If `is_mandatory` is true, it searches for a block with a free slot for the given task.
	///
	/// If `is_mandatory` is false and there is no free slot, the function returns an error.
	fn push_to_agenda(
		when: &mut T::BlockNumber,
		mut what: ScheduledOf<T>,
		is_mandatory: bool,
	) -> Result<u32, DispatchError> {
		let mut agenda;

		let index = loop {
			agenda = Agenda::<T>::get(*when);

			match agenda.try_push(what) {
				Ok(index) => break index,
				Err(returned_what) if is_mandatory => {
					what = returned_what;
					when.saturating_inc();
				}
				Err(_) => return Err(<Error<T>>::AgendaIsExhausted.into()),
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
		Self::try_place_task(when, task)
	}

	fn do_cancel(
		origin: Option<T::PalletsOrigin>,
		(when, index): TaskAddress<T::BlockNumber>,
	) -> Result<(), DispatchError> {
		let scheduled = Agenda::<T>::try_mutate(
			when,
			|agenda| -> Result<Option<Scheduled<_, _, _, _, _>>, DispatchError> {
				let scheduled = match agenda.get(index) {
					Some(scheduled) => scheduled,
					None => return Ok(None),
				};

				if let Some(ref o) = origin {
					if matches!(
						T::OriginPrivilegeCmp::cmp_privilege(o, &scheduled.origin),
						Some(Ordering::Less) | None
					) {
						return Err(BadOrigin.into());
					}
				}

				Ok(agenda.take(index))
			},
		)?;
		if let Some(s) = scheduled {
			T::Preimages::drop(&s.call);

			if let Some(id) = s.maybe_id {
				Lookup::<T>::remove(id);
			}
			Self::deposit_event(Event::Canceled { when, index });
			Ok(())
		} else {
			Err(Error::<T>::NotFound.into())
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
		Self::try_place_task(when, task)
	}

	fn do_cancel_named(origin: Option<T::PalletsOrigin>, id: TaskName) -> DispatchResult {
		Lookup::<T>::try_mutate_exists(id, |lookup| -> DispatchResult {
			if let Some((when, index)) = lookup.take() {
				Agenda::<T>::try_mutate(when, |agenda| -> DispatchResult {
					let scheduled = match agenda.get(index) {
						Some(scheduled) => scheduled,
						None => return Ok(()),
					};

					if let Some(ref o) = origin {
						if matches!(
							T::OriginPrivilegeCmp::cmp_privilege(o, &scheduled.origin),
							Some(Ordering::Less) | None
						) {
							return Err(BadOrigin.into());
						}
						T::Preimages::drop(&scheduled.call);
					}

					agenda.take(index);

					Ok(())
				})?;
				Self::deposit_event(Event::Canceled { when, index });
				Ok(())
			} else {
				Err(Error::<T>::NotFound.into())
			}
		})
	}

	fn do_change_named_priority(
		origin: T::PalletsOrigin,
		id: TaskName,
		priority: schedule::Priority,
	) -> DispatchResult {
		match Lookup::<T>::get(id) {
			Some((when, index)) => Agenda::<T>::try_mutate(when, |agenda| {
				let scheduled = match agenda.get_mut(index) {
					Some(scheduled) => scheduled,
					None => return Ok(()),
				};

				if matches!(
					T::OriginPrivilegeCmp::cmp_privilege(&origin, &scheduled.origin),
					Some(Ordering::Less) | None
				) {
					return Err(BadOrigin.into());
				}

				scheduled.priority = priority;
				Self::deposit_event(Event::PriorityChanged {
					task: (when, index),
					priority,
				});

				Ok(())
			}),
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
			let task = match agenda.take(agenda_index).take() {
				None => continue,
				Some(t) => t,
			};
			let base_weight = MarginalWeightInfo::<T>::service_task(
				task.call.lookup_len().map(|x| x as usize),
				task.maybe_id.is_some(),
				task.maybe_periodic.is_some(),
			);
			if !weight.can_accrue(base_weight) {
				postponed += 1;
				break;
			}
			let result = Self::service_task(weight, now, when, agenda_index, *executed == 0, task);
			match result {
				Err((Unavailable, slot)) => {
					dropped += 1;
					agenda.set_slot(agenda_index, slot);
				}
				Err((Overweight, slot)) => {
					postponed += 1;
					agenda.set_slot(agenda_index, slot);
				}
				Ok(()) => {
					*executed += 1;
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
			}
		};

		weight.check_accrue(MarginalWeightInfo::<T>::service_task(
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
			Err(Overweight) if is_first && !Self::is_runtime_upgraded() => {
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
			}
			Ok(result) => {
				Self::deposit_event(Event::Dispatched {
					task: (when, agenda_index),
					id: task.maybe_id,
					result,
				});

				let is_canceled = task
					.maybe_id
					.as_ref()
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
						Self::mandatory_place_task(wake, task);
					}
					_ => {
						if let Some(ref id) = task.maybe_id {
							Lookup::<T>::remove(id);
						}

						T::Preimages::drop(&task.call)
					}
				}
				Ok(())
			}
		}
	}

	fn is_runtime_upgraded() -> bool {
		let last = system::LastRuntimeUpgrade::<T>::get();
		let current = T::Version::get();

		last.map(|v| v.was_upgraded(&current)).unwrap_or(true)
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

		let ensured_origin = T::ScheduleOrigin::ensure_origin(dispatch_origin.into());

		let r = match ensured_origin {
			Ok(ScheduledEnsureOriginSuccess::Root) => {
				Ok(call.dispatch_bypass_filter(frame_system::RawOrigin::Root.into()))
			}
			Ok(ScheduledEnsureOriginSuccess::Signed(sender)) => {
				// Execute transaction via chain default pipeline
				// That means dispatch will be processed like any user's extrinsic e.g. transaction fees will be taken
				T::CallExecutor::dispatch_call(Some(sender), call)
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
