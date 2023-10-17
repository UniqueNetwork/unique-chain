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

//! # Foreign assets
//!
//! - [`Config`]
//! - [`Call`]
//! - [`Pallet`]
//!
//! ## Overview
//!
//! The foreign assests pallet provides functions for:
//!
//! - Local and foreign assets management. The foreign assets can be updated without runtime upgrade.
//! - Bounds between asset and target collection for cross chain transfer and inner transfers.
//!
//! ## Overview
//!
//! Under construction

#![cfg_attr(not(feature = "std"), no_std)]
#![allow(clippy::unused_unit)]

use frame_support::{dispatch::DispatchResult, pallet_prelude::*, traits::EnsureOrigin, PalletId};
use frame_system::pallet_prelude::*;
use pallet_common::{
	dispatch::CollectionDispatch, erc::CrossAccountId, NATIVE_FUNGIBLE_COLLECTION_ID,
};
use sp_runtime::traits::AccountIdConversion;
use sp_std::{vec, vec::Vec};
// NOTE: MultiLocation is used in storages, we will need to do migration if upgrade the
// MultiLocation to the XCM v3.
use staging_xcm::{
	opaque::latest::{prelude::XcmError, Weight},
	v3::{prelude::*, MultiAsset, XcmContext},
};
use staging_xcm_executor::{
	traits::{TransactAsset, WeightTrader},
	Assets,
};
use up_data_structs::{
	CollectionId, CollectionMode, CollectionName, CreateCollectionData, PropertyKey, TokenId,
};

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub use module::*;
pub use weights::WeightInfo;

#[frame_support::pallet]
pub mod module {
	use up_data_structs::{
		CollectionDescription, Property, PropertyKeyPermission, PropertyPermission,
	};

	use super::*;

	#[pallet::config]
	pub trait Config:
		frame_system::Config
		+ pallet_common::Config
		+ pallet_fungible::Config
		+ pallet_balances::Config
	{
		/// The overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// Origin for force registering of a foreign asset.
		type ForceRegisterOrigin: EnsureOrigin<Self::RuntimeOrigin>;

		/// The ID of the foreign assets pallet.
		type PalletId: Get<PalletId>;

		/// Weight information for the extrinsics in this module.
		type WeightInfo: WeightInfo;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The foreign asset is already registered
		ForeignAssetAlreadyRegistered,
	}

	#[pallet::event]
	#[pallet::generate_deposit(fn deposit_event)]
	pub enum Event<T: Config> {
		/// The foreign asset registered.
		ForeignAssetRegistered {
			asset_id: CollectionId,
			reserve_location: MultiLocation,
		},
	}

	/// The corresponding collections of reserve locations.
	#[pallet::storage]
	#[pallet::getter(fn foreign_reserve_location_to_collection)]
	pub type ForeignReserveLocationToCollection<T: Config> =
		StorageMap<_, Twox64Concat, staging_xcm::v3::MultiLocation, CollectionId, OptionQuery>;

