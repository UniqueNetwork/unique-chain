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

use core::marker::PhantomData;
use evm_coder::{abi::AbiWriter, execution::*, generate_stubgen, solidity_interface, types::*, ToLog};
use ethereum as _;
use pallet_common::CollectionById;
use pallet_common::{CollectionHandle};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use pallet_evm::{
	ExitRevert, OnCreate, OnMethodCall, PrecompileResult, PrecompileFailure,
	account::CrossAccountId, Pallet as PalletEvm,
};
use sp_core::H160;
use up_data_structs::{
	CreateCollectionData, MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
	MAX_COLLECTION_NAME_LENGTH, OFFCHAIN_SCHEMA_LIMIT, VARIABLE_ON_CHAIN_SCHEMA_LIMIT,
	CONST_ON_CHAIN_SCHEMA_LIMIT,
};
use crate::{Config, Pallet};
use frame_support::traits::Get;

use sp_std::{vec::Vec, rc::Rc};
use alloc::format;

struct EvmCollection<T: Config>(SubstrateRecorder<T>);
impl<T: Config> WithRecorder<T> for EvmCollection<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.0
	}

	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.0
	}
}

#[derive(ToLog)]
pub enum CollectionEvent {
	CollectionCreated {
		#[indexed]
		owner: address,
		#[indexed]
		collection_id: address,
	},
}

#[solidity_interface(name = "Collection")]
impl<T: Config> EvmCollection<T> {
	fn create_721_collection(
		&self,
		caller: caller,
		name: string,
		description: string,
		token_prefix: string,
	) -> Result<address> {
		let caller = T::CrossAccountId::from_eth(caller);
		let name = name
			.encode_utf16()
			.collect::<Vec<u16>>()
			.try_into()
			.map_err(|_| error_feild_too_long("name", MAX_COLLECTION_NAME_LENGTH))?;
		let description = description
			.encode_utf16()
			.collect::<Vec<u16>>()
			.try_into()
			.map_err(|_| error_feild_too_long("description", MAX_COLLECTION_DESCRIPTION_LENGTH))?;
		let token_prefix = token_prefix
			.into_bytes()
			.try_into()
			.map_err(|_| error_feild_too_long("token_prefix", MAX_TOKEN_PREFIX_LENGTH))?;

		let data = CreateCollectionData {
			name,
			description,
			token_prefix,
			..Default::default()
		};

		let collection_id =
			<pallet_nonfungible::Pallet<T>>::init_collection(caller.as_sub().clone(), data)
				.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		<PalletEvm<T>>::deposit_log(
			CollectionEvent::CollectionCreated {
				owner: *caller.as_eth(),
				collection_id: address,
			}
			.to_log(address),
		);
		Ok(address)
	}

	fn set_sponsor(
		&self,
		caller: caller,
		collection_address: address,
		sponsor: address,
	) -> Result<void> {
		let mut collection = collection_from_address(collection_address, &self.0)?;
		check_is_owner(caller, &collection)?;

		let sponsor = T::CrossAccountId::from_eth(sponsor);
		collection.set_sponsor(sponsor.as_sub().clone());
		collection.save().map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(()).map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn confirm_sponsorship(&self, caller: caller, collection_address: address) -> Result<void> {
		let mut collection = collection_from_address(collection_address, &self.0)?;
		let caller = T::CrossAccountId::from_eth(caller);
		if !collection.confirm_sponsorship(caller.as_sub()) {
			return Err(Error::Revert("Caller is not set as sponsor".into()));
		}
		collection.save().map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn set_offchain_schema(
		&self,
		caller: caller,
		collection_address: address,
		schema: string,
	) -> Result<void> {
		let mut collection = collection_from_address(collection_address, &self.0)?;
		check_is_owner(caller, &collection)?;

		let schema = schema
			.into_bytes()
			.try_into()
			.map_err(|_| error_feild_too_long(stringify!(shema), OFFCHAIN_SCHEMA_LIMIT))?;
		// collection.offchain_schema = schema;
		collection.save().map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn set_variable_on_chain_schema(
		&self,
		caller: caller,
		collection_address: address,
		variable: string,
	) -> Result<void> {
		let mut collection = collection_from_address(collection_address, &self.0)?;
		check_is_owner(caller, &collection)?;

		let variable = variable.into_bytes().try_into().map_err(|_| {
			error_feild_too_long(stringify!(variable), VARIABLE_ON_CHAIN_SCHEMA_LIMIT)
		})?;
		// collection.variable_on_chain_schema = variable;
		collection.save().map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn set_const_on_chain_schema(
		&self,
		caller: caller,
		collection_address: address,
		const_on_chain: string,
	) -> Result<void> {
		let mut collection = collection_from_address(collection_address, &self.0)?;
		check_is_owner(caller, &collection)?;

		let const_on_chain = const_on_chain.into_bytes().try_into().map_err(|_| {
			error_feild_too_long(stringify!(const_on_chain), CONST_ON_CHAIN_SCHEMA_LIMIT)
		})?;
		// collection.const_on_chain_schema = const_on_chain;
		collection.save().map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn set_limits(
		&self,
		caller: caller,
		collection_address: address,
		limits_json: string,
	) -> Result<void> {
		let mut collection = collection_from_address(collection_address, &self.0)?;
		check_is_owner(caller, &collection)?;

		let limits = serde_json_core::from_str(limits_json.as_ref())
			.map_err(|e| Error::Revert(format!("Parse JSON error: {}", e)))?;
		collection.limits = limits.0;
		collection.save().map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		Ok(())
	}
}

fn error_feild_too_long(feild: &str, bound: u32) -> Error {
	Error::Revert(format!("{} is too long. Max length is {}.", feild, bound))
}

fn collection_from_address<T: Config>(
	collection_address: address,
	recorder: &SubstrateRecorder<T>,
) -> Result<CollectionHandle<T>> {
	let collection_id = pallet_common::eth::map_eth_to_id(&collection_address)
		.ok_or(Error::Revert("Contract is not an unique collection".into()))?;
	let collection =
		pallet_common::CollectionHandle::new_with_gas_limit(collection_id, recorder.gas_left())
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

pub struct CollectionOnMethodCall<T: Config>(PhantomData<*const T>);
impl<T: Config> OnMethodCall<T> for CollectionOnMethodCall<T> {
	fn is_reserved(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn is_used(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn call(
		source: &sp_core::H160,
		target: &sp_core::H160,
		gas_left: u64,
		input: &[u8],
		value: sp_core::U256,
	) -> Option<PrecompileResult> {
		if target != &T::ContractAddress::get() {
			return None;
		}

		let helpers = EvmCollection::<T>(SubstrateRecorder::new(gas_left));
		pallet_evm_coder_substrate::call(*source, helpers, value, input)
	}

	fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
		(contract == &T::ContractAddress::get())
			.then(|| include_bytes!("./stubs/Collection.raw").to_vec())
	}
}

generate_stubgen!(collection_impl, CollectionCall<()>, true);
generate_stubgen!(collection_iface, CollectionCall<()>, false);
