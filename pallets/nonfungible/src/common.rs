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

use frame_support::{dispatch::DispatchResultWithPostInfo, ensure, fail, weights::Weight};
use up_data_structs::{
	TokenId, CreateItemExData, CollectionId, budget::Budget, Property, PropertyKey,
	PropertyKeyPermission, PropertyValue,
};
use pallet_common::{
	CommonCollectionOperations, CommonWeightInfo, with_weight, weights::WeightInfo as _,
};
use sp_runtime::DispatchError;
use sp_std::vec::Vec;

use crate::{
	AccountBalance, Allowance, Config, CreateItemData, Error, NonfungibleHandle, Owned, Pallet,
	SelfWeightOf, TokenData, weights::WeightInfo, TokensMinted,
};

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
	fn create_item() -> Weight {
		<SelfWeightOf<T>>::create_item()
	}

	fn create_multiple_items_ex(data: &CreateItemExData<T::CrossAccountId>) -> Weight {
		match data {
			CreateItemExData::NFT(t) => {
				<SelfWeightOf<T>>::create_multiple_items_ex(t.len() as u32)
					+ t.iter()
						.map(|t| {
							if t.properties.len() > 0 {
								Self::set_token_properties(t.properties.len() as u32)
							} else {
								0
							}
						})
						.sum::<u64>()
			}
			_ => 0,
		}
	}

	fn create_multiple_items(data: &[up_data_structs::CreateItemData]) -> Weight {
		<SelfWeightOf<T>>::create_multiple_items(data.len() as u32)
			+ data
				.iter()
				.filter_map(|t| match t {
					up_data_structs::CreateItemData::NFT(n) if n.properties.len() > 0 => {
						Some(Self::set_token_properties(n.properties.len() as u32))
					}
					_ => None,
				})
				.sum::<u64>()
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

	fn set_token_properties(amount: u32) -> Weight {
		<SelfWeightOf<T>>::set_token_properties(amount)
	}

	fn delete_token_properties(amount: u32) -> Weight {
		<SelfWeightOf<T>>::delete_token_properties(amount)
	}

	fn set_property_permissions(amount: u32) -> Weight {
		<SelfWeightOf<T>>::set_property_permissions(amount)
	}

	fn transfer() -> Weight {
		<SelfWeightOf<T>>::transfer()
	}

	fn approve() -> Weight {
		<SelfWeightOf<T>>::approve()
	}

	fn transfer_from() -> Weight {
		<SelfWeightOf<T>>::transfer_from()
	}

	fn burn_from() -> Weight {
		<SelfWeightOf<T>>::burn_from()
	}
}

fn map_create_data<T: Config>(
	data: up_data_structs::CreateItemData,
	to: &T::CrossAccountId,
) -> Result<CreateItemData<T>, DispatchError> {
	match data {
		up_data_structs::CreateItemData::NFT(data) => Ok(CreateItemData::<T> {
			properties: data.properties,
			owner: to.clone(),
		}),
		_ => fail!(<Error<T>>::NotNonfungibleDataUsedToMintFungibleCollectionToken),
	}
}

