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

//! # Schedulerdo_reschedule
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

pub mod weights;

use sp_core::H160;
use codec::{Codec, Decode, Encode};
use frame_system::{self as system, ensure_signed};
pub use pallet::*;
use scale_info::TypeInfo;
use sp_runtime::{
	traits::{BadOrigin, One, Saturating, Zero},
	RuntimeDebug, DispatchErrorWithPostInfo,
};
use sp_std::{borrow::Borrow, cmp::Ordering, marker::PhantomData, prelude::*};

use frame_support::{
	dispatch::{DispatchError, DispatchResult, Dispatchable, Parameter},
	traits::{
		schedule::{self, DispatchTime, MaybeHashed},
		NamedReservableCurrency, EnsureOrigin, Get, IsType, OriginTrait, PrivilegeCmp,
		StorageVersion,
	},
	weights::{GetDispatchInfo, Weight},
};

pub use weights::WeightInfo;

/// Just a simple index for naming period tasks.
pub type PeriodicIndex = u32;
/// The location of a scheduled task that can be used to remove it.
pub type TaskAddress<BlockNumber> = (BlockNumber, u32);
pub const MAX_TASK_ID_LENGTH_IN_BYTES: u8 = 16;

type ScheduledId = [u8; MAX_TASK_ID_LENGTH_IN_BYTES as usize];
pub type CallOrHashOf<T> = MaybeHashed<<T as Config>::Call, <T as frame_system::Config>::Hash>;

/// Information regarding an item to be executed in the future.
#[cfg_attr(any(feature = "std", test), derive(PartialEq, Eq))]
#[derive(Clone, RuntimeDebug, Encode, Decode, TypeInfo)]
pub struct ScheduledV3<Call, BlockNumber, PalletsOrigin, AccountId> {
	/// The unique identity for this task, if there is one.
	maybe_id: Option<ScheduledId>,
	/// This task's priority.
	priority: schedule::Priority,
	/// The call to be dispatched.
	call: Call,
	/// If the call is periodic, then this points to the information concerning that.
	maybe_periodic: Option<schedule::Period<BlockNumber>>,
	/// The origin to dispatch the call.
	origin: PalletsOrigin,
	_phantom: PhantomData<AccountId>,
}

pub type ScheduledV3Of<T> = ScheduledV3<
	CallOrHashOf<T>,
	<T as frame_system::Config>::BlockNumber,
	<T as Config>::PalletsOrigin,
	<T as frame_system::Config>::AccountId,
>;

pub type ScheduledOf<T> = ScheduledV3Of<T>;

/// The current version of Scheduled struct.
pub type Scheduled<Call, BlockNumber, PalletsOrigin, AccountId> =
	ScheduledV3<Call, BlockNumber, PalletsOrigin, AccountId>;

#[cfg(feature = "runtime-benchmarks")]
mod preimage_provider {
	use frame_support::traits::PreimageRecipient;
	pub trait PreimageProviderAndMaybeRecipient<H>: PreimageRecipient<H> {}
	impl<H, T: PreimageRecipient<H>> PreimageProviderAndMaybeRecipient<H> for T {}
}

#[cfg(not(feature = "runtime-benchmarks"))]
mod preimage_provider {
	use frame_support::traits::PreimageProvider;
	pub trait PreimageProviderAndMaybeRecipient<H>: PreimageProvider<H> {}
	impl<H, T: PreimageProvider<H>> PreimageProviderAndMaybeRecipient<H> for T {}
}

pub use preimage_provider::PreimageProviderAndMaybeRecipient;

