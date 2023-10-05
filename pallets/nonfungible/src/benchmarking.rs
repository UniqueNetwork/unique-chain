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

use frame_benchmarking::v2::{account, benchmarks, BenchmarkError};
use pallet_common::{
	bench_init,
	benchmarking::{create_collection_raw, property_key, property_value},
	CommonCollectionOperations,
};
use sp_std::prelude::*;
use up_data_structs::{
	budget::Unlimited, CollectionMode, PropertyPermission, MAX_ITEMS_PER_BATCH,
	MAX_PROPERTIES_PER_ITEM,
};

use super::*;
use crate::{Config, NonfungibleHandle, Pallet};

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
		collection,
		sender,
		create_max_item_data::<T>(owner),
		&Unlimited,
	)?;
	Ok(TokenId(<TokensMinted<T>>::get(collection.id)))
}

fn create_collection<T: Config>(
	owner: T::CrossAccountId,
) -> Result<NonfungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::NFT,
		|owner: T::CrossAccountId, data| <Pallet<T>>::init_collection(owner.clone(), owner, data),
		NonfungibleHandle::cast,
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
			create_max_item(&collection, &sender, to)?;
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
			.map(|_| create_max_item_data::<T>(to.clone()))
			.collect();

		#[block]
		{
			<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn create_multiple_items_ex(b: Linear<0, MAX_ITEMS_PER_BATCH>) -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner);
		};
		let data = (0..b)
			.map(|i| {
				bench_init!(to: cross_sub(i););
				create_max_item_data::<T>(to)
			})
			.collect();

		#[block]
		{
			<Pallet<T>>::create_multiple_items(&collection, &sender, data, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn burn_item() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, burner.clone())?;

		#[block]
		{
			<Pallet<T>>::burn(&collection, &burner, item)?;
		}

		Ok(())
	}

	#[benchmark]
	fn burn_recursively_self_raw() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, burner.clone())?;

		#[block]
		{
			<Pallet<T>>::burn_recursively(&collection, &burner, item, &Unlimited, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn burn_recursively_breadth_plus_self_plus_self_per_each_raw(
		b: Linear<0, 200>,
	) -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			sender: cross_from_sub(owner); burner: cross_sub;
		};
		let item = create_max_item(&collection, &sender, burner.clone())?;
		for _ in 0..b {
			create_max_item(
				&collection,
				&sender,
				T::CrossTokenAddressMapping::token_to_address(collection.id, item),
			)?;
		}

		#[block]
		{
			<Pallet<T>>::burn_recursively(&collection, &burner, item, &Unlimited, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn transfer_raw() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; receiver: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;

		#[block]
		{
			<Pallet<T>>::transfer(&collection, &sender, &receiver, item, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn approve() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;

		#[block]
		{
			<Pallet<T>>::set_allowance(&collection, &sender, item, Some(&spender))?;
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
		let item = create_max_item(&collection, &owner, owner_eth.clone())?;

		#[block]
		{
			<Pallet<T>>::set_allowance_from(
				&collection,
				&sender,
				&owner_eth,
				item,
				Some(&spender),
			)?;
		}

		Ok(())
	}

	#[benchmark]
	fn check_allowed_raw() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
		<Pallet<T>>::set_allowance(&collection, &sender, item, Some(&spender))?;

		#[block]
		{
			<Pallet<T>>::check_allowed(&collection, &spender, &sender, item, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn burn_from() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; burner: cross_sub;
		};
		let item = create_max_item(&collection, &owner, sender.clone())?;
		<Pallet<T>>::set_allowance(&collection, &sender, item, Some(&burner))?;

		#[block]
		{
			<Pallet<T>>::burn_from(&collection, &burner, &sender, item, &Unlimited)?;
		}
	}

	// set_token_properties {
	// 	let b in 0..MAX_PROPERTIES_PER_ITEM;
	// 	bench_init!{
	// 		owner: sub; collection: collection(owner);
	// 		owner: cross_from_sub;
	// 	};
	// 	let perms = (0..b).map(|k| PropertyKeyPermission {
	// 		key: property_key(k as usize),
	// 		permission: PropertyPermission {
	// 			mutable: false,
	// 			collection_admin: true,
	// 			token_owner: true,
	// 		},
	// 	}).collect::<Vec<_>>();
	// 	<Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?;
	// 	let props = (0..b).map(|k| Property {
	// 		key: property_key(k as usize),
	// 		value: property_value(),
	// 	}).collect::<Vec<_>>();
	// 	let item = create_max_item(&collection, &owner, owner.clone())?;
	// }: {<Pallet<T>>::set_token_properties(&collection, &owner, item, props.into_iter(), &Unlimited)?}

	// load_token_properties {
	// 	bench_init!{
	// 		owner: sub; collection: collection(owner);
	// 		owner: cross_from_sub;
	// 	};

	// 	let item = create_max_item(&collection, &owner, owner.clone())?;
	// }: {
	// 	pallet_common::BenchmarkPropertyWriter::<T>::load_token_properties(
	// 		&collection,
	// 		item,
	// 	)
	// }

	// write_token_properties {
	// 	let b in 0..MAX_PROPERTIES_PER_ITEM;
	// 	bench_init!{
	// 		owner: sub; collection: collection(owner);
	// 		owner: cross_from_sub;
	// 	};

	// 	let perms = (0..b).map(|k| PropertyKeyPermission {
	// 		key: property_key(k as usize),
	// 		permission: PropertyPermission {
	// 			mutable: false,
	// 			collection_admin: true,
	// 			token_owner: true,
	// 		},
	// 	}).collect::<Vec<_>>();
	// 	<Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?;
	// 	let props = (0..b).map(|k| Property {
	// 		key: property_key(k as usize),
	// 		value: property_value(),
	// 	}).collect::<Vec<_>>();
	// 	let item = create_max_item(&collection, &owner, owner.clone())?;

	// 	let lazy_collection_info = pallet_common::BenchmarkPropertyWriter::<T>::load_collection_info(
	// 		&collection,
	// 		&owner,
	// 	);
	// }: {
	// 	let mut property_writer = pallet_common::BenchmarkPropertyWriter::new(&collection, lazy_collection_info);

	// 	property_writer.write_token_properties(
	// 		item,
	// 		props.into_iter(),
	// 		crate::erc::ERC721TokenEvent::TokenChanged {
	// 			token_id: item.into(),
	// 		}
	// 		.to_log(T::ContractAddress::get()),
	// 	)?
	// }

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
	fn set_token_properties(b: Linear<0, MAX_PROPERTIES_PER_ITEM>) -> Result<(), BenchmarkError> {
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
		let item = create_max_item(&collection, &owner, owner.clone())?;

		#[block]
		{
			<Pallet<T>>::set_token_properties(
				&collection,
				&owner,
				item,
				props.into_iter(),
				&Unlimited,
			)?;
		}

		Ok(())
	}

	// TODO:
	#[benchmark]
	fn init_token_properties(b: Linear<0, MAX_PROPERTIES_PER_ITEM>) -> Result<(), BenchmarkError> {
		// bench_init! {
		// 	owner: sub; collection: collection(owner);
		// 	owner: cross_from_sub;
		// };

		// let perms = (0..b)
		// 	.map(|k| PropertyKeyPermission {
		// 		key: property_key(k as usize),
		// 		permission: PropertyPermission {
		// 			mutable: false,
		// 			collection_admin: true,
		// 			token_owner: true,
		// 		},
		// 	})
		// 	.collect::<Vec<_>>();
		// <Pallet<T>>::set_token_property_permissions(&collection, &owner, perms)?;
		#[block]
		{}
		// let props = (0..b)
		// 	.map(|k| Property {
		// 		key: property_key(k as usize),
		// 		value: property_value(),
		// 	})
		// 	.collect::<Vec<_>>();
		// let item = create_max_item(&collection, &owner, owner.clone())?;

		// let (is_collection_admin, property_permissions) =
		// 	load_is_admin_and_property_permissions(&collection, &owner);
		// #[block]
		// {
		// 	let mut property_writer =
		// 		pallet_common::BenchmarkPropertyWriter::new(&collection, lazy_collection_info);

		// 	property_writer.write_token_properties(
		// 		item,
		// 		props.into_iter(),
		// 		crate::erc::ERC721TokenEvent::TokenChanged {
		// 			token_id: item.into(),
		// 		}
		// 		.to_log(T::ContractAddress::get()),
		// 	)?;
		// }

		Ok(())
	}

	#[benchmark]
	fn delete_token_properties(
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
					mutable: true,
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
		let item = create_max_item(&collection, &owner, owner.clone())?;
		<Pallet<T>>::set_token_properties(
			&collection,
			&owner,
			item,
			props.into_iter(),
			&Unlimited,
		)?;
		let to_delete = (0..b).map(|k| property_key(k as usize)).collect::<Vec<_>>();

		#[block]
		{
			<Pallet<T>>::delete_token_properties(
				&collection,
				&owner,
				item,
				to_delete.into_iter(),
				&Unlimited,
			)?;
		}

		Ok(())
	}

	#[benchmark]
	fn token_owner() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub;
		};
		let item = create_max_item(&collection, &owner, owner.clone())?;

		#[block]
		{
			collection.token_owner(item).unwrap();
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
		let item = create_max_item(&collection, &owner, owner.clone())?;

		#[block]
		{
			<Pallet<T>>::repair_item(&collection, item)?;
		}

		Ok(())
	}
}
