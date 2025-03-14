use frame_support::traits::fungible::HoldConsideration;

use super::*;
use crate::{config::substrate::ExistentialDeposit, RuntimeHoldReason};

parameter_types! {
	pub TechnicalMaxProposals: u32 = 100;
	pub TechnicalMaxMembers: u32 = 100;
	pub const ProposalDepositOffset: Balance = ExistentialDeposit::get() + ExistentialDeposit::get();
	pub const ProposalHoldReason: RuntimeHoldReason =
		RuntimeHoldReason::Council(pallet_collective::HoldReason::ProposalSubmission);
}

#[cfg(not(feature = "gov-test-timings"))]
use crate::governance_timings::technical_committee as technical_committee_timings;

#[cfg(feature = "gov-test-timings")]
pub mod technical_committee_timings {
	use super::*;

	parameter_types! {
		pub TechnicalMotionDuration: BlockNumber = 35;
	}
}

pub type TechnicalCollective = pallet_collective::Instance2;
impl pallet_collective::Config<TechnicalCollective> for Runtime {
	type RuntimeOrigin = RuntimeOrigin;
	type Proposal = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type MotionDuration = technical_committee_timings::TechnicalMotionDuration;
	type MaxProposals = TechnicalMaxProposals;
	type MaxMembers = TechnicalMaxMembers;
	type DefaultVote = pallet_collective::PrimeDefaultVote;
	type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
	type SetMembersOrigin = EnsureRoot<AccountId>;
	type MaxProposalWeight = MaxCollectivesProposalWeight;
	type DisapproveOrigin = EnsureRoot<Self::AccountId>;
	type KillOrigin = EnsureRoot<Self::AccountId>;
	type Consideration = HoldConsideration<
		AccountId,
		Balances,
		ProposalHoldReason,
		pallet_collective::deposit::Delayed<
			ConstU32<2>,
			pallet_collective::deposit::Linear<ConstU32<2>, ProposalDepositOffset>,
		>,
		u32,
	>;
}

pub type TechnicalCollectiveMembership = pallet_membership::Instance2;
impl pallet_membership::Config<TechnicalCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = RootOrMoreThanHalfCouncil;
	type RemoveOrigin = RootOrMoreThanHalfCouncil;
	type SwapOrigin = RootOrMoreThanHalfCouncil;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = RootOrMoreThanHalfCouncil;
	type MembershipInitialized = TechnicalCommittee;
	type MembershipChanged = TechnicalCommittee;
	type MaxMembers = TechnicalMaxMembers;
	type WeightInfo = pallet_membership::weights::SubstrateWeight<Runtime>;
}

pub type TechnicalCommitteeMember = pallet_collective::EnsureMember<AccountId, TechnicalCollective>;

pub type RootOrTechnicalCommitteeMember =
	EitherOfDiverse<EnsureRoot<AccountId>, TechnicalCommitteeMember>;

pub type AllTechnicalCommittee =
	pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>;

pub type RootOrAllTechnicalCommittee =
	EitherOfDiverse<EnsureRoot<AccountId>, AllTechnicalCommittee>;
