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

//! Implementation of CollectionHelpers contract.

use core::marker::PhantomData;
use evm_coder::{execution::*, generate_stubgen, solidity_interface, solidity, weight, types::*};
use ethereum as _;
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use pallet_evm::{OnMethodCall, PrecompileResult, account::CrossAccountId, PrecompileHandle};
use up_data_structs::{
	CollectionName, CollectionDescription, CollectionTokenPrefix, CreateCollectionData,
	CollectionMode, PropertyValue,
};
use frame_support::traits::Get;
use pallet_common::{
	CollectionById,
	erc::{
		static_property::{key, value as property_value},
		CollectionHelpersEvents,
	},
};
use crate::{SelfWeightOf, Config, weights::WeightInfo};

use sp_std::vec::Vec;
use alloc::format;

/// See [`CollectionHelpersCall`]
pub struct EvmCollectionHelpers<T: Config>(SubstrateRecorder<T>);
impl<T: Config> WithRecorder<T> for EvmCollectionHelpers<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.0
	}

	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.0
	}
}

fn convert_data<T: Config>(
	caller: caller,
	name: string,
	description: string,
	token_prefix: string,
	base_uri: string,
) -> Result<(
	T::CrossAccountId,
	CollectionName,
	CollectionDescription,
	CollectionTokenPrefix,
	PropertyValue,
)> {
	let caller = T::CrossAccountId::from_eth(caller);
	let name = name
		.encode_utf16()
		.collect::<Vec<u16>>()
		.try_into()
		.map_err(|_| error_feild_too_long(stringify!(name), CollectionName::bound()))?;
	let description = description
		.encode_utf16()
		.collect::<Vec<u16>>()
		.try_into()
		.map_err(|_| {
			error_feild_too_long(stringify!(description), CollectionDescription::bound())
		})?;
	let token_prefix = token_prefix.into_bytes().try_into().map_err(|_| {
		error_feild_too_long(stringify!(token_prefix), CollectionTokenPrefix::bound())
	})?;
	let base_uri_value = base_uri
		.into_bytes()
		.try_into()
		.map_err(|_| error_feild_too_long(stringify!(token_prefix), PropertyValue::bound()))?;
	Ok((caller, name, description, token_prefix, base_uri_value))
}

fn make_data<T: Config>(
	name: CollectionName,
	mode: CollectionMode,
	description: CollectionDescription,
	token_prefix: CollectionTokenPrefix,
	base_uri_value: PropertyValue,
	add_properties: bool,
) -> Result<CreateCollectionData<T::AccountId>> {
	let mut properties = up_data_structs::CollectionPropertiesVec::default();
	let mut token_property_permissions =
		up_data_structs::CollectionPropertiesPermissionsVec::default();

	token_property_permissions
		.try_push(up_data_structs::PropertyKeyPermission {
			key: key::url(),
			permission: up_data_structs::PropertyPermission {
				mutable: false,
				collection_admin: true,
				token_owner: false,
			},
		})
		.map_err(|e| Error::Revert(format!("{:?}", e)))?;

	if add_properties {
		token_property_permissions
			.try_push(up_data_structs::PropertyKeyPermission {
				key: key::suffix(),
				permission: up_data_structs::PropertyPermission {
					mutable: false,
					collection_admin: true,
					token_owner: false,
				},
			})
			.map_err(|e| Error::Revert(format!("{:?}", e)))?;

		properties
			.try_push(up_data_structs::Property {
				key: key::schema_name(),
				value: property_value::erc721(),
			})
			.map_err(|e| Error::Revert(format!("{:?}", e)))?;

		if !base_uri_value.is_empty() {
			properties
				.try_push(up_data_structs::Property {
					key: key::base_uri(),
					value: base_uri_value,
				})
				.map_err(|e| Error::Revert(format!("{:?}", e)))?;
		}
	}

	let data = CreateCollectionData {
		name,
		mode,
		description,
		token_prefix,
		token_property_permissions,
		properties,
		..Default::default()
	};
	Ok(data)
}

