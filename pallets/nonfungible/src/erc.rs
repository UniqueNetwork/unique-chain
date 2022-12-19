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

//! # Nonfungible Pallet EVM API
//!
//! Provides ERC-721 standart support implementation and EVM API for unique extensions for Nonfungible Pallet.
//! Method implementations are mostly doing parameter conversion and calling Nonfungible Pallet methods.

extern crate alloc;
use core::{
	char::{REPLACEMENT_CHARACTER, decode_utf16},
	convert::TryInto,
};
use evm_coder::{
	abi::AbiType, ToLog, execution::*, generate_stubgen, solidity, solidity_interface, types::*,
	weight,
};
use frame_support::BoundedVec;
use up_data_structs::{
	TokenId, PropertyPermission, PropertyKeyPermission, Property, CollectionId, PropertyKey,
	CollectionPropertiesVec,
};
use pallet_evm_coder_substrate::dispatch_to_evm;
use sp_std::{vec::Vec, vec};
use pallet_common::{
	CollectionHandle, CollectionPropertyPermissions, CommonCollectionOperations,
	erc::{CommonEvmHandler, PrecompileResult, CollectionCall, static_property::key},
	eth::{Property as PropertyStruct, EthCrossAccount},
};
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::call;
use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
use sp_core::Get;

use crate::{
	AccountBalance, Config, CreateItemData, NonfungibleHandle, Pallet, TokenData, TokensMinted,
	SelfWeightOf, weights::WeightInfo, TokenProperties,
};

