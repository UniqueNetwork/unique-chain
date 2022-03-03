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

use super::*;
use crate::Pallet as Inflation;

use frame_benchmarking::{benchmarks};
use frame_support::traits::OnInitialize;

benchmarks! {

	on_initialize {
		let block1: T::BlockNumber = T::BlockNumber::from(1u32);
		let block2: T::BlockNumber = T::BlockNumber::from(2u32);
		Inflation::<T>::on_initialize(block1); // Create Treasury account
	}: { Inflation::<T>::on_initialize(block2); } // Benchmark deposit_into_existing path

}
