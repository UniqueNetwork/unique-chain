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

use codec::{Decode, Encode};
use jsonrpsee::{
	core::{RpcResult as Result},
	proc_macros::rpc,
};
use anyhow::anyhow;
use up_data_structs::{
	RpcCollection, CollectionId, CollectionStats, CollectionLimits, TokenId, Property,
	PropertyKeyPermission, TokenData, TokenChild,
};
use sp_api::{BlockId, BlockT, ProvideRuntimeApi, ApiExt};
use sp_blockchain::HeaderBackend;
use up_rpc::UniqueApi as UniqueRuntimeApi;

// RMRK
use rmrk_rpc::RmrkApi as RmrkRuntimeApi;
use up_data_structs::{
	RmrkCollectionId, RmrkNftId, RmrkBaseId, RmrkNftChild, RmrkThemeName, RmrkResourceId,
};

pub use rmrk_unique_rpc::RmrkApiServer;

#[rpc(server)]
#[async_trait]
pub trait UniqueApi<BlockHash, CrossAccountId, AccountId> {
	#[method(name = "unique_accountTokens")]
	fn account_tokens(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenId>>;
	#[method(name = "unique_collectionTokens")]
	fn collection_tokens(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenId>>;
	#[method(name = "unique_tokenExists")]
	fn token_exists(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<bool>;

	#[method(name = "unique_tokenOwner")]
	fn token_owner(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<CrossAccountId>>;
	#[method(name = "unique_topmostTokenOwner")]
	fn topmost_token_owner(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<CrossAccountId>>;
	#[method(name = "unique_tokenChildren")]
	fn token_children(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenChild>>;

	#[method(name = "unique_collectionProperties")]
	fn collection_properties(
		&self,
		collection: CollectionId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<Vec<Property>>;

	#[method(name = "unique_tokenProperties")]
	fn token_properties(
		&self,
		collection: CollectionId,
		token_id: TokenId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<Vec<Property>>;

	#[method(name = "unique_propertyPermissions")]
	fn property_permissions(
		&self,
		collection: CollectionId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<Vec<PropertyKeyPermission>>;

	#[method(name = "unique_tokenData")]
	fn token_data(
		&self,
		collection: CollectionId,
		token_id: TokenId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<TokenData<CrossAccountId>>;

	#[method(name = "unique_totalSupply")]
	fn total_supply(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<u32>;
	#[method(name = "unique_accountBalance")]
	fn account_balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<u32>;
	#[method(name = "unique_balance")]
	fn balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;
	#[method(name = "unique_allowance")]
	fn allowance(
		&self,
		collection: CollectionId,
		sender: CrossAccountId,
		spender: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;

	#[method(name = "unique_adminlist")]
	fn adminlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;
	#[method(name = "unique_allowlist")]
	fn allowlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;
	#[method(name = "unique_allowed")]
	fn allowed(
		&self,
		collection: CollectionId,
		user: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<bool>;
	#[method(name = "unique_lastTokenId")]
	fn last_token_id(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<TokenId>;
	#[method(name = "unique_collectionById")]
	fn collection_by_id(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Option<RpcCollection<AccountId>>>;
	#[method(name = "unique_collectionStats")]
	fn collection_stats(&self, at: Option<BlockHash>) -> Result<CollectionStats>;

	#[method(name = "unique_nextSponsored")]
	fn next_sponsored(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<u64>>;
	#[method(name = "unique_effectiveCollectionLimits")]
	fn effective_collection_limits(
		&self,
		collection_id: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Option<CollectionLimits>>;
}

mod rmrk_unique_rpc {
	use super::*;

	#[rpc(server)]
	#[async_trait]
	pub trait RmrkApi<
		BlockHash,
		AccountId,
		CollectionInfo,
		NftInfo,
		ResourceInfo,
		PropertyInfo,
		BaseInfo,
		PartType,
		Theme,
	>
	{
		#[method(name = "rmrk_lastCollectionIdx")]
		/// Get the latest created collection id
		fn last_collection_idx(&self, at: Option<BlockHash>) -> Result<RmrkCollectionId>;

		#[method(name = "rmrk_collectionById")]
		/// Get collection by id
		fn collection_by_id(
			&self,
			id: RmrkCollectionId,
			at: Option<BlockHash>,
		) -> Result<Option<CollectionInfo>>;

		#[method(name = "rmrk_nftById")]
		/// Get NFT by collection id and NFT id
		fn nft_by_id(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			at: Option<BlockHash>,
		) -> Result<Option<NftInfo>>;

		#[method(name = "rmrk_accountTokens")]
		/// Get tokens owned by an account in a collection
		fn account_tokens(
			&self,
			account_id: AccountId,
			collection_id: RmrkCollectionId,
			at: Option<BlockHash>,
		) -> Result<Vec<RmrkNftId>>;

		#[method(name = "rmrk_nftChildren")]
		/// Get NFT children
		fn nft_children(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			at: Option<BlockHash>,
		) -> Result<Vec<RmrkNftChild>>;

		#[method(name = "rmrk_collectionProperties")]
		/// Get collection properties
		fn collection_properties(
			&self,
			collection_id: RmrkCollectionId,
			filter_keys: Option<Vec<String>>,
			at: Option<BlockHash>,
		) -> Result<Vec<PropertyInfo>>;

		#[method(name = "rmrk_nftProperties")]
		/// Get NFT properties
		fn nft_properties(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			filter_keys: Option<Vec<String>>,
			at: Option<BlockHash>,
		) -> Result<Vec<PropertyInfo>>;

		#[method(name = "rmrk_nftResources")]
		/// Get NFT resources
		fn nft_resources(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			at: Option<BlockHash>,
		) -> Result<Vec<ResourceInfo>>;

		#[method(name = "rmrk_nftResourcePriorities")]
		/// Get NFT resource priorities
		fn nft_resource_priorities(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			at: Option<BlockHash>,
		) -> Result<Vec<RmrkResourceId>>;

		#[method(name = "rmrk_base")]
		/// Get base info
		fn base(&self, base_id: RmrkBaseId, at: Option<BlockHash>) -> Result<Option<BaseInfo>>;

		#[method(name = "rmrk_baseParts")]
		/// Get all Base's parts
		fn base_parts(&self, base_id: RmrkBaseId, at: Option<BlockHash>) -> Result<Vec<PartType>>;

		#[method(name = "rmrk_themeNames")]
		fn theme_names(
			&self,
			base_id: RmrkBaseId,
			at: Option<BlockHash>,
		) -> Result<Vec<RmrkThemeName>>;

		#[method(name = "rmrk_themes")]
		fn theme(
			&self,
			base_id: RmrkBaseId,
			theme_name: String,
			filter_keys: Option<Vec<String>>,
			at: Option<BlockHash>,
		) -> Result<Option<Theme>>;
	}
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

macro_rules! pass_method {
	(
		$method_name:ident(
			$($(#[map(|$map_arg:ident| $map:expr)])? $name:ident: $ty:ty),* $(,)?
		) -> $result:ty $(=> $mapper:expr)?,
		//$runtime_name:ident $(<$($lt: tt),+>)*
		$runtime_api_macro:ident
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
				api.api_version::<$runtime_api_macro!()>(&at)
			{
				api_version
			} else {
				// unreachable for our runtime
				return Err(anyhow!("api is not available").into())
			};

			let result = $(if _api_version < $ver {
				api.$changed_method_name(&at, $($changed_name),*).map(|r| r.map($fixer))
			} else)*
			{ api.$method_name(&at, $($((|$map_arg: $ty| $map))? ($name)),*) };

			Ok(result
				.map_err(|e| anyhow!("unable to query: {e}"))?
				.map_err(|e| anyhow!("runtime error: {e:?}"))$(.map($mapper))??)
		}
	};
}

macro_rules! unique_api {
	() => {
		dyn UniqueRuntimeApi<Block, CrossAccountId, AccountId>
	};
}

macro_rules! rmrk_api {
	() => {
		dyn RmrkRuntimeApi<Block, AccountId, CollectionInfo, NftInfo, ResourceInfo, PropertyInfo, BaseInfo, PartType, Theme>
	};
}

#[allow(deprecated)]
impl<C, Block, CrossAccountId, AccountId>
	UniqueApiServer<<Block as BlockT>::Hash, CrossAccountId, AccountId> for Unique<C, Block>
where
	Block: BlockT,
	AccountId: Decode,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: UniqueRuntimeApi<Block, CrossAccountId, AccountId>,
	CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
{
	pass_method!(
		account_tokens(collection: CollectionId, account: CrossAccountId) -> Vec<TokenId>, unique_api
	);
	pass_method!(
		collection_tokens(collection: CollectionId) -> Vec<TokenId>, unique_api
	);
	pass_method!(
		token_exists(collection: CollectionId, token: TokenId) -> bool, unique_api
	);
	pass_method!(
		token_owner(collection: CollectionId, token: TokenId) -> Option<CrossAccountId>, unique_api
	);
	pass_method!(
		topmost_token_owner(collection: CollectionId, token: TokenId) -> Option<CrossAccountId>, unique_api
	);
	pass_method!(token_children(collection: CollectionId, token: TokenId) -> Vec<TokenChild>, unique_api);
	pass_method!(total_supply(collection: CollectionId) -> u32, unique_api);
	pass_method!(account_balance(collection: CollectionId, account: CrossAccountId) -> u32, unique_api);
	pass_method!(balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> String => |v| v.to_string(), unique_api);
	pass_method!(
		allowance(collection: CollectionId, sender: CrossAccountId, spender: CrossAccountId, token: TokenId) -> String => |v| v.to_string(),
		unique_api
	);

	pass_method!(collection_properties(
		collection: CollectionId,

		#[map(|keys| string_keys_to_bytes_keys(keys))]
		keys: Option<Vec<String>>
	) -> Vec<Property>, unique_api);

	pass_method!(token_properties(
		collection: CollectionId,
		token_id: TokenId,

		#[map(|keys| string_keys_to_bytes_keys(keys))]
		keys: Option<Vec<String>>
	) -> Vec<Property>, unique_api);

	pass_method!(property_permissions(
		collection: CollectionId,

		#[map(|keys| string_keys_to_bytes_keys(keys))]
		keys: Option<Vec<String>>
	) -> Vec<PropertyKeyPermission>, unique_api);

	pass_method!(token_data(
		collection: CollectionId,
		token_id: TokenId,

		#[map(|keys| string_keys_to_bytes_keys(keys))]
		keys: Option<Vec<String>>,
	) -> TokenData<CrossAccountId>, unique_api);

	pass_method!(adminlist(collection: CollectionId) -> Vec<CrossAccountId>, unique_api);
	pass_method!(allowlist(collection: CollectionId) -> Vec<CrossAccountId>, unique_api);
	pass_method!(allowed(collection: CollectionId, user: CrossAccountId) -> bool, unique_api);
	pass_method!(last_token_id(collection: CollectionId) -> TokenId, unique_api);
	pass_method!(collection_by_id(collection: CollectionId) -> Option<RpcCollection<AccountId>>, unique_api);
	pass_method!(collection_stats() -> CollectionStats, unique_api);
	pass_method!(next_sponsored(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Option<u64>, unique_api);
	pass_method!(effective_collection_limits(collection_id: CollectionId) -> Option<CollectionLimits>, unique_api);
}

#[allow(deprecated)]
impl<
		C,
		Block,
		AccountId,
		CollectionInfo,
		NftInfo,
		ResourceInfo,
		PropertyInfo,
		BaseInfo,
		PartType,
		Theme,
	>
	rmrk_unique_rpc::RmrkApiServer<
		<Block as BlockT>::Hash,
		AccountId,
		CollectionInfo,
		NftInfo,
		ResourceInfo,
		PropertyInfo,
		BaseInfo,
		PartType,
		Theme,
	> for Unique<C, Block>
where
	C: Send + Sync + 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: RmrkRuntimeApi<
		Block,
		AccountId,
		CollectionInfo,
		NftInfo,
		ResourceInfo,
		PropertyInfo,
		BaseInfo,
		PartType,
		Theme,
	>,
	AccountId: Decode + Encode,
	CollectionInfo: Decode,
	NftInfo: Decode,
	ResourceInfo: Decode,
	PropertyInfo: Decode,
	BaseInfo: Decode,
	PartType: Decode,
	Theme: Decode,
	Block: BlockT,
{
	pass_method!(last_collection_idx() -> RmrkCollectionId, rmrk_api);
	pass_method!(collection_by_id(id: RmrkCollectionId) -> Option<CollectionInfo>, rmrk_api);
	pass_method!(nft_by_id(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Option<NftInfo>, rmrk_api);
	pass_method!(account_tokens(account_id: AccountId, collection_id: RmrkCollectionId) -> Vec<RmrkNftId>, rmrk_api);
	pass_method!(nft_children(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Vec<RmrkNftChild>, rmrk_api);
	pass_method!(
		collection_properties(
			collection_id: RmrkCollectionId,

			#[map(|keys| string_keys_to_bytes_keys(keys))]
			filter_keys: Option<Vec<String>>
		) -> Vec<PropertyInfo>,
		rmrk_api
	);
	pass_method!(
		nft_properties(
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,

			#[map(|keys| string_keys_to_bytes_keys(keys))]
			filter_keys: Option<Vec<String>>
		) -> Vec<PropertyInfo>,
		rmrk_api
	);
	pass_method!(nft_resources(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Vec<ResourceInfo>, rmrk_api);
	pass_method!(nft_resource_priorities(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Vec<RmrkResourceId>, rmrk_api);
	pass_method!(base(base_id: RmrkBaseId) -> Option<BaseInfo>, rmrk_api);
	pass_method!(base_parts(base_id: RmrkBaseId) -> Vec<PartType>, rmrk_api);
	pass_method!(theme_names(base_id: RmrkBaseId) -> Vec<RmrkThemeName>, rmrk_api);
	pass_method!(
		theme(
			base_id: RmrkBaseId,

			#[map(|n| n.into_bytes())]
			theme_name: String,

			#[map(|keys| string_keys_to_bytes_keys(keys))]
			filter_keys: Option<Vec<String>>
		) -> Option<Theme>, rmrk_api);
}

fn string_keys_to_bytes_keys(keys: Option<Vec<String>>) -> Option<Vec<Vec<u8>>> {
	keys.map(|keys| keys.into_iter().map(|key| key.into_bytes()).collect())
}
