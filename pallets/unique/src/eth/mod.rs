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
use evm_coder::{execution::*, generate_stubgen, solidity_interface, weight, types::*};
use ethereum as _;
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use pallet_evm::{OnMethodCall, PrecompileResult, account::CrossAccountId};
use up_data_structs::{
	CreateCollectionData, MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
	MAX_COLLECTION_NAME_LENGTH,
};
use frame_support::traits::Get;
use pallet_common::{
	CollectionById,
	erc::{token_uri_key, CollectionHelpersEvents},
};
use crate::{SelfWeightOf, Config, weights::WeightInfo};

use sp_std::vec::Vec;
use alloc::format;

struct EvmCollectionHelpers<T: Config>(SubstrateRecorder<T>);
impl<T: Config> WithRecorder<T> for EvmCollectionHelpers<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.0
	}

	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.0
	}
}

#[solidity_interface(name = "CollectionHelpers", events(CollectionHelpersEvents))]
impl<T: Config + pallet_nonfungible::Config> EvmCollectionHelpers<T> {
	#[weight(<SelfWeightOf<T>>::create_collection())]
	fn create_nonfungible_collection(
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
			.map_err(|_| error_feild_too_long(stringify!(name), MAX_COLLECTION_NAME_LENGTH))?;
		let description = description
			.encode_utf16()
			.collect::<Vec<u16>>()
			.try_into()
			.map_err(|_| {
				error_feild_too_long(stringify!(description), MAX_COLLECTION_DESCRIPTION_LENGTH)
			})?;
		let token_prefix = token_prefix
			.into_bytes()
			.try_into()
			.map_err(|_| error_feild_too_long(stringify!(token_prefix), MAX_TOKEN_PREFIX_LENGTH))?;

		let key = token_uri_key();
		let permission = up_data_structs::PropertyPermission {
			mutable: true,
			collection_admin: true,
			token_owner: false,
		};
		let mut token_property_permissions =
			up_data_structs::CollectionPropertiesPermissionsVec::default();
		token_property_permissions
			.try_push(up_data_structs::PropertyKeyPermission { key, permission })
			.map_err(|e| Error::Revert(format!("{:?}", e)))?;

		let data = CreateCollectionData {
			name,
			description,
			token_prefix,
			token_property_permissions,
			..Default::default()
		};

		let collection_id = <pallet_nonfungible::Pallet<T>>::init_collection(caller.clone(), data)
			.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		Ok(address)
	}

	fn is_collection_exist(&self, _caller: caller, collection_address: address) -> Result<bool> {
		if let Some(id) = pallet_common::eth::map_eth_to_id(&collection_address) {
			let collection_id = id;
			return Ok(<CollectionById<T>>::contains_key(collection_id));
		}

		Ok(false)
	}
}

pub struct CollectionHelpersOnMethodCall<T: Config>(PhantomData<*const T>);
impl<T: Config + pallet_nonfungible::Config> OnMethodCall<T> for CollectionHelpersOnMethodCall<T> {
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

		let helpers = EvmCollectionHelpers::<T>(SubstrateRecorder::<T>::new(gas_left));
		pallet_evm_coder_substrate::call(*source, helpers, value, input)
	}

	fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
		(contract == &T::ContractAddress::get())
			.then(|| include_bytes!("./stubs/CollectionHelpers.raw").to_vec())
	}
}

generate_stubgen!(collection_helper_impl, CollectionHelpersCall<()>, true);
generate_stubgen!(collection_helper_iface, CollectionHelpersCall<()>, false);

fn error_feild_too_long(feild: &str, bound: u32) -> Error {
	Error::Revert(format!("{} is too long. Max length is {}.", feild, bound))
}
