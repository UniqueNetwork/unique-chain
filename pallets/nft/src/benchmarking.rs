#![cfg(feature = "runtime-benchmarks")]

use super::*;
use crate::Pallet;
use frame_system::RawOrigin;
use frame_benchmarking::{benchmarks, account};
use nft_data_structs::*;
use core::convert::TryInto;
use sp_runtime::DispatchError;
use pallet_common::benchmarking::{create_data, create_u16_data};

const SEED: u32 = 1;

fn create_collection_helper<T: Config>(
	owner: T::AccountId,
	mode: CollectionMode,
) -> Result<CollectionId, DispatchError> {
	T::Currency::deposit_creating(&owner, T::CollectionCreationPrice::get());
	let col_name = create_u16_data(MAX_COLLECTION_NAME_LENGTH)
		.try_into()
		.unwrap();
	let col_desc = create_u16_data(MAX_COLLECTION_DESCRIPTION_LENGTH)
		.try_into()
		.unwrap();
	let token_prefix = create_data(MAX_TOKEN_PREFIX_LENGTH).try_into().unwrap();
	<Pallet<T>>::create_collection(
		RawOrigin::Signed(owner).into(),
		col_name,
		col_desc,
		token_prefix,
		mode,
	)?;
	Ok(<pallet_common::CreatedCollectionCount<T>>::get())
}
fn create_nft_collection<T: Config>(owner: T::AccountId) -> Result<CollectionId, DispatchError> {
	create_collection_helper::<T>(owner, CollectionMode::NFT)
}

benchmarks! {

	create_collection {
		let col_name: Vec<u16> = create_u16_data(MAX_COLLECTION_NAME_LENGTH);
		let col_desc: Vec<u16> = create_u16_data(MAX_COLLECTION_DESCRIPTION_LENGTH);
		let token_prefix: Vec<u8> = create_data(MAX_TOKEN_PREFIX_LENGTH);
		let mode: CollectionMode = CollectionMode::NFT;
		let caller: T::AccountId = account("caller", 0, SEED);
		T::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());
	}: _(RawOrigin::Signed(caller.clone()), col_name.clone(), col_desc.clone(), token_prefix.clone(), mode)
	verify {
		assert_eq!(<pallet_common::CollectionById<T>>::get(CollectionId(1)).unwrap().owner, caller);
	}

	destroy_collection {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection)

	add_to_white_list {
		let caller: T::AccountId = account("caller", 0, SEED);
		let whitelist_account: T::AccountId = account("admin", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(whitelist_account))

	remove_from_white_list {
		let caller: T::AccountId = account("caller", 0, SEED);
		let whitelist_account: T::AccountId = account("admin", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::add_to_white_list(RawOrigin::Signed(caller.clone()).into(), collection, T::CrossAccountId::from_sub(whitelist_account.clone()))?;
	}: _(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(whitelist_account))

	set_public_access_mode {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, AccessMode::WhiteList)

	set_mint_permission {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, true)

	change_collection_owner {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let new_owner: T::AccountId = account("admin", 0, SEED);
	}: _(RawOrigin::Signed(caller.clone()), collection, new_owner)

	add_collection_admin {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let new_admin: T::AccountId = account("admin", 0, SEED);
	}: _(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(new_admin))

	remove_collection_admin {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let new_admin: T::AccountId = account("admin", 0, SEED);
		<Pallet<T>>::add_collection_admin(RawOrigin::Signed(caller.clone()).into(), collection, T::CrossAccountId::from_sub(new_admin.clone()))?;
	}: _(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(new_admin))

	set_collection_sponsor {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, caller.clone())

	confirm_sponsorship {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::set_collection_sponsor(RawOrigin::Signed(caller.clone()).into(), collection, caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection)

	remove_collection_sponsor {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::set_collection_sponsor(RawOrigin::Signed(caller.clone()).into(), collection, caller.clone())?;
		<Pallet<T>>::confirm_sponsorship(RawOrigin::Signed(caller.clone()).into(), collection)?;
	}: _(RawOrigin::Signed(caller.clone()), collection)

	set_transfers_enabled_flag {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, false)

	set_offchain_schema {
		let b in 0..OFFCHAIN_SCHEMA_LIMIT;

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let data = create_data(b as usize);
	}: set_offchain_schema(RawOrigin::Signed(caller.clone()), collection, data)

	set_const_on_chain_schema {
		let b in 0..CONST_ON_CHAIN_SCHEMA_LIMIT;

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let data = create_data(b as usize);
	}: set_const_on_chain_schema(RawOrigin::Signed(caller.clone()), collection, data)

	set_variable_on_chain_schema {
		let b in 0..VARIABLE_ON_CHAIN_SCHEMA_LIMIT;

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let data = create_data(b as usize);
	}: set_variable_on_chain_schema(RawOrigin::Signed(caller.clone()), collection, data)

	set_schema_version {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: set_schema_version(RawOrigin::Signed(caller.clone()), collection, SchemaVersion::Unique)

	set_collection_limits{
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;

		let cl = CollectionLimits {
			account_token_ownership_limit: Some(0),
			sponsored_data_size: Some(0),
			token_limit: Some(1),
			sponsor_transfer_timeout: Some(0),
			owner_can_destroy: Some(true),
			owner_can_transfer: Some(true),
			sponsored_data_rate_limit: None,
			transfers_enabled: Some(true),
		};
	}: set_collection_limits(RawOrigin::Signed(caller.clone()), collection, cl)

	set_meta_update_permission_flag {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, MetaUpdatePermission::Admin)
}
