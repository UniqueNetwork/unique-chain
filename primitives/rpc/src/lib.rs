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
	PropertyKeyPermission, TokenData,
};
use sp_std::vec::Vec;
use codec::Decode;
use sp_runtime::DispatchError;

type Result<T> = core::result::Result<T, DispatchError>;

sp_api::decl_runtime_apis! {
	#[api_version(2)]
	pub trait UniqueApi<CrossAccountId, AccountId> where
		AccountId: Decode,
		CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
	{
		#[changed_in(2)]
		fn token_owner(collection: CollectionId, token: TokenId) -> Result<CrossAccountId>;

		fn account_tokens(collection: CollectionId, account: CrossAccountId) -> Result<Vec<TokenId>>;
		fn collection_tokens(collection: CollectionId) -> Result<Vec<TokenId>>;
		fn token_exists(collection: CollectionId, token: TokenId) -> Result<bool>;

		fn token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>>;
		fn topmost_token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>>;
		fn const_metadata(collection: CollectionId, token: TokenId) -> Result<Vec<u8>>;
		fn variable_metadata(collection: CollectionId, token: TokenId) -> Result<Vec<u8>>;

		fn collection_properties(collection: CollectionId, properties: Vec<Vec<u8>>) -> Result<Vec<Property>>;

		fn token_properties(
			collection: CollectionId,
			token_id: TokenId,
			properties: Vec<Vec<u8>>
		) -> Result<Vec<Property>>;

		fn property_permissions(
			collection: CollectionId,
			properties: Vec<Vec<u8>>
		) -> Result<Vec<PropertyKeyPermission>>;

		fn token_data(collection: CollectionId, token_id: TokenId, keys: Vec<Vec<u8>>) -> Result<TokenData<CrossAccountId>>;

		fn total_supply(collection: CollectionId) -> Result<u32>;
		fn account_balance(collection: CollectionId, account: CrossAccountId) -> Result<u32>;
		fn balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<u128>;
		fn allowance(
			collection: CollectionId,
			sender: CrossAccountId,
			spender: CrossAccountId,
			token: TokenId,
		) -> Result<u128>;

		fn adminlist(collection: CollectionId) -> Result<Vec<CrossAccountId>>;
		fn allowlist(collection: CollectionId) -> Result<Vec<CrossAccountId>>;
		fn allowed(collection: CollectionId, user: CrossAccountId) -> Result<bool>;
		fn last_token_id(collection: CollectionId) -> Result<TokenId>;
		fn collection_by_id(collection: CollectionId) -> Result<Option<RpcCollection<AccountId>>>;
		fn collection_stats() -> Result<CollectionStats>;
		fn next_sponsored(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<Option<u64>>;
		fn effective_collection_limits(collection_id: CollectionId) -> Result<Option<CollectionLimits>>;
	}
}
