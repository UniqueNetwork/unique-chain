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

extern crate alloc;
use core::{
	char::{REPLACEMENT_CHARACTER, decode_utf16},
	convert::TryInto,
	ops::Deref,
};
use evm_coder::{ToLog, execution::*, generate_stubgen, solidity_interface, types::*, weight};
use pallet_common::{
	CommonWeightInfo,
	erc::{CommonEvmHandler, PrecompileResult},
};
use pallet_evm::{account::CrossAccountId, PrecompileHandle};
use pallet_evm_coder_substrate::{call, dispatch_to_evm, WithRecorder};
use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
use sp_std::vec::Vec;
use up_data_structs::TokenId;

use crate::{
	Allowance, Balance, common::CommonWeights, Config, Pallet, RefungibleHandle, SelfWeightOf,
	weights::WeightInfo, TotalSupply,
};

pub struct RefungibleTokenHandle<T: Config>(pub RefungibleHandle<T>, pub TokenId);

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

#[solidity_interface(name = "ERC20", events(ERC20Events))]
impl<T: Config> RefungibleTokenHandle<T> {
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
		Ok(<TotalSupply<T>>::get((self.id, self.1)).into())
	}

	fn decimals(&self) -> Result<uint8> {
		// Decimals aren't supported for refungible tokens
		Ok(0)
	}

	fn balance_of(&self, owner: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <Balance<T>>::get((self.id, self.1, owner));
		Ok(balance.into())
	}
	#[weight(<CommonWeights<T>>::transfer())]
	fn transfer(&mut self, caller: caller, to: address, amount: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;
		let budget = self
			.recorder
			.weight_calls_budget(<StructureWeight<T>>::find_parent());

		<Pallet<T>>::transfer(self, &caller, &to, self.1, amount, &budget)
			.map_err(|_| "transfer error")?;
		Ok(true)
	}
	#[weight(<CommonWeights<T>>::transfer_from())]
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

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, self.1, amount, &budget)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve(&mut self, caller: caller, spender: address, amount: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = T::CrossAccountId::from_eth(spender);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::set_allowance(self, &caller, &spender, self.1, amount)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
	fn allowance(&self, owner: address, spender: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let spender = T::CrossAccountId::from_eth(spender);

		Ok(<Allowance<T>>::get((self.id, self.1, owner, spender)).into())
	}
}

#[solidity_interface(name = "ERC20UniqueExtensions")]
impl<T: Config> RefungibleTokenHandle<T> {
	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from(&mut self, caller: caller, from: address, amount: uint256) -> Result<bool> {
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

	#[weight(<SelfWeightOf<T>>::repartition_item())]
	fn repartition(&mut self, caller: caller, amount: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Pallet<T>>::repartition(self, &caller, self.1, amount).map_err(dispatch_to_evm::<T>)?;
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

#[solidity_interface(name = "UniqueRefungibleToken", is(ERC20, ERC20UniqueExtensions,))]
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
