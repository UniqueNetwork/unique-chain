use frame_support::traits::tokens::asset_ops::{
	common_asset_kinds::Instance, common_strategies::FromTo, AssetDefinition, Transfer,
};
use pallet_common::{CollectionHandle, Error as CommonError};
use sp_runtime::{DispatchError, DispatchResult};
use up_data_structs::{
	budget::ZeroBudget as ZeroNestingBudget, CollectionId, CollectionMode, TokenId,
};

use crate::{Config, NonfungibleHandle, Pallet};

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