/// @title A contract that allows to set and delete token properties and change token property permissions.
#[solidity_interface(name = TokenProperties)]
impl<T: Config> NonfungibleHandle<T> {
	/// @notice Set permissions for token property.
	/// @dev Throws error if `msg.sender` is not admin or owner of the collection.
	/// @param key Property key.
	/// @param isMutable Permission to mutate property.
	/// @param collectionAdmin Permission to mutate property by collection admin if property is mutable.
	/// @param tokenOwner Permission to mutate property by token owner if property is mutable.
	#[weight(<SelfWeightOf<T>>::set_token_property_permissions(1))]
	#[solidity(hide)]
	fn set_token_property_permission(
		&mut self,
		caller: caller,
		key: string,
		is_mutable: bool,
		collection_admin: bool,
		token_owner: bool,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		<Pallet<T>>::set_token_property_permissions(
			self,
			&caller,
			vec![PropertyKeyPermission {
				key: <Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| "too long key")?,
				permission: PropertyPermission {
					mutable: is_mutable,
					collection_admin,
					token_owner,
				},
			}],
		)
		.map_err(dispatch_to_evm::<T>)
	}

	/// @notice Set permissions for token property.
	/// @dev Throws error if `msg.sender` is not admin or owner of the collection.
	/// @param permissions Permissions for keys.
	#[weight(<SelfWeightOf<T>>::set_token_property_permissions(permissions.len() as u32))]
	fn set_token_property_permissions(
		&mut self,
		caller: caller,
		permissions: Vec<pallet_common::eth::TokenPropertyPermission>,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let perms = pallet_common::eth::TokenPropertyPermission::into_property_key_permissions(
			permissions,
		)?;

		<Pallet<T>>::set_token_property_permissions(self, &caller, perms)
			.map_err(dispatch_to_evm::<T>)
	}

	/// @notice Get permissions for token properties.
	fn token_property_permissions(
		&self,
	) -> Result<Vec<pallet_common::eth::TokenPropertyPermission>> {
		let perms = <Pallet<T>>::token_property_permission(self.id);
		Ok(perms
			.into_iter()
			.map(pallet_common::eth::TokenPropertyPermission::from)
			.collect())
	}

	/// @notice Set token property value.
	/// @dev Throws error if `msg.sender` has no permission to edit the property.
	/// @param tokenId ID of the token.
	/// @param key Property key.
	/// @param value Property value.
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::set_token_properties(1))]
	fn set_property(
		&mut self,
		caller: caller,
		token_id: uint256,
		key: string,
		value: bytes,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too long")?;
		let value = value.0.try_into().map_err(|_| "value too long")?;

		let nesting_budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::set_token_property(
			self,
			&caller,
			TokenId(token_id),
			Property { key, value },
			&nesting_budget,
		)
		.map_err(dispatch_to_evm::<T>)
	}

	/// @notice Set token properties value.
	/// @dev Throws error if `msg.sender` has no permission to edit the property.
	/// @param tokenId ID of the token.
	/// @param properties settable properties
	#[weight(<SelfWeightOf<T>>::set_token_properties(properties.len() as u32))]
	fn set_properties(
		&mut self,
		caller: caller,
		token_id: uint256,
		properties: Vec<PropertyStruct>,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;

		let nesting_budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let properties = properties
			.into_iter()
			.map(|PropertyStruct { key, value }| {
				let key = <Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| "key too large")?;

				let value = value.0.try_into().map_err(|_| "value too large")?;

				Ok(Property { key, value })
			})
			.collect::<Result<Vec<_>>>()?;

		<Pallet<T>>::set_token_properties(
			self,
			&caller,
			TokenId(token_id),
			properties.into_iter(),
			false,
			&nesting_budget,
		)
		.map_err(dispatch_to_evm::<T>)
	}

	/// @notice Delete token property value.
	/// @dev Throws error if `msg.sender` has no permission to edit the property.
	/// @param tokenId ID of the token.
	/// @param key Property key.
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::delete_token_properties(1))]
	fn delete_property(&mut self, token_id: uint256, caller: caller, key: string) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too long")?;

		let nesting_budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::delete_token_property(self, &caller, TokenId(token_id), key, &nesting_budget)
			.map_err(dispatch_to_evm::<T>)
	}

	/// @notice Delete token properties value.
	/// @dev Throws error if `msg.sender` has no permission to edit the property.
	/// @param tokenId ID of the token.
	/// @param keys Properties key.
	#[weight(<SelfWeightOf<T>>::delete_token_properties(keys.len() as u32))]
	fn delete_properties(
		&mut self,
		token_id: uint256,
		caller: caller,
		keys: Vec<string>,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let keys = keys
			.into_iter()
			.map(|k| Ok(<Vec<u8>>::from(k).try_into().map_err(|_| "key too long")?))
			.collect::<Result<Vec<_>>>()?;

		let nesting_budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::delete_token_properties(
			self,
			&caller,
			TokenId(token_id),
			keys.into_iter(),
			&nesting_budget,
		)
		.map_err(dispatch_to_evm::<T>)
	}

	/// @notice Get token property value.
	/// @dev Throws error if key not found
	/// @param tokenId ID of the token.
	/// @param key Property key.
	/// @return Property value bytes
	fn property(&self, token_id: uint256, key: string) -> Result<bytes> {
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too long")?;

		let props = <TokenProperties<T>>::get((self.id, token_id));
		let prop = props.get(&key).ok_or("key not found")?;

		Ok(prop.to_vec().into())
	}
}

#[derive(ToLog)]
pub enum ERC721Events {
	/// @dev This emits when ownership of any NFT changes by any mechanism.
	///  This event emits when NFTs are created (`from` == 0) and destroyed
	///  (`to` == 0). Exception: during contract creation, any number of NFTs
	///  may be created and assigned without emitting Transfer. At the time of
	///  any transfer, the approved address for that NFT (if any) is reset to none.
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		#[indexed]
		token_id: uint256,
	},
	/// @dev This emits when the approved address for an NFT is changed or
	///  reaffirmed. The zero address indicates there is no approved address.
	///  When a Transfer event emits, this also indicates that the approved
	///  address for that NFT (if any) is reset to none.
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		approved: address,
		#[indexed]
		token_id: uint256,
	},
	/// @dev This emits when an operator is enabled or disabled for an owner.
	///  The operator can manage all NFTs of the owner.
	#[allow(dead_code)]
	ApprovalForAll {
		#[indexed]
		owner: address,
		#[indexed]
		operator: address,
		approved: bool,
	},
}

