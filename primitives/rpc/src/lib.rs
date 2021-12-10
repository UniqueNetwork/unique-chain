#![cfg_attr(not(feature = "std"), no_std)]

use up_data_structs::{CollectionId, TokenId, Collection, CollectionStats};
use sp_std::vec::Vec;
use sp_core::H160;
use codec::Decode;
use sp_runtime::DispatchError;

type Result<T> = core::result::Result<T, DispatchError>;

sp_api::decl_runtime_apis! {
	pub trait UniqueApi<CrossAccountId, AccountId> where
		AccountId: Decode,
		CrossAccountId: pallet_common::account::CrossAccountId<AccountId>,
	{
		fn account_tokens(collection: CollectionId, account: CrossAccountId) -> Result<Vec<TokenId>>;
		fn token_exists(collection: CollectionId, token: TokenId) -> Result<bool>;

		fn token_owner(collection: CollectionId, token: TokenId) -> Result<CrossAccountId>;
		fn const_metadata(collection: CollectionId, token: TokenId) -> Result<Vec<u8>>;
		fn variable_metadata(collection: CollectionId, token: TokenId) -> Result<Vec<u8>>;

		fn collection_tokens(collection: CollectionId) -> Result<u32>;
		fn account_balance(collection: CollectionId, account: CrossAccountId) -> Result<u32>;
		fn balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<u128>;
		fn allowance(
			collection: CollectionId,
			sender: CrossAccountId,
			spender: CrossAccountId,
			token: TokenId,
		) -> Result<u128>;

		/// Used for ethereum integration
		fn eth_contract_code(account: H160) -> Option<Vec<u8>>;

		fn adminlist(collection: CollectionId) -> Result<Vec<CrossAccountId>>;
		fn allowlist(collection: CollectionId) -> Result<Vec<CrossAccountId>>;
		fn allowed(collection: CollectionId, user: CrossAccountId) -> Result<bool>;
		fn last_token_id(collection: CollectionId) -> Result<TokenId>;
		fn collection_by_id(collection: CollectionId) -> Result<Option<Collection<AccountId>>>;
		fn collection_stats() -> Result<CollectionStats>;
	}
}
