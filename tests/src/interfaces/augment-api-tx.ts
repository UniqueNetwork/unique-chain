// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/submittable';

import type { ApiTypes, AugmentedSubmittable, SubmittableExtrinsic, SubmittableExtrinsicFunction } from '@polkadot/api-base/types';
import type { Data } from '@polkadot/types';
import type { Bytes, Compact, Option, U256, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { AnyNumber, IMethod, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H160, H256, MultiAddress } from '@polkadot/types/interfaces/runtime';
import type { CumulusPrimitivesParachainInherentParachainInherentData, EthereumLog, EthereumTransactionTransactionV2, OpalRuntimeRuntimeCommonSessionKeys, OrmlVestingVestingSchedule, PalletConfigurationAppPromotionConfiguration, PalletEvmAccountBasicCrossAccountIdRepr, PalletForeignAssetsAssetIds, PalletForeignAssetsModuleAssetMetadata, PalletIdentityBitFlags, PalletIdentityIdentityInfo, PalletIdentityJudgement, PalletIdentityRegistration, SpWeightsWeightV2Weight, UpDataStructsCollectionLimits, UpDataStructsCollectionMode, UpDataStructsCollectionPermissions, UpDataStructsCreateCollectionData, UpDataStructsCreateItemData, UpDataStructsCreateItemExData, UpDataStructsProperty, UpDataStructsPropertyKeyPermission, XcmV3MultiLocation, XcmV3WeightLimit, XcmVersionedMultiAsset, XcmVersionedMultiAssets, XcmVersionedMultiLocation, XcmVersionedXcm } from '@polkadot/types/lookup';

export type __AugmentedSubmittable = AugmentedSubmittable<() => unknown>;
export type __SubmittableExtrinsic<ApiType extends ApiTypes> = SubmittableExtrinsic<ApiType>;
export type __SubmittableExtrinsicFunction<ApiType extends ApiTypes> = SubmittableExtrinsicFunction<ApiType>;

declare module '@polkadot/api-base/types/submittable' {
  interface AugmentedSubmittables<ApiType extends ApiTypes> {
    appPromotion: {
      /**
       * Recalculates interest for the specified number of stakers.
       * If all stakers are not recalculated, the next call of the extrinsic
       * will continue the recalculation, from those stakers for whom this
       * was not perform in last call.
       * 
       * # Permissions
       * 
       * * Pallet admin
       * 
       * # Arguments
       * 
       * * `stakers_number`: the number of stakers for which recalculation will be performed
       **/
      payoutStakers: AugmentedSubmittable<(stakersNumber: Option<u8> | null | Uint8Array | u8 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u8>]>;
      /**
       * Sets an address as the the admin.
       * 
       * # Permissions
       * 
       * * Sudo
       * 
       * # Arguments
       * 
       * * `admin`: account of the new admin.
       **/
      setAdminAddress: AugmentedSubmittable<(admin: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletEvmAccountBasicCrossAccountIdRepr]>;
      /**
       * Sets the pallet to be the sponsor for the collection.
       * 
       * # Permissions
       * 
       * * Pallet admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection that will be sponsored by `pallet_id`
       **/
      sponsorCollection: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Sets the pallet to be the sponsor for the contract.
       * 
       * # Permissions
       * 
       * * Pallet admin
       * 
       * # Arguments
       * 
       * * `contract_id`: the contract address that will be sponsored by `pallet_id`
       **/
      sponsorContract: AugmentedSubmittable<(contractId: H160 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160]>;
      /**
       * Stakes the amount of native tokens.
       * Sets `amount` to the locked state.
       * The maximum number of stakes for a staker is 10.
       * 
       * # Arguments
       * 
       * * `amount`: in native tokens.
       **/
      stake: AugmentedSubmittable<(amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Removes the pallet as the sponsor for the collection.
       * Returns [`NoPermission`][`Error::NoPermission`]
       * if the pallet wasn't the sponsor.
       * 
       * # Permissions
       * 
       * * Pallet admin
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection that is sponsored by `pallet_id`
       **/
      stopSponsoringCollection: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Removes the pallet as the sponsor for the contract.
       * Returns [`NoPermission`][`Error::NoPermission`]
       * if the pallet wasn't the sponsor.
       * 
       * # Permissions
       * 
       * * Pallet admin
       * 
       * # Arguments
       * 
       * * `contract_id`: the contract address that is sponsored by `pallet_id`
       **/
      stopSponsoringContract: AugmentedSubmittable<(contractId: H160 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160]>;
      /**
       * Unstakes all stakes.
       * After the end of `PendingInterval` this sum becomes completely
       * free for further use.
       **/
      unstakeAll: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Unstakes the amount of balance for the staker.
       * After the end of `PendingInterval` this sum becomes completely
       * free for further use.
       * 
       * # Arguments
       * 
       * * `staker`: staker account.
       * * `amount`: amount of unstaked funds.
       **/
      unstakePartial: AugmentedSubmittable<(amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    balances: {
      /**
       * Exactly as `transfer`, except the origin must be root and the source account may be
       * specified.
       * ## Complexity
       * - Same as transfer, but additional read and write because the source account is not
       * assumed to be in the overlay.
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
       * ## Complexity
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
       * keep the sender account alive (true). ## Complexity
       * - O(1). Just like transfer, but reading the user's transferable balance first.
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
    collatorSelection: {
      /**
       * Add a collator to the list of invulnerable (fixed) collators.
       **/
      addInvulnerable: AugmentedSubmittable<(updated: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32]>;
      /**
       * Force deregister `origin` as a collator candidate as a governing authority, and revoke its license.
       * Note that the collator can only leave on session change.
       * The `LicenseBond` will be unreserved and returned immediately.
       * 
       * This call is, of course, not applicable to `Invulnerable` collators.
       **/
      forceReleaseLicense: AugmentedSubmittable<(who: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32]>;
      /**
       * Purchase a license on block collation for this account.
       * It does not make it a collator candidate, use `onboard` afterward. The account must
       * (a) already have registered session keys and (b) be able to reserve the `LicenseBond`.
       * 
       * This call is not available to `Invulnerable` collators.
       **/
      getLicense: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Deregister `origin` as a collator candidate. Note that the collator can only leave on
       * session change. The license to `onboard` later at any other time will remain.
       **/
      offboard: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Register this account as a candidate for collators for next sessions.
       * The account must already hold a license, and cannot offboard immediately during a session.
       * 
       * This call is not available to `Invulnerable` collators.
       **/
      onboard: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Forfeit `origin`'s own license. The `LicenseBond` will be unreserved immediately.
       * 
       * This call is not available to `Invulnerable` collators.
       **/
      releaseLicense: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove a collator from the list of invulnerable (fixed) collators.
       **/
      removeInvulnerable: AugmentedSubmittable<(who: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    configuration: {
      setAppPromotionConfigurationOverride: AugmentedSubmittable<(configuration: PalletConfigurationAppPromotionConfiguration | { recalculationInterval?: any; pendingInterval?: any; intervalIncome?: any; maxStakersPerCalculation?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletConfigurationAppPromotionConfiguration]>;
      setCollatorSelectionDesiredCollators: AugmentedSubmittable<(max: Option<u32> | null | Uint8Array | u32 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u32>]>;
      setCollatorSelectionKickThreshold: AugmentedSubmittable<(threshold: Option<u32> | null | Uint8Array | u32 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u32>]>;
      setCollatorSelectionLicenseBond: AugmentedSubmittable<(amount: Option<u128> | null | Uint8Array | u128 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u128>]>;
      setMinGasPriceOverride: AugmentedSubmittable<(coeff: Option<u64> | null | Uint8Array | u64 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u64>]>;
      setWeightToFeeCoefficientOverride: AugmentedSubmittable<(coeff: Option<u64> | null | Uint8Array | u64 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u64>]>;
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
       **/
      serviceOverweight: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array, weightLimit: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, SpWeightsWeightV2Weight]>;
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
      call: AugmentedSubmittable<(source: H160 | string | Uint8Array, target: H160 | string | Uint8Array, input: Bytes | string | Uint8Array, value: U256 | AnyNumber | Uint8Array, gasLimit: u64 | AnyNumber | Uint8Array, maxFeePerGas: U256 | AnyNumber | Uint8Array, maxPriorityFeePerGas: Option<U256> | null | Uint8Array | U256 | AnyNumber, nonce: Option<U256> | null | Uint8Array | U256 | AnyNumber, accessList: Vec<ITuple<[H160, Vec<H256>]>> | ([H160 | string | Uint8Array, Vec<H256> | (H256 | string | Uint8Array)[]])[]) => SubmittableExtrinsic<ApiType>, [H160, H160, Bytes, U256, u64, U256, Option<U256>, Option<U256>, Vec<ITuple<[H160, Vec<H256>]>>]>;
      /**
       * Issue an EVM create operation. This is similar to a contract creation transaction in
       * Ethereum.
       **/
      create: AugmentedSubmittable<(source: H160 | string | Uint8Array, init: Bytes | string | Uint8Array, value: U256 | AnyNumber | Uint8Array, gasLimit: u64 | AnyNumber | Uint8Array, maxFeePerGas: U256 | AnyNumber | Uint8Array, maxPriorityFeePerGas: Option<U256> | null | Uint8Array | U256 | AnyNumber, nonce: Option<U256> | null | Uint8Array | U256 | AnyNumber, accessList: Vec<ITuple<[H160, Vec<H256>]>> | ([H160 | string | Uint8Array, Vec<H256> | (H256 | string | Uint8Array)[]])[]) => SubmittableExtrinsic<ApiType>, [H160, Bytes, U256, u64, U256, Option<U256>, Option<U256>, Vec<ITuple<[H160, Vec<H256>]>>]>;
      /**
       * Issue an EVM create2 operation.
       **/
      create2: AugmentedSubmittable<(source: H160 | string | Uint8Array, init: Bytes | string | Uint8Array, salt: H256 | string | Uint8Array, value: U256 | AnyNumber | Uint8Array, gasLimit: u64 | AnyNumber | Uint8Array, maxFeePerGas: U256 | AnyNumber | Uint8Array, maxPriorityFeePerGas: Option<U256> | null | Uint8Array | U256 | AnyNumber, nonce: Option<U256> | null | Uint8Array | U256 | AnyNumber, accessList: Vec<ITuple<[H160, Vec<H256>]>> | ([H160 | string | Uint8Array, Vec<H256> | (H256 | string | Uint8Array)[]])[]) => SubmittableExtrinsic<ApiType>, [H160, Bytes, H256, U256, u64, U256, Option<U256>, Option<U256>, Vec<ITuple<[H160, Vec<H256>]>>]>;
      /**
       * Withdraw balance from EVM into currency/balances pallet.
       **/
      withdraw: AugmentedSubmittable<(address: H160 | string | Uint8Array, value: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160, u128]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    evmCoderSubstrate: {
      emptyCall: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    evmContractHelpers: {
      /**
       * Migrate contract to use `SponsoringMode` storage instead of `SelfSponsoring`
       **/
      migrateFromSelfSponsoring: AugmentedSubmittable<(addresses: Vec<H160> | (H160 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<H160>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    evmMigration: {
      /**
       * Start contract migration, inserts contract stub at target address,
       * and marks account as pending, allowing to insert storage
       **/
      begin: AugmentedSubmittable<(address: H160 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160]>;
      /**
       * Finish contract migration, allows it to be called.
       * It is not possible to alter contract storage via [`Self::set_data`]
       * after this call.
       **/
      finish: AugmentedSubmittable<(address: H160 | string | Uint8Array, code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H160, Bytes]>;
      /**
       * Create ethereum events attached to the fake transaction
       **/
      insertEthLogs: AugmentedSubmittable<(logs: Vec<EthereumLog> | (EthereumLog | { address?: any; topics?: any; data?: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<EthereumLog>]>;
      /**
       * Create substrate events
       **/
      insertEvents: AugmentedSubmittable<(events: Vec<Bytes> | (Bytes | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Bytes>]>;
      /**
       * Remove remark compatibility data leftovers
       **/
      removeRmrkData: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Insert items into contract storage, this method can be called
       * multiple times
       **/
      setData: AugmentedSubmittable<(address: H160 | string | Uint8Array, data: Vec<ITuple<[H256, H256]>> | ([H256 | string | Uint8Array, H256 | string | Uint8Array])[]) => SubmittableExtrinsic<ApiType>, [H160, Vec<ITuple<[H256, H256]>>]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    foreignAssets: {
      registerForeignAsset: AugmentedSubmittable<(owner: AccountId32 | string | Uint8Array, location: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, metadata: PalletForeignAssetsModuleAssetMetadata | { name?: any; symbol?: any; decimals?: any; minimalBalance?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, XcmVersionedMultiLocation, PalletForeignAssetsModuleAssetMetadata]>;
      updateForeignAsset: AugmentedSubmittable<(foreignAssetId: u32 | AnyNumber | Uint8Array, location: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, metadata: PalletForeignAssetsModuleAssetMetadata | { name?: any; symbol?: any; decimals?: any; minimalBalance?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, XcmVersionedMultiLocation, PalletForeignAssetsModuleAssetMetadata]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    identity: {
      /**
       * Add a registrar to the system.
       * 
       * The dispatch origin for this call must be `T::RegistrarOrigin`.
       * 
       * - `account`: the account of the registrar.
       * 
       * Emits `RegistrarAdded` if successful.
       * 
       * # <weight>
       * - `O(R)` where `R` registrar-count (governance-bounded and code-bounded).
       * - One storage mutation (codec `O(R)`).
       * - One event.
       * # </weight>
       **/
      addRegistrar: AugmentedSubmittable<(account: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Add the given account to the sender's subs.
       * 
       * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
       * to the sender.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * sub identity of `sub`.
       **/
      addSub: AugmentedSubmittable<(sub: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, data: Data | { None: any } | { Raw: any } | { BlakeTwo256: any } | { Sha256: any } | { Keccak256: any } | { ShaThree256: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Data]>;
      /**
       * Cancel a previous request.
       * 
       * Payment: A previously reserved deposit is returned on success.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a
       * registered identity.
       * 
       * - `reg_index`: The index of the registrar whose judgement is no longer requested.
       * 
       * Emits `JudgementUnrequested` if successful.
       * 
       * # <weight>
       * - `O(R + X)`.
       * - One balance-reserve operation.
       * - One storage mutation `O(R + X)`.
       * - One event
       * # </weight>
       **/
      cancelRequest: AugmentedSubmittable<(regIndex: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Clear an account's identity info and all sub-accounts and return all deposits.
       * 
       * Payment: All reserved balances on the account are returned.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * identity.
       * 
       * Emits `IdentityCleared` if successful.
       * 
       * # <weight>
       * - `O(R + S + X)`
       * - where `R` registrar-count (governance-bounded).
       * - where `S` subs-count (hard- and deposit-bounded).
       * - where `X` additional-field-count (deposit-bounded and code-bounded).
       * - One balance-unreserve operation.
       * - `2` storage reads and `S + 2` storage deletions.
       * - One event.
       * # </weight>
       **/
      clearIdentity: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Set identities to be associated with the provided accounts as force origin.
       * 
       * This is not meant to operate in tandem with the identity pallet as is,
       * and be instead used to keep identities made and verified externally,
       * forbidden from interacting with an ordinary user, since it ignores any safety mechanism.
       **/
      forceInsertIdentities: AugmentedSubmittable<(identities: Vec<ITuple<[AccountId32, PalletIdentityRegistration]>> | ([AccountId32 | string | Uint8Array, PalletIdentityRegistration | { judgements?: any; deposit?: any; info?: any } | string | Uint8Array])[]) => SubmittableExtrinsic<ApiType>, [Vec<ITuple<[AccountId32, PalletIdentityRegistration]>>]>;
      /**
       * Remove identities associated with the provided accounts as force origin.
       * 
       * This is not meant to operate in tandem with the identity pallet as is,
       * and be instead used to keep identities made and verified externally,
       * forbidden from interacting with an ordinary user, since it ignores any safety mechanism.
       **/
      forceRemoveIdentities: AugmentedSubmittable<(identities: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<AccountId32>]>;
      /**
       * Set sub-identities to be associated with the provided accounts as force origin.
       * 
       * This is not meant to operate in tandem with the identity pallet as is,
       * and be instead used to keep identities made and verified externally,
       * forbidden from interacting with an ordinary user, since it ignores any safety mechanism.
       **/
      forceSetSubs: AugmentedSubmittable<(subs: Vec<ITuple<[AccountId32, ITuple<[u128, Vec<ITuple<[AccountId32, Data]>>]>]>> | ([AccountId32 | string | Uint8Array, ITuple<[u128, Vec<ITuple<[AccountId32, Data]>>]> | [u128 | AnyNumber | Uint8Array, Vec<ITuple<[AccountId32, Data]>> | ([AccountId32 | string | Uint8Array, Data | { None: any } | { Raw: any } | { BlakeTwo256: any } | { Sha256: any } | { Keccak256: any } | { ShaThree256: any } | string | Uint8Array])[]]])[]) => SubmittableExtrinsic<ApiType>, [Vec<ITuple<[AccountId32, ITuple<[u128, Vec<ITuple<[AccountId32, Data]>>]>]>>]>;
      /**
       * Remove an account's identity and sub-account information and slash the deposits.
       * 
       * Payment: Reserved balances from `set_subs` and `set_identity` are slashed and handled by
       * `Slash`. Verification request deposits are not returned; they should be cancelled
       * manually using `cancel_request`.
       * 
       * The dispatch origin for this call must match `T::ForceOrigin`.
       * 
       * - `target`: the account whose identity the judgement is upon. This must be an account
       * with a registered identity.
       * 
       * Emits `IdentityKilled` if successful.
       * 
       * # <weight>
       * - `O(R + S + X)`.
       * - One balance-reserve operation.
       * - `S + 2` storage mutations.
       * - One event.
       * # </weight>
       **/
      killIdentity: AugmentedSubmittable<(target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Provide a judgement for an account's identity.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `reg_index`.
       * 
       * - `reg_index`: the index of the registrar whose judgement is being made.
       * - `target`: the account whose identity the judgement is upon. This must be an account
       * with a registered identity.
       * - `judgement`: the judgement of the registrar of index `reg_index` about `target`.
       * - `identity`: The hash of the [`IdentityInfo`] for that the judgement is provided.
       * 
       * Emits `JudgementGiven` if successful.
       * 
       * # <weight>
       * - `O(R + X)`.
       * - One balance-transfer operation.
       * - Up to one account-lookup operation.
       * - Storage: 1 read `O(R)`, 1 mutate `O(R + X)`.
       * - One event.
       * # </weight>
       **/
      provideJudgement: AugmentedSubmittable<(regIndex: Compact<u32> | AnyNumber | Uint8Array, target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, judgement: PalletIdentityJudgement | { Unknown: any } | { FeePaid: any } | { Reasonable: any } | { KnownGood: any } | { OutOfDate: any } | { LowQuality: any } | { Erroneous: any } | string | Uint8Array, identity: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, MultiAddress, PalletIdentityJudgement, H256]>;
      /**
       * Remove the sender as a sub-account.
       * 
       * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
       * to the sender (*not* the original depositor).
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * super-identity.
       * 
       * NOTE: This should not normally be used, but is provided in the case that the non-
       * controller of an account is maliciously registered as a sub-account.
       **/
      quitSub: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove the given account from the sender's subs.
       * 
       * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
       * to the sender.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * sub identity of `sub`.
       **/
      removeSub: AugmentedSubmittable<(sub: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Alter the associated name of the given sub-account.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * sub identity of `sub`.
       **/
      renameSub: AugmentedSubmittable<(sub: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, data: Data | { None: any } | { Raw: any } | { BlakeTwo256: any } | { Sha256: any } | { Keccak256: any } | { ShaThree256: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Data]>;
      /**
       * Request a judgement from a registrar.
       * 
       * Payment: At most `max_fee` will be reserved for payment to the registrar if judgement
       * given.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a
       * registered identity.
       * 
       * - `reg_index`: The index of the registrar whose judgement is requested.
       * - `max_fee`: The maximum fee that may be paid. This should just be auto-populated as:
       * 
       * ```nocompile
       * Self::registrars().get(reg_index).unwrap().fee
       * ```
       * 
       * Emits `JudgementRequested` if successful.
       * 
       * # <weight>
       * - `O(R + X)`.
       * - One balance-reserve operation.
       * - Storage: 1 read `O(R)`, 1 mutate `O(X + R)`.
       * - One event.
       * # </weight>
       **/
      requestJudgement: AugmentedSubmittable<(regIndex: Compact<u32> | AnyNumber | Uint8Array, maxFee: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, Compact<u128>]>;
      /**
       * Change the account associated with a registrar.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `index`.
       * 
       * - `index`: the index of the registrar whose fee is to be set.
       * - `new`: the new account ID.
       * 
       * # <weight>
       * - `O(R)`.
       * - One storage mutation `O(R)`.
       * - Benchmark: 8.823 + R * 0.32 µs (min squares analysis)
       * # </weight>
       **/
      setAccountId: AugmentedSubmittable<(index: Compact<u32> | AnyNumber | Uint8Array, updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, MultiAddress]>;
      /**
       * Set the fee required for a judgement to be requested from a registrar.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `index`.
       * 
       * - `index`: the index of the registrar whose fee is to be set.
       * - `fee`: the new fee.
       * 
       * # <weight>
       * - `O(R)`.
       * - One storage mutation `O(R)`.
       * - Benchmark: 7.315 + R * 0.329 µs (min squares analysis)
       * # </weight>
       **/
      setFee: AugmentedSubmittable<(index: Compact<u32> | AnyNumber | Uint8Array, fee: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, Compact<u128>]>;
      /**
       * Set the field information for a registrar.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `index`.
       * 
       * - `index`: the index of the registrar whose fee is to be set.
       * - `fields`: the fields that the registrar concerns themselves with.
       * 
       * # <weight>
       * - `O(R)`.
       * - One storage mutation `O(R)`.
       * - Benchmark: 7.464 + R * 0.325 µs (min squares analysis)
       * # </weight>
       **/
      setFields: AugmentedSubmittable<(index: Compact<u32> | AnyNumber | Uint8Array, fields: PalletIdentityBitFlags) => SubmittableExtrinsic<ApiType>, [Compact<u32>, PalletIdentityBitFlags]>;
      /**
       * Set an account's identity information and reserve the appropriate deposit.
       * 
       * If the account already has identity information, the deposit is taken as part payment
       * for the new deposit.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `info`: The identity information.
       * 
       * Emits `IdentitySet` if successful.
       * 
       * # <weight>
       * - `O(X + X' + R)`
       * - where `X` additional-field-count (deposit-bounded and code-bounded)
       * - where `R` judgements-count (registrar-count-bounded)
       * - One balance reserve operation.
       * - One storage mutation (codec-read `O(X' + R)`, codec-write `O(X + R)`).
       * - One event.
       * # </weight>
       **/
      setIdentity: AugmentedSubmittable<(info: PalletIdentityIdentityInfo | { additional?: any; display?: any; legal?: any; web?: any; riot?: any; email?: any; pgpFingerprint?: any; image?: any; twitter?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletIdentityIdentityInfo]>;
      /**
       * Set the sub-accounts of the sender.
       * 
       * Payment: Any aggregate balance reserved by previous `set_subs` calls will be returned
       * and an amount `SubAccountDeposit` will be reserved for each item in `subs`.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * identity.
       * 
       * - `subs`: The identity's (new) sub-accounts.
       * 
       * # <weight>
       * - `O(P + S)`
       * - where `P` old-subs-count (hard- and deposit-bounded).
       * - where `S` subs-count (hard- and deposit-bounded).
       * - At most one balance operations.
       * - DB:
       * - `P + S` storage mutations (codec complexity `O(1)`)
       * - One storage read (codec complexity `O(P)`).
       * - One storage write (codec complexity `O(S)`).
       * - One storage-exists (`IdentityOf::contains_key`).
       * # </weight>
       **/
      setSubs: AugmentedSubmittable<(subs: Vec<ITuple<[AccountId32, Data]>> | ([AccountId32 | string | Uint8Array, Data | { None: any } | { Raw: any } | { BlakeTwo256: any } | { Sha256: any } | { Keccak256: any } | { ShaThree256: any } | string | Uint8Array])[]) => SubmittableExtrinsic<ApiType>, [Vec<ITuple<[AccountId32, Data]>>]>;
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
    maintenance: {
      disable: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      enable: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Execute a runtime call stored as a preimage.
       * 
       * `weight_bound` is the maximum weight that the caller is willing
       * to allow the extrinsic to be executed with.
       **/
      executePreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array, weightBound: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, SpWeightsWeightV2Weight]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    parachainInfo: {
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
      execute: AugmentedSubmittable<(message: XcmVersionedXcm | { V2: any } | { V3: any } | string | Uint8Array, maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedXcm, SpWeightsWeightV2Weight]>;
      /**
       * Set a safe XCM version (the version that XCM should be encoded with if the most recent
       * version a destination can accept is unknown).
       * 
       * - `origin`: Must be Root.
       * - `maybe_xcm_version`: The default XCM encoding version, or `None` to disable.
       **/
      forceDefaultXcmVersion: AugmentedSubmittable<(maybeXcmVersion: Option<u32> | null | Uint8Array | u32 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u32>]>;
      /**
       * Ask a location to notify us regarding their XCM version and any changes to it.
       * 
       * - `origin`: Must be Root.
       * - `location`: The location to which we should subscribe for XCM version notifications.
       **/
      forceSubscribeVersionNotify: AugmentedSubmittable<(location: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation]>;
      /**
       * Require that a particular destination should no longer notify us regarding any XCM
       * version changes.
       * 
       * - `origin`: Must be Root.
       * - `location`: The location to which we are currently subscribed for XCM version
       * notifications which we no longer desire.
       **/
      forceUnsubscribeVersionNotify: AugmentedSubmittable<(location: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation]>;
      /**
       * Extoll that a particular destination can be communicated with through a particular
       * version of XCM.
       * 
       * - `origin`: Must be Root.
       * - `location`: The destination that is being described.
       * - `xcm_version`: The latest version of XCM that `location` supports.
       **/
      forceXcmVersion: AugmentedSubmittable<(location: XcmV3MultiLocation | { parents?: any; interior?: any } | string | Uint8Array, xcmVersion: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmV3MultiLocation, u32]>;
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
      limitedReserveTransferAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array, weightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32, XcmV3WeightLimit]>;
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
      limitedTeleportAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array, weightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32, XcmV3WeightLimit]>;
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
      reserveTransferAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32]>;
      send: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, message: XcmVersionedXcm | { V2: any } | { V3: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedXcm]>;
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
      teleportAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    preimage: {
      /**
       * Register a preimage on-chain.
       * 
       * If the preimage was previously requested, no fees or deposits are taken for providing
       * the preimage. Otherwise, a deposit is taken proportional to the size of the preimage.
       **/
      notePreimage: AugmentedSubmittable<(bytes: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Request a preimage be uploaded to the chain without paying any fees or deposits.
       * 
       * If the preimage requests has already been provided on-chain, we unreserve any deposit
       * a user may have paid, and take the control of the preimage out of their hands.
       **/
      requestPreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Clear an unrequested preimage from the runtime storage.
       * 
       * If `len` is provided, then it will be a much cheaper operation.
       * 
       * - `hash`: The hash of the preimage to be removed from the store.
       * - `len`: The length of the preimage of `hash`.
       **/
      unnotePreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Clear a previously made request for a preimage.
       * 
       * NOTE: THIS MUST NOT BE CALLED ON `hash` MORE TIMES THAN `request_preimage`.
       **/
      unrequestPreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    session: {
      /**
       * Removes any session key(s) of the function caller.
       * 
       * This doesn't take effect until the next session.
       * 
       * The dispatch origin of this function must be Signed and the account must be either be
       * convertible to a validator ID using the chain's typical addressing system (this usually
       * means being a controller account) or directly convertible into a validator ID (which
       * usually means being a stash account).
       * 
       * ## Complexity
       * - `O(1)` in number of key types. Actual cost depends on the number of length of
       * `T::Keys::key_ids()` which is fixed.
       **/
      purgeKeys: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Sets the session key(s) of the function caller to `keys`.
       * Allows an account to set its session key prior to becoming a validator.
       * This doesn't take effect until the next session.
       * 
       * The dispatch origin of this function must be signed.
       * 
       * ## Complexity
       * - `O(1)`. Actual cost depends on the number of length of `T::Keys::key_ids()` which is
       * fixed.
       **/
      setKeys: AugmentedSubmittable<(keys: OpalRuntimeRuntimeCommonSessionKeys | { aura?: any } | string | Uint8Array, proof: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [OpalRuntimeRuntimeCommonSessionKeys, Bytes]>;
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
       * ## Complexity
       * - O(1).
       **/
      setKey: AugmentedSubmittable<(updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * ## Complexity
       * - O(1).
       **/
      sudo: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Signed` origin from
       * a given account.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * ## Complexity
       * - O(1).
       **/
      sudoAs: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Call]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       * This function does not check the weight of the call, and instead allows the
       * Sudo user to specify the weight of the call.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * ## Complexity
       * - O(1).
       **/
      sudoUncheckedWeight: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array, weight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call, SpWeightsWeightV2Weight]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    system: {
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
       * ## Complexity
       * - `O(1)`
       **/
      remark: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Make some on-chain remark and emit event.
       **/
      remarkWithEvent: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code.
       * 
       * ## Complexity
       * - `O(C + S)` where `C` length of `code` and `S` complexity of `can_set_code`
       **/
      setCode: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code without doing any checks of the given `code`.
       * 
       * ## Complexity
       * - `O(C)` where `C` length of `code`
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
    testUtils: {
      batchAll: AugmentedSubmittable<(calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Call>]>;
      enable: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      incTestValue: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      justTakeFee: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      setTestValue: AugmentedSubmittable<(value: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      setTestValueAndRollback: AugmentedSubmittable<(value: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
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
       * ## Complexity
       * - `O(1)` (Note that implementations of `OnTimestampSet` must also be `O(1)`)
       * - 1 storage read and 1 storage mutation (codec `O(1)`). (because of `DidUpdate::take` in
       * `on_finalize`)
       * - 1 event handler `on_timestamp_set`. Must be `O(1)`.
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
      forceTransfer: AugmentedSubmittable<(source: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress, PalletForeignAssetsAssetIds, Compact<u128>]>;
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
      setBalance: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, newFree: Compact<u128> | AnyNumber | Uint8Array, newReserved: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeignAssetsAssetIds, Compact<u128>, Compact<u128>]>;
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
      transfer: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeignAssetsAssetIds, Compact<u128>]>;
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
      transferAll: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, keepAlive: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeignAssetsAssetIds, bool]>;
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
      transferKeepAlive: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, currencyId: PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletForeignAssetsAssetIds, Compact<u128>]>;
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
       * ## Complexity
       * - O(1).
       **/
      approveProposal: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Put forward a suggestion for spending. A deposit proportional to the value
       * is reserved and slashed if the proposal is rejected. It is returned once the
       * proposal is awarded.
       * 
       * ## Complexity
       * - O(1)
       **/
      proposeSpend: AugmentedSubmittable<(value: Compact<u128> | AnyNumber | Uint8Array, beneficiary: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u128>, MultiAddress]>;
      /**
       * Reject a proposed spend. The original deposit will be slashed.
       * 
       * May only be called from `T::RejectOrigin`.
       * 
       * ## Complexity
       * - O(1)
       **/
      rejectProposal: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Force a previously approved proposal to be removed from the approval queue.
       * The original deposit will no longer be returned.
       * 
       * May only be called from `T::RejectOrigin`.
       * - `proposal_id`: The index of a proposal
       * 
       * ## Complexity
       * - O(A) where `A` is the number of approvals
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
       * Allow a non-permissioned address to transfer or burn an item from owner's eth mirror.
       * 
       * # Permissions
       * 
       * * Collection owner
       * * Collection admin
       * * Current item owner
       * 
       * # Arguments
       * 
       * * `from`: Owner's account eth mirror
       * * `to`: Account to be approved to make specific transactions on non-owned tokens.
       * * `collection_id`: ID of the collection the item belongs to.
       * * `item_id`: ID of the item transactions on which are now approved.
       * * `amount`: Number of pieces of the item approved for a transaction (maximum of 1 for NFTs).
       * Set to 0 to revoke the approval.
       **/
      approveFrom: AugmentedSubmittable<(from: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, to: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, collectionId: u32 | AnyNumber | Uint8Array, itemId: u32 | AnyNumber | Uint8Array, amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, u32, u32, u128]>;
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
       * 
       * returns collection ID
       * 
       * Deprecated: `create_collection_ex` is more up-to-date and advanced, prefer it instead.
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
       * Repairs a collection if the data was somehow corrupted.
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection to repair.
       **/
      forceRepairCollection: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Repairs a token if the data was somehow corrupted.
       * 
       * # Arguments
       * 
       * * `collection_id`: ID of the collection the item belongs to.
       * * `item_id`: ID of the item.
       **/
      forceRepairItem: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, itemId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32]>;
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
       * Sets or unsets the approval of a given operator.
       * 
       * The `operator` is allowed to transfer all tokens of the `owner` on their behalf.
       * 
       * # Arguments
       * 
       * * `owner`: Token owner
       * * `operator`: Operator
       * * `approve`: Should operator status be granted or revoked?
       **/
      setAllowanceForAll: AugmentedSubmittable<(collectionId: u32 | AnyNumber | Uint8Array, operator: PalletEvmAccountBasicCrossAccountIdRepr | { Substrate: any } | { Ethereum: any } | string | Uint8Array, approve: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, PalletEvmAccountBasicCrossAccountIdRepr, bool]>;
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
      serviceOverweight: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array, weightLimit: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, SpWeightsWeightV2Weight]>;
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
      updateThresholdWeight: AugmentedSubmittable<(updated: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpWeightsWeightV2Weight]>;
      /**
       * Overwrites the speed to which the available weight approaches the maximum weight.
       * A lower number results in a faster progression. A value of 1 makes the entire weight available initially.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.weight_restrict_decay`.
       **/
      updateWeightRestrictDecay: AugmentedSubmittable<(updated: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpWeightsWeightV2Weight]>;
      /**
       * Overwrite the maximum amount of weight any individual message may consume.
       * Messages above this weight go into the overweight queue and may only be serviced explicitly.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.xcmp_max_individual_weight`.
       **/
      updateXcmpMaxIndividualWeight: AugmentedSubmittable<(updated: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpWeightsWeightV2Weight]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
    xTokens: {
      /**
       * Transfer native currencies.
       * 
       * `dest_weight_limit` is the weight for XCM execution on the dest
       * chain, and it would be charged from the transferred assets. If set
       * below requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transfer: AugmentedSubmittable<(currencyId: PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: u128 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, destWeightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletForeignAssetsAssetIds, u128, XcmVersionedMultiLocation, XcmV3WeightLimit]>;
      /**
       * Transfer `MultiAsset`.
       * 
       * `dest_weight_limit` is the weight for XCM execution on the dest
       * chain, and it would be charged from the transferred assets. If set
       * below requirements, the execution may fail and assets wouldn't be
       * received.
       * 
       * It's a no-op if any error on local XCM execution or message sending.
       * Note sending assets out per se doesn't guarantee they would be
       * received. Receiving depends on if the XCM message could be delivered
       * by the network, and if the receiving chain would handle
       * messages correctly.
       **/
      transferMultiasset: AugmentedSubmittable<(asset: XcmVersionedMultiAsset | { V2: any } | { V3: any } | string | Uint8Array, dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, destWeightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiAsset, XcmVersionedMultiLocation, XcmV3WeightLimit]>;
      /**
       * Transfer several `MultiAsset` specifying the item to be used as fee
       * 
       * `dest_weight_limit` is the weight for XCM execution on the dest
       * chain, and it would be charged from the transferred assets. If set
       * below requirements, the execution may fail and assets wouldn't be
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
      transferMultiassets: AugmentedSubmittable<(assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeItem: u32 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, destWeightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiAssets, u32, XcmVersionedMultiLocation, XcmV3WeightLimit]>;
      /**
       * Transfer `MultiAsset` specifying the fee and amount as separate.
       * 
       * `dest_weight_limit` is the weight for XCM execution on the dest
       * chain, and it would be charged from the transferred assets. If set
       * below requirements, the execution may fail and assets wouldn't be
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
      transferMultiassetWithFee: AugmentedSubmittable<(asset: XcmVersionedMultiAsset | { V2: any } | { V3: any } | string | Uint8Array, fee: XcmVersionedMultiAsset | { V2: any } | { V3: any } | string | Uint8Array, dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, destWeightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiAsset, XcmVersionedMultiAsset, XcmVersionedMultiLocation, XcmV3WeightLimit]>;
      /**
       * Transfer several currencies specifying the item to be used as fee
       * 
       * `dest_weight_limit` is the weight for XCM execution on the dest
       * chain, and it would be charged from the transferred assets. If set
       * below requirements, the execution may fail and assets wouldn't be
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
      transferMulticurrencies: AugmentedSubmittable<(currencies: Vec<ITuple<[PalletForeignAssetsAssetIds, u128]>> | ([PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, u128 | AnyNumber | Uint8Array])[], feeItem: u32 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, destWeightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Vec<ITuple<[PalletForeignAssetsAssetIds, u128]>>, u32, XcmVersionedMultiLocation, XcmV3WeightLimit]>;
      /**
       * Transfer native currencies specifying the fee and amount as
       * separate.
       * 
       * `dest_weight_limit` is the weight for XCM execution on the dest
       * chain, and it would be charged from the transferred assets. If set
       * below requirements, the execution may fail and assets wouldn't be
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
      transferWithFee: AugmentedSubmittable<(currencyId: PalletForeignAssetsAssetIds | { ForeignAssetId: any } | { NativeAssetId: any } | string | Uint8Array, amount: u128 | AnyNumber | Uint8Array, fee: u128 | AnyNumber | Uint8Array, dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, destWeightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletForeignAssetsAssetIds, u128, u128, XcmVersionedMultiLocation, XcmV3WeightLimit]>;
      /**
       * Generic tx
       **/
      [key: string]: SubmittableExtrinsicFunction<ApiType>;
    };
  } // AugmentedSubmittables
} // declare module
