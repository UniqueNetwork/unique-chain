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
use std::{
	collections::BTreeMap,
	marker::PhantomData,
	pin::Pin,
	sync::{Arc, Mutex},
	time::Duration,
};

use cumulus_client_cli::CollatorOptions;
use cumulus_client_collator::service::CollatorService;
#[cfg(not(feature = "lookahead"))]
use cumulus_client_consensus_aura::collators::basic::{
	run as run_aura, Params as BuildAuraConsensusParams,
};
#[cfg(feature = "lookahead")]
use cumulus_client_consensus_aura::collators::lookahead::{
	run as run_aura, Params as BuildAuraConsensusParams,
};
use cumulus_client_consensus_common::ParachainBlockImport as TParachainBlockImport;
use cumulus_client_consensus_proposer::Proposer;
use cumulus_client_network::RequireSecondedInBlockAnnounce;
use cumulus_client_service::{
	build_relay_chain_interface, prepare_node_config, start_relay_chain_tasks, DARecoveryProfile,
	StartRelayChainTasksParams,
};
use cumulus_primitives_core::ParaId;
use cumulus_relay_chain_interface::{OverseerHandle, RelayChainInterface};
use fc_mapping_sync::{kv::MappingSyncWorker, EthereumBlockNotificationSinks, SyncStrategy};
use fc_rpc::{
	frontier_backend_client::SystemAccountId32StorageOverride, EthBlockDataCacheTask, EthConfig,
	EthTask, OverrideHandle, RuntimeApiStorageOverride, SchemaV1Override, SchemaV2Override,
	SchemaV3Override, StorageOverride,
};
use fc_rpc_core::types::{FeeHistoryCache, FilterPool};
use fp_rpc::EthereumRuntimeRPCApi;
use fp_storage::EthereumStorageSchema;
use futures::{
	stream::select,
	task::{Context, Poll},
	Stream, StreamExt,
};
use jsonrpsee::RpcModule;
use polkadot_service::CollatorPair;
use sc_client_api::{AuxStore, Backend, BlockOf, BlockchainEvents, StorageProvider};
use sc_consensus::ImportQueue;
use sc_executor::{NativeElseWasmExecutor, NativeExecutionDispatch};
use sc_network::NetworkBlock;
use sc_network_sync::SyncingService;
use sc_rpc::SubscriptionTaskExecutor;
use sc_service::{Configuration, PartialComponents, TaskManager};
use sc_telemetry::{Telemetry, TelemetryHandle, TelemetryWorker, TelemetryWorkerHandle};
use serde::{Deserialize, Serialize};
use sp_api::{ProvideRuntimeApi, StateBackend};
use sp_block_builder::BlockBuilder;
use sp_blockchain::{Error as BlockChainError, HeaderBackend, HeaderMetadata};
use sp_consensus_aura::sr25519::AuthorityPair as AuraAuthorityPair;
use sp_keystore::KeystorePtr;
use sp_runtime::traits::BlakeTwo256;
use substrate_prometheus_endpoint::Registry;
use tokio::time::Interval;
use up_common::types::{opaque::*, Nonce};

use crate::{
	chain_spec::RuntimeIdentification,
	rpc::{create_eth, create_full, EthDeps, FullDeps},
};

/// Unique native executor instance.
#[cfg(feature = "unique-runtime")]
pub struct UniqueRuntimeExecutor;

#[cfg(feature = "quartz-runtime")]
/// Quartz native executor instance.
pub struct QuartzRuntimeExecutor;

/// Opal native executor instance.
pub struct OpalRuntimeExecutor;

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
	pub fn new(config: &Configuration, interval: u64) -> Self {
		let _tokio_runtime = config.tokio_handle.enter();
		let interval = tokio::time::interval(Duration::from_millis(interval));

		Self { interval }
	}
}

impl Stream for AutosealInterval {
	type Item = tokio::time::Instant;

	fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
		self.interval.poll_tick(cx).map(Some)
	}
}

