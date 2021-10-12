use core::marker::PhantomData;

use sp_std::collections::btree_map::BTreeMap;
use frame_support::{dispatch::DispatchResultWithPostInfo, fail, weights::Weight};
use nft_data_structs::TokenId;
use pallet_common::{
	CommonCollectionOperations, CommonWeightInfo, account::CrossAccountId, with_weight,
};
use sp_runtime::DispatchError;
use sp_std::vec::Vec;

use crate::{
	AccountBalance, Allowance, Balance, Config, CreateItemData, DataKind, Error, Owned, Pallet,
	RefungibleHandle, SelfWeightOf, TokenData, weights::WeightInfo,
};

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo for CommonWeights<T> {
	fn create_item() -> Weight {
		<SelfWeightOf<T>>::create_item()
	}

	fn create_multiple_items(amount: u32) -> Weight {
		<SelfWeightOf<T>>::create_multiple_items(amount)
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

	fn set_variable_metadata(_bytes: u32) -> Weight {
		<SelfWeightOf<T>>::set_variable_metadata()
	}
}

fn map_create_data<T: Config>(
	data: nft_data_structs::CreateItemData,
	to: &T::CrossAccountId,
) -> Result<CreateItemData<T>, DispatchError> {
	match data {
		nft_data_structs::CreateItemData::ReFungible(data) => Ok(CreateItemData {
			const_data: data.const_data,
			variable_data: data.variable_data,
			users: {
				let mut out = BTreeMap::new();
				out.insert(to.clone(), data.pieces);
				out
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
		data: nft_data_structs::CreateItemData,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::create_item(self, &sender, map_create_data(data, &to)?),
			<SelfWeightOf<T>>::create_item(),
		)
	}

	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<nft_data_structs::CreateItemData>,
	) -> DispatchResultWithPostInfo {
		let data = data
			.into_iter()
			.map(|d| map_create_data::<T>(d, &to))
			.collect::<Result<Vec<_>, DispatchError>>()?;

		let amount = data.len();
		with_weight(
			<Pallet<T>>::create_multiple_items(self, &sender, data),
			<SelfWeightOf<T>>::create_multiple_items(amount as u32),
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
			<SelfWeightOf<T>>::burn_item(),
		)
	}

	fn transfer(
		&self,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::transfer(&self, &from, &to, token, amount),
			<SelfWeightOf<T>>::transfer(),
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
			<Pallet<T>>::set_allowance(&self, &sender, &spender, token, amount),
			<SelfWeightOf<T>>::approve(),
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
		with_weight(
			<Pallet<T>>::transfer_from(&self, &sender, &from, &to, token, amount),
			<SelfWeightOf<T>>::approve(),
		)
	}

	fn set_variable_metadata(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		data: Vec<u8>,
	) -> DispatchResultWithPostInfo {
		with_weight(
			<Pallet<T>>::set_variable_metadata(&self, &sender, token, data),
			<SelfWeightOf<T>>::set_variable_metadata(),
		)
	}

	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId> {
		<Owned<T>>::iter_prefix((self.id, account.as_sub()))
			.map(|(id, _)| id)
			.collect()
	}

	fn token_exists(&self, token: TokenId) -> bool {
		<Pallet<T>>::token_exists(self, token)
	}

	fn token_owner(&self, _token: TokenId) -> T::CrossAccountId {
		T::CrossAccountId::default()
	}
	fn const_metadata(&self, token: TokenId) -> Vec<u8> {
		<TokenData<T>>::get((self.id, token, DataKind::Constant))
	}
	fn variable_metadata(&self, token: TokenId) -> Vec<u8> {
		<TokenData<T>>::get((self.id, token, DataKind::Variable))
	}

	fn collection_tokens(&self) -> u32 {
		<Pallet<T>>::total_supply(self)
	}

	fn account_balance(&self, account: T::CrossAccountId) -> u32 {
		<AccountBalance<T>>::get((self.id, account.as_sub()))
	}

	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128 {
		<Balance<T>>::get((self.id, token, account.as_sub()))
	}

	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128 {
		<Allowance<T>>::get((self.id, token, sender.as_sub(), spender))
	}
}
