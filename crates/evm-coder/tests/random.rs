#![allow(dead_code)] // This test only checks that macros is not panicking

use evm_coder::{ToLog, execution::Result, solidity_interface, types::*};
use evm_coder_macros::{solidity, weight};

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

#[derive(ToLog)]
enum OurEvents {
	Event1 {
		field1: uint32,
	},
	Event2 {
		field1: uint32,
		#[indexed]
		field2: uint32,
	},
}

#[solidity_interface(
	name = "OurInterface2",
	is(OurInterface),
	inline_is(OurInterface1),
	events(OurEvents)
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

	#[weight(*_weight)]
	fn with_weight(&self, _weight: uint64) -> Result<void> {
		todo!()
	}

	/// Doccoment example
	fn with_doc(&self) -> Result<void> {
		todo!()
	}
}
