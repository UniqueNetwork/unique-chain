#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{ensure, BoundedVec};
use up_data_structs::{
	AccessMode, CUSTOM_DATA_LIMIT, Collection, CollectionId, CustomDataLimit,
	MAX_REFUNGIBLE_PIECES, TokenId,
};
use pallet_common::{
	Error as CommonError, Event as CommonEvent, Pallet as PalletCommon, account::CrossAccountId,
};
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
use sp_std::{vec::Vec, vec, collections::btree_map::BTreeMap};
use core::ops::Deref;
use codec::{Encode, Decode};
use scale_info::TypeInfo;

pub use pallet::*;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod weights;
pub struct CreateItemData<T: Config> {
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
	pub users: BTreeMap<T::CrossAccountId, u128>,
}
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[derive(Encode, Decode, Default, TypeInfo)]
pub struct ItemData {
	pub const_data: Vec<u8>,
	pub variable_data: Vec<u8>,
}

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{Blake2_128, Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key};
	use up_data_structs::{CollectionId, TokenId};
	use super::weights::WeightInfo;

	#[pallet::error]
	pub enum Error<T> {
		/// Not Refungible item data used to mint in Refungible collection.
		NotRefungibleDataUsedToMintFungibleCollectionToken,
		/// Maximum refungibility exceeded
		WrongRefungiblePieces,
	}

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config {
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	pub type TokensMinted<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;
	#[pallet::storage]
	pub type TokensBurnt<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub type TokenData<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = ItemData,
		QueryKind = ValueQuery,
	>;

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
}

