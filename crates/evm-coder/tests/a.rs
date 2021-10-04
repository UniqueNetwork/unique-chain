#![allow(dead_code)] // This test only checks that macros is not panicking

use evm_coder::{solidity_interface, types::*, ToLog, execution::Result};
use evm_coder_macros::solidity;

struct Impls;

#[solidity_interface(name = "OurInterface")]
impl Impls {
	fn fn_a(&self, _input: uint256) -> Result<bool> {
		todo!()
	}
}

#[solidity_interface(name = "OurInterface1")]
impl Impls {
	fn fn_b(&self, _input: uint128) -> Result<uint32> {
		todo!()
	}
}

#[solidity_interface(
	name = "OurInterface2",
	is(OurInterface),
	inline_is(OurInterface1),
	events(ERC721Log)
)]
impl Impls {
	#[solidity(rename_selector = "fnK")]
	fn fn_c(&self, _input: uint32) -> Result<uint8> {
		todo!()
	}
	fn fn_d(&self, _value: uint32) -> Result<uint32> {
		todo!()
	}

	fn caller_sensitive(&self, _caller: caller) -> Result<uint8> {
		todo!()
	}
	fn payable(&mut self, _value: value) -> Result<uint8> {
		todo!()
	}
}

#[derive(ToLog)]
enum ERC721Log {
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		value: uint256,
	},
	Eee {
		#[indexed]
		aaa: address,
		bbb: uint256,
	},
}

struct ERC20;

#[solidity_interface(name = "ERC20")]
impl ERC20 {
	fn decimals(&self) -> Result<uint8> {
		todo!()
	}
	fn balance_of(&self, _owner: address) -> Result<uint256> {
		todo!()
	}
	fn transfer(&mut self, _caller: caller, _to: address, _value: uint256) -> Result<bool> {
		todo!()
	}
	fn transfer_from(
		&mut self,
		_caller: caller,
		_from: address,
		_to: address,
		_value: uint256,
	) -> Result<bool> {
		todo!()
	}
	fn approve(&mut self, _caller: caller, _spender: address, _value: uint256) -> Result<bool> {
		todo!()
	}
	fn allowance(&self, _owner: address, _spender: address) -> Result<uint256> {
		todo!()
	}
}
