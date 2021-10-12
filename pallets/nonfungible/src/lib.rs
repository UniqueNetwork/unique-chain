#![cfg_attr(not(feature = "std"), no_std)]

use erc::ERC721Events;
use frame_support::{BoundedVec, ensure};
use nft_data_structs::{
	AccessMode, CUSTOM_DATA_LIMIT, Collection, CollectionId, CustomDataLimit, TokenId,
};
use pallet_common::{
	Error as CommonError, Pallet as PalletCommon, Event as CommonEvent, account::CrossAccountId,
};
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
use sp_std::{vec::Vec, vec};
use core::ops::Deref;
use sp_std::collections::btree_map::BTreeMap;

pub use pallet::*;
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod weights;

pub struct CreateItemData<T: Config> {
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
	pub owner: T::CrossAccountId,
}
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::{Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key};
	use sp_std::vec::Vec;
	use nft_data_structs::{CollectionId, TokenId};
	use super::weights::WeightInfo;

	#[pallet::error]
	pub enum Error<T> {
		/// Not Nonfungible item data used to mint in Nonfungible collection.
		NotNonfungibleDataUsedToMintFungibleCollectionToken,
		/// Used amount > 1 with NFT
		NonfungibleItemsHaveNoAmount,
	}

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config {
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	pub(super) type TokensMinted<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;
	#[pallet::storage]
	pub(super) type TokensBurnt<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	#[derive(Encode, Decode)]
	pub enum DataKind {
		Constant,
		Variable,
	}

	#[pallet::storage]
	pub(super) type TokenData<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Twox64Concat, TokenId>,
			Key<Identity, DataKind>,
		),
		Value = Vec<u8>,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub(super) type Owner<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = T::CrossAccountId,
		QueryKind = ValueQuery,
	>;
	/// Used to enumerate tokens owned by account
	#[pallet::storage]
	pub(super) type Owned<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::AccountId>,
			Key<Twox64Concat, TokenId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub(super) type AccountBalance<T: Config> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Blake2_128Concat, T::AccountId>,
		),
		Value = u32,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub(super) type Allowance<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = T::CrossAccountId,
		QueryKind = OptionQuery,
	>;
}

pub struct NonfungibleHandle<T: Config>(pallet_common::CollectionHandle<T>);
impl<T: Config> NonfungibleHandle<T> {
	pub fn cast(inner: pallet_common::CollectionHandle<T>) -> Self {
		Self(inner)
	}
	pub fn into_inner(self) -> pallet_common::CollectionHandle<T> {
		self.0
	}
}
impl<T: Config> Deref for NonfungibleHandle<T> {
	type Target = pallet_common::CollectionHandle<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

impl<T: Config> Pallet<T> {
	pub fn total_supply(collection: &NonfungibleHandle<T>) -> u32 {
		<TokensMinted<T>>::get(collection.id) - <TokensBurnt<T>>::get(collection.id)
	}
	pub fn token_exists(collection: &NonfungibleHandle<T>, token: TokenId) -> bool {
		<Owner<T>>::contains_key((collection.id, token))
	}
	pub fn ensure_owner(
		collection: &NonfungibleHandle<T>,
		token: TokenId,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		ensure!(
			&<Owner<T>>::get((collection.id, token)) == sender,
			<CommonError<T>>::NoPermission
		);
		Ok(())
	}
	pub fn item_owner(
		collection: &NonfungibleHandle<T>,
		token: TokenId,
	) -> Result<T::CrossAccountId, DispatchError> {
		let owner = <Owner<T>>::get((collection.id, token));
		ensure!(
			owner != T::CrossAccountId::default(),
			<CommonError<T>>::TokenNotFound
		);
		Ok(owner)
	}
}

// unchecked calls skips any permission checks
impl<T: Config> Pallet<T> {
	pub fn init_collection(data: Collection<T>) -> Result<CollectionId, DispatchError> {
		PalletCommon::init_collection(data)
	}
	pub fn destroy_collection(
		collection: NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		let id = collection.id;

		// =========

		PalletCommon::destroy_collection(collection.0, sender)?;

		<Owner<T>>::remove_prefix((id,), None);
		<Owned<T>>::remove_prefix((id,), None);
		<TokensMinted<T>>::remove(id);
		<TokensBurnt<T>>::remove(id);
		<TokenData<T>>::remove_prefix((id,), None);
		<Allowance<T>>::remove_prefix((id,), None);
		<AccountBalance<T>>::remove_prefix((id,), None);
		Ok(())
	}

