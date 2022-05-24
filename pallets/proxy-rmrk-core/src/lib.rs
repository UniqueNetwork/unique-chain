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
use sp_runtime::{DispatchError, Permill, traits::StaticLookup};
use sp_std::vec::Vec;
use up_data_structs::*;
use pallet_common::{Pallet as PalletCommon, Error as CommonError, CollectionHandle, CommonCollectionOperations};
use pallet_nonfungible::{Pallet as PalletNft, NonfungibleHandle};
use pallet_evm::account::CrossAccountId;

pub use pallet::*;

pub mod misc;
pub mod property;

use misc::*;
pub use property::*;

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
			collection_id: RmrkCollectionId,
		},
        CollectionDestroyed {
			issuer: T::AccountId,
			collection_id: RmrkCollectionId,
		},
        IssuerChanged {
			old_issuer: T::AccountId,
			new_issuer: T::AccountId,
			collection_id: RmrkCollectionId,
		},
        CollectionLocked {
			issuer: T::AccountId,
			collection_id: RmrkCollectionId,
		},
        NftMinted {
			owner: T::AccountId,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
		},
        NFTBurned {
			owner: T::AccountId,
			nft_id: RmrkNftId,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
        /* Unique-specific events */
        CorruptedCollectionType,
        NftTypeEncodeError,
        RmrkPropertyKeyIsTooLong,
        RmrkPropertyValueIsTooLong,

        /* RMRK compatible events */
        CollectionNotEmpty,
        NoAvailableCollectionId,
        NoAvailableNftId,
        CollectionUnknown,
        NoPermission,
        CollectionFullOrLocked,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn create_collection(
			origin: OriginFor<T>,
			metadata: RmrkString,
			max: Option<u32>,
			symbol: RmrkCollectionSymbol,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            let limits = CollectionLimits {
                owner_can_transfer: Some(false),
                token_limit: max,
                ..Default::default()
            };

            let data = CreateCollectionData {
                limits: Some(limits),
                token_prefix: symbol.into_inner()
                    .try_into()
                    .map_err(|_| <CommonError<T>>::CollectionTokenPrefixLimitExceeded)?,
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
                    rmrk_property!(Config=T, Metadata: metadata)?,
                    rmrk_property!(Config=T, CollectionType: CollectionType::Regular)?,
                ].into_iter()
            )?;

            Self::deposit_event(Event::CollectionCreated {
                issuer: sender,
                collection_id: collection_id.0
            });

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn destroy_collection(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            let cross_sender = T::CrossAccountId::from_sub(sender.clone());

            let unique_collection_id = collection_id.into();

            let collection = Self::get_typed_nft_collection(unique_collection_id, CollectionType::Regular)?;

            ensure!(collection.total_supply() == 0, <Error<T>>::CollectionNotEmpty);

            <PalletNft<T>>::destroy_collection(collection, &cross_sender)
                .map_err(Self::map_common_err_to_proxy)?;

            Self::deposit_event(Event::CollectionDestroyed { issuer: sender, collection_id });

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn change_collection_issuer(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			new_issuer: <T::Lookup as StaticLookup>::Source,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            let new_issuer = T::Lookup::lookup(new_issuer)?;

            Self::change_collection_owner(
                collection_id.into(),
                CollectionType::Regular,
                sender.clone(),
                new_issuer.clone()
            )?;

            Self::deposit_event(Event::IssuerChanged {
				old_issuer: sender,
				new_issuer,
				collection_id,
			});

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn lock_collection(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            let cross_sender = T::CrossAccountId::from_sub(sender.clone());

            let collection = Self::get_typed_nft_collection(
                collection_id.into(),
                CollectionType::Regular
            )?;

            Self::check_collection_owner(&collection, &cross_sender)?;

            let token_count = collection.total_supply();

            let mut collection = collection.into_inner();
            collection.limits.token_limit = Some(token_count);
            collection.save()?;

			Self::deposit_event(Event::CollectionLocked { issuer: sender, collection_id });

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn mint_nft(
			origin: OriginFor<T>,
			owner: T::AccountId,
			collection_id: RmrkCollectionId,
			recipient: Option<T::AccountId>,
			royalty_amount: Option<Permill>,
			metadata: RmrkString,
		) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            let sender = T::CrossAccountId::from_sub(sender);
            let cross_owner = T::CrossAccountId::from_sub(owner.clone());

            let royalty_info = royalty_amount.map(|amount| rmrk::RoyaltyInfo {
                recipient: recipient.unwrap_or_else(|| owner.clone()),
                amount
            });

            let nft_id = Self::create_nft(
                sender,
                cross_owner,
                collection_id.into(),
                CollectionType::Regular,
                NftType::Regular,
                [
                    rmrk_property!(Config=T, RoyaltyInfo: royalty_info)?,
                    rmrk_property!(Config=T, Metadata: metadata)?,
                    rmrk_property!(Config=T, Equipped: false)?,
                    rmrk_property!(Config=T, ResourceCollection: None::<CollectionId>)?,
                    rmrk_property!(Config=T, ResourcePriorities: <Vec<u8>>::new())?,
                ].into_iter()
            )?;

            Self::deposit_event(Event::NftMinted {
                owner,
                collection_id,
                nft_id: nft_id.0
            });

            Ok(())
        }

        #[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn burn_nft(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;
            let cross_sender = T::CrossAccountId::from_sub(sender.clone());

            Self::destroy_nft(
                cross_sender,
                collection_id.into(),
                CollectionType::Regular,
                nft_id.into()
            )?;

            Self::deposit_event(Event::NFTBurned { owner: sender, nft_id });

            Ok(())
        }
	}
}

