#![cfg(feature = "runtime-benchmarks")]

use super::*;
use crate::Pallet;
use frame_system::RawOrigin;
use frame_benchmarking::{benchmarks, account};
use nft_data_structs::*;
use core::convert::TryInto;
use sp_runtime::DispatchError;

const SEED: u32 = 1;

fn create_data(size: usize) -> Vec<u8> {
	(0..size).map(|v| (v & 0xff) as u8).collect()
}
fn create_u16_data(size: usize) -> Vec<u16> {
	(0..size).map(|v| (v & 0xffff) as u16).collect()
}

fn default_nft_data() -> CreateItemData {
	CreateItemData::NFT(CreateNftData {
		const_data: create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap(),
		variable_data: create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap(),
	})
}

fn default_fungible_data() -> CreateItemData {
	CreateItemData::Fungible(CreateFungibleData { value: 1000 })
}

fn default_re_fungible_data() -> CreateItemData {
	CreateItemData::ReFungible(CreateReFungibleData {
		const_data: create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap(),
		variable_data: create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap(),
		pieces: 1000,
	})
}

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
	Ok(CreatedCollectionCount::get())
}
fn create_nft_collection<T: Config>(owner: T::AccountId) -> Result<CollectionId, DispatchError> {
	create_collection_helper::<T>(owner, CollectionMode::NFT)
}
fn create_fungible_collection<T: Config>(
	owner: T::AccountId,
) -> Result<CollectionId, DispatchError> {
	create_collection_helper::<T>(owner, CollectionMode::Fungible(0))
}
fn create_refungible_collection<T: Config>(
	owner: T::AccountId,
) -> Result<CollectionId, DispatchError> {
	create_collection_helper::<T>(owner, CollectionMode::ReFungible)
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
		assert_eq!(<Pallet<T>>::collection_id(2).unwrap().owner, caller);
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
		<Pallet<T>>::add_collection_admin(RawOrigin::Signed(caller.clone()).into(), 2, T::CrossAccountId::from_sub(new_admin.clone()))?;
	}: _(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(new_admin))

	set_collection_sponsor {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, caller.clone())

	confirm_sponsorship {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::set_collection_sponsor(RawOrigin::Signed(caller.clone()).into(), 2, caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection)

	remove_collection_sponsor {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::set_collection_sponsor(RawOrigin::Signed(caller.clone()).into(), 2, caller.clone())?;
		<Pallet<T>>::confirm_sponsorship(RawOrigin::Signed(caller.clone()).into(), 2)?;
	}: _(RawOrigin::Signed(caller.clone()), collection)

	// nft item
	create_item_nft {
		let b in 0..(CUSTOM_DATA_LIMIT * 2);

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let data = CreateItemData::NFT(CreateNftData {
			const_data: create_data(b.min(CUSTOM_DATA_LIMIT) as usize).try_into().unwrap(),
			variable_data: create_data(b.saturating_sub(CUSTOM_DATA_LIMIT) as usize).try_into().unwrap(),
		});
	}: create_item(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(caller.clone()), data)

	create_multiple_items_nft {
		// TODO: Take item data size into account. As create_item_nft bench shows, this parameter has no effect on execution time,
		// but it may if we increase CUSTOM_DATA_LIMIT
		let b in 1..1000;

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let data = (0..b).map(|_| default_nft_data()).collect();
	}: create_multiple_items(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(caller.clone()), data)

	// fungible item
	create_item_fungible {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_fungible_collection::<T>(caller.clone())?;
		let data = CreateItemData::Fungible(CreateFungibleData {
			value: 1000,
		});
	}: create_item(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(caller.clone()), data)

	create_multiple_items_fungible {
		let b in 1..1000;

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_fungible_collection::<T>(caller.clone())?;
		let data = (0..b).map(|_| default_fungible_data()).collect();
	}: create_multiple_items(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(caller.clone()), data)

	// refungible item
	create_item_refungible {
		let b in 0..(CUSTOM_DATA_LIMIT * 2);

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_refungible_collection::<T>(caller.clone())?;
		let data = CreateItemData::ReFungible(CreateReFungibleData {
			const_data: create_data(b.min(CUSTOM_DATA_LIMIT) as usize).try_into().unwrap(),
			variable_data: create_data(b.saturating_sub(CUSTOM_DATA_LIMIT) as usize).try_into().unwrap(),
			pieces: 1000,
		});
	}: create_item(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(caller.clone()), data)

	create_multiple_items_refungible {
		// TODO: Take item data size into account. As create_item_nft bench shows, this parameter has no effect on execution time,
		// but it may if we increase CUSTOM_DATA_LIMIT
		let b in 1..1000;

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_refungible_collection::<T>(caller.clone())?;
		let data = (0..b).map(|_| default_re_fungible_data()).collect();
	}: create_multiple_items(RawOrigin::Signed(caller.clone()), collection, T::CrossAccountId::from_sub(caller.clone()), data)

	burn_item_nft {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let data = default_nft_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), collection, T::CrossAccountId::from_sub(caller.clone()), data)?;
	}: burn_item(RawOrigin::Signed(caller.clone()), collection, 1, 1)

	transfer_nft {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let recipient: T::AccountId = account("recipient", 0, SEED);
		let data = default_nft_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), collection, T::CrossAccountId::from_sub(caller.clone()), data)?;
	}: transfer(RawOrigin::Signed(caller.clone()), T::CrossAccountId::from_sub(recipient.clone()), collection, 1, 1)

	transfer_fungible {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_fungible_collection::<T>(caller.clone())?;
		let recipient: T::AccountId = account("recipient", 0, SEED);
		let data = default_fungible_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), collection, T::CrossAccountId::from_sub(caller.clone()), data)?;
	}: transfer(RawOrigin::Signed(caller.clone()), T::CrossAccountId::from_sub(recipient.clone()), collection, 1, 1)

	transfer_refungible {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_refungible_collection::<T>(caller.clone())?;
		let recipient: T::AccountId = account("recipient", 0, SEED);
		let data = default_re_fungible_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), collection, T::CrossAccountId::from_sub(caller.clone()), data)?;
	}: transfer(RawOrigin::Signed(caller.clone()), T::CrossAccountId::from_sub(recipient.clone()), collection, 1, 1)

	set_transfers_enabled_flag {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: _(RawOrigin::Signed(caller.clone()), collection, false)

	approve_nft {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let recipient: T::AccountId = account("recipient", 0, SEED);
		let data = default_nft_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), 2, T::CrossAccountId::from_sub(caller.clone()), data)?;
	}: approve(RawOrigin::Signed(caller.clone()), T::CrossAccountId::from_sub(recipient.clone()), collection, 1, 1)

	// Nft
	transfer_from_nft {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let recipient: T::AccountId = account("recipient", 0, SEED);
		let data = default_nft_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), 2, T::CrossAccountId::from_sub(caller.clone()), data)?;
		<Pallet<T>>::approve(RawOrigin::Signed(caller.clone()).into(), T::CrossAccountId::from_sub(recipient.clone()), 2, 1, 1)?;
	}: transfer_from(RawOrigin::Signed(caller.clone()), T::CrossAccountId::from_sub(caller.clone()), T::CrossAccountId::from_sub(recipient.clone()), 2, 1, 1)

	// Fungible
	transfer_from_fungible {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_fungible_collection::<T>(caller.clone())?;
		let recipient: T::AccountId = account("recipient", 0, SEED);
		let data = default_fungible_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), 2, T::CrossAccountId::from_sub(caller.clone()), data)?;
		<Pallet<T>>::approve(RawOrigin::Signed(caller.clone()).into(), T::CrossAccountId::from_sub(recipient.clone()), 2, 1, 1)?;
	}: transfer_from(RawOrigin::Signed(caller.clone()), T::CrossAccountId::from_sub(caller.clone()), T::CrossAccountId::from_sub(recipient.clone()), 2, 1, 1)

	// ReFungible
	transfer_from_refungible {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_refungible_collection::<T>(caller.clone())?;
		let recipient: T::AccountId = account("recipient", 0, SEED);
		let data = default_re_fungible_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), 2, T::CrossAccountId::from_sub(caller.clone()), data)?;
		<Pallet<T>>::approve(RawOrigin::Signed(caller.clone()).into(), T::CrossAccountId::from_sub(recipient.clone()), 2, 1, 1)?;
	}: transfer_from(RawOrigin::Signed(caller.clone()), T::CrossAccountId::from_sub(caller.clone()), T::CrossAccountId::from_sub(recipient.clone()), 2, 1, 1)

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
	}: set_variable_on_chain_schema(RawOrigin::Signed(caller.clone()), 2, data)

	set_variable_meta_data_nft {
		let b in 0..CUSTOM_DATA_LIMIT;

		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let data = default_nft_data();
		<Pallet<T>>::create_item(RawOrigin::Signed(caller.clone()).into(), 2, T::CrossAccountId::from_sub(caller.clone()), data)?;
		let data = create_data(b as usize);
	}: set_variable_meta_data(RawOrigin::Signed(caller.clone()), collection, 1, data)

	set_schema_version {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
	}: set_schema_version(RawOrigin::Signed(caller.clone()), 2, SchemaVersion::Unique)

	set_collection_limits{
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;

		let cl = CollectionLimits {
			account_token_ownership_limit: 0,
			sponsored_data_size: 0,
			token_limit: 1,
			sponsor_transfer_timeout: 0,
			owner_can_destroy: true,
			owner_can_transfer: true,
			sponsored_data_rate_limit: None,
		};
	}: set_collection_limits(RawOrigin::Signed(caller.clone()), 2, cl)
}
