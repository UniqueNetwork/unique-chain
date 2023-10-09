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

use frame_benchmarking::v2::*;
use frame_support::traits::{
	fungible::{Inspect, Mutate, Unbalanced},
	OnInitialize,
};
use frame_system::{pallet_prelude::*, RawOrigin};
use pallet_evm::account::CrossAccountId;
use pallet_evm_migration::Pallet as EvmMigrationPallet;
use pallet_unique::benchmarking::create_nft_collection;
use sp_core::{Get, H160};
use sp_runtime::{
	traits::{BlockNumberProvider, Bounded},
	Perbill,
};
use sp_std::{iter::Sum, vec, vec::Vec};

use super::{BalanceOf, Call, Config, Pallet, Staked, PENDING_LIMIT_PER_BLOCK};
use crate::{pallet, Pallet as PromototionPallet};

const SEED: u32 = 0;

fn set_admin<T>() -> Result<T::AccountId, sp_runtime::DispatchError>
where
	T: Config + pallet_unique::Config + pallet_evm_migration::Config,
	BlockNumberFor<T>: From<u32> + Into<u32>,
	BalanceOf<T>: Sum + From<u128>,
{
	let pallet_admin = account::<T::AccountId>("admin", 0, SEED);

	<T as Config>::Currency::set_balance(
		&pallet_admin,
		Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
	);

	PromototionPallet::<T>::set_admin_address(
		RawOrigin::Root.into(),
		T::CrossAccountId::from_sub(pallet_admin.clone()),
	)?;

	Ok(pallet_admin)
}

