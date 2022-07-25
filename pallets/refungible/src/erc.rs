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

extern crate alloc;

use alloc::string::ToString;
use core::{
	char::{REPLACEMENT_CHARACTER, decode_utf16},
	convert::TryInto,
};
use evm_coder::{ToLog, execution::*, generate_stubgen, solidity, solidity_interface, types::*, weight};
use frame_support::{BoundedBTreeMap, BoundedVec};
use pallet_common::{
	CollectionHandle, CollectionPropertyPermissions,
	erc::{
		CommonEvmHandler, CollectionCall,
		static_property::{key, value as property_value},
	},
};
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::{call, dispatch_to_evm};
use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
use sp_core::H160;
use sp_std::{collections::btree_map::BTreeMap, vec::Vec, vec};
use up_data_structs::{
	CollectionId, CollectionPropertiesVec, Property, PropertyKey, PropertyKeyPermission,
	PropertyPermission, TokenId,
};

use crate::{
	AccountBalance, Config, CreateItemData, Pallet, RefungibleHandle, SelfWeightOf,
	TokenProperties, TokensMinted, weights::WeightInfo,
};

#[solidity_interface(name = "TokenProperties")]
impl<T: Config> RefungibleHandle<T> {
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
		let value = value.try_into().map_err(|_| "value too long")?;

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

	/// Throws error if key not found
	fn property(&self, token_id: uint256, key: string) -> Result<bytes> {
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too long")?;

		let props = <TokenProperties<T>>::get((self.id, token_id));
		let prop = props.get(&key).ok_or("key not found")?;

		Ok(prop.to_vec())
	}
}

#[derive(ToLog)]
pub enum ERC721Events {
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		#[indexed]
		token_id: uint256,
	},
	/// @dev Not supported
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		approved: address,
		#[indexed]
		token_id: uint256,
	},
	/// @dev Not supported
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
pub enum ERC721MintableEvents {
	/// @dev Not supported
	#[allow(dead_code)]
	MintingFinished {},
}

#[solidity_interface(name = "ERC721Metadata")]
impl<T: Config> RefungibleHandle<T> {
	fn name(&self) -> Result<string> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}

	fn symbol(&self) -> Result<string> {
		Ok(string::from_utf8_lossy(&self.token_prefix).into())
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

		if let Ok(url) = get_token_property(self, token_id_u32, &key::url()) {
			if !url.is_empty() {
				return Ok(url);
			}
		} else if !is_erc721_metadata_compatible::<T>(self.id) {
			return Err("tokenURI not set".into());
		}

		if let Some(base_uri) =
			pallet_common::Pallet::<T>::get_collection_property(self.id, &key::base_uri())
		{
			if !base_uri.is_empty() {
				let base_uri = string::from_utf8(base_uri.into_inner()).map_err(|e| {
					Error::Revert(alloc::format!(
						"Can not convert value \"baseURI\" to string with error \"{}\"",
						e
					))
				})?;
				if let Ok(suffix) = get_token_property(self, token_id_u32, &key::suffix()) {
					if !suffix.is_empty() {
						return Ok(base_uri + suffix.as_str());
					}
				}

				return Ok(base_uri + token_id.to_string().as_str());
			}
		}

		Ok("".into())
	}
}

#[solidity_interface(name = "ERC721Enumerable")]
impl<T: Config> RefungibleHandle<T> {
	fn token_by_index(&self, index: uint256) -> Result<uint256> {
		Ok(index)
	}

	/// Not implemented
	fn token_of_owner_by_index(&self, _owner: address, _index: uint256) -> Result<uint256> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	fn total_supply(&self) -> Result<uint256> {
		self.consume_store_reads(1)?;
		Ok(<Pallet<T>>::total_supply(self).into())
	}
}

#[solidity_interface(name = "ERC721", events(ERC721Events))]
impl<T: Config> RefungibleHandle<T> {
	fn balance_of(&self, owner: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <AccountBalance<T>>::get((self.id, owner));
		Ok(balance.into())
	}

	fn owner_of(&self, token_id: uint256) -> Result<address> {
		self.consume_store_reads(2)?;
		let token = token_id.try_into()?;
		let owner = <Pallet<T>>::token_owner(self.id, token);
		Ok(owner
			.map(|address| *address.as_eth())
			.unwrap_or_else(|| H160::default()))
	}

