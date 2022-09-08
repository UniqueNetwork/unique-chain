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

//! The module contains a number of functions for converting and checking ethereum identifiers.

use evm_coder::types::{uint256, address};
pub use pallet_evm::account::{Config, CrossAccountId};
use sp_core::H160;
use up_data_structs::CollectionId;

// 0x17c4e6453Cc49AAAaEACA894e6D9683e00000001 - collection 1
// TODO: Unhardcode prefix
const ETH_COLLECTION_PREFIX: [u8; 16] = [
	0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
];

/// Maps the ethereum address of the collection in substrate.
pub fn map_eth_to_id(eth: &H160) -> Option<CollectionId> {
	if eth[0..16] != ETH_COLLECTION_PREFIX {
		return None;
	}
	let mut id_bytes = [0; 4];
	id_bytes.copy_from_slice(&eth[16..20]);
	Some(CollectionId(u32::from_be_bytes(id_bytes)))
}

/// Maps the substrate collection id in ethereum.
pub fn collection_id_to_address(id: CollectionId) -> H160 {
	let mut out = [0; 20];
	out[0..16].copy_from_slice(&ETH_COLLECTION_PREFIX);
	out[16..20].copy_from_slice(&u32::to_be_bytes(id.0));
	H160(out)
}

/// Check if the ethereum address is a collection.
pub fn is_collection(address: &H160) -> bool {
	address[0..16] == ETH_COLLECTION_PREFIX
}

/// Convert `CrossAccountId` to `uint256`.
pub fn convert_cross_account_to_uint256<T: Config>(from: &T::CrossAccountId) -> uint256
where
	T::AccountId: AsRef<[u8; 32]>,
{
	let slice = from.as_sub().as_ref();
	uint256::from_big_endian(slice)
}

/// Convert `uint256` to `CrossAccountId`.
pub fn convert_uint256_to_cross_account<T: Config>(from: uint256) -> T::CrossAccountId
where
	T::AccountId: From<[u8; 32]>,
{
	let mut new_admin_arr = [0_u8; 32];
	from.to_big_endian(&mut new_admin_arr);
	let account_id = T::AccountId::from(new_admin_arr);
	T::CrossAccountId::from_sub(account_id)
}

/// Convert `CrossAccountId` to `(address, uint256)`.
pub fn convert_cross_account_to_tuple<T: Config>(cross_account_id: &T::CrossAccountId) -> (address, uint256)
where
	T::AccountId: AsRef<[u8; 32]>
{
	if cross_account_id.is_canonical_substrate() {
		let sub = convert_cross_account_to_uint256::<T>(cross_account_id);
		(Default::default(), sub)
	} else {
		let eth = *cross_account_id.as_eth();
		(eth, Default::default())
	}
}