use super::*;

use frame_benchmarking::{benchmarks, account};
use frame_support::traits::{Currency, Get};
use up_data_structs::{
	CreateCollectionData, CollectionMode, CreateItemData, CreateNftData, budget::Unlimited,
};
use pallet_evm::account::CrossAccountId;

const SEED: u32 = 1;

benchmarks! {
	find_parent {
		let caller: T::AccountId = account("caller", 0, SEED);
		let caller_cross = T::CrossAccountId::from_sub(caller.clone());

		T::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());
		T::CollectionDispatch::create(caller, CreateCollectionData {
			mode: CollectionMode::NFT,
			..Default::default()
		})?;
		let dispatch = T::CollectionDispatch::dispatch(CollectionHandle::try_get(CollectionId(1))?);
		let dispatch = dispatch.as_dyn();

		dispatch.create_item(caller_cross.clone(), caller_cross.clone(), CreateItemData::NFT(CreateNftData::default()), &Unlimited)?;
	}: {
		let parent = <Pallet<T>>::find_parent(CollectionId(1), TokenId(1))?;
		assert!(matches!(parent, Parent::User(_)))
	}
}
