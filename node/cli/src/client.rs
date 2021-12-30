// Local Runtime Types
//use unique_runtime::RuntimeApi;
pub use runtime_common::{AccountId, AuraId, Balance, Block, CrossAccountId, Index};
use crate::service::{
	FullClient, FullBackend, Hash, Header, BlockNumber, OpalRuntimeExecutor, QuartzRuntimeExecutor,
	UniqueRuntimeExecutor,
};
use sc_client_api::{Backend as BackendT, BlockchainEvents, KeyIterator};
use sp_api::{CallApiAt, NumberFor, ProvideRuntimeApi};
use sp_blockchain::HeaderBackend;
use sp_consensus::BlockStatus;
use sp_runtime::{
	generic::{BlockId, SignedBlock},
	traits::{BlakeTwo256, Block as BlockT},
	Justifications,
};
use sp_storage::{ChildInfo, StorageData, StorageKey};
use std::sync::Arc;

/// A set of APIs that polkadot-like runtimes must implement.
pub trait RuntimeApiCollection:
	up_rpc::UniqueApi<Block, CrossAccountId, AccountId> // no way to get Runtime in CrossAccountId, remove? no, need it still
	+ sp_api::ApiExt<Block>
	+ sp_api::Metadata<Block>
	+ sp_block_builder::BlockBuilder<Block>
	+ sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
	+ sp_offchain::OffchainWorkerApi<Block>
	+ fp_rpc::EthereumRuntimeRPCApi<Block>
	+ sp_session::SessionKeys<Block>
	+ sp_consensus_aura::AuraApi<Block, AuraId>
	+ cumulus_primitives_core::CollectCollationInfo<Block>
	+ substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>
	+ pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance>
where
	<Self as sp_api::ApiExt<Block>>::StateBackend: sp_api::StateBackend<BlakeTwo256>,
{
}

impl<Api> RuntimeApiCollection for Api
where
	Api: up_rpc::UniqueApi<Block, CrossAccountId, AccountId>
		+ sp_api::ApiExt<Block>
		+ sp_api::Metadata<Block>
		+ sp_block_builder::BlockBuilder<Block>
		+ sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block>
		+ sp_offchain::OffchainWorkerApi<Block>
		+ fp_rpc::EthereumRuntimeRPCApi<Block>
		+ sp_session::SessionKeys<Block>
		+ sp_consensus_aura::AuraApi<Block, AuraId>
		+ cumulus_primitives_core::CollectCollationInfo<Block>
		+ substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Index>
		+ pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance>,
	<Self as sp_api::ApiExt<Block>>::StateBackend: sp_api::StateBackend<BlakeTwo256>,
{
}

/// Config that abstracts over all available client implementations.
///
/// For a concrete type there exists [`Client`].
pub trait AbstractClient<Block, Backend>:
	BlockchainEvents<Block>
	+ Sized
	+ Send
	+ Sync
	+ ProvideRuntimeApi<Block>
	+ HeaderBackend<Block>
	+ CallApiAt<Block, StateBackend = Backend::State>
where
	Block: BlockT,
	Backend: BackendT<Block>,
	Backend::State: sp_api::StateBackend<BlakeTwo256>,
	Self::Api: RuntimeApiCollection<StateBackend = Backend::State>,
{
}

impl<Block, Backend, Client> AbstractClient<Block, Backend> for Client
where
	Block: BlockT,
	Backend: BackendT<Block>,
	Backend::State: sp_api::StateBackend<BlakeTwo256>,
	Client: BlockchainEvents<Block>
		+ ProvideRuntimeApi<Block>
		+ HeaderBackend<Block>
		+ Sized
		+ Send
		+ Sync
		+ CallApiAt<Block, StateBackend = Backend::State>,
	Client::Api: RuntimeApiCollection<StateBackend = Backend::State>,
{
}

/// Execute something with the client instance.
///
/// As there exist multiple chains inside Unique, like Unique itself, Opal,
/// Quartz, etc, there can exist different kinds of client types. As these
/// client types differ in the generics that are being used, we can not easily
/// return them from a function. For returning them from a function there exists
/// [`Client`]. However, the problem on how to use this client instance still
/// exists. This trait "solves" it in a dirty way. It requires a type to
/// implement this trait and than the [`execute_with_client`](ExecuteWithClient:
/// :execute_with_client) function can be called with any possible client
/// instance.
///
/// In a perfect world, we could make a closure work in this way.
pub trait ExecuteWithClient {
	/// The return type when calling this instance.
	type Output;

