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
use evm_coder::{Call};
use pallet_common::{CollectionHandle, eth::map_eth_to_id};
use pallet_evm::account::CrossAccountId;
use pallet_evm_transaction_payment::CallContext;
use pallet_nonfungible::{
	Config as NonfungibleConfig, Pallet as NonfungiblePallet, NonfungibleHandle,
	erc::{
		UniqueNFTCall, ERC721UniqueExtensionsCall, ERC721UniqueMintableCall, ERC721Call,
		TokenPropertiesCall,
	},
};
use pallet_fungible::{
	Config as FungibleConfig,
	erc::{UniqueFungibleCall, ERC20Call},
};
use pallet_refungible::{
	Config as RefungibleConfig,
	erc::UniqueRefungibleCall,
	erc_token::{RefungibleTokenHandle, UniqueRefungibleTokenCall},
	RefungibleHandle,
};
use pallet_unique::Config as UniqueConfig;
use sp_std::prelude::*;
use up_data_structs::{
	CollectionMode, CreateItemData, CreateNftData, mapping::TokenAddressMapping, TokenId,
};
use up_sponsorship::SponsorshipHandler;
use crate::{Runtime, runtime_common::sponsoring::*};

mod refungible;

pub type EvmSponsorshipHandler = (
	UniqueEthSponsorshipHandler<Runtime>,
	pallet_evm_contract_helpers::HelpersContractSponsoring<Runtime>,
);

pub struct UniqueEthSponsorshipHandler<T: UniqueConfig>(PhantomData<*const T>);
impl<T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig>
	SponsorshipHandler<T::CrossAccountId, CallContext> for UniqueEthSponsorshipHandler<T>
