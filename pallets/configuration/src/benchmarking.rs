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

//! Benchmarking setup for pallet-configuration

use super::*;
use frame_benchmarking::benchmarks;
use frame_system::{EventRecord, RawOrigin};
use frame_support::assert_ok;

fn assert_last_event<T: Config>(generic_event: <T as Config>::RuntimeEvent) {
	let events = frame_system::Pallet::<T>::events();
	let system_event: <T as frame_system::Config>::RuntimeEvent = generic_event.into();
	// compare to the last event record
	let EventRecord { event, .. } = &events[events.len() - 1];
	assert_eq!(event, &system_event);
}

benchmarks! {
	where_clause { where
		T: Config,
		T::Balance: From<u32>
	}

	set_weight_to_fee_coefficient_override {
		let coeff: u64 = 999;
	}: {
		assert_ok!(
			<Pallet<T>>::set_weight_to_fee_coefficient_override(RawOrigin::Root.into(), Some(coeff))
		);
	}

	set_min_gas_price_override {
		let coeff: u64 = 999;
	}: {
		assert_ok!(
			<Pallet<T>>::set_min_gas_price_override(RawOrigin::Root.into(), Some(coeff))
		);
	}

	set_app_promotion_configuration_override {
		let configuration: AppPromotionConfiguration<T::BlockNumber> = Default::default();
	}: {
		assert_ok!(
			<Pallet<T>>::set_app_promotion_configuration_override(RawOrigin::Root.into(), configuration)
		);
	}

	set_collator_selection_desired_collators {
		let max: u32 = 999;
	}: {
		assert_ok!(
			<Pallet<T>>::set_collator_selection_desired_collators(RawOrigin::Root.into(), Some(max))
		);
	}
	verify {
		assert_last_event::<T>(Event::NewDesiredCollators{desired_collators: Some(max)}.into());
	}

	set_collator_selection_license_bond {
		let bond_cost: Option<T::Balance> = Some(1000u32.into());
	}: {
		assert_ok!(
			<Pallet<T>>::set_collator_selection_license_bond(RawOrigin::Root.into(), bond_cost)
		);
	}
	verify {
		assert_last_event::<T>(Event::NewCollatorLicenseBond{bond_cost}.into());
	}

	set_collator_selection_kick_threshold {
		let threshold: Option<T::BlockNumber> = Some(900u32.into());
	}: {
		assert_ok!(
			<Pallet<T>>::set_collator_selection_kick_threshold(RawOrigin::Root.into(), threshold)
		);
	}
	verify {
		assert_last_event::<T>(Event::NewCollatorKickThreshold{length_in_blocks: threshold}.into());
	}

	set_governance_arg {
		let arg: T::Balance = 100.into();
	} : _(RawOrigin::Root, GovernanceArgs::SubmissionDeposit(arg))
	verify {
		assert_eq!(<GovernanceConfigurationOverride<T>>::get().submission_deposit, arg);
	}

}
