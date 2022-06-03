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
use up_data_structs::{*, mapping::TokenAddressMapping};
use pallet_common::{
	Pallet as PalletCommon, Error as CommonError, CollectionHandle, CommonCollectionOperations,
};
use pallet_nonfungible::{Pallet as PalletNft, NonfungibleHandle, TokenData};
use pallet_structure::Pallet as PalletStructure;
use pallet_evm::account::CrossAccountId;
use core::convert::AsRef;

pub use pallet::*;

pub mod misc;
pub mod property;

use misc::*;
pub use property::*;

use RmrkProperty::*;

const NESTING_BUDGET: u32 = 5;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use pallet_evm::account;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_nonfungible::Config + account::Config
	{
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
	}

	#[pallet::storage]
	#[pallet::getter(fn collection_index)]
	pub type CollectionIndex<T: Config> = StorageValue<_, RmrkCollectionId, ValueQuery>;

	#[pallet::storage]
	pub type UniqueCollectionId<T: Config> =
		StorageMap<_, Twox64Concat, RmrkCollectionId, CollectionId, ValueQuery>;

	#[pallet::storage]
	pub type RmrkInernalCollectionId<T: Config> =
		StorageMap<_, Twox64Concat, CollectionId, RmrkCollectionId, ValueQuery>;

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
		PropertySet {
			collection_id: RmrkCollectionId,
			maybe_nft_id: Option<RmrkNftId>,
			key: RmrkKeyString,
			value: RmrkValueString,
		},
		ResourceAdded {
			nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
		},
		ResourceRemoval {
			nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
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
		ResourceDoesntExist,
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
				token_prefix: symbol
					.into_inner()
					.try_into()
					.map_err(|_| <CommonError<T>>::CollectionTokenPrefixLimitExceeded)?,
				permissions: Some(CollectionPermissions {
					nesting: Some(NestingRule::Owner),
					..Default::default()
				}),
				..Default::default()
			};

			let unique_collection_id = Self::init_collection(
				T::CrossAccountId::from_sub(sender.clone()),
				data,
				[
					Self::rmrk_property(Metadata, &metadata)?,
					Self::rmrk_property(CollectionType, &misc::CollectionType::Regular)?,
				]
				.into_iter(),
			)?;
			let rmrk_collection_id = <CollectionIndex<T>>::get();

			<UniqueCollectionId<T>>::insert(rmrk_collection_id, unique_collection_id);
			<RmrkInernalCollectionId<T>>::insert(unique_collection_id, rmrk_collection_id);

			<CollectionIndex<T>>::mutate(|n| *n += 1);

			Self::deposit_event(Event::CollectionCreated {
				issuer: sender,
				collection_id: rmrk_collection_id,
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

			let collection = Self::get_typed_nft_collection(
				Self::unique_collection_id(collection_id)?,
				misc::CollectionType::Regular,
			)?;

			ensure!(
				collection.total_supply() == 0,
				<Error<T>>::CollectionNotEmpty
			);

			<PalletNft<T>>::destroy_collection(collection, &cross_sender)
				.map_err(Self::map_common_err_to_proxy)?;

			Self::deposit_event(Event::CollectionDestroyed {
				issuer: sender,
				collection_id,
			});

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
				Self::unique_collection_id(collection_id)?,
				misc::CollectionType::Regular,
				sender.clone(),
				new_issuer.clone(),
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
				Self::unique_collection_id(collection_id)?,
				misc::CollectionType::Regular,
			)?;

			Self::check_collection_owner(&collection, &cross_sender)?;

			let token_count = collection.total_supply();

			let mut collection = collection.into_inner();
			collection.limits.token_limit = Some(token_count);
			collection.save()?;

			Self::deposit_event(Event::CollectionLocked {
				issuer: sender,
				collection_id,
			});

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
				amount,
			});

			let collection = Self::get_typed_nft_collection(
				Self::unique_collection_id(collection_id)?,
				misc::CollectionType::Regular,
			)?;

			let nft_id = Self::create_nft(
				&sender,
				&cross_owner,
				&collection,
				[
					Self::rmrk_property(TokenType, &NftType::Regular)?,
					Self::rmrk_property(RoyaltyInfo, &royalty_info)?,
					Self::rmrk_property(Metadata, &metadata)?,
					Self::rmrk_property(Equipped, &false)?,
					Self::rmrk_property(
						ResourceCollection,
						&Self::init_collection(
							sender.clone(),
							CreateCollectionData {
								..Default::default()
							},
							[Self::rmrk_property(
								CollectionType,
								&misc::CollectionType::Resource,
							)?]
							.into_iter(),
						)?,
					)?, // todo possibly add limits to the collection if rmrk warrants them
					Self::rmrk_property(ResourcePriorities, &<Vec<u8>>::new())?,
				]
				.into_iter(),
			)
			.map_err(|err| match err {
				DispatchError::Arithmetic(_) => <Error<T>>::NoAvailableNftId.into(),
				err => Self::map_common_err_to_proxy(err),
			})?;

			Self::deposit_event(Event::NftMinted {
				owner,
				collection_id,
				nft_id: nft_id.0,
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
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			Self::destroy_nft(
				cross_sender,
				Self::unique_collection_id(collection_id)?,
				misc::CollectionType::Regular,
				nft_id.into(),
			)?;

			Self::deposit_event(Event::NFTBurned {
				owner: sender,
				nft_id,
			});

			Ok(())
		}

		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn send(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			rmrk_nft_id: RmrkNftId,
			new_owner: RmrkAccountIdOrCollectionNftTuple<T::AccountId>,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let nft_id = rmrk_nft_id.into();

			let token_data = <TokenData<T>>::get((collection_id, nft_id))
				.ok_or(<Error<T>>::NoAvailableNftId)?;

			let from = token_data.owner;

			let collection = Self::get_typed_nft_collection(
				collection_id,
				misc::CollectionType::Regular,
			)?;

			let budget = budget::Value::new(NESTING_BUDGET);

			let target_owner;

			match new_owner {
				RmrkAccountIdOrCollectionNftTuple::AccountId(account_id) => {
					target_owner = T::CrossAccountId::from_sub(account_id);
				},
				RmrkAccountIdOrCollectionNftTuple::CollectionAndNftTuple(target_collection_id, target_nft_id) => {
					let target_collection_id = Self::unique_collection_id(target_collection_id)?;

					target_owner = T::CrossTokenAddressMapping::token_to_address(
						target_collection_id,
						target_nft_id.into(),
					);

					let spender = <PalletStructure<T>>::get_indirect_owner(
						target_collection_id,
						target_nft_id.into(),
						Some((collection_id, nft_id)),
						&budget,
					)?;

					let is_approval_required = cross_sender != spender;

					if is_approval_required {
						<PalletNft<T>>::set_allowance(
							&collection,
							&cross_sender,
							nft_id,
							Some(&spender),
							&budget
						).map_err(Self::map_common_err_to_proxy)?;

						return Ok(());
					}
				}
			}

			<PalletNft<T>>::transfer_from(
				&collection,
				&cross_sender,
				&from,
				&target_owner,
				nft_id,
				&budget
			).map_err(Self::map_common_err_to_proxy)?;

			Ok(())
		}

		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn set_property(
			origin: OriginFor<T>,
			#[pallet::compact] rmrk_collection_id: RmrkCollectionId,
			maybe_nft_id: Option<RmrkNftId>,
			key: RmrkKeyString,
			value: RmrkValueString,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let sender = T::CrossAccountId::from_sub(sender);

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let budget = budget::Value::new(NESTING_BUDGET);

			match maybe_nft_id {
				Some(nft_id) => {
					let token_id: TokenId = nft_id.into();

					Self::ensure_nft_owner(collection_id, token_id, &sender, &budget)?;
					Self::ensure_nft_type(collection_id, token_id, NftType::Regular)?;

					<PalletNft<T>>::set_scoped_token_property(
						collection_id,
						token_id,
						PropertyScope::Rmrk,
						Self::rmrk_property(UserProperty(key.as_slice()), &value)?,
					)?;
				}
				None => {
					let collection = Self::get_typed_nft_collection(
						collection_id,
						misc::CollectionType::Regular,
					)?;

					Self::check_collection_owner(&collection, &sender)?;

					<PalletCommon<T>>::set_scoped_collection_property(
						collection_id,
						PropertyScope::Rmrk,
						Self::rmrk_property(UserProperty(key.as_slice()), &value)?,
					)?;
				}
			}

			Self::deposit_event(Event::PropertySet {
				collection_id: rmrk_collection_id,
				maybe_nft_id,
				key,
				value,
			});

			Ok(())
		}

		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn add_basic_resource(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource: RmrkBasicResource,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let resource_id = Self::resource_add(
				sender,
				Self::unique_collection_id(collection_id)?,
				nft_id.into(),
				[
					Self::rmrk_property(TokenType, &NftType::Resource)?,
					Self::rmrk_property(ResourceType, &misc::ResourceType::Basic)?,
					Self::rmrk_property(Src, &resource.src)?,
					Self::rmrk_property(Metadata, &resource.metadata)?,
					Self::rmrk_property(License, &resource.license)?,
					Self::rmrk_property(Thumb, &resource.thumb)?,
				]
				.into_iter(),
			)?;

			Self::deposit_event(Event::ResourceAdded {
				nft_id,
				resource_id,
			});
			Ok(())
		}

		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn add_composable_resource(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			_resource_id: RmrkBoundedResource,
			resource: RmrkComposableResource,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let resource_id = Self::resource_add(
				sender,
				Self::unique_collection_id(collection_id)?,
				nft_id.into(),
				[
					Self::rmrk_property(TokenType, &NftType::Resource)?,
					Self::rmrk_property(ResourceType, &misc::ResourceType::Composable)?,
					Self::rmrk_property(Parts, &resource.parts)?,
					Self::rmrk_property(Base, &resource.base)?,
					Self::rmrk_property(Src, &resource.src)?,
					Self::rmrk_property(Metadata, &resource.metadata)?,
					Self::rmrk_property(License, &resource.license)?,
					Self::rmrk_property(Thumb, &resource.thumb)?,
				]
				.into_iter(),
			)?;

			Self::deposit_event(Event::ResourceAdded {
				nft_id,
				resource_id,
			});
			Ok(())
		}

		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn add_slot_resource(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource: RmrkSlotResource,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let resource_id = Self::resource_add(
				sender,
				Self::unique_collection_id(collection_id)?,
				nft_id.into(),
				[
					Self::rmrk_property(TokenType, &NftType::Resource)?,
					Self::rmrk_property(ResourceType, &misc::ResourceType::Slot)?,
					Self::rmrk_property(Base, &resource.base)?,
					Self::rmrk_property(Src, &resource.src)?,
					Self::rmrk_property(Metadata, &resource.metadata)?,
					Self::rmrk_property(Slot, &resource.slot)?,
					Self::rmrk_property(License, &resource.license)?,
					Self::rmrk_property(Thumb, &resource.thumb)?,
				]
				.into_iter(),
			)?;

			Self::deposit_event(Event::ResourceAdded {
				nft_id,
				resource_id,
			});
			Ok(())
		}

		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		#[transactional]
		pub fn remove_resource(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			Self::resource_remove(
				sender,
				Self::unique_collection_id(collection_id)?,
				nft_id.into(),
				resource_id.into(),
			)?;

			Self::deposit_event(Event::ResourceRemoval {
				nft_id,
				resource_id,
			});
			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	pub fn rmrk_property_key(rmrk_key: RmrkProperty) -> Result<PropertyKey, DispatchError> {
		let key = rmrk_key.to_key::<T>()?;

		let scoped_key = PropertyScope::Rmrk
			.apply(key)
			.map_err(|_| <Error<T>>::RmrkPropertyKeyIsTooLong)?;

		Ok(scoped_key)
	}

	// todo think about renaming these
	pub fn rmrk_property<E: Encode>(
		rmrk_key: RmrkProperty,
		value: &E,
	) -> Result<Property, DispatchError> {
		let key = rmrk_key.to_key::<T>()?;

		let value = value
			.encode()
			.try_into()
			.map_err(|_| <Error<T>>::RmrkPropertyValueIsTooLong)?;

		let property = Property { key, value };

		Ok(property)
	}

	pub fn decode_property<D: Decode>(vec: PropertyValue) -> Result<D, DispatchError> {
		vec.decode()
			.map_err(|_| <Error<T>>::RmrkPropertyValueIsTooLong.into())
	}

	pub fn rebind<L, S>(vec: &BoundedVec<u8, L>) -> Result<BoundedVec<u8, S>, DispatchError>
	where
		BoundedVec<u8, S>: TryFrom<Vec<u8>>,
	{
		vec.rebind()
			.map_err(|_| <Error<T>>::RmrkPropertyValueIsTooLong.into())
	}

	fn init_collection(
		sender: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
		properties: impl Iterator<Item = Property>,
	) -> Result<CollectionId, DispatchError> {
		let collection_id = <PalletNft<T>>::init_collection(sender, data);

		if let Err(DispatchError::Arithmetic(_)) = &collection_id {
			return Err(<Error<T>>::NoAvailableCollectionId.into());
		}

		<PalletCommon<T>>::set_scoped_collection_properties(
			collection_id?,
			PropertyScope::Rmrk,
			properties,
		)?;

		collection_id
	}

	pub fn create_nft(
		sender: &T::CrossAccountId,
		owner: &T::CrossAccountId,
		collection: &NonfungibleHandle<T>,
		properties: impl Iterator<Item = Property>,
	) -> Result<TokenId, DispatchError> {
		let data = CreateNftExData {
			properties: BoundedVec::default(),
			owner: owner.clone(),
		};

		let budget = budget::Value::new(NESTING_BUDGET);

		<PalletNft<T>>::create_item(collection, sender, data, &budget)?;

		let nft_id = <PalletNft<T>>::current_token_id(collection.id);

		<PalletNft<T>>::set_scoped_token_properties(
			collection.id,
			nft_id,
			PropertyScope::Rmrk,
			properties,
		)?;

		Ok(nft_id)
	}

	fn destroy_nft(
		sender: T::CrossAccountId,
		collection_id: CollectionId,
		collection_type: misc::CollectionType,
		token_id: TokenId,
	) -> DispatchResult {
		let collection = Self::get_typed_nft_collection(collection_id, collection_type)?;

		<PalletNft<T>>::burn(&collection, &sender, token_id)
			.map_err(Self::map_common_err_to_proxy)?;

		Ok(())
	}

	fn resource_add(
		sender: T::AccountId,
		collection_id: CollectionId,
		token_id: TokenId,
		resource_properties: impl Iterator<Item = Property>,
	) -> Result<RmrkResourceId, DispatchError> {
		let collection =
			Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
		ensure!(collection.owner == sender, Error::<T>::NoPermission);

		// Check NFT lock status // todo depends on market, maybe later
		//ensure!(!Pallet::<T>::is_locked(collection_id, nft_id), pallet_uniques::Error::<T>::Locked);

		let sender = T::CrossAccountId::from_sub(sender);
		let budget = budget::Value::new(NESTING_BUDGET);
		let pending = Self::ensure_nft_owner(collection_id, token_id, &sender, &budget).is_err();

		let resource_collection_id: CollectionId =
			Self::get_nft_property_decoded(collection_id, token_id, ResourceCollection)?;
		let resource_collection =
			Self::get_typed_nft_collection(resource_collection_id, misc::CollectionType::Resource)?;

		// todo probably add extra connections to bases, slots, etc., when RMRK starts to use them

		let resource_id = Self::create_nft(
			&sender, // todo owner of the nft?
			&sender,
			&resource_collection,
			resource_properties.chain(
				[
					Self::rmrk_property(PendingResourceAccept, &pending)?,
					Self::rmrk_property(PendingResourceRemoval, &false)?,
				]
				.into_iter(),
			),
		)
		.map_err(|err| match err {
			DispatchError::Arithmetic(_) => <Error<T>>::NoAvailableNftId.into(),
			err => Self::map_common_err_to_proxy(err),
		})?;

		Ok(resource_id.0)
	}

	fn resource_remove(
		sender: T::AccountId,
		collection_id: CollectionId,
		nft_id: TokenId,
		resource_id: TokenId,
	) -> DispatchResult {
		let collection =
			Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
		ensure!(collection.owner == sender, Error::<T>::NoPermission);

		let resource_collection_id: CollectionId =
			Self::get_nft_property_decoded(collection_id, nft_id, ResourceCollection)?;
		let resource_collection =
			Self::get_typed_nft_collection(resource_collection_id, misc::CollectionType::Resource)?;
		ensure!(
			<PalletNft<T>>::token_exists(&resource_collection, resource_id),
			Error::<T>::ResourceDoesntExist
		);

		let budget = up_data_structs::budget::Value::new(10);
		let topmost_owner =
			<PalletStructure<T>>::find_topmost_owner(collection_id, nft_id, &budget)?;

		let sender = T::CrossAccountId::from_sub(sender);
		if topmost_owner == sender {
			<PalletNft<T>>::burn(&collection, &sender, nft_id)
				.map_err(Self::map_common_err_to_proxy)?;
		} else {
			<PalletNft<T>>::set_scoped_token_property(
				collection_id,
				nft_id,
				PropertyScope::Rmrk,
				Self::rmrk_property(PendingResourceRemoval, &true)?,
			)?;
		}

		Ok(())
	}

	fn change_collection_owner(
		collection_id: CollectionId,
		collection_type: misc::CollectionType,
		sender: T::AccountId,
		new_owner: T::AccountId,
	) -> DispatchResult {
		let collection = Self::get_typed_nft_collection(collection_id, collection_type)?;
		Self::check_collection_owner(&collection, &T::CrossAccountId::from_sub(sender))?;

		let mut collection = collection.into_inner();

		collection.owner = new_owner;
		collection.save()
	}

	fn check_collection_owner(
		collection: &NonfungibleHandle<T>,
		account: &T::CrossAccountId,
	) -> DispatchResult {
		collection
			.check_is_owner(account)
			.map_err(Self::map_common_err_to_proxy)
	}

	pub fn last_collection_idx() -> RmrkCollectionId {
		<CollectionIndex<T>>::get()
	}

	pub fn unique_collection_id(
		rmrk_collection_id: RmrkCollectionId,
	) -> Result<CollectionId, DispatchError> {
		<UniqueCollectionId<T>>::try_get(rmrk_collection_id)
			.map_err(|_| <Error<T>>::CollectionUnknown.into())
	}

	pub fn rmrk_collection_id(
		unique_collection_id: CollectionId
	) -> Result<RmrkCollectionId, DispatchError> {
		<RmrkInernalCollectionId<T>>::try_get(unique_collection_id)
			.map_err(|_| <Error<T>>::CollectionUnknown.into())
	}

	pub fn get_nft_collection(
		collection_id: CollectionId,
	) -> Result<NonfungibleHandle<T>, DispatchError> {
		let collection = <CollectionHandle<T>>::try_get(collection_id)
			.map_err(|_| <Error<T>>::CollectionUnknown)?;

		match collection.mode {
			CollectionMode::NFT => Ok(NonfungibleHandle::cast(collection)),
			_ => Err(<Error<T>>::CollectionUnknown.into()),
		}
	}

	pub fn collection_exists(collection_id: CollectionId) -> bool {
		<CollectionHandle<T>>::try_get(collection_id).is_ok()
	}

	pub fn get_collection_property(
		collection_id: CollectionId,
		key: RmrkProperty,
	) -> Result<PropertyValue, DispatchError> {
		let collection_property = <PalletCommon<T>>::collection_properties(collection_id)
			.get(&Self::rmrk_property_key(key)?)
			.ok_or(<Error<T>>::CollectionUnknown)?
			.clone();

		Ok(collection_property)
	}

	pub fn get_collection_property_decoded<V: Decode>(
		collection_id: CollectionId,
		key: RmrkProperty,
	) -> Result<V, DispatchError> {
		Self::decode_property(Self::get_collection_property(collection_id, key)?)
	}

	pub fn get_collection_type(
		collection_id: CollectionId,
	) -> Result<misc::CollectionType, DispatchError> {
		Self::get_collection_property_decoded(collection_id, CollectionType)
			.map_err(|_| <Error<T>>::CorruptedCollectionType.into())
	}

	pub fn ensure_collection_type(
		collection_id: CollectionId,
		collection_type: misc::CollectionType,
	) -> DispatchResult {
		let actual_type = Self::get_collection_type(collection_id)?;
		ensure!(
			actual_type == collection_type,
			<CommonError<T>>::NoPermission
		);

		Ok(())
	}

	pub fn get_typed_nft_collection(
		collection_id: CollectionId,
		collection_type: misc::CollectionType,
	) -> Result<NonfungibleHandle<T>, DispatchError> {
		Self::ensure_collection_type(collection_id, collection_type)?;

		Self::get_nft_collection(collection_id)
	}

	pub fn get_typed_nft_collection_mapped(
		rmrk_collection_id: RmrkCollectionId,
		collection_type: misc::CollectionType,
	) -> Result<(NonfungibleHandle<T>, CollectionId), DispatchError> {
		let unique_collection_id = Self::unique_collection_id(rmrk_collection_id)?;

		let collection = Self::get_typed_nft_collection(unique_collection_id, collection_type)?;

		Ok((collection, unique_collection_id))
	}

	pub fn get_nft_property(
		collection_id: CollectionId,
		nft_id: TokenId,
		key: RmrkProperty,
	) -> Result<PropertyValue, DispatchError> {
		let nft_property = <PalletNft<T>>::token_properties((collection_id, nft_id))
			.get(&Self::rmrk_property_key(key)?)
			.ok_or(<Error<T>>::NoAvailableNftId)? // todo replace with better error?
			.clone();

		Ok(nft_property)
	}

	pub fn get_nft_property_decoded<V: Decode>(
		collection_id: CollectionId,
		nft_id: TokenId,
		key: RmrkProperty,
	) -> Result<V, DispatchError> {
		Self::decode_property(Self::get_nft_property(collection_id, nft_id, key)?)
	}

	pub fn nft_exists(collection_id: CollectionId, nft_id: TokenId) -> bool {
		<TokenData<T>>::contains_key((collection_id, nft_id))
	}

	pub fn get_nft_type(
		collection_id: CollectionId,
		token_id: TokenId,
	) -> Result<NftType, DispatchError> {
		Self::get_nft_property_decoded(collection_id, token_id, TokenType)
			.map_err(|_| <Error<T>>::NftTypeEncodeError.into())
	}

	pub fn ensure_nft_type(
		collection_id: CollectionId,
		token_id: TokenId,
		nft_type: NftType,
	) -> DispatchResult {
		let actual_type = Self::get_nft_type(collection_id, token_id)?;
		ensure!(actual_type == nft_type, <Error<T>>::NoPermission);

		Ok(())
	}

	pub fn ensure_nft_owner(
		collection_id: CollectionId,
		token_id: TokenId,
		possible_owner: &T::CrossAccountId,
		nesting_budget: &dyn budget::Budget
	) -> DispatchResult {
		let is_owned = <PalletStructure<T>>::check_indirectly_owned(
			possible_owner.clone(),
			collection_id,
			token_id,
			None,
			nesting_budget,
		)?;

		ensure!(
			is_owned,
			<Error<T>>::NoPermission
		);

		Ok(())
	}

	pub fn filter_user_properties<Key, Value, R, Mapper>(
		collection_id: CollectionId,
		token_id: Option<TokenId>,
		filter_keys: Option<Vec<RmrkPropertyKey>>,
		mapper: Mapper,
	) -> Result<Vec<R>, DispatchError>
	where
		Key: TryFrom<RmrkPropertyKey> + AsRef<[u8]>,
		Value: Decode + Default,
		Mapper: Fn(Key, Value) -> R,
	{
		filter_keys
			.map(|keys| {
				let properties = keys
					.into_iter()
					.filter_map(|key| {
						let key: Key = key.try_into().ok()?;

						let value = match token_id {
							Some(token_id) => Self::get_nft_property_decoded(
								collection_id,
								token_id,
								UserProperty(key.as_ref()),
							),
							None => Self::get_collection_property_decoded(
								collection_id,
								UserProperty(key.as_ref()),
							),
						}
						.ok()?;

						Some(mapper(key, value))
					})
					.collect();

				Ok(properties)
			})
			.unwrap_or_else(|| {
				let properties =
					Self::iterate_user_properties(collection_id, token_id, mapper)?.collect();

				Ok(properties)
			})
	}

	pub fn iterate_user_properties<Key, Value, R, Mapper>(
		collection_id: CollectionId,
		token_id: Option<TokenId>,
		mapper: Mapper,
	) -> Result<impl Iterator<Item = R>, DispatchError>
	where
		Key: TryFrom<RmrkPropertyKey> + AsRef<[u8]>,
		Value: Decode + Default,
		Mapper: Fn(Key, Value) -> R,
	{
		let key_prefix = Self::rmrk_property_key(UserProperty(b""))?;

		let properties = match token_id {
			Some(token_id) => <PalletNft<T>>::token_properties((collection_id, token_id)),
			None => <PalletCommon<T>>::collection_properties(collection_id),
		};

		let properties = properties.into_iter().filter_map(move |(key, value)| {
			let key = key.as_slice().strip_prefix(key_prefix.as_slice())?;

			let key: Key = key.to_vec().try_into().ok()?;
			let value: Value = value.decode().ok()?;

			Some(mapper(key, value))
		});

		Ok(properties)
	}

	fn map_common_err_to_proxy(err: DispatchError) -> DispatchError {
		map_common_err_to_proxy! {
			match err {
				NoPermission => NoPermission,
				CollectionTokenLimitExceeded => CollectionFullOrLocked,
				PublicMintingNotAllowed => NoPermission,
				TokenNotFound => NoAvailableNftId,
				ApprovedValueTooLow => NoPermission
			}
		}
	}
}
