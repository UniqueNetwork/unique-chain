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
	CollectionDescription, CollectionLimits,
};
use pallet_common::{dispatch::CollectionDispatch, NATIVE_FUNGIBLE_COLLECTION_ID};
use pallet_common::CommonCollectionOperations;
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
	#[pallet::getter(fn reserve_location_to_collection)]
	pub type ReserveLocationToCollection<T: Config> =
		StorageMap<_, Twox64Concat, xcm::v3::MultiLocation, CollectionId, OptionQuery>;

	/// The correponding NFT token id of reserve NFTs
	#[pallet::storage]
	#[pallet::getter(fn reserve_asset_instance_to_token_id)]
	pub type ReserveAssetInstanceToTokenId<T: Config> = StorageDoubleMap<
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
			<ReserveLocationToCollection<T>>::get(reserve_location).is_none(),
			<Error<T>>::ForeignAssetAlreadyRegistered,
		);

		// FIXME The owner should be the `reserve_location` but
		// at the moment the colleciton owner can't be a general multilocation.
		let owner = Self::pallet_account();

		let collection_id =
			Self::do_create_foreign_collection(reserve_location, owner, name, mode)?;

		<ReserveLocationToCollection<T>>::insert(reserve_location, collection_id);

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
				limits: Some(CollectionLimits {
					owner_can_transfer: Some(true),
					..Default::default()
				}),

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

		let collection_id = if asset_reserve_location == Here.into()
			|| asset_reserve_location == T::SelfLocation::get()
		{
			NATIVE_FUNGIBLE_COLLECTION_ID
		} else {
			Self::reserve_location_to_collection(asset_reserve_location)
				.ok_or(XcmExecutorError::AssetIdConversionFailed)?
		};

		Ok(collection_id)
	}

	#[transactional]
	fn do_create_item(
		collection: &dyn CommonCollectionOperations<T>,
		to: T::CrossAccountId,
		create_data: CreateItemData,
	) -> DispatchResult {
		let owner = collection.owner();

		collection
			.create_item(owner, to, create_data, &Value::new(NESTING_BUDGET))
			.map(|_| ())
			.map_err(|e| e.error)
	}

	#[transactional]
	fn do_burn_from(
		collection: &dyn CommonCollectionOperations<T>,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		let owner = collection.owner();

		collection
			.burn_from(owner, from, token, amount, &Value::new(0))
			.map(|_| ())
			.map_err(|e| e.error)
	}

	#[transactional]
	fn do_transfer_item(
		collection: &dyn CommonCollectionOperations<T>,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		collection
			.transfer(from, to, token, amount, &Value::new(NESTING_BUDGET))
			.map(|_| ())
			.map_err(|e| e.error)
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

		let to = T::LocationToAccountId::convert_ref(to)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		match what.fun {
			Fungibility::Fungible(amount) => Self::do_create_item(
				collection,
				to,
				CreateItemData::Fungible(CreateFungibleData { value: amount }),
			)
			.map_err(|_| XcmError::FailedToTransactAsset("fungible item deposit failed")),

			Fungibility::NonFungible(instance) => {
				match <ReserveAssetInstanceToTokenId<T>>::get(collection_id, instance) {
					Some(token) => {
						let owner = collection
							.token_owner(token)
							.map_err(|_| XcmError::AssetNotFound)?;

						Self::do_transfer_item(collection, owner, to, token, 1).map_err(|_| {
							XcmError::FailedToTransactAsset("non-fungible item deposit failed")
						})?;

						Ok(())
					}
					None => {
						let instance_encoded = instance.encode();

						Self::do_create_item(
							collection,
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
						.map_err(|_| {
							XcmError::FailedToTransactAsset("non-fungible item deposit failed")
						})?;

						let derivative_token_id = collection.last_token_id();
						<ReserveAssetInstanceToTokenId<T>>::insert(
							collection_id,
							instance,
							derivative_token_id,
						);

						Ok(())
					}
				}
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

		let from = T::LocationToAccountId::convert_ref(from)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		match what.fun {
			Fungibility::Fungible(amount) => {
				Self::do_burn_from(collection, from, TokenId(0), amount)
					.map_err(|_| XcmError::FailedToTransactAsset("fungible item withdraw failed"))?
			}

			Fungibility::NonFungible(instance) => {
				let token = <ReserveAssetInstanceToTokenId<T>>::get(collection_id, instance)
					.ok_or(XcmError::AssetNotFound)?;

				let to = Self::pallet_account();

				Self::do_transfer_item(collection, from, to, token, 1).map_err(|_| {
					XcmError::FailedToTransactAsset("non-fungible item withdraw failed")
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
	) -> Result<xcm_executor::Assets, XcmError> {
		let collection_id = Self::multiasset_to_collection(what)?;

		let (token, amount) = match what.fun {
			Fungibility::Fungible(amount) => (TokenId(0), amount),

			Fungibility::NonFungible(instance) => (
				<ReserveAssetInstanceToTokenId<T>>::get(collection_id, instance)
					.ok_or(XcmError::AssetNotFound)?,
				1,
			),
		};

		let dispatch =
			T::CollectionDispatch::dispatch(collection_id).map_err(|_| XcmError::AssetNotFound)?;
		let collection = dispatch.as_dyn();

		let from = T::LocationToAccountId::convert_ref(from)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		let to = T::LocationToAccountId::convert_ref(to)
			.map_err(|()| XcmExecutorError::AccountIdConversionFailed)?;

		Self::do_transfer_item(collection, from, to, token, amount)
			.map_err(|_| XcmError::FailedToTransactAsset("item transfer failed"))?;

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

			if collection.flags().foreign {
				let encoded_location =
					collection.property(&<Pallet<T>>::reserve_location_property_key())?;
				MultiLocation::decode(&mut &encoded_location[..]).ok()
			} else {
				None
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