	/// Execute whatever should be executed with the given client instance.
	fn execute_with_client<Client, Api, Backend>(self, client: Arc<Client>) -> Self::Output
	where
		<Api as sp_api::ApiExt<Block>>::StateBackend: sp_api::StateBackend<BlakeTwo256>,
		Backend: sc_client_api::Backend<Block>,
		Backend::State: sp_api::StateBackend<BlakeTwo256>,
		Api: RuntimeApiCollection<StateBackend = Backend::State>,
		Client: AbstractClient<Block, Backend, Api = Api> + 'static;
}

/// A handle to a Unique client instance.
///
/// The Unique service supports multiple different runtimes (Quartz, Unique
/// itself, etc). As each runtime has a specialized client, we need to hide them
/// behind a trait. This is this trait.
///
/// When wanting to work with the inner client, you need to use `execute_with`.
pub trait ClientHandle {
	/// Execute the given something with the client.
	fn execute_with<T: ExecuteWithClient>(&self, t: T) -> T::Output;
}

/// A client instance of Unique.
#[derive(Clone)]
pub enum Client {
	//#[cfg(feature = "unique-native")]
	Unique(Arc<FullClient<unique_runtime::RuntimeApi, UniqueRuntimeExecutor>>),
	//#[cfg(feature = "quartz-native")]
	Quartz(Arc<FullClient<quartz_runtime::RuntimeApi, QuartzRuntimeExecutor>>),
	//#[cfg(feature = "opal-native")]
	Opal(Arc<FullClient<opal_runtime::RuntimeApi, OpalRuntimeExecutor>>),
}

//#[cfg(feature = "unique-native")]
impl From<Arc<FullClient<unique_runtime::RuntimeApi, UniqueRuntimeExecutor>>> for Client {
	fn from(client: Arc<FullClient<unique_runtime::RuntimeApi, UniqueRuntimeExecutor>>) -> Self {
		Self::Unique(client)
	}
}

impl From<Arc<FullClient<quartz_runtime::RuntimeApi, QuartzRuntimeExecutor>>> for Client {
	fn from(client: Arc<FullClient<quartz_runtime::RuntimeApi, QuartzRuntimeExecutor>>) -> Self {
		Self::Quartz(client)
	}
}

impl From<Arc<FullClient<opal_runtime::RuntimeApi, OpalRuntimeExecutor>>> for Client {
	fn from(client: Arc<FullClient<opal_runtime::RuntimeApi, OpalRuntimeExecutor>>) -> Self {
		Self::Opal(client)
	}
}

impl ClientHandle for Client {
	fn execute_with<T: ExecuteWithClient>(&self, t: T) -> T::Output {
		match self {
			//#[cfg(feature = "unique-native")]
			Self::Unique(client) => T::execute_with_client::<_, _, FullBackend>(t, client.clone()),
			Self::Quartz(client) => T::execute_with_client::<_, _, FullBackend>(t, client.clone()),
			Self::Opal(client) => T::execute_with_client::<_, _, FullBackend>(t, client.clone()),
		}
	}
}

macro_rules! match_client {
	($self:ident, $method:ident($($param:ident),*)) => {
		match $self {
			//#[cfg(feature = "unique-native")]
			Self::Unique(client) => client.$method($($param),*),
			Self::Quartz(client) => client.$method($($param),*),
			Self::Opal(client) => client.$method($($param),*),
		}
	};
}

impl sc_client_api::UsageProvider<Block> for Client {
	fn usage_info(&self) -> sc_client_api::ClientInfo<Block> {
		match_client!(self, usage_info())
	}
}

impl sc_client_api::BlockBackend<Block> for Client {
	fn block_body(
		&self,
		id: &BlockId<Block>,
	) -> sp_blockchain::Result<Option<Vec<<Block as BlockT>::Extrinsic>>> {
		match_client!(self, block_body(id))
	}

	fn block_indexed_body(
		&self,
		id: &BlockId<Block>,
	) -> sp_blockchain::Result<Option<Vec<Vec<u8>>>> {
		match_client!(self, block_indexed_body(id))
	}

	fn block(&self, id: &BlockId<Block>) -> sp_blockchain::Result<Option<SignedBlock<Block>>> {
		match_client!(self, block(id))
	}

	fn block_status(&self, id: &BlockId<Block>) -> sp_blockchain::Result<BlockStatus> {
		match_client!(self, block_status(id))
	}

