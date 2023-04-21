use alloc::vec::Vec;
use core::marker::PhantomData;
use crate::{Config, NativeFungibleHandle};
use pallet_common::{CommonCollectionOperations, CommonWeightInfo};

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
	fn create_multiple_items(
		amount: &[up_data_structs::CreateItemData],
	) -> frame_support::weights::Weight {
		todo!()
	}

	fn create_multiple_items_ex(
		cost: &up_data_structs::CreateItemExData<T::CrossAccountId>,
	) -> frame_support::weights::Weight {
		todo!()
	}

	fn burn_item() -> frame_support::weights::Weight {
		todo!()
	}

	fn set_collection_properties(amount: u32) -> frame_support::weights::Weight {
		todo!()
	}

	fn delete_collection_properties(amount: u32) -> frame_support::weights::Weight {
		todo!()
	}

	fn set_token_properties(amount: u32) -> frame_support::weights::Weight {
		todo!()
	}

	fn delete_token_properties(amount: u32) -> frame_support::weights::Weight {
		todo!()
	}

	fn set_token_property_permissions(amount: u32) -> frame_support::weights::Weight {
		todo!()
	}

	fn transfer() -> frame_support::weights::Weight {
		todo!()
	}

	fn approve() -> frame_support::weights::Weight {
		todo!()
	}

	fn approve_from() -> frame_support::weights::Weight {
		todo!()
	}

	fn transfer_from() -> frame_support::weights::Weight {
		todo!()
	}

	fn burn_from() -> frame_support::weights::Weight {
		todo!()
	}

	fn burn_recursively_self_raw() -> frame_support::weights::Weight {
		todo!()
	}

	fn burn_recursively_breadth_raw(amount: u32) -> frame_support::weights::Weight {
		todo!()
	}

	fn token_owner() -> frame_support::weights::Weight {
		todo!()
	}

	fn set_allowance_for_all() -> frame_support::weights::Weight {
		todo!()
	}

	fn force_repair_item() -> frame_support::weights::Weight {
		todo!()
	}
}

/// Implementation of `CommonCollectionOperations` for `FungibleHandle`. It wraps FungibleHandle Pallete
/// methods and adds weight info.
impl<T: Config> CommonCollectionOperations<T> for NativeFungibleHandle<T> {
	fn create_item(
		&self,
		sender: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		data: up_data_structs::CreateItemData,
		nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn create_multiple_items(
		&self,
		sender: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		data: Vec<up_data_structs::CreateItemData>,
		nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn create_multiple_items_ex(
		&self,
		sender: <T>::CrossAccountId,
		data: up_data_structs::CreateItemExData<<T>::CrossAccountId>,
		nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn burn_item(
		&self,
		sender: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
		amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn burn_item_recursively(
		&self,
		sender: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
		self_budget: &dyn up_data_structs::budget::Budget,
		breadth_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn set_collection_properties(
		&self,
		sender: <T>::CrossAccountId,
		properties: Vec<up_data_structs::Property>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn delete_collection_properties(
		&self,
		sender: &<T>::CrossAccountId,
		property_keys: Vec<up_data_structs::PropertyKey>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn set_token_properties(
		&self,
		sender: <T>::CrossAccountId,
		token_id: up_data_structs::TokenId,
		properties: Vec<up_data_structs::Property>,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn delete_token_properties(
		&self,
		sender: <T>::CrossAccountId,
		token_id: up_data_structs::TokenId,
		property_keys: Vec<up_data_structs::PropertyKey>,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn set_token_property_permissions(
		&self,
		sender: &<T>::CrossAccountId,
		property_permissions: Vec<up_data_structs::PropertyKeyPermission>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn transfer(
		&self,
		sender: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
		amount: u128,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn approve(
		&self,
		sender: <T>::CrossAccountId,
		spender: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
		amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn approve_from(
		&self,
		sender: <T>::CrossAccountId,
		from: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
		amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn transfer_from(
		&self,
		sender: <T>::CrossAccountId,
		from: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
		amount: u128,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn burn_from(
		&self,
		sender: <T>::CrossAccountId,
		from: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
		amount: u128,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn check_nesting(
		&self,
		sender: <T>::CrossAccountId,
		from: (up_data_structs::CollectionId, up_data_structs::TokenId),
		under: up_data_structs::TokenId,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::sp_runtime::DispatchResult {
		todo!()
	}

	fn nest(
		&self,
		under: up_data_structs::TokenId,
		to_nest: (up_data_structs::CollectionId, up_data_structs::TokenId),
	) {
		todo!()
	}

	fn unnest(
		&self,
		under: up_data_structs::TokenId,
		to_nest: (up_data_structs::CollectionId, up_data_structs::TokenId),
	) {
		todo!()
	}

	fn account_tokens(&self, account: <T>::CrossAccountId) -> Vec<up_data_structs::TokenId> {
		todo!()
	}

	fn collection_tokens(&self) -> Vec<up_data_structs::TokenId> {
		todo!()
	}

	fn token_exists(&self, token: up_data_structs::TokenId) -> bool {
		todo!()
	}

	fn last_token_id(&self) -> up_data_structs::TokenId {
		todo!()
	}

	fn token_owner(
		&self,
		token: up_data_structs::TokenId,
	) -> Result<<T>::CrossAccountId, up_data_structs::TokenOwnerError> {
		todo!()
	}

	fn token_owners(&self, token: up_data_structs::TokenId) -> Vec<<T>::CrossAccountId> {
		todo!()
	}

	fn token_property(
		&self,
		token_id: up_data_structs::TokenId,
		key: &up_data_structs::PropertyKey,
	) -> Option<up_data_structs::PropertyValue> {
		todo!()
	}

	fn token_properties(
		&self,
		token: up_data_structs::TokenId,
		keys: Option<Vec<up_data_structs::PropertyKey>>,
	) -> Vec<up_data_structs::Property> {
		todo!()
	}

	fn total_supply(&self) -> u32 {
		todo!()
	}

	fn account_balance(&self, account: <T>::CrossAccountId) -> u32 {
		todo!()
	}

	fn balance(&self, account: <T>::CrossAccountId, token: up_data_structs::TokenId) -> u128 {
		todo!()
	}

	fn total_pieces(&self, token: up_data_structs::TokenId) -> Option<u128> {
		todo!()
	}

	fn allowance(
		&self,
		sender: <T>::CrossAccountId,
		spender: <T>::CrossAccountId,
		token: up_data_structs::TokenId,
	) -> u128 {
		todo!()
	}

	fn refungible_extensions(&self) -> Option<&dyn pallet_common::RefungibleExtensions<T>> {
		todo!()
	}

	fn set_allowance_for_all(
		&self,
		owner: <T>::CrossAccountId,
		operator: <T>::CrossAccountId,
		approve: bool,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}

	fn allowance_for_all(&self, owner: <T>::CrossAccountId, operator: <T>::CrossAccountId) -> bool {
		todo!()
	}

	fn repair_item(
		&self,
		token: up_data_structs::TokenId,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		todo!()
	}
}
