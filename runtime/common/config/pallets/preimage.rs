use frame_support::parameter_types;
use frame_system::EnsureRoot;
use crate::{AccountId, Balance, Balances, Runtime, RuntimeEvent};
use up_common::constants::*;

parameter_types! {
	pub PreimageBaseDeposit: Balance = 1000 * UNIQUE;
}

impl pallet_preimage::Config for Runtime {
	type WeightInfo = pallet_preimage::weights::SubstrateWeight<Runtime>;
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type ManagerOrigin = EnsureRoot<AccountId>;
	type BaseDeposit = PreimageBaseDeposit;
	type ByteDeposit = TransactionByteFee;
}
