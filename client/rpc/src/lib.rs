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
			$($(#[map = $map:expr])? $name:ident: $ty:ty),* $(,)?
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
			{ api.$method_name(at, $($($map)? ($name)),*) };

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

		#[map = string_keys_to_bytes_keys]
		keys: Option<Vec<String>>
	) -> Vec<Property>, unique_api);

	pass_method!(token_properties(
		collection: CollectionId,
		token_id: TokenId,

		#[map = string_keys_to_bytes_keys]
		keys: Option<Vec<String>>
	) -> Vec<Property>, unique_api);

	pass_method!(property_permissions(
		collection: CollectionId,

		#[map = string_keys_to_bytes_keys]
		keys: Option<Vec<String>>
	) -> Vec<PropertyKeyPermission>, unique_api);

	fn token_data(
		&self,
		collection: CollectionId,
		token_id: TokenId,
		keys: Option<Vec<String>>,
		at: Option<<Block as BlockT>::Hash>,
	) -> Result<TokenData<CrossAccountId>> {
		token_data_internal(self.client.clone(), collection, token_id, keys, at)
	}

	pass_method!(adminlist(collection: CollectionId) -> Vec<CrossAccountId>, unique_api);
	pass_method!(allowlist(collection: CollectionId) -> Vec<CrossAccountId>, unique_api);
	pass_method!(allowed(collection: CollectionId, user: CrossAccountId) -> bool, unique_api);
	pass_method!(last_token_id(collection: CollectionId) -> TokenId, unique_api);
	pass_method!(
		collection_by_id(collection: CollectionId) -> Option<RpcCollection<AccountId>>, unique_api;
		changed_in 3, collection_by_id_before_version_3(collection) => |value| {
			use sp_runtime::DispatchError;

			if let Some(bytes) = value {
				Ok(Some(detect_type_and_decode_collection(bytes.as_slice())
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

fn token_data_internal<Block, Client, AccountId, CrossAccountId>(
	client: Arc<Client>,
	collection: CollectionId,
	token_id: TokenId,
	keys: Option<Vec<String>>,
	at: Option<<Block as BlockT>::Hash>,
) -> Result<TokenData<CrossAccountId>>
where
	AccountId: Decode,
	Block: BlockT,
	Client: ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	Client::Api: UniqueRuntimeApi<Block, CrossAccountId, AccountId>,
	CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
{
	let api = client.runtime_api();
	let at = at.unwrap_or_else(|| client.info().best_hash);
	let api_version = if let Ok(Some(api_version)) =
		api.api_version::<dyn UniqueRuntimeApi<Block, CrossAccountId, AccountId>>(at)
	{
		api_version
	} else {
		return Err(anyhow!("api is not available").into());
	};
	let result = if api_version >= 3 {
		api.token_data(at, collection, token_id, string_keys_to_bytes_keys(keys))
	} else {
		#[allow(deprecated)]
		api.token_data_before_version_3(at, collection, token_id, string_keys_to_bytes_keys(keys))
			.map(
				|r: sc_service::Result<
					up_data_structs::TokenDataVersion1<CrossAccountId>,
					sp_runtime::DispatchError,
				>| r.and_then(|value| Ok(value.into())),
			)
			.or_else(|_| {
				Ok(api
					.token_owner(at, collection, token_id)?
					.map(|owner| TokenData {
						properties: Vec::new(),
						owner,
						pieces: 0,
					}))
			})
	};
	Ok(result
		.map_err(|e| anyhow!("unable to query: {e}"))?
		.map_err(|e| anyhow!("runtime error: {e:?}"))?)
}

fn string_keys_to_bytes_keys(keys: Option<Vec<String>>) -> Option<Vec<Vec<u8>>> {
	keys.map(|keys| keys.into_iter().map(|key| key.into_bytes()).collect())
}

fn decode_collection_from_bytes<T: codec::Decode>(
	bytes: &[u8],
) -> core::result::Result<T, codec::Error> {
	let mut reader = codec::IoReader(bytes);
	T::decode(&mut reader)
}

fn detect_type_and_decode_collection<AccountId: Decode>(
	bytes: &[u8],
) -> core::result::Result<RpcCollection<AccountId>, codec::Error> {
	use up_data_structs::{CollectionVersion1, RpcCollectionVersion1};

	decode_collection_from_bytes::<RpcCollection<AccountId>>(bytes)
		.or_else(|_| {
			decode_collection_from_bytes::<RpcCollectionVersion1<AccountId>>(bytes)
				.map(|col| col.into())
		})
		.or_else(|_| {
			decode_collection_from_bytes::<CollectionVersion1<AccountId>>(bytes)
				.map(|col| col.into())
		})
}

#[cfg(test)]
mod tests {
	use super::*;
	use codec::IoReader;
	use hex_literal::hex;
	use up_data_structs::{CollectionVersion1, RawEncoded};

	const ENCODED_COLLECTION_V1: [u8; 180] = hex!("aab94a1ee784bc17f68d76d4d48d736916ca6ff6315b8c1fa1175726c8345a390000285000720069006d00610020004c00690076006500d04500730065006d00700069006f00200064006900200063007200650061007a0069006f006e006500200064006900200075006e00610020006e0075006f0076006100200063006f006c006c0065007a0069006f006e00650020006400690020004e004600540021000c464e5400000000000000000000000000000000");
	const ENCODED_RPC_COLLECTION_V2: [u8; 618] = hex!("d00dcc24bf66750d3809aa26884b930ec8a3094d6f6f19fdc62020b2fbec013400604d0069006e007400460065007300740020002d002000460075006e006e007900200061006e0069006d0061006c0073008c430072006f00730073006f0076006500720020006200650074007700650065006e00200061006e0069006d0061006c00730020002d00200066006f0072002000660075006e00104d46464100000000000000000000010001000100000004385f6f6c645f636f6e7374446174610001000c5c5f6f6c645f636f6e73744f6e436861696e536368656d6139047b226e6573746564223a7b226f6e436861696e4d65746144617461223a7b226e6573746564223a7b224e46544d657461223a7b226669656c6473223a7b22697066734a736f6e223a7b226964223a312c2272756c65223a227265717569726564222c2274797065223a22737472696e67227d2c2248656164223a7b226964223a322c2272756c65223a227265717569726564222c2274797065223a22737472696e67227d2c22426f6479223a7b226964223a332c2272756c65223a227265717569726564222c2274797065223a22737472696e67227d2c225461696c223a7b226964223a342c2272756c65223a227265717569726564222c2274797065223a22737472696e67227d7d7d7d7d7d7d485f6f6c645f736368656d6156657273696f6e18556e69717565685f6f6c645f7661726961626c654f6e436861696e536368656d6111017b22636f6c6c656374696f6e436f766572223a22516d53557a7139354c357a556777795a584d3731576a3762786b36557048515468633162536965347766706e5435227d000000");

	const TEST: [u8; 2380] = hex!("de41e423c74062567633b8a8b59521254fa9bdf0bd77f35f4f147c2203b6cd7c0000305300750062007300740072006100500075006e006b007300984600690072007300740020004e0046005400200063006f006c006c0065006300740069006f006e00200069006e00200070006f006c006b00610064006f0074002000730070006100630065000c504e4b00750168747470733a2f2f697066732e756e697175652e6e6574776f726b2f697066732f516d634163483446394859517470714b487842467747766b664b623871636b586a325957557263633879643234472f696d6167657b69647d2e706e670002de41e423c74062567633b8a8b59521254fa9bdf0bd77f35f4f147c2203b6cd7c000000000100000000010000000000000000a5207b226e6573746564223a7b226f6e436861696e4d65746144617461223a7b226e6573746564223a7b224e46544d657461223a7b226669656c6473223a7b22697066734a736f6e223a7b226964223a312c2272756c65223a227265717569726564222c2274797065223a22737472696e67227d2c2267656e646572223a7b226964223a322c2272756c65223a227265717569726564222c2274797065223a2247656e646572227d2c22747261697473223a7b226964223a332c2272756c65223a227265706561746564222c2274797065223a2250756e6b5472616974227d7d7d2c2247656e646572223a7b226f7074696f6e73223a7b2246656d616c65223a227b5c22656e5c223a205c2246656d616c655c227d222c224d616c65223a227b5c22656e5c223a205c224d616c655c227d227d2c2276616c756573223a7b2246656d616c65223a312c224d616c65223a307d7d2c2250756e6b5472616974223a7b226f7074696f6e73223a7b22424c41434b5f4c4950535449434b223a227b5c22656e5c223a205c22426c61636b204c6970737469636b5c227d222c225245445f4c4950535449434b223a227b5c22656e5c223a205c22526564204c6970737469636b5c227d222c22534d494c45223a227b5c22656e5c223a205c22536d696c655c227d222c2254454554485f534d494c45223a227b5c22656e5c223a205c22546565746820536d696c655c227d222c22505552504c455f4c4950535449434b223a227b5c22656e5c223a205c22507572706c65204c6970737469636b5c227d222c224e4f53455f52494e47223a227b5c22656e5c223a205c224e6f73652052696e675c227d222c22415349414e5f45594553223a227b5c22656e5c223a205c22417369616e20457965735c227d222c2253554e474c4153534553223a227b5c22656e5c223a205c2253756e676c61737365735c227d222c225245445f474c4153534553223a227b5c22656e5c223a205c2252656420476c61737365735c227d222c22524f554e445f45594553223a227b5c22656e5c223a205c22526f756e6420457965735c227d222c224c4546545f45415252494e47223a227b5c22656e5c223a205c224c6566742045617272696e675c227d222c2252494748545f45415252494e47223a227b5c22656e5c223a205c2252696768742045617272696e675c227d222c2254574f5f45415252494e4753223a227b5c22656e5c223a205c2254776f2045617272696e67735c227d222c2242524f574e5f4245415244223a227b5c22656e5c223a205c2242726f776e2042656172645c227d222c224d555354414348455f4245415244223a227b5c22656e5c223a205c224d757374616368652042656172645c227d222c224d55535441434845223a227b5c22656e5c223a205c224d757374616368655c227d222c22524547554c41525f4245415244223a227b5c22656e5c223a205c22526567756c61722042656172645c227d222c2255505f48414952223a227b5c22656e5c223a205c22557020486169725c227d222c22444f574e5f48414952223a227b5c22656e5c223a205c22446f776e20486169725c227d222c224d414841574b223a227b5c22656e5c223a205c224d616861776b5c227d222c225245445f4d414841574b223a227b5c22656e5c223a205c22526564204d616861776b5c227d222c224f52414e47455f48414952223a227b5c22656e5c223a205c224f72616e676520486169725c227d222c22425542424c455f48414952223a227b5c22656e5c223a205c22427562626c6520486169725c227d222c22454d4f5f48414952223a227b5c22656e5c223a205c22456d6f20486169725c227d222c225448494e5f48414952223a227b5c22656e5c223a205c225468696e20486169725c227d222c2242414c44223a227b5c22656e5c223a205c2242616c645c227d222c22424c4f4e44455f48414952223a227b5c22656e5c223a205c22426c6f6e646520486169725c227d222c2243415245545f48414952223a227b5c22656e5c223a205c22436172657420486169725c227d222c22504f4e595f5441494c53223a227b5c22656e5c223a205c22506f6e79205461696c735c227d222c224349474152223a227b5c22656e5c223a205c2243696761725c227d222c2250495045223a227b5c22656e5c223a205c22506970655c227d227d2c2276616c756573223a7b22424c41434b5f4c4950535449434b223a302c225245445f4c4950535449434b223a312c22534d494c45223a322c2254454554485f534d494c45223a332c22505552504c455f4c4950535449434b223a342c224e4f53455f52494e47223a352c22415349414e5f45594553223a362c2253554e474c4153534553223a372c225245445f474c4153534553223a382c22524f554e445f45594553223a392c224c4546545f45415252494e47223a31302c2252494748545f45415252494e47223a31312c2254574f5f45415252494e4753223a31322c2242524f574e5f4245415244223a31332c224d555354414348455f4245415244223a31342c224d55535441434845223a31352c22524547554c41525f4245415244223a31362c2255505f48414952223a31372c22444f574e5f48414952223a31382c224d414841574b223a31392c225245445f4d414841574b223a32302c224f52414e47455f48414952223a32312c22425542424c455f48414952223a32322c22454d4f5f48414952223a32332c225448494e5f48414952223a32342c2242414c44223a32352c22424c4f4e44455f48414952223a32362c2243415245545f48414952223a32372c22504f4e595f5441494c53223a32382c224349474152223a32392c2250495045223a33307d7d7d7d7d7d00");

	#[test]
	fn decoding_collection_v1() {
		decode_collection_from_bytes::<CollectionVersion1<[u8; 32]>>(
			ENCODED_COLLECTION_V1.as_slice(),
		)
		.unwrap();
	}

	#[test]
	fn detecting_and_decoding_collection_v1() {
		detect_type_and_decode_collection::<[u8; 32]>(ENCODED_COLLECTION_V1.as_slice()).unwrap();
	}

	#[test]
	fn decoding_rpc_collection_v2() {
		decode_collection_from_bytes::<RpcCollection<[u8; 32]>>(
			ENCODED_RPC_COLLECTION_V2.as_slice(),
		)
		.unwrap();
	}

	#[test]
	fn detecting_decoding_rpc_collection_v2() {
		detect_type_and_decode_collection::<[u8; 32]>(ENCODED_RPC_COLLECTION_V2.as_slice())
			.unwrap();
	}

	#[test]
	fn rpc_collection_supports_decoding_through_vec() {
		let mut bytes = IoReader(ENCODED_RPC_COLLECTION_V2.as_slice());
		let vec = RawEncoded::decode(&mut bytes).unwrap();
		println!("{:?}", vec.len());
		let mut bytes = IoReader(vec.as_slice());
		RpcCollection::<[u8; 32]>::decode(&mut bytes).unwrap();
	}

	#[test]
	fn test() {
		decode_collection_from_bytes::<CollectionVersion1<[u8; 32]>>(TEST.as_slice()).unwrap();
	}
}