#[derive(ToLog)]
pub enum ERC721UniqueMintableEvents {
	#[allow(dead_code)]
	MintingFinished {},
}

/// @title ERC-721 Non-Fungible Token Standard, optional metadata extension
/// @dev See https://eips.ethereum.org/EIPS/eip-721
#[solidity_interface(name = ERC721Metadata, expect_selector = 0x5b5e139f)]
impl<T: Config> NonfungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	/// @notice A descriptive name for a collection of NFTs in this contract
	/// @dev real implementation of this function lies in `ERC721UniqueExtensions`
	#[solidity(hide, rename_selector = "name")]
	fn name_proxy(&self) -> Result<string> {
		self.name()
	}

	/// @notice An abbreviated name for NFTs in this contract
	/// @dev real implementation of this function lies in `ERC721UniqueExtensions`
	#[solidity(hide, rename_selector = "symbol")]
	fn symbol_proxy(&self) -> Result<string> {
		self.symbol()
	}

	/// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
	///
	/// @dev If the token has a `url` property and it is not empty, it is returned.
	///  Else If the collection does not have a property with key `schemaName` or its value is not equal to `ERC721Metadata`, it return an error `tokenURI not set`.
	///  If the collection property `baseURI` is empty or absent, return "" (empty string)
	///  otherwise, if token property `suffix` present and is non-empty, return concatenation of baseURI and suffix
	///  otherwise, return concatenation of `baseURI` and stringified token id (decimal stringifying, without paddings).
	///
	/// @return token's const_metadata
	#[solidity(rename_selector = "tokenURI")]
	fn token_uri(&self, token_id: uint256) -> Result<string> {
		let token_id_u32: u32 = token_id.try_into().map_err(|_| "token id overflow")?;

		match get_token_property(self, token_id_u32, &key::url()).as_deref() {
			Err(_) | Ok("") => (),
			Ok(url) => {
				return Ok(url.into());
			}
		};

		let base_uri =
			pallet_common::Pallet::<T>::get_collection_property(self.id, &key::base_uri())
				.map(BoundedVec::into_inner)
				.map(string::from_utf8)
				.transpose()
				.map_err(|e| {
					Error::Revert(alloc::format!(
						"Can not convert value \"baseURI\" to string with error \"{}\"",
						e
					))
				})?;

		let base_uri = match base_uri.as_deref() {
			None | Some("") => {
				return Ok("".into());
			}
			Some(base_uri) => base_uri.into(),
		};

		Ok(
			match get_token_property(self, token_id_u32, &key::suffix()).as_deref() {
				Err(_) | Ok("") => base_uri,
				Ok(suffix) => base_uri + suffix,
			},
		)
	}
}

/// @title ERC-721 Non-Fungible Token Standard, optional enumeration extension
/// @dev See https://eips.ethereum.org/EIPS/eip-721
#[solidity_interface(name = ERC721Enumerable, expect_selector = 0x780e9d63)]
impl<T: Config> NonfungibleHandle<T> {
	/// @notice Enumerate valid NFTs
	/// @param index A counter less than `totalSupply()`
	/// @return The token identifier for the `index`th NFT,
	///  (sort order not specified)
	fn token_by_index(&self, index: uint256) -> Result<uint256> {
		Ok(index)
	}

	/// @dev Not implemented
	fn token_of_owner_by_index(&self, _owner: address, _index: uint256) -> Result<uint256> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @notice Count NFTs tracked by this contract
	/// @return A count of valid NFTs tracked by this contract, where each one of
	///  them has an assigned and queryable owner not equal to the zero address
	fn total_supply(&self) -> Result<uint256> {
		self.consume_store_reads(1)?;
		Ok(<Pallet<T>>::total_supply(self).into())
	}
}

