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

use frame_support::{
	dispatch::DispatchResult, ensure, pallet_prelude::*, traits::EnsureOrigin, PalletId,
	transactional,
};
use frame_system::pallet_prelude::*;
use up_common::constants::NESTING_BUDGET;
use up_data_structs::{
	CollectionMode, CreateItemData, CreateFungibleData, budget::Value, CreateNftData, Property,
	CollectionFlags, PropertyKeyPermission, PropertyKey, PropertyPermission, CollectionName,
	CollectionDescription,
};
use pallet_common::{dispatch::CollectionDispatch, NATIVE_FUNGIBLE_COLLECTION_ID};
use pallet_common::{CommonCollectionOperations, XcmExtensions};
use sp_runtime::traits::AccountIdConversion;
use sp_std::{vec::Vec, vec};
use up_data_structs::{CollectionId, TokenId, CreateCollectionData};

use xcm::latest::{prelude::*, AssetId};
use xcm_executor::{
	traits::{WeightTrader, TransactAsset, Error as XcmExecutorError, Convert},
	Assets,
};

use pallet_common::erc::CrossAccountId;

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

		type PalletId: Get<PalletId>;

		/// Origin for force registering of a foreign asset.
		type ForceRegisterOrigin: EnsureOrigin<Self::RuntimeOrigin>;

		type SelfLocation: Get<MultiLocation>;

		type LocationToAccountId: xcm_executor::traits::Convert<MultiLocation, Self::CrossAccountId>;

		/// Weight information for the extrinsics in this module.
		type WeightInfo: WeightInfo;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The foreign asset is already registered
		ForeignAssetAlreadyRegistered,
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub fn deposit_event)]
	pub enum Event<T: Config> {
		/// The foreign asset registered.
		ForeignAssetRegistered {
			asset_id: CollectionId,
			reserve_location: MultiLocation,
		},
	}

	/// The corresponding collections of reserve locations
	#[pallet::storage]
	#[pallet::getter(fn foreign_reserve_location_to_collection)]
	pub type ForeignReserveLocationToCollection<T: Config> =
		StorageMap<_, Twox64Concat, xcm::v3::MultiLocation, CollectionId, OptionQuery>;

	/// The correponding NFT token id of reserve NFTs
	#[pallet::storage]
	#[pallet::getter(fn foreign_reserve_asset_instance_to_token_id)]
	pub type ForeignReserveAssetInstanceToTokenId<T: Config> = StorageDoubleMap<
		Hasher1 = Twox64Concat,
		Key1 = CollectionId,
		Hasher2 = Twox64Concat,
		Key2 = AssetInstance,
		Value = TokenId,
		QueryKind = OptionQuery,
	>;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(<T as Config>::WeightInfo::register_foreign_asset())]
		pub fn register_foreign_asset(
			origin: OriginFor<T>,
			reserve_location: MultiLocation,
			name: CollectionName,
			mode: CollectionMode,
		) -> DispatchResult {
			T::ForceRegisterOrigin::ensure_origin(origin)?;
			Self::create_foreign_collection(reserve_location, name, mode)
		}
	}
}

impl<T: Config> Pallet<T> {
	fn pallet_account() -> T::CrossAccountId {
		let owner: T::AccountId = T::PalletId::get().into_account_truncating();
		T::CrossAccountId::from_sub(owner)
	}

	fn create_foreign_collection(
		reserve_location: MultiLocation,
		name: CollectionName,
		mode: CollectionMode,
	) -> DispatchResult {
		ensure!(
			<ForeignReserveLocationToCollection<T>>::get(reserve_location).is_none(),
			<Error<T>>::ForeignAssetAlreadyRegistered,
		);

		// FIXME The owner should be the `reserve_location` but
		// at the moment the colleciton owner can't be a general multilocation.
		let owner = Self::pallet_account();

		let collection_id =
			Self::do_create_foreign_collection(reserve_location, owner, name, mode)?;

		<ForeignReserveLocationToCollection<T>>::insert(reserve_location, collection_id);

		Self::deposit_event(Event::<T>::ForeignAssetRegistered {
			asset_id: collection_id,
			reserve_location,
		});

		Ok(())
	}

