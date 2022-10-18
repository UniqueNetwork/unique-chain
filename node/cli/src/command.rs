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

// Original license
// This file is part of Substrate.

// Copyright (C) 2017-2021 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use crate::{
	chain_spec::{
		self, RuntimeId, RuntimeIdentification, ServiceId, ServiceIdentification, default_runtime,
	},
	cli::{Cli, RelayChainCli, Subcommand},
	service::{new_partial, start_node, start_dev_node},
};

#[cfg(feature = "unique-runtime")]
use crate::service::UniqueRuntimeExecutor;

#[cfg(feature = "quartz-runtime")]
use crate::service::QuartzRuntimeExecutor;

use crate::service::{OpalRuntimeExecutor, DefaultRuntimeExecutor};

use codec::Encode;
use cumulus_primitives_core::ParaId;
use cumulus_client_cli::generate_genesis_block;
use std::{future::Future, pin::Pin};
use log::info;
use sc_cli::{
	ChainSpec, CliConfiguration, DefaultConfigurationValues, ImportParams, KeystoreParams,
	NetworkParams, Result, RuntimeVersion, SharedParams, SubstrateCli,
};
use sc_service::{
	config::{BasePath, PrometheusConfig},
};
use sp_core::hexdisplay::HexDisplay;
use sp_runtime::traits::{AccountIdConversion, Block as BlockT};
use std::{net::SocketAddr, time::Duration};

use up_common::types::opaque::Block;

macro_rules! no_runtime_err {
	($chain_name:expr) => {
		format!(
			"No runtime valid runtime was found for chain {}",
			$chain_name
		)
	};
}

fn load_spec(id: &str) -> std::result::Result<Box<dyn sc_service::ChainSpec>, String> {
	Ok(match id {
		"dev" => Box::new(chain_spec::development_config()),
		"" | "local" => Box::new(chain_spec::local_testnet_config()),
		path => {
			let path = std::path::PathBuf::from(path);
			let chain_spec = Box::new(chain_spec::OpalChainSpec::from_json_file(path.clone())?)
				as Box<dyn sc_service::ChainSpec>;

			match chain_spec.runtime_id() {
				#[cfg(feature = "unique-runtime")]
				RuntimeId::Unique => Box::new(chain_spec::UniqueChainSpec::from_json_file(path)?),

				#[cfg(feature = "quartz-runtime")]
				RuntimeId::Quartz => Box::new(chain_spec::QuartzChainSpec::from_json_file(path)?),

				RuntimeId::Opal => chain_spec,
				RuntimeId::Unknown(chain) => return Err(no_runtime_err!(chain)),
			}
		}
	})
}

impl SubstrateCli for Cli {
	// TODO use args
	fn impl_name() -> String {
		format!("{} Node", Self::node_name())
	}

	fn impl_version() -> String {
		env!("SUBSTRATE_CLI_IMPL_VERSION").into()
	}
	// TODO use args
	fn description() -> String {
		format!(
			"{} Node\n\nThe command-line arguments provided first will be \
		passed to the parachain node, while the arguments provided after -- will be passed \
		to the relaychain node.\n\n\
		{} [parachain-args] -- [relaychain-args]",
			Self::node_name(),
			Self::executable_name()
		)
	}

	fn author() -> String {
		env!("CARGO_PKG_AUTHORS").into()
	}

	//TODO use args
	fn support_url() -> String {
		"support@unique.network".into()
	}

	fn copyright_start_year() -> i32 {
		2019
	}

	fn load_spec(&self, id: &str) -> std::result::Result<Box<dyn sc_service::ChainSpec>, String> {
		load_spec(id)
	}

	fn native_runtime_version(chain_spec: &Box<dyn ChainSpec>) -> &'static RuntimeVersion {
		match chain_spec.runtime_id() {
			#[cfg(feature = "unique-runtime")]
			RuntimeId::Unique => &unique_runtime::VERSION,

			#[cfg(feature = "quartz-runtime")]
			RuntimeId::Quartz => &quartz_runtime::VERSION,

			RuntimeId::Opal => &opal_runtime::VERSION,
			RuntimeId::Unknown(chain) => panic!("{}", no_runtime_err!(chain)),
		}
	}
}

impl SubstrateCli for RelayChainCli {
	// TODO use args
	fn impl_name() -> String {
		format!("{} Node", Cli::node_name())
	}

