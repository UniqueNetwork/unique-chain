// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

use cumulus_primitives_core::AggregateMessageOrigin;
use frame_support::{parameter_types, traits::EnqueueWithOrigin, weights::Weight};
use up_common::constants::*;

use crate::{MessageQueue, Runtime, RuntimeEvent, XcmpQueue};

parameter_types! {
	pub const RelayMsgOrigin: AggregateMessageOrigin = AggregateMessageOrigin::Parent;
	pub const ReservedDmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT.saturating_div(4);
	pub const ReservedXcmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT.saturating_div(4);
}

impl cumulus_pallet_parachain_system::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type SelfParaId = staging_parachain_info::Pallet<Self>;
	type OnSystemEvent = ();
	type WeightInfo = cumulus_pallet_parachain_system::weights::SubstrateWeight<Self>;
	type OutboundXcmpMessageSource = XcmpQueue;
	type DmpQueue = EnqueueWithOrigin<MessageQueue, RelayMsgOrigin>;
	type ReservedDmpWeight = ReservedDmpWeight;
	type ReservedXcmpWeight = ReservedXcmpWeight;
	type XcmpMessageHandler = XcmpQueue;
	#[cfg(not(feature = "lookahead"))]
	type CheckAssociatedRelayNumber = cumulus_pallet_parachain_system::RelayNumberStrictlyIncreases;
	#[cfg(feature = "lookahead")]
	type CheckAssociatedRelayNumber =
		cumulus_pallet_parachain_system::RelayNumberMonotonicallyIncreases;
	#[cfg(feature = "lookahead")]
	type ConsensusHook = ConsensusHook;
}

impl staging_parachain_info::Config for Runtime {}

impl cumulus_pallet_aura_ext::Config for Runtime {}

/// Maximum number of blocks simultaneously accepted by the Runtime, not yet included
/// into the relay chain.
#[cfg(feature = "lookahead")]
const UNINCLUDED_SEGMENT_CAPACITY: u32 = 3;
/// How many parachain blocks are processed by the relay chain per parent. Limits the
/// number of blocks authored per slot.
#[cfg(feature = "lookahead")]
const BLOCK_PROCESSING_VELOCITY: u32 = 2;
#[cfg(feature = "lookahead")]
pub type ConsensusHook = cumulus_pallet_aura_ext::FixedVelocityConsensusHook<
	Runtime,
	{ MILLISECS_PER_RELAY_BLOCK as u32 },
	BLOCK_PROCESSING_VELOCITY,
	UNINCLUDED_SEGMENT_CAPACITY,
>;
