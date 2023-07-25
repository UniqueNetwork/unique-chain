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

use frame_support::{
	PalletId, parameter_types,
	traits::{
		EnsureOrigin, EqualPrivilegeOnly, EitherOfDiverse, EitherOf, MapSuccess, ConstU16, Polling,
	},
	weights::Weight,
	pallet_prelude::*,
};
use frame_system::{EnsureRoot, EnsureNever};
use sp_runtime::{
	Perbill,
	traits::{AccountIdConversion, ConstU32, Replace, CheckedSub, Convert},
	morph_types,
};
use crate::{
	Runtime, RuntimeOrigin, RuntimeEvent, RuntimeCall, OriginCaller, Preimage, Balances, Treasury,
	GovScheduler, Council, TechnicalCommittee,
};
pub use up_common::{
	constants::{UNIQUE, DAYS, HOURS, MINUTES, CENTIUNIQUE},
	types::{AccountId, Balance, BlockNumber},
};
use pallet_collective::EnsureProportionAtLeast;

pub mod council;
pub use council::*;

pub mod democracy;
pub use democracy::*;

pub mod technical_committee;
pub use technical_committee::*;

pub mod fellowship;
pub use fellowship::*;

pub mod scheduler;
pub use scheduler::*;

impl pallet_gov_origins::Config for Runtime {}

morph_types! {
	/// A `TryMorph` implementation to reduce a scalar by a particular amount, checking for
	/// underflow.
	pub type CheckedReduceBy<N: TypedGet>: TryMorph = |r: N::Type| -> Result<N::Type, ()> {
		r.checked_sub(&N::get()).ok_or(())
	} where N::Type: CheckedSub;
}

parameter_types! {
	pub MaxCollectivesProposalWeight: Weight = Perbill::from_percent(80) * <Runtime as frame_system::Config>::BlockWeights::get().max_block;
}
