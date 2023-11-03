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

use frame_support::{parameter_types, PalletId};
#[cfg(not(feature = "governance"))]
use frame_system::EnsureRoot;
use pallet_configuration::{
	CollatorSelectionDesiredCollatorsOverride, CollatorSelectionKickThresholdOverride,
	CollatorSelectionLicenseBondOverride,
};
use sp_runtime::Perbill;

#[cfg(feature = "governance")]
use crate::config::governance;
use crate::{
	config::pallets::{MaxCollators, SessionPeriod, TreasuryAccountId},
	Aura, Balance, Balances, BlockNumber, CollatorSelection, Runtime, RuntimeEvent,
	RuntimeHoldReason, Session, SessionKeys,
};
parameter_types! {
	pub const SessionOffset: BlockNumber = 0;
}

impl pallet_session::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type ValidatorId = <Self as frame_system::Config>::AccountId;
	// we don't have stash and controller, thus we don't need the convert as well.
	type ValidatorIdOf = pallet_collator_selection::IdentityCollator;
	type ShouldEndSession = pallet_session::PeriodicSessions<SessionPeriod, SessionOffset>;
	type NextSessionRotation = pallet_session::PeriodicSessions<SessionPeriod, SessionOffset>;
	type SessionManager = CollatorSelection;
	// Essentially just Aura, but lets be pedantic.
	type SessionHandler = <SessionKeys as sp_runtime::traits::OpaqueKeys>::KeyTypeIdProviders;
	type Keys = SessionKeys;
	type WeightInfo = pallet_session::weights::SubstrateWeight<Self>; // ();
}

parameter_types! {
	pub const UncleGenerations: u32 = 0;
}

impl pallet_authorship::Config for Runtime {
	type FindAuthor = pallet_session::FindAccountFromAuthorIndex<Self, Aura>;
	type EventHandler = CollatorSelection;
}

parameter_types! {
	pub LicenseBond: Balance =  CollatorSelectionLicenseBondOverride::<Runtime>::get();
	pub DesiredCollators: u32 = CollatorSelectionDesiredCollatorsOverride::<Runtime>::get();
	pub KickThreshold: BlockNumber = CollatorSelectionKickThresholdOverride::<Runtime>::get();
}

parameter_types! {
	pub const PotId: PalletId = PalletId(*b"PotStake");
	pub const SlashRatio: Perbill = Perbill::from_percent(100);
}

impl pallet_collator_selection::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeHoldReason = RuntimeHoldReason;
	type Currency = Balances;
	// We allow root only to execute privileged collator selection operations.

	// We allow root or the unanimous technical committee
	// to execute privileged collator selection operations.
	#[cfg(feature = "governance")]
	type UpdateOrigin = governance::RootOrAllTechnicalCommittee;

	// If there is no governance,
	// we allow root only to execute privileged collator selection operations.
	#[cfg(not(feature = "governance"))]
	type UpdateOrigin = EnsureRoot<<Self as frame_system::Config>::AccountId>;

	type TreasuryAccountId = TreasuryAccountId;
	type PotId = PotId;
	type MaxCollators = MaxCollators;
	type SlashRatio = SlashRatio;
	type ValidatorId = <Self as frame_system::Config>::AccountId;
	type ValidatorIdOf = pallet_collator_selection::IdentityCollator;
	type ValidatorRegistration = Session;
	type WeightInfo = pallet_collator_selection::weights::SubstrateWeight<Runtime>;
	type DesiredCollators = DesiredCollators;
	type LicenseBond = LicenseBond;
	type KickThreshold = KickThreshold;
}
