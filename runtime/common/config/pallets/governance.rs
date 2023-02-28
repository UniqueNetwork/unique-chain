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
    parameter_types,
    traits::EqualPrivilegeOnly,
    weights::Weight,
};
use frame_system::{EnsureRoot, EnsureSigned};
use sp_runtime::{
    Perbill,
    traits::ConstU32,
};
use crate::{Runtime, RuntimeOrigin, RuntimeEvent, RuntimeCall, OriginCaller, Preimage, Balances, Treasury, GovScheduler, Fellowship, TechnicalCommittee};
use up_common::{
	constants::{UNIQUE, DAYS, HOURS},
	types::{AccountId, Balance, BlockNumber},
};

parameter_types! {
	pub LaunchPeriod: BlockNumber = 7 * DAYS;
	pub VotingPeriod: BlockNumber = 7 * DAYS;
	pub FastTrackVotingPeriod: BlockNumber = 3 * HOURS;
	pub const MinimumDeposit: Balance = 100 * UNIQUE;
	pub EnactmentPeriod: BlockNumber = 8 * DAYS;
	pub CooloffPeriod: BlockNumber = 7 * DAYS;
	pub const InstantAllowed: bool = true;
	pub const MaxVotes: u32 = 100;
	pub const MaxProposals: u32 = 100;

    pub CouncilMotionDuration: BlockNumber = 3 * DAYS;
	pub const CouncilMaxProposals: u32 = 100;
	pub const CouncilMaxMembers: u32 = 100;

    pub FellowshipMotionDuration: BlockNumber = 3 * DAYS;
	pub const FellowshipMaxProposals: u32 = 100;
	pub const FellowshipMaxMembers: u32 = 100;

    pub TechnicalMotionDuration: BlockNumber = 3 * DAYS;
	pub const TechnicalMaxProposals: u32 = 100;
	pub const TechnicalMaxMembers: u32 = 100;

    pub MaximumSchedulerWeight: Weight = Perbill::from_percent(80) * <Runtime as frame_system::Config>::BlockWeights::get().max_block;
    pub const MaxScheduledPerBlock: u32 = 50;
}

impl pallet_democracy::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type EnactmentPeriod = EnactmentPeriod;
	type VoteLockingPeriod = EnactmentPeriod;
	type LaunchPeriod = LaunchPeriod;
	type VotingPeriod = VotingPeriod;
	type MinimumDeposit = MinimumDeposit;
	type SubmitOrigin = EnsureSigned<AccountId>;
	/// A straight majority of the council can decide what their next motion is.
	type ExternalOrigin = EnsureRoot<AccountId>;
    // EitherOfDiverse<
	// 	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 2>,
	// 	frame_system::EnsureRoot<AccountId>,
	// >;

	/// A 60% super-majority can have the next scheduled referendum be a straight majority-carries vote.
	type ExternalMajorityOrigin = EnsureRoot<AccountId>;
    // EitherOfDiverse<
	// 	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 3, 5>,
	// 	frame_system::EnsureRoot<AccountId>,
	// >;
	/// A unanimous council can have the next scheduled referendum be a straight default-carries
	/// (NTB) vote.
	type ExternalDefaultOrigin = EnsureRoot<AccountId>;
    // EitherOfDiverse<
	// 	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 1>,
	// 	frame_system::EnsureRoot<AccountId>,
	// >;
	/// Two thirds of the technical committee can have an `ExternalMajority/ExternalDefault` vote
	/// be tabled immediately and with a shorter voting/enactment period.
	type FastTrackOrigin = EnsureRoot<AccountId>;
    // EitherOfDiverse<
	// 	pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 2, 3>,
	// 	frame_system::EnsureRoot<AccountId>,
	// >;
	type InstantOrigin = EnsureRoot<AccountId>;
    // EitherOfDiverse<
	// 	pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>,
	// 	frame_system::EnsureRoot<AccountId>,
	// >;
	type InstantAllowed = InstantAllowed;
	type FastTrackVotingPeriod = FastTrackVotingPeriod;
	// To cancel a proposal which has been passed, 2/3 of the council must agree to it.
	type CancellationOrigin = EnsureRoot<AccountId>;
    // EitherOfDiverse<
	// 	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 2, 3>,
	// 	EnsureRoot<AccountId>,
	// >;
	// To cancel a proposal before it has been passed, the technical committee must be unanimous or
	// Root must agree.
	type CancelProposalOrigin = EnsureRoot<AccountId>;
    // EitherOfDiverse<
	// 	pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>,
	// 	EnsureRoot<AccountId>,
	// >;
	type BlacklistOrigin = EnsureRoot<AccountId>;
	// Any single technical committee member may veto a coming council proposal, however they can
	// only do it once and it lasts only for the cooloff period.
	type VetoOrigin = EnsureSigned<AccountId>;
    // pallet_collective::EnsureMember<AccountId, TechnicalCollective>;
	type CooloffPeriod = CooloffPeriod;
	type Slash = Treasury;
	type Scheduler = GovScheduler;
	type PalletsOrigin = OriginCaller;
	type MaxVotes = MaxVotes;
	type WeightInfo = pallet_democracy::weights::SubstrateWeight<Runtime>;
	type MaxProposals = MaxProposals;
	type Preimages = Preimage;
	type MaxDeposits = ConstU32<100>;
	type MaxBlacklisted = ConstU32<100>;
}

