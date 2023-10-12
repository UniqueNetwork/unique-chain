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

//! # Refungible Pallet EVM API for tokens
//!
//! Provides ERC-721 standart support implementation and EVM API for unique extensions for Refungible Pallet.
//! Method implementations are mostly doing parameter conversion and calling Refungible Pallet methods.

extern crate alloc;

use alloc::string::ToString;
use core::{
	char::{decode_utf16, REPLACEMENT_CHARACTER},
	convert::TryInto,
};

use evm_coder::{abi::AbiType, generate_stubgen, solidity_interface, types::*, AbiCoder, ToLog};
use frame_support::{BoundedBTreeMap, BoundedVec};
use pallet_common::{
	erc::{static_property::key, CollectionCall, CommonEvmHandler},
	eth::{self, TokenUri},
	CollectionHandle, CollectionPropertyPermissions, CommonCollectionOperations,
	Error as CommonError,
};
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::{
	call, dispatch_to_evm,
	execution::{Error, PreDispatch, Result},
	frontier_contract,
};
use pallet_structure::{weights::WeightInfo as _, SelfWeightOf as StructureWeight};
use sp_core::{Get, H160, U256};
use sp_std::{collections::btree_map::BTreeMap, vec, vec::Vec};
use up_data_structs::{
	mapping::TokenAddressMapping, CollectionId, CollectionPropertiesVec, Property, PropertyKey,
	PropertyKeyPermission, PropertyPermission, TokenId, TokenOwnerError,
};

use crate::{
	weights::WeightInfo, AccountBalance, Balance, Config, CreateItemData, Pallet, RefungibleHandle,
	SelfWeightOf, TokenProperties, TokensMinted, TotalSupply,
};

frontier_contract! {
	macro_rules! RefungibleHandle_result {...}
	impl<T: Config> Contract for RefungibleHandle<T> {...}
}

pub const ADDRESS_FOR_PARTIALLY_OWNED_TOKENS: H160 = H160::repeat_byte(0xff);

/// Rft events.
#[derive(ToLog)]
pub enum ERC721TokenEvent {
	/// The token has been changed.
	TokenChanged {
		/// Token ID.
		#[indexed]
		token_id: U256,
	},
}

/// Token minting parameters
#[derive(AbiCoder, Default, Debug)]
pub struct OwnerPieces {
	/// Minted token owner
	pub owner: eth::CrossAddress,
	/// Number of token pieces
	pub pieces: u128,
}

/// Token minting parameters
#[derive(AbiCoder, Default, Debug)]
pub struct MintTokenData {
	/// Minted token owner and number of pieces
	pub owners: Vec<OwnerPieces>,
	/// Minted token properties
	pub properties: Vec<eth::Property>,
}

