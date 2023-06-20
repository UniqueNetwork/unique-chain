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

//! # Unique Pallet
//!
//! A pallet governing Unique transactions.
//!
//! - [`Config`]
//! - [`Call`]
//! - [`Pallet`]
//!
//! ## Overview
//!
//! The Unique pallet's purpose is to be the primary interface between
//! external users and the inner structure of the Unique chains.
//!
//! It also contains an implementation of [`CollectionHelpers`][`eth`],
//! an Ethereum contract dealing with collection operations.
//!
//! ## Interface
//!
//! ### Dispatchables
//!
//! - `create_collection` - Create a collection of tokens. **Deprecated**, use `create_collection_ex`.
//! - `create_collection_ex` - Create a collection of tokens with explicit parameters.
//! - `destroy_collection` - Destroy a collection if no tokens exist within.
//! - `add_to_allow_list` - Add an address to allow list.
//! - `remove_from_allow_list` - Remove an address from allow list.
//! - `change_collection_owner` - Change the owner of the collection.
//! - `add_collection_admin` - Add an admin to a collection.
//! - `remove_collection_admin` - Remove admin of a collection.
//! - `set_collection_sponsor` - Invite a new collection sponsor.
//! - `confirm_sponsorship` - Confirm own sponsorship of a collection, becoming the sponsor.
//! - `remove_collection_sponsor` - Remove a sponsor from a collection.
//! - `create_item` - Create an item within a collection.
//! - `create_multiple_items` - Create multiple items within a collection.
//! - `set_collection_properties` - Add or change collection properties.
//! - `delete_collection_properties` - Delete specified collection properties.
//! - `set_token_properties` - Add or change token properties.
//! - `delete_token_properties` - Delete token properties.
//! - `set_token_property_permissions` - Add or change token property permissions of a collection.
//! - `create_multiple_items_ex` - Create multiple items within a collection with explicitly specified initial parameters.
//! - `set_transfers_enabled_flag` - Completely allow or disallow transfers for a particular collection.
//! - `burn_item` - Destroy an item.
//! - `burn_from` - Destroy an item on behalf of the owner as a non-owner account.
//! - `transfer` - Change ownership of the token.
//! - `transfer_from` - Change ownership of the token on behalf of the owner as a non-owner account.
//! - `approve` - Allow a non-permissioned address to transfer or burn an item.
//! - `set_collection_limits` - Set specific limits of a collection.
//! - `set_collection_permissions` - Set specific permissions of a collection.
//! - `repartition` - Re-partition a refungible token, while owning all of its parts.

#![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]
#![allow(
	clippy::too_many_arguments,
	clippy::unnecessary_mut_passed,
	clippy::unused_unit
)]

extern crate alloc;

