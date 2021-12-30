//! Service and ServiceFactory implementation. Specialized wrapper over substrate service.

//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

// std
use std::sync::Arc;
use std::sync::Mutex;
use std::collections::BTreeMap;
use std::time::Duration;
use futures::StreamExt;

// Cumulus Imports
use cumulus_client_consensus_aura::{build_aura_consensus, BuildAuraConsensusParams, SlotProportion};
use cumulus_client_consensus_common::ParachainConsensus;
use cumulus_client_network::build_block_announce_validator;
use cumulus_client_service::{
	prepare_node_config, start_collator, start_full_node, StartCollatorParams, StartFullNodeParams,
};
use cumulus_primitives_core::ParaId;

// Substrate Imports
use sc_client_api::ExecutorProvider;
use sc_executor::NativeElseWasmExecutor;
use sc_executor::NativeExecutionDispatch;
use sc_network::NetworkService;
use sc_service::{BasePath, ChainSpec, Configuration, PartialComponents, Role, TaskManager};
use sc_telemetry::{Telemetry, TelemetryHandle, TelemetryWorker, TelemetryWorkerHandle};
use sp_consensus::SlotData;
use sp_keystore::SyncCryptoStorePtr;
use sp_runtime::traits::BlakeTwo256;
use sp_trie::PrefixedMemoryDB;
use sp_api::ConstructRuntimeApi;
use substrate_prometheus_endpoint::Registry;
use sc_client_api::BlockchainEvents;

// Frontier Imports
use fc_rpc_core::types::FilterPool;
use fc_mapping_sync::{MappingSyncWorker, SyncStrategy};

use crate::client::{Client, RuntimeApiCollection};

// Runtime type overrides
pub type BlockNumber = u32;
pub type Header = sp_runtime::generic::Header<BlockNumber, sp_runtime::traits::BlakeTwo256>;
pub type Block = sp_runtime::generic::Block<Header, sp_runtime::OpaqueExtrinsic>;
pub type Hash = sp_core::H256;

/// Native `Opal` executor instance.
pub struct OpalRuntimeExecutor; // ParachainRuntimeExecutor;

impl NativeExecutionDispatch for OpalRuntimeExecutor {
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		opal_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		opal_runtime::native_version()
	}
}

/// Native `Quartz` executor instance.
pub struct QuartzRuntimeExecutor; // ParachainRuntimeExecutor;

impl NativeExecutionDispatch for QuartzRuntimeExecutor {
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		quartz_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		quartz_runtime::native_version()
	}
}

/// Native `Unique` executor instance.
pub struct UniqueRuntimeExecutor;

impl NativeExecutionDispatch for UniqueRuntimeExecutor {
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		unique_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		unique_runtime::native_version()
	}
}

pub fn open_frontier_backend(config: &Configuration) -> Result<Arc<fc_db::Backend<Block>>, String> {
	let config_dir = config
		.base_path
		.as_ref()
		.map(|base_path| base_path.config_dir(config.chain_spec.id()))
		.unwrap_or_else(|| {
			BasePath::from_project("", "", "unique").config_dir(config.chain_spec.id())
		});
	let database_dir = config_dir.join("frontier").join("db");

	Ok(Arc::new(fc_db::Backend::<Block>::new(
		&fc_db::DatabaseSettings {
			source: fc_db::DatabaseSettingsSrc::RocksDb {
				path: database_dir,
				cache_size: 0,
			},
		},
	)?))
}

//type ExecutorDispatch = OpalRuntimeExecutor;

pub type FullClient<RuntimeApi, Executor> =
	sc_service::TFullClient<Block, RuntimeApi, NativeElseWasmExecutor<Executor>>;
pub type FullBackend = sc_service::TFullBackend<Block>;
pub type FullSelectChain = sc_consensus::LongestChain<FullBackend, Block>;

/// Can be called for a `Configuration` to check if it is a configuration for
/// the `Unique` network.
pub trait IdentifyVariant {
	/// Returns `true` if this is a configuration for the `Unique` network.
	fn is_unique(&self) -> bool;

	/// Returns `true` if this is a configuration for the `Quartz` network.
	fn is_quartz(&self) -> bool;

	/// Returns `true` if this is a configuration for the `Opal` network.
	fn is_opal(&self) -> bool;

	/// Returns `true` if this is a configuration for a dev network.
	fn is_dev(&self) -> bool;
}

impl IdentifyVariant for Box<dyn ChainSpec> {
	fn is_unique(&self) -> bool {
		self.id().starts_with("unique") // TODO change for the appropriate value, once chain specs are configured
	}

