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
	traits::{
		fungibles,
		tokens::{
			DepositConsequence, Fortitude, Precision, Preservation, Provenance, WithdrawConsequence,
		},
		ConstU128, EnsureOrigin,
	},
	PalletId,
};
use frame_system::{
	offchain::{AppCrypto, CreateSignedTransaction, SendSignedTransaction, Signer, SigningTypes},
	pallet_prelude::*,
};
use lite_json::JsonValue;
use pallet_common::{
	dispatch::CollectionDispatch, erc::CrossAccountId, XcmExtensions, NATIVE_FUNGIBLE_COLLECTION_ID,
};
use parity_scale_codec::DecodeWithMemTracking;
use sp_core::{crypto::KeyTypeId, U256};
use sp_runtime::{
	offchain::{
		http,
		storage_lock::{StorageLock, Time},
		Duration,
	},
	traits::{AccountIdConversion, IdentifyAccount},
	FixedPointNumber, FixedU128, MultiSigner,
};
#[cfg(not(feature = "std"))]
use sp_std::alloc::{
	format,
	string::{String, ToString},
};
use sp_std::{boxed::Box, vec, vec::Vec};
use staging_xcm::{v5::prelude::*, VersionedAssetId, VersionedLocation};
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
#[derive(
	Clone,
	PartialEq,
	Eq,
	RuntimeDebug,
	Encode,
	Decode,
	DecodeWithMemTracking,
	TypeInfo,
	MaxEncodedLen,
)]
pub enum MigrationStatus {
	V3ToV5(MigrationStatusV3ToV5),
}

/// Status of storage migration from XCMv3 to XCMv5.
#[derive(
	Clone,
	PartialEq,
	Eq,
	RuntimeDebug,
	Encode,
	Decode,
	DecodeWithMemTracking,
	TypeInfo,
	MaxEncodedLen,
)]
pub enum MigrationStatusV3ToV5 {
	/// The migration is completed.
	Done,

	/// An asset is skipped during the migration
	/// because it couldn't be converted to the new XCM version.
	SkippedNotConvertibleAssetId(Box<staging_xcm::v3::AssetId>),

	/// An asset instance is skipped during the migration
	/// because it couldn't be converted to the new XCM version.
	SkippedNotConvertibleAssetInstance {
		collection_id: CollectionId,
		asset_instance: staging_xcm::v3::AssetInstance,
	},
}

pub const KEY_TYPE: KeyTypeId = KeyTypeId(*b"orcl");
const LOCK_TIMEOUT_EXPIRATION: u64 = 30_000; // 30 seconds

/// Based on the above `KeyTypeId` we need to generate a pallet-specific crypto type wrappers.
/// We can use from supported crypto kinds (`sr25519`, `ed25519` and `ecdsa`) and augment
/// the types with this pallet-specific identifier.
pub mod crypto {
	use sp_core::sr25519::Signature as Sr25519Signature;
	use sp_runtime::{
		app_crypto::{app_crypto, sr25519},
		traits::Verify,
		MultiSignature, MultiSigner,
	};

	use super::KEY_TYPE;
	app_crypto!(sr25519, KEY_TYPE);

	pub struct AuthId;

	impl frame_system::offchain::AppCrypto<MultiSigner, MultiSignature> for AuthId {
		type RuntimeAppPublic = Public;
		type GenericSignature = sp_core::sr25519::Signature;
		type GenericPublic = sp_core::sr25519::Public;
	}

