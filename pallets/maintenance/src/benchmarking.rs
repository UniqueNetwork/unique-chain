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

use frame_benchmarking::benchmarks;
use frame_support::{ensure, pallet_prelude::Weight, traits::StorePreimage};
use frame_system::RawOrigin;
use parity_scale_codec::Encode;

use super::*;
use crate::{Config, Pallet as Maintenance};

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
