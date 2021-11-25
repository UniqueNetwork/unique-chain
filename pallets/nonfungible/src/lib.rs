#![cfg_attr(not(feature = "std"), no_std)]

use erc::ERC721Events;
use frame_support::{BoundedVec, ensure};
use up_data_structs::{
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
	pub owner: T::CrossAccountId,
}
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[derive(Encode, Decode, TypeInfo)]
pub struct ItemData<T: Config> {
	pub const_data: Vec<u8>,
	pub variable_data: Vec<u8>,
	pub owner: T::CrossAccountId,
}

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key};
	use up_data_structs::{CollectionId, TokenId};
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
	#[pallet::generate_store(pub trait Store)]
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
		Value = ItemData<T>,
		QueryKind = OptionQuery,
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
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = u32,
		QueryKind = ValueQuery,
	>;

	#[pallet::storage]
	pub type Allowance<T: Config> = StorageNMap<
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
		<TokenData<T>>::contains_key((collection.id, token))
	}
}

// unchecked calls skips any permission checks
impl<T: Config> Pallet<T> {
	pub fn init_collection(data: Collection<T::AccountId>) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_collection(data)
	}
	pub fn destroy_collection(
		collection: NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		let id = collection.id;

		// =========

		PalletCommon::destroy_collection(collection.0, sender)?;

		<TokenData<T>>::remove_prefix((id,), None);
		<Owned<T>>::remove_prefix((id,), None);
		<TokensMinted<T>>::remove(id);
		<TokensBurnt<T>>::remove(id);
		<Allowance<T>>::remove_prefix((id,), None);
		<AccountBalance<T>>::remove_prefix((id,), None);
		Ok(())
	}

	pub fn burn(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		let token_data = <TokenData<T>>::get((collection.id, token))
			.ok_or_else(|| <CommonError<T>>::TokenNotFound)?;
		ensure!(
			&token_data.owner == sender
				|| (collection.limits.owner_can_transfer()
					&& collection.is_owner_or_admin(sender)?),
			<CommonError<T>>::NoPermission
		);

		if collection.access == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
		}

		let burnt = <TokensBurnt<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		let balance = <AccountBalance<T>>::get((collection.id, sender))
			.checked_sub(1)
			.ok_or(ArithmeticError::Overflow)?;

		if balance == 0 {
				<AccountBalance<T>>::remove((collection.id, sender));
			} else {
				<AccountBalance<T>>::insert((collection.id, sender), balance);
			}
		// =========

		<Owned<T>>::remove((collection.id, &token_data.owner, token));
		<TokensBurnt<T>>::insert(collection.id, burnt);
		<TokenData<T>>::remove((collection.id, token));
		let old_spender = <Allowance<T>>::take((collection.id, token));

		if let Some(old_spender) = old_spender {
			<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
				collection.id,
				token,
				sender.clone(),
				old_spender.clone(),
				0,
			));
		}

		collection.log_infallible(ERC721Events::Transfer {
			from: *token_data.owner.as_eth(),
			to: H160::default(),
			token_id: token.into(),
		});
		<PalletCommon<T>>::deposit_event(CommonEvent::ItemDestroyed(
			collection.id,
			token,
			token_data.owner,
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
			collection.limits.transfers_enabled(),
			<CommonError<T>>::TransferNotAllowed
		);

		let token_data = <TokenData<T>>::get((collection.id, token))
			.ok_or_else(|| <CommonError<T>>::TokenNotFound)?;
		ensure!(
			&token_data.owner == from
				|| (collection.limits.owner_can_transfer()
					&& collection.is_owner_or_admin(from)?),
			<CommonError<T>>::NoPermission
		);

		if collection.access == AccessMode::AllowList {
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

		collection.consume_sstores(4)?;
		collection.consume_log(3, 0)?;

		// =========

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
			collection.check_allowlist(sender)?;

			for item in data.iter() {
				collection.check_allowlist(&item.owner)?;
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
			tokens_minted <= collection.limits.token_limit(),
			<CommonError<T>>::CollectionTokenLimitExceeded
		);
		collection.consume_sstore()?;

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
		collection.consume_sstores(balances.len())?;

		// =========

		<TokensMinted<T>>::insert(collection.id, tokens_minted);
		for (account, balance) in balances {
			<AccountBalance<T>>::insert((collection.id, account), balance);
		}
		for (i, data) in data.into_iter().enumerate() {
			let token = first_token + i as u32 + 1;

			<TokenData<T>>::insert(
				(collection.id, token),
				ItemData {
					const_data: data.const_data.into(),
					variable_data: data.variable_data.into(),
					owner: data.owner.clone(),
				},
			);
			<Owned<T>>::insert((collection.id, &data.owner, token), true);

			collection.log_infallible(ERC721Events::Transfer {
				from: H160::default(),
				to: *data.owner.as_eth(),
				token_id: token.into(),
			});
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
			if !assume_implicit_eth {
				// In ERC721 there is only one possible approved user of token, so we set
				// approved user to zero address
				collection.log_infallible(ERC721Events::Approval {
					owner: *sender.as_eth(),
					approved: H160::default(),
					token_id: token.into(),
				});
			}
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
		if collection.access == AccessMode::AllowList {
			collection.check_allowlist(&sender)?;
			if let Some(spender) = spender {
				collection.check_allowlist(&spender)?;
			}
		}

		if let Some(spender) = spender {
			<PalletCommon<T>>::ensure_correct_receiver(spender)?;
		}
		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		if &token_data.owner != sender {
			ensure!(
				collection.ignores_owned_amount(sender)?,
				<CommonError<T>>::CantApproveMoreThanOwned
			);
		}

		// =========

		Self::set_allowance_unchecked(collection, sender, token, spender, false);
		Ok(())
	}

	pub fn transfer_from(
		collection: &NonfungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		to: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		if spender.conv_eq(from) {
			return Self::transfer(collection, from, to, token);
		}
		if collection.access == AccessMode::AllowList {
			// `from`, `to` checked in [`transfer`]
			collection.check_allowlist(spender)?;
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

	pub fn burn_from(
		collection: &NonfungibleHandle<T>,
		spender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		if spender.conv_eq(from) {
			return Self::burn(collection, from, token);
		}
		if collection.access == AccessMode::AllowList {
			// `from` checked in [`burn`]
			collection.check_allowlist(spender)?;
		}

		if <Allowance<T>>::get((collection.id, token)).as_ref() != Some(spender) {
			ensure!(
				collection.ignores_allowance(spender)?,
				<CommonError<T>>::TokenValueNotEnough
			);
		}

		// =========

		Self::burn(collection, &from, token)
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
		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		collection.check_can_update_meta(sender, &token_data.owner)?;

		collection.consume_sstore()?;

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
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateItemData<T>,
	) -> DispatchResult {
		Self::create_multiple_items(collection, sender, vec![data])
	}
}
