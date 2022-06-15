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

use sp_std::collections::btree_map::BTreeMap;
use frame_support::{dispatch::DispatchResultWithPostInfo, ensure, fail, weights::Weight, traits::Get};
use up_data_structs::{
	CollectionId, TokenId, CreateItemExData, CreateRefungibleExData, budget::Budget, Property,
	PropertyKey, PropertyValue, PropertyKeyPermission, CreateItemData,
};
use pallet_common::{CommonCollectionOperations, CommonWeightInfo, with_weight};
use pallet_structure::Error as StructureError;
use sp_runtime::DispatchError;
use sp_std::{vec::Vec, vec};

use crate::{
	AccountBalance, Allowance, Balance, Config, Error, Owned, Pallet, RefungibleHandle,
	SelfWeightOf, TokenData, weights::WeightInfo, TokensMinted,
};

macro_rules! max_weight_of {
	($($method:ident ($($args:tt)*)),*) => {
		0
		$(
			.max(<SelfWeightOf<T>>::$method($($args)*))
		)*
	};
}

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
	fn create_item() -> Weight {
		<SelfWeightOf<T>>::create_item()
	}

	fn create_multiple_items(data: &[CreateItemData]) -> Weight {
		<SelfWeightOf<T>>::create_multiple_items(data.len() as u32)
	}

	fn create_multiple_items_ex(call: &CreateItemExData<T::CrossAccountId>) -> Weight {
		match call {
			CreateItemExData::RefungibleMultipleOwners(i) => {
				<SelfWeightOf<T>>::create_multiple_items_ex_multiple_owners(i.users.len() as u32)
			}
			CreateItemExData::RefungibleMultipleItems(i) => {
				<SelfWeightOf<T>>::create_multiple_items_ex_multiple_items(i.len() as u32)
			}
			_ => 0,
		}
	}

	fn burn_item() -> Weight {
		max_weight_of!(burn_item_partial(), burn_item_fully())
	}

	fn set_collection_properties(_amount: u32) -> Weight {
		// Error
		0
	}

	fn delete_collection_properties(_amount: u32) -> Weight {
		// Error
		0
	}

	fn set_token_properties(amount: u32) -> Weight {
		<SelfWeightOf<T>>::set_token_properties(amount)
	}

	fn delete_token_properties(amount: u32) -> Weight {
		<SelfWeightOf<T>>::delete_token_properties(amount)
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

	fn burn_recursively_self_raw() -> Weight {
		// Read to get total balance
		Self::burn_item() + T::DbWeight::get().reads(1)
	}
	fn burn_recursively_breadth_raw(_amount: u32) -> Weight {
		// Refungible token can't have children
		0
	}
}

fn map_create_data<T: Config>(
	data: up_data_structs::CreateItemData,
	to: &T::CrossAccountId,
) -> Result<CreateRefungibleExData<T::CrossAccountId>, DispatchError> {
	match data {
		up_data_structs::CreateItemData::ReFungible(data) => Ok(CreateRefungibleExData {
			const_data: data.const_data,
			users: {
				let mut out = BTreeMap::new();
				out.insert(to.clone(), data.pieces);
				out.try_into().expect("limit > 0")
			},
		}),
		_ => fail!(<Error<T>>::NotRefungibleDataUsedToMintFungibleCollectionToken),
	}
}

impl<T: Config> CommonCollectionOperations<T> for RefungibleHandle<T> {
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
		data: CreateItemExData<T::CrossAccountId>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let weight = <CommonWeights<T>>::create_multiple_items_ex(&data);
		let data = match data {
			CreateItemExData::RefungibleMultipleOwners(r) => vec![r],
			CreateItemExData::RefungibleMultipleItems(r)
				if r.iter().all(|i| i.users.len() == 1) =>
			{
				r.into_inner()
			}
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

	fn burn_item_recursively(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		self_budget: &dyn Budget,
		_breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		ensure!(self_budget.consume(), <StructureError<T>>::DepthLimit,);
		with_weight(
			<Pallet<T>>::burn(
				self,
				&sender,
				token,
				<Balance<T>>::get((self.id, token, &sender)),
			),
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
		_sender: T::CrossAccountId,
		_property: Vec<Property>,
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::SettingPropertiesNotAllowed)
	}

	fn delete_collection_properties(
		&self,
		_sender: &T::CrossAccountId,
		_property_keys: Vec<PropertyKey>,
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::SettingPropertiesNotAllowed)
	}

	fn set_token_properties(
		&self,
		_sender: T::CrossAccountId,
		_token_id: TokenId,
		_property: Vec<Property>,
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
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::SettingPropertiesNotAllowed)
	}

	fn check_nesting(
		&self,
		_sender: <T>::CrossAccountId,
		_from: (CollectionId, TokenId),
		_under: TokenId,
		_budget: &dyn Budget,
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

	fn token_owner(&self, _token: TokenId) -> Option<T::CrossAccountId> {
		None
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
}
