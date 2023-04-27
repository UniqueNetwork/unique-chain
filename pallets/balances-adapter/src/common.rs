use alloc::{vec, vec::Vec};
use core::marker::PhantomData;
use crate::{Config, NativeFungibleHandle};
use frame_support::{
	traits::{Currency, ExistenceRequirement},
	fail,
};
use pallet_common::{erc::CrossAccountId, CommonCollectionOperations, CommonWeightInfo, with_weight};
use up_data_structs::TokenId;

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
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn create_multiple_items(
		&self,
		sender: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		data: Vec<up_data_structs::CreateItemData>,
		nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn create_multiple_items_ex(
		&self,
		sender: <T>::CrossAccountId,
		data: up_data_structs::CreateItemExData<<T>::CrossAccountId>,
		nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn burn_item(
		&self,
		sender: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn burn_item_recursively(
		&self,
		sender: <T>::CrossAccountId,
		token: TokenId,
		self_budget: &dyn up_data_structs::budget::Budget,
		breadth_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn set_collection_properties(
		&self,
		sender: <T>::CrossAccountId,
		properties: Vec<up_data_structs::Property>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn delete_collection_properties(
		&self,
		sender: &<T>::CrossAccountId,
		property_keys: Vec<up_data_structs::PropertyKey>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn set_token_properties(
		&self,
		sender: <T>::CrossAccountId,
		token_id: TokenId,
		properties: Vec<up_data_structs::Property>,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn delete_token_properties(
		&self,
		sender: <T>::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<up_data_structs::PropertyKey>,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn set_token_property_permissions(
		&self,
		sender: &<T>::CrossAccountId,
		property_permissions: Vec<up_data_structs::PropertyKeyPermission>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn transfer(
		&self,
		sender: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		with_weight(
			<T as Config>::Currency::transfer(
				sender.as_sub(),
				to.as_sub(),
				amount.into(),
				ExistenceRequirement::KeepAlive,
			),
			Default::default(),
		)
	}

	fn approve(
		&self,
		sender: <T>::CrossAccountId,
		spender: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn approve_from(
		&self,
		sender: <T>::CrossAccountId,
		from: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn transfer_from(
		&self,
		sender: <T>::CrossAccountId,
		from: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		if sender != from {
			fail!(<pallet_common::Error<T>>::NoPermission);
		}
		with_weight(
			<T as Config>::Currency::transfer(
				from.as_sub(),
				to.as_sub(),
				amount.into(),
				ExistenceRequirement::KeepAlive,
			),
			Default::default(),
		)
	}

	fn burn_from(
		&self,
		sender: <T>::CrossAccountId,
		from: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn check_nesting(
		&self,
		sender: <T>::CrossAccountId,
		from: (up_data_structs::CollectionId, TokenId),
		under: TokenId,
		budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::sp_runtime::DispatchResult {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn nest(&self, under: TokenId, to_nest: (up_data_structs::CollectionId, TokenId)) {}

	fn unnest(&self, under: TokenId, to_nest: (up_data_structs::CollectionId, TokenId)) {}

	fn account_tokens(&self, account: <T>::CrossAccountId) -> Vec<TokenId> {
		let balance = <T as Config>::Currency::total_balance(account.as_sub());
		if balance != 0 {
			vec![TokenId::default()]
		} else {
			vec![]
		}
	}

	fn collection_tokens(&self) -> Vec<TokenId> {
		vec![TokenId::default()]
	}

	fn token_exists(&self, token: TokenId) -> bool {
		token == TokenId::default()
	}

	fn last_token_id(&self) -> TokenId {
		TokenId::default()
	}

	fn token_owner(
		&self,
		token: TokenId,
	) -> Result<<T>::CrossAccountId, up_data_structs::TokenOwnerError> {
		Err(up_data_structs::TokenOwnerError::MultipleOwners)
	}

	fn token_owners(&self, token: TokenId) -> Vec<<T>::CrossAccountId> {
		vec![]
	}

	fn token_property(
		&self,
		token_id: TokenId,
		key: &up_data_structs::PropertyKey,
	) -> Option<up_data_structs::PropertyValue> {
		None
	}

	fn token_properties(
		&self,
		token: TokenId,
		keys: Option<Vec<up_data_structs::PropertyKey>>,
	) -> Vec<up_data_structs::Property> {
		vec![]
	}

	fn total_supply(&self) -> u32 {
		1
	}

	fn account_balance(&self, account: <T>::CrossAccountId) -> u32 {
		let balance: u128 = <T as Config>::Currency::free_balance(account.as_sub()).into();
		(balance != 0).into()
	}

	fn balance(&self, account: <T>::CrossAccountId, token: TokenId) -> u128 {
		if token != TokenId::default() {
			return 0;
		}
		<T as Config>::Currency::free_balance(account.as_sub()).into()
	}

	fn total_pieces(&self, token: TokenId) -> Option<u128> {
		if token != TokenId::default() {
			return None;
		}
		let total = <T as Config>::Currency::total_issuance();
		Some(total.into())
	}

	fn allowance(
		&self,
		sender: <T>::CrossAccountId,
		spender: <T>::CrossAccountId,
		token: TokenId,
	) -> u128 {
		0
	}

	fn refungible_extensions(&self) -> Option<&dyn pallet_common::RefungibleExtensions<T>> {
		None
	}

	fn set_allowance_for_all(
		&self,
		owner: <T>::CrossAccountId,
		operator: <T>::CrossAccountId,
		approve: bool,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn allowance_for_all(&self, owner: <T>::CrossAccountId, operator: <T>::CrossAccountId) -> bool {
		false
	}

	fn repair_item(
		&self,
		token: TokenId,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}
}
