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

use frame_support::parameter_types;
use sp_runtime::traits::AccountIdConversion;
use crate::{
	runtime_common::{
		dispatch::CollectionDispatchT,
		config::{substrate::TreasuryModuleId, ethereum::EvmCollectionHelpersAddress},
		weights::CommonWeights,
		RelayChainBlockNumberProvider,
	},
	Runtime, Event, Call, Balances,
};
use up_common::{
	types::{AccountId, Balance, BlockNumber},
	constants::*,
};
use up_data_structs::{
	mapping::{EvmTokenAddressMapping, CrossTokenAddressMapping},
};

#[cfg(feature = "rmrk")]
pub mod rmrk;

#[cfg(feature = "scheduler")]
pub mod scheduler;

parameter_types! {
	pub TreasuryAccountId: AccountId = TreasuryModuleId::get().into_account_truncating();
	pub const CollectionCreationPrice: Balance = 2 * UNIQUE;
}

impl pallet_common::Config for Runtime {
	type WeightInfo = pallet_common::weights::SubstrateWeight<Self>;
	type Event = Event;
	type Currency = Balances;
	type CollectionCreationPrice = CollectionCreationPrice;
	type TreasuryAccountId = TreasuryAccountId;
	type CollectionDispatch = CollectionDispatchT<Self>;

	type EvmTokenAddressMapping = EvmTokenAddressMapping;
	type CrossTokenAddressMapping = CrossTokenAddressMapping<Self::AccountId>;
	type ContractAddress = EvmCollectionHelpersAddress;
}

impl pallet_structure::Config for Runtime {
	type Event = Event;
	type Call = Call;
	type WeightInfo = pallet_structure::weights::SubstrateWeight<Self>;
}

impl pallet_fungible::Config for Runtime {
	type WeightInfo = pallet_fungible::weights::SubstrateWeight<Self>;
}
impl pallet_refungible::Config for Runtime {
	type WeightInfo = pallet_refungible::weights::SubstrateWeight<Self>;
}
impl pallet_nonfungible::Config for Runtime {
	type WeightInfo = pallet_nonfungible::weights::SubstrateWeight<Self>;
}

parameter_types! {
	pub const InflationBlockInterval: BlockNumber = 100; // every time per how many blocks inflation is applied
}

/// Used for the pallet inflation
impl pallet_inflation::Config for Runtime {
	type Currency = Balances;
	type TreasuryAccountId = TreasuryAccountId;
	type InflationBlockInterval = InflationBlockInterval;
	type BlockNumberProvider = RelayChainBlockNumberProvider<Runtime>;
}

impl pallet_unique::Config for Runtime {
	type Event = Event;
	type WeightInfo = pallet_unique::weights::SubstrateWeight<Self>;
	type CommonWeightInfo = CommonWeights<Self>;
	type RefungibleExtensionsWeightInfo = CommonWeights<Self>;
}
