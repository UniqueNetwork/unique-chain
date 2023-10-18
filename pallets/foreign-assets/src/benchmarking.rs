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
use pallet_common::benchmarking::create_u16_data;
use sp_std::vec;
use staging_xcm::prelude::*;
use up_data_structs::{CollectionMode, MAX_COLLECTION_NAME_LENGTH};

use super::{Call, Config, Pallet};

#[benchmarks]
mod benchmarks {

	use super::*;

	#[benchmark]
	fn force_register_foreign_asset() -> Result<(), BenchmarkError> {
		let location =
			MultiLocation::from(X3(Parachain(1000), PalletInstance(42), GeneralIndex(1)));
		let name = create_u16_data::<MAX_COLLECTION_NAME_LENGTH>();
		let mode = CollectionMode::NFT;

		#[extrinsic_call]
		_(RawOrigin::Root, location, name, mode);

		Ok(())
	}
}
