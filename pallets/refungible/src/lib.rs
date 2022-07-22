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

//! # Refungible Pallet
//!
//! The Refungible pallet provides functionality for handling refungible collections and tokens.
//!
//! - [`Config`]
//! - [`RefungibleHandle`]
//! - [`Pallet`]
//! - [`CommonWeights`]
//!
//! ## Overview
//!
//! The Refungible pallet provides functions for:
//!
//! - RFT collection creation and removal
//! - Minting and burning of RFT tokens
//! - Partition and repartition of RFT tokens
//! - Retrieving number of pieces of RFT token
//! - Retrieving account balances
//! - Transfering RFT token pieces
//! - Burning RFT token pieces
//! - Setting and checking allowance for RFT tokens
//!
//! ### Terminology
//!
//! - **RFT token:** Non fungible token that was partitioned to pieces. If an account owns all
//!   of the RFT token pieces than it owns the RFT token and can repartition it.
//!
//! - **RFT Collection:** A collection of RFT tokens. All RFT tokens are part of a collection.
//!   Each collection has its own settings and set of permissions.
//!
//! - **RFT token piece:** A fungible part of an RFT token.
//!
//! - **Balance:** RFT token pieces owned by an account
//!
//! - **Allowance:** Maximum number of RFT token pieces that one account is allowed to
//!   transfer from the balance of another account
//!
//! - **Burning:** The process of “deleting” a token from a collection or removing token pieces from
//!   an account balance.
//!
//! ### Implementations
//!
//! The Refungible pallet provides implementations for the following traits. If these traits provide
//! the functionality that you need, then you can avoid coupling with the Refungible pallet.
//!
//! - [`CommonWeightInfo`](pallet_common::CommonWeightInfo): Functions for retrieval of transaction weight
//! - [`CommonCollectionOperations`](pallet_common::CommonCollectionOperations): Functions for dealing
//!   with collections
//! - [`RefungibleExtensions`](pallet_common::RefungibleExtensions): Functions specific for refungible
//!   collection
//!
//! ## Interface
//!
//! ### Dispatchable Functions
//!
//! - `init_collection` - Create RFT collection. RFT collection can be configured to allow or deny access for
//!   some accounts.
//! - `destroy_collection` - Destroy exising RFT collection. There should be no tokens in the collection.
//! - `burn` - Burn some amount of RFT token pieces owned by account. Burns the RFT token if no pieces left.
//! - `transfer` - Transfer some amount of RFT token pieces. Transfers should be enabled for RFT collection.
//!   Nests the RFT token if RFT token pieces are sent to another token.
//! - `create_item` - Mint RFT token in collection. Sender should have permission to mint tokens.
//! - `set_allowance` - Set allowance for another account to transfer balance from sender's account.
//! - `repartition` - Repartition token to selected number of pieces. Sender should own all existing pieces.
//!
//! ## Assumptions
//!
//! * Total number of pieces for one token shouldn't exceed `up_data_structs::MAX_REFUNGIBLE_PIECES`.
//! * Total number of tokens of all types shouldn't be greater than `up_data_structs::MAX_TOKEN_PREFIX_LENGTH`.
//! * Sender should be in collection's allow list to perform operations on tokens.

#![cfg_attr(not(feature = "std"), no_std)]

use crate::erc_token::ERC20Events;

use codec::{Encode, Decode, MaxEncodedLen};
use core::ops::Deref;
use evm_coder::ToLog;
use frame_support::{BoundedVec, ensure, fail, storage::with_transaction, transactional};
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use pallet_evm_coder_substrate::WithRecorder;
use pallet_common::{
	CommonCollectionOperations, Error as CommonError, Event as CommonEvent, Pallet as PalletCommon,
};
use pallet_structure::Pallet as PalletStructure;
use scale_info::TypeInfo;
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult, TransactionOutcome};
use sp_std::{vec::Vec, vec, collections::btree_map::BTreeMap};
use up_data_structs::{
	AccessMode, budget::Budget, CollectionId, CreateCollectionData, CreateRefungibleExData,
	CustomDataLimit, mapping::TokenAddressMapping, MAX_REFUNGIBLE_PIECES, TokenId, Property,
	PropertyKey, PropertyKeyPermission, PropertyPermission, PropertyScope, PropertyValue,
	TrySetProperty,
};

