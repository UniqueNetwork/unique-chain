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

use sp_runtime::traits::BlakeTwo256;
use fc_rpc::{
	EthBlockDataCacheTask, OverrideHandle, RuntimeApiStorageOverride, SchemaV1Override,
	StorageOverride, SchemaV2Override, SchemaV3Override,
};
use jsonrpsee::RpcModule;
use fc_rpc_core::types::{FilterPool, FeeHistoryCache};
use fp_storage::EthereumStorageSchema;
use sc_client_api::{
	backend::{AuxStore, StorageProvider},
	client::BlockchainEvents,
	StateBackend, Backend,
};
use sc_finality_grandpa::{
	FinalityProofProvider, GrandpaJustificationStream, SharedAuthoritySet, SharedVoterState,
};
use sc_network::NetworkService;
use sc_rpc::SubscriptionTaskExecutor;
pub use sc_rpc_api::DenyUnsafe;
use sc_transaction_pool::{ChainApi, Pool};
use sp_api::ProvideRuntimeApi;
use sp_block_builder::BlockBuilder;
use sp_blockchain::{Error as BlockChainError, HeaderBackend, HeaderMetadata};
use sc_service::TransactionPool;
use std::{collections::BTreeMap, sync::Arc};

use up_common::types::opaque::{Hash, AccountId, RuntimeInstance, Index, Block, BlockNumber, Balance};

// RMRK
use up_data_structs::{
	RmrkCollectionInfo, RmrkInstanceInfo, RmrkResourceInfo, RmrkPropertyInfo, RmrkBaseInfo,
	RmrkPartType, RmrkTheme,
};

/// Extra dependencies for GRANDPA
pub struct GrandpaDeps<B> {
	/// Voting round info.
	pub shared_voter_state: SharedVoterState,
	/// Authority set info.
	pub shared_authority_set: SharedAuthoritySet<Hash, BlockNumber>,
	/// Receives notifications about justification events from Grandpa.
	pub justification_stream: GrandpaJustificationStream<Block>,
	/// Executor to drive the subscription manager in the Grandpa RPC handler.
	pub subscription_executor: SubscriptionTaskExecutor,
	/// Finality proof provider.
	pub finality_provider: Arc<FinalityProofProvider<B, Block>>,
}

/// Full client dependencies.
pub struct FullDeps<C, P, SC, CA: ChainApi> {
	/// The client instance to use.
	pub client: Arc<C>,
	/// Transaction pool instance.
	pub pool: Arc<P>,
	/// Graph pool instance.
	pub graph: Arc<Pool<CA>>,
	/// The SelectChain Strategy
	pub select_chain: SC,
	/// The Node authority flag
	pub is_authority: bool,
	/// Whether to enable dev signer
	pub enable_dev_signer: bool,
	/// Network service
	pub network: Arc<NetworkService<Block, Hash>>,
	/// Whether to deny unsafe calls
	pub deny_unsafe: DenyUnsafe,
	/// EthFilterApi pool.
	pub filter_pool: Option<FilterPool>,
	/// Backend.
	pub backend: Arc<fc_db::Backend<Block>>,
	/// Maximum number of logs in a query.
	pub max_past_logs: u32,
	/// Maximum fee history cache size.
	pub fee_history_limit: u64,
	/// Fee history cache.
	pub fee_history_cache: FeeHistoryCache,
	/// Cache for Ethereum block data.
	pub block_data_cache: Arc<EthBlockDataCacheTask<Block>>,
}

pub fn overrides_handle<C, BE, R>(client: Arc<C>) -> Arc<OverrideHandle<Block>>
where
	C: ProvideRuntimeApi<Block> + StorageProvider<Block, BE> + AuxStore,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError>,
	C: Send + Sync + 'static,
	C::Api: fp_rpc::EthereumRuntimeRPCApi<Block>,
	C::Api: up_rpc::UniqueApi<Block, <R as RuntimeInstance>::CrossAccountId, AccountId>,
	BE: Backend<Block> + 'static,
	BE::State: StateBackend<BlakeTwo256>,
	R: RuntimeInstance + Send + Sync + 'static,
{
	let mut overrides_map = BTreeMap::new();
	overrides_map.insert(
		EthereumStorageSchema::V1,
		Box::new(SchemaV1Override::new(client.clone()))
			as Box<dyn StorageOverride<_> + Send + Sync>,
	);
	overrides_map.insert(
		EthereumStorageSchema::V2,
		Box::new(SchemaV2Override::new(client.clone()))
			as Box<dyn StorageOverride<_> + Send + Sync>,
	);
	overrides_map.insert(
		EthereumStorageSchema::V3,
		Box::new(SchemaV3Override::new(client.clone()))
			as Box<dyn StorageOverride<_> + Send + Sync>,
	);

	Arc::new(OverrideHandle {
		schemas: overrides_map,
		fallback: Box::new(RuntimeApiStorageOverride::new(client)),
	})
}

