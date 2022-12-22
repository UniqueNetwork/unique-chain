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

use core::convert::TryInto;
use pallet_common::CollectionHandle;
use pallet_evm::account::CrossAccountId;
use pallet_fungible::Config as FungibleConfig;
use pallet_refungible::Config as RefungibleConfig;
use pallet_nonfungible::Config as NonfungibleConfig;
use pallet_unique::Config as UniqueConfig;
use up_data_structs::{CreateItemData, CreateNftData, TokenId};

use super::common;
use crate::runtime_common::sponsoring::*;

use pallet_refungible::{
	erc::{
		ERC721BurnableCall, ERC721Call, ERC721EnumerableCall, ERC721MetadataCall,
		ERC721UniqueExtensionsCall, ERC721UniqueMintableCall, TokenPropertiesCall,
		UniqueRefungibleCall,
	},
	erc_token::{
		ERC1633Call, ERC20Call, ERC20UniqueExtensionsCall, RefungibleTokenHandle,
		UniqueRefungibleTokenCall,
	},
};

pub fn call_sponsor<T>(
	call: UniqueRefungibleCall<T>,
	collection: CollectionHandle<T>,
	who: &T::CrossAccountId,
) -> Option<()>
where
	T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
{
	use UniqueRefungibleCall::*;

	match call {
		// Readonly
		ERC165Call(_, _) => None,

		ERC721Enumerable(call) => erc721::enumerable_call_sponsor(call, collection, who),
		ERC721Burnable(call) => erc721::burnable_call_sponsor(call, collection, who),
		ERC721Metadata(call) => erc721::metadata_call_sponsor(call, collection, who),
		Collection(call) => common::collection_call_sponsor(call, collection, who),
		ERC721(call) => erc721::call_sponsor(call, collection, who),
		ERC721UniqueExtensions(call) => {
			erc721::unique_extensions_call_sponsor(call, collection, who)
		}
		ERC721UniqueMintable(call) => erc721::unique_mintable_call_sponsor(call, collection, who),
		TokenProperties(call) => token_properties_call_sponsor(call, collection, who),
	}
}

pub fn token_properties_call_sponsor<T>(
	call: TokenPropertiesCall<T>,
	collection: CollectionHandle<T>,
	who: &T::CrossAccountId,
) -> Option<()>
where
	T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
{
	use TokenPropertiesCall::*;

	match call {
		// Readonly
		ERC165Call(_, _) | Property { .. } | TokenPropertyPermissions => None,

		// Not sponsored
		SetTokenPropertyPermission { .. }
		| SetTokenPropertyPermissions { .. }
		| SetProperties { .. }
		| DeleteProperty { .. }
		| DeleteProperties { .. } => None,

		SetProperty {
			token_id,
			key,
			value,
			..
		} => {
			let token_id = TokenId::try_from(token_id).ok()?;
			withdraw_set_token_property::<T>(&collection, &who, &token_id, key.len() + value.len())
		}
	}
}

pub fn token_call_sponsor<T>(
	call: UniqueRefungibleTokenCall<T>,
	token: RefungibleTokenHandle<T>,
	who: &T::CrossAccountId,
) -> Option<()>
where
	T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
{
	use UniqueRefungibleTokenCall::*;

	match call {
		// Readonly
		ERC165Call(_, _) => None,

		ERC20(call) => erc20::call_sponsor(call, token, who),
		ERC20UniqueExtensions(call) => erc20::unique_extensions_call_sponsor(call, token, who),
		ERC1633(call) => erc1633::call_sponsor(call, token, who),
	}
}

mod erc721 {
	use super::*;

	pub fn call_sponsor<T>(
		call: ERC721Call<T>,
		collection: CollectionHandle<T>,
		_who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC721Call::*;

		match call {
			// Readonly
			ERC165Call(_, _)
			| BalanceOf { .. }
			| OwnerOf { .. }
			| GetApproved { .. }
			| IsApprovedForAll { .. }
			| CollectionHelperAddress => None,

			// Not sponsored
			SafeTransferFromWithData { .. }
			| SafeTransferFrom { .. }
			| SetApprovalForAll { .. } => None,

			TransferFrom { token_id, from, .. } => {
				let token_id = TokenId::try_from(token_id).ok()?;
				let from = T::CrossAccountId::from_eth(from);
				withdraw_transfer::<T>(&collection, &from, &token_id)
			}

			// Not supported
			Approve { .. } => None,
		}
	}

	pub fn enumerable_call_sponsor<T>(
		call: ERC721EnumerableCall<T>,
		_collection: CollectionHandle<T>,
		_who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC721EnumerableCall::*;

		match call {
			// Readonly
			ERC165Call(_, _) | TokenByIndex { .. } | TokenOfOwnerByIndex { .. } | TotalSupply => {
				None
			}
		}
	}

