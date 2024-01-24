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

use frame_support::{dispatch::DispatchResult, pallet_prelude::*, traits::EnsureOrigin, PalletId};
use frame_system::pallet_prelude::*;
use pallet_common::{
	dispatch::CollectionDispatch, erc::CrossAccountId, XcmExtensions, NATIVE_FUNGIBLE_COLLECTION_ID,
};
use sp_runtime::{
	traits::{AccountIdConversion, Convert},
	FixedPointNumber, FixedU128, Saturating,
};
use sp_std::{boxed::Box, vec, vec::Vec};
use staging_xcm::{
	opaque::latest::{prelude::XcmError, Weight},
	v3::{prelude::*, MultiAsset, XcmContext},
	VersionedAssetId,
};
use staging_xcm_executor::{
	traits::{ConvertLocation, Error as XcmExecutorError, TransactAsset, WeightTrader},
	Assets,
};
use up_data_structs::{
	budget::ZeroBudget, CollectionId, CollectionMode, CollectionName, CollectionTokenPrefix,
	CreateCollectionData, CreateFungibleData, CreateItemData, TokenId,
};

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub use module::*;
pub use weights::WeightInfo;

#[frame_support::pallet]
pub mod module {
	use pallet_common::CollectionIssuer;
	use up_data_structs::CollectionDescription;

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
		/// The foreign asset is already registered.
		ForeignAssetAlreadyRegistered,

