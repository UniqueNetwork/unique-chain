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



// This file is part of Acala.

// Copyright (C) 2020-2022 Acala Foundation.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

//! # Asset Registry Module
//!
//! Local and foreign assets management. The foreign assets can be updated without runtime upgrade.

#![cfg_attr(not(feature = "std"), no_std)]
#![allow(clippy::unused_unit)]

use frame_support::{
	assert_ok,
	dispatch::DispatchResult,
	ensure,
	pallet_prelude::*,
	traits::{fungible, fungibles, Currency, EnsureOrigin},
	transactional,
	weights::constants::WEIGHT_PER_SECOND,
	RuntimeDebug,
};
use frame_system::pallet_prelude::*;
use up_data_structs::{CollectionMode};
use pallet_common::{Error as CommonError, Event as CommonEvent, Pallet as PalletCommon};
use pallet_fungible::{Pallet as PalletFungible};

// use module_support::{AssetIdMapping, EVMBridge, Erc20InfoMapping, InvokeContext};
// use primitives::{
// 	currency::{CurrencyIdType, DexShare, DexShareType, Erc20Id, ForeignAssetId, Lease, StableAssetPoolId, TokenInfo},
// 	evm::{
// 		is_system_contract, EvmAddress, H160_POSITION_CURRENCY_ID_TYPE, H160_POSITION_DEXSHARE_LEFT_FIELD,
// 		H160_POSITION_DEXSHARE_LEFT_TYPE, H160_POSITION_DEXSHARE_RIGHT_FIELD, H160_POSITION_DEXSHARE_RIGHT_TYPE,
// 		H160_POSITION_FOREIGN_ASSET, H160_POSITION_LIQUID_CROADLOAN, H160_POSITION_STABLE_ASSET, H160_POSITION_TOKEN,
// 	},
// 	CurrencyId,
// };
use scale_info::{prelude::format, TypeInfo};
use sp_runtime::{traits::{One, Zero}, ArithmeticError, FixedPointNumber, FixedU128};
use sp_std::{boxed::Box, vec::Vec};
use up_data_structs::{AccessMode, CollectionId, TokenId, CreateCollectionData};

// NOTE:v1::MultiLocation is used in storages, we would need to do migration if upgrade the
// MultiLocation in the future.
use xcm::opaque::latest::{prelude::XcmError, AssetId, Fungibility::Fungible, MultiAsset};
use xcm::{v1::MultiLocation, VersionedMultiLocation};
use xcm_builder::TakeRevenue;
use xcm_executor::{traits::WeightTrader, Assets};

use pallet_common::erc::CrossAccountId;

pub type ForeignAssetId = u32;
pub type CurrencyId = ForeignAssetId;

// mod mock;
// mod tests;
mod impl_fungibles;
mod weights;

pub use module::*;
pub use weights::WeightInfo;




/// Type alias for currency balance.
pub type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

/// A mapping between ForeignAssetId and AssetMetadata.
pub trait AssetIdMapping<ForeignAssetId, MultiLocation, AssetMetadata> {
	/// Returns the AssetMetadata associated with a given ForeignAssetId.
	fn get_asset_metadata(foreign_asset_id: ForeignAssetId) -> Option<AssetMetadata>;
	/// Returns the MultiLocation associated with a given ForeignAssetId.
	fn get_multi_location(foreign_asset_id: ForeignAssetId) -> Option<MultiLocation>;
	fn get_multi_location2(foreign_asset_id: AssetIds) -> Option<MultiLocation>;
	/// Returns the CurrencyId associated with a given MultiLocation.
	fn get_currency_id(multi_location: MultiLocation) -> Option<CurrencyId>;
}

pub struct XcmForeignAssetIdMapping<T>(sp_std::marker::PhantomData<T>);

impl<T: Config> AssetIdMapping<ForeignAssetId, MultiLocation, AssetMetadata<BalanceOf<T>>>
	for XcmForeignAssetIdMapping<T>
{
	fn get_asset_metadata(foreign_asset_id: ForeignAssetId) -> Option<AssetMetadata<BalanceOf<T>>> {
		log::info!(target: "asset_metadatas", "call");
		Pallet::<T>::asset_metadatas(AssetIds::ForeignAssetId(foreign_asset_id))
	}

	fn get_multi_location(foreign_asset_id: ForeignAssetId) -> Option<MultiLocation> {
		log::info!(target: "get_multi_location", "call");
		Pallet::<T>::foreign_asset_locations(foreign_asset_id)
	}

	fn get_multi_location2(foreign_asset_id: AssetIds) -> Option<MultiLocation> {
		log::info!(target: "get_multi_location2", "call");

		match foreign_asset_id {
			AssetIds::ForeignAssetId(id) =>  Pallet::<T>::foreign_asset_locations(id),
		}
	}

	fn get_currency_id(multi_location: MultiLocation) -> Option<CurrencyId> {
		log::info!(target: "get_currency_id", "call");

		Pallet::<T>::location_to_currency_ids(multi_location)
	}
}