/// @title A contract that allows to set and delete token properties and change token property permissions.
#[solidity_interface(name = TokenProperties, events(ERC721TokenEvent), enum(derive(PreDispatch)), enum_attr(weight))]
impl<T: Config> RefungibleHandle<T> {
	/// @notice Set permissions for token property.
	/// @dev Throws error if `msg.sender` is not admin or owner of the collection.
	/// @param key Property key.
	/// @param isMutable Permission to mutate property.
	/// @param collectionAdmin Permission to mutate property by collection admin if property is mutable.
	/// @param tokenOwner Permission to mutate property by token owner if property is mutable.
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::set_token_property_permissions(1))]
	fn set_token_property_permission(
		&mut self,
		caller: Caller,
		key: String,
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
		caller: Caller,
		permissions: Vec<eth::TokenPropertyPermission>,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let perms = eth::TokenPropertyPermission::into_property_key_permissions(permissions)?;

		<Pallet<T>>::set_token_property_permissions(self, &caller, perms)
			.map_err(dispatch_to_evm::<T>)
	}

	/// @notice Get permissions for token properties.
	fn token_property_permissions(&self) -> Result<Vec<eth::TokenPropertyPermission>> {
		let perms = <Pallet<T>>::token_property_permission(self.id);
		Ok(perms
			.into_iter()
			.map(eth::TokenPropertyPermission::from)
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
		caller: Caller,
		token_id: U256,
		key: String,
		value: Bytes,
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
		caller: Caller,
		token_id: U256,
		properties: Vec<eth::Property>,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;

		let nesting_budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let properties = properties
			.into_iter()
			.map(eth::Property::try_into)
			.collect::<Result<Vec<_>>>()?;

		<Pallet<T>>::set_token_properties(
			self,
			&caller,
			TokenId(token_id),
			properties.into_iter(),
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
	fn delete_property(&mut self, token_id: U256, caller: Caller, key: String) -> Result<()> {
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
		token_id: U256,
		caller: Caller,
		keys: Vec<String>,
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
	fn property(&self, token_id: U256, key: String) -> Result<Bytes> {
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too long")?;

		let props =
			<TokenProperties<T>>::get((self.id, token_id)).ok_or("token properties not found")?;
		let prop = props.get(&key).ok_or("key not found")?;

		Ok(prop.to_vec().into())
	}
}

#[derive(ToLog)]
pub enum ERC721Events {
	/// @dev This event emits when NFTs are created (`from` == 0) and destroyed
	///  (`to` == 0). Exception: during contract creation, any number of RFTs
	///  may be created and assigned without emitting Transfer.
	Transfer {
		#[indexed]
		from: Address,
		#[indexed]
		to: Address,
		#[indexed]
		token_id: U256,
	},
	/// @dev Not supported
	Approval {
		#[indexed]
		owner: Address,
		#[indexed]
		approved: Address,
		#[indexed]
		token_id: U256,
	},
	/// @dev Not supported
	#[allow(dead_code)]
	ApprovalForAll {
		#[indexed]
		owner: Address,
		#[indexed]
		operator: Address,
		approved: bool,
	},
}

/// @title ERC-721 Non-Fungible Token Standard, optional metadata extension
/// @dev See https://eips.ethereum.org/EIPS/eip-721
#[solidity_interface(name = ERC721Metadata, enum(derive(PreDispatch)), expect_selector = 0x5b5e139f)]
impl<T: Config> RefungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	/// @notice A descriptive name for a collection of NFTs in this contract
	/// @dev real implementation of this function lies in `ERC721UniqueExtensions`
	#[solidity(hide, rename_selector = "name")]
	fn name_proxy(&self) -> Result<String> {
		self.name()
	}

	/// @notice An abbreviated name for NFTs in this contract
	/// @dev real implementation of this function lies in `ERC721UniqueExtensions`
	#[solidity(hide, rename_selector = "symbol")]
	fn symbol_proxy(&self) -> Result<String> {
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
	fn token_uri(&self, token_id: U256) -> Result<String> {
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
				.map(String::from_utf8)
				.transpose()
				.map_err(|e| {
					Error::Revert(alloc::format!(
						"can not convert value \"baseURI\" to string with error \"{e}\""
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
#[solidity_interface(name = ERC721Enumerable, enum(derive(PreDispatch)), expect_selector = 0x780e9d63)]
impl<T: Config> RefungibleHandle<T> {
	/// @notice Enumerate valid RFTs
	/// @param index A counter less than `totalSupply()`
	/// @return The token identifier for the `index`th NFT,
	///  (sort order not specified)
	fn token_by_index(&self, index: U256) -> U256 {
		index
	}

	/// Not implemented
	fn token_of_owner_by_index(&self, _owner: Address, _index: U256) -> Result<U256> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @notice Count RFTs tracked by this contract
	/// @return A count of valid RFTs tracked by this contract, where each one of
	///  them has an assigned and queryable owner not equal to the zero address
	fn total_supply(&self) -> Result<U256> {
		self.consume_store_reads(1)?;
		Ok(<Pallet<T>>::total_supply(self).into())
	}
}

/// @title ERC-721 Non-Fungible Token Standard
/// @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
#[solidity_interface(name = ERC721, events(ERC721Events), enum(derive(PreDispatch)), enum_attr(weight), expect_selector = 0x80ac58cd)]
impl<T: Config> RefungibleHandle<T> {
	/// @notice Count all RFTs assigned to an owner
	/// @dev RFTs assigned to the zero address are considered invalid, and this
	///  function throws for queries about the zero address.
	/// @param owner An address for whom to query the balance
	/// @return The number of RFTs owned by `owner`, possibly zero
	fn balance_of(&self, owner: Address) -> Result<U256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <AccountBalance<T>>::get((self.id, owner));
		Ok(balance.into())
	}

	/// @notice Find the owner of an RFT
	/// @dev RFTs assigned to zero address are considered invalid, and queries
	///  about them do throw.
	///  Returns special 0xffffffffffffffffffffffffffffffffffffffff address for
	///  the tokens that are partially owned.
	/// @param tokenId The identifier for an RFT
	/// @return The address of the owner of the RFT
	fn owner_of(&self, token_id: U256) -> Result<Address> {
		self.consume_store_reads(2)?;
		let token = token_id.try_into()?;
		let owner = <Pallet<T>>::token_owner(self.id, token);
		owner
			.map(|address| *address.as_eth())
			.or_else(|err| match err {
				TokenOwnerError::NotFound => Err(Error::Revert("token not found".into())),
				TokenOwnerError::MultipleOwners => Ok(ADDRESS_FOR_PARTIALLY_OWNED_TOKENS),
			})
	}

	/// @dev Not implemented
	#[solidity(rename_selector = "safeTransferFrom")]
	fn safe_transfer_from_with_data(
		&mut self,
		_from: Address,
		_to: Address,
		_token_id: U256,
		_data: Bytes,
	) -> Result<()> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @dev Not implemented
	#[solidity(rename_selector = "safeTransferFrom")]
	fn safe_transfer_from(&mut self, _from: Address, _to: Address, _token_id: U256) -> Result<()> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @notice Transfer ownership of an RFT -- THE CALLER IS RESPONSIBLE
	///  TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE
	///  THEY MAY BE PERMANENTLY LOST
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this RFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid RFT.
	///  Throws if RFT pieces have multiple owners.
	/// @param from The current owner of the NFT
	/// @param to The new owner
	/// @param tokenId The NFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer_from_creating_removing())]
	fn transfer_from(
		&mut self,
		caller: Caller,
		from: Address,
		to: Address,
		token_id: U256,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let to = T::CrossAccountId::from_eth(to);
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let balance = balance(self, token, &from)?;
		ensure_single_owner(self, token, balance)?;

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, token, balance, &budget)
			.map_err(dispatch_to_evm::<T>)?;

		Ok(())
	}

	/// @dev Not implemented
	fn approve(&mut self, _caller: Caller, _approved: Address, _token_id: U256) -> Result<()> {
		Err("not implemented".into())
	}

	/// @notice Sets or unsets the approval of a given operator.
	///  The `operator` is allowed to transfer all token pieces of the `caller` on their behalf.
	/// @param operator Operator
	/// @param approved Should operator status be granted or revoked?
	#[weight(<SelfWeightOf<T>>::set_allowance_for_all())]
	fn set_approval_for_all(
		&mut self,
		caller: Caller,
		operator: Address,
		approved: bool,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let operator = T::CrossAccountId::from_eth(operator);

		<Pallet<T>>::set_allowance_for_all(self, &caller, &operator, approved)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @dev Not implemented
	fn get_approved(&self, _token_id: U256) -> Result<Address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @notice Tells whether the given `owner` approves the `operator`.
	#[weight(<SelfWeightOf<T>>::allowance_for_all())]
	fn is_approved_for_all(&self, owner: Address, operator: Address) -> Result<bool> {
		let owner = T::CrossAccountId::from_eth(owner);
		let operator = T::CrossAccountId::from_eth(operator);

		Ok(<Pallet<T>>::allowance_for_all(self, &owner, &operator))
	}
}

/// Returns amount of pieces of `token` that `owner` have
pub fn balance<T: Config>(
	collection: &RefungibleHandle<T>,
	token: TokenId,
	owner: &T::CrossAccountId,
) -> Result<u128> {
	collection.consume_store_reads(1)?;
	let balance = <Balance<T>>::get((collection.id, token, &owner));
	Ok(balance)
}

/// Throws if `owner_balance` is lower than total amount of `token` pieces
pub fn ensure_single_owner<T: Config>(
	collection: &RefungibleHandle<T>,
	token: TokenId,
	owner_balance: u128,
) -> Result<()> {
	collection.consume_store_reads(1)?;
	let total_supply = <TotalSupply<T>>::get((collection.id, token));

	if owner_balance == 0 {
		return Err(dispatch_to_evm::<T>(
			<CommonError<T>>::MustBeTokenOwner.into(),
		));
	}

	if total_supply != owner_balance {
		return Err("token has multiple owners".into());
	}
	Ok(())
}

/// @title ERC721 Token that can be irreversibly burned (destroyed).
#[solidity_interface(name = ERC721Burnable, enum(derive(PreDispatch)), enum_attr(weight))]
impl<T: Config> RefungibleHandle<T> {
	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current RFT owner, or an authorized
	///  operator of the current owner.
	/// @param tokenId The RFT to approve
	#[weight(<SelfWeightOf<T>>::burn_item_fully())]
	fn burn(&mut self, caller: Caller, token_id: U256) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token = token_id.try_into()?;

		let balance = balance(self, token, &caller)?;
		ensure_single_owner(self, token, balance)?;

		<Pallet<T>>::burn(self, &caller, token, balance).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}
}

/// @title ERC721 minting logic.
#[solidity_interface(name = ERC721UniqueMintable, enum(derive(PreDispatch)), enum_attr(weight))]
impl<T: Config> RefungibleHandle<T> {
	/// @notice Function to mint a token.
	/// @param to The new owner
	/// @return uint256 The id of the newly minted token
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint(&mut self, caller: Caller, to: Address) -> Result<U256> {
		let token_id: U256 = <TokensMinted<T>>::get(self.id)
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
	/// @param tokenId ID of the minted RFT
	#[solidity(hide, rename_selector = "mint")]
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_check_id(&mut self, caller: Caller, to: Address, token_id: U256) -> Result<bool> {
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

		let users = [(to, 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> {
				users,
				properties: CollectionPropertiesVec::default(),
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
	#[weight(<SelfWeightOf<T>>::create_item() + <SelfWeightOf<T>>::set_token_properties(1))]
	fn mint_with_token_uri(
		&mut self,
		caller: Caller,
		to: Address,
		token_uri: String,
	) -> Result<U256> {
		let token_id: U256 = <TokensMinted<T>>::get(self.id)
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
	/// @param tokenId ID of the minted RFT
	/// @param tokenUri Token URI that would be stored in the RFT properties
	#[solidity(hide, rename_selector = "mintWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_item() + <SelfWeightOf<T>>::set_token_properties(1))]
	fn mint_with_token_uri_check_id(
		&mut self,
		caller: Caller,
		to: Address,
		token_id: U256,
		token_uri: String,
	) -> Result<bool> {
		let key = key::url();
		let permission = get_token_permission::<T>(self.id, &key)?;
		if !permission.collection_admin {
			return Err("operation is not allowed".into());
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
			.map_err(|e| Error::Revert(alloc::format!("can't add property: {e:?}")))?;

		let users = [(to, 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> { users, properties },
			&budget,
		)
		.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
}

fn get_token_property<T: Config>(
	collection: &CollectionHandle<T>,
	token_id: u32,
	key: &up_data_structs::PropertyKey,
) -> Result<String> {
	collection.consume_store_reads(1)?;
	let properties = <TokenProperties<T>>::try_get((collection.id, token_id))
		.map_err(|_| Error::Revert("token properties not found".into()))?;
	if let Some(property) = properties.get(key) {
		return Ok(String::from_utf8_lossy(property).into());
	}

	Err("property tokenURI not found".into())
}

fn get_token_permission<T: Config>(
	collection_id: CollectionId,
	key: &PropertyKey,
) -> Result<PropertyPermission> {
	let token_property_permissions = CollectionPropertyPermissions::<T>::try_get(collection_id)
		.map_err(|_| Error::Revert("no permissions for collection".into()))?;
	let a = token_property_permissions
		.get(key)
		.map(Clone::clone)
		.ok_or_else(|| {
			let key = String::from_utf8(key.clone().into_inner()).unwrap_or_default();
			Error::Revert(alloc::format!("no permission for key {key}"))
		})?;
	Ok(a)
}

/// @title Unique extensions for ERC721.
#[solidity_interface(name = ERC721UniqueExtensions, enum(derive(PreDispatch)), enum_attr(weight))]
impl<T: Config> RefungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	/// @notice A descriptive name for a collection of NFTs in this contract
	fn name(&self) -> Result<String> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<String>())
	}

	/// @notice An abbreviated name for NFTs in this contract
	fn symbol(&self) -> Result<String> {
		Ok(String::from_utf8_lossy(&self.token_prefix).into())
	}

	/// @notice A description for the collection.
	fn description(&self) -> Result<String> {
		Ok(decode_utf16(self.description.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<String>())
	}

	/// Returns the owner (in cross format) of the token.
	///
	/// @param tokenId Id for the token.
	#[solidity(hide)]
	fn cross_owner_of(&self, token_id: U256) -> Result<eth::CrossAddress> {
		Self::owner_of_cross(self, token_id)
	}

	/// Returns the owner (in cross format) of the token.
	///
	/// @param tokenId Id for the token.
	fn owner_of_cross(&self, token_id: U256) -> Result<eth::CrossAddress> {
		Self::token_owner(self, token_id.try_into()?)
			.map(|o| eth::CrossAddress::from_sub_cross_account::<T>(&o))
			.or_else(|err| match err {
				TokenOwnerError::NotFound => Err(Error::Revert("token not found".into())),
				TokenOwnerError::MultipleOwners => Ok(eth::CrossAddress::from_eth(
					ADDRESS_FOR_PARTIALLY_OWNED_TOKENS,
				)),
			})
	}

	/// @notice Count all RFTs assigned to an owner
	/// @param owner An cross address for whom to query the balance
	/// @return The number of RFTs owned by `owner`, possibly zero
	fn balance_of_cross(&self, owner: eth::CrossAddress) -> Result<U256> {
		self.consume_store_reads(1)?;
		let balance = <AccountBalance<T>>::get((self.id, owner.into_sub_cross_account::<T>()?));
		Ok(balance.into())
	}

	/// Returns the token properties.
	///
	/// @param tokenId Id for the token.
	/// @param keys Properties keys. Empty keys for all propertyes.
	/// @return Vector of properties key/value pairs.
	fn properties(&self, token_id: U256, keys: Vec<String>) -> Result<Vec<eth::Property>> {
		let keys = keys
			.into_iter()
			.map(|key| {
				<Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| Error::Revert("key too large".into()))
			})
			.collect::<Result<Vec<_>>>()?;

		<Self as CommonCollectionOperations<T>>::token_properties(
			self,
			token_id.try_into()?,
			if keys.is_empty() { None } else { Some(keys) },
		)
		.into_iter()
		.map(eth::Property::try_from)
		.collect::<Result<Vec<_>>>()
	}
	/// @notice Transfer ownership of an RFT
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid RFT.
	///  Throws if RFT pieces have multiple owners.
	/// @param to The new owner
	/// @param tokenId The RFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer_creating_removing())]
	fn transfer(&mut self, caller: Caller, to: Address, token_id: U256) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let balance = balance(self, token, &caller)?;
		ensure_single_owner(self, token, balance)?;

		<Pallet<T>>::transfer(self, &caller, &to, token, balance, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Transfer ownership of an RFT
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid RFT.
	///  Throws if RFT pieces have multiple owners.
	/// @param to The new owner
	/// @param tokenId The RFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer_creating_removing())]
	fn transfer_cross(
		&mut self,
		caller: Caller,
		to: eth::CrossAddress,
		token_id: U256,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = to.into_sub_cross_account::<T>()?;
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let balance = balance(self, token, &caller)?;
		ensure_single_owner(self, token, balance)?;

		<Pallet<T>>::transfer(self, &caller, &to, token, balance, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Transfer ownership of an RFT
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid RFT.
	///  Throws if RFT pieces have multiple owners.
	/// @param to The new owner
	/// @param tokenId The RFT to transfer
	#[weight(<SelfWeightOf<T>>::transfer_creating_removing())]
	fn transfer_from_cross(
		&mut self,
		caller: Caller,
		from: eth::CrossAddress,
		to: eth::CrossAddress,
		token_id: U256,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let to = to.into_sub_cross_account::<T>()?;
		let token_id = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let balance = balance(self, token_id, &from)?;
		ensure_single_owner(self, token_id, balance)?;

		Pallet::<T>::transfer_from(self, &caller, &from, &to, token_id, balance, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this RFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid RFT.
	///  Throws if RFT pieces have multiple owners.
	/// @param from The current owner of the RFT
	/// @param tokenId The RFT to transfer
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from(&mut self, caller: Caller, from: Address, token_id: U256) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let balance = balance(self, token, &from)?;
		ensure_single_owner(self, token, balance)?;

		<Pallet<T>>::burn_from(self, &caller, &from, token, balance, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this RFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid RFT.
	///  Throws if RFT pieces have multiple owners.
	/// @param from The current owner of the RFT
	/// @param tokenId The RFT to transfer
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from_cross(
		&mut self,
		caller: Caller,
		from: eth::CrossAddress,
		token_id: U256,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let balance = balance(self, token, &from)?;
		ensure_single_owner(self, token, balance)?;

		<Pallet<T>>::burn_from(self, &caller, &from, token, balance, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// @notice Returns next free RFT ID.
	fn next_token_id(&self) -> Result<U256> {
		self.consume_store_reads(1)?;
		Ok(<Pallet<T>>::next_token_id(self)
			.map_err(dispatch_to_evm::<T>)?
			.into())
	}

	/// @notice Function to mint multiple tokens.
	/// @dev `tokenIds` should be an array of consecutive numbers and first number
	///  should be obtained with `nextTokenId` method
	/// @param to The new owner
	/// @param tokenIds IDs of the minted RFTs
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::create_multiple_items(token_ids.len() as u32))]
	fn mint_bulk(&mut self, caller: Caller, to: Address, token_ids: Vec<U256>) -> Result<bool> {
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
		let users = [(to, 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		let create_item_data = CreateItemData::<T> {
			users,
			properties: CollectionPropertiesVec::default(),
		};
		let data = (0..total_tokens)
			.map(|_| create_item_data.clone())
			.collect();

		<Pallet<T>>::create_multiple_items(self, &caller, data, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @notice Function to mint a token.
	/// @param tokenProperties Properties of minted token
	#[weight(if token_properties.len() == 1 {
		<SelfWeightOf<T>>::create_multiple_items_ex_multiple_owners(token_properties.iter().next().unwrap().owners.len() as u32)
	} else {
		<SelfWeightOf<T>>::create_multiple_items_ex_multiple_items(token_properties.len() as u32)
	} + <SelfWeightOf<T>>::set_token_properties(token_properties.len() as u32))]
	fn mint_bulk_cross(
		&mut self,
		caller: Caller,
		token_properties: Vec<MintTokenData>,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());
		let has_multiple_tokens = token_properties.len() > 1;

		let mut create_rft_data = Vec::with_capacity(token_properties.len());
		for MintTokenData { owners, properties } in token_properties {
			let has_multiple_owners = owners.len() > 1;
			if has_multiple_tokens & has_multiple_owners {
				return Err(
					"creation of multiple tokens supported only if they have single owner each"
						.into(),
				);
			}
			let users: BoundedBTreeMap<_, _, _> = owners
				.into_iter()
				.map(|data| Ok((data.owner.into_sub_cross_account::<T>()?, data.pieces)))
				.collect::<Result<BTreeMap<_, _>>>()?
				.try_into()
				.map_err(|_| "too many users")?;
			create_rft_data.push(CreateItemData::<T> {
				properties: properties
					.into_iter()
					.map(|property| property.try_into())
					.collect::<Result<Vec<_>>>()?
					.try_into()
					.map_err(|_| "too many properties")?,
				users,
			});
		}

		<Pallet<T>>::create_multiple_items(self, &caller, create_rft_data, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @notice Function to mint multiple tokens with the given tokenUris.
	/// @dev `tokenIds` is array of pairs of token ID and token URI. Token IDs should be consecutive
	///  numbers and first number should be obtained with `nextTokenId` method
	/// @param to The new owner
	/// @param tokens array of pairs of token ID and token URI for minted tokens
	#[solidity(hide, rename_selector = "mintBulkWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_multiple_items(tokens.len() as u32) + <SelfWeightOf<T>>::set_token_properties(tokens.len() as u32))]
	fn mint_bulk_with_token_uri(
		&mut self,
		caller: Caller,
		to: Address,
		tokens: Vec<TokenUri>,
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
		let users: BoundedBTreeMap<_, _, _> = [(to, 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		for TokenUri { id, uri } in tokens {
			let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
			if id != expected_index {
				return Err("item id should be next".into());
			}
			expected_index = expected_index.checked_add(1).ok_or("item id overflow")?;

			let mut properties = CollectionPropertiesVec::default();
			properties
				.try_push(Property {
					key: key.clone(),
					value: uri
						.into_bytes()
						.try_into()
						.map_err(|_| "token uri is too long")?,
				})
				.map_err(|e| Error::Revert(alloc::format!("can't add property: {e:?}")))?;

			let create_item_data = CreateItemData::<T> {
				users: users.clone(),
				properties,
			};
			data.push(create_item_data);
		}

		<Pallet<T>>::create_multiple_items(self, &caller, data, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @notice Function to mint a token.
	/// @param to The new owner crossAccountId
	/// @param properties Properties of minted token
	/// @return uint256 The id of the newly minted token
	#[weight(<SelfWeightOf<T>>::create_item() + <SelfWeightOf<T>>::set_token_properties(properties.len() as u32))]
	fn mint_cross(
		&mut self,
		caller: Caller,
		to: eth::CrossAddress,
		properties: Vec<eth::Property>,
	) -> Result<U256> {
		let token_id = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?;

		let to = to.into_sub_cross_account::<T>()?;

		let properties = properties
			.into_iter()
			.map(eth::Property::try_into)
			.collect::<Result<Vec<_>>>()?
			.try_into()
			.map_err(|_| Error::Revert("too many properties".to_string()))?;

		let caller = T::CrossAccountId::from_eth(caller);

		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		let users = [(to, 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> { users, properties },
			&budget,
		)
		.map_err(dispatch_to_evm::<T>)?;

		Ok(token_id.into())
	}

	/// Returns EVM address for refungible token
	///
	/// @param token ID of the token
	fn token_contract_address(&self, token: U256) -> Result<Address> {
		Ok(T::EvmTokenAddressMapping::token_to_address(
			self.id,
			token.try_into().map_err(|_| "token id overflow")?,
		))
	}

	/// @notice Returns collection helper contract address
	fn collection_helper_address(&self) -> Result<Address> {
		Ok(T::ContractAddress::get())
	}
}

#[solidity_interface(
	name = UniqueRefungible,
	is(
		ERC721,
		ERC721Enumerable,
		ERC721UniqueExtensions,
		ERC721UniqueMintable,
		ERC721Burnable,
		ERC721Metadata(if(this.flags.erc721metadata)),
		Collection(via(common_mut returns CollectionHandle<T>)),
		TokenProperties,
	),
	enum(derive(PreDispatch)),
)]
impl<T: Config> RefungibleHandle<T> where T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]> {}

// Not a tests, but code generators
generate_stubgen!(gen_impl, UniqueRefungibleCall<()>, true);
generate_stubgen!(gen_iface, UniqueRefungibleCall<()>, false);

impl<T: Config> CommonEvmHandler for RefungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungible.raw");
	fn call(
		self,
		handle: &mut impl PrecompileHandle,
	) -> Option<pallet_common::erc::PrecompileResult> {
		call::<T, UniqueRefungibleCall<T>, _, _>(handle, self)
	}
}
