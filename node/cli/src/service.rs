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

// std
use std::sync::Arc;
use std::sync::Mutex;
use std::collections::BTreeMap;
use std::time::Duration;
use std::pin::Pin;
use fc_rpc_core::types::FeeHistoryCache;
use futures::{
	Stream, StreamExt,
	stream::select,
	task::{Context, Poll},
};
use sp_keystore::KeystorePtr;
use tokio::time::Interval;

use unique_rpc::overrides_handle;

use serde::{Serialize, Deserialize};

// Cumulus Imports
use cumulus_client_consensus_aura::{AuraConsensus, BuildAuraConsensusParams, SlotProportion};
use cumulus_client_consensus_common::{
	ParachainConsensus, ParachainBlockImport as TParachainBlockImport,
};
use cumulus_client_service::{
	prepare_node_config, start_collator, start_full_node, StartCollatorParams, StartFullNodeParams,
};
use cumulus_client_cli::CollatorOptions;
use cumulus_client_network::BlockAnnounceValidator;
use cumulus_primitives_core::ParaId;
use cumulus_relay_chain_inprocess_interface::build_inprocess_relay_chain;
use cumulus_relay_chain_interface::{RelayChainInterface, RelayChainResult};
use cumulus_relay_chain_minimal_node::build_minimal_relay_chain_node;

// Substrate Imports
use sp_api::BlockT;
use sc_executor::NativeElseWasmExecutor;
use sc_executor::NativeExecutionDispatch;
use sc_network::NetworkBlock;
use sc_network_sync::SyncingService;
use sc_service::{BasePath, Configuration, PartialComponents, TaskManager};
use sc_telemetry::{Telemetry, TelemetryHandle, TelemetryWorker, TelemetryWorkerHandle};
use sp_runtime::traits::BlakeTwo256;
use substrate_prometheus_endpoint::Registry;
use sc_client_api::BlockchainEvents;
use sc_consensus::ImportQueue;

use polkadot_service::CollatorPair;

// Frontier Imports
use fc_rpc_core::types::FilterPool;
use fc_mapping_sync::{MappingSyncWorker, SyncStrategy};

use up_common::types::opaque::*;

use crate::chain_spec::RuntimeIdentification;

/// Unique native executor instance.
#[cfg(feature = "unique-runtime")]
pub struct UniqueRuntimeExecutor;

#[cfg(feature = "quartz-runtime")]
/// Quartz native executor instance.
pub struct QuartzRuntimeExecutor;

/// Opal native executor instance.
pub struct OpalRuntimeExecutor;

#[cfg(all(feature = "unique-runtime", feature = "runtime-benchmarks"))]
pub type DefaultRuntimeExecutor = UniqueRuntimeExecutor;

#[cfg(all(
	not(feature = "unique-runtime"),
	feature = "quartz-runtime",
	feature = "runtime-benchmarks"
))]
pub type DefaultRuntimeExecutor = QuartzRuntimeExecutor;

#[cfg(all(
	not(feature = "unique-runtime"),
	not(feature = "quartz-runtime"),
	feature = "runtime-benchmarks"
))]
pub type DefaultRuntimeExecutor = OpalRuntimeExecutor;

#[cfg(feature = "unique-runtime")]
impl NativeExecutionDispatch for UniqueRuntimeExecutor {
	/// Only enable the benchmarking host functions when we actually want to benchmark.
	#[cfg(feature = "runtime-benchmarks")]
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;
	/// Otherwise we only use the default Substrate host functions.
	#[cfg(not(feature = "runtime-benchmarks"))]
	type ExtendHostFunctions = ();

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		unique_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		unique_runtime::native_version()
	}
}

#[cfg(feature = "quartz-runtime")]
impl NativeExecutionDispatch for QuartzRuntimeExecutor {
	/// Only enable the benchmarking host functions when we actually want to benchmark.
	#[cfg(feature = "runtime-benchmarks")]
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;
	/// Otherwise we only use the default Substrate host functions.
	#[cfg(not(feature = "runtime-benchmarks"))]
	type ExtendHostFunctions = ();

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		quartz_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		quartz_runtime::native_version()
	}
}

impl NativeExecutionDispatch for OpalRuntimeExecutor {
	/// Only enable the benchmarking host functions when we actually want to benchmark.
	#[cfg(feature = "runtime-benchmarks")]
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;
	/// Otherwise we only use the default Substrate host functions.
	#[cfg(not(feature = "runtime-benchmarks"))]
	type ExtendHostFunctions = ();

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		opal_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		opal_runtime::native_version()
	}
}

