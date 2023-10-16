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

//! # Fungible Pallet
//!
//! The Fungible pallet provides functionality for dealing with fungible assets.
//!
//! - [`CreateItemData`]
//! - [`Config`]
//! - [`FungibleHandle`]
//! - [`Pallet`]
//! - [`TotalSupply`]
//! - [`Balance`]
//! - [`Allowance`]
//! - [`Error`]
//!
//! ## Fungible tokens
//!
//! Fungible tokens or assets are divisible and non-unique. For instance,
//! fiat currencies like the dollar are fungible: A $1 bill
//! in New York City has the same value as a $1 bill in Miami.
//! A fungible token can also be a cryptocurrency like Bitcoin: 1 BTC is worth 1 BTC,
//! no matter where it is issued. Thus, the fungibility refers to a specific currency’s
//! ability to maintain one standard value. As well, it needs to have uniform acceptance.
//! This means that a currency’s history should not be able to affect its value,
//! and this is due to the fact that each piece that is a part of the currency is equal
//! in value when compared to every other piece of that exact same currency.
//! In the world of cryptocurrencies, this is essentially a coin or a token
//! that can be replaced by another identical coin or token, and they are
//! both mutually interchangeable. A popular implementation of fungible tokens is
//! the ERC-20 token standard.
//!
//! ### ERC-20
//!
//! The [ERC-20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/) (Ethereum Request for Comments 20), proposed by Fabian Vogelsteller in November 2015,
//! is a Token Standard that implements an API for tokens within Smart Contracts.
//!
//! Example functionalities ERC-20 provides:
//!
//! * transfer tokens from one account to another
//! * get the current token balance of an account
//! * get the total supply of the token available on the network
//! * approve whether an amount of token from an account can be spent by a third-party account
//!
//! ## Overview
//!
//! The module provides functionality for asset management of fungible asset, supports ERC-20 standart, includes:
//!
//! * Asset Issuance
//! * Asset Transferal
//! * Asset Destruction
//! * Delegated Asset Transfers
//!
//! **NOTE:** The created fungible asset always has `token_id` = 0.
//! So `tokenA` and `tokenB` will have different `collection_id`.
//!
//! ### Implementations
//!
//! The Fungible pallet provides implementations for the following traits.
//!
//! - [`WithRecorder`](pallet_evm_coder_substrate::WithRecorder): Trait for EVM support
//! - [`CommonCollectionOperations`](pallet_common::CommonCollectionOperations): Functions for dealing with collections
//! - [`CommonWeightInfo`](pallet_common::CommonWeightInfo): Functions for retrieval of transaction weight
//! - [`CommonEvmHandler`](pallet_common::erc::CommonEvmHandler): Function for handling EVM runtime calls

#![cfg_attr(not(feature = "std"), no_std)]

use core::ops::Deref;

use evm_coder::ToLog;
use frame_support::{dispatch::PostDispatchInfo, ensure, pallet_prelude::*};
pub use pallet::*;
use pallet_common::{
	eth::collection_id_to_address, helpers::add_weight_to_post_info,
	weights::WeightInfo as CommonWeightInfo, Error as CommonError, Event as CommonEvent,
	Pallet as PalletCommon, SelfWeightOf as PalletCommonWeightOf,
};
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use pallet_evm_coder_substrate::WithRecorder;
use pallet_structure::Pallet as PalletStructure;
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
use sp_std::{collections::btree_map::BTreeMap, vec::Vec};
use up_data_structs::{
	budget::Budget, mapping::TokenAddressMapping, AccessMode, CollectionId, CreateCollectionData,
	Property, PropertyKey, TokenId,
};
use weights::WeightInfo;

use crate::erc::ERC20Events;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod weights;

