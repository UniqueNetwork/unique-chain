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

use fc_mapping_sync::{EthereumBlockNotificationSinks, EthereumBlockNotification};
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
use sc_network::NetworkService;
use sc_network_sync::SyncingService;
use sc_rpc::SubscriptionTaskExecutor;
pub use sc_rpc_api::DenyUnsafe;
use sc_transaction_pool::{ChainApi, Pool};
use sp_api::ProvideRuntimeApi;
use sp_block_builder::BlockBuilder;
use sp_blockchain::{Error as BlockChainError, HeaderBackend, HeaderMetadata};
use sc_service::TransactionPool;
use std::{collections::BTreeMap, sync::Arc};

use up_common::types::opaque::*;

#[cfg(feature = "pov-estimate")]
type FullBackend = sc_service::TFullBackend<Block>;

/// Full client dependencies.
pub struct FullDeps<C, P, SC> {
	/// The client instance to use.
	pub client: Arc<C>,
	/// Transaction pool instance.
	pub pool: Arc<P>,
	/// The SelectChain Strategy
	pub select_chain: SC,
	/// Whether to deny unsafe calls
	pub deny_unsafe: DenyUnsafe,

	/// Runtime identification (read from the chain spec)
	pub runtime_id: RuntimeId,
	/// Executor params for PoV estimating
	#[cfg(feature = "pov-estimate")]
	pub exec_params: uc_rpc::pov_estimate::ExecutorParams,
	/// Substrate Backend.
	#[cfg(feature = "pov-estimate")]
	pub backend: Arc<FullBackend>,
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
		Box::new(SchemaV1Override::new(client.clone())) as Box<dyn StorageOverride<_> + 'static>,
	);
	overrides_map.insert(
		EthereumStorageSchema::V2,
		Box::new(SchemaV2Override::new(client.clone())) as Box<dyn StorageOverride<_> + 'static>,
	);
	overrides_map.insert(
		EthereumStorageSchema::V3,
		Box::new(SchemaV3Override::new(client.clone())) as Box<dyn StorageOverride<_> + 'static>,
	);

	Arc::new(OverrideHandle {
		schemas: overrides_map,
		fallback: Box::new(RuntimeApiStorageOverride::new(client)),
	})
}