// pub struct AssetIdMaps<T>(sp_std::marker::PhantomData<T>);

// impl<T: Config> AssetIdMapping<ForeignAssetId, MultiLocation, AssetMetadata<BalanceOf<T>>>
// 	for AssetIdMaps<T>
// {
// 	fn get_asset_metadata(foreign_asset_id: ForeignAssetId) -> Option<AssetMetadata<BalanceOf<T>>> {
// 		Pallet::<T>::asset_metadatas(AssetIds::ForeignAssetId(foreign_asset_id))
// 	}

// 	fn get_asset_metadata2(foreign_asset_id: AssetIds) -> Option<AssetMetadata<BalanceOf<T>>> {
// 		Pallet::<T>::asset_metadatas(foreign_asset_id)
// 	}

// 	fn get_multi_location(foreign_asset_id: ForeignAssetId) -> Option<MultiLocation> {
// 		Pallet::<T>::foreign_asset_locations(foreign_asset_id)
// 	}

// 	fn get_currency_id(multi_location: MultiLocation) -> Option<CurrencyId> {
// 		Pallet::<T>::location_to_currency_ids(multi_location)
// 	}
// }


#[frame_support::pallet]
pub mod module {
	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config + pallet_fungible::Config
	// + 
	// fungibles::Mutate<Self::AccountId, AssetId = CurrencyId, Balance = BalanceOf<Self>>	+ 
	// fungibles::Transfer<Self::AccountId, AssetId = CurrencyId, Balance = BalanceOf<Self>> 
	{
		/// The overarching event type.
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;

		/// Currency type for withdraw and balance storage.
		type Currency: Currency<Self::AccountId>;

		/// The Currency ID for the staking currency
		// #[pallet::constant]
		// type StakingCurrencyId: Get<CurrencyId>;

		/// Evm Bridge for getting info of contracts from the EVM.
		// type EVMBridge: EVMBridge<Self::AccountId, BalanceOf<Self>>;

		/// Required origin for registering asset.
		type RegisterOrigin: EnsureOrigin<Self::Origin>;

		/// Weight information for the extrinsics in this module.
		type WeightInfo: WeightInfo;
	}

	#[derive(Clone, Eq, PartialEq, RuntimeDebug, Encode, Decode, TypeInfo)]
	pub enum AssetIds {
	//	Erc20(EvmAddress),
	//	StableAssetId(StableAssetPoolId),
		ForeignAssetId(ForeignAssetId),
	//	NativeAssetId(CurrencyId),
	}

	#[derive(Clone, Eq, PartialEq, RuntimeDebug, Encode, Decode, TypeInfo)]
	pub struct AssetMetadata<Balance> {
		pub name: Vec<u8>,
		pub symbol: Vec<u8>,
		pub decimals: u8,
		pub minimal_balance: Balance,
		pub mapped_collection: CollectionId,
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
	foreign-assets pallet
	/// The storages for MultiLocations.
	///
	/// ForeignAssetLocations: map ForeignAssetId => Option<MultiLocation>
	#[pallet::storage]
	#[pallet::getter(fn foreign_asset_locations)]
	pub type ForeignAssetLocations<T: Config> = StorageMap<_, Twox64Concat, ForeignAssetId, MultiLocation, OptionQuery>;

	/// The storages for CurrencyIds.
	///
	/// LocationToCurrencyIds: map MultiLocation => Option<CurrencyId>
	#[pallet::storage]
	#[pallet::getter(fn location_to_currency_ids)]
	pub type LocationToCurrencyIds<T: Config> = StorageMap<_, Twox64Concat, MultiLocation, CurrencyId, OptionQuery>;

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

	// #[pallet::genesis_config]
	// pub struct GenesisConfig<T: Config> {
	// 	pub assets: Vec<(CurrencyId, BalanceOf<T>)>,
	// }

	// #[cfg(feature = "std")]
	// impl<T: Config> Default for GenesisConfig<T> {
	// 	fn default() -> Self {
	// 		GenesisConfig {
	// 			assets: Default::default(),
	// 		}
	// 	}
	// }

