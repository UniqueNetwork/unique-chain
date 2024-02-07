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

//! # Foreign Assets
//!
//! ## Overview
//!
//! The Foreign Assets is a proxy that maps XCM operations to the Unique Network's pallets logic.

#![cfg_attr(not(feature = "std"), no_std)]
#![allow(clippy::unused_unit)]

use frame_support::{
	dispatch::DispatchResult, pallet_prelude::*, traits::EnsureOriginWithArg, PalletId,
};
use frame_system::pallet_prelude::*;
pub use module::*;
use pallet_common::{
	dispatch::CollectionDispatch, erc::CrossAccountId, CollectionIssuer,
	NATIVE_FUNGIBLE_COLLECTION_ID,
};
use sp_runtime::traits::AccountIdConversion;
use sp_std::{boxed::Box, vec, vec::Vec};
use staging_xcm::{opaque::latest::prelude::*, VersionedAssetId};
use staging_xcm_executor::traits::{ConvertLocation, Error as XcmExecutorError, TransactAsset};
use up_data_structs::{
	budget::ZeroBudget, CollectionDescription, CollectionId, CollectionMode, CollectionName,
	CollectionTokenPrefix, CreateCollectionData, CreateFungibleData, CreateItemData, TokenId,
};

const LOG_TARGET: &str = "xcm::xfun::transactor";

#[frame_support::pallet]
pub mod module {

	use super::*;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config
	{
		/// The overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// The ID of the foreign assets pallet.
		type PalletId: Get<PalletId>;

		/// The chain's Universal Location.
		type UniversalLocation: Get<InteriorMultiLocation>;

		/// The converter from a MultiLocation to a CrossAccountId.
		type LocationToAccountId: ConvertLocation<Self::CrossAccountId>;

		/// Origin for force registering of a foreign asset.
		type ForeignAssetRegisterOrigin: EnsureOriginWithArg<Self::RuntimeOrigin, AssetId>;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Attepmted re-registration of the existing fungible foreign asset.
		ForeignAssetReRegistration,

		/// Is it impossible to register a local asset as a foreign one.
		AttemptToRegisterLocalAsset,

		/// The given asset ID could not be converted into the current XCM version.
		BadForeignAssetId,
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub fn deposit_event)]
	pub enum Event<T: Config> {
		/// A fungible foreign asset registered.
		ForeignAssetRegistered {
			derivative_collection_id: CollectionId,
			foreign_asset_id: Box<VersionedAssetId>,
		},
	}

	/// The corresponding collections of foreign assets.
	#[pallet::storage]
	#[pallet::getter(fn foreign_asset_to_collection)]
	pub type ForeignAssetToCollection<T: Config> =
		StorageMap<_, Twox64Concat, staging_xcm::v3::AssetId, CollectionId, OptionQuery>;

	/// The corresponding foreign assets of collections.
	#[pallet::storage]
	#[pallet::getter(fn collection_to_foreign_asset)]
	pub type CollectionToForeignAsset<T: Config> =
		StorageMap<_, Twox64Concat, CollectionId, staging_xcm::v3::AssetId, OptionQuery>;

	#[pallet::pallet]
	pub struct Pallet<T>(_);
}

impl<T: Config> Pallet<T> {
	fn pallet_cross_account() -> T::CrossAccountId {
		let account: T::AccountId = T::PalletId::get().into_account_truncating();
		T::CrossAccountId::from_sub(account)
	}

	fn normalize_if_local_asset(mut asset_id: AssetId) -> AssetId {
		if let AssetId::Concrete(location) = &mut asset_id {
			let context = T::UniversalLocation::get();
			location.simplify(&context);
		}

		asset_id
	}

	pub fn register_foreign_asset(
		origin: OriginFor<T>,
		versioned_asset_id: Box<VersionedAssetId>,
		name: CollectionName,
		token_prefix: CollectionTokenPrefix,
		decimals: u8,
	) -> DispatchResult {
		let foreign_asset_id: AssetId = versioned_asset_id
			.as_ref()
			.clone()
			.try_into()
			.map_err(|()| Error::<T>::BadForeignAssetId)?;

		let normalized_asset = Self::normalize_if_local_asset(foreign_asset_id);

		if let AssetId::Concrete(location) = normalized_asset {
			ensure!(
				location.parents > 0,
				<Error<T>>::AttemptToRegisterLocalAsset
			);
		}

		T::ForeignAssetRegisterOrigin::ensure_origin(origin, &normalized_asset)?;

		ensure!(
			!<ForeignAssetToCollection<T>>::contains_key(normalized_asset),
			<Error<T>>::ForeignAssetReRegistration,
		);

		let foreign_collection_owner = Self::pallet_cross_account();

		let description: CollectionDescription = "Foreign Asset Collection"
			.encode_utf16()
			.collect::<Vec<_>>()
			.try_into()
			.expect("description length < max description length; qed");

		let derivative_collection_id = T::CollectionDispatch::create(
			foreign_collection_owner,
			CollectionIssuer::Internals,
			CreateCollectionData {
				name,
				token_prefix,
				description,
				mode: CollectionMode::Fungible(decimals),
				..Default::default()
			},
		)?;

		<ForeignAssetToCollection<T>>::insert(normalized_asset, derivative_collection_id);
		<CollectionToForeignAsset<T>>::insert(derivative_collection_id, normalized_asset);

		Self::deposit_event(Event::<T>::ForeignAssetRegistered {
			derivative_collection_id,
			foreign_asset_id: versioned_asset_id,
		});

		Ok(())
	}

