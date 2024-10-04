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
	dispatch::DispatchResult, pallet_prelude::*, storage_alias, traits::EnsureOrigin, PalletId,
};
use frame_system::pallet_prelude::*;
use pallet_common::{
	dispatch::CollectionDispatch, erc::CrossAccountId, XcmExtensions, NATIVE_FUNGIBLE_COLLECTION_ID,
};
use sp_runtime::traits::AccountIdConversion;
use sp_std::{boxed::Box, vec, vec::Vec};
use staging_xcm::{v4::prelude::*, VersionedAssetId};
use staging_xcm_executor::{
	traits::{ConvertLocation, Error as XcmExecutorError, TransactAsset, WeightTrader},
	AssetsInHolding,
};
use up_data_structs::{
	budget::ZeroBudget, CollectionFlags, CollectionId, CollectionMode, CollectionName,
	CollectionTokenPrefix, CreateCollectionData, CreateFungibleData, CreateItemData, TokenId,
};

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub use module::*;
pub use weights::WeightInfo;

/// Status of storage migration from an old XCM version to a new one.
#[derive(Clone, Copy, PartialEq, Eq, RuntimeDebug, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub enum MigrationStatus {
	V3ToV4(MigrationStatusV3ToV4),
}

/// Status of storage migration from XCMv3 to XCMv4.
#[derive(Clone, Copy, PartialEq, Eq, RuntimeDebug, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub enum MigrationStatusV3ToV4 {
	/// The migration is completed.
	Done,

	/// An asset is skipped during the migration
	/// because it couldn't be converted to the new XCM version.
	SkippedNotConvertibleAssetId(staging_xcm::v3::AssetId),

	/// An asset instance is skipped during the migration
	/// because it couldn't be converted to the new XCM version.
	SkippedNotConvertibleAssetInstance {
		collection_id: CollectionId,
		asset_instance: staging_xcm::v3::AssetInstance,
	},
}

#[frame_support::pallet]
pub mod module {
	use frame_support::traits::BuildGenesisConfig;
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
		type ManagerOrigin: EnsureOrigin<Self::RuntimeOrigin>;

		/// The ID of the foreign assets pallet.
		type PalletId: Get<PalletId>;

		/// Self-location of this parachain.
		type SelfLocation: Get<Location>;

		/// The converter from a Location to a CrossAccountId.
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
	#[pallet::generate_deposit(pub(crate) fn deposit_event)]
	pub enum Event<T: Config> {
		/// The foreign asset registered.
		ForeignAssetRegistered {
			collection_id: CollectionId,
			asset_id: Box<VersionedAssetId>,
		},

		/// The migration status.
		MigrationStatus(MigrationStatus),
	}

	/// The corresponding collections of foreign assets.
	#[pallet::storage]
	#[pallet::getter(fn foreign_asset_to_collection)]
	pub type ForeignAssetToCollection<T: Config> =
		StorageMap<_, Blake2_128Concat, staging_xcm::v4::AssetId, CollectionId, OptionQuery>;

	/// The corresponding foreign assets of collections.
	#[pallet::storage]
	#[pallet::getter(fn collection_to_foreign_asset)]
	pub type CollectionToForeignAsset<T: Config> =
		StorageMap<_, Blake2_128Concat, CollectionId, staging_xcm::v4::AssetId, OptionQuery>;

	/// The correponding NFT token id of reserve NFTs
	#[pallet::storage]
	#[pallet::getter(fn foreign_reserve_asset_instance_to_token_id)]
	pub type ForeignReserveAssetInstanceToTokenId<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = staging_xcm::v4::AssetInstance,
		Value = TokenId,
		QueryKind = OptionQuery,
	>;

	/// The correponding reserve NFT of a token ID
	#[pallet::storage]
	#[pallet::getter(fn token_id_to_foreign_reserve_asset_instance)]
	pub type TokenIdToForeignReserveAssetInstance<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = TokenId,
		Value = staging_xcm::v4::AssetInstance,
		QueryKind = OptionQuery,
	>;

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

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

