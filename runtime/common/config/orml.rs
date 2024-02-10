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
use pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID;
use sp_runtime::traits::Convert;
use staging_xcm::latest::{AssetId, Junction::*, Junctions::*, MultiLocation, Weight};
use staging_xcm_executor::XcmExecutor;
use up_common::{
	constants::*,
	types::{AccountId, Balance},
};
use up_data_structs::CollectionId;

use crate::{
	runtime_common::config::xcm::{SelfLocation, UniversalLocation, Weigher, XcmExecutorConfig},
	RelayChainBlockNumberProvider, Runtime, RuntimeEvent, XFun, XNft,
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

pub struct CurrencyIdConvert;
impl Convert<CollectionId, Option<MultiLocation>> for CurrencyIdConvert {
	fn convert(collection_id: CollectionId) -> Option<MultiLocation> {
		if collection_id == NATIVE_FUNGIBLE_COLLECTION_ID {
			Some(SelfLocation::get())
		} else {
			XFun::collection_to_foreign_asset(collection_id)
				.or_else(|| XNft::local_class_to_foreign_asset(collection_id))
				.and_then(|asset_id| match asset_id {
					AssetId::Concrete(location) => Some(location),
					_ => None,
				})
				.or_else(|| {
					SelfLocation::get()
						.pushed_with_interior(GeneralIndex(collection_id.0.into()))
						.ok()
				})
		}
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
