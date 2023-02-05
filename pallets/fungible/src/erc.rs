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

//! ERC-20 standart support implementation.

extern crate alloc;
use core::char::{REPLACEMENT_CHARACTER, decode_utf16};
use core::convert::TryInto;
use evm_coder::AbiCoder;
use evm_coder::{abi::AbiType, ToLog, generate_stubgen, solidity_interface, types::*};
use up_data_structs::CollectionMode;
use pallet_common::{
	CollectionHandle,
	erc::{CommonEvmHandler, PrecompileResult, CollectionCall},
	eth::CrossAddress,
};
use sp_std::vec::Vec;
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::{
	call, dispatch_to_evm,
	execution::{PreDispatch, Result},
	frontier_contract,
};
use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
use sp_core::{U256, Get};

use crate::{
	Allowance, Balance, Config, FungibleHandle, Pallet, TotalSupply, SelfWeightOf,
	weights::WeightInfo,
};

frontier_contract! {
	macro_rules! FungibleHandle_result {...}
	impl<T: Config> Contract for FungibleHandle<T> {...}
}

#[derive(ToLog)]
pub enum ERC20Events {
	Transfer {
		#[indexed]
		from: Address,
		#[indexed]
		to: Address,
		value: U256,
	},
	Approval {
		#[indexed]
		owner: Address,
		#[indexed]
		spender: Address,
		value: U256,
	},
}

#[derive(AbiCoder, Debug)]
pub struct AmountForAddress {
	to: Address,
	amount: U256,
}

#[solidity_interface(name = ERC20, events(ERC20Events), enum(derive(PreDispatch)), enum_attr(weight), expect_selector = 0x942e8b22)]
impl<T: Config> FungibleHandle<T> {
	fn name(&self) -> Result<String> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<String>())
	}
	fn symbol(&self) -> Result<String> {
		Ok(String::from_utf8_lossy(&self.token_prefix).into())
	}
	fn total_supply(&self) -> Result<U256> {
		self.consume_store_reads(1)?;
		Ok(<TotalSupply<T>>::get(self.id).into())
	}

	fn decimals(&self) -> Result<u8> {
		Ok(if let CollectionMode::Fungible(decimals) = &self.mode {
			*decimals
		} else {
			unreachable!()
		})
	}
	fn balance_of(&self, owner: Address) -> Result<U256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <Balance<T>>::get((self.id, owner));
		Ok(balance.into())
	}
	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer(&mut self, caller: Caller, to: Address, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, amount, &budget).map_err(|_| "transfer error")?;
		Ok(true)
	}

	#[weight(<SelfWeightOf<T>>::transfer_from())]
	fn transfer_from(
		&mut self,
		caller: Caller,
		from: Address,
		to: Address,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let to = T::CrossAccountId::from_eth(to);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve(&mut self, caller: Caller, spender: Address, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = T::CrossAccountId::from_eth(spender);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::set_allowance(self, &caller, &spender, amount)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
	fn allowance(&self, owner: Address, spender: Address) -> Result<U256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let spender = T::CrossAccountId::from_eth(spender);

		Ok(<Allowance<T>>::get((self.id, owner, spender)).into())
	}
}

#[solidity_interface(name = ERC20Mintable, enum(derive(PreDispatch)), enum_attr(weight))]
impl<T: Config> FungibleHandle<T> {
	/// Mint tokens for `to` account.
	/// @param to account that will receive minted tokens
	/// @param amount amount of tokens to mint
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint(&mut self, caller: Caller, to: Address, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());
		<Pallet<T>>::create_item(self, &caller, (to, amount), &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
}

#[solidity_interface(name = ERC20UniqueExtensions, enum(derive(PreDispatch)), enum_attr(weight))]
impl<T: Config> FungibleHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	/// @dev Function to check the amount of tokens that an owner allowed to a spender.
	/// @param owner crossAddress The address which owns the funds.
	/// @param spender crossAddress The address which will spend the funds.
	/// @return A uint256 specifying the amount of tokens still available for the spender.
	fn allowance_cross(&self, owner: CrossAddress, spender: CrossAddress) -> Result<U256> {
		let owner = owner.into_sub_cross_account::<T>()?;
		let spender = spender.into_sub_cross_account::<T>()?;

		Ok(<Allowance<T>>::get((self.id, owner, spender)).into())
	}

	/// @notice A description for the collection.
	fn description(&self) -> String {
		decode_utf16(self.description.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<String>()
	}

	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_cross(&mut self, caller: Caller, to: CrossAddress, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = to.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());
		<Pallet<T>>::create_item(&self, &caller, (to, amount), &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve_cross(
		&mut self,
		caller: Caller,
		spender: CrossAddress,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = spender.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::set_allowance(self, &caller, &spender, amount)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// Burn tokens from account
	/// @dev Function that burns an `amount` of the tokens of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	#[solidity(hide)]
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from(&mut self, caller: Caller, from: Address, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::burn_from(self, &caller, &from, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// Burn tokens from account
	/// @dev Function that burns an `amount` of the tokens of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from_cross(
		&mut self,
		caller: Caller,
		from: CrossAddress,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::burn_from(self, &caller, &from, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// Mint tokens for multiple accounts.
	/// @param amounts array of pairs of account address and amount
	#[weight(<SelfWeightOf<T>>::create_multiple_items_ex(amounts.len() as u32))]
	fn mint_bulk(&mut self, caller: Caller, amounts: Vec<AmountForAddress>) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());
		let amounts = amounts
			.into_iter()
			.map(|AmountForAddress { to, amount }| {
				Ok((
					T::CrossAccountId::from_eth(to),
					amount.try_into().map_err(|_| "amount overflow")?,
				))
			})
			.collect::<Result<_>>()?;

		<Pallet<T>>::create_multiple_items(self, &caller, amounts, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer_cross(&mut self, caller: Caller, to: CrossAddress, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = to.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, amount, &budget).map_err(|_| "transfer error")?;
		Ok(true)
	}

	#[weight(<SelfWeightOf<T>>::transfer_from())]
	fn transfer_from_cross(
		&mut self,
		caller: Caller,
		from: CrossAddress,
		to: CrossAddress,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let to = to.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @notice Returns collection helper contract address
	fn collection_helper_address(&self) -> Result<Address> {
		Ok(T::ContractAddress::get())
	}
}

#[solidity_interface(
	name = UniqueFungible,
	is(
		ERC20,
		ERC20Mintable,
		ERC20UniqueExtensions,
		Collection(via(common_mut returns CollectionHandle<T>)),
	),
	enum(derive(PreDispatch))
)]
impl<T: Config> FungibleHandle<T> where T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]> {}

generate_stubgen!(gen_impl, UniqueFungibleCall<()>, true);
generate_stubgen!(gen_iface, UniqueFungibleCall<()>, false);

impl<T: Config> CommonEvmHandler for FungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueFungible.raw");

	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		call::<T, UniqueFungibleCall<T>, _, _>(handle, self)
	}
}
