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

use frame_benchmarking::v2::*;
use frame_support::{ensure, pallet_prelude::Weight, traits::StorePreimage};
use frame_system::RawOrigin;
use parity_scale_codec::Encode;
use sp_std::vec;

use super::*;
use crate::{Config, Pallet as Maintenance};

#[benchmarks]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn enable() -> Result<(), BenchmarkError> {
		#[extrinsic_call]
		_(RawOrigin::Root);

		ensure!(<Enabled<T>>::get(), "didn't enable the MM");

		Ok(())
	}

	#[benchmark]
	fn disable() -> Result<(), BenchmarkError> {
		Maintenance::<T>::enable(RawOrigin::Root.into())?;

		#[extrinsic_call]
		_(RawOrigin::Root);

		ensure!(!<Enabled<T>>::get(), "didn't disable the MM");

		Ok(())
	}

	// TODO: fix
	// #[pov_mode = MaxEncodedLen {
	// 	// PoV size is deducted from weight_bound
	// 	Preimage::PreimageFor: Measured
	// }]
	#[benchmark]
	fn execute_preimage() -> Result<(), BenchmarkError> {
		let call = <T as Config>::RuntimeCall::from(frame_system::Call::<T>::remark {
			remark: 1u32.encode(),
		});
		let hash = T::Preimages::note(call.encode().into())?;

		#[extrinsic_call]
		_(
			RawOrigin::Root,
			hash,
			Weight::from_parts(100000000000, 100000000000),
		);

		Ok(())
	}
}