	fn is_quartz(&self) -> bool {
		self.id().starts_with("quartz") // TODO change for the appropriate value, once chain specs are configured
	}

	fn is_opal(&self) -> bool {
		!self.is_dev() // self.id().starts_with("opal") // TODO change for the appropriate value, once chain specs are configured
	}

	fn is_dev(&self) -> bool {
		self.id().ends_with("dev")
	}
}

/// Builds a new object suitable for chain operations.
#[allow(clippy::type_complexity)]
pub fn new_chain_ops(
	// TODO consider removing in favor of parallel
	config: &mut Configuration,
) -> Result<
	(
		Arc<Client>,
		Arc<FullBackend>,
		sc_consensus::BasicQueue<Block, PrefixedMemoryDB<BlakeTwo256>>,
		TaskManager,
	),
	sc_service::Error,
>
/*where
	BIQ: FnOnce(
		Arc<Client>,
		&Configuration,
		Option<TelemetryHandle>,
		&TaskManager,
	) -> Result<sc_consensus::DefaultImportQueue<Block, Client>, sc_service::Error>, */
{
	match &config.chain_spec {
		//#[cfg(feature = "unique-native")]
		spec if spec.is_unique() => new_chain_ops_inner::<
			unique_runtime::RuntimeApi,
			UniqueRuntimeExecutor,
			_,
		>(config, parachain_build_import_queue),
		spec if spec.is_quartz() => new_chain_ops_inner::<
			quartz_runtime::RuntimeApi,
			QuartzRuntimeExecutor,
			_,
		>(config, parachain_build_import_queue),
		_ => new_chain_ops_inner::<opal_runtime::RuntimeApi, OpalRuntimeExecutor, _>(
			config,
			parachain_build_import_queue,
		),
		//#[cfg(not(feature = "opal-native"))]
		//_ => panic!("Invalid chain spec!"),
	}
}

#[allow(clippy::type_complexity)]
fn new_chain_ops_inner<RuntimeApi, ExecutorDispatch, BIQ>(
	mut config: &mut Configuration,
	build_import_queue: BIQ,
) -> Result<
	(
		Arc<Client>,
		Arc<FullBackend>,
		sc_consensus::BasicQueue<Block, PrefixedMemoryDB<BlakeTwo256>>,
		TaskManager,
	),
	sc_service::Error,
>
where
	Client: From<Arc<FullClient<RuntimeApi, ExecutorDispatch>>>,
	RuntimeApi: ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi:
		RuntimeApiCollection<StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
	BIQ: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
		&Configuration,
		Option<TelemetryHandle>,
		&TaskManager,
	) -> Result<
		sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
		sc_service::Error,
	>,
{
	config.keystore = sc_service::config::KeystoreConfig::InMemory;
	let PartialComponents {
		client,
		backend,
		import_queue,
		task_manager,
		..
	} = new_partial::<RuntimeApi, ExecutorDispatch, _>(
		config,
		build_import_queue, /*, config.chain_spec.is_dev()*/
	)?;
	Ok((
		Arc::new(Client::from(client)),
		backend,
		import_queue,
		task_manager,
	))
}

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
		),
	>,
	sc_service::Error,
>
where
	sc_client_api::StateBackendFor<FullBackend, Block>: sp_api::StateBackend<BlakeTwo256>,
	RuntimeApi: ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi:
		RuntimeApiCollection<StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
	BIQ: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
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

	let executor = NativeElseWasmExecutor::<ExecutorDispatch>::new(
		config.wasm_method,
		config.default_heap_pages,
		config.max_runtime_instances,
	);

	let (client, backend, keystore_container, task_manager) = sc_service::new_full_parts(
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

	let frontier_backend = open_frontier_backend(config)?;

	let import_queue = build_import_queue(
		client.clone(),
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
		other: (
			telemetry,
			filter_pool,
			frontier_backend,
			telemetry_worker_handle,
		),
	};

	Ok(params)
}

