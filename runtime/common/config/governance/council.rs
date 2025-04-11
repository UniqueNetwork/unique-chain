use frame_support::traits::fungible::HoldConsideration;

use super::*;
use crate::{config::substrate::ExistentialDeposit, RuntimeHoldReason};

parameter_types! {
	pub CouncilMaxProposals: u32 = 100;
	pub CouncilMaxMembers: u32 = 100;
	pub const CouncilProposalDepositOffset: Balance = ExistentialDeposit::get() + ExistentialDeposit::get();
	pub const CouncilProposalHoldReason: RuntimeHoldReason =
		RuntimeHoldReason::Council(pallet_collective::HoldReason::ProposalSubmission);
}

#[cfg(not(feature = "gov-test-timings"))]
use crate::governance_timings::council as council_timings;

#[cfg(feature = "gov-test-timings")]
pub mod council_timings {
	use super::*;

	parameter_types! {
		pub CouncilMotionDuration: BlockNumber = 35;
	}
}

pub type CouncilCollective = pallet_collective::Instance1;
impl pallet_collective::Config<CouncilCollective> for Runtime {
	type RuntimeOrigin = RuntimeOrigin;
	type Proposal = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type MotionDuration = council_timings::CouncilMotionDuration;
	type MaxProposals = CouncilMaxProposals;
	type MaxMembers = CouncilMaxMembers;
	type DefaultVote = pallet_collective::PrimeDefaultVote;
	type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
	type SetMembersOrigin = EnsureRoot<AccountId>;
	type MaxProposalWeight = MaxCollectivesProposalWeight;
	type DisapproveOrigin = EnsureRoot<Self::AccountId>;
	type KillOrigin = EnsureRoot<Self::AccountId>;
	type Consideration = HoldConsideration<
		AccountId,
		Balances,
		CouncilProposalHoldReason,
		pallet_collective::deposit::Delayed<
			ConstU32<2>,
			pallet_collective::deposit::Linear<ConstU32<2>, CouncilProposalDepositOffset>,
		>,
		u32,
	>;
}

pub type CouncilCollectiveMembership = pallet_membership::Instance1;
impl pallet_membership::Config<CouncilCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = EnsureRoot<AccountId>;
	type RemoveOrigin = EnsureRoot<AccountId>;
	type SwapOrigin = EnsureRoot<AccountId>;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = EnsureRoot<AccountId>;
	type MembershipInitialized = Council;
	type MembershipChanged = Council;
	type MaxMembers = CouncilMaxMembers;
	type WeightInfo = pallet_membership::weights::SubstrateWeight<Runtime>;
}

pub type CouncilMember = pallet_collective::EnsureMember<AccountId, CouncilCollective>;

pub type OneThirdsCouncil =
	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 3>;

pub type HalfCouncil =
	pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 2>;

pub type MoreThanHalfCouncil =
	pallet_collective::EnsureProportionMoreThan<AccountId, CouncilCollective, 1, 2>;

pub type ThreeFourthsCouncil = EnsureProportionAtLeast<AccountId, CouncilCollective, 3, 4>;

pub type AllCouncil = EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 1>;

pub type RootOrOneThirdsCouncil = EitherOfDiverse<EnsureRoot<AccountId>, OneThirdsCouncil>;

pub type RootOrHalfCouncil = EitherOfDiverse<EnsureRoot<AccountId>, HalfCouncil>;

pub type RootOrMoreThanHalfCouncil = EitherOfDiverse<EnsureRoot<AccountId>, MoreThanHalfCouncil>;

pub type RootOrThreeFourthsCouncil = EitherOfDiverse<EnsureRoot<AccountId>, ThreeFourthsCouncil>;

pub type RootOrAllCouncil = EitherOfDiverse<EnsureRoot<AccountId>, AllCouncil>;
