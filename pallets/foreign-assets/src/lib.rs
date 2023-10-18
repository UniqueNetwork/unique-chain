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

use frame_support::{dispatch::DispatchResult, pallet_prelude::*, traits::EnsureOrigin, PalletId};
use frame_system::pallet_prelude::*;
use pallet_common::{
	dispatch::CollectionDispatch, erc::CrossAccountId, XcmExtensions, NATIVE_FUNGIBLE_COLLECTION_ID,
};
use sp_runtime::traits::AccountIdConversion;
use sp_std::{vec, vec::Vec};
use staging_xcm::{
	opaque::latest::{prelude::XcmError, Weight},
	v3::{prelude::*, MultiAsset, XcmContext},
};
use staging_xcm_executor::{
	traits::{ConvertLocation, Error as XcmExecutorError, TransactAsset, WeightTrader},
	Assets,
};
use up_data_structs::{
	budget::ZeroBudget, CollectionId, CollectionMode, CollectionName, CreateCollectionData,
	CreateFungibleData, CreateItemData, CreateNftData, Property, PropertyKey, TokenId,
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

		/// Self-location of this parachain.
		type SelfLocation: Get<MultiLocation>;

		/// The converter from a MultiLocation to a CrossAccountId.
		type LocationToAccountId: ConvertLocation<Self::CrossAccountId>;

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

	/// The corresponding reserve location of collections.
	#[pallet::storage]
	#[pallet::getter(fn collection_to_foreign_reserve_location)]
	pub type CollectionToForeignReserveLocation<T: Config> =
		StorageMap<_, Twox64Concat, CollectionId, staging_xcm::v3::MultiLocation, OptionQuery>;

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
			<CollectionToForeignReserveLocation<T>>::insert(collection_id, reserve_location);

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

	fn native_asset_location_to_collection(
		asset_location: &MultiLocation,
	) -> Result<Option<CollectionId>, XcmError> {
		let self_location = T::SelfLocation::get();

		if *asset_location == Here.into() {
			Ok(Some(NATIVE_FUNGIBLE_COLLECTION_ID))
		} else if *asset_location == self_location {
			Ok(Some(NATIVE_FUNGIBLE_COLLECTION_ID))
		} else if asset_location.parents == self_location.parents {
			match asset_location
				.interior
				.match_and_split(&self_location.interior)
			{
				Some(GeneralIndex(collection_id)) => Ok(Some(CollectionId(
					(*collection_id)
						.try_into()
						.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?,
				))),
				_ => Ok(None),
			}
		} else {
			Ok(None)
		}
	}

	fn multiasset_to_collection(asset: &MultiAsset) -> Result<CollectionId, XcmError> {
		let AssetId::Concrete(asset_reserve_location) = asset.id else {
			return Err(XcmExecutorError::AssetNotHandled.into());
		};

		Self::native_asset_location_to_collection(&asset_reserve_location)?
			.or_else(|| Self::foreign_reserve_location_to_collection(asset_reserve_location))
			.ok_or_else(|| XcmExecutorError::AssetIdConversionFailed.into())
	}

	fn native_asset_instance_to_token_id(
		asset_instance: &AssetInstance,
	) -> Result<TokenId, XcmError> {
		match asset_instance {
			AssetInstance::Index(token_id) => Ok(TokenId(
				(*token_id)
					.try_into()
					.map_err(|_| XcmError::AssetNotFound)?,
			)),
			_ => Err(XcmError::AssetNotFound),
		}
	}

	/// Obtains the token id of the `asset_instance` in the collection.
	///
	/// Returns `Ok(None)` only if the `asset_instance` points to a foreign item
	/// and it haven't been created on this blockchain yet.
	///
	/// If the `asset_instance` points to a native item, it cannot return `Ok(None)`.
	fn asset_instance_to_token_id(
		xcm_ext: &dyn XcmExtensions<T>,
		collection_id: CollectionId,
		asset_instance: &AssetInstance,
	) -> Result<Option<TokenId>, XcmError> {
		if xcm_ext.is_foreign() {
			Ok(Self::foreign_reserve_asset_instance_to_token_id(
				collection_id,
				asset_instance,
			))
		} else {
			Self::native_asset_instance_to_token_id(asset_instance).map(Some)
		}
	}

	fn create_foreign_asset_instance(
		xcm_ext: &dyn XcmExtensions<T>,
		collection_id: CollectionId,
		asset_instance: &AssetInstance,
		to: T::CrossAccountId,
	) -> XcmResult {
		let asset_instance_encoded = asset_instance.encode();

		let derivative_token_id = xcm_ext
			.create_item(
				&Self::pallet_account(),
				to,
				CreateItemData::NFT(CreateNftData {
					properties: vec![Property {
					key: Self::reserve_asset_instance_property_key(),
					value: asset_instance_encoded
						.try_into()
						.expect("asset instance length <= 32 bytes which is less than value length limit; qed"),
				}]
					.try_into()
					.expect("just one property can always be stored; qed"),
				}),
				&ZeroBudget,
			)
			.map_err(|_| XcmError::FailedToTransactAsset("non-fungible item deposit failed"))?;

		<ForeignReserveAssetInstanceToTokenId<T>>::insert(
			collection_id,
			asset_instance,
			derivative_token_id,
		);

		Ok(())
	}

	fn deposit_asset_instance(
		xcm_ext: &dyn XcmExtensions<T>,
		collection_id: CollectionId,
		to: T::CrossAccountId,
		asset_instance: &AssetInstance,
	) -> XcmResult {
		if let Some(token_id) =
			Self::asset_instance_to_token_id(xcm_ext, collection_id, asset_instance)?
		{
			let depositor = &Self::pallet_account();
			let from = depositor;
			let amount = 1;

			xcm_ext
				.transfer_item(depositor, from, &to, token_id, amount, &ZeroBudget)
				.map_err(|_| XcmError::FailedToTransactAsset("non-fungible item deposit failed"))
		} else {
			Self::create_foreign_asset_instance(xcm_ext, collection_id, asset_instance, to)
		}
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

	fn deposit_asset(what: &MultiAsset, to: &MultiLocation, _context: &XcmContext) -> XcmResult {
		let collection_id = Self::multiasset_to_collection(what)?;
		let dispatch =
			T::CollectionDispatch::dispatch(collection_id).map_err(|_| XcmError::AssetNotFound)?;

		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::Unimplemented)?;

		let to = T::LocationToAccountId::convert_location(to)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

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

			Fungibility::NonFungible(asset_instance) => {
				Self::deposit_asset_instance(xcm_ext, collection_id, to, &asset_instance)
			}
		}
	}

	fn withdraw_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		_maybe_context: Option<&XcmContext>,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		let from = T::LocationToAccountId::convert_location(from)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

		let collection_id = Self::multiasset_to_collection(what)?;
		let dispatch =
			T::CollectionDispatch::dispatch(collection_id).map_err(|_| XcmError::AssetNotFound)?;

		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		match what.fun {
			Fungibility::Fungible(amount) => xcm_ext
				.burn_item(from, TokenId::default(), amount)
				.map_err(|_| XcmError::FailedToTransactAsset("fungible item withdraw failed"))?,

			Fungibility::NonFungible(asset_instance) => {
				let token_id =
					Self::asset_instance_to_token_id(xcm_ext, collection_id, &asset_instance)?
						.ok_or(XcmError::AssetNotFound)?;

				if xcm_ext.token_has_children(token_id) {
					return Err(XcmError::Unimplemented);
				}

				let depositor = &from;
				let to = Self::pallet_account();
				let amount = 1;
				xcm_ext
					.transfer_item(depositor, &from, &to, token_id, amount, &ZeroBudget)
					.map_err(|_| {
						XcmError::FailedToTransactAsset("nonfungible item withdraw failed")
					})?;
			}
		}

		Ok(what.clone().into())
	}

	fn internal_transfer_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		to: &MultiLocation,
		_context: &XcmContext,
	) -> Result<staging_xcm_executor::Assets, XcmError> {
		let collection_id = Self::multiasset_to_collection(what)?;

		let dispatch =
			T::CollectionDispatch::dispatch(collection_id).map_err(|_| XcmError::AssetNotFound)?;
		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		let from = T::LocationToAccountId::convert_location(from)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

		let to = T::LocationToAccountId::convert_location(to)
			.ok_or(XcmExecutorError::AccountIdConversionFailed)?;

		let depositor = &from;

		match what.fun {
			Fungibility::Fungible(amount) => xcm_ext
				.transfer_item(
					depositor,
					&from,
					&to,
					TokenId::default(),
					amount,
					&ZeroBudget,
				)
				.map_err(|_| XcmError::FailedToTransactAsset("fungible item transfer failed"))?,

			Fungibility::NonFungible(asset_instance) => {
				let token_id =
					Self::asset_instance_to_token_id(xcm_ext, collection_id, &asset_instance)?
						.ok_or(XcmError::AssetNotFound)?;

				let amount = 1;

				xcm_ext
					.transfer_item(depositor, &from, &to, token_id, amount, &ZeroBudget)
					.map_err(|_| {
						XcmError::FailedToTransactAsset("nonfungible item transfer failed")
					})?;
			}
		}

		Ok(what.clone().into())
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
			let dispatch = T::CollectionDispatch::dispatch(collection_id).ok()?;
			let collection = dispatch.as_dyn();
			let xcm_ext = collection.xcm_extensions()?;

			if xcm_ext.is_foreign() {
				<Pallet<T>>::collection_to_foreign_reserve_location(collection_id)
			} else {
				T::SelfLocation::get()
					.pushed_with_interior(GeneralIndex(collection_id.0.into()))
					.ok()
			}
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
