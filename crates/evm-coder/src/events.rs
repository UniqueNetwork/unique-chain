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
