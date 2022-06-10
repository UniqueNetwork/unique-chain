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

#![cfg_attr(not(feature = "std"), no_std)]
#[cfg(not(feature = "std"))]
extern crate alloc;

use abi::{AbiRead, AbiReader, AbiWriter};
pub use evm_coder_macros::{event_topic, fn_selector, solidity_interface, solidity, weight, ToLog};
pub mod abi;
pub mod events;
pub use events::ToLog;
use execution::DispatchInfo;
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

	pub type bytes4 = [u8; 4];

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
	fn parse(selector: types::bytes4, input: &mut AbiReader) -> execution::Result<Option<Self>>;
}

pub type Weight = u64;

pub trait Weighted: Call {
	fn weight(&self) -> DispatchInfo;
}

pub trait Callable<C: Call> {
	fn call(&mut self, call: types::Msg<C>) -> execution::ResultWithPostInfo<AbiWriter>;
}

/// Implementation is implicitly provided for all interfaces
///
/// Note: no Callable implementation is provided
#[derive(Debug)]
pub enum ERC165Call {
	SupportsInterface { interface_id: types::bytes4 },
}

impl ERC165Call {
	pub const INTERFACE_ID: types::bytes4 = u32::to_be_bytes(0x01ffc9a7);
}

impl Call for ERC165Call {
	fn parse(selector: types::bytes4, input: &mut AbiReader) -> execution::Result<Option<Self>> {
		if selector != Self::INTERFACE_ID {
			return Ok(None);
		}
		Ok(Some(Self::SupportsInterface {
			interface_id: input.abi_read()?,
		}))
	}
}

/// Generate "tests", which will generate solidity code on execution and print it to stdout
/// Script at .maintain/scripts/generate_api.sh can split this output from test runtime
///
/// This macro receives type usage as second argument, but you can use anything as generics,
/// because no bounds are implied
#[macro_export]
macro_rules! generate_stubgen {
	($name:ident, $decl:ty, $is_impl:literal) => {
		#[test]
		#[ignore]
		fn $name() {
			use evm_coder::solidity::TypeCollector;
			let mut out = TypeCollector::new();
			<$decl>::generate_solidity_interface(&mut out, $is_impl);
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
