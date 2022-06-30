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

#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{pallet_prelude::*, transactional, BoundedVec, dispatch::DispatchResult};
use frame_system::{pallet_prelude::*, ensure_signed};
use sp_runtime::DispatchError;
use up_data_structs::*;
use pallet_common::{Pallet as PalletCommon, Error as CommonError};
use pallet_rmrk_core::{
	Pallet as PalletCore, Error as CoreError,
	misc::{self, *},
	property::RmrkProperty::*,
};
use pallet_nonfungible::{Pallet as PalletNft, NonfungibleHandle};
use pallet_evm::account::CrossAccountId;
use weights::WeightInfo;

pub use pallet::*;

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod rpc;
pub mod weights;

pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_rmrk_core::Config {
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
		type WeightInfo: WeightInfo;
	}

	#[pallet::storage]
	#[pallet::getter(fn internal_part_id)]
	pub type InernalPartId<T: Config> =
		StorageDoubleMap<_, Twox64Concat, CollectionId, Twox64Concat, RmrkPartId, TokenId>;

	#[pallet::storage]
	#[pallet::getter(fn base_has_default_theme)]
	pub type BaseHasDefaultTheme<T: Config> =
		StorageMap<_, Twox64Concat, CollectionId, bool, ValueQuery>;

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		BaseCreated {
			issuer: T::AccountId,
			base_id: RmrkBaseId,
		},
		EquippablesUpdated {
			base_id: RmrkBaseId,
			slot_id: RmrkSlotId,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		PermissionError,
		NoAvailableBaseId,
		NoAvailablePartId,
		BaseDoesntExist,
		NeedsDefaultThemeFirst,
		PartDoesntExist,
		NoEquippableOnFixedPart,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Creates a new Base.
		/// Modeled after [base interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/base.md)
		///
		/// Parameters:
		/// - origin: Caller, will be assigned as the issuer of the Base
		/// - base_type: media type, e.g. "svg"
		/// - symbol: arbitrary client-chosen symbol
		/// - parts: array of Fixed and Slot parts composing the base, confined in length by
		///   RmrkPartsLimit
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::create_base(parts.len() as u32))]
		pub fn create_base(
			origin: OriginFor<T>,
			base_type: RmrkString,
			symbol: RmrkBaseSymbol,
			parts: BoundedVec<RmrkPartType, RmrkPartsLimit>,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			let data = CreateCollectionData {
				limits: None,
				token_prefix: symbol
					.into_inner()
					.try_into()
					.map_err(|_| <CommonError<T>>::CollectionTokenPrefixLimitExceeded)?,
				..Default::default()
			};

			let collection_id_res =
				<PalletNft<T>>::init_collection(cross_sender.clone(), data, true);

			if let Err(DispatchError::Arithmetic(_)) = &collection_id_res {
				return Err(<Error<T>>::NoAvailableBaseId.into());
			}

			let collection_id = collection_id_res?;

			<PalletCommon<T>>::set_scoped_collection_properties(
				collection_id,
				PropertyScope::Rmrk,
				[
					<PalletCore<T>>::rmrk_property(CollectionType, &misc::CollectionType::Base)?,
					<PalletCore<T>>::rmrk_property(BaseType, &base_type)?,
				]
				.into_iter(),
			)?;

			let collection = <PalletCore<T>>::get_nft_collection(collection_id)?;

			for part in parts {
				Self::create_part(&cross_sender, &collection, part)?;
			}

			Self::deposit_event(Event::BaseCreated {
				issuer: sender,
				base_id: collection_id.0,
			});

			Ok(())
		}

		/// Adds a Theme to a Base.
		/// Modeled after [themeadd interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/themeadd.md)
		/// Themes are stored in the Themes storage
		/// A Theme named "default" is required prior to adding other Themes.
		///
		/// Parameters:
		/// - origin: The caller of the function, must be issuer of the base
		/// - base_id: The Base containing the Theme to be updated
		/// - theme: The Theme to add to the Base.  A Theme has a name and properties, which are an
		///   array of [key, value, inherit].
		///   - key: arbitrary BoundedString, defined by client
		///   - value: arbitrary BoundedString, defined by client
		///   - inherit: optional bool
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::theme_add(theme.properties.len() as u32))]
		pub fn theme_add(
			origin: OriginFor<T>,
			base_id: RmrkBaseId,
			theme: RmrkBoundedTheme,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let sender = T::CrossAccountId::from_sub(sender);
			let owner = &sender;

			let collection_id: CollectionId = base_id.into();

			let collection = Self::get_base(collection_id)?;

			if theme.name.as_slice() == b"default" {
				<BaseHasDefaultTheme<T>>::insert(collection_id, true);
			} else if !Self::base_has_default_theme(collection_id) {
				return Err(<Error<T>>::NeedsDefaultThemeFirst.into());
			}

			let token_id = <PalletCore<T>>::create_nft(
				&sender,
				owner,
				&collection,
				[
					<PalletCore<T>>::rmrk_property(TokenType, &NftType::Theme)?,
					<PalletCore<T>>::rmrk_property(ThemeName, &theme.name)?,
					<PalletCore<T>>::rmrk_property(ThemeInherit, &theme.inherit)?,
				]
				.into_iter(),
			)
			.map_err(|_| <Error<T>>::PermissionError)?;

			for property in theme.properties {
				<PalletNft<T>>::set_scoped_token_property(
					collection_id,
					token_id,
					PropertyScope::Rmrk,
					<PalletCore<T>>::rmrk_property(
						UserProperty(property.key.as_slice()),
						&property.value,
					)?,
				)?;
			}

			Ok(())
		}

		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::equippable())]
		pub fn equippable(
			origin: OriginFor<T>,
			base_id: RmrkBaseId,
			slot_id: RmrkSlotId,
			equippables: RmrkEquippableList,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let base_collection_id = base_id.into();
			let collection = Self::get_base(base_collection_id)?;

			<PalletCore<T>>::check_collection_owner(
				&collection,
				&T::CrossAccountId::from_sub(sender),
			)
			.map_err(|err| {
				if err == <CoreError<T>>::NoPermission.into() {
					<Error<T>>::PermissionError.into()
				} else {
					err
				}
			})?;

			let part_id = Self::internal_part_id(base_collection_id, slot_id)
				.ok_or(<Error<T>>::PartDoesntExist)?;

			let nft_type = <PalletCore<T>>::get_nft_type(base_collection_id, part_id)
				.map_err(|_| <Error<T>>::PartDoesntExist)?;

			match nft_type {
				NftType::Regular | NftType::Theme => return Err(<Error<T>>::PermissionError.into()),
				NftType::FixedPart => return Err(<Error<T>>::NoEquippableOnFixedPart.into()),
				NftType::SlotPart => {
					<PalletNft<T>>::set_scoped_token_property(
						base_collection_id,
						part_id,
						PropertyScope::Rmrk,
						<PalletCore<T>>::rmrk_property(EquippableList, &equippables)?,
					)?;
				}
			}

			Self::deposit_event(Event::EquippablesUpdated { base_id, slot_id });

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	fn create_part(
		sender: &T::CrossAccountId,
		collection: &NonfungibleHandle<T>,
		part: RmrkPartType,
	) -> DispatchResult {
		let owner = sender;

		let part_id = part.id();
		let src = part.src();
		let z_index = part.z_index();

		let nft_type = match part {
			RmrkPartType::FixedPart(_) => NftType::FixedPart,
			RmrkPartType::SlotPart(_) => NftType::SlotPart,
		};

		let token_id = match Self::internal_part_id(collection.id, part_id) {
			Some(token_id) => token_id,
			None => {
				let token_id =
					<PalletCore<T>>::create_nft(sender, owner, collection, [].into_iter())
						.map_err(|err| match err {
							DispatchError::Arithmetic(_) => <Error<T>>::NoAvailablePartId.into(),
							err => err,
						})?;

				<InernalPartId<T>>::insert(collection.id, part_id, token_id);

				<PalletNft<T>>::set_scoped_token_property(
					collection.id,
					token_id,
					PropertyScope::Rmrk,
					<PalletCore<T>>::rmrk_property(ExternalPartId, &part_id)?,
				)?;

				token_id
			}
		};

		<PalletNft<T>>::set_scoped_token_properties(
			collection.id,
			token_id,
			PropertyScope::Rmrk,
			[
				<PalletCore<T>>::rmrk_property(TokenType, &nft_type)?,
				<PalletCore<T>>::rmrk_property(Src, &src)?,
				<PalletCore<T>>::rmrk_property(ZIndex, &z_index)?,
			]
			.into_iter(),
		)?;

		if let RmrkPartType::SlotPart(part) = part {
			<PalletNft<T>>::set_scoped_token_property(
				collection.id,
				token_id,
				PropertyScope::Rmrk,
				<PalletCore<T>>::rmrk_property(EquippableList, &part.equippable)?,
			)?;
		}

		Ok(())
	}

	fn get_base(base_id: CollectionId) -> Result<NonfungibleHandle<T>, DispatchError> {
		let collection =
			<PalletCore<T>>::get_typed_nft_collection(base_id, misc::CollectionType::Base)
				.map_err(|err| {
					if err == <CoreError<T>>::CollectionUnknown.into() {
						<Error<T>>::BaseDoesntExist.into()
					} else {
						err
					}
				})?;
		collection.check_is_external()?;

		Ok(collection)
	}
}
