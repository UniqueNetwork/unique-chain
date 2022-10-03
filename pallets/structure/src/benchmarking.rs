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

use frame_benchmarking::{benchmarks, account};
use frame_support::traits::{Currency, Get};
use up_data_structs::{
	CreateCollectionData, CollectionMode, CreateItemData, CreateNftData, budget::Unlimited,
};
use pallet_common::Config as CommonConfig;
use pallet_evm::account::CrossAccountId;

const SEED: u32 = 1;

benchmarks! {
	find_parent {
		let caller: T::AccountId = account("caller", 0, SEED);
		let caller_cross = T::CrossAccountId::from_sub(caller.clone());

		<T as CommonConfig>::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());
		T::CollectionDispatch::create(caller_cross.clone(), caller_cross.clone(), CreateCollectionData {
			mode: CollectionMode::NFT,
			..Default::default()
		})?;
		let dispatch = T::CollectionDispatch::dispatch(CollectionHandle::try_get(CollectionId(1))?);
		let dispatch = dispatch.as_dyn();

		dispatch.create_item(caller_cross.clone(), caller_cross.clone(), CreateItemData::NFT(CreateNftData::default()), &Unlimited)?;
	}: {
		let parent = <Pallet<T>>::find_parent(CollectionId(1), TokenId(1))?;
		assert!(matches!(parent, Parent::User(_)))
	}
}
