//! Benchmarking setup for pallet-configuration

use super::*;
use frame_benchmarking::benchmarks;
use frame_system::{EventRecord, RawOrigin};
use frame_support::{assert_ok, traits::Currency};

fn assert_last_event<T: Config>(generic_event: <T as Config>::RuntimeEvent) {
	let events = frame_system::Pallet::<T>::events();
	let system_event: <T as frame_system::Config>::RuntimeEvent = generic_event.into();
	// compare to the last event record
	let EventRecord { event, .. } = &events[events.len() - 1];
	assert_eq!(event, &system_event);
}

benchmarks! {
	where_clause { where T: Config }

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
			<Pallet<T>>::set_collator_selection_desired_collators(RawOrigin::Root.into(), Some(max.clone()))
		);
	}
	verify {
		assert_last_event::<T>(Event::NewDesiredCollators{desired_collators: Some(max)}.into());
	}

	set_collator_selection_license_bond {
		let bond_cost: Option<BalanceOf<T>> = Some(T::Currency::minimum_balance() * 10u32.into());
	}: {
		assert_ok!(
			<Pallet<T>>::set_collator_selection_license_bond(RawOrigin::Root.into(), bond_cost.clone())
		);
	}
	verify {
		assert_last_event::<T>(Event::NewCollatorLicenseBond{bond_cost}.into());
	}

	set_collator_selection_kick_threshold {
		let threshold: Option<T::BlockNumber> = Some(900u32.into());
	}: {
		assert_ok!(
			<Pallet<T>>::set_collator_selection_kick_threshold(RawOrigin::Root.into(), threshold.clone())
		);
	}
	verify {
		assert_last_event::<T>(Event::NewCollatorKickThreshold{length_in_blocks: threshold}.into());
	}
}
