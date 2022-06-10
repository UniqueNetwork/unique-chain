use sp_std::vec;

use frame_benchmarking::{benchmarks, account};
use frame_system::RawOrigin;
use frame_support::{
	traits::{Currency, Get},
	BoundedVec,
};

use crate::{Config, Pallet, Call};

const SEED: u32 = 1;

fn create_data<S: Get<u32>>() -> BoundedVec<u8, S> {
	vec![0; S::get() as usize].try_into().expect("size == S")
}

benchmarks! {
	create_collection {
		let caller = account("caller", 0, SEED);
		<T as pallet_common::Config>::Currency::deposit_creating(&caller, T::CollectionCreationPrice::get());
		let metadata = create_data();
		// TODO: Fix CollectionTokenPrefixLimitExceeded with create_data
		let symbol = vec![].try_into().expect("0 <= x");
	}: _(RawOrigin::Signed(caller), metadata, None, symbol)
}
