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

use erc::ERC721Events;
use evm_coder::ToLog;
use frame_support::{BoundedVec, ensure, fail, transactional, storage::with_transaction};
use up_data_structs::{
	AccessMode, CollectionId, CustomDataLimit, TokenId, CreateCollectionData, CreateNftExData,
	mapping::TokenAddressMapping, NestingRule, budget::Budget, Property, PropertyPermission,
	PropertyKey, PropertyKeyPermission, Properties, PropertyScope, TrySetProperty,
};
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use pallet_common::{
	Error as CommonError, Pallet as PalletCommon, Event as CommonEvent, CollectionHandle,
	dispatch::CollectionDispatch,
	eth::collection_id_to_address,
};
use pallet_structure::Pallet as PalletStructure;
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult, TransactionOutcome};
use sp_std::{vec::Vec, vec, collections::btree_set::BTreeSet};
use core::ops::Deref;
use sp_std::collections::btree_map::BTreeMap;
use codec::{Encode, Decode, MaxEncodedLen};
use scale_info::TypeInfo;

pub use pallet::*;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod common;
pub mod erc;
pub mod weights;

pub type CreateItemData<T> = CreateNftExData<<T as pallet_evm::account::Config>::CrossAccountId>;
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

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
		/// Too many children to burn when destroying a collection
		TooManyChildrenToBurn,
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

	#[pallet::storage]
	pub type TokensMinted<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;
	#[pallet::storage]
	pub type TokensBurnt<T: Config> =
		StorageMap<Hasher = Twox64Concat, Key = CollectionId, Value = u32, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub type TokenData<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = ItemData<T::CrossAccountId>,
		QueryKind = OptionQuery,
	>;

	#[pallet::storage]
	#[pallet::getter(fn token_properties)]
	pub type TokenProperties<T: Config> = StorageNMap<
		Key = (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
		Value = Properties,
		QueryKind = ValueQuery,
		OnEmpty = up_data_structs::TokenProperties,
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

	/// Used to enumerate token's children
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

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			if StorageVersion::get::<Pallet<T>>() < StorageVersion::new(1) {
				let mut had_consts = BTreeSet::new();
				<TokenData<T>>::translate::<ItemDataVersion1<T::CrossAccountId>, _>(|(collection, token), v| {
					let mut props = vec![];
					if !v.const_data.is_empty() {
						props.push(Property {
							key: b"_old_constData".to_vec().try_into().unwrap(),
							value: v.const_data.clone().into_inner().try_into().expect("const too long"),
						});
						had_consts.insert(collection);
					}
					if !v.variable_data.is_empty() {
						props.push(Property {
							key: b"_old_variableData".to_vec().try_into().unwrap(),
							value: v.variable_data.clone().into_inner().try_into().expect("variable too long"),
						})
					}
					if !props.is_empty() {
						Self::set_scoped_token_properties(
							collection,
							token,
							PropertyScope::None,
							props.into_iter(),
						).expect("existing token data exceeds property storage");
					}
					Some(<ItemDataVersion2<T::CrossAccountId>>::from(v))
				});
				for collection in had_consts {
					<PalletCommon<T>>::set_property_permission_unchecked(
						collection,
						PropertyKeyPermission {
							key: b"_old_constData".to_vec().try_into().unwrap(),
							permission: PropertyPermission {
								mutable: false,
								collection_admin: true,
								token_owner: false,
							},
						}
					).expect("failed to configure permission");
				}
			}

			0
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
	pub fn total_supply(collection: &NonfungibleHandle<T>) -> u32 {
		<TokensMinted<T>>::get(collection.id) - <TokensBurnt<T>>::get(collection.id)
	}
	pub fn token_exists(collection: &NonfungibleHandle<T>, token: TokenId) -> bool {
		<TokenData<T>>::contains_key((collection.id, token))
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
		properties: impl Iterator<Item=Property>,
	) -> DispatchResult {
		TokenProperties::<T>::try_mutate((collection_id, token_id), |stored_properties| {
			stored_properties.try_scoped_set_from_iter(scope, properties)
		})
		.map_err(<CommonError<T>>::from)?;

		Ok(())
	}

	pub fn current_token_id(collection_id: CollectionId) -> TokenId {
		TokenId(<TokensMinted<T>>::get(collection_id))
	}
}

// unchecked calls skips any permission checks
impl<T: Config> Pallet<T> {
	pub fn init_collection(
		owner: T::AccountId,
		data: CreateCollectionData<T::AccountId>,
	) -> Result<CollectionId, DispatchError> {
		<PalletCommon<T>>::init_collection(owner, data)
	}
	pub fn destroy_collection(
		collection: NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		let id = collection.id;

		// =========

		Self::burn_children_in_collection(id, nesting_budget)?;
		PalletCommon::destroy_collection(collection.0, sender)?;
		<TokenData<T>>::remove_prefix((id,), None);
		<TokenChildren<T>>::remove_prefix((id,), None);
		<Owned<T>>::remove_prefix((id,), None);
		<TokensMinted<T>>::remove(id);
		<TokensBurnt<T>>::remove(id);
		<Allowance<T>>::remove_prefix((id,), None);
		<AccountBalance<T>>::remove_prefix((id,), None);
		Ok(())
	}

