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

	// TODO: Make submit_logs infallible, but it shouldn't fail here anyway
	dispatched
		.into_inner()
		.submit_logs()
		.expect("should succeed");
	result
}