	fn impl_version() -> String {
		env!("SUBSTRATE_CLI_IMPL_VERSION").into()
	}
	// TODO use args
	fn description() -> String {
		format!(
			"{} Node\n\nThe command-line arguments provided first will be \
			passed to the parachain node, while the arguments provided after -- will be passed \
			to the relaychain node.\n\n\
			parachain-collator [parachain-args] -- [relaychain-args]",
			Cli::node_name()
		)
	}

	fn author() -> String {
		env!("CARGO_PKG_AUTHORS").into()
	}
	// TODO use args
	fn support_url() -> String {
		"support@unique.network".into()
	}

	fn copyright_start_year() -> i32 {
		2019
	}

	fn load_spec(&self, id: &str) -> std::result::Result<Box<dyn sc_service::ChainSpec>, String> {
		polkadot_cli::Cli::from_iter([RelayChainCli::executable_name()].iter()).load_spec(id)
	}

	fn native_runtime_version(chain_spec: &Box<dyn ChainSpec>) -> &'static RuntimeVersion {
		polkadot_cli::Cli::native_runtime_version(chain_spec)
	}
}

macro_rules! async_run_with_runtime {
	(
		$runtime_api:path, $executor:path,
		$runner:ident, $components:ident, $cli:ident, $cmd:ident, $config:ident,
		$( $code:tt )*
	) => {
		$runner.async_run(|$config| {
			let $components = new_partial::<
				$runtime_api, $executor, _
			>(
				&$config,
				crate::service::parachain_build_import_queue,
			)?;
			let task_manager = $components.task_manager;

			{ $( $code )* }.map(|v| (v, task_manager))
		})
	};
}

macro_rules! construct_async_run {
	(|$components:ident, $cli:ident, $cmd:ident, $config:ident| $( $code:tt )* ) => {{
		let runner = $cli.create_runner($cmd)?;

		match runner.config().chain_spec.runtime_id() {
			#[cfg(feature = "unique-runtime")]
			RuntimeId::Unique => async_run_with_runtime!(
				unique_runtime::RuntimeApi, UniqueRuntimeExecutor,
				runner, $components, $cli, $cmd, $config, $( $code )*
			),

			#[cfg(feature = "quartz-runtime")]
			RuntimeId::Quartz => async_run_with_runtime!(
				quartz_runtime::RuntimeApi, QuartzRuntimeExecutor,
				runner, $components, $cli, $cmd, $config, $( $code )*
			),

			RuntimeId::Opal => async_run_with_runtime!(
				opal_runtime::RuntimeApi, OpalRuntimeExecutor,
				runner, $components, $cli, $cmd, $config, $( $code )*
			),

			RuntimeId::Unknown(chain) => Err(no_runtime_err!(chain).into())
		}
	}}
}

macro_rules! sync_run_with_runtime {
	(
		$runtime_api:path, $executor:path,
		$runner:ident, $components:ident, $cli:ident, $cmd:ident, $config:ident,
		$( $code:tt )*
	) => {
		$runner.sync_run(|$config| {
			$( $code )*
		})
	};
}

macro_rules! construct_sync_run {
	(|$components:ident, $cli:ident, $cmd:ident, $config:ident| $( $code:tt )* ) => {{
		let runner = $cli.create_runner($cmd)?;

		match runner.config().chain_spec.runtime_id() {
			#[cfg(feature = "unique-runtime")]
			RuntimeId::Unique => sync_run_with_runtime!(
				unique_runtime::RuntimeApi, UniqueRuntimeExecutor,
				runner, $components, $cli, $cmd, $config, $( $code )*
			),

			#[cfg(feature = "quartz-runtime")]
			RuntimeId::Quartz => sync_run_with_runtime!(
				quartz_runtime::RuntimeApi, QuartzRuntimeExecutor,
				runner, $components, $cli, $cmd, $config, $( $code )*
			),

			RuntimeId::Opal => sync_run_with_runtime!(
				opal_runtime::RuntimeApi, OpalRuntimeExecutor,
				runner, $components, $cli, $cmd, $config, $( $code )*
			),

			RuntimeId::Unknown(chain) => Err(no_runtime_err!(chain).into())
		}
	}}
}