where
	T::AccountId: From<[u8; 32]>,
{
	fn get_sponsor(
		who: &T::CrossAccountId,
		call_context: &CallContext,
	) -> Option<T::CrossAccountId> {
		if let Some(collection_id) = map_eth_to_id(&call_context.contract_address) {
			let collection = <CollectionHandle<T>>::new(collection_id)?;
			let sponsor = collection.sponsorship.sponsor()?.clone();
			// let (method_id, mut reader) = AbiReader::new_call(&call_context.input).ok()?;
			Some(T::CrossAccountId::from_sub(match &collection.mode {
				CollectionMode::NFT => {
					let collection = NonfungibleHandle::cast(collection);
					let call = <UniqueNFTCall<T>>::parse_full(&call_context.input).ok()??;
					match call {
						UniqueNFTCall::TokenProperties(call) => match call {
							TokenPropertiesCall::SetProperty {
								token_id,
								key,
								value,
								..
							} => {
								let token_id: TokenId = token_id.try_into().ok()?;
								withdraw_set_existing_token_property::<T>(
									&collection,
									who,
									&token_id,
									key.len() + value.len(),
								)
								.map(|()| sponsor)
							}
							TokenPropertiesCall::SetProperties {
								token_id,
								properties,
								..
							} => {
								let token_id: TokenId = token_id.try_into().ok()?;
								let data_size = properties
									.into_iter()
									.map(|p| p.key().len() + p.value().len())
									.sum();

								withdraw_set_existing_token_property::<T>(
									&collection,
									who,
									&token_id,
									data_size,
								)
								.map(|()| sponsor)
							}
							_ => None,
						},
						UniqueNFTCall::ERC721UniqueExtensions(call) => match call {
							ERC721UniqueExtensionsCall::Transfer { token_id, .. } => {
								let token_id: TokenId = token_id.try_into().ok()?;
								withdraw_transfer::<T>(&collection, who, &token_id)
									.map(|()| sponsor)
							}
							ERC721UniqueExtensionsCall::MintCross { properties, .. } => {
								withdraw_create_item::<T>(
									&collection,
									who,
									&CreateItemData::NFT(CreateNftData::default()),
								)?;

								let token_id =
									<NonfungiblePallet<T>>::next_token_id(&collection).ok()?;
								let data_size: usize = properties
									.into_iter()
									.map(|p| p.key().len() + p.value().len())
									.sum();

								withdraw_set_token_property::<T>(&collection, &token_id, data_size)
									.map(|()| sponsor)
							}
							_ => None,
						},
						UniqueNFTCall::ERC721UniqueMintable(
							ERC721UniqueMintableCall::Mint { .. }
							| ERC721UniqueMintableCall::MintCheckId { .. }
							| ERC721UniqueMintableCall::MintWithTokenUri { .. }
							| ERC721UniqueMintableCall::MintWithTokenUriCheckId { .. },
						) => withdraw_create_item::<T>(
							&collection,
							who,
							&CreateItemData::NFT(CreateNftData::default()),
						)
						.map(|()| sponsor),
						UniqueNFTCall::ERC721(ERC721Call::TransferFrom {
							token_id, from, ..
						}) => {
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
				CollectionMode::ReFungible => {
					let call = <UniqueRefungibleCall<T>>::parse_full(&call_context.input).ok()??;
					refungible::call_sponsor(call, collection, who).map(|()| sponsor)
				}
				CollectionMode::Fungible(_) => {
					let call = <UniqueFungibleCall<T>>::parse_full(&call_context.input).ok()??;
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
			}?))
		} else {
			let (collection_id, token_id) =
				T::EvmTokenAddressMapping::address_to_token(&call_context.contract_address)?;
			let collection = <CollectionHandle<T>>::new(collection_id)?;
			if collection.mode != CollectionMode::ReFungible {
				return None;
			}
			let sponsor = collection.sponsorship.sponsor()?.clone();
			let rft_collection = RefungibleHandle::cast(collection);
			// Token existance isn't checked at this point and should be checked in `withdraw` method.
			let token = RefungibleTokenHandle(rft_collection, token_id);

			let call = <UniqueRefungibleTokenCall<T>>::parse_full(&call_context.input).ok()??;
			Some(T::CrossAccountId::from_sub(
				refungible::token_call_sponsor(call, token, who).map(|()| sponsor)?,
			))
		}
	}
}

mod common {
	use super::*;

	use pallet_common::erc::{CollectionCall};

	pub fn collection_call_sponsor<T>(
		call: CollectionCall<T>,
		_collection: CollectionHandle<T>,
		_who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use CollectionCall::*;

		match call {
			// Readonly
			ERC165Call(_, _)
			| CollectionProperty { .. }
			| CollectionProperties { .. }
			| HasCollectionPendingSponsor
			| CollectionSponsor
			| ContractAddress
			| AllowlistedCross { .. }
			| IsOwnerOrAdminEth { .. }
			| IsOwnerOrAdminCross { .. }
			| CollectionOwner
			| CollectionAdmins
			| CollectionLimits
			| CollectionNesting
			| CollectionNestingRestrictedIds
			| CollectionNestingPermissions
			| UniqueCollectionType => None,

			// Not sponsored
			AddToCollectionAllowList { .. }
			| AddToCollectionAllowListCross { .. }
			| RemoveFromCollectionAllowList { .. }
			| RemoveFromCollectionAllowListCross { .. }
			| AddCollectionAdminCross { .. }
			| RemoveCollectionAdminCross { .. }
			| AddCollectionAdmin { .. }
			| RemoveCollectionAdmin { .. }
			| SetNestingBool { .. }
			| SetNesting { .. }
			| SetNestingCollectionIds { .. }
			| SetCollectionAccess { .. }
			| SetCollectionMintMode { .. }
			| SetOwner { .. }
			| ChangeCollectionOwnerCross { .. }
			| SetCollectionProperty { .. }
			| SetCollectionProperties { .. }
			| DeleteCollectionProperty { .. }
			| DeleteCollectionProperties { .. }
			| SetCollectionSponsor { .. }
			| SetCollectionSponsorCross { .. }
			| SetCollectionLimit { .. }
			| ConfirmCollectionSponsorship
			| RemoveCollectionSponsor => None,
		}
	}
}
