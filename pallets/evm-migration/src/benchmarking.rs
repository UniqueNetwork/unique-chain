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

#![allow(missing_docs)]

use frame_benchmarking::v2::*;
use frame_system::RawOrigin;
use sp_core::{H160, H256};
use sp_std::{vec, vec::Vec};

use super::{Call, Config, Pallet};

#[benchmarks(
	where <T as Config>::RuntimeEvent: parity_scale_codec::Encode
)]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn begin() -> Result<(), BenchmarkError> {
		#[extrinsic_call]
		_(RawOrigin::Root, H160::default());

		Ok(())
	}

	#[benchmark]
	fn set_data(b: Linear<0, 80>) -> Result<(), BenchmarkError> {
		let address = H160::from_low_u64_be(b as u64);
		let mut data = Vec::new();
		for i in 0..b {
			data.push((
				H256::from_low_u64_be(i as u64),
				H256::from_low_u64_be(i as u64),
			));
		}
		<Pallet<T>>::begin(RawOrigin::Root.into(), address)?;

		#[extrinsic_call]
		_(RawOrigin::Root, address, data);

		Ok(())
	}

	#[benchmark]
	fn finish(b: Linear<0, 80>) -> Result<(), BenchmarkError> {
		let address = H160::from_low_u64_be(b as u64);
		let data: Vec<u8> = (0..b as u8).collect();
		<Pallet<T>>::begin(RawOrigin::Root.into(), address)?;

		#[extrinsic_call]
		_(RawOrigin::Root, address, data);

		Ok(())
	}

	#[benchmark]
	fn insert_eth_logs(b: Linear<0, 200>) -> Result<(), BenchmarkError> {
		let logs = (0..b)
			.map(|_| ethereum::Log {
				address: H160([b as u8; 20]),
				data: vec![b as u8; 128],
				topics: vec![H256([b as u8; 32]); 6],
			})
			.collect::<Vec<_>>();

		#[extrinsic_call]
		_(RawOrigin::Root, logs);

		Ok(())
	}

	#[benchmark]
	fn insert_events(b: Linear<0, 200>) -> Result<(), BenchmarkError> {
		use parity_scale_codec::Encode;
		let logs = (0..b)
			.map(|_| <T as Config>::RuntimeEvent::from(crate::Event::<T>::TestEvent).encode())
			.collect::<Vec<_>>();

		#[extrinsic_call]
		_(RawOrigin::Root, logs);

		Ok(())
	}
}