macro_rules! start_node_using_chain_runtime {
	($start_node_fn:ident($config:expr $(, $($args:expr),+)?) $($code:tt)*) => {
		match $config.chain_spec.runtime_id() {
			#[cfg(feature = "unique-runtime")]
			RuntimeId::Unique => $start_node_fn::<
				unique_runtime::Runtime,
				unique_runtime::RuntimeApi,
				UniqueRuntimeExecutor,
			>($config $(, $($args),+)?) $($code)*,

			#[cfg(feature = "quartz-runtime")]
			RuntimeId::Quartz => $start_node_fn::<
				quartz_runtime::Runtime,
				quartz_runtime::RuntimeApi,
				QuartzRuntimeExecutor,
			>($config $(, $($args),+)?) $($code)*,

			RuntimeId::Opal => $start_node_fn::<
				opal_runtime::Runtime,
				opal_runtime::RuntimeApi,
				OpalRuntimeExecutor,
			>($config $(, $($args),+)?) $($code)*,

			RuntimeId::Unknown(chain) => Err(no_runtime_err!(chain).into()),
		}
	};
}

/// Parse command line arguments into service configuration.
pub fn run() -> Result<()> {
	let cli = Cli::from_args();

	match &cli.subcommand {
		Some(Subcommand::BuildSpec(cmd)) => {
			let runner = cli.create_runner(cmd)?;
			runner.sync_run(|config| cmd.run(config.chain_spec, config.network))
		}
		Some(Subcommand::CheckBlock(cmd)) => {
			construct_async_run!(|components, cli, cmd, config| {
				Ok(cmd.run(components.client, components.import_queue))
			})
		}
		Some(Subcommand::ExportBlocks(cmd)) => {
			construct_async_run!(|components, cli, cmd, config| {
				Ok(cmd.run(components.client, config.database))
			})
		}
		Some(Subcommand::ExportState(cmd)) => {
			construct_async_run!(|components, cli, cmd, config| {
				Ok(cmd.run(components.client, config.chain_spec))
			})
		}
		Some(Subcommand::ImportBlocks(cmd)) => {
			construct_async_run!(|components, cli, cmd, config| {
				Ok(cmd.run(components.client, components.import_queue))
			})
		}
		Some(Subcommand::PurgeChain(cmd)) => {
			let runner = cli.create_runner(cmd)?;

			runner.sync_run(|config| {
				let polkadot_cli = RelayChainCli::new(
					&config,
					[RelayChainCli::executable_name()]
						.iter()
						.chain(cli.relaychain_args.iter()),
				);

				let polkadot_config = SubstrateCli::create_configuration(
					&polkadot_cli,
					&polkadot_cli,
					config.tokio_handle.clone(),
				)
				.map_err(|err| format!("Relay chain argument error: {}", err))?;

				cmd.run(config, polkadot_config)
			})
		}
		Some(Subcommand::Revert(cmd)) => construct_async_run!(|components, cli, cmd, config| {
			Ok(cmd.run(components.client, components.backend, None))
		}),
		Some(Subcommand::ExportGenesisState(cmd)) => {
			construct_sync_run!(|components, cli, cmd, _config| {
				let spec = cli.load_spec(&cmd.shared_params.chain.clone().unwrap_or_default())?;
				let state_version = Cli::native_runtime_version(&spec).state_version();
				cmd.run::<Block>(&*spec, state_version)
			})
		}
		Some(Subcommand::ExportGenesisWasm(cmd)) => {
			construct_sync_run!(|components, cli, cmd, _config| {
				let spec = cli.load_spec(&cmd.shared_params.chain.clone().unwrap_or_default())?;
				cmd.run(&*spec)
			})
		}
		Some(Subcommand::Benchmark(cmd)) => {
			use frame_benchmarking_cli::{BenchmarkCmd, SUBSTRATE_REFERENCE_HARDWARE};
			let runner = cli.create_runner(cmd)?;
			// Switch on the concrete benchmark sub-command-
			match cmd {
				BenchmarkCmd::Pallet(cmd) => {
					if cfg!(feature = "runtime-benchmarks") {
						runner.sync_run(|config| cmd.run::<Block, DefaultRuntimeExecutor>(config))
					} else {
						Err("Benchmarking wasn't enabled when building the node. \
					You can enable it with `--features runtime-benchmarks`."
							.into())
					}
				}
				BenchmarkCmd::Block(cmd) => runner.sync_run(|config| {
					let partials = new_partial::<
						default_runtime::RuntimeApi,
						DefaultRuntimeExecutor,
						_,
					>(&config, crate::service::parachain_build_import_queue)?;
					cmd.run(partials.client)
				}),
				BenchmarkCmd::Storage(cmd) => runner.sync_run(|config| {
					let partials = new_partial::<
						default_runtime::RuntimeApi,
						DefaultRuntimeExecutor,
						_,
					>(&config, crate::service::parachain_build_import_queue)?;
					let db = partials.backend.expose_db();
					let storage = partials.backend.expose_storage();

					cmd.run(config, partials.client.clone(), db, storage)
				}),
				BenchmarkCmd::Machine(cmd) => {
					runner.sync_run(|config| cmd.run(&config, SUBSTRATE_REFERENCE_HARDWARE.clone()))
				}
				BenchmarkCmd::Overhead(_) | BenchmarkCmd::Extrinsic(_) => {
					Err("Unsupported benchmarking command".into())
				}
			}
		}
		Some(Subcommand::TryRuntime(cmd)) => {
			if cfg!(feature = "try-runtime") {
				let runner = cli.create_runner(cmd)?;

				// grab the task manager.
				let registry = &runner
					.config()
					.prometheus_config
					.as_ref()
					.map(|cfg| &cfg.registry);
				let task_manager =
					sc_service::TaskManager::new(runner.config().tokio_handle.clone(), *registry)
						.map_err(|e| format!("Error: {:?}", e))?;

				runner.async_run(|config| -> Result<(Pin<Box<dyn Future<Output = _>>>, _)> {
					Ok((
						match config.chain_spec.runtime_id() {
							#[cfg(feature = "unique-runtime")]
							RuntimeId::Unique => Box::pin(cmd.run::<Block, UniqueRuntimeExecutor>(config)),

							#[cfg(feature = "quartz-runtime")]
							RuntimeId::Quartz => Box::pin(cmd.run::<Block, QuartzRuntimeExecutor>(config)),

							RuntimeId::Opal => {
								Box::pin(cmd.run::<Block, OpalRuntimeExecutor>(config))
							}
							RuntimeId::Unknown(chain) => return Err(no_runtime_err!(chain).into()),
						},
						task_manager,
					))
				})
			} else {
				Err("Try-runtime must be enabled by `--features try-runtime`.".into())
			}
		}
		None => {
			let runner = cli.create_runner(&cli.run.normalize())?;
			let collator_options = cli.run.collator_options();

			runner.run_node_until_exit(|config| async move {
				let hwbench = if !cli.no_hardware_benchmarks {
					config.database.path().map(|database_path| {
						let _ = std::fs::create_dir_all(&database_path);
						sc_sysinfo::gather_hwbench(Some(database_path))
					})
				} else {
					None
				};

				let extensions = chain_spec::Extensions::try_get(&*config.chain_spec);

				let service_id = config.chain_spec.service_id();
				let relay_chain_id = extensions.map(|e| e.relay_chain.clone());
				let is_dev_service = matches![service_id, ServiceId::Dev]
					|| relay_chain_id == Some("dev-service".into());

				if is_dev_service {
					info!("Running Dev service");

					let autoseal_interval = Duration::from_millis(cli.idle_autoseal_interval);

					let mut config = config;
					if config.state_pruning == None {
						config.state_pruning = Some(sc_service::PruningMode::ArchiveAll);
					}

					return start_node_using_chain_runtime! {
						start_dev_node(config, autoseal_interval).map_err(Into::into)
					};
				};

				let para_id = extensions
					.map(|e| e.para_id)
					.ok_or("Could not find parachain ID in chain-spec.")?;

				let polkadot_cli = RelayChainCli::new(
					&config,
					[RelayChainCli::executable_name()]
						.iter()
						.chain(cli.relaychain_args.iter()),
				);

				let para_id = ParaId::from(para_id);

				let parachain_account = AccountIdConversion::<polkadot_primitives::v2::AccountId>::into_account_truncating(&para_id);

				let state_version =
					RelayChainCli::native_runtime_version(&config.chain_spec).state_version();
				let block: Block = generate_genesis_block(&*config.chain_spec, state_version)
					.map_err(|e| format!("{:?}", e))?;
				let genesis_state = format!("0x{:?}", HexDisplay::from(&block.header().encode()));
				let genesis_hash = format!("0x{:?}", HexDisplay::from(&block.header().hash().0));

				let polkadot_config = SubstrateCli::create_configuration(
					&polkadot_cli,
					&polkadot_cli,
					config.tokio_handle.clone(),
				)
				.map_err(|err| format!("Relay chain argument error: {}", err))?;

				info!("Parachain id: {:?}", para_id);
				info!("Parachain Account: {}", parachain_account);
				info!("Parachain genesis state: {}", genesis_state);
				info!("Parachain genesis hash: {}", genesis_hash);
				info!(
					"Is collating: {}",
					if config.role.is_authority() {
						"yes"
					} else {
						"no"
					}
				);

				start_node_using_chain_runtime! {
					start_node(config, polkadot_config, collator_options, para_id, hwbench)
						.await
						.map(|r| r.0)
						.map_err(Into::into)
				}
			})
		}
	}
}

