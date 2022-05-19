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

use frame_support::{pallet_prelude::*, transactional, BoundedVec, traits::ConstU32, dispatch::DispatchResult};
use frame_system::{pallet_prelude::*, ensure_signed};
use sp_runtime::DispatchError;
use up_data_structs::*;
use pallet_common::{Pallet as PalletCommon, Error as CommonError, CollectionHandle, CommonCollectionOperations};
use pallet_nonfungible::{Pallet as PalletNft, NonfungibleHandle};
use pallet_evm::account::CrossAccountId;

pub use pallet::*;

pub mod misc;

use misc::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;
    use pallet_evm::account;

	#[pallet::config]
	pub trait Config: frame_system::Config
                    + pallet_common::Config
                    + pallet_nonfungible::Config
                    + account::Config {
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
        CollectionCreated {
			issuer: T::AccountId,
			collection_id: CollectionId,
		},
        CollectionDestroyed {
			issuer: T::AccountId,
			collection_id: CollectionId,
		},
        CollectionLocked {
			issuer: T::AccountId,
			collection_id: CollectionId,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
        /* Unique-specific events */
        CorruptedCollectionType,
        NotRmrkCollection,

        /* RMRK compatible events */
        CollectionNotEmpty,
        NoAvailableCollectionId,
        CollectionUnknown,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn create_collection(
			origin: OriginFor<T>,
			metadata: PropertyValue,
			max: Option<u32>,
			symbol: BoundedVec<u8, ConstU32<MAX_TOKEN_PREFIX_LENGTH>>,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            let limits = max.map(|max| CollectionLimits {
                token_limit: Some(max),
                ..Default::default()
            });

            let data = CreateCollectionData {
                limits,
                token_prefix: symbol,
                ..Default::default()
            };

            let collection_id_res = <PalletNft<T>>::init_collection(sender.clone(), data);

            if let Err(DispatchError::Arithmetic(_)) = &collection_id_res {
                return Err(<Error<T>>::NoAvailableCollectionId.into());
            }

            let collection_id = collection_id_res?;

            let collection = Self::get_nft_collection(collection_id)?.into_inner();

            <PalletCommon<T>>::set_scoped_collection_properties(
                &collection,
                PropertyScope::Rmrk,
                [
                    rmrk_property!(Metadata, metadata),
                    rmrk_property!(CollectionType, CollectionType::Regular),
                ].into_iter()
            )?;

            Self::deposit_event(Event::CollectionCreated { issuer: sender, collection_id });

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn destroy_collection(
			origin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            let cross_sender = T::CrossAccountId::from_sub(sender.clone());

            let collection = Self::get_nft_collection(collection_id)?;

            Self::check_collection_type(collection_id, CollectionType::Regular)?;

            ensure!(collection.total_supply() == 0, <Error<T>>::CollectionNotEmpty);

            <PalletNft<T>>::destroy_collection(collection, &cross_sender)?;

            Self::deposit_event(Event::CollectionDestroyed { issuer: sender, collection_id });

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn change_collection_issuer(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			new_issuer: T::AccountId,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            Self::change_collection_owner(
                collection_id,
                CollectionType::Regular,
                sender,
                new_issuer
            )?;

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn lock_collection(
			origin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            let cross_sender = T::CrossAccountId::from_sub(sender.clone());

            let collection = Self::get_nft_collection(collection_id)?;
            collection.check_is_owner(&cross_sender)?;

            let token_count = collection.total_supply();

            let mut collection = collection.into_inner();
            collection.limits.token_limit = Some(token_count);
            collection.save()?;

			Self::deposit_event(Event::CollectionLocked { issuer: sender, collection_id });

            Ok(())
        }
	}
}

impl<T: Config> Pallet<T> {
    fn change_collection_owner(
        collection_id: CollectionId,
        collection_type: CollectionType,
        sender: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        let mut collection = Self::get_nft_collection(collection_id)?.into_inner();
        collection.check_is_owner(&T::CrossAccountId::from_sub(sender))?;

        Self::check_collection_type(collection_id, collection_type)?;

        collection.owner = new_owner;
        collection.save()
    }

    fn get_nft_collection(collection_id: CollectionId) -> Result<NonfungibleHandle<T>, DispatchError> {
        let collection = <CollectionHandle<T>>::try_get(collection_id)
            .map_err(|_| <Error<T>>::CollectionUnknown)?
            .into_nft_collection()?;

        Ok(collection)
    }

    fn get_collection_type(collection_id: CollectionId) -> Result<CollectionType, DispatchError> {
        let collection_type: CollectionType = <PalletCommon<T>>::collection_properties(collection_id)
            .get(&rmrk_property!(CollectionType))
            .ok_or(<Error<T>>::NotRmrkCollection)?
            .try_into()
            .map_err(<Error<T>>::from)?;

        Ok(collection_type)
    }

    fn check_collection_type(collection_id: CollectionId, collection_type: CollectionType) -> DispatchResult {
        let actual_type = Self::get_collection_type(collection_id)?;
        ensure!(actual_type == collection_type, <CommonError<T>>::NoPermission);

        Ok(())
    }
}
