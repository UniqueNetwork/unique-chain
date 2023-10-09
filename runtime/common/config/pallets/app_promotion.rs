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
use sp_arithmetic::Perbill;
use up_common::{
	constants::{DAYS, RELAY_DAYS, UNIQUE},
	types::Balance,
};

use crate::{
	runtime_common::config::pallets::{RelayChainBlockNumberProvider, TreasuryAccountId},
	Balances, BlockNumber, EvmContractHelpers, Maintenance, Runtime, RuntimeEvent, Unique,
};

parameter_types! {
	pub const AppPromotionId: PalletId = PalletId(*b"appstake");
	pub const RecalculationInterval: BlockNumber = RELAY_DAYS;
	pub const PendingInterval: BlockNumber = 7 * DAYS;
	pub const Nominal: Balance = UNIQUE;
	pub const HoldAndFreezeIdentifier: [u8; 16] = *b"appstakeappstake";
	pub IntervalIncome: Perbill = Perbill::from_rational(5u32, 10_000);
	pub MaintenanceMode: bool =  Maintenance::is_enabled();
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
	type Nominal = Nominal;
	type IntervalIncome = IntervalIncome;
	type RuntimeEvent = RuntimeEvent;
	type FreezeIdentifier = HoldAndFreezeIdentifier;
	type IsMaintenanceModeEnabled = MaintenanceMode;
}
