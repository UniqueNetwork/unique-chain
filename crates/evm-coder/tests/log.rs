#![allow(dead_code)]

use evm_coder::{ToLog, types::*};

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
