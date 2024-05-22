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

use frame_support::{parameter_types, traits::Everything};
use frame_system::EnsureSigned;
use orml_traits::{location::AbsoluteReserveProvider, parameter_type_with_key};
use pallet_foreign_assets::CurrencyIdConvert;
use sp_runtime::traits::Convert;
use staging_xcm::latest::prelude::*;
use staging_xcm_executor::XcmExecutor;
use up_common::{
	constants::*,
	types::{AccountId, Balance},
};
use up_data_structs::CollectionId;

use crate::{
	runtime_common::config::xcm::{SelfLocation, UniversalLocation, Weigher, XcmExecutorConfig},
	RelayChainBlockNumberProvider, Runtime, RuntimeEvent,
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
	pub ParachainMinFee: |_location: Location| -> Option<u128> {
		Some(100_000_000_000)
	};
}

pub struct AccountIdToLocation;
impl Convert<AccountId, Location> for AccountIdToLocation {
	fn convert(account: AccountId) -> Location {
		AccountId32 {
			network: None,
			id: account.into(),
		}
		.into()
	}
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

impl orml_xtokens::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type CurrencyId = CollectionId;
	type CurrencyIdConvert = CurrencyIdConvert<Self>;
	type AccountIdToLocation = AccountIdToLocation;
	type SelfLocation = SelfLocation;
	type XcmExecutor = XcmExecutor<XcmExecutorConfig<Self>>;
	type Weigher = Weigher;
	type BaseXcmWeight = BaseXcmWeight;
	type MaxAssetsForTransfer = MaxAssetsForTransfer;
	type MinXcmFee = ParachainMinFee;
	type LocationsFilter = Everything;
	type ReserveProvider = AbsoluteReserveProvider;
	type UniversalLocation = UniversalLocation;
	type RateLimiter = ();
	type RateLimiterId = ();
}
