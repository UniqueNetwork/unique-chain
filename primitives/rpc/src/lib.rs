#![cfg_attr(not(feature = "std"), no_std)]

use nft_data_structs::{CollectionId, TokenId};
use sp_std::vec::Vec;
use sp_core::H160;
use codec::Decode;

sp_api::decl_runtime_apis! {
	pub trait NftApi<CrossAccountId, AccountId> where
		AccountId: Decode,
		CrossAccountId: pallet_common::account::CrossAccountId<AccountId>,
	{
		fn account_tokens(collection: CollectionId, account: CrossAccountId) -> Vec<TokenId>;
		fn token_exists(collection: CollectionId, token: TokenId) -> bool;

		fn token_owner(collection: CollectionId, token: TokenId) -> CrossAccountId;
		fn const_metadata(collection: CollectionId, token: TokenId) -> Vec<u8>;
		fn variable_metadata(collection: CollectionId, token: TokenId) -> Vec<u8>;

		fn collection_tokens(collection: CollectionId) -> u32;
		fn account_balance(collection: CollectionId, account: CrossAccountId) -> u32;
		fn balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> u128;
		fn allowance(
			collection: CollectionId,
			sender: CrossAccountId,
			spender: CrossAccountId,
			token: TokenId,
		) -> u128;

		/// Used for ethereum integration
		fn eth_contract_code(account: H160) -> Option<Vec<u8>>;

		fn adminlist(collection: CollectionId) -> Vec<AccountId>;
		fn allowlist(collection: CollectionId) -> Vec<AccountId>;
		fn last_token_id(collection: CollectionId) -> TokenId;
	}
}
