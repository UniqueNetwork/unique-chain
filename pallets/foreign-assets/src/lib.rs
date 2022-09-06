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
	dispatch::DispatchResult,
	ensure,
	pallet_prelude::*,
	traits::{fungible, fungibles, Currency, EnsureOrigin},
	transactional, RuntimeDebug,
};
use frame_system::pallet_prelude::*;
use up_data_structs::{CollectionMode};
use pallet_fungible::{Pallet as PalletFungible};
use scale_info::{TypeInfo};
use sp_runtime::{
	traits::{One, Zero},
	ArithmeticError,
};
use sp_std::{boxed::Box, vec::Vec};
use up_data_structs::{CollectionId, TokenId, CreateCollectionData};

// NOTE:v1::MultiLocation is used in storages, we would need to do migration if upgrade the
// MultiLocation in the future.
use xcm::opaque::latest::prelude::XcmError;
use xcm::{v1::MultiLocation, VersionedMultiLocation};
use xcm_executor::{traits::WeightTrader, Assets};

use pallet_common::erc::CrossAccountId;

#[cfg(feature = "std")]
use serde::{Deserialize, Serialize};

// TODO: Move to primitives
// Id of native currency.
// 0 - QTZ\UNQ
// 1 - KSM\DOT
#[derive(
	Clone,
	Copy,
	Eq,
	PartialEq,
	PartialOrd,
	Ord,
	MaxEncodedLen,
	RuntimeDebug,
	Encode,
	Decode,
	TypeInfo,
)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum NativeCurrency {
	Here = 0,
	Parent = 1,
}

#[derive(
	Clone,
	Copy,
	Eq,
	PartialEq,
	PartialOrd,
	Ord,
	MaxEncodedLen,
	RuntimeDebug,
	Encode,
	Decode,
	TypeInfo,
)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum AssetIds {
	ForeignAssetId(ForeignAssetId),
	NativeAssetId(NativeCurrency),
}

pub trait TryAsForeign<T, F> {
	fn try_as_foreign(asset: T) -> Option<F>;
}

impl TryAsForeign<AssetIds, ForeignAssetId> for AssetIds {
	fn try_as_foreign(asset: AssetIds) -> Option<ForeignAssetId> {
		match asset {
			AssetIds::ForeignAssetId(id) => Some(id),
			_ => None,
		}
	}
}

pub type ForeignAssetId = u32;
pub type CurrencyId = AssetIds;

mod impl_fungibles;
mod weights;

pub use module::*;
pub use weights::WeightInfo;

/// Type alias for currency balance.
pub type BalanceOf<T> =
	<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

/// A mapping between ForeignAssetId and AssetMetadata.
pub trait AssetIdMapping<ForeignAssetId, MultiLocation, AssetMetadata> {
	/// Returns the AssetMetadata associated with a given ForeignAssetId.
	fn get_asset_metadata(foreign_asset_id: ForeignAssetId) -> Option<AssetMetadata>;
	/// Returns the MultiLocation associated with a given ForeignAssetId.
	fn get_multi_location(foreign_asset_id: ForeignAssetId) -> Option<MultiLocation>;
	/// Returns the CurrencyId associated with a given MultiLocation.
	fn get_currency_id(multi_location: MultiLocation) -> Option<CurrencyId>;
}

pub struct XcmForeignAssetIdMapping<T>(sp_std::marker::PhantomData<T>);

