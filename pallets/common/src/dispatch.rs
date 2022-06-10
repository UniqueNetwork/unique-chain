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
/// Price of [`dispatch_call`] call with noop `call` argument
pub fn dispatch_weight<T: Config>() -> Weight {
	// Read collection
	<T as frame_system::Config>::DbWeight::get().reads(1)
	// Dynamic dispatch?
	+ 6_000_000
	// submit_logs is measured as part of collection pallets
}

/// Helper function to implement substrate calls for common collection methods
pub fn dispatch_call<
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

pub trait CollectionDispatch<T: Config> {
	fn create(
		sender: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
	) -> DispatchResult;
	fn destroy(sender: T::CrossAccountId, handle: CollectionHandle<T>) -> DispatchResult;

	fn dispatch(handle: CollectionHandle<T>) -> Self;
	fn into_inner(self) -> CollectionHandle<T>;

	fn as_dyn(&self) -> &dyn CommonCollectionOperations<T>;
}
