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

use super::*;
use crate::{Pallet, Config, FungibleHandle};

use sp_std::prelude::*;
use pallet_common::benchmarking::create_collection_raw;
use frame_benchmarking::{benchmarks, account};
use up_data_structs::{CollectionMode, MAX_ITEMS_PER_BATCH, budget::Unlimited};
use pallet_common::bench_init;

const SEED: u32 = 1;

fn create_collection<T: Config>(
	owner: T::CrossAccountId,
) -> Result<FungibleHandle<T>, DispatchError> {
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
	}: {<Pallet<T>>::create_item(&collection, &sender, (to, 200), &Unlimited)?}

	create_multiple_items_ex {
		let b in 0..MAX_ITEMS_PER_BATCH;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let data = (0..b).map(|i| {
			bench_init!(to: cross_sub(i););
			(to, 200)
		}).collect::<BTreeMap<_, _>>().try_into().unwrap();
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?}

	burn_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; burner: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (burner.clone(), 200), &Unlimited)?;
	}: {<Pallet<T>>::burn(&collection, &burner, 100)?}

	transfer {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; to: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &to, 200, &Unlimited)?}

	approve {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;
	}: {<Pallet<T>>::set_allowance(&collection, &sender, &spender, 100)?}

	transfer_from {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, 200)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, 100, &Unlimited)?}

	burn_from {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; burner: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;
		<Pallet<T>>::set_allowance(&collection, &sender, &burner, 200)?;
	}: {<Pallet<T>>::burn_from(&collection, &burner, &sender, 100, &Unlimited)?}
}
