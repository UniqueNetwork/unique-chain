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

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;

pub mod weights;

#[frame_support::pallet]
pub mod pallet {

	use frame_support::{
		dispatch::*,
		pallet_prelude::*,
		traits::{EnsureOrigin, QueryPreimage, StorePreimage},
	};
	use frame_system::pallet_prelude::*;
	use sp_runtime::traits::Dispatchable;

	use crate::weights::WeightInfo;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// The overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// The aggregated call type.
		type RuntimeCall: Parameter
			+ Dispatchable<RuntimeOrigin = Self::RuntimeOrigin, PostInfo = PostDispatchInfo>
			+ GetDispatchInfo
			+ From<frame_system::Call<Self>>;

		/// The preimage provider with which we look up call hashes to get the call.
		type Preimages: QueryPreimage + StorePreimage;

		/// The Origin that has the right to enable or disable the maintenance mode.
		type ManagerOrigin: EnsureOrigin<<Self as frame_system::Config>::RuntimeOrigin>;

		/// The Origin that has the right to execute preimage.
		type PreimageOrigin: EnsureOrigin<<Self as frame_system::Config>::RuntimeOrigin>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		MaintenanceEnabled,
		MaintenanceDisabled,
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	#[pallet::getter(fn is_enabled)]
	pub type Enabled<T> = StorageValue<_, bool, ValueQuery>;

	#[pallet::error]
	pub enum Error<T> {}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(<T as Config>::WeightInfo::enable())]
		pub fn enable(origin: OriginFor<T>) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin)?;

			<Enabled<T>>::set(true);

			Self::deposit_event(Event::MaintenanceEnabled);

			Ok(())
		}

		#[pallet::call_index(1)]
		#[pallet::weight(<T as Config>::WeightInfo::disable())]
		pub fn disable(origin: OriginFor<T>) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin)?;

			<Enabled<T>>::set(false);

			Self::deposit_event(Event::MaintenanceDisabled);

			Ok(())
		}
	}
}
