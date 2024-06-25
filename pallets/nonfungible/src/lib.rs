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

//! # Nonfungible Pallet
//!
//! The Nonfungible pallet provides functionality for handling nonfungible collections and tokens.
//!
//! - [`Config`]
//! - [`NonfungibleHandle`]
//! - [`Pallet`]
//! - [`CommonWeights`](common::CommonWeights)
//!
//! ## Overview
//!
//! The Nonfungible pallet provides functions for:
//!
//! - NFT collection creation and removal
//! - Minting and burning of NFT tokens
//! - Retrieving account balances
//! - Transfering NFT tokens
//! - Setting and checking allowance for NFT tokens
//! - Setting properties and permissions for NFT collections and tokens
//! - Nesting and unnesting tokens
//!
//! ### Terminology
//!
//! - **NFT token:** Non fungible token.
//!
//! - **NFT Collection:** A collection of NFT tokens. All NFT tokens are part of a collection.
//!   Each collection can define it's own properties, properties for it's tokens and set of permissions.
//!
//! - **Balance:** Number of NFT tokens owned by an account
//!
//! - **Allowance:** NFT tokens owned by one account that another account is allowed to make operations on
//!
//! - **Burning:** The process of “deleting” a token from a collection and from
//!   an account balance of the owner.
//!
//! - **Nesting:** Setting up parent-child relationship between tokens. Nested tokens are inhereting
//!   owner from their parent. There could be multiple levels of nesting. Token couldn't be nested in
//!   it's child token i.e. parent-child relationship graph shouldn't have cycles.
//!
//! - **Properties:** Key-Values pairs. Token properties are attached to a token. Collection properties are
//!   attached to a collection. Set of permissions could be defined for each property.
//!
//! ### Implementations
//!
//! The Nonfungible pallet provides implementations for the following traits. If these traits provide
//! the functionality that you need, then you can avoid coupling with the Nonfungible pallet.
//!
//! - [`CommonWeightInfo`](pallet_common::CommonWeightInfo): Functions for retrieval of transaction weight
//! - [`CommonCollectionOperations`](pallet_common::CommonCollectionOperations): Functions for dealing
//!   with collections
//!
//! ## Interface
//!
//! ### Dispatchable Functions
//!
//! - `init_collection` - Create NFT collection. NFT collection can be configured to allow or deny access for
//!   some accounts.
//! - `destroy_collection` - Destroy exising NFT collection. There should be no tokens in the collection.
//! - `burn` - Burn NFT token owned by account.
//! - `transfer` - Transfer NFT token. Transfers should be enabled for NFT collection.
//!   Nests the NFT token if it is sent to another token.
//! - `create_item` - Mint NFT token in collection. Sender should have permission to mint tokens.
//! - `set_allowance` - Set allowance for another account.
//! - `set_token_property` - Set token property value.
//! - `delete_token_property` - Remove property from the token.
//! - `set_collection_properties` - Set collection properties.
//! - `delete_collection_properties` - Remove properties from the collection.
//! - `set_property_permission` - Set collection property permission.
//! - `set_token_property_permissions` - Set token property permissions.
//!
//! ## Assumptions
//!
//! * To perform operations on tokens sender should be in collection's allow list if collection access mode is `AllowList`.

#![cfg_attr(not(feature = "std"), no_std)]

use core::ops::Deref;

use erc::ERC721Events;
use evm_coder::ToLog;
use frame_support::{
	dispatch::{Pays, PostDispatchInfo},
	ensure, fail,
	pallet_prelude::*,
	storage::with_transaction,
	transactional, BoundedVec,
};
pub use pallet::*;
use pallet_common::{
	eth::collection_id_to_address, helpers::add_weight_to_post_info,
	weights::WeightInfo as CommonWeightInfo, CollectionHandle, Error as CommonError,
	Event as CommonEvent, Pallet as PalletCommon, SelfWeightOf as PalletCommonWeightOf,
};
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use pallet_structure::Pallet as PalletStructure;
use parity_scale_codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;
use sp_core::{Get, H160};
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult, TransactionOutcome};
use sp_std::{collections::btree_map::BTreeMap, vec, vec::Vec};
use up_data_structs::{
	budget::Budget, mapping::TokenAddressMapping, AccessMode, AuxPropertyValue, CollectionId,
	CreateNftExData, CustomDataLimit, PropertiesPermissionMap, Property, PropertyKey,
	PropertyKeyPermission, PropertyScope, PropertyValue, TokenChild, TokenId,
	TokenProperties as TokenPropertiesT,
};
use weights::WeightInfo;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod weights;

