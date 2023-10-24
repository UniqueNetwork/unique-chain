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

use alloc::string::{String, ToString};

use frame_support::{
	parameter_types,
	traits::{ConstU32, ConstU64, Currency},
};
use sp_arithmetic::Perbill;
use sp_runtime::traits::{AccountIdConversion, BlockNumberProvider};
use up_common::{
	constants::*,
	types::{AccountId, Balance, BlockNumber},
};
use up_data_structs::mapping::{CrossTokenAddressMapping, EvmTokenAddressMapping};

#[cfg(feature = "governance")]
use crate::runtime_common::config::governance;
use crate::{
	runtime_common::{
		config::{ethereum::EvmCollectionHelpersAddress, substrate::TreasuryModuleId},
		dispatch::CollectionDispatchT,
		weights::CommonWeights,
		RelayChainBlockNumberProvider,
	},
	Balances, Runtime, RuntimeCall, RuntimeEvent, DECIMALS, TOKEN_SYMBOL, VERSION,
};

#[cfg(feature = "foreign-assets")]
pub mod foreign_asset;

#[cfg(feature = "app-promotion")]
pub mod app_promotion;

#[cfg(feature = "collator-selection")]
pub mod collator_selection;

#[cfg(feature = "preimage")]
pub mod preimage;

parameter_types! {
	pub const CollectionCreationPrice: Balance = 2 * UNIQUE;
	pub TreasuryAccountId: AccountId = TreasuryModuleId::get().into_account_truncating();
}

impl pallet_common::Config for Runtime {
	type WeightInfo = pallet_common::weights::SubstrateWeight<Self>;
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type CollectionCreationPrice = CollectionCreationPrice;
	type TreasuryAccountId = TreasuryAccountId;
	type CollectionDispatch = CollectionDispatchT<Self>;

	type EvmTokenAddressMapping = EvmTokenAddressMapping;
	type CrossTokenAddressMapping = CrossTokenAddressMapping<Self::AccountId>;
	type ContractAddress = EvmCollectionHelpersAddress;
}

impl pallet_structure::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
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
	pub const Decimals: u8 = DECIMALS;
	pub Name: String = String::from_utf8_lossy(VERSION.impl_name.as_ref()).to_string();
	pub Symbol: String = TOKEN_SYMBOL.to_string();
}
impl pallet_balances_adapter::Config for Runtime {
	type Inspect = Balances;
	type Mutate = Balances;
	type CurrencyBalance = <Balances as Currency<Self::AccountId>>::Balance;
	type Decimals = Decimals;
	type Name = Name;
	type Symbol = Symbol;
	type WeightInfo = pallet_balances::weights::SubstrateWeight<Self>;
}

parameter_types! {
	pub const InflationBlockInterval: BlockNumber = 100; // every time per how many blocks inflation is applied
}

/// Pallet-inflation needs block number in on_initialize, where there is no `validation_data` exists yet
pub struct OnInitializeBlockNumberProvider;
impl BlockNumberProvider for OnInitializeBlockNumberProvider {
	type BlockNumber = BlockNumber;

	fn current_block_number() -> Self::BlockNumber {
		use hex_literal::hex;
		use parity_scale_codec::Decode;
		use sp_io::storage;
		// TODO: Replace with the following code after https://github.com/paritytech/polkadot-sdk/commit/3ea497b5a0fdda252f9c5a3c257cfaf8685f02fd lands
		// <cumulus_pallet_parachain_system::Pallet<Runtime>>::last_relay_block_number()

		// ParachainSystem.LastRelayChainBlockNumber
		let Some(encoded) = storage::get(&hex!("45323df7cc47150b3930e2666b0aa313a2bca190d36bd834cc73a38fc213ecbd")) else {
			// First parachain block
			return Default::default()
		};
		BlockNumber::decode(&mut encoded.as_ref())
			.expect("typeof(RelayBlockNumber) == typeof(BlockNumber) == u32; qed")
	}
}

/// Used for the pallet inflation
impl pallet_inflation::Config for Runtime {
	type Currency = Balances;
	type TreasuryAccountId = TreasuryAccountId;
	type InflationBlockInterval = InflationBlockInterval;
	type OnInitializeBlockNumberProvider = OnInitializeBlockNumberProvider;
}

impl pallet_unique::Config for Runtime {
	type WeightInfo = pallet_unique::weights::SubstrateWeight<Self>;
	type CommonWeightInfo = CommonWeights<Self>;
	type StructureWeightInfo = pallet_structure::weights::SubstrateWeight<Self>;
	type RefungibleExtensionsWeightInfo = CommonWeights<Self>;
}

parameter_types! {
	pub AppPromotionDailyRate: Perbill = Perbill::from_rational(5u32, 10_000);
	pub const MaxCollators: u32 = MAX_COLLATORS;
	pub const LicenseBond: Balance = GENESIS_LICENSE_BOND;

	pub const DayRelayBlocks: BlockNumber = RELAY_DAYS;
}

#[cfg(not(feature = "session-test-timings"))]
parameter_types! {
	pub const SessionPeriod: BlockNumber = SESSION_LENGTH;
}

#[cfg(feature = "session-test-timings")]
parameter_types! {
	pub const SessionPeriod: BlockNumber = 5 * MINUTES;
}

impl pallet_configuration::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type DefaultWeightToFeeCoefficient = ConstU64<{ up_common::constants::WEIGHT_TO_FEE_COEFF }>;
	type DefaultMinGasPrice = ConstU64<{ up_common::constants::MIN_GAS_PRICE }>;
	type DefaultCollatorSelectionMaxCollators = MaxCollators;
	type DefaultCollatorSelectionKickThreshold = SessionPeriod;
	type DefaultCollatorSelectionLicenseBond = LicenseBond;
	type MaxXcmAllowedLocations = ConstU32<16>;
	type AppPromotionDailyRate = AppPromotionDailyRate;
	type DayRelayBlocks = DayRelayBlocks;
	type WeightInfo = pallet_configuration::weights::SubstrateWeight<Self>;
}

impl pallet_maintenance::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;

	type RuntimeCall = RuntimeCall;

	#[cfg(feature = "governance")]
	type ManagerOrigin = governance::RootOrTechnicalCommitteeMember;

	#[cfg(not(feature = "governance"))]
	type ManagerOrigin = frame_system::EnsureRoot<AccountId>;

	type PreimageOrigin = frame_system::EnsureRoot<AccountId>;

	#[cfg(feature = "preimage")]
	type Preimages = crate::Preimage;
	#[cfg(not(feature = "preimage"))]
	type Preimages = ();
	type WeightInfo = pallet_maintenance::weights::SubstrateWeight<Self>;
}
