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

use frame_support::{
	decl_module, decl_storage, decl_error, decl_event,
	dispatch::DispatchResult,
	ensure, fail,
	weights::{Weight},
	transactional,
	pallet_prelude::{DispatchResultWithPostInfo, ConstU32},
	BoundedVec,
};
use scale_info::TypeInfo;
use frame_system::{self as system, ensure_signed};
use sp_runtime::{sp_std::prelude::Vec};
use up_data_structs::{
	MAX_COLLECTION_NAME_LENGTH, MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
	CreateItemData, CollectionLimits, CollectionPermissions, CollectionId, CollectionMode, TokenId,
	SponsorshipState, CreateCollectionData, CreateItemExData, budget, Property, PropertyKey,
	PropertyKeyPermission,
};
use pallet_evm::account::CrossAccountId;
use pallet_common::{
	CollectionHandle, Pallet as PalletCommon, CommonWeightInfo, dispatch::dispatch_tx,
	dispatch::CollectionDispatch, RefungibleExtensionsWeightInfo,
};
pub mod eth;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;
use weights::WeightInfo;

/// Maximum number of levels of depth in the token nesting tree.
pub const NESTING_BUDGET: u32 = 5;

decl_error! {
	/// Errors for the common Unique transactions.
	pub enum Error for Module<T: Config> {
		/// Decimal_points parameter must be lower than [`up_data_structs::MAX_DECIMAL_POINTS`].
		CollectionDecimalPointLimitExceeded,
		/// This address is not set as sponsor, use setCollectionSponsor first.
		ConfirmUnsetSponsorFail,
		/// Length of items properties must be greater than 0.
		EmptyArgument,
		/// Repertition is only supported by refungible collection.
		RepartitionCalledOnNonRefungibleCollection,
	}
}

/// Configuration trait of this pallet.
pub trait Config: system::Config + pallet_common::Config + Sized + TypeInfo {
	/// Overarching event type.
	type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;

	/// Weight information for extrinsics in this pallet.
	type WeightInfo: WeightInfo;

	/// Weight information for common pallet operations.
	type CommonWeightInfo: CommonWeightInfo<Self::CrossAccountId>;

	/// Weight info information for extra refungible pallet operations.
	type RefungibleExtensionsWeightInfo: RefungibleExtensionsWeightInfo;
}

decl_event! {
	pub enum Event<T>
	where
		<T as frame_system::Config>::AccountId,
		<T as pallet_evm::account::Config>::CrossAccountId,
	{
		/// Collection sponsor was removed
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		CollectionSponsorRemoved(CollectionId),

		/// Collection admin was added
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		/// * admin: Admin address.
		CollectionAdminAdded(CollectionId, CrossAccountId),

		/// Collection owned was changed
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		/// * owner: New owner address.
		CollectionOwnedChanged(CollectionId, AccountId),

		/// Collection sponsor was set
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		/// * owner: New sponsor address.
		CollectionSponsorSet(CollectionId, AccountId),

		/// New sponsor was confirm
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		/// * sponsor: New sponsor address.
		SponsorshipConfirmed(CollectionId, AccountId),

		/// Collection admin was removed
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		/// * admin: Removed admin address.
		CollectionAdminRemoved(CollectionId, CrossAccountId),

		/// Address was removed from the allow list
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		/// * user: Address of the removed account.
		AllowListAddressRemoved(CollectionId, CrossAccountId),

		/// Address was added to the allow list
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		/// * user: Address of the added account.
		AllowListAddressAdded(CollectionId, CrossAccountId),

		/// Collection limits were set
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		CollectionLimitSet(CollectionId),

		/// Collection permissions were set
		///
		/// # Arguments
		/// * collection_id: ID of the affected collection.
		CollectionPermissionSet(CollectionId),
	}
}