		/// The given asset ID could not be converted into the current XCM version.
		BadForeignAssetId,
	}

	#[pallet::event]
	#[pallet::generate_deposit(fn deposit_event)]
	pub enum Event<T: Config> {
		/// The foreign asset registered.
		ForeignAssetRegistered {
			collection_id: CollectionId,
			asset_id: Box<VersionedAssetId>,
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

	/// The fee multiplier used in the trader to pay for XCM execution.
	#[pallet::storage]
	#[pallet::getter(fn collection_fee_multiplier)]
	pub type CollectionFeeMultiplier<T: Config> =
		StorageMap<_, Twox64Concat, CollectionId, FixedU128, OptionQuery>;

	/// The correponding NFT token id of reserve NFTs
	#[pallet::storage]
	#[pallet::getter(fn foreign_reserve_asset_instance_to_token_id)]
	pub type ForeignReserveAssetInstanceToTokenId<T: Config> = StorageDoubleMap<
		Hasher1 = Twox64Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = staging_xcm::v3::AssetInstance,
		Value = TokenId,
		QueryKind = OptionQuery,
	>;

	/// The correponding reserve NFT of a token ID
	#[pallet::storage]
	#[pallet::getter(fn token_id_to_foreign_reserve_asset_instance)]
	pub type TokenIdToForeignReserveAssetInstance<T: Config> = StorageDoubleMap<
		Hasher1 = Twox64Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = TokenId,
		Value = staging_xcm::v3::AssetInstance,
		QueryKind = OptionQuery,
	>;

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
			T::ForceRegisterOrigin::ensure_origin(origin.clone())?;

			let asset_id: AssetId = versioned_asset_id
				.as_ref()
				.clone()
				.try_into()
				.map_err(|()| Error::<T>::BadForeignAssetId)?;

			ensure!(
				!<ForeignAssetToCollection<T>>::contains_key(asset_id),
				<Error<T>>::ForeignAssetAlreadyRegistered,
			);

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
					..Default::default()
				},
			)?;

			<ForeignAssetToCollection<T>>::insert(asset_id, collection_id);
			<CollectionToForeignAsset<T>>::insert(collection_id, asset_id);

			Self::deposit_event(Event::<T>::ForeignAssetRegistered {
				collection_id,
				asset_id: versioned_asset_id,
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

	fn collection_mode(collection_id: CollectionId) -> Option<CollectionMode> {
		pallet_common::CollectionById::<T>::get(collection_id).map(|collection| collection.mode)
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
	fn local_asset_id_to_collection(asset_id: &AssetId) -> Option<CollectionLocality> {
		let AssetId::Concrete(asset_location) = asset_id else {
			return None;
		};

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

		Self::collection_to_foreign_asset(collection_id)
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
		Self::foreign_asset_to_collection(asset_id)
			.map(CollectionLocality::Foreign)
			.or_else(|| Self::local_asset_id_to_collection(asset_id))
			.ok_or_else(|| XcmExecutorError::AssetIdConversionFailed.into())
	}

	/// Converts an XCM asset instance of local collection to the Unique Network's token ID.
	///
	/// The asset instance corresponds to the Unique Network's token ID if it is in the following format:
	/// `AssetInstance::Index(<token ID>)`.
	///
	/// If the asset instance is not in the valid format or the `<token ID>` can't fit into the valid token ID,
	/// `None` will be returned.
	///
	/// Note: this function can return `Some` containing the token ID of a non-existing NFT.
	/// It returns `None` when it failed to convert the `asset_instance` to a local ID.
	fn local_asset_instance_to_token_id(asset_instance: &AssetInstance) -> Option<TokenId> {
		match asset_instance {
			AssetInstance::Index(token_id) => Some(TokenId((*token_id).try_into().ok()?)),
			_ => None,
		}
	}

	/// Obtains the token ID of the `asset_instance` in the collection.
	///
	/// Note: this function can return `Some` containing the token ID of a non-existing NFT.
	/// It returns `None` when it failed to convert the `asset_instance` to a local ID.
	fn asset_instance_to_token_id(
		collection_locality: CollectionLocality,
		asset_instance: &AssetInstance,
	) -> Option<TokenId> {
		match collection_locality {
			CollectionLocality::Local(_) => Self::local_asset_instance_to_token_id(asset_instance),
			CollectionLocality::Foreign(collection_id) => {
				Self::foreign_reserve_asset_instance_to_token_id(collection_id, asset_instance)
			}
		}
	}

	/// Creates a foreign item in the the collection.
	fn create_foreign_asset_instance(
		xcm_ext: &dyn XcmExtensions<T>,
		collection_id: CollectionId,
		asset_instance: &AssetInstance,
		to: T::CrossAccountId,
	) -> DispatchResult {
		let derivative_token_id = xcm_ext.create_item(
			&Self::pallet_account(),
			to,
			CreateItemData::NFT(Default::default()),
			&ZeroBudget,
		)?;

		<ForeignReserveAssetInstanceToTokenId<T>>::insert(
			collection_id,
			asset_instance,
			derivative_token_id,
		);

		<TokenIdToForeignReserveAssetInstance<T>>::insert(
			collection_id,
			derivative_token_id,
			asset_instance,
		);

		Ok(())
	}

	/// Deposits an asset instance to the `to` account.
	///
	/// Either transfers an existing item from the pallet's account
	/// or creates a foreign item.
	fn deposit_asset_instance(
		xcm_ext: &dyn XcmExtensions<T>,
		collection_locality: CollectionLocality,
		asset_instance: &AssetInstance,
		to: T::CrossAccountId,
	) -> XcmResult {
		let token_id = Self::asset_instance_to_token_id(collection_locality, asset_instance);

		let deposit_result = match (collection_locality, token_id) {
			(_, Some(token_id)) => {
				let depositor = &Self::pallet_account();
				let from = depositor;
				let amount = 1;

				xcm_ext.transfer_item(depositor, from, &to, token_id, amount, &ZeroBudget)
			}
			(CollectionLocality::Foreign(collection_id), None) => {
				Self::create_foreign_asset_instance(xcm_ext, collection_id, asset_instance, to)
			}
			(CollectionLocality::Local(_), None) => {
				return Err(XcmExecutorError::InstanceConversionFailed.into());
			}
		};

		deposit_result
			.map_err(|_| XcmError::FailedToTransactAsset("non-fungible item deposit failed"))
	}

	/// Withdraws an asset instance from the `from` account.
	///
	/// Transfers the asset instance to the pallet's account.
	fn withdraw_asset_instance(
		xcm_ext: &dyn XcmExtensions<T>,
		collection_locality: CollectionLocality,
		asset_instance: &AssetInstance,
		from: T::CrossAccountId,
	) -> XcmResult {
		let token_id = Self::asset_instance_to_token_id(collection_locality, asset_instance)
			.ok_or(XcmExecutorError::InstanceConversionFailed)?;

		let depositor = &from;
		let to = Self::pallet_account();
		let amount = 1;
		xcm_ext
			.transfer_item(depositor, &from, &to, token_id, amount, &ZeroBudget)
			.map_err(|_| XcmError::FailedToTransactAsset("non-fungible item withdraw failed"))?;

		Ok(())
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
		to: &MultiLocation,
		_context: Option<&XcmContext>,
	) -> XcmResult {
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

			Fungibility::NonFungible(asset_instance) => {
				Self::deposit_asset_instance(xcm_ext, collection_locality, &asset_instance, to)
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

		let collection_locality = Self::asset_to_collection(&what.id)?;
		let dispatch = T::CollectionDispatch::dispatch(*collection_locality)
			.map_err(|_| XcmExecutorError::AssetIdConversionFailed)?;

		let collection = dispatch.as_dyn();
		let xcm_ext = collection.xcm_extensions().ok_or(XcmError::NoPermission)?;

		match what.fun {
			Fungibility::Fungible(amount) => xcm_ext
				.burn_item(from, TokenId::default(), amount)
				.map_err(|_| XcmError::FailedToTransactAsset("fungible item withdraw failed"))?,

			Fungibility::NonFungible(asset_instance) => {
				Self::withdraw_asset_instance(xcm_ext, collection_locality, &asset_instance, from)?;
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

			Fungibility::NonFungible(asset_instance) => {
				token_id = Self::asset_instance_to_token_id(collection_locality, &asset_instance)
					.ok_or(XcmExecutorError::InstanceConversionFailed)?;

				amount = 1;
				map_error = |_| XcmError::FailedToTransactAsset("non-fungible item transfer failed")
			}
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
impl<T: Config> sp_runtime::traits::Convert<CollectionId, Option<MultiLocation>>
	for CurrencyIdConvert<T>
{
	fn convert(collection_id: CollectionId) -> Option<MultiLocation> {
		if collection_id == NATIVE_FUNGIBLE_COLLECTION_ID {
			Some(T::SelfLocation::get())
		} else {
			<Pallet<T>>::collection_to_foreign_asset(collection_id)
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

impl From<ForeignCollectionMode> for CollectionMode {
	fn from(value: ForeignCollectionMode) -> Self {
		match value {
			ForeignCollectionMode::NFT => Self::NFT,
			ForeignCollectionMode::Fungible(decimals) => Self::Fungible(decimals),
		}
	}
}

pub struct Trader<T: Config, WeightToFee: Convert<Weight, <T as pallet_balances::Config>::Balance>>
{
	weight: Weight,
	payment_asset: Option<AssetId>,
	amount_to_pay: <T as pallet_balances::Config>::Balance,
	_phantom: PhantomData<(T, WeightToFee)>,
}

impl<T: Config, WeightToFee: Convert<Weight, <T as pallet_balances::Config>::Balance>> WeightTrader
	for Trader<T, WeightToFee>
where
	u128: From<<T as pallet_balances::Config>::Balance>,
{
	fn new() -> Self {
		Self {
			weight: Weight::zero(),
			payment_asset: None,
			amount_to_pay: 0u32.into(),
			_phantom: PhantomData,
		}
	}

	fn buy_weight(
		&mut self,
		weight: Weight,
		payment: Assets,
		context: &XcmContext,
	) -> Result<Assets, XcmError> {
		log::trace!(target: "xcm::weight::trader", "buy_weight weight: {weight:?}, payment: {payment:?}, context: {context:?}");

		// In the case of multiple assets in the `BuyExecution`
		// we will use only the first one.
		// Handling multiple types of assets in here is yet to be implemented.
		let payment_asset = payment
			.fungible_assets_iter()
			.next()
			.ok_or(XcmError::TooExpensive)?;

		if let Some(prev_payment_asset) = self.payment_asset {
			if prev_payment_asset != payment_asset.id {
				// In the case of multiple `BuyExecution` instructions,
				// we will handle only one type of assets.
				// Handling different types of assets is yet to be implemented.
				return Err(XcmError::Unimplemented);
			}
		}

		let collection_locality = <Pallet<T>>::asset_to_collection(&payment_asset.id)?;
		let collection_id = *collection_locality;

		let collection_mode =
			<Pallet<T>>::collection_mode(collection_id).ok_or(XcmError::AssetNotFound)?;

		let decimals = match collection_mode {
			CollectionMode::Fungible(decimals) => decimals,

			// NFTs and RFTs are not supported for XCM payment at the moment.
			_ => return Err(XcmError::Unimplemented),
		};

		let multiplier =
			<Pallet<T>>::collection_fee_multiplier(collection_id).ok_or(XcmError::TooExpensive)?;

		let fee = WeightToFee::convert(weight);

		let amount_to_pay = sp_std::cmp::max(multiplier.saturating_mul_int(fee), 1u32.into());

		let required_payment = MultiAsset {
			id: payment_asset.id,
			fun: Fungible(amount_to_pay.into()),
		};

		let unused_payment = payment
			.checked_sub(required_payment)
			.map_err(|_| XcmError::TooExpensive)?;

		// -- Changing the trader's state only after all checks passed --

		if self.payment_asset.is_none() {
			self.payment_asset = Some(payment_asset.id);
		}

		self.weight = self.weight.saturating_add(weight);
		self.amount_to_pay = self.amount_to_pay.saturating_add(amount_to_pay);

		Ok(unused_payment)
	}

	fn refund_weight(&mut self, _weight: Weight, _context: &XcmContext) -> Option<MultiAsset> {
		todo!()
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
		payment: Assets,
		_xcm: &XcmContext,
	) -> Result<Assets, XcmError> {
		log::trace!(target: "fassets::weight", "buy_weight weight: {:?}, payment: {:?}", weight, payment);
		Ok(payment)
	}
}
