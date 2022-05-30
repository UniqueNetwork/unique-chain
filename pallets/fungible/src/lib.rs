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

use core::ops::Deref;
use evm_coder::ToLog;
use frame_support::{ensure};
use pallet_evm::account::CrossAccountId;
use up_data_structs::{
	AccessMode, CollectionId, TokenId, CreateCollectionData, mapping::TokenAddressMapping,
	budget::Budget,
};
use pallet_common::{
	Error as CommonError, Event as CommonEvent, Pallet as PalletCommon,
	eth::collection_id_to_address,
};
use pallet_evm::Pallet as PalletEvm;
use pallet_structure::Pallet as PalletStructure;
use pallet_evm_coder_substrate::WithRecorder;
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
use sp_std::{collections::btree_map::BTreeMap};

pub use pallet::*;

use crate::erc::ERC20Events;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod weights;

pub type CreateItemData<T> = (<T as pallet_evm::account::Config>::CrossAccountId, u128);
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{Blake2_128, Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key};
	use up_data_structs::CollectionId;
	use super::weights::WeightInfo;

	#[pallet::error]
	pub enum Error<T> {
		/// Not Fungible item data used to mint in Fungible collection.
		NotFungibleDataUsedToMintFungibleCollectionToken,
		/// Not default id passed as TokenId argument
		FungibleItemsHaveNoId,
		/// Tried to set data for fungible item
		FungibleItemsDontHaveData,
		/// Fungible token does not support nested
		FungibleDisallowsNesting,
		/// Setting item properties is not allowed
		SettingPropertiesNotAllowed,
	}

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_common::Config + pallet_structure::Config + pallet_evm::Config
	{
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	pub type TotalSupply<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u128, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub type Balance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u128,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub type Allowance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128, T::CrossAccountId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u128,
		QueryKind = ValueQuery,
	>;
}

pub struct FungibleHandle<T: Config>(pallet_common::CollectionHandle<T>);
impl<T: Config> FungibleHandle<T> {
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

impl<T: Config> Pallet<T> {
	pub fn init_collection(
		owner: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
	) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_collection(owner, data)
	}
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
		<Balance<T>>::remove_prefix((id,), None);
		<Allowance<T>>::remove_prefix((id,), None);
		Ok(())
	}

	fn collection_has_tokens(collection_id: CollectionId) -> bool {
		<TotalSupply<T>>::get(collection_id) != 0
	}

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

	pub fn transfer(
		collection: &FungibleHandle<T>,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		ensure!(
			collection.limits.transfers_enabled(),
			<CommonError<T>>::TransferNotAllowed,
		);

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
		}
		<PalletCommon<T>>::ensure_correct_receiver(to)?;

		let balance_from = <Balance<T>>::get((collection.id, from))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let balance_to = if from != to {
			Some(
				<Balance<T>>::get((collection.id, to))
					.checked_add(amount)
					.ok_or(ArithmeticError::Overflow)?,
			)
		} else {
			None
		};

		// =========

		<PalletStructure<T>>::nest_if_sent_to_token(
			from.clone(),
			to,
			collection.id,
			TokenId::default(),
			nesting_budget,
		)?;

		if let Some(balance_to) = balance_to {
			// from != to
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
		Ok(())
	}

	pub fn create_multiple_items(
		collection: &FungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: BTreeMap<T::CrossAccountId, u128>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
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

		let total_supply = data
			.iter()
			.map(|(_, v)| *v)
			.try_fold(<TotalSupply<T>>::get(collection.id), |acc, v| {
				acc.checked_add(v)
			})
			.ok_or(ArithmeticError::Overflow)?;

		let mut balances = data;
		for (k, v) in balances.iter_mut() {
			*v = <Balance<T>>::get((collection.id, &k))
				.checked_add(*v)
				.ok_or(ArithmeticError::Overflow)?;
		}

		for (to, _) in balances.iter() {
			<PalletStructure<T>>::check_nesting(
				sender.clone(),
				to,
				collection.id,
				TokenId::default(),
				nesting_budget,
			)?;
		}

		// =========

		<TotalSupply<T>>::insert(collection.id, total_supply);
		for (user, amount) in balances {
			<Balance<T>>::insert((collection.id, &user), amount);
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
		let allowance = <Allowance<T>>::get((collection.id, from, spender)).checked_sub(amount);
		if allowance.is_none() {
			ensure!(
				collection.ignores_allowance(spender),
				<CommonError<T>>::ApprovedValueTooLow
			);
		}

		Ok(allowance)
	}

	pub fn transfer_from(
		collection: &FungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let allowance = Self::check_allowed(collection, spender, from, amount, nesting_budget)?;

		// =========

		Self::transfer(collection, from, to, amount, nesting_budget)?;
		if let Some(allowance) = allowance {
			Self::set_allowance_unchecked(collection, from, spender, allowance);
		}
		Ok(())
	}

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

	/// Delegated to `create_multiple_items`
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
}
