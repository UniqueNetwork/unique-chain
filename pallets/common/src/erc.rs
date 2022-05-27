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
	solidity_interface,
	types::*,
	execution::{Result, Error},
};
pub use pallet_evm::{PrecompileOutput, PrecompileResult, account::CrossAccountId};
use pallet_evm_coder_substrate::dispatch_to_evm;
use sp_core::{H160, U256};
use sp_std::vec::Vec;
use up_data_structs::{Property, SponsoringRateLimit};
use alloc::format;

use crate::{Pallet, CollectionHandle, Config, CollectionProperties};

/// Does not always represent a full collection, for RFT it is either
/// collection (Implementing ERC721), or specific collection token (Implementing ERC20)
pub trait CommonEvmHandler {
	const CODE: &'static [u8];

	fn call(self, source: &H160, input: &[u8], value: U256) -> Option<PrecompileResult>;
}

#[solidity_interface(name = "Collection")]
impl<T: Config> CollectionHandle<T> {
	fn set_collection_property(&mut self, caller: caller, key: string, value: bytes) -> Result<()> {
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

	fn eth_set_sponsor(&mut self, caller: caller, sponsor: address) -> Result<void> {
		check_is_owner(caller, self)?;

		let sponsor = T::CrossAccountId::from_eth(sponsor);
		self.set_sponsor(sponsor.as_sub().clone());
		save(self);
		Ok(())
	}

	fn eth_confirm_sponsorship(&mut self, caller: caller) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		if !self.confirm_sponsorship(caller.as_sub()) {
			return Err(Error::Revert("Caller is not set as sponsor".into()));
		}
		save(self);
		Ok(())
	}

	fn set_limit(&mut self, caller: caller, limit: string, value: string) -> Result<void> {
		check_is_owner(caller, self)?;
		let mut limits = self.limits.clone();

		match limit.as_str() {
			"accountTokenOwnershipLimit" => {
				limits.account_token_ownership_limit = parse_int(value)?;
			}
			"sponsoredDataSize" => {
				limits.sponsored_data_size = parse_int(value)?;
			}
			"sponsoredDataRateLimit" => {
				limits.sponsored_data_rate_limit =
					Some(SponsoringRateLimit::Blocks(parse_int(value)?.unwrap()));
			}
			"tokenLimit" => {
				limits.token_limit = parse_int(value)?;
			}
			"sponsorTransferTimeout" => {
				limits.sponsor_transfer_timeout = parse_int(value)?;
			}
			"sponsorApproveTimeout" => {
				limits.sponsor_approve_timeout = parse_int(value)?;
			}
			"ownerCanTransfer" => {
				limits.owner_can_transfer = parse_bool(value)?;
			}
			"ownerCanDestroy" => {
				limits.owner_can_destroy = parse_bool(value)?;
			}
			"transfersEnabled" => {
				limits.transfers_enabled = parse_bool(value)?;
			}
			_ => return Err(Error::Revert(format!("Unknown limit \"{}\"", limit))),
		}
		self.limits = limits;
		save(self);
		Ok(())
	}

	fn contract_address(&self, _caller: caller) -> Result<address> {
		Ok(crate::eth::collection_id_to_address(self.id))
	}
}

fn check_is_owner<T: Config>(caller: caller, collection: &CollectionHandle<T>) -> Result<()> {
	let caller = T::CrossAccountId::from_eth(caller);
	collection
		.check_is_owner(&caller)
		.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
	Ok(())
}

fn save<T: Config>(collection: &CollectionHandle<T>) {
	<crate::CollectionById<T>>::insert(collection.id, collection.collection.clone());
}

fn parse_int(value: string) -> Result<Option<u32>> {
	value
		.parse::<u32>()
		.map_err(|e| Error::Revert(format!("Int value \"{}\" parse error: {}", value, e)))
		.map(|value| Some(value))
}

fn parse_bool(value: string) -> Result<Option<bool>> {
	value
		.parse::<bool>()
		.map_err(|e| Error::Revert(format!("Bool value \"{}\" parse error: {}", value, e)))
		.map(|value| Some(value))
}