/// Start a node with the given parachain `Configuration` and relay chain `Configuration`.
///
/// This is the actual implementation that is abstract over the executor and the runtime api.
#[sc_tracing::logging::prefix_logs_with("Parachain")]
async fn start_node_impl<RuntimeApi, ExecutorDispatch, BIQ, BIC>(
	parachain_config: Configuration,
	polkadot_config: Configuration,
	id: ParaId,
	build_import_queue: BIQ,
	build_consensus: BIC,
) -> sc_service::error::Result<(TaskManager, Arc<FullClient<RuntimeApi, ExecutorDispatch>>)>
where
	sc_client_api::StateBackendFor<FullBackend, Block>: sp_api::StateBackend<BlakeTwo256>,
	RuntimeApi: ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi:
		RuntimeApiCollection<StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
	BIQ: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
		&Configuration,
		Option<TelemetryHandle>,
		&TaskManager,
	) -> Result<
		sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
		sc_service::Error,
	>,
	BIC: FnOnce(
		Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
		Option<&Registry>,
		Option<TelemetryHandle>,
		&TaskManager,
		&polkadot_service::NewFull<polkadot_service::Client>,
		Arc<sc_transaction_pool::FullPool<Block, FullClient<RuntimeApi, ExecutorDispatch>>>,
		Arc<NetworkService<Block, Hash>>,
		SyncCryptoStorePtr,
		bool,
	) -> Result<Box<dyn ParachainConsensus<Block>>, sc_service::Error>,
{
	if matches!(parachain_config.role, Role::Light) {
		return Err("Light client not supported!".into());
	}

	let parachain_config = prepare_node_config(parachain_config);

	let params = new_partial(&parachain_config, build_import_queue)?;
	let (mut telemetry, filter_pool, frontier_backend, telemetry_worker_handle) = params.other;

	let relay_chain_full_node =
		cumulus_client_service::build_polkadot_full_node(polkadot_config, telemetry_worker_handle)
			.map_err(|e| match e {
				polkadot_service::Error::Sub(x) => x,
				s => format!("{}", s).into(),
			})?;

	let client = params.client.clone();
	let backend = params.backend.clone();
	let block_announce_validator = build_block_announce_validator(
		relay_chain_full_node.client.clone(),
		id,
		Box::new(relay_chain_full_node.network.clone()),
		relay_chain_full_node.backend.clone(),
	);

	let force_authoring = parachain_config.force_authoring;
	let validator = parachain_config.role.is_authority();
	let prometheus_registry = parachain_config.prometheus_registry().cloned();
	let transaction_pool = params.transaction_pool.clone();
	let mut task_manager = params.task_manager;
	let import_queue = cumulus_client_service::SharedImportQueue::new(params.import_queue);

	let (network, system_rpc_tx, start_network) =
		sc_service::build_network(sc_service::BuildNetworkParams {
			config: &parachain_config,
			client: client.clone(),
			transaction_pool: transaction_pool.clone(),
			spawn_handle: task_manager.spawn_handle(),
			import_queue: import_queue.clone(),
			block_announce_validator_builder: Some(Box::new(|_| block_announce_validator)),
			warp_sync: None,
		})?;

	let subscription_executor = sc_rpc::SubscriptionTaskExecutor::new(task_manager.spawn_handle());
	let rpc_client = client.clone();
	let rpc_pool = transaction_pool.clone();
	let select_chain = params.select_chain.clone();
	let is_authority = parachain_config.role.clone().is_authority();
	let rpc_network = network.clone();

	let rpc_frontier_backend = frontier_backend.clone();
	let rpc_extensions_builder = Box::new(move |deny_unsafe, _| {
		let full_deps = unique_rpc::FullDeps {
			backend: rpc_frontier_backend.clone(),
			deny_unsafe,
			client: rpc_client.clone(),
			pool: rpc_pool.clone(),
			graph: rpc_pool.pool().clone(),
			// TODO: Unhardcode
			enable_dev_signer: false,
			filter_pool: filter_pool.clone(),
			network: rpc_network.clone(),
			select_chain: select_chain.clone(),
			is_authority,
			// TODO: Unhardcode
			max_past_logs: 10000,
		};

		Ok(unique_rpc::create_full(
			full_deps,
			subscription_executor.clone(),
		))
	});

	task_manager.spawn_essential_handle().spawn(
		"frontier-mapping-sync-worker",
		None,
		MappingSyncWorker::new(
			client.import_notification_stream(),
			Duration::new(6, 0),
			client.clone(),
			backend.clone(),
			frontier_backend.clone(),
			SyncStrategy::Normal,
		)
		.for_each(|()| futures::future::ready(())),
	);

	sc_service::spawn_tasks(sc_service::SpawnTasksParams {
		rpc_extensions_builder,
		client: client.clone(),
		transaction_pool: transaction_pool.clone(),
		task_manager: &mut task_manager,
		config: parachain_config,
		keystore: params.keystore_container.sync_keystore(),
		backend: backend.clone(),
		network: network.clone(),
		system_rpc_tx,
		telemetry: telemetry.as_mut(),
	})?;

	let announce_block = {
		let network = network.clone();
		Arc::new(move |hash, data| network.announce_block(hash, data))
	};

	if validator {
		let parachain_consensus = build_consensus(
			client.clone(),
			prometheus_registry.as_ref(),
			telemetry.as_ref().map(|t| t.handle()),
			&task_manager,
			&relay_chain_full_node,
			transaction_pool,
			network,
			params.keystore_container.sync_keystore(),
			force_authoring,
		)?;

		let spawner = task_manager.spawn_handle();

		let params = StartCollatorParams {
			para_id: id,
			block_status: client.clone(),
			announce_block,
			client: client.clone(),
			task_manager: &mut task_manager,
			relay_chain_full_node,
			spawner,
			parachain_consensus,
			import_queue,
		};

		start_collator(params).await?;
	} else {
		let params = StartFullNodeParams {
			client: client.clone(),
			announce_block,
			task_manager: &mut task_manager,
			para_id: id,
			relay_chain_full_node,
		};

		start_full_node(params)?;
	}

	start_network.start_network();

	Ok((task_manager, client))
}

