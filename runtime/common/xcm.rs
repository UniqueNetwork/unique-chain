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

use sp_std::{vec::Vec, marker::PhantomData};
use xcm::v1::MultiLocation;
use frame_support::traits::Get;

pub struct OverridableAllowedLocations<T, L>(PhantomData<(T, L)>)
where
	T: pallet_configuration::Config,
	L: Get<Vec<MultiLocation>>;

impl<T, L> Get<Vec<MultiLocation>> for OverridableAllowedLocations<T, L>
where
	T: pallet_configuration::Config,
	L: Get<Vec<MultiLocation>>,
{
	fn get() -> Vec<MultiLocation> {
		<pallet_configuration::XcmAllowedLocationsOverride<T>>::get()
			.map(|bounded| bounded.into_inner())
			.unwrap_or_else(|| L::get())
	}
}