			ensure!(
				!<ForeignAssetToCollection<T>>::contains_key(&asset_id),
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
					flags: CollectionFlags {
						foreign: true,
						..Default::default()
					},
					..Default::default()
				},
			)?;

			<ForeignAssetToCollection<T>>::insert(&asset_id, collection_id);
			<CollectionToForeignAsset<T>>::insert(collection_id, asset_id);

			Self::deposit_event(Event::<T>::ForeignAssetRegistered {
				collection_id,
				asset_id: versioned_asset_id,
			});

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

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			if Self::on_chain_storage_version() < 1 as u16 {
				let put_version_weight = T::DbWeight::get().writes(1);
				let fix_foreign_flag_weight = Self::fix_foreign_flag();
				let weight_v3_to_v4 = Self::migrate_v3_to_v4();

				Self::in_code_storage_version().put::<Self>();

				put_version_weight
					.saturating_add(fix_foreign_flag_weight)
					.saturating_add(weight_v3_to_v4)
			} else {
				Weight::zero()
			}
		}
	}
}

mod v3_storage {
	use super::*;

	#[storage_alias]
	pub type ForeignAssetToCollection<T: Config> =
		StorageMap<Pallet<T>, Twox64Concat, staging_xcm::v3::AssetId, CollectionId, OptionQuery>;

	#[storage_alias]
	pub type CollectionToForeignAsset<T: Config> =
		StorageMap<Pallet<T>, Twox64Concat, CollectionId, staging_xcm::v3::AssetId, OptionQuery>;

	#[storage_alias]
	pub type ForeignReserveAssetInstanceToTokenId<T: Config> = StorageDoubleMap<
		Pallet<T>,
		Twox64Concat,
		CollectionId,
		Blake2_128Concat,
		staging_xcm::v3::AssetInstance,
		TokenId,
		OptionQuery,
	>;

	#[storage_alias]
	pub type TokenIdToForeignReserveAssetInstance<T: Config> = StorageDoubleMap<
		Pallet<T>,
		Twox64Concat,
		CollectionId,
		Blake2_128Concat,
		TokenId,
		staging_xcm::v3::AssetInstance,
		OptionQuery,
	>;
}

impl<T: Config> Pallet<T> {
	fn fix_foreign_flag() -> Weight {
		log::info!("fixing foreign flags...");

		let mut weight = Weight::zero();

		for (_, collection_id) in v3_storage::ForeignAssetToCollection::<T>::iter() {
			pallet_common::CollectionById::<T>::mutate(collection_id, |collection| {
				if let Some(collection) = collection {
					collection.flags.foreign = true;
				}
			});
			log::info!(
				"\t- fixed foreign flag in the foreign collection #{}",
				collection_id.0
			);

			weight = weight.saturating_add(T::DbWeight::get().reads_writes(2, 1));
		}

		log::info!("DONE fixing foreign flags");

		weight
	}

	fn migrate_v3_to_v4() -> Weight {
		let event_weight = T::DbWeight::get().writes(1);
		let collection_migration_weight = Self::migrate_collections();

		Self::deposit_event(Event::<T>::MigrationStatus(MigrationStatus::V3ToV4(
			MigrationStatusV3ToV4::Done,
		)));

		collection_migration_weight.saturating_add(event_weight)
	}

