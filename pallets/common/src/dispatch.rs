//! Module with interfaces for dispatching collections.

use frame_support::{
	dispatch::{
		DispatchErrorWithPostInfo, DispatchResult, DispatchResultWithPostInfo, Pays,
		PostDispatchInfo,
	},
	traits::Get,
};
use sp_runtime::DispatchError;
use sp_weights::Weight;
use up_data_structs::{CollectionId, CreateCollectionData};

use crate::{pallet::Config, CommonCollectionOperations};

// TODO: move to benchmarking
/// Price of [`dispatch_tx`] call with noop `call` argument
pub fn dispatch_weight<T: Config>() -> Weight {
	// Read collection
	<T as frame_system::Config>::DbWeight::get().reads(1)
	// Dynamic dispatch?
	+ Weight::from_parts(6_000_000, 0)
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
	let dispatched = T::CollectionDispatch::dispatch(collection)
		.and_then(|dispatched| {
			dispatched.check_is_internal()?;
			Ok(dispatched)
		})
		.map_err(|error| DispatchErrorWithPostInfo {
			post_info: PostDispatchInfo {
				actual_weight: Some(dispatch_weight::<T>()),
				pays_fee: Pays::Yes,
			},
			error,
		})?;
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
	/// Check if the collection is internal.
	fn check_is_internal(&self) -> DispatchResult;

	/// Create a collection. The collection will be created according to the value of [`data.mode`](CreateCollectionData::mode).
	///
	/// * `sender` - The user who will become the owner of the collection.
	/// * `payer` - If set, the user who pays the collection creation deposit.
	/// * `data` - Description of the created collection.
	fn create(
		sender: T::CrossAccountId,
		payer: Option<T::CrossAccountId>,
		data: CreateCollectionData<T::CrossAccountId>,
	) -> Result<CollectionId, DispatchError> {
		Self::create_raw(sender, payer, false, data)
	}

	/// Create a collection. The collection will be created according to the value of [`data.mode`](CreateCollectionData::mode).
	///
	/// * `sender` - The user who will become the owner of the collection.
	/// * `payer` - If set, the user who pays the collection creation deposit.
	/// * `data` - Description of the created collection.
	/// * `is_special_collection` -- Whether this collection is a system one, i.e. can have special flags set.
	fn create_raw(
		sender: T::CrossAccountId,
		payer: Option<T::CrossAccountId>,
		is_special_collection: bool,
		data: CreateCollectionData<T::CrossAccountId>,
	) -> Result<CollectionId, DispatchError>;

	/// Delete the collection.
	///
	/// * `sender` - The owner of the collection.
	/// * `handle` - Collection handle.
	fn destroy(sender: T::CrossAccountId, collection_id: CollectionId) -> DispatchResult;

	/// Get a specialized collection from the handle.
	///
	/// * `handle` - Collection handle.
	fn dispatch(collection_id: CollectionId) -> Result<Self, DispatchError>
	where
		Self: Sized;

	/// Get the implementation of [`CommonCollectionOperations`].
	fn as_dyn(&self) -> &dyn CommonCollectionOperations<T>;
}
