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
//!
use core::marker::PhantomData;
use ethereum as _;
use evm_coder::{abi::AbiType, generate_stubgen, solidity_interface, types::*};
use frame_support::{BoundedVec, traits::Get};
use pallet_common::{
	CollectionById,
	dispatch::CollectionDispatch,
	erc::{CollectionHelpersEvents, static_property::key},
	eth::{self, map_eth_to_id, collection_id_to_address},
	Pallet as PalletCommon, CollectionHandle,
};
use pallet_evm::{account::CrossAccountId, OnMethodCall, PrecompileHandle, PrecompileResult};
use pallet_evm_coder_substrate::{
	dispatch_to_evm, SubstrateRecorder, WithRecorder,
	execution::{PreDispatch, Result, Error},
	frontier_contract,
};
use up_data_structs::{
	CollectionDescription, CollectionMode, CollectionName, CollectionPermissions,
	CollectionTokenPrefix, CreateCollectionData, NestingPermissions,
};

use crate::{weights::WeightInfo, Config, Pallet, SelfWeightOf};

use alloc::{format, collections::BTreeSet};
use sp_std::vec::Vec;

frontier_contract! {
	macro_rules! EvmCollectionHelpers_result {...}
	impl<T: Config> Contract for EvmCollectionHelpers<T> {...}
}
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
	caller: Caller,
	name: String,
	description: String,
	token_prefix: String,
) -> Result<(
	T::CrossAccountId,
	CollectionName,
	CollectionDescription,
	CollectionTokenPrefix,
)> {
	let caller = T::CrossAccountId::from_eth(caller);
	let name = name
		.encode_utf16()
		.collect::<Vec<u16>>()
		.try_into()
		.map_err(|_| error_field_too_long(stringify!(name), CollectionName::bound()))?;
	let description = description
		.encode_utf16()
		.collect::<Vec<u16>>()
		.try_into()
		.map_err(|_| {
			error_field_too_long(stringify!(description), CollectionDescription::bound())
		})?;
	let token_prefix = token_prefix.into_bytes().try_into().map_err(|_| {
		error_field_too_long(stringify!(token_prefix), CollectionTokenPrefix::bound())
	})?;
	Ok((caller, name, description, token_prefix))
}

#[inline(always)]
fn create_collection_internal<T: Config>(
	caller: Caller,
	value: Value,
	name: String,
	collection_mode: CollectionMode,
	description: String,
	token_prefix: String,
) -> Result<Address> {
	let (caller, name, description, token_prefix) =
		convert_data::<T>(caller, name, description, token_prefix)?;
	let data = CreateCollectionData {
		name,
		mode: collection_mode,
		description,
		token_prefix,
		..Default::default()
	};
	check_sent_amount_equals_collection_creation_price::<T>(value)?;
	let collection_helpers_address =
		T::CrossAccountId::from_eth(<T as pallet_common::Config>::ContractAddress::get());

	let collection_id = T::CollectionDispatch::create(caller, collection_helpers_address, data)
		.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
	let address = pallet_common::eth::collection_id_to_address(collection_id);
	Ok(address)
}

fn check_sent_amount_equals_collection_creation_price<T: Config>(value: Value) -> Result<()> {
	let value = value.as_u128();
	let creation_price: u128 = T::CollectionCreationPrice::get()
		.try_into()
		.map_err(|_| ()) // workaround for `expect` requiring `Debug` trait
		.expect("Collection creation price should be convertible to u128");
	if value != creation_price {
		return Err(format!(
			"Sent amount not equals to collection creation price ({creation_price})",
		)
		.into());
	}
	Ok(())
}

