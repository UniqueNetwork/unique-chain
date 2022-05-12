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

use evm_coder::{solidity_interface, types::*, execution::Result};
pub use pallet_evm::{PrecompileOutput, PrecompileResult, account::CrossAccountId};
use pallet_evm_coder_substrate::dispatch_to_evm;
use sp_core::{H160, U256};
use sp_std::vec::Vec;
use up_data_structs::Property;

use crate::{Pallet, CollectionHandle, Config};

/// Does not always represent a full collection, for RFT it is either
/// collection (Implementing ERC721), or specific collection token (Implementing ERC20)
pub trait CommonEvmHandler {
	const CODE: &'static [u8];

	fn call(self, source: &H160, input: &[u8], value: U256) -> Option<PrecompileResult>;
}

#[solidity_interface(name = "CollectionProperties")]
impl<T: Config> CollectionHandle<T> {
	fn set_property(&mut self, caller: caller, key: string, value: string) -> Result<()> {
		<Pallet<T>>::set_collection_property(
			self,
			&T::CrossAccountId::from_eth(caller),
			Property {
				key: <Vec<u8>>::from(key)
					.try_into()
					.map_err(|_| "key too large")?,
				value: <Vec<u8>>::from(value)
					.try_into()
					.map_err(|_| "value too large")?,
			},
		)
		.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn delete_property(&mut self, caller: caller, key: string) -> Result<()> {
		self.set_property(caller, key, string::new())
	}
}