pub type CreateItemData<T> = (<T as pallet_evm::Config>::CrossAccountId, u128);
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{
		pallet_prelude::*, storage::Key, Blake2_128, Blake2_128Concat, Twox64Concat,
	};
	use up_data_structs::CollectionId;

	use super::weights::WeightInfo;

	#[pallet::error]
	pub enum Error<T> {
		/// Not Fungible item data used to mint in Fungible collection.
		NotFungibleDataUsedToMintFungibleCollectionToken,
		/// Fungible tokens hold no ID, and the default value of TokenId for Fungible collection is 0.
		FungibleItemsHaveNoId,
		/// Tried to set data for fungible item.
		FungibleItemsDontHaveData,
		/// Fungible token does not support nesting.
		FungibleDisallowsNesting,
		/// Setting item properties is not allowed.
		SettingPropertiesNotAllowed,
		/// Setting allowance for all is not allowed.
		SettingAllowanceForAllNotAllowed,
		/// Only a fungible collection could be possibly broken; any fungible token is valid.
		FungibleTokensAreAlwaysValid,
	}

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_structure::Config + pallet_evm::Config
	{
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	/// Total amount of fungible tokens inside a collection.
	#[pallet::storage]
	pub type TotalSupply<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u128, QueryKind = ValueQuery>;

	/// Amount of tokens owned by an account inside a collection.
	#[pallet::storage]
	pub type Balance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u128,
		QueryKind = ValueQuery,
	>;

	/// Storage for assets delegated to a limited extent to other users.
	#[pallet::storage]
	pub type Allowance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128, T::CrossAccountId>,       // Owner
			Key<Blake2_128Concat, T::CrossAccountId>, // Spender
		),
		Value = u128,
		QueryKind = ValueQuery,
	>;
}

/// Wrapper around untyped collection handle, asserting inner collection is of fungible type.
/// Required for interaction with Fungible collections, type safety and implementation [`solidity_interface`][`evm_coder::solidity_interface`].
pub struct FungibleHandle<T: Config>(pallet_common::CollectionHandle<T>);

/// Implementation of methods required for dispatching during runtime.
impl<T: Config> FungibleHandle<T> {
	/// Casts [`CollectionHandle`][`pallet_common::CollectionHandle`] into [`FungibleHandle`].
	pub fn cast(inner: pallet_common::CollectionHandle<T>) -> Self {
		Self(inner)
	}

	/// Casts [`FungibleHandle`] into [`CollectionHandle`][`pallet_common::CollectionHandle`].
	pub fn into_inner(self) -> pallet_common::CollectionHandle<T> {
		self.0
	}
	/// Returns a mutable reference to the internal [`CollectionHandle`][`pallet_common::CollectionHandle`].
	pub fn common_mut(&mut self) -> &mut pallet_common::CollectionHandle<T> {
		&mut self.0
	}
}
impl<T: Config> WithRecorder<T> for FungibleHandle<T> {
	fn recorder(&self) -> &pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0.recorder()
	}
	fn into_recorder(self) -> pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0.into_recorder()
	}
}
impl<T: Config> Deref for FungibleHandle<T> {
	type Target = pallet_common::CollectionHandle<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

/// Pallet implementation for fungible assets
impl<T: Config> Pallet<T> {
	/// Initializes the collection. Returns [CollectionId] on success, [DispatchError] otherwise.
	pub fn init_collection(
		owner: T::CrossAccountId,
		payer: T::CrossAccountId,
		data: CreateCollectionData<T::CrossAccountId>,
	) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_collection(owner, payer, data)
	}

