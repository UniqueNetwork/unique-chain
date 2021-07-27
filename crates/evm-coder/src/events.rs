use ethereum::Log;
use primitive_types::{H160, H256};

use crate::types::*;

pub trait ToLog {
	fn to_log(&self, contract: H160) -> Log;
}

pub trait ToTopic {
	fn to_topic(&self) -> H256;
}

impl ToTopic for H256 {
	fn to_topic(&self) -> H256 {
		*self
	}
}

impl ToTopic for uint256 {
	fn to_topic(&self) -> H256 {
		let mut out = [0u8; 32];
		self.to_big_endian(&mut out);
		H256(out)
	}
}

impl ToTopic for address {
	fn to_topic(&self) -> H256 {
		let mut out = [0u8; 32];
		out[12..32].copy_from_slice(&self.0);
		H256(out)
	}
}

impl ToTopic for uint32 {
	fn to_topic(&self) -> H256 {
		let mut out = [0u8; 32];
		out[28..32].copy_from_slice(&self.to_be_bytes());
		H256(out)
	}
}
