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

use frame_benchmarking::{account, v2::*};
use pallet_common::{
	bench_init, benchmarking::create_collection_raw, CollectionIssuer, Pallet as PalletCommon,
};
use sp_std::prelude::*;
use up_data_structs::{budget::Unlimited, CollectionMode, MAX_ITEMS_PER_BATCH};

use super::*;
use crate::{Config, Pallet};

const SEED: u32 = 1;

pub fn create_collection<T: Config>(
	owner: T::CrossAccountId,
) -> Result<FungibleHandle<T>, DispatchError> {
	create_collection_raw(
		owner,
		CollectionMode::Fungible(18),
		|owner: T::CrossAccountId, data| {
			<PalletCommon<T>>::init_collection(owner.clone(), CollectionIssuer::User(owner), data)
		},
		FungibleHandle::cast,
	)
}

pub fn create_item<T: Config>(
	collection: &FungibleHandle<T>,
	sender: &T::CrossAccountId,
	owner: T::CrossAccountId,
	amount: u128,
) -> DispatchResult {
	<Pallet<T>>::create_item(&collection, &sender, (owner, amount), &Unlimited)?;

	Ok(())
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
			<Pallet<T>>::create_item(&collection, &sender, (to, 200), &Unlimited)?;
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
				(to, 200)
			})
			.collect::<BTreeMap<_, _>>();

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
			owner: cross_from_sub; burner: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (burner.clone(), 200), &Unlimited)?;

		#[block]
		{
			<Pallet<T>>::burn(&collection, &burner, 100)?;
		}

		Ok(())
	}

	#[benchmark]
	fn transfer_raw() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; to: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;

		#[block]
		{
			<Pallet<T>>::transfer(&collection, &sender, &to, 200, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn approve() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;

		#[block]
		{
			<Pallet<T>>::set_allowance(&collection, &sender, &spender, 100)?;
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
		<Pallet<T>>::create_item(&collection, &owner, (owner_eth.clone(), 200), &Unlimited)?;

		#[block]
		{
			<Pallet<T>>::set_allowance_from(&collection, &sender, &owner_eth, &spender, 100)?;
		}

		Ok(())
	}

	#[benchmark]
	fn check_allowed_raw() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;
		<Pallet<T>>::set_allowance(&collection, &sender, &spender, 200)?;

		#[block]
		{
			<Pallet<T>>::check_allowed(&collection, &spender, &sender, 200, &Unlimited)?;
		}

		Ok(())
	}

	#[benchmark]
	fn set_allowance_unchecked_raw() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; spender: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;

		#[block]
		{
			<Pallet<T>>::set_allowance_unchecked(&collection, &sender, &spender, 200);
		}

		Ok(())
	}

	#[benchmark]
	fn burn_from() -> Result<(), BenchmarkError> {
		bench_init! {
			owner: sub; collection: collection(owner);
			owner: cross_from_sub; sender: cross_sub; burner: cross_sub;
		};
		<Pallet<T>>::create_item(&collection, &owner, (sender.clone(), 200), &Unlimited)?;
		<Pallet<T>>::set_allowance(&collection, &sender, &burner, 200)?;

		#[block]
		{
			<Pallet<T>>::burn_from(&collection, &burner, &sender, 100, &Unlimited)?
		}

		Ok(())
	}
}
