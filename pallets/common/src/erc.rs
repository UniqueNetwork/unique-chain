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

//! This module contains the implementation of pallet methods for evm.

use evm_coder::{
	solidity_interface, solidity, ToLog,
	types::*,
	execution::{Result, Error},
};
pub use pallet_evm::{PrecompileOutput, PrecompileResult, PrecompileHandle, account::CrossAccountId};
use pallet_evm_coder_substrate::dispatch_to_evm;
use sp_std::vec::Vec;
use up_data_structs::{
	Property, SponsoringRateLimit, OwnerRestrictedSet, AccessMode, CollectionPermissions,
};
use alloc::format;

use crate::{Pallet, CollectionHandle, Config, CollectionProperties};

/// Events for ethereum collection helper.
#[derive(ToLog)]
pub enum CollectionHelpersEvents {
	/// The collection has been created.
	CollectionCreated {
		/// Collection owner.
		#[indexed]
		owner: address,

		/// Collection ID.
		#[indexed]
		collection_id: address,
	},
}

/// Does not always represent a full collection, for RFT it is either
/// collection (Implementing ERC721), or specific collection token (Implementing ERC20).
pub trait CommonEvmHandler {
	const CODE: &'static [u8];

	/// Call precompiled handle.
	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult>;
}

/// @title A contract that allows you to work with collections.
#[solidity_interface(name = "Collection")]
impl<T: Config> CollectionHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	/// Set collection property.
	///
	/// @param key Property key.
	/// @param value Propery value.
	fn set_collection_property(
		&mut self,
		caller: caller,
		key: string,
		value: bytes,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;
		let value = value.try_into().map_err(|_| "value too large")?;

		<Pallet<T>>::set_collection_property(self, &caller, Property { key, value })
			.map_err(dispatch_to_evm::<T>)
	}

	/// Delete collection property.
	///
	/// @param key Property key.
	fn delete_collection_property(&mut self, caller: caller, key: string) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;

		<Pallet<T>>::delete_collection_property(self, &caller, key).map_err(dispatch_to_evm::<T>)
	}

	/// Get collection property.
	///
	/// @dev Throws error if key not found.
	///
	/// @param key Property key.
	/// @return bytes The property corresponding to the key.
	fn collection_property(&self, key: string) -> Result<bytes> {
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;

		let props = <CollectionProperties<T>>::get(self.id);
		let prop = props.get(&key).ok_or("key not found")?;

		Ok(prop.to_vec())
	}

	/// Set the sponsor of the collection.
	///
	/// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	///
	/// @param sponsor Address of the sponsor from whose account funds will be debited for operations with the contract.
	fn set_collection_sponsor(&mut self, caller: caller, sponsor: address) -> Result<void> {
		check_is_owner_or_admin(caller, self)?;

		let sponsor = T::CrossAccountId::from_eth(sponsor);
		self.set_sponsor(sponsor.as_sub().clone())
			.map_err(dispatch_to_evm::<T>)?;
		save(self)
	}

	/// Collection sponsorship confirmation.
	///
	/// @dev After setting the sponsor for the collection, it must be confirmed with this function.
	fn confirm_collection_sponsorship(&mut self, caller: caller) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		if !self
			.confirm_sponsorship(caller.as_sub())
			.map_err(dispatch_to_evm::<T>)?
		{
			return Err("caller is not set as sponsor".into());
		}
		save(self)
	}

	/// Set limits for the collection.
	/// @dev Throws error if limit not found.
	/// @param limit Name of the limit. Valid names:
	/// 	"accountTokenOwnershipLimit",
	/// 	"sponsoredDataSize",
	/// 	"sponsoredDataRateLimit",
	/// 	"tokenLimit",
	/// 	"sponsorTransferTimeout",
	/// 	"sponsorApproveTimeout"
	/// @param value Value of the limit.
	#[solidity(rename_selector = "setCollectionLimit")]
	fn set_int_limit(&mut self, caller: caller, limit: string, value: uint32) -> Result<void> {
		check_is_owner_or_admin(caller, self)?;
		let mut limits = self.limits.clone();

		match limit.as_str() {
			"accountTokenOwnershipLimit" => {
				limits.account_token_ownership_limit = Some(value);
			}
			"sponsoredDataSize" => {
				limits.sponsored_data_size = Some(value);
			}
			"sponsoredDataRateLimit" => {
				limits.sponsored_data_rate_limit = Some(SponsoringRateLimit::Blocks(value));
			}
			"tokenLimit" => {
				limits.token_limit = Some(value);
			}
			"sponsorTransferTimeout" => {
				limits.sponsor_transfer_timeout = Some(value);
			}
			"sponsorApproveTimeout" => {
				limits.sponsor_approve_timeout = Some(value);
			}
			_ => {
				return Err(Error::Revert(format!(
					"unknown integer limit \"{}\"",
					limit
				)))
			}
		}
		self.limits = <Pallet<T>>::clamp_limits(self.mode.clone(), &self.limits, limits)
			.map_err(dispatch_to_evm::<T>)?;
		save(self)
	}

	/// Set limits for the collection.
	/// @dev Throws error if limit not found.
	/// @param limit Name of the limit. Valid names:
	/// 	"ownerCanTransfer",
	/// 	"ownerCanDestroy",
	/// 	"transfersEnabled"
	/// @param value Value of the limit.
	#[solidity(rename_selector = "setCollectionLimit")]
	fn set_bool_limit(&mut self, caller: caller, limit: string, value: bool) -> Result<void> {
		check_is_owner_or_admin(caller, self)?;
		let mut limits = self.limits.clone();

		match limit.as_str() {
			"ownerCanTransfer" => {
				limits.owner_can_transfer = Some(value);
			}
			"ownerCanDestroy" => {
				limits.owner_can_destroy = Some(value);
			}
			"transfersEnabled" => {
				limits.transfers_enabled = Some(value);
			}
			_ => {
				return Err(Error::Revert(format!(
					"unknown boolean limit \"{}\"",
					limit
				)))
			}
		}
		self.limits = <Pallet<T>>::clamp_limits(self.mode.clone(), &self.limits, limits)
			.map_err(dispatch_to_evm::<T>)?;
		save(self)
	}

	/// Get contract address.
	fn contract_address(&self, _caller: caller) -> Result<address> {
		Ok(crate::eth::collection_id_to_address(self.id))
	}

	/// Add collection admin by substrate address.
	/// @param new_admin Substrate administrator address.
	fn add_collection_admin_substrate(&self, caller: caller, new_admin: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let mut new_admin_arr: [u8; 32] = Default::default();
		new_admin.to_big_endian(&mut new_admin_arr);
		let account_id = T::AccountId::from(new_admin_arr);
		let new_admin = T::CrossAccountId::from_sub(account_id);
		<Pallet<T>>::toggle_admin(self, &caller, &new_admin, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Remove collection admin by substrate address.
	/// @param admin Substrate administrator address.
	fn remove_collection_admin_substrate(&self, caller: caller, admin: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let mut admin_arr: [u8; 32] = Default::default();
		admin.to_big_endian(&mut admin_arr);
		let account_id = T::AccountId::from(admin_arr);
		let admin = T::CrossAccountId::from_sub(account_id);
		<Pallet<T>>::toggle_admin(self, &caller, &admin, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Add collection admin.
	/// @param new_admin Address of the added administrator.
	fn add_collection_admin(&self, caller: caller, new_admin: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let new_admin = T::CrossAccountId::from_eth(new_admin);
		<Pallet<T>>::toggle_admin(self, &caller, &new_admin, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Remove collection admin.
	///
	/// @param new_admin Address of the removed administrator.
	fn remove_collection_admin(&self, caller: caller, admin: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let admin = T::CrossAccountId::from_eth(admin);
		<Pallet<T>>::toggle_admin(self, &caller, &admin, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: 'Owner' else to nesting: 'Disabled'
	#[solidity(rename_selector = "setCollectionNesting")]
	fn set_nesting_bool(&mut self, caller: caller, enable: bool) -> Result<void> {
		check_is_owner_or_admin(caller, self)?;

		let mut permissions = self.collection.permissions.clone();
		let mut nesting = permissions.nesting().clone();
		nesting.token_owner = enable;
		nesting.restricted = None;
		permissions.nesting = Some(nesting);

		self.collection.permissions = <Pallet<T>>::clamp_permissions(
			self.collection.mode.clone(),
			&self.collection.permissions,
			permissions,
		)
		.map_err(dispatch_to_evm::<T>)?;

		save(self)
	}

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: {OwnerRestricted: [1, 2, 3]} else to nesting: 'Disabled'
	/// @param collections Addresses of collections that will be available for nesting.
	#[solidity(rename_selector = "setCollectionNesting")]
	fn set_nesting(
		&mut self,
		caller: caller,
		enable: bool,
		collections: Vec<address>,
	) -> Result<void> {
		if collections.is_empty() {
			return Err("no addresses provided".into());
		}
		check_is_owner_or_admin(caller, self)?;

		let mut permissions = self.collection.permissions.clone();
		match enable {
			false => {
				let mut nesting = permissions.nesting().clone();
				nesting.token_owner = false;
				nesting.restricted = None;
				permissions.nesting = Some(nesting);
			}
			true => {
				let mut bv = OwnerRestrictedSet::new();
				for i in collections {
					bv.try_insert(crate::eth::map_eth_to_id(&i).ok_or(Error::Revert(
						"Can't convert address into collection id".into(),
					))?)
					.map_err(|_| "too many collections")?;
				}
				let mut nesting = permissions.nesting().clone();
				nesting.token_owner = true;
				nesting.restricted = Some(bv);
				permissions.nesting = Some(nesting);
			}
		};

		self.collection.permissions = <Pallet<T>>::clamp_permissions(
			self.collection.mode.clone(),
			&self.collection.permissions,
			permissions,
		)
		.map_err(dispatch_to_evm::<T>)?;

		save(self)
	}

	/// Set the collection access method.
	/// @param mode Access mode
	/// 	0 for Normal
	/// 	1 for AllowList
	fn set_collection_access(&mut self, caller: caller, mode: uint8) -> Result<void> {
		check_is_owner_or_admin(caller, self)?;
		let permissions = CollectionPermissions {
			access: Some(match mode {
				0 => AccessMode::Normal,
				1 => AccessMode::AllowList,
				_ => return Err("not supported access mode".into()),
			}),
			..Default::default()
		};
		self.collection.permissions = <Pallet<T>>::clamp_permissions(
			self.collection.mode.clone(),
			&self.collection.permissions,
			permissions,
		)
		.map_err(dispatch_to_evm::<T>)?;

		save(self)
	}

	/// Add the user to the allowed list.
	///
	/// @param user Address of a trusted user.
	fn add_to_collection_allow_list(&self, caller: caller, user: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let user = T::CrossAccountId::from_eth(user);
		<Pallet<T>>::toggle_allowlist(self, &caller, &user, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Remove the user from the allowed list.
	///
	/// @param user Address of a removed user.
	fn remove_from_collection_allow_list(&self, caller: caller, user: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let user = T::CrossAccountId::from_eth(user);
		<Pallet<T>>::toggle_allowlist(self, &caller, &user, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Switch permission for minting.
	///
	/// @param mode Enable if "true".
	fn set_collection_mint_mode(&mut self, caller: caller, mode: bool) -> Result<void> {
		check_is_owner_or_admin(caller, self)?;
		let permissions = CollectionPermissions {
			mint_mode: Some(mode),
			..Default::default()
		};
		self.collection.permissions = <Pallet<T>>::clamp_permissions(
			self.collection.mode.clone(),
			&self.collection.permissions,
			permissions,
		)
		.map_err(dispatch_to_evm::<T>)?;

		save(self)
	}
}

fn check_is_owner_or_admin<T: Config>(
	caller: caller,
	collection: &CollectionHandle<T>,
) -> Result<T::CrossAccountId> {
	let caller = T::CrossAccountId::from_eth(caller);
	collection
		.check_is_owner_or_admin(&caller)
		.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
	Ok(caller)
}

fn save<T: Config>(collection: &CollectionHandle<T>) -> Result<void> {
	// TODO possibly delete for the lack of transaction
	collection
		.check_is_internal()
		.map_err(dispatch_to_evm::<T>)?;
	<crate::CollectionById<T>>::insert(collection.id, collection.collection.clone());
	Ok(())
}

pub mod static_property_key_value {
	use evm_coder::{
		execution::{Result, Error},
	};
	use alloc::format;

	const EXPECT_CONVERT_ERROR: &str = "length < limit";
	/// Get the "tokenURI" key as [PropertyKey](up_data_structs::PropertyKey).
	pub fn token_uri_key() -> up_data_structs::PropertyKey {
		property_key_from_bytes(b"tokenURI").expect(EXPECT_CONVERT_ERROR)
	}

	pub fn schema_name_key() -> up_data_structs::PropertyKey {
		property_key_from_bytes(b"schemaName").expect(EXPECT_CONVERT_ERROR)
	}

	pub fn base_uri_key() -> up_data_structs::PropertyKey {
		property_key_from_bytes(b"baseURI").expect(EXPECT_CONVERT_ERROR)
	}

	pub fn u_key() -> up_data_structs::PropertyKey {
		property_key_from_bytes(b"u").expect(EXPECT_CONVERT_ERROR)
	}

	pub fn s_key() -> up_data_structs::PropertyKey {
		property_key_from_bytes(b"s").expect(EXPECT_CONVERT_ERROR)
	}

	pub fn erc721_value() -> up_data_structs::PropertyValue {
		property_value_from_bytes(b"ERC721").expect(EXPECT_CONVERT_ERROR)
	}

	pub fn property_key_from_bytes(bytes: &[u8]) -> Result<up_data_structs::PropertyKey> {
		bytes.to_vec().try_into().map_err(|_| {
			Error::Revert(format!(
				"Property key is too long. Max length is {}.",
				up_data_structs::PropertyKey::bound()
			))
		})
	}

	pub fn property_value_from_bytes(bytes: &[u8]) -> Result<up_data_structs::PropertyValue> {
		bytes.to_vec().try_into().map_err(|_| {
			Error::Revert(format!(
				"Property key is too long. Max length is {}.",
				up_data_structs::PropertyKey::bound()
			))
		})
	}
}
