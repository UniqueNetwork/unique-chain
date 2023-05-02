use crate::{
	runtime_common::config::pallets::{TreasuryAccountId, RelayChainBlockNumberProvider},
	Runtime, Balances, BlockNumber, Unique, RuntimeEvent, EvmContractHelpers,
};

use frame_support::{parameter_types, PalletId};
use sp_arithmetic::Perbill;
use up_common::{
	constants::{UNIQUE, DAYS, RELAY_DAYS},
	types::Balance,
};

parameter_types! {
	pub const AppPromotionId: PalletId = PalletId(*b"appstake");
	pub const RecalculationInterval: BlockNumber = RELAY_DAYS;
	pub const PendingInterval: BlockNumber = 7 * DAYS;
	pub const Nominal: Balance = UNIQUE;
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
	type Nominal = Nominal;
	type IntervalIncome = IntervalIncome;
	type RuntimeEvent = RuntimeEvent;
}
