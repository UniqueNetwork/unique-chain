use std::sync::Arc;

use codec::Decode;
use jsonrpc_core::{Error as RpcError, ErrorCode, Result};
use jsonrpc_derive::rpc;
use nft_data_structs::{CollectionId, TokenId};
use sp_api::{BlockId, BlockT, ProvideRuntimeApi};
use sp_blockchain::HeaderBackend;
use up_rpc::NftApi as NftRuntimeApi;

#[rpc]
pub trait NftApi<BlockHash, CrossAccountId, AccountId> {
	#[rpc(name = "nft_accountTokens")]
	fn account_tokens(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenId>>;
	#[rpc(name = "nft_tokenExists")]
	fn token_exists(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<bool>;

	#[rpc(name = "nft_tokenOwner")]
	fn token_owner(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<CrossAccountId>;
	#[rpc(name = "nft_constMetadata")]
	fn const_metadata(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Vec<u8>>;
	#[rpc(name = "nft_variableMetadata")]
	fn variable_metadata(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Vec<u8>>;

	#[rpc(name = "nft_collectionTokens")]
	fn collection_tokens(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<u32>;
	#[rpc(name = "nft_accountBalance")]
	fn account_balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<u32>;
	#[rpc(name = "nft_balance")]
	fn balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;
	#[rpc(name = "nft_allowance")]
	fn allowance(
		&self,
		collection: CollectionId,
		sender: CrossAccountId,
		spender: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;

	#[rpc(name = "nft_adminlist")]
	fn adminlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;
	#[rpc(name = "nft_allowlist")]
	fn allowlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;
	#[rpc(name = "nft_lastTokenId")]
	fn last_token_id(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<TokenId>;
}

pub struct Nft<C, P> {
	client: Arc<C>,
	_marker: std::marker::PhantomData<P>,
}

impl<C, P> Nft<C, P> {
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

impl<C, Block, CrossAccountId, AccountId> NftApi<<Block as BlockT>::Hash, CrossAccountId, AccountId>
	for Nft<C, Block>
where
	Block: BlockT,
	AccountId: Decode,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: NftRuntimeApi<Block, CrossAccountId, AccountId>,
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
	pass_method!(last_token_id(collection: CollectionId) -> TokenId);
}
