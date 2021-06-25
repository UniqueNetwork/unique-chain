#![allow(dead_code)] // This test only checks that macros is not panicking

use evm_coder::{solidity_interface, types::*, ToLog};
use evm_coder_macros::solidity;

#[solidity_interface]
trait OurInterface {
	type Error;
	fn fn_a(&self, input: uint256) -> Result<bool, Self::Error>;
}

#[solidity_interface]
trait OurInterface1 {
	type Error;
	fn fn_b(&self, input: uint128) -> Result<uint32, Self::Error>;
}

#[solidity_interface(is(OurInterface), inline_is(OurInterface1), events(ERC721Log))]
trait OurInterface2 {
	type Error;
	#[solidity(rename_selector = "fnK")]
	fn fn_c(&self, input: uint32) -> Result<uint8, Self::Error>;
	fn fn_d(&self, value: uint32) -> Result<uint32, Self::Error>;

	fn caller_sensitive(&self, caller: caller) -> Result<uint8, Self::Error>;
	fn payable(&mut self, value: value) -> Result<uint8, Self::Error>;
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

#[solidity_interface]
trait ERC20 {
	type Error;

	fn decimals(&self) -> Result<uint8, Self::Error>;
	fn balance_of(&self, owner: address) -> Result<uint256, Self::Error>;
	fn transfer(
		&mut self,
		caller: caller,
		to: address,
		value: uint256,
	) -> Result<bool, Self::Error>;
	fn transfer_from(
		&mut self,
		caller: caller,
		from: address,
		to: address,
		value: uint256,
	) -> Result<bool, Self::Error>;
	fn approve(
		&mut self,
		caller: caller,
		spender: address,
		value: uint256,
	) -> Result<bool, Self::Error>;
	fn allowance(&self, owner: address, spender: address) -> Result<uint256, Self::Error>;
}
