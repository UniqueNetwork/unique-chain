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

use core::char::{REPLACEMENT_CHARACTER, decode_utf16};
use core::convert::TryInto;
use evm_coder::{ToLog, execution::*, generate_stubgen, solidity_interface, types::*, weight};
use up_data_structs::CollectionMode;
use pallet_common::erc::{CommonEvmHandler, PrecompileResult};
use sp_std::vec::Vec;
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::{call, dispatch_to_evm};
use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
use pallet_common::{CollectionHandle, erc::CollectionCall};

use crate::{
	Allowance, Balance, Config, FungibleHandle, Pallet, SelfWeightOf, TotalSupply,
	weights::WeightInfo,
};

#[derive(ToLog)]
pub enum ERC20Events {
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		value: uint256,
	},
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		spender: address,
		value: uint256,
	},
}

#[solidity_interface(name = ERC20, events(ERC20Events))]
impl<T: Config> FungibleHandle<T> {
	fn name(&self) -> Result<string> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}
	fn symbol(&self) -> Result<string> {
		Ok(string::from_utf8_lossy(&self.token_prefix).into())
	}
	fn total_supply(&self) -> Result<uint256> {
		self.consume_store_reads(1)?;
		Ok(<TotalSupply<T>>::get(self.id).into())
	}

	fn decimals(&self) -> Result<uint8> {
		Ok(if let CollectionMode::Fungible(decimals) = &self.mode {
			*decimals
		} else {
			unreachable!()
		})
	}
	fn balance_of(&self, owner: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <Balance<T>>::get((self.id, owner));
		Ok(balance.into())
	}
	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer(&mut self, caller: caller, to: address, amount: uint256) -> Result<bool> {
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
		caller: caller,
		from: address,
		to: address,
		amount: uint256,
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
	fn approve(&mut self, caller: caller, spender: address, amount: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = T::CrossAccountId::from_eth(spender);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::set_allowance(self, &caller, &spender, amount)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
	fn allowance(&self, owner: address, spender: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let spender = T::CrossAccountId::from_eth(spender);

		Ok(<Allowance<T>>::get((self.id, owner, spender)).into())
	}
}

#[solidity_interface(name = ERC20Mintable)]
impl<T: Config> FungibleHandle<T> {
	/// Mint tokens for `to` account.
	/// @param to account that will receive minted tokens
	/// @param amount amount of tokens to mint
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint(&mut self, caller: caller, to: address, amount: uint256) -> Result<bool> {
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

#[solidity_interface(name = ERC20UniqueExtensions)]
impl<T: Config> FungibleHandle<T> {
	/// Burn tokens from account
	/// @dev Function that burns an `amount` of the tokens of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from(&mut self, caller: caller, from: address, amount: uint256) -> Result<bool> {
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

	/// Mint tokens for multiple accounts.
	/// @param amounts array of pairs of account address and amount
	#[weight(<SelfWeightOf<T>>::create_multiple_items_ex(amounts.len() as u32))]
	fn mint_bulk(&mut self, caller: caller, amounts: Vec<(address, uint256)>) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());
		let amounts = amounts
			.into_iter()
			.map(|(to, amount)| {
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
}

#[solidity_interface(
	name = UniqueFungible,
	is(
		ERC20,
		ERC20Mintable,
		ERC20UniqueExtensions,
		Collection(via(common_mut returns CollectionHandle<T>)),
	)
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
