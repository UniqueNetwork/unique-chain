use std::sync::Arc;

use codec::Decode;
use jsonrpc_core::{Error as RpcError, ErrorCode, Result};
use jsonrpc_derive::rpc;
use up_data_structs::{Collection, CollectionId, CollectionStats, TokenId};
use sp_api::{BlockId, BlockT, ProvideRuntimeApi};
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
	) -> Result<CrossAccountId>;
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

	#[rpc(name = "unique_collectionTokens")]
	fn collection_tokens(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<u32>;
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
	) -> Result<Option<Collection<AccountId>>>;
	#[rpc(name = "unique_collectionStats")]
	fn collection_stats(&self, at: Option<BlockHash>) -> Result<CollectionStats>;
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
	($method_name:ident($($name:ident: $ty:ty),* $(,)?) -> $result:ty $(=> $mapper:expr)?) => {
		fn $method_name(
			&self,
			$(
				$name: $ty,
			)*
			at: Option<<Block as BlockT>::Hash>,
		) -> Result<$result> {
			let api = self.client.runtime_api();
			let at = BlockId::hash(at.unwrap_or_else(|| self.client.info().best_hash));

			api.$method_name(&at, $($name),*).map_err(|e| RpcError {
				code: ErrorCode::ServerError(Error::RuntimeError.into()),
				message: "Unable to query".into(),
				data: Some(format!("{:?}", e).into()),
			}) $(
				.map($mapper)
			)?
		}
	};
}

impl<C, Block, CrossAccountId, AccountId>
	UniqueApi<<Block as BlockT>::Hash, CrossAccountId, AccountId> for Unique<C, Block>
where
	Block: BlockT,
	AccountId: Decode,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: UniqueRuntimeApi<Block, CrossAccountId, AccountId>,
	CrossAccountId: pallet_common::account::CrossAccountId<AccountId>,
{
	pass_method!(account_tokens(collection: CollectionId, account: CrossAccountId) -> Vec<TokenId>);
	pass_method!(token_exists(collection: CollectionId, token: TokenId) -> bool);
	pass_method!(token_owner(collection: CollectionId, token: TokenId) -> CrossAccountId);
	pass_method!(const_metadata(collection: CollectionId, token: TokenId) -> Vec<u8>);
	pass_method!(variable_metadata(collection: CollectionId, token: TokenId) -> Vec<u8>);
	pass_method!(collection_tokens(collection: CollectionId) -> u32);
	pass_method!(account_balance(collection: CollectionId, account: CrossAccountId) -> u32);
	pass_method!(balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> String => |v| v.to_string());
	pass_method!(allowance(collection: CollectionId, sender: CrossAccountId, spender: CrossAccountId, token: TokenId) -> String => |v| v.to_string());

	pass_method!(adminlist(collection: CollectionId) -> Vec<CrossAccountId>);
	pass_method!(allowlist(collection: CollectionId) -> Vec<CrossAccountId>);
	pass_method!(allowed(collection: CollectionId, user: CrossAccountId) -> bool);
	pass_method!(last_token_id(collection: CollectionId) -> TokenId);
	pass_method!(collection_by_id(collection: CollectionId) -> Option<Collection<AccountId>>);
	pass_method!(collection_stats() -> CollectionStats);
}
