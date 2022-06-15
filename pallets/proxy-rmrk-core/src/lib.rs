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
use pallet_structure::{Pallet as PalletStructure, Error as StructureError};
use pallet_evm::account::CrossAccountId;
use core::convert::AsRef;

pub use pallet::*;

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod misc;
pub mod property;
pub mod weights;

pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

use weights::WeightInfo;
use misc::*;
pub use property::*;

use RmrkProperty::*;

pub const NESTING_BUDGET: u32 = 5;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use pallet_evm::account;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_nonfungible::Config + account::Config
	{
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
		type WeightInfo: WeightInfo;
	}

	#[pallet::storage]
	#[pallet::getter(fn collection_index)]
	pub type CollectionIndex<T: Config> = StorageValue<_, RmrkCollectionId, ValueQuery>;

	#[pallet::storage]
	pub type UniqueCollectionId<T: Config> =
		StorageMap<_, Twox64Concat, RmrkCollectionId, CollectionId, ValueQuery>;

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
		NFTSent {
			sender: T::AccountId,
			recipient: RmrkAccountIdOrCollectionNftTuple<T::AccountId>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			approval_required: bool,
		},
		NFTAccepted {
			sender: T::AccountId,
			recipient: RmrkAccountIdOrCollectionNftTuple<T::AccountId>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
		},
		NFTRejected {
			sender: T::AccountId,
			collection_id: RmrkCollectionId,
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
		ResourceAccepted {
			nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
		},
		ResourceRemovalAccepted {
			nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
		},
		PrioritySet {
			collection_id: RmrkCollectionId,
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
		RmrkPropertyIsNotFound,
		UnableToDecodeRmrkData,

		/* RMRK compatible events */
		CollectionNotEmpty,
		NoAvailableCollectionId,
		NoAvailableNftId,
		CollectionUnknown,
		NoPermission,
		NonTransferable,
		CollectionFullOrLocked,
		ResourceDoesntExist,
		CannotSendToDescendentOrSelf,
		CannotAcceptNonOwnedNft,
		CannotRejectNonOwnedNft,
		ResourceNotPending,
		NoAvailableResourceId,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create a collection
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::create_collection())]
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
					nesting: Some(NestingPermissions {
						token_owner: true,
						collection_admin: false,
						restricted: None,

						permissive: false,
					}),
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

			<PalletCommon<T>>::set_scoped_collection_property(
				unique_collection_id,
				PropertyScope::Rmrk,
				Self::rmrk_property(RmrkInternalCollectionId, &rmrk_collection_id)?,
			)?;

			<CollectionIndex<T>>::mutate(|n| *n += 1);

			Self::deposit_event(Event::CollectionCreated {
				issuer: sender,
				collection_id: rmrk_collection_id,
			});

			Ok(())
		}

		/// destroy collection
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::destroy_collection())]
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
			collection.check_is_external()?;

			<PalletNft<T>>::destroy_collection(collection, &cross_sender)
				.map_err(Self::map_unique_err_to_proxy)?;

			Self::deposit_event(Event::CollectionDestroyed {
				issuer: sender,
				collection_id,
			});

			Ok(())
		}

		/// Change the issuer of a collection
		///
		/// Parameters:
		/// - `origin`: sender of the transaction
		/// - `collection_id`: collection id of the nft to change issuer of
		/// - `new_issuer`: Collection's new issuer
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::change_collection_issuer())]
		pub fn change_collection_issuer(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			new_issuer: <T::Lookup as StaticLookup>::Source,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let collection = Self::get_nft_collection(Self::unique_collection_id(collection_id)?)?;
			collection.check_is_external()?;

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

		/// lock collection
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::lock_collection())]
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
			collection.check_is_external()?;

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

		/// Mints an NFT in the specified collection
		/// Sets metadata and the royalty attribute
		///
		/// Parameters:
		/// - `collection_id`: The class of the asset to be minted.
		/// - `nft_id`: The nft value of the asset to be minted.
		/// - `recipient`: Receiver of the royalty
		/// - `royalty`: Permillage reward from each trade for the Recipient
		/// - `metadata`: Arbitrary data about an nft, e.g. IPFS hash
		/// - `transferable`: Ability to transfer this NFT
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::mint_nft(resources.as_ref().map(|r| r.len() as u32).unwrap_or(0)))]
		pub fn mint_nft(
			origin: OriginFor<T>,
			owner: T::AccountId,
			collection_id: RmrkCollectionId,
			recipient: Option<T::AccountId>,
			royalty_amount: Option<Permill>,
			metadata: RmrkString,
			transferable: bool,
			resources: Option<BoundedVec<RmrkResourceTypes, MaxResourcesOnMint>>,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());
			let cross_owner = T::CrossAccountId::from_sub(owner.clone());

			let collection = Self::get_typed_nft_collection(
				Self::unique_collection_id(collection_id)?,
				misc::CollectionType::Regular,
			)?;
			collection.check_is_external()?;

			let royalty_info = royalty_amount.map(|amount| rmrk_traits::RoyaltyInfo {
				recipient: recipient.unwrap_or_else(|| owner.clone()),
				amount,
			});

			let nft_id = Self::create_nft(
				&cross_sender,
				&cross_owner,
				&collection,
				[
					Self::rmrk_property(TokenType, &NftType::Regular)?,
					Self::rmrk_property(Transferable, &transferable)?,
					Self::rmrk_property(PendingNftAccept, &false)?,
					Self::rmrk_property(RoyaltyInfo, &royalty_info)?,
					Self::rmrk_property(Metadata, &metadata)?,
					Self::rmrk_property(Equipped, &false)?,
					Self::rmrk_property(ResourcePriorities, &<Vec<u8>>::new())?,
					Self::rmrk_property(NextResourceId, &(0 as RmrkResourceId))?,
				]
				.into_iter(),
			)
			.map_err(|err| match err {
				DispatchError::Arithmetic(_) => <Error<T>>::NoAvailableNftId.into(),
				err => Self::map_unique_err_to_proxy(err),
			})?;

			if let Some(resources) = resources {
				for resource in resources {
					Self::resource_add(sender.clone(), collection.id, nft_id, resource)?;
				}
			}

			Self::deposit_event(Event::NftMinted {
				owner,
				collection_id,
				nft_id: nft_id.0,
			});

			Ok(())
		}

		/// burn nft
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::burn_nft(*max_burns))]
		pub fn burn_nft(
			origin: OriginFor<T>,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			max_burns: u32,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			let collection = Self::get_typed_nft_collection(
				Self::unique_collection_id(collection_id)?,
				misc::CollectionType::Regular,
			)?;
			collection.check_is_external()?;

			Self::destroy_nft(
				cross_sender,
				Self::unique_collection_id(collection_id)?,
				nft_id.into(),
				max_burns,
				<Error<T>>::NoPermission,
			)
			.map_err(|err| Self::map_unique_err_to_proxy(err.error))?;

			Self::deposit_event(Event::NFTBurned {
				owner: sender,
				nft_id,
			});

			Ok(())
		}

		/// Transfers a NFT from an Account or NFT A to another Account or NFT B
		///
		/// Parameters:
		/// - `origin`: sender of the transaction
		/// - `rmrk_collection_id`: collection id of the nft to be transferred
		/// - `rmrk_nft_id`: nft id of the nft to be transferred
		/// - `new_owner`: new owner of the nft which can be either an account or a NFT
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::send())]
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

			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let token_data =
				<TokenData<T>>::get((collection_id, nft_id)).ok_or(<Error<T>>::NoAvailableNftId)?;

			let from = token_data.owner;

			ensure!(
				Self::get_nft_property_decoded(collection_id, nft_id, RmrkProperty::Transferable)?,
				<Error<T>>::NonTransferable
			);

			ensure!(
				!Self::get_nft_property_decoded(
					collection_id,
					nft_id,
					RmrkProperty::PendingNftAccept
				)?,
				<Error<T>>::NoPermission
			);

			let target_owner;
			let approval_required;

			match new_owner {
				RmrkAccountIdOrCollectionNftTuple::AccountId(ref account_id) => {
					target_owner = T::CrossAccountId::from_sub(account_id.clone());
					approval_required = false;
				}
				RmrkAccountIdOrCollectionNftTuple::CollectionAndNftTuple(
					target_collection_id,
					target_nft_id,
				) => {
					let target_collection_id = Self::unique_collection_id(target_collection_id)?;

					let target_nft_budget = budget::Value::new(NESTING_BUDGET);

					let target_nft_owner = <PalletStructure<T>>::get_checked_topmost_owner(
						target_collection_id,
						target_nft_id.into(),
						Some((collection_id, nft_id)),
						&target_nft_budget,
					)
					.map_err(Self::map_unique_err_to_proxy)?;

					approval_required = cross_sender != target_nft_owner;

					if approval_required {
						target_owner = target_nft_owner;

						<PalletNft<T>>::set_scoped_token_property(
							collection.id,
							nft_id,
							PropertyScope::Rmrk,
							Self::rmrk_property(PendingNftAccept, &approval_required)?,
						)?;
					} else {
						target_owner = T::CrossTokenAddressMapping::token_to_address(
							target_collection_id,
							target_nft_id.into(),
						);
					}
				}
			}

			let src_nft_budget = budget::Value::new(NESTING_BUDGET);

			<PalletNft<T>>::transfer_from(
				&collection,
				&cross_sender,
				&from,
				&target_owner,
				nft_id,
				&src_nft_budget,
			)
			.map_err(Self::map_unique_err_to_proxy)?;

			Self::deposit_event(Event::NFTSent {
				sender,
				recipient: new_owner,
				collection_id: rmrk_collection_id,
				nft_id: rmrk_nft_id,
				approval_required,
			});

			Ok(())
		}

		/// Accepts an NFT sent from another account to self or owned NFT
		///
		/// Parameters:
		/// - `origin`: sender of the transaction
		/// - `rmrk_collection_id`: collection id of the nft to be accepted
		/// - `rmrk_nft_id`: nft id of the nft to be accepted
		/// - `new_owner`: either origin's account ID or origin-owned NFT, whichever the NFT was
		///   sent to
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::accept_nft())]
		pub fn accept_nft(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			rmrk_nft_id: RmrkNftId,
			new_owner: RmrkAccountIdOrCollectionNftTuple<T::AccountId>,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let nft_id = rmrk_nft_id.into();

			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let new_cross_owner = match new_owner {
				RmrkAccountIdOrCollectionNftTuple::AccountId(ref account_id) => {
					T::CrossAccountId::from_sub(account_id.clone())
				}
				RmrkAccountIdOrCollectionNftTuple::CollectionAndNftTuple(
					target_collection_id,
					target_nft_id,
				) => {
					let target_collection_id = Self::unique_collection_id(target_collection_id)?;

					T::CrossTokenAddressMapping::token_to_address(
						target_collection_id,
						TokenId(target_nft_id),
					)
				}
			};

			let budget = budget::Value::new(NESTING_BUDGET);

			<PalletNft<T>>::transfer(
				&collection,
				&cross_sender,
				&new_cross_owner,
				nft_id,
				&budget,
			)
			.map_err(|err| {
				if err == <CommonError<T>>::UserIsNotAllowedToNest.into() {
					<Error<T>>::CannotAcceptNonOwnedNft.into()
				} else {
					Self::map_unique_err_to_proxy(err)
				}
			})?;

			<PalletNft<T>>::set_scoped_token_property(
				collection.id,
				nft_id,
				PropertyScope::Rmrk,
				Self::rmrk_property(PendingNftAccept, &false)?,
			)?;

			Self::deposit_event(Event::NFTAccepted {
				sender,
				recipient: new_owner,
				collection_id: rmrk_collection_id,
				nft_id: rmrk_nft_id,
			});

			Ok(())
		}

		/// Rejects an NFT sent from another account to self or owned NFT
		///
		/// Parameters:
		/// - `origin`: sender of the transaction
		/// - `rmrk_collection_id`: collection id of the nft to be accepted
		/// - `rmrk_nft_id`: nft id of the nft to be accepted
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::reject_nft())]
		pub fn reject_nft(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			rmrk_nft_id: RmrkNftId,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let nft_id = rmrk_nft_id.into();

			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			ensure!(
				<TokenData<T>>::get((collection_id, nft_id)).is_some(),
				<Error<T>>::NoAvailableNftId
			);

			ensure!(
				Self::get_nft_property_decoded(
					collection_id,
					nft_id,
					RmrkProperty::PendingNftAccept
				)?,
				<Error<T>>::NoPermission
			);

			Self::destroy_nft(
				cross_sender,
				collection_id,
				nft_id,
				NESTING_BUDGET,
				<Error<T>>::CannotRejectNonOwnedNft,
			)
			.map_err(|err| Self::map_unique_err_to_proxy(err.error))?;

			Self::deposit_event(Event::NFTRejected {
				sender,
				collection_id: rmrk_collection_id,
				nft_id: rmrk_nft_id,
			});

			Ok(())
		}

		/// accept the addition of a new resource to an existing NFT
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::accept_resource())]
		pub fn accept_resource(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			rmrk_nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender);

			let collection_id = Self::unique_collection_id(rmrk_collection_id)
				.map_err(|_| <Error<T>>::ResourceDoesntExist)?;
			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let nft_id = rmrk_nft_id.into();

			let budget = budget::Value::new(NESTING_BUDGET);

			let nft_owner =
				<PalletStructure<T>>::find_topmost_owner(collection_id, nft_id, &budget)
					.map_err(|_| <Error<T>>::ResourceDoesntExist)?;

			Self::try_mutate_resource_info(collection_id, nft_id, resource_id, |res| {
				ensure!(res.pending, <Error<T>>::ResourceNotPending);
				ensure!(cross_sender == nft_owner, <Error<T>>::NoPermission);

				res.pending = false;

				Ok(())
			})?;

			Self::deposit_event(Event::<T>::ResourceAccepted {
				nft_id: rmrk_nft_id,
				resource_id,
			});

			Ok(())
		}

		/// accept the removal of a resource of an existing NFT
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::accept_resource_removal())]
		pub fn accept_resource_removal(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			rmrk_nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender);

			let collection_id = Self::unique_collection_id(rmrk_collection_id)
				.map_err(|_| <Error<T>>::ResourceDoesntExist)?;
			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let nft_id = rmrk_nft_id.into();

			let budget = budget::Value::new(NESTING_BUDGET);

			let nft_owner =
				<PalletStructure<T>>::find_topmost_owner(collection_id, nft_id, &budget)
					.map_err(|_| <Error<T>>::ResourceDoesntExist)?;

			ensure!(cross_sender == nft_owner, <Error<T>>::NoPermission);

			let resource_id_key = Self::rmrk_property_key(ResourceId(resource_id))?;

			let resource_info = <PalletNft<T>>::token_sys_property((
				collection_id,
				nft_id,
				PropertyScope::Rmrk,
				resource_id_key.clone(),
			))
			.ok_or(<Error<T>>::ResourceDoesntExist)?;

			let resource_info: RmrkResourceInfo = Self::decode_property(&resource_info)?;

			ensure!(
				resource_info.pending_removal,
				<Error<T>>::ResourceNotPending
			);

			<PalletNft<T>>::remove_token_sys_property(
				collection_id,
				nft_id,
				PropertyScope::Rmrk,
				resource_id_key,
			);

			Self::deposit_event(Event::<T>::ResourceRemovalAccepted {
				nft_id: rmrk_nft_id,
				resource_id,
			});

			Ok(())
		}

		/// set a custom value on an NFT
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::set_property())]
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
			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let budget = budget::Value::new(NESTING_BUDGET);

			match maybe_nft_id {
				Some(nft_id) => {
					let token_id: TokenId = nft_id.into();

					Self::ensure_nft_type(collection_id, token_id, NftType::Regular)?;
					Self::ensure_nft_owner(collection_id, token_id, &sender, &budget)?;

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

		/// set a different order of resource priority
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::set_priority())]
		pub fn set_priority(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			rmrk_nft_id: RmrkNftId,
			priorities: BoundedVec<RmrkResourceId, RmrkMaxPriorities>,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let sender = T::CrossAccountId::from_sub(sender);

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let nft_id = rmrk_nft_id.into();

			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let budget = budget::Value::new(NESTING_BUDGET);

			Self::ensure_nft_type(collection_id, nft_id, NftType::Regular)?;
			Self::ensure_nft_owner(collection_id, nft_id, &sender, &budget)?;

			<PalletNft<T>>::set_scoped_token_property(
				collection_id,
				nft_id,
				PropertyScope::Rmrk,
				Self::rmrk_property(ResourcePriorities, &priorities.into_inner())?,
			)?;

			Self::deposit_event(Event::<T>::PrioritySet {
				collection_id: rmrk_collection_id,
				nft_id: rmrk_nft_id,
			});

			Ok(())
		}

		/// Create basic resource
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::add_basic_resource())]
		pub fn add_basic_resource(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource: RmrkBasicResource,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let resource_id = Self::resource_add(
				sender,
				collection_id,
				nft_id.into(),
				RmrkResourceTypes::Basic(resource),
			)?;

			Self::deposit_event(Event::ResourceAdded {
				nft_id,
				resource_id,
			});
			Ok(())
		}

		/// Create composable resource
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::add_composable_resource())]
		pub fn add_composable_resource(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource: RmrkComposableResource,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let resource_id = Self::resource_add(
				sender,
				collection_id,
				nft_id.into(),
				RmrkResourceTypes::Composable(resource),
			)?;

			Self::deposit_event(Event::ResourceAdded {
				nft_id,
				resource_id,
			});
			Ok(())
		}

		/// Create slot resource
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::add_slot_resource())]
		pub fn add_slot_resource(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource: RmrkSlotResource,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			let resource_id = Self::resource_add(
				sender,
				collection_id,
				nft_id.into(),
				RmrkResourceTypes::Slot(resource),
			)?;

			Self::deposit_event(Event::ResourceAdded {
				nft_id,
				resource_id,
			});
			Ok(())
		}

		/// remove resource
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::remove_resource())]
		pub fn remove_resource(
			origin: OriginFor<T>,
			rmrk_collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
		) -> DispatchResult {
			let sender = ensure_signed(origin.clone())?;

			let collection_id = Self::unique_collection_id(rmrk_collection_id)?;
			let collection =
				Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
			collection.check_is_external()?;

			Self::resource_remove(sender, collection_id, nft_id.into(), resource_id)?;

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

		let value = Self::encode_property(value)?;

		let property = Property { key, value };

		Ok(property)
	}

	pub fn encode_property<E: Encode, S: Get<u32>>(
		value: &E,
	) -> Result<BoundedBytes<S>, DispatchError> {
		let value = value
			.encode()
			.try_into()
			.map_err(|_| <Error<T>>::RmrkPropertyValueIsTooLong)?;

		Ok(value)
	}

	pub fn decode_property<D: Decode, S: Get<u32>>(
		vec: &BoundedBytes<S>,
	) -> Result<D, DispatchError> {
		vec.decode()
			.map_err(|_| <Error<T>>::UnableToDecodeRmrkData.into())
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
		let collection_id = <PalletNft<T>>::init_collection(sender, data, true);

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
		token_id: TokenId,
		max_burns: u32,
		error_if_not_owned: Error<T>,
	) -> DispatchResultWithPostInfo {
		let collection =
			Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;

		let token_data =
			<TokenData<T>>::get((collection_id, token_id)).ok_or(<Error<T>>::NoAvailableNftId)?;

		let from = token_data.owner;

		let owner_check_budget = budget::Value::new(NESTING_BUDGET);

		ensure!(
			<PalletStructure<T>>::check_indirectly_owned(
				sender.clone(),
				collection_id,
				token_id,
				None,
				&owner_check_budget
			)?,
			error_if_not_owned,
		);

		let burns_budget = budget::Value::new(max_burns);
		let breadth_budget = budget::Value::new(max_burns);

		<PalletNft<T>>::burn_recursively(
			&collection,
			&from,
			token_id,
			&burns_budget,
			&breadth_budget,
		)
	}

	fn acquire_next_resource_id(
		collection_id: CollectionId,
		nft_id: TokenId,
	) -> Result<RmrkResourceId, DispatchError> {
		let resource_id: RmrkResourceId =
			Self::get_nft_property_decoded(collection_id, nft_id, NextResourceId)?;

		let next_id = resource_id
			.checked_add(1)
			.ok_or(<Error<T>>::NoAvailableResourceId)?;

		<PalletNft<T>>::set_scoped_token_property(
			collection_id,
			nft_id,
			PropertyScope::Rmrk,
			Self::rmrk_property(NextResourceId, &next_id)?,
		)?;

		Ok(resource_id)
	}

	fn resource_add(
		sender: T::AccountId,
		collection_id: CollectionId,
		nft_id: TokenId,
		resource: RmrkResourceTypes,
	) -> Result<RmrkResourceId, DispatchError> {
		let collection =
			Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
		ensure!(collection.owner == sender, Error::<T>::NoPermission);

		let sender = T::CrossAccountId::from_sub(sender);
		let budget = budget::Value::new(NESTING_BUDGET);

		let nft_owner = <PalletStructure<T>>::find_topmost_owner(collection_id, nft_id, &budget)
			.map_err(Self::map_unique_err_to_proxy)?;

		let pending = sender != nft_owner;

		let id = Self::acquire_next_resource_id(collection_id, nft_id)?;

		let resource_info = RmrkResourceInfo {
			id,
			resource,
			pending,
			pending_removal: false,
		};

		<PalletNft<T>>::try_mutate_token_sys_property(
			collection_id,
			nft_id,
			PropertyScope::Rmrk,
			Self::rmrk_property_key(ResourceId(id))?,
			|value| -> DispatchResult {
				*value = Some(Self::encode_property(&resource_info)?);

				Ok(())
			},
		)?;

		Ok(id)
	}

	fn resource_remove(
		sender: T::AccountId,
		collection_id: CollectionId,
		nft_id: TokenId,
		resource_id: RmrkResourceId,
	) -> DispatchResult {
		let collection =
			Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
		ensure!(collection.owner == sender, Error::<T>::NoPermission);

		let resource_id_key = Self::rmrk_property_key(ResourceId(resource_id))?;
		let scope = PropertyScope::Rmrk;

		ensure!(
			<PalletNft<T>>::token_sys_property((
				collection_id,
				nft_id,
				scope,
				resource_id_key.clone()
			))
			.is_some(),
			<Error<T>>::ResourceDoesntExist
		);

		let budget = up_data_structs::budget::Value::new(NESTING_BUDGET);
		let topmost_owner =
			<PalletStructure<T>>::find_topmost_owner(collection_id, nft_id, &budget)?;

		let sender = T::CrossAccountId::from_sub(sender);
		if topmost_owner == sender {
			<PalletNft<T>>::remove_token_sys_property(
				collection_id,
				nft_id,
				PropertyScope::Rmrk,
				Self::rmrk_property_key(ResourceId(resource_id))?,
			);
		} else {
			Self::try_mutate_resource_info(collection_id, nft_id, resource_id, |res| {
				res.pending_removal = true;

				Ok(())
			})?;
		}

		Ok(())
	}

	fn try_mutate_resource_info(
		collection_id: CollectionId,
		nft_id: TokenId,
		resource_id: RmrkResourceId,
		f: impl FnOnce(&mut RmrkResourceInfo) -> DispatchResult,
	) -> DispatchResult {
		<PalletNft<T>>::try_mutate_token_sys_property(
			collection_id,
			nft_id,
			PropertyScope::Rmrk,
			Self::rmrk_property_key(ResourceId(resource_id))?,
			|value| match value {
				Some(value) => {
					let mut resource_info: RmrkResourceInfo = Self::decode_property(value)?;

					f(&mut resource_info)?;

					*value = Self::encode_property(&resource_info)?;

					Ok(())
				}
				None => Err(<Error<T>>::ResourceDoesntExist.into()),
			},
		)
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
			.map_err(Self::map_unique_err_to_proxy)
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
		unique_collection_id: CollectionId,
	) -> Result<RmrkCollectionId, DispatchError> {
		Self::get_collection_property_decoded(unique_collection_id, RmrkInternalCollectionId)
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
		Self::decode_property(&Self::get_collection_property(collection_id, key)?)
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
		let unique_collection_id = match collection_type {
			misc::CollectionType::Regular => Self::unique_collection_id(rmrk_collection_id)?,
			_ => rmrk_collection_id.into(),
		};

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
			.ok_or(<Error<T>>::RmrkPropertyIsNotFound)?
			.clone();

		Ok(nft_property)
	}

	pub fn get_nft_property_decoded<V: Decode>(
		collection_id: CollectionId,
		nft_id: TokenId,
		key: RmrkProperty,
	) -> Result<V, DispatchError> {
		Self::decode_property(&Self::get_nft_property(collection_id, nft_id, key)?)
	}

	pub fn nft_exists(collection_id: CollectionId, nft_id: TokenId) -> bool {
		<TokenData<T>>::contains_key((collection_id, nft_id))
	}

	pub fn get_nft_type(
		collection_id: CollectionId,
		token_id: TokenId,
	) -> Result<NftType, DispatchError> {
		Self::get_nft_property_decoded(collection_id, token_id, TokenType)
			.map_err(|_| <Error<T>>::NoAvailableNftId.into())
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
		nesting_budget: &dyn budget::Budget,
	) -> DispatchResult {
		let is_owned = <PalletStructure<T>>::check_indirectly_owned(
			possible_owner.clone(),
			collection_id,
			token_id,
			None,
			nesting_budget,
		)
		.map_err(Self::map_unique_err_to_proxy)?;

		ensure!(is_owned, <Error<T>>::NoPermission);

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

	fn map_unique_err_to_proxy(err: DispatchError) -> DispatchError {
		map_unique_err_to_proxy! {
			match err {
				CommonError::NoPermission => NoPermission,
				CommonError::CollectionTokenLimitExceeded => CollectionFullOrLocked,
				CommonError::PublicMintingNotAllowed => NoPermission,
				CommonError::TokenNotFound => NoAvailableNftId,
				CommonError::ApprovedValueTooLow => NoPermission,
				CommonError::CantDestroyNotEmptyCollection => CollectionNotEmpty,
				StructureError::TokenNotFound => NoAvailableNftId,
				StructureError::OuroborosDetected => CannotSendToDescendentOrSelf,
			}
		}
	}
}
