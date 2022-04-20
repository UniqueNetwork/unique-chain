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
use pallet_common::{CollectionById, CollectionHandle};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use pallet_evm::{
	ExitRevert, OnCreate, OnMethodCall, PrecompileResult, PrecompileFailure,
	account::CrossAccountId,
};
use sp_core::H160;
use up_data_structs::{
	CreateCollectionData, MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
	MAX_COLLECTION_NAME_LENGTH, SponsorshipState,
};
use crate::{Config, Pallet};
use frame_support::traits::Get;

use sp_std::{vec::Vec, rc::Rc};
use alloc::format;

struct EvmCollection<T: Config>(Rc<SubstrateRecorder<T>>);
impl<T: Config> WithRecorder<T> for EvmCollection<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.0
	}

	fn into_recorder(self) -> Rc<SubstrateRecorder<T>> {
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
		self.0.log_mirrored(CollectionEvent::CollectionCreated {
			owner: *caller.as_eth(),
			collection_id: address,
		});
		Ok(address)
	}

	fn set_sponsor(
		&self,
		caller: caller,
		contract_address: address,
		sponsor: address,
	) -> Result<void> {
		let collection_id =
			pallet_common::eth::map_eth_to_id(&contract_address).ok_or(Error::Revert("".into()))?;
		let mut collection =
			pallet_common::CollectionHandle::new_with_recorder(collection_id, self.0.clone())
				.ok_or(Error::Revert("".into()))?;
		
		let caller = T::CrossAccountId::from_eth(caller);
		collection.check_is_owner(&caller).map_err(|e| Error::Revert(format!("{:?}", e)))?;

		let sponsor = T::CrossAccountId::from_eth(sponsor);
		collection.set_sponsor(sponsor.as_sub().clone());
		collection
			.save()
			.map_err(|e| Error::Revert(format!("{:?}", e)))
	}

	// fn set_offchain_shema(shema: string) -> Result<void> {
	// 	Ok(())
	// }

	// fn set_const_on_chain_schema(shema: string) -> Result<void> {
	// 	Ok(())
	// }

	// fn set_variable_on_chain_schema(shema: string) -> Result<void> {
	// 	Ok(())
	// }

	// fn set_limits(limits: string) -> Result<void> {
	// 	Ok(())
	// }
}

fn error_feild_too_long(feild: &str, bound: u32) -> Error {
	Error::Revert(format!("{} is too long. Max length is {}.", feild, bound))
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
		// TODO: Extract to another OnMethodCall handler
		if target != &T::ContractAddress::get() {
			return None;
		}

		let helpers = EvmCollection::<T>(Rc::new(SubstrateRecorder::<T>::new(*target, gas_left)));
		pallet_evm_coder_substrate::call(*source, helpers, value, input)
	}

	fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
		(contract == &T::ContractAddress::get())
			.then(|| include_bytes!("./stubs/Collection.raw").to_vec())
	}
}

generate_stubgen!(collection_impl, CollectionCall<()>, true);
generate_stubgen!(collection_iface, CollectionCall<()>, false);