pub use pallet::*;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod erc_token;
pub mod weights;
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[struct_versioning::versioned(version = 2, upper)]
#[derive(Encode, Decode, Default, TypeInfo, MaxEncodedLen)]
pub struct ItemData {
	pub const_data: BoundedVec<u8, CustomDataLimit>,

	#[version(..2)]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
}

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{
		Blake2_128, Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key,
		traits::StorageVersion,
	};
	use frame_system::pallet_prelude::*;
	use up_data_structs::{CollectionId, TokenId};
	use super::weights::WeightInfo;

	#[pallet::error]
	pub enum Error<T> {
		/// Not Refungible item data used to mint in Refungible collection.
		NotRefungibleDataUsedToMintFungibleCollectionToken,
		/// Maximum refungibility exceeded
		WrongRefungiblePieces,
		/// Refungible token can't be repartitioned by user who isn't owns all pieces
		RepartitionWhileNotOwningAllPieces,
		/// Refungible token can't nest other tokens
		RefungibleDisallowsNesting,
		/// Setting item properties is not allowed
		SettingPropertiesNotAllowed,
	}

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_structure::Config
	{
		type WeightInfo: WeightInfo;
	}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	/// Amount of tokens minted for collection
	#[pallet::storage]
	pub type TokensMinted<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	/// Amount of burnt tokens for collection
	#[pallet::storage]
	pub type TokensBurnt<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	/// Custom data serialized to bytes for token
	#[pallet::storage]
	pub type TokenData<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = ItemData,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	#[pallet::getter(fn token_properties)]
	pub type TokenProperties<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = up_data_structs::Properties,
		QueryKind = ValueQuery,
		OnEmpty = up_data_structs::TokenProperties,
	>;

	/// Total amount of pieces for token
	#[pallet::storage]
	pub type TotalSupply<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = u128,
		QueryKind = ValueQuery,
	>;

	/// Used to enumerate tokens owned by account
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

	/// Amount of tokens owned by account
	#[pallet::storage]
	pub type AccountBalance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			// Owner
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u32,
		QueryKind = ValueQuery,
	>;

	/// Amount of token pieces owned by account
	#[pallet::storage]
	pub type Balance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Twox64Concat, TokenId>,
			// Owner
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u128,
		QueryKind = ValueQuery,
	>;

	/// Allowance set by an owner for a spender for a token
	#[pallet::storage]
	pub type Allowance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Twox64Concat, TokenId>,
			// Owner
			Key<Blake2_128, T::CrossAccountId>,
			// Spender
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u128,
		QueryKind = ValueQuery,
	>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			if StorageVersion::get::<Pallet<T>>() < StorageVersion::new(1) {
				<TokenData<T>>::translate_values::<ItemDataVersion1, _>(|v| {
					Some(<ItemDataVersion2>::from(v))
				})
			}

			0
		}
	}
}

pub struct RefungibleHandle<T: Config>(pallet_common::CollectionHandle<T>);
impl<T: Config> RefungibleHandle<T> {
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

impl<T: Config> Deref for RefungibleHandle<T> {
	type Target = pallet_common::CollectionHandle<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

impl<T: Config> WithRecorder<T> for RefungibleHandle<T> {
	fn recorder(&self) -> &pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0.recorder()
	}
	fn into_recorder(self) -> pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0.into_recorder()
	}
}

impl<T: Config> Pallet<T> {
	/// Get number of RFT tokens in collection
	pub fn total_supply(collection: &RefungibleHandle<T>) -> u32 {
		<TokensMinted<T>>::get(collection.id) - <TokensBurnt<T>>::get(collection.id)
	}

	/// Check that RFT token exists
	///
	/// - `token`: Token ID.
	pub fn token_exists(collection: &RefungibleHandle<T>, token: TokenId) -> bool {
		<TotalSupply<T>>::contains_key((collection.id, token))
	}

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
}

