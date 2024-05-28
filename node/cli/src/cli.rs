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

use std::path::PathBuf;

use clap::Parser;

use crate::chain_spec;

/// Sub-commands supported by the collator.
#[derive(Debug, Parser)]
pub enum Subcommand {
	/// Export the genesis state of the parachain.
	ExportGenesisState(cumulus_client_cli::ExportGenesisHeadCommand),

	/// Export the genesis wasm of the parachain.
	ExportGenesisWasm(cumulus_client_cli::ExportGenesisWasmCommand),

	/// Keys manipulation subcommand
	#[clap(subcommand)]
	Key(sc_cli::KeySubcommand),

	/// Build a chain specification.
	BuildSpec(sc_cli::BuildSpecCmd),

	/// Validate blocks.
	CheckBlock(sc_cli::CheckBlockCmd),

	/// Export blocks.
	ExportBlocks(sc_cli::ExportBlocksCmd),

	/// Export the state of a given block into a chain spec.
	ExportState(sc_cli::ExportStateCmd),

	/// Import blocks.
	ImportBlocks(sc_cli::ImportBlocksCmd),

	/// Remove the whole chain.
	PurgeChain(cumulus_client_cli::PurgeChainCmd),

	/// Revert the chain to a previous state.
	Revert(sc_cli::RevertCmd),

	/// The custom benchmark subcommmand benchmarking runtime pallets.
	#[clap(subcommand)]
	#[cfg(feature = "runtime-benchmarks")]
	Benchmark(frame_benchmarking_cli::BenchmarkCmd),

	/// Try runtime
	#[cfg(feature = "try-runtime")]
	TryRuntime(try_runtime_cli::TryRuntimeCmd),

	/// Try runtime. Note: `try-runtime` feature must be enabled.
	#[cfg(not(feature = "try-runtime"))]
	TryRuntime,
}

#[derive(Debug, Parser)]
#[clap(args_conflicts_with_subcommands = true, subcommand_negates_reqs = true)]
pub struct Cli {
	#[structopt(subcommand)]
	pub subcommand: Option<Subcommand>,

	#[structopt(flatten)]
	pub run: cumulus_client_cli::RunCmd,

	/// When running the node in the `--dev` mode and
	/// there is no transaction in the transaction pool,
	/// an empty block will be sealed automatically
	/// after the `--idle-autoseal-interval` milliseconds.
	///
	/// The default interval is 500 milliseconds.
	#[structopt(default_value = "500", long)]
	pub idle_autoseal_interval: u64,

	/// Disable auto-sealing blocks on new transactions in the `--dev` mode.
	#[structopt(long)]
	pub disable_autoseal_on_tx: bool,

	/// Finalization delay (in seconds) of auto-sealed blocks in the `--dev` mode.
	///
	/// Disabled by default.
	#[structopt(long)]
	pub autoseal_finalization_delay: Option<u64>,

	/// Disable automatic hardware benchmarks.
	///
	/// By default these benchmarks are automatically ran at startup and measure
	/// the CPU speed, the memory bandwidth and the disk speed.
	///
	/// The results are then printed out in the logs, and also sent as part of
	/// telemetry, if telemetry is enabled.
	#[clap(long)]
	pub no_hardware_benchmarks: bool,

	/// Relaychain arguments
	#[structopt(raw = true)]
	pub relaychain_args: Vec<String>,
}

impl Cli {
	pub fn node_name() -> String {
		"Unique".into()
	}
}

#[derive(Debug)]
pub struct RelayChainCli {
	/// The actual relay chain cli object.
	pub base: polkadot_cli::RunCmd,

	/// Optional chain id that should be passed to the relay chain.
	pub chain_id: Option<String>,

	/// The base path that should be used by the relay chain.
	pub base_path: PathBuf,
}

impl RelayChainCli {
	/// Parse the relay chain CLI parameters using the para chain `Configuration`.
	pub fn new<'a>(
		para_config: &sc_service::Configuration,
		relay_chain_args: impl Iterator<Item = &'a String>,
	) -> Self {
		let extension = chain_spec::Extensions::try_get(&*para_config.chain_spec);
		let chain_id = extension.map(|e| e.relay_chain.clone());
		let base_path = para_config.base_path.path().join("polkadot");
		Self {
			base_path,
			chain_id,
			base: polkadot_cli::RunCmd::parse_from(relay_chain_args),
		}
	}
}
