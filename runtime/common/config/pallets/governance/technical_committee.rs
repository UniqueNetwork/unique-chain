use super::*;

parameter_types! {
	pub TechnicalMotionDuration: BlockNumber = gov_conf_get!(technical_motion_duration);
	pub TechnicalMaxProposals: u32 = gov_conf_get!(technical_max_proposals);
	pub TechnicalMaxMembers: u32 = gov_conf_get!(technical_max_members);
}

pub type TechnicalCollective = pallet_collective::Instance2;
impl pallet_collective::Config<TechnicalCollective> for Runtime {
	type RuntimeOrigin = RuntimeOrigin;
	type Proposal = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type MotionDuration = TechnicalMotionDuration;
	type MaxProposals = TechnicalMaxProposals;
	type MaxMembers = TechnicalMaxMembers;
	type DefaultVote = pallet_collective::PrimeDefaultVote;
	type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
	type SetMembersOrigin = EnsureRoot<AccountId>;
	type MaxProposalWeight = MaxCollectivesProposalWeight;
}

pub type TechnicalCollectiveMembership = pallet_membership::Instance2;
impl pallet_membership::Config<TechnicalCollectiveMembership> for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type AddOrigin = RootOrAllCouncil;
	type RemoveOrigin = RootOrAllCouncil;
	type SwapOrigin = RootOrAllCouncil;
	type ResetOrigin = EnsureRoot<AccountId>;
	type PrimeOrigin = EnsureRoot<AccountId>;
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
