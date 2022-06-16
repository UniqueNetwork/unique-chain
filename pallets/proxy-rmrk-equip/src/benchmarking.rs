use sp_std::vec;

use frame_benchmarking::{benchmarks, account};
use frame_system::RawOrigin;
use frame_support::{
	traits::{Currency, Get},
	BoundedVec,
};

use up_data_structs::*;

use super::*;

const SEED: u32 = 1;

fn create_data<S: Get<u32>>() -> BoundedVec<u8, S> {
	vec![b'A'; S::get() as usize].try_into().expect("size == S")
}

fn create_u32_array<S: Get<u32>>() -> BoundedVec<u32, S> {
	vec![0; S::get() as usize].try_into().expect("size == S")
}

fn create_max_part() -> RmrkPartType {
	RmrkPartType::SlotPart(RmrkSlotPart {
		id: 42,
		equippable: RmrkEquippableList::Custom(create_u32_array()),
		src: create_data(),
		z: 1,
	})
}

fn create_parts_array<S: Get<u32>>(num: u32) -> BoundedVec<RmrkPartType, S> {
	vec![create_max_part(); num as usize]
		.try_into()
		.expect("num <= S")
}

fn create_max_theme_property() -> RmrkThemeProperty {
	RmrkThemeProperty {
		key: create_data(),
		value: create_data(),
	}
}

fn create_theme_properties_array<S: Get<u32>>(num: u32) -> BoundedVec<RmrkThemeProperty, S> {
	vec![create_max_theme_property(); num as usize]
		.try_into()
		.expect("num <= S")
}

fn create_max_theme(name: RmrkString, props_num: u32) -> RmrkBoundedTheme {
	RmrkBoundedTheme {
		name,
		properties: create_theme_properties_array(props_num),
		inherit: false,
	}
}

benchmarks! {
	create_base {
		let b in 0..RmrkPartsLimit::get();

		let caller = account("caller", 0, SEED);
		<T as pallet_common::Config>::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());

		let base_type = create_data();
		let symbol = create_data();
		let parts = create_parts_array(b);
	}: _(RawOrigin::Signed(caller), base_type, symbol, parts)

	theme_add {
		let b in 0..MaxPropertiesPerTheme::get();

		let caller = account("caller", 0, SEED);
		<T as pallet_common::Config>::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());

		let base_type = create_data();
		let symbol = create_data();
		let parts = create_parts_array(0);

		<Pallet<T>>::create_base(RawOrigin::Signed(caller.clone()).into(), base_type, symbol, parts)?;
		let base_id = 1;


		let default_theme_name = b"default".to_vec().try_into().expect("default is a valid name; qed");
		let default_theme = create_max_theme(default_theme_name, 0);

		<Pallet<T>>::theme_add(RawOrigin::Signed(caller.clone()).into(), base_id, default_theme)?;

		let theme = create_max_theme(create_data(), b);
	}: _(RawOrigin::Signed(caller), base_id, theme)
}