	pub fn burn(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		let token_owner = <Pallet<T>>::item_owner(collection, token)?;
		ensure!(
			&token_owner == sender
				|| (collection.limits.owner_can_transfer
					&& collection.is_owner_or_admin(sender)?),
			<CommonError<T>>::NoPermission
		);

		if collection.access == AccessMode::WhiteList {
			collection.check_whitelist(sender)?;
		}

		let burnt = <TokensBurnt<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		// =========

		<Owner<T>>::remove((collection.id, token));
		<Owned<T>>::remove((collection.id, token_owner.as_sub(), token));
		<TokensBurnt<T>>::insert(collection.id, burnt);
		<TokenData<T>>::remove_prefix((collection.id, token), None);
		<Allowance<T>>::remove((collection.id, token));

		collection.log_infallible(ERC721Events::Transfer {
			from: *token_owner.as_eth(),
			to: H160::default(),
			token_id: token.into(),
		});
		<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
			collection.id,
			token,
			token_owner,
			1,
		));
		return Ok(());
	}

	pub fn transfer(
		collection: &NonfungibleHandle<T>,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		ensure!(
			collection.transfers_enabled,
			<CommonError<T>>::TransferNotAllowed
		);

		let token_owner = <Pallet<T>>::item_owner(collection, token)?;
		ensure!(
			&token_owner == from
				|| (collection.limits.owner_can_transfer && collection.is_owner_or_admin(from)?),
			<CommonError<T>>::NoPermission
		);

		if collection.access == AccessMode::WhiteList {
			collection.check_whitelist(from)?;
			collection.check_whitelist(to)?;
		}
		<PalletCommon<T>>::ensure_correct_receiver(to)?;

		let balance_from = <AccountBalance<T>>::get((collection.id, from.as_sub()))
			.checked_sub(1)
			.ok_or(<CommonError<T>>::TokenValueTooLow)?;
		let balance_to = if from != to {
			let balance_to = <AccountBalance<T>>::get((collection.id, to.as_sub()))
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

		collection.consume_sstores(4)?;
		collection.consume_log(3, 0)?;

		// =========

		if let Some(balance_to) = balance_to {
			// from != to
			if balance_from == 0 {
				<AccountBalance<T>>::remove((collection.id, from.as_sub()));
			} else {
				<AccountBalance<T>>::insert((collection.id, from.as_sub()), balance_from);
			}
			<AccountBalance<T>>::insert((collection.id, to.as_sub()), balance_to);
			<Owned<T>>::remove((collection.id, from.as_sub(), token));
			<Owned<T>>::insert((collection.id, to.as_sub(), token), true);
		}
		Self::set_allowance_unchecked(collection, from, token, None);
		<Owner<T>>::insert((collection.id, token), &to);

		collection.log_infallible(ERC721Events::Transfer {
			from: *from.as_eth(),
			to: *to.as_eth(),
			token_id: token.into(),
		});
		<PalletCommon<T>>::deposit_event(CommonEvent::Transfer(
			collection.id,
			token,
			from.clone(),
			to.clone(),
			1,
		));
		Ok(())
	}

	pub fn create_multiple_items(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: Vec<CreateItemData<T>>,
	) -> DispatchResult {
		let unrestricted_minting = collection.is_owner_or_admin(sender)?;
		if !unrestricted_minting {
			ensure!(
				collection.mint_mode,
				<CommonError<T>>::PublicMintingNotAllowed
			);
			collection.check_whitelist(sender)?;

			for item in data.iter() {
				collection.check_whitelist(&item.owner)?;
			}
		}

		for data in data.iter() {
			<PalletCommon<T>>::ensure_correct_receiver(&data.owner)?;
			if !data.const_data.is_empty() {
				collection.consume_sstore()?;
			}
			if !data.variable_data.is_empty() {
				collection.consume_sstore()?;
			}
			collection.consume_sstore()?;
			collection.consume_log(3, 0)?;
		}

		let first_token = <TokensMinted<T>>::get(collection.id);
		let tokens_minted = first_token
			.checked_add(data.len() as u32)
			.ok_or(ArithmeticError::Overflow)?;
		ensure!(
			tokens_minted < collection.limits.token_limit,
			<CommonError<T>>::CollectionTokenLimitExceeded
		);
		collection.consume_sstore()?;

		let mut balances = BTreeMap::new();
		for data in &data {
			let balance = balances
				.entry(data.owner.as_sub())
				.or_insert_with(|| <AccountBalance<T>>::get((collection.id, data.owner.as_sub())));
			*balance = balance.checked_add(1).ok_or(ArithmeticError::Overflow)?;

			ensure!(
				*balance <= collection.limits.account_token_ownership_limit(),
				<CommonError<T>>::AccountTokenLimitExceeded,
			);
		}
		collection.consume_sstores(balances.len())?;

		// =========

		<TokensMinted<T>>::insert(collection.id, tokens_minted);
		for (account, balance) in balances {
			<AccountBalance<T>>::insert((collection.id, account), balance);
		}
		for (i, data) in data.into_iter().enumerate() {
			let token = first_token + i as u32;

			if !data.const_data.is_empty() {
				<TokenData<T>>::insert((collection.id, token, DataKind::Constant), data.const_data);
			}
			if !data.variable_data.is_empty() {
				<TokenData<T>>::insert(
					(collection.id, token, DataKind::Variable),
					data.variable_data,
				);
			}
			<Owner<T>>::insert((collection.id, token), &data.owner);
			<Owned<T>>::insert((collection.id, data.owner.as_sub(), token), true);

			collection.log_infallible(ERC721Events::Transfer {
				from: H160::default(),
				to: *data.owner.as_eth(),
				token_id: token.into(),
			});
		}
		Ok(())
	}

	pub fn set_allowance_unchecked(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
		spender: Option<&T::CrossAccountId>,
	) {
		if let Some(spender) = spender {
			let old_spender = <Allowance<T>>::get((collection.id, token));
			<Allowance<T>>::insert((collection.id, token), spender);
			// In ERC721 there is only one possible approved user of token, so we set
			// approved user to spender
			collection.log_infallible(ERC721Events::Approval {
				owner: *sender.as_eth(),
				approved: *spender.as_eth(),
				token_id: token.into(),
			});
			// In Unique chain, any token can have any amount of approved users, so we need to
			// set allowance of old owner to 0, and allowance of new owner to 1
			if old_spender.as_ref() != Some(spender) {
				if let Some(old_owner) = old_spender {
					<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
						collection.id,
						token,
						sender.clone(),
						old_owner.clone(),
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
			// In ERC721 there is only one possible approved user of token, so we set
			// approved user to zero address
			collection.log_infallible(ERC721Events::Approval {
				owner: *sender.as_eth(),
				approved: H160::default(),
				token_id: token.into(),
			});
			// In Unique chain, any token can have any amount of approved users, so we need to
			// set allowance of old owner to 0
			if let Some(old_spender) = old_spender {
				<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
					collection.id,
					token,
					sender.clone(),
					old_spender.clone(),
					0,
				));
			}
		}
	}

	pub fn set_allowance(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
		spender: Option<&T::CrossAccountId>,
	) -> DispatchResult {
		if collection.access == AccessMode::WhiteList {
			collection.check_whitelist(&sender)?;
			if let Some(spender) = spender {
				collection.check_whitelist(&spender)?;
			}
		}

		if let Some(spender) = spender {
			<PalletCommon<T>>::ensure_correct_receiver(spender)?;
		}
		let token_owner = Self::item_owner(collection, token)?;
		if &token_owner != sender {
			ensure!(
				collection.ignores_owned_amount(sender)?,
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, sender, token, spender);
		Ok(())
	}

	pub fn transfer_from(
		collection: &NonfungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		if spender == from {
			return Self::transfer(collection, from, to, token);
		}
		if collection.access == AccessMode::WhiteList {
			// `from`, `to` checked in [`transfer`]
			collection.check_whitelist(spender)?;
		}

		if <Allowance<T>>::get((collection.id, token)).as_ref() != Some(spender) {
			ensure!(
				collection.ignores_allowance(spender)?,
				<CommonError<T>>::TokenValueNotEnough
			);
		}

		// =========

		Self::transfer(collection, &from, to, token)?;
		// Allowance is reset in [`transfer`]
		Ok(())
	}

	pub fn set_variable_metadata(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
		data: Vec<u8>,
	) -> DispatchResult {
		ensure!(
			data.len() as u32 <= CUSTOM_DATA_LIMIT,
			<CommonError<T>>::TokenVariableDataLimitExceeded
		);
		let item_owner = Self::item_owner(collection, token)?;
		collection.check_can_update_meta(sender, &item_owner)?;

		collection.consume_sstore()?;

		// =========

		<TokenData<T>>::insert((collection.id, token, DataKind::Variable), data);
		Ok(())
	}

	/// Delegated to `create_multiple_items`
	pub fn create_item(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateItemData<T>,
	) -> DispatchResult {
		Self::create_multiple_items(collection, sender, vec![data])
	}
}
