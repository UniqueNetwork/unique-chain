#![cfg_attr(not(feature = "std"), no_std)]

use core::ops::Deref;
use frame_support::{ensure};
use nft_data_structs::{AccessMode, Collection, CollectionId, TokenId};
use pallet_common::{
	Error as CommonError, Event as CommonEvent, Pallet as PalletCommon, account::CrossAccountId,
};
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
use sp_std::{vec::Vec, vec, collections::btree_map::BTreeMap};

pub use pallet::*;

use crate::erc::ERC20Events;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod weights;

pub type CreateItemData<T> = (<T as pallet_common::Config>::CrossAccountId, u128);
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{Blake2_128, Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key};
	use nft_data_structs::CollectionId;
	use super::weights::WeightInfo;

	#[pallet::error]
	pub enum Error<T> {
		/// Not Fungible item data used to mint in Fungible collection.
		NotFungibleDataUsedToMintFungibleCollectionToken,
		/// Not default id passed as TokenId argument
		FungibleItemsHaveNoId,
		/// Tried to set data for fungible item
		FungibleItemsHaveData,
	}

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config {
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	pub(super) type TotalSupply<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u128, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub(super) type Balance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::AccountId>,
		),
		Value = u128,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub(super) type Allowance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128, T::AccountId>,
			Key<Blake2_128Concat, T::AccountId>,
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
}
impl<T: Config> Deref for FungibleHandle<T> {
	type Target = pallet_common::CollectionHandle<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

impl<T: Config> Pallet<T> {
	pub fn init_collection(data: Collection<T>) -> Result<CollectionId, DispatchError> {
		PalletCommon::init_collection(data)
	}
	pub fn destroy_collection(
		collection: FungibleHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		let id = collection.id;

		// =========

		PalletCommon::destroy_collection(collection.0, sender)?;

		<TotalSupply<T>>::remove(id);
		<Balance<T>>::remove_prefix((id,), None);
		<Allowance<T>>::remove_prefix((id,), None);
		Ok(())
	}

	pub fn burn(
		collection: &FungibleHandle<T>,
		owner: &T::CrossAccountId,
		amount: u128,
	) -> DispatchResult {
		let total_supply = <TotalSupply<T>>::get(collection.id)
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;

		let balance = <Balance<T>>::get((collection.id, owner.as_sub()))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;

		if collection.access == AccessMode::WhiteList {
			collection.check_allowlist(owner)?;
		}

		// =========

		if balance == 0 {
			<Balance<T>>::remove((collection.id, owner.as_sub()));
		} else {
			<Balance<T>>::insert((collection.id, owner.as_sub()), balance);
		}
		<TotalSupply<T>>::insert(collection.id, total_supply);

		collection.log_infallible(ERC20Events::Transfer {
			from: *owner.as_eth(),
			to: H160::default(),
			value: amount.into(),
		});
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
	) -> DispatchResult {
		ensure!(
			collection.transfers_enabled,
			<CommonError<T>>::TransferNotAllowed
		);

		if collection.access == AccessMode::WhiteList {
			collection.check_allowlist(from)?;
			collection.check_allowlist(to)?;
		}
		<PalletCommon<T>>::ensure_correct_receiver(to)?;

		let balance_from = <Balance<T>>::get((collection.id, from.as_sub()))
			.checked_sub(amount)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let balance_to = if from != to {
			Some(
				<Balance<T>>::get((collection.id, to.as_sub()))
					.checked_add(amount)
					.ok_or(ArithmeticError::Overflow)?,
			)
		} else {
			None
		};

		collection.consume_sstore()?;
		collection.consume_sstore()?;
		collection.consume_log(2, 32)?;
		collection.consume_sstore()?;

		// =========

		if let Some(balance_to) = balance_to {
			// from != to
			if balance_from == 0 {
				<Balance<T>>::remove((collection.id, from.as_sub()));
			} else {
				<Balance<T>>::insert((collection.id, from.as_sub()), balance_from);
			}
			<Balance<T>>::insert((collection.id, to.as_sub()), balance_to);
		}

		collection.log_infallible(ERC20Events::Transfer {
			from: *from.as_eth(),
			to: *to.as_eth(),
			value: amount.into(),
		});
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
		data: Vec<CreateItemData<T>>,
	) -> DispatchResult {
		let unrestricted_minting = collection.is_owner_or_admin(sender)?;
		if !unrestricted_minting {
			ensure!(
				collection.mint_mode,
				<CommonError<T>>::PublicMintingNotAllowed
			);
			collection.check_allowlist(sender)?;

			for (owner, _) in data.iter() {
				collection.check_allowlist(owner)?;
			}
		}

		let mut balances = BTreeMap::new();

		let total_supply = data
			.iter()
			.map(|u| u.1)
			.try_fold(0u128, |acc, v| acc.checked_add(v))
			.ok_or(ArithmeticError::Overflow)?;

		for (user, amount) in data.into_iter() {
			collection.consume_sload()?;
			let balance = balances
				.entry(user.clone())
				.or_insert_with(|| <Balance<T>>::get((collection.id, user.as_sub())));
			*balance = (*balance)
				.checked_add(amount)
				.ok_or(ArithmeticError::Overflow)?;
		}

		collection.consume_sstore()?;
		for _ in &balances {
			collection.consume_sstore()?;
			collection.consume_log(2, 32)?;
			collection.consume_sstore()?;
		}

		// =========

		<TotalSupply<T>>::insert(collection.id, total_supply);
		for (user, amount) in balances {
			<Balance<T>>::insert((collection.id, user.as_sub()), amount);

			collection.log_infallible(ERC20Events::Transfer {
				from: H160::default(),
				to: *user.as_eth(),
				value: amount.into(),
			});
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
		<Allowance<T>>::insert((collection.id, owner.as_sub(), spender.as_sub()), amount);

		collection.log_infallible(ERC20Events::Approval {
			owner: *owner.as_eth(),
			spender: *spender.as_eth(),
			value: amount.into(),
		});
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
		if collection.access == AccessMode::WhiteList {
			collection.check_allowlist(&owner)?;
			collection.check_allowlist(&spender)?;
		}

		if <Balance<T>>::get((collection.id, owner.as_sub())) < amount {
			ensure!(
				collection.ignores_owned_amount(owner)?,
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, owner, spender, amount);
		Ok(())
	}

	pub fn transfer_from(
		collection: &FungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		amount: u128,
	) -> DispatchResult {
		if spender == from {
			return Self::transfer(collection, from, to, amount);
		}
		if collection.access == AccessMode::WhiteList {
			// `from`, `to` checked in [`transfer`]
			collection.check_allowlist(spender)?;
		}

		let allowance = <Allowance<T>>::get((collection.id, from.as_sub(), spender.as_sub()))
			.checked_sub(amount);
		if allowance.is_none() {
			ensure!(
				collection.ignores_allowance(spender)?,
				<CommonError<T>>::TokenValueNotEnough
			);
		}

		// =========

		Self::transfer(collection, from, to, amount)?;
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
	) -> DispatchResult {
		if spender == from {
			return Self::burn(collection, from, amount);
		}
		if collection.access == AccessMode::WhiteList {
			// `from` checked in [`burn`]
			collection.check_allowlist(spender)?;
		}

		let allowance = <Allowance<T>>::get((collection.id, from.as_sub(), spender.as_sub()))
			.checked_sub(amount);
		if allowance.is_none() {
			ensure!(
				collection.ignores_allowance(spender)?,
				<CommonError<T>>::TokenValueNotEnough
			);
		}

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
	) -> DispatchResult {
		Self::create_multiple_items(collection, sender, vec![data])
	}
}
