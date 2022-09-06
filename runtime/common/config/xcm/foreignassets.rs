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

use frame_support::{
	traits::{Contains, Get, fungibles},
	parameter_types,
};
use sp_runtime::traits::Zero;
use xcm::v1::{Junction::*, MultiLocation, Junctions::*};
use xcm::latest::MultiAsset;
use xcm_builder::{FungiblesAdapter, ConvertedConcreteAssetId};
use xcm_executor::traits::{Convert as ConvertXcm, JustTry, FilterAssetLocation};
use pallet_foreing_assets::{
	AssetIds, AssetIdMapping, XcmForeignAssetIdMapping, NativeCurrency, FreeForAll, TryAsForeing,
	ForeignAssetId,
};
use sp_std::{borrow::Borrow, marker::PhantomData};
use crate::{Runtime, Balances, ParachainInfo, PolkadotXcm, ForeingAssets};

use super::{LocationToAccountId, RelayLocation};

use up_common::types::{AccountId, Balance};

parameter_types! {
	pub CheckingAccount: AccountId = PolkadotXcm::check_account();
}

/// Allow checking in assets that have issuance > 0.
pub struct NonZeroIssuance<AccountId, ForeingAssets>(PhantomData<(AccountId, ForeingAssets)>);

impl<AccountId, ForeingAssets> Contains<<ForeingAssets as fungibles::Inspect<AccountId>>::AssetId>
	for NonZeroIssuance<AccountId, ForeingAssets>
where
	ForeingAssets: fungibles::Inspect<AccountId>,
{
	fn contains(id: &<ForeingAssets as fungibles::Inspect<AccountId>>::AssetId) -> bool {
		!ForeingAssets::total_issuance(*id).is_zero()
	}
}

pub struct AsInnerId<AssetId, ConvertAssetId>(PhantomData<(AssetId, ConvertAssetId)>);
impl<AssetId: Clone + PartialEq, ConvertAssetId: ConvertXcm<AssetId, AssetId>>
	ConvertXcm<MultiLocation, AssetId> for AsInnerId<AssetId, ConvertAssetId>
where
	AssetId: Borrow<AssetId>,
	AssetId: TryAsForeing<AssetId, ForeignAssetId>,
	AssetIds: Borrow<AssetId>,
{
	fn convert_ref(id: impl Borrow<MultiLocation>) -> Result<AssetId, ()> {
		let id = id.borrow();

		log::trace!(
			target: "xcm::AsInnerId::Convert",
			"AsInnerId {:?}",
			id
		);

		let parent = MultiLocation::parent();
		let here = MultiLocation::here();
		let self_location = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));

		if *id == parent {
			return ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Parent));
		}

		if *id == here || *id == self_location {
			return ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Here));
		}

		match XcmForeignAssetIdMapping::<Runtime>::get_currency_id(id.clone()) {
			Some(AssetIds::ForeignAssetId(foreign_asset_id)) => {
				ConvertAssetId::convert_ref(AssetIds::ForeignAssetId(foreign_asset_id))
			}
			_ => ConvertAssetId::convert_ref(AssetIds::ForeignAssetId(0)),
		}
	}

	fn reverse_ref(what: impl Borrow<AssetId>) -> Result<MultiLocation, ()> {
		log::trace!(
			target: "xcm::AsInnerId::Reverse",
			"AsInnerId",
		);

		let asset_id = what.borrow();

		let parent_id =
			ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Parent)).unwrap();
		let here_id =
			ConvertAssetId::convert_ref(AssetIds::NativeAssetId(NativeCurrency::Here)).unwrap();

		if asset_id.clone() == parent_id {
			return Ok(MultiLocation::parent());
		}

		if asset_id.clone() == here_id {
			return Ok(MultiLocation::new(
				1,
				X1(Parachain(ParachainInfo::get().into())),
			));
		}

		match <AssetId as TryAsForeing<AssetId, ForeignAssetId>>::try_as_foreing(asset_id.clone()) {
			Some(fid) => match XcmForeignAssetIdMapping::<Runtime>::get_multi_location(fid) {
				Some(location) => Ok(location),
				None => Err(()),
			},
			None => Err(()),
		}
	}
}

/// Means for transacting assets besides the native currency on this chain.
pub type FungiblesTransactor = FungiblesAdapter<
	// Use this fungibles implementation:
	ForeingAssets,
	// Use this currency when it is a fungible asset matching the given location or name:
	ConvertedConcreteAssetId<AssetIds, Balance, AsInnerId<AssetIds, JustTry>, JustTry>,
	// Convert an XCM MultiLocation into a local account id:
	LocationToAccountId,
	// Our chain's account ID type (we can't get away without mentioning it explicitly):
	AccountId,
	// We only want to allow teleports of known assets. We use non-zero issuance as an indication
	// that this asset is known.
	NonZeroIssuance<AccountId, ForeingAssets>,
	// The account to use for tracking teleports.
	CheckingAccount,
>;

/// Means for transacting assets on this chain.
pub type AssetTransactors = FungiblesTransactor;

pub struct AllAsset;
impl FilterAssetLocation for AllAsset {
	fn filter_asset_location(_asset: &MultiAsset, _origin: &MultiLocation) -> bool {
		true
	}
}

pub type IsReserve = AllAsset;

pub type Trader<T> = FreeForAll<
	pallet_configuration::WeightToFee<T, Balance>,
	RelayLocation,
	AccountId,
	Balances,
	(),
>;