impl<T: Config> AssetIdMapping<ForeignAssetId, MultiLocation, AssetMetadata<BalanceOf<T>>>
	for XcmForeignAssetIdMapping<T>
{
	fn get_asset_metadata(foreign_asset_id: ForeignAssetId) -> Option<AssetMetadata<BalanceOf<T>>> {
		log::trace!(target: "fassets::asset_metadatas", "call");
		Pallet::<T>::asset_metadatas(AssetIds::ForeignAssetId(foreign_asset_id))
	}

	fn get_multi_location(foreign_asset_id: ForeignAssetId) -> Option<MultiLocation> {
		log::trace!(target: "fassets::get_multi_location", "call");
		Pallet::<T>::foreign_asset_locations(foreign_asset_id)
	}

	fn get_currency_id(multi_location: MultiLocation) -> Option<CurrencyId> {
		log::trace!(target: "fassets::get_currency_id", "call");
		Some(AssetIds::ForeignAssetId(
			Pallet::<T>::location_to_currency_ids(multi_location).unwrap_or(0),
		))
	}
}

#[frame_support::pallet]
pub mod module {
	use super::*;

	#[pallet::config]
	pub trait Config:
		frame_system::Config
		+ pallet_common::Config
		+ pallet_fungible::Config
		+ orml_tokens::Config
		+ pallet_balances::Config
	{
		/// The overarching event type.
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;

		/// Currency type for withdraw and balance storage.
		type Currency: Currency<Self::AccountId>;

		/// Required origin for registering asset.
		type RegisterOrigin: EnsureOrigin<Self::Origin>;

		/// Weight information for the extrinsics in this module.
		type WeightInfo: WeightInfo;
	}

	#[derive(Clone, Eq, PartialEq, RuntimeDebug, Encode, Decode, TypeInfo)]
	pub struct AssetMetadata<Balance> {
		pub name: Vec<u8>,
		pub symbol: Vec<u8>,
		pub decimals: u8,
		pub minimal_balance: Balance,
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The given location could not be used (e.g. because it cannot be expressed in the
		/// desired version of XCM).
		BadLocation,
		/// MultiLocation existed
		MultiLocationExisted,
		/// AssetId not exists
		AssetIdNotExists,
		/// AssetId exists
		AssetIdExisted,
	}

	#[pallet::event]
	#[pallet::generate_deposit(fn deposit_event)]
	pub enum Event<T: Config> {
		/// The foreign asset registered.
		ForeignAssetRegistered {
			asset_id: ForeignAssetId,
			asset_address: MultiLocation,
			metadata: AssetMetadata<BalanceOf<T>>,
		},
		/// The foreign asset updated.
		ForeignAssetUpdated {
			asset_id: ForeignAssetId,
			asset_address: MultiLocation,
			metadata: AssetMetadata<BalanceOf<T>>,
		},
		/// The asset registered.
		AssetRegistered {
			asset_id: AssetIds,
			metadata: AssetMetadata<BalanceOf<T>>,
		},
		/// The asset updated.
		AssetUpdated {
			asset_id: AssetIds,
			metadata: AssetMetadata<BalanceOf<T>>,
		},
	}

	/// Next available Foreign AssetId ID.
	///
	/// NextForeignAssetId: ForeignAssetId
	#[pallet::storage]
	#[pallet::getter(fn next_foreign_asset_id)]
	pub type NextForeignAssetId<T: Config> = StorageValue<_, ForeignAssetId, ValueQuery>;
	/// The storages for MultiLocations.
	///
	/// ForeignAssetLocations: map ForeignAssetId => Option<MultiLocation>
	#[pallet::storage]
	#[pallet::getter(fn foreign_asset_locations)]
	pub type ForeignAssetLocations<T: Config> =
		StorageMap<_, Twox64Concat, ForeignAssetId, MultiLocation, OptionQuery>;

	/// The storages for CurrencyIds.
	///
	/// LocationToCurrencyIds: map MultiLocation => Option<ForeignAssetId>
	#[pallet::storage]
	#[pallet::getter(fn location_to_currency_ids)]
	pub type LocationToCurrencyIds<T: Config> =
		StorageMap<_, Twox64Concat, MultiLocation, ForeignAssetId, OptionQuery>;

	/// The storages for AssetMetadatas.
	///
	/// AssetMetadatas: map AssetIds => Option<AssetMetadata>
	#[pallet::storage]
	#[pallet::getter(fn asset_metadatas)]
	pub type AssetMetadatas<T: Config> =
		StorageMap<_, Twox64Concat, AssetIds, AssetMetadata<BalanceOf<T>>, OptionQuery>;

