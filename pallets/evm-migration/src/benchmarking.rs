use super::{Call, Config, Pallet};
use frame_benchmarking::benchmarks;
use frame_system::RawOrigin;
use sp_core::{H160, H256};
use sp_std::vec::Vec;

benchmarks! {
	begin {
	}: _(RawOrigin::Root, H160::default())

	set_data {
		let b in 0..80;
		let address = H160::from_low_u64_be(b as u64);
		let mut data = Vec::new();
		for i in 0..b {
			data.push((
				H256::from_low_u64_be(i as u64),
				H256::from_low_u64_be(i as u64),
			));
		}
		<Pallet<T>>::begin(RawOrigin::Root.into(), address)?;
	}: _(RawOrigin::Root, address, data)

	finish {
		let b in 0..80;
		let address = H160::from_low_u64_be(b as u64);
		let data: Vec<u8> = (0..b as u8).collect();
		<Pallet<T>>::begin(RawOrigin::Root.into(), address)?;
	}: _(RawOrigin::Root, address, data)
}
