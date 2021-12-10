use super::*;
use crate::{Pallet, Config, NonfungibleHandle};

use sp_std::prelude::*;
use pallet_common::benchmarking::{create_collection_raw, create_data};
use frame_benchmarking::{benchmarks, account};
use up_data_structs::{CollectionMode, MAX_ITEMS_PER_BATCH};
use pallet_common::bench_init;
use core::convert::TryInto;

const SEED: u32 = 1;

fn create_max_item_data<T: Config>(owner: T::CrossAccountId) -> CreateItemData<T> {
	let const_data = create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap();
	let variable_data = create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap();
	CreateItemData {
		const_data,
		variable_data,
		owner,
	}
}
fn create_max_item<T: Config>(
	collection: &NonfungibleHandle<T>,
	sender: &T::CrossAccountId,
	owner: T::CrossAccountId,
) -> Result<TokenId, DispatchError> {
	<Pallet<T>>::create_item(&collection, sender, create_max_item_data(owner))?;
	Ok(TokenId(<TokensMinted<T>>::get(&collection.id)))
}

fn create_collection<T: Config>(
	owner: T::AccountId,
) -> Result<NonfungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::NFT,
		<Pallet<T>>::init_collection,
		NonfungibleHandle::cast,
	)
}

benchmarks! {
	create_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); to: cross_sub;
		};
	}: {create_max_item(&collection, &sender, to.clone())?}

	create_multiple_items {
		let b in 0..MAX_ITEMS_PER_BATCH;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); to: cross_sub;
		};
		let data = (0..b).map(|_| create_max_item_data(to.clone())).collect();
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data)?}

	burn_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, burner.clone())?;
	}: {<Pallet<T>>::burn(&collection, &burner, item)?}

	transfer {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item)?}

	approve {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
	}: {<Pallet<T>>::set_allowance(&collection, &sender, item, Some(&spender))?}

	transfer_from {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
		<Pallet<T>>::set_allowance(&collection, &sender, item, Some(&spender))?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item)?}

	burn_from {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; burner: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
		<Pallet<T>>::set_allowance(&collection, &sender, item, Some(&burner))?;
	}: {<Pallet<T>>::burn_from(&collection, &burner, &sender, item)?}

	set_variable_metadata {
		let b in 0..CUSTOM_DATA_LIMIT;
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
		let data = create_data(b as usize);
	}: {<Pallet<T>>::set_variable_metadata(&collection, &sender, item, data)?}
}
