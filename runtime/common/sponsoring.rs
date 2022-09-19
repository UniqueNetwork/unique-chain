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

use core::marker::PhantomData;
use up_sponsorship::SponsorshipHandler;
use frame_support::{
	traits::{IsSubType},
	storage::{StorageMap, StorageDoubleMap, StorageNMap},
};
use up_data_structs::{
	CollectionId, FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, NFT_SPONSOR_TRANSFER_TIMEOUT,
	REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, TokenId, CollectionMode, CreateItemData,
};
use sp_runtime::traits::Saturating;
use pallet_common::{CollectionHandle};
use pallet_evm::account::CrossAccountId;
use pallet_unique::{
	Call as UniqueCall, Config as UniqueConfig, FungibleApproveBasket, RefungibleApproveBasket,
	NftApproveBasket, CreateItemBasket, ReFungibleTransferBasket, FungibleTransferBasket,
	NftTransferBasket, TokenPropertyBasket,
};
use pallet_fungible::Config as FungibleConfig;
use pallet_nonfungible::Config as NonfungibleConfig;
use pallet_refungible::Config as RefungibleConfig;

pub trait Config: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig {}
impl<T> Config for T where T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig {}

// TODO: permission check?
pub fn withdraw_set_token_property<T: Config>(
	collection: &CollectionHandle<T>,
	who: &T::CrossAccountId,
	item_id: &TokenId,
	data_size: usize,
) -> Option<()> {
	// preliminary sponsoring correctness check
	match collection.mode {
		CollectionMode::NFT => {
			let owner = pallet_nonfungible::TokenData::<T>::get((collection.id, item_id))?.owner;
			if !owner.conv_eq(who) {
				return None;
			}
		}
		CollectionMode::Fungible(_) => {
			// Fungible tokens have no properties
			return None;
		}
		CollectionMode::ReFungible => {
			if !<pallet_refungible::Owned<T>>::get((collection.id, who, item_id)) {
				return None;
			}
		}
	}

	if data_size > collection.limits.sponsored_data_size() as usize {
		return None;
	}

	let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
	let limit = collection.limits.sponsored_data_rate_limit()?;

	if let Some(last_tx_block) = TokenPropertyBasket::<T>::get(collection.id, item_id) {
		let timeout = last_tx_block + limit.into();
		if block_number < timeout {
			return None;
		}
	}

	<TokenPropertyBasket<T>>::insert(collection.id, item_id, block_number);

	Some(())
}

pub fn withdraw_transfer<T: Config>(
	collection: &CollectionHandle<T>,
	who: &T::CrossAccountId,
	item_id: &TokenId,
) -> Option<()> {
	// preliminary sponsoring correctness check
	match collection.mode {
		CollectionMode::NFT => {
			let owner = pallet_nonfungible::TokenData::<T>::get((collection.id, item_id))?.owner;
			if !owner.conv_eq(who) {
				return None;
			}
		}
		CollectionMode::Fungible(_) => {
			if item_id != &TokenId::default() {
				return None;
			}
			if <pallet_fungible::Balance<T>>::get((collection.id, who)) == 0 {
				return None;
			}
		}
		CollectionMode::ReFungible => {
			if !<pallet_refungible::Owned<T>>::get((collection.id, who, item_id)) {
				return None;
			}
		}
	}

	// sponsor timeout
	let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
	let limit = collection
		.limits
		.sponsor_transfer_timeout(match collection.mode {
			CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
			CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
			CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
		});

	let last_tx_block = match collection.mode {
		CollectionMode::NFT => <NftTransferBasket<T>>::get(collection.id, item_id),
		CollectionMode::Fungible(_) => {
			<FungibleTransferBasket<T>>::get(collection.id, who.as_sub())
		}
		CollectionMode::ReFungible => {
			<ReFungibleTransferBasket<T>>::get((collection.id, item_id, who.as_sub()))
		}
	};

	if let Some(last_tx_block) = last_tx_block {
		let timeout = last_tx_block + limit.into();
		if block_number < timeout {
			return None;
		}
	}

	match collection.mode {
		CollectionMode::NFT => <NftTransferBasket<T>>::insert(collection.id, item_id, block_number),
		CollectionMode::Fungible(_) => {
			<FungibleTransferBasket<T>>::insert(collection.id, who.as_sub(), block_number)
		}
		CollectionMode::ReFungible => <ReFungibleTransferBasket<T>>::insert(
			(collection.id, item_id, who.as_sub()),
			block_number,
		),
	};

	Some(())
}

pub fn withdraw_create_item<T: Config>(
	collection: &CollectionHandle<T>,
	who: &T::CrossAccountId,
	properties: &CreateItemData,
) -> Option<()> {
	// sponsor timeout
	let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
	let limit = collection
		.limits
		.sponsor_transfer_timeout(match properties {
			CreateItemData::NFT(_) => NFT_SPONSOR_TRANSFER_TIMEOUT,
			CreateItemData::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
			CreateItemData::ReFungible(_) => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
		});

	if let Some(last_tx_block) = <CreateItemBasket<T>>::get((collection.id, who.as_sub())) {
		let timeout = last_tx_block + limit.into();
		if block_number < timeout {
			return None;
		}
	}

	CreateItemBasket::<T>::insert((collection.id, who.as_sub()), block_number);

	Some(())
}