	/// The storages for assets to fungible collection binding
	///
	#[pallet::storage]
	#[pallet::getter(fn asset_binding)]
	pub type AssetBinding<T: Config> =
		StorageMap<_, Twox64Concat, ForeignAssetId, CollectionId, OptionQuery>;

	#[pallet::pallet]
	#[pallet::without_storage_info]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(<T as Config>::WeightInfo::register_foreign_asset())]
		#[transactional]
		pub fn register_foreign_asset(
			origin: OriginFor<T>,
			owner: T::AccountId,
			location: Box<VersionedMultiLocation>,
			metadata: Box<AssetMetadata<BalanceOf<T>>>,
		) -> DispatchResult {
			T::RegisterOrigin::ensure_origin(origin.clone())?;

			let location: MultiLocation = (*location)
				.try_into()
				.map_err(|()| Error::<T>::BadLocation)?;

			let md = metadata.clone();
			let name: Vec<u16> = md.name.into_iter().map(|x| x as u16).collect::<Vec<u16>>();
			let mut description: Vec<u16> = "Foreign assets collection for "
				.encode_utf16()
				.collect::<Vec<u16>>();
			description.append(&mut name.clone());

			let data: CreateCollectionData<T::AccountId> = CreateCollectionData {
				name: name.try_into().unwrap(),
				description: description.try_into().unwrap(),
				mode: CollectionMode::Fungible(18),
				..Default::default()
			};

			let bounded_collection_id = <PalletFungible<T>>::init_foreign_collection(
				CrossAccountId::from_sub(owner),
				data,
			)?;
			let foreign_asset_id =
				Self::do_register_foreign_asset(&location, &metadata, bounded_collection_id)?;

			Self::deposit_event(Event::<T>::ForeignAssetRegistered {
				asset_id: foreign_asset_id,
				asset_address: location,
				metadata: *metadata,
			});
			Ok(())
		}