pub struct RefungibleHandle<T: Config>(pallet_common::CollectionHandle<T>);
impl<T: Config> RefungibleHandle<T> {
	pub fn cast(inner: pallet_common::CollectionHandle<T>) -> Self {
		Self(inner)
	}
	pub fn into_inner(self) -> pallet_common::CollectionHandle<T> {
		self.0
	}
}
impl<T: Config> Deref for RefungibleHandle<T> {
	type Target = pallet_common::CollectionHandle<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

impl<T: Config> Pallet<T> {
	pub fn total_supply(collection: &RefungibleHandle<T>) -> u32 {
		<TokensMinted<T>>::get(collection.id) - <TokensBurnt<T>>::get(collection.id)
	}
	pub fn token_exists(collection: &RefungibleHandle<T>, token: TokenId) -> bool {
		<TotalSupply<T>>::contains_key((collection.id, token))
	}
}

// unchecked calls skips any permission checks
impl<T: Config> Pallet<T> {
	pub fn init_collection(data: Collection<T::AccountId>) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_collection(data)
	}
	pub fn destroy_collection(
		collection: RefungibleHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		let id = collection.id;

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

	pub fn burn_token(collection: &RefungibleHandle<T>, token_id: TokenId) -> DispatchResult {
		let burnt = <TokensBurnt<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		<TokensBurnt<T>>::insert(collection.id, burnt);
		<TokenData<T>>::remove((collection.id, token_id));
		<TotalSupply<T>>::remove((collection.id, token_id));
		<Balance<T>>::remove_prefix((collection.id, token_id), None);
		<Allowance<T>>::remove_prefix((collection.id, token_id), None);
		// TODO: ERC721 transfer event
		Ok(())
	}

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
			<AccountBalance<T>>::insert((collection.id, owner), account_balance);
			Self::burn_token(collection, token)?;
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
			<Balance<T>>::remove((collection.id, token, owner));
			<AccountBalance<T>>::insert((collection.id, owner), account_balance);
		} else {
			<Balance<T>>::insert((collection.id, token, owner), balance);
		}
		<TotalSupply<T>>::insert((collection.id, token), total_supply);
		// TODO: ERC20 transfer event
		<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
			collection.id,
			token,
			owner.clone(),
			amount,
		));
		Ok(())
	}

	pub fn transfer(
		collection: &RefungibleHandle<T>,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		ensure!(
			collection.limits.transfers_enabled(),
			<CommonError<T>>::TransferNotAllowed
		);

		if collection.access == AccessMode::AllowList {
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

		if let Some(balance_to) = balance_to {
			// from != to
			if balance_from == 0 {
				<Balance<T>>::remove((collection.id, token, from));
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

		// TODO: ERC20 transfer event
		<PalletCommon<T>>::deposit_event(CommonEvent::Transfer(
			collection.id,
			token,
			from.clone(),
			to.clone(),
			amount,
		));
		Ok(())
	}

	pub fn create_multiple_items(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: Vec<CreateItemData<T>>,
	) -> DispatchResult {
		if !collection.is_owner_or_admin(sender) {
			ensure!(
				collection.mint_mode,
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

		// =========

		<TokensMinted<T>>::insert(collection.id, tokens_minted);
		for (account, balance) in balances {
			<AccountBalance<T>>::insert((collection.id, account), balance);
		}
		for (i, token) in data.into_iter().enumerate() {
			let token_id = first_token_id + i as u32 + 1;
			<TotalSupply<T>>::insert((collection.id, token_id), totals[i]);

			<TokenData<T>>::insert(
				(collection.id, token_id),
				ItemData {
					const_data: token.const_data.into(),
					variable_data: token.variable_data.into(),
				},
			);
			for (user, amount) in token.users.into_iter() {
				if amount == 0 {
					continue;
				}
				<Balance<T>>::insert((collection.id, token_id, &user), amount);
				<Owned<T>>::insert((collection.id, &user, TokenId(token_id)), true);
				// TODO: ERC20 transfer event
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
		// TODO: ERC20 approval event
		<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
			collection.id,
			token,
			sender.clone(),
			spender.clone(),
			amount,
		))
	}

	pub fn set_allowance(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		if collection.access == AccessMode::AllowList {
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

	pub fn transfer_from(
		collection: &RefungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		if spender.conv_eq(from) {
			return Self::transfer(collection, from, to, token, amount);
		}
		if collection.access == AccessMode::AllowList {
			// `from`, `to` checked in [`transfer`]
			collection.check_allowlist(spender)?;
		}

		let allowance =
			<Allowance<T>>::get((collection.id, token, from, &spender)).checked_sub(amount);
		if allowance.is_none() {
			ensure!(
				collection.ignores_allowance(spender),
				<CommonError<T>>::TokenValueNotEnough
			);
		}

		// =========

		Self::transfer(collection, from, to, token, amount)?;
		if let Some(allowance) = allowance {
			Self::set_allowance_unchecked(collection, from, spender, token, allowance);
		}
		Ok(())
	}

	pub fn burn_from(
		collection: &RefungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResult {
		if spender.conv_eq(from) {
			return Self::burn(collection, from, token, amount);
		}
		if collection.access == AccessMode::AllowList {
			// `from` checked in [`burn`]
			collection.check_allowlist(spender)?;
		}

		let allowance =
			<Allowance<T>>::get((collection.id, token, from, &spender)).checked_sub(amount);
		if allowance.is_none() {
			ensure!(
				collection.ignores_allowance(spender),
				<CommonError<T>>::TokenValueNotEnough
			);
		}

		// =========

		Self::burn(collection, from, token, amount)?;
		if let Some(allowance) = allowance {
			Self::set_allowance_unchecked(collection, from, spender, token, allowance);
		}
		Ok(())
	}

	pub fn set_variable_metadata(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
		data: Vec<u8>,
	) -> DispatchResult {
		ensure!(
			data.len() as u32 <= CUSTOM_DATA_LIMIT,
			<CommonError<T>>::TokenVariableDataLimitExceeded
		);
		collection.check_can_update_meta(
			sender,
			&T::CrossAccountId::from_sub(collection.owner.clone()),
		)?;

		let token_data = <TokenData<T>>::get((collection.id, token));

		// =========

		<TokenData<T>>::insert(
			(collection.id, token),
			ItemData {
				variable_data: data,
				..token_data
			},
		);
		Ok(())
	}

	/// Delegated to `create_multiple_items`
	pub fn create_item(
		collection: &RefungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateItemData<T>,
	) -> DispatchResult {
		Self::create_multiple_items(collection, sender, vec![data])
	}
}
