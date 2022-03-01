// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

import type { ApiTypes } from '@polkadot/api-base/types';
import type { BTreeMap, Bytes, Option, U256, Vec, bool, u128, u16, u32, u64 } from '@polkadot/types-codec';
import type { AnyNumber, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, H160, H256 } from '@polkadot/types/interfaces/runtime';
import type { CumulusPalletDmpQueueConfigData, CumulusPalletDmpQueuePageIndexData, CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot, CumulusPalletXcmpQueueInboundChannelDetails, CumulusPalletXcmpQueueOutboundChannelDetails, CumulusPalletXcmpQueueQueueConfigData, EthereumBlock, EthereumReceiptReceiptV3, EthereumTransactionTransactionV2, FpRpcTransactionStatus, FrameSupportWeightsPerDispatchClassU64, FrameSystemAccountInfo, FrameSystemEventRecord, FrameSystemLastRuntimeUpgradeInfo, FrameSystemPhase, OrmlVestingVestingSchedule, PalletBalancesAccountData, PalletBalancesBalanceLock, PalletBalancesReleases, PalletBalancesReserveData, PalletCommonAccountBasicCrossAccountIdRepr, PalletEvmContractHelpersSponsoringModeT, PalletNonfungibleItemData, PalletRefungibleItemData, PalletTransactionPaymentReleases, PalletTreasuryProposal, PolkadotCorePrimitivesOutboundHrmpMessage, PolkadotPrimitivesV1AbridgedHostConfiguration, PolkadotPrimitivesV1PersistedValidationData, PolkadotPrimitivesV1UpgradeRestriction, SpRuntimeDigest, UpDataStructsCollection, UpDataStructsCollectionStats } from '@polkadot/types/lookup';
import type { Observable } from '@polkadot/types/types';

declare module '@polkadot/api-base/types/storage' {
  export interface AugmentedQueries<ApiType extends ApiTypes> {
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
      adminAmount: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      /**
       * Allowlisted collection users
       **/
      allowlist: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<bool>, [u32, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr]>;
      /**
       * Collection info
       **/
      collectionById: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<UpDataStructsCollection>>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      createdCollectionCount: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      destroyedCollectionCount: AugmentedQuery<ApiType, () => Observable<u32>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * Not used by code, exists only to provide some types to metadata
       **/
      dummyStorageValue: AugmentedQuery<ApiType, () => Observable<Option<ITuple<[UpDataStructsCollectionStats, u32, u32]>>>, []> & QueryableStorageEntry<ApiType, []>;
      /**
       * List of collection admins
       **/
      isAdmin: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<bool>, [u32, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr]>;
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
      allowlist: AugmentedQuery<ApiType, (arg1: H160 | string | Uint8Array, arg2: H160 | string | Uint8Array) => Observable<bool>, [H160, H160]> & QueryableStorageEntry<ApiType, [H160, H160]>;
      allowlistEnabled: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<bool>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      owner: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<H160>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      selfSponsoring: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<bool>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
      sponsorBasket: AugmentedQuery<ApiType, (arg1: H160 | string | Uint8Array, arg2: H160 | string | Uint8Array) => Observable<Option<u32>>, [H160, H160]> & QueryableStorageEntry<ApiType, [H160, H160]>;
      sponsoringMode: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<Option<PalletEvmContractHelpersSponsoringModeT>>, [H160]> & QueryableStorageEntry<ApiType, [H160]>;
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
      allowance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg3: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, PalletCommonAccountBasicCrossAccountIdRepr, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr, PalletCommonAccountBasicCrossAccountIdRepr]>;
      balance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr]>;
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
      accountBalance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u32>, [u32, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr]>;
      allowance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletCommonAccountBasicCrossAccountIdRepr>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Used to enumerate tokens owned by account
       **/
      owned: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg3: u32 | AnyNumber | Uint8Array) => Observable<bool>, [u32, PalletCommonAccountBasicCrossAccountIdRepr, u32]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr, u32]>;
      tokenData: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletNonfungibleItemData>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      tokensBurnt: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
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
      hostConfiguration: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV1AbridgedHostConfiguration>>, []> & QueryableStorageEntry<ApiType, []>;
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
      upgradeRestrictionSignal: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV1UpgradeRestriction>>, []> & QueryableStorageEntry<ApiType, []>;
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
      validationData: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV1PersistedValidationData>>, []> & QueryableStorageEntry<ApiType, []>;
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
      accountBalance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u32>, [u32, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr]>;
      allowance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg4: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, u32, PalletCommonAccountBasicCrossAccountIdRepr, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, u32, PalletCommonAccountBasicCrossAccountIdRepr, PalletCommonAccountBasicCrossAccountIdRepr]>;
      balance: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => Observable<u128>, [u32, u32, PalletCommonAccountBasicCrossAccountIdRepr]> & QueryableStorageEntry<ApiType, [u32, u32, PalletCommonAccountBasicCrossAccountIdRepr]>;
      /**
       * Used to enumerate tokens owned by account
       **/
      owned: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: PalletCommonAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, arg3: u32 | AnyNumber | Uint8Array) => Observable<bool>, [u32, PalletCommonAccountBasicCrossAccountIdRepr, u32]> & QueryableStorageEntry<ApiType, [u32, PalletCommonAccountBasicCrossAccountIdRepr, u32]>;
      tokenData: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<PalletRefungibleItemData>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      tokensBurnt: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      tokensMinted: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u32>, [u32]> & QueryableStorageEntry<ApiType, [u32]>;
      totalSupply: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<u128>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
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
       * NOTE: This storage item is explicitly unbounded since it is never intended to be read
       * from within the runtime.
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
      fungibleApproveBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, AccountId32]>;
      /**
       * Collection id (controlled?2), owning user (real)
       **/
      fungibleTransferBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, AccountId32]>;
      /**
       * Approval sponsoring
       **/
      nftApproveBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      /**
       * Collection id (controlled?2), token id (controlled?2)
       **/
      nftTransferBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u32, u32]> & QueryableStorageEntry<ApiType, [u32, u32]>;
      refungibleApproveBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, u32, AccountId32]>;
      /**
       * Collection id (controlled?2), token id (controlled?2)
       **/
      reFungibleTransferBasket: AugmentedQuery<ApiType, (arg1: u32 | AnyNumber | Uint8Array, arg2: u32 | AnyNumber | Uint8Array, arg3: AccountId32 | string | Uint8Array) => Observable<Option<u32>>, [u32, u32, AccountId32]> & QueryableStorageEntry<ApiType, [u32, u32, AccountId32]>;
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