	// implemented for mock runtime in test
	impl frame_system::offchain::AppCrypto<<Sr25519Signature as Verify>::Signer, Sr25519Signature>
		for AuthId
	{
		type RuntimeAppPublic = Public;
		type GenericSignature = sp_core::sr25519::Signature;
		type GenericPublic = sp_core::sr25519::Public;
	}
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
		+ orml_oracle::Config
		+ CreateSignedTransaction<orml_oracle::Call<Self>>
	{
		type AccountId32: From<Self::AccountId> + AsRef<[u8; 32]>;
		type AuthorityId: AppCrypto<
			<Self as SigningTypes>::Public,
			<Self as SigningTypes>::Signature,
		>;

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

		/// The conversion coefficient for foreign assets.
		#[pallet::constant]
		type ForeignAssetConversionCoefficientDefault: Get<FixedU128>;

		#[pallet::constant]
		/// 1 DOT in u128
		type DotAccuracy: Get<u128>;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The foreign asset is already registered.
		ForeignAssetAlreadyRegistered,

		/// The given asset ID could not be converted into the current XCM version.
		BadForeignAssetId,

		/// The given location could not be converted into the current XCM version.
		BadLocation,

		/// The specified foreign asset is not found.
		ForeignAssetNotFound,

		/// Only fungible assets could be converted to fee.
		ForeignAssetIsNotFungible,

		/// Failed to parse the balance received from currency exchange.
		CantParseBalance,

		/// Failed to fetch the exchange rate.
		FailedToFetchRate,

		/// Failed to parse the response from the exchange.
		CantParseResponse,

		/// Can't add more oracle members.
		OracleMembersCapacityExceeded,
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
		MigrationStatus(Box<MigrationStatus>),

		ForeignAssetMoved {
			old_asset_id: Box<VersionedAssetId>,
			new_asset_id: Box<VersionedAssetId>,
		},

		ForeignAssetReserveOverride {
			asset_id: Box<VersionedAssetId>,
			reserve_override: Option<Box<VersionedLocation>>,
		},

		ForeignAssetSuspensionSet {
			asset_id: Box<VersionedAssetId>,
			is_suspended: bool,
		},

		ForeignAssetConversionCoefficientSet {
			old_conversion_coefficient: FixedU128,
			new_conversion_coefficient: FixedU128,
		},
	}

	fn fetch_rate<T: Config>() -> Result<FixedU128, Error<T>> {
		let unq_storage_key = "0x99971b5749ac43e0235e41b0d37869188ee7418a6531173d60d1f6a82d8f4d51512f6eaaf236595bff0193f47dc14ef9d7a3d484f8388e304ae0e53869d8443c8f31c951596896e9b942a2e924cc2cf2e99190c148ccde2019000000";
		let dot_storage_key = "0x99971b5749ac43e0235e41b0d37869188ee7418a6531173d60d1f6a82d8f4d51512f6eaaf236595bff0193f47dc14ef9d7a3d484f8388e304ae0e53869d8443c8f31c951596896e9b942a2e924cc2cf239b9d2792f8bd4c305000000";
		let unique_amount_bytes = get_storage_value_from_hydration(unq_storage_key)?;
		let unique_amount = parse_balance(unique_amount_bytes)?;

		let dot_amount_bytes = get_storage_value_from_hydration(dot_storage_key)?;
		let dot_amount = parse_balance(dot_amount_bytes)?;

		Ok(FixedU128::from_rational(
			dot_amount * 100_000_000,
			unique_amount,
		)) // DOT has 10 decimals, UNQ has 18
	}

	fn get_storage_value_from_hydration<T: Config>(storage_key: &str) -> Result<Vec<u8>, Error<T>> {
		let deadline = sp_io::offchain::timestamp().add(Duration::from_millis(2_000));
		let url = Pallet::<T>::currency_exchange_url()
			.map(|v| {
				String::from_utf8(v.to_vec()).unwrap_or("https://hydration.ibp.network".to_string())
			})
			.unwrap_or_else(|| "https://hydration.ibp.network".to_string());
		let body = format!(
			r#"{{"id":1, "jsonrpc":"2.0", "method": "state_getStorage", "params": ["{storage_key}"]}}"#
		);

		let request = http::Request::post(&url, vec![body.as_bytes().to_vec()])
			.add_header("Content-Type", "application/json")
			.deadline(deadline)
			.send()
			.map_err(|_| Error::FailedToFetchRate)?;

		let response = request.wait().map_err(|_| Error::FailedToFetchRate)?;
		let body = response.body().collect::<Vec<u8>>();
		let body_str = sp_std::str::from_utf8(&body).map_err(|_| Error::CantParseResponse)?;
		let val = lite_json::parse_json(body_str).map_err(|_| Error::CantParseResponse)?;
		let storage_value_bytes = match val {
			JsonValue::Object(obj) => {
				let (_, v) = obj
					.into_iter()
					.find(|(k, _)| k.iter().copied().eq("result".chars()))
					.ok_or(Error::CantParseResponse)?;
				match v {
					JsonValue::String(storage_value_hex) => {
						hex::decode(storage_value_hex.iter().skip(2).collect::<String>())
							.map_err(|_| Error::CantParseResponse)?
					}
					_ => return Err(Error::CantParseResponse),
				}
			}
			_ => return Err(Error::CantParseResponse),
		};

		Ok(storage_value_bytes)
	}

