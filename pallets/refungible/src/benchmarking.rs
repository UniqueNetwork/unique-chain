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

use core::{convert::TryInto, iter::IntoIterator};

use frame_benchmarking::v2::*;
use pallet_common::{
	bench_init,
	benchmarking::{create_collection_raw, property_key, property_value},
	CollectionIssuer, Pallet as PalletCommon,
};
use sp_std::prelude::*;
use up_data_structs::{
	budget::Unlimited, CollectionMode, PropertyPermission, MAX_ITEMS_PER_BATCH,
	MAX_PROPERTIES_PER_ITEM,
};

use super::*;
use crate::{Config, Pallet, RefungibleHandle};

const SEED: u32 = 1;

fn create_max_item_data<T: Config>(
	users: impl IntoIterator<Item = (T::CrossAccountId, u128)>,
) -> CreateItemData<T> {
	CreateItemData::<T> {
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
	let data: CreateItemData<T> = create_max_item_data::<T>(users);
	<Pallet<T>>::create_item(collection, sender, data, &Unlimited)?;
	Ok(TokenId(<TokensMinted<T>>::get(collection.id)))
}

fn create_collection<T: Config>(
	owner: T::CrossAccountId,
) -> Result<RefungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::ReFungible,
		|owner: T::CrossAccountId, data| {
			<PalletCommon<T>>::init_collection(owner.clone(), CollectionIssuer::User(owner), data)
		},
		RefungibleHandle::cast,
	)
}

