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
//! - [`CommonWeights`](common::CommonWeights)
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

use core::{cmp::Ordering, ops::Deref};

use evm_coder::ToLog;
use frame_support::{ensure, storage::with_transaction, transactional};
pub use pallet::*;
use pallet_common::{
	eth::collection_id_to_address, Error as CommonError, Event as CommonEvent,
	Pallet as PalletCommon,
};
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use pallet_evm_coder_substrate::WithRecorder;
use pallet_structure::Pallet as PalletStructure;
use sp_core::{Get, H160};
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult, TransactionOutcome};
#[cfg(not(feature = "std"))]
use sp_std::vec::Vec;
use sp_std::{collections::btree_map::BTreeMap, vec};
use up_data_structs::{
	budget::Budget, mapping::TokenAddressMapping, AccessMode, CollectionId,
	CreateRefungibleExMultipleOwners, PropertiesPermissionMap, Property, PropertyKey,
	PropertyKeyPermission, PropertyScope, PropertyValue, TokenId, TokenOwnerError,
	TokenProperties as TokenPropertiesT, MAX_REFUNGIBLE_PIECES,
};

use crate::{erc::ERC721Events, erc_token::ERC20Events};
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod erc_token;
pub mod weights;

pub type CreateItemData<T> =
	CreateRefungibleExMultipleOwners<<T as pallet_evm::Config>::CrossAccountId>;
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{
		pallet_prelude::*, storage::Key, traits::StorageVersion, Blake2_128, Blake2_128Concat,
		Twox64Concat,
	};
	use up_data_structs::{CollectionId, TokenId};

	use super::{weights::WeightInfo, *};

	#[pallet::error]
	pub enum Error<T> {
		/// Not Refungible item data used to mint in Refungible collection.
		NotRefungibleDataUsedToMintFungibleCollectionToken,
		/// Maximum refungibility exceeded.
		WrongRefungiblePieces,
		/// Refungible token can't be repartitioned by user who isn't owns all pieces.
		RepartitionWhileNotOwningAllPieces,
		/// Refungible token can't nest other tokens.
		RefungibleDisallowsNesting,
		/// Setting item properties is not allowed.
		SettingPropertiesNotAllowed,
	}

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_structure::Config
	{
		type WeightInfo: WeightInfo;
	}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(2);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	pub struct Pallet<T>(_);

	/// Total amount of minted tokens in a collection.
	#[pallet::storage]
	pub type TokensMinted<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	/// Amount of tokens burnt in a collection.
	#[pallet::storage]
	pub type TokensBurnt<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	/// Amount of pieces a refungible token is split into.
	#[pallet::storage]
	#[pallet::getter(fn token_properties)]
	pub type TokenProperties<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = TokenPropertiesT,
		QueryKind = OptionQuery,
	>;

	/// Total amount of pieces for token
	#[pallet::storage]
	pub type TotalSupply<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = u128,
		QueryKind = ValueQuery,
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

	/// Amount of tokens (not pieces) partially owned by an account within a collection.
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

	/// Amount of token pieces owned by account.
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

	/// Allowance set by a token owner for another user to perform one of certain transactions on a number of pieces of a token.
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

	/// Spender set by a wallet owner that could perform certain transactions on all tokens in the wallet.
	#[pallet::storage]
	pub type CollectionAllowance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>, // Owner
			Key<Blake2_128Concat, T::CrossAccountId>, // Spender
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;
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
}

