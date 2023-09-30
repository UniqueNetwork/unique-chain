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

use core::marker::PhantomData;

use frame_support::{dispatch::DispatchResultWithPostInfo, ensure, fail, weights::Weight, traits::Get};
use up_data_structs::{
	TokenId, CollectionId, CreateItemExData, budget::Budget, CreateItemData, TokenOwnerError,
};
use pallet_common::{
	CommonCollectionOperations, CommonWeightInfo, RefungibleExtensions, with_weight,
	weights::WeightInfo as _, SelfWeightOf as PalletCommonWeightOf,
};
use pallet_structure::Error as StructureError;
use sp_runtime::{ArithmeticError, DispatchError};
use sp_std::{vec::Vec, vec};
use up_data_structs::{Property, PropertyKey, PropertyValue, PropertyKeyPermission};

use crate::{
	Allowance, TotalSupply, Balance, Config, Error, FungibleHandle, Pallet, SelfWeightOf,
	weights::WeightInfo,
};

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
	fn create_multiple_items(_data: &[CreateItemData]) -> Weight {
		// All items minted for the same user, so it works same as create_item
		<SelfWeightOf<T>>::create_item()
	}

	fn create_multiple_items_ex(data: &CreateItemExData<T::CrossAccountId>) -> Weight {
		match data {
			CreateItemExData::Fungible(f) => {
				<SelfWeightOf<T>>::create_multiple_items_ex(f.len() as u32)
			}
			_ => Weight::zero(),
		}
	}

	fn burn_item() -> Weight {
		<SelfWeightOf<T>>::burn_item()
	}

	fn set_collection_properties(amount: u32) -> Weight {
		<pallet_common::SelfWeightOf<T>>::set_collection_properties(amount)
	}

	fn delete_collection_properties(amount: u32) -> Weight {
		<pallet_common::SelfWeightOf<T>>::delete_collection_properties(amount)
	}

	fn set_token_properties(_amount: u32) -> Weight {
		// Error
		Weight::zero()
	}

	fn delete_token_properties(_amount: u32) -> Weight {
		// Error
		Weight::zero()
	}

	fn set_token_property_permissions(_amount: u32) -> Weight {
		// Error
		Weight::zero()
	}

	fn transfer() -> Weight {
		<SelfWeightOf<T>>::transfer_raw() + <PalletCommonWeightOf<T>>::check_accesslist() * 2
	}

	fn approve() -> Weight {
		<SelfWeightOf<T>>::approve()
	}

	fn approve_from() -> Weight {
		<SelfWeightOf<T>>::approve_from()
	}

	fn transfer_from() -> Weight {
		Self::transfer()
			+ <SelfWeightOf<T>>::check_allowed_raw()
			+ <SelfWeightOf<T>>::set_allowance_unchecked_raw()
	}

	fn burn_from() -> Weight {
		<SelfWeightOf<T>>::burn_from()
	}

	fn burn_recursively_self_raw() -> Weight {
		// Read to get total balance
		Self::burn_item() + T::DbWeight::get().reads(1)
	}

	fn burn_recursively_breadth_raw(_amount: u32) -> Weight {
		// Fungible tokens can't have children
		Weight::zero()
	}

	fn token_owner() -> Weight {
		Weight::zero()
	}

	fn set_allowance_for_all() -> Weight {
		Weight::zero()
	}

	fn force_repair_item() -> Weight {
		Weight::zero()
	}
}

/// Implementation of `CommonCollectionOperations` for `FungibleHandle`. It wraps FungibleHandle Pallete
/// methods and adds weight info.
impl<T: Config> CommonCollectionOperations<T> for FungibleHandle<T> {
	fn create_item(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: up_data_structs::CreateItemData,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		match &data {
			up_data_structs::CreateItemData::Fungible(fungible_data) => with_weight(
				<Pallet<T>>::create_item(self, &sender, (to, fungible_data.value), nesting_budget),
				<CommonWeights<T>>::create_item(&data),
			),
			_ => fail!(<Error<T>>::NotFungibleDataUsedToMintFungibleCollectionToken),
		}
	}

	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<up_data_structs::CreateItemData>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let mut sum: u128 = 0;
		for data in &data {
			match &data {
				up_data_structs::CreateItemData::Fungible(data) => {
					sum = sum
						.checked_add(data.value)
						.ok_or(ArithmeticError::Overflow)?;
				}
				_ => fail!(<Error<T>>::NotFungibleDataUsedToMintFungibleCollectionToken),
			}
		}

