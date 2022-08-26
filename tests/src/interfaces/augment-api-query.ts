// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/storage';

import type { ApiTypes, AugmentedQuery, QueryableStorageEntry } from '@polkadot/api-base/types';
import type { BTreeMap, Bytes, Option, U256, U8aFixed, Vec, bool, u128, u16, u32, u64 } from '@polkadot/types-codec';
import type { AnyNumber, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, H160, H256 } from '@polkadot/types/interfaces/runtime';
import type { CumulusPalletDmpQueueConfigData, CumulusPalletDmpQueuePageIndexData, CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot, CumulusPalletXcmpQueueInboundChannelDetails, CumulusPalletXcmpQueueOutboundChannelDetails, CumulusPalletXcmpQueueQueueConfigData, EthereumBlock, EthereumLog, EthereumReceiptReceiptV3, EthereumTransactionTransactionV2, FpRpcTransactionStatus, FrameSupportWeightsPerDispatchClassU64, FrameSystemAccountInfo, FrameSystemEventRecord, FrameSystemLastRuntimeUpgradeInfo, FrameSystemPhase, OrmlVestingVestingSchedule, PalletBalancesAccountData, PalletBalancesBalanceLock, PalletBalancesReleases, PalletBalancesReserveData, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmContractHelpersSponsoringModeT, PalletNonfungibleItemData, PalletRefungibleItemData, PalletTransactionPaymentReleases, PalletTreasuryProposal, PalletUniqueSchedulerScheduledV3, PhantomTypeUpDataStructs, PolkadotCorePrimitivesOutboundHrmpMessage, PolkadotPrimitivesV2AbridgedHostConfiguration, PolkadotPrimitivesV2PersistedValidationData, PolkadotPrimitivesV2UpgradeRestriction, SpRuntimeDigest, SpTrieStorageProof, UpDataStructsCollection, UpDataStructsCollectionStats, UpDataStructsProperties, UpDataStructsPropertiesMapPropertyPermission, UpDataStructsPropertyPermission, UpDataStructsPropertyScope, UpDataStructsSponsorshipStateBasicCrossAccountIdRepr, UpDataStructsTokenChild } from '@polkadot/types/lookup';
import type { Observable } from '@polkadot/types/types';

export type __AugmentedQuery<ApiType extends ApiTypes> = AugmentedQuery<ApiType, () => unknown>;
export type __QueryableStorageEntry<ApiType extends ApiTypes> = QueryableStorageEntry<ApiType>;

