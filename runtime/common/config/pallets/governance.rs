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
	PalletId, parameter_types,
	traits::{EnsureOrigin, EqualPrivilegeOnly, EitherOfDiverse},
	weights::Weight,
};
use frame_system::EnsureRoot;
use sp_runtime::{
	Perbill,
	traits::{AccountIdConversion, ConstU32},
};
use crate::{
	Runtime, RuntimeOrigin, RuntimeEvent, RuntimeCall, OriginCaller, Preimage, Balances, Treasury,
	GovScheduler, Council, Fellowship, TechnicalCommittee,
};
use up_common::{
	constants::{UNIQUE, DAYS, HOURS},
	types::{AccountId, Balance, BlockNumber},
};
use pallet_collective::EnsureProportionAtLeast;

pub const FELLOWSHIP_MODULE_ID: PalletId = PalletId(*b"flowship");

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
	type Slash = Treasury;
	type Scheduler = GovScheduler;
	type PalletsOrigin = OriginCaller;
	type Preimages = Preimage;
	type WeightInfo = pallet_democracy::weights::SubstrateWeight<Runtime>;

	/// The period between a proposal being approved and enacted.
	type EnactmentPeriod = EnactmentPeriod;

	/// The minimum period of vote locking.
	type VoteLockingPeriod = EnactmentPeriod;

	/// How often new public referenda are launched.
	type LaunchPeriod = LaunchPeriod;

	/// How long the referendum will last.
	type VotingPeriod = VotingPeriod;

	/// The minimum amount to be used as a deposit for the Fellowship referendum proposal.
	/// The Fellowship pallet has a special account (like Treasury) for funding the Fellowship proposals:
	/// See [FELLOWSHIP_MODULE_ID].
	type MinimumDeposit = MinimumDeposit;

	type SubmitOrigin = FellowshipProposition;

	/// 1/3 of the council can decide what their next motion is (SuperMajorityApprove).
	type ExternalOrigin = OneThirdsCouncil;

	/// More than 1/2 of council can have the next scheduled referendum be a straight majority-carries vote.
	/// (SimpleMajority)
	type ExternalMajorityOrigin = HalfCouncil;

	/// Root (for the initial referendums)
	/// or 3/4 of council can have the next scheduled referendum be a straight default-carries
	/// (NTB) vote (SuperMajorityAgainst).
	type ExternalDefaultOrigin = RootOrThreeFourthsCouncil;

	/// A unanimous technical committee can have an ExternalMajority/ExternalDefault vote
	/// be tabled immediately and with a shorter voting/enactment period.
	type FastTrackOrigin = AllTechnicalCommittee;

	/// Origin from which the next referendum may be tabled to vote immediately and asynchronously.
	/// Can set a faster voting period.
	type InstantOrigin = AllTechnicalCommittee;
	type InstantAllowed = InstantAllowed;

	/// Minimum voting period allowed for a fast-track referendum.
	type FastTrackVotingPeriod = FastTrackVotingPeriod;

	/// A single technical committee member can cancel a proposal which has been passed.
	type CancellationOrigin = TechnicalCommitteeMember;

	/// To cancel a proposal before it has been passed, the technical committee must be unanimous or
	/// Root must agree.
	type CancelProposalOrigin = RootOrAllTechnicalCommittee;

	/// A unanimous council or Root can blacklist a proposal permanently.
	type BlacklistOrigin = RootOrAllCouncil;

	// Any single technical committee member may veto a coming council proposal, however they can
	// only do it once and it lasts only for the cooloff period.
	type VetoOrigin = TechnicalCommitteeMember;
	type CooloffPeriod = CooloffPeriod;

	/// The maximum number of votes for an account
	type MaxVotes = MaxVotes;

	/// The maximum number of public proposals that can exist at any time.
	type MaxProposals = MaxProposals;

	/// The maximum number of deposits a public proposal may have at any time.
	type MaxDeposits = ConstU32<100>;

	/// The maximum number of items that can be blacklisted.
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

pub type OneThirdsCouncil =
	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 3>;

pub type HalfCouncil =
	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 2>;

pub type ThreeFourthsCouncil = EnsureProportionAtLeast<AccountId, CouncilCollective, 3, 4>;

pub type RootOrHalfCouncil = EitherOfDiverse<EnsureRoot<AccountId>, HalfCouncil>;

pub type RootOrThreeFourthsCouncil = EitherOfDiverse<EnsureRoot<AccountId>, ThreeFourthsCouncil>;

pub type RootOrAllCouncil = EitherOfDiverse<
	EnsureRoot<AccountId>,
	EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 1>,
>;

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

pub type OneThirdsFellowship =
	pallet_collective::EnsureProportionAtLeast<AccountId, FellowshipCollective, 1, 3>;

pub struct FellowshipProposition;
impl<O> EnsureOrigin<O> for FellowshipProposition
where
	O: Into<Result<pallet_collective::RawOrigin<AccountId, FellowshipCollective>, O>>
		+ From<pallet_collective::RawOrigin<AccountId, FellowshipCollective>>,
{
	type Success = AccountId;

	fn try_origin(o: O) -> Result<Self::Success, O> {
		OneThirdsFellowship::try_origin(o).map(|_| FELLOWSHIP_MODULE_ID.into_account_truncating())
	}

	#[cfg(feature = "runtime-benchmarks")]
	fn try_successful_origin() -> Result<O, ()> {
		OneThirdsFellowship::try_successful_origin()
	}
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

pub type TechnicalCommitteeMember = pallet_collective::EnsureMember<AccountId, TechnicalCollective>;

pub type RootOrTechnicalCommitteeMember =
	EitherOfDiverse<EnsureRoot<AccountId>, TechnicalCommitteeMember>;

pub type AllTechnicalCommittee =
	pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>;

pub type RootOrAllTechnicalCommittee =
	EitherOfDiverse<EnsureRoot<AccountId>, AllTechnicalCommittee>;

pub type CouncilCollectiveMembership = pallet_membership::Instance1;
impl pallet_membership::Config<CouncilCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = RootOrAllCouncil;
	type RemoveOrigin = RootOrAllCouncil;
	type SwapOrigin = RootOrAllCouncil;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = EnsureRoot<AccountId>;
	type MembershipInitialized = Council;
	type MembershipChanged = Council;
	type MaxMembers = CouncilMaxMembers;
	type WeightInfo = pallet_membership::weights::SubstrateWeight<Runtime>;
}

pub type FellowshipCollectiveMembership = pallet_membership::Instance2;
impl pallet_membership::Config<FellowshipCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = RootOrTechnicalCommitteeMember;
	type RemoveOrigin = RootOrTechnicalCommitteeMember;
	type SwapOrigin = RootOrTechnicalCommitteeMember;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = EnsureRoot<AccountId>;
	type MembershipInitialized = Fellowship;
	type MembershipChanged = Fellowship;
	type MaxMembers = FellowshipMaxMembers;
	type WeightInfo = pallet_membership::weights::SubstrateWeight<Runtime>;
}

pub type TechnicalCollectiveMembership = pallet_membership::Instance3;
impl pallet_membership::Config<TechnicalCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = RootOrHalfCouncil;
	type RemoveOrigin = RootOrHalfCouncil;
	type SwapOrigin = RootOrHalfCouncil;
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
