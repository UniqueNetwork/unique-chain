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
use frame_system::{Origin, RawOrigin};

const SEED: u32 = 0;
benchmarks! {
	where_clause{
		where T: Config

	}
	on_initialize {
		let block1: T::BlockNumber = T::BlockNumber::from(1u32);
		let block2: T::BlockNumber = T::BlockNumber::from(2u32);
		PromototionPallet::<T>::on_initialize(block1); // Create Treasury account
	}: { PromototionPallet::<T>::on_initialize(block2); } // Benchmark deposit_into_existing path

	start_app_promotion {
		let caller = account::<T::AccountId>("caller", 0, SEED);

	} : {PromototionPallet::<T>::start_app_promotion(RawOrigin::Root.into(), T::BlockNumber::from(2u32))?}

	set_admin_address {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let _ = T::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
	} : {PromototionPallet::<T>::set_admin_address(RawOrigin::Root.into(), caller)?}

	stake {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 10);
		let _ = T::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
	} : {PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * T::Currency::total_balance(&caller))?}

	unstake {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 10);
		let _ = T::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let _ = PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * T::Currency::total_balance(&caller))?;

	} : {PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * T::Currency::total_balance(&caller))?}

	recalculate_stake {
		let caller = account::<T::AccountId>("caller", 0, SEED);
		let share = Perbill::from_rational(1u32, 10);
		let _ = T::Currency::make_free_balance_be(&caller,  Perbill::from_rational(1u32, 2) * BalanceOf::<T>::max_value());
		let _ = PromototionPallet::<T>::stake(RawOrigin::Signed(caller.clone()).into(), share * T::Currency::total_balance(&caller))?;
		let block = <T::BlockNumberProvider as BlockNumberProvider>::current_block_number();
		let mut acc = <BalanceOf<T>>::default();
	} : {PromototionPallet::<T>::recalculate_stake(&caller, block, share * T::Currency::total_balance(&caller), &mut acc)}
}
