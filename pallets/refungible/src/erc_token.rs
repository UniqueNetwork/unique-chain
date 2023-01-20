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

//! # Refungible Pallet EVM API for token pieces
//!
//! Provides ERC-20 standart support implementation and EVM API for unique extensions for Refungible Pallet.
//! Method implementations are mostly doing parameter conversion and calling Nonfungible Pallet methods.

use core::{
	char::{REPLACEMENT_CHARACTER, decode_utf16},
	convert::TryInto,
	ops::Deref,
};
use evm_coder::{
	abi::AbiType, ToLog, execution::*, generate_stubgen, solidity_interface, solidity, types::*,
	weight,
};
use pallet_common::{
	CommonWeightInfo,
	erc::{CommonEvmHandler, PrecompileResult},
	eth::collection_id_to_address,
};
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::{call, dispatch_to_evm, WithRecorder};
use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
use sp_std::vec::Vec;
use sp_core::U256;
use up_data_structs::TokenId;

use crate::{
	Allowance, Balance, common::CommonWeights, Config, Pallet, RefungibleHandle, SelfWeightOf,
	TotalSupply, weights::WeightInfo,
};

/// Refungible token handle contains information about token's collection and id
///
/// RefungibleTokenHandle doesn't check token's existance upon creation
pub struct RefungibleTokenHandle<T: Config>(pub RefungibleHandle<T>, pub TokenId);

#[solidity_interface(name = ERC1633)]
impl<T: Config> RefungibleTokenHandle<T> {
	fn parent_token(&self) -> Result<Address> {
		Ok(collection_id_to_address(self.id))
	}

	fn parent_token_id(&self) -> Result<U256> {
		Ok(self.1.into())
	}
}

#[derive(ToLog)]
pub enum ERC20Events {
	/// @dev This event is emitted when the amount of tokens (value) is sent
	/// from the from address to the to address. In the case of minting new
	/// tokens, the transfer is usually from the 0 address while in the case
	/// of burning tokens the transfer is to 0.
	Transfer {
		#[indexed]
		from: Address,
		#[indexed]
		to: Address,
		value: U256,
	},
	/// @dev This event is emitted when the amount of tokens (value) is approved
	/// by the owner to be used by the spender.
	Approval {
		#[indexed]
		owner: Address,
		#[indexed]
		spender: Address,
		value: U256,
	},
}

/// @title Standard ERC20 token
///
/// @dev Implementation of the basic standard token.
/// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
#[solidity_interface(name = ERC20, events(ERC20Events))]
impl<T: Config> RefungibleTokenHandle<T> {
	/// @return the name of the token.
	fn name(&self) -> Result<String> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<String>())
	}

	/// @return the symbol of the token.
	fn symbol(&self) -> Result<String> {
		Ok(String::from_utf8_lossy(&self.token_prefix).into())
	}

	/// @dev Total number of tokens in existence
	fn total_supply(&self) -> Result<U256> {
		self.consume_store_reads(1)?;
		Ok(<TotalSupply<T>>::get((self.id, self.1)).into())
	}

	/// @dev Not supported
	fn decimals(&self) -> Result<u8> {
		// Decimals aren't supported for refungible tokens
		Ok(0)
	}

	/// @dev Gets the balance of the specified address.
	/// @param owner The address to query the balance of.
	/// @return An uint256 representing the amount owned by the passed address.
	fn balance_of(&self, owner: Address) -> Result<U256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <Balance<T>>::get((self.id, self.1, owner));
		Ok(balance.into())
	}

	/// @dev Transfer token for a specified address
	/// @param to The address to transfer to.
	/// @param amount The amount to be transferred.
	#[weight(<CommonWeights<T>>::transfer())]
	fn transfer(&mut self, caller: Caller, to: Address, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, self.1, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Transfer tokens from one address to another
	/// @param from address The address which you want to send tokens from
	/// @param to address The address which you want to transfer to
	/// @param amount uint256 the amount of tokens to be transferred
	#[weight(<CommonWeights<T>>::transfer_from())]
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

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, self.1, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Approve the passed address to spend the specified amount of tokens on behalf of `msg.sender`.
	/// Beware that changing an allowance with this method brings the risk that someone may use both the old
	/// and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
	/// race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
	/// https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
	/// @param spender The address which will spend the funds.
	/// @param amount The amount of tokens to be spent.
	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve(&mut self, caller: Caller, spender: Address, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = T::CrossAccountId::from_eth(spender);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::set_allowance(self, &caller, &spender, self.1, amount)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Function to check the amount of tokens that an owner allowed to a spender.
	/// @param owner address The address which owns the funds.
	/// @param spender address The address which will spend the funds.
	/// @return A uint256 specifying the amount of tokens still available for the spender.
	fn allowance(&self, owner: Address, spender: Address) -> Result<U256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let spender = T::CrossAccountId::from_eth(spender);

		Ok(<Allowance<T>>::get((self.id, self.1, owner, spender)).into())
	}
}

