use alloc::{vec, vec::Vec};
use core::marker::PhantomData;
use crate::{Config, NativeFungibleHandle, Pallet};
use frame_support::{
	fail, ensure,
	weights::Weight,
	dispatch::{PostDispatchInfo, Pays},
	traits::{
		fungible::Mutate,
		tokens::{Precision, Fortitude},
	},
};
use pallet_balances::{weights::SubstrateWeight as BalancesWeight, WeightInfo};
use pallet_common::{
	CommonCollectionOperations, CommonWeightInfo, erc::CrossAccountId,
	NATIVE_FUNGIBLE_COLLECTION_ID,
};
use up_data_structs::TokenId;
use sp_core::Get;
pub struct CommonWeights<T: Config>(PhantomData<T>);

// All implementations with `Weight::default` used in methods that return error `UnsupportedOperation`.
impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
	fn create_multiple_items(_amount: &[up_data_structs::CreateItemData]) -> Weight {
		Weight::default()
	}

	fn create_multiple_items_ex(
		_cost: &up_data_structs::CreateItemExData<T::CrossAccountId>,
	) -> Weight {
		Weight::default()
	}

	fn burn_item() -> Weight {
		Weight::default()
	}

	fn set_collection_properties(_amount: u32) -> Weight {
		Weight::default()
	}

	fn delete_collection_properties(_amount: u32) -> Weight {
		Weight::default()
	}

	fn set_token_properties(_amount: u32) -> Weight {
		Weight::default()
	}

	fn delete_token_properties(_amount: u32) -> Weight {
		Weight::default()
	}

	fn set_token_property_permissions(_amount: u32) -> Weight {
		Weight::default()
	}

	fn transfer() -> Weight {
		<BalancesWeight<T> as WeightInfo>::transfer_allow_death()
	}

	fn approve() -> Weight {
		Weight::default()
	}

	fn approve_from() -> Weight {
		Weight::default()
	}

	fn transfer_from() -> Weight {
		<BalancesWeight<T> as WeightInfo>::transfer_allow_death()
	}

	fn burn_from() -> Weight {
		Weight::default()
	}

	fn burn_recursively_self_raw() -> Weight {
		Weight::default()
	}

	fn burn_recursively_breadth_raw(_amount: u32) -> Weight {
		Weight::default()
	}

	fn token_owner() -> Weight {
		Weight::default()
	}

	fn set_allowance_for_all() -> Weight {
		Weight::default()
	}

	fn force_repair_item() -> Weight {
		Weight::default()
	}
}

