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

use frame_support::{
	{match_types, weights::Weight},
	traits::Everything,
};
use xcm::{
	latest::Xcm,
	v1::{BodyId, Junction::*, Junctions::*, MultiLocation},
};
use xcm_builder::{AllowTopLevelPaidExecutionFrom, AllowUnpaidExecutionFrom, TakeWeightCredit};
use xcm_executor::traits::ShouldExecute;

use crate::runtime_common::config::xcm::{DenyThenTry, DenyTransact};

match_types! {
	pub type ParentOrParentsUnitPlurality: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(Plurality { id: BodyId::Unit, .. }) }
	};
}

/// Execution barrier that just takes `max_weight` from `weight_credit`.
///
/// Useful to allow XCM execution by local chain users via extrinsics.
/// E.g. `pallet_xcm::reserve_asset_transfer` to transfer a reserve asset
/// out of the local chain to another one.
pub struct AllowAllDebug;
impl ShouldExecute for AllowAllDebug {
	fn should_execute<Call>(
		_origin: &MultiLocation,
		_message: &mut Xcm<Call>,
		_max_weight: Weight,
		_weight_credit: &mut Weight,
	) -> Result<(), ()> {
		Ok(())
	}
}

pub type Barrier = DenyThenTry<
	DenyTransact,
	(
		TakeWeightCredit,
		AllowTopLevelPaidExecutionFrom<Everything>,
		AllowUnpaidExecutionFrom<ParentOrParentsUnitPlurality>,
		// ^^^ Parent & its unit plurality gets free execution
		AllowAllDebug,
	),
>;