declare module '@polkadot/api-base/types/storage' {
  interface AugmentedQueries<ApiType extends ApiTypes> {
    balances: {
      /**
       * The Balances pallet example of storing the balance of an account.
       * 
       * # Example
       * 
       * ```nocompile
       * impl pallet_balances::Config for Runtime {
       * type AccountStore = StorageMapShim<Self::Account<Runtime>, frame_system::Provider<Runtime>, AccountId, Self::AccountData<Balance>>
       * }
       * ```
       * 
       * You can also store the balance of an account in the `System` pallet.
       * 
       * # Example
       * 
       * ```nocompile
       * impl pallet_balances::Config for Runtime {
       * type AccountStore = System
       * }
       * ```
       * 
       * But this comes with tradeoffs, storing account balances in the system pallet stores
       * `frame_system` data alongside the account data contrary to storing account balances in the
       * `Balances` pallet, which uses a `StorageMap` to store balances data only.
       * NOTE: This is only used in the case that this pallet is used to store balances.
       **/
      account: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<PalletBalancesAccountData>, [AccountId32]> & QueryableStorageEntry<ApiType, [AccountId32]>;
      /**
       * Any liquidity locks on some account balances.
       * NOTE: Should only be accessed when setting, changing and freeing a lock.
       **/
      locks: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Vec<PalletBalancesBalanceLock>>, [AccountId32]> & QueryableStorageEntry<ApiType, [AccountId32]>;
      /**
       * Named reserves on some account balances.
       **/
      reserves: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Vec<PalletBalancesReserveData>>, [AccountId32]> & QueryableStorageEntry<ApiType, [AccountId32]>;
      /**
       * Storage version of the pallet.
       * 
       * This is set to v2.0.0 for new networks.
       **/
      storageVersion: AugmentedQuery<ApiType, () => Observable<PalletBalancesReleases>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The total units issued in the system.
       **/
      totalIssuance: AugmentedQuery<ApiType, () => Observable<u128>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    charging: {
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    common: {
      /**
       * Storage of the amount of collection admins.
       **/
      adminAmount: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Allowlisted collection users.
       **/
      allowlist: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<bool>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Storage of collection info.
       **/
      collectionById: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<UpDataStructsCollection>>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Storage of collection properties.
       **/
      collectionProperties: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<UpDataStructsProperties>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Storage of token property permissions of a collection.
       **/
      collectionPropertyPermissions: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<BTreeMap<Bytes, UpDataStructsPropertyPermission>>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Storage of the count of created collections. Essentially contains the last collection ID.
       **/
      createdCollectionCount: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Storage of the count of deleted collections.
       **/
      destroyedCollectionCount: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Not used by code, exists only to provide some types to metadata.
       **/
      dummyStorageValue: AugmentedQuery<ApiType, () => Observable<Option<ITuple<[UpDataStructsCollectionStats, u32, u32, UpDataStructsTokenChild, PhantomTypeUpDataStructs]>>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * List of collection admins.
       **/
      isAdmin: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<bool>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    configuration: {
      minGasPriceOverride: AugmentedQuery<ApiType, () => Observable<u64>, []> & QueryableStorageEntry<ApiType, []>;
      weightToFeeCoefficientOverride: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    dmpQueue: {
      /**
       * The configuration.
       **/
      configuration: AugmentedQuery<ApiType, () => Observable<CumulusPalletDmpQueueConfigData>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The overweight messages.
       **/
      overweight: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<ITuple<[u32, Bytes]>>>, [u64]> & QueryableStorageEntry<ApiType, [u64]>;
      /**
       * The page index.
       **/
      pageIndex: AugmentedQuery<ApiType, () => Observable<CumulusPalletDmpQueuePageIndexData>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The queue pages.
       **/
      pages: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<ITuple<[u32, Bytes]>>>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    ethereum: {
      blockHash: AugmentedQuery<ApiType, (arg: U256 | AnyNumber | Uint8Array) => Observable<H256>, [U256]> & QueryableStorageEntry<ApiType, [U256]>;
      /**
       * The current Ethereum block.
       **/
      currentBlock: AugmentedQuery<ApiType, () => Observable<Option<EthereumBlock>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The current Ethereum receipts.
       **/
      currentReceipts: AugmentedQuery<ApiType, () => Observable<Option<Vec<EthereumReceiptReceiptV3>>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The current transaction statuses.
       **/
      currentTransactionStatuses: AugmentedQuery<ApiType, () => Observable<Option<Vec<FpRpcTransactionStatus>>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Injected transactions should have unique nonce, here we store current
       **/
      injectedNonce: AugmentedQuery<ApiType, () => Observable<U256>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Current building block's transactions and receipts.
       **/
      pending: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[EthereumTransactionTransactionV2, FpRpcTransactionStatus, EthereumReceiptReceiptV3]>>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    evm: {
      accountCodes: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<Bytes>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      accountStorages: AugmentedQuery<ApiType, (arg1: H160 | string | Uint8Array, arg2: H256 | string | Uint8Array) => Observable<H256>, [H160, H256]> & QueryableStorageEntry<ApiType, [H160, H256]>;
      /**
       * Written on log, reset after transaction
       * Should be empty between transactions
       **/
      currentLogs: AugmentedQuery<ApiType, () => Observable<Vec<EthereumLog>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    evmCoderSubstrate: {
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    evmContractHelpers: {
      /**
       * Storage for users that allowed for sponsorship.
       * 
       * ### Usage
       * Prefer to delete record from storage if user no more allowed for sponsorship.
       * 
       * * **Key1** - contract address.
       * * **Key2** - user that allowed for sponsorship.
       * * **Value** - allowance for sponsorship.
       **/
      allowlist: AugmentedQuery<ApiType, (arg1: H160 | string | Uint8Array, arg2: H160 | string | Uint8Array) => Observable<bool>, [H160, H160]> & QueryableStorageEntry<ApiType, [H160, H160]>;
      /**
       * Storege for contracts with [`Allowlisted`](SponsoringModeT::Allowlisted) sponsoring mode.
       * 
       * ### Usage
       * Prefer to delete collection from storage if mode chaged to non `Allowlisted`, than set **Value** to **false**.
       * 
       * * **Key** - contract address.
       * * **Value** - is contract in [`Allowlisted`](SponsoringModeT::Allowlisted) mode.
       **/
      allowlistEnabled: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<bool>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      /**
       * Store owner for contract.
       * 
       * * **Key** - contract address.
       * * **Value** - owner for contract.
       **/
      owner: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<H160>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      selfSponsoring: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<bool>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      /**
       * Storage for last sponsored block.
       * 
       * * **Key1** - contract address.
       * * **Key2** - sponsored user address.
       * * **Value** - last sponsored block number.
       **/
      sponsorBasket: AugmentedQuery<ApiType, (arg1: H160 | string | Uint8Array, arg2: H160 | string | Uint8Array) => Observable<Option<u32>>, [H160, H160]> & QueryableStorageEntry<ApiType, [H160, H160]>;
      /**
       * Store for contract sponsorship state.
       * 
       * * **Key** - contract address.
       * * **Value** - sponsorship state.
       **/
      sponsoring: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<UpDataStructsSponsorshipStateBasicCrossAccountIdRepr>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      /**
       * Store for sponsoring mode.
       * 
       * ### Usage
       * Prefer to delete collection from storage if mode chaged to [`Disabled`](SponsoringModeT::Disabled).
       * 
       * * **Key** - contract address.
       * * **Value** - [`sponsoring mode`](SponsoringModeT).
       **/
      sponsoringMode: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<Option<PalletEvmContractHelpersSponsoringModeT>>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      /**
       * Storage for sponsoring rate limit in blocks.
       * 
       * * **Key** - contract address.
       * * **Value** - amount of sponsored blocks.
       **/
      sponsoringRateLimit: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<u32>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    evmMigration: {
      migrationPending: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<bool>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    fungible: {
      /**
       * Storage for assets delegated to a limited extent to other users.
       **/
      allowance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg3: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Amount of tokens owned by an account inside a collection.
       **/
      balance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Total amount of fungible tokens inside a collection.
       **/
      totalSupply: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u128>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    inflation: {
      /**
       * Current inflation for `InflationBlockInterval` number of blocks
       **/
      blockInflation: AugmentedQuery<ApiType, () => Observable<u128>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Next target (relay) block when inflation will be applied
       **/
      nextInflationBlock: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Next target (relay) block when inflation is recalculated
       **/
      nextRecalculationBlock: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Relay block when inflation has started
       **/
      startBlock: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * starting year total issuance
       **/
      startingYearTotalIssuance: AugmentedQuery<ApiType, () => Observable<u128>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    nonfungible: {
      /**
       * Amount of tokens owned by an account in a collection.
       **/
      accountBalance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u32>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Allowance set by a token owner for another user to perform one of certain transactions on a token.
       **/
      allowance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletEvmAccountBasicCrossAccountIdRepr>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Used to enumerate tokens owned by account.
       **/
      owned: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg3: u32 | AnyNumber | Uint8Array) => Observable<bool>, [u32, PalletEvmAccountBasicCrossAccountIdRepr, u32]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr, u32]>;
      /**
       * Custom data of a token that is serialized to bytes,
       * primarily reserved for on-chain operations,
       * normally obscured from the external users.
       * 
       * Auxiliary properties are slightly different from
       * usual [`TokenProperties`] due to an unlimited number
       * and separately stored and written-to key-value pairs.
       * 
       * Currently used to store RMRK data.
       **/
      tokenAuxProperties: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: UpDataStructsPropertyScope | 'None' | 'Rmrk' | 'Eth' | number | Uint8Array, arg4: Bytes | string | Uint8Array) => Observable<Option<Bytes>>, [u32, u32, UpDataStructsPropertyScope, Bytes]> & QueryableStorageEntry<ApiType, [u32, u32, UpDataStructsPropertyScope, Bytes]>;
      /**
       * Used to enumerate token's children.
       **/
      tokenChildren: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: ITuple<[u32, u32]> | [u32 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array]) => Observable<bool>, [u32, u32, ITuple<[u32, u32]>]> & QueryableStorageEntry<ApiType, [u32, u32, ITuple<[u32, u32]>]>;
      /**
       * Token data, used to partially describe a token.
       **/
      tokenData: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletNonfungibleItemData>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Map of key-value pairs, describing the metadata of a token.
       **/
      tokenProperties: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<UpDataStructsProperties>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Amount of burnt tokens in a collection.
       **/
      tokensBurnt: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Total amount of minted tokens in a collection.
       **/
      tokensMinted: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    parachainInfo: {
      parachainId: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    parachainSystem: {
      /**
       * The number of HRMP messages we observed in `on_initialize` and thus used that number for
       * announcing the weight of `on_initialize` and `on_finalize`.
       **/
      announcedHrmpMessagesPerCandidate: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The next authorized upgrade, if there is one.
       **/
      authorizedUpgrade: AugmentedQuery<ApiType, () => Observable<Option<H256>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * A custom head data that should be returned as result of `validate_block`.
       * 
       * See [`Pallet::set_custom_validation_head_data`] for more information.
       **/
      customValidationHeadData: AugmentedQuery<ApiType, () => Observable<Option<Bytes>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Were the validation data set to notify the relay chain?
       **/
      didSetValidationCode: AugmentedQuery<ApiType, () => Observable<bool>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The parachain host configuration that was obtained from the relay parent.
       * 
       * This field is meant to be updated each block with the validation data inherent. Therefore,
       * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
       * 
       * This data is also absent from the genesis.
       **/
      hostConfiguration: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV2AbridgedHostConfiguration>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * HRMP messages that were sent in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      hrmpOutboundMessages: AugmentedQuery<ApiType, () => Observable<Vec<PolkadotCorePrimitivesOutboundHrmpMessage>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * HRMP watermark that was set in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      hrmpWatermark: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The last downward message queue chain head we have observed.
       * 
       * This value is loaded before and saved after processing inbound downward messages carried
       * by the system inherent.
       **/
      lastDmqMqcHead: AugmentedQuery<ApiType, () => Observable<H256>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The message queue chain heads we have observed per each channel incoming channel.
       * 
       * This value is loaded before and saved after processing inbound downward messages carried
       * by the system inherent.
       **/
      lastHrmpMqcHeads: AugmentedQuery<ApiType, () => Observable<BTreeMap<u32, H256>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The relay chain block number associated with the last parachain block.
       **/
      lastRelayChainBlockNumber: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Validation code that is set by the parachain and is to be communicated to collator and
       * consequently the relay-chain.
       * 
       * This will be cleared in `on_initialize` of each new block if no other pallet already set
       * the value.
       **/
      newValidationCode: AugmentedQuery<ApiType, () => Observable<Option<Bytes>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Upward messages that are still pending and not yet send to the relay chain.
       **/
      pendingUpwardMessages: AugmentedQuery<ApiType, () => Observable<Vec<Bytes>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * In case of a scheduled upgrade, this storage field contains the validation code to be applied.
       * 
       * As soon as the relay chain gives us the go-ahead signal, we will overwrite the [`:code`][well_known_keys::CODE]
       * which will result the next block process with the new validation code. This concludes the upgrade process.
       * 
       * [well_known_keys::CODE]: sp_core::storage::well_known_keys::CODE
       **/
      pendingValidationCode: AugmentedQuery<ApiType, () => Observable<Bytes>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Number of downward messages processed in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      processedDownwardMessages: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The state proof for the last relay parent block.
       * 
       * This field is meant to be updated each block with the validation data inherent. Therefore,
       * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
       * 
       * This data is also absent from the genesis.
       **/
      relayStateProof: AugmentedQuery<ApiType, () => Observable<Option<SpTrieStorageProof>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The snapshot of some state related to messaging relevant to the current parachain as per
       * the relay parent.
       * 
       * This field is meant to be updated each block with the validation data inherent. Therefore,
       * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
       * 
       * This data is also absent from the genesis.
       **/
      relevantMessagingState: AugmentedQuery<ApiType, () => Observable<Option<CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The weight we reserve at the beginning of the block for processing DMP messages. This
       * overrides the amount set in the Config trait.
       **/
      reservedDmpWeightOverride: AugmentedQuery<ApiType, () => Observable<Option<u64>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The weight we reserve at the beginning of the block for processing XCMP messages. This
       * overrides the amount set in the Config trait.
       **/
      reservedXcmpWeightOverride: AugmentedQuery<ApiType, () => Observable<Option<u64>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * An option which indicates if the relay-chain restricts signalling a validation code upgrade.
       * In other words, if this is `Some` and [`NewValidationCode`] is `Some` then the produced
       * candidate will be invalid.
       * 
       * This storage item is a mirror of the corresponding value for the current parachain from the
       * relay-chain. This value is ephemeral which means it doesn't hit the storage. This value is
       * set after the inherent.
       **/
      upgradeRestrictionSignal: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV2UpgradeRestriction>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Upward messages that were sent in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      upwardMessages: AugmentedQuery<ApiType, () => Observable<Vec<Bytes>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The [`PersistedValidationData`] set for this block.
       * This value is expected to be set only once per block and it's never stored
       * in the trie.
       **/
      validationData: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV2PersistedValidationData>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    promotion: {
      admin: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Next target block when interest is recalculated
       **/
      nextInterestBlock: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Amount of tokens pending unstake per user per block.
       **/
      pendingUnstake: AugmentedQuery<ApiType, (arg1: AccountId32 | string | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<u128>, [AccountId32, u32]> & QueryableStorageEntry<ApiType, [AccountId32, u32]>;
      /**
       * Amount of tokens staked by account in the blocknumber.
       **/
      staked: AugmentedQuery<ApiType, (arg1: AccountId32 | string | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<u128>, [AccountId32, u32]> & QueryableStorageEntry<ApiType, [AccountId32, u32]>;
      /**
       * A block when app-promotion has started
       **/
      startBlock: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      totalStaked: AugmentedQuery<ApiType, () => Observable<u128>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    randomnessCollectiveFlip: {
      /**
       * Series of block headers from the last 81 blocks that acts as random seed material. This
       * is arranged as a ring buffer with `block_number % 81` being the index into the `Vec` of
       * the oldest hash.
       **/
      randomMaterial: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    refungible: {
      /**
       * Amount of tokens (not pieces) partially owned by an account within a collection.
       **/
      accountBalance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u32>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Allowance set by a token owner for another user to perform one of certain transactions on a number of pieces of a token.
       **/
      allowance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg4: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Amount of token pieces owned by account.
       **/
      balance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Used to enumerate tokens owned by account.
       **/
      owned: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg3: u32 | AnyNumber | Uint8Array) => Observable<bool>, [u32, PalletEvmAccountBasicCrossAccountIdRepr, u32]> & QueryableStorageEntry<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr, u32]>;
      /**
       * Token data, used to partially describe a token.
       **/
      tokenData: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<PalletRefungibleItemData>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Amount of pieces a refungible token is split into.
       **/
      tokenProperties: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<UpDataStructsProperties>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Amount of tokens burnt in a collection.
       **/
      tokensBurnt: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Total amount of minted tokens in a collection.
       **/
      tokensMinted: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Total amount of pieces for token
       **/
      totalSupply: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<u128>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    rmrkCore: {
      /**
       * Latest yet-unused collection ID.
       **/
      collectionIndex: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Mapping from RMRK collection ID to Unique's.
       **/
      uniqueCollectionId: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    rmrkEquip: {
      /**
       * Checkmark that a Base has a Theme NFT named "default".
       **/
      baseHasDefaultTheme: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<bool>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Map of a Base ID and a Part ID to an NFT in the Base collection serving as the Part.
       **/
      inernalPartId: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    scheduler: {
      /**
       * Items to be executed, indexed by the block number that they should be executed on.
       **/
      agenda: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<Option<PalletUniqueSchedulerScheduledV3>>>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Lookup from identity to the block number and index of the task.
       **/
      lookup: AugmentedQuery<ApiType, (arg: U8aFixed | string | Uint8Array) => Observable<Option<ITuple<[u32, u32]>>>, [U8aFixed]> & QueryableStorageEntry<ApiType, [U8aFixed]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    structure: {
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    sudo: {
      /**
       * The `AccountId` of the sudo key.
       **/
      key: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    system: {
      /**
       * The full account information for a particular account ID.
       **/
      account: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<FrameSystemAccountInfo>, [AccountId32]> & QueryableStorageEntry<ApiType, [AccountId32]>;
      /**
       * Total length (in bytes) for all extrinsics put together, for the current block.
       **/
      allExtrinsicsLen: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Map of block numbers to block hashes.
       **/
      blockHash: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<H256>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * The current weight for the block.
       **/
      blockWeight: AugmentedQuery<ApiType, () => Observable<FrameSupportWeightsPerDispatchClassU64>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Digest of the current block, also part of the block header.
       **/
      digest: AugmentedQuery<ApiType, () => Observable<SpRuntimeDigest>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The number of events in the `Events<T>` list.
       **/
      eventCount: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Events deposited for the current block.
       * 
       * NOTE: The item is unbound and should therefore never be read on chain.
       * It could otherwise inflate the PoV size of a block.
       * 
       * Events have a large in-memory size. Box the events to not go out-of-memory
       * just in case someone still reads them from within the runtime.
       **/
      events: AugmentedQuery<ApiType, () => Observable<Vec<FrameSystemEventRecord>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Mapping between a topic (represented by T::Hash) and a vector of indexes
       * of events in the `<Events<T>>` list.
       * 
       * All topic vectors have deterministic storage locations depending on the topic. This
       * allows light-clients to leverage the changes trie storage tracking mechanism and
       * in case of changes fetch the list of events of interest.
       * 
       * The value has the type `(T::BlockNumber, EventIndex)` because if we used only just
       * the `EventIndex` then in case if the topic has the same contents on the next block
       * no notification will be triggered thus the event might be lost.
       **/
      eventTopics: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Vec<ITuple<[u32, u32]>>>, [H256]> & QueryableStorageEntry<ApiType, [H256]>;
      /**
       * The execution phase of the block.
       **/
      executionPhase: AugmentedQuery<ApiType, () => Observable<Option<FrameSystemPhase>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Total extrinsics count for the current block.
       **/
      extrinsicCount: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Extrinsics data for the current block (maps an extrinsic's index to its data).
       **/
      extrinsicData: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Bytes>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Stores the `spec_version` and `spec_name` of when the last runtime upgrade happened.
       **/
      lastRuntimeUpgrade: AugmentedQuery<ApiType, () => Observable<Option<FrameSystemLastRuntimeUpgradeInfo>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The current block number being processed. Set by `execute_block`.
       **/
      number: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Hash of the previous block.
       **/
      parentHash: AugmentedQuery<ApiType, () => Observable<H256>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * True if we have upgraded so that AccountInfo contains three types of `RefCount`. False
       * (default) if not.
       **/
      upgradedToTripleRefCount: AugmentedQuery<ApiType, () => Observable<bool>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * True if we have upgraded so that `type RefCount` is `u32`. False (default) if not.
       **/
      upgradedToU32RefCount: AugmentedQuery<ApiType, () => Observable<bool>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    timestamp: {
      /**
       * Did the timestamp get updated in this block?
       **/
      didUpdate: AugmentedQuery<ApiType, () => Observable<bool>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Current time for the current block.
       **/
      now: AugmentedQuery<ApiType, () => Observable<u64>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    transactionPayment: {
      nextFeeMultiplier: AugmentedQuery<ApiType, () => Observable<u128>, []> & QueryableStorageEntry<ApiType, []>;
      storageVersion: AugmentedQuery<ApiType, () => Observable<PalletTransactionPaymentReleases>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    treasury: {
      /**
       * Proposal indices that have been approved but not yet awarded.
       **/
      approvals: AugmentedQuery<ApiType, () => Observable<Vec<u32>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Number of proposals that have been made.
       **/
      proposalCount: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Proposals that have been made.
       **/
      proposals: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletTreasuryProposal>>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    unique: {
      /**
       * Used for migrations
       **/
      chainVersion: AugmentedQuery<ApiType, () => Observable<u64>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * (Collection id (controlled?2), who created (real))
       * TODO: Off chain worker should remove from this map when collection gets removed
       **/
      createItemBasket: AugmentedQuery<ApiType, (arg: ITuple<[u32, AccountId32]> | [u32 | AnyNumber | Uint8Array, AccountId32 | string | Uint8Array]) => Observable<Option<u32>>, [ITuple<[u32, AccountId32]>]> & QueryableStorageEntry<ApiType, [ITuple<[u32, AccountId32]>]>;
      /**
       * Last sponsoring of fungible tokens approval in a collection
       **/
      fungibleApproveBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, AccountId32]>;
      /**
       * Collection id (controlled?2), owning user (real)
       **/
      fungibleTransferBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, AccountId32]>;
      /**
       * Last sponsoring of NFT approval in a collection
       **/
      nftApproveBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Collection id (controlled?2), token id (controlled?2)
       **/
      nftTransferBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Last sponsoring of RFT approval in a collection
       **/
      refungibleApproveBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, u32, AccountId32]>;
      /**
       * Collection id (controlled?2), token id (controlled?2)
       **/
      reFungibleTransferBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, u32, AccountId32]>;
      /**
       * Last sponsoring of token property setting // todo:doc rephrase this and the following
       **/
      tokenPropertyBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Variable metadata sponsoring
       * Collection id (controlled?2), token id (controlled?2)
       **/
      variableMetaDataBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    vesting: {
      /**
       * Vesting schedules of an account.
       * 
       * VestingSchedules: map AccountId => Vec<VestingSchedule>
       **/
      vestingSchedules: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Vec<OrmlVestingVestingSchedule>>, [AccountId32]> & QueryableStorageEntry<ApiType, [AccountId32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
    xcmpQueue: {
      /**
       * Inbound aggregate XCMP messages. It can only be one per ParaId/block.
       **/
      inboundXcmpMessages: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Bytes>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Status of the inbound XCMP channels.
       **/
      inboundXcmpStatus: AugmentedQuery<ApiType, () => Observable<Vec<CumulusPalletXcmpQueueInboundChannelDetails>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The messages outbound in a given XCMP channel.
       **/
      outboundXcmpMessages: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u16 | AnyNumber | Uint8Array) => Observable<Bytes>, [u32, u16]> & QueryableStorageEntry<ApiType, [u32, u16]>;
      /**
       * The non-empty XCMP channels in order of becoming non-empty, and the index of the first
       * and last outbound message. If the two indices are equal, then it indicates an empty
       * queue and there must be a non-`Ok` `OutboundStatus`. We assume queues grow no greater
       * than 65535 items. Queue indices for normal messages begin at one; zero is reserved in
       * case of the need to send a high-priority signal message this block.
       * The bool is true if there is a signal message waiting to be sent.
       **/
      outboundXcmpStatus: AugmentedQuery<ApiType, () => Observable<Vec<CumulusPalletXcmpQueueOutboundChannelDetails>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The messages that exceeded max individual message weight budget.
       * 
       * These message stay in this storage map until they are manually dispatched via
       * `service_overweight`.
       **/
      overweight: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<ITuple<[u32, u32, Bytes]>>>, [u64]> & QueryableStorageEntry<ApiType, [u64]>;
      /**
       * The number of overweight messages ever recorded in `Overweight`. Also doubles as the next
       * available free overweight index.
       **/
      overweightCount: AugmentedQuery<ApiType, () => Observable<u64>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * The configuration which controls the dynamics of the outbound queue.
       **/
      queueConfig: AugmentedQuery<ApiType, () => Observable<CumulusPalletXcmpQueueQueueConfigData>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Whether or not the XCMP queue is suspended from executing incoming XCMs or not.
       **/
      queueSuspended: AugmentedQuery<ApiType, () => Observable<bool>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Any signal messages waiting to be sent.
       **/
      signalMessages: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Bytes>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Generic query
       **/
      [key: string]: QueryableStorageEntry<ApiType>;
    };
  } // AugmentedQueries
} // declare module
