//! Module with interfaces for dispatching collections.

use frame_support::{
	dispatch::{
		DispatchResultWithPostInfo, PostDispatchInfo, Weight, DispatchErrorWithPostInfo,
		DispatchResult, Pays,
	},
	ensure,
	traits::{
		Get,
		fungible::{Balanced, Debt},
		tokens::{Imbalance, Precision, Preservation},
	},
};
use sp_runtime::{DispatchError, traits::Zero};
use up_data_structs::{CollectionId, CreateCollectionData};
use pallet_evm::account::CrossAccountId;

use crate::{pallet::Config, CommonCollectionOperations, Pallet, Error};

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
	let dispatched =
		T::CollectionDispatch::dispatch(collection).map_err(|error| DispatchErrorWithPostInfo {
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
	/// Create a collection. The collection will be created according to the value of [`data.mode`](CreateCollectionData::mode).
	/// The method should be used when a regular user creates a collection.
	///
	/// * `sender` - The user who will become the owner of the collection.
	/// * `data` - Description of the created collection.
	fn create(
		sender: T::CrossAccountId,
		payer: T::CrossAccountId,
		data: CreateCollectionData<T::CrossAccountId>,
	) -> Result<CollectionId, DispatchError> {
		ensure!(!data.flags.foreign, <Error<T>>::NoPermission);

		// Take a (non-refundable) deposit of collection creation
		{
			let mut imbalance = <Debt<T::AccountId, <T as Config>::Currency>>::zero();
			imbalance.subsume(<T as Config>::Currency::deposit(
				&T::TreasuryAccountId::get(),
				T::CollectionCreationPrice::get(),
				Precision::Exact,
			)?);
			let credit =
				<T as Config>::Currency::settle(payer.as_sub(), imbalance, Preservation::Preserve)
					.map_err(|_| Error::<T>::NotSufficientFounds)?;

			debug_assert!(credit.peek().is_zero())
		}

		Self::create_internal(sender, data)
	}

	/// This method should be used when the chain itself creates a collection.
	fn create_internal(
		sender: T::CrossAccountId,
		data: CreateCollectionData<T::CrossAccountId>,
	) -> Result<CollectionId, DispatchError> {
		<Pallet<T>>::create_collection_internal(sender, data)
	}

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
