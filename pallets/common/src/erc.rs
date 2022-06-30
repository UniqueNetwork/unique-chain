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

#[derive(ToLog)]
pub enum CollectionHelpersEvents {
	CollectionCreated {
		#[indexed]
		owner: address,
		#[indexed]
		collection_id: address,
	},
}

/// Does not always represent a full collection, for RFT it is either
/// collection (Implementing ERC721), or specific collection token (Implementing ERC20)
pub trait CommonEvmHandler {
	const CODE: &'static [u8];

	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult>;
}

#[solidity_interface(name = "Collection")]
impl<T: Config> CollectionHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
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

	fn delete_collection_property(&mut self, caller: caller, key: string) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;

		<Pallet<T>>::delete_collection_property(self, &caller, key).map_err(dispatch_to_evm::<T>)
	}

	/// Throws error if key not found
	fn collection_property(&self, key: string) -> Result<bytes> {
		let key = <Vec<u8>>::from(key)
			.try_into()
			.map_err(|_| "key too large")?;

		let props = <CollectionProperties<T>>::get(self.id);
		let prop = props.get(&key).ok_or("key not found")?;

		Ok(prop.to_vec())
	}

	fn set_collection_sponsor(&mut self, caller: caller, sponsor: address) -> Result<void> {
		check_is_owner_or_admin(caller, self)?;

		let sponsor = T::CrossAccountId::from_eth(sponsor);
		self.set_sponsor(sponsor.as_sub().clone())
			.map_err(dispatch_to_evm::<T>)?;
		save(self)
	}

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

	fn contract_address(&self, _caller: caller) -> Result<address> {
		Ok(crate::eth::collection_id_to_address(self.id))
	}

	fn add_collection_admin_substrate(&self, caller: caller, new_admin: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let mut new_admin_arr: [u8; 32] = Default::default();
		new_admin.to_big_endian(&mut new_admin_arr);
		let account_id = T::AccountId::from(new_admin_arr);
		let new_admin = T::CrossAccountId::from_sub(account_id);
		<Pallet<T>>::toggle_admin(self, &caller, &new_admin, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn remove_collection_admin_substrate(
		&self,
		caller: caller,
		new_admin: uint256,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let mut new_admin_arr: [u8; 32] = Default::default();
		new_admin.to_big_endian(&mut new_admin_arr);
		let account_id = T::AccountId::from(new_admin_arr);
		let new_admin = T::CrossAccountId::from_sub(account_id);
		<Pallet<T>>::toggle_admin(self, &caller, &new_admin, false)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn add_collection_admin(&self, caller: caller, new_admin: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let new_admin = T::CrossAccountId::from_eth(new_admin);
		<Pallet<T>>::toggle_admin(self, &caller, &new_admin, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn remove_collection_admin(&self, caller: caller, admin: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let admin = T::CrossAccountId::from_eth(admin);
		<Pallet<T>>::toggle_admin(self, &caller, &admin, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

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

	fn add_to_collection_allow_list(&self, caller: caller, user: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let user = T::CrossAccountId::from_eth(user);
		<Pallet<T>>::toggle_allowlist(self, &caller, &user, true).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn remove_from_collection_allow_list(&self, caller: caller, user: address) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let user = T::CrossAccountId::from_eth(user);
		<Pallet<T>>::toggle_allowlist(self, &caller, &user, false).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

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

pub fn token_uri_key() -> up_data_structs::PropertyKey {
	b"tokenURI"
		.to_vec()
		.try_into()
		.expect("length < limit; qed")
}
