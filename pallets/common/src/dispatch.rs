//! Module with interfaces for dispatching collections.

use frame_support::{
	dispatch::{
		DispatchResultWithPostInfo, PostDispatchInfo, Weight, DispatchErrorWithPostInfo,
		DispatchResult,
	},
	weights::Pays,
	traits::Get,
};
use up_data_structs::{CollectionId, CreateCollectionData};

use crate::{pallet::Config, CommonCollectionOperations, CollectionHandle};

// TODO: move to benchmarking
/// Price of [`dispatch_tx`] call with noop `call` argument
pub fn dispatch_weight<T: Config>() -> Weight {
	// Read collection
	<T as frame_system::Config>::DbWeight::get().reads(1)
	// Dynamic dispatch?
	+ 6_000_000
	// submit_logs is measured as part of collection pallets
}

/// Helper function to implement substrate calls for common collection methods.
///
/// * `collection` - The collection on which to call the method.
/// * `call` - The function in which to call the corresponding method from [`CommonCollectionOperations`].
pub fn dispatch_tx<
	T: Config,
	C: FnOnce(&dyn CommonCollectionOperations<T>) -> DispatchResultWithPostInfo,
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
	handle
		.check_is_internal()
		.map_err(|error| DispatchErrorWithPostInfo {
			post_info: PostDispatchInfo {
				actual_weight: Some(dispatch_weight::<T>()),
				pays_fee: Pays::Yes,
			},
			error,
		})?;
	let dispatched = T::CollectionDispatch::dispatch(handle);
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
	result
}

/// Interface for working with different collections through the dispatcher.
pub trait CollectionDispatch<T: Config> {
	/// Create a collection. The collection will be created according to the value of [data.mode](CreateCollectionData::mode).
	///
	/// * `sender` - The user who will become the owner of the collection.
	/// * `data` - Description of the created collection.
	fn create(
		sender: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
	) -> DispatchResult;

	/// Delete the collection.
	///
	/// * `sender` - The owner of the collection.
	/// * `handle` - Collection handle.
	fn destroy(sender: T::CrossAccountId, handle: CollectionHandle<T>) -> DispatchResult;

	/// Get a specialized collection from the handle.
	///
	/// * `handle` - Collection handle.
	fn dispatch(handle: CollectionHandle<T>) -> Self;

	/// Get the collection handle for the corresponding implementation.
	fn into_inner(self) -> CollectionHandle<T>;

	/// Get the implementation of [CommonCollectionOperations].
	fn as_dyn(&self) -> &dyn CommonCollectionOperations<T>;
}