#[solidity_interface(name = ERC20UniqueExtensions)]
impl<T: Config> RefungibleTokenHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	/// @dev Function that burns an amount of the token of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	#[weight(<SelfWeightOf<T>>::burn_from())]
	#[solidity(hide)]
	fn burn_from(&mut self, caller: Caller, from: Address, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::burn_from(self, &caller, &from, self.1, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Function that burns an amount of the token of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from_cross(
		&mut self,
		caller: Caller,
		from: pallet_common::eth::CrossAddress,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::burn_from(self, &caller, &from, self.1, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Approve the passed address to spend the specified amount of tokens on behalf of `msg.sender`.
	/// Beware that changing an allowance with this method brings the risk that someone may use both the old
	/// and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
	/// race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
	/// https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
	/// @param spender The crossaccount which will spend the funds.
	/// @param amount The amount of tokens to be spent.
	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve_cross(
		&mut self,
		caller: Caller,
		spender: pallet_common::eth::CrossAddress,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = spender.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::set_allowance(self, &caller, &spender, self.1, amount)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
	/// @dev Function that changes total amount of the tokens.
	///  Throws if `msg.sender` doesn't owns all of the tokens.
	/// @param amount New total amount of the tokens.
	#[weight(<SelfWeightOf<T>>::repartition_item())]
	fn repartition(&mut self, caller: Caller, amount: U256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::repartition(self, &caller, self.1, amount).map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Transfer token for a specified address
	/// @param to The crossaccount to transfer to.
	/// @param amount The amount to be transferred.
	#[weight(<CommonWeights<T>>::transfer())]
	fn transfer_cross(
		&mut self,
		caller: Caller,
		to: pallet_common::eth::CrossAddress,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = to.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, self.1, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// @dev Transfer tokens from one address to another
	/// @param from The address which you want to send tokens from
	/// @param to The address which you want to transfer to
	/// @param amount the amount of tokens to be transferred
	#[weight(<CommonWeights<T>>::transfer_from())]
	fn transfer_from_cross(
		&mut self,
		caller: Caller,
		from: pallet_common::eth::CrossAddress,
		to: pallet_common::eth::CrossAddress,
		amount: U256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = from.into_sub_cross_account::<T>()?;
		let to = to.into_sub_cross_account::<T>()?;
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, self.1, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
}

impl<T: Config> RefungibleTokenHandle<T> {
	pub fn into_inner(self) -> RefungibleHandle<T> {
		self.0
	}
	pub fn common_mut(&mut self) -> &mut RefungibleHandle<T> {
		&mut self.0
	}
}

impl<T: Config> WithRecorder<T> for RefungibleTokenHandle<T> {
	fn recorder(&self) -> &pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0.recorder()
	}
	fn into_recorder(self) -> pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0.into_recorder()
	}
}

impl<T: Config> Deref for RefungibleTokenHandle<T> {
	type Target = RefungibleHandle<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

#[solidity_interface(
	name = UniqueRefungibleToken,
	is(ERC20, ERC20UniqueExtensions, ERC1633)
)]
impl<T: Config> RefungibleTokenHandle<T> where T::AccountId: From<[u8; 32]> {}

generate_stubgen!(gen_impl, UniqueRefungibleTokenCall<()>, true);
generate_stubgen!(gen_iface, UniqueRefungibleTokenCall<()>, false);

impl<T: Config> CommonEvmHandler for RefungibleTokenHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungibleToken.raw");

	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		call::<T, UniqueRefungibleTokenCall<T>, _, _>(handle, self)
	}
}
