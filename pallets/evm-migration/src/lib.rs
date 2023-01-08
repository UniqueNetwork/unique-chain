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

#![doc = include_str!("../README.md")]
#![cfg_attr(not(feature = "std"), no_std)]
#![deny(missing_docs)]

pub use pallet::*;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod weights;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{
		pallet_prelude::{*, DispatchResult},
		traits::IsType,
	};
	use frame_system::pallet_prelude::{*, OriginFor};
	use sp_core::{H160, H256};
	use sp_std::vec::Vec;
	use super::weights::WeightInfo;
	use pallet_evm::{PrecompileHandle, Pallet as PalletEvm};

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm::Config {
		/// Weights
		type WeightInfo: WeightInfo;
		/// The overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
	}

	type SelfWeightOf<T> = <T as Config>::WeightInfo;

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::event]
	pub enum Event<T: Config> {
		/// This event is used in benchmarking and can be used for tests
		TestEvent,
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Can only migrate to empty address.
		AccountNotEmpty,
		/// Migration of this account is not yet started, or already finished.
		AccountIsNotMigrating,
		/// Failed to decode event bytes
		BadEvent,
	}

	#[pallet::storage]
	pub(super) type MigrationPending<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = H160, Value = bool, QueryKind = ValueQuery>;

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Start contract migration, inserts contract stub at target address,
		/// and marks account as pending, allowing to insert storage
		#[pallet::call_index(0)]
		#[pallet::weight(<SelfWeightOf<T>>::begin())]
		pub fn begin(origin: OriginFor<T>, address: H160) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(
				<PalletEvm<T>>::is_account_empty(&address) && !<MigrationPending<T>>::get(&address),
				<Error<T>>::AccountNotEmpty,
			);

			<MigrationPending<T>>::insert(address, true);
			Ok(())
		}

		/// Insert items into contract storage, this method can be called
		/// multiple times
		#[pallet::call_index(1)]
		#[pallet::weight(<SelfWeightOf<T>>::set_data(data.len() as u32))]
		pub fn set_data(
			origin: OriginFor<T>,
			address: H160,
			data: Vec<(H256, H256)>,
		) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(
				<MigrationPending<T>>::get(&address),
				<Error<T>>::AccountIsNotMigrating,
			);

			for (k, v) in data {
				<pallet_evm::AccountStorages<T>>::insert(&address, k, v);
			}
			Ok(())
		}

		/// Finish contract migration, allows it to be called.
		/// It is not possible to alter contract storage via [`Self::set_data`]
		/// after this call.
		#[pallet::call_index(2)]
		#[pallet::weight(<SelfWeightOf<T>>::finish(code.len() as u32))]
		pub fn finish(origin: OriginFor<T>, address: H160, code: Vec<u8>) -> DispatchResult {
			ensure_root(origin)?;
			ensure!(
				<MigrationPending<T>>::get(&address),
				<Error<T>>::AccountIsNotMigrating,
			);

			<pallet_evm::AccountCodes<T>>::insert(&address, code);
			<MigrationPending<T>>::remove(address);
			Ok(())
		}

		/// Create ethereum events attached to the fake transaction
		#[pallet::call_index(3)]
		#[pallet::weight(<SelfWeightOf<T>>::insert_eth_logs(logs.len() as u32))]
		pub fn insert_eth_logs(origin: OriginFor<T>, logs: Vec<ethereum::Log>) -> DispatchResult {
			ensure_root(origin)?;
			for log in logs {
				<pallet_evm::Pallet<T>>::deposit_log(log);
			}
			// Transactions is created by FakeTransactionFinalizer
			Ok(())
		}

		/// Create substrate events
		#[pallet::call_index(4)]
		#[pallet::weight(<SelfWeightOf<T>>::insert_events(events.len() as u32))]
		pub fn insert_events(origin: OriginFor<T>, events: Vec<Vec<u8>>) -> DispatchResult {
			ensure_root(origin)?;
			for event in events {
				<frame_system::Pallet<T>>::deposit_event(
					<T as frame_system::Config>::RuntimeEvent::decode(&mut event.as_slice())
						.map_err(|_| <Error<T>>::BadEvent)?,
				);
			}
			Ok(())
		}
	}

	/// Implements [`pallet_evm::OnMethodCall`], which reserves accounts with pending migration
	pub struct OnMethodCall<T>(PhantomData<T>);
	impl<T: Config> pallet_evm::OnMethodCall<T> for OnMethodCall<T> {
		fn is_reserved(contract: &H160) -> bool {
			<MigrationPending<T>>::get(&contract)
		}

		fn is_used(_contract: &H160) -> bool {
			false
		}

		fn call(_handle: &mut impl PrecompileHandle) -> Option<pallet_evm::PrecompileResult> {
			None
		}

		fn get_code(_contract: &H160) -> Option<Vec<u8>> {
			None
		}
	}
}
