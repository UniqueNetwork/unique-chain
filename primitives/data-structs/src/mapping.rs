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

//! This module contains mapping between different addresses.

use core::marker::PhantomData;

use sp_core::H160;

use crate::{CollectionId, TokenId};
use pallet_evm::account::CrossAccountId;

/// Trait for mapping between token id and some `Address`.
pub trait TokenAddressMapping<Address> {
	/// Map token id to `Address`.
	fn token_to_address(collection: CollectionId, token: TokenId) -> Address;

	/// Map `Address` to token id.
	fn address_to_token(address: &Address) -> Option<(CollectionId, TokenId)>;

	/// Check is address for token.
	fn is_token_address(address: &Address) -> bool;
}

/// Unit struct for mapping token id to/from *Evm address* represented by [`H160`].
pub struct EvmTokenAddressMapping;

/// 0xf8238ccfff8ed887463fd5e00000000100000002  - collection 1, token 2
const ETH_COLLECTION_TOKEN_PREFIX: [u8; 12] = [
	0xf8, 0x23, 0x8c, 0xcf, 0xff, 0x8e, 0xd8, 0x87, 0x46, 0x3f, 0xd5, 0xe0,
];

impl TokenAddressMapping<H160> for EvmTokenAddressMapping {
	fn token_to_address(collection: CollectionId, token: TokenId) -> H160 {
		let mut out = [0; 20];
		out[0..12].copy_from_slice(&ETH_COLLECTION_TOKEN_PREFIX);
		out[12..16].copy_from_slice(&u32::to_be_bytes(collection.0));
		out[16..20].copy_from_slice(&u32::to_be_bytes(token.0));
		H160(out)
	}

	fn address_to_token(eth: &H160) -> Option<(CollectionId, TokenId)> {
		if eth[0..12] != ETH_COLLECTION_TOKEN_PREFIX {
			return None;
		}
		let mut id_bytes = [0; 4];
		let mut token_id_bytes = [0; 4];
		id_bytes.copy_from_slice(&eth[12..16]);
		token_id_bytes.copy_from_slice(&eth[16..20]);
		Some((
			CollectionId(u32::from_be_bytes(id_bytes)),
			TokenId(u32::from_be_bytes(token_id_bytes)),
		))
	}

	fn is_token_address(address: &H160) -> bool {
		address[0..12] == ETH_COLLECTION_TOKEN_PREFIX
	}
}

/// Unit struct for mapping token id to/from [`CrossAccountId`].
pub struct CrossTokenAddressMapping<A>(PhantomData<A>);

impl<A, C: CrossAccountId<A>> TokenAddressMapping<C> for CrossTokenAddressMapping<A> {
	fn token_to_address(collection: CollectionId, token: TokenId) -> C {
		C::from_eth(EvmTokenAddressMapping::token_to_address(collection, token))
	}

	fn address_to_token(address: &C) -> Option<(CollectionId, TokenId)> {
		EvmTokenAddressMapping::address_to_token(address.as_eth())
	}

	fn is_token_address(address: &C) -> bool {
		EvmTokenAddressMapping::is_token_address(address.as_eth())
	}
}
