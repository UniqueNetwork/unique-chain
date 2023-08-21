use frame_support::parameter_types;
pub use up_common::{
	constants::{DAYS, HOURS, MINUTES},
	types::BlockNumber,
};

pub mod council {
	use super::*;

	parameter_types! {
		pub CouncilMotionDuration: BlockNumber = 7 * DAYS;
	}
}

pub mod democracy {
	use super::*;

	parameter_types! {
		pub LaunchPeriod: BlockNumber = 7 * DAYS;
		pub VotingPeriod: BlockNumber = 7 * DAYS;
		pub FastTrackVotingPeriod: BlockNumber = 1 * DAYS;
		pub EnactmentPeriod: BlockNumber = 8 * DAYS;
		pub CooloffPeriod: BlockNumber = 7 * DAYS;
	}
}

pub mod fellowship {
	use super::*;

	parameter_types! {
		pub UndecidingTimeout: BlockNumber = 7 * DAYS;
	}

	pub mod track {
		use super::*;

		pub mod democracy_proposals {
			use super::*;

			pub const PREPARE_PERIOD: BlockNumber = 30 * MINUTES;
			pub const DECISION_PERIOD: BlockNumber = 7 * DAYS;
			pub const CONFIRM_PERIOD: BlockNumber = 2 * DAYS;
			pub const MIN_ENACTMENT_PERIOD: BlockNumber = 1 * MINUTES;
		}
	}
}

pub mod technical_committee {
	use super::*;

	parameter_types! {
		pub TechnicalMotionDuration: BlockNumber = 3 * DAYS;
	}
}
