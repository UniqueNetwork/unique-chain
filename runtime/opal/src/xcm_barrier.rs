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

use frame_support::{match_types, traits::Everything};
use staging_xcm::latest::{Junctions::*, Location};
use staging_xcm_builder::{
	AllowExplicitUnpaidExecutionFrom, AllowTopLevelPaidExecutionFrom, TakeWeightCredit,
	TrailingSetTopicAsId,
};

match_types! {
	pub type ParentOnly: impl Contains<Location> = {
		Location { parents: 1, interior: Here }
	};
}

pub type Barrier = TrailingSetTopicAsId<(
	TakeWeightCredit,
	AllowExplicitUnpaidExecutionFrom<ParentOnly>,
	AllowTopLevelPaidExecutionFrom<Everything>,
)>;
