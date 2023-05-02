use frame_support::{match_types, traits::Everything};
use xcm::latest::{Junctions::*, MultiLocation};
use xcm_builder::{
	AllowKnownQueryResponses, AllowSubscriptionsFrom, TakeWeightCredit,
	AllowTopLevelPaidExecutionFrom,
};

use crate::PolkadotXcm;

match_types! {
	pub type ParentOrSiblings: impl Contains<MultiLocation> = {
		MultiLocation { parents: 1, interior: Here } |
		MultiLocation { parents: 1, interior: X1(_) }
	};
}

pub type Barrier = (
	TakeWeightCredit,
	AllowTopLevelPaidExecutionFrom<Everything>,
	// Expected responses are OK.
	AllowKnownQueryResponses<PolkadotXcm>,
	// Subscriptions for version tracking are OK.
	AllowSubscriptionsFrom<ParentOrSiblings>,
);