	#[transactional]
	fn do_create_foreign_collection(
		reserve_location: MultiLocation,
		owner: T::CrossAccountId,
		name: CollectionName,
		mode: CollectionMode,
	) -> Result<CollectionId, DispatchError> {
		let reserve_location_encoded = reserve_location.encode();
		let description: CollectionDescription = "Foreign Assets Collection"
			.encode_utf16()
			.collect::<Vec<_>>()
			.try_into()
			.expect("description length < max description length; qed");

		T::CollectionDispatch::create_internal(
			owner,
			CreateCollectionData {
				name,
				description,
				mode,
				properties: vec![Property {
					key: Self::reserve_location_property_key(),
					value: reserve_location_encoded
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

				flags: CollectionFlags {
					foreign: true,
					..Default::default()
				},
				..Default::default()
			},
		)
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

	fn multiasset_to_collection(asset: &MultiAsset) -> Result<CollectionId, XcmError> {
		let AssetId::Concrete(asset_reserve_location) = asset.id else {
			return Err(XcmExecutorError::AssetNotHandled.into());
		};

		let self_location = T::SelfLocation::get();

		let native_collection_id = if asset_reserve_location == Here.into() {
			Some(NATIVE_FUNGIBLE_COLLECTION_ID)
		} else if asset_reserve_location == self_location {
			Some(NATIVE_FUNGIBLE_COLLECTION_ID)
		} else if asset_reserve_location.parents == self_location.parents {
			match asset_reserve_location
				.interior
				.match_and_split(&self_location.interior)
			{
				Some(GeneralIndex(collection_id)) => Some(CollectionId(
					(*collection_id)
						.try_into()
						.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?,
				)),
				_ => None,
			}
		} else {
			None
		};

		let collection_id = native_collection_id
			.or_else(|| Self::foreign_reserve_location_to_collection(asset_reserve_location))
			.ok_or(XcmExecutorError::AssetIdConversionFailed)?;

		Ok(collection_id)
	}

	fn native_asset_instance(instance: AssetInstance) -> Result<TokenId, XcmError> {
		match instance {
			AssetInstance::Index(token_id) => Ok(TokenId(
				token_id.try_into().map_err(|_| XcmError::AssetNotFound)?,
			)),
			_ => Err(XcmError::AssetNotFound),
		}
	}

	fn deposit_asset_instance(
		collection_id: CollectionId,
		xcm_ext: &dyn XcmExtensions<T>,
		instance: AssetInstance,
		sender: Option<T::CrossAccountId>,
		to: T::CrossAccountId,
	) -> XcmResult {
		let token = if xcm_ext.is_foreign() {
			match Self::foreign_reserve_asset_instance_to_token_id(collection_id, instance) {
				Some(token) => token,
				None => {
					return Self::create_foreign_asset_instance(
						collection_id,
						xcm_ext,
						instance,
						to,
					)
				}
			}
		} else {
			Self::native_asset_instance(instance)?
		};

		let from = Self::pallet_account();

		Self::transactional_transfer_from(xcm_ext, sender, from, to, token, 1)
			.map_err(|_| XcmError::FailedToTransactAsset("non-fungible item deposit failed"))
	}

	fn create_foreign_asset_instance(
		collection_id: CollectionId,
		xcm_ext: &dyn XcmExtensions<T>,
		instance: AssetInstance,
		to: T::CrossAccountId,
	) -> XcmResult {
		let instance_encoded = instance.encode();

		let derivative_token_id = Self::transactional_create_item(
			xcm_ext,
			to,
			CreateItemData::NFT(CreateNftData {
				properties: vec![Property {
				key: Self::reserve_asset_instance_property_key(),
				value: instance_encoded
					.try_into()
					.expect("asset instance length <= 32 bytes which is less than value length limit; qed"),
			}]
				.try_into()
				.expect("just one property can always be stored; qed"),
			}),
		)
		.map_err(|_| XcmError::FailedToTransactAsset("non-fungible item deposit failed"))?;

		<ForeignReserveAssetInstanceToTokenId<T>>::insert(
			collection_id,
			instance,
			derivative_token_id,
		);

		Ok(())
	}

	fn transfer_asset_instance(
		collection_id: CollectionId,
		xcm_ext: &dyn XcmExtensions<T>,
		instance: AssetInstance,
		sender: Option<T::CrossAccountId>,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
	) -> XcmResult {
		let token = if xcm_ext.is_foreign() {
			Self::foreign_reserve_asset_instance_to_token_id(collection_id, instance)
				.ok_or(XcmError::AssetNotFound)?
		} else {
			Self::native_asset_instance(instance)?
		};

		Self::transactional_transfer_from(xcm_ext, sender, from, to, token, 1)
			.map_err(|_| XcmError::FailedToTransactAsset("non-fungible item transaction failed"))
	}

	#[transactional]
	fn transactional_create_item(
		xcm_ext: &dyn XcmExtensions<T>,
		to: T::CrossAccountId,
		create_data: CreateItemData,
	) -> Result<TokenId, DispatchError> {
		xcm_ext.create_item(to, create_data)
	}

	#[transactional]
	fn transactional_burn_item(
		xcm_ext: &dyn XcmExtensions<T>,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		xcm_ext.burn_item(from, token, amount)
	}

	#[transactional]
	fn transactional_transfer_from(
		xcm_ext: &dyn XcmExtensions<T>,
		sender: Option<T::CrossAccountId>,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		xcm_ext.transfer_from(sender, from, to, token, amount, &Value::new(NESTING_BUDGET))
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
		let collection_id = Self::multiasset_to_collection(what)?;
		let dispatch =
			T::CollectionDispatch::dispatch(collection_id).map_err(|_| XcmError::AssetNotFound)?;

		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		let to = T::LocationToAccountId::convert_ref(to)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		match what.fun {
			Fungibility::Fungible(amount) => Self::transactional_create_item(
				xcm_ext,
				to,
				CreateItemData::Fungible(CreateFungibleData { value: amount }),
			)
			.map(|_| ())
			.map_err(|_| XcmError::FailedToTransactAsset("fungible item deposit failed")),

			Fungibility::NonFungible(instance) => {
				let sender = context
					.origin
					.map(|origin| T::LocationToAccountId::convert_ref(origin))
					.transpose()
					.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

				Self::deposit_asset_instance(collection_id, xcm_ext, instance, sender, to)
			}
		}
	}

	fn withdraw_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		_maybe_context: Option<&XcmContext>,
	) -> Result<xcm_executor::Assets, XcmError> {
		let collection_id = Self::multiasset_to_collection(what)?;
		let dispatch =
			T::CollectionDispatch::dispatch(collection_id).map_err(|_| XcmError::AssetNotFound)?;

		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		let from = T::LocationToAccountId::convert_ref(from)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		match what.fun {
			Fungibility::Fungible(amount) => {
				Self::transactional_burn_item(xcm_ext, from, TokenId::default(), amount)
					.map_err(|_| XcmError::FailedToTransactAsset("fungible item withdraw failed"))?
			}

			Fungibility::NonFungible(instance) => {
				let to = Self::pallet_account();

				Self::transfer_asset_instance(collection_id, xcm_ext, instance, None, from, to)?;
			}
		}

		Ok(what.clone().into())
	}

	fn internal_transfer_asset(
		what: &MultiAsset,
		from: &MultiLocation,
		to: &MultiLocation,
		_context: &XcmContext,
	) -> Result<xcm_executor::Assets, XcmError> {
		let collection_id = Self::multiasset_to_collection(what)?;

		let dispatch =
			T::CollectionDispatch::dispatch(collection_id).map_err(|_| XcmError::AssetNotFound)?;
		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		let from = T::LocationToAccountId::convert_ref(from)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		let to = T::LocationToAccountId::convert_ref(to)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		match what.fun {
			Fungibility::Fungible(amount) => Self::transactional_transfer_from(
				xcm_ext,
				Some(from.clone()),
				from,
				to,
				TokenId::default(),
				amount,
			)
			.map_err(|_| XcmError::FailedToTransactAsset("fungible item transfer failed"))?,

			Fungibility::NonFungible(instance) => Self::transfer_asset_instance(
				collection_id,
				xcm_ext,
				instance,
				Some(from.clone()),
				from,
				to,
			)?,
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
				let encoded_location =
					collection.property(&<Pallet<T>>::reserve_location_property_key())?;
				MultiLocation::decode(&mut &encoded_location[..]).ok()
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
	weights::{WeightToFeePolynomial, WeightToFee},
};

pub struct FreeForAll;

impl WeightTrader for FreeForAll {
	fn new() -> Self {
		Self
	}

	fn buy_weight(&mut self, weight: Weight, payment: Assets) -> Result<Assets, XcmError> {
		log::trace!(target: "fassets::weight", "buy_weight weight: {:?}, payment: {:?}", weight, payment);
		Ok(payment)
	}
}
