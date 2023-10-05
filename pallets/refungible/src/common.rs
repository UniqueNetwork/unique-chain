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

use frame_support::{dispatch::DispatchResultWithPostInfo, fail, weights::Weight};
use pallet_common::{
	weights::WeightInfo as _, with_weight, write_token_properties_total_weight,
	CommonCollectionOperations, CommonWeightInfo, RefungibleExtensions,
};
use pallet_structure::Pallet as PalletStructure;
use sp_runtime::DispatchError;
use sp_std::{collections::btree_map::BTreeMap, vec, vec::Vec};
use up_data_structs::{
	budget::Budget, CollectionId, CreateItemExData, CreateRefungibleExMultipleOwners,
	CreateRefungibleExSingleOwner, Property, PropertyKey, PropertyKeyPermission, PropertyValue,
	TokenId, TokenOwnerError,
};

use crate::{
	weights::WeightInfo, AccountBalance, Allowance, Balance, Config, CreateItemData, Error, Owned,
	Pallet, RefungibleHandle, SelfWeightOf, TokenProperties, TokensMinted, TotalSupply,
};

macro_rules! max_weight_of {
	($($method:ident ($($args:tt)*)),*) => {
		Weight::zero()
		$(
			.max(<SelfWeightOf<T>>::$method($($args)*))
		)*
	};
}

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
	fn create_multiple_items(data: &[up_data_structs::CreateItemData]) -> Weight {
		<SelfWeightOf<T>>::create_multiple_items(data.len() as u32).saturating_add(
			write_token_properties_total_weight::<T, _>(
				data.iter().map(|data| match data {
					up_data_structs::CreateItemData::ReFungible(rft_data) => {
						rft_data.properties.len() as u32
					}
					_ => 0,
				}),
				<SelfWeightOf<T>>::write_token_properties,
			),
		)
	}

	fn create_multiple_items_ex(call: &CreateItemExData<T::CrossAccountId>) -> Weight {
		match call {
			CreateItemExData::RefungibleMultipleOwners(i) => {
				<SelfWeightOf<T>>::create_multiple_items_ex_multiple_owners(i.users.len() as u32)
					.saturating_add(write_token_properties_total_weight::<T, _>(
						[i.properties.len() as u32].into_iter(),
						<SelfWeightOf<T>>::write_token_properties,
					))
			}
			CreateItemExData::RefungibleMultipleItems(i) => {
				<SelfWeightOf<T>>::create_multiple_items_ex_multiple_items(i.len() as u32)
					.saturating_add(write_token_properties_total_weight::<T, _>(
						i.iter().map(|d| d.properties.len() as u32),
						<SelfWeightOf<T>>::write_token_properties,
					))
			}
			_ => Weight::zero(),
		}
	}

	fn burn_item() -> Weight {
		max_weight_of!(burn_item_partial(), burn_item_fully())
	}

	fn set_collection_properties(amount: u32) -> Weight {
		<pallet_common::SelfWeightOf<T>>::set_collection_properties(amount)
	}

	fn set_token_properties(amount: u32) -> Weight {
		write_token_properties_total_weight::<T, _>([amount].into_iter(), |amount| {
			<SelfWeightOf<T>>::load_token_properties()
				+ <SelfWeightOf<T>>::write_token_properties(amount)
		})
	}

	fn set_token_property_permissions(amount: u32) -> Weight {
		<SelfWeightOf<T>>::set_token_property_permissions(amount)
	}

	fn transfer() -> Weight {
		max_weight_of!(
			transfer_normal(),
			transfer_creating(),
			transfer_removing(),
			transfer_creating_removing()
		)
	}

	fn approve() -> Weight {
		<SelfWeightOf<T>>::approve()
	}

	fn approve_from() -> Weight {
		<SelfWeightOf<T>>::approve_from()
	}

	fn transfer_from() -> Weight {
		max_weight_of!(
			transfer_from_normal(),
			transfer_from_creating(),
			transfer_from_removing(),
			transfer_from_creating_removing()
		)
	}

	fn burn_from() -> Weight {
		<SelfWeightOf<T>>::burn_from()
	}

	fn set_allowance_for_all() -> Weight {
		<SelfWeightOf<T>>::set_allowance_for_all()
	}

	fn force_repair_item() -> Weight {
		<SelfWeightOf<T>>::repair_item()
	}
}

