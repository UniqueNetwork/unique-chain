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

use std::marker::PhantomData;
use evm_coder::{execution::Result, generate_stubgen, solidity_interface, types::*};

struct Generic<T>(PhantomData<T>);

#[solidity_interface(name = GenericIs)]
impl<T> Generic<T> {
	fn test_1(&self) -> Result<uint256> {
		unreachable!()
	}
}

#[solidity_interface(name = Generic, is(GenericIs))]
impl<T: Into<u32>> Generic<T> {
	fn test_2(&self) -> Result<uint256> {
		unreachable!()
	}
}

generate_stubgen!(gen_iface, GenericCall<()>, false);

#[solidity_interface(name = GenericWhere)]
impl<T> Generic<T>
where
	T: core::fmt::Debug,
{
	fn test_3(&self) -> Result<uint256> {
		unreachable!()
	}
}

generate_stubgen!(gen_where_iface, GenericWhereCall<()>, false);
