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

use sp_std::vec::Vec;
use crate::{Config, CollectionHandle, Pallet};
use pallet_evm::account::CrossAccountId;
use frame_benchmarking::{benchmarks, account};
use up_data_structs::{
	CollectionMode, CreateCollectionData, CollectionId, Property, PropertyKey, PropertyValue,
	CollectionPermissions, NestingPermissions, MAX_COLLECTION_NAME_LENGTH,
	MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH, MAX_PROPERTIES_PER_ITEM,
};
use frame_support::{
	traits::{Currency, Get},
	pallet_prelude::ConstU32,
	BoundedVec,
};
use core::convert::TryInto;
use sp_runtime::DispatchError;

const SEED: u32 = 1;

pub fn create_data<const S: u32>() -> BoundedVec<u8, ConstU32<S>> {
	create_var_data::<S>(S)
}
pub fn create_u16_data<const S: u32>() -> BoundedVec<u16, ConstU32<S>> {
	(0..S)
		.map(|v| (v & 0xffff) as u16)
		.collect::<Vec<_>>()
		.try_into()
		.unwrap()
}
pub fn create_var_data<const S: u32>(size: u32) -> BoundedVec<u8, ConstU32<S>> {
	assert!(
		size <= S,
		"size ({}) should be less within bound ({})",
		size,
		S
	);
	(0..size)
		.map(|v| (v & 0xff) as u8)
		.collect::<Vec<_>>()
		.try_into()
		.unwrap()
}
pub fn property_key(id: usize) -> PropertyKey {
	#[cfg(not(feature = "std"))]
	use alloc::string::ToString;
	let mut data = create_data();
	// No DerefMut available for .fill
	for i in 0..data.len() {
		data[i] = b'0';
	}
	let bytes = id.to_string();
	let len = data.len();
	data[len - bytes.len()..].copy_from_slice(&bytes.as_bytes());
	data
}
pub fn property_value() -> PropertyValue {
	create_data()
}

pub fn create_collection_raw<T: Config, R>(
	owner: T::CrossAccountId,
	mode: CollectionMode,
	handler: impl FnOnce(
		T::CrossAccountId,
		CreateCollectionData<T::AccountId>,
	) -> Result<CollectionId, DispatchError>,
	cast: impl FnOnce(CollectionHandle<T>) -> R,
) -> Result<R, DispatchError> {
	<T as Config>::Currency::deposit_creating(&owner.as_sub(), T::CollectionCreationPrice::get());
	let name = create_u16_data::<MAX_COLLECTION_NAME_LENGTH>();
	let description = create_u16_data::<MAX_COLLECTION_DESCRIPTION_LENGTH>();
	let token_prefix = create_data::<MAX_TOKEN_PREFIX_LENGTH>();
	handler(
		owner,
		CreateCollectionData {
			mode,
			name,
			description,
			token_prefix,
			permissions: Some(CollectionPermissions {
				nesting: Some(NestingPermissions {
					token_owner: false,
					collection_admin: false,
					restricted: None,
					permissive: true,
				}),
                mint_mode: Some(true),
				..Default::default()
			}),
			..Default::default()
		},
	)
	.and_then(CollectionHandle::try_get)
	.map(cast)
}
fn create_collection<T: Config>(
	owner: T::CrossAccountId,
) -> Result<CollectionHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::NFT,
		|owner, data| <Pallet<T>>::init_collection(owner, data, true),
		|h| h,
	)
}

/// Helper macros, which handles all benchmarking preparation in semi-declarative way
///
/// `name` is a substrate account
/// - name: sub[(id)]
/// `name` is a collection with owner `owner`
/// - name: collection(owner)
/// `name` is a cross account based on substrate
/// - name: cross_sub[(id)]
/// `name` is a cross account, which maps to substrate account `name`
/// - name: cross_from_sub
/// `name` is a cross account, which maps to substrate account `other_name`
/// - name: cross_from_sub(other_name)
#[macro_export]
macro_rules! bench_init {
	($name:ident: sub $(($id:expr))?; $($rest:tt)*) => {
		let $name: T::AccountId = account(stringify!($name), 0 $(+ $id)?, SEED);
		bench_init!($($rest)*);
	};
	($name:ident: collection($owner:ident); $($rest:tt)*) => {
		let $name = create_collection::<T>(T::CrossAccountId::from_sub($owner.clone()))?;
		bench_init!($($rest)*);
	};
	($name:ident: cross; $($rest:tt)*) => {
		let $name = T::CrossAccountId::from_sub($name);
		bench_init!($($rest)*);
	};
	($name:ident: cross_sub $(($id:expr))?; $($rest:tt)*) => {
		let account: T::AccountId = account(stringify!($name), 0 $(+ $id)?, SEED);
		let $name = T::CrossAccountId::from_sub(account);
		bench_init!($($rest)*);
	};
	($name:ident: cross_from_sub; $($rest:tt)*) => {
		let $name = T::CrossAccountId::from_sub($name);
		bench_init!($($rest)*);
	};
	($name:ident: cross_from_sub($from:ident); $($rest:tt)*) => {
		let $name = T::CrossAccountId::from_sub($from);
		bench_init!($($rest)*);
	};
	() => {}
}

benchmarks! {
	set_collection_properties {
		let b in 0..MAX_PROPERTIES_PER_ITEM;
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let props = (0..b).map(|p| Property {
			key: property_key(p as usize),
			value: property_value(),
		}).collect::<Vec<_>>();
	}: {<Pallet<T>>::set_collection_properties(&collection, &owner, props)?}

	delete_collection_properties {
		let b in 0..MAX_PROPERTIES_PER_ITEM;
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let props = (0..b).map(|p| Property {
			key: property_key(p as usize),
			value: property_value(),
		}).collect::<Vec<_>>();
		<Pallet<T>>::set_collection_properties(&collection, &owner, props)?;
		let to_delete = (0..b).map(|p| property_key(p as usize)).collect::<Vec<_>>();
	}: {<Pallet<T>>::delete_collection_properties(&collection, &owner, to_delete)?}
}
