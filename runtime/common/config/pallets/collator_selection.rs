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
use frame_system::EnsureRoot;
use crate::{
	Balance, Balances, BlockNumber, Runtime, RuntimeEvent, Aura, Session, SessionKeys,
	CollatorSelection, Treasury,
	config::pallets::{MaxCollators, SessionPeriod, TreasuryAccountId},
};

#[cfg(feature = "governance")]
use crate::config::pallets::governance;

#[cfg(not(feature = "governance"))]
use crate::AccountId;

use sp_runtime::Perbill;
use up_common::constants::{UNIQUE, MILLIUNIQUE};
use pallet_configuration::{
	CollatorSelectionKickThresholdOverride, CollatorSelectionLicenseBondOverride,
	CollatorSelectionDesiredCollatorsOverride,
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
	// These do not matter as we forbid non-sudo operations with the identity pallet
	pub const BasicDeposit: Balance = 10 * UNIQUE;
	pub const FieldDeposit: Balance = 25 * MILLIUNIQUE;
	pub const SubAccountDeposit: Balance = 2 * UNIQUE;
	pub const MaxSubAccounts: u32 = 100;
	pub const MaxAdditionalFields: u32 = 100;
	pub const MaxRegistrars: u32 = 20;
	pub const LicenceBondIdentifier: [u8; 16] = *b"licenceidentifie";
	pub LicenseBond: Balance =  CollatorSelectionLicenseBondOverride::<Runtime>::get();
	pub DesiredCollators: u32 = CollatorSelectionDesiredCollatorsOverride::<Runtime>::get();
	pub KickThreshold: BlockNumber = CollatorSelectionKickThresholdOverride::<Runtime>::get();
}

impl pallet_identity::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type BasicDeposit = BasicDeposit;
	type FieldDeposit = FieldDeposit;
	type MaxAdditionalFields = MaxAdditionalFields;
	type MaxRegistrars = MaxRegistrars;
	type MaxSubAccounts = MaxSubAccounts;
	type SubAccountDeposit = SubAccountDeposit;
	type RegistrarOrigin = EnsureRoot<<Self as frame_system::Config>::AccountId>;
	type ForceOrigin = EnsureRoot<<Self as frame_system::Config>::AccountId>;
	type Slashed = Treasury;
	type WeightInfo = pallet_identity::weights::SubstrateWeight<Runtime>;
}

parameter_types! {
	pub const PotId: PalletId = PalletId(*b"PotStake");
	pub const SlashRatio: Perbill = Perbill::from_percent(100);
}

impl pallet_collator_selection::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	// We allow root only to execute privileged collator selection operations.

	// We allow root or the unanimous technical committee
	// to execute privileged collator selection operations.
	#[cfg(feature = "governance")]
	type UpdateOrigin = governance::RootOrAllTechnicalCommittee;

	// If there is no governance,
	// we allow root only to execute privileged collator selection operations.
	#[cfg(not(feature = "governance"))]
	type UpdateOrigin = EnsureRoot<AccountId>;

	type TreasuryAccountId = TreasuryAccountId;
	type PotId = PotId;
	type MaxCollators = MaxCollators;
	type SlashRatio = SlashRatio;
	type ValidatorId = <Self as frame_system::Config>::AccountId;
	type ValidatorIdOf = pallet_collator_selection::IdentityCollator;
	type ValidatorRegistration = Session;
	type WeightInfo = pallet_collator_selection::weights::SubstrateWeight<Runtime>;
	type LicenceBondIdentifier = LicenceBondIdentifier;
	type DesiredCollators = DesiredCollators;
	type LicenseBond = LicenseBond;
	type KickThreshold = KickThreshold;
}
