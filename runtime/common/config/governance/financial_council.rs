use super::*;

parameter_types! {
	pub FinancialCouncilMaxProposals: u32 = 100;
	pub FinancialCouncilMaxMembers: u32 = 100;
}

#[cfg(not(feature = "gov-test-timings"))]
use crate::governance_timings::financial_council as financial_council_timings;

#[cfg(feature = "gov-test-timings")]
pub mod financial_council_timings {
	use super::*;

	parameter_types! {
		pub FinancialCouncilMotionDuration: BlockNumber = 35;
	}
}

pub type FinancialCollective = pallet_collective::Instance3;
impl pallet_collective::Config<FinancialCollective> for Runtime {
	type RuntimeOrigin = RuntimeOrigin;
	type Proposal = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type MotionDuration = financial_council_timings::FinancialCouncilMotionDuration;
	type MaxProposals = FinancialCouncilMaxProposals;
	type MaxMembers = FinancialCouncilMaxMembers;
	type DefaultVote = pallet_collective::PrimeDefaultVote;
	type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
	type SetMembersOrigin = EnsureRoot<AccountId>;
	type MaxProposalWeight = MaxCollectivesProposalWeight;
}

pub type FinancialCollectiveMembership = pallet_membership::Instance3;
impl pallet_membership::Config<FinancialCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = RootOrMoreThanHalfCouncil;
	type RemoveOrigin = RootOrMoreThanHalfCouncil;
	type SwapOrigin = RootOrMoreThanHalfCouncil;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = RootOrMoreThanHalfCouncil;
	type MembershipInitialized = FinancialCouncil;
	type MembershipChanged = FinancialCouncil;
	type MaxMembers = FinancialCouncilMaxMembers;
	type WeightInfo = pallet_membership::weights::SubstrateWeight<Runtime>;
}

pub type FinancialCouncilMember = pallet_collective::EnsureMember<AccountId, FinancialCollective>;

pub type RootOrFinancialCouncilMember =
	EitherOfDiverse<EnsureRoot<AccountId>, FinancialCouncilMember>;

pub type AllFinancialCouncil =
	pallet_collective::EnsureProportionAtLeast<AccountId, FinancialCollective, 1, 1>;

pub type RootOrAllFinancialCouncil = EitherOfDiverse<EnsureRoot<AccountId>, AllFinancialCouncil>;
