#![cfg_attr(not(feature = "std"), no_std)]
#[cfg(not(feature = "std"))]
extern crate alloc;

use abi::{AbiReader, AbiWriter};
pub use evm_coder_macros::{event_topic, fn_selector, solidity_interface, solidity, ToLog};
pub mod abi;
pub mod events;
pub use events::ToLog;
pub mod execution;
pub mod solidity;

/// Solidity type definitions
pub mod types {
	#![allow(non_camel_case_types)]

	#[cfg(not(feature = "std"))]
	use alloc::{vec::Vec};
	use primitive_types::{U256, H160, H256};

	pub type address = H160;

	pub type uint8 = u8;
	pub type uint16 = u16;
	pub type uint32 = u32;
	pub type uint64 = u64;
	pub type uint128 = u128;
	pub type uint256 = U256;

	pub type bytes4 = u32;

	pub type topic = H256;

	#[cfg(not(feature = "std"))]
	pub type string = ::alloc::string::String;
	#[cfg(feature = "std")]
	pub type string = ::std::string::String;
	pub type bytes = Vec<u8>;

	pub type void = ();

	//#region Special types
	/// Makes function payable
	pub type value = U256;
	/// Makes function caller-sensitive
	pub type caller = address;
	//#endregion

	pub struct Msg<C> {
		pub call: C,
		pub caller: H160,
		pub value: U256,
	}
}

pub trait Call: Sized {
	fn parse(selector: u32, input: &mut AbiReader) -> execution::Result<Option<Self>>;
}

pub trait Callable<C: Call> {
	fn call(&mut self, call: types::Msg<C>) -> execution::Result<AbiWriter>;
}

#[macro_export]
macro_rules! generate_stubgen {
	($name:ident, $decl:ident, $is_impl:literal) => {
		#[test]
		#[ignore]
		fn $name() {
			use evm_coder::solidity::TypeCollector;
			let mut out = TypeCollector::new();
			$decl::generate_solidity_interface(&mut out, $is_impl);
			println!("=== SNIP START ===");
			println!("// SPDX-License-Identifier: OTHER");
			println!("// This code is automatically generated");
			println!();
			println!("pragma solidity >=0.8.0 <0.9.0;");
			println!();
			for b in out.finish() {
				println!("{}", b);
			}
			println!("=== SNIP END ===");
		}
	};
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn function_selector_generation() {
		assert_eq!(fn_selector!(transfer(address, uint256)), 0xa9059cbb);
	}

	#[test]
	fn event_topic_generation() {
		assert_eq!(
			hex::encode(&event_topic!(Transfer(address, address, uint256))[..]),
			"ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
		);
	}
}