pub type CreateItemData<T> = CreateNftExData<<T as pallet_evm::Config>::CrossAccountId>;
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

/// Token data, stored independently from other data used to describe it
/// for the convenience of database access. Notably contains the owner account address.
#[struct_versioning::versioned(version = 2, upper)]
#[derive(Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct ItemData<CrossAccountId> {
	#[version(..2)]
	pub const_data: BoundedVec<u8, CustomDataLimit>,

	#[version(..2)]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,

	pub owner: CrossAccountId,
}

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{
		pallet_prelude::*, storage::Key, traits::StorageVersion, Blake2_128Concat, Twox64Concat,
	};
	use up_data_structs::{CollectionId, TokenId};

	use super::{weights::WeightInfo, *};

	#[pallet::error]
	pub enum Error<T> {
		/// Not Nonfungible item data used to mint in Nonfungible collection.
		NotNonfungibleDataUsedToMintFungibleCollectionToken,
		/// Used amount > 1 with NFT
		NonfungibleItemsHaveNoAmount,
		/// Unable to burn NFT with children
		CantBurnNftWithChildren,
	}

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_structure::Config + pallet_evm::Config
	{
		type WeightInfo: WeightInfo;
	}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	pub struct Pallet<T>(_);

	/// Total amount of minted tokens in a collection.
	#[pallet::storage]
	pub type TokensMinted<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	/// Amount of burnt tokens in a collection.
	#[pallet::storage]
	pub type TokensBurnt<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	/// Token data, used to partially describe a token.
	#[pallet::storage]
	pub type TokenData<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = ItemData<T::CrossAccountId>,
		QueryKind = OptionQuery,
	>;

	/// Map of key-value pairs, describing the metadata of a token.
	#[pallet::storage]
	#[pallet::getter(fn token_properties)]
	pub type TokenProperties<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = TokenPropertiesT,
		QueryKind = OptionQuery,
	>;

	/// Custom data of a token that is serialized to bytes,
	/// primarily reserved for on-chain operations,
	/// normally obscured from the external users.
	///
	/// Auxiliary properties are slightly different from
	/// usual [`TokenProperties`] due to an unlimited number
	/// and separately stored and written-to key-value pairs.
	///
	/// Currently unused.
	#[pallet::storage]
	#[pallet::getter(fn token_aux_property)]
	pub type TokenAuxProperties<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Twox64Concat, TokenId>,
			Key<Twox64Concat, PropertyScope>,
			Key<Twox64Concat, PropertyKey>,
		),
		Value = AuxPropertyValue,
		QueryKind = OptionQuery,
	>;

	/// Used to enumerate tokens owned by account.
	#[pallet::storage]
	pub type Owned<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
			Key<Twox64Concat, TokenId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	/// Used to enumerate token's children.
	#[pallet::storage]
	#[pallet::getter(fn token_children)]
	pub type TokenChildren<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Twox64Concat, TokenId>,
			Key<Twox64Concat, (CollectionId, TokenId)>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	/// Amount of tokens owned by an account in a collection.
	#[pallet::storage]
	pub type AccountBalance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u32,
		QueryKind = ValueQuery,
	>;

	/// Allowance set by a token owner for another user to perform one of certain transactions on a token.
	#[pallet::storage]
	pub type Allowance<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = T::CrossAccountId,
		QueryKind = OptionQuery,
	>;

	/// Operator set by a wallet owner that could perform certain transactions on all tokens in the wallet.
	#[pallet::storage]
	pub type CollectionAllowance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	#[pallet::genesis_config]
	pub struct GenesisConfig<T>(PhantomData<T>);

	impl<T: Config> Default for GenesisConfig<T> {
		fn default() -> Self {
			Self(Default::default())
		}
	}

	#[pallet::genesis_build]
	impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
		fn build(&self) {
			StorageVersion::new(1).put::<Pallet<T>>();
		}
	}
}

pub struct NonfungibleHandle<T: Config>(pallet_common::CollectionHandle<T>);
impl<T: Config> NonfungibleHandle<T> {
	pub fn cast(inner: pallet_common::CollectionHandle<T>) -> Self {
		Self(inner)
	}
	pub fn into_inner(self) -> pallet_common::CollectionHandle<T> {
		self.0
	}
	pub fn common_mut(&mut self) -> &mut pallet_common::CollectionHandle<T> {
		&mut self.0
	}
}