	// #[pallet::genesis_build]
	// impl<T: Config> GenesisBuild<T> for GenesisConfig<T> {
	// 	fn build(&self) {
	// 		self.assets.iter().for_each(|(asset, ed)| {
	// 			assert_ok!(Pallet::<T>::do_register_native_asset(
	// 				*asset,
	// 				&AssetMetadata {
	// 					name: asset.name().unwrap().as_bytes().to_vec(),
	// 					symbol: asset.symbol().unwrap().as_bytes().to_vec(),
	// 					decimals: asset.decimals().unwrap(),
	// 					minimal_balance: *ed,
	// 				}
	// 			));
	// 		});
	// 	}
	// }

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

			let location: MultiLocation = (*location).try_into().map_err(|()| Error::<T>::BadLocation)?;

			let name: Vec<u16> = "Test1\0".encode_utf16().collect::<Vec<u16>>();
			let description: Vec<u16> = "TestDescription1\0".encode_utf16().collect::<Vec<u16>>();
			
			// token_prefix: data.token_prefix,
			let data: CreateCollectionData<T::AccountId> = CreateCollectionData {
				name: name.try_into().unwrap(),
				description: description.try_into().unwrap(),
				mode: CollectionMode::Fungible(18),
				..Default::default()
			};

			// throw an error on bad result
			let bounded_collection_id = <PalletCommon<T>>::init_collection(CrossAccountId::from_sub(owner), data, true)?;//.unwrap();
			//let bounded_collection_id = CollectionId(0);
			let foreign_asset_id = Self::do_register_foreign_asset(&location, &metadata, bounded_collection_id)?;

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

			let location: MultiLocation = (*location).try_into().map_err(|()| Error::<T>::BadLocation)?;
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
			*current = current.checked_add(One::one()).ok_or(ArithmeticError::Overflow)?;
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
			ensure!(maybe_currency_ids.is_none(), Error::<T>::MultiLocationExisted);
			*maybe_currency_ids = Some(foreign_asset_id);
			// *maybe_currency_ids = Some(CurrencyId::ForeignAsset(foreign_asset_id));

			ForeignAssetLocations::<T>::try_mutate(foreign_asset_id, |maybe_location| -> DispatchResult {
				ensure!(maybe_location.is_none(), Error::<T>::MultiLocationExisted);
				*maybe_location = Some(location.clone());

				AssetMetadatas::<T>::try_mutate(
					AssetIds::ForeignAssetId(foreign_asset_id),
					|maybe_asset_metadatas| -> DispatchResult {
						ensure!(maybe_asset_metadatas.is_none(), Error::<T>::AssetIdExisted);

						// insert bounded collection in metadata
						//let mut md = metadata.clone();
						//md.mapped_collection = bounded_collection_id;

						*maybe_asset_metadatas = Some(metadata.clone());
						Ok(())
					},
				)
			})?;

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
		ForeignAssetLocations::<T>::try_mutate(foreign_asset_id, |maybe_multi_locations| -> DispatchResult {
			let old_multi_locations = maybe_multi_locations.as_mut().ok_or(Error::<T>::AssetIdNotExists)?;

			AssetMetadatas::<T>::try_mutate(
				AssetIds::ForeignAssetId(foreign_asset_id),
				|maybe_asset_metadatas| -> DispatchResult {
					ensure!(maybe_asset_metadatas.is_some(), Error::<T>::AssetIdNotExists);

					// modify location
					if location != old_multi_locations {
						LocationToCurrencyIds::<T>::remove(old_multi_locations.clone());
						LocationToCurrencyIds::<T>::try_mutate(location, |maybe_currency_ids| -> DispatchResult {
							ensure!(maybe_currency_ids.is_none(), Error::<T>::MultiLocationExisted);
							// *maybe_currency_ids = Some(CurrencyId::ForeignAsset(foreign_asset_id));
							*maybe_currency_ids = Some(foreign_asset_id);
							Ok(())
						})?;
					}
					*maybe_asset_metadatas = Some(metadata.clone());
					*old_multi_locations = location.clone();
					Ok(())
				},
			)
		})
	}
}

/// Simple fee calculator that requires payment in a single fungible at a fixed rate.
///
/// The constant `FixedRate` type parameter should be the concrete fungible ID and the amount of it
/// required for one second of weight.
pub struct FixedRateOfForeignAsset<T, FixedRate: Get<u128>, R: TakeRevenue> {
	weight: Weight,
	amount: u128,
	ed_ratio: FixedU128,
	multi_location: Option<MultiLocation>,
	_marker: PhantomData<(T, FixedRate, R)>,
}