	fn justifications(&self, id: &BlockId<Block>) -> sp_blockchain::Result<Option<Justifications>> {
		match_client!(self, justifications(id))
	}

	fn block_hash(
		&self,
		number: NumberFor<Block>,
	) -> sp_blockchain::Result<Option<<Block as BlockT>::Hash>> {
		match_client!(self, block_hash(number))
	}

	fn indexed_transaction(
		&self,
		hash: &<Block as BlockT>::Hash,
	) -> sp_blockchain::Result<Option<Vec<u8>>> {
		match_client!(self, indexed_transaction(hash))
	}

	fn has_indexed_transaction(
		&self,
		hash: &<Block as BlockT>::Hash,
	) -> sp_blockchain::Result<bool> {
		match_client!(self, has_indexed_transaction(hash))
	}
}

impl sc_client_api::StorageProvider<Block, FullBackend> for Client {
	fn storage(
		&self,
		id: &BlockId<Block>,
		key: &StorageKey,
	) -> sp_blockchain::Result<Option<StorageData>> {
		match_client!(self, storage(id, key))
	}

	fn storage_keys(
		&self,
		id: &BlockId<Block>,
		key_prefix: &StorageKey,
	) -> sp_blockchain::Result<Vec<StorageKey>> {
		match_client!(self, storage_keys(id, key_prefix))
	}

	fn storage_hash(
		&self,
		id: &BlockId<Block>,
		key: &StorageKey,
	) -> sp_blockchain::Result<Option<<Block as BlockT>::Hash>> {
		match_client!(self, storage_hash(id, key))
	}

	fn storage_pairs(
		&self,
		id: &BlockId<Block>,
		key_prefix: &StorageKey,
	) -> sp_blockchain::Result<Vec<(StorageKey, StorageData)>> {
		match_client!(self, storage_pairs(id, key_prefix))
	}

	fn storage_keys_iter<'a>(
		&self,
		id: &BlockId<Block>,
		prefix: Option<&'a StorageKey>,
		start_key: Option<&StorageKey>,
	) -> sp_blockchain::Result<
		KeyIterator<'a, <FullBackend as sc_client_api::Backend<Block>>::State, Block>,
	> {
		match_client!(self, storage_keys_iter(id, prefix, start_key))
	}

	fn child_storage(
		&self,
		id: &BlockId<Block>,
		child_info: &ChildInfo,
		key: &StorageKey,
	) -> sp_blockchain::Result<Option<StorageData>> {
		match_client!(self, child_storage(id, child_info, key))
	}

	fn child_storage_keys(
		&self,
		id: &BlockId<Block>,
		child_info: &ChildInfo,
		key_prefix: &StorageKey,
	) -> sp_blockchain::Result<Vec<StorageKey>> {
		match_client!(self, child_storage_keys(id, child_info, key_prefix))
	}

	fn child_storage_keys_iter<'a>(
		&self,
		id: &BlockId<Block>,
		child_info: ChildInfo,
		prefix: Option<&'a StorageKey>,
		start_key: Option<&StorageKey>,
	) -> sp_blockchain::Result<
		KeyIterator<'a, <FullBackend as sc_client_api::Backend<Block>>::State, Block>,
	> {
		match_client!(
			self,
			child_storage_keys_iter(id, child_info, prefix, start_key)
		)
	}

	fn child_storage_hash(
		&self,
		id: &BlockId<Block>,
		child_info: &ChildInfo,
		key: &StorageKey,
	) -> sp_blockchain::Result<Option<<Block as BlockT>::Hash>> {
		match_client!(self, child_storage_hash(id, child_info, key))
	}
}

impl sp_blockchain::HeaderBackend<Block> for Client {
	fn header(&self, id: BlockId<Block>) -> sp_blockchain::Result<Option<Header>> {
		let id = &id;
		match_client!(self, header(id))
	}

	fn info(&self) -> sp_blockchain::Info<Block> {
		match_client!(self, info())
	}

	fn status(&self, id: BlockId<Block>) -> sp_blockchain::Result<sp_blockchain::BlockStatus> {
		match_client!(self, status(id))
	}

	fn number(&self, hash: Hash) -> sp_blockchain::Result<Option<BlockNumber>> {
		match_client!(self, number(hash))
	}

	fn hash(&self, number: BlockNumber) -> sp_blockchain::Result<Option<Hash>> {
		match_client!(self, hash(number))
	}
}
