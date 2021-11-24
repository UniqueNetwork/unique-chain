//! Implements EVM sponsoring logic via OnChargeEVMTransaction

use crate::{Config, sponsorship::*};
use evm_coder::{Call, abi::AbiReader};
use pallet_common::{CollectionHandle, eth::map_eth_to_id};
use sp_core::H160;
use sp_std::prelude::*;
use up_sponsorship::SponsorshipHandler;
use core::marker::PhantomData;
use core::convert::TryInto;
use up_data_structs::TokenId;
use up_evm_mapping::EvmBackwardsAddressMapping;
use pallet_common::account::CrossAccountId;

use pallet_nonfungible::erc::{UniqueNFTCall, ERC721UniqueExtensionsCall, ERC721Call};
use pallet_fungible::erc::{UniqueFungibleCall, ERC20Call};

pub struct UniqueEthSponsorshipHandler<T: Config>(PhantomData<*const T>);
impl<T: Config> SponsorshipHandler<H160, (H160, Vec<u8>)> for UniqueEthSponsorshipHandler<T> {
	fn get_sponsor(who: &H160, call: &(H160, Vec<u8>)) -> Option<H160> {
		let collection_id = map_eth_to_id(&call.0)?;
		let collection = <CollectionHandle<T>>::new(collection_id)?;
		let sponsor = collection.sponsorship.sponsor()?.clone();
		let sponsor =
			<T as pallet_common::Config>::EvmBackwardsAddressMapping::from_account_id(sponsor);
		let who = T::CrossAccountId::from_eth(*who);
		let (method_id, mut reader) = AbiReader::new_call(&call.1).ok()?;
		match &collection.mode {
			crate::CollectionMode::NFT => {
				let call = UniqueNFTCall::parse(method_id, &mut reader).ok()??;
				match call {
					UniqueNFTCall::ERC721UniqueExtensions(
						ERC721UniqueExtensionsCall::Transfer { token_id, .. },
					) => {
						let token_id: TokenId = token_id.try_into().ok()?;
						withdraw_transfer::<T>(&collection, &who, &token_id).map(|()| sponsor)
					}
					UniqueNFTCall::ERC721(ERC721Call::TransferFrom { token_id, from, .. }) => {
						let token_id: TokenId = token_id.try_into().ok()?;
						let from = T::CrossAccountId::from_eth(from);
						withdraw_transfer::<T>(&collection, &from, &token_id).map(|()| sponsor)
					}
					UniqueNFTCall::ERC721(ERC721Call::Approve { token_id, .. }) => {
						let token_id: TokenId = token_id.try_into().ok()?;
						withdraw_approve::<T>(&collection, who.as_sub(), &token_id)
							.map(|()| sponsor)
					}
					_ => None,
				}
			}
			crate::CollectionMode::Fungible(_) => {
				let call = UniqueFungibleCall::parse(method_id, &mut reader).ok()??;
				#[allow(clippy::single_match)]
				match call {
					UniqueFungibleCall::ERC20(ERC20Call::Transfer { .. }) => {
						withdraw_transfer::<T>(&collection, &who, &TokenId::default())
							.map(|()| sponsor)
					}
					UniqueFungibleCall::ERC20(ERC20Call::TransferFrom { from, .. }) => {
						let from = T::CrossAccountId::from_eth(from);
						withdraw_transfer::<T>(&collection, &from, &TokenId::default())
							.map(|()| sponsor)
					}
					UniqueFungibleCall::ERC20(ERC20Call::Approve { .. }) => {
						withdraw_approve::<T>(&collection, who.as_sub(), &TokenId::default())
							.map(|()| sponsor)
					}
					_ => None,
				}
			}
			_ => None,
		}
	}
}
