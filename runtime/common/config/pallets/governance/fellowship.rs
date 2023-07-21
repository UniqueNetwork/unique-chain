use crate::{
	Preimage, Treasury, RuntimeCall, RuntimeEvent, GovScheduler as Scheduler, FellowshipReferenda,
};
use super::*;

impl pallet_referenda::Config for Runtime {
	type WeightInfo = pallet_referenda::weights::SubstrateWeight<Self>;
	type RuntimeCall = RuntimeCall;
	type RuntimeEvent = RuntimeEvent;
	type Scheduler = Scheduler;
	type Currency = Balances;
	type SubmitOrigin = pallet_ranked_collective::EnsureMember<Runtime, (), 1>;
	type CancelOrigin = AllTechnicalCommittee;
	type KillOrigin = AllTechnicalCommittee;
	type Slash = Treasury;
	type Votes = pallet_ranked_collective::Votes;
	type Tally = pallet_ranked_collective::TallyOf<Runtime>;
	type SubmissionDeposit = SubmissionDeposit;
	type MaxQueued = ConstU32<100>;
	type UndecidingTimeout = UndecidingTimeout;
	type AlarmInterval = AlarmInterval;
	type Tracks = TracksInfo;
	type Preimages = Preimage;
}

impl pallet_ranked_collective::Config for Runtime {
	type WeightInfo = pallet_ranked_collective::weights::SubstrateWeight<Self>;
	type RuntimeEvent = RuntimeEvent;
	// Promotion is by any of:
	// - Root can demote arbitrarily.
	// - the FellowshipAdmin origin (i.e. token holder referendum);
	// - a vote by the rank *above* the new rank.
	type PromoteOrigin = FellowshipPromoteDemoteOrigin<Self>;
	// Demotion is by any of:
	// - Root can demote arbitrarily.
	// - the FellowshipAdmin origin (i.e. token holder referendum);
	// - a vote by the rank two above the current rank.
	type DemoteOrigin = FellowshipPromoteDemoteOrigin<Self>;
	type Polls = FellowshipReferenda;
	type MinRankOfClass = ClassToRankMapper<Self, ()>;
	type VoteWeight = pallet_ranked_collective::Geometric;
}
