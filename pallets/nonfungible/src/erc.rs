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
use core::{
	char::{REPLACEMENT_CHARACTER, decode_utf16},
	convert::TryInto,
};
use evm_coder::{ToLog, execution::*, generate_stubgen, solidity, solidity_interface, types::*, weight};
use frame_support::BoundedVec;
use up_data_structs::{
	TokenId, PropertyPermission, PropertyKeyPermission, Property, CollectionId, PropertyKey,
	CollectionPropertiesVec,
};
use pallet_evm_coder_substrate::dispatch_to_evm;
use sp_std::vec::Vec;
use pallet_common::{
	erc::{CommonEvmHandler, PrecompileResult, CollectionCall, static_property_key_value::*},
	CollectionHandle, CollectionPropertyPermissions,
};
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::call;
use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
use alloc::string::ToString;

use crate::{
	AccountBalance, Config, CreateItemData, NonfungibleHandle, Pallet, TokenData, TokensMinted,
	SelfWeightOf, weights::WeightInfo, TokenProperties,
};

#[solidity_interface(name = "TokenProperties")]
impl<T: Config> NonfungibleHandle<T> {
	fn set_token_property_permission(
		&mut self,
		caller: caller,
		key: string,
		is_mutable: bool,
		collection_admin: bool,
		token_owner: bool,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		<Pallet<T>>::set_property_permission(
			self,
			&caller,
			PropertyKeyPermission {
				key: <Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| "too long key")?,
				permission: PropertyPermission {
					mutable: is_mutable,
					collection_admin,
					token_owner,
				},
			},
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
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		approved: address,
		#[indexed]
		token_id: uint256,
	},
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
	#[allow(dead_code)]
	MintingFinished {},
}

#[solidity_interface(name = "ERC721Metadata")]
impl<T: Config> NonfungibleHandle<T> {
	fn name(&self) -> Result<string> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}

	fn symbol(&self) -> Result<string> {
		Ok(string::from_utf8_lossy(&self.token_prefix).into())
	}

	/// Returns token's const_metadata
	#[solidity(rename_selector = "tokenURI")]
	fn token_uri(&self, token_id: uint256) -> Result<string> {
		let is_erc721 = || {
			if let Some(shema_name) =
				pallet_common::Pallet::<T>::get_collection_property(self.id, &schema_name_key())
			{
				let shema_name = shema_name.into_inner();
				shema_name == ERC721_METADATA
			} else {
				false
			}
		};

		let token_id_u32: u32 = token_id.try_into().map_err(|_| "token id overflow")?;

		if let Ok(url) = get_token_property(self, token_id_u32, &url_key()) {
			if !url.is_empty() {
				return Ok(url);
			}
		} else if !is_erc721() {
			return Err("tokenURI not set".into());
		}

		if let Some(base_uri) =
			pallet_common::Pallet::<T>::get_collection_property(self.id, &base_uri_key())
		{
			if !base_uri.is_empty() {
				let base_uri = string::from_utf8(base_uri.into_inner()).map_err(|e| {
					Error::Revert(alloc::format!(
						"Can not convert value \"baseURI\" to string with error \"{}\"",
						e
					))
				})?;
				if let Ok(suffix) = get_token_property(self, token_id_u32, &suffix_key()) {
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
impl<T: Config> NonfungibleHandle<T> {
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
impl<T: Config> NonfungibleHandle<T> {
	fn balance_of(&self, owner: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <AccountBalance<T>>::get((self.id, owner));
		Ok(balance.into())
	}
	fn owner_of(&self, token_id: uint256) -> Result<address> {
		self.consume_store_reads(1)?;
		let token: TokenId = token_id.try_into()?;
		Ok(*<TokenData<T>>::get((self.id, token))
			.ok_or("token not found")?
			.owner
			.as_eth())
	}
	/// Not implemented
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
	/// Not implemented
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

	#[weight(<SelfWeightOf<T>>::transfer_from())]
	fn transfer_from(
		&mut self,
		caller: caller,
		from: address,
		to: address,
		token_id: uint256,
		_value: value,
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

	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve(
		&mut self,
		caller: caller,
		approved: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let approved = T::CrossAccountId::from_eth(approved);
		let token = token_id.try_into()?;

		<Pallet<T>>::set_allowance(self, &caller, token, Some(&approved))
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Not implemented
	fn set_approval_for_all(
		&mut self,
		_caller: caller,
		_operator: address,
		_approved: bool,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// Not implemented
	fn get_approved(&self, _token_id: uint256) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// Not implemented
	fn is_approved_for_all(&self, _owner: address, _operator: address) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}
}

#[solidity_interface(name = "ERC721Burnable")]
impl<T: Config> NonfungibleHandle<T> {
	#[weight(<SelfWeightOf<T>>::burn_item())]
	fn burn(&mut self, caller: caller, token_id: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token = token_id.try_into()?;

		<Pallet<T>>::burn(self, &caller, token).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}
}

#[solidity_interface(name = "ERC721Mintable", events(ERC721MintableEvents))]
impl<T: Config> NonfungibleHandle<T> {
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
		let key = url_key();
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

	/// Not implemented
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

fn has_token_permission<T: Config>(collection_id: CollectionId, key: &PropertyKey) -> bool {
	if let Ok(token_property_permissions) =
		CollectionPropertyPermissions::<T>::try_get(collection_id)
	{
		return token_property_permissions.contains_key(key);
	}

	false
}

#[solidity_interface(name = "ERC721UniqueExtensions")]
impl<T: Config> NonfungibleHandle<T> {
	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer(
		&mut self,
		caller: caller,
		to: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token = token_id.try_into()?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, token, &budget).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from(
		&mut self,
		caller: caller,
		from: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
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

	#[solidity(rename_selector = "mintBulkWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_multiple_items(tokens.len() as u32))]
	fn mint_bulk_with_token_uri(
		&mut self,
		caller: caller,
		to: address,
		tokens: Vec<(uint256, string)>,
	) -> Result<bool> {
		let key = url_key();
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
}

#[solidity_interface(
	name = "UniqueNFT",
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
impl<T: Config> NonfungibleHandle<T> where T::AccountId: From<[u8; 32]> {}

// Not a tests, but code generators
generate_stubgen!(gen_impl, UniqueNFTCall<()>, true);
generate_stubgen!(gen_iface, UniqueNFTCall<()>, false);

impl<T: Config> CommonEvmHandler for NonfungibleHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueNFT.raw");

	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		call::<T, UniqueNFTCall<T>, _, _>(handle, self)
	}
}
