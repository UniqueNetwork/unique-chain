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

use frame_support::{parameter_types, traits::Get};
use orml_traits::location::AbsoluteReserveProvider;
use orml_xcm_support::MultiNativeAsset;
use pallet_foreign_assets::{
	AssetId, AssetIdMapping, CurrencyId, ForeignAssetId, FreeForAll, NativeCurrency, TryAsForeign,
	XcmForeignAssetIdMapping,
};
use sp_runtime::traits::{Convert, MaybeEquivalence};
use sp_std::marker::PhantomData;
use staging_xcm::latest::{prelude::*, MultiAsset, MultiLocation};
use staging_xcm_builder::{ConvertedConcreteId, FungiblesAdapter, NoChecking};
use staging_xcm_executor::traits::{JustTry, TransactAsset};
use up_common::types::{AccountId, Balance};

use super::{LocationToAccountId, RelayLocation};
use crate::{Balances, ForeignAssets, ParachainInfo, PolkadotXcm, Runtime};

parameter_types! {
	pub CheckingAccount: AccountId = PolkadotXcm::check_account();
}

pub struct AsInnerId<ConvertAssetId>(PhantomData<(AssetId, ConvertAssetId)>);
impl<ConvertAssetId: MaybeEquivalence<AssetId, AssetId>> MaybeEquivalence<MultiLocation, AssetId>
	for AsInnerId<ConvertAssetId>
{
	fn convert(id: &MultiLocation) -> Option<AssetId> {
		log::trace!(
			target: "xcm::AsInnerId::Convert",
			"AsInnerId {:?}",
			id
		);

		let parent = MultiLocation::parent();
		let here = MultiLocation::here();
		let self_location = MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())));

		if *id == parent {
			return ConvertAssetId::convert(&AssetId::NativeAssetId(NativeCurrency::Parent));
		}

		if *id == here || *id == self_location {
			return ConvertAssetId::convert(&AssetId::NativeAssetId(NativeCurrency::Here));
		}

		match XcmForeignAssetIdMapping::<Runtime>::get_currency_id(*id) {
			Some(AssetId::ForeignAssetId(foreign_asset_id)) => {
				ConvertAssetId::convert(&AssetId::ForeignAssetId(foreign_asset_id))
			}
			_ => None,
		}
	}

	fn convert_back(asset_id: &AssetId) -> Option<MultiLocation> {
		log::trace!(
			target: "xcm::AsInnerId::Reverse",
			"AsInnerId",
		);

		let parent_id =
			ConvertAssetId::convert(&AssetId::NativeAssetId(NativeCurrency::Parent)).unwrap();
		let here_id =
			ConvertAssetId::convert(&AssetId::NativeAssetId(NativeCurrency::Here)).unwrap();

		if asset_id.clone() == parent_id {
			return Some(MultiLocation::parent());
		}

		if asset_id.clone() == here_id {
			return Some(MultiLocation::new(
				1,
				X1(Parachain(ParachainInfo::get().into())),
			));
		}

		let fid =
			<AssetId as TryAsForeign<AssetId, ForeignAssetId>>::try_as_foreign(asset_id.clone())?;
		XcmForeignAssetIdMapping::<Runtime>::get_multi_location(fid)
	}
}

/// Means for transacting assets besides the native currency on this chain.
pub type FungiblesTransactor = FungiblesAdapter<
	// Use this fungibles implementation:
	ForeignAssets,
	// Use this currency when it is a fungible asset matching the given location or name:
	ConvertedConcreteId<AssetId, Balance, AsInnerId<JustTry>, JustTry>,
	// Convert an XCM MultiLocation into a local account id:
	LocationToAccountId,
	// Our chain's account ID type (we can't get away without mentioning it explicitly):
	AccountId,
	// No Checking for teleported assets since we disallow teleports at all.
	NoChecking,
	// The account to use for tracking teleports.
	CheckingAccount,
>;

/// Means for transacting assets on this chain.
pub struct AssetTransactor;
impl TransactAsset for AssetTransactor {
	fn can_check_in(
		_origin: &MultiLocation,
		_what: &MultiAsset,
		_context: &XcmContext,
	) -> XcmResult {
		Err(XcmError::Unimplemented)
	}

	fn check_in(_origin: &MultiLocation, _what: &MultiAsset, _context: &XcmContext) {}

	fn can_check_out(
		_dest: &MultiLocation,
		_what: &MultiAsset,
		_context: &XcmContext,
	) -> XcmResult {
		Err(XcmError::Unimplemented)
	}

	fn check_out(_dest: &MultiLocation, _what: &MultiAsset, _context: &XcmContext) {}

	fn deposit_asset(what: &MultiAsset, who: &MultiLocation, context: &XcmContext) -> XcmResult {
		FungiblesTransactor::deposit_asset(what, who, context)
	}

	fn withdraw_asset(
		what: &MultiAsset,
		who: &MultiLocation,
		maybe_context: Option<&XcmContext>,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		FungiblesTransactor::withdraw_asset(what, who, maybe_context)
	}

	fn internal_transfer_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		to: &MultiLocation,
		context: &XcmContext,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		FungiblesTransactor::internal_transfer_asset(what, from, to, context)
	}
}

pub type IsReserve = MultiNativeAsset<AbsoluteReserveProvider>;

pub type Trader<T> = FreeForAll<
	pallet_configuration::WeightToFee<T, Balance>,
	RelayLocation,
	AccountId,
	Balances,
	(),
>;

pub struct CurrencyIdConvert;
impl Convert<AssetId, Option<MultiLocation>> for CurrencyIdConvert {
	fn convert(id: AssetId) -> Option<MultiLocation> {
		match id {
			AssetId::NativeAssetId(NativeCurrency::Here) => Some(MultiLocation::new(
				1,
				X1(Parachain(ParachainInfo::get().into())),
			)),
			AssetId::NativeAssetId(NativeCurrency::Parent) => Some(MultiLocation::parent()),
			AssetId::ForeignAssetId(foreign_asset_id) => {
				XcmForeignAssetIdMapping::<Runtime>::get_multi_location(foreign_asset_id)
			}
		}
	}
}

impl Convert<MultiLocation, Option<CurrencyId>> for CurrencyIdConvert {
	fn convert(location: MultiLocation) -> Option<CurrencyId> {
		if location == MultiLocation::here()
			|| location == MultiLocation::new(1, X1(Parachain(ParachainInfo::get().into())))
		{
			return Some(AssetId::NativeAssetId(NativeCurrency::Here));
		}

		if location == MultiLocation::parent() {
			return Some(AssetId::NativeAssetId(NativeCurrency::Parent));
		}

		if let Some(currency_id) = XcmForeignAssetIdMapping::<Runtime>::get_currency_id(location) {
			return Some(currency_id);
		}

		None
	}
}