#[benchmarks(
	where T:  Config + pallet_unique::Config + pallet_evm_migration::Config ,
		BlockNumberFor<T>: From<u32> + Into<u32>,
		BalanceOf<T>: Sum + From<u128>
)]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn on_initialize(b: Linear<0, PENDING_LIMIT_PER_BLOCK>) -> Result<(), BenchmarkError> {
		set_admin::<T>()?;

		(0..b).try_for_each(|index| {
			let staker = account::<T::AccountId>("staker", index, SEED);
			<T as Config>::Currency::write_balance(
				&staker,
				Into::<BalanceOf<T>>::into(10_000u128) * T::Nominal::get(),
			)?;
			PromototionPallet::<T>::stake(
				RawOrigin::Signed(staker.clone()).into(),
				Into::<BalanceOf<T>>::into(100u128) * T::Nominal::get(),
			)?;
			PromototionPallet::<T>::unstake_all(RawOrigin::Signed(staker).into())?;
			Result::<(), sp_runtime::DispatchError>::Ok(())
		})?;
		let block_number =
			<frame_system::Pallet<T>>::current_block_number() + T::PendingInterval::get();

		#[block]
		{
			PromototionPallet::<T>::on_initialize(block_number);
		}

		Ok(())
	}

	#[benchmark]
	fn set_admin_address() -> Result<(), BenchmarkError> {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		let _ = <T as Config>::Currency::set_balance(
			&pallet_admin,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);

		#[extrinsic_call]
		_(RawOrigin::Root, T::CrossAccountId::from_sub(pallet_admin));

		Ok(())
	}

	#[benchmark]
	fn payout_stakers(b: Linear<0, 100>) -> Result<(), BenchmarkError> {
		let pallet_admin = account::<T::AccountId>("admin", 1, SEED);
		PromototionPallet::<T>::set_admin_address(
			RawOrigin::Root.into(),
			T::CrossAccountId::from_sub(pallet_admin.clone()),
		)?;
		<T as Config>::Currency::write_balance(
			&pallet_admin,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		)?;
		<T as Config>::Currency::write_balance(
			&<T as pallet::Config>::TreasuryAccountId::get(),
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		)?;

		let stakers: Vec<T::AccountId> =
			(0..b).map(|index| account("staker", index, SEED)).collect();
		stakers.iter().try_for_each(|staker| {
			<T as Config>::Currency::write_balance(
				staker,
				Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
			)?;
			Result::<(), sp_runtime::DispatchError>::Ok(())
		})?;
		(1..11).try_for_each(|i| {
			<frame_system::Pallet<T>>::set_block_number(i.into());
			T::RelayBlockNumberProvider::set_block_number((2 * i).into());
			assert_eq!(<frame_system::Pallet<T>>::block_number(), i.into());
			assert_eq!(
				T::RelayBlockNumberProvider::current_block_number(),
				(2 * i).into()
			);
			stakers
				.iter()
				.map(|staker| {
					PromototionPallet::<T>::stake(
						RawOrigin::Signed(staker.clone()).into(),
						Into::<BalanceOf<T>>::into(100u128) * T::Nominal::get(),
					)
				})
				.collect::<Result<Vec<_>, _>>()?;

			Result::<(), sp_runtime::DispatchError>::Ok(())
		})?;

		let stakes = Staked::<T>::iter_prefix((&stakers[0],)).collect::<Vec<_>>();
		assert_eq!(stakes.len(), 10);

		<frame_system::Pallet<T>>::set_block_number(15_000.into());
		T::RelayBlockNumberProvider::set_block_number(30_000.into());

		#[extrinsic_call]
		_(RawOrigin::Signed(pallet_admin.clone()), Some(b as u8));

		Ok(())
	}

	#[benchmark]
	fn stake() -> Result<(), BenchmarkError> {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 10);

		let _ = <T as Config>::Currency::write_balance(
			&caller,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);

		#[extrinsic_call]
		_(
			RawOrigin::Signed(caller.clone()),
			share * <T as Config>::Currency::total_balance(&caller),
		);

		Ok(())
	}

	#[benchmark]
	fn unstake_all() -> Result<(), BenchmarkError> {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 20);
		let _ = <T as Config>::Currency::write_balance(
			&caller,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		(1..11)
			.map(|i| {
				// used to change block number
				<frame_system::Pallet<T>>::set_block_number(i.into());
				T::RelayBlockNumberProvider::set_block_number((2 * i).into());
				assert_eq!(<frame_system::Pallet<T>>::block_number(), i.into());
				assert_eq!(
					T::RelayBlockNumberProvider::current_block_number(),
					(2 * i).into()
				);
				PromototionPallet::<T>::stake(
					RawOrigin::Signed(caller.clone()).into(),
					share * <T as Config>::Currency::total_balance(&caller),
				)
			})
			.collect::<Result<Vec<_>, _>>()?;

		#[extrinsic_call]
		_(RawOrigin::Signed(caller.clone()));

		Ok(())
	}

	#[benchmark]
	fn unstake_partial() -> Result<(), BenchmarkError> {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let _ = <T as Config>::Currency::write_balance(
			&caller,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		(1..11)
			.map(|i| {
				// used to change block number
				<frame_system::Pallet<T>>::set_block_number(i.into());
				T::RelayBlockNumberProvider::set_block_number((2 * i).into());
				assert_eq!(<frame_system::Pallet<T>>::block_number(), i.into());
				assert_eq!(
					T::RelayBlockNumberProvider::current_block_number(),
					(2 * i).into()
				);
				PromototionPallet::<T>::stake(
					RawOrigin::Signed(caller.clone()).into(),
					Into::<BalanceOf<T>>::into(100u128) * T::Nominal::get(),
				)
			})
			.collect::<Result<Vec<_>, _>>()?;

		#[extrinsic_call]
		_(
			RawOrigin::Signed(caller.clone()),
			Into::<BalanceOf<T>>::into(1000u128) * T::Nominal::get(),
		);

		Ok(())
	}

	#[benchmark]
	fn sponsor_collection() -> Result<(), BenchmarkError> {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(
			RawOrigin::Root.into(),
			T::CrossAccountId::from_sub(pallet_admin.clone()),
		)?;
		let _ = <T as Config>::Currency::write_balance(
			&pallet_admin,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		let caller: T::AccountId = account("caller", 0, SEED);
		let _ = <T as Config>::Currency::write_balance(
			&caller,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		let collection = create_nft_collection::<T>(caller)?;

		#[extrinsic_call]
		_(RawOrigin::Signed(pallet_admin.clone()), collection);

		Ok(())
	}

	#[benchmark]
	fn stop_sponsoring_collection() -> Result<(), BenchmarkError> {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(
			RawOrigin::Root.into(),
			T::CrossAccountId::from_sub(pallet_admin.clone()),
		)?;
		let _ = <T as Config>::Currency::write_balance(
			&pallet_admin,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		let caller: T::AccountId = account("caller", 0, SEED);
		let _ = <T as Config>::Currency::write_balance(
			&caller,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		let collection = create_nft_collection::<T>(caller)?;
		PromototionPallet::<T>::sponsor_collection(
			RawOrigin::Signed(pallet_admin.clone()).into(),
			collection,
		)?;

		#[extrinsic_call]
		_(RawOrigin::Signed(pallet_admin.clone()), collection);

		Ok(())
	}

	#[benchmark]
	fn sponsor_contract() -> Result<(), BenchmarkError> {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(
			RawOrigin::Root.into(),
			T::CrossAccountId::from_sub(pallet_admin.clone()),
		)?;

		let _ = <T as Config>::Currency::write_balance(
			&pallet_admin,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		let address = H160::from_low_u64_be(SEED as u64);
		let data: Vec<u8> = (0..20).collect();
		<EvmMigrationPallet<T>>::begin(RawOrigin::Root.into(), address)?;
		<EvmMigrationPallet<T>>::finish(RawOrigin::Root.into(), address, data)?;

		#[extrinsic_call]
		_(RawOrigin::Signed(pallet_admin.clone()), address);

		Ok(())
	}

	#[benchmark]
	fn stop_sponsoring_contract() -> Result<(), BenchmarkError> {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(
			RawOrigin::Root.into(),
			T::CrossAccountId::from_sub(pallet_admin.clone()),
		)?;

		let _ = <T as Config>::Currency::write_balance(
			&pallet_admin,
			Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
		);
		let address = H160::from_low_u64_be(SEED as u64);
		let data: Vec<u8> = (0..20).collect();
		<EvmMigrationPallet<T>>::begin(RawOrigin::Root.into(), address)?;
		<EvmMigrationPallet<T>>::finish(RawOrigin::Root.into(), address, data)?;
		PromototionPallet::<T>::sponsor_contract(
			RawOrigin::Signed(pallet_admin.clone()).into(),
			address,
		)?;

		#[extrinsic_call]
		_(RawOrigin::Signed(pallet_admin.clone()), address);

		Ok(())
	}
}
