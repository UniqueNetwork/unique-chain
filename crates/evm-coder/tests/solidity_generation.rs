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

use evm_coder::{abi::AbiType, execution::Result, generate_stubgen, solidity_interface, types::*};
use primitive_types::U256;

pub struct ERC20;

#[solidity_interface(name = ERC20)]
impl ERC20 {
	fn decimals(&self) -> Result<u8> {
		unreachable!()
	}
	/// Get balance of specified owner
	fn balance_of(&self, _owner: address) -> Result<U256> {
		unreachable!()
	}
	fn transfer(&mut self, _caller: caller, _to: address, _value: U256) -> Result<bool> {
		unreachable!()
	}
	fn transfer_from(
		&mut self,
		_caller: caller,
		_from: address,
		_to: address,
		_value: U256,
	) -> Result<bool> {
		unreachable!()
	}
	fn approve(&mut self, _caller: caller, _spender: address, _value: U256) -> Result<bool> {
		unreachable!()
	}
	fn allowance(&self, _owner: address, _spender: address) -> Result<U256> {
		unreachable!()
	}
}

generate_stubgen!(gen_impl, ERC20Call, true);
generate_stubgen!(gen_iface, ERC20Call, false);