pub struct AutosealInterval {
	interval: Interval,
}

impl AutosealInterval {
	pub fn new(config: &Configuration, interval: Duration) -> Self {
		let _tokio_runtime = config.tokio_handle.enter();
		let interval = tokio::time::interval(interval);

		Self { interval }
	}
}

impl Stream for AutosealInterval {
	type Item = tokio::time::Instant;

	fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
		self.interval.poll_tick(cx).map(Some)
	}
}

pub fn open_frontier_backend<Block: BlockT, C: sp_blockchain::HeaderBackend<Block>>(
	client: Arc<C>,
	config: &Configuration,
) -> Result<Arc<fc_db::Backend<Block>>, String> {
	let config_dir = config
		.base_path
		.as_ref()
		.map(|base_path| base_path.config_dir(config.chain_spec.id()))
		.unwrap_or_else(|| {
			BasePath::from_project("", "", "unique").config_dir(config.chain_spec.id())
		});
	let database_dir = config_dir.join("frontier").join("db");

	Ok(Arc::new(fc_db::Backend::<Block>::new(
		client,
		&fc_db::DatabaseSettings {
			source: fc_db::DatabaseSource::RocksDb {
				path: database_dir,
				cache_size: 0,
			},
		},
	)?))
}

type FullClient<RuntimeApi, ExecutorDispatch> =
	sc_service::TFullClient<Block, RuntimeApi, NativeElseWasmExecutor<ExecutorDispatch>>;
type FullBackend = sc_service::TFullBackend<Block>;
type FullSelectChain = sc_consensus::LongestChain<FullBackend, Block>;
type ParachainBlockImport<RuntimeApi, ExecutorDispatch> =
	TParachainBlockImport<Block, Arc<FullClient<RuntimeApi, ExecutorDispatch>>, FullBackend>;

/// Starts a `ServiceBuilder` for a full service.
///
/// Use this macro if you don't actually need the full service, but just the builder in order to
/// be able to perform chain operations.
#[allow(clippy::type_complexity)]
pub fn new_partial<RuntimeApi, ExecutorDispatch, BIQ>(
	config: &Configuration,
	build_import_queue: BIQ,
) -> Result<
	PartialComponents<
		FullClient<RuntimeApi, ExecutorDispatch>,
		FullBackend,
		FullSelectChain,
		sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
		sc_transaction_pool::FullPool<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
		(
			Option<Telemetry>,
			Option<FilterPool>,
			Arc<fc_db::Backend<Block>>,
			Option<TelemetryWorkerHandle>,
			FeeHistoryCache,
		),
	>,
	sc_service::Error,
>
where
	sc_client_api::StateBackendFor<FullBackend, Block>: sp_api::StateBackend<BlakeTwo256>,
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
	BIQ: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
		Arc<FullBackend>,
		&Configuration,
		Option<TelemetryHandle>,
		&TaskManager,
	) -> Result<
		sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
		sc_service::Error,
	>,
{
	let _telemetry = config
		.telemetry_endpoints
		.clone()
		.filter(|x| !x.is_empty())
		.map(|endpoints| -> Result<_, sc_telemetry::Error> {
			let worker = TelemetryWorker::new(16)?;
			let telemetry = worker.handle().new_telemetry(endpoints);
			Ok((worker, telemetry))
		})
		.transpose()?;

	let telemetry = config
		.telemetry_endpoints
		.clone()
		.filter(|x| !x.is_empty())
		.map(|endpoints| -> Result<_, sc_telemetry::Error> {
			let worker = TelemetryWorker::new(16)?;
			let telemetry = worker.handle().new_telemetry(endpoints);
			Ok((worker, telemetry))
		})
		.transpose()?;

	let executor = sc_service::new_native_or_wasm_executor(config);

	let (client, backend, keystore_container, task_manager) =
		sc_service::new_full_parts::<Block, RuntimeApi, _>(
			config,
			telemetry.as_ref().map(|(_, telemetry)| telemetry.handle()),
			executor,
		)?;
	let client = Arc::new(client);

	let telemetry_worker_handle = telemetry.as_ref().map(|(worker, _)| worker.handle());

	let telemetry = telemetry.map(|(worker, telemetry)| {
		task_manager
			.spawn_handle()
			.spawn("telemetry", None, worker.run());
		telemetry
	});

	let select_chain = sc_consensus::LongestChain::new(backend.clone());

	let transaction_pool = sc_transaction_pool::BasicPool::new_full(
		config.transaction_pool.clone(),
		config.role.is_authority().into(),
		config.prometheus_registry(),
		task_manager.spawn_essential_handle(),
		client.clone(),
	);

	let filter_pool: Option<FilterPool> = Some(Arc::new(Mutex::new(BTreeMap::new())));

	let frontier_backend = open_frontier_backend(client.clone(), config)?;

	let import_queue = build_import_queue(
		client.clone(),
		backend.clone(),
		config,
		telemetry.as_ref().map(|telemetry| telemetry.handle()),
		&task_manager,
	)?;
	let fee_history_cache: FeeHistoryCache = Arc::new(Mutex::new(BTreeMap::new()));

	let params = PartialComponents {
		backend,
		client,
		import_queue,
		keystore_container,
		task_manager,
		transaction_pool,
		select_chain,
		other: (
			telemetry,
			filter_pool,
			frontier_backend,
			telemetry_worker_handle,
			fee_history_cache,
		),
	};

	Ok(params)
}