/// Instantiate all Full RPC extensions.
pub fn create_full<C, P, SC, CA, R, A, B>(
	deps: FullDeps<C, P, SC, CA>,
	subscription_task_executor: SubscriptionTaskExecutor,
) -> Result<RpcModule<()>, Box<dyn std::error::Error + Send + Sync>>
where
	C: ProvideRuntimeApi<Block> + StorageProvider<Block, B> + AuxStore,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError> + 'static,
	C: Send + Sync + 'static,
	C: BlockchainEvents<Block>,
	C::Api: substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>,
	C::Api: BlockBuilder<Block>,
	// C::Api: pallet_contracts_rpc::ContractsRuntimeApi<Block, AccountId, Balance, BlockNumber, Hash>,
	C::Api: pallet_transaction_payment_rpc::TransactionPaymentRuntimeApi<Block, Balance>,
	C::Api: fp_rpc::EthereumRuntimeRPCApi<Block>,
	C::Api: fp_rpc::ConvertTransactionRuntimeApi<Block>,
	C::Api: up_rpc::UniqueApi<Block, <R as RuntimeInstance>::CrossAccountId, AccountId>,
	C::Api: app_promotion_rpc::AppPromotionApi<
		Block,
		BlockNumber,
		<R as RuntimeInstance>::CrossAccountId,
		AccountId,
	>,
	C::Api: rmrk_rpc::RmrkApi<
		Block,
		AccountId,
		RmrkCollectionInfo<AccountId>,
		RmrkInstanceInfo<AccountId>,
		RmrkResourceInfo,
		RmrkPropertyInfo,
		RmrkBaseInfo<AccountId>,
		RmrkPartType,
		RmrkTheme,
	>,
	B: sc_client_api::Backend<Block> + Send + Sync + 'static,
	B::State: sc_client_api::backend::StateBackend<sp_runtime::traits::HashFor<Block>>,
	P: TransactionPool<Block = Block> + 'static,
	CA: ChainApi<Block = Block> + 'static,
	R: RuntimeInstance + Send + Sync + 'static,
	<R as RuntimeInstance>::CrossAccountId: serde::Serialize,
	for<'de> <R as RuntimeInstance>::CrossAccountId: serde::Deserialize<'de>,
{
	use fc_rpc::{
		Eth, EthApiServer, EthDevSigner, EthFilter, EthFilterApiServer, EthPubSub,
		EthPubSubApiServer, EthSigner, Net, NetApiServer, Web3, Web3ApiServer,
	};
	use uc_rpc::{UniqueApiServer, Unique};
	use uc_rpc::{AppPromotionApiServer, AppPromotion};

	#[cfg(not(feature = "unique-runtime"))]
	use uc_rpc::{RmrkApiServer, Rmrk};

	// use pallet_contracts_rpc::{Contracts, ContractsApi};
	use pallet_transaction_payment_rpc::{TransactionPayment, TransactionPaymentApiServer};
	use substrate_frame_rpc_system::{System, SystemApiServer};

	let mut io = RpcModule::new(());
	let FullDeps {
		client,
		pool,
		graph,
		select_chain: _,
		fee_history_limit,
		fee_history_cache,
		block_data_cache,
		enable_dev_signer,
		is_authority,
		network,
		deny_unsafe,
		filter_pool,
		backend,
		max_past_logs,
	} = deps;

	io.merge(System::new(Arc::clone(&client), Arc::clone(&pool), deny_unsafe).into_rpc())?;
	io.merge(TransactionPayment::new(Arc::clone(&client)).into_rpc())?;

	// io.extend_with(ContractsApi::to_delegate(Contracts::new(client.clone())));

	let mut signers = Vec::new();
	if enable_dev_signer {
		signers.push(Box::new(EthDevSigner::new()) as Box<dyn EthSigner>);
	}

	let overrides = overrides_handle::<_, _, R>(client.clone());

	io.merge(
		Eth::new(
			client.clone(),
			pool.clone(),
			graph,
			Some(<R as RuntimeInstance>::get_transaction_converter()),
			network.clone(),
			signers,
			overrides.clone(),
			backend.clone(),
			is_authority,
			block_data_cache.clone(),
			fee_history_cache,
			fee_history_limit,
		)
		.into_rpc(),
	)?;

	io.merge(Unique::new(client.clone()).into_rpc())?;

	#[cfg(not(any(feature = "unique-runtime", feature = "quartz-runtime")))]
	io.merge(AppPromotion::new(client.clone()).into_rpc())?;

	#[cfg(not(feature = "unique-runtime"))]
	io.merge(Rmrk::new(client.clone()).into_rpc())?;

	if let Some(filter_pool) = filter_pool {
		io.merge(
			EthFilter::new(
				client.clone(),
				backend,
				filter_pool,
				500_usize, // max stored filters
				max_past_logs,
				block_data_cache,
			)
			.into_rpc(),
		)?;
	}

	io.merge(
		Net::new(
			client.clone(),
			network.clone(),
			// Whether to format the `peer_count` response as Hex (default) or not.
			true,
		)
		.into_rpc(),
	)?;

	io.merge(Web3::new(client.clone()).into_rpc())?;

	io.merge(
		EthPubSub::new(pool, client, network, subscription_task_executor, overrides).into_rpc(),
	)?;

	Ok(io)
}
