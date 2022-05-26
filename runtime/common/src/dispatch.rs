use frame_support::{dispatch::{DispatchResult}, ensure};
use pallet_evm::PrecompileResult;
use sp_core::{H160, U256};
use sp_std::{borrow::ToOwned, vec::Vec};
use pallet_common::{
	CollectionById, CollectionHandle, CommonCollectionOperations, erc::CommonEvmHandler,
	eth::map_eth_to_id,
};
pub use pallet_common::dispatch::CollectionDispatch;
use pallet_fungible::{Pallet as PalletFungible, FungibleHandle};
use pallet_nonfungible::{Pallet as PalletNonfungible, NonfungibleHandle};
use pallet_refungible::{Pallet as PalletRefungible, RefungibleHandle, erc::RefungibleTokenHandle};
use up_data_structs::{
	CollectionMode, CreateCollectionData, MAX_DECIMAL_POINTS, mapping::TokenAddressMapping,
	budget::Budget,
};

pub enum CollectionDispatchT<T>
where
	T: pallet_fungible::Config + pallet_nonfungible::Config + pallet_refungible::Config,
{
	Fungible(FungibleHandle<T>),
	Nonfungible(NonfungibleHandle<T>),
	Refungible(RefungibleHandle<T>),
}
impl<T> CollectionDispatch<T> for CollectionDispatchT<T>
where
	T: pallet_common::Config
		+ pallet_unique::Config
		+ pallet_fungible::Config
		+ pallet_nonfungible::Config
		+ pallet_refungible::Config,
{
	fn create(sender: T::AccountId, data: CreateCollectionData<T::AccountId>) -> DispatchResult {
		let _id = match data.mode {
			CollectionMode::NFT => <PalletNonfungible<T>>::init_collection(sender, data)?,
			CollectionMode::Fungible(decimal_points) => {
				// check params
				ensure!(
					decimal_points <= MAX_DECIMAL_POINTS,
					pallet_unique::Error::<T>::CollectionDecimalPointLimitExceeded
				);
				<PalletFungible<T>>::init_collection(sender, data)?
			}
			CollectionMode::ReFungible => <PalletRefungible<T>>::init_collection(sender, data)?,
		};
		Ok(())
	}

	fn destroy(
		sender: T::CrossAccountId,
		collection: CollectionHandle<T>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		match collection.mode {
			CollectionMode::ReFungible => {
				PalletRefungible::destroy_collection(RefungibleHandle::cast(collection), &sender)?
			}
			CollectionMode::Fungible(_) => {
				PalletFungible::destroy_collection(FungibleHandle::cast(collection), &sender)?
			}
			CollectionMode::NFT => {
				PalletNonfungible::destroy_collection(
					NonfungibleHandle::cast(collection),
					&sender,
					nesting_budget,
				)?
			}
		}
		Ok(())
	}

	fn dispatch(handle: CollectionHandle<T>) -> Self {
		match handle.mode {
			CollectionMode::Fungible(_) => Self::Fungible(FungibleHandle::cast(handle)),
			CollectionMode::NFT => Self::Nonfungible(NonfungibleHandle::cast(handle)),
			CollectionMode::ReFungible => Self::Refungible(RefungibleHandle::cast(handle)),
		}
	}

	fn into_inner(self) -> CollectionHandle<T> {
		match self {
			Self::Fungible(f) => f.into_inner(),
			Self::Nonfungible(f) => f.into_inner(),
			Self::Refungible(f) => f.into_inner(),
		}
	}

	fn as_dyn(&self) -> &dyn CommonCollectionOperations<T> {
		match self {
			Self::Fungible(h) => h,
			Self::Nonfungible(h) => h,
			Self::Refungible(h) => h,
		}
	}
}

impl<T> pallet_evm::OnMethodCall<T> for CollectionDispatchT<T>
where
	T: pallet_common::Config
		+ pallet_unique::Config
		+ pallet_fungible::Config
		+ pallet_nonfungible::Config
		+ pallet_refungible::Config,
{
	fn is_reserved(target: &H160) -> bool {
		map_eth_to_id(target).is_some()
	}
	fn is_used(target: &H160) -> bool {
		map_eth_to_id(target)
			.map(<CollectionById<T>>::contains_key)
			.unwrap_or(false)
	}
	fn get_code(target: &H160) -> Option<Vec<u8>> {
		if let Some(collection_id) = map_eth_to_id(target) {
			let collection = <CollectionById<T>>::get(collection_id)?;
			Some(
				match collection.mode {
					CollectionMode::NFT => <NonfungibleHandle<T>>::CODE,
					CollectionMode::Fungible(_) => <FungibleHandle<T>>::CODE,
					CollectionMode::ReFungible => <RefungibleHandle<T>>::CODE,
				}
				.to_owned(),
			)
		} else if let Some((collection_id, _token_id)) =
			<T as pallet_common::Config>::EvmTokenAddressMapping::address_to_token(target)
		{
			let collection = <CollectionById<T>>::get(collection_id)?;
			if collection.mode != CollectionMode::ReFungible {
				return None;
			}
			// TODO: check token existence
			Some(<RefungibleTokenHandle<T>>::CODE.to_owned())
		} else {
			None
		}
	}
	fn call(
		source: &H160,
		target: &H160,
		gas_limit: u64,
		input: &[u8],
		value: U256,
	) -> Option<PrecompileResult> {
		if let Some(collection_id) = map_eth_to_id(target) {
			let collection = <CollectionHandle<T>>::new_with_gas_limit(collection_id, gas_limit)?;
			let dispatched = Self::dispatch(collection);

			match dispatched {
				Self::Fungible(h) => h.call(source, input, value),
				Self::Nonfungible(h) => h.call(source, input, value),
				Self::Refungible(h) => h.call(source, input, value),
			}
		} else if let Some((collection_id, token_id)) =
			<T as pallet_common::Config>::EvmTokenAddressMapping::address_to_token(target)
		{
			let collection = <CollectionHandle<T>>::new_with_gas_limit(collection_id, gas_limit)?;
			if collection.mode != CollectionMode::ReFungible {
				return None;
			}

			let handle = RefungibleHandle::cast(collection);
			// TODO: check token existence
			RefungibleTokenHandle(handle, token_id).call(source, input, value)
		} else {
			None
		}
	}
}
