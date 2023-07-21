use super::*;

parameter_types! {
	pub LaunchPeriod: BlockNumber = gov_conf_get!(launch_period);
	pub VotingPeriod: BlockNumber = gov_conf_get!(voting_period);
	pub FastTrackVotingPeriod: BlockNumber = gov_conf_get!(fast_track_voting_period);
	pub MinimumDeposit: Balance = gov_conf_get!(minimum_deposit);
	pub EnactmentPeriod: BlockNumber = gov_conf_get!(enactment_period);
	pub CooloffPeriod: BlockNumber = gov_conf_get!(cooloof_period);
	pub InstantAllowed: bool = gov_conf_get!(instant_allowed);
	pub MaxVotes: u32 = gov_conf_get!(max_votes);
	pub MaxProposals: u32 = gov_conf_get!(max_proposals);
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
	type CancellationOrigin = RootOrAllTechnicalCommittee;

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