impl DefaultConfigurationValues for RelayChainCli {
	fn p2p_listen_port() -> u16 {
		30334
	}

	fn rpc_ws_listen_port() -> u16 {
		9945
	}

	fn rpc_http_listen_port() -> u16 {
		9934
	}

	fn prometheus_listen_port() -> u16 {
		9616
	}
}

impl CliConfiguration<Self> for RelayChainCli {
	fn shared_params(&self) -> &SharedParams {
		self.base.base.shared_params()
	}

	fn import_params(&self) -> Option<&ImportParams> {
		self.base.base.import_params()
	}

	fn network_params(&self) -> Option<&NetworkParams> {
		self.base.base.network_params()
	}

	fn keystore_params(&self) -> Option<&KeystoreParams> {
		self.base.base.keystore_params()
	}

	fn base_path(&self) -> Result<Option<BasePath>> {
		Ok(self
			.shared_params()
			.base_path()?
			.or_else(|| self.base_path.clone().map(Into::into)))
	}

	fn rpc_http(&self, default_listen_port: u16) -> Result<Option<SocketAddr>> {
		self.base.base.rpc_http(default_listen_port)
	}

	fn rpc_ipc(&self) -> Result<Option<String>> {
		self.base.base.rpc_ipc()
	}

	fn rpc_ws(&self, default_listen_port: u16) -> Result<Option<SocketAddr>> {
		self.base.base.rpc_ws(default_listen_port)
	}