pub type CouncilCollective = pallet_collective::Instance1;
impl pallet_collective::Config<CouncilCollective> for Runtime {
    type RuntimeOrigin = RuntimeOrigin;
	type Proposal = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type MotionDuration = CouncilMotionDuration;
	type MaxProposals = CouncilMaxProposals;
	type MaxMembers = CouncilMaxMembers;
	type DefaultVote = pallet_collective::PrimeDefaultVote;
	type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
}

pub type FellowshipCollective = pallet_collective::Instance2;
impl pallet_collective::Config<FellowshipCollective> for Runtime {
    type RuntimeOrigin = RuntimeOrigin;
	type Proposal = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type MotionDuration = FellowshipMotionDuration;
	type MaxProposals = FellowshipMaxProposals;
	type MaxMembers = FellowshipMaxMembers;
	type DefaultVote = pallet_collective::PrimeDefaultVote;
	type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
}

pub type TechnicalCollective = pallet_collective::Instance3;
impl pallet_collective::Config<TechnicalCollective> for Runtime {
    type RuntimeOrigin = RuntimeOrigin;
	type Proposal = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type MotionDuration = TechnicalMotionDuration;
	type MaxProposals = TechnicalMaxProposals;
	type MaxMembers = TechnicalMaxMembers;
	type DefaultVote = pallet_collective::PrimeDefaultVote;
	type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
}

pub type FellowshipCollectiveMembership = pallet_membership::Instance1;
impl pallet_membership::Config<FellowshipCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = EnsureRoot<AccountId>;
	type RemoveOrigin = EnsureRoot<AccountId>;
	type SwapOrigin = EnsureRoot<AccountId>;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = EnsureRoot<AccountId>;
	type MembershipInitialized = Fellowship;
	type MembershipChanged = Fellowship;
	type MaxMembers = FellowshipMaxMembers;
	type WeightInfo = pallet_membership::weights::SubstrateWeight<Runtime>;
}

pub type TechnicalCollectiveMembership = pallet_membership::Instance2;
impl pallet_membership::Config<TechnicalCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = EnsureRoot<AccountId>;
	type RemoveOrigin = EnsureRoot<AccountId>;
	type SwapOrigin = EnsureRoot<AccountId>;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = EnsureRoot<AccountId>;
	type MembershipInitialized = TechnicalCommittee;
	type MembershipChanged = TechnicalCommittee;
	type MaxMembers = TechnicalMaxMembers;
	type WeightInfo = pallet_membership::weights::SubstrateWeight<Runtime>;
}

impl pallet_scheduler::Config for Runtime {
    type RuntimeOrigin = RuntimeOrigin;
	type RuntimeEvent = RuntimeEvent;
	type PalletsOrigin = OriginCaller;
	type RuntimeCall = RuntimeCall;
	type MaximumWeight = MaximumSchedulerWeight;
	type ScheduleOrigin = EnsureRoot<AccountId>;
	type MaxScheduledPerBlock = MaxScheduledPerBlock;
	type WeightInfo = pallet_scheduler::weights::SubstrateWeight<Runtime>;
	type OriginPrivilegeCmp = EqualPrivilegeOnly;
	type Preimages = Preimage;
}
