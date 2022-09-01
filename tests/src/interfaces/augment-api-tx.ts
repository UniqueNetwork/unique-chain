// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

import type { ApiTypes } from '@polkadot/api-base/types';
import type { Bytes, Compact, Option, U256, U8aFixed, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { AnyNumber, IMethod, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H160, H256, MultiAddress, Perbill, Permill } from '@polkadot/types/interfaces/runtime';
import type { CumulusPrimitivesParachainInherentParachainInherentData, EthereumTransactionTransactionV2, FrameSupportScheduleMaybeHashed, OrmlVestingVestingSchedule, PalletEvmAccountBasicCrossAccountIdRepr, PalletForeingAssetsAssetIds, PalletForeingAssetsModuleAssetMetadata, RmrkTraitsNftAccountIdOrCollectionNftTuple, RmrkTraitsPartEquippableList, RmrkTraitsPartPartType, RmrkTraitsResourceBasicResource, RmrkTraitsResourceComposableResource, RmrkTraitsResourceResourceTypes, RmrkTraitsResourceSlotResource, RmrkTraitsTheme, UpDataStructsCollectionLimits, UpDataStructsCollectionMode, UpDataStructsCollectionPermissions, UpDataStructsCreateCollectionData, UpDataStructsCreateItemData, UpDataStructsCreateItemExData, UpDataStructsProperty, UpDataStructsPropertyKeyPermission, XcmV1MultiLocation, XcmV2WeightLimit, XcmVersionedMultiAsset, XcmVersionedMultiAssets, XcmVersionedMultiLocation, XcmVersionedXcm } from '@polkadot/types/lookup';

declare module '@polkadot/api-base/types/submittable' {
  export interface AugmentedSubmittables<ApiType extends ApiTypes> {
    balances: {
      /**
       * Exactly as `transfer`, except the origin must be root and the source account may be
       * specified.
       * # <weight>
       * - Same as transfer, but additional read and write because the source account is not
       * assumed to be in the overlay.
       * # </weight>
       **/
      forceTransfer: AugmentedSubmittable<(source: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress, Compact<u128>]>;
      /**
       * Unreserve some balance from a user by force.
       * 
       * Can only be called by ROOT.
       **/
      forceUnreserve: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, u128]>;
      /**
       * Set the balances of a given account.
       * 
       * This will alter `FreeBalance` and `ReservedBalance` in storage. it will
       * also alter the total issuance of the system (`TotalIssuance`) appropriately.
       * If the new free or reserved balance is below the existential deposit,
       * it will reset the account nonce (`frame_system::AccountNonce`).
       * 
       * The dispatch origin for this call is `root`.
       **/
      setBalance: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, newFree: Compact<u128> | AnyNumber | Uint8Array, newReserved: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Compact<u128>, Compact<u128>]>;
      /**
       * Transfer some liquid free balance to another account.
       * 
       * `transfer` will set the `FreeBalance` of the sender and receiver.
       * If the sender's account is below the existential deposit as a result
       * of the transfer, the account will be reaped.
       * 
       * The dispatch origin for this call must be `Signed` by the transactor.
       * 
       * # <weight>
       * - Dependent on arguments but not critical, given proper implementations for input config
       * types. See related functions below.
       * - It contains a limited number of reads and writes internally and no complex
       * computation.
       * 
       * Related functions:
       * 
       * - `ensure_can_withdraw` is always called internally but has a bounded complexity.
       * - Transferring balances to accounts that did not exist before will cause
       * `T::OnNewAccount::on_new_account` to be called.
       * - Removing enough funds from an account will trigger `T::DustRemoval::on_unbalanced`.
       * - `transfer_keep_alive` works the same way as `transfer`, but has an additional check
       * that the transfer will not kill the origin account.
       * ---------------------------------
       * - Origin account is already in memory, so no DB operations for them.
       * # </weight>
       **/
      transfer: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Compact<u128>]>;
      /**
       * Transfer the entire transferable balance from the caller account.
       * 
       * NOTE: This function only attempts to transfer _transferable_ balances. This means that
       * any locked, reserved, or existential deposits (when `keep_alive` is `true`), will not be
       * transferred by this function. To ensure that this function results in a killed account,
       * you might need to prepare the account by removing any reference counters, storage
       * deposits, etc...
       * 
       * The dispatch origin of this call must be Signed.
       * 
       * - `dest`: The recipient of the transfer.
       * - `keep_alive`: A boolean to determine if the `transfer_all` operation should send all
       * of the funds the account has, causing the sender account to be killed (false), or
       * transfer everything except at least the existential deposit, which will guarantee to
       * keep the sender account alive (true). # <weight>
       * - O(1). Just like transfer, but reading the user's transferable balance first.
       * #</weight>
       **/
      transferAll: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, keepAlive: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, bool]>;
      /**
       * Same as the [`transfer`] call, but with a check that the transfer will not kill the
       * origin account.
       * 
       * 99% of the time you want [`transfer`] instead.
       * 
       * [`transfer`]: struct.Pallet.html#method.transfer
       **/
      transferKeepAlive: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Compact<u128>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    charging: {
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    configuration: {
      setMinGasPriceOverride: AugmentedSubmittable<(coeff: Option<u64> | null | object | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Option<u64>]>;
      setWeightToFeeCoefficientOverride: AugmentedSubmittable<(coeff: Option<u32> | null | object | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Option<u32>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    cumulusXcm: {
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    dmpQueue: {
      /**
       * Service a single overweight message.
       * 
       * - `origin`: Must pass `ExecuteOverweightOrigin`.
       * - `index`: The index of the overweight message to service.
       * - `weight_limit`: The amount of weight that message execution may take.
       * 
       * Errors:
       * - `Unknown`: Message of `index` is unknown.
       * - `OverLimit`: Message execution may use greater than `weight_limit`.
       * 
       * Events:
       * - `OverweightServiced`: On success.
       **/
      serviceOverweight: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array, weightLimit: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, u64]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    ethereum: {
      /**
       * Transact an Ethereum transaction.
       **/
      transact: AugmentedSubmittable<(transaction: EthereumTransactionTransactionV2 | { Legacy: any } | { EIP2930: any } | { EIP1559: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [EthereumTransactionTransactionV2]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    evm: {
      /**
       * Issue an EVM call operation. This is similar to a message call transaction in Ethereum.
       **/
      call: AugmentedSubmittable<(source: H160 | string | Uint8Array, target: H160 | string | Uint8Array, input: Bytes | string | Uint8Array, value: U256 | AnyNumber | Uint8Array, gasLimit: u64 | AnyNumber | Uint8Array, maxFeePerGas: U256 | AnyNumber | Uint8Array, maxPriorityFeePerGas: Option<U256> | null | object | string | Uint8Array, nonce: Option<U256> | null | object | string | Uint8Array, accessList: Vec<ITuple<[H160, Vec<H256>]>> | ([H160 | string | Uint8Array, Vec<H256> | (H256 | string | Uint8Array)[]])[]) => SubmittableExtrinsic<ApiType>, [H160, H160, Bytes, U256, u64, U256, Option<U256>, Option<U256>, Vec<ITuple<[H160, Vec<H256>]>>]>;
      /**
       * Issue an EVM create operation. This is similar to a contract creation transaction in
       * Ethereum.
       **/
      create: AugmentedSubmittable<(source: H160 | string | Uint8Array, init: Bytes | string | Uint8Array, value: U256 | AnyNumber | Uint8Array, gasLimit: u64 | AnyNumber | Uint8Array, maxFeePerGas: U256 | AnyNumber | Uint8Array, maxPriorityFeePerGas: Option<U256> | null | object | string | Uint8Array, nonce: Option<U256> | null | object | string | Uint8Array, accessList: Vec<ITuple<[H160, Vec<H256>]>> | ([H160 | string | Uint8Array, Vec<H256> | (H256 | string | Uint8Array)[]])[]) => SubmittableExtrinsic<ApiType>, [H160, Bytes, U256, u64, U256, Option<U256>, Option<U256>, Vec<ITuple<[H160, Vec<H256>]>>]>;
      /**
       * Issue an EVM create2 operation.
       **/
      create2: AugmentedSubmittable<(source: H160 | string | Uint8Array, init: Bytes | string | Uint8Array, salt: H256 | string | Uint8Array, value: U256 | AnyNumber | Uint8Array, gasLimit: u64 | AnyNumber | Uint8Array, maxFeePerGas: U256 | AnyNumber | Uint8Array, maxPriorityFeePerGas: Option<U256> | null | object | string | Uint8Array, nonce: Option<U256> | null | object | string | Uint8Array, accessList: Vec<ITuple<[H160, Vec<H256>]>> | ([H160 | string | Uint8Array, Vec<H256> | (H256 | string | Uint8Array)[]])[]) => SubmittableExtrinsic<ApiType>, [H160, Bytes, H256, U256, u64, U256, Option<U256>, Option<U256>, Vec<ITuple<[H160, Vec<H256>]>>]>;
      /**
       * Withdraw balance from EVM into currency/balances pallet.
       **/
      withdraw: AugmentedSubmittable<(address: H160 | string | Uint8Array, value: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160, u128]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    evmMigration: {
      begin: AugmentedSubmittable<(address: H160 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160]>;
      finish: AugmentedSubmittable<(address: H160 | string | Uint8Array, code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160, Bytes]>;
      setData: AugmentedSubmittable<(address: H160 | string | Uint8Array, data: Vec<ITuple<[H256, H256]>> | ([H256 | string | Uint8Array, H256 | string | Uint8Array])[]) => SubmittableExtrinsic<ApiType>, [H160, Vec<ITuple<[H256, H256]>>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    foreingAssets: {
      registerForeignAsset: AugmentedSubmittable<(owner: AccountId32 | string | Uint8Array, location: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, metadata: PalletForeingAssetsModuleAssetMetadata | { name?: any; symbol?: any; decimals?: any; minimalBalance?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, XcmVersionedMultiLocation, PalletForeingAssetsModuleAssetMetadata]>;
      updateForeignAsset: AugmentedSubmittable<(foreignAssetId: u32 | AnyNumber | Uint8Array, location: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, metadata: PalletForeingAssetsModuleAssetMetadata | { name?: any; symbol?: any; decimals?: any; minimalBalance?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, XcmVersionedMultiLocation, PalletForeingAssetsModuleAssetMetadata]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    inflation: {
      /**
       * This method sets the inflation start date. Can be only called once.
       * Inflation start block can be backdated and will catch up. The method will create Treasury
       * account if it does not exist and perform the first inflation deposit.
       * 
       * # Permissions
       * 
       * * Root
       * 
       * # Arguments
       * 
       * * inflation_start_relay_block: The relay chain block at which inflation should start
       **/
      startInflation: AugmentedSubmittable<(inflationStartRelayBlock: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    parachainSystem: {
      authorizeUpgrade: AugmentedSubmittable<(codeHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      enactAuthorizedUpgrade: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the current validation data.
       * 
       * This should be invoked exactly once per block. It will panic at the finalization
       * phase if the call was not invoked.
       * 
       * The dispatch origin for this call must be `Inherent`
       * 
       * As a side effect, this function upgrades the current validation function
       * if the appropriate time has come.
       **/
      setValidationData: AugmentedSubmittable<(data: CumulusPrimitivesParachainInherentParachainInherentData | { validationData?: any; relayChainState?: any; downwardMessages?: any; horizontalMessages?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [CumulusPrimitivesParachainInherentParachainInherentData]>;
      sudoSendUpwardMessage: AugmentedSubmittable<(message: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    polkadotXcm: {
      /**
       * Execute an XCM message from a local, signed, origin.
       * 
       * An event is deposited indicating whether `msg` could be executed completely or only
       * partially.
       * 
       * No more than `max_weight` will be used in its attempted execution. If this is less than the
       * maximum amount of weight that the message could take to be executed, then no execution
       * attempt will be made.
       * 
       * NOTE: A successful return to this does *not* imply that the `msg` was executed successfully
       * to completion; only that *some* of it was executed.
       **/
      execute: AugmentedSubmittable<(message: XcmVersionedXcm | { V0: any } | { V1: any } | { V2: any } | string | Uint8Array, maxWeight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedXcm, u64]>;
      /**
       * Set a safe XCM version (the version that XCM should be encoded with if the most recent
       * version a destination can accept is unknown).
       * 
       * - `origin`: Must be Root.
       * - `maybe_xcm_version`: The default XCM encoding version, or `None` to disable.
       **/
      forceDefaultXcmVersion: AugmentedSubmittable<(maybeXcmVersion: Option<u32> | null | object | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Option<u32>]>;
      /**
       * Ask a location to notify us regarding their XCM version and any changes to it.
       * 
       * - `origin`: Must be Root.
       * - `location`: The location to which we should subscribe for XCM version notifications.
       **/
      forceSubscribeVersionNotify: AugmentedSubmittable<(location: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation]>;
      /**
       * Require that a particular destination should no longer notify us regarding any XCM
       * version changes.
       * 
       * - `origin`: Must be Root.
       * - `location`: The location to which we are currently subscribed for XCM version
       * notifications which we no longer desire.
       **/
      forceUnsubscribeVersionNotify: AugmentedSubmittable<(location: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation]>;
      /**
       * Extoll that a particular destination can be communicated with through a particular
       * version of XCM.
       * 
       * - `origin`: Must be Root.
       * - `location`: The destination that is being described.
       * - `xcm_version`: The latest version of XCM that `location` supports.
       **/
      forceXcmVersion: AugmentedSubmittable<(location: XcmV1MultiLocation | { parents?: any; interior?: any } | string | Uint8Array, xcmVersion: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmV1MultiLocation, u32]>;
      /**
       * Transfer some assets from the local chain to the sovereign account of a destination
       * chain and forward a notification XCM.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`, up to enough to pay for `weight_limit` of weight. If more weight
       * is needed than `weight_limit`, then the operation will fail and the assets send may be
       * at risk.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. This should include the assets used to pay the fee on the
       * `dest` side.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
       **/
      limitedReserveTransferAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V0: any } | { V1: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array, weightLimit: XcmV2WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32, XcmV2WeightLimit]>;
      /**
       * Teleport some assets from the local chain to some destination chain.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`, up to enough to pay for `weight_limit` of weight. If more weight
       * is needed than `weight_limit`, then the operation will fail and the assets send may be
       * at risk.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. The first item should be the currency used to to pay the fee on the
       * `dest` side. May not be empty.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
       **/
      limitedTeleportAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V0: any } | { V1: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array, weightLimit: XcmV2WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32, XcmV2WeightLimit]>;
      /**
       * Transfer some assets from the local chain to the sovereign account of a destination
       * chain and forward a notification XCM.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`. The weight limit for fees is not provided and thus is unlimited,
       * with all fees taken as needed from the asset.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. This should include the assets used to pay the fee on the
       * `dest` side.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       **/
      reserveTransferAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V0: any } | { V1: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32]>;
      send: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, message: XcmVersionedXcm | { V0: any } | { V1: any } | { V2: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedXcm]>;
      /**
       * Teleport some assets from the local chain to some destination chain.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`. The weight limit for fees is not provided and thus is unlimited,
       * with all fees taken as needed from the asset.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. The first item should be the currency used to to pay the fee on the
       * `dest` side. May not be empty.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       **/
      teleportAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V0: any } | { V1: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    rmrkCore: {
      /**
       * Accept an NFT sent from another account to self or an owned NFT.
       * 
       * The NFT in question must be pending, and, thus, be [sent](`Pallet::send`) first.
       * 
       * # Permissions:
       * - Token-owner-to-be
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID of the NFT to be accepted.
       * - `rmrk_nft_id`: ID of the NFT to be accepted.
       * - `new_owner`: Either the sender's account ID or a sender-owned NFT,
       * whichever the accepted NFT was sent to.
       **/
      acceptNft: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, rmrkNftId: u32 | AnyNumber | Uint8Array, newOwner: RmrkTraitsNftAccountIdOrCollectionNftTuple | { AccountId: any } | { CollectionAndNftTuple: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, RmrkTraitsNftAccountIdOrCollectionNftTuple]>;
      /**
       * Accept the addition of a newly created pending resource to an existing NFT.
       * 
       * This transaction is needed when a resource is created and assigned to an NFT
       * by a non-owner, i.e. the collection issuer, with one of the
       * [`add_...` transactions](Pallet::add_basic_resource).
       * 
       * # Permissions:
       * - Token owner
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID of the NFT.
       * - `rmrk_nft_id`: ID of the NFT with a pending resource to be accepted.
       * - `resource_id`: ID of the newly created pending resource.
       * accept the addition of a new resource to an existing NFT
       **/
      acceptResource: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, rmrkNftId: u32 | AnyNumber | Uint8Array, resourceId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, u32]>;
      /**
       * Accept the removal of a removal-pending resource from an NFT.
       * 
       * This transaction is needed when a non-owner, i.e. the collection issuer,
       * requests a [removal](`Pallet::remove_resource`) of a resource from an NFT.
       * 
       * # Permissions:
       * - Token owner
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID of the NFT.
       * - `rmrk_nft_id`: ID of the NFT with a resource to be removed.
       * - `resource_id`: ID of the removal-pending resource.
       **/
      acceptResourceRemoval: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, rmrkNftId: u32 | AnyNumber | Uint8Array, resourceId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, u32]>;
      /**
       * Create and set/propose a basic resource for an NFT.
       * 
       * A basic resource is the simplest, lacking a Base and anything that comes with it.
       * See RMRK docs for more information and examples.
       * 
       * # Permissions:
       * - Collection issuer - if not the token owner, adding the resource will warrant
       * the owner's [acceptance](Pallet::accept_resource).
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID of the NFT.
       * - `nft_id`: ID of the NFT to assign a resource to.
       * - `resource`: Data of the resource to be created.
       **/
      addBasicResource: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, nftId: u32 | AnyNumber | Uint8Array, resource: RmrkTraitsResourceBasicResource | { src?: any; metadata?: any; license?: any; thumb?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, RmrkTraitsResourceBasicResource]>;
      /**
       * Create and set/propose a composable resource for an NFT.
       * 
       * A composable resource links to a Base and has a subset of its Parts it is composed of.
       * See RMRK docs for more information and examples.
       * 
       * # Permissions:
       * - Collection issuer - if not the token owner, adding the resource will warrant
       * the owner's [acceptance](Pallet::accept_resource).
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID of the NFT.
       * - `nft_id`: ID of the NFT to assign a resource to.
       * - `resource`: Data of the resource to be created.
       **/
      addComposableResource: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, nftId: u32 | AnyNumber | Uint8Array, resource: RmrkTraitsResourceComposableResource | { parts?: any; base?: any; src?: any; metadata?: any; license?: any; thumb?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, RmrkTraitsResourceComposableResource]>;
      /**
       * Create and set/propose a slot resource for an NFT.
       * 
       * A slot resource links to a Base and a slot ID in it which it can fit into.
       * See RMRK docs for more information and examples.
       * 
       * # Permissions:
       * - Collection issuer - if not the token owner, adding the resource will warrant
       * the owner's [acceptance](Pallet::accept_resource).
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID of the NFT.
       * - `nft_id`: ID of the NFT to assign a resource to.
       * - `resource`: Data of the resource to be created.
       **/
      addSlotResource: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, nftId: u32 | AnyNumber | Uint8Array, resource: RmrkTraitsResourceSlotResource | { base?: any; src?: any; metadata?: any; slot?: any; license?: any; thumb?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, RmrkTraitsResourceSlotResource]>;
      /**
       * Burn an NFT, destroying it and its nested tokens up to the specified limit.
       * If the burning budget is exceeded, the transaction is reverted.
       * 
       * This is the way to burn a nested token as well.
       * 
       * For more information, see [`burn_recursively`](pallet_nonfungible::pallet::Pallet::burn_recursively).
       * 
       * # Permissions:
       * * Token owner
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `collection_id`: RMRK ID of the collection in which the NFT to burn belongs to.
       * - `nft_id`: ID of the NFT to be destroyed.
       * - `max_burns`: Maximum number of tokens to burn, assuming nesting. The transaction
       * is reverted if there are more tokens to burn in the nesting tree than this number.
       * This is primarily a mechanism of transaction weight control.
       **/
      burnNft: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, nftId: u32 | AnyNumber | Uint8Array, maxBurns: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, u32]>;
      /**
       * Change the issuer of a collection. Analogous to Unique's collection's [`owner`](up_data_structs::Collection).
       * 
       * # Permissions:
       * * Collection issuer
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `collection_id`: RMRK collection ID to change the issuer of.
       * - `new_issuer`: Collection's new issuer.
       **/
      changeCollectionIssuer: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, newIssuer: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, MultiAddress]>;
      /**
       * Create a new collection of NFTs.
       * 
       * # Permissions:
       * * Anyone - will be assigned as the issuer of the collection.
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `metadata`: Metadata describing the collection, e.g. IPFS hash. Cannot be changed.
       * - `max`: Optional maximum number of tokens.
       * - `symbol`: UTF-8 string with token prefix, by which to represent the token in wallets and UIs.
       * Analogous to Unique's [`token_prefix`](up_data_structs::Collection). Cannot be changed.
       **/
      createCollection: AugmentedSubmittable<(metadata: Bytes | string | Uint8Array, max: Option<u32> | null | object | string | Uint8Array, symbol: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes, Option<u32>, Bytes]>;
      /**
       * Destroy a collection.
       * 
       * Only empty collections can be destroyed. If it has any tokens, they must be burned first.
       * 
       * # Permissions:
       * * Collection issuer
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `collection_id`: RMRK ID of the collection to destroy.
       **/
      destroyCollection: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * "Lock" the collection and prevent new token creation. Cannot be undone.
       * 
       * # Permissions:
       * * Collection issuer
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `collection_id`: RMRK ID of the collection to lock.
       **/
      lockCollection: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Mint an NFT in a specified collection.
       * 
       * # Permissions:
       * * Collection issuer
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `owner`: Owner account of the NFT. If set to None, defaults to the sender (collection issuer).
       * - `collection_id`: RMRK collection ID for the NFT to be minted within. Cannot be changed.
       * - `recipient`: Receiver account of the royalty. Has no effect if the `royalty_amount` is not set. Cannot be changed.
       * - `royalty_amount`: Optional permillage reward from each trade for the `recipient`. Cannot be changed.
       * - `metadata`: Arbitrary data about an NFT, e.g. IPFS hash. Cannot be changed.
       * - `transferable`: Can this NFT be transferred? Cannot be changed.
       * - `resources`: Resource data to be added to the NFT immediately after minting.
       **/
      mintNft: AugmentedSubmittable<(owner: Option<AccountId32> | null | object | string | Uint8Array, collectionId: u32 | AnyNumber | Uint8Array, recipient: Option<AccountId32> | null | object | string | Uint8Array, royaltyAmount: Option<Permill> | null | object | string | Uint8Array, metadata: Bytes | string | Uint8Array, transferable: bool | boolean | Uint8Array, resources: Option<Vec<RmrkTraitsResourceResourceTypes>> | null | object | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Option<AccountId32>, u32, Option<AccountId32>, Option<Permill>, Bytes, bool, Option<Vec<RmrkTraitsResourceResourceTypes>>]>;
      /**
       * Reject an NFT sent from another account to self or owned NFT.
       * The NFT in question will not be sent back and burnt instead.
       * 
       * The NFT in question must be pending, and, thus, be [sent](`Pallet::send`) first.
       * 
       * # Permissions:
       * - Token-owner-to-be-not
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK ID of the NFT to be rejected.
       * - `rmrk_nft_id`: ID of the NFT to be rejected.
       **/
      rejectNft: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, rmrkNftId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32]>;
      /**
       * Remove and erase a resource from an NFT.
       * 
       * If the sender does not own the NFT, then it will be pending confirmation,
       * and will have to be [accepted](Pallet::accept_resource_removal) by the token owner.
       * 
       * # Permissions
       * - Collection issuer
       * 
       * # Arguments
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK ID of a collection to which the NFT making use of the resource belongs to.
       * - `nft_id`: ID of the NFT with a resource to be removed.
       * - `resource_id`: ID of the resource to be removed.
       **/
      removeResource: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, nftId: u32 | AnyNumber | Uint8Array, resourceId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, u32]>;
      /**
       * Transfer an NFT from an account/NFT A to another account/NFT B.
       * The token must be transferable. Nesting cannot occur deeper than the [`NESTING_BUDGET`].
       * 
       * If the target owner is an NFT owned by another account, then the NFT will enter
       * the pending state and will have to be accepted by the other account.
       * 
       * # Permissions:
       * - Token owner
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK ID of the collection of the NFT to be transferred.
       * - `rmrk_nft_id`: ID of the NFT to be transferred.
       * - `new_owner`: New owner of the nft which can be either an account or a NFT.
       **/
      send: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, rmrkNftId: u32 | AnyNumber | Uint8Array, newOwner: RmrkTraitsNftAccountIdOrCollectionNftTuple | { AccountId: any } | { CollectionAndNftTuple: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, RmrkTraitsNftAccountIdOrCollectionNftTuple]>;
      /**
       * Set a different order of resource priorities for an NFT. Priorities can be used,
       * for example, for order of rendering.
       * 
       * Note that the priorities are not updated automatically, and are an empty vector
       * by default. There is no pre-set definition for the order to be particular,
       * it can be interpreted arbitrarily use-case by use-case.
       * 
       * # Permissions:
       * - Token owner
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID of the NFT.
       * - `rmrk_nft_id`: ID of the NFT to rearrange resource priorities for.
       * - `priorities`: Ordered vector of resource IDs.
       **/
      setPriority: AugmentedSubmittable<(rmrkCollectionId: u32 | AnyNumber | Uint8Array, rmrkNftId: u32 | AnyNumber | Uint8Array, priorities: Vec<u32> | (u32 | AnyNumber | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [u32, u32, Vec<u32>]>;
      /**
       * Add or edit a custom user property, a key-value pair, describing the metadata
       * of a token or a collection, on either one of these.
       * 
       * Note that in this proxy implementation many details regarding RMRK are stored
       * as scoped properties prefixed with "rmrk:", normally inaccessible
       * to external transactions and RPCs.
       * 
       * # Permissions:
       * - Collection issuer - in case of collection property
       * - Token owner - in case of NFT property
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `rmrk_collection_id`: RMRK collection ID.
       * - `maybe_nft_id`: Optional ID of the NFT. If left empty, then the property is set for the collection.
       * - `key`: Key of the custom property to be referenced by.
       * - `value`: Value of the custom property to be stored.
       **/
      setProperty: AugmentedSubmittable<(rmrkCollectionId: Compact<u32> | AnyNumber | Uint8Array, maybeNftId: Option<u32> | null | object | string | Uint8Array, key: Bytes | string | Uint8Array, value: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, Option<u32>, Bytes, Bytes]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    rmrkEquip: {
      /**
       * Create a new Base.
       * 
       * Modeled after the [Base interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/base.md)
       * 
       * # Permissions
       * - Anyone - will be assigned as the issuer of the Base.
       * 
       * # Arguments:
       * - `origin`: Caller, will be assigned as the issuer of the Base
       * - `base_type`: Arbitrary media type, e.g. "svg".
       * - `symbol`: Arbitrary client-chosen symbol.
       * - `parts`: Array of Fixed and Slot Parts composing the Base,
       * confined in length by [`RmrkPartsLimit`](up_data_structs::RmrkPartsLimit).
       **/
      createBase: AugmentedSubmittable<(baseType: Bytes | string | Uint8Array, symbol: Bytes | string | Uint8Array, parts: Vec<RmrkTraitsPartPartType> | (RmrkTraitsPartPartType | { FixedPart: any } | { SlotPart: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Bytes, Bytes, Vec<RmrkTraitsPartPartType>]>;
      /**
       * Update the array of Collections allowed to be equipped to a Base's specified Slot Part.
       * 
       * Modeled after [equippable interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/equippable.md).
       * 
       * # Permissions:
       * - Base issuer
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `base_id`: Base containing the Slot Part to be updated.
       * - `slot_id`: Slot Part whose Equippable List is being updated .
       * - `equippables`: List of equippables that will override the current Equippables list.
       **/
      equippable: AugmentedSubmittable<(baseId: u32 | AnyNumber | Uint8Array, slotId: u32 | AnyNumber | Uint8Array, equippables: RmrkTraitsPartEquippableList | { All: any } | { Empty: any } | { Custom: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, RmrkTraitsPartEquippableList]>;
      /**
       * Add a Theme to a Base.
       * A Theme named "default" is required prior to adding other Themes.
       * 
       * Modeled after [Themeadd interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/themeadd.md).
       * 
       * # Permissions:
       * - Base issuer
       * 
       * # Arguments:
       * - `origin`: sender of the transaction
       * - `base_id`: Base ID containing the Theme to be updated.
       * - `theme`: Theme to add to the Base.  A Theme has a name and properties, which are an
       * array of [key, value, inherit].
       * - `key`: Arbitrary BoundedString, defined by client.
       * - `value`: Arbitrary BoundedString, defined by client.
       * - `inherit`: Optional bool.
       **/
      themeAdd: AugmentedSubmittable<(baseId: u32 | AnyNumber | Uint8Array, theme: RmrkTraitsTheme | { name?: any; properties?: any; inherit?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, RmrkTraitsTheme]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    scheduler: {
      /**
       * Cancel a named scheduled task.
       **/
      cancelNamed: AugmentedSubmittable<(id: U8aFixed | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [U8aFixed]>;
      /**
       * Schedule a named task.
       **/
      scheduleNamed: AugmentedSubmittable<(id: U8aFixed | string | Uint8Array, when: u32 | AnyNumber | Uint8Array, maybePeriodic: Option<ITuple<[u32, u32]>> | null | object | string | Uint8Array, priority: u8 | AnyNumber | Uint8Array, call: FrameSupportScheduleMaybeHashed | { Value: any } | { Hash: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [U8aFixed, u32, Option<ITuple<[u32, u32]>>, u8, FrameSupportScheduleMaybeHashed]>;
      /**
       * Schedule a named task after a delay.
       * 
       * # <weight>
       * Same as [`schedule_named`](Self::schedule_named).
       * # </weight>
       **/
      scheduleNamedAfter: AugmentedSubmittable<(id: U8aFixed | string | Uint8Array, after: u32 | AnyNumber | Uint8Array, maybePeriodic: Option<ITuple<[u32, u32]>> | null | object | string | Uint8Array, priority: u8 | AnyNumber | Uint8Array, call: FrameSupportScheduleMaybeHashed | { Value: any } | { Hash: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [U8aFixed, u32, Option<ITuple<[u32, u32]>>, u8, FrameSupportScheduleMaybeHashed]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    structure: {
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    sudo: {
      /**
       * Authenticates the current sudo key and sets the given AccountId (`new`) as the new sudo
       * key.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB change.
       * # </weight>
       **/
      setKey: AugmentedSubmittable<(updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + 10,000.
       * # </weight>
       **/
      sudo: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Signed` origin from
       * a given account.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + 10,000.
       * # </weight>
       **/
      sudoAs: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Call]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       * This function does not check the weight of the call, and instead allows the
       * Sudo user to specify the weight of the call.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - The weight of this call is defined by the caller.
       * # </weight>
       **/
      sudoUncheckedWeight: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array, weight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call, u64]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    system: {
      /**
       * A dispatch that will fill the block weight up to the given ratio.
       **/
      fillBlock: AugmentedSubmittable<(ratio: Perbill | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Perbill]>;
      /**
       * Kill all storage items with a key that starts with the given prefix.
       * 
       * **NOTE:** We rely on the Root origin to provide us the number of subkeys under
       * the prefix we are removing to accurately calculate the weight of this function.
       **/
      killPrefix: AugmentedSubmittable<(prefix: Bytes | string | Uint8Array, subkeys: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes, u32]>;
      /**
       * Kill some items from storage.
       **/
      killStorage: AugmentedSubmittable<(keys: Vec<Bytes> | (Bytes | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Bytes>]>;
      /**
       * Make some on-chain remark.
       * 
       * # <weight>
       * - `O(1)`
       * # </weight>
       **/
      remark: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Make some on-chain remark and emit event.
       **/
      remarkWithEvent: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code.
       * 
       * # <weight>
       * - `O(C + S)` where `C` length of `code` and `S` complexity of `can_set_code`
       * - 1 call to `can_set_code`: `O(S)` (calls `sp_io::misc::runtime_version` which is
       * expensive).
       * - 1 storage write (codec `O(C)`).
       * - 1 digest item.
       * - 1 event.
       * The weight of this function is dependent on the runtime, but generally this is very
       * expensive. We will treat this as a full block.
       * # </weight>
       **/
      setCode: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code without doing any checks of the given `code`.
       * 
       * # <weight>
       * - `O(C)` where `C` length of `code`
       * - 1 storage write (codec `O(C)`).
       * - 1 digest item.
       * - 1 event.
       * The weight of this function is dependent on the runtime. We will treat this as a full
       * block. # </weight>
       **/
      setCodeWithoutChecks: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the number of pages in the WebAssembly environment's heap.
       **/
      setHeapPages: AugmentedSubmittable<(pages: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Set some items of storage.
       **/
      setStorage: AugmentedSubmittable<(items: Vec<ITuple<[Bytes, Bytes]>> | ([Bytes | string | Uint8Array, Bytes | string | Uint8Array])[]) => SubmittableExtrinsic<ApiType>, [Vec<ITuple<[Bytes, Bytes]>>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    timestamp: {
      /**
       * Set the current time.
       * 
       * This call should be invoked exactly once per block. It will panic at the finalization
       * phase, if this call hasn't been invoked by that time.
       * 
       * The timestamp should be greater than the previous one by the amount specified by
       * `MinimumPeriod`.
       * 
       * The dispatch origin for this call must be `Inherent`.
       * 
       * # <weight>
       * - `O(1)` (Note that implementations of `OnTimestampSet` must also be `O(1)`)
       * - 1 storage read and 1 storage mutation (codec `O(1)`). (because of `DidUpdate::take` in
       * `on_finalize`)
       * - 1 event handler `on_timestamp_set`. Must be `O(1)`.
       * # </weight>
       **/
      set: AugmentedSubmittable<(now: Compact<u64> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u64>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    tokens: {
      /**
       * Exactly as `transfer`, except the origin must be root and the source
       * account may be specified.
       * 
       * The dispatch origin for this call must be _Root_.
       * 
       * - `source`: The sender of the transfer.
       * - `dest`: The recipient of the transfer.
       * - `currency_id`: currency type.
       * - `amount`: free balance amount to tranfer.
       **/
      forceTransfer: AugmentedSubmittable<(source: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress, PalletForeingAssetsAssetIds, Compact<u128>]>;
      /**
       * Set the balances of a given account.
       * 
       * This will alter `FreeBalance` and `ReservedBalance` in storage. it
       * will also decrease the total issuance of the system
       * (`TotalIssuance`). If the new free or reserved balance is below the
       * existential deposit, it will reap the `AccountInfo`.
       * 
       * The dispatch origin for this call is `root`.
       **/
      setBalance: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, newFree: Compact<u128> | AnyNumber | Uint8Array, newReserved: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeingAssetsAssetIds, Compact<u128>, Compact<u128>]>;
      /**
       * Transfer some liquid free balance to another account.
       * 
       * `transfer` will set the `FreeBalance` of the sender and receiver.
       * It will decrease the total issuance of the system by the
       * `TransferFee`. If the sender's account is below the existential
       * deposit as a result of the transfer, the account will be reaped.
       * 
       * The dispatch origin for this call must be `Signed` by the
       * transactor.
       * 
       * - `dest`: The recipient of the transfer.
       * - `currency_id`: currency type.
       * - `amount`: free balance amount to tranfer.
       **/
      transfer: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeingAssetsAssetIds, Compact<u128>]>;
      /**
       * Transfer all remaining balance to the given account.
       * 
       * NOTE: This function only attempts to transfer _transferable_
       * balances. This means that any locked, reserved, or existential
       * deposits (when `keep_alive` is `true`), will not be transferred by
       * this function. To ensure that this function results in a killed
       * account, you might need to prepare the account by removing any
       * reference counters, storage deposits, etc...
       * 
       * The dispatch origin for this call must be `Signed` by the
       * transactor.
       * 
       * - `dest`: The recipient of the transfer.
       * - `currency_id`: currency type.
       * - `keep_alive`: A boolean to determine if the `transfer_all`
       * operation should send all of the funds the account has, causing
       * the sender account to be killed (false), or transfer everything
       * except at least the existential deposit, which will guarantee to
       * keep the sender account alive (true).
       **/
      transferAll: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, keepAlive: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeingAssetsAssetIds, bool]>;
      /**
       * Same as the [`transfer`] call, but with a check that the transfer
       * will not kill the origin account.
       * 
       * 99% of the time you want [`transfer`] instead.
       * 
       * The dispatch origin for this call must be `Signed` by the
       * transactor.
       * 
       * - `dest`: The recipient of the transfer.
       * - `currency_id`: currency type.
       * - `amount`: free balance amount to tranfer.
       **/
      transferKeepAlive: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeingAssetsAssetIds, Compact<u128>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    treasury: {
      /**
       * Approve a proposal. At a later time, the proposal will be allocated to the beneficiary
       * and the original deposit will be returned.
       * 
       * May only be called from `T::ApproveOrigin`.
       * 
       * # <weight>
       * - Complexity: O(1).
       * - DbReads: `Proposals`, `Approvals`
       * - DbWrite: `Approvals`
       * # </weight>
       **/
      approveProposal: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Put forward a suggestion for spending. A deposit proportional to the value
       * is reserved and slashed if the proposal is rejected. It is returned once the
       * proposal is awarded.
       * 
       * # <weight>
       * - Complexity: O(1)
       * - DbReads: `ProposalCount`, `origin account`
       * - DbWrites: `ProposalCount`, `Proposals`, `origin account`
       * # </weight>
       **/
      proposeSpend: AugmentedSubmittable<(value: Compact<u128> | AnyNumber | Uint8Array, beneficiary: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u128>, MultiAddress]>;
      /**
       * Reject a proposed spend. The original deposit will be slashed.
       * 
       * May only be called from `T::RejectOrigin`.
       * 
       * # <weight>
       * - Complexity: O(1)
       * - DbReads: `Proposals`, `rejected proposer account`
       * - DbWrites: `Proposals`, `rejected proposer account`
       * # </weight>
       **/
      rejectProposal: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Force a previously approved proposal to be removed from the approval queue.
       * The original deposit will no longer be returned.
       * 
       * May only be called from `T::RejectOrigin`.
       * - `proposal_id`: The index of a proposal
       * 
       * # <weight>
       * - Complexity: O(A) where `A` is the number of approvals
       * - Db reads and writes: `Approvals`
       * # </weight>
       * 
       * Errors:
       * - `ProposalNotApproved`: The `proposal_id` supplied was not found in the approval queue,
       * i.e., the proposal has not been approved. This could also mean the proposal does not
       * exist altogether, thus there is no way it would have been approved in the first place.
       **/
      removeApproval: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Propose and approve a spend of treasury funds.
       * 
       * - `origin`: Must be `SpendOrigin` with the `Success` value being at least `amount`.
       * - `amount`: The amount to be transferred from the treasury to the `beneficiary`.
       * - `beneficiary`: The destination account for the transfer.
       * 
       * NOTE: For record-keeping purposes, the proposer is deemed to be equivalent to the
       * beneficiary.
       **/
      spend: AugmentedSubmittable<(amount: Compact<u128> | AnyNumber | Uint8Array, beneficiary: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u128>, MultiAddress]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    unique: {
      /**
       * Add an admin to a collection.
       * 
       * NFT Collection can be controlled by multiple admin addresses
       * (some which can also be servers, for example). Admins can issue
       * and burn NFTs, as well as add and remove other admins,
       * but cannot change NFT or Collection ownership.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the Collection to add an admin for.
       * * `new_admin`: Address of new admin to add.
       **/
      addCollectionAdmin: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, newAdminId: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Add an address to allow list.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `address`: ID of the address to be added to the allowlist.
       **/
      addToAllowList: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, address: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Allow a non-permissioned address to transfer or burn an item.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Current item owner
       * 
       * # Arguments
       * 
       * * `spender`: Account to be approved to make specific transactions on non-owned tokens.
       * * `collection_id`: ID of the collection the item belongs to.
       * * `item_id`: ID of the item transactions on which are now approved.
       * * `amount`: Number of pieces of the item approved for a transaction (maximum of 1 for NFTs).
       * Set to 0 to revoke the approval.
       **/
      approve: AugmentedSubmittable<(spender: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, collectionId: u32 | AnyNumber | Uint8Array, itemId: u32 | AnyNumber | Uint8Array, amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletEvmAccountBasicCrossAccountIdRepr, u32, u32, u128]>;
      /**
       * Destroy a token on behalf of the owner as a non-owner account.
       * 
       * See also: [`approve`][`Pallet::approve`].
       * 
       * After this method executes, one approval is removed from the total so that
       * the approved address will not be able to transfer this item again from this owner.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Current token owner
       * * Address approved by current item owner
       * 
       * # Arguments
       * 
       * * `from`: The owner of the burning item.
       * * `collection_id`: ID of the collection to which the item belongs.
       * * `item_id`: ID of item to burn.
       * * `value`: Number of pieces to burn.
       * * Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
       * * Fungible Mode: The desired number of pieces to burn.
       * * Re-Fungible Mode: The desired number of pieces to burn.
       **/
      burnFrom: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, from: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, itemId: u32 | AnyNumber | Uint8Array, value: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr, u32, u128]>;
      /**
       * Destroy an item.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Current item owner
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection to which the item belongs.
       * * `item_id`: ID of item to burn.
       * * `value`: Number of pieces of the item to destroy.
       * * Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
       * * Fungible Mode: The desired number of pieces to burn.
       * * Re-Fungible Mode: The desired number of pieces to burn.
       **/
      burnItem: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, itemId: u32 | AnyNumber | Uint8Array, value: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, u128]>;
      /**
       * Change the owner of the collection.
       * 
       * # Permissions
       * 
       * * Collection owner
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `new_owner`: ID of the account that will become the owner.
       **/
      changeCollectionOwner: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, newOwner: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, AccountId32]>;
      /**
       * Confirm own sponsorship of a collection, becoming the sponsor.
       * 
       * An invitation must be pending, see [`set_collection_sponsor`][`Pallet::set_collection_sponsor`].
       * Sponsor can pay the fees of a transaction instead of the sender,
       * but only within specified limits.
       * 
       * # Permissions
       * 
       * * Sponsor-to-be
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection with the pending sponsor.
       **/
      confirmSponsorship: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Create a collection of tokens.
       * 
       * Each Token may have multiple properties encoded as an array of bytes
       * of certain length. The initial owner of the collection is set
       * to the address that signed the transaction and can be changed later.
       * 
       * Prefer the more advanced [`create_collection_ex`][`Pallet::create_collection_ex`] instead.
       * 
       * # Permissions
       * 
       * * Anyone - becomes the owner of the new collection.
       * 
       * # Arguments
       * 
       * * `collection_name`: Wide-character string with collection name
       * (limit [`MAX_COLLECTION_NAME_LENGTH`]).
       * * `collection_description`: Wide-character string with collection description
       * (limit [`MAX_COLLECTION_DESCRIPTION_LENGTH`]).
       * * `token_prefix`: Byte string containing the token prefix to mark a collection
       * to which a token belongs (limit [`MAX_TOKEN_PREFIX_LENGTH`]).
       * * `mode`: Type of items stored in the collection and type dependent data.
       **/
      createCollection: AugmentedSubmittable<(collectionName: Vec<u16> | (u16 | AnyNumber | Uint8Array)[], collectionDescription: Vec<u16> | (u16 | AnyNumber | Uint8Array)[], tokenPrefix: Bytes | string | Uint8Array, mode: UpDataStructsCollectionMode | { NFT: any } | { Fungible: any } | { ReFungible: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Vec<u16>, Vec<u16>, Bytes, UpDataStructsCollectionMode]>;
      /**
       * Create a collection with explicit parameters.
       * 
       * Prefer it to the deprecated [`create_collection`][`Pallet::create_collection`] method.
       * 
       * # Permissions
       * 
       * * Anyone - becomes the owner of the new collection.
       * 
       * # Arguments
       * 
       * * `data`: Explicit data of a collection used for its creation.
       **/
      createCollectionEx: AugmentedSubmittable<(data: UpDataStructsCreateCollectionData | { mode?: any; access?: any; name?: any; description?: any; tokenPrefix?: any; pendingSponsor?: any; limits?: any; permissions?: any; tokenPropertyPermissions?: any; properties?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [UpDataStructsCreateCollectionData]>;
      /**
       * Mint an item within a collection.
       * 
       * A collection must exist first, see [`create_collection_ex`][`Pallet::create_collection_ex`].
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Anyone if
       * * Allow List is enabled, and
       * * Address is added to allow list, and
       * * MintPermission is enabled (see [`set_collection_permissions`][`Pallet::set_collection_permissions`])
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection to which an item would belong.
       * * `owner`: Address of the initial owner of the item.
       * * `data`: Token data describing the item to store on chain.
       **/
      createItem: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, owner: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, data: UpDataStructsCreateItemData | { NFT: any } | { Fungible: any } | { ReFungible: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr, UpDataStructsCreateItemData]>;
      /**
       * Create multiple items within a collection.
       * 
       * A collection must exist first, see [`create_collection_ex`][`Pallet::create_collection_ex`].
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Anyone if
       * * Allow List is enabled, and
       * * Address is added to the allow list, and
       * * MintPermission is enabled (see [`set_collection_permissions`][`Pallet::set_collection_permissions`])
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection to which the tokens would belong.
       * * `owner`: Address of the initial owner of the tokens.
       * * `items_data`: Vector of data describing each item to be created.
       **/
      createMultipleItems: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, owner: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, itemsData: Vec<UpDataStructsCreateItemData> | (UpDataStructsCreateItemData | { NFT: any } | { Fungible: any } | { ReFungible: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr, Vec<UpDataStructsCreateItemData>]>;
      /**
       * Create multiple items within a collection with explicitly specified initial parameters.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Anyone if
       * * Allow List is enabled, and
       * * Address is added to allow list, and
       * * MintPermission is enabled (see [`set_collection_permissions`][`Pallet::set_collection_permissions`])
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection to which the tokens would belong.
       * * `data`: Explicit item creation data.
       **/
      createMultipleItemsEx: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, data: UpDataStructsCreateItemExData | { NFT: any } | { Fungible: any } | { RefungibleMultipleItems: any } | { RefungibleMultipleOwners: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, UpDataStructsCreateItemExData]>;
      /**
       * Delete specified collection properties.
       * 
       * # Permissions
       * 
       * * Collection Owner
       * * Collection Admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `property_keys`: Vector of keys of the properties to be deleted.
       * Keys support Latin letters, `-`, `_`, and `.` as symbols.
       **/
      deleteCollectionProperties: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, propertyKeys: Vec<Bytes> | (Bytes | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [u32, Vec<Bytes>]>;
      /**
       * Delete specified token properties. Currently properties only work with NFTs.
       * 
       * # Permissions
       * 
       * * Depends on collection's token property permissions and specified property mutability:
       * * Collection owner
       * * Collection admin
       * * Token owner
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection to which the token belongs.
       * * `token_id`: ID of the modified token.
       * * `property_keys`: Vector of keys of the properties to be deleted.
       * Keys support Latin letters, `-`, `_`, and `.` as symbols.
       **/
      deleteTokenProperties: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, tokenId: u32 | AnyNumber | Uint8Array, propertyKeys: Vec<Bytes> | (Bytes | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [u32, u32, Vec<Bytes>]>;
      /**
       * Destroy a collection if no tokens exist within.
       * 
       * # Permissions
       * 
       * * Collection owner
       * 
       * # Arguments
       * 
       * * `collection_id`: Collection to destroy.
       **/
      destroyCollection: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Remove admin of a collection.
       * 
       * An admin address can remove itself. List of admins may become empty,
       * in which case only Collection Owner will be able to add an Admin.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection to remove the admin for.
       * * `account_id`: Address of the admin to remove.
       **/
      removeCollectionAdmin: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, accountId: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Remove a collection's a sponsor, making everyone pay for their own transactions.
       * 
       * # Permissions
       * 
       * * Collection owner
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection with the sponsor to remove.
       **/
      removeCollectionSponsor: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Remove an address from allow list.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `address`: ID of the address to be removed from the allowlist.
       **/
      removeFromAllowList: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, address: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Re-partition a refungible token, while owning all of its parts/pieces.
       * 
       * # Permissions
       * 
       * * Token owner (must own every part)
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection the RFT belongs to.
       * * `token_id`: ID of the RFT.
       * * `amount`: New number of parts/pieces into which the token shall be partitioned.
       **/
      repartition: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, tokenId: u32 | AnyNumber | Uint8Array, amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32, u128]>;
      /**
       * Set specific limits of a collection. Empty, or None fields mean chain default.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `new_limit`: New limits of the collection. Fields that are not set (None)
       * will not overwrite the old ones.
       **/
      setCollectionLimits: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, newLimit: UpDataStructsCollectionLimits | { accountTokenOwnershipLimit?: any; sponsoredDataSize?: any; sponsoredDataRateLimit?: any; tokenLimit?: any; sponsorTransferTimeout?: any; sponsorApproveTimeout?: any; ownerCanTransfer?: any; ownerCanDestroy?: any; transfersEnabled?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, UpDataStructsCollectionLimits]>;
      /**
       * Set specific permissions of a collection. Empty, or None fields mean chain default.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `new_permission`: New permissions of the collection. Fields that are not set (None)
       * will not overwrite the old ones.
       **/
      setCollectionPermissions: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, newPermission: UpDataStructsCollectionPermissions | { access?: any; mintMode?: any; nesting?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, UpDataStructsCollectionPermissions]>;
      /**
       * Add or change collection properties.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `properties`: Vector of key-value pairs stored as the collection's metadata.
       * Keys support Latin letters, `-`, `_`, and `.` as symbols.
       **/
      setCollectionProperties: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, properties: Vec<UpDataStructsProperty> | (UpDataStructsProperty | { key?: any; value?: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [u32, Vec<UpDataStructsProperty>]>;
      /**
       * Set (invite) a new collection sponsor.
       * 
       * If successful, confirmation from the sponsor-to-be will be pending.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `new_sponsor`: ID of the account of the sponsor-to-be.
       **/
      setCollectionSponsor: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, newSponsor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, AccountId32]>;
      /**
       * Add or change token properties according to collection's permissions.
       * Currently properties only work with NFTs.
       * 
       * # Permissions
       * 
       * * Depends on collection's token property permissions and specified property mutability:
       * * Collection owner
       * * Collection admin
       * * Token owner
       * 
       * See [`set_token_property_permissions`][`Pallet::set_token_property_permissions`].
       * 
       * # Arguments
       * 
       * * `collection_id: ID of the collection to which the token belongs.
       * * `token_id`: ID of the modified token.
       * * `properties`: Vector of key-value pairs stored as the token's metadata.
       * Keys support Latin letters, `-`, `_`, and `.` as symbols.
       **/
      setTokenProperties: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, tokenId: u32 | AnyNumber | Uint8Array, properties: Vec<UpDataStructsProperty> | (UpDataStructsProperty | { key?: any; value?: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [u32, u32, Vec<UpDataStructsProperty>]>;
      /**
       * Add or change token property permissions of a collection.
       * 
       * Without a permission for a particular key, a property with that key
       * cannot be created in a token.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the modified collection.
       * * `property_permissions`: Vector of permissions for property keys.
       * Keys support Latin letters, `-`, `_`, and `.` as symbols.
       **/
      setTokenPropertyPermissions: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, propertyPermissions: Vec<UpDataStructsPropertyKeyPermission> | (UpDataStructsPropertyKeyPermission | { key?: any; permission?: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [u32, Vec<UpDataStructsPropertyKeyPermission>]>;
      /**
       * Completely allow or disallow transfers for a particular collection.
       * 
       * # Permissions
       * 
       * * Collection owner
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection.
       * * `value`: New value of the flag, are transfers allowed?
       **/
      setTransfersEnabledFlag: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, value: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, bool]>;
      /**
       * Change ownership of the token.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Current token owner
       * 
       * # Arguments
       * 
       * * `recipient`: Address of token recipient.
       * * `collection_id`: ID of the collection the item belongs to.
       * * `item_id`: ID of the item.
       * * Non-Fungible Mode: Required.
       * * Fungible Mode: Ignored.
       * * Re-Fungible Mode: Required.
       * 
       * * `value`: Amount to transfer.
       * * Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
       * * Fungible Mode: The desired number of pieces to transfer.
       * * Re-Fungible Mode: The desired number of pieces to transfer.
       **/
      transfer: AugmentedSubmittable<(recipient: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, collectionId: u32 | AnyNumber | Uint8Array, itemId: u32 | AnyNumber | Uint8Array, value: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletEvmAccountBasicCrossAccountIdRepr, u32, u32, u128]>;
      /**
       * Change ownership of an item on behalf of the owner as a non-owner account.
       * 
       * See the [`approve`][`Pallet::approve`] method for additional information.
       * 
       * After this method executes, one approval is removed from the total so that
       * the approved address will not be able to transfer this item again from this owner.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Current item owner
       * * Address approved by current item owner
       * 
       * # Arguments
       * 
       * * `from`: Address that currently owns the token.
       * * `recipient`: Address of the new token-owner-to-be.
       * * `collection_id`: ID of the collection the item.
       * * `item_id`: ID of the item to be transferred.
       * * `value`: Amount to transfer.
       * * Non-Fungible Mode: An NFT is indivisible, there is always 1 corresponding to an ID.
       * * Fungible Mode: The desired number of pieces to transfer.
       * * Re-Fungible Mode: The desired number of pieces to transfer.
       **/
      transferFrom: AugmentedSubmittable<(from: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, recipient: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, collectionId: u32 | AnyNumber | Uint8Array, itemId: u32 | AnyNumber | Uint8Array, value: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, u32, u32, u128]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    vesting: {
      claim: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      claimFor: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      updateVestingSchedules: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, vestingSchedules: Vec<OrmlVestingVestingSchedule> | (OrmlVestingVestingSchedule | { start?: any; period?: any; periodCount?: any; perPeriod?: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [MultiAddress, Vec<OrmlVestingVestingSchedule>]>;
      vestedTransfer: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, schedule: OrmlVestingVestingSchedule | { start?: any; period?: any; periodCount?: any; perPeriod?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, OrmlVestingVestingSchedule]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    xcmpQueue: {
      /**
       * Resumes all XCM executions for the XCMP queue.
       * 
       * Note that this function doesn't change the status of the in/out bound channels.
       * 
       * - `origin`: Must pass `ControllerOrigin`.
       **/
      resumeXcmExecution: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Services a single overweight XCM.
       * 
       * - `origin`: Must pass `ExecuteOverweightOrigin`.
       * - `index`: The index of the overweight XCM to service
       * - `weight_limit`: The amount of weight that XCM execution may take.
       * 
       * Errors:
       * - `BadOverweightIndex`: XCM under `index` is not found in the `Overweight` storage map.
       * - `BadXcm`: XCM under `index` cannot be properly decoded into a valid XCM format.
       * - `WeightOverLimit`: XCM execution may use greater `weight_limit`.
       * 
       * Events:
       * - `OverweightServiced`: On success.
       **/
      serviceOverweight: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array, weightLimit: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, u64]>;
      /**
       * Suspends all XCM executions for the XCMP queue, regardless of the sender's origin.
       * 
       * - `origin`: Must pass `ControllerOrigin`.
       **/
      suspendXcmExecution: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Overwrites the number of pages of messages which must be in the queue after which we drop any further
       * messages from the channel.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.drop_threshold`
       **/
      updateDropThreshold: AugmentedSubmittable<(updated: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Overwrites the number of pages of messages which the queue must be reduced to before it signals that
       * message sending may recommence after it has been suspended.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.resume_threshold`
       **/
      updateResumeThreshold: AugmentedSubmittable<(updated: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Overwrites the number of pages of messages which must be in the queue for the other side to be told to
       * suspend their sending.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.suspend_value`
       **/
      updateSuspendThreshold: AugmentedSubmittable<(updated: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Overwrites the amount of remaining weight under which we stop processing messages.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.threshold_weight`
       **/
      updateThresholdWeight: AugmentedSubmittable<(updated: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Overwrites the speed to which the available weight approaches the maximum weight.
       * A lower number results in a faster progression. A value of 1 makes the entire weight available initially.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.weight_restrict_decay`.
       **/
      updateWeightRestrictDecay: AugmentedSubmittable<(updated: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Overwrite the maximum amount of weight any individual message may consume.
       * Messages above this weight go into the overweight queue and may only be serviced explicitly.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.xcmp_max_individual_weight`.
       **/
      updateXcmpMaxIndividualWeight: AugmentedSubmittable<(updated: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    xTokens: {
      /**
       * Transfer native currencies.
       * 
       * `dest_weight` is the weight for XCM execution on the dest chain, and
       * it would be charged from the transferred assets. If set below
       * requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transfer: AugmentedSubmittable<(currencyId: PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: u128 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, destWeight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletForeingAssetsAssetIds, u128, XcmVersionedMultiLocation, u64]>;
      /**
       * Transfer `MultiAsset`.
       * 
       * `dest_weight` is the weight for XCM execution on the dest chain, and
       * it would be charged from the transferred assets. If set below
       * requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transferMultiasset: AugmentedSubmittable<(asset: XcmVersionedMultiAsset | { V0: any } | { V1: any } | string | Uint8Array, dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, destWeight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiAsset, XcmVersionedMultiLocation, u64]>;
      /**
       * Transfer several `MultiAsset` specifying the item to be used as fee
       * 
       * `dest_weight` is the weight for XCM execution on the dest chain, and
       * it would be charged from the transferred assets. If set below
       * requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * `fee_item` is index of the MultiAssets that we want to use for
       * payment
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transferMultiassets: AugmentedSubmittable<(assets: XcmVersionedMultiAssets | { V0: any } | { V1: any } | string | Uint8Array, feeItem: u32 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, destWeight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiAssets, u32, XcmVersionedMultiLocation, u64]>;
      /**
       * Transfer `MultiAsset` specifying the fee and amount as separate.
       * 
       * `dest_weight` is the weight for XCM execution on the dest chain, and
       * it would be charged from the transferred assets. If set below
       * requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * `fee` is the multiasset to be spent to pay for execution in
       * destination chain. Both fee and amount will be subtracted form the
       * callers balance For now we only accept fee and asset having the same
       * `MultiLocation` id.
       * 
       * If `fee` is not high enough to cover for the execution costs in the
       * destination chain, then the assets will be trapped in the
       * destination chain
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transferMultiassetWithFee: AugmentedSubmittable<(asset: XcmVersionedMultiAsset | { V0: any } | { V1: any } | string | Uint8Array, fee: XcmVersionedMultiAsset | { V0: any } | { V1: any } | string | Uint8Array, dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, destWeight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiAsset, XcmVersionedMultiAsset, XcmVersionedMultiLocation, u64]>;
      /**
       * Transfer several currencies specifying the item to be used as fee
       * 
       * `dest_weight` is the weight for XCM execution on the dest chain, and
       * it would be charged from the transferred assets. If set below
       * requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * `fee_item` is index of the currencies tuple that we want to use for
       * payment
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transferMulticurrencies: AugmentedSubmittable<(currencies: Vec<ITuple<[PalletForeingAssetsAssetIds, u128]>> | ([PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, u128 | AnyNumber | Uint8Array])[], feeItem: u32 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, destWeight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Vec<ITuple<[PalletForeingAssetsAssetIds, u128]>>, u32, XcmVersionedMultiLocation, u64]>;
      /**
       * Transfer native currencies specifying the fee and amount as
       * separate.
       * 
       * `dest_weight` is the weight for XCM execution on the dest chain, and
       * it would be charged from the transferred assets. If set below
       * requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * `fee` is the amount to be spent to pay for execution in destination
       * chain. Both fee and amount will be subtracted form the callers
       * balance.
       * 
       * If `fee` is not high enough to cover for the execution costs in the
       * destination chain, then the assets will be trapped in the
       * destination chain
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transferWithFee: AugmentedSubmittable<(currencyId: PalletForeingAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: u128 | AnyNumber | Uint8Array, fee: u128 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V0: any } | { V1: any } | string | Uint8Array, destWeight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletForeingAssetsAssetIds, u128, u128, XcmVersionedMultiLocation, u64]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
  } // AugmentedSubmittables
} // declare module
