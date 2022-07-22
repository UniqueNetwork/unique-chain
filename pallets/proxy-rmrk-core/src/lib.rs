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

//! # RMRK Core Proxy Pallet
//!
//! A pallet used as proxy for RMRK Core (<https://rmrk-team.github.io/rmrk-substrate/#/pallets/rmrk-core>).
//!
//! - [`Config`]
//! - [`Call`]
//! - [`Pallet`]
//!
//! ## Overview
//!
//! The RMRK Core Proxy pallet mirrors the functionality of RMRK Core,
//! binding its externalities to Unique's own underlying structure.
//! It is purposed to mimic RMRK Core exactly, allowing seamless integrations
//! of solutions based on RMRK.
//!
//! RMRK Core itself contains essential functionality for RMRK's nested and
//! multi-resourced NFTs.
//!
//! *Note*, that while RMRK itself is subject to active development and restructuring,
//! the proxy may be caught temporarily out of date.
//!
//! ### What is RMRK?
//!
//! RMRK is a set of NFT standards which compose several "NFT 2.0 lego" primitives.
//! Putting these legos together allows a user to create NFT systems of arbitrary complexity.
//!
//! Meaning, RMRK NFTs are dynamic, able to nest into each other and form a hierarchy,
//! make use of specific changeable and partially shared metadata in the form of resources,
//! and more.
//!
//! Visit RMRK documentation and repositories to learn more:
//! - Docs: <https://docs.rmrk.app/getting-started/>
//! - FAQ: <https://coda.io/@rmrk/faq>
//! - Substrate code repository: <https://github.com/rmrk-team/rmrk-substrate>
//! - RMRK specification repository: <https://github.com/rmrk-team/rmrk-spec>
//!
//! ## Terminology
//!
//! For more information on RMRK, see RMRK's own documentation.
//!
//! ### Intro to RMRK
//!
//! - **Resource:** Additional piece of metadata of an NFT usually serving to add
//! a piece of media on top of the root metadata (NFT's own), be it a different wing
//! on the root template bird or something entirely unrelated.
//!
//! - **Base:** A list of possible "components" - Parts, a combination of which can
//! be appended/equipped to/on an NFT.
//!
//! - **Part:** Something that, together with other Parts, can constitute an NFT.
//! Parts are defined in the Base to which they belong. Parts can be either
//! of the `slot` type or `fixed` type. Slots are intended for equippables.
//! Note that "part of something" and "Part of a Base" can be easily confused,
//! and so in this documentation these words are distinguished by the capital letter.
//!
//! - **Theme:** Named objects of variable => value pairs which get interpolated into
//! the Base's `themable` Parts. Themes can hold any value, but are often represented
//! in RMRK's examples as colors applied to visible Parts.
//!
//! ### Peculiarities in Unique
//!
//! - **Scoped properties:** Properties that are normally obscured from users.
//! Their purpose is to contain structured metadata that was not included in the Unique standard
//! for collections and tokens, meant to be operated on by proxies and other outliers.
//! Scoped property keys are prefixed with `some-scope:`, where `some-scope` is
//! an arbitrary keyword, like "rmrk". `:` is considered an unacceptable symbol in user-defined
//! properties, which, along with other safeguards, makes scoped ones impossible to tamper with.
//!
//! - **Auxiliary properties:** A slightly different structure of properties,
//! trading universality of use for more convenient storage, writes and access.
//! Meant to be inaccessible to end users.
//!
//! ## Proxy Implementation
//!
//! An external user is supposed to be able to utilize this proxy as they would
//! utilize RMRK, and get exactly the same results. Normally, Unique transactions
//! are off-limits to RMRK collections and tokens, and vice versa. However,
//! the information stored on chain can be freely interpreted by storage reads and Unique RPCs.
//!
//! ### ID Mapping
//!
//! RMRK's collections' IDs are counted independently of Unique's and start at 0.
//! Note that tokens' IDs still start at 1.
//! The collections themselves, as well as tokens, are stored as Unique collections,
//! and thus RMRK IDs are mapped to Unique IDs (but not vice versa).
//!
//! ### External/Internal Collection Insulation
//!
//! A Unique transaction cannot target collections purposed for RMRK,
//! and they are flagged as `external` to specify that. On the other hand,
//! due to the mapping, RMRK transactions and RPCs simply cannot reach Unique collections.
//!
//! ### Native Properties
//!
//! Many of RMRK's native parameters are stored as scoped properties of a collection
//! or an NFT on the chain. Scoped properties are prefixed with `rmrk:`, where `:`
//! is an unacceptable symbol in user-defined properties, which, along with other safeguards,
//! makes them impossible to tamper with.
//!
//! ### Collection and NFT Types, and Base, Parts and Themes Handling
//!
//! RMRK introduces the concept of a Base, which is a catalogue of Parts,
//! possible components of an NFT. Due to its similarity with the functionality
//! of a token collection, a Base is stored and handled as one, and the Base's Parts and Themes
//! are this collection's NFTs. See [`CollectionType`] and [`NftType`].
//!
//! ## Interface
//!
//! ### Dispatchables
//!
//! - `create_collection` - Create a new collection of NFTs.
//! - `destroy_collection` - Destroy a collection.
//! - `change_collection_issuer` - Change the issuer of a collection.
//! Analogous to Unique's collection's [`owner`](up_data_structs::Collection).
//! - `lock_collection` - "Lock" the collection and prevent new token creation. **Cannot be undone.**
//! - `mint_nft` - Mint an NFT in a specified collection.
//! - `burn_nft` - Burn an NFT, destroying it and its nested tokens.
//! - `send` - Transfer an NFT from an account/NFT A to another account/NFT B.
//! - `accept_nft` - Accept an NFT sent from another account to self or an owned NFT.
//! - `reject_nft` - Reject an NFT sent from another account to self or owned NFT and **burn it**.
//! - `accept_resource` - Accept the addition of a newly created pending resource to an existing NFT.
//! - `accept_resource_removal` - Accept the removal of a removal-pending resource from an NFT.
//! - `set_property` - Add or edit a custom user property of a token or a collection.
//! - `set_priority` - Set a different order of resource priorities for an NFT.
//! - `add_basic_resource` - Create and set/propose a basic resource for an NFT.
//! - `add_composable_resource` - Create and set/propose a composable resource for an NFT.
//! - `add_slot_resource` - Create and set/propose a slot resource for an NFT.
//! - `remove_resource` - Remove and erase a resource from an NFT.

