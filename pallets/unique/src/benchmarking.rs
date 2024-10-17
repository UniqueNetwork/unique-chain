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

#![cfg(feature = "runtime-benchmarks")]

use frame_benchmarking::v2::{account, benchmarks, BenchmarkError};
use frame_support::traits::{fungible::Balanced, tokens::Precision};
use frame_system::RawOrigin;
use pallet_common::{
	benchmarking::{create_data, create_u16_data},
	erc::CrossAccountId,
	Config as CommonConfig,
};
use up_data_structs::{
	CollectionId, CollectionLimits, CollectionMode, MAX_COLLECTION_DESCRIPTION_LENGTH,
	MAX_COLLECTION_NAME_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
};

use super::*;
use crate::Pallet;

const SEED: u32 = 1;

fn create_collection_helper<T: Config>(
	owner: T::AccountId,
	mode: CollectionMode,
) -> Result<CollectionId, DispatchError> {
	let _ = <T as CommonConfig>::Currency::deposit(
		&owner,
		T::CollectionCreationPrice::get(),
		Precision::Exact,
	)
	.unwrap();
	let col_name = create_u16_data::<{ MAX_COLLECTION_NAME_LENGTH }>();
	let col_desc = create_u16_data::<{ MAX_COLLECTION_DESCRIPTION_LENGTH }>();
	let token_prefix = create_data::<{ MAX_TOKEN_PREFIX_LENGTH }>();
	<Pallet<T>>::create_collection(
		RawOrigin::Signed(owner).into(),
		col_name,
		col_desc,
		token_prefix,
		mode,
	)?;
	Ok(<pallet_common::CreatedCollectionCount<T>>::get())
}
pub fn create_nft_collection<T: Config>(
	owner: T::AccountId,
) -> Result<CollectionId, DispatchError> {
	create_collection_helper::<T>(owner, CollectionMode::NFT)
}

#[benchmarks]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn create_collection() -> Result<(), BenchmarkError> {
		let col_name = create_u16_data::<{ MAX_COLLECTION_NAME_LENGTH }>();
		let col_desc = create_u16_data::<{ MAX_COLLECTION_DESCRIPTION_LENGTH }>();
		let token_prefix = create_data::<{ MAX_TOKEN_PREFIX_LENGTH }>();
		let mode: CollectionMode = CollectionMode::NFT;
		let caller: T::AccountId = account("caller", 0, SEED);
		let _ = <T as CommonConfig>::Currency::deposit(
			&caller,
			T::CollectionCreationPrice::get(),
			Precision::Exact,
		)
		.unwrap();

		#[extrinsic_call]
		_(
			RawOrigin::Signed(caller.clone()),
			col_name,
			col_desc,
			token_prefix,
			mode,
		);

		assert_eq!(
			<pallet_common::CollectionById<T>>::get(CollectionId(1))
				.unwrap()
				.owner,
			caller
		);

		Ok(())
	}

	#[benchmark]
	fn destroy_collection() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;

		#[extrinsic_call]
		_(RawOrigin::Signed(caller), collection);

		Ok(())
	}

	#[benchmark]
	fn add_to_allow_list() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let allowlist_account: T::AccountId = account("admin", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;

		#[extrinsic_call]
		_(
			RawOrigin::Signed(caller),
			collection,
			T::CrossAccountId::from_sub(allowlist_account),
		);

		Ok(())
	}

	#[benchmark]
	fn remove_from_allow_list() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let allowlist_account: T::AccountId = account("admin", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::add_to_allow_list(
			RawOrigin::Signed(caller.clone()).into(),
			collection,
			T::CrossAccountId::from_sub(allowlist_account.clone()),
		)?;

		#[extrinsic_call]
		_(
			RawOrigin::Signed(caller),
			collection,
			T::CrossAccountId::from_sub(allowlist_account),
		);

		Ok(())
	}

	#[benchmark]
	fn change_collection_owner() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let new_owner: T::AccountId = account("admin", 0, SEED);

		#[extrinsic_call]
		_(RawOrigin::Signed(caller), collection, new_owner);

		Ok(())
	}

	#[benchmark]
	fn add_collection_admin() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let new_admin: T::AccountId = account("admin", 0, SEED);

		#[extrinsic_call]
		_(
			RawOrigin::Signed(caller),
			collection,
			T::CrossAccountId::from_sub(new_admin),
		);

		Ok(())
	}

	#[benchmark]
	fn remove_collection_admin() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		let new_admin: T::AccountId = account("admin", 0, SEED);
		<Pallet<T>>::add_collection_admin(
			RawOrigin::Signed(caller.clone()).into(),
			collection,
			T::CrossAccountId::from_sub(new_admin.clone()),
		)?;

		#[extrinsic_call]
		_(
			RawOrigin::Signed(caller),
			collection,
			T::CrossAccountId::from_sub(new_admin),
		);

		Ok(())
	}

	#[benchmark]
	fn set_collection_sponsor() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;

		#[extrinsic_call]
		_(RawOrigin::Signed(caller), collection, caller.clone());

		Ok(())
	}

	#[benchmark]
	fn confirm_sponsorship() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::set_collection_sponsor(
			RawOrigin::Signed(caller.clone()).into(),
			collection,
			caller.clone(),
		)?;

		#[extrinsic_call]
		_(RawOrigin::Signed(caller), collection);

		Ok(())
	}

	#[benchmark]
	fn remove_collection_sponsor() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;
		<Pallet<T>>::set_collection_sponsor(
			RawOrigin::Signed(caller.clone()).into(),
			collection,
			caller.clone(),
		)?;
		<Pallet<T>>::confirm_sponsorship(RawOrigin::Signed(caller.clone()).into(), collection)?;

		#[extrinsic_call]
		_(RawOrigin::Signed(caller), collection);

		Ok(())
	}

	#[benchmark]
	fn set_transfers_enabled_flag() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;

		#[extrinsic_call]
		_(RawOrigin::Signed(caller), collection, false);

		Ok(())
	}

	#[benchmark]
	fn set_collection_limits() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller.clone())?;

		let cl = CollectionLimits {
			account_token_ownership_limit: Some(0),
			sponsored_data_size: Some(0),
			token_limit: Some(1),
			sponsor_transfer_timeout: Some(0),
			sponsor_approve_timeout: None,
			owner_can_destroy: Some(true),
			owner_can_transfer: Some(true),
			sponsored_data_rate_limit: None,
			transfers_enabled: Some(true),
		};

		#[extrinsic_call]
		set_collection_limits(RawOrigin::Signed(caller), collection, cl);

		Ok(())
	}

	#[benchmark]
	fn force_repair_collection() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = account("caller", 0, SEED);
		let collection = create_nft_collection::<T>(caller)?;

		#[extrinsic_call]
		_(RawOrigin::Root, collection);

		Ok(())
	}
}
