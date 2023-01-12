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

use erc::ERC721Events;
use evm_coder::ToLog;
use frame_support::{
	BoundedVec, ensure, fail, transactional,
	storage::with_transaction,
	pallet_prelude::DispatchResultWithPostInfo,
	pallet_prelude::Weight,
	dispatch::{PostDispatchInfo, Pays},
};
use up_data_structs::{
	AccessMode, CollectionId, CollectionFlags, CustomDataLimit, TokenId, CreateCollectionData,
	CreateNftExData, mapping::TokenAddressMapping, budget::Budget, Property, PropertyPermission,
	PropertyKey, PropertyValue, PropertyKeyPermission, Properties, PropertyScope, TrySetProperty,
	TokenChild, AuxPropertyValue, PropertiesPermissionMap,
};
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use pallet_common::{
	Error as CommonError, Pallet as PalletCommon, Event as CommonEvent, CollectionHandle,
	eth::collection_id_to_address, erc::CollectionHelpersEvents,
};
use pallet_structure::{Pallet as PalletStructure, Error as StructureError};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use sp_core::{H160, Get};
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult, TransactionOutcome};
use sp_std::{vec::Vec, vec, collections::btree_map::BTreeMap};
use core::ops::Deref;
use codec::{Encode, Decode, MaxEncodedLen};
use scale_info::TypeInfo;

