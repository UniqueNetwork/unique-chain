use super::*;

parameter_types! {
	pub MinimumDeposit: Balance = 0;
	pub InstantAllowed: bool = false;
	pub MaxVotes: u32 = 100;
	pub MaxProposals: u32 = 100;
}

#[cfg(not(feature = "gov-test-timings"))]
use crate::governance_timings::democracy as democracy_timings;

#[cfg(feature = "gov-test-timings")]
pub mod democracy_timings {
	use super::*;

	parameter_types! {
		pub LaunchPeriod: BlockNumber = 35;
		pub VotingPeriod: BlockNumber = 35;
		pub FastTrackVotingPeriod: BlockNumber = 5;
		pub EnactmentPeriod: BlockNumber = 40;
		pub CooloffPeriod: BlockNumber = 35;
	}
}

impl pallet_democracy::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type Slash = Treasury;
	type Scheduler = Scheduler;
	type PalletsOrigin = OriginCaller;
	type Preimages = Preimage;
	type WeightInfo = pallet_democracy::weights::SubstrateWeight<Runtime>;

	/// The period between a proposal being approved and enacted.
	type EnactmentPeriod = democracy_timings::EnactmentPeriod;

	/// The minimum period of vote locking.
	type VoteLockingPeriod = democracy_timings::EnactmentPeriod;

	/// How often new public referenda are launched.
	type LaunchPeriod = democracy_timings::LaunchPeriod;

	/// How long the referendum will last.
	type VotingPeriod = democracy_timings::VotingPeriod;

	/// The minimum amount to be used as a deposit for the Fellowship referendum proposal.
	type MinimumDeposit = MinimumDeposit;

	type SubmitOrigin = EitherOf<
		MapSuccess<EnsureRoot<Self::AccountId>, Replace<fellowship::FellowshipAccountId>>,
		EnsureFellowshipProposition,
	>;

	type ExternalOrigin = EnsureNever<Self::AccountId>;
	type ExternalMajorityOrigin = EnsureNever<Self::AccountId>;

	/// Root (for the initial referendums)
	/// or >50% of council can have the next scheduled referendum be a straight default-carries
	/// (NTB) vote (SuperMajorityAgainst).
	type ExternalDefaultOrigin = RootOrMoreThanHalfCouncil;

	/// A unanimous technical committee can have an ExternalMajority/ExternalDefault vote
	/// be tabled immediately and with a shorter voting/enactment period.
	type FastTrackOrigin = RootOrAllTechnicalCommittee;

	/// Origin from which the next referendum may be tabled to vote immediately and asynchronously.
	/// Can set a faster voting period.
	type InstantOrigin = EnsureNever<Self::AccountId>;
	type InstantAllowed = InstantAllowed;

	/// Minimum voting period allowed for a fast-track referendum.
	type FastTrackVotingPeriod = democracy_timings::FastTrackVotingPeriod;

	/// To cancel a proposal which has been passed, the technical committee must be unanimous or
	/// Root must agree.
	type CancellationOrigin = RootOrAllTechnicalCommittee;

	/// To cancel a proposal before it has been passed, the technical committee must be unanimous or
	/// Root must agree.
	type CancelProposalOrigin = RootOrAllTechnicalCommittee;

	/// A unanimous council or Root can blacklist a proposal permanently.
	type BlacklistOrigin = RootOrAllCouncil;

	// Any single technical committee member may veto a coming council proposal, however they can
	// only do it once and it lasts only for the cooloff period.
	type VetoOrigin = TechnicalCommitteeMember;
	type CooloffPeriod = democracy_timings::CooloffPeriod;

	/// The maximum number of votes for an account
	type MaxVotes = MaxVotes;

	/// The maximum number of public proposals that can exist at any time.
	type MaxProposals = MaxProposals;

	/// The maximum number of deposits a public proposal may have at any time.
	type MaxDeposits = ConstU32<100>;

	/// The maximum number of items that can be blacklisted.
	type MaxBlacklisted = ConstU32<100>;
}