impl<T: Config, FixedRate: Get<u128>, R: TakeRevenue> WeightTrader for FixedRateOfForeignAsset<T, FixedRate, R>
where
	BalanceOf<T>: Into<u128>,
{
	fn new() -> Self {
		Self {
			weight: 0,
			amount: 0,
			ed_ratio: Default::default(),
			multi_location: None,
			_marker: PhantomData,
		}
	}

	fn buy_weight(&mut self, weight: Weight, payment: Assets) -> Result<Assets, XcmError> {
		log::trace!(target: "asset-registry::weight", "buy_weight weight: {:?}, payment: {:?}", weight, payment);

		// only support first fungible assets now.
		let asset_id = payment
			.fungible
			.iter()
			.next()
			.map_or(Err(XcmError::TooExpensive), |v| Ok(v.0))?;

		if let AssetId::Concrete(ref multi_location) = asset_id {
			log::debug!(target: "asset-registry::weight", "buy_weight multi_location: {:?}", multi_location);

			// if let Some(CurrencyId::ForeignAsset(foreign_asset_id)) =
			// 	Pallet::<T>::location_to_currency_ids(multi_location.clone())
			
			if let Some(foreign_asset_id) =
				Pallet::<T>::location_to_currency_ids(multi_location.clone())
			{
				if let Some(asset_metadatas) = Pallet::<T>::asset_metadatas(AssetIds::ForeignAssetId(foreign_asset_id))
				{
					// The integration tests can ensure the ed is non-zero.
					let ed_ratio = FixedU128::saturating_from_rational(
						asset_metadatas.minimal_balance.into(),
						<T as module::Config>::Currency::minimum_balance().into(),
					);
					// The WEIGHT_PER_SECOND is non-zero.
					let weight_ratio = FixedU128::saturating_from_rational(weight as u128, WEIGHT_PER_SECOND as u128);
					let amount = ed_ratio.saturating_mul_int(weight_ratio.saturating_mul_int(FixedRate::get()));

					let required = MultiAsset {
						id: asset_id.clone(),
						fun: Fungible(amount),
					};

					log::trace!(
						target: "asset-registry::weight", "buy_weight payment: {:?}, required: {:?}, fixed_rate: {:?}, ed_ratio: {:?}, weight_ratio: {:?}",
						payment, required, FixedRate::get(), ed_ratio, weight_ratio
					);
					let unused = payment
						.clone()
						.checked_sub(required)
						.map_err(|_| XcmError::TooExpensive)?;
					self.weight = self.weight.saturating_add(weight);
					self.amount = self.amount.saturating_add(amount);
					self.ed_ratio = ed_ratio;
					self.multi_location = Some(multi_location.clone());
					return Ok(unused);
				}
			}
		}

		log::trace!(target: "asset-registry::weight", "no concrete fungible asset");
		Err(XcmError::TooExpensive)
	}

	fn refund_weight(&mut self, weight: Weight) -> Option<MultiAsset> {
		log::trace!(
			target: "asset-registry::weight", "refund_weight weight: {:?}, weight: {:?}, amount: {:?}, ed_ratio: {:?}, multi_location: {:?}",
			weight, self.weight, self.amount, self.ed_ratio, self.multi_location
		);
		let weight = weight.min(self.weight);
		let weight_ratio = FixedU128::saturating_from_rational(weight as u128, WEIGHT_PER_SECOND as u128);
		let amount = self
			.ed_ratio
			.saturating_mul_int(weight_ratio.saturating_mul_int(FixedRate::get()));

		self.weight = self.weight.saturating_sub(weight);
		self.amount = self.amount.saturating_sub(amount);

		log::trace!(target: "asset-registry::weight", "refund_weight amount: {:?}", amount);
		if amount > 0 && self.multi_location.is_some() {
			Some(
				(
					self.multi_location.as_ref().expect("checked is non-empty; qed").clone(),
					amount,
				)
					.into(),
			)
		} else {
			None
		}
	}
}

impl<T, FixedRate: Get<u128>, R: TakeRevenue> Drop for FixedRateOfForeignAsset<T, FixedRate, R> {
	fn drop(&mut self) {
		log::trace!(target: "asset-registry::weight", "take revenue, weight: {:?}, amount: {:?}, multi_location: {:?}", self.weight, self.amount, self.multi_location);
		if self.amount > 0 && self.multi_location.is_some() {
			R::take_revenue(
				(
					self.multi_location.as_ref().expect("checked is non-empty; qed").clone(),
					self.amount,
				)
					.into(),
			);
		}
	}
}