pub(crate) trait MarginalWeightInfo: WeightInfo {
	fn item(periodic: bool, named: bool, resolved: Option<bool>) -> Weight {
		match (periodic, named, resolved) {
			(_, false, None) => Self::on_initialize_aborted(2) - Self::on_initialize_aborted(1),
			(_, true, None) => {
				Self::on_initialize_named_aborted(2) - Self::on_initialize_named_aborted(1)
			}
			(false, false, Some(false)) => Self::on_initialize(2) - Self::on_initialize(1),
			(false, true, Some(false)) => {
				Self::on_initialize_named(2) - Self::on_initialize_named(1)
			}
			(true, false, Some(false)) => {
				Self::on_initialize_periodic(2) - Self::on_initialize_periodic(1)
			}
			(true, true, Some(false)) => {
				Self::on_initialize_periodic_named(2) - Self::on_initialize_periodic_named(1)
			}
			(false, false, Some(true)) => {
				Self::on_initialize_resolved(2) - Self::on_initialize_resolved(1)
			}
			(false, true, Some(true)) => {
				Self::on_initialize_named_resolved(2) - Self::on_initialize_named_resolved(1)
			}
			(true, false, Some(true)) => {
				Self::on_initialize_periodic_resolved(2) - Self::on_initialize_periodic_resolved(1)
			}
			(true, true, Some(true)) => {
				Self::on_initialize_periodic_named_resolved(2)
					- Self::on_initialize_periodic_named_resolved(1)
			}
		}
	}
}
impl<T: WeightInfo> MarginalWeightInfo for T {}

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{
		dispatch::PostDispatchInfo,
		pallet_prelude::*,
		traits::{schedule::LookupError, PreimageProvider},
	};
	use frame_system::pallet_prelude::*;

	/// The current storage version.
	const STORAGE_VERSION: StorageVersion = StorageVersion::new(3);

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	#[pallet::storage_version(STORAGE_VERSION)]
	#[pallet::without_storage_info]
	pub struct Pallet<T>(_);

	/// `system::Config` should always be included in our implied traits.
	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// The overarching event type.
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;

		/// The aggregated origin which the dispatch will take.
		type Origin: OriginTrait<PalletsOrigin = Self::PalletsOrigin>
			+ From<Self::PalletsOrigin>
			+ IsType<<Self as system::Config>::Origin>;

		/// The caller origin, overarching type of all pallets origins.
		type PalletsOrigin: From<system::RawOrigin<Self::AccountId>> + Codec + Clone + Eq + TypeInfo;

		type Currency: NamedReservableCurrency<Self::AccountId, ReserveIdentifier = ScheduledId>;

		/// The aggregated call type.
		type Call: Parameter
			+ Dispatchable<Origin = <Self as Config>::Origin, PostInfo = PostDispatchInfo>
			+ GetDispatchInfo
			+ From<system::Call<Self>>;

		/// The maximum weight that may be scheduled per block for any dispatchables of less
		/// priority than `schedule::HARD_DEADLINE`.
		#[pallet::constant]
		type MaximumWeight: Get<Weight>;

		/// Required origin to schedule or cancel calls.
		type ScheduleOrigin: EnsureOrigin<<Self as system::Config>::Origin>;

		/// Compare the privileges of origins.
		///
		/// This will be used when canceling a task, to ensure that the origin that tries
		/// to cancel has greater or equal privileges as the origin that created the scheduled task.
		///
		/// For simplicity the [`EqualPrivilegeOnly`](frame_support::traits::EqualPrivilegeOnly) can
		/// be used. This will only check if two given origins are equal.
		type OriginPrivilegeCmp: PrivilegeCmp<Self::PalletsOrigin>;

		/// The maximum number of scheduled calls in the queue for a single block.
		/// Not strictly enforced, but used for weight estimation.
		#[pallet::constant]
		type MaxScheduledPerBlock: Get<u32>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;

		/// The preimage provider with which we look up call hashes to get the call.
		type PreimageProvider: PreimageProviderAndMaybeRecipient<Self::Hash>;

		/// If `Some` then the number of blocks to postpone execution for when the item is delayed.
		type NoPreimagePostponement: Get<Option<Self::BlockNumber>>;

		/// Sponsoring function.
		// type SponsorshipHandler: SponsorshipHandler<Self::AccountId, <Self as Config>::Call>;

		/// The helper type used for custom transaction fee logic.
		type CallExecutor: DispatchCall<Self, H160>;
	}

	/// A Scheduler-Runtime interface for finer payment handling.
	pub trait DispatchCall<T: frame_system::Config + Config, SelfContainedSignedInfo> {
		fn reserve_balance(
			id: ScheduledId,
			sponsor: <T as frame_system::Config>::AccountId,
			call: <T as Config>::Call,
			count: u32,
		) -> Result<(), DispatchError>;

		fn pay_for_call(
			id: ScheduledId,
			sponsor: <T as frame_system::Config>::AccountId,
			call: <T as Config>::Call,
		) -> Result<u128, DispatchError>;

		/// Resolve the call dispatch, including any post-dispatch operations.
		fn dispatch_call(
			signer: T::AccountId,
			function: <T as Config>::Call,
		) -> Result<
			Result<PostDispatchInfo, DispatchErrorWithPostInfo<PostDispatchInfo>>,
			TransactionValidityError,
		>;

		fn cancel_reserve(
			id: ScheduledId,
			sponsor: <T as frame_system::Config>::AccountId,
		) -> Result<u128, DispatchError>;
	}

	/// Items to be executed, indexed by the block number that they should be executed on.
	#[pallet::storage]
	pub type Agenda<T: Config> =
		StorageMap<_, Twox64Concat, T::BlockNumber, Vec<Option<ScheduledV3Of<T>>>, ValueQuery>;

	/// Lookup from identity to the block number and index of the task.
	#[pallet::storage]
	pub(crate) type Lookup<T: Config> =
		StorageMap<_, Twox64Concat, ScheduledId, TaskAddress<T::BlockNumber>>;

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
			id: Option<ScheduledId>,
			result: DispatchResult,
		},
		/// The call for the provided hash was not found so the task has been aborted.
		CallLookupFailed {
			task: TaskAddress<T::BlockNumber>,
			id: Option<ScheduledId>,
			error: LookupError,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Failed to schedule a call
		FailedToSchedule,
		/// Cannot find the scheduled call.
		NotFound,
		/// Given target block number is in the past.
		TargetBlockNumberInPast,
		/// Reschedule failed because it does not change scheduled time.
		RescheduleNoChange,
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		/// Execute the scheduled calls
		fn on_initialize(now: T::BlockNumber) -> Weight {
			let limit = T::MaximumWeight::get();

			let mut queued = Agenda::<T>::take(now)
				.into_iter()
				.enumerate()
				.filter_map(|(index, s)| Some((index as u32, s?)))
				.collect::<Vec<_>>();

			if queued.len() as u32 > T::MaxScheduledPerBlock::get() {
				log::warn!(
					target: "runtime::scheduler",
					"Warning: This block has more items queued in Scheduler than \
					expected from the runtime configuration. An update might be needed."
				);
			}

			queued.sort_by_key(|(_, s)| s.priority);

			let next = now + One::one();

			let mut total_weight: Weight = T::WeightInfo::on_initialize(0);
			for (order, (index, mut s)) in queued.into_iter().enumerate() {
				let named = if let Some(ref id) = s.maybe_id {
					Lookup::<T>::remove(id);
					true
				} else {
					false
				};

				let (call, maybe_completed) = s.call.resolved::<T::PreimageProvider>();
				s.call = call;

				let resolved = if let Some(completed) = maybe_completed {
					T::PreimageProvider::unrequest_preimage(&completed);
					true
				} else {
					false
				};
				let call = match s.call.as_value().cloned() {
					Some(c) => c,
					None => {
						// Preimage not available - postpone until some block.
						total_weight.saturating_accrue(T::WeightInfo::item(false, named, None));
						if let Some(delay) = T::NoPreimagePostponement::get() {
							let until = now.saturating_add(delay);
							if let Some(ref id) = s.maybe_id {
								let index = Agenda::<T>::decode_len(until).unwrap_or(0);
								Lookup::<T>::insert(id, (until, index as u32));
							}
							Agenda::<T>::append(until, Some(s));
						}
						continue;
					}
				};

				let periodic = s.maybe_periodic.is_some();
				let call_weight = call.get_dispatch_info().weight;
				let mut item_weight = T::WeightInfo::item(periodic, named, Some(resolved));
				let origin =
					<<T as Config>::Origin as From<T::PalletsOrigin>>::from(s.origin.clone())
						.into();
				if ensure_signed(origin).is_ok() {
					// Weights of Signed dispatches expect their signing account to be whitelisted.
					item_weight.saturating_accrue(T::DbWeight::get().reads_writes(1, 1));
				}

				// We allow a scheduled call if any is true:
				// - It's priority is `HARD_DEADLINE`
				// - It does not push the weight past the limit.
				// - It is the first item in the schedule
				let hard_deadline = s.priority <= schedule::HARD_DEADLINE;
				let test_weight = total_weight
					.saturating_add(call_weight)
					.saturating_add(item_weight);
				if !hard_deadline && order > 0 && test_weight > limit {
					// Cannot be scheduled this block - postpone until next.
					total_weight.saturating_accrue(T::WeightInfo::item(false, named, None));
					if let Some(ref id) = s.maybe_id {
						// NOTE: We could reasonably not do this (in which case there would be one
						// block where the named and delayed item could not be referenced by name),
						// but we will do it anyway since it should be mostly free in terms of
						// weight and it is slightly cleaner.
						let index = Agenda::<T>::decode_len(next).unwrap_or(0);
						Lookup::<T>::insert(id, (next, index as u32));
					}
					Agenda::<T>::append(next, Some(s));
					continue;
				}

				let sender = ensure_signed(
					<<T as Config>::Origin as From<T::PalletsOrigin>>::from(s.origin.clone())
						.into(),
				)
				.unwrap();

				// // if call have id it was be reserved
				// if s.maybe_id.is_some() {
				// 	let _ = T::CallExecutor::pay_for_call(
				// 		s.maybe_id.unwrap(),
				// 		sender.clone(),
				// 		call.clone(),
				// 	);
				// }

				let r = T::CallExecutor::dispatch_call(sender, call.clone());

				let mut actual_call_weight: Weight = item_weight;
				let result: Result<_, DispatchError> = match r {
					Ok(o) => match o {
						Ok(di) => {
							actual_call_weight = di.actual_weight.unwrap_or(item_weight);
							Ok(())
						}
						Err(err) => Err(err.error),
					},
					Err(_) => {
						log::error!(
							target: "runtime::scheduler",
							"Warning: Scheduler has failed to execute a post-dispatch transaction. \
							This block might have become invalid.");
						Err(DispatchError::CannotLookup)
					} // todo possibly force a skip/return here, do something with the error
				};

				total_weight.saturating_accrue(item_weight);
				total_weight.saturating_accrue(actual_call_weight);

				Self::deposit_event(Event::Dispatched {
					task: (now, index),
					id: s.maybe_id.clone(),
					result,
				});

				if let &Some((period, count)) = &s.maybe_periodic {
					if count > 1 {
						s.maybe_periodic = Some((period, count - 1));
					} else {
						s.maybe_periodic = None;
					}
					let wake = now + period;
					// If scheduled is named, place its information in `Lookup`
					if let Some(ref id) = s.maybe_id {
						let wake_index = Agenda::<T>::decode_len(wake).unwrap_or(0);
						Lookup::<T>::insert(id, (wake, wake_index as u32));
					}
					Agenda::<T>::append(wake, Some(s));
				}
			}
			0
			//total_weight
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Schedule a named task.
		#[pallet::weight(<T as Config>::WeightInfo::schedule_named(T::MaxScheduledPerBlock::get()))]
		pub fn schedule_named(
			origin: OriginFor<T>,
			id: ScheduledId,
			when: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: schedule::Priority,
			call: Box<CallOrHashOf<T>>,
		) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_schedule_named(
				id,
				DispatchTime::At(when),
				maybe_periodic,
				priority,
				origin.caller().clone(),
				*call,
			)?;
			Ok(())
		}

		/// Cancel a named scheduled task.
		#[pallet::weight(<T as Config>::WeightInfo::cancel_named(T::MaxScheduledPerBlock::get()))]
		pub fn cancel_named(origin: OriginFor<T>, id: ScheduledId) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_cancel_named(Some(origin.caller().clone()), id)?;
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
			id: ScheduledId,
			after: T::BlockNumber,
			maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
			priority: schedule::Priority,
			call: Box<CallOrHashOf<T>>,
		) -> DispatchResult {
			T::ScheduleOrigin::ensure_origin(origin.clone())?;
			let origin = <T as Config>::Origin::from(origin);
			Self::do_schedule_named(
				id,
				DispatchTime::After(after),
				maybe_periodic,
				priority,
				origin.caller().clone(),
				*call,
			)?;
			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	#[cfg(feature = "try-runtime")]
	pub fn pre_migrate_to_v3() -> Result<(), &'static str> {
		Ok(())
	}

	#[cfg(feature = "try-runtime")]
	pub fn post_migrate_to_v3() -> Result<(), &'static str> {
		use frame_support::dispatch::GetStorageVersion;

		assert!(Self::current_storage_version() == 3);
		for k in Agenda::<T>::iter_keys() {
			let _ = Agenda::<T>::try_get(k).map_err(|()| "Invalid item in Agenda")?;
		}
		Ok(())
	}

	/// Helper to migrate scheduler when the pallet origin type has changed.
	pub fn migrate_origin<OldOrigin: Into<T::PalletsOrigin> + codec::Decode>() {
		Agenda::<T>::translate::<
			Vec<Option<Scheduled<CallOrHashOf<T>, T::BlockNumber, OldOrigin, T::AccountId>>>,
			_,
		>(|_, agenda| {
			Some(
				agenda
					.into_iter()
					.map(|schedule| {
						schedule.map(|schedule| Scheduled {
							maybe_id: schedule.maybe_id,
							priority: schedule.priority,
							call: schedule.call,
							maybe_periodic: schedule.maybe_periodic,
							origin: schedule.origin.into(),
							_phantom: Default::default(),
						})
					})
					.collect::<Vec<_>>(),
			)
		});
	}

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
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: CallOrHashOf<T>,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		let when = Self::resolve_time(when)?;
		call.ensure_requested::<T::PreimageProvider>();

		// sanitize maybe_periodic
		let maybe_periodic = maybe_periodic
			.filter(|p| p.1 > 1 && !p.0.is_zero())
			// Remove one from the number of repetitions since we will schedule one now.
			.map(|(p, c)| (p, c - 1));
		let s = Some(Scheduled {
			maybe_id: None,
			priority,
			call,
			maybe_periodic,
			origin,
			_phantom: PhantomData::<T::AccountId>::default(),
		});
		Agenda::<T>::append(when, s);
		let index = Agenda::<T>::decode_len(when).unwrap_or(1) as u32 - 1;
		Self::deposit_event(Event::Scheduled { when, index });

		Ok((when, index))
	}

	fn do_cancel(
		origin: Option<T::PalletsOrigin>,
		(when, index): TaskAddress<T::BlockNumber>,
	) -> Result<(), DispatchError> {
		let scheduled = Agenda::<T>::try_mutate(when, |agenda| {
			agenda.get_mut(index as usize).map_or(
				Ok(None),
				|s| -> Result<Option<Scheduled<_, _, _, _>>, DispatchError> {
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
			s.call.ensure_unrequested::<T::PreimageProvider>();
			if let Some(id) = s.maybe_id {
				Lookup::<T>::remove(id);
			}
			Self::deposit_event(Event::Canceled { when, index });
			Ok(())
		} else {
			Err(Error::<T>::NotFound)?
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
		Self::deposit_event(Event::Canceled { when, index });
		Self::deposit_event(Event::Scheduled {
			when: new_time,
			index: new_index,
		});

		Ok((new_time, new_index))
	}

	fn do_schedule_named(
		id: ScheduledId,
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: CallOrHashOf<T>,
	) -> Result<TaskAddress<T::BlockNumber>, DispatchError> {
		// ensure id it is unique
		if Lookup::<T>::contains_key(&id) {
			return Err(Error::<T>::FailedToSchedule)?;
		}

		let when = Self::resolve_time(when)?;

		call.ensure_requested::<T::PreimageProvider>();

		// sanitize maybe_periodic
		let maybe_periodic = maybe_periodic
			.filter(|p| p.1 > 1 && !p.0.is_zero())
			// Remove one from the number of repetitions since we will schedule one now.
			.map(|(p, c)| (p, c - 1));

		let s = Scheduled {
			maybe_id: Some(id.clone()),
			priority,
			call: call.clone(),
			maybe_periodic,
			origin: origin.clone(),
			_phantom: Default::default(),
		};

		// reserve balance for periodic execution
		// let sender =
		// 	ensure_signed(<<T as Config>::Origin as From<T::PalletsOrigin>>::from(origin).into())?;
		// let repeats = match maybe_periodic {
		// 	Some(p) => p.1,
		// 	None => 1,
		// };
		// let _ = T::CallExecutor::reserve_balance(
		// 	id.clone(),
		// 	sender,
		// 	call.as_value().unwrap().clone(),
		// 	repeats,
		// );

		Agenda::<T>::append(when, Some(s));
		let index = Agenda::<T>::decode_len(when).unwrap_or(1) as u32 - 1;
		let address = (when, index);
		Lookup::<T>::insert(&id, &address);
		Self::deposit_event(Event::Scheduled { when, index });

		Ok(address)
	}

	fn do_cancel_named(origin: Option<T::PalletsOrigin>, id: ScheduledId) -> DispatchResult {
		Lookup::<T>::try_mutate_exists(id, |lookup| -> DispatchResult {
			if let Some((when, index)) = lookup.take() {
				let i = index as usize;
				Agenda::<T>::try_mutate(when, |agenda| -> DispatchResult {
					if let Some(s) = agenda.get_mut(i) {
						if let (Some(ref o), Some(ref s)) = (origin.clone(), s.borrow()) {
							if matches!(
								T::OriginPrivilegeCmp::cmp_privilege(o, &s.origin),
								Some(Ordering::Less) | None
							) {
								return Err(BadOrigin.into());
							}
							// release balance reserve
							// let sender = ensure_signed(
							// 	<<T as Config>::Origin as From<T::PalletsOrigin>>::from(
							// 		origin.unwrap(),
							// 	)
							// 	.into(),
							// )?;
							// let _ = T::CallExecutor::cancel_reserve(id, sender);

							s.call.ensure_unrequested::<T::PreimageProvider>();
						}
						*s = None;
					}
					Ok(())
				})?;

				Self::deposit_event(Event::Canceled { when, index });
				Ok(())
			} else {
				Err(Error::<T>::NotFound)?
			}
		})
	}

	fn do_reschedule_named(
		id: ScheduledId,
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
				Self::deposit_event(Event::Canceled { when, index });
				Self::deposit_event(Event::Scheduled {
					when: new_time,
					index: new_index,
				});

				*lookup = Some((new_time, new_index));

				Ok((new_time, new_index))
			},
		)
	}
}

impl<T: Config> schedule::v2::Anon<T::BlockNumber, <T as Config>::Call, T::PalletsOrigin>
	for Pallet<T>
{
	type Address = TaskAddress<T::BlockNumber>;
	type Hash = T::Hash;

	fn schedule(
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: CallOrHashOf<T>,
	) -> Result<Self::Address, DispatchError> {
		Self::do_schedule(when, maybe_periodic, priority, origin, call)
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

impl<T: Config> schedule::v2::Named<T::BlockNumber, <T as Config>::Call, T::PalletsOrigin>
	for Pallet<T>
{
	type Address = TaskAddress<T::BlockNumber>;
	type Hash = T::Hash;

	fn schedule_named(
		id: Vec<u8>,
		when: DispatchTime<T::BlockNumber>,
		maybe_periodic: Option<schedule::Period<T::BlockNumber>>,
		priority: schedule::Priority,
		origin: T::PalletsOrigin,
		call: CallOrHashOf<T>,
	) -> Result<Self::Address, ()> {
		let inner_id: ScheduledId = id
			.try_into()
			.unwrap_or([0; MAX_TASK_ID_LENGTH_IN_BYTES as usize]);
		Self::do_schedule_named(inner_id, when, maybe_periodic, priority, origin, call)
			.map_err(|_| ())
	}

	fn cancel_named(id: Vec<u8>) -> Result<(), ()> {
		let inner_id: ScheduledId = id
			.try_into()
			.unwrap_or([0; MAX_TASK_ID_LENGTH_IN_BYTES as usize]);
		Self::do_cancel_named(None, inner_id).map_err(|_| ())
	}

	fn reschedule_named(
		id: Vec<u8>,
		when: DispatchTime<T::BlockNumber>,
	) -> Result<Self::Address, DispatchError> {
		let inner_id: ScheduledId = id
			.try_into()
			.unwrap_or([0; MAX_TASK_ID_LENGTH_IN_BYTES as usize]);
		Self::do_reschedule_named(inner_id, when)
	}

	fn next_dispatch_time(id: Vec<u8>) -> Result<T::BlockNumber, ()> {
		let inner_id: ScheduledId = id
			.try_into()
			.unwrap_or([0; MAX_TASK_ID_LENGTH_IN_BYTES as usize]);
		Lookup::<T>::get(inner_id)
			.and_then(|(when, index)| Agenda::<T>::get(when).get(index as usize).map(|_| when))
			.ok_or(())
	}
}
