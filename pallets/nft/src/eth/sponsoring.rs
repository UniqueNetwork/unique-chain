//! Implements EVM sponsoring logic via OnChargeEVMTransaction

use crate::{Collection, Config, FungibleTransferBasket, NftTransferBasket};
use evm_coder::{Call, abi::AbiReader};
use frame_support::{
	storage::{StorageDoubleMap},
};
use pallet_common::eth::map_eth_to_id;
use sp_core::H160;
use sp_std::prelude::*;
use up_sponsorship::SponsorshipHandler;
use core::marker::PhantomData;
use core::convert::TryInto;
use nft_data_structs::{CollectionId, NFT_SPONSOR_TRANSFER_TIMEOUT, FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT};
use pallet_common::{
	CollectionById,
	account::{CrossAccountId, EvmBackwardsAddressMapping},
};

use pallet_nonfungible::erc::{UniqueNFTCall, ERC721UniqueExtensionsCall, ERC721Call};
use pallet_fungible::erc::{UniqueFungibleCall, ERC20Call};

struct AnyError;

fn try_sponsor<T: Config>(
	caller: &H160,
	collection_id: CollectionId,
	collection: &Collection<T>,
	call: &[u8],
) -> Result<(), AnyError> {
	let (method_id, mut reader) = AbiReader::new_call(call).map_err(|_| AnyError)?;
	match &collection.mode {
		crate::CollectionMode::NFT => {
			let call: UniqueNFTCall = UniqueNFTCall::parse(method_id, &mut reader)
				.map_err(|_| AnyError)?
				.ok_or(AnyError)?;
			match call {
				UniqueNFTCall::ERC721UniqueExtensions(
					ERC721UniqueExtensionsCall::TransferNft { token_id, .. },
				)
				| UniqueNFTCall::ERC721(ERC721Call::TransferFrom { token_id, .. }) => {
					let token_id: u32 = token_id.try_into().map_err(|_| AnyError)?;
					let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
					let collection_limits = &collection.limits;
					let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
						collection_limits.sponsor_transfer_timeout
					} else {
						NFT_SPONSOR_TRANSFER_TIMEOUT
					};

					let mut sponsor = true;
					if <NftTransferBasket<T>>::contains_key(collection_id, token_id) {
						let last_tx_block = <NftTransferBasket<T>>::get(collection_id, token_id);
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsor = false;
						}
					}
					if sponsor {
						<NftTransferBasket<T>>::insert(collection_id, token_id, block_number);
						return Ok(());
					}
				}
				_ => {}
			}
		}
		crate::CollectionMode::Fungible(_) => {
			let call: UniqueFungibleCall = UniqueFungibleCall::parse(method_id, &mut reader)
				.map_err(|_| AnyError)?
				.ok_or(AnyError)?;
			#[allow(clippy::single_match)]
			match call {
				UniqueFungibleCall::ERC20(ERC20Call::Transfer { .. }) => {
					let who = T::CrossAccountId::from_eth(*caller);
					let collection_limits = &collection.limits;
					let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
						collection_limits.sponsor_transfer_timeout
					} else {
						FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT
					};

					let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
					let mut sponsored = true;
					if <FungibleTransferBasket<T>>::contains_key(collection_id, who.as_sub()) {
						let last_tx_block =
							<FungibleTransferBasket<T>>::get(collection_id, who.as_sub());
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsored = false;
						}
					}
					if sponsored {
						<FungibleTransferBasket<T>>::insert(
							collection_id,
							who.as_sub(),
							block_number,
						);
						return Ok(());
					}
				}
				_ => {}
			}
		}
		_ => {}
	}
	Err(AnyError)
}

pub struct NftEthSponsorshipHandler<T: Config>(PhantomData<*const T>);
impl<T: Config> SponsorshipHandler<H160, (H160, Vec<u8>)> for NftEthSponsorshipHandler<T> {
	fn get_sponsor(who: &H160, call: &(H160, Vec<u8>)) -> Option<H160> {
		if let Some(collection_id) = map_eth_to_id(&call.0) {
			if let Some(collection) = <CollectionById<T>>::get(collection_id) {
				if !collection.sponsorship.confirmed() {
					return None;
				}
				if try_sponsor(who, collection_id, &collection, &call.1).is_ok() {
					return collection
						.sponsorship
						.sponsor()
						.cloned()
						.map(T::EvmBackwardsAddressMapping::from_account_id);
				}
			}
		}
		None
	}
}