async fn build_relay_chain_interface(
	polkadot_config: Configuration,
	parachain_config: &Configuration,
	telemetry_worker_handle: Option<TelemetryWorkerHandle>,
	task_manager: &mut TaskManager,
	collator_options: CollatorOptions,
	hwbench: Option<sc_sysinfo::HwBench>,
) -> RelayChainResult<(
	Arc<(dyn RelayChainInterface + 'static)>,
	Option<CollatorPair>,
)> {
	if collator_options.relay_chain_rpc_urls.is_empty() {
		build_inprocess_relay_chain(
			polkadot_config,
			parachain_config,
			telemetry_worker_handle,
			task_manager,
			hwbench,
		)
	} else {
		build_minimal_relay_chain_node(
			polkadot_config,
			task_manager,
			collator_options.relay_chain_rpc_urls,
		)
		.await
	}
}

macro_rules! clone {
    ($($i:ident),* $(,)?) => {
		$(
			let $i = $i.clone();
		)*
    };
}

/// Start a node with the given parachain `Configuration` and relay chain `Configuration`.
///
/// This is the actual implementation that is abstract over the executor and the runtime api.
#[sc_tracing::logging::prefix_logs_with("Parachain")]
async fn start_node_impl<Runtime, RuntimeApi, ExecutorDispatch, BIQ, BIC>(
	parachain_config: Configuration,
	polkadot_config: Configuration,
	collator_options: CollatorOptions,
	id: ParaId,
	build_import_queue: BIQ,
	build_consensus: BIC,
	hwbench: Option<sc_sysinfo::HwBench>,
) -> sc_service::error::Result<(TaskManager, Arc<FullClient<RuntimeApi, ExecutorDispatch>>)>
where
	sc_client_api::StateBackendFor<FullBackend, Block>: sp_api::StateBackend<BlakeTwo256>,
	Runtime: RuntimeInstance + Send + Sync + 'static,
	<Runtime as RuntimeInstance>::CrossAccountId: Serialize,
	for<'de> <Runtime as RuntimeInstance>::CrossAccountId: Deserialize<'de>,
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
		+ fp_rpc::EthereumRuntimeRPCApi<Block>
		+ fp_rpc::ConvertTransactionRuntimeApi<Block>
		+ sp_session::SessionKeys<Block>
		+ sp_block_builder::BlockBuilder<Block>
		+ pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance>
		+ sp_api::ApiExt<Block, StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>
		+ up_rpc::UniqueApi<Block, Runtime::CrossAccountId, AccountId>
		+ app_promotion_rpc::AppPromotionApi<Block, BlockNumber, Runtime::CrossAccountId, AccountId>
		+ up_pov_estimate_rpc::PovEstimateApi<Block>
		+ substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>
		+ sp_api::Metadata<Block>
		+ sp_offchain::OffchainWorkerApi<Block>
		+ cumulus_primitives_core::CollectCollationInfo<Block>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
	BIQ: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
		Arc<FullBackend>,
		&Configuration,
		Option<TelemetryHandle>,
		&TaskManager,
	) -> Result<
		sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
		sc_service::Error,
	>,
	BIC: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
		Arc<FullBackend>,
		Option<&Registry>,
		Option<TelemetryHandle>,
		&TaskManager,
		Arc<dyn RelayChainInterface>,
		Arc<sc_transaction_pool::FullPool<Block, FullClient<RuntimeApi, ExecutorDispatch>>>,
		Arc<SyncingService<Block>>,
		KeystorePtr,
		bool,
	) -> Result<Box<dyn ParachainConsensus<Block>>, sc_service::Error>,
{
	let parachain_config = prepare_node_config(parachain_config);

	let params =
		new_partial::<RuntimeApi, ExecutorDispatch, BIQ>(&parachain_config, build_import_queue)?;
	let (mut telemetry, filter_pool, frontier_backend, telemetry_worker_handle, fee_history_cache) =
		params.other;

	let client = params.client.clone();
	let backend = params.backend.clone();
	let mut task_manager = params.task_manager;

	let (relay_chain_interface, collator_key) = build_relay_chain_interface(
		polkadot_config,
		&parachain_config,
		telemetry_worker_handle,
		&mut task_manager,
		collator_options.clone(),
		hwbench.clone(),
	)
	.await
	.map_err(|e| sc_service::Error::Application(Box::new(e) as Box<_>))?;

	let block_announce_validator = BlockAnnounceValidator::new(relay_chain_interface.clone(), id);

	let force_authoring = parachain_config.force_authoring;
	let validator = parachain_config.role.is_authority();
	let prometheus_registry = parachain_config.prometheus_registry().cloned();
	let transaction_pool = params.transaction_pool.clone();
	let import_queue_service = params.import_queue.service();

	let (network, system_rpc_tx, tx_handler_controller, start_network, sync_service) =
		sc_service::build_network(sc_service::BuildNetworkParams {
			config: &parachain_config,
			client: client.clone(),
			transaction_pool: transaction_pool.clone(),
			spawn_handle: task_manager.spawn_handle(),
			import_queue: params.import_queue,
			block_announce_validator_builder: Some(Box::new(|_| {
				Box::new(block_announce_validator)
			})),
			warp_sync_params: None,
		})?;

	let select_chain = params.select_chain.clone();

	let block_data_cache = Arc::new(fc_rpc::EthBlockDataCacheTask::new(
		task_manager.spawn_handle(),
		overrides_handle::<_, _, Runtime>(client.clone()),
		50,
		50,
		prometheus_registry.clone(),
	));

	let pubsub_notification_sinks: fc_mapping_sync::EthereumBlockNotificationSinks<
		fc_mapping_sync::EthereumBlockNotification<Block>,
	> = Default::default();
	let pubsub_notification_sinks = Arc::new(pubsub_notification_sinks);

	task_manager.spawn_essential_handle().spawn(
		"frontier-mapping-sync-worker",
		Some("frontier"),
		MappingSyncWorker::new(
			client.import_notification_stream(),
			Duration::new(6, 0),
			client.clone(),
			backend.clone(),
			overrides_handle::<_, _, Runtime>(client.clone()),
			frontier_backend.clone(),
			3,
			0,
			SyncStrategy::Normal,
			sync_service.clone(),
			pubsub_notification_sinks.clone(),
		)
		.for_each(|()| futures::future::ready(())),
	);

	let runtime_id = parachain_config.chain_spec.runtime_id();

	let rpc_builder = Box::new({
		clone!(
			client,
			backend,
			pubsub_notification_sinks,
			transaction_pool,
			network,
			sync_service,
			frontier_backend,
		);
		move |deny_unsafe, subscription_task_executor| {
			clone!(
				backend,
				runtime_id,
				client,
				transaction_pool,
				filter_pool,
				network,
				select_chain,
				block_data_cache,
				fee_history_cache,
				pubsub_notification_sinks,
				frontier_backend,
			);

			#[cfg(not(feature = "pov-estimate"))]
			let _ = backend;

			let full_deps = unique_rpc::FullDeps {
				runtime_id,

				#[cfg(feature = "pov-estimate")]
				exec_params: uc_rpc::pov_estimate::ExecutorParams {
					wasm_method: parachain_config.wasm_method,
					default_heap_pages: parachain_config.default_heap_pages,
					max_runtime_instances: parachain_config.max_runtime_instances,
					runtime_cache_size: parachain_config.runtime_cache_size,
				},

				#[cfg(feature = "pov-estimate")]
				backend,

				eth_backend: frontier_backend,
				deny_unsafe,
				client,
				graph: transaction_pool.pool().clone(),
				pool: transaction_pool,
				// TODO: Unhardcode
				enable_dev_signer: false,
				filter_pool,
				network,
				sync: sync_service.clone(),
				select_chain,
				is_authority: validator,
				// TODO: Unhardcode
				max_past_logs: 10000,
				block_data_cache,
				fee_history_cache,
				// TODO: Unhardcode
				fee_history_limit: 2048,
				pubsub_notification_sinks,
			};

			unique_rpc::create_full::<_, _, _, _, Runtime, RuntimeApi, _>(
				full_deps,
				subscription_task_executor,
			)
			.map_err(Into::into)
		}
	});

	sc_service::spawn_tasks(sc_service::SpawnTasksParams {
		rpc_builder,
		client: client.clone(),
		transaction_pool: transaction_pool.clone(),
		task_manager: &mut task_manager,
		config: parachain_config,
		keystore: params.keystore_container.keystore(),
		backend: backend.clone(),
		network: network.clone(),
		sync_service: sync_service.clone(),
		system_rpc_tx,
		telemetry: telemetry.as_mut(),
		tx_handler_controller,
	})?;

	if let Some(hwbench) = hwbench {
		sc_sysinfo::print_hwbench(&hwbench);

		if let Some(ref mut telemetry) = telemetry {
			let telemetry_handle = telemetry.handle();
			task_manager.spawn_handle().spawn(
				"telemetry_hwbench",
				None,
				sc_sysinfo::initialize_hwbench_telemetry(telemetry_handle, hwbench),
			);
		}
	}

	let announce_block = {
		let sync_service = sync_service.clone();
		Arc::new(Box::new(move |hash, data| {
			sync_service.announce_block(hash, data)
		}))
	};

	let relay_chain_slot_duration = Duration::from_secs(6);

	let overseer_handle = relay_chain_interface
		.overseer_handle()
		.map_err(|e| sc_service::Error::Application(Box::new(e)))?;

	if validator {
		let parachain_consensus = build_consensus(
			client.clone(),
			backend.clone(),
			prometheus_registry.as_ref(),
			telemetry.as_ref().map(|t| t.handle()),
			&task_manager,
			relay_chain_interface.clone(),
			transaction_pool,
			sync_service.clone(),
			params.keystore_container.keystore(),
			force_authoring,
		)?;

		let spawner = task_manager.spawn_handle();

		let params = StartCollatorParams {
			para_id: id,
			block_status: client.clone(),
			announce_block,
			client: client.clone(),
			task_manager: &mut task_manager,
			spawner,
			parachain_consensus,
			import_queue: import_queue_service,
			collator_key: collator_key.expect("Command line arguments do not allow this. qed"),
			relay_chain_interface,
			relay_chain_slot_duration,
			recovery_handle: Box::new(overseer_handle),
			sync_service,
		};

		start_collator(params).await?;
	} else {
		let params = StartFullNodeParams {
			client: client.clone(),
			announce_block,
			task_manager: &mut task_manager,
			para_id: id,
			import_queue: import_queue_service,
			relay_chain_interface,
			relay_chain_slot_duration,
			recovery_handle: Box::new(overseer_handle),
			sync_service,
		};

		start_full_node(params)?;
	}

	start_network.start_network();

	Ok((task_manager, client))
}