/// Implementation of `CommonCollectionOperations` for `FungibleHandle`. It wraps FungibleHandle Pallet
/// methods and adds weight info.
impl<T: Config> CommonCollectionOperations<T> for NativeFungibleHandle<T> {
	fn create_item(
		&self,
		_sender: <T>::CrossAccountId,
		_to: <T>::CrossAccountId,
		_data: up_data_structs::CreateItemData,
		_nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn create_multiple_items(
		&self,
		_sender: <T>::CrossAccountId,
		_to: <T>::CrossAccountId,
		_data: Vec<up_data_structs::CreateItemData>,
		_nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn create_multiple_items_ex(
		&self,
		_sender: <T>::CrossAccountId,
		_data: up_data_structs::CreateItemExData<<T>::CrossAccountId>,
		_nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn burn_item(
		&self,
		_sender: <T>::CrossAccountId,
		_token: TokenId,
		_amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn burn_item_recursively(
		&self,
		_sender: <T>::CrossAccountId,
		_token: TokenId,
		_self_budget: &dyn up_data_structs::budget::Budget,
		_breadth_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn set_collection_properties(
		&self,
		_sender: <T>::CrossAccountId,
		_properties: Vec<up_data_structs::Property>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn delete_collection_properties(
		&self,
		_sender: &<T>::CrossAccountId,
		_property_keys: Vec<up_data_structs::PropertyKey>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn set_token_properties(
		&self,
		_sender: <T>::CrossAccountId,
		_token_id: TokenId,
		_properties: Vec<up_data_structs::Property>,
		_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn delete_token_properties(
		&self,
		_sender: <T>::CrossAccountId,
		_token_id: TokenId,
		_property_keys: Vec<up_data_structs::PropertyKey>,
		_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn set_token_property_permissions(
		&self,
		_sender: &<T>::CrossAccountId,
		_property_permissions: Vec<up_data_structs::PropertyKeyPermission>,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn transfer(
		&self,
		sender: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
		_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			pallet_fungible::Error::<T>::FungibleItemsHaveNoId
		);

		<Pallet<T>>::transfer(self, &sender, &to, amount)
	}

	fn approve(
		&self,
		_sender: <T>::CrossAccountId,
		_spender: <T>::CrossAccountId,
		_token: TokenId,
		_amount: u128,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn approve_from(
		&self,
		_sender: <T>::CrossAccountId,
		_from: <T>::CrossAccountId,
		_to: <T>::CrossAccountId,
		_token: TokenId,
		_amount: u128,
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
		ensure!(
			token == TokenId::default(),
			pallet_fungible::Error::<T>::FungibleItemsHaveNoId
		);

		<Pallet<T>>::transfer_from(self, &sender, &from, &to, amount, budget)
	}

	fn burn_from(
		&self,
		sender: <T>::CrossAccountId,
		from: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
		_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn check_nesting(
		&self,
		_sender: Option<&<T>::CrossAccountId>,
		_from: (up_data_structs::CollectionId, TokenId),
		_under: TokenId,
		_budget: &dyn up_data_structs::budget::Budget,
	) -> frame_support::sp_runtime::DispatchResult {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn nest(&self, _under: TokenId, _to_nest: (up_data_structs::CollectionId, TokenId)) {}

	fn unnest(&self, _under: TokenId, _to_nest: (up_data_structs::CollectionId, TokenId)) {}

	fn account_tokens(&self, account: <T>::CrossAccountId) -> Vec<TokenId> {
		let balance = <Pallet<T>>::total_balance(&account);
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
		_token: TokenId,
	) -> Result<<T>::CrossAccountId, up_data_structs::TokenOwnerError> {
		Err(up_data_structs::TokenOwnerError::MultipleOwners)
	}

	fn token_owners(&self, _token: TokenId) -> Vec<<T>::CrossAccountId> {
		vec![]
	}

	fn token_property(
		&self,
		_token_id: TokenId,
		_key: &up_data_structs::PropertyKey,
	) -> Option<up_data_structs::PropertyValue> {
		None
	}

	fn token_properties(
		&self,
		_token: TokenId,
		_keys: Option<Vec<up_data_structs::PropertyKey>>,
	) -> Vec<up_data_structs::Property> {
		vec![]
	}

	fn total_supply(&self) -> u32 {
		1
	}

	fn account_balance(&self, account: T::CrossAccountId) -> u32 {
		let balance = <Pallet<T>>::balance_of(&account);
		(balance != 0).into()
	}

	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128 {
		if token != TokenId::default() {
			return 0;
		}
		<Pallet<T>>::balance_of(&account)
	}

	fn total_pieces(&self, token: TokenId) -> Option<u128> {
		if token != TokenId::default() {
			return None;
		}
		Some(<Pallet<T>>::total_issuance())
	}

	fn allowance(
		&self,
		_sender: <T>::CrossAccountId,
		_spender: <T>::CrossAccountId,
		_token: TokenId,
	) -> u128 {
		0
	}

	fn refungible_extensions(&self) -> Option<&dyn pallet_common::RefungibleExtensions<T>> {
		None
	}

	fn set_allowance_for_all(
		&self,
		_owner: <T>::CrossAccountId,
		_operator: <T>::CrossAccountId,
		_approve: bool,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn allowance_for_all(
		&self,
		_owner: <T>::CrossAccountId,
		_operator: <T>::CrossAccountId,
	) -> bool {
		false
	}

	fn repair_item(
		&self,
		_token: TokenId,
	) -> frame_support::pallet_prelude::DispatchResultWithPostInfo {
		fail!(<pallet_common::Error<T>>::UnsupportedOperation);
	}

	fn collection_id(&self) -> up_data_structs::CollectionId {
		NATIVE_FUNGIBLE_COLLECTION_ID
	}

	fn xcm_extensions(&self) -> Option<&dyn pallet_common::XcmExtensions<T>> {
		Some(self)
	}
}

impl<T: Config> pallet_common::XcmExtensions<T> for NativeFungibleHandle<T> {
	fn is_foreign(&self) -> bool {
		false
	}

	fn create_item(
		&self,
		to: <T>::CrossAccountId,
		data: up_data_structs::CreateItemData,
	) -> Result<TokenId, sp_runtime::DispatchError> {
		match &data {
			up_data_structs::CreateItemData::Fungible(fungible_data) => {
				let amount = fungible_data.value;

				T::Mutate::mint_into(
					to.as_sub(),
					fungible_data
						.value
						.try_into()
						.map_err(|_| sp_runtime::ArithmeticError::Overflow)?,
				)?;

				Ok(TokenId::default())
			}
			_ => {
				fail!(pallet_fungible::Error::<T>::NotFungibleDataUsedToMintFungibleCollectionToken)
			}
		}
	}

	fn transfer_from(
		&self,
		_nester: Option<<T>::CrossAccountId>,
		from: <T>::CrossAccountId,
		to: <T>::CrossAccountId,
		token: TokenId,
		amount: u128,
		_nesting_budget: &dyn up_data_structs::budget::Budget,
	) -> sp_runtime::DispatchResult {
		ensure!(
			token == TokenId::default(),
			pallet_fungible::Error::<T>::FungibleItemsHaveNoId
		);

		<Pallet<T>>::transfer(self, &from, &to, amount)
			.map(|_| ())
			.map_err(|post_info| post_info.error)
	}

	fn burn_item(
		&self,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> sp_runtime::DispatchResult {
		ensure!(
			token == TokenId::default(),
			pallet_fungible::Error::<T>::FungibleItemsHaveNoId
		);

		T::Mutate::burn_from(
			from.as_sub(),
			amount
				.try_into()
				.map_err(|_| sp_runtime::ArithmeticError::Overflow)?,
			Precision::Exact,
			Fortitude::Polite,
		)?;

		Ok(())
	}
}
