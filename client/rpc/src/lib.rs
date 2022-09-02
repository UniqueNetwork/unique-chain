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

// Original License
use std::sync::Arc;

use codec::{Decode, Encode};
use jsonrpsee::{
	core::{RpcResult as Result},
	proc_macros::rpc,
};
use anyhow::anyhow;
use sp_runtime::traits::{AtLeast32BitUnsigned, Member};
use up_data_structs::{
	RpcCollection, CollectionId, CollectionStats, CollectionLimits, TokenId, Property,
	PropertyKeyPermission, TokenData, TokenChild,
};
use sp_api::{BlockId, BlockT, ProvideRuntimeApi, ApiExt};
use sp_blockchain::HeaderBackend;
use up_rpc::UniqueApi as UniqueRuntimeApi;
use app_promotion_rpc::AppPromotionApi as AppPromotionRuntimeApi;

// RMRK
use rmrk_rpc::RmrkApi as RmrkRuntimeApi;
use up_data_structs::{
	RmrkCollectionId, RmrkNftId, RmrkBaseId, RmrkNftChild, RmrkThemeName, RmrkResourceId,
};

pub use app_promotion_unique_rpc::AppPromotionApiServer;
pub use rmrk_unique_rpc::RmrkApiServer;

#[rpc(server)]
#[async_trait]
pub trait UniqueApi<BlockHash, BlockNumber, CrossAccountId, AccountId> {
	/// Get tokens owned by account.
	#[method(name = "unique_accountTokens")]
	fn account_tokens(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenId>>;

	/// Get tokens contained within a collection.
	#[method(name = "unique_collectionTokens")]
	fn collection_tokens(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenId>>;

	/// Check if the token exists.
	#[method(name = "unique_tokenExists")]
	fn token_exists(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<bool>;

	/// Get the token owner.
	#[method(name = "unique_tokenOwner")]
	fn token_owner(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<CrossAccountId>>;

	/// Returns 10 tokens owners in no particular order.
	#[method(name = "unique_tokenOwners")]
	fn token_owners(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;

	/// Get the topmost token owner in the hierarchy of a possibly nested token.
	#[method(name = "unique_topmostTokenOwner")]
	fn topmost_token_owner(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<CrossAccountId>>;

	/// Get tokens nested directly into the token.
	#[method(name = "unique_tokenChildren")]
	fn token_children(
		&self,
		collection: CollectionId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Vec<TokenChild>>;

	/// Get collection properties, optionally limited to the provided keys.
	#[method(name = "unique_collectionProperties")]
	fn collection_properties(
		&self,
		collection: CollectionId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<Vec<Property>>;

	/// Get token properties, optionally limited to the provided keys.
	#[method(name = "unique_tokenProperties")]
	fn token_properties(
		&self,
		collection: CollectionId,
		token_id: TokenId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<Vec<Property>>;

	/// Get property permissions, optionally limited to the provided keys.
	#[method(name = "unique_propertyPermissions")]
	fn property_permissions(
		&self,
		collection: CollectionId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<Vec<PropertyKeyPermission>>;

	/// Get token data, including properties, optionally limited to the provided keys, and total pieces for an RFT.
	#[method(name = "unique_tokenData")]
	fn token_data(
		&self,
		collection: CollectionId,
		token_id: TokenId,
		keys: Option<Vec<String>>,
		at: Option<BlockHash>,
	) -> Result<TokenData<CrossAccountId>>;

	/// Get the amount of distinctive tokens present in a collection.
	#[method(name = "unique_totalSupply")]
	fn total_supply(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<u32>;

	/// Get the amount of any user tokens owned by an account.
	#[method(name = "unique_accountBalance")]
	fn account_balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<u32>;

	/// Get the amount of a specific token owned by an account.
	#[method(name = "unique_balance")]
	fn balance(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;

	/// Get the amount of currently possible sponsored transactions on a token for the fee to be taken off a sponsor.
	#[method(name = "unique_allowance")]
	fn allowance(
		&self,
		collection: CollectionId,
		sender: CrossAccountId,
		spender: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<String>;

	/// Get the list of admin accounts of a collection.
	#[method(name = "unique_adminlist")]
	fn adminlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;

	/// Get the list of accounts allowed to operate within a collection.
	#[method(name = "unique_allowlist")]
	fn allowlist(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Vec<CrossAccountId>>;

	/// Check if a user is allowed to operate within a collection.
	#[method(name = "unique_allowed")]
	fn allowed(
		&self,
		collection: CollectionId,
		user: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<bool>;

	/// Get the last token ID created in a collection.
	#[method(name = "unique_lastTokenId")]
	fn last_token_id(&self, collection: CollectionId, at: Option<BlockHash>) -> Result<TokenId>;

	/// Get collection info by the specified ID.
	#[method(name = "unique_collectionById")]
	fn collection_by_id(
		&self,
		collection: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Option<RpcCollection<AccountId>>>;

	/// Get chain stats about collections.
	#[method(name = "unique_collectionStats")]
	fn collection_stats(&self, at: Option<BlockHash>) -> Result<CollectionStats>;

	/// Get the number of blocks until sponsoring a transaction is available.
	#[method(name = "unique_nextSponsored")]
	fn next_sponsored(
		&self,
		collection: CollectionId,
		account: CrossAccountId,
		token: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<u64>>;

	/// Get effective collection limits. If not explicitly set, get the chain defaults.
	#[method(name = "unique_effectiveCollectionLimits")]
	fn effective_collection_limits(
		&self,
		collection_id: CollectionId,
		at: Option<BlockHash>,
	) -> Result<Option<CollectionLimits>>;

	/// Get the total amount of pieces of an RFT.
	#[method(name = "unique_totalPieces")]
	fn total_pieces(
		&self,
		collection_id: CollectionId,
		token_id: TokenId,
		at: Option<BlockHash>,
	) -> Result<Option<String>>;
}

mod app_promotion_unique_rpc {
	use super::*;
	
	#[rpc(server)]
	#[async_trait]
	pub trait AppPromotionApi<BlockHash, BlockNumber, CrossAccountId, AccountId> {
		/// Returns the total amount of staked tokens.
		#[method(name = "appPromotion_totalStaked")]
		fn total_staked(&self, staker: Option<CrossAccountId>, at: Option<BlockHash>)
			-> Result<String>;

		///Returns the total amount of staked tokens per block when staked.
		#[method(name = "appPromotion_totalStakedPerBlock")]
		fn total_staked_per_block(
			&self,
			staker: CrossAccountId,
			at: Option<BlockHash>,
		) -> Result<Vec<(BlockNumber, String)>>;

		/// Returns the total amount locked by staking tokens.
		#[method(name = "appPromotion_totalStakingLocked")]
		fn total_staking_locked(&self, staker: CrossAccountId, at: Option<BlockHash>)
			-> Result<String>;

		/// Returns the total amount of tokens pending withdrawal from staking.
		#[method(name = "appPromotion_pendingUnstake")]
		fn pending_unstake(
			&self,
			staker: Option<CrossAccountId>,
			at: Option<BlockHash>,
		) -> Result<String>;

		/// Returns the total amount of tokens pending withdrawal from staking per block.
		#[method(name = "appPromotion_pendingUnstakePerBlock")]
		fn pending_unstake_per_block(
			&self,
			staker: CrossAccountId,
			at: Option<BlockHash>,
		) -> Result<Vec<(BlockNumber, String)>>;
	}
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
		/// Get the latest created collection ID.
		#[method(name = "rmrk_lastCollectionIdx")]
		fn last_collection_idx(&self, at: Option<BlockHash>) -> Result<RmrkCollectionId>;

		/// Get collection info by ID.
		#[method(name = "rmrk_collectionById")]
		fn collection_by_id(
			&self,
			id: RmrkCollectionId,
			at: Option<BlockHash>,
		) -> Result<Option<CollectionInfo>>;

		/// Get NFT info by collection and NFT IDs.
		#[method(name = "rmrk_nftById")]
		fn nft_by_id(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			at: Option<BlockHash>,
		) -> Result<Option<NftInfo>>;

		/// Get tokens owned by an account in a collection.
		#[method(name = "rmrk_accountTokens")]
		fn account_tokens(
			&self,
			account_id: AccountId,
			collection_id: RmrkCollectionId,
			at: Option<BlockHash>,
		) -> Result<Vec<RmrkNftId>>;

		/// Get tokens nested in an NFT - its direct children (not the children's children).
		#[method(name = "rmrk_nftChildren")]
		fn nft_children(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			at: Option<BlockHash>,
		) -> Result<Vec<RmrkNftChild>>;

		/// Get collection properties, created by the user - not the proxy-specific properties.
		#[method(name = "rmrk_collectionProperties")]
		fn collection_properties(
			&self,
			collection_id: RmrkCollectionId,
			filter_keys: Option<Vec<String>>,
			at: Option<BlockHash>,
		) -> Result<Vec<PropertyInfo>>;

		/// Get NFT properties, created by the user - not the proxy-specific properties.
		#[method(name = "rmrk_nftProperties")]
		fn nft_properties(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			filter_keys: Option<Vec<String>>,
			at: Option<BlockHash>,
		) -> Result<Vec<PropertyInfo>>;

		/// Get data of resources of an NFT.
		#[method(name = "rmrk_nftResources")]
		fn nft_resources(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			at: Option<BlockHash>,
		) -> Result<Vec<ResourceInfo>>;

		/// Get the priority of a resource in an NFT.
		#[method(name = "rmrk_nftResourcePriority")]
		fn nft_resource_priority(
			&self,
			collection_id: RmrkCollectionId,
			nft_id: RmrkNftId,
			resource_id: RmrkResourceId,
			at: Option<BlockHash>,
		) -> Result<Option<u32>>;

		/// Get base info by its ID.
		#[method(name = "rmrk_base")]
		fn base(&self, base_id: RmrkBaseId, at: Option<BlockHash>) -> Result<Option<BaseInfo>>;

		/// Get all parts of a base.
		#[method(name = "rmrk_baseParts")]
		fn base_parts(&self, base_id: RmrkBaseId, at: Option<BlockHash>) -> Result<Vec<PartType>>;

		/// Get the theme names belonging to a base.
		#[method(name = "rmrk_themeNames")]
		fn theme_names(
			&self,
			base_id: RmrkBaseId,
			at: Option<BlockHash>,
		) -> Result<Vec<RmrkThemeName>>;

		/// Get theme info, including properties, optionally limited to the provided keys.
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

macro_rules! define_struct_for_server_api {
	($name:ident) => {
		pub struct $name<C, P> {
			client: Arc<C>,
			_marker: std::marker::PhantomData<P>,
		}
		
		impl<C, P> $name<C, P> {
			pub fn new(client: Arc<C>) -> Self {
				Self {
					client,
					_marker: Default::default(),
				}
			}
		}
	};
}

define_struct_for_server_api!(Unique);
define_struct_for_server_api!(AppPromotion);
define_struct_for_server_api!(Rmrk);

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
		dyn UniqueRuntimeApi<Block, BlockNumber, CrossAccountId, AccountId>
	};
}

macro_rules! app_promotion_api {
	() => {
		dyn AppPromotionRuntimeApi<Block, BlockNumber, CrossAccountId, AccountId>
	};
}

macro_rules! rmrk_api {
	() => {
		dyn RmrkRuntimeApi<Block, AccountId, CollectionInfo, NftInfo, ResourceInfo, PropertyInfo, BaseInfo, PartType, Theme>
	};
}

#[allow(deprecated)]
impl<C, Block, BlockNumber, CrossAccountId, AccountId>
	UniqueApiServer<<Block as BlockT>::Hash, BlockNumber, CrossAccountId, AccountId>
	for Unique<C, Block>
where
	Block: BlockT,
	BlockNumber: Decode + Member + AtLeast32BitUnsigned,
	AccountId: Decode,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: UniqueRuntimeApi<Block, BlockNumber, CrossAccountId, AccountId>,
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
	pass_method!(total_pieces(collection_id: CollectionId, token_id: TokenId) -> Option<String> => |o| o.map(|number| number.to_string()) , unique_api);
	pass_method!(token_owners(collection: CollectionId, token: TokenId) -> Vec<CrossAccountId>, unique_api);
}

impl<C, Block, BlockNumber, CrossAccountId, AccountId>
 	app_promotion_unique_rpc::AppPromotionApiServer<<Block as BlockT>::Hash, BlockNumber, CrossAccountId, AccountId>
	for AppPromotion<C, Block>
where
	Block: BlockT,
	BlockNumber: Decode + Member + AtLeast32BitUnsigned,
	AccountId: Decode,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: AppPromotionRuntimeApi<Block, BlockNumber, CrossAccountId, AccountId>,
	CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
{
	pass_method!(total_staked(staker: Option<CrossAccountId>) -> String => |v| v.to_string(), app_promotion_api);
	pass_method!(total_staked_per_block(staker: CrossAccountId) -> Vec<(BlockNumber, String)> =>
		|v| v
		.into_iter()
		.map(|(b, a)| (b, a.to_string()))
		.collect::<Vec<_>>(), app_promotion_api);
	pass_method!(total_staking_locked(staker: CrossAccountId) -> String => |v| v.to_string(), app_promotion_api);
	pass_method!(pending_unstake(staker: Option<CrossAccountId>) -> String => |v| v.to_string(), app_promotion_api);
	pass_method!(pending_unstake_per_block(staker: CrossAccountId) -> Vec<(BlockNumber, String)> =>
		|v| v
		.into_iter()
		.map(|(b, a)| (b, a.to_string()))
		.collect::<Vec<_>>(), app_promotion_api);
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
	> for Rmrk<C, Block>
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
	pass_method!(nft_resource_priority(collection_id: RmrkCollectionId, nft_id: RmrkNftId, resource_id: RmrkResourceId) -> Option<u32>, rmrk_api);
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
