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

use codec::Encode;

use up_pov_estimate_rpc::{PovEstimateApi as PovEstimateRuntimeApi};
use up_common::types::opaque::RuntimeId;

use sc_service::{NativeExecutionDispatch, config::ExecutionStrategy};
use sp_state_machine::{StateMachine, TrieBackendBuilder};

use jsonrpsee::{
	core::RpcResult as Result,
	proc_macros::rpc,
};
use anyhow::anyhow;

use sc_client_api::backend::Backend;
use sp_blockchain::HeaderBackend;
use sp_api::{AsTrieBackend, BlockId, BlockT, ProvideRuntimeApi};

use sc_executor::NativeElseWasmExecutor;
use sc_rpc_api::DenyUnsafe;

use sp_runtime::traits::Header;

use up_pov_estimate_rpc::PovInfo;

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
    #[method(name = "unique_povEstimate")]
    fn pov_estimate(&self, encoded_xt: Vec<u8>, at: Option<BlockHash>) -> Result<PovInfo>;
}

#[allow(deprecated)]
#[cfg(feature = "pov-estimate")]
impl<C, Block>
	PovEstimateApiServer<<Block as BlockT>::Hash> for PovEstimate<C, Block>
where
	Block: BlockT,
	C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
	C::Api: PovEstimateRuntimeApi<Block>,
{
	fn pov_estimate(&self, encoded_xt: Vec<u8>, at: Option<<Block as BlockT>::Hash>,) -> Result<PovInfo> {
        self.deny_unsafe.check_if_safe()?;

		let at = BlockId::<Block>::hash(at.unwrap_or_else(|| self.client.info().best_hash));
		let state = self.backend.state_at(at).map_err(|_| anyhow!("unable to fetch the state at {at:?}"))?;
        match &self.runtime_id {
            #[cfg(feature = "unique-runtime")]
            RuntimeId::Unique => execute_extrinsic_in_sandbox::<Block, UniqueRuntimeExecutor>(state, &self.exec_params, encoded_xt),

            #[cfg(feature = "quartz-runtime")]
            RuntimeId::Quartz => execute_extrinsic_in_sandbox::<Block, QuartzRuntimeExecutor>(state, &self.exec_params, encoded_xt),

            RuntimeId::Opal => execute_extrinsic_in_sandbox::<Block, OpalRuntimeExecutor>(state, &self.exec_params, encoded_xt),

            runtime_id => Err(anyhow!("unknown runtime id {:?}", runtime_id).into()),
        }
	}
}

fn execute_extrinsic_in_sandbox<Block, D>(state: StateOf<Block>, exec_params: &ExecutorParams, encoded_xt: Vec<u8>) -> Result<PovInfo>
where
    Block: BlockT,
    D: NativeExecutionDispatch + 'static,
{
    let backend = state.as_trie_backend().clone();
    let mut changes = Default::default();
    let runtime_code_backend = sp_state_machine::backend::BackendRuntimeCode::new(backend);

    let proving_backend =
        TrieBackendBuilder::wrap(&backend).with_recorder(Default::default()).build();

    let runtime_code = runtime_code_backend.runtime_code()
        .map_err(|_| anyhow!("runtime code backend creation failed"))?;

    let pre_root = *backend.root();

    let executor = NativeElseWasmExecutor::<D>::new(
        exec_params.wasm_method,
        exec_params.default_heap_pages,
        exec_params.max_runtime_instances,
        exec_params.runtime_cache_size,
    );
    let execution = ExecutionStrategy::NativeElseWasm;

    StateMachine::new(
        &proving_backend,
        &mut changes,
        &executor,
        "PovEstimateApi_pov_estimate",
        encoded_xt.as_slice(),
        sp_externalities::Extensions::default(),
        &runtime_code,
        sp_core::testing::TaskExecutor::new(),
    )
    .execute(execution.into())
    .map_err(|e| anyhow!("failed to execute the extrinsic {:?}", e))?;

    let proof = proving_backend
        .extract_proof()
        .expect("A recorder was set and thus, a storage proof can be extracted; qed");
    let proof_size = proof.encoded_size();
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
    })
}