	pub fn burnable_call_sponsor<T>(
		call: ERC721BurnableCall<T>,
		_collection: CollectionHandle<T>,
		_who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC721BurnableCall::*;

		match call {
			// Readonly
			ERC165Call(_, _) => None,

			// Not sponsored
			Burn { .. } => None,
		}
	}

	pub fn metadata_call_sponsor<T>(
		call: ERC721MetadataCall<T>,
		_collection: CollectionHandle<T>,
		_who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC721MetadataCall::*;

		match call {
			// Readonly
			ERC165Call(_, _) | NameProxy | SymbolProxy | TokenUri { .. } => None,
		}
	}

	pub fn unique_extensions_call_sponsor<T>(
		call: ERC721UniqueExtensionsCall<T>,
		collection: CollectionHandle<T>,
		who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC721UniqueExtensionsCall::*;

		match call {
			// Readonly
			ERC165Call(_, _)
			| Name
			| Symbol
			| Description
			| CrossOwnerOf { .. }
			| Properties { .. }
			| NextTokenId
			| TokenContractAddress { .. } => None,

			// Not sponsored
			BurnFrom { .. }
			| BurnFromCross { .. }
			| MintBulk { .. }
			| MintBulkWithTokenUri { .. } => None,

			MintCross { .. } => withdraw_create_item::<T>(
				&collection,
				&who,
				&CreateItemData::NFT(CreateNftData::default()),
			),

			TransferCross { token_id, .. }
			| TransferFromCross { token_id, .. }
			| Transfer { token_id, .. } => {
				let token_id = TokenId::try_from(token_id).ok()?;
				withdraw_transfer::<T>(&collection, &who, &token_id)
			}
		}
	}

	pub fn unique_mintable_call_sponsor<T>(
		call: ERC721UniqueMintableCall<T>,
		collection: CollectionHandle<T>,
		who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC721UniqueMintableCall::*;

		match call {
			// Readonly
			ERC165Call(_, _) | MintingFinished => None,

			// Not sponsored
			FinishMinting => None,

			Mint { .. }
			| MintCheckId { .. }
			| MintWithTokenUri { .. }
			| MintWithTokenUriCheckId { .. } => withdraw_create_item::<T>(
				&collection,
				&who,
				&CreateItemData::NFT(CreateNftData::default()),
			),
		}
	}
}

mod erc20 {
	use super::*;

	pub fn call_sponsor<T>(
		call: ERC20Call<T>,
		token: RefungibleTokenHandle<T>,
		who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC20Call::*;

		match call {
			// Readonly
			ERC165Call(_, _)
			| Name
			| Symbol
			| TotalSupply
			| Decimals
			| BalanceOf { .. }
			| Allowance { .. } => None,

			Transfer { .. } => {
				let RefungibleTokenHandle(handle, token_id) = token;
				let token_id = token_id.try_into().ok()?;
				withdraw_transfer::<T>(&handle, &who, &token_id)
			}
			TransferFrom { from, .. } => {
				let RefungibleTokenHandle(handle, token_id) = token;
				let token_id = token_id.try_into().ok()?;
				let from = T::CrossAccountId::from_eth(from);
				withdraw_transfer::<T>(&handle, &from, &token_id)
			}
			Approve { .. } => {
				let RefungibleTokenHandle(handle, token_id) = token;
				let token_id = token_id.try_into().ok()?;
				withdraw_approve::<T>(&handle, who.as_sub(), &token_id)
			}
		}
	}

	pub fn unique_extensions_call_sponsor<T>(
		call: ERC20UniqueExtensionsCall<T>,
		token: RefungibleTokenHandle<T>,
		who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC20UniqueExtensionsCall::*;

		match call {
			// Readonly
			ERC165Call(_, _) => None,

			// Not sponsored
			BurnFrom { .. } | BurnFromCross { .. } | Repartition { .. } => None,

			TransferCross { .. } | TransferFromCross { .. } => {
				let RefungibleTokenHandle(handle, token_id) = token;
				let token_id = token_id.try_into().ok()?;
				withdraw_transfer::<T>(&handle, &who, &token_id)
			}

			ApproveCross { .. } => {
				let RefungibleTokenHandle(handle, token_id) = token;
				let token_id = token_id.try_into().ok()?;
				withdraw_approve::<T>(&handle, who.as_sub(), &token_id)
			}
		}
	}
}

mod erc1633 {
	use super::*;

	pub fn call_sponsor<T>(
		call: ERC1633Call<T>,
		_token: RefungibleTokenHandle<T>,
		_who: &T::CrossAccountId,
	) -> Option<()>
	where
		T: UniqueConfig + FungibleConfig + NonfungibleConfig + RefungibleConfig,
	{
		use ERC1633Call::*;

		match call {
			// Readonly
			ERC165Call(_, _) | ParentToken | ParentTokenId => None,
		}
	}
}