	/// Converts a concrete asset ID (the asset multilocation) to a local collection on Unique Network.
	///
	/// The multilocation corresponds to a local collection if:
	/// * It is `Here` location that corresponds to the native token of this parachain.
	/// * It is `../Parachain(<Unique Network Para ID>)` that also corresponds to the native token of this parachain.
	/// * It is `../Parachain(<Unique Network Para ID>)/GeneralIndex(<Collection ID>)` that corresponds
	/// to the collection with the ID equal to `<Collection ID>`. The `<Collection ID>` must be in the valid range,
	/// otherwise `None` is returned.
	/// * It is `GeneralIndex(<Collection ID>)`. Same as the last one above.
	///
	/// If the multilocation doesn't match the patterns listed above,
	/// or the `<Collection ID>` points to a foreign collection,
	/// `None` is returned, identifying that the given multilocation doesn't correspond to a local collection.
	fn local_asset_id_to_collection(asset_id: &AssetId) -> Option<CollectionId> {
		let asset_id = Self::normalize_if_local_asset(*asset_id);

		let AssetId::Concrete(asset_location) = asset_id else {
			return None;
		};

		if asset_location.parents > 0 {
			return None;
		}

		match asset_location.interior {
			Here => Some(NATIVE_FUNGIBLE_COLLECTION_ID),
			X1(GeneralIndex(collection_id)) => {
				let collection_id = CollectionId(collection_id.try_into().ok()?);

				Self::collection_to_foreign_asset(collection_id)
					.is_none()
					.then_some(collection_id)
			}
			_ => None,
		}
	}

	/// Converts an asset ID to a Unique Network's collection locality (either foreign or a local one).
	fn asset_to_collection(asset_id: &AssetId) -> Result<CollectionId, XcmError> {
		Self::foreign_asset_to_collection(asset_id)
			.or_else(|| Self::local_asset_id_to_collection(asset_id))
			.ok_or_else(|| XcmExecutorError::AssetNotHandled.into())
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

	fn deposit_asset(
		what: &MultiAsset,
		who: &MultiLocation,
		context: Option<&XcmContext>,
	) -> XcmResult {
		log::trace!(
            target: LOG_TARGET,
            "deposit_asset asset: {what:?}, who: {who:?}, context: {context:?}",
        );

		match what.fun {
			Fungibility::Fungible(amount) => {
				let collection_id = Self::asset_to_collection(&what.id)?;
				let dispatch = T::CollectionDispatch::dispatch(collection_id)
					.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?;

				let collection = dispatch.as_dyn();
				let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

				let who = T::LocationToAccountId::convert_location(who)
					.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

				xcm_ext
					.create_item(
						&Self::pallet_cross_account(),
						who,
						CreateItemData::Fungible(CreateFungibleData { value: amount }),
						&ZeroBudget,
					)
					.map(|_| ())
					.map_err(|_| XcmError::FailedToTransactAsset("fungible item deposit failed"))
			}

			Fungibility::NonFungible(_) => Err(XcmExecutorError::AssetNotHandled.into()),
		}
	}

	fn withdraw_asset(
		what: &MultiAsset,
		who: &MultiLocation,
		context: Option<&XcmContext>,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		log::trace!(
            target: LOG_TARGET,
            "withdraw_asset asset: {what:?}, who: {who:?}, context: {context:?}",
        );

		match what.fun {
			Fungibility::Fungible(amount) => {
				let collection_id = Self::asset_to_collection(&what.id)?;
				let dispatch = T::CollectionDispatch::dispatch(collection_id)
					.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?;

				let collection = dispatch.as_dyn();
				let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

				let who = T::LocationToAccountId::convert_location(who)
					.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

				xcm_ext
					.burn_item(who, TokenId::default(), amount)
					.map_err(|_| {
						XcmError::FailedToTransactAsset("fungible item withdraw failed")
					})?;

				Ok(what.clone().into())
			}

			Fungibility::NonFungible(_) => Err(XcmExecutorError::AssetNotHandled.into()),
		}
	}

	fn internal_transfer_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		to: &MultiLocation,
		context: &XcmContext,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		log::trace!(
            target: LOG_TARGET,
            "transfer_asset asset: {what:?}, from: {from:?}, to: {to:?}, context: {context:?}",
        );

		match what.fun {
			Fungibility::Fungible(amount) => {
				let collection_id = Self::asset_to_collection(&what.id)?;

				let dispatch = T::CollectionDispatch::dispatch(collection_id)
					.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?;
				let collection = dispatch.as_dyn();
				let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

				let from = T::LocationToAccountId::convert_location(from)
					.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

				let to = T::LocationToAccountId::convert_location(to)
					.ok_or(XcmExecutorError::AccountIdConversionFailed)?;
				let depositor = &from;

				xcm_ext
					.transfer_item(
						depositor,
						&from,
						&to,
						TokenId::default(),
						amount,
						&ZeroBudget,
					)
					.map_err(|_| {
						XcmError::FailedToTransactAsset("fungible item transfer failed")
					})?;

				Ok(what.clone().into())
			}

			Fungibility::NonFungible(_) => Err(XcmExecutorError::AssetNotHandled.into()),
		}
	}
}