pub fn withdraw_approve<T: Config>(
	collection: &CollectionHandle<T>,
	who: &T::AccountId,
	item_id: &TokenId,
) -> Option<()> {
	// sponsor timeout
	let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
	let limit = collection.limits.sponsor_approve_timeout();

	let last_tx_block = match collection.mode {
		CollectionMode::NFT => <NftApproveBasket<T>>::get(collection.id, item_id),
		CollectionMode::Fungible(_) => <FungibleApproveBasket<T>>::get(collection.id, who),
		CollectionMode::ReFungible => {
			<RefungibleApproveBasket<T>>::get((collection.id, item_id, who))
		}
	};

	if let Some(last_tx_block) = last_tx_block {
		let timeout = last_tx_block + limit.into();
		if block_number < timeout {
			return None;
		}
	}

	match collection.mode {
		CollectionMode::NFT => <NftApproveBasket<T>>::insert(collection.id, item_id, block_number),
		CollectionMode::Fungible(_) => {
			<FungibleApproveBasket<T>>::insert(collection.id, who, block_number)
		}
		CollectionMode::ReFungible => {
			<RefungibleApproveBasket<T>>::insert((collection.id, item_id, who), block_number)
		}
	};

	Some(())
}

fn load<T: UniqueConfig>(id: CollectionId) -> Option<(T::AccountId, CollectionHandle<T>)> {
	let collection = CollectionHandle::new(id)?;
	let sponsor = collection.sponsorship.sponsor().cloned()?;
	Some((sponsor, collection))
}

pub struct UniqueSponsorshipHandler<T>(PhantomData<T>);
impl<T, C> SponsorshipHandler<T::AccountId, C> for UniqueSponsorshipHandler<T>
where
	T: Config,
	C: IsSubType<UniqueCall<T>>,
{
	fn get_sponsor(who: &T::AccountId, call: &C) -> Option<T::AccountId> {
		match IsSubType::<UniqueCall<T>>::is_sub_type(call)? {
			UniqueCall::set_token_properties {
				collection_id,
				token_id,
				properties,
				..
			} => {
				let (sponsor, collection) = load::<T>(*collection_id)?;
				withdraw_set_token_property(
					&collection,
					&T::CrossAccountId::from_sub(who.clone()),
					token_id,
					// No overflow may happen, as data larger than usize can't reach here
					properties.iter().map(|p| p.key.len() + p.value.len()).sum(),
				)
				.map(|()| sponsor)
			}
			UniqueCall::create_item {
				collection_id,
				data,
				..
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_create_item::<T>(
					&collection,
					&T::CrossAccountId::from_sub(who.clone()),
					data,
				)
				.map(|()| sponsor)
			}
			UniqueCall::transfer {
				collection_id,
				item_id,
				..
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_transfer::<T>(
					&collection,
					&T::CrossAccountId::from_sub(who.clone()),
					item_id,
				)
				.map(|()| sponsor)
			}
			UniqueCall::transfer_from {
				collection_id,
				item_id,
				from,
				..
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_transfer::<T>(&collection, from, item_id).map(|()| sponsor)
			}
			UniqueCall::approve {
				collection_id,
				item_id,
				..
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_approve::<T>(&collection, who, item_id).map(|()| sponsor)
			}
			_ => None,
		}
	}
}

pub trait SponsorshipPredict<T: Config> {
	fn predict(collection: CollectionId, account: T::CrossAccountId, token: TokenId) -> Option<u64>
	where
		u64: From<<T as frame_system::Config>::BlockNumber>;
}

pub struct UniqueSponsorshipPredict<T>(PhantomData<T>);

impl<T: Config> SponsorshipPredict<T> for UniqueSponsorshipPredict<T> {
	fn predict(collection_id: CollectionId, who: T::CrossAccountId, token: TokenId) -> Option<u64>
	where
		u64: From<<T as frame_system::Config>::BlockNumber>,
	{
		let collection = <CollectionHandle<T>>::try_get(collection_id).ok()?;
		let _ = collection.sponsorship.sponsor()?;

		// sponsor timeout
		let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
		let limit = collection
			.limits
			.sponsor_transfer_timeout(match collection.mode {
				CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
			});

		let last_tx_block = match collection.mode {
			CollectionMode::NFT => <NftTransferBasket<T>>::get(collection.id, token),
			CollectionMode::Fungible(_) => {
				<FungibleTransferBasket<T>>::get(collection.id, who.as_sub())
			}
			CollectionMode::ReFungible => {
				<ReFungibleTransferBasket<T>>::get((collection.id, token, who.as_sub()))
			}
		};

		if let Some(last_tx_block) = last_tx_block {
			return Some(
				last_tx_block
					.saturating_add(limit.into())
					.saturating_sub(block_number)
					.into(),
			);
		}

		let token_exists = match collection.mode {
			CollectionMode::NFT => {
				<pallet_nonfungible::TokenData<T>>::contains_key((collection.id, token))
			}
			CollectionMode::Fungible(_) => token == TokenId::default(),
			CollectionMode::ReFungible => {
				<pallet_refungible::TotalSupply<T>>::contains_key((collection.id, token))
			}
		};

		if token_exists {
			Some(0)
		} else {
			None
		}
	}
}
