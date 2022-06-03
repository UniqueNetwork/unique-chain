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
                    Ok(RmrkCore::last_collection_idx())
                }

                fn collection_by_id(collection_id: RmrkCollectionId) -> Result<Option<RmrkCollectionInfo<AccountId>>, DispatchError> {
                    use pallet_proxy_rmrk_core::{RmrkProperty, misc::CollectionType};
                    use pallet_common::CommonCollectionOperations;

                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(None)
                    };

                    let collection = match RmrkCore::get_typed_nft_collection(collection_id, CollectionType::Regular) {
                        Ok(c) => c,
                        Err(_) => return Ok(None),
                    };

                    let nfts_count = collection.total_supply();

                    Ok(Some(RmrkCollectionInfo {
                        issuer: collection.owner.clone(),
                        metadata: RmrkCore::get_collection_property_decoded(collection_id, RmrkProperty::Metadata)?,
                        max: collection.limits.token_limit,
                        symbol: RmrkCore::rebind(&collection.token_prefix)?,
                        nfts_count
                    }))
                }

                fn nft_by_id(collection_id: RmrkCollectionId, nft_by_id: RmrkNftId) -> Result<Option<RmrkInstanceInfo<AccountId>>, DispatchError> {
                    use up_data_structs::mapping::TokenAddressMapping;
                    use pallet_proxy_rmrk_core::{RmrkProperty, misc::CollectionType};
                    use pallet_common::CommonCollectionOperations;

                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(None)
                    };
                    let collection = match RmrkCore::get_typed_nft_collection(collection_id, CollectionType::Regular) {
                        Ok(c) => c,
                        Err(_) => return Ok(None),
                    };

                    let nft_id = TokenId(nft_by_id);
                    if !RmrkCore::nft_exists(collection_id, nft_id) { return Ok(None); }

                    let owner = match collection.token_owner(nft_id) {
                        Some(owner) => match <Runtime as pallet_common::Config>::CrossTokenAddressMapping::address_to_token(&owner) {
                            Some((col, tok)) => {
                                let rmrk_collection = RmrkCore::rmrk_collection_id(col)?;

                                RmrkAccountIdOrCollectionNftTuple::CollectionAndNftTuple(rmrk_collection, tok.0)
                            }
                            None => RmrkAccountIdOrCollectionNftTuple::AccountId(owner.as_sub().clone())
                        },
                        None => return Ok(None)
                    };

                    let allowance = pallet_nonfungible::Allowance::<Runtime>::get((collection_id, nft_id));

                    Ok(Some(RmrkInstanceInfo {
                        owner: owner,
                        royalty: RmrkCore::get_nft_property_decoded(collection_id, nft_id, RmrkProperty::RoyaltyInfo)?,
                        metadata: RmrkCore::get_nft_property_decoded(collection_id, nft_id, RmrkProperty::Metadata)?,
                        equipped: RmrkCore::get_nft_property_decoded(collection_id, nft_id, RmrkProperty::Equipped)?,
                        pending: allowance.is_some(),
                    }))
                }

                fn account_tokens(account_id: AccountId, collection_id: RmrkCollectionId) -> Result<Vec<RmrkNftId>, DispatchError> {
                    use pallet_proxy_rmrk_core::misc::CollectionType;
                    use pallet_common::CommonCollectionOperations;

                    let cross_account_id = CrossAccountId::from_sub(account_id);
                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Regular).is_err() { return Ok(Vec::new()); }

                    Ok(
                        collection.account_tokens(cross_account_id)
                            .into_iter()
                            .map(|token| token.0)
                            .collect()
                    )
                }

                fn nft_children(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Result<Vec<RmrkNftChild>, DispatchError> {
                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    let nft_id = TokenId(nft_id);
                    if !RmrkCore::nft_exists(collection_id, nft_id) { return Ok(Vec::new()); }

                    Ok(
                        pallet_nonfungible::TokenChildren::<Runtime>::iter_prefix((collection_id, nft_id))
                            .filter_map(|((child_collection, child_token), _)| {
                                let rmrk_child_collection = RmrkCore::rmrk_collection_id(
                                    child_collection
                                ).ok()?;

                                Some(RmrkNftChild {
                                    collection_id: rmrk_child_collection,
                                    nft_id: child_token.0,
                                })
                            }).collect()
                    )
                }

                fn collection_properties(collection_id: RmrkCollectionId, filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
                    use pallet_proxy_rmrk_core::misc::CollectionType;

                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Regular).is_err() {
                        return Ok(Vec::new());
                    }

                    let properties = RmrkCore::filter_user_properties(
                        collection_id,
                        /* token_id = */ None,
                        filter_keys,
                        |key, value| RmrkPropertyInfo {
                            key,
                            value
                        }
                    )?;

                    Ok(properties)
                }

                fn nft_properties(collection_id: RmrkCollectionId, nft_id: RmrkNftId, filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
                    use pallet_proxy_rmrk_core::misc::NftType;

                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    let token_id = TokenId(nft_id);

                    if RmrkCore::ensure_nft_type(collection_id, token_id, NftType::Regular).is_err() {
                        return Ok(Vec::new());
                    }

		            let properties = RmrkCore::filter_user_properties(
                        collection_id,
                        Some(token_id),
                        filter_keys,
                        |key, value| RmrkPropertyInfo {
                            key,
                            value
                        }
                    )?;

                    Ok(properties)
                }

                fn nft_resources(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Result<Vec<RmrkResourceInfo>, DispatchError> {
                    use pallet_proxy_rmrk_core::{RmrkProperty, misc::{CollectionType, NftType, ResourceType}};
                    use pallet_common::CommonCollectionOperations;

                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Regular).is_err() { return Ok(Vec::new()); }

                    let nft_id = TokenId(nft_id);
                    if RmrkCore::ensure_nft_type(collection_id, nft_id, NftType::Regular).is_err() { return Ok(Vec::new()); }

                    let res_collection_id: CollectionId = RmrkCore::get_nft_property_decoded(collection_id, nft_id, RmrkProperty::ResourceCollection)?;
                    let resource_collection = RmrkCore::get_typed_nft_collection(res_collection_id, CollectionType::Resource)?;

                    let resources = resource_collection
                        .collection_tokens()
                        .iter()
                        .filter_map(|(res_id)| Some(RmrkResourceInfo {
                            id: res_id.0,
                            pending: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::PendingResourceAccept).unwrap(),
                            pending_removal: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::PendingResourceRemoval).unwrap(),
                            resource: match RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::ResourceType).unwrap() {
                                ResourceType::Basic => RmrkResourceTypes::Basic(RmrkBasicResource {
                                    src: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Src).unwrap(),
                                    metadata: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Metadata).unwrap(),
                                    license: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::License).unwrap(),
                                    thumb: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Thumb).unwrap(),
                                }),
                                ResourceType::Composable => RmrkResourceTypes::Composable(RmrkComposableResource {
                                    parts: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Parts).unwrap(),
                                    base: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Base).unwrap(),
                                    src: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Src).unwrap(),
                                    metadata: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Metadata).unwrap(),
                                    license: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::License).unwrap(),
                                    thumb: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Thumb).unwrap(),
                                }),
                                ResourceType::Slot => RmrkResourceTypes::Slot(RmrkSlotResource {
                                    base: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Base).unwrap(),
                                    src: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Src).unwrap(),
                                    metadata: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Metadata).unwrap(),
                                    slot: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Slot).unwrap(),
                                    license: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::License).unwrap(),
                                    thumb: RmrkCore::get_nft_property_decoded(res_collection_id, *res_id, RmrkProperty::Thumb).unwrap(),
                                }),
                            },
                        }))
                        .collect();

                    Ok(resources)
                }

                fn nft_resource_priorities(collection_id: RmrkCollectionId, nft_id: RmrkNftId) -> Result<Vec<RmrkResourceId>, DispatchError> {
                    use pallet_proxy_rmrk_core::{RmrkProperty, misc::{CollectionType, NftType}};

                    let collection_id = match RmrkCore::unique_collection_id(collection_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Regular).is_err() { return Ok(Vec::new()); }

                    let nft_id = TokenId(nft_id);
                    if RmrkCore::ensure_nft_type(collection_id, nft_id, NftType::Regular).is_err() { return Ok(Vec::new()); }

                    /*let resource_collection_id: CollectionId = RmrkCore::get_nft_property_decoded(collection_id, nft_id, RmrkProperty::ResourceCollection)
                        .unwrap();
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Resource).is_err() { return Ok(Vec::new()); }

                    let resources = pallet_nonfungible::TokenProperties::<Runtime>::iter_prefix((resource_collection_id,))
                        .filter_map(|(resource_id, properties)| Some((
                            resource_id, // ResourceId property
                            RmrkCore::get_nft_property_decoded(resource_collection_id, resource_id, RmrkProperty::Priority).unwrap(),
                        )))
                        .collect()
                        .sort_by_key(|(_, index)| *index)
                        .into_iter().map(|(resource_id, _)| resource_id)*/
                    let priorities = RmrkCore::get_nft_property_decoded(collection_id, nft_id, RmrkProperty::ResourcePriorities)?;

                    Ok(priorities)
                }

                fn base(base_id: RmrkBaseId) -> Result<Option<RmrkBaseInfo<AccountId>>, DispatchError> {
                    use pallet_proxy_rmrk_core::{
                        RmrkProperty, misc::{CollectionType},
                    };

                    let collection_id = match RmrkCore::unique_collection_id(base_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(None)
                    };
                    let collection = match RmrkCore::get_typed_nft_collection(collection_id, CollectionType::Base) {
                        Ok(c) => c,
                        Err(_) => return Ok(None),
                    };

                    Ok(Some(RmrkBaseInfo {
                        issuer: collection.owner.clone(),
                        base_type: RmrkCore::get_collection_property_decoded(collection_id, RmrkProperty::BaseType)?,
                        symbol: RmrkCore::rebind(&collection.token_prefix)?,
                    }))
                }

                fn base_parts(base_id: RmrkBaseId) -> Result<Vec<RmrkPartType>, DispatchError> {
                    use pallet_proxy_rmrk_core::{RmrkProperty, misc::{CollectionType, NftType}};
                    use pallet_common::CommonCollectionOperations;

                    let collection_id = match RmrkCore::unique_collection_id(base_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Base).is_err() { return Ok(Vec::new()); }

                    let parts = collection.collection_tokens()
                        .into_iter()
                        .filter_map(|token_id| {
                            let nft_type = RmrkCore::get_nft_type(collection_id, token_id).ok()?;

                            match nft_type {
                                NftType::FixedPart => Some(RmrkPartType::FixedPart(RmrkFixedPart {
                                    id: RmrkCore::get_nft_property_decoded(collection_id, token_id, RmrkProperty::ExternalPartId).ok()?,
                                    src: RmrkCore::get_nft_property_decoded(collection_id, token_id, RmrkProperty::Src).ok()?,
                                    z: RmrkCore::get_nft_property_decoded(collection_id, token_id, RmrkProperty::ZIndex).ok()?,
                                })),
                                NftType::SlotPart => Some(RmrkPartType::SlotPart(RmrkSlotPart {
                                    id: RmrkCore::get_nft_property_decoded(collection_id, token_id, RmrkProperty::ExternalPartId).ok()?,
                                    src: RmrkCore::get_nft_property_decoded(collection_id, token_id, RmrkProperty::Src).ok()?,
                                    z: RmrkCore::get_nft_property_decoded(collection_id, token_id, RmrkProperty::ZIndex).ok()?,
                                    equippable: RmrkCore::get_nft_property_decoded(collection_id, token_id, RmrkProperty::EquippableList).ok()?,
                                })),
                                _ => None
                            }
                        })
                        .collect();

                    Ok(parts)
                }

                fn theme_names(base_id: RmrkBaseId) -> Result<Vec<RmrkThemeName>, DispatchError> {
                    use pallet_proxy_rmrk_core::{RmrkProperty, misc::CollectionType};
                    use pallet_common::CommonCollectionOperations;

                    let collection_id = match RmrkCore::unique_collection_id(base_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(Vec::new())
                    };
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Base).is_err() {
                        return Ok(Vec::new());
                    }


                    let theme_names = collection.collection_tokens()
                        .iter()
                        .filter_map(|token_id| {
                            let nft_type = RmrkCore::get_nft_type(collection_id, *token_id).unwrap();

                            match nft_type {
                                Theme => Some(
                                    RmrkCore::get_nft_property_decoded(collection_id, *token_id, RmrkProperty::ThemeName).unwrap()
                                ),
                                _ => None
                            }
                        })
                        .collect();

                    Ok(theme_names)
                }

                fn theme(base_id: RmrkBaseId, theme_name: RmrkThemeName, filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Option<RmrkTheme>, DispatchError> {
                    use pallet_proxy_rmrk_core::{
                        RmrkProperty,
                        misc::{CollectionType, NftType}
                    };
                    use pallet_common::CommonCollectionOperations;

                    let collection_id = match RmrkCore::unique_collection_id(base_id) {
                        Ok(id) => id,
                        Err(_) => return Ok(None)
                    };
                    if RmrkCore::ensure_collection_type(collection_id, CollectionType::Base).is_err() {
                        return Ok(None);
                    }

                    let theme_info = collection.collection_tokens()
                        .into_iter()
                        .find_map(|token_id| {
                            RmrkCore::ensure_nft_type(collection_id, token_id, NftType::Theme).ok()?;

                            let name: RmrkString = RmrkCore::get_nft_property_decoded(
                                collection_id, token_id, RmrkProperty::ThemeName
                            ).ok()?;

                            if name == theme_name {
                                Some((name, token_id))
                            } else {
                                None
                            }
                        });

                    let (name, theme_id) = match theme_info {
                        Some((name, theme_id)) => (name, theme_id),
                        None => return Ok(None)
                    };

                    let properties = RmrkCore::filter_user_properties(
                        collection_id,
                        Some(theme_id),
                        filter_keys,
                        |key, value| RmrkThemeProperty {
                            key,
                            value
                        }
                    )?;

                    let inherit = RmrkCore::get_nft_property_decoded(
                        collection_id,
                        theme_id,
                        RmrkProperty::ThemeInherit
                    )?;

                    let theme = RmrkTheme {
                        name,
                        properties,
                        inherit,
                    };

                    Ok(Some(theme))
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
