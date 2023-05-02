use super::*;
use crate::{Pallet as Maintenance, Config};

use codec::Encode;
use frame_benchmarking::benchmarks;
use frame_system::RawOrigin;
use frame_support::{ensure, pallet_prelude::Weight, traits::StorePreimage};

benchmarks! {
	enable {
	}: _(RawOrigin::Root)
	verify {
		ensure!(<Enabled<T>>::get(), "didn't enable the MM");
	}

	disable {
		Maintenance::<T>::enable(RawOrigin::Root.into())?;
	}: _(RawOrigin::Root)
	verify {
		ensure!(!<Enabled<T>>::get(), "didn't disable the MM");
	}

	#[pov_mode = MaxEncodedLen {
		// PoV size is deducted from weight_bound
		Preimage::PreimageFor: Measured
	}]
	execute_preimage {
		let call = <T as Config>::RuntimeCall::from(frame_system::Call::<T>::remark { remark: 1u32.encode() });
		let hash = T::Preimages::note(call.encode().into())?;
	}: _(RawOrigin::Root, hash, Weight::from_parts(100000000000, 100000000000))
	verify {
	}
}
