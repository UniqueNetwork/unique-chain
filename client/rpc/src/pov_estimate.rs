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

use std::sync::Arc;

use anyhow::anyhow;
use jsonrpsee::{core::RpcResult as Result, proc_macros::rpc};
use parity_scale_codec::{Decode, Encode};
use sc_client_api::backend::Backend;
use sc_executor::NativeElseWasmExecutor;
use sc_rpc_api::DenyUnsafe;
use sc_service::{config::ExecutionStrategy, NativeExecutionDispatch};
use sp_api::{AsTrieBackend, BlockId, BlockT, ProvideRuntimeApi};
use sp_blockchain::HeaderBackend;
use sp_core::{
	offchain::{
		testing::{TestOffchainExt, TestTransactionPoolExt},
		OffchainDbExt, OffchainWorkerExt, TransactionPoolExt,
	},
	testing::TaskExecutor,
	traits::TaskExecutorExt,
	Bytes,
};
use sp_externalities::Extensions;
use sp_keystore::{testing::KeyStore, KeystoreExt};
use sp_runtime::traits::Header;
use sp_state_machine::{StateMachine, TrieBackendBuilder};
use trie_db::{Trie, TrieDBBuilder};
use up_common::types::opaque::RuntimeId;
use up_pov_estimate_rpc::{PovEstimateApi as PovEstimateRuntimeApi, PovInfo, TrieKeyValue};

use crate::define_struct_for_server_api;

type HasherOf<Block> = <<Block as BlockT>::Header as Header>::Hashing;
type StateOf<Block> = <sc_service::TFullBackend<Block> as Backend<Block>>::State;

pub struct ExecutorParams {
	pub wasm_method: sc_service::config::WasmExecutionMethod,
	pub default_heap_pages: Option<u64>,
	pub max_runtime_instances: usize,
	pub runtime_cache_size: u8,
}

#[cfg(feature = "unique-runtime")]
pub struct UniqueRuntimeExecutor;

#[cfg(feature = "quartz-runtime")]
pub struct QuartzRuntimeExecutor;

pub struct OpalRuntimeExecutor;

#[cfg(feature = "unique-runtime")]
impl NativeExecutionDispatch for UniqueRuntimeExecutor {
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		unique_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		unique_runtime::native_version()
	}
}

#[cfg(feature = "quartz-runtime")]
impl NativeExecutionDispatch for QuartzRuntimeExecutor {
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		quartz_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		quartz_runtime::native_version()
	}
}

impl NativeExecutionDispatch for OpalRuntimeExecutor {
	type ExtendHostFunctions = frame_benchmarking::benchmarking::HostFunctions;

	fn dispatch(method: &str, data: &[u8]) -> Option<Vec<u8>> {
		opal_runtime::api::dispatch(method, data)
	}

	fn native_version() -> sc_executor::NativeVersion {
		opal_runtime::native_version()
	}
}

#[cfg(feature = "pov-estimate")]
define_struct_for_server_api! {
	PovEstimate {
		client: Arc<Client>,
		backend: Arc<sc_service::TFullBackend<Block>>,
		deny_unsafe: DenyUnsafe,
		exec_params: ExecutorParams,
		runtime_id: RuntimeId,
	}
}

#[rpc(server)]
#[async_trait]
pub trait PovEstimateApi<BlockHash> {
	#[method(name = "povinfo_estimateExtrinsicPoV")]
	fn estimate_extrinsic_pov(
		&self,
		encoded_xts: Vec<Bytes>,
		at: Option<BlockHash>,
	) -> Result<PovInfo>;
}

#[allow(deprecated)]
#[cfg(feature = "pov-estimate")]
impl<C, Block> PovEstimateApiServer<<Block as BlockT>::Hash> for PovEstimate<C, Block>
where
	Block: BlockT,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: PovEstimateRuntimeApi<Block>,
{
	fn estimate_extrinsic_pov(
		&self,
		encoded_xts: Vec<Bytes>,
		at: Option<<Block as BlockT>::Hash>,
	) -> Result<PovInfo> {
		self.deny_unsafe.check_if_safe()?;

		let at = at.unwrap_or_else(|| self.client.info().best_hash);
		let state = self
			.backend
			.state_at(at)
			.map_err(|_| anyhow!("unable to fetch the state at {at:?}"))?;

		match &self.runtime_id {
			#[cfg(feature = "unique-runtime")]
			RuntimeId::Unique => execute_extrinsic_in_sandbox::<Block, UniqueRuntimeExecutor>(
				state,
				&self.exec_params,
				encoded_xts,
			),

			#[cfg(feature = "quartz-runtime")]
			RuntimeId::Quartz => execute_extrinsic_in_sandbox::<Block, QuartzRuntimeExecutor>(
				state,
				&self.exec_params,
				encoded_xts,
			),

			RuntimeId::Opal => execute_extrinsic_in_sandbox::<Block, OpalRuntimeExecutor>(
				state,
				&self.exec_params,
				encoded_xts,
			),

			runtime_id => Err(anyhow!("unknown runtime id {:?}", runtime_id).into()),
		}
	}
}