impl<T: Config> CommonCollectionOperations<T> for NonfungibleHandle<T> {
	fn create_item(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: up_data_structs::CreateItemData,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::create_item(
				self,
				&sender,
				map_create_data::<T>(data, &to)?,
				nesting_budget,
			),
			<CommonWeights<T>>::create_item(),
		)
	}

	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<up_data_structs::CreateItemData>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::create_multiple_items(&data);
		let data = data
			.into_iter()
			.map(|d| map_create_data::<T>(d, &to))
			.collect::<Result<Vec<_>, DispatchError>>()?;

		with_weight(
			<Pallet<T>>::create_multiple_items(self, &sender, data, nesting_budget),
			weight,
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
			up_data_structs::CreateItemExData::NFT(nft) => nft,
			_ => fail!(Error::<T>::NotNonfungibleDataUsedToMintFungibleCollectionToken),
		};

		with_weight(
			<Pallet<T>>::create_multiple_items(self, &sender, data.into_inner(), nesting_budget),
			weight,
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
		sender: T::CrossAccountId,
		token_id: TokenId,
		properties: Vec<Property>,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::set_token_properties(properties.len() as u32);

		with_weight(
			<Pallet<T>>::set_token_properties(self, &sender, token_id, properties),
			weight,
		)
	}

	fn delete_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::delete_token_properties(property_keys.len() as u32);

		with_weight(
			<Pallet<T>>::delete_token_properties(self, &sender, token_id, property_keys),
			weight,
		)
	}

	fn set_property_permissions(
		&self,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResultWithPostInfo {
		let weight =
			<CommonWeights<T>>::set_property_permissions(property_permissions.len() as u32);

		with_weight(
			<Pallet<T>>::set_property_permissions(self, sender, property_permissions),
			weight,
		)
	}

	fn burn_item(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		ensure!(amount <= 1, <Error<T>>::NonfungibleItemsHaveNoAmount);
		if amount == 1 {
			with_weight(
				<Pallet<T>>::burn(self, &sender, token),
				<CommonWeights<T>>::burn_item(),
			)
		} else {
			Ok(().into())
		}
	}

	fn transfer(
		&self,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(amount <= 1, <Error<T>>::NonfungibleItemsHaveNoAmount);
		if amount == 1 {
			with_weight(
				<Pallet<T>>::transfer(self, &from, &to, token, nesting_budget),
				<CommonWeights<T>>::transfer(),
			)
		} else {
			Ok(().into())
		}
	}

	fn approve(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(amount <= 1, <Error<T>>::NonfungibleItemsHaveNoAmount);

		with_weight(
			if amount == 1 {
				<Pallet<T>>::set_allowance(self, &sender, token, Some(&spender), nesting_budget)
			} else {
				<Pallet<T>>::set_allowance(self, &sender, token, None, nesting_budget)
			},
			<CommonWeights<T>>::approve(),
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
		ensure!(amount <= 1, <Error<T>>::NonfungibleItemsHaveNoAmount);

		if amount == 1 {
			with_weight(
				<Pallet<T>>::transfer_from(self, &sender, &from, &to, token, nesting_budget),
				<CommonWeights<T>>::transfer_from(),
			)
		} else {
			Ok(().into())
		}
	}

	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(amount <= 1, <Error<T>>::NonfungibleItemsHaveNoAmount);

		if amount == 1 {
			with_weight(
				<Pallet<T>>::burn_from(self, &sender, &from, token, nesting_budget),
				<CommonWeights<T>>::burn_from(),
			)
		} else {
			Ok(().into())
		}
	}

	fn check_nesting(
		&self,
		sender: T::CrossAccountId,
		from: (CollectionId, TokenId),
		under: TokenId,
		budget: &dyn Budget,
	) -> sp_runtime::DispatchResult {
		<Pallet<T>>::check_nesting(self, sender, from, under, budget)
	}

	fn nest(&self, under: TokenId, to_nest: (CollectionId, TokenId)) {
		<Pallet<T>>::nest((self.id, under), to_nest);
	}

	fn unnest(&self, under: TokenId, to_unnest: (CollectionId, TokenId)) {
		<Pallet<T>>::unnest((self.id, under), to_unnest);
	}

	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId> {
		<Owned<T>>::iter_prefix((self.id, account))
			.map(|(id, _)| id)
			.collect()
	}

	fn collection_tokens(&self) -> Vec<TokenId> {
		<TokenData<T>>::iter_prefix((self.id,))
			.map(|(id, _)| id)
			.collect()
	}

	fn token_exists(&self, token: TokenId) -> bool {
		<Pallet<T>>::token_exists(self, token)
	}

	fn last_token_id(&self) -> TokenId {
		TokenId(<TokensMinted<T>>::get(self.id))
	}

	fn token_owner(&self, token: TokenId) -> Option<T::CrossAccountId> {
		<TokenData<T>>::get((self.id, token)).map(|t| t.owner)
	}

	fn token_property(&self, token_id: TokenId, key: &PropertyKey) -> Option<PropertyValue> {
		<Pallet<T>>::token_properties((self.id, token_id))
			.get(key)
			.cloned()
	}

	fn token_properties(&self, token_id: TokenId, keys: Option<Vec<PropertyKey>>) -> Vec<Property> {
		let properties = <Pallet<T>>::token_properties((self.id, token_id));

		keys.map(|keys| {
			keys.into_iter()
				.filter_map(|key| {
					properties.get(&key).map(|value| Property {
						key,
						value: value.clone(),
					})
				})
				.collect()
		})
		.unwrap_or_else(|| {
			properties
				.into_iter()
				.map(|(key, value)| Property { key, value })
				.collect()
		})
	}

	fn total_supply(&self) -> u32 {
		<Pallet<T>>::total_supply(self)
	}

	fn account_balance(&self, account: T::CrossAccountId) -> u32 {
		<AccountBalance<T>>::get((self.id, account))
	}

	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128 {
		if <TokenData<T>>::get((self.id, token))
			.map(|a| a.owner == account)
			.unwrap_or(false)
		{
			1
		} else {
			0
		}
	}

	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128 {
		if <TokenData<T>>::get((self.id, token))
			.map(|a| a.owner != sender)
			.unwrap_or(true)
		{
			0
		} else if <Allowance<T>>::get((self.id, token)) == Some(spender) {
			1
		} else {
			0
		}
	}
}