pub use pallet::*;
use frame_support::pallet_prelude::*;
use frame_system::pallet_prelude::*;
pub mod eth;

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod weights;

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	use frame_support::{dispatch::DispatchResult, ensure, fail, BoundedVec, storage::Key};
	use scale_info::TypeInfo;
	use frame_system::{ensure_signed, ensure_root};
	use sp_std::{vec, vec::Vec};
	use up_data_structs::{
		MAX_COLLECTION_NAME_LENGTH, MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
		MAX_PROPERTIES_PER_ITEM, MAX_PROPERTY_KEY_LENGTH, MAX_PROPERTY_VALUE_LENGTH,
		MAX_COLLECTION_PROPERTIES_SIZE, COLLECTION_ADMINS_LIMIT, MAX_TOKEN_PROPERTIES_SIZE,
		CreateItemData, CollectionLimits, CollectionPermissions, CollectionId, CollectionMode,
		TokenId, CreateCollectionData, CreateItemExData, budget, Property, PropertyKey,
		PropertyKeyPermission,
	};
	use pallet_evm::account::CrossAccountId;
	use pallet_common::{
		CollectionHandle, Pallet as PalletCommon, CommonWeightInfo, dispatch::dispatch_tx,
		dispatch::CollectionDispatch, RefungibleExtensionsWeightInfo,
	};
	use weights::WeightInfo;

	/// A maximum number of levels of depth in the token nesting tree.
	pub const NESTING_BUDGET: u32 = 5;

	/// Errors for the common Unique transactions.
	#[pallet::error]
	pub enum Error<T> {
		/// Decimal_points parameter must be lower than [`up_data_structs::MAX_DECIMAL_POINTS`].
		CollectionDecimalPointLimitExceeded,
		/// Length of items properties must be greater than 0.
		EmptyArgument,
		/// Repertition is only supported by refungible collection.
		RepartitionCalledOnNonRefungibleCollection,
	}

	/// Configuration trait of this pallet.
	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config + Sized + TypeInfo {
		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;

		/// Weight information for common pallet operations.
		type CommonWeightInfo: CommonWeightInfo<Self::CrossAccountId>;

		/// Weight info information for extra refungible pallet operations.
		type RefungibleExtensionsWeightInfo: RefungibleExtensionsWeightInfo;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

	// # Used definitions
	//
	// ## User control levels
	//
	// chain-controlled - key is uncontrolled by user
	//                    i.e autoincrementing index
	//                    can use non-cryptographic hash
	// real - key is controlled by user
	//        but it is hard to generate enough colliding values, i.e owner of signed txs
	//        can use non-cryptographic hash
	// controlled - key is completly controlled by users
	//              i.e maps with mutable keys
	//              should use cryptographic hash
	//
	// ## User control level downgrade reasons
	//
	// ?1 - chain-controlled -> controlled
	//      collections/tokens can be destroyed, resulting in massive holes
	// ?2 - chain-controlled -> controlled
	//      same as ?1, but can be only added, resulting in easier exploitation
	// ?3 - real -> controlled
	//      no confirmation required, so addresses can be easily generated

	//#region Private members
	/// Used for migrations
	#[pallet::storage]
	pub type ChainVersion<T> = StorageValue<_, u64, ValueQuery>;
	//#endregion

	//#region Tokens transfer sponosoring rate limit baskets
	/// (Collection id (controlled?2), who created (real))
	/// TODO: Off chain worker should remove from this map when collection gets removed
	#[pallet::storage]
	#[pallet::getter(fn create_item_busket)]
	pub type CreateItemBasket<T: Config> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = (CollectionId, T::AccountId),
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;
	/// Collection id (controlled?2), token id (controlled?2)
	#[pallet::storage]
	#[pallet::getter(fn nft_transfer_basket)]
	pub type NftTransferBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = TokenId,
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;
	/// Collection id (controlled?2), owning user (real)
	#[pallet::storage]
	#[pallet::getter(fn fungible_transfer_basket)]
	pub type FungibleTransferBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Twox64Concat,
		Key2 = T::AccountId,
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;
	/// Collection id (controlled?2), token id (controlled?2)
	#[pallet::storage]
	#[pallet::getter(fn refungible_transfer_basket)]
	pub type ReFungibleTransferBasket<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, TokenId>,
			Key<Twox64Concat, T::AccountId>,
		),
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;
	//#endregion

	/// Last sponsoring of token property setting // todo:doc rephrase this and the following
	#[pallet::storage]
	#[pallet::getter(fn token_property_basket)]
	pub type TokenPropertyBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = TokenId,
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;

	/// Last sponsoring of NFT approval in a collection
	#[pallet::storage]
	#[pallet::getter(fn nft_approve_basket)]
	pub type NftApproveBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Blake2_128Concat,
		Key2 = TokenId,
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;
	/// Last sponsoring of fungible tokens approval in a collection
	#[pallet::storage]
	#[pallet::getter(fn fungible_approve_basket)]
	pub type FungibleApproveBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Blake2_128Concat,
		Key1 = CollectionId,
		Hasher2 = Twox64Concat,
		Key2 = T::AccountId,
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;
	/// Last sponsoring of RFT approval in a collection
	#[pallet::storage]
	#[pallet::getter(fn refungible_approve_basket)]
	pub type RefungibleApproveBasket<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, TokenId>,
			Key<Twox64Concat, T::AccountId>,
		),
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;

	#[pallet::extra_constants]
	impl<T: Config> Pallet<T> {
		/// A maximum number of levels of depth in the token nesting tree.
		fn nesting_budget() -> u32 {
			NESTING_BUDGET
		}

		/// Maximal length of a collection name.
		fn max_collection_name_length() -> u32 {
			MAX_COLLECTION_NAME_LENGTH
		}

		/// Maximal length of a collection description.
		fn max_collection_description_length() -> u32 {
			MAX_COLLECTION_DESCRIPTION_LENGTH
		}

		/// Maximal length of a token prefix.
		fn max_token_prefix_length() -> u32 {
			MAX_TOKEN_PREFIX_LENGTH
		}

		/// Maximum admins per collection.
		fn collection_admins_limit() -> u32 {
			COLLECTION_ADMINS_LIMIT
		}

		/// Maximal length of a property key.
		fn max_property_key_length() -> u32 {
			MAX_PROPERTY_KEY_LENGTH
		}

		/// Maximal length of a property value.
		fn max_property_value_length() -> u32 {
			MAX_PROPERTY_VALUE_LENGTH
		}

		/// A maximum number of token properties.
		fn max_properties_per_item() -> u32 {
			MAX_PROPERTIES_PER_ITEM
		}

		/// Maximum size for all collection properties.
		fn max_collection_properties_size() -> u32 {
			MAX_COLLECTION_PROPERTIES_SIZE
		}

		/// Maximum size of all token properties.
		fn max_token_properties_size() -> u32 {
			MAX_TOKEN_PROPERTIES_SIZE
		}

		/// Default NFT collection limit.
		fn nft_default_collection_limits() -> CollectionLimits {
			CollectionLimits::with_default_limits(CollectionMode::NFT)
		}

		/// Default RFT collection limit.
		fn rft_default_collection_limits() -> CollectionLimits {
			CollectionLimits::with_default_limits(CollectionMode::ReFungible)
		}

		/// Default FT collection limit.
		fn ft_default_collection_limits() -> CollectionLimits {
			CollectionLimits::with_default_limits(CollectionMode::Fungible(0))
		}
	}

	/// Type alias to Pallet, to be used by construct_runtime.
	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create a collection of tokens.
		///
		/// Each Token may have multiple properties encoded as an array of bytes
		/// of certain length. The initial owner of the collection is set
		/// to the address that signed the transaction and can be changed later.
		///
		/// Prefer the more advanced [`create_collection_ex`][`Pallet::create_collection_ex`] instead.
		///
		/// # Permissions
		///
		/// * Anyone - becomes the owner of the new collection.
		///
		/// # Arguments
		///
		/// * `collection_name`: Wide-character string with collection name
		/// (limit [`MAX_COLLECTION_NAME_LENGTH`]).
		/// * `collection_description`: Wide-character string with collection description
		/// (limit [`MAX_COLLECTION_DESCRIPTION_LENGTH`]).
		/// * `token_prefix`: Byte string containing the token prefix to mark a collection
		/// to which a token belongs (limit [`MAX_TOKEN_PREFIX_LENGTH`]).
		/// * `mode`: Type of items stored in the collection and type dependent data.
		///
		/// returns collection ID
		///
		/// Deprecated: `create_collection_ex` is more up-to-date and advanced, prefer it instead.
		#[pallet::call_index(0)]
		#[pallet::weight(<SelfWeightOf<T>>::create_collection())]
		pub fn create_collection(
			origin: OriginFor<T>,
			collection_name: BoundedVec<u16, ConstU32<MAX_COLLECTION_NAME_LENGTH>>,
			collection_description: BoundedVec<u16, ConstU32<MAX_COLLECTION_DESCRIPTION_LENGTH>>,
			token_prefix: BoundedVec<u8, ConstU32<MAX_TOKEN_PREFIX_LENGTH>>,
			mode: CollectionMode,
		) -> DispatchResult {
			let data: CreateCollectionData<T::AccountId> = CreateCollectionData {
				name: collection_name,
				description: collection_description,
				token_prefix,
				mode,
				..Default::default()
			};
			Self::create_collection_ex(origin, data)
		}

		/// Create a collection with explicit parameters.
		///
		/// Prefer it to the deprecated [`create_collection`][`Pallet::create_collection`] method.
		///
		/// # Permissions
		///
		/// * Anyone - becomes the owner of the new collection.
		///
		/// # Arguments
		///
		/// * `data`: Explicit data of a collection used for its creation.
		#[pallet::call_index(1)]
		#[pallet::weight(<SelfWeightOf<T>>::create_collection())]
		pub fn create_collection_ex(
			origin: OriginFor<T>,
			data: CreateCollectionData<T::AccountId>,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			// =========
			let sender = T::CrossAccountId::from_sub(sender);
			let _id =
				T::CollectionDispatch::create(sender.clone(), sender, data, Default::default())?;

			Ok(())
		}

		/// Destroy a collection if no tokens exist within.
		///
		/// # Permissions
		///
		/// * Collection owner
		///
		/// # Arguments
		///
		/// * `collection_id`: Collection to destroy.
		#[pallet::call_index(2)]
		#[pallet::weight(<SelfWeightOf<T>>::destroy_collection())]
		pub fn destroy_collection(
			origin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			Self::destroy_collection_internal(sender, collection_id)
		}

		/// Add an address to allow list.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `address`: ID of the address to be added to the allowlist.
		#[pallet::call_index(3)]
		#[pallet::weight(<SelfWeightOf<T>>::add_to_allow_list())]
		pub fn add_to_allow_list(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			address: T::CrossAccountId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_internal()?;

			<PalletCommon<T>>::toggle_allowlist(&collection, &sender, &address, true)?;

			Ok(())
		}

		/// Remove an address from allow list.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `address`: ID of the address to be removed from the allowlist.
		#[pallet::call_index(4)]
		#[pallet::weight(<SelfWeightOf<T>>::remove_from_allow_list())]
		pub fn remove_from_allow_list(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			address: T::CrossAccountId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_internal()?;

			<PalletCommon<T>>::toggle_allowlist(&collection, &sender, &address, false)?;

			Ok(())
		}

		/// Change the owner of the collection.
		///
		/// # Permissions
		///
		/// * Collection owner
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `new_owner`: ID of the account that will become the owner.
		#[pallet::call_index(5)]
		#[pallet::weight(<SelfWeightOf<T>>::change_collection_owner())]
		pub fn change_collection_owner(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			new_owner: T::AccountId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let new_owner = T::CrossAccountId::from_sub(new_owner);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.change_owner(sender, new_owner)
		}

		/// Add an admin to a collection.
		///
		/// NFT Collection can be controlled by multiple admin addresses
		/// (some which can also be servers, for example). Admins can issue
		/// and burn NFTs, as well as add and remove other admins,
		/// but cannot change NFT or Collection ownership.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the Collection to add an admin for.
		/// * `new_admin`: Address of new admin to add.
		#[pallet::call_index(6)]
		#[pallet::weight(<SelfWeightOf<T>>::add_collection_admin())]
		pub fn add_collection_admin(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			new_admin_id: T::CrossAccountId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			<PalletCommon<T>>::toggle_admin(&collection, &sender, &new_admin_id, true)
		}

		/// Remove admin of a collection.
		///
		/// An admin address can remove itself. List of admins may become empty,
		/// in which case only Collection Owner will be able to add an Admin.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection to remove the admin for.
		/// * `account_id`: Address of the admin to remove.
		#[pallet::call_index(7)]
		#[pallet::weight(<SelfWeightOf<T>>::remove_collection_admin())]
		pub fn remove_collection_admin(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			account_id: T::CrossAccountId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			<PalletCommon<T>>::toggle_admin(&collection, &sender, &account_id, false)
		}

		/// Set (invite) a new collection sponsor.
		///
		/// If successful, confirmation from the sponsor-to-be will be pending.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `new_sponsor`: ID of the account of the sponsor-to-be.
		#[pallet::call_index(8)]
		#[pallet::weight(<SelfWeightOf<T>>::set_collection_sponsor())]
		pub fn set_collection_sponsor(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			new_sponsor: T::AccountId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.set_sponsor(&sender, new_sponsor.clone())
		}

		/// Confirm own sponsorship of a collection, becoming the sponsor.
		///
		/// An invitation must be pending, see [`set_collection_sponsor`][`Pallet::set_collection_sponsor`].
		/// Sponsor can pay the fees of a transaction instead of the sender,
		/// but only within specified limits.
		///
		/// # Permissions
		///
		/// * Sponsor-to-be
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection with the pending sponsor.
		#[pallet::call_index(9)]
		#[pallet::weight(<SelfWeightOf<T>>::confirm_sponsorship())]
		pub fn confirm_sponsorship(
			origin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = ensure_signed(origin)?;
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.confirm_sponsorship(&sender)
		}

		/// Remove a collection's a sponsor, making everyone pay for their own transactions.
		///
		/// # Permissions
		///
		/// * Collection owner
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection with the sponsor to remove.
		#[pallet::call_index(10)]
		#[pallet::weight(<SelfWeightOf<T>>::remove_collection_sponsor())]
		pub fn remove_collection_sponsor(
			origin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.remove_sponsor(&sender)
		}

		/// Mint an item within a collection.
		///
		/// A collection must exist first, see [`create_collection_ex`][`Pallet::create_collection_ex`].
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Anyone if
		///     * Allow List is enabled, and
		///     * Address is added to allow list, and
		///     * MintPermission is enabled (see [`set_collection_permissions`][`Pallet::set_collection_permissions`])
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection to which an item would belong.
		/// * `owner`: Address of the initial owner of the item.
		/// * `data`: Token data describing the item to store on chain.
		#[pallet::call_index(11)]
		#[pallet::weight(T::CommonWeightInfo::create_item(data))]
		pub fn create_item(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			owner: T::CrossAccountId,
			data: CreateItemData,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.create_item(sender, owner, data, &budget)
			})
		}

		/// Create multiple items within a collection.
		///
		/// A collection must exist first, see [`create_collection_ex`][`Pallet::create_collection_ex`].
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Anyone if
		///     * Allow List is enabled, and
		///     * Address is added to the allow list, and
		///     * MintPermission is enabled (see [`set_collection_permissions`][`Pallet::set_collection_permissions`])
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection to which the tokens would belong.
		/// * `owner`: Address of the initial owner of the tokens.
		/// * `items_data`: Vector of data describing each item to be created.
		#[pallet::call_index(12)]
		#[pallet::weight(T::CommonWeightInfo::create_multiple_items(items_data))]
		pub fn create_multiple_items(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			owner: T::CrossAccountId,
			items_data: Vec<CreateItemData>,
		) -> DispatchResultWithPostInfo {
			ensure!(!items_data.is_empty(), Error::<T>::EmptyArgument);
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.create_multiple_items(sender, owner, items_data, &budget)
			})
		}

		/// Add or change collection properties.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `properties`: Vector of key-value pairs stored as the collection's metadata.
		/// Keys support Latin letters, `-`, `_`, and `.` as symbols.
		#[pallet::call_index(13)]
		#[pallet::weight(T::CommonWeightInfo::set_collection_properties(properties.len() as u32))]
		pub fn set_collection_properties(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			properties: Vec<Property>,
		) -> DispatchResultWithPostInfo {
			ensure!(!properties.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.set_collection_properties(sender, properties)
			})
		}

		/// Delete specified collection properties.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `property_keys`: Vector of keys of the properties to be deleted.
		/// Keys support Latin letters, `-`, `_`, and `.` as symbols.
		#[pallet::call_index(14)]
		#[pallet::weight(T::CommonWeightInfo::delete_collection_properties(property_keys.len() as u32))]
		pub fn delete_collection_properties(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			property_keys: Vec<PropertyKey>,
		) -> DispatchResultWithPostInfo {
			ensure!(!property_keys.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.delete_collection_properties(&sender, property_keys)
			})
		}

		/// Add or change token properties according to collection's permissions.
		/// Currently properties only work with NFTs.
		///
		/// # Permissions
		///
		/// * Depends on collection's token property permissions and specified property mutability:
		/// 	* Collection owner
		/// 	* Collection admin
		/// 	* Token owner
		///
		/// See [`set_token_property_permissions`][`Pallet::set_token_property_permissions`].
		///
		/// # Arguments
		///
		/// * `collection_id: ID of the collection to which the token belongs.
		/// * `token_id`: ID of the modified token.
		/// * `properties`: Vector of key-value pairs stored as the token's metadata.
		/// Keys support Latin letters, `-`, `_`, and `.` as symbols.
		#[pallet::call_index(15)]
		#[pallet::weight(T::CommonWeightInfo::set_token_properties(properties.len() as u32))]
		pub fn set_token_properties(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			token_id: TokenId,
			properties: Vec<Property>,
		) -> DispatchResultWithPostInfo {
			ensure!(!properties.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.set_token_properties(sender, token_id, properties, &budget)
			})
		}

		/// Delete specified token properties. Currently properties only work with NFTs.
		///
		/// # Permissions
		///
		/// * Depends on collection's token property permissions and specified property mutability:
		/// 	* Collection owner
		/// 	* Collection admin
		/// 	* Token owner
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection to which the token belongs.
		/// * `token_id`: ID of the modified token.
		/// * `property_keys`: Vector of keys of the properties to be deleted.
		/// Keys support Latin letters, `-`, `_`, and `.` as symbols.
		#[pallet::call_index(16)]
		#[pallet::weight(T::CommonWeightInfo::delete_token_properties(property_keys.len() as u32))]
		pub fn delete_token_properties(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			token_id: TokenId,
			property_keys: Vec<PropertyKey>,
		) -> DispatchResultWithPostInfo {
			ensure!(!property_keys.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.delete_token_properties(sender, token_id, property_keys, &budget)
			})
		}

		/// Add or change token property permissions of a collection.
		///
		/// Without a permission for a particular key, a property with that key
		/// cannot be created in a token.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `property_permissions`: Vector of permissions for property keys.
		/// Keys support Latin letters, `-`, `_`, and `.` as symbols.
		#[pallet::call_index(17)]
		#[pallet::weight(T::CommonWeightInfo::set_token_property_permissions(property_permissions.len() as u32))]
		pub fn set_token_property_permissions(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			property_permissions: Vec<PropertyKeyPermission>,
		) -> DispatchResultWithPostInfo {
			ensure!(!property_permissions.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.set_token_property_permissions(&sender, property_permissions)
			})
		}

		/// Create multiple items within a collection with explicitly specified initial parameters.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Anyone if
		///     * Allow List is enabled, and
		///     * Address is added to allow list, and
		///     * MintPermission is enabled (see [`set_collection_permissions`][`Pallet::set_collection_permissions`])
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection to which the tokens would belong.
		/// * `data`: Explicit item creation data.
		#[pallet::call_index(18)]
		#[pallet::weight(T::CommonWeightInfo::create_multiple_items_ex(data))]
		pub fn create_multiple_items_ex(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			data: CreateItemExData<T::CrossAccountId>,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.create_multiple_items_ex(sender, data, &budget)
			})
		}

		/// Completely allow or disallow transfers for a particular collection.
		///
		/// # Permissions
		///
		/// * Collection owner
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection.
		/// * `value`: New value of the flag, are transfers allowed?
		#[pallet::call_index(19)]
		#[pallet::weight(<SelfWeightOf<T>>::set_transfers_enabled_flag())]
		pub fn set_transfers_enabled_flag(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			value: bool,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_internal()?;
			target_collection.check_is_owner(&sender)?;

			// =========

			target_collection.limits.transfers_enabled = Some(value);
			target_collection.save()
		}

		/// Destroy an item.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Current item owner
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection to which the item belongs.
		/// * `item_id`: ID of item to burn.
		/// * `value`: Number of pieces of the item to destroy.
		/// 	* Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
		///     * Fungible Mode: The desired number of pieces to burn.
		///     * Re-Fungible Mode: The desired number of pieces to burn.
		#[pallet::call_index(20)]
		#[pallet::weight(T::CommonWeightInfo::burn_item())]
		pub fn burn_item(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			item_id: TokenId,
			value: u128,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let post_info =
				dispatch_tx::<T, _>(collection_id, |d| d.burn_item(sender, item_id, value))?;
			if value == 1 {
				<NftTransferBasket<T>>::remove(collection_id, item_id);
				<NftApproveBasket<T>>::remove(collection_id, item_id);
			}
			// Those maps should be cleared only if token disappears completly, need to move this part of logic to pallets?
			// <FungibleApproveBasket<T>>::remove(collection_id, sender.as_sub());
			// <RefungibleApproveBasket<T>>::remove((collection_id, item_id, sender.as_sub()));
			Ok(post_info)
		}

		/// Destroy a token on behalf of the owner as a non-owner account.
		///
		/// See also: [`approve`][`Pallet::approve`].
		///
		/// After this method executes, one approval is removed from the total so that
		/// the approved address will not be able to transfer this item again from this owner.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Current token owner
		/// * Address approved by current item owner
		///
		/// # Arguments
		///
		/// * `from`: The owner of the burning item.
		/// * `collection_id`: ID of the collection to which the item belongs.
		/// * `item_id`: ID of item to burn.
		/// * `value`: Number of pieces to burn.
		/// 	* Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
		///     * Fungible Mode: The desired number of pieces to burn.
		///     * Re-Fungible Mode: The desired number of pieces to burn.
		#[pallet::call_index(21)]
		#[pallet::weight(T::CommonWeightInfo::burn_from())]
		pub fn burn_from(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			from: T::CrossAccountId,
			item_id: TokenId,
			value: u128,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.burn_from(sender, from, item_id, value, &budget)
			})
		}

		/// Change ownership of the token.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Current token owner
		///
		/// # Arguments
		///
		/// * `recipient`: Address of token recipient.
		/// * `collection_id`: ID of the collection the item belongs to.
		/// * `item_id`: ID of the item.
		///     * Non-Fungible Mode: Required.
		///     * Fungible Mode: Ignored.
		///     * Re-Fungible Mode: Required.
		///
		/// * `value`: Amount to transfer.
		/// 	* Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
		///     * Fungible Mode: The desired number of pieces to transfer.
		///     * Re-Fungible Mode: The desired number of pieces to transfer.
		#[pallet::call_index(22)]
		#[pallet::weight(T::CommonWeightInfo::transfer())]
		pub fn transfer(
			origin: OriginFor<T>,
			recipient: T::CrossAccountId,
			collection_id: CollectionId,
			item_id: TokenId,
			value: u128,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.transfer(sender, recipient, item_id, value, &budget)
			})
		}

		/// Allow a non-permissioned address to transfer or burn an item.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Current item owner
		///
		/// # Arguments
		///
		/// * `spender`: Account to be approved to make specific transactions on non-owned tokens.
		/// * `collection_id`: ID of the collection the item belongs to.
		/// * `item_id`: ID of the item transactions on which are now approved.
		/// * `amount`: Number of pieces of the item approved for a transaction (maximum of 1 for NFTs).
		/// Set to 0 to revoke the approval.
		#[pallet::call_index(23)]
		#[pallet::weight(T::CommonWeightInfo::approve())]
		pub fn approve(
			origin: OriginFor<T>,
			spender: T::CrossAccountId,
			collection_id: CollectionId,
			item_id: TokenId,
			amount: u128,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.approve(sender, spender, item_id, amount)
			})
		}

		/// Allow a non-permissioned address to transfer or burn an item from owner's eth mirror.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Current item owner
		///
		/// # Arguments
		///
		/// * `from`: Owner's account eth mirror
		/// * `to`: Account to be approved to make specific transactions on non-owned tokens.
		/// * `collection_id`: ID of the collection the item belongs to.
		/// * `item_id`: ID of the item transactions on which are now approved.
		/// * `amount`: Number of pieces of the item approved for a transaction (maximum of 1 for NFTs).
		/// Set to 0 to revoke the approval.
		#[pallet::call_index(24)]
		#[pallet::weight(T::CommonWeightInfo::approve_from())]
		pub fn approve_from(
			origin: OriginFor<T>,
			from: T::CrossAccountId,
			to: T::CrossAccountId,
			collection_id: CollectionId,
			item_id: TokenId,
			amount: u128,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.approve_from(sender, from, to, item_id, amount)
			})
		}

		/// Change ownership of an item on behalf of the owner as a non-owner account.
		///
		/// See the [`approve`][`Pallet::approve`] method for additional information.
		///
		/// After this method executes, one approval is removed from the total so that
		/// the approved address will not be able to transfer this item again from this owner.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		/// * Current item owner
		/// * Address approved by current item owner
		///
		/// # Arguments
		///
		/// * `from`: Address that currently owns the token.
		/// * `recipient`: Address of the new token-owner-to-be.
		/// * `collection_id`: ID of the collection the item.
		/// * `item_id`: ID of the item to be transferred.
		/// * `value`: Amount to transfer.
		/// 	* Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
		///     * Fungible Mode: The desired number of pieces to transfer.
		///     * Re-Fungible Mode: The desired number of pieces to transfer.
		#[pallet::call_index(25)]
		#[pallet::weight(T::CommonWeightInfo::transfer_from())]
		pub fn transfer_from(
			origin: OriginFor<T>,
			from: T::CrossAccountId,
			recipient: T::CrossAccountId,
			collection_id: CollectionId,
			item_id: TokenId,
			value: u128,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| {
				d.transfer_from(sender, from, recipient, item_id, value, &budget)
			})
		}

		/// Set specific limits of a collection. Empty, or None fields mean chain default.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `new_limit`: New limits of the collection. Fields that are not set (None)
		/// will not overwrite the old ones.
		#[pallet::call_index(26)]
		#[pallet::weight(<SelfWeightOf<T>>::set_collection_limits())]
		pub fn set_collection_limits(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			new_limit: CollectionLimits,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			<PalletCommon<T>>::update_limits(&sender, &mut target_collection, new_limit)
		}

		/// Set specific permissions of a collection. Empty, or None fields mean chain default.
		///
		/// # Permissions
		///
		/// * Collection owner
		/// * Collection admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		/// * `new_permission`: New permissions of the collection. Fields that are not set (None)
		/// will not overwrite the old ones.
		#[pallet::call_index(27)]
		#[pallet::weight(<SelfWeightOf<T>>::set_collection_limits())]
		pub fn set_collection_permissions(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			new_permission: CollectionPermissions,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			<PalletCommon<T>>::update_permissions(&sender, &mut target_collection, new_permission)
		}

		/// Re-partition a refungible token, while owning all of its parts/pieces.
		///
		/// # Permissions
		///
		/// * Token owner (must own every part)
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection the RFT belongs to.
		/// * `token_id`: ID of the RFT.
		/// * `amount`: New number of parts/pieces into which the token shall be partitioned.
		#[pallet::call_index(28)]
		#[pallet::weight(T::RefungibleExtensionsWeightInfo::repartition())]
		pub fn repartition(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			token_id: TokenId,
			amount: u128,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			dispatch_tx::<T, _>(collection_id, |d| {
				if let Some(refungible_extensions) = d.refungible_extensions() {
					refungible_extensions.repartition(&sender, token_id, amount)
				} else {
					fail!(<Error<T>>::RepartitionCalledOnNonRefungibleCollection)
				}
			})
		}

		/// Sets or unsets the approval of a given operator.
		///
		/// The `operator` is allowed to transfer all tokens of the `owner` on their behalf.
		///
		/// # Arguments
		///
		/// * `owner`: Token owner
		/// * `operator`: Operator
		/// * `approve`: Should operator status be granted or revoked?
		#[pallet::call_index(29)]
		#[pallet::weight(T::CommonWeightInfo::set_allowance_for_all())]
		pub fn set_allowance_for_all(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			operator: T::CrossAccountId,
			approve: bool,
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			dispatch_tx::<T, _>(collection_id, |d| {
				d.set_allowance_for_all(sender, operator, approve)
			})
		}

		/// Repairs a collection if the data was somehow corrupted.
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection to repair.
		#[pallet::call_index(30)]
		#[pallet::weight(<SelfWeightOf<T>>::force_repair_collection())]
		pub fn force_repair_collection(
			origin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			if collection_id == pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
				fail!(<pallet_common::Error<T>>::UnsupportedOperation);
			}
			ensure_root(origin)?;
			<PalletCommon<T>>::repair_collection(collection_id)
		}

		/// Repairs a token if the data was somehow corrupted.
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection the item belongs to.
		/// * `item_id`: ID of the item.
		#[pallet::call_index(31)]
		#[pallet::weight(T::CommonWeightInfo::force_repair_item())]
		pub fn force_repair_item(
			origin: OriginFor<T>,
			collection_id: CollectionId,
			item_id: TokenId,
		) -> DispatchResultWithPostInfo {
			ensure_root(origin)?;
			dispatch_tx::<T, _>(collection_id, |d| d.repair_item(item_id))
		}
	}

	impl<T: Config> Pallet<T> {
		/// Force set `sponsor` for `collection`.
		///
		/// Differs from [`set_collection_sponsor`][`Pallet::set_collection_sponsor`] in that confirmation
		/// from the `sponsor` is not required.
		///
		/// # Arguments
		///
		/// * `sponsor`: ID of the account of the sponsor-to-be.
		/// * `collection_id`: ID of the modified collection.
		pub fn force_set_sponsor(
			sponsor: T::AccountId,
			collection_id: CollectionId,
		) -> DispatchResult {
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.force_set_sponsor(sponsor)
		}

		/// Force remove `sponsor` for `collection`.
		///
		/// Differs from `remove_sponsor` in that
		/// it doesn't require consent from the `owner` of the collection.
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the modified collection.
		pub fn force_remove_collection_sponsor(collection_id: CollectionId) -> DispatchResult {
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.force_remove_sponsor()
		}

		#[inline(always)]
		pub(crate) fn destroy_collection_internal(
			sender: T::CrossAccountId,
			collection_id: CollectionId,
		) -> DispatchResult {
			T::CollectionDispatch::destroy(sender, collection_id)?;

			// TODO: basket cleanup should be moved elsewhere
			// Maybe runtime dispatch.rs should perform it?

			let _ = <NftTransferBasket<T>>::clear_prefix(collection_id, u32::MAX, None);
			let _ = <FungibleTransferBasket<T>>::clear_prefix(collection_id, u32::MAX, None);
			let _ = <ReFungibleTransferBasket<T>>::clear_prefix((collection_id,), u32::MAX, None);

			let _ = <NftApproveBasket<T>>::clear_prefix(collection_id, u32::MAX, None);
			let _ = <FungibleApproveBasket<T>>::clear_prefix(collection_id, u32::MAX, None);
			let _ = <RefungibleApproveBasket<T>>::clear_prefix((collection_id,), u32::MAX, None);

			Ok(())
		}
	}
}