pub fn open_frontier_backend<C: HeaderBackend<Block>>(
	client: Arc<C>,
	config: &Configuration,
) -> Result<Arc<fc_db::kv::Backend<Block>>, String> {
	let config_dir = config.base_path.config_dir(config.chain_spec.id());
	let database_dir = config_dir.join("frontier").join("db");

	Ok(Arc::new(fc_db::kv::Backend::<Block>::new(
		client,
		&fc_db::kv::DatabaseSettings {
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

/// Generate a supertrait based on bounds, and blanket impl for it.
macro_rules! ez_bounds {
	($vis:vis trait $name:ident$(<$($gen:ident $(: $($(+)? $bound:path)*)?),* $(,)?>)? $(:)? $($(+)? $super:path)* {}) => {
		$vis trait $name $(<$($gen $(: $($bound+)*)?,)*>)?: $($super +)* {}
		impl<T, $($($gen $(: $($bound+)*)?,)*)?> $name$(<$($gen,)*>)? for T
		where T: $($super +)* {}
	}
}
ez_bounds!(
	pub trait RuntimeApiDep<Runtime: RuntimeInstance>:
		sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
		+ sp_consensus_aura::AuraApi<Block, AuraId>
		+ fp_rpc::EthereumRuntimeRPCApi<Block>
		+ sp_session::SessionKeys<Block>
		+ sp_block_builder::BlockBuilder<Block>
		+ pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance>
		+ sp_api::ApiExt<Block>
		+ up_rpc::UniqueApi<Block, Runtime::CrossAccountId, AccountId>
		+ app_promotion_rpc::AppPromotionApi<Block, BlockNumber, Runtime::CrossAccountId, AccountId>
		+ up_pov_estimate_rpc::PovEstimateApi<Block>
		+ substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Nonce>
		+ sp_api::Metadata<Block>
		+ sp_offchain::OffchainWorkerApi<Block>
		+ cumulus_primitives_core::CollectCollationInfo<Block>
		// Deprecated, not used.
		+ fp_rpc::ConvertTransactionRuntimeApi<Block>
	{
	}
);
#[cfg(not(feature = "lookahead"))]
ez_bounds!(
	pub trait LookaheadApiDep {}
);
#[cfg(feature = "lookahead")]
ez_bounds!(
	pub trait LookaheadApiDep: cumulus_primitives_aura::AuraUnincludedSegmentApi<Block> {}
);

/// Starts a `ServiceBuilder` for a full service.
///
/// Use this macro if you don't actually need the full service, but just the builder in order to
/// be able to perform chain operations.
#[allow(clippy::type_complexity)]
pub fn new_partial<Runtime, RuntimeApi, ExecutorDispatch, BIQ>(
	config: &Configuration,
	build_import_queue: BIQ,
) -> Result<
	PartialComponents<
		FullClient<RuntimeApi, ExecutorDispatch>,
		FullBackend,
		FullSelectChain,
		sc_consensus::DefaultImportQueue<Block>,
		sc_transaction_pool::FullPool<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
		OtherPartial,
	>,
	sc_service::Error,
>
where
	sc_client_api::StateBackendFor<FullBackend, Block>: sp_api::StateBackend<BlakeTwo256>,
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: RuntimeApiDep<Runtime> + 'static,
	Runtime: RuntimeInstance,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
	BIQ: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
		Arc<FullBackend>,
		&Configuration,
		Option<TelemetryHandle>,
		&TaskManager,
	) -> Result<sc_consensus::DefaultImportQueue<Block>, sc_service::Error>,
{
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

	let eth_filter_pool: Option<FilterPool> = Some(Arc::new(Mutex::new(BTreeMap::new())));

	let eth_backend = open_frontier_backend(client.clone(), config)?;

	let import_queue = build_import_queue(
		client.clone(),
		backend.clone(),
		config,
		telemetry.as_ref().map(|telemetry| telemetry.handle()),
		&task_manager,
	)?;

	let params = PartialComponents {
		backend,
		client,
		import_queue,
		keystore_container,
		task_manager,
		transaction_pool,
		select_chain,
		other: OtherPartial {
			telemetry,
			eth_filter_pool,
			eth_backend,
			telemetry_worker_handle,
		},
	};

	Ok(params)
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
pub async fn start_node<Runtime, RuntimeApi, ExecutorDispatch>(
	parachain_config: Configuration,
	polkadot_config: Configuration,
	collator_options: CollatorOptions,
	para_id: ParaId,
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
	RuntimeApi::RuntimeApi: RuntimeApiDep<Runtime> + 'static,
	RuntimeApi::RuntimeApi: LookaheadApiDep,
	Runtime: RuntimeInstance,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	let parachain_config = prepare_node_config(parachain_config);

	let params = new_partial::<Runtime, RuntimeApi, ExecutorDispatch, _>(
		&parachain_config,
		parachain_build_import_queue,
	)?;
	let OtherPartial {
		mut telemetry,
		telemetry_worker_handle,
		eth_filter_pool,
		eth_backend,
	} = params.other;
	let net_config = sc_network::config::FullNetworkConfiguration::new(&parachain_config.network);

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

	let block_announce_validator =
		RequireSecondedInBlockAnnounce::new(relay_chain_interface.clone(), para_id);

	let validator = parachain_config.role.is_authority();
	let prometheus_registry = parachain_config.prometheus_registry().cloned();
	let transaction_pool = params.transaction_pool.clone();
	let import_queue_service = params.import_queue.service();

	let (network, system_rpc_tx, tx_handler_controller, start_network, sync_service) =
		sc_service::build_network(sc_service::BuildNetworkParams {
			config: &parachain_config,
			net_config,
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

	let runtime_id = parachain_config.chain_spec.runtime_id();

	// Frontier
	let fee_history_cache: FeeHistoryCache = Arc::new(Mutex::new(BTreeMap::new()));
	let fee_history_limit = 2048;

	let eth_pubsub_notification_sinks: Arc<
		EthereumBlockNotificationSinks<fc_mapping_sync::EthereumBlockNotification<Block>>,
	> = Default::default();

	let overrides = overrides_handle(client.clone());
	let eth_block_data_cache = spawn_frontier_tasks(
		FrontierTaskParams {
			client: client.clone(),
			substrate_backend: backend.clone(),
			eth_filter_pool: eth_filter_pool.clone(),
			eth_backend: eth_backend.clone(),
			fee_history_limit,
			fee_history_cache: fee_history_cache.clone(),
			task_manager: &task_manager,
			prometheus_registry: prometheus_registry.clone(),
			overrides: overrides.clone(),
			sync_strategy: SyncStrategy::Parachain,
		},
		sync_service.clone(),
		eth_pubsub_notification_sinks.clone(),
	);

	// Rpc
	let rpc_builder = Box::new({
		clone!(
			client,
			backend,
			eth_backend,
			eth_pubsub_notification_sinks,
			fee_history_cache,
			eth_block_data_cache,
			overrides,
			transaction_pool,
			network,
			sync_service,
		);
		move |deny_unsafe, subscription_task_executor: SubscriptionTaskExecutor| {
			clone!(
				backend,
				eth_block_data_cache,
				client,
				eth_backend,
				eth_filter_pool,
				eth_pubsub_notification_sinks,
				fee_history_cache,
				eth_block_data_cache,
				network,
				runtime_id,
				transaction_pool,
				select_chain,
				overrides,
			);

			#[cfg(not(feature = "pov-estimate"))]
			let _ = backend;

			let mut rpc_handle = RpcModule::new(());

			let full_deps = FullDeps {
				client: client.clone(),
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

				deny_unsafe,
				pool: transaction_pool.clone(),
				select_chain,
			};

			create_full::<_, _, _, Runtime, _>(&mut rpc_handle, full_deps)?;

			let eth_deps = EthDeps {
				client,
				graph: transaction_pool.pool().clone(),
				pool: transaction_pool,
				is_authority: validator,
				network,
				eth_backend,
				// TODO: Unhardcode
				max_past_logs: 10000,
				fee_history_limit,
				fee_history_cache,
				eth_block_data_cache,
				// TODO: Unhardcode
				enable_dev_signer: false,
				eth_filter_pool,
				eth_pubsub_notification_sinks,
				overrides,
				sync: sync_service.clone(),
				pending_create_inherent_data_providers: |_, ()| async move { Ok(()) },
			};

			create_eth::<
				_,
				_,
				_,
				_,
				_,
				_,
				DefaultEthConfig<FullClient<RuntimeApi, ExecutorDispatch>>,
			>(
				&mut rpc_handle,
				eth_deps,
				subscription_task_executor.clone(),
			)?;

			Ok(rpc_handle)
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
		network,
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

	start_relay_chain_tasks(StartRelayChainTasksParams {
		client: client.clone(),
		announce_block: announce_block.clone(),
		para_id,
		relay_chain_interface: relay_chain_interface.clone(),
		task_manager: &mut task_manager,
		da_recovery_profile: if validator {
			DARecoveryProfile::Collator
		} else {
			DARecoveryProfile::FullNode
		},
		import_queue: import_queue_service,
		relay_chain_slot_duration,
		recovery_handle: Box::new(overseer_handle.clone()),
		sync_service: sync_service.clone(),
	})?;

	if validator {
		start_consensus(
			client.clone(),
			transaction_pool,
			StartConsensusParameters {
				backend: backend.clone(),
				prometheus_registry: prometheus_registry.as_ref(),
				telemetry: telemetry.as_ref().map(|t| t.handle()),
				task_manager: &task_manager,
				relay_chain_interface: relay_chain_interface.clone(),
				sync_oracle: sync_service,
				keystore: params.keystore_container.keystore(),
				overseer_handle,
				relay_chain_slot_duration,
				para_id,
				collator_key: collator_key.expect("cli args do not allow this"),
				announce_block,
			},
		)?;
	}

	start_network.start_network();

	Ok((task_manager, client))
}

/// Build the import queue for the the parachain runtime.
pub fn parachain_build_import_queue<Runtime, RuntimeApi, ExecutorDispatch>(
	client: Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
	backend: Arc<FullBackend>,
	config: &Configuration,
	telemetry: Option<TelemetryHandle>,
	task_manager: &TaskManager,
) -> Result<sc_consensus::DefaultImportQueue<Block>, sc_service::Error>
where
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: RuntimeApiDep<Runtime> + 'static,
	Runtime: RuntimeInstance,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	let slot_duration = cumulus_client_consensus_aura::slot_duration(&*client)?;

	let block_import = ParachainBlockImport::new(client.clone(), backend);

	cumulus_client_consensus_aura::import_queue::<
		sp_consensus_aura::sr25519::AuthorityPair,
		_,
		_,
		_,
		_,
		_,
	>(cumulus_client_consensus_aura::ImportQueueParams {
		block_import,
		client,
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

pub struct StartConsensusParameters<'a> {
	backend: Arc<FullBackend>,
	prometheus_registry: Option<&'a Registry>,
	telemetry: Option<TelemetryHandle>,
	task_manager: &'a TaskManager,
	relay_chain_interface: Arc<dyn RelayChainInterface>,
	sync_oracle: Arc<SyncingService<Block>>,
	keystore: KeystorePtr,
	overseer_handle: OverseerHandle,
	relay_chain_slot_duration: Duration,
	para_id: ParaId,
	collator_key: CollatorPair,
	announce_block: Arc<dyn Fn(Hash, Option<Vec<u8>>) + Send + Sync>,
}

// Clones ignored for optional lookahead collator
#[allow(clippy::redundant_clone)]
pub fn start_consensus<ExecutorDispatch, RuntimeApi, Runtime>(
	client: Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
	transaction_pool: Arc<
		sc_transaction_pool::FullPool<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
	>,
	parameters: StartConsensusParameters<'_>,
) -> Result<(), sc_service::Error>
where
	ExecutorDispatch: NativeExecutionDispatch + 'static,
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: RuntimeApiDep<Runtime> + 'static,
	RuntimeApi::RuntimeApi: LookaheadApiDep,
	Runtime: RuntimeInstance,
{
	let StartConsensusParameters {
		backend,
		prometheus_registry,
		telemetry,
		task_manager,
		relay_chain_interface,
		sync_oracle,
		keystore,
		overseer_handle,
		relay_chain_slot_duration,
		para_id,
		collator_key,
		announce_block,
	} = parameters;
	let slot_duration = cumulus_client_consensus_aura::slot_duration(&*client)?;

	let proposer_factory = sc_basic_authorship::ProposerFactory::with_proof_recording(
		task_manager.spawn_handle(),
		client.clone(),
		transaction_pool,
		prometheus_registry,
		telemetry,
	);
	let proposer = Proposer::new(proposer_factory);

	let collator_service = CollatorService::new(
		client.clone(),
		Arc::new(task_manager.spawn_handle()),
		announce_block,
		client.clone(),
	);

	let block_import = ParachainBlockImport::new(client.clone(), backend.clone());

	let params = BuildAuraConsensusParams {
		create_inherent_data_providers: move |_, ()| async move { Ok(()) },
		block_import,
		para_client: client.clone(),
		#[cfg(feature = "lookahead")]
		para_backend: backend,
		para_id,
		relay_client: relay_chain_interface,
		sync_oracle,
		keystore,
		slot_duration,
		proposer,
		collator_service,
		// With async-baking, we allowed to be both slower (longer authoring) and faster (multiple para blocks per relay block)
		#[cfg(not(feature = "lookahead"))]
		authoring_duration: Duration::from_millis(500),
		#[cfg(feature = "lookahead")]
		authoring_duration: Duration::from_millis(1500),
		overseer_handle,
		#[cfg(feature = "lookahead")]
		code_hash_provider: move |block_hash| {
			client
				.code_at(block_hash)
				.ok()
				.map(cumulus_primitives_core::relay_chain::ValidationCode)
				.map(|c| c.hash())
		},
		collator_key,
		relay_chain_slot_duration,
	};

	task_manager.spawn_essential_handle().spawn(
		"aura",
		None,
		#[cfg(not(feature = "lookahead"))]
		run_aura::<_, AuraAuthorityPair, _, _, _, _, _, _, _>(params),
		#[cfg(feature = "lookahead")]
		run_aura::<_, AuraAuthorityPair, _, _, _, _, _, _, _, _, _>(params),
	);
	Ok(())
}

fn dev_build_import_queue<RuntimeApi, ExecutorDispatch>(
	client: Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
	_: Arc<FullBackend>,
	config: &Configuration,
	_: Option<TelemetryHandle>,
	task_manager: &TaskManager,
) -> Result<sc_consensus::DefaultImportQueue<Block>, sc_service::Error>
where
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi:
		sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block> + sp_api::ApiExt<Block>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	Ok(sc_consensus_manual_seal::import_queue(
		Box::new(client),
		&task_manager.spawn_essential_handle(),
		config.prometheus_registry(),
	))
}

pub struct OtherPartial {
	pub telemetry: Option<Telemetry>,
	pub telemetry_worker_handle: Option<TelemetryWorkerHandle>,
	pub eth_filter_pool: Option<FilterPool>,
	pub eth_backend: Arc<fc_db::kv::Backend<Block>>,
}

struct DefaultEthConfig<C>(PhantomData<C>);
impl<C> EthConfig<Block, C> for DefaultEthConfig<C>
where
	C: StorageProvider<Block, FullBackend> + Sync + Send + 'static,
{
	type EstimateGasAdapter = ();
	type RuntimeStorageOverride = SystemAccountId32StorageOverride<Block, C, FullBackend>;
}

/// Builds a new development service. This service uses instant seal, and mocks
/// the parachain inherent
pub fn start_dev_node<Runtime, RuntimeApi, ExecutorDispatch>(
	config: Configuration,
	autoseal_interval: u64,
	autoseal_finalize_delay: Option<u64>,
	disable_autoseal_on_tx: bool,
) -> sc_service::error::Result<TaskManager>
where
	Runtime: RuntimeInstance + Send + Sync + 'static,
	<Runtime as RuntimeInstance>::CrossAccountId: Serialize,
	for<'de> <Runtime as RuntimeInstance>::CrossAccountId: Deserialize<'de>,
	RuntimeApi: sp_api::ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi: RuntimeApiDep<Runtime> + 'static,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	use fc_consensus::FrontierBlockImport;
	use sc_consensus_manual_seal::{
		run_delayed_finalize, run_manual_seal, DelayedFinalizeParams, EngineCommand,
		ManualSealParams,
	};

	let sc_service::PartialComponents {
		client,
		backend,
		mut task_manager,
		import_queue,
		keystore_container,
		select_chain: maybe_select_chain,
		transaction_pool,
		other:
			OtherPartial {
				telemetry,
				eth_filter_pool,
				eth_backend,
				telemetry_worker_handle: _,
			},
	} = new_partial::<Runtime, RuntimeApi, ExecutorDispatch, _>(
		&config,
		dev_build_import_queue::<RuntimeApi, ExecutorDispatch>,
	)?;
	let net_config = sc_network::config::FullNetworkConfiguration::new(&config.network);
	let prometheus_registry = config.prometheus_registry().cloned();

	let (network, system_rpc_tx, tx_handler_controller, network_starter, sync_service) =
		sc_service::build_network(sc_service::BuildNetworkParams {
			config: &config,
			net_config,
			client: client.clone(),
			transaction_pool: transaction_pool.clone(),
			spawn_handle: task_manager.spawn_handle(),
			import_queue,
			block_announce_validator_builder: None,
			warp_sync_params: None,
		})?;

	let collator = config.role.is_authority();

	let select_chain = maybe_select_chain;

	if collator {
		let block_import = FrontierBlockImport::new(client.clone(), client.clone());

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
				.filter(move |_| futures::future::ready(!disable_autoseal_on_tx))
				.map(|_| EngineCommand::SealNewBlock {
					create_empty: true,
					finalize: false,
					parent_hash: None,
					sender: None,
				}),
		);

		let autoseal_interval = Box::pin(AutosealInterval::new(&config, autoseal_interval));

		let idle_commands_stream: Box<
			dyn Stream<Item = EngineCommand<Hash>> + Send + Sync + Unpin,
		> = Box::new(autoseal_interval.map(|_| EngineCommand::SealNewBlock {
			create_empty: true,
			finalize: false,
			parent_hash: None,
			sender: None,
		}));

		let commands_stream = select(transactions_commands_stream, idle_commands_stream);

		let slot_duration = cumulus_client_consensus_aura::slot_duration(&*client)?;
		let client_set_aside_for_cidp = client.clone();

		if let Some(delay_sec) = autoseal_finalize_delay {
			let spawn_handle = task_manager.spawn_handle();

			task_manager.spawn_essential_handle().spawn_blocking(
				"finalization_task",
				Some("block-authoring"),
				run_delayed_finalize(DelayedFinalizeParams {
					client: client.clone(),
					delay_sec,
					spawn_handle,
				}),
			);
		}

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

	#[cfg(feature = "pov-estimate")]
	let rpc_backend = backend.clone();

	let runtime_id = config.chain_spec.runtime_id();

	// Frontier
	let fee_history_cache: FeeHistoryCache = Arc::new(Mutex::new(BTreeMap::new()));
	let fee_history_limit = 2048;

	let eth_pubsub_notification_sinks: Arc<
		EthereumBlockNotificationSinks<fc_mapping_sync::EthereumBlockNotification<Block>>,
	> = Default::default();

	let overrides = overrides_handle(client.clone());
	let eth_block_data_cache = spawn_frontier_tasks(
		FrontierTaskParams {
			client: client.clone(),
			substrate_backend: backend.clone(),
			eth_filter_pool: eth_filter_pool.clone(),
			eth_backend: eth_backend.clone(),
			fee_history_limit,
			fee_history_cache: fee_history_cache.clone(),
			task_manager: &task_manager,
			prometheus_registry,
			overrides: overrides.clone(),
			sync_strategy: SyncStrategy::Normal,
		},
		sync_service.clone(),
		eth_pubsub_notification_sinks.clone(),
	);

	// Rpc
	let rpc_builder = Box::new({
		clone!(
			client,
			backend,
			eth_backend,
			eth_pubsub_notification_sinks,
			fee_history_cache,
			eth_block_data_cache,
			overrides,
			transaction_pool,
			network,
			sync_service,
		);
		move |deny_unsafe, subscription_task_executor: SubscriptionTaskExecutor| {
			clone!(
				backend,
				eth_block_data_cache,
				client,
				eth_backend,
				eth_filter_pool,
				eth_pubsub_notification_sinks,
				fee_history_cache,
				eth_block_data_cache,
				network,
				runtime_id,
				transaction_pool,
				select_chain,
				overrides,
			);

			#[cfg(not(feature = "pov-estimate"))]
			let _ = backend;

			let mut rpc_module = RpcModule::new(());

			let full_deps = FullDeps {
				runtime_id,

				#[cfg(feature = "pov-estimate")]
				exec_params: uc_rpc::pov_estimate::ExecutorParams {
					wasm_method: config.wasm_method,
					default_heap_pages: config.default_heap_pages,
					max_runtime_instances: config.max_runtime_instances,
					runtime_cache_size: config.runtime_cache_size,
				},

				#[cfg(feature = "pov-estimate")]
				backend,
				// eth_backend,
				deny_unsafe,
				client: client.clone(),
				pool: transaction_pool.clone(),
				select_chain,
			};

			create_full::<_, _, _, Runtime, _>(&mut rpc_module, full_deps)?;

			let eth_deps = EthDeps {
				client,
				graph: transaction_pool.pool().clone(),
				pool: transaction_pool,
				is_authority: true,
				network,
				eth_backend,
				// TODO: Unhardcode
				max_past_logs: 10000,
				fee_history_limit,
				fee_history_cache,
				eth_block_data_cache,
				// TODO: Unhardcode
				enable_dev_signer: false,
				eth_filter_pool,
				eth_pubsub_notification_sinks,
				overrides,
				sync: sync_service.clone(),
				// We don't have any inherents except parachain built-ins, which we can't even extract from inside `run_aura`.
				pending_create_inherent_data_providers: |_, ()| async move { Ok(()) },
			};

			create_eth::<
				_,
				_,
				_,
				_,
				_,
				_,
				DefaultEthConfig<FullClient<RuntimeApi, ExecutorDispatch>>,
			>(
				&mut rpc_module,
				eth_deps,
				subscription_task_executor.clone(),
			)?;

			Ok(rpc_module)
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

fn overrides_handle<C, BE>(client: Arc<C>) -> Arc<OverrideHandle<Block>>
where
	C: ProvideRuntimeApi<Block> + StorageProvider<Block, BE> + AuxStore,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError>,
	C: Send + Sync + 'static,
	C::Api: fp_rpc::EthereumRuntimeRPCApi<Block>,
	BE: Backend<Block> + 'static,
	BE::State: StateBackend<BlakeTwo256>,
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

pub struct FrontierTaskParams<'a, C, B> {
	pub task_manager: &'a TaskManager,
	pub client: Arc<C>,
	pub substrate_backend: Arc<B>,
	pub eth_backend: Arc<fc_db::kv::Backend<Block>>,
	pub eth_filter_pool: Option<FilterPool>,
	pub overrides: Arc<OverrideHandle<Block>>,
	pub fee_history_limit: u64,
	pub fee_history_cache: FeeHistoryCache,
	pub sync_strategy: SyncStrategy,
	pub prometheus_registry: Option<Registry>,
}

pub fn spawn_frontier_tasks<C, B>(
	params: FrontierTaskParams<C, B>,
	sync: Arc<SyncingService<Block>>,
	pubsub_notification_sinks: Arc<
		EthereumBlockNotificationSinks<fc_mapping_sync::EthereumBlockNotification<Block>>,
	>,
) -> Arc<EthBlockDataCacheTask<Block>>
where
	C: ProvideRuntimeApi<Block> + BlockOf,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError> + 'static,
	C: BlockchainEvents<Block> + StorageProvider<Block, B>,
	C: Send + Sync + 'static,
	C::Api: EthereumRuntimeRPCApi<Block>,
	C::Api: BlockBuilder<Block>,
	B: Backend<Block> + 'static,
	B::State: StateBackend<BlakeTwo256>,
{
	let FrontierTaskParams {
		task_manager,
		client,
		substrate_backend,
		eth_backend,
		eth_filter_pool,
		overrides,
		fee_history_limit,
		fee_history_cache,
		sync_strategy,
		prometheus_registry,
	} = params;
	// Frontier offchain DB task. Essential.
	// Maps emulated ethereum data to substrate native data.
	params.task_manager.spawn_essential_handle().spawn(
		"frontier-mapping-sync-worker",
		Some("frontier"),
		MappingSyncWorker::new(
			client.import_notification_stream(),
			Duration::new(6, 0),
			client.clone(),
			substrate_backend,
			overrides.clone(),
			eth_backend,
			3,
			0,
			sync_strategy,
			sync,
			pubsub_notification_sinks,
		)
		.for_each(|()| futures::future::ready(())),
	);

	// Frontier `EthFilterApi` maintenance.
	// Manages the pool of user-created Filters.
	if let Some(eth_filter_pool) = eth_filter_pool {
		// Each filter is allowed to stay in the pool for 100 blocks.
		const FILTER_RETAIN_THRESHOLD: u64 = 100;
		params.task_manager.spawn_essential_handle().spawn(
			"frontier-filter-pool",
			Some("frontier"),
			EthTask::filter_pool_task(client.clone(), eth_filter_pool, FILTER_RETAIN_THRESHOLD),
		);
	}

	// Spawn Frontier FeeHistory cache maintenance task.
	params.task_manager.spawn_essential_handle().spawn(
		"frontier-fee-history",
		Some("frontier"),
		EthTask::fee_history_task(
			client,
			overrides.clone(),
			fee_history_cache,
			fee_history_limit,
		),
	);

	Arc::new(EthBlockDataCacheTask::new(
		task_manager.spawn_handle(),
		overrides,
		50,
		50,
		prometheus_registry,
	))
}
