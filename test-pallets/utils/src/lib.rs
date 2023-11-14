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

#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::pallet_prelude::*;
use frame_system::pallet_prelude::*;
pub use pallet::*;

#[frame_support::pallet(dev_mode)]
pub mod pallet {
	use frame_support::{
		dispatch::{GetDispatchInfo, PostDispatchInfo},
		pallet_prelude::*,
		traits::{IsSubType, OriginTrait, UnfilteredDispatchable},
	};
	use frame_system::pallet_prelude::*;
	use sp_runtime::traits::Dispatchable;
	use sp_std::vec::Vec;

	#[pallet::config]
	pub trait Config: frame_system::Config /*+ pallet_unique_scheduler_v2::Config*/ {
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// The overarching call type.
		type RuntimeCall: Parameter
			+ Dispatchable<
				RuntimeOrigin = <Self as frame_system::Config>::RuntimeOrigin,
				PostInfo = PostDispatchInfo,
			> + GetDispatchInfo
			+ From<frame_system::Call<Self>>
			+ UnfilteredDispatchable<RuntimeOrigin = <Self as frame_system::Config>::RuntimeOrigin>
			+ IsSubType<Call<Self>>
			+ IsType<<Self as frame_system::Config>::RuntimeCall>;
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		ValueIsSet,
		ShouldRollback,
		BatchCompleted,
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	#[pallet::getter(fn is_enabled)]
	pub type Enabled<T> = StorageValue<_, bool, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn test_value)]
	pub type TestValue<T> = StorageValue<_, u32, ValueQuery>;

	#[pallet::error]
	pub enum Error<T> {
		TestPalletDisabled,
		TriggerRollback,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(10_000)]
		pub fn enable(origin: OriginFor<T>) -> DispatchResult {
			ensure_root(origin)?;
			<Enabled<T>>::set(true);

			Ok(())
		}

		#[pallet::call_index(1)]
		#[pallet::weight(10_000)]
		pub fn set_test_value(origin: OriginFor<T>, value: u32) -> DispatchResult {
			Self::ensure_origin_and_enabled(origin)?;

			<TestValue<T>>::put(value);

			Self::deposit_event(Event::ValueIsSet);

			Ok(())
		}

		#[pallet::call_index(2)]
		#[pallet::weight(10_000)]
		pub fn set_test_value_and_rollback(origin: OriginFor<T>, value: u32) -> DispatchResult {
			Self::set_test_value(origin, value)?;

			Self::deposit_event(Event::ShouldRollback);

			Err(<Error<T>>::TriggerRollback.into())
		}

		#[pallet::call_index(3)]
		#[pallet::weight(10_000)]
		pub fn inc_test_value(origin: OriginFor<T>) -> DispatchResult {
			Self::set_test_value(origin, <TestValue<T>>::get() + 1)
		}

		// #[pallet::weight(10_000)]
		// pub fn self_canceling_inc(
		// 	origin: OriginFor<T>,
		// 	id: TaskName,
		// 	max_test_value: u32,
		// ) -> DispatchResult {
		// 	Self::ensure_origin_and_enabled(origin.clone())?;
		// 	Self::inc_test_value(origin.clone())?;

		// 	if <TestValue<T>>::get() == max_test_value {
		// 		SchedulerPallet::<T>::cancel_named(origin, id)?;
		// 	}

		// 	Ok(())
		// }

		#[pallet::call_index(4)]
		#[pallet::weight(100_000_000)]
		pub fn just_take_fee(origin: OriginFor<T>) -> DispatchResult {
			Self::ensure_origin_and_enabled(origin)?;
			Ok(())
		}

		#[pallet::call_index(5)]
		#[pallet::weight(10_000)]
		pub fn batch_all(
			origin: OriginFor<T>,
			calls: Vec<<T as Config>::RuntimeCall>,
		) -> DispatchResultWithPostInfo {
			Self::ensure_origin_and_enabled(origin.clone())?;

			let is_root = ensure_root(origin.clone()).is_ok();

			for call in calls {
				if is_root {
					call.dispatch_bypass_filter(origin.clone())?;
				} else {
					let mut filtered_origin = origin.clone();
					// Don't allow users to nest `batch_all` calls.
					filtered_origin.add_filter(
						move |c: &<T as frame_system::Config>::RuntimeCall| {
							let c = <T as Config>::RuntimeCall::from_ref(c);
							!matches!(c.is_sub_type(), Some(Call::batch_all { .. }))
						},
					);
					call.dispatch(filtered_origin)?;
				}
			}

			Self::deposit_event(Event::BatchCompleted);
			Ok(None::<Weight>.into())
		}

		#[pallet::call_index(6)]
		#[pallet::weight(*w)]
		pub fn consume_block_space(
			origin: OriginFor<T>,
			w: Weight,
			_consume_block_len_array: Vec<u8>,
		) -> DispatchResult {
			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	fn ensure_origin_and_enabled(origin: OriginFor<T>) -> DispatchResult {
		ensure_signed(origin)?;
		<Enabled<T>>::get()
			.then_some(())
			.ok_or(<Error<T>>::TestPalletDisabled.into())
	}
}
