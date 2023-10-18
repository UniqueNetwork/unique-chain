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

use frame_support::{dispatch::DispatchResult, ensure, fail};
use pallet_balances_adapter::NativeFungibleHandle;
pub use pallet_common::dispatch::CollectionDispatch;
use pallet_common::{
	erc::CommonEvmHandler, eth::map_eth_to_id, unsupported, CollectionById, CollectionHandle,
	CommonCollectionOperations, Pallet as PalletCommon,
};
use pallet_evm::{PrecompileHandle, PrecompileResult};
use pallet_fungible::{FungibleHandle, Pallet as PalletFungible};
use pallet_nonfungible::{NonfungibleHandle, Pallet as PalletNonfungible};
use pallet_refungible::{
	erc_token::RefungibleTokenHandle, Pallet as PalletRefungible, RefungibleHandle,
};
use sp_core::H160;
use sp_runtime::DispatchError;
use sp_std::{borrow::ToOwned, vec::Vec};
use up_data_structs::{
	mapping::TokenAddressMapping, CollectionId, CollectionMode, CreateCollectionData,
	MAX_DECIMAL_POINTS,
};

pub enum CollectionDispatchT<T>
where
	T: pallet_fungible::Config
		+ pallet_nonfungible::Config
		+ pallet_refungible::Config
		+ pallet_balances_adapter::Config,
{
	Fungible(FungibleHandle<T>),
	Nonfungible(NonfungibleHandle<T>),
	Refungible(RefungibleHandle<T>),
	NativeFungible(NativeFungibleHandle<T>),
}

impl<T> CollectionDispatch<T> for CollectionDispatchT<T>
where
	T: pallet_common::Config
		+ pallet_unique::Config
		+ pallet_fungible::Config
		+ pallet_nonfungible::Config
		+ pallet_refungible::Config
		+ pallet_balances_adapter::Config,
{
	fn check_is_internal(&self) -> DispatchResult {
		match self {
			Self::Fungible(h) => h.check_is_internal(),
			Self::Nonfungible(h) => h.check_is_internal(),
			Self::Refungible(h) => h.check_is_internal(),
			Self::NativeFungible(h) => h.check_is_internal(),
		}
	}

	fn create(
		sender: T::CrossAccountId,
		payer: T::CrossAccountId,
		data: CreateCollectionData<T::CrossAccountId>,
	) -> Result<CollectionId, DispatchError> {
		match data.mode {
			CollectionMode::Fungible(decimal_points) => {
				// check params
				ensure!(
					decimal_points <= MAX_DECIMAL_POINTS,
					pallet_unique::Error::<T>::CollectionDecimalPointLimitExceeded
				);
			}

			#[cfg(not(feature = "refungible"))]
			CollectionMode::ReFungible => return unsupported!(T),

			_ => {}
		};

		<PalletCommon<T>>::init_collection(sender, Some(payer), data)
	}

	fn create_foreign(
		sender: <T>::CrossAccountId,
		data: CreateCollectionData<<T>::CrossAccountId>,
	) -> Result<CollectionId, DispatchError> {
		match data.mode {
			CollectionMode::Fungible(decimal_points) => {
				// check params
				ensure!(
					decimal_points <= MAX_DECIMAL_POINTS,
					pallet_unique::Error::<T>::CollectionDecimalPointLimitExceeded
				);
			}

			CollectionMode::ReFungible => return unsupported!(T),
			_ => {}
		};

		let payer = None;
		<PalletCommon<T>>::init_collection(sender, payer, data)
	}

	fn destroy(sender: T::CrossAccountId, collection_id: CollectionId) -> DispatchResult {
		if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
			fail!(<pallet_common::Error<T>>::UnsupportedOperation);
		}

		let collection = <CollectionHandle<T>>::try_get(collection_id)?;

		match collection.mode {
			CollectionMode::ReFungible => {
				PalletRefungible::destroy_collection(RefungibleHandle::cast(collection), &sender)?
			}
			CollectionMode::Fungible(_) => {
				PalletFungible::destroy_collection(FungibleHandle::cast(collection), &sender)?
			}
			CollectionMode::NFT => {
				PalletNonfungible::destroy_collection(NonfungibleHandle::cast(collection), &sender)?
			}
		}
		Ok(())
	}

	fn dispatch(collection_id: CollectionId) -> Result<Self, DispatchError> {
		if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
			return Ok(Self::NativeFungible(
				NativeFungibleHandle::new_with_gas_limit(u64::MAX),
			));
		}

		let handle = <CollectionHandle<T>>::try_get(collection_id)?;
		Ok(match handle.mode {
			CollectionMode::Fungible(_) => Self::Fungible(FungibleHandle::cast(handle)),
			CollectionMode::NFT => Self::Nonfungible(NonfungibleHandle::cast(handle)),
			CollectionMode::ReFungible => Self::Refungible(RefungibleHandle::cast(handle)),
		})
	}

	fn as_dyn(&self) -> &dyn CommonCollectionOperations<T> {
		match self {
			Self::Fungible(h) => h,
			Self::Nonfungible(h) => h,
			Self::Refungible(h) => h,
			Self::NativeFungible(h) => h,
		}
	}
}

impl<T> pallet_evm::OnMethodCall<T> for CollectionDispatchT<T>
where
	T: pallet_common::Config
		+ pallet_unique::Config
		+ pallet_fungible::Config
		+ pallet_nonfungible::Config
		+ pallet_refungible::Config
		+ pallet_balances_adapter::Config,
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
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
	fn call(handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		if let Some(collection_id) = map_eth_to_id(&handle.code_address()) {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				<NativeFungibleHandle<T>>::new_with_gas_limit(handle.remaining_gas()).call(handle)
			} else {
				let collection = <CollectionHandle<T>>::new_with_gas_limit(
					collection_id,
					handle.remaining_gas(),
				)?;

				match collection.mode {
					CollectionMode::Fungible(_) => FungibleHandle::cast(collection).call(handle),
					CollectionMode::NFT => NonfungibleHandle::cast(collection).call(handle),
					CollectionMode::ReFungible => RefungibleHandle::cast(collection).call(handle),
				}
			}
		} else if let Some((collection_id, token_id)) =
			<T as pallet_common::Config>::EvmTokenAddressMapping::address_to_token(
				&handle.code_address(),
			) {
			let collection =
				<CollectionHandle<T>>::new_with_gas_limit(collection_id, handle.remaining_gas())?;
			if collection.mode != CollectionMode::ReFungible {
				return None;
			}

			let h = RefungibleHandle::cast(collection);
			// TODO: check token existence
			RefungibleTokenHandle(h, token_id).call(handle)
		} else {
			None
		}
	}
}