/// @title Contract, which allows users to operate with collections
#[solidity_interface(name = CollectionHelpers, events(CollectionHelpersEvents), enum(derive(PreDispatch)), enum_attr(weight))]
impl<T> EvmCollectionHelpers<T>
where
	T: Config + pallet_common::Config + pallet_nonfungible::Config + pallet_refungible::Config,
	T::AccountId: From<[u8; 32]>,
{
	/// Create a collection
	/// @return address Address of the newly created collection
	#[weight(<SelfWeightOf<T>>::create_collection())]
	#[solidity(rename_selector = "createCollection")]
	fn create_collection(
		&mut self,
		caller: Caller,
		value: Value,
		data: eth::CreateCollectionData,
	) -> Result<Address> {
		let (caller, name, description, token_prefix) =
			convert_data::<T>(caller, data.name, data.description, data.token_prefix)?;
		if data.mode != eth::CollectionMode::Fungible && data.decimals != 0 {
			return Err(Error::Revert(
				"Decimals are only supported for NFT and RFT collections".into(),
			));
		}
		let mode = match data.mode {
			eth::CollectionMode::Fungible => CollectionMode::Fungible(data.decimals),
			eth::CollectionMode::Nonfungible => CollectionMode::NFT,
			eth::CollectionMode::Refungible => CollectionMode::ReFungible,
		};

		let properties: BoundedVec<_, _> = data
			.properties
			.into_iter()
			.map(eth::Property::try_into)
			.collect::<Result<Vec<_>>>()?
			.try_into()
			.map_err(|_| "too many properties")?;

		let token_property_permissions =
			eth::TokenPropertyPermission::into_property_key_permissions(
				data.token_property_permissions,
			)?
			.try_into()
			.map_err(|_| "too many property permissions")?;

		let limits = if !data.limits.is_empty() {
			Some(
				data.limits
					.into_iter()
					.collect::<Result<up_data_structs::CollectionLimits>>()?,
			)
		} else {
			None
		};

		let pending_sponsor = data.pending_sponsor.into_option_sub_cross_account::<T>()?;

		let restricted = if !data.nesting_settings.restricted.is_empty() {
			Some(
				data.nesting_settings
					.restricted
					.iter()
					.map(map_eth_to_id)
					.collect::<Option<BTreeSet<_>>>()
					.ok_or_else(|| {
						Error::Revert("Can't convert address into collection id".into())
					})?
					.try_into()
					.map_err(|_| "too many collections")?,
			)
		} else {
			None
		};

		let admin_list = data
			.admin_list
			.into_iter()
			.map(|admin| admin.into_sub_cross_account::<T>())
			.collect::<Result<Vec<_>>>()?;

		let flags = data.flags.into();
		let data = CreateCollectionData {
			name,
			mode,
			description,
			token_prefix,
			properties,
			token_property_permissions,
			limits,
			pending_sponsor,
			access: None,
			permissions: Some(CollectionPermissions {
				access: None,
				mint_mode: None,
				nesting: Some(NestingPermissions {
					token_owner: data.nesting_settings.token_owner,
					collection_admin: data.nesting_settings.collection_admin,
					restricted,
					#[cfg(feature = "runtime-benchmarks")]
					permissive: true,
				}),
			}),
			admin_list,
			flags,
		};
		check_sent_amount_equals_collection_creation_price::<T>(value)?;
		let collection_helpers_address =
			T::CrossAccountId::from_eth(<T as pallet_common::Config>::ContractAddress::get());

		let collection_id = T::CollectionDispatch::create(caller, collection_helpers_address, data)
			.map_err(dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		Ok(address)
	}

	/// Create an NFT collection
	/// @param name Name of the collection
	/// @param description Informative description of the collection
	/// @param tokenPrefix Token prefix to represent the collection tokens in UI and user applications
	/// @return address Address of the newly created collection
	#[weight(<SelfWeightOf<T>>::create_collection())]
	#[solidity(rename_selector = "createNFTCollection")]
	fn create_nft_collection(
		&mut self,
		caller: Caller,
		value: Value,
		name: String,
		description: String,
		token_prefix: String,
	) -> Result<Address> {
		let (caller, name, description, token_prefix) =
			convert_data::<T>(caller, name, description, token_prefix)?;
		let data = CreateCollectionData {
			name,
			mode: CollectionMode::NFT,
			description,
			token_prefix,
			..Default::default()
		};
		check_sent_amount_equals_collection_creation_price::<T>(value)?;
		let collection_helpers_address =
			T::CrossAccountId::from_eth(<T as pallet_common::Config>::ContractAddress::get());
		let collection_id = T::CollectionDispatch::create(caller, collection_helpers_address, data)
			.map_err(dispatch_to_evm::<T>)?;

		let address = pallet_common::eth::collection_id_to_address(collection_id);
		Ok(address)
	}
	/// Create an NFT collection
	/// @param name Name of the collection
	/// @param description Informative description of the collection
	/// @param tokenPrefix Token prefix to represent the collection tokens in UI and user applications
	/// @return address Address of the newly created collection
	#[deprecated(note = "mathod was renamed to `create_nft_collection`, prefer it instead")]
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::create_collection())]
	fn create_nonfungible_collection(
		&mut self,
		caller: Caller,
		value: Value,
		name: String,
		description: String,
		token_prefix: String,
	) -> Result<Address> {
		create_collection_internal::<T>(
			caller,
			value,
			name,
			CollectionMode::NFT,
			description,
			token_prefix,
		)
	}

	#[weight(<SelfWeightOf<T>>::create_collection())]
	#[solidity(rename_selector = "createRFTCollection")]
	fn create_rft_collection(
		&mut self,
		caller: Caller,
		value: Value,
		name: String,
		description: String,
		token_prefix: String,
	) -> Result<Address> {
		create_collection_internal::<T>(
			caller,
			value,
			name,
			CollectionMode::ReFungible,
			description,
			token_prefix,
		)
	}

	#[weight(<SelfWeightOf<T>>::create_collection())]
	#[solidity(rename_selector = "createFTCollection")]
	fn create_fungible_collection(
		&mut self,
		caller: Caller,
		value: Value,
		name: String,
		decimals: u8,
		description: String,
		token_prefix: String,
	) -> Result<Address> {
		create_collection_internal::<T>(
			caller,
			value,
			name,
			CollectionMode::Fungible(decimals),
			description,
			token_prefix,
		)
	}

	#[solidity(rename_selector = "makeCollectionERC721MetadataCompatible")]
	fn make_collection_metadata_compatible(
		&mut self,
		caller: Caller,
		collection: Address,
		base_uri: String,
	) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);
		let collection =
			pallet_common::eth::map_eth_to_id(&collection).ok_or("not a collection address")?;
		let mut collection =
			<CollectionHandle<T>>::new(collection).ok_or("collection not found")?;

		if !matches!(
			collection.mode,
			CollectionMode::NFT | CollectionMode::ReFungible
		) {
			return Err("target collection should be either NFT or Refungible".into());
		}

		self.recorder().consume_sstore()?;
		collection
			.check_is_owner_or_admin(&caller)
			.map_err(dispatch_to_evm::<T>)?;

		if collection.flags.erc721metadata {
			return Err("target collection is already Erc721Metadata compatible".into());
		}
		collection.flags.erc721metadata = true;

		let all_permissions = <pallet_common::CollectionPropertyPermissions<T>>::get(collection.id);
		if all_permissions.get(&key::url()).is_none() {
			self.recorder().consume_sstore()?;
			<PalletCommon<T>>::set_property_permission(
				&collection,
				&caller,
				up_data_structs::PropertyKeyPermission {
					key: key::url(),
					permission: up_data_structs::PropertyPermission {
						mutable: true,
						collection_admin: true,
						token_owner: false,
					},
				},
			)
			.map_err(dispatch_to_evm::<T>)?;
		}
		if all_permissions.get(&key::suffix()).is_none() {
			self.recorder().consume_sstore()?;
			<PalletCommon<T>>::set_property_permission(
				&collection,
				&caller,
				up_data_structs::PropertyKeyPermission {
					key: key::suffix(),
					permission: up_data_structs::PropertyPermission {
						mutable: true,
						collection_admin: true,
						token_owner: false,
					},
				},
			)
			.map_err(dispatch_to_evm::<T>)?;
		}

		let all_properties = <pallet_common::CollectionProperties<T>>::get(collection.id);
		if all_properties.get(&key::base_uri()).is_none() && !base_uri.is_empty() {
			self.recorder().consume_sstore()?;
			<PalletCommon<T>>::set_collection_properties(
				&collection,
				&caller,
				[up_data_structs::Property {
					key: key::base_uri(),
					value: base_uri
						.into_bytes()
						.try_into()
						.map_err(|_| "base uri is too large")?,
				}]
				.into_iter(),
			)
			.map_err(dispatch_to_evm::<T>)?;
		}

		self.recorder().consume_sstore()?;
		collection.save().map_err(dispatch_to_evm::<T>)?;

		Ok(())
	}

	#[weight(<SelfWeightOf<T>>::destroy_collection())]
	fn destroy_collection(&mut self, caller: Caller, collection_address: Address) -> Result<()> {
		let caller = T::CrossAccountId::from_eth(caller);

		let collection_id = pallet_common::eth::map_eth_to_id(&collection_address)
			.ok_or("Invalid collection address format")?;
		<Pallet<T>>::destroy_collection_internal(caller, collection_id)
			.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)
	}

	/// Check if a collection exists
	/// @param collectionAddress Address of the collection in question
	/// @return bool Does the collection exist?
	fn is_collection_exist(&self, _caller: Caller, collection_address: Address) -> Result<bool> {
		if let Some(id) = pallet_common::eth::map_eth_to_id(&collection_address) {
			let collection_id = id;
			return Ok(<CollectionById<T>>::contains_key(collection_id));
		}

		Ok(false)
	}

	fn collection_creation_fee(&self) -> Result<Value> {
		let price: u128 = T::CollectionCreationPrice::get()
			.try_into()
			.map_err(|_| ()) // workaround for `expect` requiring `Debug` trait
			.expect("Collection creation price should be convertible to u128");
		Ok(price.into())
	}

	/// Returns address of a collection.
	/// @param collectionId  - CollectionId  of the collection
	/// @return eth mirror address of the collection
	fn collection_address(&self, collection_id: u32) -> Result<Address> {
		Ok(collection_id_to_address(collection_id.into()))
	}

	/// Returns collectionId of a collection.
	/// @param collectionAddress  - Eth address of the collection
	/// @return collectionId of the collection
	fn collection_id(&self, collection_address: Address) -> Result<u32> {
		map_eth_to_id(&collection_address)
			.map(|id| id.0)
			.ok_or(Error::Revert(format!(
				"failed to convert address {collection_address} into collectionId."
			)))
	}
}

/// Implements [`OnMethodCall`], which delegates call to [`EvmCollectionHelpers`]
pub struct CollectionHelpersOnMethodCall<T: Config>(PhantomData<*const T>);
impl<T: Config + pallet_nonfungible::Config + pallet_refungible::Config> OnMethodCall<T>
	for CollectionHelpersOnMethodCall<T>
where
	T::AccountId: From<[u8; 32]>,
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

fn error_field_too_long(feild: &str, bound: usize) -> Error {
	Error::Revert(format!("{feild} is too long. Max length is {bound}."))
}