/// Build the import queue for the the parachain runtime.
pub fn parachain_build_import_queue<RuntimeApi, ExecutorDispatch>(
	client: Arc<FullClient<RuntimeApi, ExecutorDispatch>>,
	config: &Configuration,
	telemetry: Option<TelemetryHandle>,
	task_manager: &TaskManager,
) -> Result<
	sc_consensus::DefaultImportQueue<Block, FullClient<RuntimeApi, ExecutorDispatch>>,
	sc_service::Error,
>
where
	RuntimeApi: ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi:
		RuntimeApiCollection<StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	let slot_duration = cumulus_client_consensus_aura::slot_duration(&*client)?;

	cumulus_client_consensus_aura::import_queue::<
		sp_consensus_aura::sr25519::AuthorityPair,
		_,
		_,
		_,
		_,
		_,
		_,
	>(cumulus_client_consensus_aura::ImportQueueParams {
		block_import: client.clone(),
		client: client.clone(),
		create_inherent_data_providers: move |_, _| async move {
			let time = sp_timestamp::InherentDataProvider::from_system_time();

			let slot =
				sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_duration(
					*time,
					slot_duration.slot_duration(),
				);

			Ok((time, slot))
		},
		registry: config.prometheus_registry(),
		can_author_with: sp_consensus::CanAuthorWithNativeVersion::new(client.executor().clone()),
		spawner: &task_manager.spawn_essential_handle(),
		telemetry,
	})
	.map_err(Into::into)
}

/// Start a normal parachain node.
pub async fn start_node<RuntimeApi, ExecutorDispatch>(
	parachain_config: Configuration,
	polkadot_config: Configuration,
	id: ParaId,
) -> sc_service::error::Result<(TaskManager, Arc<FullClient<RuntimeApi, ExecutorDispatch>>)>
where
	RuntimeApi: ConstructRuntimeApi<Block, FullClient<RuntimeApi, ExecutorDispatch>>
		+ Send
		+ Sync
		+ 'static,
	RuntimeApi::RuntimeApi:
		RuntimeApiCollection<StateBackend = sc_client_api::StateBackendFor<FullBackend, Block>>,
	ExecutorDispatch: NativeExecutionDispatch + 'static,
{
	start_node_impl(
		parachain_config,
		polkadot_config,
		id,
		parachain_build_import_queue,
		|client,
		 prometheus_registry,
		 telemetry,
		 task_manager,
		 relay_chain_node,
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

			let relay_chain_backend = relay_chain_node.backend.clone();
			let relay_chain_client = relay_chain_node.client.clone();
			Ok(build_aura_consensus::<
				sp_consensus_aura::sr25519::AuthorityPair,
				_,
				_,
				_,
				_,
				_,
				_,
				_,
				_,
				_,
			>(BuildAuraConsensusParams {
				proposer_factory,
				create_inherent_data_providers: move |_, (relay_parent, validation_data)| {
					let parachain_inherent =
					cumulus_primitives_parachain_inherent::ParachainInherentData::create_at_with_client(
						relay_parent,
						&relay_chain_client,
						&*relay_chain_backend,
						&validation_data,
						id,
					);
					async move {
						let time = sp_timestamp::InherentDataProvider::from_system_time();

						let slot =
						sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_duration(
							*time,
							slot_duration.slot_duration(),
						);

						let parachain_inherent = parachain_inherent.ok_or_else(|| {
							Box::<dyn std::error::Error + Send + Sync>::from(
								"Failed to create parachain inherent",
							)
						})?;
						Ok((time, slot, parachain_inherent))
					}
				},
				block_import: client.clone(),
				relay_chain_client: relay_chain_node.client.clone(),
				relay_chain_backend: relay_chain_node.backend.clone(),
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
	)
	.await
}