	fn parse_balance<T>(storage_value_bytes: Vec<u8>) -> Result<u128, Error<T>> {
		if storage_value_bytes.len() < 16 {
			return Err(Error::CantParseBalance);
		}
		let mut unique_amount_bytes = storage_value_bytes;
		unique_amount_bytes.truncate(16);
		let value = u128::from_le_bytes(
			unique_amount_bytes
				.try_into()
				.map_err(|_| Error::CantParseBalance)?,
		);
		Ok(value)
	}

	/// The corresponding collections of foreign assets.
	#[pallet::storage]
	#[pallet::getter(fn foreign_asset_to_collection)]
	pub type ForeignAssetToCollection<T: Config> =
		StorageMap<_, Blake2_128Concat, staging_xcm::v5::AssetId, CollectionId, OptionQuery>;

	/// The corresponding foreign assets of collections.
	#[pallet::storage]
	#[pallet::getter(fn collection_to_foreign_asset)]
	pub type CollectionToForeignAsset<T: Config> =
		StorageMap<_, Blake2_128Concat, CollectionId, staging_xcm::v5::AssetId, OptionQuery>;

	/// Suspended foreign collections (disables outgoing transfers).
	/// It is needed for events like AHM where our chain shouldn't send tokens to a particular dest.
	#[pallet::storage]
	#[pallet::getter(fn is_suspended_foreign_asset)]
	pub type SuspendedForeignAsset<T: Config> =
		StorageMap<_, Blake2_128Concat, staging_xcm::v5::AssetId, bool, ValueQuery>;

	/// Override the reserve location for the given foreign assets.
	#[pallet::storage]
	#[pallet::getter(fn foreign_asset_reserve_override)]
	pub type ForeignAssetReserveOverride<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		staging_xcm::v5::AssetId,
		staging_xcm::v5::Location,
		OptionQuery,
	>;

	/// The correponding NFT token id of reserve NFTs
	#[pallet::storage]
	#[pallet::getter(fn foreign_reserve_asset_instance_to_token_id)]
	pub type ForeignReserveAssetInstanceToTokenId<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = staging_xcm::v5::AssetInstance,
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
		Value = staging_xcm::v5::AssetInstance,
		QueryKind = OptionQuery,
	>;

	/// The corresponding collections of foreign assets.
	#[pallet::storage]
	#[pallet::getter(fn foreign_asset_conversion_coefficient)]
	pub type ForeignAssetConversionCoefficient<T: Config> = StorageValue<_, FixedU128, OptionQuery>;