/// Build the import queue for the the parachain runtime.
pub fn parachain_build_import_queue<RuntimeApi, ExecutorDispatch>(
	client: Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
	backend: Arc<FullBackend>,
	config: &Configuration,
	telemetry: Option<TelemetryHandle>,
	task_manager: &TaskManager,
) -> Result<
	sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
	sc_service::Error,
>
where
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
		+ sp_block_builder::BlockBuilder<Block>
		+ sp_consensus_aura::AuraApi<Block, AuraId>
		+ sp_api::ApiExt<Block, StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	let slot_duration = cumulus_client_consensus_aura::slot_duration(&*client)?;

	let block_import = ParachainBlockImport::new(client.clone(), backend.clone());

	cumulus_client_consensus_aura::import_queue::<
		sp_consensus_aura::sr25519::AuthorityPair,
		_,
		_,
		_,
		_,
		_,
	>(cumulus_client_consensus_aura::ImportQueueParams {
		block_import,
		client: client.clone(),
		create_inherent_data_providers: move |_, _| async move {
			let time = sp_timestamp::InherentDataProvider::from_system_time();

			let slot =
				sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_slot_duration(
					*time,
					slot_duration,
				);

			Ok((slot, time))
		},
		registry: config.prometheus_registry(),
		spawner: &task_manager.spawn_essential_handle(),
		telemetry,
	})
	.map_err(Into::into)
}

