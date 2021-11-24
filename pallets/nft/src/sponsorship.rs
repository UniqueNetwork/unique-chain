use crate::{
	Config, Call, CreateItemBasket, VariableMetaDataBasket, ReFungibleTransferBasket,
	FungibleTransferBasket, NftTransferBasket, CreateItemData, CollectionMode, NftApproveBasket,
	FungibleApproveBasket, RefungibleApproveBasket,
};
use core::marker::PhantomData;
use up_sponsorship::SponsorshipHandler;
use frame_support::{
	traits::{IsSubType},
	storage::{StorageMap, StorageDoubleMap, StorageNMap},
};
use nft_data_structs::{
	CollectionId, FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, MetaUpdatePermission,
	NFT_SPONSOR_TRANSFER_TIMEOUT, REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, TokenId,
};
use pallet_common::{CollectionHandle};
use pallet_common::account::CrossAccountId;

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
	who: &T::AccountId,
	_properties: &CreateItemData,
) -> Option<()> {
	if _properties.data_size() as u32 > collection.limits.sponsored_data_size() {
		return None;
	}

	// sponsor timeout
	let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
	let limit = collection
		.limits
		.sponsor_transfer_timeout(match _properties {
			CreateItemData::NFT(_) => NFT_SPONSOR_TRANSFER_TIMEOUT,
			CreateItemData::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
			CreateItemData::ReFungible(_) => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
		});

	if let Some(last_tx_block) = <CreateItemBasket<T>>::get((collection.id, &who)) {
		let timeout = last_tx_block + limit.into();
		if block_number < timeout {
			return None;
		}
	}

	CreateItemBasket::<T>::insert((collection.id, who.clone()), block_number);

	Some(())
}

pub fn withdraw_set_variable_meta_data<T: Config>(
	who: &T::CrossAccountId,
	collection: &CollectionHandle<T>,
	item_id: &TokenId,
	data: &[u8],
) -> Option<()> {
	// TODO: make it work for admins
	if collection.meta_update_permission != MetaUpdatePermission::ItemOwner {
		return None;
	}
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

	// Can't sponsor fungible collection, this tx will be rejected
	// as invalid
	if matches!(collection.mode, CollectionMode::Fungible(_)) {
		return None;
	}
	if data.len() > collection.limits.sponsored_data_size() as usize {
		return None;
	}

	let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
	let limit = collection.limits.sponsored_data_rate_limit()?;

	if let Some(last_tx_block) = VariableMetaDataBasket::<T>::get(collection.id, item_id) {
		let timeout = last_tx_block + limit.into();
		if block_number < timeout {
			return None;
		}
	}

	<VariableMetaDataBasket<T>>::insert(collection.id, item_id, block_number);

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

fn load<T: Config>(id: CollectionId) -> Option<(T::AccountId, CollectionHandle<T>)> {
	let collection = CollectionHandle::new(id)?;
	let sponsor = collection.sponsorship.sponsor().cloned()?;
	Some((sponsor, collection))
}

pub struct NftSponsorshipHandler<T>(PhantomData<T>);
impl<T, C> SponsorshipHandler<T::AccountId, C> for NftSponsorshipHandler<T>
where
	T: Config,
	C: IsSubType<Call<T>>,
{
	fn get_sponsor(who: &T::AccountId, call: &C) -> Option<T::AccountId> {
		match IsSubType::<Call<T>>::is_sub_type(call)? {
			Call::create_item {
				collection_id,
				data,
				..
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_create_item::<T>(&collection, who, data).map(|()| sponsor)
			}
			Call::transfer {
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
			Call::transfer_from {
				collection_id,
				item_id,
				from,
				..
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_transfer::<T>(&collection, from, item_id).map(|()| sponsor)
			}
			Call::approve {
				collection_id,
				item_id,
				..
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_approve::<T>(&collection, who, item_id).map(|()| sponsor)
			}
			Call::set_variable_meta_data {
				collection_id,
				item_id,
				data,
			} => {
				let (sponsor, collection) = load(*collection_id)?;
				withdraw_set_variable_meta_data::<T>(
					&T::CrossAccountId::from_sub(who.clone()),
					&collection,
					item_id,
					data,
				)
				.map(|()| sponsor)
			}
			_ => None,
		}
	}
}
