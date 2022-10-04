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

//! Implements EVM sponsoring logic via TransactionValidityHack

use core::{convert::TryInto, marker::PhantomData};
use evm_coder::{Call, abi::AbiReader};
use pallet_common::{CollectionHandle, eth::map_eth_to_id};
use pallet_evm::account::CrossAccountId;
use pallet_evm_transaction_payment::CallContext;
use pallet_nonfungible::{
	Config as NonfungibleConfig,
	erc::{
		UniqueNFTCall, ERC721UniqueExtensionsCall, ERC721MintableCall, ERC721Call,
		TokenPropertiesCall,
	},
};
use pallet_fungible::{
	Config as FungibleConfig,
	erc::{UniqueFungibleCall, ERC20Call},
};
use pallet_refungible::Config as RefungibleConfig;
use pallet_unique::Config as UniqueConfig;
use sp_std::prelude::*;
use up_data_structs::{CollectionMode, CreateItemData, CreateNftData, TokenId};
use up_sponsorship::SponsorshipHandler;

use crate::{Runtime, runtime_common::sponsoring::*};

pub type EvmSponsorshipHandler = (
	UniqueEthSponsorshipHandler<Runtime>,
	pallet_evm_contract_helpers::HelpersContractSponsoring<Runtime>,
);

pub struct UniqueEthSponsorshipHandler<T: UniqueConfig>(PhantomData<*const T>);
impl<T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig>
	SponsorshipHandler<T::CrossAccountId, CallContext> for UniqueEthSponsorshipHandler<T>
{
	fn get_sponsor(
		who: &T::CrossAccountId,
		call_context: &CallContext,
	) -> Option<T::CrossAccountId> {
		let collection_id = map_eth_to_id(&call_context.contract_address)?;
		let collection = <CollectionHandle<T>>::new(collection_id)?;
		let sponsor = collection.sponsorship.sponsor()?.clone();
		let (method_id, mut reader) = AbiReader::new_call(&call_context.input).ok()?;
		Some(T::CrossAccountId::from_sub(match &collection.mode {
			CollectionMode::NFT => {
				let call = <UniqueNFTCall<T>>::parse(method_id, &mut reader).ok()??;
				match call {
					UniqueNFTCall::TokenProperties(TokenPropertiesCall::SetProperty {
						token_id,
						key,
						value,
						..
					}) => {
						let token_id: TokenId = token_id.try_into().ok()?;
						withdraw_set_token_property::<T>(
							&collection,
							who,
							&token_id,
							key.len() + value.len(),
						)
						.map(|()| sponsor)
					}
					UniqueNFTCall::ERC721UniqueExtensions(
						ERC721UniqueExtensionsCall::Transfer { token_id, .. },
					) => {
						let token_id: TokenId = token_id.try_into().ok()?;
						withdraw_transfer::<T>(&collection, who, &token_id).map(|()| sponsor)
					}
					UniqueNFTCall::ERC721Mintable(
						ERC721MintableCall::Mint { token_id, .. }
						| ERC721MintableCall::MintWithTokenUri { token_id, .. },
					) => {
						let _token_id: TokenId = token_id.try_into().ok()?;
						withdraw_create_item::<T>(
							&collection,
							who,
							&CreateItemData::NFT(CreateNftData::default()),
						)
						.map(|()| sponsor)
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
			CollectionMode::Fungible(_) => {
				let call = <UniqueFungibleCall<T>>::parse(method_id, &mut reader).ok()??;
				#[allow(clippy::single_match)]
				match call {
					UniqueFungibleCall::ERC20(ERC20Call::Transfer { .. }) => {
						withdraw_transfer::<T>(&collection, who, &TokenId::default())
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
		}?))
	}
}