impl<T: Config> WithRecorder<T> for NonfungibleHandle<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		self.0.recorder()
	}
	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.0.into_recorder()
	}
}
impl<T: Config> Deref for NonfungibleHandle<T> {
	type Target = pallet_common::CollectionHandle<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

impl<T: Config> Pallet<T> {
	/// Get number of NFT tokens in collection.
	pub fn total_supply(collection: &NonfungibleHandle<T>) -> u32 {
		<TokensMinted<T>>::get(collection.id) - <TokensBurnt<T>>::get(collection.id)
	}

	/// Check that NFT token exists.
	///
	/// - `token`: Token ID.
	pub fn token_exists(collection: &NonfungibleHandle<T>, token: TokenId) -> bool {
		<TokenData<T>>::contains_key((collection.id, token))
	}

	/// Add or edit auxiliary data for the property.
	///
	/// - `f`: function that adds or edits auxiliary data.
	pub fn try_mutate_token_aux_property<R, E>(
		collection_id: CollectionId,
		token_id: TokenId,
		scope: PropertyScope,
		key: PropertyKey,
		f: impl FnOnce(&mut Option<AuxPropertyValue>) -> Result<R, E>,
	) -> Result<R, E> {
		<TokenAuxProperties<T>>::try_mutate((collection_id, token_id, scope, key), f)
	}

	/// Remove auxiliary data for the property.
	pub fn remove_token_aux_property(
		collection_id: CollectionId,
		token_id: TokenId,
		scope: PropertyScope,
		key: PropertyKey,
	) {
		<TokenAuxProperties<T>>::remove((collection_id, token_id, scope, key));
	}

	/// Get all auxiliary data in a given scope.
	///
	/// Returns iterator over Property Key - Data pairs.
	pub fn iterate_token_aux_properties(
		collection_id: CollectionId,
		token_id: TokenId,
		scope: PropertyScope,
	) -> impl Iterator<Item = (PropertyKey, AuxPropertyValue)> {
		<TokenAuxProperties<T>>::iter_prefix((collection_id, token_id, scope))
	}

	/// Get ID of the last minted token
	pub fn current_token_id(collection_id: CollectionId) -> TokenId {
		TokenId(<TokensMinted<T>>::get(collection_id))
	}
}

// unchecked calls skips any permission checks
impl<T: Config> Pallet<T> {
	/// Destroy NFT collection
	///
	/// `destroy_collection` will throw error if collection contains any tokens.
	/// Only owner can destroy collection.
	pub fn destroy_collection(
		collection: NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		let id = collection.id;

		if Self::collection_has_tokens(id) {
			return Err(<CommonError<T>>::CantDestroyNotEmptyCollection.into());
		}

		// =========

		PalletCommon::destroy_collection(collection.0, sender)?;

		let _ = <TokenData<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <TokenChildren<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <Owned<T>>::clear_prefix((id,), u32::MAX, None);
		<TokensMinted<T>>::remove(id);
		<TokensBurnt<T>>::remove(id);
		let _ = <Allowance<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <AccountBalance<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <CollectionAllowance<T>>::clear_prefix((id,), u32::MAX, None);
		Ok(())
	}

	/// Burn NFT token
	///
	/// `burn` removes `token` from the `collection`, from it's owner and from the parent token
	/// if the token is nested.
	/// Only the owner can `burn` the token. The `token` shouldn't have any nested tokens.
	/// Also removes all corresponding properties and auxiliary properties.
	///
	/// - `token`: Token that should be burned
	/// - `collection`: Collection that contains the token
	pub fn burn(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		ensure!(&token_data.owner == sender, <CommonError<T>>::NoPermission);

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
		}

		if Self::token_has_children(collection.id, token) {
			return Err(<Error<T>>::CantBurnNftWithChildren.into());
		}

		let burnt = <TokensBurnt<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		let balance = <AccountBalance<T>>::get((collection.id, token_data.owner.clone()))
			.checked_sub(1)
			.ok_or(ArithmeticError::Overflow)?;

		// =========

		if balance == 0 {
			<AccountBalance<T>>::remove((collection.id, token_data.owner.clone()));
		} else {
			<AccountBalance<T>>::insert((collection.id, token_data.owner.clone()), balance);
		}

		<PalletStructure<T>>::unnest_if_nested(&token_data.owner, collection.id, token);

		<Owned<T>>::remove((collection.id, &token_data.owner, token));
		<TokensBurnt<T>>::insert(collection.id, burnt);
		<TokenData<T>>::remove((collection.id, token));
		<TokenProperties<T>>::remove((collection.id, token));
		let _ = <TokenAuxProperties<T>>::clear_prefix((collection.id, token), u32::MAX, None);
		let old_spender = <Allowance<T>>::take((collection.id, token));

