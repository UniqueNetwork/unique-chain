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

#![allow(dead_code)]

use evm_coder::{ToLog, types::*};
use primitive_types::U256;

#[derive(ToLog)]
enum ERC721Log {
	Transfer {
		#[indexed]
		from: Address,
		#[indexed]
<<<<<<< HEAD
<<<<<<< HEAD
		to: Address,
=======
		to: address,
>>>>>>> c1366a22 (fix: unit tests)
=======
		to: Address,
>>>>>>> 314a48de (refac: rename address -> Address)
		value: U256,
	},
	Eee {
		#[indexed]
<<<<<<< HEAD
<<<<<<< HEAD
		aaa: Address,
=======
		aaa: address,
>>>>>>> c1366a22 (fix: unit tests)
=======
		aaa: Address,
>>>>>>> 314a48de (refac: rename address -> Address)
		bbb: U256,
	},
}
