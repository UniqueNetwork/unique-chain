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
	use frame_support::{dispatch::*, pallet_prelude::*};
	use frame_support::{
		traits::{QueryPreimage, StorePreimage, EnsureOrigin},
	};
	use frame_system::pallet_prelude::*;
	use sp_core::H256;

	use crate::weights::WeightInfo;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// The overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// The runtime origin type.
		type RuntimeOrigin: From<RawOrigin<Self::AccountId>>
			+ IsType<<Self as frame_system::Config>::RuntimeOrigin>;

		/// The aggregated call type.
		type RuntimeCall: Parameter
			+ Dispatchable<
				RuntimeOrigin = <Self as Config>::RuntimeOrigin,
				PostInfo = PostDispatchInfo,
			> + GetDispatchInfo
			+ From<frame_system::Call<Self>>;

		/// The preimage provider with which we look up call hashes to get the call.
		type Preimages: QueryPreimage + StorePreimage;

		/// The Origin that has the right to enable or disable the maintenance mode
		type ManagerOrigin: EnsureOrigin<<Self as frame_system::Config>::RuntimeOrigin>;

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

		/// Execute a runtime call stored as a preimage.
		///
		/// `weight_bound` is the maximum weight that the caller is willing
		/// to allow the extrinsic to be executed with.
		#[pallet::call_index(2)]
		#[pallet::weight(<T as Config>::WeightInfo::execute_preimage() + *weight_bound)]
		pub fn execute_preimage(
			origin: OriginFor<T>,
			hash: H256,
			weight_bound: Weight,
		) -> DispatchResultWithPostInfo {
			use codec::Decode;

			T::ManagerOrigin::ensure_origin(origin)?;

			let data = T::Preimages::fetch(&hash, None)?;
			weight_bound.set_proof_size(
				weight_bound
					.proof_size()
					.checked_sub(
						data.len()
							.try_into()
							.map_err(|_| DispatchError::Corruption)?,
					)
					.ok_or(DispatchError::Exhausted)?,
			);

			let call = <T as Config>::RuntimeCall::decode(&mut &data[..])
				.map_err(|_| DispatchError::Corruption)?;

			ensure!(
				call.get_dispatch_info().weight.all_lte(weight_bound),
				DispatchError::Exhausted
			);

			match call.dispatch(frame_system::RawOrigin::Root.into()) {
				Ok(_) => Ok(Pays::No.into()),
				Err(error_and_info) => Err(DispatchErrorWithPostInfo {
					post_info: Pays::No.into(),
					error: error_and_info.error,
				}),
			}
		}
	}
}
