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

#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::sp_runtime::AccountId32;
use sp_core::H160;
use parity_scale_codec::{Encode, EncodeLike, Decode, MaxEncodedLen};
use scale_info::TypeInfo;

/// Transforms substrate addresses to ethereum (Reverse of `EvmAddressMapping`)
/// pallet_evm doesn't have this, as it only checks if eth address
/// is owned by substrate via `EnsureAddressOrigin` trait
///
/// This trait implementations shouldn't conflict with used `EnsureAddressOrigin`
pub trait EvmBackwardsAddressMapping<AccountId> {
	fn from_account_id(account_id: AccountId) -> H160;
}

/// Should have same mapping as EnsureAddressTruncated
pub struct MapBackwardsAddressTruncated;
impl EvmBackwardsAddressMapping<AccountId32> for MapBackwardsAddressTruncated {
	fn from_account_id(account_id: AccountId32) -> H160 {
		let mut out = [0; 20];
		out.copy_from_slice(&(account_id.as_ref() as &[u8])[0..20]);
		H160(out)
	}
}

pub trait CrossAccountId<AccountId>:
	Encode + EncodeLike + Decode + TypeInfo + MaxEncodedLen + Clone + PartialEq + Ord + core::fmt::Debug
// +
// Serialize + Deserialize<'static>
{
	fn as_sub(&self) -> &AccountId;
	fn as_eth(&self) -> &H160;

	fn from_sub(account: AccountId) -> Self;
	fn from_eth(account: H160) -> Self;

	fn conv_eq(&self, other: &Self) -> bool;
}
