use frame_support::parameter_types;
pub use up_common::{
	constants::{DAYS, HOURS, MINUTES},
	types::BlockNumber,
};

pub mod council {
	use super::*;

	parameter_types! {
		pub CouncilMotionDuration: BlockNumber = 1 * HOURS;
	}
}

pub mod democracy {
	use super::*;

	parameter_types! {
		pub LaunchPeriod: BlockNumber = 1 * HOURS;
		pub VotingPeriod: BlockNumber = 1 * HOURS;
		pub FastTrackVotingPeriod: BlockNumber = 10 * MINUTES;
		pub EnactmentPeriod: BlockNumber = 5 * MINUTES;
		pub CooloffPeriod: BlockNumber = 1 * HOURS;
	}
}

pub mod fellowship {
	use super::*;

	parameter_types! {
		pub UndecidingTimeout: BlockNumber = 1 * HOURS;
	}

	pub mod track {
		use super::*;

		pub mod democracy_proposals {
			use super::*;

			pub const PREPARE_PERIOD: BlockNumber = 5 * MINUTES;
			pub const DECISION_PERIOD: BlockNumber = 1 * HOURS;
			pub const CONFIRM_PERIOD: BlockNumber = 10 * MINUTES;
			pub const MIN_ENACTMENT_PERIOD: BlockNumber = 1 * MINUTES;
		}
	}
}

pub mod technical_committee {
	use super::*;

	parameter_types! {
		pub TechnicalMotionDuration: BlockNumber = 15 * MINUTES;
	}
}

pub mod financial_council {
	use super::*;

	parameter_types! {
		pub FinancialCouncilMotionDuration: BlockNumber = 15 * MINUTES;
	}
}