		with_weight(
			<Pallet<T>>::create_item(self, &sender, (to, sum), nesting_budget),
			<CommonWeights<T>>::create_multiple_items(&data),
		)
	}

	fn create_multiple_items_ex(
		&self,
		sender: <T>::CrossAccountId,
		data: up_data_structs::CreateItemExData<<T>::CrossAccountId>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::create_multiple_items_ex(&data);
		let data = match data {
			up_data_structs::CreateItemExData::Fungible(f) => f,
			_ => fail!(<Error<T>>::NotFungibleDataUsedToMintFungibleCollectionToken),
		};

		with_weight(
			<Pallet<T>>::create_multiple_items(self, &sender, data.into_inner(), nesting_budget),
			weight,
		)
	}

	fn burn_item(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		with_weight(
			<Pallet<T>>::burn(self, &sender, amount),
			<CommonWeights<T>>::burn_item(),
		)
	}

	fn burn_item_recursively(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		self_budget: &dyn Budget,
		_breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		// Should not happen?
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);
		ensure!(self_budget.consume(), <StructureError<T>>::DepthLimit,);

		with_weight(
			<Pallet<T>>::burn(self, &sender, <Balance<T>>::get((self.id, &sender))),
			<CommonWeights<T>>::burn_recursively_self_raw(),
		)
	}

	fn transfer(
		&self,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		<Pallet<T>>::transfer(self, &from, &to, amount, nesting_budget)
	}

	fn approve(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		with_weight(
			<Pallet<T>>::set_allowance(self, &sender, &spender, amount),
			<CommonWeights<T>>::approve(),
		)
	}

	fn approve_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		with_weight(
			<Pallet<T>>::set_allowance_from(self, &sender, &from, &to, amount),
			<CommonWeights<T>>::approve_from(),
		)
	}

	fn transfer_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		<Pallet<T>>::transfer_from(self, &sender, &from, &to, amount, nesting_budget)
	}

	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		with_weight(
			<Pallet<T>>::burn_from(self, &sender, &from, amount, nesting_budget),
			<CommonWeights<T>>::burn_from(),
		)
	}

	fn set_collection_properties(
		&self,
		sender: T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::set_collection_properties(properties.len() as u32);

		with_weight(
			<Pallet<T>>::set_collection_properties(self, &sender, properties),
			weight,
		)
	}

	fn delete_collection_properties(
		&self,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::delete_collection_properties(property_keys.len() as u32);

		with_weight(
			<Pallet<T>>::delete_collection_properties(self, sender, property_keys),
			weight,
		)
	}

	fn set_token_properties(
		&self,
		_sender: T::CrossAccountId,
		_token_id: TokenId,
		_property: Vec<Property>,
		_nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::SettingPropertiesNotAllowed)
	}

	fn set_token_property_permissions(
		&self,
		_sender: &T::CrossAccountId,
		_property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::SettingPropertiesNotAllowed)
	}

	fn delete_token_properties(
		&self,
		_sender: T::CrossAccountId,
		_token_id: TokenId,
		_property_keys: Vec<PropertyKey>,
		_nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::SettingPropertiesNotAllowed)
	}

	fn get_token_properties_map(&self, _token_id: TokenId) -> up_data_structs::TokenProperties {
		// No token properties are defined on fungibles
		up_data_structs::TokenProperties::new()
	}

	fn set_token_properties_map(&self, _token_id: TokenId, _map: up_data_structs::TokenProperties) {
		// No token properties are defined on fungibles
	}

	fn properties_exist(&self, _token: TokenId) -> bool {
		// No token properties are defined on fungibles
		false
	}

	fn check_nesting(
		&self,
		_sender: <T>::CrossAccountId,
		_from: (CollectionId, TokenId),
		_under: TokenId,
		_nesting_budget: &dyn Budget,
	) -> sp_runtime::DispatchResult {
		fail!(<Error<T>>::FungibleDisallowsNesting)
	}

	fn nest(&self, _under: TokenId, _to_nest: (CollectionId, TokenId)) {}

	fn unnest(&self, _under: TokenId, _to_nest: (CollectionId, TokenId)) {}

	fn collection_tokens(&self) -> Vec<TokenId> {
		vec![TokenId::default()]
	}

	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId> {
		if <Balance<T>>::get((self.id, account)) != 0 {
			vec![TokenId::default()]
		} else {
			vec![]
		}
	}

	fn token_exists(&self, token: TokenId) -> bool {
		token == TokenId::default()
	}

	fn last_token_id(&self) -> TokenId {
		TokenId::default()
	}

	fn token_owner(&self, _token: TokenId) -> Result<T::CrossAccountId, TokenOwnerError> {
		Err(TokenOwnerError::MultipleOwners)
	}

	fn check_token_indirect_owner(
		&self,
		_token: TokenId,
		_maybe_owner: &T::CrossAccountId,
		_nesting_budget: &dyn Budget,
	) -> Result<bool, DispatchError> {
		Ok(false)
	}

	/// Returns 10 tokens owners in no particular order.
	fn token_owners(&self, token: TokenId) -> Vec<T::CrossAccountId> {
		<Pallet<T>>::token_owners(self.id, token).unwrap_or_default()
	}

	fn token_property(&self, _token_id: TokenId, _key: &PropertyKey) -> Option<PropertyValue> {
		None
	}

	fn token_properties(
		&self,
		_token_id: TokenId,
		_keys: Option<Vec<PropertyKey>>,
	) -> Vec<Property> {
		Vec::new()
	}

	fn total_supply(&self) -> u32 {
		1
	}

	fn account_balance(&self, account: T::CrossAccountId) -> u32 {
		if <Balance<T>>::get((self.id, account)) != 0 {
			1
		} else {
			0
		}
	}

	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128 {
		if token != TokenId::default() {
			return 0;
		}
		<Balance<T>>::get((self.id, account))
	}

	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128 {
		if token != TokenId::default() {
			return 0;
		}
		<Allowance<T>>::get((self.id, sender, spender))
	}

	fn refungible_extensions(&self) -> Option<&dyn RefungibleExtensions<T>> {
		None
	}

	fn total_pieces(&self, token: TokenId) -> Option<u128> {
		if token != TokenId::default() {
			return None;
		}
		<TotalSupply<T>>::try_get(self.id).ok()
	}

	fn set_allowance_for_all(
		&self,
		_owner: T::CrossAccountId,
		_operator: T::CrossAccountId,
		_approve: bool,
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::SettingAllowanceForAllNotAllowed)
	}

	fn allowance_for_all(&self, _owner: T::CrossAccountId, _operator: T::CrossAccountId) -> bool {
		false
	}

	/// Repairs a possibly broken item.
	fn repair_item(&self, _token: TokenId) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::FungibleTokensAreAlwaysValid)
	}
}
