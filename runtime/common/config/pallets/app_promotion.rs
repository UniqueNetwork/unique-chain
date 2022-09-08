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

use crate::{
	runtime_common::config::pallets::{TreasuryAccountId, RelayChainBlockNumberProvider},
	Runtime, Balances, BlockNumber, Unique, Event, EvmContractHelpers,
};

use frame_support::{parameter_types, PalletId};
use sp_arithmetic::Perbill;
use up_common::{
	constants::{UNIQUE, RELAY_DAYS},
	types::Balance,
};

#[cfg(all(not(feature = "unique-runtime"), not(feature = "quartz-runtime")))]
parameter_types! {
	pub const AppPromotionId: PalletId = PalletId(*b"appstake");
	pub const RecalculationInterval: BlockNumber = 20;
	pub const PendingInterval: BlockNumber = 10;
	pub const Nominal: Balance = UNIQUE;
	// pub const Day: BlockNumber = DAYS;
	pub IntervalIncome: Perbill = Perbill::from_rational(RecalculationInterval::get(), RELAY_DAYS) * Perbill::from_rational(5u32, 10_000);
}

#[cfg(any(feature = "unique-runtime", feature = "quartz-runtime"))]
parameter_types! {
	pub const AppPromotionId: PalletId = PalletId(*b"appstake");
	pub const RecalculationInterval: BlockNumber = RELAY_DAYS;
	pub const PendingInterval: BlockNumber = 7 * RELAY_DAYS;
	pub const Nominal: Balance = UNIQUE;
	// pub const Day: BlockNumber = RELAY_DAYS;
	pub IntervalIncome: Perbill = Perbill::from_rational(5u32, 10_000);
}

impl pallet_app_promotion::Config for Runtime {
	type PalletId = AppPromotionId;
	type CollectionHandler = Unique;
	type ContractHandler = EvmContractHelpers;
	type Currency = Balances;
	type WeightInfo = pallet_app_promotion::weights::SubstrateWeight<Self>;
	type TreasuryAccountId = TreasuryAccountId;
	type RelayBlockNumberProvider = RelayChainBlockNumberProvider<Runtime>;
	type RecalculationInterval = RecalculationInterval;
	type PendingInterval = PendingInterval;
	// type Day = Day;
	type Nominal = Nominal;
	type IntervalIncome = IntervalIncome;
	type Event = Event;
}