		if let Some(old_spender) = old_spender {
			<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
				collection.id,
				token,
				token_data.owner.clone(),
				old_spender,
				0,
			));
		}

		<PalletEvm<T>>::deposit_log(
			ERC721Events::Transfer {
				from: *token_data.owner.as_eth(),
				to: H160::default(),
				token_id: token.into(),
			}
			.to_log(collection_id_to_address(collection.id)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
			collection.id,
			token,
			token_data.owner,
			1,
		));
		Ok(())
	}

	/// A batch operation to add, edit or remove properties for a token.
	///
	/// - `nesting_budget`: Limit for searching parents in-depth to check ownership.
	///
	/// All affected properties should have `mutable` permission
	/// to be **deleted** or to be **set more than once**,
	/// and the sender should have permission to edit those properties.
	///
	/// This function fires an event for each property change.
	/// In case of an error, all the changes (including the events) will be reverted
	/// since the function is transactional.
	#[transactional]
	fn modify_token_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		properties_updates: impl Iterator<Item = (PropertyKey, Option<PropertyValue>)>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let mut property_writer =
			pallet_common::ExistingTokenPropertyWriter::new(collection, sender);

		property_writer.write_token_properties(
			sender,
			token_id,
			properties_updates,
			nesting_budget,
			erc::ERC721TokenEvent::TokenChanged {
				token_id: token_id.into(),
			}
			.to_log(T::ContractAddress::get()),
		)
	}

	pub fn next_token_id(collection: &NonfungibleHandle<T>) -> Result<TokenId, DispatchError> {
		let next_token_id = <TokensMinted<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(<CommonError<T>>::CollectionTokenLimitExceeded)?;

		ensure!(
			collection.limits.token_limit() >= next_token_id,
			<CommonError<T>>::CollectionTokenLimitExceeded
		);

		Ok(TokenId(next_token_id))
	}

	/// Batch operation to add or edit properties for the token
	///
	/// Same as [`modify_token_properties`] but doesn't allow to remove properties
	///
	/// [`modify_token_properties`]: struct.Pallet.html#method.modify_token_properties
	pub fn set_token_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		properties: impl Iterator<Item = Property>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::modify_token_properties(
			collection,
			sender,
			token_id,
			properties.map(|p| (p.key, Some(p.value))),
			nesting_budget,
		)
	}

	/// Add or edit single property for the token
	///
	/// Calls [`set_token_properties`] internally
	///
	/// [`set_token_properties`]: struct.Pallet.html#method.set_token_properties
	pub fn set_token_property(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		property: Property,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::set_token_properties(
			collection,
			sender,
			token_id,
			[property].into_iter(),
			nesting_budget,
		)
	}

	/// Batch operation to remove properties from the token
	///
	/// Same as [`modify_token_properties`] but doesn't allow to add or edit properties
	///
	/// [`modify_token_properties`]: struct.Pallet.html#method.modify_token_properties
	pub fn delete_token_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		property_keys: impl Iterator<Item = PropertyKey>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::modify_token_properties(
			collection,
			sender,
			token_id,
			property_keys.into_iter().map(|key| (key, None)),
			nesting_budget,
		)
	}

	/// Remove single property from the token
	///
	/// Calls [`delete_token_properties`] internally
	///
	/// [`delete_token_properties`]: struct.Pallet.html#method.delete_token_properties
	pub fn delete_token_property(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		property_key: PropertyKey,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::delete_token_properties(
			collection,
			sender,
			token_id,
			[property_key].into_iter(),
			nesting_budget,
		)
	}

	/// Add or edit properties for the collection
	pub fn set_collection_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_collection_properties(collection, sender, properties.into_iter())
	}

	/// Remove properties from the collection
	pub fn delete_collection_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResult {
		<PalletCommon<T>>::delete_collection_properties(
			collection,
			sender,
			property_keys.into_iter(),
		)
	}

	/// Set property permissions for the token.
	///
	/// Sender should be the owner or admin of token's collection.
	pub fn set_token_property_permissions(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_token_property_permissions(collection, sender, property_permissions)
	}

	/// Set property permissions for the token with scope.
	///
	/// Sender should be the owner or admin of token's collection.
	pub fn set_scoped_token_property_permissions(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		scope: PropertyScope,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_scoped_token_property_permissions(
			collection,
			sender,
			scope,
			property_permissions,
		)
	}

	pub fn token_property_permission(collection_id: CollectionId) -> PropertiesPermissionMap {
		<PalletCommon<T>>::property_permissions(collection_id)
	}

	pub fn check_token_immediate_ownership(
		collection: &NonfungibleHandle<T>,
		token: TokenId,
		possible_owner: &T::CrossAccountId,
	) -> DispatchResult {
		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		ensure!(
			&token_data.owner == possible_owner,
			<CommonError<T>>::NoPermission
		);
		Ok(())
	}

	/// Transfer NFT token from one account to another.
	///
	/// `from` account stops being the owner and `to` account becomes the owner of the token.
	/// If `to` is token than `to` becomes owner of the token and the token become nested.
	/// Unnests token from previous parent if it was nested before.
	/// Removes allowance for the token if there was any.
	/// Throws if transfers aren't allowed for collection or if receiver reached token ownership limit.
	///
	/// - `nesting_budget`: Limit for token nesting depth
	pub fn transfer(
		collection: &NonfungibleHandle<T>,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let depositor = from;
		Self::transfer_internal(collection, depositor, from, to, token, nesting_budget)
	}

	/// Transfers an NFT from the `from` account to the `to` account.
	/// The `depositor` is the account who deposits the NFT.
	/// For instance, the nesting rules will be checked against the `depositor`'s permissions.
	pub fn transfer_internal(
		collection: &NonfungibleHandle<T>,
		depositor: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(
			collection.limits.transfers_enabled(),
			<CommonError<T>>::TransferNotAllowed
		);

		let mut actual_weight = <SelfWeightOf<T>>::transfer_raw();
		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		ensure!(&token_data.owner == from, <CommonError<T>>::NoPermission);

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
			actual_weight += <PalletCommonWeightOf<T>>::check_accesslist() * 2;
		}
		<PalletCommon<T>>::ensure_correct_receiver(to)?;

		let balance_from = <AccountBalance<T>>::get((collection.id, from))
			.checked_sub(1)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let balance_to = if from != to {
			let balance_to = <AccountBalance<T>>::get((collection.id, to))
				.checked_add(1)
				.ok_or(ArithmeticError::Overflow)?;

			ensure!(
				balance_to < collection.limits.account_token_ownership_limit(),
				<CommonError<T>>::AccountTokenLimitExceeded,
			);

			Some(balance_to)
		} else {
			None
		};

		<PalletStructure<T>>::nest_if_sent_to_token(
			depositor,
			to,
			collection.id,
			token,
			nesting_budget,
		)?;

		// =========

		<PalletStructure<T>>::unnest_if_nested(&token_data.owner, collection.id, token);

		<TokenData<T>>::insert((collection.id, token), ItemData { owner: to.clone() });

		if let Some(balance_to) = balance_to {
			// from != to
			if balance_from == 0 {
				<AccountBalance<T>>::remove((collection.id, from));
			} else {
				<AccountBalance<T>>::insert((collection.id, from), balance_from);
			}
			<AccountBalance<T>>::insert((collection.id, to), balance_to);
			<Owned<T>>::remove((collection.id, from, token));
			<Owned<T>>::insert((collection.id, to, token), true);
		}
		Self::set_allowance_unchecked(collection, from, token, None, true);

		<PalletEvm<T>>::deposit_log(
			ERC721Events::Transfer {
				from: *from.as_eth(),
				to: *to.as_eth(),
				token_id: token.into(),
			}
			.to_log(collection_id_to_address(collection.id)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::Transfer(
			collection.id,
			token,
			from.clone(),
			to.clone(),
			1,
		));

		Ok(PostDispatchInfo {
			actual_weight: Some(actual_weight),
			pays_fee: Pays::Yes,
		})
	}

	/// Batch operation to mint multiple NFT tokens.
	///
	/// The sender should be the owner/admin of the collection or collection should be configured
	/// to allow public minting.
	/// Throws if amount of tokens reached it's limit for the collection or if caller reached
	/// token ownership limit.
	///
	/// - `data`: Contains list of token properties and users who will become the owners of the
	///   corresponging tokens.
	/// - `nesting_budget`: Limit for token nesting depth
	pub fn create_multiple_items(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: Vec<CreateItemData<T>>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		if !collection.is_owner_or_admin(sender) {
			ensure!(
				collection.permissions.mint_mode(),
				<CommonError<T>>::PublicMintingNotAllowed
			);
			collection.check_allowlist(sender)?;

			for item in data.iter() {
				collection.check_allowlist(&item.owner)?;
			}
		}

		for data in data.iter() {
			<PalletCommon<T>>::ensure_correct_receiver(&data.owner)?;
		}

		let first_token = <TokensMinted<T>>::get(collection.id);
		let tokens_minted = first_token
			.checked_add(data.len() as u32)
			.ok_or(ArithmeticError::Overflow)?;
		ensure!(
			tokens_minted <= collection.limits.token_limit(),
			<CommonError<T>>::CollectionTokenLimitExceeded
		);

		let mut balances = BTreeMap::new();
		for data in &data {
			let balance = balances
				.entry(&data.owner)
				.or_insert_with(|| <AccountBalance<T>>::get((collection.id, &data.owner)));
			*balance = balance.checked_add(1).ok_or(ArithmeticError::Overflow)?;

			ensure!(
				*balance <= collection.limits.account_token_ownership_limit(),
				<CommonError<T>>::AccountTokenLimitExceeded,
			);
		}

		for (i, data) in data.iter().enumerate() {
			let token = TokenId(first_token + i as u32 + 1);

			<PalletStructure<T>>::check_nesting(
				sender,
				&data.owner,
				collection.id,
				token,
				nesting_budget,
			)?;
		}

		// =========

		let mut property_writer = pallet_common::NewTokenPropertyWriter::new(collection, sender);

		with_transaction(|| {
			for (i, data) in data.iter().enumerate() {
				let token = first_token + i as u32 + 1;

				<TokenData<T>>::insert(
					(collection.id, token),
					ItemData {
						// const_data: data.const_data.clone(),
						owner: data.owner.clone(),
					},
				);

				let token = TokenId(token);

				<PalletStructure<T>>::nest_if_sent_to_token_unchecked(
					&data.owner,
					collection.id,
					token,
				);

				if let Err(e) = property_writer.write_token_properties(
					sender.conv_eq(&data.owner),
					token,
					data.properties.clone().into_iter(),
					erc::ERC721TokenEvent::TokenChanged {
						token_id: token.into(),
					}
					.to_log(T::ContractAddress::get()),
				) {
					return TransactionOutcome::Rollback(Err(e));
				}
			}
			TransactionOutcome::Commit(Ok(()))
		})?;

		<TokensMinted<T>>::insert(collection.id, tokens_minted);
		for (account, balance) in balances {
			<AccountBalance<T>>::insert((collection.id, account), balance);
		}
		for (i, data) in data.into_iter().enumerate() {
			let token = first_token + i as u32 + 1;
			<Owned<T>>::insert((collection.id, &data.owner, token), true);

			<PalletEvm<T>>::deposit_log(
				ERC721Events::Transfer {
					from: H160::default(),
					to: *data.owner.as_eth(),
					token_id: token.into(),
				}
				.to_log(collection_id_to_address(collection.id)),
			);
			<PalletCommon<T>>::deposit_event(CommonEvent::ItemCreated(
				collection.id,
				TokenId(token),
				data.owner.clone(),
				1,
			));
		}
		Ok(())
	}

	pub fn set_allowance_unchecked(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
		spender: Option<&T::CrossAccountId>,
		assume_implicit_eth: bool,
	) {
		if let Some(spender) = spender {
			let old_spender = <Allowance<T>>::get((collection.id, token));
			<Allowance<T>>::insert((collection.id, token), spender);
			// In ERC721 there is only one possible approved user of token, so we set
			// approved user to spender
			<PalletEvm<T>>::deposit_log(
				ERC721Events::Approval {
					owner: *sender.as_eth(),
					approved: *spender.as_eth(),
					token_id: token.into(),
				}
				.to_log(collection_id_to_address(collection.id)),
			);
			// In Unique chain, any token can have any amount of approved users, so we need to
			// set allowance of old owner to 0, and allowance of new owner to 1
			if old_spender.as_ref() != Some(spender) {
				if let Some(old_owner) = old_spender {
					<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
						collection.id,
						token,
						sender.clone(),
						old_owner,
						0,
					));
				}
				<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
					collection.id,
					token,
					sender.clone(),
					spender.clone(),
					1,
				));
			}
		} else {
			let old_spender = <Allowance<T>>::take((collection.id, token));
			if !assume_implicit_eth {
				// In ERC721 there is only one possible approved user of token, so we set
				// approved user to zero address
				<PalletEvm<T>>::deposit_log(
					ERC721Events::Approval {
						owner: *sender.as_eth(),
						approved: H160::default(),
						token_id: token.into(),
					}
					.to_log(collection_id_to_address(collection.id)),
				);
			}
			// In Unique chain, any token can have any amount of approved users, so we need to
			// set allowance of old owner to 0
			if let Some(old_spender) = old_spender {
				<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
					collection.id,
					token,
					sender.clone(),
					old_spender,
					0,
				));
			}
		}
	}

	pub fn get_allowance(
		collection: &NonfungibleHandle<T>,
		token_id: TokenId,
	) -> Result<Option<T::CrossAccountId>, DispatchError> {
		ensure!(
			<TokenData<T>>::get((collection.id, token_id)).is_some(),
			<CommonError<T>>::TokenNotFound
		);
		Ok(<Allowance<T>>::get((collection.id, token_id)))
	}

	/// Set allowance for the spender to `transfer` or `burn` sender's token.
	///
	/// - `token`: Token the spender is allowed to `transfer` or `burn`.
	pub fn set_allowance(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
		spender: Option<&T::CrossAccountId>,
	) -> DispatchResult {
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
			if let Some(spender) = spender {
				collection.check_allowlist(spender)?;
			}
		}

		if let Some(spender) = spender {
			<PalletCommon<T>>::ensure_correct_receiver(spender)?;
		}

		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		if &token_data.owner != sender {
			ensure!(
				collection.ignores_owned_amount(sender),
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, sender, token, spender, false);
		Ok(())
	}

	/// Set allowance for the spender to `transfer` or `burn` sender's token from eth mirror.
	///
	/// - `from`: Address of sender's eth mirror.
	/// - `to`: Adress of spender.
	/// - `token`: Token the spender is allowed to `transfer` or `burn`.
	pub fn set_allowance_from(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		token: TokenId,
		to: Option<&T::CrossAccountId>,
	) -> DispatchResult {
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
			collection.check_allowlist(from)?;
			if let Some(to) = to {
				collection.check_allowlist(to)?;
			}
		}

		if let Some(to) = to {
			<PalletCommon<T>>::ensure_correct_receiver(to)?;
		}

		ensure!(
			sender.conv_eq(from),
			<CommonError<T>>::AddressIsNotEthMirror
		);

		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		if token_data.owner != *from {
			ensure!(
				collection.limits.owner_can_transfer()
					&& (collection.is_owner_or_admin(sender) || collection.is_owner_or_admin(from)),
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, from, token, to, false);
		Ok(())
	}

	/// Checks allowance for the spender to use the token.
	fn check_allowed(
		collection: &NonfungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		token: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		if spender.conv_eq(from) {
			return Ok(());
		}
		if collection.permissions.access() == AccessMode::AllowList {
			// `from`, `to` checked in [`transfer`]
			collection.check_allowlist(spender)?;
		}

		if collection.ignores_token_restrictions(spender) {
			return Ok(());
		}

		if let Some(source) = T::CrossTokenAddressMapping::address_to_token(from) {
			ensure!(
				<PalletStructure<T>>::check_indirectly_owned(
					spender.clone(),
					source.0,
					source.1,
					None,
					nesting_budget
				)?,
				<CommonError<T>>::ApprovedValueTooLow,
			);
			return Ok(());
		}
		if <Allowance<T>>::get((collection.id, token)).as_ref() == Some(spender) {
			return Ok(());
		}
		if <CollectionAllowance<T>>::get((collection.id, from, spender)) {
			return Ok(());
		}

		Err(<CommonError<T>>::ApprovedValueTooLow.into())
	}

	/// Transfer NFT token from one account to another.
	///
	/// Same as the [`transfer`] but spender doesn't needs to be the owner of the token.
	/// The owner should set allowance for the spender to transfer token.
	///
	/// [`transfer`]: struct.Pallet.html#method.transfer
	pub fn transfer_from(
		collection: &NonfungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		Self::check_allowed(collection, spender, from, token, nesting_budget)?;

		// =========

		// Allowance is reset in [`transfer`]
		let mut result =
			Self::transfer_internal(collection, spender, from, to, token, nesting_budget);
		add_weight_to_post_info(&mut result, <SelfWeightOf<T>>::check_allowed_raw());
		result
	}

	/// Burn NFT token for `from` account.
	///
	/// Same as the [`burn`] but spender doesn't need to be an owner of the token. The owner should
	/// set allowance for the spender to burn token.
	///
	/// [`burn`]: struct.Pallet.html#method.burn
	pub fn burn_from(
		collection: &NonfungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		token: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::check_allowed(collection, spender, from, token, nesting_budget)?;

		// =========

		Self::burn(collection, from, token)
	}

	/// Check that `from` token could be nested in `under` token.
	///
	pub fn check_nesting(
		handle: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		from: (CollectionId, TokenId),
		under: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let nesting = handle.permissions.nesting();

		#[cfg(not(feature = "runtime-benchmarks"))]
		let permissive = false;
		#[cfg(feature = "runtime-benchmarks")]
		let permissive = nesting.permissive;

		if permissive {
			ensure!(
				<TokenData<T>>::contains_key((handle.id, under)),
				<CommonError<T>>::TokenNotFound
			);
		} else if nesting.token_owner
			&& <PalletStructure<T>>::check_indirectly_owned(
				sender.clone(),
				handle.id,
				under,
				Some(from),
				nesting_budget,
			)? {
			// Pass, token existence and ouroboros checks are done in `check_indirectly_owned`
		} else if nesting.collection_admin && handle.is_owner_or_admin(sender) {
			// token existence and ouroboros checks are done in `get_checked_topmost_owner`
			let _ = <PalletStructure<T>>::get_checked_topmost_owner(
				handle.id,
				under,
				Some(from),
				nesting_budget,
			)?
			.ok_or(<CommonError<T>>::TokenNotFound)?;
		} else {
			fail!(<CommonError<T>>::UserIsNotAllowedToNest);
		}

		if let Some(whitelist) = &nesting.restricted {
			ensure!(
				whitelist.contains(&from.0),
				<CommonError<T>>::SourceCollectionIsNotAllowedToNest
			);
		}
		Ok(())
	}

	fn nest(under: (CollectionId, TokenId), to_nest: (CollectionId, TokenId)) {
		if to_nest.0 != pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
			<TokenChildren<T>>::insert((under.0, under.1, to_nest), true);
		}
	}

	fn unnest(under: (CollectionId, TokenId), to_unnest: (CollectionId, TokenId)) {
		if to_unnest.0 != pallet_common::NATIVE_FUNGIBLE_COLLECTION_ID {
			<TokenChildren<T>>::remove((under.0, under.1, to_unnest));
		}
	}

	fn collection_has_tokens(collection_id: CollectionId) -> bool {
		<TokenData<T>>::iter_prefix((collection_id,))
			.next()
			.is_some()
	}

	fn token_has_children(collection_id: CollectionId, token_id: TokenId) -> bool {
		<TokenChildren<T>>::iter_prefix((collection_id, token_id))
			.next()
			.is_some()
	}

	pub fn token_children_ids(collection_id: CollectionId, token_id: TokenId) -> Vec<TokenChild> {
		<TokenChildren<T>>::iter_prefix((collection_id, token_id))
			.map(|((child_collection_id, child_id), _)| TokenChild {
				collection: child_collection_id,
				token: child_id,
			})
			.collect()
	}

	/// Mint single NFT token.
	///
	/// Delegated to [`create_multiple_items`]
	///
	/// [`create_multiple_items`]: struct.Pallet.html#method.create_multiple_items
	pub fn create_item(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateItemData<T>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::create_multiple_items(collection, sender, vec![data], nesting_budget)
	}

	/// Sets or unsets the approval of a given operator.
	///
	/// The `operator` is allowed to transfer all token pieces of the `owner` on their behalf.
	/// - `owner`: Token owner
	/// - `operator`: Operator
	/// - `approve`: Should operator status be granted or revoked?
	pub fn set_allowance_for_all(
		collection: &NonfungibleHandle<T>,
		owner: &T::CrossAccountId,
		operator: &T::CrossAccountId,
		approve: bool,
	) -> DispatchResult {
		<PalletCommon<T>>::set_allowance_for_all(
			collection,
			owner,
			operator,
			approve,
			|| <CollectionAllowance<T>>::insert((collection.id, owner, operator), approve),
			ERC721Events::ApprovalForAll {
				owner: *owner.as_eth(),
				operator: *operator.as_eth(),
				approved: approve,
			}
			.to_log(collection_id_to_address(collection.id)),
		)
	}

	/// Tells whether the given `owner` approves the `operator`.
	pub fn allowance_for_all(
		collection: &NonfungibleHandle<T>,
		owner: &T::CrossAccountId,
		operator: &T::CrossAccountId,
	) -> bool {
		<CollectionAllowance<T>>::get((collection.id, owner, operator))
	}

	pub fn repair_item(collection: &NonfungibleHandle<T>, token: TokenId) -> DispatchResult {
		<TokenProperties<T>>::mutate((collection.id, token), |properties| {
			if let Some(properties) = properties {
				properties.recompute_consumed_space();
			}
		});

		Ok(())
	}
}
