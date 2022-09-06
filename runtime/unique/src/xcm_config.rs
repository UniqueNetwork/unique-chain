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

use frame_support::{match_types, parameter_types, traits::Get};
use sp_std::{vec, vec::Vec};
use xcm::v1::{BodyId, Junction::*, Junctions::*, MultiLocation};
use xcm_builder::{
	AllowKnownQueryResponses, AllowSubscriptionsFrom, AllowUnpaidExecutionFrom, TakeWeightCredit,
};

use crate::{
	ParachainInfo, PolkadotXcm,
	runtime_common::config::xcm::{DenyThenTry, DenyTransact, DenyExchangeWithUnknownLocation},
};

match_types! {
	pub type ParentOrParentsExecutivePlurality: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(Plurality { id: BodyId::Executive, .. }) }
	};
	pub type ParentOrSiblings: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(_) }
	};
}

parameter_types! {
	pub UniqueAllowedLocations: Vec<MultiLocation> = vec![
		// Self location
		MultiLocation {
			parents: 0,
			interior: Here,
		},
		// Parent location
		MultiLocation {
			parents: 1,
			interior: Here,
		},
		// Karura/Acala location
		MultiLocation {
			parents: 1,
			interior: X1(Parachain(2000)),
		},
		// Moonbeam location
		MultiLocation {
			parents: 1,
			interior: X1(Parachain(2004)),
		},
		// Self parachain address
		MultiLocation {
			parents: 1,
			interior: X1(Parachain(ParachainInfo::get().into())),
		},
	];
}

pub type Barrier = DenyThenTry<
	(
		DenyTransact,
		DenyExchangeWithUnknownLocation<UniqueAllowedLocations>,
	),
	(
		TakeWeightCredit,
		// Parent and its exec plurality get free execution
		AllowUnpaidExecutionFrom<ParentOrParentsExecutivePlurality>,
		// Expected responses are OK.
		AllowKnownQueryResponses<PolkadotXcm>,
		// Subscriptions for version tracking are OK.
		AllowSubscriptionsFrom<ParentOrSiblings>,
	),
>;
