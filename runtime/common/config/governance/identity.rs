use frame_support::{parameter_types, traits::ConstU32};
use frame_system::EnsureRoot;
use polkadot_primitives::Signature;
use up_common::constants::{currency::deposit, DAYS, MILLIUNIQUE, UNIQUE};

use crate::{
	runtime_common::config::governance, Balance, Balances, Runtime, RuntimeEvent, Treasury,
};

parameter_types! {
	// These do not matter as we forbid non-gov operations with the identity pallet
	pub const BasicDeposit: Balance = 10 * UNIQUE;
	pub const ByteDeposit: Balance = deposit(0, 1);
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
	type MaxRegistrars = MaxRegistrars;
	type MaxSubAccounts = MaxSubAccounts;
	type SubAccountDeposit = SubAccountDeposit;

	type RegistrarOrigin = governance::RootOrTechnicalCommitteeMember;
	type ForceOrigin = governance::RootOrTechnicalCommitteeMember;

	type Slashed = Treasury;
	type WeightInfo = pallet_identity::weights::SubstrateWeight<Runtime>;

	type ByteDeposit = ByteDeposit;
	type IdentityInformation = IdentityInfo<MaxAdditionalFields>;
	type OffchainSignature = Signature;
	type SigningPublicKey = <Signature as Verify>::Signer;
	type UsernameAuthorityOrigin = EnsureRoot<Self::AccountId>;
	type PendingUsernameExpiration = ConstU32<{ 7 * DAYS }>;
	type MaxSuffixLength = ConstU32<7>;
	type MaxUsernameLength = ConstU32<32>;
}
