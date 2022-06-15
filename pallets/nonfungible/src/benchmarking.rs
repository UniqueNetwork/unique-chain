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
use crate::{Pallet, Config, NonfungibleHandle};

use sp_std::prelude::*;
use pallet_common::benchmarking::{create_collection_raw, property_key, property_value};
use frame_benchmarking::{benchmarks, account};
use up_data_structs::{CollectionMode, MAX_ITEMS_PER_BATCH, MAX_PROPERTIES_PER_ITEM, budget::Unlimited};
use pallet_common::bench_init;

const SEED: u32 = 1;

fn create_max_item_data<T: Config>(owner: T::CrossAccountId) -> CreateItemData<T> {
	CreateItemData::<T> {
		owner,
		properties: Default::default(),
	}
}
fn create_max_item<T: Config>(
	collection: &NonfungibleHandle<T>,
	sender: &T::CrossAccountId,
	owner: T::CrossAccountId,
) -> Result<TokenId, DispatchError> {
	<Pallet<T>>::create_item(
		&collection,
		sender,
		create_max_item_data::<T>(owner),
		&Unlimited,
	)?;
	Ok(TokenId(<TokensMinted<T>>::get(&collection.id)))
}

fn create_collection<T: Config>(
	owner: T::CrossAccountId,
) -> Result<NonfungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::NFT,
		|owner, data| <Pallet<T>>::init_collection(owner, data, true),
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
		let data = (0..b).map(|_| create_max_item_data::<T>(to.clone())).collect();
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?}

	create_multiple_items_ex {
		let b in 0..MAX_ITEMS_PER_BATCH;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let data = (0..b).map(|i| {
			bench_init!(to: cross_sub(i););
			create_max_item_data::<T>(to)
		}).collect();
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?}

	burn_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, burner.clone())?;
	}: {<Pallet<T>>::burn(&collection, &burner, item)?}

	burn_recursively_self_raw {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, burner.clone())?;
	}: {<Pallet<T>>::burn_recursively(&collection, &burner, item, &Unlimited, &Unlimited)?}

	burn_recursively_breadth_plus_self_plus_self_per_each_raw {
		let b in 0..200;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, burner.clone())?;
		for i in 0..b {
			create_max_item(&collection, &sender, T::CrossTokenAddressMapping::token_to_address(collection.id, item))?;
		}
	}: {<Pallet<T>>::burn_recursively(&collection, &burner, item, &Unlimited, &Unlimited)?}

	transfer {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, &Unlimited)?}

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
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, &Unlimited)?}

	burn_from {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; burner: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
		<Pallet<T>>::set_allowance(&collection, &sender, item, Some(&burner))?;
	}: {<Pallet<T>>::burn_from(&collection, &burner, &sender, item, &Unlimited)?}

	set_token_property_permissions {
		let b in 0..MAX_PROPERTIES_PER_ITEM;
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let perms = (0..b).map(|k| PropertyKeyPermission {
			key: property_key(k as usize),
			permission: PropertyPermission {
				mutable: false,
				collection_admin: false,
				token_owner: false,
			},
		}).collect::<Vec<_>>();
	}: {<Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?}

	set_token_properties {
		let b in 0..MAX_PROPERTIES_PER_ITEM;
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let perms = (0..b).map(|k| PropertyKeyPermission {
			key: property_key(k as usize),
			permission: PropertyPermission {
				mutable: false,
				collection_admin: true,
				token_owner: true,
			},
		}).collect::<Vec<_>>();
		<Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?;
		let props = (0..b).map(|k| Property {
			key: property_key(k as usize),
			value: property_value(),
		}).collect::<Vec<_>>();
		let item = create_max_item(&collection, &owner, owner.clone())?;
	}: {<Pallet<T>>::set_token_properties(&collection, &owner, item, props, false)?}

	delete_token_properties {
		let b in 0..MAX_PROPERTIES_PER_ITEM;
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let perms = (0..b).map(|k| PropertyKeyPermission {
			key: property_key(k as usize),
			permission: PropertyPermission {
				mutable: true,
				collection_admin: true,
				token_owner: true,
			},
		}).collect::<Vec<_>>();
		<Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?;
		let props = (0..b).map(|k| Property {
			key: property_key(k as usize),
			value: property_value(),
		}).collect::<Vec<_>>();
		let item = create_max_item(&collection, &owner, owner.clone())?;
		<Pallet<T>>::set_token_properties(&collection, &owner, item, props, false)?;
		let to_delete = (0..b).map(|k| property_key(k as usize)).collect::<Vec<_>>();
	}: {<Pallet<T>>::delete_token_properties(&collection, &owner, item, to_delete)?}
}