fn map_create_data<T: Config>(
	data: up_data_structs::CreateItemData,
	to: &T::CrossAccountId,
) -> Result<CreateItemData<T>, DispatchError> {
	match data {
		up_data_structs::CreateItemData::ReFungible(data) => Ok(CreateItemData::<T> {
			users: {
				let mut out = BTreeMap::new();
				out.insert(to.clone(), data.pieces);
				out.try_into().expect("limit > 0")
			},
			properties: data.properties,
		}),
		_ => fail!(<Error<T>>::NotRefungibleDataUsedToMintFungibleCollectionToken),
	}
}

/// Implementation of `CommonCollectionOperations` for `RefungibleHandle`. It wraps Refungible Pallete
/// methods and adds weight info.
impl<T: Config> CommonCollectionOperations<T> for RefungibleHandle<T> {
	fn create_item(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: up_data_structs::CreateItemData,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::create_item(&data);
		with_weight(
			<Pallet<T>>::create_item(
				self,
				&sender,
				map_create_data::<T>(data, &to)?,
				nesting_budget,
			),
			weight,
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
		data: CreateItemExData<T::CrossAccountId>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::create_multiple_items_ex(&data);
		let data = match data {
			CreateItemExData::RefungibleMultipleOwners(CreateRefungibleExMultipleOwners {
				users,
				properties,
			}) => vec![CreateItemData::<T> { users, properties }],
			CreateItemExData::RefungibleMultipleItems(r) => r
				.into_inner()
				.into_iter()
				.map(
					|CreateRefungibleExSingleOwner {
					     user,
					     pieces,
					     properties,
					 }| CreateItemData::<T> {
						users: BTreeMap::from([(user, pieces)])
							.try_into()
							.expect("limit >= 1"),
						properties,
					},
				)
				.collect(),
			_ => fail!(<Error<T>>::NotRefungibleDataUsedToMintFungibleCollectionToken),
		};

		with_weight(
			<Pallet<T>>::create_multiple_items(self, &sender, data, nesting_budget),
			weight,
		)
	}

	fn burn_item(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::burn(self, &sender, token, amount),
			<CommonWeights<T>>::burn_item(),
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
		with_weight(
			<Pallet<T>>::transfer(self, &from, &to, token, amount, nesting_budget),
			<CommonWeights<T>>::transfer(),
		)
	}

	fn approve(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::set_allowance(self, &sender, &spender, token, amount),
			<CommonWeights<T>>::approve(),
		)
	}

