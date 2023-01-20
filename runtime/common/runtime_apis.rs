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

#[macro_export]
macro_rules! dispatch_unique_runtime {
	($collection:ident.$method:ident($($name:ident),*)) => {{
		let collection = <Runtime as pallet_common::Config>::CollectionDispatch::dispatch(<pallet_common::CollectionHandle<Runtime>>::try_get($collection)?);
		let dispatch = collection.as_dyn();

		Ok::<_, DispatchError>(dispatch.$method($($name),*))
	}};
}

#[macro_export]
macro_rules! impl_common_runtime_apis {
    (
        $(
            #![custom_apis]

            $($custom_apis:tt)+
        )?
    ) => {
        use sp_std::prelude::*;
        use sp_api::impl_runtime_apis;
        use sp_core::{crypto::KeyTypeId, OpaqueMetadata, H256, U256, H160, Bytes};
        use sp_runtime::{
            Permill,
            traits::Block as BlockT,
            transaction_validity::{TransactionSource, TransactionValidity},
            ApplyExtrinsicResult, DispatchError,
        };
        use fp_rpc::TransactionStatus;
        use pallet_transaction_payment::{
            FeeDetails, RuntimeDispatchInfo,
        };
        use pallet_evm::{
            Runner, account::CrossAccountId as _,
            Account as EVMAccount, FeeCalculator,
        };
        use runtime_common::{
            sponsoring::{SponsorshipPredict, UniqueSponsorshipPredict},
            dispatch::CollectionDispatch,
            config::ethereum::CrossAccountId,
        };
        use up_data_structs::*;


        impl_runtime_apis! {
            $($($custom_apis)+)?

            impl up_rpc::UniqueApi<Block, CrossAccountId, AccountId> for Runtime {
                fn account_tokens(collection: CollectionId, account: CrossAccountId) -> Result<Vec<TokenId>, DispatchError> {
                    dispatch_unique_runtime!(collection.account_tokens(account))
                }
                fn collection_tokens(collection: CollectionId) -> Result<Vec<TokenId>, DispatchError> {
                    dispatch_unique_runtime!(collection.collection_tokens())
                }
                fn token_exists(collection: CollectionId, token: TokenId) -> Result<bool, DispatchError> {
                    dispatch_unique_runtime!(collection.token_exists(token))
                }

                fn token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>, DispatchError> {
                    dispatch_unique_runtime!(collection.token_owner(token))
                }

                fn token_owners(collection: CollectionId, token: TokenId) -> Result<Vec::<CrossAccountId>, DispatchError>  {
                   dispatch_unique_runtime!(collection.token_owners(token))
                }

                fn topmost_token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>, DispatchError> {
                    let budget = up_data_structs::budget::Value::new(10);

                    Ok(Some(<pallet_structure::Pallet<Runtime>>::find_topmost_owner(collection, token, &budget)?))
                }
                fn token_children(collection: CollectionId, token: TokenId) -> Result<Vec<TokenChild>, DispatchError> {
                    Ok(<pallet_nonfungible::Pallet<Runtime>>::token_children_ids(collection, token))
                }
                fn collection_properties(
                    collection: CollectionId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<Vec<Property>, DispatchError> {
                    let keys = keys.map(
                        |keys| Common::bytes_keys_to_property_keys(keys)
                    ).transpose()?;

                    Common::filter_collection_properties(collection, keys)
                }

                fn token_properties(
                    collection: CollectionId,
                    token_id: TokenId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<Vec<Property>, DispatchError> {
                    let keys = keys.map(
                        |keys| Common::bytes_keys_to_property_keys(keys)
                    ).transpose()?;

                    dispatch_unique_runtime!(collection.token_properties(token_id, keys))
                }

                fn property_permissions(
                    collection: CollectionId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<Vec<PropertyKeyPermission>, DispatchError> {
                    let keys = keys.map(
                        |keys| Common::bytes_keys_to_property_keys(keys)
                    ).transpose()?;

                    Common::filter_property_permissions(collection, keys)
                }

                fn token_data(
                    collection: CollectionId,
                    token_id: TokenId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<TokenData<CrossAccountId>, DispatchError> {
                    let token_data = TokenData {
                        properties: Self::token_properties(collection, token_id, keys)?,
                        owner: Self::token_owner(collection, token_id)?,
                        pieces: Self::total_pieces(collection, token_id)?.unwrap_or(0),
                    };

                    Ok(token_data)
                }

                fn total_supply(collection: CollectionId) -> Result<u32, DispatchError> {
                    dispatch_unique_runtime!(collection.total_supply())
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
                fn collection_by_id(collection: CollectionId) -> Result<Option<RpcCollection<AccountId>>, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::rpc_collection(collection))
                }
                fn collection_stats() -> Result<CollectionStats, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::collection_stats())
                }
                fn next_sponsored(collection: CollectionId, account: CrossAccountId, token: TokenId) -> Result<Option<u64>, DispatchError> {
                    Ok(<UniqueSponsorshipPredict<Runtime> as SponsorshipPredict<Runtime>>::predict(
                        collection,
                        account,
                        token
                    ))
                }

                fn effective_collection_limits(collection: CollectionId) -> Result<Option<CollectionLimits>, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::effective_collection_limits(collection))
                }

                fn total_pieces(collection: CollectionId, token_id: TokenId) -> Result<Option<u128>, DispatchError> {
                    dispatch_unique_runtime!(collection.total_pieces(token_id))
                }

		        fn allowance_for_all(collection: CollectionId, owner: CrossAccountId, operator: CrossAccountId) -> Result<bool, DispatchError> {
                    dispatch_unique_runtime!(collection.allowance_for_all(owner, operator))
                }
            }

            impl app_promotion_rpc::AppPromotionApi<Block, BlockNumber, CrossAccountId, AccountId> for Runtime {
                #[allow(unused_variables)]
                fn total_staked(staker: Option<CrossAccountId>) -> Result<u128, DispatchError> {
                    #[cfg(not(feature = "app-promotion"))]
                    return unsupported!();

                    #[cfg(feature = "app-promotion")]
                    return Ok(<pallet_app_promotion::Pallet<Runtime>>::cross_id_total_staked(staker).unwrap_or_default());
                }

                #[allow(unused_variables)]
                fn total_staked_per_block(staker: CrossAccountId) -> Result<Vec<(BlockNumber, u128)>, DispatchError> {
                    #[cfg(not(feature = "app-promotion"))]
                    return unsupported!();

                    #[cfg(feature = "app-promotion")]
                    return Ok(<pallet_app_promotion::Pallet<Runtime>>::cross_id_total_staked_per_block(staker));
                }

                #[allow(unused_variables)]
                fn pending_unstake(staker: Option<CrossAccountId>) -> Result<u128, DispatchError> {
                    #[cfg(not(feature = "app-promotion"))]
                    return unsupported!();

                    #[cfg(feature = "app-promotion")]
                    return Ok(<pallet_app_promotion::Pallet<Runtime>>::cross_id_pending_unstake(staker));
                }

                #[allow(unused_variables)]
                fn pending_unstake_per_block(staker: CrossAccountId) -> Result<Vec<(BlockNumber, u128)>, DispatchError> {
                    #[cfg(not(feature = "app-promotion"))]
                    return unsupported!();

                    #[cfg(feature = "app-promotion")]
                    return Ok(<pallet_app_promotion::Pallet<Runtime>>::cross_id_pending_unstake_per_block(staker))
                }
            }

            impl rmrk_rpc::RmrkApi<
                Block,
                AccountId,
                RmrkCollectionInfo<AccountId>,
                RmrkInstanceInfo<AccountId>,
                RmrkResourceInfo,
                RmrkPropertyInfo,
                RmrkBaseInfo<AccountId>,
                RmrkPartType,
                RmrkTheme
            > for Runtime {
                fn last_collection_idx() -> Result<RmrkCollectionId, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::last_collection_idx::<Runtime>();

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn collection_by_id(collection_id: RmrkCollectionId) -> Result<Option<RmrkCollectionInfo<AccountId>>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::collection_by_id::<Runtime>(collection_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn nft_by_id(collection_id: RmrkCollectionId, nft_by_id: RmrkNftId) -> Result<Option<RmrkInstanceInfo<AccountId>>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::nft_by_id::<Runtime>(collection_id, nft_by_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn account_tokens(account_id: AccountId, collection_id: RmrkCollectionId) -> Result<Vec<RmrkNftId>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::account_tokens::<Runtime>(account_id, collection_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn nft_children(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Result<Vec<RmrkNftChild>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::nft_children::<Runtime>(collection_id, nft_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn collection_properties(
                    collection_id: RmrkCollectionId,
                    filter_keys: Option<Vec<RmrkPropertyKey>>
                ) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::collection_properties::<Runtime>(collection_id, filter_keys);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn nft_properties(
                    collection_id: RmrkCollectionId,
                    nft_id: RmrkNftId,
                    filter_keys: Option<Vec<RmrkPropertyKey>>
                ) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::nft_properties::<Runtime>(collection_id, nft_id, filter_keys);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn nft_resources(collection_id: RmrkCollectionId,nft_id: RmrkNftId) -> Result<Vec<RmrkResourceInfo>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::nft_resources::<Runtime>(collection_id, nft_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn nft_resource_priority(
                    collection_id: RmrkCollectionId,
                    nft_id: RmrkNftId,
                    resource_id: RmrkResourceId
                ) -> Result<Option<u32>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_core::rpc::nft_resource_priority::<Runtime>(collection_id, nft_id, resource_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn base(base_id: RmrkBaseId) -> Result<Option<RmrkBaseInfo<AccountId>>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_equip::rpc::base::<Runtime>(base_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn base_parts(base_id: RmrkBaseId) -> Result<Vec<RmrkPartType>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_equip::rpc::base_parts::<Runtime>(base_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn theme_names(base_id: RmrkBaseId) -> Result<Vec<RmrkThemeName>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_equip::rpc::theme_names::<Runtime>(base_id);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
                }

                #[allow(unused_variables)]
                fn theme(
                    base_id: RmrkBaseId,
                    theme_name: RmrkThemeName,
                    filter_keys: Option<Vec<RmrkPropertyKey>>
                ) -> Result<Option<RmrkTheme>, DispatchError> {
                    #[cfg(feature = "rmrk")]
                    return pallet_proxy_rmrk_equip::rpc::theme::<Runtime>(base_id, theme_name, filter_keys);

                    #[cfg(not(feature = "rmrk"))]
                    return unsupported!();
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
                    let (account, _) = EVM::account_basic(&address);
                    account
                }

                fn gas_price() -> U256 {
                    let (price, _) = <Runtime as pallet_evm::Config>::FeeCalculator::min_gas_price();
                    price
                }

                fn account_code_at(address: H160) -> Vec<u8> {
                    use pallet_evm::OnMethodCall;
                    <Runtime as pallet_evm::Config>::OnMethodCall::get_code(&address)
                        .unwrap_or_else(|| EVM::account_codes(address))
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

                    let is_transactional = false;
                    let validate = false;
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
                        is_transactional,
                        validate,
                        config.as_ref().unwrap_or_else(|| <Runtime as pallet_evm::Config>::config()),
                    ).map_err(|err| err.error.into())
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

                    let is_transactional = false;
                    let validate = false;
                    <Runtime as pallet_evm::Config>::Runner::create(
                        CrossAccountId::from_eth(from),
                        data,
                        value,
                        gas_limit.low_u64(),
                        max_fee_per_gas,
                        max_priority_fee_per_gas,
                        nonce,
                        access_list.unwrap_or_default(),
                        is_transactional,
                        validate,
                        config.as_ref().unwrap_or_else(|| <Runtime as pallet_evm::Config>::config()),
                    ).map_err(|err| err.error.into())
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
                        RuntimeCall::Ethereum(pallet_ethereum::Call::transact { transaction }) => Some(transaction),
                        _ => None
                    }).collect()
                }

                fn elasticity() -> Option<Permill> {
                    None
                }

                fn gas_limit_multiplier_support() {}
            }

            impl fp_rpc::ConvertTransactionRuntimeApi<Block> for Runtime {
                fn convert_transaction(transaction: pallet_ethereum::Transaction) -> <Block as BlockT>::Extrinsic  {
                    UncheckedExtrinsic::new_unsigned(
                        pallet_ethereum::Call::<Runtime>::transact { transaction }.into(),
                    )
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
                    list_benchmark!(list, extra, pallet_common, Common);
                    list_benchmark!(list, extra, pallet_unique, Unique);
                    list_benchmark!(list, extra, pallet_structure, Structure);
                    list_benchmark!(list, extra, pallet_inflation, Inflation);
                    list_benchmark!(list, extra, pallet_configuration, Configuration);

                    #[cfg(feature = "app-promotion")]
                    list_benchmark!(list, extra, pallet_app_promotion, AppPromotion);

                    list_benchmark!(list, extra, pallet_fungible, Fungible);
                    list_benchmark!(list, extra, pallet_nonfungible, Nonfungible);

                    #[cfg(feature = "refungible")]
                    list_benchmark!(list, extra, pallet_refungible, Refungible);

                    #[cfg(feature = "scheduler")]
                    list_benchmark!(list, extra, pallet_unique_scheduler_v2, Scheduler);

                    #[cfg(feature = "rmrk")]
                    list_benchmark!(list, extra, pallet_proxy_rmrk_core, RmrkCore);

                    #[cfg(feature = "rmrk")]
                    list_benchmark!(list, extra, pallet_proxy_rmrk_equip, RmrkEquip);

                    #[cfg(feature = "collator-selection")]
                    list_benchmark!(list, extra, pallet_collator_selection, CollatorSelection);

                    #[cfg(feature = "collator-selection")]
                    list_benchmark!(list, extra, pallet_identity, Identity);

                    #[cfg(feature = "foreign-assets")]
                    list_benchmark!(list, extra, pallet_foreign_assets, ForeignAssets);


                    // list_benchmark!(list, extra, pallet_evm_coder_substrate, EvmCoderSubstrate);

                    let storage_info = AllPalletsReversedWithSystemFirst::storage_info();

                    return (list, storage_info)
                }

                fn dispatch_benchmark(
                    config: frame_benchmarking::BenchmarkConfig
                ) -> Result<Vec<frame_benchmarking::BenchmarkBatch>, sp_runtime::RuntimeString> {
                    use frame_benchmarking::{Benchmarking, BenchmarkBatch, add_benchmark, TrackedStorageKey};

                    let allowlist: Vec<TrackedStorageKey> = vec![
                        // Total Issuance
                        hex_literal::hex!("c2261276cc9d1f8598ea4b6a74b15c2f57c875e4cff74148e4628f264b974c80").to_vec().into(),

                        // Block Number
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef702a5c1b19ab7a04f536c519aca4983ac").to_vec().into(),
                        // Execution Phase
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef7ff553b5a9862a516939d82b3d3d8661a").to_vec().into(),
                        // Event Count
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef70a98fdbe9ce6c55837576c60c7af3850").to_vec().into(),
                        // System Events
                        hex_literal::hex!("26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7").to_vec().into(),

                        // Evm CurrentLogs
                        hex_literal::hex!("1da53b775b270400e7e61ed5cbc5a146547f210cec367e9af919603343b9cb56").to_vec().into(),

                        // Transactional depth
                        hex_literal::hex!("3a7472616e73616374696f6e5f6c6576656c3a").to_vec().into(),
                    ];

                    let mut batches = Vec::<BenchmarkBatch>::new();
                    let params = (&config, &allowlist);

                    add_benchmark!(params, batches, pallet_evm_migration, EvmMigration);
                    add_benchmark!(params, batches, pallet_common, Common);
                    add_benchmark!(params, batches, pallet_unique, Unique);
                    add_benchmark!(params, batches, pallet_structure, Structure);
                    add_benchmark!(params, batches, pallet_inflation, Inflation);
                    add_benchmark!(params, batches, pallet_configuration, Configuration);

                    #[cfg(feature = "app-promotion")]
                    add_benchmark!(params, batches, pallet_app_promotion, AppPromotion);

                    add_benchmark!(params, batches, pallet_fungible, Fungible);
                    add_benchmark!(params, batches, pallet_nonfungible, Nonfungible);

                    #[cfg(feature = "refungible")]
                    add_benchmark!(params, batches, pallet_refungible, Refungible);

                    #[cfg(feature = "scheduler")]
                    add_benchmark!(params, batches, pallet_unique_scheduler_v2, Scheduler);

                    #[cfg(feature = "rmrk")]
                    add_benchmark!(params, batches, pallet_proxy_rmrk_core, RmrkCore);

                    #[cfg(feature = "rmrk")]
                    add_benchmark!(params, batches, pallet_proxy_rmrk_equip, RmrkEquip);

                    #[cfg(feature = "collator-selection")]
                    add_benchmark!(params, batches, pallet_collator_selection, CollatorSelection);

                    #[cfg(feature = "collator-selection")]
                    add_benchmark!(params, batches, pallet_identity, Identity);

                    #[cfg(feature = "foreign-assets")]
                    add_benchmark!(params, batches, pallet_foreign_assets, ForeignAssets);

                    // add_benchmark!(params, batches, pallet_evm_coder_substrate, EvmCoderSubstrate);

                    if batches.is_empty() { return Err("Benchmark not found for this pallet.".into()) }
                    Ok(batches)
                }
            }

            impl up_pov_estimate_rpc::PovEstimateApi<Block> for Runtime {
                #[allow(unused_variables)]
                fn pov_estimate(uxt: Bytes) -> ApplyExtrinsicResult {
                    #[cfg(feature = "pov-estimate")]
                    {
                        use codec::Decode;

                        let uxt_decode = <<Block as BlockT>::Extrinsic as Decode>::decode(&mut &*uxt)
                            .map_err(|_| DispatchError::Other("failed to decode the extrinsic"));

                        let uxt = match uxt_decode {
                            Ok(uxt) => uxt,
                            Err(err) => return Ok(err.into()),
                        };

                        Executive::apply_extrinsic(uxt)
                    }

                    #[cfg(not(feature = "pov-estimate"))]
                    return Ok(unsupported!());
                }
            }

            #[cfg(feature = "try-runtime")]
            impl frame_try_runtime::TryRuntime<Block> for Runtime {
                fn on_runtime_upgrade(checks: bool) -> (frame_support::pallet_prelude::Weight, frame_support::pallet_prelude::Weight) {
                    log::info!("try-runtime::on_runtime_upgrade unique-chain.");
                    let weight = Executive::try_runtime_upgrade(checks).unwrap();
                    (weight, crate::config::substrate::RuntimeBlockWeights::get().max_block)
                }

                fn execute_block(
                    block: Block,
                    state_root_check: bool,
                    signature_check: bool,
                    select: frame_try_runtime::TryStateSelect
                ) -> frame_support::pallet_prelude::Weight {
                    log::info!(
                        target: "node-runtime",
                        "try-runtime: executing block {:?} / root checks: {:?} / try-state-select: {:?}",
                        block.header.hash(),
                        state_root_check,
                        select,
                    );

                    Executive::try_execute_block(block, state_root_check, signature_check, select).unwrap()
                }
            }
        }
    }
}
