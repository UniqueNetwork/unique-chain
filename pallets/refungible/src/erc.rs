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

extern crate alloc;
use evm_coder::{generate_stubgen, solidity_interface, types::*};

use pallet_common::{CollectionHandle, erc::CollectionCall, erc::CommonEvmHandler};

use pallet_evm::PrecompileHandle;
use pallet_evm_coder_substrate::call;

use crate::{Config, RefungibleHandle};

#[solidity_interface(
	name = "UniqueRFT",
	is(via("CollectionHandle<T>", common_mut, Collection),)
)]
impl<T: Config> RefungibleHandle<T> where T::AccountId: From<[u8; 32]> {}

// Not a tests, but code generators
generate_stubgen!(gen_impl, UniqueRFTCall<()>, true);
generate_stubgen!(gen_iface, UniqueRFTCall<()>, false);

impl<T: Config> CommonEvmHandler for RefungibleHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungible.raw");
	fn call(
		self,
		handle: &mut impl PrecompileHandle,
	) -> Option<pallet_common::erc::PrecompileResult> {
		call::<T, UniqueRFTCall<T>, _, _>(handle, self)
	}
}
