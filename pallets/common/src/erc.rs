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

pub use pallet_evm::{PrecompileOutput, PrecompileResult, PrecompileHandle, account::CrossAccountId};
use pallet_evm_coder_substrate::{
	abi::AbiType,
	solidity_interface, ToLog,
	types::*,
	execution::{Result, Error, PreDispatch},
	frontier_contract,
};
use pallet_evm_coder_substrate::dispatch_to_evm;
use sp_std::{vec, vec::Vec};
use up_data_structs::{
	CollectionMode, CollectionPermissions, OwnerRestrictedSet, Property, SponsoringRateLimit,
	SponsorshipState,
};

use crate::{
	Pallet, CollectionHandle, Config, CollectionProperties, eth, SelfWeightOf, weights::WeightInfo,
};

frontier_contract! {
	macro_rules! CollectionHandle_result {...}
	impl<T: Config> Contract for CollectionHandle<T> {...}
}

/// Events for ethereum collection helper.
#[derive(ToLog)]
pub enum CollectionHelpersEvents {
	/// The collection has been created.
	CollectionCreated {
		/// Collection owner.
		#[indexed]
		owner: Address,

		/// Collection ID.
		#[indexed]
		collection_id: Address,
	},
	/// The collection has been destroyed.
	CollectionDestroyed {
		/// Collection ID.
		#[indexed]
		collection_id: Address,
	},
	/// The collection has been changed.
	CollectionChanged {
		/// Collection ID.
		#[indexed]
		collection_id: Address,
	},
}

/// Does not always represent a full collection, for RFT it is either
/// collection (Implementing ERC721), or specific collection token (Implementing ERC20).
pub trait CommonEvmHandler {
	/// Raw compiled binary code of the contract stub
	const CODE: &'static [u8];

	/// Call precompiled handle.
	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult>;
}

