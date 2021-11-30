use super::*;
use crate::{Pallet, Config, RefungibleHandle};

use sp_std::prelude::*;
use pallet_common::benchmarking::{create_collection_raw, create_data};
use frame_benchmarking::{benchmarks, account};
use up_data_structs::{CollectionMode, MAX_ITEMS_PER_BATCH};
use pallet_common::bench_init;
use core::convert::TryInto;
use core::iter::IntoIterator;

const SEED: u32 = 1;

fn create_max_item_data<T: Config>(
	users: impl IntoIterator<Item = (T::CrossAccountId, u128)>,
) -> CreateItemData<T> {
	let const_data = create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap();
	let variable_data = create_data(CUSTOM_DATA_LIMIT as usize).try_into().unwrap();
	CreateItemData {
		const_data,
		variable_data,
		users: users.into_iter().collect(),
	}
}
fn create_max_item<T: Config>(
	collection: &RefungibleHandle<T>,
	sender: &T::CrossAccountId,
	users: impl IntoIterator<Item = (T::CrossAccountId, u128)>,
) -> Result<TokenId, DispatchError> {
	<Pallet<T>>::create_item(&collection, sender, create_max_item_data(users))?;
	Ok(TokenId(<TokensMinted<T>>::get(&collection.id)))
}

fn create_collection<T: Config>(owner: T::AccountId) -> Result<RefungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::NFT,
		<Pallet<T>>::init_collection,
		RefungibleHandle::cast,
	)
}
benchmarks! {
	create_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); to: cross_sub;
		};
	}: {create_max_item(&collection, &sender, [(to.clone(), 200)])?}

	create_multiple_items {
		let b in 0..MAX_ITEMS_PER_BATCH;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); to: cross_sub;
		};
		let data = (0..b).map(|_| create_max_item_data([(to.clone(), 200)])).collect();
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data)?}

	// Other user left, token data is kept
	burn_item_partial {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub; another_owner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(burner.clone(), 200), (another_owner, 200)])?;
	}: {<Pallet<T>>::burn(&collection, &burner, item, 200)?}
	// No users remaining, token is destroyed
	burn_item_fully {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub; another_owner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(burner.clone(), 200)])?;
	}: {<Pallet<T>>::burn(&collection, &burner, item, 200)?}

	transfer_normal {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200), (receiver.clone(), 200)])?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 100)?}
	// Target account is created
	transfer_creating {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200)])?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 100)?}
	// Source account is destroyed
	transfer_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200), (receiver.clone(), 200)])?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 200)?}
	// Source account destroyed, target created
	transfer_creating_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200)])?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 200)?}

	approve {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
	}: {<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 100)?}

	transfer_from_normal {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200), (receiver.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 100)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 100)?}
	// Target account is created
	transfer_from_creating {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 100)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 100)?}
	// Source account is destroyed
	transfer_from_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200), (receiver.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 200)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 200)?}
	// Source account destroyed, target created
	transfer_from_creating_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 200)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 200)?}

	set_variable_metadata {
		let b in 0..CUSTOM_DATA_LIMIT;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200)])?;
		let data = create_data(b as usize);
	}: {<Pallet<T>>::set_variable_metadata(&collection, &sender, item, data)?}
}
