use super::*;
use crate::{Pallet, Config, FungibleHandle};

use sp_std::prelude::*;
use pallet_common::benchmarking::create_collection_raw;
use frame_benchmarking::{benchmarks, account};
use up_data_structs::{CollectionMode};
use pallet_common::bench_init;

const SEED: u32 = 1;

fn create_collection<T: Config>(owner: T::AccountId) -> Result<FungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::Fungible(0),
		<Pallet<T>>::init_collection,
		FungibleHandle::cast,
	)
}

benchmarks! {
	create_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); to: cross_sub;
		};
	}: {<Pallet<T>>::create_item(&collection, &sender, (to, 200))?}

	burn_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; burner: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (burner.clone(), 200))?;
	}: {<Pallet<T>>::burn(&collection, &burner, 100)?}

	transfer {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; to: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200))?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &to, 200)?}

	approve {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200))?;
	}: {<Pallet<T>>::set_allowance(&collection, &sender, &spender, 100)?}

	transfer_from {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200))?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, 200)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, 100)?}
}