/// @title A contract that allows you to work with collections.
#[solidity_interface(name = Collection, enum(derive(PreDispatch)), enum_attr(weight))]
impl<T: Config> CollectionHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	/// Set collection property.
	///
	/// @param key Property key.
	/// @param value Propery value.
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::set_collection_properties(1))]
	fn set_collection_property(&mut self, caller: Caller, key: String, value: Bytes) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;
		let value = value.0.try_into().map_err(|_| "value too large")?;

		<Pallet<T>>::set_collection_property(self, &caller, Property { key, value })
			.map_err(dispatch_to_evm::<T>)
	}

	/// Set collection properties.
	///
	/// @param properties Vector of properties key/value pair.
	#[weight(<SelfWeightOf<T>>::set_collection_properties(properties.len() as u32))]
	fn set_collection_properties(
		&mut self,
		caller: Caller,
		properties: Vec<eth::Property>,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);

		let properties = properties
			.into_iter()
			.map(eth::Property::try_into)
			.collect::<Result<Vec<_>>>()?;

		<Pallet<T>>::set_collection_properties(self, &caller, properties.into_iter())
			.map_err(dispatch_to_evm::<T>)
	}

	/// Delete collection property.
	///
	/// @param key Property key.
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::delete_collection_properties(1))]
	fn delete_collection_property(&mut self, caller: Caller, key: String) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;

		<Pallet<T>>::delete_collection_property(self, &caller, key).map_err(dispatch_to_evm::<T>)
	}

	/// Delete collection properties.
	///
	/// @param keys Properties keys.
	#[weight(<SelfWeightOf<T>>::delete_collection_properties(keys.len() as u32))]
	fn delete_collection_properties(&mut self, caller: Caller, keys: Vec<String>) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let keys = keys
			.into_iter()
			.map(|key| {
				<Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| Error::Revert("key too large".into()))
			})
			.collect::<Result<Vec<_>>>()?;

		<Pallet<T>>::delete_collection_properties(self, &caller, keys.into_iter())
			.map_err(dispatch_to_evm::<T>)
	}

	/// Get collection property.
	///
	/// @dev Throws error if key not found.
	///
	/// @param key Property key.
	/// @return bytes The property corresponding to the key.
	fn collection_property(&self, key: String) -> Result<Bytes> {
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;

		let props = CollectionProperties::<T>::get(self.id);
		let prop = props.get(&key).ok_or("key not found")?;

		Ok(Bytes(prop.to_vec()))
	}

	/// Get collection properties.
	///
	/// @param keys Properties keys. Empty keys for all propertyes.
	/// @return Vector of properties key/value pairs.
	fn collection_properties(&self, keys: Vec<String>) -> Result<Vec<eth::Property>> {
		let keys = keys
			.into_iter()
			.map(|key| {
				<Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| Error::Revert("key too large".into()))
			})
			.collect::<Result<Vec<_>>>()?;

		let properties = Pallet::<T>::filter_collection_properties(
			self.id,
			if keys.is_empty() { None } else { Some(keys) },
		)
		.map_err(dispatch_to_evm::<T>)?;

		let properties = properties
			.into_iter()
			.map(Property::try_into)
			.collect::<Result<Vec<_>>>()?;
		Ok(properties)
	}

	/// Set the sponsor of the collection.
	///
	/// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	///
	/// @param sponsor Address of the sponsor from whose account funds will be debited for operations with the contract.
	#[solidity(hide)]
	fn set_collection_sponsor(&mut self, caller: Caller, sponsor: Address) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;

		let caller = T::CrossAccountId::from_eth(caller);

		let sponsor = T::CrossAccountId::from_eth(sponsor);
		self.set_sponsor(&caller, sponsor.as_sub().clone())
			.map_err(dispatch_to_evm::<T>)
	}

	/// Set the sponsor of the collection.
	///
	/// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	///
	/// @param sponsor Cross account address of the sponsor from whose account funds will be debited for operations with the contract.
	fn set_collection_sponsor_cross(
		&mut self,
		caller: Caller,
		sponsor: eth::CrossAddress,
	) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;

		let caller = T::CrossAccountId::from_eth(caller);

		let sponsor = sponsor.into_sub_cross_account::<T>()?;
		self.set_sponsor(&caller, sponsor.as_sub().clone())
			.map_err(dispatch_to_evm::<T>)
	}

	/// Whether there is a pending sponsor.
	fn has_collection_pending_sponsor(&self) -> Result<bool> {
		Ok(matches!(
			self.collection.sponsorship,
			SponsorshipState::Unconfirmed(_)
		))
	}

	/// Collection sponsorship confirmation.
	///
	/// @dev After setting the sponsor for the collection, it must be confirmed with this function.
	fn confirm_collection_sponsorship(&mut self, caller: Caller) -> Result<()> {
		self.consume_store_writes(1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		self.confirm_sponsorship(caller.as_sub())
			.map_err(dispatch_to_evm::<T>)
	}

	/// Remove collection sponsor.
	fn remove_collection_sponsor(&mut self, caller: Caller) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;
		let caller = T::CrossAccountId::from_eth(caller);
		self.remove_sponsor(&caller).map_err(dispatch_to_evm::<T>)
	}

	/// Get current sponsor.
	///
	/// @return Tuble with sponsor address and his substrate mirror. If there is no confirmed sponsor error "Contract has no sponsor" throw.
	fn collection_sponsor(&self) -> Result<eth::CrossAddress> {
		let sponsor = match self.collection.sponsorship.sponsor() {
			Some(sponsor) => sponsor,
			None => return Ok(Default::default()),
		};

		Ok(eth::CrossAddress::from_sub::<T>(sponsor))
	}

	/// Get current collection limits.
	///
	/// @return Array of collection limits
	fn collection_limits(&self) -> Result<Vec<eth::CollectionLimit>> {
		let limits = &self.collection.limits;

		Ok(vec![
			eth::CollectionLimit::new(
				eth::CollectionLimitField::AccountTokenOwnership,
				limits.account_token_ownership_limit,
			),
			eth::CollectionLimit::new(
				eth::CollectionLimitField::SponsoredDataSize,
				limits.sponsored_data_size,
			),
			limits
				.sponsored_data_rate_limit
				.and_then(|limit| {
					if let SponsoringRateLimit::Blocks(blocks) = limit {
						Some(eth::CollectionLimit::new(
							eth::CollectionLimitField::SponsoredDataRateLimit,
							Some(blocks),
						))
					} else {
						None
					}
				})
				.unwrap_or_else(|| {
					eth::CollectionLimit::new(
						eth::CollectionLimitField::SponsoredDataRateLimit,
						Default::default(),
					)
				}),
			eth::CollectionLimit::new(eth::CollectionLimitField::TokenLimit, limits.token_limit),
			eth::CollectionLimit::new(
				eth::CollectionLimitField::SponsorTransferTimeout,
				limits.sponsor_transfer_timeout,
			),
			eth::CollectionLimit::new(
				eth::CollectionLimitField::SponsorApproveTimeout,
				limits.sponsor_approve_timeout,
			),
			eth::CollectionLimit::new(
				eth::CollectionLimitField::OwnerCanTransfer,
				limits.owner_can_transfer.map(u32::from),
			),
			eth::CollectionLimit::new(
				eth::CollectionLimitField::OwnerCanDestroy,
				limits.owner_can_destroy.map(u32::from),
			),
			eth::CollectionLimit::new(
				eth::CollectionLimitField::TransferEnabled,
				limits.transfers_enabled.map(u32::from),
			),
		])
	}

	/// Set limits for the collection.
	/// @dev Throws error if limit not found.
	/// @param limit Some limit.
	#[solidity(rename_selector = "setCollectionLimit")]
	fn set_collection_limit(&mut self, caller: Caller, limit: eth::CollectionLimit) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;

		if !limit.has_value() {
			return Err(Error::Revert("user can't disable limits".into()));
		}

		let caller = T::CrossAccountId::from_eth(caller);
		<Pallet<T>>::update_limits(&caller, self, limit.try_into()?).map_err(dispatch_to_evm::<T>)
	}

	/// Get contract address.
	fn contract_address(&self) -> Result<Address> {
		Ok(crate::eth::collection_id_to_address(self.id))
	}

	/// Add collection admin.
	/// @param newAdmin Cross account administrator address.
	fn add_collection_admin_cross(
		&mut self,
		caller: Caller,
		new_admin: eth::CrossAddress,
	) -> Result<()> {
		self.consume_store_reads_and_writes(2, 2)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let new_admin = new_admin.into_sub_cross_account::<T>()?;
		<Pallet<T>>::toggle_admin(self, &caller, &new_admin, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Remove collection admin.
	/// @param admin Cross account administrator address.
	fn remove_collection_admin_cross(
		&mut self,
		caller: Caller,
		admin: eth::CrossAddress,
	) -> Result<()> {
		self.consume_store_reads_and_writes(2, 2)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let admin = admin.into_sub_cross_account::<T>()?;
		<Pallet<T>>::toggle_admin(self, &caller, &admin, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Add collection admin.
	/// @param newAdmin Address of the added administrator.
	#[solidity(hide)]
	fn add_collection_admin(&mut self, caller: Caller, new_admin: Address) -> Result<()> {
		self.consume_store_reads_and_writes(2, 2)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let new_admin = T::CrossAccountId::from_eth(new_admin);
		<Pallet<T>>::toggle_admin(self, &caller, &new_admin, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Remove collection admin.
	///
	/// @param admin Address of the removed administrator.
	#[solidity(hide)]
	fn remove_collection_admin(&mut self, caller: Caller, admin: Address) -> Result<()> {
		self.consume_store_reads_and_writes(2, 2)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let admin = T::CrossAccountId::from_eth(admin);
		<Pallet<T>>::toggle_admin(self, &caller, &admin, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: 'Owner' else to nesting: 'Disabled'
	#[solidity(rename_selector = "setCollectionNesting")]
	fn set_nesting_bool(&mut self, caller: Caller, enable: bool) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;

		let caller = T::CrossAccountId::from_eth(caller);

		let mut permissions = self.collection.permissions.clone();
		let mut nesting = permissions.nesting().clone();
		nesting.token_owner = enable;
		nesting.restricted = None;
		permissions.nesting = Some(nesting);

		<Pallet<T>>::update_permissions(&caller, self, permissions).map_err(dispatch_to_evm::<T>)
	}

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: {OwnerRestricted: [1, 2, 3]} else to nesting: 'Disabled'
	/// @param collections Addresses of collections that will be available for nesting.
	#[solidity(rename_selector = "setCollectionNesting")]
	fn set_nesting(
		&mut self,
		caller: Caller,
		enable: bool,
		collections: Vec<Address>,
	) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;

		if collections.is_empty() {
			return Err("no addresses provided".into());
		}
		let caller = T::CrossAccountId::from_eth(caller);

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
					bv.try_insert(crate::eth::map_eth_to_id(&i).ok_or_else(|| {
						Error::Revert("Can't convert address into collection id".into())
					})?)
					.map_err(|_| "too many collections")?;
				}
				let mut nesting = permissions.nesting().clone();
				nesting.token_owner = true;
				nesting.restricted = Some(bv);
				permissions.nesting = Some(nesting);
			}
		};

		<Pallet<T>>::update_permissions(&caller, self, permissions).map_err(dispatch_to_evm::<T>)
	}

	/// Returns nesting for a collection
	#[solidity(rename_selector = "collectionNestingRestrictedCollectionIds")]
	fn collection_nesting_restricted_ids(&self) -> Result<eth::CollectionNesting> {
		let nesting = self.collection.permissions.nesting();

		Ok(eth::CollectionNesting::new(
			nesting.token_owner,
			nesting
				.restricted
				.clone()
				.map(|b| b.0.into_inner().iter().map(|id| id.0.into()).collect())
				.unwrap_or_default(),
		))
	}

	/// Returns permissions for a collection
	fn collection_nesting_permissions(&self) -> Result<Vec<eth::CollectionNestingPermission>> {
		let nesting = self.collection.permissions.nesting();
		Ok(vec![
			eth::CollectionNestingPermission::new(
				eth::CollectionPermissionField::CollectionAdmin,
				nesting.collection_admin,
			),
			eth::CollectionNestingPermission::new(
				eth::CollectionPermissionField::TokenOwner,
				nesting.token_owner,
			),
		])
	}
	/// Set the collection access method.
	/// @param mode Access mode
	fn set_collection_access(&mut self, caller: Caller, mode: eth::AccessMode) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let permissions = CollectionPermissions {
			access: Some(mode.into()),
			..Default::default()
		};
		<Pallet<T>>::update_permissions(&caller, self, permissions).map_err(dispatch_to_evm::<T>)
	}

	/// Checks that user allowed to operate with collection.
	///
	/// @param user User address to check.
	fn allowlisted_cross(&self, user: eth::CrossAddress) -> Result<bool> {
		let user = user.into_sub_cross_account::<T>()?;
		Ok(Pallet::<T>::allowed(self.id, user))
	}

	/// Add the user to the allowed list.
	///
	/// @param user Address of a trusted user.
	#[solidity(hide)]
	fn add_to_collection_allow_list(&mut self, caller: Caller, user: Address) -> Result<()> {
		self.consume_store_writes(1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let user = T::CrossAccountId::from_eth(user);
		<Pallet<T>>::toggle_allowlist(self, &caller, &user, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Add user to allowed list.
	///
	/// @param user User cross account address.
	fn add_to_collection_allow_list_cross(
		&mut self,
		caller: Caller,
		user: eth::CrossAddress,
	) -> Result<()> {
		self.consume_store_writes(1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let user = user.into_sub_cross_account::<T>()?;
		Pallet::<T>::toggle_allowlist(self, &caller, &user, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Remove the user from the allowed list.
	///
	/// @param user Address of a removed user.
	#[solidity(hide)]
	fn remove_from_collection_allow_list(&mut self, caller: Caller, user: Address) -> Result<()> {
		self.consume_store_writes(1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let user = T::CrossAccountId::from_eth(user);
		<Pallet<T>>::toggle_allowlist(self, &caller, &user, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Remove user from allowed list.
	///
	/// @param user User cross account address.
	fn remove_from_collection_allow_list_cross(
		&mut self,
		caller: Caller,
		user: eth::CrossAddress,
	) -> Result<()> {
		self.consume_store_writes(1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let user = user.into_sub_cross_account::<T>()?;
		Pallet::<T>::toggle_allowlist(self, &caller, &user, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Switch permission for minting.
	///
	/// @param mode Enable if "true".
	fn set_collection_mint_mode(&mut self, caller: Caller, mode: bool) -> Result<()> {
		self.consume_store_reads_and_writes(1, 1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let permissions = CollectionPermissions {
			mint_mode: Some(mode),
			..Default::default()
		};
		<Pallet<T>>::update_permissions(&caller, self, permissions).map_err(dispatch_to_evm::<T>)
	}

	/// Check that account is the owner or admin of the collection
	///
	/// @param user account to verify
	/// @return "true" if account is the owner or admin
	#[solidity(hide, rename_selector = "isOwnerOrAdmin")]
	fn is_owner_or_admin_eth(&self, user: Address) -> Result<bool> {
		let user = T::CrossAccountId::from_eth(user);
		Ok(self.is_owner_or_admin(&user))
	}

	/// Check that account is the owner or admin of the collection
	///
	/// @param user User cross account to verify
	/// @return "true" if account is the owner or admin
	fn is_owner_or_admin_cross(&self, user: eth::CrossAddress) -> Result<bool> {
		let user = user.into_sub_cross_account::<T>()?;
		Ok(self.is_owner_or_admin(&user))
	}

	/// Returns collection type
	///
	/// @return `Fungible` or `NFT` or `ReFungible`
	fn unique_collection_type(&self) -> Result<String> {
		let mode = match self.collection.mode {
			CollectionMode::Fungible(_) => "Fungible",
			CollectionMode::NFT => "NFT",
			CollectionMode::ReFungible => "ReFungible",
		};
		Ok(mode.into())
	}

	/// Get collection owner.
	///
	/// @return Tuble with sponsor address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	fn collection_owner(&self) -> Result<eth::CrossAddress> {
		Ok(eth::CrossAddress::from_sub_cross_account::<T>(
			&T::CrossAccountId::from_sub(self.owner.clone()),
		))
	}

	/// Changes collection owner to another account
	///
	/// @dev Owner can be changed only by current owner
	/// @param newOwner new owner account
	#[solidity(hide, rename_selector = "changeCollectionOwner")]
	fn set_owner(&mut self, caller: Caller, new_owner: Address) -> Result<()> {
		self.consume_store_writes(1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let new_owner = T::CrossAccountId::from_eth(new_owner);
		self.change_owner(caller, new_owner)
			.map_err(dispatch_to_evm::<T>)
	}

	/// Get collection administrators
	///
	/// @return Vector of tuples with admins address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	fn collection_admins(&self) -> Result<Vec<eth::CrossAddress>> {
		let result = crate::IsAdmin::<T>::iter_prefix((self.id,))
			.map(|(admin, _)| eth::CrossAddress::from_sub_cross_account::<T>(&admin))
			.collect();
		Ok(result)
	}

	/// Changes collection owner to another account
	///
	/// @dev Owner can be changed only by current owner
	/// @param newOwner new owner cross account
	fn change_collection_owner_cross(
		&mut self,
		caller: Caller,
		new_owner: eth::CrossAddress,
	) -> Result<()> {
		self.consume_store_writes(1)?;

		let caller = T::CrossAccountId::from_eth(caller);
		let new_owner = new_owner.into_sub_cross_account::<T>()?;
		self.change_owner(caller, new_owner)
			.map_err(dispatch_to_evm::<T>)
	}
}

/// Contains static property keys and values.
pub mod static_property {
	use pallet_evm_coder_substrate::{
		execution::{Result, Error},
	};
	use alloc::format;

	const EXPECT_CONVERT_ERROR: &str = "length < limit";

	/// Keys.
	pub mod key {
		use super::*;

		/// Key "baseURI".
		pub fn base_uri() -> up_data_structs::PropertyKey {
			property_key_from_bytes(b"baseURI").expect(EXPECT_CONVERT_ERROR)
		}

		/// Key "url".
		pub fn url() -> up_data_structs::PropertyKey {
			property_key_from_bytes(b"URI").expect(EXPECT_CONVERT_ERROR)
		}

		/// Key "suffix".
		pub fn suffix() -> up_data_structs::PropertyKey {
			property_key_from_bytes(b"URISuffix").expect(EXPECT_CONVERT_ERROR)
		}

		/// Key "parentNft".
		pub fn parent_nft() -> up_data_structs::PropertyKey {
			property_key_from_bytes(b"parentNft").expect(EXPECT_CONVERT_ERROR)
		}
	}

	/// Convert `byte` to [`PropertyKey`].
	pub fn property_key_from_bytes(bytes: &[u8]) -> Result<up_data_structs::PropertyKey> {
		bytes.to_vec().try_into().map_err(|_| {
			Error::Revert(format!(
				"Property key is too long. Max length is {}.",
				up_data_structs::PropertyKey::bound()
			))
		})
	}

	/// Convert `bytes` to [`PropertyValue`].
	pub fn property_value_from_bytes(bytes: &[u8]) -> Result<up_data_structs::PropertyValue> {
		bytes.to_vec().try_into().map_err(|_| {
			Error::Revert(format!(
				"Property key is too long. Max length is {}.",
				up_data_structs::PropertyKey::bound()
			))
		})
	}
}
