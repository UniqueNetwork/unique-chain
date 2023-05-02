use sp_runtime::Perbill;
use frame_support::{
	parameter_types,
	weights::{Weight, constants::WEIGHT_REF_TIME_PER_SECOND},
};
use cumulus_primitives_core::relay_chain::MAX_POV_SIZE;
use crate::types::{BlockNumber, Balance};

pub const MILLISECS_PER_BLOCK: u64 = 12000;
pub const MILLISECS_PER_RELAY_BLOCK: u64 = 6000;

pub const SLOT_DURATION: u64 = MILLISECS_PER_BLOCK;

// These time units are defined in number of blocks.
pub const MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_BLOCK as BlockNumber);
pub const HOURS: BlockNumber = MINUTES * 60;
pub const DAYS: BlockNumber = HOURS * 24;

// These time units are defined in number of relay blocks.
pub const RELAY_MINUTES: BlockNumber = 60_000 / (MILLISECS_PER_RELAY_BLOCK as BlockNumber);
pub const RELAY_HOURS: BlockNumber = RELAY_MINUTES * 60;
pub const RELAY_DAYS: BlockNumber = RELAY_HOURS * 24;

pub const MICROUNIQUE: Balance = 1_000_000_000_000;
pub const MILLIUNIQUE: Balance = 1_000 * MICROUNIQUE;
pub const CENTIUNIQUE: Balance = 10 * MILLIUNIQUE;
pub const UNIQUE: Balance = 100 * CENTIUNIQUE;

/// Minimum balance required to create or keep an account open.
pub const EXISTENTIAL_DEPOSIT: u128 = 0;
/// Amount of Balance reserved for candidate registration.
pub const GENESIS_LICENSE_BOND: u128 = 1_000_000_000_000 * UNIQUE;
/// Amount of maximum collators for Collator Selection.
pub const MAX_COLLATORS: u32 = 10;
/// How long a periodic session lasts in blocks.
pub const SESSION_LENGTH: BlockNumber = HOURS;

// Targeting 0.1 UNQ per transfer
pub const WEIGHT_TO_FEE_COEFF: u64 = /*<weight2fee>*/78_240_337_566_697_829/*</weight2fee>*/;

// Targeting 0.15 UNQ per transfer via ETH
pub const MIN_GAS_PRICE: u64 = /*<mingasprice>*/1_031_842_664_630/*</mingasprice>*/;

/// We assume that ~10% of the block weight is consumed by `on_initalize` handlers.
/// This is used to limit the maximal weight of a single extrinsic.
pub const AVERAGE_ON_INITIALIZE_RATIO: Perbill = Perbill::from_percent(10);
/// We allow `Normal` extrinsics to fill up the block up to 75%, the rest can be used
/// by  Operational  extrinsics.
pub const NORMAL_DISPATCH_RATIO: Perbill = Perbill::from_percent(75);
/// We allow for 2 seconds of compute with a 6 second average block time.
pub const MAXIMUM_BLOCK_WEIGHT: Weight = Weight::from_parts(
	WEIGHT_REF_TIME_PER_SECOND.saturating_div(2),
	MAX_POV_SIZE as u64,
);

parameter_types! {
	pub const TransactionByteFee: Balance = 501 * MICROUNIQUE / 2;
}