type SelfWeightOf<T> = <T as Config>::WeightInfo;

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
decl_storage! {
	trait Store for Module<T: Config> as Unique {

		//#region Private members
		/// Used for migrations
		ChainVersion: u64;
		//#endregion

		//#region Tokens transfer sponosoring rate limit baskets
		/// (Collection id (controlled?2), who created (real))
		/// TODO: Off chain worker should remove from this map when collection gets removed
		pub CreateItemBasket get(fn create_item_basket): map hasher(blake2_128_concat) (CollectionId, T::AccountId) => Option<T::BlockNumber>;
		/// Collection id (controlled?2), token id (controlled?2)
		pub NftTransferBasket get(fn nft_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<T::BlockNumber>;
		/// Collection id (controlled?2), owning user (real)
		pub FungibleTransferBasket get(fn fungible_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(twox_64_concat) T::AccountId => Option<T::BlockNumber>;
		/// Collection id (controlled?2), token id (controlled?2)
		pub ReFungibleTransferBasket get(fn refungible_transfer_basket): nmap hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId, hasher(twox_64_concat) T::AccountId => Option<T::BlockNumber>;
		//#endregion

		/// Variable metadata sponsoring
		/// Collection id (controlled?2), token id (controlled?2)
		#[deprecated]
		pub VariableMetaDataBasket get(fn variable_meta_data_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<T::BlockNumber>;
		/// Last sponsoring of token property setting // todo:doc rephrase this and the following
		pub TokenPropertyBasket get(fn token_property_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<T::BlockNumber>;

		/// Last sponsoring of NFT approval in a collection
		pub NftApproveBasket get(fn nft_approve_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<T::BlockNumber>;
		/// Last sponsoring of fungible tokens approval in a collection
		pub FungibleApproveBasket get(fn fungible_approve_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(twox_64_concat) T::AccountId => Option<T::BlockNumber>;
		/// Last sponsoring of RFT approval in a collection
		pub RefungibleApproveBasket get(fn refungible_approve_basket): nmap hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId, hasher(twox_64_concat) T::AccountId => Option<T::BlockNumber>;
	}
}

decl_module! {
	/// Type alias to Pallet, to be used by construct_runtime.
	pub struct Module<T: Config> for enum Call
	where
		origin: T::Origin
	{
		type Error = Error<T>;

		fn deposit_event() = default;

		fn on_initialize(_now: T::BlockNumber) -> Weight {
			0
		}

		fn on_runtime_upgrade() -> Weight {
			let limit = None;

			<VariableMetaDataBasket<T>>::remove_all(limit);

			0
		}

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
		// returns collection ID
		#[weight = <SelfWeightOf<T>>::create_collection()]
		#[transactional]
		#[deprecated(note = "`create_collection_ex` is more up-to-date and advanced, prefer it instead")]
		pub fn create_collection(
			origin,
			collection_name: BoundedVec<u16, ConstU32<MAX_COLLECTION_NAME_LENGTH>>,
			collection_description: BoundedVec<u16, ConstU32<MAX_COLLECTION_DESCRIPTION_LENGTH>>,
			token_prefix: BoundedVec<u8, ConstU32<MAX_TOKEN_PREFIX_LENGTH>>,
			mode: CollectionMode
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
		#[weight = <SelfWeightOf<T>>::create_collection()]
		#[transactional]
		pub fn create_collection_ex(origin, data: CreateCollectionData<T::AccountId>) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			// =========

			let _id = T::CollectionDispatch::create(T::CrossAccountId::from_sub(sender), data)?;

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
		#[weight = <SelfWeightOf<T>>::destroy_collection()]
		#[transactional]
		pub fn destroy_collection(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_internal()?;

			// =========

			T::CollectionDispatch::destroy(sender, collection)?;

			<NftTransferBasket<T>>::remove_prefix(collection_id, None);
			<FungibleTransferBasket<T>>::remove_prefix(collection_id, None);
			<ReFungibleTransferBasket<T>>::remove_prefix((collection_id,), None);

			<NftApproveBasket<T>>::remove_prefix(collection_id, None);
			<FungibleApproveBasket<T>>::remove_prefix(collection_id, None);
			<RefungibleApproveBasket<T>>::remove_prefix((collection_id,), None);

			Ok(())
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
		#[weight = <SelfWeightOf<T>>::add_to_allow_list()]
		#[transactional]
		pub fn add_to_allow_list(origin, collection_id: CollectionId, address: T::CrossAccountId) -> DispatchResult{

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_internal()?;

			<PalletCommon<T>>::toggle_allowlist(
				&collection,
				&sender,
				&address,
				true,
			)?;

			Self::deposit_event(Event::<T>::AllowListAddressAdded(
				collection_id,
				address
			));

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
		#[weight = <SelfWeightOf<T>>::remove_from_allow_list()]
		#[transactional]
		pub fn remove_from_allow_list(origin, collection_id: CollectionId, address: T::CrossAccountId) -> DispatchResult{

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_internal()?;

			<PalletCommon<T>>::toggle_allowlist(
				&collection,
				&sender,
				&address,
				false,
			)?;

			<Pallet<T>>::deposit_event(Event::<T>::AllowListAddressRemoved(
				collection_id,
				address
			));

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
		#[weight = <SelfWeightOf<T>>::change_collection_owner()]
		#[transactional]
		pub fn change_collection_owner(origin, collection_id: CollectionId, new_owner: T::AccountId) -> DispatchResult {

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_internal()?;
			target_collection.check_is_owner(&sender)?;

			target_collection.owner = new_owner.clone();
			<Pallet<T>>::deposit_event(Event::<T>::CollectionOwnedChanged(
				collection_id,
				new_owner
			));

			target_collection.save()
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
		#[weight = <SelfWeightOf<T>>::add_collection_admin()]
		#[transactional]
		pub fn add_collection_admin(origin, collection_id: CollectionId, new_admin: T::CrossAccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_internal()?;

			<Pallet<T>>::deposit_event(Event::<T>::CollectionAdminAdded(
				collection_id,
				new_admin.clone()
			));

			<PalletCommon<T>>::toggle_admin(&collection, &sender, &new_admin, true)
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
		#[weight = <SelfWeightOf<T>>::remove_collection_admin()]
		#[transactional]
		pub fn remove_collection_admin(origin, collection_id: CollectionId, account_id: T::CrossAccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_internal()?;

			<Pallet<T>>::deposit_event(Event::<T>::CollectionAdminRemoved(
				collection_id,
				account_id.clone()
			));

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
		#[weight = <SelfWeightOf<T>>::set_collection_sponsor()]
		#[transactional]
		pub fn set_collection_sponsor(origin, collection_id: CollectionId, new_sponsor: T::AccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner_or_admin(&sender)?;
			target_collection.check_is_internal()?;

			target_collection.set_sponsor(new_sponsor.clone())?;

			<Pallet<T>>::deposit_event(Event::<T>::CollectionSponsorSet(
				collection_id,
				new_sponsor
			));

			target_collection.save()
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
		#[weight = <SelfWeightOf<T>>::confirm_sponsorship()]
		#[transactional]
		pub fn confirm_sponsorship(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_internal()?;
			ensure!(
				target_collection.confirm_sponsorship(&sender)?,
				Error::<T>::ConfirmUnsetSponsorFail
			);

			<Pallet<T>>::deposit_event(Event::<T>::SponsorshipConfirmed(
				collection_id,
				sender
			));

			target_collection.save()
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
		#[weight = <SelfWeightOf<T>>::remove_collection_sponsor()]
		#[transactional]
		pub fn remove_collection_sponsor(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_internal()?;
			target_collection.check_is_owner(&sender)?;

			target_collection.sponsorship = SponsorshipState::Disabled;

			<Pallet<T>>::deposit_event(Event::<T>::CollectionSponsorRemoved(
				collection_id
			));
			target_collection.save()
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
		#[weight = T::CommonWeightInfo::create_item()]
		#[transactional]
		pub fn create_item(origin, collection_id: CollectionId, owner: T::CrossAccountId, data: CreateItemData) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.create_item(sender, owner, data, &budget))
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
		#[weight = T::CommonWeightInfo::create_multiple_items(&items_data)]
		#[transactional]
		pub fn create_multiple_items(origin, collection_id: CollectionId, owner: T::CrossAccountId, items_data: Vec<CreateItemData>) -> DispatchResultWithPostInfo {
			ensure!(!items_data.is_empty(), Error::<T>::EmptyArgument);
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.create_multiple_items(sender, owner, items_data, &budget))
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
		#[weight = T::CommonWeightInfo::set_collection_properties(properties.len() as u32)]
		#[transactional]
		pub fn set_collection_properties(
			origin,
			collection_id: CollectionId,
			properties: Vec<Property>
		) -> DispatchResultWithPostInfo {
			ensure!(!properties.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| d.set_collection_properties(sender, properties))
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
		#[weight = T::CommonWeightInfo::delete_collection_properties(property_keys.len() as u32)]
		#[transactional]
		pub fn delete_collection_properties(
			origin,
			collection_id: CollectionId,
			property_keys: Vec<PropertyKey>,
		) -> DispatchResultWithPostInfo {
			ensure!(!property_keys.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| d.delete_collection_properties(&sender, property_keys))
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
		#[weight = T::CommonWeightInfo::set_token_properties(properties.len() as u32)]
		#[transactional]
		pub fn set_token_properties(
			origin,
			collection_id: CollectionId,
			token_id: TokenId,
			properties: Vec<Property>
		) -> DispatchResultWithPostInfo {
			ensure!(!properties.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.set_token_properties(sender, token_id, properties, &budget))
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
		#[weight = T::CommonWeightInfo::delete_token_properties(property_keys.len() as u32)]
		#[transactional]
		pub fn delete_token_properties(
			origin,
			collection_id: CollectionId,
			token_id: TokenId,
			property_keys: Vec<PropertyKey>
		) -> DispatchResultWithPostInfo {
			ensure!(!property_keys.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.delete_token_properties(sender, token_id, property_keys, &budget))
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
		#[weight = T::CommonWeightInfo::set_token_property_permissions(property_permissions.len() as u32)]
		#[transactional]
		pub fn set_token_property_permissions(
			origin,
			collection_id: CollectionId,
			property_permissions: Vec<PropertyKeyPermission>,
		) -> DispatchResultWithPostInfo {
			ensure!(!property_permissions.is_empty(), Error::<T>::EmptyArgument);

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| d.set_token_property_permissions(&sender, property_permissions))
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
		#[weight = T::CommonWeightInfo::create_multiple_items_ex(&data)]
		#[transactional]
		pub fn create_multiple_items_ex(origin, collection_id: CollectionId, data: CreateItemExData<T::CrossAccountId>) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.create_multiple_items_ex(sender, data, &budget))
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
		#[weight = <SelfWeightOf<T>>::set_transfers_enabled_flag()]
		#[transactional]
		pub fn set_transfers_enabled_flag(origin, collection_id: CollectionId, value: bool) -> DispatchResult {
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
		#[weight = T::CommonWeightInfo::burn_item()]
		#[transactional]
		pub fn burn_item(origin, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let post_info = dispatch_tx::<T, _>(collection_id, |d| d.burn_item(sender, item_id, value))?;
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
		#[weight = T::CommonWeightInfo::burn_from()]
		#[transactional]
		pub fn burn_from(origin, collection_id: CollectionId, from: T::CrossAccountId, item_id: TokenId, value: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.burn_from(sender, from, item_id, value, &budget))
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
		#[weight = T::CommonWeightInfo::transfer()]
		#[transactional]
		pub fn transfer(origin, recipient: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.transfer(sender, recipient, item_id, value, &budget))
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
		#[weight = T::CommonWeightInfo::approve()]
		#[transactional]
		pub fn approve(origin, spender: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, amount: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_tx::<T, _>(collection_id, |d| d.approve(sender, spender, item_id, amount))
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
		#[weight = T::CommonWeightInfo::transfer_from()]
		#[transactional]
		pub fn transfer_from(origin, from: T::CrossAccountId, recipient: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, value: u128 ) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let budget = budget::Value::new(NESTING_BUDGET);

			dispatch_tx::<T, _>(collection_id, |d| d.transfer_from(sender, from, recipient, item_id, value, &budget))
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
		#[weight = <SelfWeightOf<T>>::set_collection_limits()]
		#[transactional]
		pub fn set_collection_limits(
			origin,
			collection_id: CollectionId,
			new_limit: CollectionLimits,
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_internal()?;
			target_collection.check_is_owner_or_admin(&sender)?;
			let old_limit = &target_collection.limits;

			target_collection.limits = <PalletCommon<T>>::clamp_limits(target_collection.mode.clone(), &old_limit, new_limit)?;

			<Pallet<T>>::deposit_event(Event::<T>::CollectionLimitSet(
				collection_id
			));

			target_collection.save()
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
		#[weight = <SelfWeightOf<T>>::set_collection_limits()]
		#[transactional]
		pub fn set_collection_permissions(
			origin,
			collection_id: CollectionId,
			new_permission: CollectionPermissions,
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_internal()?;
			target_collection.check_is_owner_or_admin(&sender)?;
			let old_limit = &target_collection.permissions;

			target_collection.permissions = <PalletCommon<T>>::clamp_permissions(target_collection.mode.clone(), &old_limit, new_permission)?;

			<Pallet<T>>::deposit_event(Event::<T>::CollectionPermissionSet(
				collection_id
			));

			target_collection.save()
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
		#[weight = T::RefungibleExtensionsWeightInfo::repartition()]
		#[transactional]
		pub fn repartition(
			origin,
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
	}
}
