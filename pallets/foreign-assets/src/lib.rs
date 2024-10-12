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

use core::ops::Deref;

use derivative::Derivative;
use frame_support::{
	dispatch::DispatchResult,
	pallet_prelude::*,
	storage_alias,
	traits::{BuildGenesisConfig, EnsureOrigin},
	PalletId,
};
use frame_system::pallet_prelude::*;
use pallet_common::{
	dispatch::CollectionDispatch, erc::CrossAccountId, CollectionIssuer,
	NATIVE_FUNGIBLE_COLLECTION_ID,
};
use sp_runtime::traits::AccountIdConversion;
use sp_std::{boxed::Box, vec, vec::Vec};
use staging_xcm::{v4::prelude::*, VersionedAssetId};
use staging_xcm_builder::unique_instances::derivatives::DerivativesRegistry;
use staging_xcm_executor::{
	traits::{ConvertLocation, Error as XcmExecutorError, TransactAsset, WeightTrader},
	AssetsInHolding,
};
use up_data_structs::{
	budget::ZeroBudget, CollectionDescription, CollectionFlags, CollectionId, CollectionMode,
	CollectionName, CollectionTokenPrefix, CreateCollectionData, CreateFungibleData,
	CreateItemData, TokenId,
};

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub use module::*;
pub use weights::WeightInfo;

#[frame_support::pallet]
pub mod module {
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
		type ManagerOrigin: EnsureOrigin<Self::RuntimeOrigin>;

		/// The ID of the foreign assets pallet.
		type PalletId: Get<PalletId>;

		/// Self-location of this parachain.
		type SelfLocation: Get<Location>;

		/// The converter from a Location to a CrossAccountId.
		type LocationToAccountId: ConvertLocation<Self::CrossAccountId>;

		type DerivativeCollectionsRegistry: DerivativesRegistry<AssetId, CollectionId>;

		/// Weight information for the extrinsics in this module.
		type WeightInfo: WeightInfo;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The given asset ID could not be converted into the current XCM version.
		BadForeignAssetId,
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(crate) fn deposit_event)]
	pub enum Event<T: Config> {}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(staging_xcm::v4::VERSION as u16);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(<T as Config>::WeightInfo::force_register_foreign_asset())]
		pub fn force_register_foreign_asset(
			origin: OriginFor<T>,
			versioned_asset_id: Box<VersionedAssetId>,
			name: CollectionName,
			token_prefix: CollectionTokenPrefix,
			mode: ForeignCollectionMode,
		) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin.clone())?;

			let asset_id: AssetId = versioned_asset_id
				.as_ref()
				.clone()
				.try_into()
				.map_err(|()| Error::<T>::BadForeignAssetId)?;

			let foreign_collection_owner = Self::pallet_account();

			let description: CollectionDescription = "Foreign Assets Collection"
				.encode_utf16()
				.collect::<Vec<_>>()
				.try_into()
				.expect("description length < max description length; qed");

			let collection_id = T::CollectionDispatch::create(
				foreign_collection_owner,
				CollectionIssuer::Internals,
				CreateCollectionData {
					name,
					token_prefix,
					description,
					mode: mode.into(),
					flags: CollectionFlags {
						foreign: true,
						..Default::default()
					},
					..Default::default()
				},
			)?;

			T::DerivativeCollectionsRegistry::try_register_derivative(&asset_id, &collection_id)?;

			Ok(())
		}
	}

	#[pallet::genesis_config]
	#[derive(Derivative)]
	#[derivative(Default(bound = ""))]
	pub struct GenesisConfig<T: Config>(PhantomData<T>);

	#[pallet::genesis_build]
	impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
		fn build(&self) {
			<Pallet<T>>::in_code_storage_version().put::<Pallet<T>>();
		}
	}
}

impl<T: Config> Pallet<T> {
	fn pallet_account() -> T::CrossAccountId {
		let owner: T::AccountId = T::PalletId::get().into_account_truncating();
		T::CrossAccountId::from_sub(owner)
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
	fn local_asset_id_to_collection(
		AssetId(asset_location): &AssetId,
	) -> Option<CollectionLocality> {
		let self_location = T::SelfLocation::get();

		if *asset_location == Here.into() || *asset_location == self_location {
			return Some(CollectionLocality::Local(NATIVE_FUNGIBLE_COLLECTION_ID));
		}

		let prefix = if asset_location.parents == 0 {
			&Here
		} else if asset_location.parents == self_location.parents {
			&self_location.interior
		} else {
			return None;
		};

		let GeneralIndex(collection_id) = asset_location.interior.match_and_split(prefix)? else {
			return None;
		};

		let collection_id = CollectionId((*collection_id).try_into().ok()?);

		T::DerivativeCollectionsRegistry::get_original(&collection_id)
			.is_none()
			.then_some(CollectionLocality::Local(collection_id))
	}

	/// Converts an asset ID to a Unique Network's collection locality (either foreign or a local one).
	///
	/// The function will check if the asset's reserve location has the corresponding
	/// foreign collection on Unique Network,
	/// and will return the "foreign" locality containing the collection ID if found.
	///
	/// If no corresponding foreign collection is found, the function will check
	/// if the asset's reserve location corresponds to a local collection.
	/// If the local collection is found, the "local" locality with the collection ID is returned.
	///
	/// If all of the above have failed, the `AssetIdConversionFailed` error will be returned.
	fn asset_to_collection(asset_id: &AssetId) -> Result<CollectionLocality, XcmError> {
		T::DerivativeCollectionsRegistry::get_derivative(asset_id)
			.map(CollectionLocality::Foreign)
			.or_else(|| Self::local_asset_id_to_collection(asset_id))
			.ok_or_else(|| XcmExecutorError::AssetIdConversionFailed.into())
	}
}

impl<T: Config> TransactAsset for Pallet<T> {
	fn can_check_in(_origin: &Location, _what: &Asset, _context: &XcmContext) -> XcmResult {
		Err(XcmError::Unimplemented)
	}

