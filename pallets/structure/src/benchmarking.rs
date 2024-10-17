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
use frame_support::traits::{fungible::Balanced, tokens::Precision};
use pallet_common::{CollectionIssuer, Config as CommonConfig};
use up_data_structs::{
	budget::Unlimited, CollectionMode, CreateCollectionData, CreateItemData, CreateNftData,
};

use super::*;

const SEED: u32 = 1;

#[benchmarks]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn find_parent() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let caller_cross = T::CrossAccountId::from_sub(caller.clone());

		let _ = <T as CommonConfig>::Currency::deposit(
			&caller,
			T::CollectionCreationPrice::get(),
			Precision::Exact,
		)
		.unwrap();
		T::CollectionDispatch::create(
			caller_cross.clone(),
			CollectionIssuer::User(caller_cross.clone()),
			CreateCollectionData {
				mode: CollectionMode::NFT,
				..Default::default()
			},
		)?;
		let dispatch = T::CollectionDispatch::dispatch(CollectionId(1))?;
		let dispatch = dispatch.as_dyn();

		dispatch.create_item(
			caller_cross.clone(),
			caller_cross,
			CreateItemData::NFT(CreateNftData::default()),
			&Unlimited,
		)?;

		#[block]
		{
			let parent = <Pallet<T>>::find_parent(CollectionId(1), TokenId(1))?;
			assert!(matches!(parent, Parent::User(_)));
		}

		Ok(())
	}
}