		#[pallet::weight(<T as Config>::WeightInfo::update_foreign_asset())]
		#[transactional]
		pub fn update_foreign_asset(
			origin: OriginFor<T>,
			foreign_asset_id: ForeignAssetId,
			location: Box<VersionedMultiLocation>,
			metadata: Box<AssetMetadata<BalanceOf<T>>>,
		) -> DispatchResult {
			T::RegisterOrigin::ensure_origin(origin)?;

			let location: MultiLocation = (*location)
				.try_into()
				.map_err(|()| Error::<T>::BadLocation)?;
			Self::do_update_foreign_asset(foreign_asset_id, &location, &metadata)?;

			Self::deposit_event(Event::<T>::ForeignAssetUpdated {
				asset_id: foreign_asset_id,
				asset_address: location,
				metadata: *metadata,
			});
			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	fn get_next_foreign_asset_id() -> Result<ForeignAssetId, DispatchError> {
		NextForeignAssetId::<T>::try_mutate(|current| -> Result<ForeignAssetId, DispatchError> {
			let id = *current;
			*current = current
				.checked_add(One::one())
				.ok_or(ArithmeticError::Overflow)?;
			Ok(id)
		})
	}

	fn do_register_foreign_asset(
		location: &MultiLocation,
		metadata: &AssetMetadata<BalanceOf<T>>,
		bounded_collection_id: CollectionId,
	) -> Result<ForeignAssetId, DispatchError> {
		let foreign_asset_id = Self::get_next_foreign_asset_id()?;
		LocationToCurrencyIds::<T>::try_mutate(location, |maybe_currency_ids| -> DispatchResult {
			ensure!(
				maybe_currency_ids.is_none(),
				Error::<T>::MultiLocationExisted
			);
			*maybe_currency_ids = Some(foreign_asset_id);
			// *maybe_currency_ids = Some(CurrencyId::ForeignAsset(foreign_asset_id));

			ForeignAssetLocations::<T>::try_mutate(
				foreign_asset_id,
				|maybe_location| -> DispatchResult {
					ensure!(maybe_location.is_none(), Error::<T>::MultiLocationExisted);
					*maybe_location = Some(location.clone());

					AssetMetadatas::<T>::try_mutate(
						AssetIds::ForeignAssetId(foreign_asset_id),
						|maybe_asset_metadatas| -> DispatchResult {
							ensure!(maybe_asset_metadatas.is_none(), Error::<T>::AssetIdExisted);
							*maybe_asset_metadatas = Some(metadata.clone());
							Ok(())
						},
					)
				},
			)?;

			AssetBinding::<T>::try_mutate(foreign_asset_id, |collection_id| -> DispatchResult {
				*collection_id = Some(bounded_collection_id);
				Ok(())
			})
		})?;

		Ok(foreign_asset_id)
	}

	fn do_update_foreign_asset(
		foreign_asset_id: ForeignAssetId,
		location: &MultiLocation,
		metadata: &AssetMetadata<BalanceOf<T>>,
	) -> DispatchResult {
		ForeignAssetLocations::<T>::try_mutate(
			foreign_asset_id,
			|maybe_multi_locations| -> DispatchResult {
				let old_multi_locations = maybe_multi_locations
					.as_mut()
					.ok_or(Error::<T>::AssetIdNotExists)?;

				AssetMetadatas::<T>::try_mutate(
					AssetIds::ForeignAssetId(foreign_asset_id),
					|maybe_asset_metadatas| -> DispatchResult {
						ensure!(
							maybe_asset_metadatas.is_some(),
							Error::<T>::AssetIdNotExists
						);

						// modify location
						if location != old_multi_locations {
							LocationToCurrencyIds::<T>::remove(old_multi_locations.clone());
							LocationToCurrencyIds::<T>::try_mutate(
								location,
								|maybe_currency_ids| -> DispatchResult {
									ensure!(
										maybe_currency_ids.is_none(),
										Error::<T>::MultiLocationExisted
									);
									// *maybe_currency_ids = Some(CurrencyId::ForeignAsset(foreign_asset_id));
									*maybe_currency_ids = Some(foreign_asset_id);
									Ok(())
								},
							)?;
						}
						*maybe_asset_metadatas = Some(metadata.clone());
						*old_multi_locations = location.clone();
						Ok(())
					},
				)
			},
		)
	}
}

pub use frame_support::{
	traits::{
		fungibles::{Balanced, CreditOf},
		tokens::currency::Currency as CurrencyT,
		OnUnbalanced as OnUnbalancedT,
	},
	weights::{WeightToFeePolynomial, WeightToFee},
};

pub struct FreeForAll<
	WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
	AssetId: Get<MultiLocation>,
	AccountId,
	Currency: CurrencyT<AccountId>,
	OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
>(
	Weight,
	Currency::Balance,
	PhantomData<(WeightToFee, AssetId, AccountId, Currency, OnUnbalanced)>,
);

impl<
		WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
		AssetId: Get<MultiLocation>,
		AccountId,
		Currency: CurrencyT<AccountId>,
		OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
	> WeightTrader for FreeForAll<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn new() -> Self {
		Self(0, Zero::zero(), PhantomData)
	}

	fn buy_weight(&mut self, weight: Weight, payment: Assets) -> Result<Assets, XcmError> {
		log::trace!(target: "fassets::weight", "buy_weight weight: {:?}, payment: {:?}", weight, payment);
		Ok(payment)
	}
}
impl<
		WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
		AssetId: Get<MultiLocation>,
		AccountId,
		Currency: CurrencyT<AccountId>,
		OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
	> Drop for FreeForAll<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn drop(&mut self) {
		OnUnbalanced::on_unbalanced(Currency::issue(self.1));
	}
}