#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{pallet_prelude::*, transactional, BoundedVec, dispatch::DispatchResult};
use frame_system::{pallet_prelude::*, ensure_signed};
use sp_runtime::{DispatchError, Permill, traits::StaticLookup};
use sp_std::{
	vec::Vec,
	collections::{btree_set::BTreeSet, btree_map::BTreeMap},
};
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
pub mod rpc;
pub mod weights;

pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

use weights::WeightInfo;
use misc::*;
pub use property::*;

use RmrkProperty::*;

/// Maximum number of levels of depth in the token nesting tree.
pub const NESTING_BUDGET: u32 = 5;

type PendingTarget = (CollectionId, TokenId);
type PendingChild = (RmrkCollectionId, RmrkNftId);
type PendingChildrenSet = BTreeSet<PendingChild>;

type BasesMap = BTreeMap<RmrkBaseId, u32>;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use pallet_evm::account;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_nonfungible::Config + account::Config
	{
		/// Overarching event type.
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;

		/// The weight information of this pallet.
		type WeightInfo: WeightInfo;
	}

	/// Latest yet-unused collection ID.
	#[pallet::storage]
	#[pallet::getter(fn collection_index)]
	pub type CollectionIndex<T: Config> = StorageValue<_, RmrkCollectionId, ValueQuery>;

	/// Mapping from RMRK collection ID to Unique's.
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
		/* Unique proxy-specific events */
		/// Property of the type of RMRK collection could not be read successfully.
		CorruptedCollectionType,
		// NftTypeEncodeError,
		/// Too many symbols supplied as the property key. The maximum is [256](up_data_structs::MAX_PROPERTY_KEY_LENGTH).
		RmrkPropertyKeyIsTooLong,
		/// Too many bytes supplied as the property value. The maximum is [32768](up_data_structs::MAX_PROPERTY_VALUE_LENGTH).
		RmrkPropertyValueIsTooLong,
		/// Could not find a property by the supplied key.
		RmrkPropertyIsNotFound,
		/// Something went wrong when decoding encoded data from the storage.
		/// Perhaps, there was a wrong key supplied for the type, or the data was improperly stored.
		UnableToDecodeRmrkData,

		/* RMRK compatible events */
		/// Only destroying collections without tokens is allowed.
		CollectionNotEmpty,
		/// Could not find an ID for a collection. It is likely there were too many collections created on the chain, causing an overflow.
		NoAvailableCollectionId,
		/// Token does not exist, or there is no suitable ID for it, likely too many tokens were created in a collection, causing an overflow.
		NoAvailableNftId,
		/// Collection does not exist, has a wrong type, or does not map to a Unique ID.
		CollectionUnknown,
		/// No permission to perform action.
		NoPermission,
		/// Token is marked as non-transferable, and thus cannot be transferred.
		NonTransferable,
		/// Too many tokens created in the collection, no new ones are allowed.
		CollectionFullOrLocked,
		/// No such resource found.
		ResourceDoesntExist,
		/// If an NFT is sent to a descendant, that would form a nesting loop, an ouroboros.
		/// Sending to self is redundant.
		CannotSendToDescendentOrSelf,
		/// Not the target owner of the sent NFT.
		CannotAcceptNonOwnedNft,
		/// Not the target owner of the sent NFT.
		CannotRejectNonOwnedNft,
		/// NFT was not sent and is not pending.
		CannotRejectNonPendingNft,
		/// Resource is not pending for the operation.
		ResourceNotPending,
		/// Could not find an ID for the resource. It is likely there were too many resources created on an NFT, causing an overflow.
		NoAvailableResourceId,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		// todo :refactor replace every collection_id with rmrk_collection_id (and nft_id) in arguments for uniformity?

		/// Create a new collection of NFTs.
		///
		/// # Permissions:
		/// * Anyone - will be assigned as the issuer of the collection.
		///
		/// # Arguments:
		/// - `metadata`: Metadata describing the collection, e.g. IPFS hash. Cannot be changed.
		/// - `max`: Optional maximum number of tokens.
		/// - `symbol`: UTF-8 string with token prefix, by which to represent the token in wallets and UIs.
		/// Analogous to Unique's [`token_prefix`](up_data_structs::Collection). Cannot be changed.
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
						#[cfg(feature = "runtime-benchmarks")]
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
					Self::encode_rmrk_property(Metadata, &metadata)?,
					Self::encode_rmrk_property(CollectionType, &misc::CollectionType::Regular)?,
				]
				.into_iter(),
			)?;
			let rmrk_collection_id = <CollectionIndex<T>>::get();

			<UniqueCollectionId<T>>::insert(rmrk_collection_id, unique_collection_id);

			<PalletCommon<T>>::set_scoped_collection_property(
				unique_collection_id,
				RMRK_SCOPE,
				Self::encode_rmrk_property(RmrkInternalCollectionId, &rmrk_collection_id)?,
			)?;

			<CollectionIndex<T>>::mutate(|n| *n += 1);

			Self::deposit_event(Event::CollectionCreated {
				issuer: sender,
				collection_id: rmrk_collection_id,
			});

			Ok(())
		}

		/// Destroy a collection.
		///
		/// Only empty collections can be destroyed. If it has any tokens, they must be burned first.
		///
		/// # Permissions:
		/// * Collection issuer
		///
		/// # Arguments:
		/// - `collection_id`: RMRK ID of the collection to destroy.
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

		/// Change the issuer of a collection. Analogous to Unique's collection's [`owner`](up_data_structs::Collection).
		///
		/// # Permissions:
		/// * Collection issuer
		///
		/// # Arguments:
		/// - `collection_id`: RMRK collection ID to change the issuer of.
		/// - `new_issuer`: Collection's new issuer.
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

		/// "Lock" the collection and prevent new token creation. Cannot be undone.
		///
		/// # Permissions:
		/// * Collection issuer
		///
		/// # Arguments:
		/// - `collection_id`: RMRK ID of the collection to lock.
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

		/// Mint an NFT in a specified collection.
		///
		/// # Permissions:
		/// * Collection issuer
		///
		/// # Arguments:
		/// - `owner`: Owner account of the NFT. If set to None, defaults to the sender (collection issuer).
		/// - `collection_id`: RMRK collection ID for the NFT to be minted within. Cannot be changed.
		/// - `recipient`: Receiver account of the royalty. Has no effect if the `royalty_amount` is not set. Cannot be changed.
		/// - `royalty_amount`: Optional permillage reward from each trade for the `recipient`. Cannot be changed.
		/// - `metadata`: Arbitrary data about an NFT, e.g. IPFS hash. Cannot be changed.
		/// - `transferable`: Can this NFT be transferred? Cannot be changed.
		/// - `resources`: Resource data to be added to the NFT immediately after minting.
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::mint_nft(resources.as_ref().map(|r| r.len() as u32).unwrap_or(0)))]
		pub fn mint_nft(
			origin: OriginFor<T>,
			owner: Option<T::AccountId>,
			collection_id: RmrkCollectionId,
			recipient: Option<T::AccountId>,
			royalty_amount: Option<Permill>,
			metadata: RmrkString,
			transferable: bool,
			resources: Option<BoundedVec<RmrkResourceTypes, MaxResourcesOnMint>>,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			let owner = owner.unwrap_or(sender.clone());
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
					Self::encode_rmrk_property(TokenType, &NftType::Regular)?,
					Self::encode_rmrk_property(Transferable, &transferable)?,
					Self::encode_rmrk_property(PendingNftAccept, &None::<PendingTarget>)?,
					Self::encode_rmrk_property(RoyaltyInfo, &royalty_info)?,
					Self::encode_rmrk_property(Metadata, &metadata)?,
					Self::encode_rmrk_property(Equipped, &false)?,
					Self::encode_rmrk_property(ResourcePriorities, &<Vec<u8>>::new())?,
					Self::encode_rmrk_property(NextResourceId, &(0 as RmrkResourceId))?,
					Self::encode_rmrk_property(PendingChildren, &PendingChildrenSet::new())?,
					Self::encode_rmrk_property(AssociatedBases, &BasesMap::new())?,
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

		/// Burn an NFT, destroying it and its nested tokens up to the specified limit.
		/// If the burning budget is exceeded, the transaction is reverted.
		///
		/// This is the way to burn a nested token as well.
		///
		/// For more information, see [`burn_recursively`](pallet_nonfungible::pallet::Pallet::burn_recursively).
		///
		/// # Permissions:
		/// * Token owner
		///
		/// # Arguments:
		/// - `collection_id`: RMRK ID of the collection in which the NFT to burn belongs to.
		/// - `nft_id`: ID of the NFT to be destroyed.
		/// - `max_burns`: Maximum number of tokens to burn, assuming nesting. The transaction
		/// is reverted if there are more tokens to burn in the nesting tree than this number.
		/// This is primarily a mechanism of transaction weight control.
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

		/// Transfer an NFT from an account/NFT A to another account/NFT B.
		/// The token must be transferable. Nesting cannot occur deeper than the [`NESTING_BUDGET`].
		///
		/// If the target owner is an NFT owned by another account, then the NFT will enter
		/// the pending state and will have to be accepted by the other account.
		///
		/// # Permissions:
		/// - Token owner
		///
		/// # Arguments:
		/// - `collection_id`: RMRK ID of the collection of the NFT to be transferred.
		/// - `nft_id`: ID of the NFT to be transferred.
		/// - `new_owner`: New owner of the nft which can be either an account or a NFT.
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
				Self::get_nft_property_decoded::<Option<PendingTarget>>(
					collection_id,
					nft_id,
					RmrkProperty::PendingNftAccept
				)?
				.is_none(),
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
							RMRK_SCOPE,
							Self::encode_rmrk_property::<Option<PendingTarget>>(
								PendingNftAccept,
								&Some((target_collection_id, target_nft_id.into())),
							)?,
						)?;

						Self::insert_pending_child(
							(target_collection_id, target_nft_id.into()),
							(rmrk_collection_id, rmrk_nft_id),
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

		/// Accept an NFT sent from another account to self or an owned NFT.
		///
		/// The NFT in question must be pending, and, thus, be [sent](`Pallet::send`) first.
		///
		/// # Permissions:
		/// - Token-owner-to-be
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID of the NFT to be accepted.
		/// - `rmrk_nft_id`: ID of the NFT to be accepted.
		/// - `new_owner`: Either the sender's account ID or a sender-owned NFT,
		/// whichever the accepted NFT was sent to.
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

			let pending_target = Self::get_nft_property_decoded::<Option<PendingTarget>>(
				collection_id,
				nft_id,
				RmrkProperty::PendingNftAccept,
			)?;

			if let Some(pending_target) = pending_target {
				Self::remove_pending_child(pending_target, (rmrk_collection_id, rmrk_nft_id))?;

				<PalletNft<T>>::set_scoped_token_property(
					collection.id,
					nft_id,
					RMRK_SCOPE,
					Self::encode_rmrk_property(PendingNftAccept, &None::<PendingTarget>)?,
				)?;
			}

			Self::deposit_event(Event::NFTAccepted {
				sender,
				recipient: new_owner,
				collection_id: rmrk_collection_id,
				nft_id: rmrk_nft_id,
			});

			Ok(())
		}

		/// Reject an NFT sent from another account to self or owned NFT.
		/// The NFT in question will not be sent back and burnt instead.
		///
		/// The NFT in question must be pending, and, thus, be [sent](`Pallet::send`) first.
		///
		/// # Permissions:
		/// - Token-owner-to-be-not
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK ID of the NFT to be rejected.
		/// - `rmrk_nft_id`: ID of the NFT to be rejected.
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

			let pending_target = Self::get_nft_property_decoded::<Option<PendingTarget>>(
				collection_id,
				nft_id,
				RmrkProperty::PendingNftAccept,
			)?;

			match pending_target {
				Some(pending_target) => {
					Self::remove_pending_child(pending_target, (rmrk_collection_id, rmrk_nft_id))?
				}
				None => return Err(<Error<T>>::CannotRejectNonPendingNft.into()),
			}

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

		/// Accept the addition of a newly created pending resource to an existing NFT.
		///
		/// This transaction is needed when a resource is created and assigned to an NFT
		/// by a non-owner, i.e. the collection issuer, with one of the
		/// [`add_...` transactions](Pallet::add_basic_resource).
		///
		/// # Permissions:
		/// - Token owner
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID of the NFT.
		/// - `rmrk_nft_id`: ID of the NFT with a pending resource to be accepted.
		/// - `resource_id`: ID of the newly created pending resource.
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

		/// Accept the removal of a removal-pending resource from an NFT.
		///
		/// This transaction is needed when a non-owner, i.e. the collection issuer,
		/// requests a [removal](`Pallet::remove_resource`) of a resource from an NFT.
		///
		/// # Permissions:
		/// - Token owner
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID of the NFT.
		/// - `rmrk_nft_id`: ID of the NFT with a resource to be removed.
		/// - `resource_id`: ID of the removal-pending resource.
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

			let resource_id_key = Self::get_scoped_property_key(ResourceId(resource_id))?;

			let resource_info = <PalletNft<T>>::token_aux_property((
				collection_id,
				nft_id,
				RMRK_SCOPE,
				resource_id_key.clone(),
			))
			.ok_or(<Error<T>>::ResourceDoesntExist)?;

			let resource_info: RmrkResourceInfo = Self::decode_property_value(&resource_info)?;

			ensure!(
				resource_info.pending_removal,
				<Error<T>>::ResourceNotPending
			);

			<PalletNft<T>>::remove_token_aux_property(
				collection_id,
				nft_id,
				RMRK_SCOPE,
				resource_id_key,
			);

			if let RmrkResourceTypes::Composable(resource) = resource_info.resource {
				let base_id = resource.base;

				Self::remove_associated_base_id(collection_id, nft_id, base_id)?;
			}

			Self::deposit_event(Event::<T>::ResourceRemovalAccepted {
				nft_id: rmrk_nft_id,
				resource_id,
			});

			Ok(())
		}

		/// Add or edit a custom user property, a key-value pair, describing the metadata
		/// of a token or a collection, on either one of these.
		///
		/// Note that in this proxy implementation many details regarding RMRK are stored
		/// as scoped properties prefixed with "rmrk:", normally inaccessible
		/// to external transactions and RPCs.
		///
		/// # Permissions:
		/// - Collection issuer - in case of collection property
		/// - Token owner - in case of NFT property
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID.
		/// - `maybe_nft_id`: Optional ID of the NFT. If left empty, then the property is set for the collection.
		/// - `key`: Key of the custom property to be referenced by.
		/// - `value`: Value of the custom property to be stored.
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
						RMRK_SCOPE,
						Self::encode_rmrk_property(UserProperty(key.as_slice()), &value)?,
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
						RMRK_SCOPE,
						Self::encode_rmrk_property(UserProperty(key.as_slice()), &value)?,
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

		/// Set a different order of resource priorities for an NFT. Priorities can be used,
		/// for example, for order of rendering.
		///
		/// Note that the priorities are not updated automatically, and are an empty vector
		/// by default. There is no pre-set definition for the order to be particular,
		/// it can be interpreted arbitrarily use-case by use-case.
		///
		/// # Permissions:
		/// - Token owner
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID of the NFT.
		/// - `rmrk_nft_id`: ID of the NFT to rearrange resource priorities for.
		/// - `priorities`: Ordered vector of resource IDs.
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
				RMRK_SCOPE,
				Self::encode_rmrk_property(ResourcePriorities, &priorities.into_inner())?,
			)?;

			Self::deposit_event(Event::<T>::PrioritySet {
				collection_id: rmrk_collection_id,
				nft_id: rmrk_nft_id,
			});

			Ok(())
		}

		/// Create and set/propose a basic resource for an NFT.
		///
		/// A basic resource is the simplest, lacking a Base and anything that comes with it.
		/// See RMRK docs for more information and examples.
		///
		/// # Permissions:
		/// - Collection issuer - if not the token owner, adding the resource will warrant
		/// the owner's [acceptance](Pallet::accept_resource).
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID of the NFT.
		/// - `nft_id`: ID of the NFT to assign a resource to.
		/// - `resource`: Data of the resource to be created.
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

		/// Create and set/propose a composable resource for an NFT.
		///
		/// A composable resource links to a Base and has a subset of its Parts it is composed of.
		/// See RMRK docs for more information and examples.
		///
		/// # Permissions:
		/// - Collection issuer - if not the token owner, adding the resource will warrant
		/// the owner's [acceptance](Pallet::accept_resource).
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID of the NFT.
		/// - `nft_id`: ID of the NFT to assign a resource to.
		/// - `resource`: Data of the resource to be created.
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

			let base_id = resource.base;

			let resource_id = Self::resource_add(
				sender,
				collection_id,
				nft_id.into(),
				RmrkResourceTypes::Composable(resource),
			)?;

			<PalletNft<T>>::try_mutate_token_aux_property(
				collection_id,
				nft_id.into(),
				RMRK_SCOPE,
				Self::get_scoped_property_key(AssociatedBases)?,
				|value| -> DispatchResult {
					let mut bases: BasesMap = match value {
						Some(value) => Self::decode_property_value(value)?,
						None => BasesMap::new(),
					};

					*bases.entry(base_id).or_insert(0) += 1;

					*value = Some(Self::encode_property_value(&bases)?);
					Ok(())
				},
			)?;

			Self::deposit_event(Event::ResourceAdded {
				nft_id,
				resource_id,
			});
			Ok(())
		}

		/// Create and set/propose a slot resource for an NFT.
		///
		/// A slot resource links to a Base and a slot ID in it which it can fit into.
		/// See RMRK docs for more information and examples.
		///
		/// # Permissions:
		/// - Collection issuer - if not the token owner, adding the resource will warrant
		/// the owner's [acceptance](Pallet::accept_resource).
		///
		/// # Arguments:
		/// - `rmrk_collection_id`: RMRK collection ID of the NFT.
		/// - `nft_id`: ID of the NFT to assign a resource to.
		/// - `resource`: Data of the resource to be created.
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

		/// Remove and erase a resource from an NFT.
		///
		/// If the sender does not own the NFT, then it will be pending confirmation,
		/// and will have to be [accepted](Pallet::accept_resource_removal) by the token owner.
		///
		/// # Permissions
		/// - Collection issuer
		///
		/// # Arguments
		/// - `collection_id`: RMRK ID of a collection to which the NFT making use of the resource belongs to.
		/// - `nft_id`: ID of the NFT with a resource to be removed.
		/// - `resource_id`: ID of the resource to be removed.
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
	/// Transform one of possible RMRK keys into a byte key with a RMRK scope.
	pub fn get_scoped_property_key(rmrk_key: RmrkProperty) -> Result<PropertyKey, DispatchError> {
		let key = rmrk_key.to_key::<T>()?;

		let scoped_key = RMRK_SCOPE
			.apply(key)
			.map_err(|_| <Error<T>>::RmrkPropertyKeyIsTooLong)?;

		Ok(scoped_key)
	}

	/// Form a Unique property, transforming a RMRK key into bytes (without assigning the scope yet)
	/// and encoding the value from an arbitrary type into bytes.
	pub fn encode_rmrk_property<E: Encode>(
		rmrk_key: RmrkProperty,
		value: &E,
	) -> Result<Property, DispatchError> {
		let key = rmrk_key.to_key::<T>()?;

		let value = Self::encode_property_value(value)?;

		let property = Property { key, value };

		Ok(property)
	}

	/// Encode property value from an arbitrary type into bytes for storage.
	pub fn encode_property_value<E: Encode, S: Get<u32>>(
		value: &E,
	) -> Result<BoundedBytes<S>, DispatchError> {
		let value = value
			.encode()
			.try_into()
			.map_err(|_| <Error<T>>::RmrkPropertyValueIsTooLong)?;

		Ok(value)
	}

	/// Decode property value from bytes into an arbitrary type.
	pub fn decode_property_value<D: Decode, S: Get<u32>>(
		vec: &BoundedBytes<S>,
	) -> Result<D, DispatchError> {
		vec.decode()
			.map_err(|_| <Error<T>>::UnableToDecodeRmrkData.into())
	}

	/// Change the limit of a property value byte vector.
	pub fn rebind<L, S>(vec: &BoundedVec<u8, L>) -> Result<BoundedVec<u8, S>, DispatchError>
	where
		BoundedVec<u8, S>: TryFrom<Vec<u8>>,
	{
		vec.rebind()
			.map_err(|_| <Error<T>>::RmrkPropertyValueIsTooLong.into())
	}

	/// Initialize a new NFT collection with certain RMRK-scoped properties.
	///
	/// See [`init_collection`](pallet_nonfungible::pallet::Pallet::init_collection) for more details.
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
			RMRK_SCOPE,
			properties,
		)?;

		collection_id
	}

	/// Mint a new NFT with certain RMRK-scoped properties. Sender must be the collection owner.
	///
	/// See [`create_item`](pallet_nonfungible::pallet::Pallet::create_item) for more details.
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

		<PalletNft<T>>::set_scoped_token_properties(collection.id, nft_id, RMRK_SCOPE, properties)?;

		Ok(nft_id)
	}

	/// Burn an NFT, along with its nested children, limited by `max_burns`. The sender must be the token owner.
	///
	/// See [`burn_recursively`](pallet_nonfungible::pallet::Pallet::burn_recursively) for more details.
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

	/// Add a sent token pending acceptance to the target owning token as a property.
	fn insert_pending_child(
		target: (CollectionId, TokenId),
		child: (RmrkCollectionId, RmrkNftId),
	) -> DispatchResult {
		Self::mutate_pending_children(target, |pending_children| {
			pending_children.insert(child);
		})
	}

	/// Remove a sent token pending acceptance from the target token's properties.
	fn remove_pending_child(
		target: (CollectionId, TokenId),
		child: (RmrkCollectionId, RmrkNftId),
	) -> DispatchResult {
		Self::mutate_pending_children(target, |pending_children| {
			pending_children.remove(&child);
		})
	}

	/// Apply a mutation to the property of a token containing sent tokens
	/// that are currently pending acceptance.
	fn mutate_pending_children(
		(target_collection_id, target_nft_id): (CollectionId, TokenId),
		f: impl FnOnce(&mut PendingChildrenSet),
	) -> DispatchResult {
		<PalletNft<T>>::try_mutate_token_aux_property(
			target_collection_id,
			target_nft_id,
			RMRK_SCOPE,
			Self::get_scoped_property_key(PendingChildren)?,
			|pending_children| -> DispatchResult {
				let mut map = match pending_children {
					Some(map) => Self::decode_property_value(map)?,
					None => PendingChildrenSet::new(),
				};

				f(&mut map);

				*pending_children = Some(Self::encode_property_value(&map)?);

				Ok(())
			},
		)
	}

	/// Get an iterator from a token's property containing tokens sent to it
	/// that are currently pending acceptance.
	fn iterate_pending_children(
		collection_id: CollectionId,
		nft_id: TokenId,
	) -> Result<impl Iterator<Item = PendingChild>, DispatchError> {
		let property = <PalletNft<T>>::token_aux_property((
			collection_id,
			nft_id,
			RMRK_SCOPE,
			Self::get_scoped_property_key(PendingChildren)?,
		));

		let pending_children = match property {
			Some(map) => Self::decode_property_value(&map)?,
			None => PendingChildrenSet::new(),
		};

		Ok(pending_children.into_iter())
	}

	/// Get incremented resource ID from within an NFT's properties and store the new latest ID.
	/// Thus, the returned resource ID should be used.
	///
	/// Resource IDs are unique only across an NFT.
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
			RMRK_SCOPE,
			Self::encode_rmrk_property(NextResourceId, &next_id)?,
		)?;

		Ok(resource_id)
	}

	/// Create and add a resource for a regular NFT, mark it as pending if the sender
	/// is not the token owner. The sender must be the collection owner.
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

		<PalletNft<T>>::try_mutate_token_aux_property(
			collection_id,
			nft_id,
			RMRK_SCOPE,
			Self::get_scoped_property_key(ResourceId(id))?,
			|value| -> DispatchResult {
				*value = Some(Self::encode_property_value(&resource_info)?);

				Ok(())
			},
		)?;

		Ok(id)
	}

	/// Designate a resource for erasure from an NFT, and remove it if the sender is the token owner.
	/// The sender must be the collection owner.
	fn resource_remove(
		sender: T::AccountId,
		collection_id: CollectionId,
		nft_id: TokenId,
		resource_id: RmrkResourceId,
	) -> DispatchResult {
		let collection =
			Self::get_typed_nft_collection(collection_id, misc::CollectionType::Regular)?;
		ensure!(collection.owner == sender, Error::<T>::NoPermission);

		let resource_id_key = Self::get_scoped_property_key(ResourceId(resource_id))?;

		let resource = <PalletNft<T>>::token_aux_property((
			collection_id,
			nft_id,
			RMRK_SCOPE,
			resource_id_key.clone(),
		))
		.ok_or(<Error<T>>::ResourceDoesntExist)?;

		let resource_info: RmrkResourceInfo = Self::decode_property_value(&resource)?;

		let budget = up_data_structs::budget::Value::new(NESTING_BUDGET);
		let topmost_owner =
			<PalletStructure<T>>::find_topmost_owner(collection_id, nft_id, &budget)?;

		let sender = T::CrossAccountId::from_sub(sender);
		if topmost_owner == sender {
			<PalletNft<T>>::remove_token_aux_property(
				collection_id,
				nft_id,
				RMRK_SCOPE,
				Self::get_scoped_property_key(ResourceId(resource_id))?,
			);

			if let RmrkResourceTypes::Composable(resource) = resource_info.resource {
				let base_id = resource.base;

				Self::remove_associated_base_id(collection_id, nft_id, base_id)?;
			}
		} else {
			Self::try_mutate_resource_info(collection_id, nft_id, resource_id, |res| {
				res.pending_removal = true;

				Ok(())
			})?;
		}

		Ok(())
	}

	/// Remove a Base ID from an NFT if they are associated.
	/// The Base itself is deleted if the number of associated NFTs reaches 0.
	fn remove_associated_base_id(
		collection_id: CollectionId,
		nft_id: TokenId,
		base_id: RmrkBaseId,
	) -> DispatchResult {
		<PalletNft<T>>::try_mutate_token_aux_property(
			collection_id,
			nft_id,
			RMRK_SCOPE,
			Self::get_scoped_property_key(AssociatedBases)?,
			|value| -> DispatchResult {
				let mut bases: BasesMap = match value {
					Some(value) => Self::decode_property_value(value)?,
					None => BasesMap::new(),
				};

				let remaining = bases.get(&base_id);

				if let Some(remaining) = remaining {
					if let Some(0) | None = remaining.checked_sub(1) {
						bases.remove(&base_id);
					}
				}

				*value = Some(Self::encode_property_value(&bases)?);
				Ok(())
			},
		)
	}

	/// Apply a mutation to a resource stored in the token properties of an NFT.
	fn try_mutate_resource_info(
		collection_id: CollectionId,
		nft_id: TokenId,
		resource_id: RmrkResourceId,
		f: impl FnOnce(&mut RmrkResourceInfo) -> DispatchResult,
	) -> DispatchResult {
		<PalletNft<T>>::try_mutate_token_aux_property(
			collection_id,
			nft_id,
			RMRK_SCOPE,
			Self::get_scoped_property_key(ResourceId(resource_id))?,
			|value| match value {
				Some(value) => {
					let mut resource_info: RmrkResourceInfo = Self::decode_property_value(value)?;

					f(&mut resource_info)?;

					*value = Self::encode_property_value(&resource_info)?;

					Ok(())
				}
				None => Err(<Error<T>>::ResourceDoesntExist.into()),
			},
		)
	}

	/// Change the owner of an NFT collection, ensuring that the sender is the current owner.
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

	/// Ensure that an account is the collection owner/issuer, return an error if not.
	pub fn check_collection_owner(
		collection: &NonfungibleHandle<T>,
		account: &T::CrossAccountId,
	) -> DispatchResult {
		collection
			.check_is_owner(account)
			.map_err(Self::map_unique_err_to_proxy)
	}

	/// Get the latest yet-unused RMRK collection index from the storage.
	pub fn last_collection_idx() -> RmrkCollectionId {
		<CollectionIndex<T>>::get()
	}

	/// Get a mapping from a RMRK collection ID to its corresponding Unique collection ID.
	pub fn unique_collection_id(
		rmrk_collection_id: RmrkCollectionId,
	) -> Result<CollectionId, DispatchError> {
		<UniqueCollectionId<T>>::try_get(rmrk_collection_id)
			.map_err(|_| <Error<T>>::CollectionUnknown.into())
	}

	/// Get a mapping from a Unique collection ID to its RMRK collection ID counterpart, if it exists.
	pub fn rmrk_collection_id(
		unique_collection_id: CollectionId,
	) -> Result<RmrkCollectionId, DispatchError> {
		Self::get_collection_property_decoded(unique_collection_id, RmrkInternalCollectionId)
	}

	/// Fetch a Unique NFT collection.
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

	/// Check if an NFT collection with such an ID exists.
	pub fn collection_exists(collection_id: CollectionId) -> bool {
		<CollectionHandle<T>>::try_get(collection_id).is_ok()
	}

	/// Fetch and decode a RMRK-scoped collection property value in bytes.
	pub fn get_collection_property(
		collection_id: CollectionId,
		key: RmrkProperty,
	) -> Result<PropertyValue, DispatchError> {
		let collection_property = <PalletCommon<T>>::collection_properties(collection_id)
			.get(&Self::get_scoped_property_key(key)?)
			.ok_or(<Error<T>>::CollectionUnknown)?
			.clone();

		Ok(collection_property)
	}

	/// Fetch a RMRK-scoped collection property and decode it from bytes into an appropriate type.
	pub fn get_collection_property_decoded<V: Decode>(
		collection_id: CollectionId,
		key: RmrkProperty,
	) -> Result<V, DispatchError> {
		Self::decode_property_value(&Self::get_collection_property(collection_id, key)?)
	}

	/// Get the type of a collection stored as a scoped property.
	///
	/// RMRK Core proxy differentiates between regular collections as well as RMRK Bases as collections.
	pub fn get_collection_type(
		collection_id: CollectionId,
	) -> Result<misc::CollectionType, DispatchError> {
		Self::get_collection_property_decoded(collection_id, CollectionType).map_err(|err| {
			if err != <Error<T>>::CollectionUnknown.into() {
				<Error<T>>::CorruptedCollectionType.into()
			} else {
				err
			}
		})
	}

	/// Ensure that the type of the collection equals the provided type,
	/// otherwise return an error.
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

	/// Fetch an NFT collection, but make sure it has the appropriate type.
	pub fn get_typed_nft_collection(
		collection_id: CollectionId,
		collection_type: misc::CollectionType,
	) -> Result<NonfungibleHandle<T>, DispatchError> {
		Self::ensure_collection_type(collection_id, collection_type)?;

		Self::get_nft_collection(collection_id)
	}

	/// Same as [`get_typed_nft_collection`](crate::pallet::Pallet::get_typed_nft_collection),
	/// but also return the Unique collection ID.
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

	/// Fetch and decode a RMRK-scoped NFT property value in bytes.
	pub fn get_nft_property(
		collection_id: CollectionId,
		nft_id: TokenId,
		key: RmrkProperty,
	) -> Result<PropertyValue, DispatchError> {
		let nft_property = <PalletNft<T>>::token_properties((collection_id, nft_id))
			.get(&Self::get_scoped_property_key(key)?)
			.ok_or(<Error<T>>::RmrkPropertyIsNotFound)?
			.clone();

		Ok(nft_property)
	}

	/// Fetch a RMRK-scoped NFT property and decode it from bytes into an appropriate type.
	pub fn get_nft_property_decoded<V: Decode>(
		collection_id: CollectionId,
		nft_id: TokenId,
		key: RmrkProperty,
	) -> Result<V, DispatchError> {
		Self::decode_property_value(&Self::get_nft_property(collection_id, nft_id, key)?)
	}

	/// Check that an NFT exists.
	pub fn nft_exists(collection_id: CollectionId, nft_id: TokenId) -> bool {
		<TokenData<T>>::contains_key((collection_id, nft_id))
	}

	/// Get the type of an NFT stored as a scoped property.
	///
	/// RMRK Core proxy differentiates between regular NFTs, and RMRK Parts and Themes.
	pub fn get_nft_type(
		collection_id: CollectionId,
		token_id: TokenId,
	) -> Result<NftType, DispatchError> {
		Self::get_nft_property_decoded(collection_id, token_id, TokenType)
			.map_err(|_| <Error<T>>::NoAvailableNftId.into())
	}

	/// Ensure that the type of the NFT equals the provided type, otherwise return an error.
	pub fn ensure_nft_type(
		collection_id: CollectionId,
		token_id: TokenId,
		nft_type: NftType,
	) -> DispatchResult {
		let actual_type = Self::get_nft_type(collection_id, token_id)?;
		ensure!(actual_type == nft_type, <Error<T>>::NoPermission);

		Ok(())
	}

	/// Ensure that an account is the owner of the token, either directly
	/// or at the top of the nesting hierarchy; return an error if it is not.
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

	/// Fetch non-scoped properties of a collection or a token that match the filter keys supplied,
	/// or, if None are provided, return all non-scoped properties.
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

	/// Get all non-scoped properties from a collection or a token, and apply some transformation,
	/// supplied by `mapper`, to each key-value pair.
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
		let properties = match token_id {
			Some(token_id) => <PalletNft<T>>::token_properties((collection_id, token_id)),
			None => <PalletCommon<T>>::collection_properties(collection_id),
		};

		let properties = properties.into_iter().filter_map(move |(key, value)| {
			let key = strip_key_prefix(&key, USER_PROPERTY_PREFIX)?;

			let key: Key = key.to_vec().try_into().ok()?;
			let value: Value = value.decode().ok()?;

			Some(mapper(key, value))
		});

		Ok(properties)
	}

	/// Match Unique errors to RMRK's own and return the RMRK error if a match is successful.
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
