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
use sp_std::vec;

use frame_benchmarking::{benchmarks, account};

use frame_system::{Origin, RawOrigin};
use pallet_unique::benchmarking::create_nft_collection;
use pallet_evm_migration::Pallet as EvmMigrationPallet;

const SEED: u32 = 0;

benchmarks! {
	where_clause{
		where T:  Config + pallet_unique::Config + pallet_evm_migration::Config ,
		T::BlockNumber: From<u32> + Into<u32>,
		<<T as Config>::Currency as Currency<T::AccountId>>::Balance: Sum + From<u128>
	}
	// start_app_promotion {

	// } : {PromototionPallet::<T>::start_app_promotion(RawOrigin::Root.into(), None)?}

	// stop_app_promotion{
	// 	PromototionPallet::<T>::start_app_promotion(RawOrigin::Root.into(), Some(25.into()))?;
	// } : {PromototionPallet::<T>::stop_app_promotion(RawOrigin::Root.into())?}

	set_admin_address {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		let _ = <T as Config>::Currency::make_free_balance_be(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
	} : {PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin))?}

	payout_stakers{
		let b in 1..101;

		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		let share = Perbill::from_rational(1u32, 20);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;
		<T as Config>::Currency::make_free_balance_be(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());

		let staker: T::AccountId = account("caller", 0, SEED);
		<T as Config>::Currency::make_free_balance_be(&staker,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let stakers: Vec<T::AccountId> = (0..b).map(|index| account("staker", index, SEED)).collect();
		stakers.iter().for_each(|staker| {
			<T as Config>::Currency::make_free_balance_be(&staker,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		});
		(0..10).try_for_each(|_| {
			stakers.iter()
				.map(|staker| {
				
					PromototionPallet::<T>::stake(RawOrigin::Signed(staker.clone()).into(), Into::<BalanceOf<T>>::into(100u128) * T::Nominal::get())
				}).collect::<Result<Vec<_>, _>>()?;
			<frame_system::Pallet<T>>::finalize();
			Result::<(), sp_runtime::DispatchError>::Ok(())
		})?;

		// let _ = <T as Config>::Currency::make_free_balance_be(&staker,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		// let _ = PromototionPallet::<T>::stake(RawOrigin::Signed(staker.clone()).into(), share * <T as Config>::Currency::total_balance(&staker))?;
	} : {PromototionPallet::<T>::payout_stakers(RawOrigin::Signed(pallet_admin.clone()).into(), Some(b as u8))?}

	stake {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 10);
		let _ = <T as Config>::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
	} : {PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * <T as Config>::Currency::total_balance(&caller))?}

	unstake {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 20);
		let _ = <T as Config>::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		(0..10).map(|_| {
			<frame_system::Pallet<T>>::finalize();
			PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * <T as Config>::Currency::total_balance(&caller))
		}).collect::<Result<Vec<_>, _>>()?;

	} : {PromototionPallet::<T>::unstake(RawOrigin::Signed(caller.clone()).into())?}

	// recalculate_and_insert_stake{
	// 	let caller = account::<T::AccountId>("caller", 0, SEED);
	// 	let share = Perbill::from_rational(1u32, 10);
	// 	let _ = <T as Config>::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
	// 	let _ = PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * <T as Config>::Currency::total_balance(&caller))?;
	// 	let block = <T::RelayBlockNumberProvider as BlockNumberProvider>::current_block_number();
	// 	let mut acc = <BalanceOf<T>>::default();
	// } : {PromototionPallet::<T>::recalculate_and_insert_stake(&caller, block, share * <T as Config>::Currency::total_balance(&caller), &mut acc)}

	sponsor_collection {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;
		let _ = <T as Config>::Currency::make_free_balance_be(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let caller: T::AccountId = account("caller", 0, SEED);
		let _ = <T as Config>::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let collection = create_nft_collection::<T>(caller.clone())?;
	} : {PromototionPallet::<T>::sponsor_collection(RawOrigin::Signed(pallet_admin.clone()).into(), collection)?}

	stop_sponsoring_collection {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;
		let _ = <T as Config>::Currency::make_free_balance_be(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let caller: T::AccountId = account("caller", 0, SEED);
		let _ = <T as Config>::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let collection = create_nft_collection::<T>(caller.clone())?;
		PromototionPallet::<T>::sponsor_collection(RawOrigin::Signed(pallet_admin.clone()).into(), collection)?;
	} : {PromototionPallet::<T>::stop_sponsoring_collection(RawOrigin::Signed(pallet_admin.clone()).into(), collection)?}

	sponsor_contract {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;

		let _ = <T as Config>::Currency::make_free_balance_be(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let address = H160::from_low_u64_be(SEED as u64);
		let data: Vec<u8> = (0..20 as u8).collect();
		<EvmMigrationPallet<T>>::begin(RawOrigin::Root.into(), address)?;
		<EvmMigrationPallet<T>>::finish(RawOrigin::Root.into(), address, data)?;
	} : {PromototionPallet::<T>::sponsor_conract(RawOrigin::Signed(pallet_admin.clone()).into(), address)?}

	stop_sponsoring_contract {
		let pallet_admin = account::<T::AccountId>("admin", 0, SEED);
		PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), T::CrossAccountId::from_sub(pallet_admin.clone()))?;

		let _ = <T as Config>::Currency::make_free_balance_be(&pallet_admin,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let address = H160::from_low_u64_be(SEED as u64);
		let data: Vec<u8> = (0..20 as u8).collect();
		<EvmMigrationPallet<T>>::begin(RawOrigin::Root.into(), address)?;
		<EvmMigrationPallet<T>>::finish(RawOrigin::Root.into(), address, data)?;
		PromototionPallet::<T>::sponsor_conract(RawOrigin::Signed(pallet_admin.clone()).into(), address)?;
	} : {PromototionPallet::<T>::stop_sponsoring_contract(RawOrigin::Signed(pallet_admin.clone()).into(), address)?}
}
