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

use evm_coder::{solidity_interface, types::*, execution::{Result, Error}};
pub use pallet_evm::{PrecompileOutput, PrecompileResult, account::CrossAccountId};
use pallet_evm_coder_substrate::{dispatch_to_evm, SubstrateRecorder};
use sp_core::{H160, U256};
use sp_std::vec::Vec;
use up_data_structs::Property;

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

	fn eth_set_sponsor(
		&mut self,
		caller: caller,
		sponsor: address,
	) -> Result<void> {
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

	fn set_limits(
		&self,
		caller: caller,
		limits_json: string,
	) -> Result<void> {
		// let mut collection = collection_from_address::<T>(self.contract_address(caller).unwrap(), self.1.gas_left())?;
		// check_is_owner(caller, &collection)?;

		// let limits = serde_json_core::from_str(limits_json.as_ref())
		// 	.map_err(|e| Error::Revert(format!("Parse JSON error: {}", e)))?;
		// collection.limits = limits.0;
		// collection.save().map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn contract_address(&self, _caller: caller) -> Result<address> {
		Ok(crate::eth::collection_id_to_address(self.id))
	}
}

fn collection_from_address<T: Config>(
	collection_address: address,
	gas_limit: u64
) -> Result<CollectionHandle<T>> {
	let collection_id = crate::eth::map_eth_to_id(&collection_address)
	.ok_or(Error::Revert("Contract is not an unique collection".into()))?;
	let recorder = <SubstrateRecorder<T>>::new(gas_limit);
	let collection =
		CollectionHandle::new_with_recorder(collection_id, recorder)
			.ok_or(Error::Revert("Create collection handle error".into()))?;
	Ok(collection)
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