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

pub mod sponsoring;

use fp_evm::PrecompileResult;
use pallet_common::{
	CollectionById,
	erc::CommonEvmHandler,
	eth::{map_eth_to_id, map_eth_to_token_id},
};
use pallet_fungible::FungibleHandle;
use pallet_nonfungible::NonfungibleHandle;
use pallet_refungible::{RefungibleHandle, erc::RefungibleTokenHandle};
use sp_std::borrow::ToOwned;
use sp_std::vec::Vec;
use sp_core::{H160, U256};
use crate::{CollectionMode, Config, dispatch::Dispatched};
use pallet_common::CollectionHandle;

pub struct UniqueErcSupport<T: Config>(core::marker::PhantomData<T>);

impl<T: Config> pallet_evm::OnMethodCall<T> for UniqueErcSupport<T> {
	fn is_reserved(target: &H160) -> bool {
		map_eth_to_id(target).is_some()
	}
	fn is_used(target: &H160) -> bool {
		map_eth_to_id(target)
			.map(<CollectionById<T>>::contains_key)
			.unwrap_or(false)
	}
	fn get_code(target: &H160) -> Option<Vec<u8>> {
		if let Some(collection_id) = map_eth_to_id(target) {
			let collection = <CollectionById<T>>::get(collection_id)?;
			Some(
				match collection.mode {
					CollectionMode::NFT => <NonfungibleHandle<T>>::CODE,
					CollectionMode::Fungible(_) => <FungibleHandle<T>>::CODE,
					CollectionMode::ReFungible => <RefungibleHandle<T>>::CODE,
				}
				.to_owned(),
			)
		} else if let Some((collection_id, _token_id)) = map_eth_to_token_id(target) {
			let collection = <CollectionById<T>>::get(collection_id)?;
			if collection.mode != CollectionMode::ReFungible {
				return None;
			}
			// TODO: check token existence
			Some(<RefungibleTokenHandle<T>>::CODE.to_owned())
		} else {
			None
		}
	}
	fn call(
		source: &H160,
		target: &H160,
		gas_limit: u64,
		input: &[u8],
		value: U256,
	) -> Option<PrecompileResult> {
		if let Some(collection_id) = map_eth_to_id(target) {
			let collection = <CollectionHandle<T>>::new_with_gas_limit(collection_id, gas_limit)?;
			let dispatched = Dispatched::dispatch(collection);

			match dispatched {
				Dispatched::Fungible(h) => h.call(source, input, value),
				Dispatched::Nonfungible(h) => h.call(source, input, value),
				Dispatched::Refungible(h) => h.call(source, input, value),
			}
		} else if let Some((collection_id, token_id)) = map_eth_to_token_id(target) {
			let collection = <CollectionHandle<T>>::new_with_gas_limit(collection_id, gas_limit)?;
			if collection.mode != CollectionMode::ReFungible {
				return None;
			}

			let handle = RefungibleHandle::cast(collection);
			// TODO: check token existence
			RefungibleTokenHandle(handle, token_id).call(source, input, value)
		} else {
			None
		}
	}
}