/// @title ERC-721 Non-Fungible Token Standard
/// @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
#[solidity_interface(name = ERC721, events(ERC721Events), expect_selector = 0x80ac58cd)]
impl<T: Config> NonfungibleHandle<T> {
	/// @notice Count all NFTs assigned to an owner
	/// @dev NFTs assigned to the zero address are considered invalid, and this
	///  function throws for queries about the zero address.
	/// @param owner An address for whom to query the balance
	/// @return The number of NFTs owned by `owner`, possibly zero
	fn balance_of(&self, owner: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <AccountBalance<T>>::get((self.id, owner));
		Ok(balance.into())
	}
	/// @notice Find the owner of an NFT
	/// @dev NFTs assigned to zero address are considered invalid, and queries
	///  about them do throw.
	/// @param tokenId The identifier for an NFT
	/// @return The address of the owner of the NFT
	fn owner_of(&self, token_id: uint256) -> Result<address> {
		self.consume_store_reads(1)?;
		let token: TokenId = token_id.try_into()?;
		Ok(*<TokenData<T>>::get((self.id, token))
			.ok_or("token not found")?
			.owner
			.as_eth())
	}
	/// @dev Not implemented
	#[solidity(rename_selector = "safeTransferFrom")]
	fn safe_transfer_from_with_data(
		&mut self,
		_from: address,
		_to: address,
		_token_id: uint256,
		_data: bytes,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}
	/// @dev Not implemented
	fn safe_transfer_from(
		&mut self,
		_from: address,
		_to: address,
		_token_id: uint256,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
	///  TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE
	///  THEY MAY BE PERMANENTLY LOST
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this NFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param from The current owner of the NFT
	/// @param to The new owner
	/// @param tokenId The NFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer_from())]
	fn transfer_from(
		&mut self,
		caller: caller,
		from: address,
		to: address,
		token_id: uint256,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let to = T::CrossAccountId::from_eth(to);
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, token, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Set or reaffirm the approved address for an NFT
	/// @dev The zero address indicates there is no approved address.
	/// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	///  operator of the current owner.
	/// @param approved The new approved NFT controller
	/// @param tokenId The NFT to approve
	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve(&mut self, caller: caller, approved: address, token_id: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let approved = T::CrossAccountId::from_eth(approved);
		let token = token_id.try_into()?;

		<Pallet<T>>::set_allowance(self, &caller, token, Some(&approved))
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Sets or unsets the approval of a given operator.
	/// The `operator` is allowed to transfer all tokens of the `caller` on their behalf.
	/// @param operator Operator
	/// @param approved Should operator status be granted or revoked?
	#[weight(<SelfWeightOf<T>>::set_allowance_for_all())]
	fn set_approval_for_all(
		&mut self,
		caller: caller,
		operator: address,
		approved: bool,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let operator = T::CrossAccountId::from_eth(operator);

		<Pallet<T>>::set_allowance_for_all(self, &caller, &operator, approved)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @dev Not implemented
	fn get_approved(&self, _token_id: uint256) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @notice Tells whether the given `owner` approves the `operator`.
	#[weight(<SelfWeightOf<T>>::allowance_for_all())]
	fn is_approved_for_all(&self, owner: address, operator: address) -> Result<bool> {
		let owner = T::CrossAccountId::from_eth(owner);
		let operator = T::CrossAccountId::from_eth(operator);

		Ok(<Pallet<T>>::allowance_for_all(self, &owner, &operator))
	}

	/// @notice Returns collection helper contract address
	fn collection_helper_address(&self) -> Result<address> {
		Ok(T::ContractAddress::get())
	}
}

/// @title ERC721 Token that can be irreversibly burned (destroyed).
#[solidity_interface(name = ERC721Burnable)]
impl<T: Config> NonfungibleHandle<T> {
	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	///  operator of the current owner.
	/// @param tokenId The NFT to approve
	#[weight(<SelfWeightOf<T>>::burn_item())]
	fn burn(&mut self, caller: caller, token_id: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token = token_id.try_into()?;

		<Pallet<T>>::burn(self, &caller, token).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}
}

/// @title ERC721 minting logic.
#[solidity_interface(name = ERC721UniqueMintable, events(ERC721UniqueMintableEvents))]
impl<T: Config> NonfungibleHandle<T> {
	fn minting_finished(&self) -> Result<bool> {
		Ok(false)
	}

	/// @notice Function to mint a token.
	/// @param to The new owner
	/// @return uint256 The id of the newly minted token
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint(&mut self, caller: caller, to: address) -> Result<uint256> {
		let token_id: uint256 = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			.into();
		self.mint_check_id(caller, to, token_id)?;
		Ok(token_id)
	}

	/// @notice Function to mint a token.
	/// @dev `tokenId` should be obtained with `nextTokenId` method,
	///  unlike standard, you can't specify it manually
	/// @param to The new owner
	/// @param tokenId ID of the minted NFT
	#[solidity(hide, rename_selector = "mint")]
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_check_id(&mut self, caller: caller, to: address, token_id: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token_id: u32 = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		if <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			!= token_id
		{
			return Err("item id should be next".into());
		}

		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> {
				properties: BoundedVec::default(),
				owner: to,
			},
			&budget,
		)
		.map_err(dispatch_to_evm::<T>)?;

		Ok(true)
	}

	/// @notice Function to mint token with the given tokenUri.
	/// @param to The new owner
	/// @param tokenUri Token URI that would be stored in the NFT properties
	/// @return uint256 The id of the newly minted token
	#[solidity(rename_selector = "mintWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_with_token_uri(
		&mut self,
		caller: caller,
		to: address,
		token_uri: string,
	) -> Result<uint256> {
		let token_id: uint256 = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			.into();
		self.mint_with_token_uri_check_id(caller, to, token_id, token_uri)?;
		Ok(token_id)
	}

	/// @notice Function to mint token with the given tokenUri.
	/// @dev `tokenId` should be obtained with `nextTokenId` method,
	///  unlike standard, you can't specify it manually
	/// @param to The new owner
	/// @param tokenId ID of the minted NFT
	/// @param tokenUri Token URI that would be stored in the NFT properties
	#[solidity(hide, rename_selector = "mintWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_with_token_uri_check_id(
		&mut self,
		caller: caller,
		to: address,
		token_id: uint256,
		token_uri: string,
	) -> Result<bool> {
		let key = key::url();
		let permission = get_token_permission::<T>(self.id, &key)?;
		if !permission.collection_admin {
			return Err("Operation is not allowed".into());
		}

		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token_id: u32 = token_id.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		if <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			!= token_id
		{
			return Err("item id should be next".into());
		}

		let mut properties = CollectionPropertiesVec::default();
		properties
			.try_push(Property {
				key,
				value: token_uri
					.into_bytes()
					.try_into()
					.map_err(|_| "token uri is too long")?,
			})
			.map_err(|e| Error::Revert(alloc::format!("Can't add property: {:?}", e)))?;

		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> {
				properties,
				owner: to,
			},
			&budget,
		)
		.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Not implemented
	fn finish_minting(&mut self, _caller: caller) -> Result<bool> {
		Err("not implementable".into())
	}
}

fn get_token_property<T: Config>(
	collection: &CollectionHandle<T>,
	token_id: u32,
	key: &up_data_structs::PropertyKey,
) -> Result<string> {
	collection.consume_store_reads(1)?;
	let properties = <TokenProperties<T>>::try_get((collection.id, token_id))
		.map_err(|_| Error::Revert("Token properties not found".into()))?;
	if let Some(property) = properties.get(key) {
		return Ok(string::from_utf8_lossy(property).into());
	}

	Err("Property tokenURI not found".into())
}

fn get_token_permission<T: Config>(
	collection_id: CollectionId,
	key: &PropertyKey,
) -> Result<PropertyPermission> {
	let token_property_permissions = CollectionPropertyPermissions::<T>::try_get(collection_id)
		.map_err(|_| Error::Revert("No permissions for collection".into()))?;
	let a = token_property_permissions
		.get(key)
		.map(Clone::clone)
		.ok_or_else(|| {
			let key = string::from_utf8(key.clone().into_inner()).unwrap_or_default();
			Error::Revert(alloc::format!("No permission for key {}", key))
		})?;
	Ok(a)
}

/// @title Unique extensions for ERC721.
#[solidity_interface(name = ERC721UniqueExtensions)]
impl<T: Config> NonfungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	/// @notice A descriptive name for a collection of NFTs in this contract
	fn name(&self) -> Result<string> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}

	/// @notice An abbreviated name for NFTs in this contract
	fn symbol(&self) -> Result<string> {
		Ok(string::from_utf8_lossy(&self.token_prefix).into())
	}

	/// @notice A description for the collection.
	fn description(&self) -> Result<string> {
		Ok(decode_utf16(self.description.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}

	/// Returns the owner (in cross format) of the token.
	///
	/// @param tokenId Id for the token.
	fn cross_owner_of(&self, token_id: uint256) -> Result<EthCrossAccount> {
		Self::token_owner(&self, token_id.try_into()?)
			.map(|o| EthCrossAccount::from_sub_cross_account::<T>(&o))
			.ok_or(Error::Revert("key too large".into()))
	}

	/// Returns the token properties.
	///
	/// @param tokenId Id for the token.
	/// @param keys Properties keys. Empty keys for all propertyes.
	/// @return Vector of properties key/value pairs.
	fn properties(&self, token_id: uint256, keys: Vec<string>) -> Result<Vec<PropertyStruct>> {
		let keys = keys
			.into_iter()
			.map(|key| {
				<Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| Error::Revert("key too large".into()))
			})
			.collect::<Result<Vec<_>>>()?;

		<Self as CommonCollectionOperations<T>>::token_properties(
			&self,
			token_id.try_into()?,
			if keys.is_empty() { None } else { Some(keys) },
		)
		.into_iter()
		.map(|p| {
			let key = string::from_utf8(p.key.to_vec())
				.map_err(|e| Error::Revert(alloc::format!("{}", e)))?;
			let value = bytes(p.value.to_vec());
			Ok(PropertyStruct { key, value })
		})
		.collect::<Result<Vec<_>>>()
	}

	/// @notice Set or reaffirm the approved address for an NFT
	/// @dev The zero address indicates there is no approved address.
	/// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	///  operator of the current owner.
	/// @param approved The new substrate address approved NFT controller
	/// @param tokenId The NFT to approve
	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve_cross(
		&mut self,
		caller: caller,
		approved: EthCrossAccount,
		token_id: uint256,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let approved = approved.into_sub_cross_account::<T>()?;
		let token = token_id.try_into()?;

		<Pallet<T>>::set_allowance(self, &caller, token, Some(&approved))
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Transfer ownership of an NFT
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param to The new owner
	/// @param tokenId The NFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer(&mut self, caller: caller, to: address, token_id: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, token, &budget).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Transfer ownership of an NFT
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param to The new owner
	/// @param tokenId The NFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer_cross(
		&mut self,
		caller: caller,
		to: EthCrossAccount,
		token_id: uint256,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = to.into_sub_cross_account::<T>()?;
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, token, &budget).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Transfer ownership of an NFT from cross account address to cross account address
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param from Cross acccount address of current owner
	/// @param to Cross acccount address of new owner
	/// @param tokenId The NFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer_from_cross(
		&mut self,
		caller: caller,
		from: EthCrossAccount,
		to: EthCrossAccount,
		token_id: uint256,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let to = to.into_sub_cross_account::<T>()?;
		let token_id = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());
		Pallet::<T>::transfer_from(self, &caller, &from, &to, token_id, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this NFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param from The current owner of the NFT
	/// @param tokenId The NFT to transfer
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from(&mut self, caller: caller, from: address, token_id: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::burn_from(self, &caller, &from, token, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this NFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param from The current owner of the NFT
	/// @param tokenId The NFT to transfer
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from_cross(
		&mut self,
		caller: caller,
		from: EthCrossAccount,
		token_id: uint256,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::burn_from(self, &caller, &from, token, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Returns next free NFT ID.
	fn next_token_id(&self) -> Result<uint256> {
		self.consume_store_reads(1)?;
		Ok(<TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			.into())
	}

	/// @notice Function to mint multiple tokens.
	/// @dev `tokenIds` should be an array of consecutive numbers and first number
	///  should be obtained with `nextTokenId` method
	/// @param to The new owner
	/// @param tokenIds IDs of the minted NFTs
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::create_multiple_items(token_ids.len() as u32))]
	fn mint_bulk(&mut self, caller: caller, to: address, token_ids: Vec<uint256>) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let mut expected_index = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let total_tokens = token_ids.len();
		for id in token_ids.into_iter() {
			let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
			if id != expected_index {
				return Err("item id should be next".into());
			}
			expected_index = expected_index.checked_add(1).ok_or("item id overflow")?;
		}
		let data = (0..total_tokens)
			.map(|_| CreateItemData::<T> {
				properties: BoundedVec::default(),
				owner: to.clone(),
			})
			.collect();

		<Pallet<T>>::create_multiple_items(self, &caller, data, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @notice Function to mint multiple tokens with the given tokenUris.
	/// @dev `tokenIds` is array of pairs of token ID and token URI. Token IDs should be consecutive
	///  numbers and first number should be obtained with `nextTokenId` method
	/// @param to The new owner
	/// @param tokens array of pairs of token ID and token URI for minted tokens
	#[solidity(hide, rename_selector = "mintBulkWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_multiple_items(tokens.len() as u32))]
	fn mint_bulk_with_token_uri(
		&mut self,
		caller: caller,
		to: address,
		tokens: Vec<(uint256, string)>,
	) -> Result<bool> {
		let key = key::url();
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let mut expected_index = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let mut data = Vec::with_capacity(tokens.len());
		for (id, token_uri) in tokens {
			let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
			if id != expected_index {
				return Err("item id should be next".into());
			}
			expected_index = expected_index.checked_add(1).ok_or("item id overflow")?;

			let mut properties = CollectionPropertiesVec::default();
			properties
				.try_push(Property {
					key: key.clone(),
					value: token_uri
						.into_bytes()
						.try_into()
						.map_err(|_| "token uri is too long")?,
				})
				.map_err(|e| Error::Revert(alloc::format!("Can't add property: {:?}", e)))?;

			data.push(CreateItemData::<T> {
				properties,
				owner: to.clone(),
			});
		}

		<Pallet<T>>::create_multiple_items(self, &caller, data, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @notice Function to mint a token.
	/// @param to The new owner crossAccountId
	/// @param properties Properties of minted token
	/// @return uint256 The id of the newly minted token
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_cross(
		&mut self,
		caller: caller,
		to: EthCrossAccount,
		properties: Vec<PropertyStruct>,
	) -> Result<uint256> {
		let token_id = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?;

		let to = to.into_sub_cross_account::<T>()?;

		let properties = properties
			.into_iter()
			.map(|PropertyStruct { key, value }| {
				let key = <Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| "key too large")?;

				let value = value.0.try_into().map_err(|_| "value too large")?;

				Ok(Property { key, value })
			})
			.collect::<Result<Vec<_>>>()?
			.try_into()
			.map_err(|_| Error::Revert(alloc::format!("too many properties")))?;

		let caller = T::CrossAccountId::from_eth(caller);

		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> {
				properties,
				owner: to,
			},
			&budget,
		)
		.map_err(dispatch_to_evm::<T>)?;

		Ok(token_id.into())
	}
}

#[solidity_interface(
	name = UniqueNFT,
	is(
		ERC721,
		ERC721Enumerable,
		ERC721UniqueExtensions,
		ERC721UniqueMintable,
		ERC721Burnable,
		ERC721Metadata(if(this.flags.erc721metadata)),
		Collection(via(common_mut returns CollectionHandle<T>)),
		TokenProperties,
	)
)]
impl<T: Config> NonfungibleHandle<T> where T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]> {}

// Not a tests, but code generators
generate_stubgen!(gen_impl, UniqueNFTCall<()>, true);
generate_stubgen!(gen_iface, UniqueNFTCall<()>, false);

impl<T: Config> CommonEvmHandler for NonfungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueNFT.raw");

	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		call::<T, UniqueNFTCall<T>, _, _>(handle, self)
	}
}
