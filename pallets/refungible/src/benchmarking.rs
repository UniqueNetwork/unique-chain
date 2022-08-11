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
use crate::{Pallet, Config, RefungibleHandle};

use core::convert::TryInto;
use core::iter::IntoIterator;
use frame_benchmarking::{benchmarks, account};
use pallet_common::{
	bench_init,
	benchmarking::{create_collection_raw, property_key, property_value, create_data},
};
use sp_core::H160;
use sp_std::prelude::*;
use up_data_structs::{
	CollectionMode, MAX_ITEMS_PER_BATCH, MAX_PROPERTIES_PER_ITEM, CUSTOM_DATA_LIMIT,
	budget::Unlimited,
};

const SEED: u32 = 1;

fn create_max_item_data<CrossAccountId: Ord>(
	users: impl IntoIterator<Item = (CrossAccountId, u128)>,
) -> CreateRefungibleExData<CrossAccountId> {
	let const_data = create_data::<CUSTOM_DATA_LIMIT>();
	CreateRefungibleExData {
		const_data,
		users: users
			.into_iter()
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.unwrap(),
		properties: Default::default(),
	}
}

fn create_max_item<T: Config>(
	collection: &RefungibleHandle<T>,
	sender: &T::CrossAccountId,
	users: impl IntoIterator<Item = (T::CrossAccountId, u128)>,
) -> Result<TokenId, DispatchError> {
	let data: CreateRefungibleExData<T::CrossAccountId> = create_max_item_data(users);
	<Pallet<T>>::create_item(&collection, sender, data, &Unlimited)?;
	Ok(TokenId(<TokensMinted<T>>::get(&collection.id)))
}

fn create_collection<T: Config>(
	owner: T::CrossAccountId,
) -> Result<RefungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::ReFungible,
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
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?}

	create_multiple_items_ex_multiple_items {
		let b in 0..MAX_ITEMS_PER_BATCH;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let data = (0..b).map(|t| {
			bench_init!(to: cross_sub(t););
			create_max_item_data([(to, 200)])
		}).collect();
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?}

	create_multiple_items_ex_multiple_owners {
		let b in 0..MAX_ITEMS_PER_BATCH;
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let data = vec![create_max_item_data((0..b).map(|u| {
			bench_init!(to: cross_sub(u););
			(to, 200)
		}))].try_into().unwrap();
	}: {<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?}

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
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 100, &Unlimited)?}
	// Target account is created
	transfer_creating {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200)])?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 100, &Unlimited)?}
	// Source account is destroyed
	transfer_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200), (receiver.clone(), 200)])?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 200, &Unlimited)?}
	// Source account destroyed, target created
	transfer_creating_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200)])?;
	}: {<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 200, &Unlimited)?}

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
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 100, &Unlimited)?}
	// Target account is created
	transfer_from_creating {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 100)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 100, &Unlimited)?}
	// Source account is destroyed
	transfer_from_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200), (receiver.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 200)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 200, &Unlimited)?}
	// Source account destroyed, target created
	transfer_from_creating_removing {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 200)?;
	}: {<Pallet<T>>::transfer_from(&collection, &spender, &sender, &receiver, item, 200, &Unlimited)?}

	// Both source account and token is destroyed
	burn_from {
		bench_init!{
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; burner: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &burner, item, 200)?;
	}: {<Pallet<T>>::burn_from(&collection, &burner, &sender, item, 200, &Unlimited)?}

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
		let item = create_max_item(&collection, &owner, [(owner.clone(), 200)])?;
	}: {<Pallet<T>>::set_token_properties(&collection, &owner, item, props.into_iter(), false, &Unlimited)?}

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
		let item = create_max_item(&collection, &owner, [(owner.clone(), 200)])?;
		<Pallet<T>>::set_token_properties(&collection, &owner, item, props.into_iter(), false, &Unlimited)?;
		let to_delete = (0..b).map(|k| property_key(k as usize)).collect::<Vec<_>>();
	}: {<Pallet<T>>::delete_token_properties(&collection, &owner, item, to_delete.into_iter(), &Unlimited)?}

	repartition_item {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); owner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(owner.clone(), 100)])?;
	}: {<Pallet<T>>::repartition(&collection, &owner, item, 200)?}

	set_parent_nft_unchecked {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); owner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(owner.clone(), 100)])?;

	}: {<Pallet<T>>::set_parent_nft_unchecked(&collection, item, owner,  T::CrossAccountId::from_eth(H160::default()))?}

	token_owner {
		bench_init!{
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); owner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(owner.clone(), 100)])?;
	}: {<Pallet<T>>::token_owner(collection.id, item)}
}