fn full_extensions() -> Extensions {
	let mut extensions = Extensions::default();
	extensions.register(TaskExecutorExt::new(TaskExecutor::new()));
	let (offchain, _offchain_state) = TestOffchainExt::new();
	let (pool, _pool_state) = TestTransactionPoolExt::new();
	extensions.register(OffchainDbExt::new(offchain.clone()));
	extensions.register(OffchainWorkerExt::new(offchain));
	extensions.register(KeystoreExt(std::sync::Arc::new(KeyStore::new())));
	extensions.register(TransactionPoolExt::new(pool));

	extensions
}

fn execute_extrinsic_in_sandbox<Block, D>(
	state: StateOf<Block>,
	exec_params: &ExecutorParams,
	encoded_xts: Vec<Bytes>,
) -> Result<PovInfo>
where
	Block: BlockT,
	D: NativeExecutionDispatch + 'static,
{
	let backend = state.as_trie_backend().clone();
	let mut changes = Default::default();
	let runtime_code_backend = sp_state_machine::backend::BackendRuntimeCode::new(backend);

	let proving_backend = TrieBackendBuilder::wrap(&backend)
		.with_recorder(Default::default())
		.build();

	let runtime_code = runtime_code_backend
		.runtime_code()
		.map_err(|_| anyhow!("runtime code backend creation failed"))?;

	let pre_root = *backend.root();

	let executor = sc_service::new_native_or_wasm_executor(exec_params);
	let execution = ExecutionStrategy::NativeElseWasm;

	let mut results = Vec::new();

	for encoded_xt in encoded_xts {
		let encoded_bytes = encoded_xt.encode();

		let xt_result = StateMachine::new(
			&proving_backend,
			&mut changes,
			&executor,
			"PovEstimateApi_pov_estimate",
			encoded_bytes.as_slice(),
			full_extensions(),
			&runtime_code,
			sp_core::testing::TaskExecutor::new(),
		)
		.execute(execution.into())
		.map_err(|e| anyhow!("failed to execute the extrinsic {:?}", e))?;

		let xt_result = Decode::decode(&mut &*xt_result)
			.map_err(|e| anyhow!("failed to decode the extrinsic result {:?}", e))?;

		results.push(xt_result);
	}

	let root = proving_backend.root().clone();

	let proof = proving_backend
		.extract_proof()
		.expect("A recorder was set and thus, a storage proof can be extracted; qed");
	let proof_size = proof.encoded_size();

	let memory_db = proof.clone().into_memory_db();

	let tree_db =
		TrieDBBuilder::<sp_trie::LayoutV1<HasherOf<Block>>>::new(&memory_db, &root).build();

	let key_values = tree_db
		.iter()
		.map_err(|e| anyhow!("failed to retrieve tree db key values: {:?}", e))?
		.filter_map(|item| {
			let item = item.ok()?;

			Some(TrieKeyValue {
				key: item.0,
				value: item.1,
			})
		})
		.collect();

	let compact_proof = proof
		.clone()
		.into_compact_proof::<HasherOf<Block>>(pre_root)
		.map_err(|e| anyhow!("failed to generate compact proof {:?}", e))?;
	let compact_proof_size = compact_proof.encoded_size();

	let compressed_proof = zstd::stream::encode_all(&compact_proof.encode()[..], 0)
		.map_err(|e| anyhow!("failed to generate compact proof {:?}", e))?;
	let compressed_proof_size = compressed_proof.len();

	Ok(PovInfo {
		proof_size: proof_size as u64,
		compact_proof_size: compact_proof_size as u64,
		compressed_proof_size: compressed_proof_size as u64,
		results,
		key_values,
	})
}