	/// Initializes the collection with ForeignCollection flag. Returns [CollectionId] on success, [DispatchError] otherwise.
	pub fn init_foreign_collection(
		owner: T::CrossAccountId,
		payer: T::CrossAccountId,
		data: CreateCollectionData<T::CrossAccountId>,
	) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_foreign_collection(owner, payer, data)
	}

	/// Destroys a collection.
	pub fn destroy_collection(
		collection: FungibleHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		let id = collection.id;

		if Self::collection_has_tokens(id) {
			return Err(<CommonError<T>>::CantDestroyNotEmptyCollection.into());
		}

		// =========

		PalletCommon::destroy_collection(collection.0, sender)?;

		<TotalSupply<T>>::remove(id);
		let _ = <Balance<T>>::clear_prefix((id,), u32::MAX, None);
		let _ = <Allowance<T>>::clear_prefix((id,), u32::MAX, None);
		Ok(())
	}

	/// Add properties to the collection.
	pub fn set_collection_properties(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_collection_properties(collection, sender, properties.into_iter())
	}

	/// Delete properties of the collection, associated with the provided keys.
	pub fn delete_collection_properties(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResult {
		<PalletCommon<T>>::delete_collection_properties(
			collection,
			sender,
			property_keys.into_iter(),
		)
	}

	/// Checks if collection has tokens. Return `true` if it has.
	fn collection_has_tokens(collection_id: CollectionId) -> bool {
		<TotalSupply<T>>::get(collection_id) != 0
	}

	/// Burns the specified amount of the token. If the token balance
	/// or total supply is less than the given value,
	/// it will return [DispatchError].
	pub fn burn(
		collection: &FungibleHandle<T>,
		owner: &T::CrossAccountId,
		amount: u128,
	) -> DispatchResult {
		let total_supply = <TotalSupply<T>>::get(collection.id)
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;

		let balance = <Balance<T>>::get((collection.id, owner))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;

		// Foreign collection check
		ensure!(!collection.flags.foreign, <CommonError<T>>::NoPermission);

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(owner)?;
		}

		// =========

		if balance == 0 {
			<Balance<T>>::remove((collection.id, owner));
			<PalletStructure<T>>::unnest_if_nested(owner, collection.id, TokenId::default());
		} else {
			<Balance<T>>::insert((collection.id, owner), balance);
		}
		<TotalSupply<T>>::insert(collection.id, total_supply);

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
			TokenId::default(),
			owner.clone(),
			amount,
		));
		Ok(())
	}

	/// Burns the specified amount of the token.
	pub fn burn_foreign(
		collection: &FungibleHandle<T>,
		owner: &T::CrossAccountId,
		amount: u128,
	) -> DispatchResult {
		let total_supply = <TotalSupply<T>>::get(collection.id)
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;

		let balance = <Balance<T>>::get((collection.id, owner))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		// =========

		if balance == 0 {
			<Balance<T>>::remove((collection.id, owner));
			<PalletStructure<T>>::unnest_if_nested(owner, collection.id, TokenId::default());
		} else {
			<Balance<T>>::insert((collection.id, owner), balance);
		}
		<TotalSupply<T>>::insert(collection.id, total_supply);

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
			TokenId::default(),
			owner.clone(),
			amount,
		));
		Ok(())
	}

	/// Transfers the specified amount of tokens. Will check that
	/// the transfer is allowed for the token.
	///
	/// - `from`: Owner of tokens to transfer.
	/// - `to`: Recepient of transfered tokens.
	/// - `amount`: Amount of tokens to transfer.
	/// - `collection`: Collection that contains the token
	pub fn transfer(
		collection: &FungibleHandle<T>,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let depositor = from;
		Self::transfer_internal(collection, depositor, from, to, amount, nesting_budget)
	}

	/// Transfers tokens from the `from` account to the `to` account.
	/// The `depositor` is the account who deposits the tokens.
	/// For instance, the nesting rules will be checked against the `depositor`'s permissions.
	fn transfer_internal(
		collection: &FungibleHandle<T>,
		depositor: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(
			collection.limits.transfers_enabled(),
			<CommonError<T>>::TransferNotAllowed,
		);

		let mut actual_weight = <SelfWeightOf<T>>::transfer_raw();

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
			actual_weight += <PalletCommonWeightOf<T>>::check_accesslist() * 2;
		}
		<PalletCommon<T>>::ensure_correct_receiver(to)?;
		let balance_from = <Balance<T>>::get((collection.id, from))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let balance_to = if from != to && amount != 0 {
			Some(
				<Balance<T>>::get((collection.id, to))
					.checked_add(amount)
					.ok_or(ArithmeticError::Overflow)?,
			)
		} else {
			None
		};

		// =========

		if let Some(balance_to) = balance_to {
			// from != to && amount != 0

			<PalletStructure<T>>::nest_if_sent_to_token(
				depositor,
				to,
				collection.id,
				TokenId::default(),
				nesting_budget,
			)?;

			if balance_from == 0 {
				<Balance<T>>::remove((collection.id, from));
				<PalletStructure<T>>::unnest_if_nested(from, collection.id, TokenId::default());
			} else {
				<Balance<T>>::insert((collection.id, from), balance_from);
			}
			<Balance<T>>::insert((collection.id, to), balance_to);
		}

		<PalletEvm<T>>::deposit_log(
			ERC20Events::Transfer {
				from: *from.as_eth(),
				to: *to.as_eth(),
				value: amount.into(),
			}
			.to_log(collection_id_to_address(collection.id)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::Transfer(
			collection.id,
			TokenId::default(),
			from.clone(),
			to.clone(),
			amount,
		));

		Ok(PostDispatchInfo {
			actual_weight: Some(actual_weight),
			pays_fee: Pays::Yes,
		})
	}

	/// Minting tokens for multiple IDs.
	/// It is a utility function used in [`create_multiple_items`][`Pallet::create_multiple_items`]
	/// and [`create_multiple_items_foreign`][`Pallet::create_multiple_items_foreign`]
	pub fn create_multiple_items_common(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: BTreeMap<T::CrossAccountId, u128>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let total_supply = data
			.values()
			.copied()
			.try_fold(<TotalSupply<T>>::get(collection.id), |acc, v| {
				acc.checked_add(v)
			})
			.ok_or(ArithmeticError::Overflow)?;

		for (to, _) in data.iter() {
			<PalletStructure<T>>::check_nesting(
				sender,
				to,
				collection.id,
				TokenId::default(),
				nesting_budget,
			)?;
		}

		let updated_balances = data
			.into_iter()
			.map(|(user, amount)| {
				let updated_balance = <Balance<T>>::get((collection.id, &user))
					.checked_add(amount)
					.ok_or(ArithmeticError::Overflow)?;
				Ok((user, amount, updated_balance))
			})
			.collect::<Result<Vec<_>, DispatchError>>()?;

		// =========

		<TotalSupply<T>>::insert(collection.id, total_supply);
		for (user, amount, updated_balance) in updated_balances {
			<Balance<T>>::insert((collection.id, &user), updated_balance);
			<PalletStructure<T>>::nest_if_sent_to_token_unchecked(
				&user,
				collection.id,
				TokenId::default(),
			);
			<PalletEvm<T>>::deposit_log(
				ERC20Events::Transfer {
					from: H160::default(),
					to: *user.as_eth(),
					value: amount.into(),
				}
				.to_log(collection_id_to_address(collection.id)),
			);
			<PalletCommon<T>>::deposit_event(CommonEvent::ItemCreated(
				collection.id,
				TokenId::default(),
				user.clone(),
				amount,
			));
		}

		Ok(())
	}

	/// Minting tokens for multiple IDs.
	/// See [`create_item`][`Pallet::create_item`] for more details.
	pub fn create_multiple_items(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: BTreeMap<T::CrossAccountId, u128>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		// Foreign collection check
		ensure!(!collection.flags.foreign, <CommonError<T>>::NoPermission);

		if !collection.is_owner_or_admin(sender) {
			ensure!(
				collection.permissions.mint_mode(),
				<CommonError<T>>::PublicMintingNotAllowed
			);
			collection.check_allowlist(sender)?;

			for (owner, _) in data.iter() {
				collection.check_allowlist(owner)?;
			}
		}

		Self::create_multiple_items_common(collection, sender, data, nesting_budget)
	}

	/// Minting tokens for multiple IDs.
	/// See [`create_item_foreign`][`Pallet::create_item_foreign`] for more details.
	pub fn create_multiple_items_foreign(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: BTreeMap<T::CrossAccountId, u128>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::create_multiple_items_common(collection, sender, data, nesting_budget)
	}

	fn set_allowance_unchecked(
		collection: &FungibleHandle<T>,
		owner: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		amount: u128,
	) {
		if amount == 0 {
			<Allowance<T>>::remove((collection.id, owner, spender));
		} else {
			<Allowance<T>>::insert((collection.id, owner, spender), amount);
		}

		<PalletEvm<T>>::deposit_log(
			ERC20Events::Approval {
				owner: *owner.as_eth(),
				spender: *spender.as_eth(),
				value: amount.into(),
			}
			.to_log(collection_id_to_address(collection.id)),
		);
		<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
			collection.id,
			TokenId(0),
			owner.clone(),
			spender.clone(),
			amount,
		));
	}

	/// Set allowance for the spender to `transfer` or `burn` owner's tokens.
	///
	/// - `collection`: Collection that contains the token
	/// - `owner`: Owner of tokens that sets the allowance.
	/// - `spender`: Recipient of the allowance rights.
	/// - `amount`: Amount of tokens the spender is allowed to `transfer` or `burn`.
	pub fn set_allowance(
		collection: &FungibleHandle<T>,
		owner: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		amount: u128,
	) -> DispatchResult {
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(owner)?;
			collection.check_allowlist(spender)?;
		}

		if <Balance<T>>::get((collection.id, owner)) < amount {
			ensure!(
				collection.ignores_owned_amount(owner),
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, owner, spender, amount);
		Ok(())
	}

	/// Set allowance for the spender to `transfer` or `burn` owner's tokens from eth mirror.
	///
	/// - `collection`: Collection that contains the token
	/// - `sender`: Owner of tokens that sets the allowance.
	/// - `from`: Owner's eth mirror.
	/// - `to`: Recipient of the allowance rights.
	/// - `amount`: Amount of tokens the spender is allowed to `transfer` or `burn`.
	pub fn set_allowance_from(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		amount: u128,
	) -> DispatchResult {
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
		}

		ensure!(
			sender.conv_eq(from),
			<CommonError<T>>::AddressIsNotEthMirror
		);

		if <Balance<T>>::get((collection.id, from)) < amount {
			ensure!(
				collection.limits.owner_can_transfer()
					&& (collection.is_owner_or_admin(sender) || collection.is_owner_or_admin(from)),
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, from, to, amount);
		Ok(())
	}

	/// Checks if a non-owner has (enough) allowance from the owner to perform operations on the tokens.
	/// Returns the expected remaining allowance - it should be set manually if the transaction proceeds.
	///
	/// - `collection`: Collection that contains the token.
	/// - `spender`: CrossAccountId who has the allowance rights.
	/// - `from`: The owner of the tokens who sets the allowance.
	/// - `amount`: Amount of tokens by which the allowance sholud be reduced.
	fn check_allowed(
		collection: &FungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
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
				collection, from, spender, amount,
			));
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
			return Ok(None);
		}

		let allowance = Self::compute_allowance_decrease(collection, from, spender, amount);
		ensure!(allowance.is_some(), <CommonError<T>>::ApprovedValueTooLow);

		Ok(allowance)
	}

	/// Returns `Some(amount)` if the `spender` have allowance to spend this amount.
	/// Otherwise, it returns `None`.
	fn compute_allowance_decrease(
		collection: &FungibleHandle<T>,
		from: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		amount: u128,
	) -> Option<u128> {
		<Allowance<T>>::get((collection.id, from, spender)).checked_sub(amount)
	}

	/// Transfer fungible tokens from one account to another.
	/// Same as the [`transfer`][`Pallet::transfer`] but spender doesn't needs to be an owner of the token pieces.
	/// The owner should set allowance for the spender to transfer pieces.
	/// See [`set_allowance`][`Pallet::set_allowance`] for more details.
	pub fn transfer_from(
		collection: &FungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let allowance = Self::check_allowed(collection, spender, from, amount, nesting_budget)?;

		// =========

		let mut result =
			Self::transfer_internal(collection, spender, from, to, amount, nesting_budget);
		add_weight_to_post_info(&mut result, <SelfWeightOf<T>>::check_allowed_raw());
		result?;

		if let Some(allowance) = allowance {
			Self::set_allowance_unchecked(collection, from, spender, allowance);
			add_weight_to_post_info(
				&mut result,
				<SelfWeightOf<T>>::set_allowance_unchecked_raw(),
			)
		}
		result
	}

	/// Burn fungible tokens from the account.
	///
	/// Same as the [`burn`][`Pallet::burn`] but spender doesn't need to be an owner of the tokens. The `from` should
	/// set allowance for the spender to burn tokens.
	/// See [`set_allowance`][`Pallet::set_allowance`] for more details.
	pub fn burn_from(
		collection: &FungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let allowance = Self::check_allowed(collection, spender, from, amount, nesting_budget)?;

		// =========

		Self::burn(collection, from, amount)?;
		if let Some(allowance) = allowance {
			Self::set_allowance_unchecked(collection, from, spender, allowance);
		}
		Ok(())
	}

	/// Creates fungible token.
	///
	/// The sender should be the owner/admin of the collection or collection should be configured
	/// to allow public minting.
	///
	/// - `data`: Contains user who will become the owners of the tokens and amount
	///   of tokens he will receive.
	pub fn create_item(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateItemData<T>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::create_multiple_items(
			collection,
			sender,
			[(data.0, data.1)].into_iter().collect(),
			nesting_budget,
		)
	}

	/// Creates fungible token.
	///
	/// - `data`: Contains user who will become the owners of the tokens and amount
	///   of tokens he will receive.
	pub fn create_item_foreign(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateItemData<T>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::create_multiple_items_foreign(
			collection,
			sender,
			[(data.0, data.1)].into_iter().collect(),
			nesting_budget,
		)
	}

	/// Returns 10 tokens owners in no particular order
	///
	/// There is no direct way to get token holders in ascending order,
	/// since `iter_prefix` returns values in no particular order.
	/// Therefore, getting the 10 largest holders with a large value of holders
	/// can lead to impact memory allocation + sorting with  `n * log (n)`.
	pub fn token_owners(
		collection: CollectionId,
		_token: TokenId,
	) -> Option<Vec<T::CrossAccountId>> {
		let res: Vec<T::CrossAccountId> = <Balance<T>>::iter_prefix((collection,))
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