	fn migrate_collections() -> Weight {
		use MigrationStatus::*;
		use MigrationStatusV3ToV4::*;

		log::info!("migrating foreign collections' XCM versions...");

		let mut weight = Weight::zero();

		// IMPORTANT! It is ok to collect all the key-values into the vector
		// if the prod chain contains only few entries.
		let foreign_asset_to_collection =
			v3_storage::ForeignAssetToCollection::<T>::drain().collect::<Vec<_>>();
		let removed_bwd_mapping = v3_storage::CollectionToForeignAsset::<T>::drain().count();

		let r = (foreign_asset_to_collection.len() + removed_bwd_mapping) as u64;
		let w = r;
		weight = weight.saturating_add(T::DbWeight::get().reads_writes(r, w));

		for (asset_id, collection_id) in foreign_asset_to_collection.into_iter() {
			if let Ok(asset_id) = staging_xcm::v4::AssetId::try_from(asset_id) {
				<ForeignAssetToCollection<T>>::insert(&asset_id, collection_id);
				<CollectionToForeignAsset<T>>::insert(collection_id, asset_id);
				weight = weight.saturating_add(T::DbWeight::get().writes(2));

				log::info!("\t- migrated the foreign collection #{}", collection_id.0);
			} else {
				Self::deposit_event(Event::<T>::MigrationStatus(V3ToV4(
					SkippedNotConvertibleAssetId(asset_id),
				)));
				weight = weight.saturating_add(T::DbWeight::get().writes(1));

				log::error!("\t- inconsistent foreign collection #{}: failed to convert to the new XCM version", collection_id.0);
			};
		}

		let token_migration_weight = Self::migrate_tokens();
		weight = weight.saturating_add(token_migration_weight);

		log::info!("DONE migrating foreign collections' XCM versions");

		weight
	}

	fn migrate_tokens() -> Weight {
		use MigrationStatus::*;
		use MigrationStatusV3ToV4::*;

		let mut weight = Weight::zero();

		// IMPORTANT! It is ok to collect all the key-values into the vector
		// if the prod chain contains only few entries.
		let foreign_reserve_asset_instance_to_token_id =
			v3_storage::ForeignReserveAssetInstanceToTokenId::<T>::drain().collect::<Vec<_>>();
		let removed_bwd_mapping =
			v3_storage::TokenIdToForeignReserveAssetInstance::<T>::drain().count();

		let r = (foreign_reserve_asset_instance_to_token_id.len() + removed_bwd_mapping) as u64;
		let w = r;
		weight = weight.saturating_add(T::DbWeight::get().reads_writes(r, w));

		for (collection_id, asset_instance, token_id) in
			foreign_reserve_asset_instance_to_token_id.into_iter()
		{
			if let Ok(asset_instance) = staging_xcm::v4::AssetInstance::try_from(asset_instance) {
				<ForeignReserveAssetInstanceToTokenId<T>>::insert(
					collection_id,
					asset_instance,
					token_id,
				);
				<TokenIdToForeignReserveAssetInstance<T>>::insert(
					collection_id,
					token_id,
					asset_instance,
				);
				weight = weight.saturating_add(T::DbWeight::get().writes(2));

				log::info!(
					"\t- migrated the foreign token #{}/#{}",
					collection_id.0,
					token_id.0
				);
			} else {
				Self::deposit_event(Event::<T>::MigrationStatus(V3ToV4(
					SkippedNotConvertibleAssetInstance {
						collection_id,
						asset_instance,
					},
				)));
				weight = weight.saturating_add(T::DbWeight::get().writes(1));

				log::error!("\t- inconsistent foreign token #{}/#{}: failed to convert to the new XCM version", collection_id.0, token_id.0);
			};
		}

		weight
	}

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

// #[derive()]
// pub enum Migration {

// }

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

			Fungibility::NonFungible(asset_instance) => {
				Self::deposit_asset_instance(xcm_ext, collection_locality, &asset_instance, to)
			}
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

			Fungibility::NonFungible(asset_instance) => {
				Self::withdraw_asset_instance(xcm_ext, collection_locality, &asset_instance, from)?;
			}
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
impl<T: Config> sp_runtime::traits::Convert<CollectionId, Option<Location>>
	for CurrencyIdConvert<T>
{
	fn convert(collection_id: CollectionId) -> Option<Location> {
		if collection_id == NATIVE_FUNGIBLE_COLLECTION_ID {
			Some(T::SelfLocation::get())
		} else {
			<Pallet<T>>::collection_to_foreign_asset(collection_id)
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
