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
use crate::{Config, CollectionHandle};
use up_data_structs::{
	CollectionMode, CreateCollectionData, CollectionId, MAX_COLLECTION_NAME_LENGTH,
	MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH, OFFCHAIN_SCHEMA_LIMIT,
	VARIABLE_ON_CHAIN_SCHEMA_LIMIT, CONST_ON_CHAIN_SCHEMA_LIMIT,
};
use frame_support::{
	traits::{Currency, Get},
	pallet_prelude::ConstU32,
	BoundedVec,
};
use core::convert::TryInto;
use sp_runtime::DispatchError;

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

pub fn create_collection_raw<T: Config, R>(
	owner: T::AccountId,
	mode: CollectionMode,
	handler: impl FnOnce(
		T::AccountId,
		CreateCollectionData<T::AccountId>,
	) -> Result<CollectionId, DispatchError>,
	cast: impl FnOnce(CollectionHandle<T>) -> R,
) -> Result<R, DispatchError> {
	T::Currency::deposit_creating(&owner, T::CollectionCreationPrice::get());
	let name = create_u16_data::<MAX_COLLECTION_NAME_LENGTH>();
	let description = create_u16_data::<MAX_COLLECTION_DESCRIPTION_LENGTH>();
	let token_prefix = create_data::<MAX_TOKEN_PREFIX_LENGTH>();
	let offchain_schema = create_data::<OFFCHAIN_SCHEMA_LIMIT>();
	let variable_on_chain_schema = create_data::<VARIABLE_ON_CHAIN_SCHEMA_LIMIT>();
	let const_on_chain_schema = create_data::<CONST_ON_CHAIN_SCHEMA_LIMIT>();
	handler(
		owner,
		CreateCollectionData {
			mode,
			name,
			description,
			token_prefix,
			offchain_schema,
			variable_on_chain_schema,
			const_on_chain_schema,
			..Default::default()
		},
	)
	.and_then(CollectionHandle::try_get)
	.map(cast)
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
		let $name = create_collection::<T>($owner.clone())?;
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