	fn prometheus_config(
		&self,
		default_listen_port: u16,
		chain_spec: &Box<dyn ChainSpec>,
	) -> Result<Option<PrometheusConfig>> {
		self.base
			.base
			.prometheus_config(default_listen_port, chain_spec)
	}

	fn init<F>(
		&self,
		_support_url: &String,
		_impl_version: &String,
		_logger_hook: F,
		_config: &sc_service::Configuration,
	) -> Result<()> {
		unreachable!("PolkadotCli is never initialized; qed");
	}

	fn chain_id(&self, is_dev: bool) -> Result<String> {
		let chain_id = self.base.base.chain_id(is_dev)?;

		Ok(if chain_id.is_empty() {
			self.chain_id.clone().unwrap_or_default()
		} else {
			chain_id
		})
	}

	fn role(&self, is_dev: bool) -> Result<sc_service::Role> {
		self.base.base.role(is_dev)
	}

	fn transaction_pool(&self, is_dev: bool) -> Result<sc_service::config::TransactionPoolOptions> {
		self.base.base.transaction_pool(is_dev)
	}

	fn rpc_methods(&self) -> Result<sc_service::config::RpcMethods> {
		self.base.base.rpc_methods()
	}

	fn rpc_ws_max_connections(&self) -> Result<Option<usize>> {
		self.base.base.rpc_ws_max_connections()
	}

	fn rpc_cors(&self, is_dev: bool) -> Result<Option<Vec<String>>> {
		self.base.base.rpc_cors(is_dev)
	}

	fn default_heap_pages(&self) -> Result<Option<u64>> {
		self.base.base.default_heap_pages()
	}

	fn force_authoring(&self) -> Result<bool> {
		self.base.base.force_authoring()
	}

	fn disable_grandpa(&self) -> Result<bool> {
		self.base.base.disable_grandpa()
	}

	fn max_runtime_instances(&self) -> Result<Option<usize>> {
		self.base.base.max_runtime_instances()
	}

	fn announce_block(&self) -> Result<bool> {
		self.base.base.announce_block()
	}

	fn telemetry_endpoints(
		&self,
		chain_spec: &Box<dyn ChainSpec>,
	) -> Result<Option<sc_telemetry::TelemetryEndpoints>> {
		self.base.base.telemetry_endpoints(chain_spec)
	}
}
