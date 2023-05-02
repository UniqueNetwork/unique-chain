use frame_support::{
	parameter_types,
	traits::{Contains, Everything},
};
use frame_system::EnsureSigned;
use orml_traits::{location::AbsoluteReserveProvider, parameter_type_with_key};
use sp_runtime::traits::Convert;
use xcm::latest::{Weight, Junction::*, Junctions::*, MultiLocation};
use xcm_executor::XcmExecutor;
use sp_std::{vec, vec::Vec};
use pallet_foreign_assets::{CurrencyId, NativeCurrency};
use crate::{
	Runtime, RuntimeEvent, RelayChainBlockNumberProvider,
	runtime_common::config::{
		xcm::{
			SelfLocation, Weigher, XcmExecutorConfig, UniversalLocation,
			xcm_assets::{CurrencyIdConvert},
		},
		pallets::TreasuryAccountId,
		substrate::{MaxLocks, MaxReserves},
	},
};

use up_common::{
	types::{AccountId, Balance},
	constants::*,
};

// Signed version of balance
pub type Amount = i128;

parameter_types! {
	pub const MinVestedTransfer: Balance = 10 * UNIQUE;
	pub const MaxVestingSchedules: u32 = 28;

	pub const BaseXcmWeight: Weight = Weight::from_parts(100_000_000, 1000); // ? TODO: recheck this
	pub const MaxAssetsForTransfer: usize = 2;
}

parameter_type_with_key! {
	pub ParachainMinFee: |_location: MultiLocation| -> Option<u128> {
		Some(100_000_000_000)
	};
}

parameter_type_with_key! {
	pub ExistentialDeposits: |currency_id: CurrencyId| -> Balance {
		match currency_id {
			CurrencyId::NativeAssetId(symbol) => match symbol {
				NativeCurrency::Here => 0,
				NativeCurrency::Parent=> 0,
			},
			_ => 100_000
		}
	};
}

pub fn get_all_module_accounts() -> Vec<AccountId> {
	vec![TreasuryAccountId::get()]
}

pub struct DustRemovalWhitelist;
impl Contains<AccountId> for DustRemovalWhitelist {
	fn contains(a: &AccountId) -> bool {
		get_all_module_accounts().contains(a)
	}
}

pub struct AccountIdToMultiLocation;
impl Convert<AccountId, MultiLocation> for AccountIdToMultiLocation {
	fn convert(account: AccountId) -> MultiLocation {
		X1(AccountId32 {
			network: None,
			id: account.into(),
		})
		.into()
	}
}

pub struct CurrencyHooks;
impl orml_traits::currency::MutationHooks<AccountId, CurrencyId, Balance> for CurrencyHooks {
	type OnDust = orml_tokens::TransferDust<Runtime, TreasuryAccountId>;
	type OnSlash = ();
	type PreTransfer = ();
	type PostTransfer = ();
	type PreDeposit = ();
	type PostDeposit = ();
	type OnNewTokenAccount = ();
	type OnKilledTokenAccount = ();
}

impl orml_vesting::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = pallet_balances::Pallet<Runtime>;
	type MinVestedTransfer = MinVestedTransfer;
	type VestedTransferOrigin = EnsureSigned<AccountId>;
	type WeightInfo = ();
	type MaxVestingSchedules = MaxVestingSchedules;
	type BlockNumberProvider = RelayChainBlockNumberProvider<Runtime>;
}

impl orml_tokens::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type Amount = Amount;
	type CurrencyId = CurrencyId;
	type WeightInfo = ();
	type ExistentialDeposits = ExistentialDeposits;
	type CurrencyHooks = CurrencyHooks;
	type MaxLocks = MaxLocks;
	type MaxReserves = MaxReserves;
	// TODO: Add all module accounts
	type DustRemovalWhitelist = DustRemovalWhitelist;
	/// The id type for named reserves.
	type ReserveIdentifier = ();
}

impl orml_xtokens::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type CurrencyId = CurrencyId;
	type CurrencyIdConvert = CurrencyIdConvert;
	type AccountIdToMultiLocation = AccountIdToMultiLocation;
	type SelfLocation = SelfLocation;
	type XcmExecutor = XcmExecutor<XcmExecutorConfig<Self>>;
	type Weigher = Weigher;
	type BaseXcmWeight = BaseXcmWeight;
	type MaxAssetsForTransfer = MaxAssetsForTransfer;
	type MinXcmFee = ParachainMinFee;
	type MultiLocationsFilter = Everything;
	type ReserveProvider = AbsoluteReserveProvider;
	type UniversalLocation = UniversalLocation;
}
