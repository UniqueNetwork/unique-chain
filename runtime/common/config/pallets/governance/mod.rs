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
		EnsureOrigin, EqualPrivilegeOnly, EitherOfDiverse, EitherOf, MapSuccess, ConstU16,
		TryMapSuccess, Polling,
	},
	weights::Weight,
	pallet_prelude::*,
};
use frame_system::EnsureRoot;
use sp_runtime::{
	Perbill,
	traits::{AccountIdConversion, ConstU32, Replace},
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

pub mod council_collective;
pub use council_collective::*;

pub mod democracy;

pub mod technical_committee;
pub use technical_committee::*;

pub mod fellowship;
pub use fellowship::*;

pub mod origins;
pub use origins::*;

pub mod types;
pub use types::*;

pub mod scheduler;
pub use scheduler::*;

impl origins::Config for Runtime {}