	/// The correponding NFT token id of reserve NFTs
	#[pallet::storage]
	#[pallet::getter(fn foreign_reserve_asset_instance_to_token_id)]
	pub type ForeignReserveAssetInstanceToTokenId<T: Config> = StorageDoubleMap<
		Hasher1 = Twox64Concat,
		Key1 = CollectionId,
		Hasher2 = Twox64Concat,
		Key2 = staging_xcm::v3::AssetInstance,
		Value = TokenId,
		QueryKind = OptionQuery,
	>;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(<T as Config>::WeightInfo::register_foreign_asset())]
		pub fn force_register_foreign_asset(
			origin: OriginFor<T>,
			reserve_location: MultiLocation,
			name: CollectionName,
			mode: CollectionMode,
		) -> DispatchResult {
			T::ForceRegisterOrigin::ensure_origin(origin.clone())?;

			let foreign_collection_owner = Self::pallet_account();

			let description: CollectionDescription = "Foreign Assets Collection"
				.encode_utf16()
				.collect::<Vec<_>>()
				.try_into()
				.expect("description length < max description length; qed");

			let collection_id = T::CollectionDispatch::create_foreign(
				foreign_collection_owner,
				CreateCollectionData {
					name,
					description,
					mode,

					properties: vec![Property {
						key: Self::reserve_location_property_key(),
						value: reserve_location
							.encode()
							.try_into()
							.expect("multilocation is less than 32k; qed"),
					}]
					.try_into()
					.expect("just one property can always be stored; qed"),

					token_property_permissions: vec![PropertyKeyPermission {
						key: Self::reserve_asset_instance_property_key(),
						permission: PropertyPermission {
							mutable: false,
							collection_admin: true,
							token_owner: false,
						},
					}]
					.try_into()
					.expect("just one property permission can always be stored; qed"),
					..Default::default()
				},
			)?;

			<ForeignReserveLocationToCollection<T>>::insert(reserve_location, collection_id);

			Self::deposit_event(Event::<T>::ForeignAssetRegistered {
				asset_id: collection_id,
				reserve_location,
			});

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	fn pallet_account() -> T::CrossAccountId {
		let owner: T::AccountId = T::PalletId::get().into_account_truncating();
		T::CrossAccountId::from_sub(owner)
	}

	fn reserve_location_property_key() -> PropertyKey {
		b"reserve-location"
			.to_vec()
			.try_into()
			.expect("key length < max property key length; qed")
	}

	fn reserve_asset_instance_property_key() -> PropertyKey {
		b"reserve-asset-instance"
			.to_vec()
			.try_into()
			.expect("key length < max property key length; qed")
	}
}

impl<T: Config> TransactAsset for Pallet<T> {
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

	fn deposit_asset(what: &MultiAsset, to: &MultiLocation, context: &XcmContext) -> XcmResult {
		Err(XcmError::Unimplemented)
	}

	fn withdraw_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		_maybe_context: Option<&XcmContext>,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		Err(XcmError::Unimplemented)
	}

	fn internal_transfer_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		to: &MultiLocation,
		_context: &XcmContext,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		Err(XcmError::Unimplemented)
	}
}

pub struct CurrencyIdConvert<T: Config>(PhantomData<T>);
impl<T: Config> sp_runtime::traits::Convert<CollectionId, Option<MultiLocation>>
	for CurrencyIdConvert<T>
{
	fn convert(collection_id: CollectionId) -> Option<MultiLocation> {
		if collection_id == NATIVE_FUNGIBLE_COLLECTION_ID {
			Some(Here.into())
		} else {
			// let dispatch = T::CollectionDispatch::dispatch(collection_id).ok()?;
			// let collection = dispatch.as_dyn();
			// let xcm_ext = collection.xcm_extensions()?;

			// if xcm_ext.is_foreign() {
			// 	let encoded_location =
			// 		collection.property(&<Pallet<T>>::reserve_location_property_key())?;
			// 	MultiLocation::decode(&mut &encoded_location[..]).ok()
			// } else {
			// 	T::SelfLocation::get()
			// 		.pushed_with_interior(GeneralIndex(collection_id.0.into()))
			// 		.ok()
			// }
			todo!()
		}
	}
}

pub use frame_support::{
	traits::{
		fungibles::Balanced, tokens::currency::Currency as CurrencyT, OnUnbalanced as OnUnbalancedT,
	},
	weights::{WeightToFee, WeightToFeePolynomial},
};

pub struct FreeForAll;

impl WeightTrader for FreeForAll {
	fn new() -> Self {
		Self
	}

	fn buy_weight(
		&mut self,
		weight: Weight,
		payment: Assets,
		_xcm: &XcmContext,
	) -> Result<Assets, XcmError> {
		log::trace!(target: "fassets::weight", "buy_weight weight: {:?}, payment: {:?}", weight, payment);
		Ok(payment)
	}
}
