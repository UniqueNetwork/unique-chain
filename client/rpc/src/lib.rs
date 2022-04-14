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

use std::sync::Arc;

use codec::Decode;
use jsonrpc_core::{Error as RpcError, ErrorCode, Result};
use jsonrpc_derive::rpc;
use up_data_structs::{RpcCollection, CollectionId, CollectionStats, CollectionLimits, TokenId};
use sp_api::{BlockId, BlockT, ProvideRuntimeApi, ApiExt};
use sp_blockchain::HeaderBackend;
use up_rpc::UniqueApi as UniqueRuntimeApi;

#[rpc]
pub trait UniqueApi<BlockHash, CrossAccountId, AccountId> {
	#[rpc(name = "unique_accountTokens")]
	fn account_tokens(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenId>>;
	#[rpc(name = "unique_collectionTokens")]
	fn collection_tokens(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenId>>;
	#[rpc(name = "unique_tokenExists")]
	fn token_exists(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<bool>;

	#[rpc(name = "unique_tokenOwner")]
	fn token_owner(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<CrossAccountId>>;
	#[rpc(name = "unique_topmostTokenOwner")]
	fn topmost_token_owner(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<CrossAccountId>>;
	#[rpc(name = "unique_constMetadata")]
	fn const_metadata(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Vec<u8>>;
	#[rpc(name = "unique_variableMetadata")]
	fn variable_metadata(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Vec<u8>>;

	#[rpc(name = "unique_totalSupply")]
	fn total_supply(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<u32>;
	#[rpc(name = "unique_accountBalance")]
	fn account_balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<u32>;
	#[rpc(name = "unique_balance")]
	fn balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;
	#[rpc(name = "unique_allowance")]
	fn allowance(
		&self,
		collection: CollectionId,
		sender: CrossAccountId,
		spender: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;

	#[rpc(name = "unique_adminlist")]
	fn adminlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;
	#[rpc(name = "unique_allowlist")]
	fn allowlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;
	#[rpc(name = "unique_allowed")]
	fn allowed(
		&self,
		collection: CollectionId,
		user: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<bool>;
	#[rpc(name = "unique_lastTokenId")]
	fn last_token_id(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<TokenId>;
	#[rpc(name = "unique_collectionById")]
	fn collection_by_id(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Option<RpcCollection<AccountId>>>;
	#[rpc(name = "unique_collectionStats")]
	fn collection_stats(&self, at: Option<BlockHash>) -> Result<CollectionStats>;

	#[rpc(name = "unique_nextSponsored")]
	fn next_sponsored(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<u64>>;
	#[rpc(name = "unique_effectiveCollectionLimits")]
	fn effective_collection_limits(
		&self,
		collection_id: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Option<CollectionLimits>>;
}

pub struct Unique<C, P> {
	client: Arc<C>,
	_marker: std::marker::PhantomData<P>,
}

impl<C, P> Unique<C, P> {
	pub fn new(client: Arc<C>) -> Self {
		Self {
			client,
			_marker: Default::default(),
		}
	}
}

pub enum Error {
	RuntimeError,
}

impl From<Error> for i64 {
	fn from(e: Error) -> i64 {
		match e {
			Error::RuntimeError => 1,
		}
	}
}

macro_rules! pass_method {
	(
		$method_name:ident($($name:ident: $ty:ty),* $(,)?) -> $result:ty $(=> $mapper:expr)?
		$(; changed_in $ver:expr, $changed_method_name:ident ($($changed_name:expr), * $(,)?) => $fixer:expr)*
	) => {
		fn $method_name(
			&self,
			$(
				$name: $ty,
			)*
			at: Option<<Block as BlockT>::Hash>,
		) -> Result<$result> {
			let api = self.client.runtime_api();
			let at = BlockId::hash(at.unwrap_or_else(|| self.client.info().best_hash));
			let _api_version = if let Ok(Some(api_version)) =
				api.api_version::<dyn UniqueRuntimeApi<Block, CrossAccountId, AccountId>>(&at)
			{
				api_version
			} else {
				// unreachable for our runtime
				return Err(RpcError {
					code: ErrorCode::InvalidParams,
					message: "Api is not available".into(),
					data: None,
				})
			};

			let result = $(if _api_version < $ver {
				api.$changed_method_name(&at, $($changed_name),*).map(|r| r.map($fixer))
			} else)*
			{ api.$method_name(&at, $($name),*) };

			let result = result.map_err(|e| RpcError {
				code: ErrorCode::ServerError(Error::RuntimeError.into()),
				message: "Unable to query".into(),
				data: Some(format!("{:?}", e).into()),
			})?;
			result.map_err(|e| RpcError {
				code: ErrorCode::InvalidParams,
				message: "Runtime returned error".into(),
				data: Some(format!("{:?}", e).into()),
			})$(.map($mapper))?
		}
	};
}

#[allow(deprecated)]
impl<C, Block, CrossAccountId, AccountId>
	UniqueApi<<Block as BlockT>::Hash, CrossAccountId, AccountId> for Unique<C, Block>
where
	Block: BlockT,
	AccountId: Decode,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: UniqueRuntimeApi<Block, CrossAccountId, AccountId>,
	CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
{
	pass_method!(account_tokens(collection: CollectionId, account: CrossAccountId) -> Vec<TokenId>);
	pass_method!(collection_tokens(collection: CollectionId) -> Vec<TokenId>);
	pass_method!(token_exists(collection: CollectionId, token: TokenId) -> bool);
	pass_method!(
		token_owner(collection: CollectionId, token: TokenId) -> Option<CrossAccountId>;
		changed_in 2, token_owner_before_version_2(collection, token) => |u| Some(u)
	);
	pass_method!(topmost_token_owner(collection: CollectionId, token: TokenId) -> Option<CrossAccountId>);
	pass_method!(const_metadata(collection: CollectionId, token: TokenId) -> Vec<u8>);
	pass_method!(variable_metadata(collection: CollectionId, token: TokenId) -> Vec<u8>);

	pass_method!(total_supply(collection: CollectionId) -> u32);
	pass_method!(account_balance(collection: CollectionId, account: CrossAccountId) -> u32);
	pass_method!(balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> String => |v| v.to_string());
	pass_method!(allowance(collection: CollectionId, sender: CrossAccountId, spender: CrossAccountId, token: TokenId) -> String => |v| v.to_string());

	pass_method!(adminlist(collection: CollectionId) -> Vec<CrossAccountId>);
	pass_method!(allowlist(collection: CollectionId) -> Vec<CrossAccountId>);
	pass_method!(allowed(collection: CollectionId, user: CrossAccountId) -> bool);
	pass_method!(last_token_id(collection: CollectionId) -> TokenId);
	pass_method!(collection_by_id(collection: CollectionId) -> Option<RpcCollection<AccountId>>);
	pass_method!(collection_stats() -> CollectionStats);
	pass_method!(next_sponsored(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Option<u64>);
	pass_method!(effective_collection_limits(collection_id: CollectionId) -> Option<CollectionLimits>);
}
