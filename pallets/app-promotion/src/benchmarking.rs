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

use super::*;
use crate::Pallet as PromototionPallet;

use sp_runtime::traits::Bounded;

use frame_benchmarking::{benchmarks, account};
use frame_support::traits::OnInitialize;
use frame_system::RawOrigin;
use pallet_unique::benchmarking::create_nft_collection;
use pallet_evm_migration::Pallet as EvmMigrationPallet;

const SEED: u32 = 0;

fn set_admin<T>() -> Result<T::AccountId, sp_runtime::DispatchError>
where
	T: Config + pallet_unique::Config + pallet_evm_migration::Config + pallet_balances::Config,
	T::BlockNumber: From<u32> + Into<u32>,
	<T as pallet_balances::Config>::Balance: Sum + From<u128>,
	<T as pallet_balances::Config>::FreezeIdentifier: From<[u8; 8]>,
{
	let pallet_admin = account::<T::AccountId>("admin", 0, SEED);

	<pallet_balances::Pallet<T> as fungible::Mutate<T::AccountId>>::set_balance(
		&pallet_admin,
		Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value(),
	);

	PromototionPallet::<T>::set_admin_address(
		RawOrigin::Root.into(),
		T::CrossAccountId::from_sub(pallet_admin.clone()),
	)?;

	Ok(pallet_admin)
}

benchmarks! {
	where_clause{
		where T:  Config + pallet_unique::Config + pallet_evm_migration::Config + pallet_balances::Config,
		T::BlockNumber: From<u32> + Into<u32>,
		<T as pallet_balances::Config>::Balance: Sum + From<u128>,
		<T as pallet_balances::Config>::FreezeIdentifier: From<[u8; 8]>
	}

	on_initialize {
		let b in 0..PENDING_LIMIT_PER_BLOCK;
		set_admin::<T>()?;

		(0..b).try_for_each(|index| {
			let staker = account::<T::AccountId>("staker", index, SEED);
			<pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&staker,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
			PromototionPallet::<T>::stake(RawOrigin::Signed(staker.clone()).into(), Into::<BalanceOf<T>>::into(100u128) * T::Nominal::get())?;
			PromototionPallet::<T>::unstake_all(RawOrigin::Signed(staker.clone()).into())?;
			Result::<(), sp_runtime::DispatchError>::Ok(())
		})?;
		let block_number = <frame_system::Pallet<T>>::current_block_number() + T::PendingInterval::get();
	}: {PromototionPallet::<T>::on_initialize(block_number)}

	set_admin_address {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
	} : _(RawOrigin::Root, T::CrossAccountId::from_sub(pallet_admin))

	payout_stakers{
		let b in 1..100;

		let pallet_admin = account::<T::AccountId>("admin", 1, SEED);
		let share = Perbill::from_rational(1u32, 20);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;
		<pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		<pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&<T as pallet::Config>::TreasuryAccountId::get(),  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());

		let stakers: Vec<T::AccountId> = (0..b).map(|index| account("staker", index, SEED)).collect();
		stakers.iter().for_each(|staker| {
			<pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&staker,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		});
		(1..11).try_for_each(|i| {
			<frame_system::Pallet<T>>::set_block_number(i.into());
			T::RelayBlockNumberProvider::set_block_number((2*i).into());
			assert_eq!(<frame_system::Pallet<T>>::block_number(), i.into());
			assert_eq!(T::RelayBlockNumberProvider::current_block_number(), (2*i).into());
			stakers.iter()
			.map(|staker| {
				PromototionPallet::<T>::stake(RawOrigin::Signed(staker.clone()).into(), Into::<BalanceOf<T>>::into(100u128) * T::Nominal::get())
			}).collect::<Result<Vec<_>, _>>()?;

			Result::<(), sp_runtime::DispatchError>::Ok(())
		})?;

		let stakes = Staked::<T>::iter_prefix((&stakers[0],)).into_iter().collect::<Vec<_>>();
		assert_eq!(stakes.len(), 10);

		<frame_system::Pallet<T>>::set_block_number(15_000.into());
		T::RelayBlockNumberProvider::set_block_number(30_000.into());
	} : _(RawOrigin::Signed(pallet_admin.clone()), Some(b as u8))

	stake {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 10);
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
	} : _(RawOrigin::Signed(caller.clone()), share * <pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::total_balance(&caller))

	unstake_all {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 20);
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		(1..11).map(|i| {
			// used to change block number
			<frame_system::Pallet<T>>::set_block_number(i.into());
			T::RelayBlockNumberProvider::set_block_number((2*i).into());
			assert_eq!(<frame_system::Pallet<T>>::block_number(), i.into());
			assert_eq!(T::RelayBlockNumberProvider::current_block_number(), (2*i).into());
			PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * <pallet_balances::Pallet<T> as fungible::Inspect<T::AccountId>>::total_balance(&caller))
		}).collect::<Result<Vec<_>, _>>()?;

	} : _(RawOrigin::Signed(caller.clone()))

	unstake_partial {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 20);
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		(1..11).map(|i| {
			// used to change block number
			<frame_system::Pallet<T>>::set_block_number(i.into());
			T::RelayBlockNumberProvider::set_block_number((2*i).into());
			assert_eq!(<frame_system::Pallet<T>>::block_number(), i.into());
			assert_eq!(T::RelayBlockNumberProvider::current_block_number(), (2*i).into());
			PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), Into::<BalanceOf<T>>::into(100u128) * T::Nominal::get())
		}).collect::<Result<Vec<_>, _>>()?;

	} : _(RawOrigin::Signed(caller.clone()), Into::<BalanceOf<T>>::into(1000u128) * T::Nominal::get())

	sponsor_collection {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let caller: T::AccountId = account("caller", 0, SEED);
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let collection = create_nft_collection::<T>(caller.clone())?;
	} : _(RawOrigin::Signed(pallet_admin.clone()), collection)

	stop_sponsoring_collection {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let caller: T::AccountId = account("caller", 0, SEED);
		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let collection = create_nft_collection::<T>(caller.clone())?;
		PromototionPallet::<T>::sponsor_collection(RawOrigin::Signed(pallet_admin.clone()).into(), collection)?;
	} : _(RawOrigin::Signed(pallet_admin.clone()), collection)

	sponsor_contract {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;

		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let address = H160::from_low_u64_be(SEED as u64);
		let data: Vec<u8> = (0..20 as u8).collect();
		<EvmMigrationPallet<T>>::begin(RawOrigin::Root.into(), address)?;
		<EvmMigrationPallet<T>>::finish(RawOrigin::Root.into(), address, data)?;
	} : _(RawOrigin::Signed(pallet_admin.clone()), address)

	stop_sponsoring_contract {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;

		let _ = <pallet_balances::Pallet<T> as fungible::Mutate::<T::AccountId>>::set_balance(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let address = H160::from_low_u64_be(SEED as u64);
		let data: Vec<u8> = (0..20 as u8).collect();
		<EvmMigrationPallet<T>>::begin(RawOrigin::Root.into(), address)?;
		<EvmMigrationPallet<T>>::finish(RawOrigin::Root.into(), address, data)?;
		PromototionPallet::<T>::sponsor_contract(RawOrigin::Signed(pallet_admin.clone()).into(), address)?;
	} : _(RawOrigin::Signed(pallet_admin.clone()), address)
}
