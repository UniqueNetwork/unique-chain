#[macro_export]
macro_rules! impl_common_runtime_apis {
    (
        $(
            #![custom_apis]

            $($custom_apis:tt)+
        )?
    ) => {
        impl_runtime_apis! {
            $($($custom_apis)+)?

            impl up_rpc::UniqueApi<Block, CrossAccountId, AccountId> for Runtime {
                fn account_tokens(collection: CollectionId, account: CrossAccountId) -> Result<Vec<TokenId>, DispatchError> {
                    dispatch_unique_runtime!(collection.account_tokens(account))
                }
                fn token_exists(collection: CollectionId, token: TokenId) -> Result<bool, DispatchError> {
                    dispatch_unique_runtime!(collection.token_exists(token))
                }

                fn token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>, DispatchError> {
                    dispatch_unique_runtime!(collection.token_owner(token))
                }
                fn const_metadata(collection: CollectionId, token: TokenId) -> Result<Vec<u8>, DispatchError> {
                    dispatch_unique_runtime!(collection.const_metadata(token))
                }
                fn variable_metadata(collection: CollectionId, token: TokenId) -> Result<Vec<u8>, DispatchError> {
                    dispatch_unique_runtime!(collection.variable_metadata(token))
                }

                fn collection_tokens(collection: CollectionId) -> Result<u32, DispatchError> {
                    dispatch_unique_runtime!(collection.collection_tokens())
                }
                fn account_balance(collection: CollectionId, account: CrossAccountId) -> Result<u32, DispatchError> {
                    dispatch_unique_runtime!(collection.account_balance(account))
                }
                fn balance(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<u128, DispatchError> {
                    dispatch_unique_runtime!(collection.balance(account, token))
                }
                fn allowance(
                    collection: CollectionId,
                    sender: CrossAccountId,
                    spender: CrossAccountId,
                    token: TokenId,
                ) -> Result<u128, DispatchError> {
                    dispatch_unique_runtime!(collection.allowance(sender, spender, token))
                }

                fn eth_contract_code(account: H160) -> Option<Vec<u8>> {
                    <pallet_unique::UniqueErcSupport<Runtime>>::get_code(&account)
                        .or_else(|| <pallet_evm_migration::OnMethodCall<Runtime>>::get_code(&account))
                        .or_else(|| <pallet_evm_contract_helpers::HelpersOnMethodCall<Self>>::get_code(&account))
                }
                fn adminlist(collection: CollectionId) -> Result<Vec<CrossAccountId>, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::adminlist(collection))
                }
                fn allowlist(collection: CollectionId) -> Result<Vec<CrossAccountId>, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::allowlist(collection))
                }
                fn allowed(collection: CollectionId, user: CrossAccountId) -> Result<bool, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::allowed(collection, user))
                }
                fn last_token_id(collection: CollectionId) -> Result<TokenId, DispatchError> {
                    dispatch_unique_runtime!(collection.last_token_id())
                }
                fn collection_by_id(collection: CollectionId) -> Result<Option<Collection<AccountId>>, DispatchError> {
                    Ok(<pallet_common::CollectionById<Runtime>>::get(collection))
                }
                fn collection_stats() -> Result<CollectionStats, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::collection_stats())
                }
                fn next_sponsored(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<Option<u64>, DispatchError> {
                    Ok(<pallet_unique::UniqueSponsorshipPredict<Runtime> as
                            pallet_unique::SponsorshipPredict<Runtime>>::predict(
                        collection,
                        account,
                        token))
                }

                fn effective_collection_limits(collection: CollectionId) -> Result<Option<CollectionLimits>, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::effective_collection_limits(collection))
                }
            }

            impl sp_api::Core<Block> for Runtime {
                fn version() -> RuntimeVersion {
                    VERSION
                }

                fn execute_block(block: Block) {
                    Executive::execute_block(block)
                }

                fn initialize_block(header: &<Block as BlockT>::Header) {
                    Executive::initialize_block(header)
                }
            }

            impl sp_api::Metadata<Block> for Runtime {
                fn metadata() -> OpaqueMetadata {
                    OpaqueMetadata::new(Runtime::metadata().into())
                }
            }

            impl sp_block_builder::BlockBuilder<Block> for Runtime {
                fn apply_extrinsic(extrinsic: <Block as BlockT>::Extrinsic) -> ApplyExtrinsicResult {
                    Executive::apply_extrinsic(extrinsic)
                }

                fn finalize_block() -> <Block as BlockT>::Header {
                    Executive::finalize_block()
                }

                fn inherent_extrinsics(data: sp_inherents::InherentData) -> Vec<<Block as BlockT>::Extrinsic> {
                    data.create_extrinsics()
                }

                fn check_inherents(
                    block: Block,
                    data: sp_inherents::InherentData,
                ) -> sp_inherents::CheckInherentsResult {
                    data.check_extrinsics(&block)
                }

                // fn random_seed() -> <Block as BlockT>::Hash {
                //     RandomnessCollectiveFlip::random_seed().0
                // }
            }

            impl sp_transaction_pool::runtime_api::TaggedTransactionQueue<Block> for Runtime {
                fn validate_transaction(
                    source: TransactionSource,
                    tx: <Block as BlockT>::Extrinsic,
                    hash: <Block as BlockT>::Hash,
                ) -> TransactionValidity {
                    Executive::validate_transaction(source, tx, hash)
                }
            }

            impl sp_offchain::OffchainWorkerApi<Block> for Runtime {
                fn offchain_worker(header: &<Block as BlockT>::Header) {
                    Executive::offchain_worker(header)
                }
            }

            impl fp_rpc::EthereumRuntimeRPCApi<Block> for Runtime {
                fn chain_id() -> u64 {
                    <Runtime as pallet_evm::Config>::ChainId::get()
                }

                fn account_basic(address: H160) -> EVMAccount {
                    EVM::account_basic(&address)
                }

                fn gas_price() -> U256 {
                    <Runtime as pallet_evm::Config>::FeeCalculator::min_gas_price()
                }

                fn account_code_at(address: H160) -> Vec<u8> {
                    EVM::account_codes(address)
                }

                fn author() -> H160 {
                    <pallet_evm::Pallet<Runtime>>::find_author()
                }

                fn storage_at(address: H160, index: U256) -> H256 {
                    let mut tmp = [0u8; 32];
                    index.to_big_endian(&mut tmp);
                    EVM::account_storages(address, H256::from_slice(&tmp[..]))
                }

                #[allow(clippy::redundant_closure)]
                fn call(
                    from: H160,
                    to: H160,
                    data: Vec<u8>,
                    value: U256,
                    gas_limit: U256,
                    max_fee_per_gas: Option<U256>,
                    max_priority_fee_per_gas: Option<U256>,
                    nonce: Option<U256>,
                    estimate: bool,
                    access_list: Option<Vec<(H160, Vec<H256>)>>,
                ) -> Result<pallet_evm::CallInfo, sp_runtime::DispatchError> {
                    let config = if estimate {
                        let mut config = <Runtime as pallet_evm::Config>::config().clone();
                        config.estimate = true;
                        Some(config)
                    } else {
                        None
                    };

                    <Runtime as pallet_evm::Config>::Runner::call(
                        CrossAccountId::from_eth(from),
                        to,
                        data,
                        value,
                        gas_limit.low_u64(),
                        max_fee_per_gas,
                        max_priority_fee_per_gas,
                        nonce,
                        access_list.unwrap_or_default(),
                        config.as_ref().unwrap_or_else(|| <Runtime as pallet_evm::Config>::config()),
                    ).map_err(|err| err.into())
                }

                #[allow(clippy::redundant_closure)]
                fn create(
                    from: H160,
                    data: Vec<u8>,
                    value: U256,
                    gas_limit: U256,
                    max_fee_per_gas: Option<U256>,
                    max_priority_fee_per_gas: Option<U256>,
                    nonce: Option<U256>,
                    estimate: bool,
                    access_list: Option<Vec<(H160, Vec<H256>)>>,
                ) -> Result<pallet_evm::CreateInfo, sp_runtime::DispatchError> {
                    let config = if estimate {
                        let mut config = <Runtime as pallet_evm::Config>::config().clone();
                        config.estimate = true;
                        Some(config)
                    } else {
                        None
                    };

                    <Runtime as pallet_evm::Config>::Runner::create(
                        CrossAccountId::from_eth(from),
                        data,
                        value,
                        gas_limit.low_u64(),
                        max_fee_per_gas,
                        max_priority_fee_per_gas,
                        nonce,
                        access_list.unwrap_or_default(),
                        config.as_ref().unwrap_or_else(|| <Runtime as pallet_evm::Config>::config()),
                    ).map_err(|err| err.into())
                }

                fn current_transaction_statuses() -> Option<Vec<TransactionStatus>> {
                    Ethereum::current_transaction_statuses()
                }

                fn current_block() -> Option<pallet_ethereum::Block> {
                    Ethereum::current_block()
                }

                fn current_receipts() -> Option<Vec<pallet_ethereum::Receipt>> {
                    Ethereum::current_receipts()
                }

                fn current_all() -> (
                    Option<pallet_ethereum::Block>,
                    Option<Vec<pallet_ethereum::Receipt>>,
                    Option<Vec<TransactionStatus>>
                ) {
                    (
                        Ethereum::current_block(),
                        Ethereum::current_receipts(),
                        Ethereum::current_transaction_statuses()
                    )
                }

                fn extrinsic_filter(xts: Vec<<Block as sp_api::BlockT>::Extrinsic>) -> Vec<pallet_ethereum::Transaction> {
                    xts.into_iter().filter_map(|xt| match xt.0.function {
                        Call::Ethereum(pallet_ethereum::Call::transact { transaction }) => Some(transaction),
                        _ => None
                    }).collect()
                }

                fn elasticity() -> Option<Permill> {
                    None
                }
            }

            impl sp_session::SessionKeys<Block> for Runtime {
                fn decode_session_keys(
                    encoded: Vec<u8>,
                ) -> Option<Vec<(Vec<u8>, KeyTypeId)>> {
                    SessionKeys::decode_into_raw_public_keys(&encoded)
                }

                fn generate_session_keys(seed: Option<Vec<u8>>) -> Vec<u8> {
                    SessionKeys::generate(seed)
                }
            }

            impl sp_consensus_aura::AuraApi<Block, AuraId> for Runtime {
                fn slot_duration() -> sp_consensus_aura::SlotDuration {
                    sp_consensus_aura::SlotDuration::from_millis(Aura::slot_duration())
                }

                fn authorities() -> Vec<AuraId> {
                    Aura::authorities().to_vec()
                }
            }

            impl cumulus_primitives_core::CollectCollationInfo<Block> for Runtime {
                fn collect_collation_info(header: &<Block as BlockT>::Header) -> cumulus_primitives_core::CollationInfo {
                    ParachainSystem::collect_collation_info(header)
                }
            }

            impl frame_system_rpc_runtime_api::AccountNonceApi<Block, AccountId, Index> for Runtime {
                fn account_nonce(account: AccountId) -> Index {
                    System::account_nonce(account)
                }
            }

            impl pallet_transaction_payment_rpc_runtime_api::TransactionPaymentApi<Block, Balance> for Runtime {
                fn query_info(uxt: <Block as BlockT>::Extrinsic, len: u32) -> RuntimeDispatchInfo<Balance> {
                    TransactionPayment::query_info(uxt, len)
                }
                fn query_fee_details(uxt: <Block as BlockT>::Extrinsic, len: u32) -> FeeDetails<Balance> {
                    TransactionPayment::query_fee_details(uxt, len)
                }
            }

            /*
            impl pallet_contracts_rpc_runtime_api::ContractsApi<Block, AccountId, Balance, BlockNumber, Hash>
                for Runtime
            {
                fn call(
                    origin: AccountId,
                    dest: AccountId,
                    value: Balance,
                    gas_limit: u64,
                    input_data: Vec<u8>,
                ) -> pallet_contracts_primitives::ContractExecResult {
                    Contracts::bare_call(origin, dest, value, gas_limit, input_data, false)
                }

                fn instantiate(
                    origin: AccountId,
                    endowment: Balance,
                    gas_limit: u64,
                    code: pallet_contracts_primitives::Code<Hash>,
                    data: Vec<u8>,
                    salt: Vec<u8>,
                ) -> pallet_contracts_primitives::ContractInstantiateResult<AccountId, BlockNumber>
                {
                    Contracts::bare_instantiate(origin, endowment, gas_limit, code, data, salt, true, false)
                }

                fn get_storage(
                    address: AccountId,
                    key: [u8; 32],
                ) -> pallet_contracts_primitives::GetStorageResult {
                    Contracts::get_storage(address, key)
                }

                fn rent_projection(
                    address: AccountId,
                ) -> pallet_contracts_primitives::RentProjectionResult<BlockNumber> {
                    Contracts::rent_projection(address)
                }
            }
            */

            #[cfg(feature = "runtime-benchmarks")]
            impl frame_benchmarking::Benchmark<Block> for Runtime {
                fn benchmark_metadata(extra: bool) -> (
                    Vec<frame_benchmarking::BenchmarkList>,
                    Vec<frame_support::traits::StorageInfo>,
                ) {
                    use frame_benchmarking::{list_benchmark, Benchmarking, BenchmarkList};
                    use frame_support::traits::StorageInfoTrait;

                    let mut list = Vec::<BenchmarkList>::new();

                    list_benchmark!(list, extra, pallet_evm_migration, EvmMigration);
                    list_benchmark!(list, extra, pallet_unique, Unique);
                    list_benchmark!(list, extra, pallet_inflation, Inflation);
                    list_benchmark!(list, extra, pallet_fungible, Fungible);
                    list_benchmark!(list, extra, pallet_refungible, Refungible);
                    list_benchmark!(list, extra, pallet_nonfungible, Nonfungible);
                    // list_benchmark!(list, extra, pallet_evm_coder_substrate, EvmCoderSubstrate);

                    let storage_info = AllPalletsReversedWithSystemFirst::storage_info();

                    return (list, storage_info)
                }

                fn dispatch_benchmark(
                    config: frame_benchmarking::BenchmarkConfig
                ) -> Result<Vec<frame_benchmarking::BenchmarkBatch>, sp_runtime::RuntimeString> {
                    use frame_benchmarking::{Benchmarking, BenchmarkBatch, add_benchmark, TrackedStorageKey};

                    let allowlist: Vec<TrackedStorageKey> = vec![
                        // Block Number
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef702a5c1b19ab7a04f536c519aca4983ac").to_vec().into(),
                        // Total Issuance
                        hex_literal::hex!("c2261276cc9d1f8598ea4b6a74b15c2f57c875e4cff74148e4628f264b974c80").to_vec().into(),
                        // Execution Phase
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef7ff553b5a9862a516939d82b3d3d8661a").to_vec().into(),
                        // Event Count
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef70a98fdbe9ce6c55837576c60c7af3850").to_vec().into(),
                        // System Events
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7").to_vec().into(),
                    ];

                    let mut batches = Vec::<BenchmarkBatch>::new();
                    let params = (&config, &allowlist);

                    add_benchmark!(params, batches, pallet_evm_migration, EvmMigration);
                    add_benchmark!(params, batches, pallet_unique, Unique);
                    add_benchmark!(params, batches, pallet_inflation, Inflation);
                    add_benchmark!(params, batches, pallet_fungible, Fungible);
                    add_benchmark!(params, batches, pallet_refungible, Refungible);
                    add_benchmark!(params, batches, pallet_nonfungible, Nonfungible);
                    // add_benchmark!(params, batches, pallet_evm_coder_substrate, EvmCoderSubstrate);

                    if batches.is_empty() { return Err("Benchmark not found for this pallet.".into()) }
                    Ok(batches)
                }
            }
        }
    }
}
