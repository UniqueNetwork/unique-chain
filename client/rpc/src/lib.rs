// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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

use codec::Decode;
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
use sp_api::{BlockT, ProvideRuntimeApi, ApiExt};
use sp_blockchain::HeaderBackend;
use up_rpc::UniqueApi as UniqueRuntimeApi;
use app_promotion_rpc::AppPromotionApi as AppPromotionRuntimeApi;

pub use app_promotion_unique_rpc::AppPromotionApiServer;

#[cfg(feature = "pov-estimate")]
pub mod pov_estimate;

#[rpc(server)]
#[async_trait]
pub trait UniqueApi<BlockHash, CrossAccountId, AccountId> {
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

	/// Get whether an operator is approved by a given owner.
	#[method(name = "unique_allowanceForAll")]
	fn allowance_for_all(
		&self,
		collection: CollectionId,
		owner: CrossAccountId,
		operator: CrossAccountId,
		at: Option<BlockHash>,
	) -> Result<bool>;
}

mod app_promotion_unique_rpc {
	use super::*;

	#[rpc(server)]
	#[async_trait]
	pub trait AppPromotionApi<BlockHash, BlockNumber, CrossAccountId, AccountId> {
		/// Returns the total amount of staked tokens.
		#[method(name = "appPromotion_totalStaked")]
		fn total_staked(
			&self,
			staker: Option<CrossAccountId>,
			at: Option<BlockHash>,
		) -> Result<String>;

		///Returns the total amount of staked tokens per block when staked.
		#[method(name = "appPromotion_totalStakedPerBlock")]
		fn total_staked_per_block(
			&self,
			staker: CrossAccountId,
			at: Option<BlockHash>,
		) -> Result<Vec<(BlockNumber, String)>>;

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

#[macro_export]
macro_rules! define_struct_for_server_api {
	($name:ident { $($arg:ident: $arg_ty:ty),+ $(,)? }) => {
		pub struct $name<Client, Block: BlockT> {
			$($arg: $arg_ty),+,
			_marker: std::marker::PhantomData<Block>,
		}

		impl<Client, Block: BlockT> $name<Client, Block> {
			pub fn new($($arg: $arg_ty),+) -> Self {
				Self {
					$($arg),+,
					_marker: Default::default(),
				}
			}
		}
	};
}

define_struct_for_server_api! {
	Unique {
		client: Arc<Client>
	}
}

define_struct_for_server_api! {
	AppPromotion {
		client: Arc<Client>
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
			let at = at.unwrap_or_else(|| self.client.info().best_hash);
			let _api_version = if let Ok(Some(api_version)) =
				api.api_version::<$runtime_api_macro!()>(at)
			{
				api_version
			} else {
				// unreachable for our runtime
				return Err(anyhow!("api is not available").into())
			};

			let result = $(if _api_version < $ver {
				api.$changed_method_name(at, $($changed_name),*).map(|r| r.and_then($fixer))
			} else)*
			{ api.$method_name(at, $($((|$map_arg: $ty| $map))? ($name)),*) };

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

macro_rules! app_promotion_api {
	() => {
		dyn AppPromotionRuntimeApi<Block, BlockNumber, CrossAccountId, AccountId>
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

	pass_method!(
		token_data(
			collection: CollectionId,
			token_id: TokenId,

			#[map(|keys| string_keys_to_bytes_keys(keys))]
			keys: Option<Vec<String>>,
		) -> TokenData<CrossAccountId>, unique_api;
		changed_in 3, token_data_before_version_3(collection, token_id, string_keys_to_bytes_keys(keys)) => |value| Ok(value.into())
	);

	pass_method!(adminlist(collection: CollectionId) -> Vec<CrossAccountId>, unique_api);
	pass_method!(allowlist(collection: CollectionId) -> Vec<CrossAccountId>, unique_api);
	pass_method!(allowed(collection: CollectionId, user: CrossAccountId) -> bool, unique_api);
	pass_method!(last_token_id(collection: CollectionId) -> TokenId, unique_api);
	pass_method!(
		collection_by_id(collection: CollectionId) -> Option<RpcCollection<AccountId>>, unique_api;
		changed_in 3, collection_by_id_before_version_3(collection) => |value| {
			use codec::IoReader;
			use up_data_structs::RpcCollectionVersion1;
			use up_data_structs::CollectionVersion1;
			use sp_runtime::DispatchError;

			if let Some(bytes) = value {
				let mut reader = IoReader(bytes.as_slice());
				Ok(Some(RpcCollection::<AccountId>::decode(&mut reader)
				.or_else(|_| RpcCollectionVersion1::<AccountId>::decode(&mut reader).map(|col| col.into()))
				.or_else(|_| CollectionVersion1::<AccountId>::decode(&mut reader).map(|col| col.into()))
				.map_err(|_| DispatchError::Other("API Error: UniqueApi_collection_by_id"))?))
			} else {
				Ok(None)
			}
		}
	);
	pass_method!(collection_stats() -> CollectionStats, unique_api);
	pass_method!(next_sponsored(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Option<u64>, unique_api);
	pass_method!(effective_collection_limits(collection_id: CollectionId) -> Option<CollectionLimits>, unique_api);
	pass_method!(total_pieces(collection_id: CollectionId, token_id: TokenId) -> Option<String> => |o| o.map(|number| number.to_string()) , unique_api);
	pass_method!(token_owners(collection: CollectionId, token: TokenId) -> Vec<CrossAccountId>, unique_api);
	pass_method!(allowance_for_all(collection: CollectionId, owner: CrossAccountId, operator: CrossAccountId) -> bool, unique_api);
}

impl<C, Block, BlockNumber, CrossAccountId, AccountId>
	app_promotion_unique_rpc::AppPromotionApiServer<
		<Block as BlockT>::Hash,
		BlockNumber,
		CrossAccountId,
		AccountId,
	> for AppPromotion<C, Block>
where
	Block: BlockT,
	BlockNumber: Decode + Member + AtLeast32BitUnsigned,
	AccountId: Decode,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
	C::Api: AppPromotionRuntimeApi<Block, BlockNumber, CrossAccountId, AccountId>,
{
	pass_method!(total_staked(staker: Option<CrossAccountId>) -> String => |v| v.to_string(), app_promotion_api);
	pass_method!(total_staked_per_block(staker: CrossAccountId) -> Vec<(BlockNumber, String)> =>
		|v| v
		.into_iter()
		.map(|(b, a)| (b, a.to_string()))
		.collect::<Vec<_>>(), app_promotion_api);
	pass_method!(pending_unstake(staker: Option<CrossAccountId>) -> String => |v| v.to_string(), app_promotion_api);
	pass_method!(pending_unstake_per_block(staker: CrossAccountId) -> Vec<(BlockNumber, String)> =>
		|v| v
		.into_iter()
		.map(|(b, a)| (b, a.to_string()))
		.collect::<Vec<_>>(), app_promotion_api);
}

fn string_keys_to_bytes_keys(keys: Option<Vec<String>>) -> Option<Vec<Vec<u8>>> {
	keys.map(|keys| keys.into_iter().map(|key| key.into_bytes()).collect())
}
