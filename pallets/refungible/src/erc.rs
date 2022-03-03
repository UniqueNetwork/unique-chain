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

use up_data_structs::TokenId;
use pallet_common::erc::CommonEvmHandler;

use crate::{Config, RefungibleHandle};

impl<T: Config> CommonEvmHandler for RefungibleHandle<T> {
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungible.raw");

	fn call(
		self,
		_source: &sp_core::H160,
		_input: &[u8],
		_value: sp_core::U256,
	) -> Option<pallet_common::erc::PrecompileResult> {
		// TODO: Implement RFT variant of ERC721
		None
	}
}

pub struct RefungibleTokenHandle<T: Config>(pub RefungibleHandle<T>, pub TokenId);

impl<T: Config> CommonEvmHandler for RefungibleTokenHandle<T> {
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungibleToken.raw");

	fn call(
		self,
		_source: &sp_core::H160,
		_input: &[u8],
		_value: sp_core::U256,
	) -> Option<pallet_common::erc::PrecompileResult> {
		// TODO: Implement RFT variant of ERC20
		None
	}
}