impl<T: Config> Pallet<T> {
    fn create_nft(
        sender: T::CrossAccountId,
        owner: T::CrossAccountId,
        collection_id: CollectionId,
        collection_type: CollectionType,
        nft_type: NftType,
        properties: impl Iterator<Item=Property>
    ) -> Result<TokenId, DispatchError> {
        let collection = Self::get_typed_nft_collection(
            collection_id,
            collection_type
        )?;

        let data = CreateNftExData {
            const_data: nft_type.encode()
                .try_into()
                .map_err(|_| <Error<T>>::NftTypeEncodeError)?,
            properties: BoundedVec::default(),
            owner,
        };

        let budget = budget::Value::new(2);

        <PalletNft<T>>::create_item(
            &collection,
            &sender,
            data,
            &budget,
        ).map_err(Self::map_common_err_to_proxy)?;

        let nft_id = <PalletNft<T>>::current_token_id(&collection);

        <PalletNft<T>>::set_scoped_token_properties(
            &collection,
            nft_id,
            PropertyScope::Rmrk,
            properties
        )?;

        Ok(nft_id)
    }

    fn destroy_nft(
        sender: T::CrossAccountId,
        collection_id: CollectionId,
        collection_type: CollectionType,
        token_id: TokenId
    ) -> DispatchResult {
        let collection = Self::get_typed_nft_collection(
            collection_id,
            collection_type
        )?;

        <PalletNft<T>>::burn(&collection, &sender, token_id)
            .map_err(Self::map_common_err_to_proxy)?;

        Ok(())
    }

    fn change_collection_owner(
        collection_id: CollectionId,
        collection_type: CollectionType,
        sender: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        let collection = Self::get_typed_nft_collection(
            collection_id,
            collection_type
        )?;
        Self::check_collection_owner(&collection, &T::CrossAccountId::from_sub(sender))?;

        let mut collection = collection.into_inner();

        collection.owner = new_owner;
        collection.save()
    }

    fn check_collection_owner(collection: &NonfungibleHandle<T>, account: &T::CrossAccountId) -> DispatchResult {
        collection.check_is_owner(account)
            .map_err(Self::map_common_err_to_proxy)
    }

    pub fn get_nft_collection(collection_id: CollectionId) -> Result<NonfungibleHandle<T>, DispatchError> {
        let collection = <CollectionHandle<T>>::try_get(collection_id)
            .map_err(|_| <Error<T>>::CollectionUnknown)?
            .into_nft_collection()?;

        Ok(collection)
    }

    pub fn get_collection_property(collection_id: CollectionId, key: RmrkProperty) -> Result<PropertyValue, DispatchError> {
        let collection_property = <PalletCommon<T>>::collection_properties(collection_id)
            .get(&rmrk_property!(Config=T, key)?)
            .ok_or(<Error<T>>::CollectionUnknown)?
            .clone();

        Ok(collection_property)
    }

    pub fn get_collection_type(collection_id: CollectionId) -> Result<CollectionType, DispatchError> {
        let value = Self::get_collection_property(collection_id, RmrkProperty::CollectionType)?;
        let collection_type: CollectionType = (&value)
            .try_into()
            .map_err(<Error<T>>::from)?;

        Ok(collection_type)
    }

    pub fn get_nft_property(collection_id: CollectionId, nft_id: TokenId, key: RmrkProperty) -> Result<PropertyValue, DispatchError> {
        let nft_property = <PalletNft<T>>::token_properties((collection_id, nft_id))
            .get(&rmrk_property!(Config=T, key)?)
            .ok_or(<Error<T>>::NoAvailableNftId)?
            .clone();

        Ok(nft_property)
    }

    pub fn check_collection_type(collection_id: CollectionId, collection_type: CollectionType) -> DispatchResult {
        let actual_type = Self::get_collection_type(collection_id)?;
        ensure!(actual_type == collection_type, <CommonError<T>>::NoPermission);

        Ok(())
    }

    pub fn get_typed_nft_collection(
        collection_id: CollectionId,
        collection_type: CollectionType
    ) -> Result<NonfungibleHandle<T>, DispatchError> {
        Self::check_collection_type(collection_id, collection_type)?;

        Self::get_nft_collection(collection_id)
    }

    fn map_common_err_to_proxy(err: DispatchError) -> DispatchError {
        map_common_err_to_proxy! {
            match err {
                NoPermission => NoPermission,
                CollectionTokenLimitExceeded => CollectionFullOrLocked
            }
        }
    }
}
