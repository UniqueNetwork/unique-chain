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

use frame_support::{
	dispatch::{DispatchErrorWithPostInfo, DispatchResultWithPostInfo},
	traits::Get,
	weights::Weight,
};
use up_data_structs::{CollectionId, CollectionMode, Pays, PostDispatchInfo};
use pallet_common::{CollectionHandle, CommonCollectionOperations};
use pallet_fungible::FungibleHandle;
use pallet_nonfungible::NonfungibleHandle;
use pallet_refungible::RefungibleHandle;

use crate::Config;

// TODO: move to benchmarking
/// Price of [`dispatch_call`] call with noop `call` argument
pub fn dispatch_weight<T: Config>() -> Weight {
	// Read collection
	<T as frame_system::Config>::DbWeight::get().reads(1)
	// Dynamic dispatch?
	+ 6_000_000
	// submit_logs is measured as part of collection pallets
}

pub enum Dispatched<T: Config> {
	Fungible(FungibleHandle<T>),
	Nonfungible(NonfungibleHandle<T>),
	Refungible(RefungibleHandle<T>),
}
impl<T: Config> Dispatched<T> {
	pub fn dispatch(handle: CollectionHandle<T>) -> Self {
		match handle.mode {
			CollectionMode::Fungible(_) => Self::Fungible(FungibleHandle::cast(handle)),
			CollectionMode::NFT => Self::Nonfungible(NonfungibleHandle::cast(handle)),
			CollectionMode::ReFungible => Self::Refungible(RefungibleHandle::cast(handle)),
		}
	}
	fn into_inner(self) -> CollectionHandle<T> {
		match self {
			Dispatched::Fungible(f) => f.into_inner(),
			Dispatched::Nonfungible(f) => f.into_inner(),
			Dispatched::Refungible(f) => f.into_inner(),
		}
	}
	pub fn as_dyn(&self) -> &dyn CommonCollectionOperations<T> {
		match self {
			Dispatched::Fungible(h) => h,
			Dispatched::Nonfungible(h) => h,
			Dispatched::Refungible(h) => h,
		}
	}
}

/// Helper function to implement substrate calls for common collection methods
pub fn dispatch_call<
	T: Config,
	C: FnOnce(&dyn pallet_common::CommonCollectionOperations<T>) -> DispatchResultWithPostInfo,
>(
	collection: CollectionId,
	call: C,
) -> DispatchResultWithPostInfo {
	let handle =
		CollectionHandle::try_get(collection).map_err(|error| DispatchErrorWithPostInfo {
			post_info: PostDispatchInfo {
				actual_weight: Some(dispatch_weight::<T>()),
				pays_fee: Pays::Yes,
			},
			error,
		})?;
	let dispatched = Dispatched::dispatch(handle);
	let mut result = call(dispatched.as_dyn());
	match &mut result {
		Ok(PostDispatchInfo {
			actual_weight: Some(weight),
			..
		})
		| Err(DispatchErrorWithPostInfo {
			post_info: PostDispatchInfo {
				actual_weight: Some(weight),
				..
			},
			..
		}) => *weight += dispatch_weight::<T>(),
		_ => {}
	}

	dispatched.into_inner().submit_logs();
	result
}
