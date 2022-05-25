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
use pallet_common::{Pallet as PalletCommon, Error as CommonError, CollectionHandle};
use pallet_rmrk_core::{Pallet as PalletCore, rmrk_property, misc::*};
use pallet_nonfungible::{Pallet as PalletNft};
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
        NoAvailableBaseId,
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

            let collection = <PalletCore<T>>::get_nft_collection(collection_id)?.into_inner();

            <PalletCommon<T>>::set_scoped_collection_properties(
                &collection,
                PropertyScope::Rmrk,
                [
                    rmrk_property!(Config=T, CollectionType: CollectionType::Base)?,
                    rmrk_property!(Config=T, BaseType: base_type)?,
                ].into_iter()
            )?;

            for part in parts {
                let part_id = part.id();
                let part_token_id = Self::create_part(
                    &cross_sender,
                    &collection,
                    part
                )?;

                <InernalPartId<T>>::insert(collection_id, part_id, part_token_id);

                <PalletNft<T>>::set_scoped_token_property(
                    &collection,
                    part_token_id,
                    PropertyScope::Rmrk,
                    rmrk_property!(Config=T, ExternalPartId: part_id)?
                )?;
            }

            Self::deposit_event(Event::BaseCreated { issuer: sender, base_id: collection_id.0 });

            Ok(())
        }
    }
}

impl<T: Config> Pallet<T> {
    fn create_part(
        sender: &T::CrossAccountId,
        collection: &CollectionHandle<T>,
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
            collection.id,
            CollectionType::Base,
            nft_type,
            [
                rmrk_property!(Config=T, Src: src)?,
                rmrk_property!(Config=T, ZIndex: z_index)?
            ].into_iter()
        )?;

        if let RmrkPartType::SlotPart(part) = part {
            <PalletNft<T>>::set_scoped_token_property(
                collection,
                token_id,
                PropertyScope::Rmrk,
                rmrk_property!(Config=T, EquippableList: part.equippable)?
            )?;
        }

        Ok(token_id)
    }
}