	/// @dev Not implemented
	fn safe_transfer_from_with_data(
		&mut self,
		_from: address,
		_to: address,
		_token_id: uint256,
		_data: bytes,
		_value: value,
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
		_value: value,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @dev Not implemented
	fn transfer_from(
		&mut self,
		_caller: caller,
		_from: address,
		_to: address,
		_token_id: uint256,
		_value: value,
	) -> Result<void> {
		Err("not implemented".into())
	}

	/// @dev Not implemented
	fn approve(
		&mut self,
		_caller: caller,
		_approved: address,
		_token_id: uint256,
		_value: value,
	) -> Result<void> {
		Err("not implemented".into())
	}

	/// @dev Not implemented
	fn set_approval_for_all(
		&mut self,
		_caller: caller,
		_operator: address,
		_approved: bool,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @dev Not implemented
	fn get_approved(&self, _token_id: uint256) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// @dev Not implemented
	fn is_approved_for_all(&self, _owner: address, _operator: address) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}
}

#[solidity_interface(name = "ERC721Burnable")]
impl<T: Config> RefungibleHandle<T> {
	/// @dev Not implemented
	fn burn(&mut self, _caller: caller, _token_id: uint256, _value: value) -> Result<void> {
		Err("not implemented".into())
	}
}

#[solidity_interface(name = "ERC721Mintable", events(ERC721MintableEvents))]
impl<T: Config> RefungibleHandle<T> {
	fn minting_finished(&self) -> Result<bool> {
		Ok(false)
	}

	/// `token_id` should be obtained with `next_token_id` method,
	/// unlike standard, you can't specify it manually
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint(&mut self, caller: caller, to: address, token_id: uint256) -> Result<bool> {
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

		let const_data = BoundedVec::default();
		let users = [(to.clone(), 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> {
				const_data,
				users,
				properties: CollectionPropertiesVec::default(),
			},
			&budget,
		)
		.map_err(dispatch_to_evm::<T>)?;

		Ok(true)
	}

	/// `token_id` should be obtained with `next_token_id` method,
	/// unlike standard, you can't specify it manually
	#[solidity(rename_selector = "mintWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_with_token_uri(
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

		let const_data = BoundedVec::default();
		let users = [(to.clone(), 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData::<T> {
				const_data,
				users,
				properties,
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

fn is_erc721_metadata_compatible<T: Config>(collection_id: CollectionId) -> bool {
	if let Some(shema_name) =
		pallet_common::Pallet::<T>::get_collection_property(collection_id, &key::schema_name())
	{
		let shema_name = shema_name.into_inner();
		shema_name == property_value::ERC721_METADATA
	} else {
		false
	}
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

#[solidity_interface(name = "ERC721UniqueExtensions")]
impl<T: Config> RefungibleHandle<T> {
	/// @notice Returns next free RFT ID.
	fn next_token_id(&self) -> Result<uint256> {
		self.consume_store_reads(1)?;
		Ok(<TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			.into())
	}

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
		let const_data = BoundedVec::default();
		let users = [(to.clone(), 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
		let create_item_data = CreateItemData::<T> {
			const_data,
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

	#[solidity(rename_selector = "mintBulkWithTokenURI")]
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
		let const_data = BoundedVec::default();
		let users: BoundedBTreeMap<_, _, _> = [(to.clone(), 1)]
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap();
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

			let create_item_data = CreateItemData::<T> {
				const_data: const_data.clone(),
				users: users.clone(),
				properties,
			};
			data.push(create_item_data);
		}

		<Pallet<T>>::create_multiple_items(self, &caller, data, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
}

#[solidity_interface(
	name = "UniqueRefungible",
	is(
		ERC721,
		ERC721Metadata,
		ERC721Enumerable,
		ERC721UniqueExtensions,
		ERC721Mintable,
		ERC721Burnable,
		via("CollectionHandle<T>", common_mut, Collection),
		TokenProperties,
	)
)]
impl<T: Config> RefungibleHandle<T> where T::AccountId: From<[u8; 32]> {}

// Not a tests, but code generators
generate_stubgen!(gen_impl, UniqueRefungibleCall<()>, true);
generate_stubgen!(gen_iface, UniqueRefungibleCall<()>, false);

impl<T: Config> CommonEvmHandler for RefungibleHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungible.raw");
	fn call(
		self,
		handle: &mut impl PrecompileHandle,
	) -> Option<pallet_common::erc::PrecompileResult> {
		call::<T, UniqueRefungibleCall<T>, _, _>(handle, self)
	}
}
