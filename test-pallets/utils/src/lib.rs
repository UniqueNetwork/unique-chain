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

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;
	use pallet_unique_scheduler::{ScheduledId, Pallet as SchedulerPallet};

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_unique_scheduler::Config {
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		ValueIsSet,
		ShouldRollback,
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	#[pallet::getter(fn test_value)]
	pub type TestValue<T> = StorageValue<_, u32, ValueQuery>;

	#[pallet::error]
	pub enum Error<T> {
		TriggerRollback,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(10_000)]
		pub fn set_test_value(origin: OriginFor<T>, value: u32) -> DispatchResult {
			ensure_signed(origin)?;

			<TestValue<T>>::put(value);

			Self::deposit_event(Event::ValueIsSet);

			Ok(())
		}

		#[pallet::weight(10_000)]
		pub fn set_test_value_and_rollback(origin: OriginFor<T>, value: u32) -> DispatchResult {
			Self::set_test_value(origin, value)?;

			Self::deposit_event(Event::ShouldRollback);

			Err(<Error<T>>::TriggerRollback.into())
		}

		#[pallet::weight(10_000)]
		pub fn inc_test_value(origin: OriginFor<T>) -> DispatchResult {
			Self::set_test_value(origin, <TestValue<T>>::get() + 1)
		}

		#[pallet::weight(10_000)]
		pub fn self_canceling_inc(
			origin: OriginFor<T>,
			id: ScheduledId,
			max_test_value: u32,
		) -> DispatchResult {
			if <TestValue<T>>::get() < max_test_value {
				Self::inc_test_value(origin)?;
			} else {
				SchedulerPallet::<T>::cancel_named(origin, id)?;
			}

			Ok(())
		}

		#[pallet::weight(100_000_000)]
		pub fn just_take_fee(_origin: OriginFor<T>) -> DispatchResult {
			Ok(())
		}
	}
}
