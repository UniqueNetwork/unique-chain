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

use up_data_structs::{
	CollectionId, TokenId, RpcCollection, CollectionStats, CollectionLimits, Property,
	PropertyKeyPermission, TokenData, TokenChild,
};

use sp_std::vec::Vec;
use codec::Decode;
use sp_runtime::{
	DispatchError,
	traits::{AtLeast32BitUnsigned, Member},
};

type Result<T> = core::result::Result<T, DispatchError>;

sp_api::decl_runtime_apis! {
	#[api_version(2)]
	/// Trait for generate rpc.
	pub trait AppPromotionApi<BlockNumber ,CrossAccountId, AccountId> where
		BlockNumber: Decode + Member + AtLeast32BitUnsigned,
		AccountId: Decode,
		CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
	{
		fn total_staked(staker: Option<CrossAccountId>) -> Result<u128>;
		fn total_staked_per_block(staker: CrossAccountId) -> Result<Vec<(BlockNumber, u128)>>;
		fn total_staking_locked(staker: CrossAccountId) -> Result<u128>;
		fn pending_unstake(staker: Option<CrossAccountId>) -> Result<u128>;
		fn pending_unstake_per_block(staker: CrossAccountId) -> Result<Vec<(BlockNumber, u128)>>;
	}
}
