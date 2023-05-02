use frame_support::{weights::Weight, parameter_types};
use crate::{Runtime, RuntimeEvent, XcmpQueue, DmpQueue};
use up_common::constants::*;

parameter_types! {
	pub const ReservedDmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT.saturating_div(4);
	pub const ReservedXcmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT.saturating_div(4);
}

impl cumulus_pallet_parachain_system::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type SelfParaId = parachain_info::Pallet<Self>;
	type OnSystemEvent = ();
	// type DownwardMessageHandlers = cumulus_primitives_utility::UnqueuedDmpAsParent<
	// 	MaxDownwardMessageWeight,
	// 	XcmExecutor<XcmConfig>,
	// 	Call,
	// >;
	type OutboundXcmpMessageSource = XcmpQueue;
	type DmpMessageHandler = DmpQueue;
	type ReservedDmpWeight = ReservedDmpWeight;
	type ReservedXcmpWeight = ReservedXcmpWeight;
	type XcmpMessageHandler = XcmpQueue;
	type CheckAssociatedRelayNumber = cumulus_pallet_parachain_system::RelayNumberStrictlyIncreases;
}

impl parachain_info::Config for Runtime {}

impl cumulus_pallet_aura_ext::Config for Runtime {}
