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
use pallet_rmrk_core::{Pallet as PalletCore, misc::{self, *}, property::RmrkProperty::*};
use pallet_nonfungible::{Pallet as PalletNft, NonfungibleHandle};
use pallet_evm::account::CrossAccountId;

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config
                    + pallet_rmrk_core::Config {
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
	}

    #[pallet::storage]
	#[pallet::getter(fn internal_part_id)]
	pub type InernalPartId<T: Config> = StorageDoubleMap<
        _,
        Twox64Concat,
        CollectionId,
        Twox64Concat,
        RmrkPartId,
        TokenId
    >;

    #[pallet::storage]
	#[pallet::getter(fn base_has_default_theme)]
    pub type BaseHasDefaultTheme<T: Config> = StorageMap<
        _,
        Twox64Concat,
        CollectionId,
        bool,
        ValueQuery
    >;

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
    }

    #[pallet::error]
	pub enum Error<T> {
        PermissionError,
        NoAvailableBaseId,
        NoAvailablePartId,
        BaseDoesntExist,
        NeedsDefaultThemeFirst,
    }

    #[pallet::call]
	impl<T: Config> Pallet<T> {
        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
        #[transactional]
		pub fn create_base(
			origin: OriginFor<T>,
			base_type: RmrkString,
			symbol: RmrkString,
			parts: BoundedVec<RmrkPartType, RmrkPartsLimit>,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            let cross_sender = T::CrossAccountId::from_sub(sender.clone());

            let data = CreateCollectionData {
                limits: None,
                token_prefix: symbol.into_inner()
                    .try_into()
                    .map_err(|_| <CommonError<T>>::CollectionTokenPrefixLimitExceeded)?,
                ..Default::default()
            };

            let collection_id_res = <PalletNft<T>>::init_collection(sender.clone(), data);

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
                ].into_iter()
            )?;

            let collection = <PalletCore<T>>::get_nft_collection(collection_id)?;

            for part in parts {
                let part_id = part.id();
                let part_token_id = Self::create_part(
                    &cross_sender,
                    &collection,
                    part
                )?;

                <InernalPartId<T>>::insert(collection_id, part_id, part_token_id);

                <PalletNft<T>>::set_scoped_token_property(
                    collection_id,
                    part_token_id,
                    PropertyScope::Rmrk,
                    <PalletCore<T>>::rmrk_property(ExternalPartId, &part_id)?
                )?;
            }

            Self::deposit_event(Event::BaseCreated { issuer: sender, base_id: collection_id.0 });

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
        #[transactional]
		pub fn theme_add(
			origin: OriginFor<T>,
			base_id: RmrkBaseId,
			theme: RmrkTheme,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            let sender = T::CrossAccountId::from_sub(sender);
            let owner = &sender;

            let collection_id: CollectionId = base_id.into();

            let collection = <PalletCore<T>>::get_typed_nft_collection(
                collection_id,
                misc::CollectionType::Base
            ).map_err(|_| <Error<T>>::BaseDoesntExist)?;

            if theme.name.as_slice() == b"default" {
                <BaseHasDefaultTheme<T>>::insert(collection_id, true);
            } else if !Self::base_has_default_theme(collection_id) {
                return Err(<Error<T>>::NeedsDefaultThemeFirst.into());
            }

            let token_id = <PalletCore<T>>::create_nft(
                &sender,
                owner,
                &collection,
                NftType::Theme,
                [
                    <PalletCore<T>>::rmrk_property(ThemeName, &theme.name)?,
                    <PalletCore<T>>::rmrk_property(ThemeInherit, &theme.inherit)?
                ].into_iter()
            ).map_err(|_| <Error<T>>::PermissionError)?;

            for property in theme.properties {
                <PalletNft<T>>::set_scoped_token_property(
                    collection_id,
                    token_id,
                    PropertyScope::Rmrk,
                    <PalletCore<T>>::rmrk_property(
                        UserProperty(property.key.as_slice()),
                        &property.value
                    )?
                )?;
            }

            Ok(())
        }
    }
}

impl<T: Config> Pallet<T> {
    fn create_part(
        sender: &T::CrossAccountId,
        collection: &NonfungibleHandle<T>,
        part: RmrkPartType
    ) -> Result<TokenId, DispatchError> {
        let owner = sender;

        let src = part.src();
        let z_index = part.z_index();

        let nft_type = match part {
            RmrkPartType::FixedPart(_) => NftType::FixedPart,
            RmrkPartType::SlotPart(_) => NftType::SlotPart,
        };

        let token_id = <PalletCore<T>>::create_nft(
            sender,
            owner,
            collection,
            nft_type,
            [
                <PalletCore<T>>::rmrk_property(Src, &src)?,
                <PalletCore<T>>::rmrk_property(ZIndex, &z_index)?
            ].into_iter()
        ).map_err(|err| match err {
            DispatchError::Arithmetic(_) => <Error<T>>::NoAvailablePartId.into(),
            err => err
        })?;

        if let RmrkPartType::SlotPart(part) = part {
            <PalletNft<T>>::set_scoped_token_property(
                collection.id,
                token_id,
                PropertyScope::Rmrk,
                <PalletCore<T>>::rmrk_property(EquippableList, &part.equippable)?
            )?;
        }

        Ok(token_id)
    }
}