/// @title Contract, which allows users to operate with collections
#[solidity_interface(name = "CollectionHelpers", events(CollectionHelpersEvents))]
impl<T> EvmCollectionHelpers<T>
where
	T: Config + pallet_nonfungible::Config + pallet_refungible::Config,
{
	/// Create an NFT collection
	/// @param name Name of the collection
	/// @param description Informative description of the collection
	/// @param token_prefix Token prefix to represent the collection tokens in UI and user applications
	/// @return address Address of the newly created collection
	#[weight(<SelfWeightOf<T>>::create_collection())]
	fn create_nonfungible_collection(
		&mut self,
		caller: caller,
		name: string,
		description: string,
		token_prefix: string,
	) -> Result<address> {
		let (caller, name, description, token_prefix, _base_uri_value) =
			convert_data::<T>(caller, name, description, token_prefix, "".into())?;
		let data = make_data::<T>(
			name,
			CollectionMode::NFT,
			description,
			token_prefix,
			Default::default(),
			false,
		)?;
		let collection_id =
			<pallet_nonfungible::Pallet<T>>::init_collection(caller.clone(), data, false)
				.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		Ok(address)
	}

	#[weight(<SelfWeightOf<T>>::create_collection())]
	#[solidity(rename_selector = "createERC721MetadataCompatibleCollection")]
	fn create_nonfungible_collection_with_properties(
		&mut self,
		caller: caller,
		name: string,
		description: string,
		token_prefix: string,
		base_uri: string,
	) -> Result<address> {
		let (caller, name, description, token_prefix, base_uri_value) =
			convert_data::<T>(caller, name, description, token_prefix, base_uri)?;
		let data = make_data::<T>(
			name,
			CollectionMode::NFT,
			description,
			token_prefix,
			base_uri_value,
			true,
		)?;
		let collection_id =
			<pallet_nonfungible::Pallet<T>>::init_collection(caller.clone(), data, true)
				.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		Ok(address)
	}

	#[weight(<SelfWeightOf<T>>::create_collection())]
	fn create_refungible_collection(
		&self,
		caller: caller,
		name: string,
		description: string,
		token_prefix: string,
	) -> Result<address> {
		let (caller, name, description, token_prefix, _base_uri) =
			convert_data::<T>(caller, name, description, token_prefix, "".into())?;
		let data = make_data::<T>(
			name,
			CollectionMode::ReFungible,
			description,
			token_prefix,
			Default::default(),
			false,
		)?;
		let collection_id = <pallet_refungible::Pallet<T>>::init_collection(caller.clone(), data)
			.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		Ok(address)
	}

	#[weight(<SelfWeightOf<T>>::create_collection())]
	#[solidity(rename_selector = "createERC721MetadataCompatibleRFTCollection")]
	fn create_refungible_collection_with_properties(
		&mut self,
		caller: caller,
		name: string,
		description: string,
		token_prefix: string,
		base_uri: string,
	) -> Result<address> {
		let (caller, name, description, token_prefix, base_uri_value) =
			convert_data::<T>(caller, name, description, token_prefix, base_uri)?;
		let data = make_data::<T>(
			name,
			CollectionMode::NFT,
			description,
			token_prefix,
			base_uri_value,
			true,
		)?;
		let collection_id = <pallet_refungible::Pallet<T>>::init_collection(caller.clone(), data)
			.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		Ok(address)
	}

	/// Check if a collection exists
	/// @param collection_address Address of the collection in question
	/// @return bool Does the collection exist?
	fn is_collection_exist(&self, _caller: caller, collection_address: address) -> Result<bool> {
		if let Some(id) = pallet_common::eth::map_eth_to_id(&collection_address) {
			let collection_id = id;
			return Ok(<CollectionById<T>>::contains_key(collection_id));
		}

		Ok(false)
	}
}

/// Implements [`OnMethodCall`], which delegates call to [`EvmCollectionHelpers`]
pub struct CollectionHelpersOnMethodCall<T: Config>(PhantomData<*const T>);
impl<T: Config + pallet_nonfungible::Config + pallet_refungible::Config> OnMethodCall<T>
	for CollectionHelpersOnMethodCall<T>
{
	fn is_reserved(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn is_used(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn call(handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		if handle.code_address() != T::ContractAddress::get() {
			return None;
		}

		let helpers =
			EvmCollectionHelpers::<T>(SubstrateRecorder::<T>::new(handle.remaining_gas()));
		pallet_evm_coder_substrate::call(handle, helpers)
	}

	fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
		(contract == &T::ContractAddress::get())
			.then(|| include_bytes!("./stubs/CollectionHelpers.raw").to_vec())
	}
}

generate_stubgen!(collection_helper_impl, CollectionHelpersCall<()>, true);
generate_stubgen!(collection_helper_iface, CollectionHelpersCall<()>, false);

fn error_feild_too_long(feild: &str, bound: usize) -> Error {
	Error::Revert(format!("{} is too long. Max length is {}.", feild, bound))
}
