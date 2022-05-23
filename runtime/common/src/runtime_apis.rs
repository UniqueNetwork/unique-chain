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
                fn collection_tokens(collection: CollectionId) -> Result<Vec<TokenId>, DispatchError> {
                    dispatch_unique_runtime!(collection.collection_tokens())
                }
                fn token_exists(collection: CollectionId, token: TokenId) -> Result<bool, DispatchError> {
                    dispatch_unique_runtime!(collection.token_exists(token))
                }

                fn token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>, DispatchError> {
                    dispatch_unique_runtime!(collection.token_owner(token))
                }
                fn topmost_token_owner(collection: CollectionId, token: TokenId) -> Result<Option<CrossAccountId>, DispatchError> {
                    let budget = up_data_structs::budget::Value::new(5);

                    Ok(Some(<pallet_structure::Pallet<Runtime>>::find_topmost_owner(collection, token, &budget)?))
                }
                fn const_metadata(collection: CollectionId, token: TokenId) -> Result<Vec<u8>, DispatchError> {
                    dispatch_unique_runtime!(collection.const_metadata(token))
                }

                fn collection_properties(
                    collection: CollectionId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<Vec<Property>, DispatchError> {
                    let keys = keys.map(
                        |keys| pallet_common::Pallet::<Runtime>::bytes_keys_to_property_keys(keys)
                    ).transpose()?;

                    pallet_common::Pallet::<Runtime>::filter_collection_properties(collection, keys)
                }

                fn token_properties(
                    collection: CollectionId,
                    token_id: TokenId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<Vec<Property>, DispatchError> {
                    let keys = keys.map(
                        |keys| pallet_common::Pallet::<Runtime>::bytes_keys_to_property_keys(keys)
                    ).transpose()?;

                    dispatch_unique_runtime!(collection.token_properties(token_id, keys))
                }

                fn property_permissions(
                    collection: CollectionId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<Vec<PropertyKeyPermission>, DispatchError> {
                    let keys = keys.map(
                        |keys| pallet_common::Pallet::<Runtime>::bytes_keys_to_property_keys(keys)
                    ).transpose()?;

                    pallet_common::Pallet::<Runtime>::filter_property_permissions(collection, keys)
                }

                fn token_data(
                    collection: CollectionId,
                    token_id: TokenId,
                    keys: Option<Vec<Vec<u8>>>
                ) -> Result<TokenData<CrossAccountId>, DispatchError> {
                    let token_data = TokenData {
                        const_data: Self::const_metadata(collection, token_id)?,
                        properties: Self::token_properties(collection, token_id, keys)?,
                        owner: Self::token_owner(collection, token_id)?
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
                    Ok(<$crate::sponsoring::UniqueSponsorshipPredict<Runtime> as
                            $crate::sponsoring::SponsorshipPredict<Runtime>>::predict(
                        collection,
                        account,
                        token))
                }

                fn effective_collection_limits(collection: CollectionId) -> Result<Option<CollectionLimits>, DispatchError> {
                    Ok(<pallet_common::Pallet<Runtime>>::effective_collection_limits(collection))
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
                    Ok(<pallet_common::CreatedCollectionCount<Runtime>>::get().0) // todo storage from proxy pallet
                }
                fn collection_by_id(collection_id: RmrkCollectionId) -> Result<Option<RmrkCollectionInfo<AccountId>>, DispatchError> {
                    // TODO decide on displacement to palettes -- does RMRK belong there, spread across common and nonfungible?
                    use frame_support::BoundedVec;
                    use scale_info::prelude::string::String;
                    use pallet_proxy_rmrk_core::RmrkProperty;

                    // todo check if this is a rmrk collection? or simply trust and provide anyway?
                    // client-is-always-right / enforce authority and order ?

                    let collection_id = CollectionId(collection_id);
                    let collection = <pallet_proxy_rmrk_core::Pallet<Runtime>>::get_nft_collection(collection_id)?;
                    // todo Vec::from(["rmrk:metadata", "rmrk:collection-type"])
                    let metadata = BoundedVec::try_from(
                        <pallet_proxy_rmrk_core::Pallet<Runtime>>::get_collection_property(collection_id, RmrkProperty::Metadata)?.into_inner()
                    ).map_err(|_| <pallet_common::Error<Runtime>>::PropertyKeyIsTooLong)?;//unwrap_or_default();
                    let nfts_count = (dispatch_unique_runtime!(collection_id.total_supply()) as Result<u32, DispatchError>)?; // todo? <Runtime>::total_supply(collection_id)

                    Ok(Some(RmrkCollectionInfo {
                        issuer: collection.owner.clone(),
                        metadata,
                        max: collection.limits.token_limit,
                        symbol: BoundedVec::try_from(
                            collection.token_prefix.clone().into_inner()
                        ).map_err(|_| <pallet_common::Error<Runtime>>::PropertyKeyIsTooLong)?,
                        nfts_count
                    }))
                }
                fn nft_by_id(collection_id: RmrkCollectionId, nft_by_id: RmrkNftId) -> Result<Option<RmrkInstanceInfo<AccountId>>, DispatchError> {
                    use frame_support::BoundedVec;
                    use up_data_structs::mapping::TokenAddressMapping;
                    use pallet_proxy_rmrk_core::RmrkProperty;

                    let collection_id = CollectionId(collection_id);
                    let nft_id = TokenId(nft_by_id);

                    let owner = match (dispatch_unique_runtime!(collection_id.token_owner(nft_id)) as Result<Option<CrossAccountId>, DispatchError>)? {
                        Some(owner) => match <Runtime as pallet_common::Config>::CrossTokenAddressMapping::address_to_token(&owner) {
                            Some((col, tok)) => RmrkAccountIdOrCollectionNftTuple::CollectionAndNftTuple(col.0, tok.0),
                            None => RmrkAccountIdOrCollectionNftTuple::AccountId(owner.as_sub().clone())
                        },
                        None => return Ok(None)
                    };

                    let keys = [
                        RmrkProperty::RoyaltyInfo,
                        RmrkProperty::Metadata,
                        RmrkProperty::Equipped,
                        // ?? "rmrk:recipient", "rmrk:nft-type", "rmrk:resource-collection", "rmrk:resource-priorities"
                    ];

                    let properties = keys.into_iter().map(
                        |key| BoundedVec::try_from(
                            // todo nft property, not collection
                            <pallet_proxy_rmrk_core::Pallet<Runtime>>::get_nft_property(collection_id, nft_id, key).unwrap().into_inner()
                        ).unwrap()
                    )
                    .collect::<Vec<RmrkString>>();

                    Ok(Some(RmrkInstanceInfo {
                        owner: owner,
                        //recipient: , // prop?
                        royalty: None,//Permill::from_percent(0), // prop, decode
                        metadata: properties[1].clone(),
                        equipped: false, // prop, decode
                        pending: false, // prop, decode
                    }))
                }
                fn account_tokens(account_id: AccountId, collection_id: RmrkCollectionId) -> Result<Vec<RmrkNftId>, DispatchError> {
                    let cross_account_id = CrossAccountId::from_sub(account_id);
                    let collection_id = CollectionId(collection_id);
                    Ok(
                        (dispatch_unique_runtime!(collection_id.account_tokens(cross_account_id)) as Result<Vec<TokenId>, DispatchError>)?
                        //<Runtime as up_rpc::UniqueApi<Block, CrossAccountId, AccountId>>::account_tokens(collection_id, cross_account_id)?
                            .into_iter()
                            .map(|token| token.0)
                            .collect::<Vec<_>>()
                    )
                }
                fn nft_children(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Result<Vec<RmrkNftChild>, DispatchError> {
                    use up_data_structs::mapping::TokenAddressMapping;

                    let collection_id = CollectionId(collection_id);
                    let nft_id = TokenId(nft_id);
                    let cross_account_id = CrossAccountId::from_eth(
                        EvmTokenAddressMapping::token_to_address(collection_id, nft_id)
                    );

                    Ok(
                        pallet_nonfungible::Owned::<Runtime>::iter_prefix((collection_id, cross_account_id))
                            .map(|(child_id, _)| RmrkNftChild {
                                collection_id: collection_id.0, // todo make sure they're always from this collection
                                nft_id: child_id.0,
                            })
                            .collect()
                    )
                }
                fn collection_properties(collection_id: RmrkCollectionId, filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
                    use frame_support::BoundedVec;

                    let collection_id = CollectionId(collection_id);
                    let properties = pallet_common::Pallet::<Runtime>::collection_properties(collection_id);

                    return Ok(match filter_keys {
                        Some(keys) => {
                            let keys = pallet_common::Pallet::<Runtime>::bytes_keys_to_property_keys(keys)?;
                            let properties = keys
                                .into_iter()
                                .filter_map(|key| {
                                    properties.get(&key).map(|value| RmrkPropertyInfo {
                                        key: BoundedVec::try_from(key.into_inner()).unwrap(),
                                        value: BoundedVec::try_from(value.clone().into_inner()).unwrap(),
                                    })
                                })
                                .collect();

                            properties
                        }
                        None => {
                            properties
                                .iter()
                                .filter_map(|(key, value)| Some(RmrkPropertyInfo {
                                    key: BoundedVec::try_from(key.clone().into_inner()).unwrap(),
                                    value: BoundedVec::try_from(value.clone().into_inner()).unwrap(),
                                }))
                                .collect()
                        }
                    });
                }
                fn nft_properties(collection_id: RmrkCollectionId, nft_id: RmrkNftId, filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
                    use frame_support::BoundedVec;

                    let collection_id = CollectionId(collection_id);
                    let token_id = TokenId(nft_id);

		            let properties = pallet_nonfungible::Pallet::<Runtime>::token_properties((collection_id, token_id)); // todo look into usage of pallet_nonfungible

                    // todo displace to a function? redundant code piece with collection props
                    return Ok(match filter_keys {
                        Some(keys) => {
                            let keys = pallet_common::Pallet::<Runtime>::bytes_keys_to_property_keys(keys)?;
                            let properties = keys
                                .into_iter()
                                .filter_map(|key| {
                                    properties.get(&key).map(|value| RmrkPropertyInfo {
                                        key: BoundedVec::try_from(key.into_inner()).unwrap(),
                                        value: BoundedVec::try_from(value.clone().into_inner()).unwrap(),
                                    })
                                })
                                .collect();

                            properties
                        }
                        None => {
                            properties
                                .iter()
                                .filter_map(|(key, value)| Some(RmrkPropertyInfo {
                                    key: BoundedVec::try_from(key.clone().into_inner()).unwrap(),
                                    value: BoundedVec::try_from(value.clone().into_inner()).unwrap(),
                                }))
                                .collect()
                        }
                    });
                }
                fn nft_resources(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Result<Vec<RmrkResourceInfo>, DispatchError> {
                    use frame_support::BoundedVec;
                    use pallet_proxy_rmrk_core::RmrkProperty;

                    let collection_id = CollectionId(collection_id);
                    let nft_id = TokenId(nft_id);

                    // let keys = [
                    //     RmrkProperty::Royalty,
                    //     RmrkProperty::Metadata,
                    //     RmrkProperty::Equipped,
                    //     RmrkProperty::Pending,
                    //     // ?? "rmrk:recipient", "rmrk:nft-type", "rmrk:resource-collection", "rmrk:resource-priorities"
                    // ];

                    /*let resources = keys.into_iter().map(
                        |key| BoundedVec::try_from(
                            <pallet_proxy_rmrk_core::Pallet<Runtime>>::get_nft_property(collection_id, nft_id, key).unwrap().into_inner()
                        ).unwrap()
                    )
                    .collect::<Vec<RmrkString>>();*/

                    Ok(Vec::new(/*[RmrkResourceInfo {

                    }]*/))
                }
                fn nft_resource_priorities(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Result<Vec<RmrkResourceId>, DispatchError> {
                    todo!()
                }
                fn base(base_id: RmrkBaseId) -> Result<Option<RmrkBaseInfo<AccountId>>, DispatchError> {
                    use frame_support::BoundedVec;
                    use scale_info::prelude::string::String;
                    use pallet_proxy_rmrk_core::RmrkProperty;

                    let collection_id = CollectionId(base_id);
                    let collection = <pallet_proxy_rmrk_core::Pallet<Runtime>>::get_nft_collection(collection_id)?;

                    // todo export to macro? redundancy
                    let keys = [
                        RmrkProperty::BaseType,
                    ];

                    let properties = keys.into_iter().map(
                        |key| BoundedVec::try_from(
                            <pallet_proxy_rmrk_core::Pallet<Runtime>>::get_collection_property(collection_id, key).unwrap().into_inner()
                        )
                    )
                    // todo not-a-rmrk-collection error
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|_| <pallet_proxy_rmrk_core::Error<Runtime>>::CollectionUnknown)?;

                    Ok(Some(RmrkBaseInfo {
                        issuer: collection.owner.clone(),
                        base_type: properties[0].clone(),
                        symbol: BoundedVec::try_from(
                            collection.token_prefix.clone().into_inner()
                        ).map_err(|_| <pallet_common::Error<Runtime>>::PropertyKeyIsTooLong)?,
                    }))
                }
                fn base_parts(base_id: RmrkBaseId) -> Result<Vec<RmrkPartType>, DispatchError> {
                    use frame_support::BoundedVec;
                    use pallet_proxy_rmrk_core::RmrkProperty;

                    let collection_id = CollectionId(base_id);

                    let keys = [
                        //RmrkProperty::NftType)?,
                        //RmrkProperty::PartId)?,
                        RmrkProperty::Src,
                        RmrkProperty::ZIndex,
                        RmrkProperty::EquippableList,
                    ];

                    let parts = (dispatch_unique_runtime!(collection_id.collection_tokens()) as Result<Vec<TokenId>, DispatchError>)?
                        .iter()
                        .filter_map(|token_id| {
                            /*let properties = keys.into_iter().map(
                                |key| BoundedVec::try_from(
                                    <pallet_proxy_rmrk_core::Pallet<Runtime>>::get_nft_property(collection_id, *token_id, key).unwrap().into_inner()
                                ).unwrap()
                            ).collect::<Vec<RmrkString>>();*/

                            // todo ping properties for "rmrk:nft-type"
                            // if none, skip, None
                            let nft_type = "fixed-part";

                            match nft_type {
                                "fixed-part" => Some(RmrkPartType::FixedPart(RmrkFixedPart {
                                    id: token_id.0,
                                    src: BoundedVec::default(), // "rmrk:src"
                                    z: 0, // "rmrk:z-index"
                                })),
                                "slot-part" => Some(RmrkPartType::SlotPart(RmrkSlotPart {
                                    id: token_id.0,
                                    equippable: RmrkEquippableList::Empty, // "rmrk:equippable-list" ?
                                    src: BoundedVec::default(), // "rmrk:src"
                                    z: 0, // "rmrk:z-index"
                                })),
                                _ => None
                            }

                        })
                        .collect();

                    Ok(parts)
                }
                fn theme_names(base_id: RmrkBaseId) -> Result<Vec<RmrkThemeName>, DispatchError> {
                    use frame_support::BoundedVec;

                    let collection_id = CollectionId(base_id);

                    let theme_names = (dispatch_unique_runtime!(collection_id.collection_tokens()) as Result<Vec<TokenId>, DispatchError>)?
                        .iter()
                        .filter_map(|token_id| {
                            let properties = pallet_nonfungible::Pallet::<Runtime>::token_properties((collection_id, token_id));

                            // todo ping property for "rmrk:nft-type"
                            // if none or not "theme", skip, None
                            let nft_type = "theme";
                            // can't call dispatch_unique_runtime! from here??
                            <pallet_nonfungible::TokenData<Runtime>>::get((collection_id, token_id))
                                .map(|t| t.const_data.into_inner())
                                //.unwrap_or_default()
                            // todo rework to reduce independence
                        })
                        .collect();

                    Ok(theme_names)
                }
                fn theme(base_id: RmrkBaseId, theme_name: RmrkThemeName, filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Option<RmrkTheme>, DispatchError> {
                    use frame_support::BoundedVec;

                    let collection_id = CollectionId(base_id);

                    // todo one theme. filter collection tokens according to theme name, should result in one
                    // (is it possible to search with iter_prefix for part of a struct that satisfies?..)
                    // filter properties according to filter_keys and load them into resulting theme.properties
                    let themes = (dispatch_unique_runtime!(collection_id.collection_tokens()) as Result<Vec<TokenId>, DispatchError>)?
                        .iter()
                        .filter_map(|token_id| {
                            let properties = pallet_nonfungible::Pallet::<Runtime>::token_properties((collection_id, token_id));

                            // todo ping properties for "rmrk:nft-type"
                            // if none, skip, None
                            // ugh gonna go through ALL properties, searching for matches for "rmrk:theme-property-<key>"
                            let nft_type = "theme";
                            match nft_type {
                                "theme" => Some(RmrkTheme {
                                    name: BoundedVec::try_from(
                                        <pallet_nonfungible::TokenData<Runtime>>::get((collection_id, token_id))
                                            .map(|t| t.const_data)
                                            .unwrap_or_default()
                                            .into_inner()
                                    ).unwrap(),
                                    // todo? (dispatch_unique_runtime!(collection_id.const_metadata(token_id)) as Result<Vec<u8>, DispatchError>)?,
                                    properties: Vec::new(), // pain in the ass
                                    inherit: false, // "rmrk:theme-inherit"
                                }),
                                _ => None
                            }
                        })
                        .collect::<Vec<_>>();

                    // todo
                    Ok(Some(themes[0].clone()))
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

                    let is_transactional = false;
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

                    let is_transactional = false;
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
                    add_benchmark!(params, batches, pallet_fungible, Fungible);
                    add_benchmark!(params, batches, pallet_refungible, Refungible);
                    add_benchmark!(params, batches, pallet_nonfungible, Nonfungible);
                    // add_benchmark!(params, batches, pallet_evm_coder_substrate, EvmCoderSubstrate);

                    if batches.is_empty() { return Err("Benchmark not found for this pallet.".into()) }
                    Ok(batches)
                }
            }

            #[cfg(feature = "try-runtime")]
            impl frame_try_runtime::TryRuntime<Block> for Runtime {
                fn on_runtime_upgrade() -> (Weight, Weight) {
                    log::info!("try-runtime::on_runtime_upgrade unique-chain.");
                    let weight = Executive::try_runtime_upgrade().unwrap();
                    (weight, RuntimeBlockWeights::get().max_block)
                }

                fn execute_block_no_check(block: Block) -> Weight {
                    Executive::execute_block_no_check(block)
                }
            }
        }
    }
}