	fn check_in(_origin: &Location, _what: &Asset, _context: &XcmContext) {}

	fn can_check_out(_dest: &Location, _what: &Asset, _context: &XcmContext) -> XcmResult {
		Err(XcmError::Unimplemented)
	}

	fn check_out(_dest: &Location, _what: &Asset, _context: &XcmContext) {}

	fn deposit_asset(what: &Asset, to: &Location, _context: Option<&XcmContext>) -> XcmResult {
		let to = T::LocationToAccountId::convert_location(to)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

		let collection_locality = Self::asset_to_collection(&what.id)?;
		let dispatch = T::CollectionDispatch::dispatch(*collection_locality)
			.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?;

		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::Unimplemented)?;

		match what.fun {
			Fungibility::Fungible(amount) => xcm_ext
				.create_item(
					&Self::pallet_account(),
					to,
					CreateItemData::Fungible(CreateFungibleData { value: amount }),
					&ZeroBudget,
				)
				.map(|_| ())
				.map_err(|_| XcmError::FailedToTransactAsset("fungible item deposit failed")),

			Fungibility::NonFungible(_) => Err(XcmError::Unimplemented),
		}
	}

	fn withdraw_asset(
		what: &Asset,
		from: &Location,
		_maybe_context: Option<&XcmContext>,
	) -> Result<AssetsInHolding, XcmError> {
		let from = T::LocationToAccountId::convert_location(from)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

		let collection_locality = Self::asset_to_collection(&what.id)?;
		let dispatch = T::CollectionDispatch::dispatch(*collection_locality)
			.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?;

		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		match what.fun {
			Fungibility::Fungible(amount) => xcm_ext
				.burn_item(from, TokenId::default(), amount)
				.map_err(|_| XcmError::FailedToTransactAsset("fungible item withdraw failed"))?,

			Fungibility::NonFungible(_) => return Err(XcmError::Unimplemented),
		}

		Ok(what.clone().into())
	}

	fn internal_transfer_asset(
		what: &Asset,
		from: &Location,
		to: &Location,
		_context: &XcmContext,
	) -> Result<AssetsInHolding, XcmError> {
		let from = T::LocationToAccountId::convert_location(from)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

		let to = T::LocationToAccountId::convert_location(to)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

		let collection_locality = Self::asset_to_collection(&what.id)?;

		let dispatch = T::CollectionDispatch::dispatch(*collection_locality)
			.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?;
		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		let depositor = &from;

		let token_id;
		let amount;
		let map_error: fn(DispatchError) -> XcmError;

		match what.fun {
			Fungibility::Fungible(fungible_amount) => {
				token_id = TokenId::default();
				amount = fungible_amount;
				map_error = |_| XcmError::FailedToTransactAsset("fungible item transfer failed");
			}

			Fungibility::NonFungible(_) => return Err(XcmError::Unimplemented),
		}

		xcm_ext
			.transfer_item(depositor, &from, &to, token_id, amount, &ZeroBudget)
			.map_err(map_error)?;

		Ok(what.clone().into())
	}
}

#[derive(Clone, Copy)]
pub enum CollectionLocality {
	Local(CollectionId),
	Foreign(CollectionId),
}

impl Deref for CollectionLocality {
	type Target = CollectionId;

	fn deref(&self) -> &Self::Target {
		match self {
			Self::Local(id) => id,
			Self::Foreign(id) => id,
		}
	}
}

pub struct CurrencyIdConvert<T: Config>(PhantomData<T>);
impl<T: Config> sp_runtime::traits::Convert<CollectionId, Option<Location>>
	for CurrencyIdConvert<T>
{
	fn convert(collection_id: CollectionId) -> Option<Location> {
		if collection_id == NATIVE_FUNGIBLE_COLLECTION_ID {
			Some(T::SelfLocation::get())
		} else {
			T::DerivativeCollectionsRegistry::get_original(&collection_id)
				.map(|AssetId(location)| location)
				.or_else(|| {
					T::SelfLocation::get()
						.pushed_with_interior(GeneralIndex(collection_id.0.into()))
						.ok()
				})
		}
	}
}

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
pub enum ForeignCollectionMode {
	NFT,
	Fungible(u8),
}

impl From<ForeignCollectionMode> for CollectionMode {
	fn from(value: ForeignCollectionMode) -> Self {
		match value {
			ForeignCollectionMode::NFT => Self::NFT,
			ForeignCollectionMode::Fungible(decimals) => Self::Fungible(decimals),
		}
	}
}

pub struct FreeForAll;

impl WeightTrader for FreeForAll {
	fn new() -> Self {
		Self
	}

	fn buy_weight(
		&mut self,
		weight: Weight,
		payment: AssetsInHolding,
		_xcm: &XcmContext,
	) -> Result<AssetsInHolding, XcmError> {
		log::trace!(target: "fassets::weight", "buy_weight weight: {:?}, payment: {:?}", weight, payment);
		Ok(payment)
	}
}