/// Start a normal parachain node.
pub async fn start_node<Runtime, RuntimeApi, ExecutorDispatch>(
	parachain_config: Configuration,
	polkadot_config: Configuration,
	collator_options: CollatorOptions,
	id: ParaId,
	hwbench: Option<sc_sysinfo::HwBench>,
) -> sc_service::error::Result<(TaskManager, Arc<FullClient<RuntimeApi, ExecutorDispatch>>)>
where
	Runtime: RuntimeInstance + Send + Sync + 'static,
	<Runtime as RuntimeInstance>::CrossAccountId: Serialize,
	for<'de> <Runtime as RuntimeInstance>::CrossAccountId: Deserialize<'de>,
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
		+ fp_rpc::EthereumRuntimeRPCApi<Block>
		+ fp_rpc::ConvertTransactionRuntimeApi<Block>
		+ sp_session::SessionKeys<Block>
		+ sp_block_builder::BlockBuilder<Block>
		+ pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance>
		+ sp_api::ApiExt<Block, StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>
		+ up_rpc::UniqueApi<Block, Runtime::CrossAccountId, AccountId>
		+ app_promotion_rpc::AppPromotionApi<Block, BlockNumber, Runtime::CrossAccountId, AccountId>
		+ up_pov_estimate_rpc::PovEstimateApi<Block>
		+ substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>
		+ sp_api::Metadata<Block>
		+ sp_offchain::OffchainWorkerApi<Block>
		+ cumulus_primitives_core::CollectCollationInfo<Block>
		+ sp_consensus_aura::AuraApi<Block, AuraId>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	start_node_impl::<Runtime, RuntimeApi, ExecutorDispatch, _, _>(
		parachain_config,
		polkadot_config,
		collator_options,
		id,
		parachain_build_import_queue,
		|client,
		 backend,
		 prometheus_registry,
		 telemetry,
		 task_manager,
		 relay_chain_interface,
		 transaction_pool,
		 sync_oracle,
		 keystore,
		 force_authoring| {
			let slot_duration = cumulus_client_consensus_aura::slot_duration(&*client)?;

			let proposer_factory = sc_basic_authorship::ProposerFactory::with_proof_recording(
				task_manager.spawn_handle(),
				client.clone(),
				transaction_pool,
				prometheus_registry,
				telemetry.clone(),
			);

			let block_import = ParachainBlockImport::new(client.clone(), backend.clone());

			Ok(AuraConsensus::build::<
				sp_consensus_aura::sr25519::AuthorityPair,
				_,
				_,
				_,
				_,
				_,
				_,
			>(BuildAuraConsensusParams {
				proposer_factory,
				create_inherent_data_providers: move |_, (relay_parent, validation_data)| {
					let relay_chain_interface = relay_chain_interface.clone();
					async move {
						let parachain_inherent =
						cumulus_primitives_parachain_inherent::ParachainInherentData::create_at(
							relay_parent,
							&relay_chain_interface,
							&validation_data,
							id,
						).await;

						let time = sp_timestamp::InherentDataProvider::from_system_time();

						let slot =
						sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_slot_duration(
							*time,
							slot_duration,
						);

						let parachain_inherent = parachain_inherent.ok_or_else(|| {
							Box::<dyn std::error::Error + Send + Sync>::from(
								"Failed to create parachain inherent",
							)
						})?;
						Ok((slot, time, parachain_inherent))
					}
				},
				block_import,
				para_client: client,
				backoff_authoring_blocks: Option::<()>::None,
				sync_oracle,
				keystore,
				force_authoring,
				slot_duration,
				// We got around 500ms for proposing
				block_proposal_slot_portion: SlotProportion::new(1f32 / 24f32),
				telemetry,
				max_block_proposal_slot_portion: None,
			}))
		},
		hwbench,
	)
	.await
}

