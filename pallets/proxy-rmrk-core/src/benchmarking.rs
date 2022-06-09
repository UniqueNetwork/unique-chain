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
	vec![0; S::get() as usize].try_into().expect("size == S")
}

fn create_max_collection<T: Config>(owner: &T::AccountId) -> Result<RmrkCollectionId, DispatchError> {
	<T as pallet_common::Config>::Currency::deposit_creating(owner, T::CollectionCreationPrice::get());

	let metadata = create_data();
	let max = None;
	let symbol = create_data();

	<Pallet<T>>::create_collection(RawOrigin::Signed(owner.clone()).into(), metadata, max, symbol)?;

	Ok(<CollectionIndex<T>>::get() - 1)
}

benchmarks! {
	create_collection {
		let caller = account("caller", 0, SEED);
		<T as pallet_common::Config>::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());
		let metadata = create_data();
		let max = None;
		let symbol = create_data();
	}: _(RawOrigin::Signed(caller), metadata, max, symbol)

	destroy_collection {
		let caller = account("caller", 0, SEED);
		let collection_id = create_max_collection::<T>(&caller)?;
	}: _(RawOrigin::Signed(caller), collection_id)
}
