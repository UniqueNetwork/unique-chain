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

use frame_support::{dispatch::DispatchResult, pallet_prelude::*};
use frame_system::pallet_prelude::*;
use pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID;
use pallet_xfun::Pallet as PalletXFun;
use sp_std::{boxed::Box, vec};
use staging_xcm::{
	opaque::latest::{prelude::XcmError, Weight},
	v3::{prelude::*, XcmContext},
	VersionedAssetId,
};
use staging_xcm_executor::{traits::WeightTrader, Assets};
use up_data_structs::{CollectionId, CollectionName, CollectionTokenPrefix};

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub use module::*;
pub use weights::WeightInfo;

#[frame_support::pallet]
pub mod module {
	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config + pallet_xfun::Config {
		/// The overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// Self-location of this parachain relative to its parent.
		type SelfLocation: Get<MultiLocation>;

		/// Weight information for the extrinsics in this module.
		type WeightInfo: WeightInfo;
	}

	#[pallet::event]
	pub enum Event<T: Config> {}

	#[pallet::pallet]
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
			match mode {
				ForeignCollectionMode::Fungible(decimals) => {
					<PalletXFun<T>>::register_foreign_asset(
						origin,
						versioned_asset_id,
						name,
						token_prefix,
						decimals,
					)
				}

				ForeignCollectionMode::NFT => todo!(),
			}
		}
	}
}

pub struct CurrencyIdConvert<T: Config>(PhantomData<T>);
impl<T: Config> sp_runtime::traits::Convert<CollectionId, Option<MultiLocation>>
	for CurrencyIdConvert<T>
{
	fn convert(collection_id: CollectionId) -> Option<MultiLocation> {
		if collection_id == NATIVE_FUNGIBLE_COLLECTION_ID {
			Some(T::SelfLocation::get())
		} else {
			<PalletXFun<T>>::collection_to_foreign_asset(collection_id)
				.and_then(|asset_id| match asset_id {
					AssetId::Concrete(location) => Some(location),
					_ => None,
				})
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
