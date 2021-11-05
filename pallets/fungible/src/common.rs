use core::marker::PhantomData;

use frame_support::{dispatch::DispatchResultWithPostInfo, ensure, fail, weights::Weight};
use nft_data_structs::TokenId;
use pallet_common::{CommonCollectionOperations, CommonWeightInfo, with_weight};
use sp_runtime::ArithmeticError;
use sp_std::{vec::Vec, vec};

use crate::{
	Allowance, Balance, Config, Error, FungibleHandle, Pallet, SelfWeightOf, weights::WeightInfo,
};

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo for CommonWeights<T> {
	fn create_item() -> Weight {
		<SelfWeightOf<T>>::create_item()
	}

	fn create_multiple_items(_amount: u32) -> Weight {
		Self::create_item()
	}

	fn burn_item() -> Weight {
		<SelfWeightOf<T>>::burn_item()
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

	fn set_variable_metadata(_bytes: u32) -> Weight {
		// Error
		0
	}
}

impl<T: Config> CommonCollectionOperations<T> for FungibleHandle<T> {
	fn create_item(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: nft_data_structs::CreateItemData,
	) -> DispatchResultWithPostInfo {
		match data {
			nft_data_structs::CreateItemData::Fungible(data) => with_weight(
				<Pallet<T>>::create_item(self, &sender, (to, data.value)),
				<CommonWeights<T>>::create_item(),
			),
			_ => fail!(<Error<T>>::NotFungibleDataUsedToMintFungibleCollectionToken),
		}
	}

	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<nft_data_structs::CreateItemData>,
	) -> DispatchResultWithPostInfo {
		let mut sum: u128 = 0;
		for data in data {
			match data {
				nft_data_structs::CreateItemData::Fungible(data) => {
					sum = sum
						.checked_add(data.value)
						.ok_or(ArithmeticError::Overflow)?;
				}
				_ => fail!(<Error<T>>::NotFungibleDataUsedToMintFungibleCollectionToken),
			}
		}

		with_weight(
			<Pallet<T>>::create_item(self, &sender, (to, sum)),
			<CommonWeights<T>>::create_item(),
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

	fn transfer(
		&self,
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
			<Pallet<T>>::transfer(&self, &from, &to, amount),
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
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		with_weight(
			<Pallet<T>>::set_allowance(&self, &sender, &spender, amount),
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
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		with_weight(
			<Pallet<T>>::transfer_from(&self, &sender, &from, &to, amount),
			<CommonWeights<T>>::transfer_from(),
		)
	}

	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		ensure!(
			token == TokenId::default(),
			<Error<T>>::FungibleItemsHaveNoId
		);

		with_weight(
			<Pallet<T>>::burn_from(&self, &sender, &from, amount),
			<CommonWeights<T>>::burn_from(),
		)
	}

	fn set_variable_metadata(
		&self,
		_sender: T::CrossAccountId,
		_token: TokenId,
		_data: Vec<u8>,
	) -> DispatchResultWithPostInfo {
		fail!(<Error<T>>::FungibleItemsHaveData)
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

	fn token_owner(&self, _token: TokenId) -> T::CrossAccountId {
		T::CrossAccountId::default()
	}
	fn const_metadata(&self, _token: TokenId) -> Vec<u8> {
		Vec::new()
	}
	fn variable_metadata(&self, _token: TokenId) -> Vec<u8> {
		Vec::new()
	}

	fn collection_tokens(&self) -> u32 {
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
}
