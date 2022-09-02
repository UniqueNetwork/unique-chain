1. Create, in the `primitives` folder, a crate with a trait for RPC generation.
    ```rust
    sp_api::decl_runtime_apis! {
        #[api_version(2)]
        pub trait ModuleNameApi<CrossAccountId> 
        where
            CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
        {
            fn method_name(user: Option<CrossAccountId>) -> Result<u128, DispatchError>;
        }
    }
    ```

2. client/rpc/src/lib.rs
    * Add a trait with the required methods. Mark it with `#[rpc(server)]` and `#[async_trait]` directives.
        ```rust
        #[rpc(server)]
        #[async_trait]
        pub trait ModuleNameApi<BlockHash, CrossAccountId> {
            #[method(name = "moduleName_methodName")]
            fn method_name(&self, user: Option<CrossAccountId>, at: Option<BlockHash>)
                -> Result<String>;
        }
        ```
    * Don't forget to write the correct method identifier in the form `moduleName_methodName`.
    * Add a structure for which the server API interface will be implemented.
        ```rust
        define_struct_for_server_api!(ModuleName);
        ```
    * Define a macro to be used in the implementation of the server API interface.
        ```rust
        macro_rules! module_api {
            () => {
                dyn ModuleNameRuntimeApi<BlockHash, CrossAccountId>
            };
        }
        ```
    * Implement a server API interface.
        ```rust
        impl<C, Block, CrossAccountId> 
        ModuleNameApiServer<<Block as BlockT>::Hash, CrossAccountId> for ModuleName<C, Block>
        where
            Block: BlockT,
            C: 'static + ProvideRuntimeApi<Block> + HeaderBackend<Block>,
            C::Api: AppPromotionRuntimeApi<Block, BlockNumber, CrossAccountId, AccountId>,
            CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
        {
            pass_method!(method_name(user: Option<CrossAccountId>) -> String => |v| v.to_string(), app_promotion_api);
        }
        ```

3. runtime/common/runtime_apis.rs
    * Implement the `ModuleNameApi` interface for `Runtime`. Optionally, you can mark a feature flag to disable the functionality.
        ```rust
        impl MethodApi<Block, BlockNumber, CrossAccountId, AccountId> for Runtime {
                fn method_name(user: Option<CrossAccountId>) -> Result<u128, DispatchError> {
                    #[cfg(not(feature = "module"))]
                    return unsupported!();

                    #[cfg(feature = "module")]
                    return Ok(0);
                }
            }
        ```

4. node/cli/src/service.rs
    * Set the `MethodApi<Block, Runtime::CrossAccountId>` bound in the `start_node_impl`, `start_node`, `start_dev_node` methods.

5. node/rpc/src/lib.rs
    * Add `MethodApi<Block, Runtime::CrossAccountId>` bound to `create_full` method.
    * Enable RPC in the `create_full` method by adding `io.merge(ModuleName::new(client.clone()).into_rpc())?;`

6. Add a new crate (see point 1) into dependencies.
    * client/rpc/Cargo.toml
    * node/rpc/Cargo.toml
    * runtime/opal/Cargo.toml
    * runtime/quartz/Cargo.toml
    * runtime/unique/Cargo.toml

7. Create tests/src/interfaces/ModuleName/definitions.ts and describe the necessary methods in it.
    ```ts
    type RpcParam = {
        name: string;
        type: string;
        isOptional?: true;
        };

        const CROSS_ACCOUNT_ID_TYPE = 'PalletEvmAccountBasicCrossAccountIdRepr';

        const fun = (description: string, params: RpcParam[], type: string) => ({
        description,
        params: [...params, atParam],
        type,
        });

        export default {
            types: {},
            rpc: {
                methodName: fun(
                'Documentation for method',
                [{name: 'user', type: CROSS_ACCOUNT_ID_TYPE, isOptional: true}],
                'u128',
                ),
            },
        };
    ```

8. Describe definitions from paragraph 7 in tests/src/interfaces/definitions.ts.
    ```ts
    export {default as ModuleName} from './module/definitions';
    ```

9. tests/src/substrate/substrate-api.ts
    * Set the RPC interface in the `defaultApiOptions` function, add an entry in the `rpc` parameter
        ```ts
        module: defs.module.rpc,
        ```

10. tests/src/util/playgrounds/unique.dev.ts
    * Specify RPC interface in `connect` function, add entry in `rpc` parameter
        ```ts
        module: defs.module.rpc,
        ```