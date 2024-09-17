use frame_support::traits::tokens::asset_ops::{
	common_asset_kinds::Instance, common_strategies::{DeriveAndReportId, FromTo, Owned}, AssetDefinition, Create, Transfer
};
use pallet_evm::account::CrossAccountId as CrossAccountIdT;
use pallet_common::{CollectionHandle, Error as CommonError, CommonCollectionOperations};
use sp_runtime::{DispatchError, DispatchResult};
use up_data_structs::{
	budget::ZeroBudget as ZeroNestingBudget, CollectionId, CollectionMode, TokenId,
};

use crate::{Config, NonfungibleHandle, Pallet, CreateItemData};

fn nft_collection<T: Config>(
	collection_id: CollectionId,
) -> Result<NonfungibleHandle<T>, DispatchError> {
	let handle = <CollectionHandle<T>>::try_get(collection_id)?;

	match handle.mode {
		CollectionMode::NFT => Ok(NonfungibleHandle::cast(handle)),
		_ => Err(<CommonError<T>>::NoPermission.into()),
	}
}

impl<T: Config> AssetDefinition<Instance> for Pallet<T> {
	type Id = (CollectionId, TokenId);
}

impl<T: Config> Create<
	Instance,
	Owned<
		T::CrossAccountId,
		DeriveAndReportId<CollectionId, (CollectionId, TokenId)>
	>
> for Pallet<T> {
	fn create(strategy: Owned<
		T::CrossAccountId,
		DeriveAndReportId<CollectionId, (CollectionId, TokenId)>
	>) -> Result<(CollectionId, TokenId), DispatchError> {
		let Owned {
			owner,
			id_assignment: DeriveAndReportId {
				params: collection_id,
				..
			},
			..
		} = strategy;

		let collection = nft_collection::<T>(collection_id)?;
		let collection_owner = collection.owner.clone();
        let depositor = T::CrossAccountId::from_sub(collection_owner);

		<Pallet<T>>::create_item(
            &collection,
            &depositor,
            CreateItemData::<T> {
                owner,
                properties: Default::default(),  
            },
            &ZeroNestingBudget,
        )?;

		let derivative_id = collection.last_token_id();
		Ok((collection_id, derivative_id))
	}
}

impl<T: Config> Transfer<Instance, FromTo<T::CrossAccountId>> for Pallet<T> {
	fn transfer(
		(collection_id, token_id): &Self::Id,
		strategy: FromTo<T::CrossAccountId>,
	) -> DispatchResult {
		let collection = nft_collection::<T>(*collection_id)?;
		let FromTo(from, to) = strategy;

		<Pallet<T>>::transfer(&collection, &from, &to, *token_id, &ZeroNestingBudget)
			.map(|_| ())
			.map_err(|info| info.error)
	}
}