pub use pallet::*;
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
	use super::*;
	use frame_support::{
		Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key, traits::StorageVersion,
	};
	use frame_system::pallet_prelude::*;
	use up_data_structs::{CollectionId, TokenId};
	use super::weights::WeightInfo;

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
	#[pallet::generate_store(pub(super) trait Store)]
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
		Value = Properties,
		QueryKind = ValueQuery,
		OnEmpty = up_data_structs::TokenProperties,
	>;

	/// Custom data of a token that is serialized to bytes,
	/// primarily reserved for on-chain operations,
	/// normally obscured from the external users.
	///
	/// Auxiliary properties are slightly different from
	/// usual [`TokenProperties`] due to an unlimited number
	/// and separately stored and written-to key-value pairs.
	///
	/// Currently used to store RMRK data.
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

	/// Upgrade from the old schema to properties.
	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			StorageVersion::new(1).put::<Pallet<T>>();

			Weight::zero()
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

	/// Set the token property with the scope.
	///
	/// - `property`: Contains key-value pair.
	pub fn set_scoped_token_property(
		collection_id: CollectionId,
		token_id: TokenId,
		scope: PropertyScope,
		property: Property,
	) -> DispatchResult {
		TokenProperties::<T>::try_mutate((collection_id, token_id), |properties| {
			properties.try_scoped_set(scope, property.key, property.value)
		})
		.map_err(<CommonError<T>>::from)?;

		Ok(())
	}

	/// Batch operation to set multiple properties with the same scope.
	pub fn set_scoped_token_properties(
		collection_id: CollectionId,
		token_id: TokenId,
		scope: PropertyScope,
		properties: impl Iterator<Item = Property>,
	) -> DispatchResult {
		TokenProperties::<T>::try_mutate((collection_id, token_id), |stored_properties| {
			stored_properties.try_scoped_set_from_iter(scope, properties)
		})
		.map_err(<CommonError<T>>::from)?;

		Ok(())
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
	/// Create NFT collection
	///
	/// `init_collection` will take non-refundable deposit for collection creation.
	///
	/// - `data`: Contains settings for collection limits and permissions.
	pub fn init_collection(
		owner: T::CrossAccountId,
		payer: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
		flags: CollectionFlags,
	) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_collection(owner, payer, data, flags)
	}

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

	/// Same as [`burn`] but burns all the tokens that are nested in the token first
	///
	/// - `self_budget`: Limit for searching children in depth.
	/// - `breadth_budget`: Limit of breadth of searching children.
	///
	/// [`burn`]: struct.Pallet.html#method.burn
	#[transactional]
	pub fn burn_recursively(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
		self_budget: &dyn Budget,
		breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(self_budget.consume(), <StructureError<T>>::DepthLimit,);

		let current_token_account =
			T::CrossTokenAddressMapping::token_to_address(collection.id, token);

		let mut weight = Weight::zero();

		// This method is transactional, if user in fact doesn't have permissions to remove token -
		// tokens removed here will be restored after rejected transaction
		for ((collection, token), _) in <TokenChildren<T>>::iter_prefix((collection.id, token)) {
			ensure!(breadth_budget.consume(), <StructureError<T>>::BreadthLimit,);
			let PostDispatchInfo { actual_weight, .. } =
				<PalletStructure<T>>::burn_item_recursively(
					current_token_account.clone(),
					collection,
					token,
					self_budget,
					breadth_budget,
				)?;
			if let Some(actual_weight) = actual_weight {
				weight = weight.saturating_add(actual_weight);
			}
		}

		Self::burn(collection, sender, token)?;
		DispatchResultWithPostInfo::Ok(PostDispatchInfo {
			actual_weight: Some(weight + <SelfWeightOf<T>>::burn_item()),
			pays_fee: Pays::Yes,
		})
	}

	/// Batch operation to add, edit or remove properties for the token
	///
	/// All affected properties should have mutable permission and sender should have
	/// permission to edit those properties.
	///
	/// - `nesting_budget`: Limit for searching parents in depth to check ownership.
	/// - `is_token_create`: Indicates that method is called during token initialization.
	///   Allows to bypass ownership check.
	#[transactional]
	fn modify_token_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		properties_updates: impl Iterator<Item = (PropertyKey, Option<PropertyValue>)>,
		is_token_create: bool,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let mut collection_admin_status = None;
		let mut token_owner_result = None;

		let mut is_collection_admin =
			|| *collection_admin_status.get_or_insert_with(|| collection.is_owner_or_admin(sender));

		let mut is_token_owner = || {
			*token_owner_result.get_or_insert_with(|| -> Result<bool, DispatchError> {
				let is_owned = <PalletStructure<T>>::check_indirectly_owned(
					sender.clone(),
					collection.id,
					token_id,
					None,
					nesting_budget,
				)?;

				Ok(is_owned)
			})
		};

		let mut stored_properties = <TokenProperties<T>>::get((collection.id, token_id));
		let permissions = <PalletCommon<T>>::property_permissions(collection.id);

		for (key, value) in properties_updates {
			let permission = permissions
				.get(&key)
				.cloned()
				.unwrap_or_else(PropertyPermission::none);

			let is_property_exists = stored_properties.get(&key).is_some();

			match permission {
				PropertyPermission { mutable: false, .. } if is_property_exists => {
					return Err(<CommonError<T>>::NoPermission.into());
				}

				PropertyPermission {
					collection_admin,
					token_owner,
					..
				} => {
					//TODO: investigate threats during public minting.
					if is_token_create && (collection_admin || token_owner) && value.is_some() {
						// Pass
					} else if collection_admin && is_collection_admin() {
						// Pass
					} else if token_owner && is_token_owner()? {
						// Pass
					} else {
						fail!(<CommonError<T>>::NoPermission);
					}
				}
			}

			match value {
				Some(value) => {
					stored_properties
						.try_set(key.clone(), value)
						.map_err(<CommonError<T>>::from)?;

					<PalletCommon<T>>::deposit_event(CommonEvent::TokenPropertySet(
						collection.id,
						token_id,
						key,
					));
				}
				None => {
					stored_properties
						.remove(&key)
						.map_err(<CommonError<T>>::from)?;

					<PalletCommon<T>>::deposit_event(CommonEvent::TokenPropertyDeleted(
						collection.id,
						token_id,
						key,
					));
				}
			}

			<PalletEvm<T>>::deposit_log(
				CollectionHelpersEvents::TokenChanged {
					collection_id: collection_id_to_address(collection.id),
					token_id: token_id.into(),
				}
				.to_log(T::ContractAddress::get()),
			);
		}

		<TokenProperties<T>>::mutate((collection.id, token_id), |properties| {
			*properties = stored_properties;
		});

		Ok(())
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
		is_token_create: bool,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::modify_token_properties(
			collection,
			sender,
			token_id,
			properties.map(|p| (p.key, Some(p.value))),
			is_token_create,
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
		let is_token_create = false;

		Self::set_token_properties(
			collection,
			sender,
			token_id,
			[property].into_iter(),
			is_token_create,
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
		let is_token_create = false;

		Self::modify_token_properties(
			collection,
			sender,
			token_id,
			property_keys.into_iter().map(|key| (key, None)),
			is_token_create,
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
	) -> DispatchResult {
		ensure!(
			collection.limits.transfers_enabled(),
			<CommonError<T>>::TransferNotAllowed
		);

		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		ensure!(&token_data.owner == from, <CommonError<T>>::NoPermission);

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
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
			from.clone(),
			to,
			collection.id,
			token,
			nesting_budget,
		)?;

		// =========

		<PalletStructure<T>>::unnest_if_nested(&token_data.owner, collection.id, token);

		<TokenData<T>>::insert(
			(collection.id, token),
			ItemData {
				owner: to.clone(),
				..token_data
			},
		);

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
		Ok(())
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
				sender.clone(),
				&data.owner,
				collection.id,
				token,
				nesting_budget,
			)?;
		}

		// =========

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

				<PalletStructure<T>>::nest_if_sent_to_token_unchecked(
					&data.owner,
					collection.id,
					TokenId(token),
				);

				if let Err(e) = Self::set_token_properties(
					collection,
					sender,
					TokenId(token),
					data.properties.clone().into_iter(),
					true,
					nesting_budget,
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
<<<<<<< HEAD
<<<<<<< HEAD
	pub fn set_allowance_from(
=======
	pub fn set_allowance_for(
>>>>>>> 0f4242c7 (feat: add ApproveFrom eth mirror)
=======
	pub fn set_allowance_from(
>>>>>>> 2c03632a (chore: rename `set_allowance_for` to `set_allowance_from`)
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
<<<<<<< HEAD
<<<<<<< HEAD
			sender.conv_eq(from),
=======
			*sender.as_eth() == *from.as_eth(),
>>>>>>> 0f4242c7 (feat: add ApproveFrom eth mirror)
=======
			sender.conv_eq(from),
>>>>>>> 8162cc08 (chore: fix code review requests)
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

		if collection.limits.owner_can_transfer() && collection.is_owner_or_admin(spender) {
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
		ensure!(
			collection.ignores_allowance(spender),
			<CommonError<T>>::ApprovedValueTooLow
		);
		Ok(())
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
	) -> DispatchResult {
		Self::check_allowed(collection, spender, from, token, nesting_budget)?;

		// =========

		// Allowance is reset in [`transfer`]
		Self::transfer(collection, from, to, token, nesting_budget)
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
		sender: T::CrossAccountId,
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
			// Pass
		} else if nesting.token_owner
			&& <PalletStructure<T>>::check_indirectly_owned(
				sender.clone(),
				handle.id,
				under,
				Some(from),
				nesting_budget,
			)? {
			// Pass
		} else if nesting.collection_admin && handle.is_owner_or_admin(&sender) {
			// Pass
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
		<TokenChildren<T>>::insert((under.0, under.1, (to_nest.0, to_nest.1)), true);
	}

	fn unnest(under: (CollectionId, TokenId), to_unnest: (CollectionId, TokenId)) {
		<TokenChildren<T>>::remove((under.0, under.1, to_unnest));
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
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(owner)?;
			collection.check_allowlist(operator)?;
		}

		<PalletCommon<T>>::ensure_correct_receiver(operator)?;

		// =========

		<CollectionAllowance<T>>::insert((collection.id, owner, operator), approve);
		<PalletEvm<T>>::deposit_log(
			ERC721Events::ApprovalForAll {
				owner: *owner.as_eth(),
				operator: *operator.as_eth(),
				approved: approve,
			}
			.to_log(collection_id_to_address(collection.id)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::ApprovedForAll(
			collection.id,
			owner.clone(),
			operator.clone(),
			approve,
		));
		Ok(())
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
			properties.recompute_consumed_space();
		});

		Ok(())
	}
}
