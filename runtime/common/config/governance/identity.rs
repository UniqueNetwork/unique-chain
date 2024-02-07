use frame_support::parameter_types;
use up_common::constants::{MILLIUNIQUE, UNIQUE};

use crate::{
	runtime_common::config::governance, Balance, Balances, Runtime, RuntimeEvent, Treasury,
};

parameter_types! {
	// These do not matter as we forbid non-gov operations with the identity pallet
	pub const BasicDeposit: Balance = 10 * UNIQUE;
	pub const FieldDeposit: Balance = 25 * MILLIUNIQUE;
	pub const SubAccountDeposit: Balance = 2 * UNIQUE;
	pub const MaxSubAccounts: u32 = 100;
	pub const MaxAdditionalFields: u32 = 100;
	pub const MaxRegistrars: u32 = 20;
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

	type RegistrarOrigin = governance::RootOrTechnicalCommitteeMember;
	type ForceOrigin = governance::RootOrTechnicalCommitteeMember;

	type Slashed = Treasury;
	type WeightInfo = pallet_identity::weights::SubstrateWeight<Runtime>;
}
