use sp_std::vec::Vec;
use crate::{Config, CollectionHandle};
use nft_data_structs::{
	CollectionMode, Collection, CollectionId, MAX_COLLECTION_NAME_LENGTH,
	MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH, OFFCHAIN_SCHEMA_LIMIT,
	VARIABLE_ON_CHAIN_SCHEMA_LIMIT, CONST_ON_CHAIN_SCHEMA_LIMIT,
};
use frame_support::traits::{Currency, Get};
use core::convert::TryInto;
use sp_runtime::DispatchError;

pub fn create_data(size: usize) -> Vec<u8> {
	(0..size).map(|v| (v & 0xff) as u8).collect()
}
pub fn create_u16_data(size: usize) -> Vec<u16> {
	(0..size).map(|v| (v & 0xffff) as u16).collect()
}

pub fn create_collection_raw<T: Config, R>(
	owner: T::AccountId,
	mode: CollectionMode,
	handler: impl FnOnce(Collection<T::AccountId>) -> Result<CollectionId, DispatchError>,
	cast: impl FnOnce(CollectionHandle<T>) -> R,
) -> Result<R, DispatchError> {
	T::Currency::deposit_creating(&owner, T::CollectionCreationPrice::get());
	let name = create_u16_data(MAX_COLLECTION_NAME_LENGTH)
		.try_into()
		.unwrap();
	let description = create_u16_data(MAX_COLLECTION_DESCRIPTION_LENGTH)
		.try_into()
		.unwrap();
	let token_prefix = create_data(MAX_TOKEN_PREFIX_LENGTH).try_into().unwrap();
	let offchain_schema = create_data(OFFCHAIN_SCHEMA_LIMIT as usize)
		.try_into()
		.unwrap();
	let variable_on_chain_schema = create_data(VARIABLE_ON_CHAIN_SCHEMA_LIMIT as usize)
		.try_into()
		.unwrap();
	let const_on_chain_schema = create_data(CONST_ON_CHAIN_SCHEMA_LIMIT as usize)
		.try_into()
		.unwrap();
	handler(Collection {
		owner,
		mode,
		access: Default::default(),
		name,
		description,
		token_prefix,
		mint_mode: true,
		offchain_schema,
		schema_version: Default::default(),
		sponsorship: Default::default(),
		limits: Default::default(),
		variable_on_chain_schema,
		const_on_chain_schema,
		meta_update_permission: Default::default(),
		transfers_enabled: true,
	})
	.and_then(CollectionHandle::try_get)
	.map(cast)
}

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