	#[transactional]
	fn burn_children_in_collection(collection_id: CollectionId, nesting_budget: &dyn Budget) -> DispatchResult {
		for (parent_id, child) in <TokenChildren<T>>::drain_prefix((collection_id,))
			.map(|((parent_id, child), _)| (parent_id, child)) {

			let parent_address = T::CrossTokenAddressMapping::token_to_address(collection_id, parent_id);
			Self::burn_tree(parent_address, child.0, child.1, nesting_budget)?;
		}

		Ok(())
	}

	fn burn_tree(
		parent: T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
		nesting_budget: &dyn Budget
	) -> DispatchResult {
		if !nesting_budget.consume() {
			return Err(<Error<T>>::TooManyChildrenToBurn.into());
		}

		let handle = <CollectionHandle<T>>::try_get(collection_id)?;
		let handle = T::CollectionDispatch::dispatch(handle);
		let handle = handle.as_dyn();

		let amount = handle.balance(parent.clone(), token_id);

		handle.burn_item_unchecked(&parent, token_id, amount)?;

		for child in <TokenChildren<T>>::drain_prefix((collection_id, token_id)).map(|(child, _)| child) {
			let parent = T::CrossTokenAddressMapping::token_to_address(collection_id, token_id);
			Self::burn_tree(parent, child.0, child.1, nesting_budget)?;
		}

		Ok(())
	}

	pub fn burn(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		let token_data =
			<TokenData<T>>::get((collection.id, token)).ok_or(<CommonError<T>>::TokenNotFound)?;
		ensure!(
			&token_data.owner == sender
				|| (collection.limits.owner_can_transfer() && collection.is_owner_or_admin(sender)),
			<CommonError<T>>::NoPermission
		);

		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(sender)?;
		}

		if Self::token_has_children(collection.id, token) {
			return Err(<Error<T>>::CantBurnNftWithChildren.into());
		}

		let old_spender = <Allowance<T>>::get((collection.id, token));

		// =========

		Self::burn_item_unchecked(collection, &token_data.owner, token)?;

