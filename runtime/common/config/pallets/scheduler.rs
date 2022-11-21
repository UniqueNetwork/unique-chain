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
	traits::{PrivilegeCmp, EnsureOrigin},
	weights::Weight,
	parameter_types,
};
use frame_system::{EnsureRoot, RawOrigin};
use sp_runtime::Perbill;
use core::cmp::Ordering;
use codec::Decode;
use crate::{
	runtime_common::{scheduler::SchedulerPaymentExecutor, config::substrate::RuntimeBlockWeights},
	Runtime, RuntimeCall, RuntimeEvent, RuntimeOrigin, OriginCaller,
};
use pallet_unique_scheduler_v2::ScheduledEnsureOriginSuccess;
use up_common::types::AccountId;

parameter_types! {
	pub MaximumSchedulerWeight: Weight = Perbill::from_percent(50) *
		RuntimeBlockWeights::get().max_block;
	pub const MaxScheduledPerBlock: u32 = 50;

	pub const NoPreimagePostponement: Option<u32> = Some(10);
	pub const Preimage: Option<u32> = Some(10);
}

pub struct EnsureSignedOrRoot<AccountId>(sp_std::marker::PhantomData<AccountId>);
impl<O: Into<Result<RawOrigin<AccountId>, O>> + From<RawOrigin<AccountId>>, AccountId: Decode>
	EnsureOrigin<O> for EnsureSignedOrRoot<AccountId>
{
	type Success = ScheduledEnsureOriginSuccess<AccountId>;
	fn try_origin(o: O) -> Result<Self::Success, O> {
		o.into().and_then(|o| match o {
			RawOrigin::Root => Ok(ScheduledEnsureOriginSuccess::Root),
			RawOrigin::Signed(who) => Ok(ScheduledEnsureOriginSuccess::Signed(who)),
			r => Err(O::from(r)),
		})
	}
}

pub struct EqualOrRootOnly;
impl PrivilegeCmp<OriginCaller> for EqualOrRootOnly {
	fn cmp_privilege(left: &OriginCaller, right: &OriginCaller) -> Option<Ordering> {
		use RawOrigin::*;

		let left = left.clone().try_into().ok()?;
		let right = right.clone().try_into().ok()?;

		match (left, right) {
			(Root, Root) => Some(Ordering::Equal),
			(Root, _) => Some(Ordering::Greater),
			(_, Root) => Some(Ordering::Less),
			lr @ _ => (lr.0 == lr.1).then(|| Ordering::Equal),
		}
	}
}

impl pallet_unique_scheduler_v2::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeOrigin = RuntimeOrigin;
	type PalletsOrigin = OriginCaller;
	type RuntimeCall = RuntimeCall;
	type MaximumWeight = MaximumSchedulerWeight;
	type ScheduleOrigin = EnsureSignedOrRoot<AccountId>;
	type OriginPrivilegeCmp = EqualOrRootOnly;
	type MaxScheduledPerBlock = MaxScheduledPerBlock;
	type WeightInfo = ();
	type Preimages = ();
	type CallExecutor = SchedulerPaymentExecutor;
	type PrioritySetOrigin = EnsureRoot<AccountId>;
}