	#[pallet::storage]
	pub type OracleMembers<T: Config> =
		StorageValue<_, BoundedVec<T::AccountId, ConstU32<50>>, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn currency_exchange_url)]
	pub type CurrencyExchangeUrl<T: Config> =
		StorageValue<_, BoundedVec<u8, ConstU32<200>>, OptionQuery>;

	#[pallet::storage]
	#[pallet::getter(fn exchange_rate_update_interval)]
	pub type ExchangeRateUpdateInterval<T: Config> =
		StorageValue<Value = u128, QueryKind = ValueQuery, OnEmpty = ConstU128<100>>; // in blocks

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	pub struct Pallet<T>(_);

	impl<T: Config + pallet_balances_adapter::Config + orml_oracle::Config> Pallet<T> {
		pub fn get_convertible_assets() -> Vec<staging_xcm::v5::AssetId> {
			vec![staging_xcm::v5::AssetId(staging_xcm::v5::Location {
				parents: 1,     // means go up one level (to relay chain)
				interior: Here, // refers directly to relay chain’s native token
			})]
		}

		pub fn convert_native_to_asset(
			asset_id: &staging_xcm::v5::AssetId,
			native_amount: u128,
		) -> Option<u128>
		where
			T::OracleKey: TryFrom<Vec<u8>>,
			T::OracleValue: Into<FixedU128>,
		{
			if !Self::get_convertible_assets().contains(asset_id) {
				return None;
			}
			let conversion_coefficient = Self::foreign_asset_conversion_coefficient()
				.unwrap_or_else(T::ForeignAssetConversionCoefficientDefault::get);
			let native_decimals = <T as pallet_balances_adapter::Config>::Decimals::get();
			let conversion_rate =
				orml_oracle::Pallet::<T>::get(&T::OracleKey::try_from(b"DOT".to_vec()).ok()?)?;
			let native_accuracy = 10u128.pow(native_decimals as u32);
			let dot_accuracy = T::DotAccuracy::get();
			let native_fee = FixedU128::checked_from_rational(native_amount, native_accuracy)?;
			let result = conversion_coefficient
				.const_checked_mul(native_fee)?
				.const_checked_mul(conversion_rate.value.into())?;

			if dot_accuracy != FixedU128::accuracy() {
				Some(
					result
						.const_checked_mul(FixedU128::checked_from_rational(
							dot_accuracy,
							FixedU128::accuracy(),
						)?)?
						.into_inner(),
				)
			} else {
				Some(result.into_inner())
			}
		}
	}

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

		#[pallet::call_index(1)]
		#[pallet::weight(<T as Config>::WeightInfo::force_reset_foreign_asset_location())]
		pub fn force_reset_foreign_asset_location(
			origin: OriginFor<T>,
			existing_versioned_asset_id: Box<VersionedAssetId>,
			new_versioned_asset_id: Box<VersionedAssetId>,
		) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin.clone())?;

			let existing_asset_id: AssetId = existing_versioned_asset_id
				.as_ref()
				.clone()
				.try_into()
				.map_err(|()| Error::<T>::BadForeignAssetId)?;

			let new_asset_id: AssetId = new_versioned_asset_id
				.as_ref()
				.clone()
				.try_into()
				.map_err(|()| Error::<T>::BadForeignAssetId)?;

			let collection_id = <ForeignAssetToCollection<T>>::get(&existing_asset_id)
				.ok_or(Error::<T>::ForeignAssetNotFound)?;

			<ForeignAssetToCollection<T>>::remove(&existing_asset_id);
			<CollectionToForeignAsset<T>>::remove(collection_id);

			<ForeignAssetToCollection<T>>::insert(&new_asset_id, collection_id);
			<CollectionToForeignAsset<T>>::insert(collection_id, new_asset_id);

			Self::deposit_event(Event::<T>::ForeignAssetMoved {
				old_asset_id: existing_versioned_asset_id,
				new_asset_id: new_versioned_asset_id,
			});

			Ok(())
		}

		#[pallet::call_index(2)]
		#[pallet::weight(<T as Config>::WeightInfo::force_set_foreign_asset_reserve_override())]
		pub fn force_set_foreign_asset_reserve_override(
			origin: OriginFor<T>,
			versioned_asset_id: Box<VersionedAssetId>,
			versioned_reserve_override: Option<Box<VersionedLocation>>,
		) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin)?;

			let asset_id: AssetId = versioned_asset_id
				.as_ref()
				.clone()
				.try_into()
				.map_err(|()| Error::<T>::BadForeignAssetId)?;

			if let Some(ref versioned_reserve) = versioned_reserve_override {
				let reserve: Location = versioned_reserve
					.as_ref()
					.clone()
					.try_into()
					.map_err(|()| Error::<T>::BadLocation)?;

				<ForeignAssetReserveOverride<T>>::insert(&asset_id, reserve);
			} else {
				<ForeignAssetReserveOverride<T>>::remove(&asset_id);
			}

			Self::deposit_event(Event::<T>::ForeignAssetReserveOverride {
				asset_id: versioned_asset_id,
				reserve_override: versioned_reserve_override,
			});

			Ok(())
		}

		#[pallet::call_index(3)]
		#[pallet::weight(<T as Config>::WeightInfo::force_set_foreign_asset_suspension())]
		pub fn force_set_foreign_asset_suspension(
			origin: OriginFor<T>,
			versioned_asset_id: Box<VersionedAssetId>,
			is_suspended: bool,
		) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin)?;

			let asset_id: AssetId = versioned_asset_id
				.as_ref()
				.clone()
				.try_into()
				.map_err(|()| Error::<T>::BadForeignAssetId)?;

			if is_suspended {
				<SuspendedForeignAsset<T>>::insert(&asset_id, true);
			} else {
				<SuspendedForeignAsset<T>>::remove(&asset_id);
			}

			Self::deposit_event(Event::<T>::ForeignAssetSuspensionSet {
				asset_id: versioned_asset_id,
				is_suspended,
			});

			Ok(())
		}

		#[pallet::call_index(4)]
		//TODO: add benchmark
		#[pallet::weight(<T as Config>::WeightInfo::force_set_foreign_asset_conversion_coefficient())]
		pub fn force_set_foreign_asset_conversion_coefficient(
			origin: OriginFor<T>,
			conversion_coefficient: FixedU128,
		) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin.clone())?;

			let old_conversion_coefficient =
				<ForeignAssetConversionCoefficient<T>>::get().unwrap_or(FixedU128::from(0));

			if conversion_coefficient != 0.into() {
				<ForeignAssetConversionCoefficient<T>>::set(Some(conversion_coefficient));
			}

			Self::deposit_event(Event::<T>::ForeignAssetConversionCoefficientSet {
				old_conversion_coefficient,
				new_conversion_coefficient: conversion_coefficient,
			});

			Ok(())
		}

		#[pallet::call_index(5)]
		#[pallet::weight(<T as Config>::WeightInfo::add_oracle_member())]
		pub fn add_oracle_member(origin: OriginFor<T>, account_id: T::AccountId) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin.clone())?;
			OracleMembers::<T>::mutate(|members| {
				members
					.try_push(account_id)
					.map_err(|_| Error::<T>::OracleMembersCapacityExceeded)
			})?;
			Ok(())
		}

		#[pallet::call_index(6)]
		#[pallet::weight(<T as Config>::WeightInfo::remove_oracle_member())]
		pub fn remove_oracle_member(
			origin: OriginFor<T>,
			account_id: T::AccountId,
		) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin.clone())?;
			OracleMembers::<T>::mutate(|members| {
				members.retain(|x| *x != account_id);
			});
			Ok(())
		}

		#[pallet::call_index(7)]
		#[pallet::weight(<T as Config>::WeightInfo::update_currency_exchange_url())]
		pub fn update_currency_exchange_url(
			origin: OriginFor<T>,
			url: BoundedVec<u8, ConstU32<200>>,
		) -> DispatchResult {
			T::ManagerOrigin::ensure_origin(origin.clone())?;
			CurrencyExchangeUrl::<T>::set(Some(url));
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
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T>
	where
		T: Config,
		T::OracleKey: From<BoundedVec<u8, ConstU32<3>>>,
		T::OracleValue: From<FixedU128>,
		<T as SigningTypes>::Public: From<MultiSigner>,
	{
		fn on_runtime_upgrade() -> Weight {
			if Self::on_chain_storage_version() < 1_u16 {
				let put_version_weight = T::DbWeight::get().writes(1);
				let fix_foreign_flag_weight = Self::fix_foreign_flag();
				let weight_v3_to_v5 = Self::migrate_v3_to_v5();

				Self::in_code_storage_version().put::<Self>();

				put_version_weight
					.saturating_add(fix_foreign_flag_weight)
					.saturating_add(weight_v3_to_v5)
			} else {
				Weight::zero()
			}
		}

		fn offchain_worker(block_number: BlockNumberFor<T>) {
			let block_number: U256 = block_number.into();
			let interval = Self::exchange_rate_update_interval();
			if block_number.as_u128() % interval != 1 {
				return;
			}
			let oracles = OracleMembers::<T>::get()
				.into_iter()
				.flat_map(|account_id: T::AccountId| {
					[
						MultiSigner::Ed25519(
							(*T::AccountId32::as_ref(&T::AccountId32::from(account_id.clone())))
								.into(),
						)
						.into(),
						MultiSigner::Sr25519(
							(*T::AccountId32::as_ref(&T::AccountId32::from(account_id))).into(),
						)
						.into(),
					]
				})
				.collect::<Vec<<T as SigningTypes>::Public>>();
			let signer = Signer::<T, T::AuthorityId>::any_account().with_filter(oracles);
			if !signer.can_sign() {
				Signer::<T, T::AuthorityId>::keystore_accounts().for_each(|account| {
					log::info!(
						"No signer is available for exchange rate offchain worker {:?}",
						account.public.into_account()
					);
				});
				return;
			}
			let mut lock = StorageLock::<Time>::with_deadline(
				b"oracle_worker::lock",
				Duration::from_millis(LOCK_TIMEOUT_EXPIRATION),
			);
			if let Ok(_guard) = lock.try_lock() {
				match fetch_rate::<T>() {
					Ok(rate) => {
						let scaled_rate = T::OracleValue::from(rate);
						let key =
							BoundedVec::<u8, ConstU32<3>>::truncate_from("DOT".as_bytes().to_vec())
								.into();
						let values = BoundedVec::truncate_from(vec![(key, scaled_rate)]);
						let call = orml_oracle::Call::<T>::feed_values { values };
						// Use any available signer to submit a signed extrinsic
						if let Some((_account, result)) =
							signer.send_signed_transaction(|_acct| call.clone())
						{
							if result.is_ok() {
								log::debug!("Signed tx successfully submitted");
							} else {
								log::error!("Signed tx submission failed");
							}
						} else {
							log::error!("No local account available for signing");
						}
					}
					Err(e) => log::error!("Failed to fetch rate: {e:?}"),
				}
			};
		}
	}

	// TODO: check if collection is fungible
	impl<T: Config> fungibles::Inspect<<T as frame_system::Config>::AccountId> for Pallet<T> {
		type AssetId = staging_xcm::v5::AssetId;
		type Balance = u128;

		fn total_issuance(asset: Self::AssetId) -> Self::Balance {
			let Some(collection_id) = <ForeignAssetToCollection<T>>::get(asset) else {
				return Zero::zero();
			};
			let Ok(dispatch) = T::CollectionDispatch::dispatch(collection_id) else {
				return Zero::zero();
			};
			let collection = dispatch.as_dyn();
			collection
				.total_pieces(TokenId::default())
				.unwrap_or_else(Zero::zero)
		}

		fn minimum_balance(_asset: Self::AssetId) -> Self::Balance {
			Zero::zero()
		}

		fn balance(
			asset: Self::AssetId,
			who: &<T as frame_system::Config>::AccountId,
		) -> Self::Balance {
			let Some(collection_id) = <ForeignAssetToCollection<T>>::get(asset) else {
				return Zero::zero();
			};
			let Ok(dispatch) = T::CollectionDispatch::dispatch(collection_id) else {
				return Zero::zero();
			};
			let collection = dispatch.as_dyn();
			collection.balance(T::CrossAccountId::from_sub(who.clone()), TokenId::default())
		}

		fn total_balance(
			asset: Self::AssetId,
			who: &<T as frame_system::Config>::AccountId,
		) -> Self::Balance {
			Pallet::<T>::balance(asset, who)
		}

		fn reducible_balance(
			asset: Self::AssetId,
			who: &<T as frame_system::Config>::AccountId,
			_preservation: Preservation,
			_: Fortitude,
		) -> Self::Balance {
			Pallet::<T>::balance(asset, who)
		}

		fn can_deposit(
			asset: Self::AssetId,
			_who: &<T as frame_system::Config>::AccountId,
			_amount: Self::Balance,
			_provenance: Provenance,
		) -> DepositConsequence {
			if <ForeignAssetToCollection<T>>::get(asset).is_some() {
				DepositConsequence::Success
			} else {
				DepositConsequence::UnknownAsset
			}
		}

		fn can_withdraw(
			asset: Self::AssetId,
			who: &<T as frame_system::Config>::AccountId,
			amount: Self::Balance,
		) -> WithdrawConsequence<Self::Balance> {
			if Pallet::<T>::balance(asset, who) >= amount {
				WithdrawConsequence::Success
			} else {
				WithdrawConsequence::BalanceLow
			}
		}

		fn asset_exists(asset: Self::AssetId) -> bool {
			<ForeignAssetToCollection<T>>::get(asset).is_some()
		}
	}

	impl<T: Config> fungibles::Balanced<<T as frame_system::Config>::AccountId> for Pallet<T> {
		type OnDropCredit = fungibles::DecreaseIssuance<T::AccountId, Self>;
		type OnDropDebt = fungibles::IncreaseIssuance<T::AccountId, Self>;

		fn done_deposit(
			_asset_id: Self::AssetId,
			_who: &<T as frame_system::Config>::AccountId,
			_amount: Self::Balance,
		) {
		}

		fn done_withdraw(
			_asset_id: Self::AssetId,
			_who: &<T as frame_system::Config>::AccountId,
			_amount: Self::Balance,
		) {
		}
	}

	impl<T: Config> fungibles::Unbalanced<T::AccountId> for Pallet<T> {
		fn handle_raw_dust(_: Self::AssetId, _: Self::Balance) {}
		fn handle_dust(_: fungibles::Dust<T::AccountId, Self>) {
			defensive!("`decrease_balance` and `increase_balance` have non-default impls; nothing else calls this; qed");
		}
		fn write_balance(
			_: Self::AssetId,
			_: &T::AccountId,
			_: Self::Balance,
		) -> Result<Option<Self::Balance>, DispatchError> {
			defensive!("write_balance is not used if other functions are impl'd");
			Err(DispatchError::Unavailable)
		}
		fn set_total_issuance(_asset_id: Self::AssetId, _amount: Self::Balance) {
			defensive!("set_total_issuance shouldn't be used");
		}
		fn decrease_balance(
			asset: Self::AssetId,
			who: &T::AccountId,
			amount: Self::Balance,
			precision: Precision,
			_preservation: Preservation,
			_: Fortitude,
		) -> Result<Self::Balance, DispatchError> {
			ensure!(
				precision == Precision::Exact,
				DispatchError::Other("Only Exact precision is supported")
			);
			let Some(collection_id) = <ForeignAssetToCollection<T>>::get(asset) else {
				return Err(DispatchError::Other("Asset is not registered"));
			};
			let Ok(dispatch) = T::CollectionDispatch::dispatch(collection_id) else {
				return Err(DispatchError::Other("Failed to dispatch collection"));
			};
			let collection = dispatch.as_dyn();
			let xcm_ext = collection.xcm_extensions().ok_or(DispatchError::Other(
				"xcm_extensions method not implemented",
			))?;
			let from = T::CrossAccountId::from_sub(who.clone());

			xcm_ext
				.burn_item(from.clone(), TokenId::default(), amount)
				.map(|_| collection.balance(from, TokenId::default()))
				.map_err(|_| DispatchError::Other("Fungible item deposit failed"))
		}
		fn increase_balance(
			asset: Self::AssetId,
			who: &T::AccountId,
			amount: Self::Balance,
			precision: Precision,
		) -> Result<Self::Balance, DispatchError> {
			ensure!(
				precision == Precision::Exact,
				DispatchError::Other("Only Exact precision is supported")
			);
			let Some(collection_id) = <ForeignAssetToCollection<T>>::get(asset) else {
				return Err(DispatchError::Other("Asset is not registered"));
			};
			let Ok(dispatch) = T::CollectionDispatch::dispatch(collection_id) else {
				return Err(DispatchError::Other("Failed to dispatch collection"));
			};
			let collection = dispatch.as_dyn();
			let xcm_ext = collection.xcm_extensions().ok_or(DispatchError::Other(
				"xcm_extensions method not implemented",
			))?;
			let to = T::CrossAccountId::from_sub(who.clone());
			xcm_ext
				.create_item(
					&Self::pallet_account(),
					to.clone(),
					CreateItemData::Fungible(CreateFungibleData { value: amount }),
					&ZeroBudget,
				)
				.map(|_| collection.balance(to, TokenId::default()))
				.map_err(|_| DispatchError::Other("Fungible item deposit failed"))
		}

		// TODO: #13196 implement deactivate/reactivate once we have inactive balance tracking.
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

	fn migrate_v3_to_v5() -> Weight {
		let event_weight = T::DbWeight::get().writes(1);
		let collection_migration_weight = Self::migrate_collections();

		Self::deposit_event(Event::<T>::MigrationStatus(Box::new(
			MigrationStatus::V3ToV5(MigrationStatusV3ToV5::Done),
		)));

		collection_migration_weight.saturating_add(event_weight)
	}

	fn migrate_collections() -> Weight {
		use MigrationStatus::*;
		use MigrationStatusV3ToV5::*;

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
			if let Ok(asset_id) = staging_xcm::v4::AssetId::try_from(asset_id)
				.and_then(staging_xcm::v5::AssetId::try_from)
			{
				<ForeignAssetToCollection<T>>::insert(&asset_id, collection_id);
				<CollectionToForeignAsset<T>>::insert(collection_id, asset_id);
				weight = weight.saturating_add(T::DbWeight::get().writes(2));

				log::info!("\t- migrated the foreign collection #{}", collection_id.0);
			} else {
				Self::deposit_event(Event::<T>::MigrationStatus(Box::new(V3ToV5(
					SkippedNotConvertibleAssetId(Box::new(asset_id)),
				))));
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
		use MigrationStatusV3ToV5::*;

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
			if let Ok(asset_instance) = staging_xcm::v4::AssetInstance::try_from(asset_instance)
				.and_then(staging_xcm::v5::AssetInstance::try_from)
			{
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
				Self::deposit_event(Event::<T>::MigrationStatus(Box::new(V3ToV5(
					SkippedNotConvertibleAssetInstance {
						collection_id,
						asset_instance,
					},
				))));
				weight = weight.saturating_add(T::DbWeight::get().writes(1));

				log::error!("\t- inconsistent foreign token #{}/#{}: failed to convert to the new XCM version", collection_id.0, token_id.0);
			};
		}

		weight
	}

	pub fn pallet_account() -> T::CrossAccountId {
		let owner: T::AccountId = T::PalletId::get().into_account_truncating();
		T::CrossAccountId::from_sub(owner)
	}

	/// Converts a concrete asset ID (the asset multilocation) to a local collection on Unique Network.
	///
	/// The multilocation corresponds to a local collection if:
	/// * It is `Here` location that corresponds to the native token of this parachain.
	/// * It is `../Parachain(<Unique Network Para ID>)` that also corresponds to the native token of this parachain.
	/// * It is `../Parachain(<Unique Network Para ID>)/GeneralIndex(<Collection ID>)` that corresponds
	///   to the collection with the ID equal to `<Collection ID>`. The `<Collection ID>` must be in the valid range,
	///   otherwise `None` is returned.
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
		if <SuspendedForeignAsset<T>>::get(&what.id) {
			return Err(XcmError::NotWithdrawable);
		}

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
		if <SuspendedForeignAsset<T>>::get(&what.id) {
			return Err(XcmError::NotWithdrawable);
		}

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

#[derive(
	Encode, Decode, DecodeWithMemTracking, Eq, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen,
)]
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
		log::trace!(target: "fassets::weight", "buy_weight weight: {weight:?}, payment: {payment:?}");
		Ok(payment)
	}
}