		if let Some(old_spender) = old_spender {
			<PalletCommon<T>>::deposit_event(CommonEvent::Approved(
				collection.id,
				token,
				sender.clone(),
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

	pub fn burn_item_unchecked(
		collection: &NonfungibleHandle<T>,
		owner: &T::CrossAccountId,
		token: TokenId,
	) -> DispatchResult {
		let burnt = <TokensBurnt<T>>::get(collection.id)
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		let balance = <AccountBalance<T>>::get((collection.id, owner.clone()))
			.checked_sub(1)
			.ok_or(ArithmeticError::Overflow)?;

		// =========

		if let Some(owner) = T::CrossTokenAddressMapping::address_to_token(owner) {
			Self::unnest(owner, (collection.id, token));
		}

		if balance == 0 {
			<AccountBalance<T>>::remove((collection.id, owner.clone()));
		} else {
			<AccountBalance<T>>::insert((collection.id, owner.clone()), balance);
		}

		<Owned<T>>::remove((collection.id, owner, token));
		<TokensBurnt<T>>::insert(collection.id, burnt);
		<TokenData<T>>::remove((collection.id, token));
		<TokenProperties<T>>::remove((collection.id, token));
		<Allowance<T>>::remove((collection.id, token));

		Ok(())
	}

	pub fn set_token_property(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		property: Property,
	) -> DispatchResult {
		Self::check_token_change_permission(collection, sender, token_id, &property.key)?;

		<TokenProperties<T>>::try_mutate((collection.id, token_id), |properties| {
			let property = property.clone();
			properties.try_set(property.key, property.value)
		})
		.map_err(<CommonError<T>>::from)?;

		<PalletCommon<T>>::deposit_event(CommonEvent::TokenPropertySet(
			collection.id,
			token_id,
			property.key,
		));

		Ok(())
	}

	#[transactional]
	pub fn set_token_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		properties: Vec<Property>,
	) -> DispatchResult {
		for property in properties {
			Self::set_token_property(collection, sender, token_id, property)?;
		}

		Ok(())
	}

	pub fn delete_token_property(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		property_key: PropertyKey,
	) -> DispatchResult {
		Self::check_token_change_permission(collection, sender, token_id, &property_key)?;

		<TokenProperties<T>>::try_mutate((collection.id, token_id), |properties| {
			properties.remove(&property_key)
		})
		.map_err(<CommonError<T>>::from)?;

		<PalletCommon<T>>::deposit_event(CommonEvent::TokenPropertyDeleted(
			collection.id,
			token_id,
			property_key,
		));

		Ok(())
	}

	fn check_token_change_permission(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		property_key: &PropertyKey,
	) -> DispatchResult {
		let permission = <PalletCommon<T>>::property_permissions(collection.id)
			.get(property_key)
			.cloned()
			.unwrap_or_else(PropertyPermission::none);

		let token_data = <TokenData<T>>::get((collection.id, token_id))
			.ok_or(<CommonError<T>>::TokenNotFound)?;

		let check_token_owner = || -> DispatchResult {
			ensure!(&token_data.owner == sender, <CommonError<T>>::NoPermission);
			Ok(())
		};

		let is_property_exists = TokenProperties::<T>::get((collection.id, token_id))
			.get(property_key)
			.is_some();

		match permission {
			PropertyPermission { mutable: false, .. } if is_property_exists => {
				Err(<CommonError<T>>::NoPermission.into())
			}

			PropertyPermission {
				collection_admin,
				token_owner,
				..
			} => {
				let mut check_result = Err(<CommonError<T>>::NoPermission.into());

				if collection_admin {
					check_result = collection.check_is_owner_or_admin(sender);
				}

				if token_owner {
					check_result.or_else(|_| check_token_owner())
				} else {
					check_result
				}
			}
		}
	}

	#[transactional]
	pub fn delete_token_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResult {
		for key in property_keys {
			Self::delete_token_property(collection, sender, token_id, key)?;
		}

		Ok(())
	}

	pub fn set_collection_properties(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_collection_properties(collection, sender, properties)
	}

	pub fn delete_collection_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResult {
		<PalletCommon<T>>::delete_collection_properties(collection, sender, property_keys)
	}

	pub fn set_property_permissions(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		<PalletCommon<T>>::set_property_permissions(collection, sender, property_permissions)
	}

	pub fn set_property_permission(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		permission: PropertyKeyPermission,
	) -> DispatchResult {
		<PalletCommon<T>>::set_property_permission(collection, sender, permission)
	}

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
		// TODO: require sender to be token, owner, require admins to go through transfer_from
		ensure!(
			&token_data.owner == from
				|| (collection.limits.owner_can_transfer() && collection.is_owner_or_admin(from)),
			<CommonError<T>>::NoPermission
		);

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

		<PalletStructure<T>>::try_nest_if_sent_to_token(
			from.clone(),
			to,
			collection.id,
			token,
			nesting_budget
		)?;

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

				<PalletStructure<T>>::nest_if_sent_to_token(&data.owner, collection.id, TokenId(token));

				if let Err(e) = Self::set_token_properties(
					collection,
					sender,
					TokenId(token),
					data.properties.clone().into_inner(),
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
			return Ok(());
		}
		if <Allowance<T>>::get((collection.id, token)).as_ref() == Some(spender) {
			return Ok(());
		}
		ensure!(
			collection.ignores_allowance(spender),
			<CommonError<T>>::ApprovedValueTooLow
		);
		Ok(())
	}

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

	pub fn check_nesting(
		handle: &NonfungibleHandle<T>,
		sender: T::CrossAccountId,
		from: (CollectionId, TokenId),
		under: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		fn ensure_sender_allowed<T: Config>(
			collection: CollectionId,
			token: TokenId,
			for_nest: (CollectionId, TokenId),
			sender: T::CrossAccountId,
			budget: &dyn Budget,
		) -> DispatchResult {
			ensure!(
				<PalletStructure<T>>::check_indirectly_owned(
					sender,
					collection,
					token,
					Some(for_nest),
					budget
				)?,
				<CommonError<T>>::OnlyOwnerAllowedToNest,
			);
			Ok(())
		}
		match handle.permissions.nesting() {
			NestingRule::Disabled => fail!(<CommonError<T>>::NestingIsDisabled),
			NestingRule::Owner => {
				ensure_sender_allowed::<T>(handle.id, under, from, sender, nesting_budget)?
			}
			NestingRule::OwnerRestricted(whitelist) => {
				ensure!(
					whitelist.contains(&from.0),
					<CommonError<T>>::SourceCollectionIsNotAllowedToNest
				);
				ensure_sender_allowed::<T>(handle.id, under, from, sender, nesting_budget)?
			}
		}
		Ok(())
	}

	fn nest(
		under: (CollectionId, TokenId),
		to_nest: (CollectionId, TokenId),
	) {
		<TokenChildren<T>>::insert(
			(under.0, under.1, (to_nest.0, to_nest.1)),
			true
		);
	}

	fn unnest(
		under: (CollectionId, TokenId),
		to_unnest: (CollectionId, TokenId),
	) {
		<TokenChildren<T>>::remove(
			(under.0, under.1, to_unnest)
		);
	}

	fn token_has_children(collection_id: CollectionId, token_id: TokenId) -> bool {
		<TokenChildren<T>>::iter_prefix((collection_id, token_id)).next().is_some()
	}

	/// Delegated to `create_multiple_items`
	pub fn create_item(
		collection: &NonfungibleHandle<T>,
		sender: &T::CrossAccountId,
		data: CreateItemData<T>,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::create_multiple_items(collection, sender, vec![data], nesting_budget)
	}
}
