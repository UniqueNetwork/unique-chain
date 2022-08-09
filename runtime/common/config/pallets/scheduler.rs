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

use frame_support::{traits::PrivilegeCmp, weights::Weight, parameter_types};
use frame_system::EnsureSigned;
use sp_runtime::Perbill;
use sp_std::cmp::Ordering;
use crate::{
	runtime_common::{scheduler::SchedulerPaymentExecutor, config::substrate::RuntimeBlockWeights},
	Runtime, Call, Event, Origin, OriginCaller, Balances,
};
use common_types::AccountId;

parameter_types! {
	pub MaximumSchedulerWeight: Weight = Perbill::from_percent(50) *
		RuntimeBlockWeights::get().max_block;
	pub const MaxScheduledPerBlock: u32 = 50;

	pub const NoPreimagePostponement: Option<u32> = Some(10);
	pub const Preimage: Option<u32> = Some(10);
}

/// Used the compare the privilege of an origin inside the scheduler.
pub struct OriginPrivilegeCmp;

impl PrivilegeCmp<OriginCaller> for OriginPrivilegeCmp {
	fn cmp_privilege(_left: &OriginCaller, _right: &OriginCaller) -> Option<Ordering> {
		Some(Ordering::Equal)
	}
}

impl pallet_unique_scheduler::Config for Runtime {
	type Event = Event;
	type Origin = Origin;
	type Currency = Balances;
	type PalletsOrigin = OriginCaller;
	type Call = Call;
	type MaximumWeight = MaximumSchedulerWeight;
	type ScheduleOrigin = EnsureSigned<AccountId>;
	type MaxScheduledPerBlock = MaxScheduledPerBlock;
	type WeightInfo = ();
	type CallExecutor = SchedulerPaymentExecutor;
	type OriginPrivilegeCmp = OriginPrivilegeCmp;
	type PreimageProvider = ();
	type NoPreimagePostponement = NoPreimagePostponement;
}
