use crate::{
	Config, Call, CollectionById, CreateItemBasket, VariableMetaDataBasket,
	ReFungibleTransferBasket, FungibleTransferBasket, NftTransferBasket, CreateItemData,
	CollectionMode,
};
use core::marker::PhantomData;
use up_sponsorship::SponsorshipHandler;
use frame_support::{
	traits::{IsSubType},
	storage::{StorageMap, StorageDoubleMap},
};
use nft_data_structs::{
	TokenId, CollectionId, NFT_SPONSOR_TRANSFER_TIMEOUT, REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
	FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
};

pub struct NftSponsorshipHandler<T>(PhantomData<T>);
impl<T: Config> NftSponsorshipHandler<T> {
	pub fn withdraw_create_item(
		who: &T::AccountId,
		collection_id: &CollectionId,
		_properties: &CreateItemData,
	) -> Option<T::AccountId> {
		let collection = CollectionById::<T>::get(collection_id)?;

		// sponsor timeout
		let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;

		let limit = collection.limits.sponsor_transfer_timeout;
		if CreateItemBasket::<T>::contains_key((collection_id, &who)) {
			let last_tx_block = CreateItemBasket::<T>::get((collection_id, &who));
			let limit_time = last_tx_block + limit.into();
			if block_number <= limit_time {
				return None;
			}
		}
		CreateItemBasket::<T>::insert((collection_id, who.clone()), block_number);

		// check free create limit
		if collection.limits.sponsored_data_size >= (_properties.data_size() as u32) {
			collection.sponsorship.sponsor().cloned()
		} else {
			None
		}
	}

	pub fn withdraw_transfer(
		who: &T::AccountId,
		collection_id: &CollectionId,
		item_id: &TokenId,
	) -> Option<T::AccountId> {
		let collection = CollectionById::<T>::get(collection_id)?;

		let mut sponsor_transfer = false;
		if collection.sponsorship.confirmed() {
			let collection_limits = collection.limits.clone();
			let collection_mode = collection.mode.clone();

			// sponsor timeout
			let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
			sponsor_transfer = match collection_mode {
				CollectionMode::NFT => {
					// get correct limit
					let limit: u32 = if collection_limits.sponsor_transfer_timeout != 0 {
						if collection_limits.sponsor_transfer_timeout > NFT_SPONSOR_TRANSFER_TIMEOUT
						{
							collection_limits.sponsor_transfer_timeout
						} else {
							NFT_SPONSOR_TRANSFER_TIMEOUT
						}
					} else {
						0
					};

					let mut sponsored = true;
					if NftTransferBasket::<T>::contains_key(collection_id, item_id) {
						let last_tx_block = NftTransferBasket::<T>::get(collection_id, item_id);
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsored = false;
						}
					}
					if sponsored {
						NftTransferBasket::<T>::insert(collection_id, item_id, block_number);
					}

					sponsored
				}
				CollectionMode::Fungible(_) => {
					// get correct limit
					let limit: u32 = if collection_limits.sponsor_transfer_timeout != 0 {
						if collection_limits.sponsor_transfer_timeout
							> FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT
						{
							collection_limits.sponsor_transfer_timeout
						} else {
							FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT
						}
					} else {
						0
					};

					let mut sponsored = true;
					if FungibleTransferBasket::<T>::contains_key(collection_id, who) {
						let last_tx_block = FungibleTransferBasket::<T>::get(collection_id, who);
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsored = false;
						}
					}
					if sponsored {
						FungibleTransferBasket::<T>::insert(collection_id, who, block_number);
					}

					sponsored
				}
				CollectionMode::ReFungible => {
					// get correct limit
					let limit: u32 = if collection_limits.sponsor_transfer_timeout != 0 {
						if collection_limits.sponsor_transfer_timeout
							> REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT
						{
							collection_limits.sponsor_transfer_timeout
						} else {
							REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT
						}
					} else {
						0
					};

					let mut sponsored = true;
					if ReFungibleTransferBasket::<T>::contains_key(collection_id, item_id) {
						let last_tx_block =
							ReFungibleTransferBasket::<T>::get(collection_id, item_id);
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsored = false;
						}
					}
					if sponsored {
						ReFungibleTransferBasket::<T>::insert(collection_id, item_id, block_number);
					}

					sponsored
				}
			};
		}

		if !sponsor_transfer {
			None
		} else {
			collection.sponsorship.sponsor().cloned()
		}
	}

	pub fn withdraw_set_variable_meta_data(
		collection_id: &CollectionId,
		item_id: &TokenId,
		data: &[u8],
	) -> Option<T::AccountId> {
		let mut sponsor_metadata_changes = false;

		let collection = CollectionById::<T>::get(collection_id)?;

		if collection.sponsorship.confirmed() &&
			// Can't sponsor fungible collection, this tx will be rejected
			// as invalid
			!matches!(collection.mode, CollectionMode::Fungible(_)) &&
			data.len() <= collection.limits.sponsored_data_size as usize
		{
			if let Some(rate_limit) = collection.limits.sponsored_data_rate_limit {
				let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;

				if VariableMetaDataBasket::<T>::get(collection_id, item_id)
					.map(|last_block| block_number - last_block > rate_limit)
					.unwrap_or(true)
				{
					sponsor_metadata_changes = true;
					VariableMetaDataBasket::<T>::insert(collection_id, item_id, block_number);
				}
			}
		}

		if !sponsor_metadata_changes {
			None
		} else {
			collection.sponsorship.sponsor().cloned()
		}
	}
}

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
			} => Self::withdraw_create_item(who, collection_id, data),
			Call::transfer {
				collection_id,
				item_id,
				..
			} => Self::withdraw_transfer(who, collection_id, item_id),
			Call::set_variable_meta_data {
				collection_id,
				item_id,
				data,
			} => Self::withdraw_set_variable_meta_data(collection_id, item_id, data),
			_ => None,
		}
	}
}
