// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/events';

import type { ApiTypes, AugmentedEvent } from '@polkadot/api-base/types';
import type { Bytes, Null, Option, Result, U8aFixed, bool, u128, u32, u64, u8 } from '@polkadot/types-codec';
import type { AccountId32, H160, H256 } from '@polkadot/types/interfaces/runtime';
import type { EthereumLog, EvmCoreErrorExitReason, FrameSupportDispatchDispatchInfo, FrameSupportTokensMiscBalanceStatus, OrmlVestingVestingSchedule, PalletEvmAccountBasicCrossAccountIdRepr, PalletForeignAssetsAssetIds, PalletForeignAssetsModuleAssetMetadata, RmrkTraitsNftAccountIdOrCollectionNftTuple, SpRuntimeDispatchError, SpWeightsWeightV2Weight, XcmV1MultiAsset, XcmV1MultiLocation, XcmV1MultiassetMultiAssets, XcmV2Response, XcmV2TraitsError, XcmV2TraitsOutcome, XcmV2Xcm, XcmVersionedMultiAssets, XcmVersionedMultiLocation } from '@polkadot/types/lookup';

export type __AugmentedEvent<ApiType extends ApiTypes> = AugmentedEvent<ApiType>;

declare module '@polkadot/api-base/types/events' {
  interface AugmentedEvents<ApiType extends ApiTypes> {
    appPromotion: {
      /**
       * The admin was set
       * 
       * # Arguments
       * * AccountId: account address of the admin
       **/
      SetAdmin: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * Staking was performed
       * 
       * # Arguments
       * * AccountId: account of the staker
       * * Balance : staking amount
       **/
      Stake: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * Staking recalculation was performed
       * 
       * # Arguments
       * * AccountId: account of the staker.
       * * Balance : recalculation base
       * * Balance : total income
       **/
      StakingRecalculation: AugmentedEvent<ApiType, [AccountId32, u128, u128]>;
      /**
       * Unstaking was performed
       * 
       * # Arguments
       * * AccountId: account of the staker
       * * Balance : unstaking amount
       **/
      Unstake: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    balances: {
      /**
       * A balance was set by root.
       **/
      BalanceSet: AugmentedEvent<ApiType, [who: AccountId32, free: u128, reserved: u128], { who: AccountId32, free: u128, reserved: u128 }>;
      /**
       * Some amount was deposited (e.g. for transaction fees).
       **/
      Deposit: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * An account was removed whose balance was non-zero but below ExistentialDeposit,
       * resulting in an outright loss.
       **/
      DustLost: AugmentedEvent<ApiType, [account: AccountId32, amount: u128], { account: AccountId32, amount: u128 }>;
      /**
       * An account was created with some free balance.
       **/
      Endowed: AugmentedEvent<ApiType, [account: AccountId32, freeBalance: u128], { account: AccountId32, freeBalance: u128 }>;
      /**
       * Some balance was reserved (moved from free to reserved).
       **/
      Reserved: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Some balance was moved from the reserve of the first account to the second account.
       * Final argument indicates the destination balance type.
       **/
      ReserveRepatriated: AugmentedEvent<ApiType, [from: AccountId32, to: AccountId32, amount: u128, destinationStatus: FrameSupportTokensMiscBalanceStatus], { from: AccountId32, to: AccountId32, amount: u128, destinationStatus: FrameSupportTokensMiscBalanceStatus }>;
      /**
       * Some amount was removed from the account (e.g. for misbehavior).
       **/
      Slashed: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Transfer succeeded.
       **/
      Transfer: AugmentedEvent<ApiType, [from: AccountId32, to: AccountId32, amount: u128], { from: AccountId32, to: AccountId32, amount: u128 }>;
      /**
       * Some balance was unreserved (moved from reserved to free).
       **/
      Unreserved: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Some amount was withdrawn from the account (e.g. for transaction fees).
       **/
      Withdraw: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    common: {
      /**
       * Address was added to the allow list.
       **/
      AllowListAddressAdded: AugmentedEvent<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Address was removed from the allow list.
       **/
      AllowListAddressRemoved: AugmentedEvent<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Amount pieces of token owned by `sender` was approved for `spender`.
       **/
      Approved: AugmentedEvent<ApiType, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
      /**
       * A `sender` approves operations on all owned tokens for `spender`.
       **/
      ApprovedForAll: AugmentedEvent<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, bool]>;
      /**
       * Collection admin was added.
       **/
      CollectionAdminAdded: AugmentedEvent<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Collection admin was removed.
       **/
      CollectionAdminRemoved: AugmentedEvent<ApiType, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * New collection was created
       **/
      CollectionCreated: AugmentedEvent<ApiType, [u32, u8, AccountId32]>;
      /**
       * New collection was destroyed
       **/
      CollectionDestroyed: AugmentedEvent<ApiType, [u32]>;
      /**
       * Collection limits were set.
       **/
      CollectionLimitSet: AugmentedEvent<ApiType, [u32]>;
      /**
       * Collection owned was changed.
       **/
      CollectionOwnerChanged: AugmentedEvent<ApiType, [u32, AccountId32]>;
      /**
       * Collection permissions were set.
       **/
      CollectionPermissionSet: AugmentedEvent<ApiType, [u32]>;
      /**
       * The property has been deleted.
       **/
      CollectionPropertyDeleted: AugmentedEvent<ApiType, [u32, Bytes]>;
      /**
       * The colletion property has been added or edited.
       **/
      CollectionPropertySet: AugmentedEvent<ApiType, [u32, Bytes]>;
      /**
       * Collection sponsor was removed.
       **/
      CollectionSponsorRemoved: AugmentedEvent<ApiType, [u32]>;
      /**
       * Collection sponsor was set.
       **/
      CollectionSponsorSet: AugmentedEvent<ApiType, [u32, AccountId32]>;
      /**
       * New item was created.
       **/
      ItemCreated: AugmentedEvent<ApiType, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
      /**
       * Collection item was burned.
       **/
      ItemDestroyed: AugmentedEvent<ApiType, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
      /**
       * The token property permission of a collection has been set.
       **/
      PropertyPermissionSet: AugmentedEvent<ApiType, [u32, Bytes]>;
      /**
       * New sponsor was confirm.
       **/
      SponsorshipConfirmed: AugmentedEvent<ApiType, [u32, AccountId32]>;
      /**
       * The token property has been deleted.
       **/
      TokenPropertyDeleted: AugmentedEvent<ApiType, [u32, u32, Bytes]>;
      /**
       * The token property has been added or edited.
       **/
      TokenPropertySet: AugmentedEvent<ApiType, [u32, u32, Bytes]>;
      /**
       * Item was transferred
       **/
      Transfer: AugmentedEvent<ApiType, [u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    cumulusXcm: {
      /**
       * Downward message executed with the given outcome.
       * \[ id, outcome \]
       **/
      ExecutedDownward: AugmentedEvent<ApiType, [U8aFixed, XcmV2TraitsOutcome]>;
      /**
       * Downward message is invalid XCM.
       * \[ id \]
       **/
      InvalidFormat: AugmentedEvent<ApiType, [U8aFixed]>;
      /**
       * Downward message is unsupported version of XCM.
       * \[ id \]
       **/
      UnsupportedVersion: AugmentedEvent<ApiType, [U8aFixed]>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    dmpQueue: {
      /**
       * Downward message executed with the given outcome.
       **/
      ExecutedDownward: AugmentedEvent<ApiType, [messageId: U8aFixed, outcome: XcmV2TraitsOutcome], { messageId: U8aFixed, outcome: XcmV2TraitsOutcome }>;
      /**
       * Downward message is invalid XCM.
       **/
      InvalidFormat: AugmentedEvent<ApiType, [messageId: U8aFixed], { messageId: U8aFixed }>;
      /**
       * Downward message is overweight and was placed in the overweight queue.
       **/
      OverweightEnqueued: AugmentedEvent<ApiType, [messageId: U8aFixed, overweightIndex: u64, requiredWeight: SpWeightsWeightV2Weight], { messageId: U8aFixed, overweightIndex: u64, requiredWeight: SpWeightsWeightV2Weight }>;
      /**
       * Downward message from the overweight queue was executed.
       **/
      OverweightServiced: AugmentedEvent<ApiType, [overweightIndex: u64, weightUsed: SpWeightsWeightV2Weight], { overweightIndex: u64, weightUsed: SpWeightsWeightV2Weight }>;
      /**
       * Downward message is unsupported version of XCM.
       **/
      UnsupportedVersion: AugmentedEvent<ApiType, [messageId: U8aFixed], { messageId: U8aFixed }>;
      /**
       * The weight limit for handling downward messages was reached.
       **/
      WeightExhausted: AugmentedEvent<ApiType, [messageId: U8aFixed, remainingWeight: SpWeightsWeightV2Weight, requiredWeight: SpWeightsWeightV2Weight], { messageId: U8aFixed, remainingWeight: SpWeightsWeightV2Weight, requiredWeight: SpWeightsWeightV2Weight }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    ethereum: {
      /**
       * An ethereum transaction was successfully executed.
       **/
      Executed: AugmentedEvent<ApiType, [from: H160, to: H160, transactionHash: H256, exitReason: EvmCoreErrorExitReason], { from: H160, to: H160, transactionHash: H256, exitReason: EvmCoreErrorExitReason }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    evm: {
      /**
       * A contract has been created at given address.
       **/
      Created: AugmentedEvent<ApiType, [address: H160], { address: H160 }>;
      /**
       * A contract was attempted to be created, but the execution failed.
       **/
      CreatedFailed: AugmentedEvent<ApiType, [address: H160], { address: H160 }>;
      /**
       * A contract has been executed successfully with states applied.
       **/
      Executed: AugmentedEvent<ApiType, [address: H160], { address: H160 }>;
      /**
       * A contract has been executed with errors. States are reverted with only gas fees applied.
       **/
      ExecutedFailed: AugmentedEvent<ApiType, [address: H160], { address: H160 }>;
      /**
       * Ethereum events from contracts.
       **/
      Log: AugmentedEvent<ApiType, [log: EthereumLog], { log: EthereumLog }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    evmContractHelpers: {
      /**
       * Collection sponsor was removed.
       **/
      ContractSponsorRemoved: AugmentedEvent<ApiType, [H160]>;
      /**
       * Contract sponsor was set.
       **/
      ContractSponsorSet: AugmentedEvent<ApiType, [H160, AccountId32]>;
      /**
       * New sponsor was confirm.
       **/
      ContractSponsorshipConfirmed: AugmentedEvent<ApiType, [H160, AccountId32]>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    evmMigration: {
      /**
       * This event is used in benchmarking and can be used for tests
       **/
      TestEvent: AugmentedEvent<ApiType, []>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    foreignAssets: {
      /**
       * The asset registered.
       **/
      AssetRegistered: AugmentedEvent<ApiType, [assetId: PalletForeignAssetsAssetIds, metadata: PalletForeignAssetsModuleAssetMetadata], { assetId: PalletForeignAssetsAssetIds, metadata: PalletForeignAssetsModuleAssetMetadata }>;
      /**
       * The asset updated.
       **/
      AssetUpdated: AugmentedEvent<ApiType, [assetId: PalletForeignAssetsAssetIds, metadata: PalletForeignAssetsModuleAssetMetadata], { assetId: PalletForeignAssetsAssetIds, metadata: PalletForeignAssetsModuleAssetMetadata }>;
      /**
       * The foreign asset registered.
       **/
      ForeignAssetRegistered: AugmentedEvent<ApiType, [assetId: u32, assetAddress: XcmV1MultiLocation, metadata: PalletForeignAssetsModuleAssetMetadata], { assetId: u32, assetAddress: XcmV1MultiLocation, metadata: PalletForeignAssetsModuleAssetMetadata }>;
      /**
       * The foreign asset updated.
       **/
      ForeignAssetUpdated: AugmentedEvent<ApiType, [assetId: u32, assetAddress: XcmV1MultiLocation, metadata: PalletForeignAssetsModuleAssetMetadata], { assetId: u32, assetAddress: XcmV1MultiLocation, metadata: PalletForeignAssetsModuleAssetMetadata }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    maintenance: {
      MaintenanceDisabled: AugmentedEvent<ApiType, []>;
      MaintenanceEnabled: AugmentedEvent<ApiType, []>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    parachainSystem: {
      /**
       * Downward messages were processed using the given weight.
       **/
      DownwardMessagesProcessed: AugmentedEvent<ApiType, [weightUsed: SpWeightsWeightV2Weight, dmqHead: H256], { weightUsed: SpWeightsWeightV2Weight, dmqHead: H256 }>;
      /**
       * Some downward messages have been received and will be processed.
       **/
      DownwardMessagesReceived: AugmentedEvent<ApiType, [count: u32], { count: u32 }>;
      /**
       * An upgrade has been authorized.
       **/
      UpgradeAuthorized: AugmentedEvent<ApiType, [codeHash: H256], { codeHash: H256 }>;
      /**
       * The validation function was applied as of the contained relay chain block number.
       **/
      ValidationFunctionApplied: AugmentedEvent<ApiType, [relayChainBlockNum: u32], { relayChainBlockNum: u32 }>;
      /**
       * The relay-chain aborted the upgrade process.
       **/
      ValidationFunctionDiscarded: AugmentedEvent<ApiType, []>;
      /**
       * The validation function has been scheduled to apply.
       **/
      ValidationFunctionStored: AugmentedEvent<ApiType, []>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    polkadotXcm: {
      /**
       * Some assets have been claimed from an asset trap
       * 
       * \[ hash, origin, assets \]
       **/
      AssetsClaimed: AugmentedEvent<ApiType, [H256, XcmV1MultiLocation, XcmVersionedMultiAssets]>;
      /**
       * Some assets have been placed in an asset trap.
       * 
       * \[ hash, origin, assets \]
       **/
      AssetsTrapped: AugmentedEvent<ApiType, [H256, XcmV1MultiLocation, XcmVersionedMultiAssets]>;
      /**
       * Execution of an XCM message was attempted.
       * 
       * \[ outcome \]
       **/
      Attempted: AugmentedEvent<ApiType, [XcmV2TraitsOutcome]>;
      /**
       * Expected query response has been received but the origin location of the response does
       * not match that expected. The query remains registered for a later, valid, response to
       * be received and acted upon.
       * 
       * \[ origin location, id, expected location \]
       **/
      InvalidResponder: AugmentedEvent<ApiType, [XcmV1MultiLocation, u64, Option<XcmV1MultiLocation>]>;
      /**
       * Expected query response has been received but the expected origin location placed in
       * storage by this runtime previously cannot be decoded. The query remains registered.
       * 
       * This is unexpected (since a location placed in storage in a previously executing
       * runtime should be readable prior to query timeout) and dangerous since the possibly
       * valid response will be dropped. Manual governance intervention is probably going to be
       * needed.
       * 
       * \[ origin location, id \]
       **/
      InvalidResponderVersion: AugmentedEvent<ApiType, [XcmV1MultiLocation, u64]>;
      /**
       * Query response has been received and query is removed. The registered notification has
       * been dispatched and executed successfully.
       * 
       * \[ id, pallet index, call index \]
       **/
      Notified: AugmentedEvent<ApiType, [u64, u8, u8]>;
      /**
       * Query response has been received and query is removed. The dispatch was unable to be
       * decoded into a `Call`; this might be due to dispatch function having a signature which
       * is not `(origin, QueryId, Response)`.
       * 
       * \[ id, pallet index, call index \]
       **/
      NotifyDecodeFailed: AugmentedEvent<ApiType, [u64, u8, u8]>;
      /**
       * Query response has been received and query is removed. There was a general error with
       * dispatching the notification call.
       * 
       * \[ id, pallet index, call index \]
       **/
      NotifyDispatchError: AugmentedEvent<ApiType, [u64, u8, u8]>;
      /**
       * Query response has been received and query is removed. The registered notification could
       * not be dispatched because the dispatch weight is greater than the maximum weight
       * originally budgeted by this runtime for the query result.
       * 
       * \[ id, pallet index, call index, actual weight, max budgeted weight \]
       **/
      NotifyOverweight: AugmentedEvent<ApiType, [u64, u8, u8, SpWeightsWeightV2Weight, SpWeightsWeightV2Weight]>;
      /**
       * A given location which had a version change subscription was dropped owing to an error
       * migrating the location to our new XCM format.
       * 
       * \[ location, query ID \]
       **/
      NotifyTargetMigrationFail: AugmentedEvent<ApiType, [XcmVersionedMultiLocation, u64]>;
      /**
       * A given location which had a version change subscription was dropped owing to an error
       * sending the notification to it.
       * 
       * \[ location, query ID, error \]
       **/
      NotifyTargetSendFail: AugmentedEvent<ApiType, [XcmV1MultiLocation, u64, XcmV2TraitsError]>;
      /**
       * Query response has been received and is ready for taking with `take_response`. There is
       * no registered notification call.
       * 
       * \[ id, response \]
       **/
      ResponseReady: AugmentedEvent<ApiType, [u64, XcmV2Response]>;
      /**
       * Received query response has been read and removed.
       * 
       * \[ id \]
       **/
      ResponseTaken: AugmentedEvent<ApiType, [u64]>;
      /**
       * A XCM message was sent.
       * 
       * \[ origin, destination, message \]
       **/
      Sent: AugmentedEvent<ApiType, [XcmV1MultiLocation, XcmV1MultiLocation, XcmV2Xcm]>;
      /**
       * The supported version of a location has been changed. This might be through an
       * automatic notification or a manual intervention.
       * 
       * \[ location, XCM version \]
       **/
      SupportedVersionChanged: AugmentedEvent<ApiType, [XcmV1MultiLocation, u32]>;
      /**
       * Query response received which does not match a registered query. This may be because a
       * matching query was never registered, it may be because it is a duplicate response, or
       * because the query timed out.
       * 
       * \[ origin location, id \]
       **/
      UnexpectedResponse: AugmentedEvent<ApiType, [XcmV1MultiLocation, u64]>;
      /**
       * An XCM version change notification message has been attempted to be sent.
       * 
       * \[ destination, result \]
       **/
      VersionChangeNotified: AugmentedEvent<ApiType, [XcmV1MultiLocation, u32]>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    rmrkCore: {
      CollectionCreated: AugmentedEvent<ApiType, [issuer: AccountId32, collectionId: u32], { issuer: AccountId32, collectionId: u32 }>;
      CollectionDestroyed: AugmentedEvent<ApiType, [issuer: AccountId32, collectionId: u32], { issuer: AccountId32, collectionId: u32 }>;
      CollectionLocked: AugmentedEvent<ApiType, [issuer: AccountId32, collectionId: u32], { issuer: AccountId32, collectionId: u32 }>;
      IssuerChanged: AugmentedEvent<ApiType, [oldIssuer: AccountId32, newIssuer: AccountId32, collectionId: u32], { oldIssuer: AccountId32, newIssuer: AccountId32, collectionId: u32 }>;
      NFTAccepted: AugmentedEvent<ApiType, [sender: AccountId32, recipient: RmrkTraitsNftAccountIdOrCollectionNftTuple, collectionId: u32, nftId: u32], { sender: AccountId32, recipient: RmrkTraitsNftAccountIdOrCollectionNftTuple, collectionId: u32, nftId: u32 }>;
      NFTBurned: AugmentedEvent<ApiType, [owner: AccountId32, nftId: u32], { owner: AccountId32, nftId: u32 }>;
      NftMinted: AugmentedEvent<ApiType, [owner: AccountId32, collectionId: u32, nftId: u32], { owner: AccountId32, collectionId: u32, nftId: u32 }>;
      NFTRejected: AugmentedEvent<ApiType, [sender: AccountId32, collectionId: u32, nftId: u32], { sender: AccountId32, collectionId: u32, nftId: u32 }>;
      NFTSent: AugmentedEvent<ApiType, [sender: AccountId32, recipient: RmrkTraitsNftAccountIdOrCollectionNftTuple, collectionId: u32, nftId: u32, approvalRequired: bool], { sender: AccountId32, recipient: RmrkTraitsNftAccountIdOrCollectionNftTuple, collectionId: u32, nftId: u32, approvalRequired: bool }>;
      PrioritySet: AugmentedEvent<ApiType, [collectionId: u32, nftId: u32], { collectionId: u32, nftId: u32 }>;
      PropertySet: AugmentedEvent<ApiType, [collectionId: u32, maybeNftId: Option<u32>, key: Bytes, value: Bytes], { collectionId: u32, maybeNftId: Option<u32>, key: Bytes, value: Bytes }>;
      ResourceAccepted: AugmentedEvent<ApiType, [nftId: u32, resourceId: u32], { nftId: u32, resourceId: u32 }>;
      ResourceAdded: AugmentedEvent<ApiType, [nftId: u32, resourceId: u32], { nftId: u32, resourceId: u32 }>;
      ResourceRemoval: AugmentedEvent<ApiType, [nftId: u32, resourceId: u32], { nftId: u32, resourceId: u32 }>;
      ResourceRemovalAccepted: AugmentedEvent<ApiType, [nftId: u32, resourceId: u32], { nftId: u32, resourceId: u32 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    rmrkEquip: {
      BaseCreated: AugmentedEvent<ApiType, [issuer: AccountId32, baseId: u32], { issuer: AccountId32, baseId: u32 }>;
      EquippablesUpdated: AugmentedEvent<ApiType, [baseId: u32, slotId: u32], { baseId: u32, slotId: u32 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    structure: {
      /**
       * Executed call on behalf of the token.
       **/
      Executed: AugmentedEvent<ApiType, [Result<Null, SpRuntimeDispatchError>]>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    sudo: {
      /**
       * The \[sudoer\] just switched identity; the old key is supplied if one existed.
       **/
      KeyChanged: AugmentedEvent<ApiType, [oldSudoer: Option<AccountId32>], { oldSudoer: Option<AccountId32> }>;
      /**
       * A sudo just took place. \[result\]
       **/
      Sudid: AugmentedEvent<ApiType, [sudoResult: Result<Null, SpRuntimeDispatchError>], { sudoResult: Result<Null, SpRuntimeDispatchError> }>;
      /**
       * A sudo just took place. \[result\]
       **/
      SudoAsDone: AugmentedEvent<ApiType, [sudoResult: Result<Null, SpRuntimeDispatchError>], { sudoResult: Result<Null, SpRuntimeDispatchError> }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    system: {
      /**
       * `:code` was updated.
       **/
      CodeUpdated: AugmentedEvent<ApiType, []>;
      /**
       * An extrinsic failed.
       **/
      ExtrinsicFailed: AugmentedEvent<ApiType, [dispatchError: SpRuntimeDispatchError, dispatchInfo: FrameSupportDispatchDispatchInfo], { dispatchError: SpRuntimeDispatchError, dispatchInfo: FrameSupportDispatchDispatchInfo }>;
      /**
       * An extrinsic completed successfully.
       **/
      ExtrinsicSuccess: AugmentedEvent<ApiType, [dispatchInfo: FrameSupportDispatchDispatchInfo], { dispatchInfo: FrameSupportDispatchDispatchInfo }>;
      /**
       * An account was reaped.
       **/
      KilledAccount: AugmentedEvent<ApiType, [account: AccountId32], { account: AccountId32 }>;
      /**
       * A new account was created.
       **/
      NewAccount: AugmentedEvent<ApiType, [account: AccountId32], { account: AccountId32 }>;
      /**
       * On on-chain remark happened.
       **/
      Remarked: AugmentedEvent<ApiType, [sender: AccountId32, hash_: H256], { sender: AccountId32, hash_: H256 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    testUtils: {
      BatchCompleted: AugmentedEvent<ApiType, []>;
      ShouldRollback: AugmentedEvent<ApiType, []>;
      ValueIsSet: AugmentedEvent<ApiType, []>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    tokens: {
      /**
       * A balance was set by root.
       **/
      BalanceSet: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, free: u128, reserved: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, free: u128, reserved: u128 }>;
      /**
       * Deposited some balance into an account
       **/
      Deposited: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128 }>;
      /**
       * An account was removed whose balance was non-zero but below
       * ExistentialDeposit, resulting in an outright loss.
       **/
      DustLost: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128 }>;
      /**
       * An account was created with some free balance.
       **/
      Endowed: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128 }>;
      /**
       * Some locked funds were unlocked
       **/
      LockRemoved: AugmentedEvent<ApiType, [lockId: U8aFixed, currencyId: PalletForeignAssetsAssetIds, who: AccountId32], { lockId: U8aFixed, currencyId: PalletForeignAssetsAssetIds, who: AccountId32 }>;
      /**
       * Some funds are locked
       **/
      LockSet: AugmentedEvent<ApiType, [lockId: U8aFixed, currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128], { lockId: U8aFixed, currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128 }>;
      /**
       * Some balance was reserved (moved from free to reserved).
       **/
      Reserved: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128 }>;
      /**
       * Some reserved balance was repatriated (moved from reserved to
       * another account).
       **/
      ReserveRepatriated: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, from: AccountId32, to: AccountId32, amount: u128, status: FrameSupportTokensMiscBalanceStatus], { currencyId: PalletForeignAssetsAssetIds, from: AccountId32, to: AccountId32, amount: u128, status: FrameSupportTokensMiscBalanceStatus }>;
      /**
       * Some balances were slashed (e.g. due to mis-behavior)
       **/
      Slashed: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, freeAmount: u128, reservedAmount: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, freeAmount: u128, reservedAmount: u128 }>;
      /**
       * The total issuance of an currency has been set
       **/
      TotalIssuanceSet: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, amount: u128], { currencyId: PalletForeignAssetsAssetIds, amount: u128 }>;
      /**
       * Transfer succeeded.
       **/
      Transfer: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, from: AccountId32, to: AccountId32, amount: u128], { currencyId: PalletForeignAssetsAssetIds, from: AccountId32, to: AccountId32, amount: u128 }>;
      /**
       * Some balance was unreserved (moved from reserved to free).
       **/
      Unreserved: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128 }>;
      /**
       * Some balances were withdrawn (e.g. pay for transaction fee)
       **/
      Withdrawn: AugmentedEvent<ApiType, [currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128], { currencyId: PalletForeignAssetsAssetIds, who: AccountId32, amount: u128 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    transactionPayment: {
      /**
       * A transaction fee `actual_fee`, of which `tip` was added to the minimum inclusion fee,
       * has been paid by `who`.
       **/
      TransactionFeePaid: AugmentedEvent<ApiType, [who: AccountId32, actualFee: u128, tip: u128], { who: AccountId32, actualFee: u128, tip: u128 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    treasury: {
      /**
       * Some funds have been allocated.
       **/
      Awarded: AugmentedEvent<ApiType, [proposalIndex: u32, award: u128, account: AccountId32], { proposalIndex: u32, award: u128, account: AccountId32 }>;
      /**
       * Some of our funds have been burnt.
       **/
      Burnt: AugmentedEvent<ApiType, [burntFunds: u128], { burntFunds: u128 }>;
      /**
       * Some funds have been deposited.
       **/
      Deposit: AugmentedEvent<ApiType, [value: u128], { value: u128 }>;
      /**
       * New proposal.
       **/
      Proposed: AugmentedEvent<ApiType, [proposalIndex: u32], { proposalIndex: u32 }>;
      /**
       * A proposal was rejected; funds were slashed.
       **/
      Rejected: AugmentedEvent<ApiType, [proposalIndex: u32, slashed: u128], { proposalIndex: u32, slashed: u128 }>;
      /**
       * Spending has finished; this is the amount that rolls over until next spend.
       **/
      Rollover: AugmentedEvent<ApiType, [rolloverBalance: u128], { rolloverBalance: u128 }>;
      /**
       * A new spend proposal has been approved.
       **/
      SpendApproved: AugmentedEvent<ApiType, [proposalIndex: u32, amount: u128, beneficiary: AccountId32], { proposalIndex: u32, amount: u128, beneficiary: AccountId32 }>;
      /**
       * We have ended a spend period and will now allocate funds.
       **/
      Spending: AugmentedEvent<ApiType, [budgetRemaining: u128], { budgetRemaining: u128 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    vesting: {
      /**
       * Claimed vesting.
       **/
      Claimed: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Added new vesting schedule.
       **/
      VestingScheduleAdded: AugmentedEvent<ApiType, [from: AccountId32, to: AccountId32, vestingSchedule: OrmlVestingVestingSchedule], { from: AccountId32, to: AccountId32, vestingSchedule: OrmlVestingVestingSchedule }>;
      /**
       * Updated vesting schedules.
       **/
      VestingSchedulesUpdated: AugmentedEvent<ApiType, [who: AccountId32], { who: AccountId32 }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    xcmpQueue: {
      /**
       * Bad XCM format used.
       **/
      BadFormat: AugmentedEvent<ApiType, [messageHash: Option<H256>], { messageHash: Option<H256> }>;
      /**
       * Bad XCM version used.
       **/
      BadVersion: AugmentedEvent<ApiType, [messageHash: Option<H256>], { messageHash: Option<H256> }>;
      /**
       * Some XCM failed.
       **/
      Fail: AugmentedEvent<ApiType, [messageHash: Option<H256>, error: XcmV2TraitsError, weight: SpWeightsWeightV2Weight], { messageHash: Option<H256>, error: XcmV2TraitsError, weight: SpWeightsWeightV2Weight }>;
      /**
       * An XCM exceeded the individual message weight budget.
       **/
      OverweightEnqueued: AugmentedEvent<ApiType, [sender: u32, sentAt: u32, index: u64, required: SpWeightsWeightV2Weight], { sender: u32, sentAt: u32, index: u64, required: SpWeightsWeightV2Weight }>;
      /**
       * An XCM from the overweight queue was executed with the given actual weight used.
       **/
      OverweightServiced: AugmentedEvent<ApiType, [index: u64, used: SpWeightsWeightV2Weight], { index: u64, used: SpWeightsWeightV2Weight }>;
      /**
       * Some XCM was executed ok.
       **/
      Success: AugmentedEvent<ApiType, [messageHash: Option<H256>, weight: SpWeightsWeightV2Weight], { messageHash: Option<H256>, weight: SpWeightsWeightV2Weight }>;
      /**
       * An upward message was sent to the relay chain.
       **/
      UpwardMessageSent: AugmentedEvent<ApiType, [messageHash: Option<H256>], { messageHash: Option<H256> }>;
      /**
       * An HRMP message was sent to a sibling parachain.
       **/
      XcmpMessageSent: AugmentedEvent<ApiType, [messageHash: Option<H256>], { messageHash: Option<H256> }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
    xTokens: {
      /**
       * Transferred `MultiAsset` with fee.
       **/
      TransferredMultiAssets: AugmentedEvent<ApiType, [sender: AccountId32, assets: XcmV1MultiassetMultiAssets, fee: XcmV1MultiAsset, dest: XcmV1MultiLocation], { sender: AccountId32, assets: XcmV1MultiassetMultiAssets, fee: XcmV1MultiAsset, dest: XcmV1MultiLocation }>;
      /**
       * Generic event
       **/
      [key: string]: AugmentedEvent<ApiType>;
    };
  } // AugmentedEvents
} // declare module