// unchecked calls skips any permission checks
impl<T: Config> Pallet<T> {
	/// Create RFT collection
	///
	/// `init_collection` will take non-refundable deposit for collection creation.
	///
	/// - `data`: Contains settings for collection limits and permissions.
	pub fn init_collection(
		owner: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
	) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_collection(owner, data, false)
	}

	/// Destroy RFT collection
	///
	/// `destroy_collection` will throw error if collection contains any tokens.
	/// Only owner can destroy collection.
	pub fn destroy_collection(
		collection: RefungibleHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		let id = collection.id;

		if Self::collection_has_tokens(id) {
			return Err(<CommonError<T>>::CantDestroyNotEmptyCollection.into());
		}

		// =========

		PalletCommon::destroy_collection(collection.0, sender)?;

		<TokensMinted<T>>::remove(id);
		<TokensBurnt<T>>::remove(id);
		<TokenData<T>>::remove_prefix((id,), None);
		<TotalSupply<T>>::remove_prefix((id,), None);
		<Balance<T>>::remove_prefix((id,), None);
		<Allowance<T>>::remove_prefix((id,), None);
		<Owned<T>>::remove_prefix((id,), None);
		<AccountBalance<T>>::remove_prefix((id,), None);
		Ok(())
	}

	fn collection_has_tokens(collection_id: CollectionId) -> bool {
		<TokenData<T>>::iter_prefix((collection_id,))
			.next()
			.is_some()
	}

	pub fn burn_token_unchecked(
		collection: &RefungibleHandle<T>,
		token_id: TokenId,
	) -> DispatchResult {
		let burnt = <TokensBurnt<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		<TokensBurnt<T>>::insert(collection.id, burnt);
		<TokenData<T>>::remove((collection.id, token_id));
		<TokenProperties<T>>::remove((collection.id, token_id));
		<TotalSupply<T>>::remove((collection.id, token_id));
		<Balance<T>>::remove_prefix((collection.id, token_id), None);
		<Allowance<T>>::remove_prefix((collection.id, token_id), None);
		// TODO: ERC721 transfer event
		Ok(())
	}

	/// Burn RFT token pieces
	///
	/// `burn` will decrease total amount of token pieces and amount owned by sender.
	/// `burn` can be called even if there are multiple owners of the RFT token.
	/// If sender wouldn't have any pieces left after `burn` than she will stop being
	/// one of the owners of the token. If there is no account that owns any pieces of
	/// the token than token will be burned too.
	///
	/// - `amount`: Amount of token pieces to burn.
	/// - `token`: Token who's pieces should be burned
	/// - `collection`: Collection that contains the token
	pub fn burn(
		collection: &RefungibleHandle<T>,
		owner: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		let total_supply = <TotalSupply<T>>::get((collection.id, token))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;

		// This was probally last owner of this token?
		if total_supply == 0 {
			// Ensure user actually owns this amount
			ensure!(
				<Balance<T>>::get((collection.id, token, owner)) == amount,
				<CommonError<T>>::TokenValueTooLow
			);
			let account_balance = <AccountBalance<T>>::get((collection.id, owner))
				.checked_sub(1)
				// Should not occur
				.ok_or(ArithmeticError::Underflow)?;

			// =========

			<Owned<T>>::remove((collection.id, owner, token));
			<PalletStructure<T>>::unnest_if_nested(owner, collection.id, token);
			<AccountBalance<T>>::insert((collection.id, owner), account_balance);
			Self::burn_token_unchecked(collection, token)?;
			<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
				collection.id,
				token,
				owner.clone(),
				amount,
			));
			return Ok(());
		}

		let balance = <Balance<T>>::get((collection.id, token, owner))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let account_balance = if balance == 0 {
			<AccountBalance<T>>::get((collection.id, owner))
				.checked_sub(1)
				// Should not occur
				.ok_or(ArithmeticError::Underflow)?
		} else {
			0
		};

		// =========

		if balance == 0 {
			<Owned<T>>::remove((collection.id, owner, token));
			<PalletStructure<T>>::unnest_if_nested(owner, collection.id, token);
			<Balance<T>>::remove((collection.id, token, owner));
			<AccountBalance<T>>::insert((collection.id, owner), account_balance);
		} else {
			<Balance<T>>::insert((collection.id, token, owner), balance);
		}
		<TotalSupply<T>>::insert((collection.id, token), total_supply);

		<PalletEvm<T>>::deposit_log(
			ERC20Events::Transfer {
				from: *owner.as_eth(),
				to: H160::default(),
				value: amount.into(),
			}
			.to_log(T::EvmTokenAddressMapping::token_to_address(
				collection.id,
				token,
			)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
			collection.id,
			token,
			owner.clone(),
			amount,
		));
		Ok(())
	}

	#[transactional]
	fn modify_token_properties(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		properties: impl Iterator<Item = (PropertyKey, Option<PropertyValue>)>,
		is_token_create: bool,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let is_collection_admin = || collection.is_owner_or_admin(sender);
		let is_token_owner = || -> Result<bool, DispatchError> {
			let balance = collection.balance(sender.clone(), token_id);
			let total_pieces: u128 =
				Self::total_pieces(collection.id, token_id).unwrap_or(u128::MAX);
			if balance != total_pieces {
				return Ok(false);
			}

			let is_bundle_owner = <PalletStructure<T>>::check_indirectly_owned(
				sender.clone(),
				collection.id,
				token_id,
				None,
				nesting_budget,
			)?;

			Ok(is_bundle_owner)
		};

		for (key, value) in properties {
			let permission = <PalletCommon<T>>::property_permissions(collection.id)
				.get(&key)
				.cloned()
				.unwrap_or_else(PropertyPermission::none);

			let is_property_exists = TokenProperties::<T>::get((collection.id, token_id))
				.get(&key)
				.is_some();

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
					let is_token_create =
						is_token_create && (collection_admin || token_owner) && value.is_some();
					if !(is_token_create
						|| (collection_admin && is_collection_admin())
						|| (token_owner && is_token_owner()?))
					{
						fail!(<CommonError<T>>::NoPermission);
					}
				}
			}

			match value {
				Some(value) => {
					<TokenProperties<T>>::try_mutate((collection.id, token_id), |properties| {
						properties.try_set(key.clone(), value)
					})
					.map_err(<CommonError<T>>::from)?;

					<PalletCommon<T>>::deposit_event(CommonEvent::TokenPropertySet(
						collection.id,
						token_id,
						key,
					));
				}
				None => {
					<TokenProperties<T>>::try_mutate((collection.id, token_id), |properties| {
						properties.remove(&key)
					})
					.map_err(<CommonError<T>>::from)?;

					<PalletCommon<T>>::deposit_event(CommonEvent::TokenPropertyDeleted(
						collection.id,
						token_id,
						key,
					));
				}
			}
		}

		Ok(())
	}

	pub fn set_token_properties(
		collection: &RefungibleHandle<T>,
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

	pub fn set_token_property(
		collection: &RefungibleHandle<T>,
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

	pub fn delete_token_properties(
		collection: &RefungibleHandle<T>,
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

	pub fn delete_token_property(
		collection: &RefungibleHandle<T>,
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

	/// Transfer RFT token pieces from one account to another.
	///
	/// If the sender is no longer owns any pieces after the `transfer` than she stops being an owner of the token.
	///
	/// - `from`: Owner of token pieces to transfer.
	/// - `to`: Recepient of transfered token pieces.
	/// - `amount`: Amount of token pieces to transfer.
	/// - `token`: Token whos pieces should be transfered
	/// - `collection`: Collection that contains the token
	pub fn transfer(
		collection: &RefungibleHandle<T>,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		ensure!(
			collection.limits.transfers_enabled(),
			<CommonError<T>>::TransferNotAllowed
		);

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
		}
		<PalletCommon<T>>::ensure_correct_receiver(to)?;

		let balance_from = <Balance<T>>::get((collection.id, token, from))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let mut create_target = false;
		let from_to_differ = from != to;
		let balance_to = if from != to {
			let old_balance = <Balance<T>>::get((collection.id, token, to));
			if old_balance == 0 {
				create_target = true;
			}
			Some(
				old_balance
					.checked_add(amount)
					.ok_or(ArithmeticError::Overflow)?,
			)
		} else {
			None
		};

		let account_balance_from = if balance_from == 0 {
			Some(
				<AccountBalance<T>>::get((collection.id, from))
					.checked_sub(1)
					// Should not occur
					.ok_or(ArithmeticError::Underflow)?,
			)
		} else {
			None
		};
		// Account data is created in token, AccountBalance should be increased
		// But only if from != to as we shouldn't check overflow in this case
		let account_balance_to = if create_target && from_to_differ {
			let account_balance_to = <AccountBalance<T>>::get((collection.id, to))
				.checked_add(1)
				.ok_or(ArithmeticError::Overflow)?;
			ensure!(
				account_balance_to < collection.limits.account_token_ownership_limit(),
				<CommonError<T>>::AccountTokenLimitExceeded,
			);

			Some(account_balance_to)
		} else {
			None
		};

		// =========

		<PalletStructure<T>>::nest_if_sent_to_token(
			from.clone(),
			to,
			collection.id,
			token,
			nesting_budget,
		)?;

		if let Some(balance_to) = balance_to {
			// from != to
			if balance_from == 0 {
				<Balance<T>>::remove((collection.id, token, from));
				<PalletStructure<T>>::unnest_if_nested(from, collection.id, token);
			} else {
				<Balance<T>>::insert((collection.id, token, from), balance_from);
			}
			<Balance<T>>::insert((collection.id, token, to), balance_to);
			if let Some(account_balance_from) = account_balance_from {
				<AccountBalance<T>>::insert((collection.id, from), account_balance_from);
				<Owned<T>>::remove((collection.id, from, token));
			}
			if let Some(account_balance_to) = account_balance_to {
				<AccountBalance<T>>::insert((collection.id, to), account_balance_to);
				<Owned<T>>::insert((collection.id, to, token), true);
			}
		}

		<PalletEvm<T>>::deposit_log(
			ERC20Events::Transfer {
				from: *from.as_eth(),
				to: *to.as_eth(),
				value: amount.into(),
			}
			.to_log(T::EvmTokenAddressMapping::token_to_address(
				collection.id,
				token,
			)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::Transfer(
			collection.id,
			token,
			from.clone(),
			to.clone(),
			amount,
		));
		Ok(())
	}

	/// Batched operation to create multiple RFT tokens.
	///
	/// Same as `create_item` but creates multiple tokens.
	///
	/// - `data`: Same as 'data` in `create_item` but contains data for multiple tokens.
	pub fn create_multiple_items(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: Vec<CreateRefungibleExData<T::CrossAccountId>>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		if !collection.is_owner_or_admin(sender) {
			ensure!(
				collection.permissions.mint_mode(),
				<CommonError<T>>::PublicMintingNotAllowed
			);
			collection.check_allowlist(sender)?;

			for item in data.iter() {
				for user in item.users.keys() {
					collection.check_allowlist(user)?;
				}
			}
		}

		for item in data.iter() {
			for (owner, _) in item.users.iter() {
				<PalletCommon<T>>::ensure_correct_receiver(owner)?;
			}
		}

		// Total pieces per tokens
		let totals = data
			.iter()
			.map(|data| {
				Ok(data
					.users
					.iter()
					.map(|u| u.1)
					.try_fold(0u128, |acc, v| acc.checked_add(*v))
					.ok_or(ArithmeticError::Overflow)?)
			})
			.collect::<Result<Vec<_>, DispatchError>>()?;
		for total in &totals {
			ensure!(
				*total <= MAX_REFUNGIBLE_PIECES,
				<Error<T>>::WrongRefungiblePieces
			);
		}

		let first_token_id = <TokensMinted<T>>::get(collection.id);
		let tokens_minted = first_token_id
			.checked_add(data.len() as u32)
			.ok_or(ArithmeticError::Overflow)?;
		ensure!(
			tokens_minted < collection.limits.token_limit(),
			<CommonError<T>>::CollectionTokenLimitExceeded
		);

		let mut balances = BTreeMap::new();
		for data in &data {
			for owner in data.users.keys() {
				let balance = balances
					.entry(owner)
					.or_insert_with(|| <AccountBalance<T>>::get((collection.id, owner)));
				*balance = balance.checked_add(1).ok_or(ArithmeticError::Overflow)?;

				ensure!(
					*balance <= collection.limits.account_token_ownership_limit(),
					<CommonError<T>>::AccountTokenLimitExceeded,
				);
			}
		}

		for (i, token) in data.iter().enumerate() {
			let token_id = TokenId(first_token_id + i as u32 + 1);
			for (to, _) in token.users.iter() {
				<PalletStructure<T>>::check_nesting(
					sender.clone(),
					to,
					collection.id,
					token_id,
					nesting_budget,
				)?;
			}
		}

		// =========

		with_transaction(|| {
			for (i, data) in data.iter().enumerate() {
				let token_id = first_token_id + i as u32 + 1;
				<TotalSupply<T>>::insert((collection.id, token_id), totals[i]);

				<TokenData<T>>::insert(
					(collection.id, token_id),
					ItemData {
						const_data: data.const_data.clone(),
					},
				);

				for (user, amount) in data.users.iter() {
					if *amount == 0 {
						continue;
					}
					<Balance<T>>::insert((collection.id, token_id, &user), amount);
					<Owned<T>>::insert((collection.id, &user, TokenId(token_id)), true);
					<PalletStructure<T>>::nest_if_sent_to_token_unchecked(
						user,
						collection.id,
						TokenId(token_id),
					);
				}

				if let Err(e) = Self::set_token_properties(
					collection,
					sender,
					TokenId(token_id),
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

		for (i, token) in data.into_iter().enumerate() {
			let token_id = first_token_id + i as u32 + 1;

			for (user, amount) in token.users.into_iter() {
				if amount == 0 {
					continue;
				}

				<PalletEvm<T>>::deposit_log(
					ERC20Events::Transfer {
						from: H160::default(),
						to: *user.as_eth(),
						value: amount.into(),
					}
					.to_log(T::EvmTokenAddressMapping::token_to_address(
						collection.id,
						TokenId(token_id),
					)),
				);
				<PalletCommon<T>>::deposit_event(CommonEvent::ItemCreated(
					collection.id,
					TokenId(token_id),
					user,
					amount,
				));
			}
		}
		Ok(())
	}

	pub fn set_allowance_unchecked(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) {
		if amount == 0 {
			<Allowance<T>>::remove((collection.id, token, sender, spender));
		} else {
			<Allowance<T>>::insert((collection.id, token, sender, spender), amount);
		}

		<PalletEvm<T>>::deposit_log(
			ERC20Events::Approval {
				owner: *sender.as_eth(),
				spender: *spender.as_eth(),
				value: amount.into(),
			}
			.to_log(T::EvmTokenAddressMapping::token_to_address(
				collection.id,
				token,
			)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
			collection.id,
			token,
			sender.clone(),
			spender.clone(),
			amount,
		))
	}

	/// Set allowance for the spender to `transfer` or `burn` sender's token pieces.
	///
	/// - `amount`: Amount of token pieces the spender is allowed to `transfer` or `burn.
	pub fn set_allowance(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
			collection.check_allowlist(spender)?;
		}

		<PalletCommon<T>>::ensure_correct_receiver(spender)?;

		if <Balance<T>>::get((collection.id, token, sender)) < amount {
			ensure!(
				collection.ignores_owned_amount(sender) && Self::token_exists(collection, token),
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, sender, spender, token, amount);
		Ok(())
	}

	/// Returns allowance, which should be set after transaction
	fn check_allowed(
		collection: &RefungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> Result<Option<u128>, DispatchError> {
		if spender.conv_eq(from) {
			return Ok(None);
		}
		if collection.permissions.access() == AccessMode::AllowList {
			// `from`, `to` checked in [`transfer`]
			collection.check_allowlist(spender)?;
		}
		if let Some(source) = T::CrossTokenAddressMapping::address_to_token(from) {
			// TODO: should collection owner be allowed to perform this transfer?
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
			return Ok(None);
		}
		let allowance =
			<Allowance<T>>::get((collection.id, token, from, &spender)).checked_sub(amount);
		if allowance.is_none() {
			ensure!(
				collection.ignores_allowance(spender),
				<CommonError<T>>::ApprovedValueTooLow
			);
		}
		Ok(allowance)
	}

	/// Transfer RFT token pieces from one account to another.
	///
	/// Same as the [`transfer`] but spender doesn't needs to be an owner of the token pieces.
	/// The owner should set allowance for the spender to transfer pieces.
	///
	/// [`transfer`]: struct.Pallet.html#method.transfer
	pub fn transfer_from(
		collection: &RefungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let allowance =
			Self::check_allowed(collection, spender, from, token, amount, nesting_budget)?;

		// =========

		Self::transfer(collection, from, to, token, amount, nesting_budget)?;
		if let Some(allowance) = allowance {
			Self::set_allowance_unchecked(collection, from, spender, token, allowance);
		}
		Ok(())
	}

	/// Burn RFT token pieces from the account.
	///
	/// Same as the [`burn`] but spender doesn't need to be an owner of the token pieces. The owner should
	/// set allowance for the spender to burn pieces
	///
	/// [`burn`]: struct.Pallet.html#method.burn
	pub fn burn_from(
		collection: &RefungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let allowance =
			Self::check_allowed(collection, spender, from, token, amount, nesting_budget)?;

		// =========

		Self::burn(collection, from, token, amount)?;
		if let Some(allowance) = allowance {
			Self::set_allowance_unchecked(collection, from, spender, token, allowance);
		}
		Ok(())
	}

	/// Create RFT token.
	///
	/// The sender should be the owner/admin of the collection or collection should be configured
	/// to allow public minting.
	///
	/// - `data`: Contains list of users who will become the owners of the token pieces and amount
	///   of token pieces they will receive.
	pub fn create_item(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateRefungibleExData<T::CrossAccountId>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::create_multiple_items(collection, sender, vec![data], nesting_budget)
	}

	/// Repartition RFT token.
	///
	/// `repartition` will set token balance of the sender and total amount of token pieces.
	/// Sender should own all of the token pieces. `repartition' could be done even if some
	/// token pieces were burned before.
	///
	/// - `amount`: Total amount of token pieces that the token will have after `repartition`.
	pub fn repartition(
		collection: &RefungibleHandle<T>,
		owner: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		ensure!(
			amount <= MAX_REFUNGIBLE_PIECES,
			<Error<T>>::WrongRefungiblePieces
		);
		ensure!(amount > 0, <CommonError<T>>::TokenValueTooLow);
		// Ensure user owns all pieces
		let total_pieces = Self::total_pieces(collection.id, token).unwrap_or(u128::MAX);
		let balance = <Balance<T>>::get((collection.id, token, owner));
		ensure!(
			total_pieces == balance,
			<Error<T>>::RepartitionWhileNotOwningAllPieces
		);

		<Balance<T>>::insert((collection.id, token, owner), amount);
		<TotalSupply<T>>::insert((collection.id, token), amount);

		if amount > total_pieces {
			let mint_amount = amount - total_pieces;
			<PalletEvm<T>>::deposit_log(
				ERC20Events::Transfer {
					from: H160::default(),
					to: *owner.as_eth(),
					value: mint_amount.into(),
				}
				.to_log(T::EvmTokenAddressMapping::token_to_address(
					collection.id,
					token,
				)),
			);
			<PalletCommon<T>>::deposit_event(CommonEvent::ItemCreated(
				collection.id,
				token,
				owner.clone(),
				mint_amount,
			));
		} else if total_pieces > amount {
			let burn_amount = total_pieces - amount;
			<PalletEvm<T>>::deposit_log(
				ERC20Events::Transfer {
					from: *owner.as_eth(),
					to: H160::default(),
					value: burn_amount.into(),
				}
				.to_log(T::EvmTokenAddressMapping::token_to_address(
					collection.id,
					token,
				)),
			);
			<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
				collection.id,
				token,
				owner.clone(),
				burn_amount,
			));
		}

		Ok(())
	}

	fn token_owner(collection_id: CollectionId, token_id: TokenId) -> Option<T::CrossAccountId> {
		let mut owner = None;
		let mut count = 0;
		for key in Balance::<T>::iter_key_prefix((collection_id, token_id)) {
			count += 1;
			if count > 1 {
				return None;
			}
			owner = Some(key);
		}
		owner
	}

	fn total_pieces(collection_id: CollectionId, token_id: TokenId) -> Option<u128> {
		<TotalSupply<T>>::try_get((collection_id, token_id)).ok()
	}

	pub fn set_collection_properties(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_collection_properties(collection, sender, properties)
	}

	pub fn delete_collection_properties(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResult {
		<PalletCommon<T>>::delete_collection_properties(collection, sender, property_keys)
	}

	pub fn set_token_property_permissions(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_token_property_permissions(collection, sender, property_permissions)
	}

	/// Returns 10 token in no particular order.
	///
	/// There is no direct way to get token holders in ascending order,
	/// since `iter_prefix` returns values in no particular order.
	/// Therefore, getting the 10 largest holders with a large value of holders
	/// can lead to impact memory allocation + sorting with  `n * log (n)`.
	pub fn token_owners(
		collection_id: CollectionId,
		token: TokenId,
	) -> Option<Vec<T::CrossAccountId>> {
		let res: Vec<T::CrossAccountId> = <Balance<T>>::iter_prefix((collection_id, token))
			.map(|(owner, _amount)| owner)
			.take(10)
			.collect();

		if res.is_empty() {
			None
		} else {
			Some(res)
		}
	}
}
