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
	pub trait UniqueApi<BlockNumber ,CrossAccountId, AccountId> where
		BlockNumber: Decode + Member + AtLeast32BitUnsigned,
		AccountId: Decode,
		CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
	{
		#[changed_in(2)]
		fn token_owner(collection: CollectionId, token: TokenId) -> Result<CrossAccountId>;

		/// Get number of tokens in collection owned by account.
		fn account_tokens(collection: CollectionId, account: CrossAccountId) -> Result<Vec<TokenId>>;

		/// Number of existing tokens in collection.
		fn collection_tokens(collection: CollectionId) -> Result<Vec<TokenId>>;

		/// Check token exist.
		fn token_exists(collection: CollectionId, token: TokenId) -> Result<bool>;

		/// Get token owner.
		fn token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>>;

		/// Get real owner of nested token.
		fn topmost_token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>>;

		/// Get nested tokens for the specified item.
		fn token_children(collection: CollectionId, token: TokenId) -> Result<Vec<TokenChild>>;

		/// Get collection properties.
		fn collection_properties(collection: CollectionId, properties: Option<Vec<Vec<u8>>>) -> Result<Vec<Property>>;

		/// Get token properties.
		fn token_properties(
			collection: CollectionId,
			token_id: TokenId,
			properties: Option<Vec<Vec<u8>>>
		) -> Result<Vec<Property>>;

		/// Get permissions for token properties.
		fn property_permissions(
			collection: CollectionId,
			properties: Option<Vec<Vec<u8>>>
		) -> Result<Vec<PropertyKeyPermission>>;

		/// Get token data.
		fn token_data(
			collection: CollectionId,
			token_id: TokenId,
			keys: Option<Vec<Vec<u8>>>
		) -> Result<TokenData<CrossAccountId>>;

		/// Total number of tokens in collection.
		fn total_supply(collection: CollectionId) -> Result<u32>;

		/// Get account balance for collection (sum of tokens pieces).
		fn account_balance(collection: CollectionId, account: CrossAccountId) -> Result<u32>;

		/// Get account balance for specified token.
		fn balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<u128>;

		/// Amount of token pieces allowed to spend from granded account.
		fn allowance(
			collection: CollectionId,
			sender: CrossAccountId,
			spender: CrossAccountId,
			token: TokenId,
		) -> Result<u128>;

		/// Get list of collection admins.
		fn adminlist(collection: CollectionId) -> Result<Vec<CrossAccountId>>;

		/// Get list of users that allowet to mint tikens in collection.
		fn allowlist(collection: CollectionId) -> Result<Vec<CrossAccountId>>;

		/// Check that user is in allowed list (see [`allowlist`]).
		fn allowed(collection: CollectionId, user: CrossAccountId) -> Result<bool>;

		/// Last minted token id.
		fn last_token_id(collection: CollectionId) -> Result<TokenId>;

		/// Get collection by id.
		fn collection_by_id(collection: CollectionId) -> Result<Option<RpcCollection<AccountId>>>;

		/// Get collection stats.
		fn collection_stats() -> Result<CollectionStats>;

		/// Get the number of blocks through which sponsorship will be available.
		fn next_sponsored(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<Option<u64>>;

		/// Get effective colletion limits.
		fn effective_collection_limits(collection_id: CollectionId) -> Result<Option<CollectionLimits>>;

		/// Get total pieces of token.
		fn total_pieces(collection_id: CollectionId, token_id: TokenId) -> Result<Option<u128>>;
		fn token_owners(collection: CollectionId, token: TokenId) -> Result<Vec<CrossAccountId>>;
		fn total_staked(staker: Option<CrossAccountId>) -> Result<u128>;
		fn total_staked_per_block(staker: CrossAccountId) -> Result<Vec<(BlockNumber, u128)>>;
		fn total_staking_locked(staker: CrossAccountId) -> Result<u128>;
		fn pending_unstake(staker: Option<CrossAccountId>) -> Result<u128>;
	}
}
