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

#![cfg(feature = "runtime-benchmarks")]

use frame_benchmarking::v2::*;
use frame_support::traits::Hooks;
use sp_std::vec;

use super::*;
use crate::Pallet as Inflation;

#[benchmarks]
mod benchmarks {
	use super::*;

	#[benchmark]
	fn on_initialize() -> Result<(), BenchmarkError> {
		let block1: BlockNumberFor<T> = 1u32.into();
		let block2: BlockNumberFor<T> = 2u32.into();
		<Inflation<T> as Hooks<_>>::on_initialize(block1); // Create Treasury account

		#[block]
		{
			<Inflation<T> as Hooks<_>>::on_initialize(block2);
			// Benchmark deposit_into_existing path
		}

		Ok(())
	}
}