fn dev_build_import_queue<RuntimeApi, ExecutorDispatch>(
	client: Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
	_: Arc<FullBackend>,
	config: &Configuration,
	_: Option<TelemetryHandle>,
	task_manager: &TaskManager,
) -> Result<
	sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
	sc_service::Error,
>
where
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
		+ sp_api::ApiExt<Block, StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	Ok(sc_consensus_manual_seal::import_queue(
		Box::new(client.clone()),
		&task_manager.spawn_essential_handle(),
		config.prometheus_registry(),
	))
}

/// Builds a new development service. This service uses instant seal, and mocks
/// the parachain inherent
pub fn start_dev_node<Runtime, RuntimeApi, ExecutorDispatch>(
	config: Configuration,
	autoseal_interval: Duration,
) -> sc_service::error::Result<TaskManager>
where
	Runtime: RuntimeInstance + Send + Sync + 'static,
	<Runtime as RuntimeInstance>::CrossAccountId: Serialize,
	for<'de> <Runtime as RuntimeInstance>::CrossAccountId: Deserialize<'de>,
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
		+ fp_rpc::EthereumRuntimeRPCApi<Block>
		+ fp_rpc::ConvertTransactionRuntimeApi<Block>
		+ sp_session::SessionKeys<Block>
		+ sp_block_builder::BlockBuilder<Block>
		+ pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance>
		+ sp_api::ApiExt<Block, StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>
		+ up_rpc::UniqueApi<Block, Runtime::CrossAccountId, AccountId>
		+ app_promotion_rpc::AppPromotionApi<Block, BlockNumber, Runtime::CrossAccountId, AccountId>
		+ up_pov_estimate_rpc::PovEstimateApi<Block>
		+ substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>
		+ sp_api::Metadata<Block>
		+ sp_offchain::OffchainWorkerApi<Block>
		+ cumulus_primitives_core::CollectCollationInfo<Block>
		+ sp_consensus_aura::AuraApi<Block, AuraId>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	use sc_consensus_manual_seal::{run_manual_seal, EngineCommand, ManualSealParams};
	use fc_consensus::FrontierBlockImport;
	use sc_client_api::HeaderBackend;

	let sc_service::PartialComponents {
		client,
		backend,
		mut task_manager,
		import_queue,
		keystore_container,
		select_chain: maybe_select_chain,
		transaction_pool,
		other:
			(telemetry, filter_pool, frontier_backend, _telemetry_worker_handle, fee_history_cache),
	} = new_partial::<RuntimeApi, ExecutorDispatch, _>(
		&config,
		dev_build_import_queue::<RuntimeApi, ExecutorDispatch>,
	)?;
	let prometheus_registry = config.prometheus_registry().cloned();

	let block_data_cache = Arc::new(fc_rpc::EthBlockDataCacheTask::new(
		task_manager.spawn_handle(),
		overrides_handle::<_, _, Runtime>(client.clone()),
		50,
		50,
		prometheus_registry.clone(),
	));

	let pubsub_notification_sinks: fc_mapping_sync::EthereumBlockNotificationSinks<
		fc_mapping_sync::EthereumBlockNotification<Block>,
	> = Default::default();
	let pubsub_notification_sinks = Arc::new(pubsub_notification_sinks);

	let (network, system_rpc_tx, tx_handler_controller, network_starter, sync_service) =
		sc_service::build_network(sc_service::BuildNetworkParams {
			config: &config,
			client: client.clone(),
			transaction_pool: transaction_pool.clone(),
			spawn_handle: task_manager.spawn_handle(),
			import_queue,
			block_announce_validator_builder: None,
			warp_sync_params: None,
		})?;

	if config.offchain_worker.enabled {
		sc_service::build_offchain_workers(
			&config,
			task_manager.spawn_handle(),
			client.clone(),
			network.clone(),
		);
	}

	let collator = config.role.is_authority();

	let select_chain = maybe_select_chain.clone();

	if collator {
		let block_import =
			FrontierBlockImport::new(client.clone(), client.clone(), frontier_backend.clone());

		let env = sc_basic_authorship::ProposerFactory::new(
			task_manager.spawn_handle(),
			client.clone(),
			transaction_pool.clone(),
			prometheus_registry.as_ref(),
			telemetry.as_ref().map(|x| x.handle()),
		);

		let transactions_commands_stream: Box<
			dyn Stream<Item = EngineCommand<Hash>> + Send + Sync + Unpin,
		> = Box::new(
			transaction_pool
				.pool()
				.validated_pool()
				.import_notification_stream()
				.map(|_| EngineCommand::SealNewBlock {
					create_empty: true,
					finalize: false, // todo:collator finalize true
					parent_hash: None,
					sender: None,
				}),
		);

		let autoseal_interval = Box::pin(AutosealInterval::new(&config, autoseal_interval));
		let idle_commands_stream: Box<
			dyn Stream<Item = EngineCommand<Hash>> + Send + Sync + Unpin,
		> = Box::new(autoseal_interval.map(|_| EngineCommand::SealNewBlock {
			create_empty: true,
			finalize: false, // todo:collator finalize true
			parent_hash: None,
			sender: None,
		}));

		let commands_stream = select(transactions_commands_stream, idle_commands_stream);

		let slot_duration = cumulus_client_consensus_aura::slot_duration(&*client)?;
		let client_set_aside_for_cidp = client.clone();

		task_manager.spawn_essential_handle().spawn_blocking(
			"authorship_task",
			Some("block-authoring"),
			run_manual_seal(ManualSealParams {
				block_import,
				env,
				client: client.clone(),
				pool: transaction_pool.clone(),
				commands_stream,
				select_chain: select_chain.clone(),
				consensus_data_provider: None,
				create_inherent_data_providers: move |block: Hash, ()| {
					let current_para_block = client_set_aside_for_cidp
						.number(block)
						.expect("Header lookup should succeed")
						.expect("Header passed in as parent should be present in backend.");

					let client_for_xcm = client_set_aside_for_cidp.clone();
					async move {
						let time = sp_timestamp::InherentDataProvider::from_system_time();

						let mocked_parachain = cumulus_primitives_parachain_inherent::MockValidationDataInherentDataProvider {
							current_para_block,
							relay_offset: 1000,
							relay_blocks_per_para_block: 2,
							para_blocks_per_relay_epoch: 0,
							xcm_config: cumulus_primitives_parachain_inherent::MockXcmConfig::new(
								&*client_for_xcm,
								block,
								Default::default(),
								Default::default(),
							),
							relay_randomness_config: (),
							raw_downward_messages: vec![],
							raw_horizontal_messages: vec![],
						};

						let slot =
						sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_slot_duration(
							*time,
							slot_duration,
						);

						Ok((time, slot, mocked_parachain))
					}
				},
			}),
		);
	}

	task_manager.spawn_essential_handle().spawn(
		"frontier-mapping-sync-worker",
		Some("block-authoring"),
		MappingSyncWorker::new(
			client.import_notification_stream(),
			Duration::new(6, 0),
			client.clone(),
			backend.clone(),
			overrides_handle::<_, _, Runtime>(client.clone()),
			frontier_backend.clone(),
			3,
			0,
			SyncStrategy::Normal,
			sync_service.clone(),
			pubsub_notification_sinks.clone(),
		)
		.for_each(|()| futures::future::ready(())),
	);

	#[cfg(feature = "pov-estimate")]
	let rpc_backend = backend.clone();

	let runtime_id = config.chain_spec.runtime_id();

	let rpc_builder = Box::new({
		clone!(
			backend,
			client,
			sync_service,
			frontier_backend,
			network,
			transaction_pool,
			pubsub_notification_sinks
		);
		move |deny_unsafe, subscription_executor| {
			clone!(
				backend,
				block_data_cache,
				client,
				fee_history_cache,
				filter_pool,
				network,
				pubsub_notification_sinks,
			);

			#[cfg(not(feature = "pov-estimate"))]
			let _ = backend;

			let full_deps = unique_rpc::FullDeps {
				runtime_id: runtime_id.clone(),

				#[cfg(feature = "pov-estimate")]
				exec_params: uc_rpc::pov_estimate::ExecutorParams {
					wasm_method: config.wasm_method,
					default_heap_pages: config.default_heap_pages,
					max_runtime_instances: config.max_runtime_instances,
					runtime_cache_size: config.runtime_cache_size,
				},

				#[cfg(feature = "pov-estimate")]
				backend,
				eth_backend: frontier_backend.clone(),
				deny_unsafe,
				client,
				pool: transaction_pool.clone(),
				graph: transaction_pool.pool().clone(),
				// TODO: Unhardcode
				enable_dev_signer: false,
				filter_pool,
				network,
				sync: sync_service.clone(),
				select_chain: select_chain.clone(),
				is_authority: collator,
				// TODO: Unhardcode
				max_past_logs: 10000,
				block_data_cache,
				fee_history_cache,
				// TODO: Unhardcode
				fee_history_limit: 2048,
				pubsub_notification_sinks,
			};

			unique_rpc::create_full::<_, _, _, _, Runtime, RuntimeApi, _>(
				full_deps,
				subscription_executor,
			)
			.map_err(Into::into)
		}
	});

	sc_service::spawn_tasks(sc_service::SpawnTasksParams {
		network,
		sync_service,
		client,
		keystore: keystore_container.keystore(),
		task_manager: &mut task_manager,
		transaction_pool,
		rpc_builder,
		backend,
		system_rpc_tx,
		config,
		telemetry: None,
		tx_handler_controller,
	})?;

	network_starter.start_network();
	Ok(task_manager)
}