#[benchmarks]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn create_item() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); to: cross_sub;
		};

		#[block]
		{
			create_max_item(&collection, &sender, [(to, 200)])?;
		}

		Ok(())
	}

	#[benchmark]
	fn create_multiple_items(b: Linear<0, MAX_ITEMS_PER_BATCH>) -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); to: cross_sub;
		};
		let data = (0..b)
			.map(|_| create_max_item_data::<T>([(to.clone(), 200)]))
			.collect();

		#[block]
		{
			<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?;
		}

		Ok(())
	}
	#[benchmark]
	fn create_multiple_items_ex_multiple_items(
		b: Linear<0, MAX_ITEMS_PER_BATCH>,
	) -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let data = (0..b)
			.map(|t| {
				bench_init!(to: cross_sub(t););
				create_max_item_data::<T>([(to, 200)])
			})
			.collect();

		#[block]
		{
			<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn create_multiple_items_ex_multiple_owners(
		b: Linear<0, MAX_ITEMS_PER_BATCH>,
	) -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let data = vec![create_max_item_data::<T>((0..b).map(|u| {
			bench_init!(to: cross_sub(u););
			(to, 200)
		}))];

		#[block]
		{
			<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?;
		}

		Ok(())
	}

	// Other user left, token data is kept
	#[benchmark]
	fn burn_item_partial() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub; another_owner: cross_sub;
		};
		let item = create_max_item(
			&collection,
			&sender,
			[(burner.clone(), 200), (another_owner, 200)],
		)?;

		#[block]
		{
			<Pallet<T>>::burn(&collection, &burner, item, 200)?;
		}

		Ok(())
	}

	// No users remaining, token is destroyed
	#[benchmark]
	fn burn_item_fully() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(burner.clone(), 200)])?;

		#[block]
		{
			<Pallet<T>>::burn(&collection, &burner, item, 200)?;
		}

		Ok(())
	}

	#[benchmark]
	fn transfer_normal() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(
			&collection,
			&sender,
			[(sender.clone(), 200), (receiver.clone(), 200)],
		)?;

		#[block]
		{
			<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 100, &Unlimited)?;
		}

		Ok(())
	}

	// Target account is created
	#[benchmark]
	fn transfer_creating() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200)])?;

		#[block]
		{
			<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 100, &Unlimited)?;
		}

		Ok(())
	}

	// Source account is destroyed
	#[benchmark]
	fn transfer_removing() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(
			&collection,
			&sender,
			[(sender.clone(), 200), (receiver.clone(), 200)],
		)?;

		#[block]
		{
			<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 200, &Unlimited)?;
		}

		Ok(())
	}

	// Source account destroyed, target created
	#[benchmark]
	fn transfer_creating_removing() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); receiver: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(sender.clone(), 200)])?;

		#[block]
		{
			<Pallet<T>>::transfer(&collection, &sender, &receiver, item, 200, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn approve() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;

		#[block]
		{
			<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 100)?;
		}

		Ok(())
	}

	#[benchmark]
	fn approve_from() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		let owner_eth = T::CrossAccountId::from_eth(*sender.as_eth());
		let item = create_max_item(&collection, &owner, [(owner_eth.clone(), 200)])?;

		#[block]
		{
			<Pallet<T>>::set_allowance_from(&collection, &sender, &owner_eth, &spender, item, 100)?;
		}

		Ok(())
	}

	#[benchmark]
	fn transfer_from_normal() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(
			&collection,
			&owner,
			[(sender.clone(), 200), (receiver.clone(), 200)],
		)?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 100)?;

		#[block]
		{
			<Pallet<T>>::transfer_from(
				&collection,
				&spender,
				&sender,
				&receiver,
				item,
				100,
				&Unlimited,
			)?;
		}

		Ok(())
	}

	// Target account is created
	#[benchmark]
	fn transfer_from_creating() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 100)?;

		#[block]
		{
			<Pallet<T>>::transfer_from(
				&collection,
				&spender,
				&sender,
				&receiver,
				item,
				100,
				&Unlimited,
			)?;
		}

		Ok(())
	}

	// Source account is destroyed
	#[benchmark]
	fn transfer_from_removing() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(
			&collection,
			&owner,
			[(sender.clone(), 200), (receiver.clone(), 200)],
		)?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 200)?;

		#[block]
		{
			<Pallet<T>>::transfer_from(
				&collection,
				&spender,
				&sender,
				&receiver,
				item,
				200,
				&Unlimited,
			)?;
		}

		Ok(())
	}

	// Source account destroyed, target created
	#[benchmark]
	fn transfer_from_creating_removing() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, item, 200)?;

		#[block]
		{
			<Pallet<T>>::transfer_from(
				&collection,
				&spender,
				&sender,
				&receiver,
				item,
				200,
				&Unlimited,
			)?;
		}

		Ok(())
	}

	// Both source account and token is destroyed
	#[benchmark]
	fn burn_from() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; burner: cross_sub;
		};
		let item = create_max_item(&collection, &owner, [(sender.clone(), 200)])?;
		<Pallet<T>>::set_allowance(&collection, &sender, &burner, item, 200)?;

		#[block]
		{
			<Pallet<T>>::burn_from(&collection, &burner, &sender, item, 200, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn load_token_properties() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};

		let item = create_max_item(&collection, &owner, [(owner.clone(), 200)])?;

		#[block]
		{
			pallet_common::BenchmarkPropertyWriter::<T>::load_token_properties(&collection, item);
		}

		Ok(())
	}

	#[benchmark]
	fn write_token_properties(b: Linear<0, MAX_PROPERTIES_PER_ITEM>) -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};

		let perms = (0..b)
			.map(|k| PropertyKeyPermission {
				key: property_key(k as usize),
				permission: PropertyPermission {
					mutable: false,
					collection_admin: true,
					token_owner: true,
				},
			})
			.collect::<Vec<_>>();
		<Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?;
		let props = (0..b)
			.map(|k| Property {
				key: property_key(k as usize),
				value: property_value(),
			})
			.collect::<Vec<_>>();
		let item = create_max_item(&collection, &owner, [(owner.clone(), 200)])?;

		let lazy_collection_info =
			pallet_common::BenchmarkPropertyWriter::<T>::load_collection_info(&collection, &owner);

		#[block]
		{
			let mut property_writer =
				pallet_common::BenchmarkPropertyWriter::new(&collection, lazy_collection_info);

			property_writer.write_token_properties(
				item,
				props.into_iter(),
				crate::erc::ERC721TokenEvent::TokenChanged {
					token_id: item.into(),
				}
				.to_log(T::ContractAddress::get()),
			)?;
		}

		Ok(())
	}

	#[benchmark]
	fn set_token_property_permissions(
		b: Linear<0, MAX_PROPERTIES_PER_ITEM>,
	) -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let perms = (0..b)
			.map(|k| PropertyKeyPermission {
				key: property_key(k as usize),
				permission: PropertyPermission {
					mutable: false,
					collection_admin: false,
					token_owner: false,
				},
			})
			.collect::<Vec<_>>();

		#[block]
		{
			<Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?;
		}

		Ok(())
	}

	#[benchmark]
	fn repartition_item() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); owner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, [(owner.clone(), 100)])?;

		#[block]
		{
			<Pallet<T>>::repartition(&collection, &owner, item, 200)?;
		}

		Ok(())
	}

	#[benchmark]
	fn set_allowance_for_all() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner); owner: cross_from_sub;
			operator: cross_sub;
		};

		#[block]
		{
			<Pallet<T>>::set_allowance_for_all(&collection, &owner, &operator, true)?;
		}

		Ok(())
	}

	#[benchmark]
	fn allowance_for_all() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner); owner: cross_from_sub;
			operator: cross_sub;
		};

		#[block]
		{
			<Pallet<T>>::allowance_for_all(&collection, &owner, &operator);
		}

		Ok(())
	}

	#[benchmark]
	fn repair_item() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let item = create_max_item(&collection, &owner, [(owner.clone(), 100)])?;

		#[block]
		{
			<Pallet<T>>::repair_item(&collection, item)?;
		}

		Ok(())
	}
}