	fn approve_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token_id: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::set_allowance_from(self, &sender, &from, &to, token_id, amount),
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
		with_weight(
			<Pallet<T>>::transfer_from(self, &sender, &from, &to, token, amount, nesting_budget),
			<CommonWeights<T>>::transfer_from(),
		)
	}

	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::burn_from(self, &sender, &from, token, amount, nesting_budget),
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
		sender: T::CrossAccountId,
		token_id: TokenId,
		properties: Vec<Property>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::set_token_properties(properties.len() as u32);

		with_weight(
			<Pallet<T>>::set_token_properties(
				self,
				&sender,
				token_id,
				properties.into_iter(),
				nesting_budget,
			),
			weight,
		)
	}

	fn set_token_property_permissions(
		&self,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResultWithPostInfo {
		let weight =
			<CommonWeights<T>>::set_token_property_permissions(property_permissions.len() as u32);

		with_weight(
			<Pallet<T>>::set_token_property_permissions(self, sender, property_permissions),
			weight,
		)
	}

	fn delete_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<PropertyKey>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::delete_token_properties(property_keys.len() as u32);

		with_weight(
			<Pallet<T>>::delete_token_properties(
				self,
				&sender,
				token_id,
				property_keys.into_iter(),
				nesting_budget,
			),
			weight,
		)
	}

	fn get_token_properties_raw(
		&self,
		token_id: TokenId,
	) -> Option<up_data_structs::TokenProperties> {
		<TokenProperties<T>>::get((self.id, token_id))
	}

	fn set_token_properties_raw(&self, token_id: TokenId, map: up_data_structs::TokenProperties) {
		<TokenProperties<T>>::insert((self.id, token_id), map)
	}

	fn check_nesting(
		&self,
		_sender: <T>::CrossAccountId,
		_from: (CollectionId, TokenId),
		_under: TokenId,
		_nesting_budget: &dyn Budget,
	) -> sp_runtime::DispatchResult {
		fail!(<Error<T>>::RefungibleDisallowsNesting)
	}

	fn nest(&self, _under: TokenId, _to_nest: (CollectionId, TokenId)) {}

	fn unnest(&self, _under: TokenId, _to_nest: (CollectionId, TokenId)) {}

	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId> {
		<Owned<T>>::iter_prefix((self.id, account))
			.map(|(id, _)| id)
			.collect()
	}

	fn collection_tokens(&self) -> Vec<TokenId> {
		<TotalSupply<T>>::iter_prefix((self.id,))
			.map(|(id, _)| id)
			.collect()
	}

	fn token_exists(&self, token: TokenId) -> bool {
		<Pallet<T>>::token_exists(self, token)
	}

	fn last_token_id(&self) -> TokenId {
		TokenId(<TokensMinted<T>>::get(self.id))
	}

	fn token_owner(&self, token: TokenId) -> Result<T::CrossAccountId, TokenOwnerError> {
		<Pallet<T>>::token_owner(self.id, token)
	}

	fn check_token_indirect_owner(
		&self,
		token: TokenId,
		maybe_owner: &T::CrossAccountId,
		nesting_budget: &dyn Budget,
	) -> Result<bool, DispatchError> {
		let balance = self.balance(maybe_owner.clone(), token);
		let total_pieces: u128 = <Pallet<T>>::total_pieces(self.id, token).unwrap_or(u128::MAX);
		if balance != total_pieces {
			return Ok(false);
		}

		<PalletStructure<T>>::check_indirectly_owned(
			maybe_owner.clone(),
			self.id,
			token,
			None,
			nesting_budget,
		)
	}

	/// Returns 10 token in no particular order.
	fn token_owners(&self, token: TokenId) -> Vec<T::CrossAccountId> {
		<Pallet<T>>::token_owners(self.id, token).unwrap_or_default()
	}

	fn token_property(&self, token_id: TokenId, key: &PropertyKey) -> Option<PropertyValue> {
		<Pallet<T>>::token_properties((self.id, token_id))?
			.get(key)
			.cloned()
	}

	fn token_properties(&self, token_id: TokenId, keys: Option<Vec<PropertyKey>>) -> Vec<Property> {
		let Some(properties) = <Pallet<T>>::token_properties((self.id, token_id)) else {
			return vec![];
		};

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
		<Balance<T>>::get((self.id, token, account))
	}

	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128 {
		<Allowance<T>>::get((self.id, token, sender, spender))
	}

	fn refungible_extensions(&self) -> Option<&dyn RefungibleExtensions<T>> {
		Some(self)
	}

	fn total_pieces(&self, token: TokenId) -> Option<u128> {
		<Pallet<T>>::total_pieces(self.id, token)
	}

	fn set_allowance_for_all(
		&self,
		owner: T::CrossAccountId,
		operator: T::CrossAccountId,
		approve: bool,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::set_allowance_for_all(self, &owner, &operator, approve),
			<CommonWeights<T>>::set_allowance_for_all(),
		)
	}

	fn allowance_for_all(&self, owner: T::CrossAccountId, operator: T::CrossAccountId) -> bool {
		<Pallet<T>>::allowance_for_all(self, &owner, &operator)
	}

	fn repair_item(&self, token: TokenId) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::repair_item(self, token),
			<CommonWeights<T>>::force_repair_item(),
		)
	}
}

impl<T: Config> RefungibleExtensions<T> for RefungibleHandle<T> {
	fn repartition(
		&self,
		owner: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::repartition(self, owner, token, amount),
			<SelfWeightOf<T>>::repartition_item(),
		)
	}
}