/// Instantiate all Full RPC extensions.
pub fn create_full<C, P, SC, R, A, B>(
	io: &mut RpcModule<()>,
	deps: FullDeps<C, P, SC>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>>
where
	C: ProvideRuntimeApi<Block> + StorageProvider<Block, B> + AuxStore,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError> + 'static,
	C: Send + Sync + 'static,
	C: BlockchainEvents<Block>,
	C::Api: substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>,
	C::Api: BlockBuilder<Block>,
	// C::Api: pallet_contracts_rpc::ContractsRuntimeApi<Block, AccountId, Balance, BlockNumber, Hash>,
	C::Api: pallet_transaction_payment_rpc::TransactionPaymentRuntimeApi<Block, Balance>,
	C::Api: up_rpc::UniqueApi<Block, <R as RuntimeInstance>::CrossAccountId, AccountId>,
	C::Api: app_promotion_rpc::AppPromotionApi<
		Block,
		BlockNumber,
		<R as RuntimeInstance>::CrossAccountId,
		AccountId,
	>,
	C::Api: up_pov_estimate_rpc::PovEstimateApi<Block>,
	B: sc_client_api::Backend<Block> + Send + Sync + 'static,
	B::State: sc_client_api::backend::StateBackend<sp_runtime::traits::HashFor<Block>>,
	P: TransactionPool<Block = Block> + 'static,
	R: RuntimeInstance + Send + Sync + 'static,
	<R as RuntimeInstance>::CrossAccountId: serde::Serialize,
	C: sp_api::CallApiAt<
		sp_runtime::generic::Block<
			sp_runtime::generic::Header<u32, BlakeTwo256>,
			sp_runtime::OpaqueExtrinsic,
		>,
	>,
	for<'de> <R as RuntimeInstance>::CrossAccountId: serde::Deserialize<'de>,
{
	use uc_rpc::{UniqueApiServer, Unique};

	use uc_rpc::{AppPromotionApiServer, AppPromotion};

	#[cfg(feature = "pov-estimate")]
	use uc_rpc::pov_estimate::{PovEstimateApiServer, PovEstimate};

	// use pallet_contracts_rpc::{Contracts, ContractsApi};
	use pallet_transaction_payment_rpc::{TransactionPayment, TransactionPaymentApiServer};
	use substrate_frame_rpc_system::{System, SystemApiServer};

	let FullDeps {
		client,
		pool,
		select_chain: _,
		deny_unsafe,

		runtime_id: _,

		#[cfg(feature = "pov-estimate")]
		exec_params,

		#[cfg(feature = "pov-estimate")]
		backend,
	} = deps;

	io.merge(System::new(Arc::clone(&client), Arc::clone(&pool), deny_unsafe).into_rpc())?;
	io.merge(TransactionPayment::new(Arc::clone(&client)).into_rpc())?;

	io.merge(Unique::new(client.clone()).into_rpc())?;

	io.merge(AppPromotion::new(client.clone()).into_rpc())?;

	#[cfg(feature = "pov-estimate")]
	io.merge(
		PovEstimate::new(
			client.clone(),
			backend,
			deny_unsafe,
			exec_params,
			runtime_id,
		)
		.into_rpc(),
	)?;

	Ok(())
}

pub struct EthDeps<C, P, CA: ChainApi> {
	/// The client instance to use.
	pub client: Arc<C>,
	/// Transaction pool instance.
	pub pool: Arc<P>,
	/// Graph pool instance.
	pub graph: Arc<Pool<CA>>,
	/// Syncing service
	pub sync: Arc<SyncingService<Block>>,
	/// The Node authority flag
	pub is_authority: bool,
	/// Network service
	pub network: Arc<NetworkService<Block, Hash>>,

	/// Ethereum Backend.
	pub eth_backend: Arc<dyn fc_db::BackendReader<Block> + Send + Sync>,
	/// Maximum number of logs in a query.
	pub max_past_logs: u32,
	/// Maximum fee history cache size.
	pub fee_history_limit: u64,
	/// Fee history cache.
	pub fee_history_cache: FeeHistoryCache,
	pub eth_block_data_cache: Arc<EthBlockDataCacheTask<Block>>,
	/// EthFilterApi pool.
	pub eth_filter_pool: Option<FilterPool>,
	pub eth_pubsub_notification_sinks:
		Arc<EthereumBlockNotificationSinks<EthereumBlockNotification<Block>>>,
	/// Whether to enable eth dev signer
	pub enable_dev_signer: bool,

	pub overrides: Arc<OverrideHandle<Block>>,
}

/// This converter is never used, but we have a generic
/// Option<T>, where T should implement ConvertTransaction
///
/// TODO: remove after never-type (`!`) stabilization
enum NeverConvert {}
impl<T> fp_rpc::ConvertTransaction<T> for NeverConvert {
	fn convert_transaction(&self, _transaction: pallet_ethereum::Transaction) -> T {
		unreachable!()
	}
}

pub fn create_eth<C, P, CA, B>(
	io: &mut RpcModule<()>,
	deps: EthDeps<C, P, CA>,
	subscription_task_executor: SubscriptionTaskExecutor,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>>
where
	C: ProvideRuntimeApi<Block> + StorageProvider<Block, B> + AuxStore,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError> + 'static,
	C: Send + Sync + 'static,
	C: BlockchainEvents<Block>,
	C::Api: BlockBuilder<Block>,
	C::Api: fp_rpc::EthereumRuntimeRPCApi<Block>,
	C::Api: fp_rpc::ConvertTransactionRuntimeApi<Block>,
	P: TransactionPool<Block = Block> + 'static,
	CA: ChainApi<Block = Block> + 'static,
	B: sc_client_api::Backend<Block> + Send + Sync + 'static,
	C: sp_api::CallApiAt<
		sp_runtime::generic::Block<
			sp_runtime::generic::Header<u32, BlakeTwo256>,
			sp_runtime::OpaqueExtrinsic,
		>,
	>,
{
	use fc_rpc::{
		Eth, EthApiServer, EthDevSigner, EthFilter, EthFilterApiServer, EthPubSub,
		EthPubSubApiServer, EthSigner, Net, NetApiServer, Web3, Web3ApiServer, TxPool,
		TxPoolApiServer,
	};

	let EthDeps {
		client,
		pool,
		graph,
		eth_backend,
		max_past_logs,
		fee_history_limit,
		fee_history_cache,
		eth_block_data_cache,
		eth_filter_pool,
		eth_pubsub_notification_sinks,
		enable_dev_signer,
		sync,
		is_authority,
		network,
		overrides,
	} = deps;

	let mut signers = Vec::new();
	if enable_dev_signer {
		signers.push(Box::new(EthDevSigner::new()) as Box<dyn EthSigner>);
	}
	let execute_gas_limit_multiplier = 10;
	io.merge(
		Eth::new(
			client.clone(),
			pool.clone(),
			graph.clone(),
			// We have no runtimes old enough to only accept converted transactions
			None::<NeverConvert>,
			sync.clone(),
			signers,
			overrides.clone(),
			eth_backend.clone(),
			is_authority,
			eth_block_data_cache.clone(),
			fee_history_cache,
			fee_history_limit,
			execute_gas_limit_multiplier,
			None,
		)
		.into_rpc(),
	)?;

	let tx_pool = TxPool::new(client.clone(), graph);

	if let Some(filter_pool) = eth_filter_pool {
		io.merge(
			EthFilter::new(
				client.clone(),
				eth_backend,
				tx_pool.clone(),
				filter_pool,
				500_usize, // max stored filters
				max_past_logs,
				eth_block_data_cache,
			)
			.into_rpc(),
		)?;
	}
	io.merge(
		Net::new(
			client.clone(),
			network,
			// Whether to format the `peer_count` response as Hex (default) or not.
			true,
		)
		.into_rpc(),
	)?;
	io.merge(Web3::new(client.clone()).into_rpc())?;
	io.merge(
		EthPubSub::new(
			pool,
			client,
			sync,
			subscription_task_executor,
			overrides,
			eth_pubsub_notification_sinks,
		)
		.into_rpc(),
	)?;
	io.merge(tx_pool.into_rpc())?;

	Ok(())
}