// unchecked calls skips any permission checks
impl<T: Config> Pallet<T> {
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
		let _ = <TotalSupply<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <Balance<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <Allowance<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <Owned<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <AccountBalance<T>>::clear_prefix((id,), u32::MAX, None);
		Ok(())
	}

	fn collection_has_tokens(collection_id: CollectionId) -> bool {
		<TotalSupply<T>>::iter_prefix((collection_id,))
			.next()
			.is_some()
	}

	pub fn burn_token_unchecked(
		collection: &RefungibleHandle<T>,
		owner: &T::CrossAccountId,
		token_id: TokenId,
	) -> DispatchResult {
		let burnt = <TokensBurnt<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		<TokensBurnt<T>>::insert(collection.id, burnt);
		<TokenProperties<T>>::remove((collection.id, token_id));
		<TotalSupply<T>>::remove((collection.id, token_id));
		let _ = <Balance<T>>::clear_prefix((collection.id, token_id), u32::MAX, None);
		let _ = <Allowance<T>>::clear_prefix((collection.id, token_id), u32::MAX, None);
		<PalletEvm<T>>::deposit_log(
			ERC721Events::Transfer {
				from: *owner.as_eth(),
				to: H160::default(),
				token_id: token_id.into(),
			}
			.to_log(collection_id_to_address(collection.id)),
		);
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
		if <Balance<T>>::get((collection.id, token, owner)) == 0 {
			return Err(<CommonError<T>>::TokenValueTooLow.into());
		}

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
			Self::burn_token_unchecked(collection, owner, token)?;
			<PalletEvm<T>>::deposit_log(
				ERC20Events::Transfer {
					from: *owner.as_eth(),
					to: H160::default(),
					value: amount.into(),
				}
				.to_log(collection_id_to_address(collection.id)),
			);
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

			if let Ok(user) = Self::token_owner(collection.id, token) {
				<PalletEvm<T>>::deposit_log(
					ERC721Events::Transfer {
						from: erc::ADDRESS_FOR_PARTIALLY_OWNED_TOKENS,
						to: *user.as_eth(),
						token_id: token.into(),
					}
					.to_log(collection_id_to_address(collection.id)),
				);
			}
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

	/// A batch operation to add, edit or remove properties for a token.
	/// It sets or removes a token's properties according to
	/// `properties_updates` contents:
	/// * sets a property under the <key> with the value provided `(<key>, Some(<value>))`
	/// * removes a property under the <key> if the value is `None` `(<key>, None)`.
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
		collection: &RefungibleHandle<T>,
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

	pub fn next_token_id(collection: &RefungibleHandle<T>) -> Result<TokenId, DispatchError> {
		let next_token_id = <TokensMinted<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(<CommonError<T>>::CollectionTokenLimitExceeded)?;

		ensure!(
			collection.limits.token_limit() >= next_token_id,
			<CommonError<T>>::CollectionTokenLimitExceeded
		);

		Ok(TokenId(next_token_id))
	}

	pub fn set_token_properties(
		collection: &RefungibleHandle<T>,
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

	pub fn set_token_property(
		collection: &RefungibleHandle<T>,
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

	pub fn delete_token_properties(
		collection: &RefungibleHandle<T>,
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
		let depositor = from;
		Self::transfer_internal(
			collection,
			depositor,
			from,
			to,
			token,
			amount,
			nesting_budget,
		)
	}

	/// Transfers RFT tokens from the `from` account to the `to` account.
	/// The `depositor` is the account who deposits the tokens.
	/// For instance, the nesting rules will be checked against the `depositor`'s permissions.
	pub fn transfer_internal(
		collection: &RefungibleHandle<T>,
		depositor: &T::CrossAccountId,
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

		let initial_balance_from = <Balance<T>>::get((collection.id, token, from));

		if initial_balance_from == 0 {
			return Err(<CommonError<T>>::TokenValueTooLow.into());
		}

		let updated_balance_from = initial_balance_from
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let mut create_target = false;
		let from_to_differ = from != to;
		let updated_balance_to = if from != to && amount != 0 {
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

		let account_balance_from = if updated_balance_from == 0 {
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
				account_balance_to <= collection.limits.account_token_ownership_limit(),
				<CommonError<T>>::AccountTokenLimitExceeded,
			);

			Some(account_balance_to)
		} else {
			None
		};

		// =========

		if let Some(updated_balance_to) = updated_balance_to {
			// from != to && amount != 0

			<PalletStructure<T>>::nest_if_sent_to_token(
				depositor,
				to,
				collection.id,
				token,
				nesting_budget,
			)?;

			if updated_balance_from == 0 {
				<Balance<T>>::remove((collection.id, token, from));
				<PalletStructure<T>>::unnest_if_nested(from, collection.id, token);
			} else {
				<Balance<T>>::insert((collection.id, token, from), updated_balance_from);
			}
			<Balance<T>>::insert((collection.id, token, to), updated_balance_to);
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

		let total_supply = <TotalSupply<T>>::get((collection.id, token));

		if amount == total_supply {
			// if token was fully owned by `from` and will be fully owned by `to` after transfer
			<PalletEvm<T>>::deposit_log(
				ERC721Events::Transfer {
					from: *from.as_eth(),
					to: *to.as_eth(),
					token_id: token.into(),
				}
				.to_log(collection_id_to_address(collection.id)),
			);
		} else if let Some(updated_balance_to) = updated_balance_to {
			// if `from` not equals `to`. This condition is needed to avoid sending event
			// when `from` fully owns token and sends part of token pieces to itself.
			if initial_balance_from == total_supply {
				// if token was fully owned by `from` and will be only partially owned by `to`
				// and `from` after transfer
				<PalletEvm<T>>::deposit_log(
					ERC721Events::Transfer {
						from: *from.as_eth(),
						to: erc::ADDRESS_FOR_PARTIALLY_OWNED_TOKENS,
						token_id: token.into(),
					}
					.to_log(collection_id_to_address(collection.id)),
				);
			} else if updated_balance_to == total_supply {
				// if token was partially owned by `from` and will be fully owned by `to` after transfer
				<PalletEvm<T>>::deposit_log(
					ERC721Events::Transfer {
						from: erc::ADDRESS_FOR_PARTIALLY_OWNED_TOKENS,
						to: *to.as_eth(),
						token_id: token.into(),
					}
					.to_log(collection_id_to_address(collection.id)),
				);
			}
		}

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
					sender,
					to,
					collection.id,
					token_id,
					nesting_budget,
				)?;
			}
		}

		// =========

		let mut property_writer = pallet_common::NewTokenPropertyWriter::new(collection, sender);

		with_transaction(|| {
			for (i, data) in data.iter().enumerate() {
				let token_id = first_token_id + i as u32 + 1;
				<TotalSupply<T>>::insert((collection.id, token_id), totals[i]);

				let token = TokenId(token_id);

				let mut mint_target_is_sender = true;
				for (user, amount) in data.users.iter() {
					if *amount == 0 {
						continue;
					}

					mint_target_is_sender = mint_target_is_sender && sender.conv_eq(user);

					<Balance<T>>::insert((collection.id, token_id, &user), amount);
					<Owned<T>>::insert((collection.id, &user, token), true);
					<PalletStructure<T>>::nest_if_sent_to_token_unchecked(
						user,
						collection.id,
						token,
					);
				}

				if let Err(e) = property_writer.write_token_properties(
					mint_target_is_sender,
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

		for (i, token) in data.into_iter().enumerate() {
			let token_id = first_token_id + i as u32 + 1;

			let receivers = token
				.users
				.into_iter()
				.filter(|(_, amount)| *amount > 0)
				.collect::<Vec<_>>();

			if let [(user, _)] = receivers.as_slice() {
				// if there is exactly one receiver
				<PalletEvm<T>>::deposit_log(
					ERC721Events::Transfer {
						from: H160::default(),
						to: *user.as_eth(),
						token_id: token_id.into(),
					}
					.to_log(collection_id_to_address(collection.id)),
				);
			} else if let [_, ..] = receivers.as_slice() {
				// if there is more than one receiver
				<PalletEvm<T>>::deposit_log(
					ERC721Events::Transfer {
						from: H160::default(),
						to: erc::ADDRESS_FOR_PARTIALLY_OWNED_TOKENS,
						token_id: token_id.into(),
					}
					.to_log(collection_id_to_address(collection.id)),
				);
			}

			for (user, amount) in receivers.into_iter() {
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

	/// Set allowance to spend from sender's eth mirror
	///
	/// - `from`: Address of sender's eth mirror.
	/// - `to`: Adress of spender.
	/// - `amount`: Amount of token pieces the spender is allowed to `transfer` or `burn.
	pub fn set_allowance_from(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token_id: TokenId,
		amount: u128,
	) -> DispatchResult {
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
		}

		<PalletCommon<T>>::ensure_correct_receiver(to)?;

		ensure!(
			sender.conv_eq(from),
			<CommonError<T>>::AddressIsNotEthMirror
		);

		if <Balance<T>>::get((collection.id, token_id, from)) < amount {
			ensure!(
				collection.limits.owner_can_transfer()
					&& (collection.is_owner_or_admin(sender) || collection.is_owner_or_admin(from))
					&& Self::token_exists(collection, token_id),
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, from, to, token_id, amount);
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

		if collection.ignores_token_restrictions(spender) {
			return Ok(Self::compute_allowance_decrease(
				collection, token, from, spender, amount,
			));
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

		let allowance = Self::compute_allowance_decrease(collection, token, from, spender, amount);
		if allowance.is_some() {
			return Ok(allowance);
		}

		// Allowance (if any) would be reduced if spender is also wallet operator
		if <CollectionAllowance<T>>::get((collection.id, from, spender)) {
			return Ok(allowance);
		}

		Err(<CommonError<T>>::ApprovedValueTooLow.into())
	}

	/// Returns `Some(amount)` if the `spender` have allowance to spend this amount.
	/// Otherwise, it returns `None`.
	fn compute_allowance_decrease(
		collection: &RefungibleHandle<T>,
		token: TokenId,
		from: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		amount: u128,
	) -> Option<u128> {
		<Allowance<T>>::get((collection.id, token, from, spender)).checked_sub(amount)
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

		Self::transfer_internal(collection, spender, from, to, token, amount, nesting_budget)?;
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
		data: CreateItemData<T>,
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

		match total_pieces.cmp(&amount) {
			Ordering::Less => {
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
			}
			Ordering::Greater => {
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
			Ordering::Equal => {}
		}

		Ok(())
	}

	fn token_owner(
		collection_id: CollectionId,
		token_id: TokenId,
	) -> Result<T::CrossAccountId, TokenOwnerError> {
		let mut owner = None;
		let mut count = 0;
		for key in Balance::<T>::iter_key_prefix((collection_id, token_id)) {
			count += 1;
			if count > 1 {
				return Err(TokenOwnerError::MultipleOwners);
			}
			owner = Some(key);
		}
		owner.ok_or(TokenOwnerError::NotFound)
	}

	fn total_pieces(collection_id: CollectionId, token_id: TokenId) -> Option<u128> {
		<TotalSupply<T>>::try_get((collection_id, token_id)).ok()
	}

	pub fn set_collection_properties(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_collection_properties(collection, sender, properties.into_iter())
	}

	pub fn delete_collection_properties(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResult {
		<PalletCommon<T>>::delete_collection_properties(
			collection,
			sender,
			property_keys.into_iter(),
		)
	}

	pub fn set_token_property_permissions(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_token_property_permissions(collection, sender, property_permissions)
	}

	pub fn token_property_permission(collection_id: CollectionId) -> PropertiesPermissionMap {
		<PalletCommon<T>>::property_permissions(collection_id)
	}

	pub fn set_scoped_token_property_permissions(
		collection: &RefungibleHandle<T>,
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

	/// Sets or unsets the approval of a given operator.
	///
	/// The `operator` is allowed to transfer all token pieces of the `owner` on their behalf.
	/// - `owner`: Token owner
	/// - `operator`: Operator
	/// - `approve`: Should operator status be granted or revoked?
	pub fn set_allowance_for_all(
		collection: &RefungibleHandle<T>,
		owner: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		approve: bool,
	) -> DispatchResult {
		<PalletCommon<T>>::set_allowance_for_all(
			collection,
			owner,
			spender,
			approve,
			|| <CollectionAllowance<T>>::insert((collection.id, owner, spender), approve),
			ERC721Events::ApprovalForAll {
				owner: *owner.as_eth(),
				operator: *spender.as_eth(),
				approved: approve,
			}
			.to_log(collection_id_to_address(collection.id)),
		)
	}

	/// Tells whether the given `owner` approves the `operator`.
	pub fn allowance_for_all(
		collection: &RefungibleHandle<T>,
		owner: &T::CrossAccountId,
		spender: &T::CrossAccountId,
	) -> bool {
		<CollectionAllowance<T>>::get((collection.id, owner, spender))
	}

	pub fn repair_item(collection: &RefungibleHandle<T>, token: TokenId) -> DispatchResult {
		<TokenProperties<T>>::mutate((collection.id, token), |properties| {
			if let Some(properties) = properties {
				properties.recompute_consumed_space();
			}
		});

		Ok(())
	}
}
