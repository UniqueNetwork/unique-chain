// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/types/lookup';

import type { BTreeMap, BTreeSet, Bytes, Compact, Enum, Null, Option, Result, Struct, Text, U256, U8aFixed, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H160, H256, MultiAddress, Perbill, Permill } from '@polkadot/types/interfaces/runtime';
import type { Event } from '@polkadot/types/interfaces/system';

declare module '@polkadot/types/lookup' {
  /** @name FrameSystemAccountInfo (3) */
  interface FrameSystemAccountInfo extends Struct {
    readonly nonce: u32;
    readonly consumers: u32;
    readonly providers: u32;
    readonly sufficients: u32;
    readonly data: PalletBalancesAccountData;
  }

  /** @name PalletBalancesAccountData (5) */
  interface PalletBalancesAccountData extends Struct {
    readonly free: u128;
    readonly reserved: u128;
    readonly miscFrozen: u128;
    readonly feeFrozen: u128;
  }

  /** @name FrameSupportDispatchPerDispatchClassWeight (7) */
  interface FrameSupportDispatchPerDispatchClassWeight extends Struct {
    readonly normal: SpWeightsWeightV2Weight;
    readonly operational: SpWeightsWeightV2Weight;
    readonly mandatory: SpWeightsWeightV2Weight;
  }

  /** @name SpWeightsWeightV2Weight (8) */
  interface SpWeightsWeightV2Weight extends Struct {
    readonly refTime: Compact<u64>;
    readonly proofSize: Compact<u64>;
  }

  /** @name SpRuntimeDigest (13) */
  interface SpRuntimeDigest extends Struct {
    readonly logs: Vec<SpRuntimeDigestDigestItem>;
  }

  /** @name SpRuntimeDigestDigestItem (15) */
  interface SpRuntimeDigestDigestItem extends Enum {
    readonly isOther: boolean;
    readonly asOther: Bytes;
    readonly isConsensus: boolean;
    readonly asConsensus: ITuple<[U8aFixed, Bytes]>;
    readonly isSeal: boolean;
    readonly asSeal: ITuple<[U8aFixed, Bytes]>;
    readonly isPreRuntime: boolean;
    readonly asPreRuntime: ITuple<[U8aFixed, Bytes]>;
    readonly isRuntimeEnvironmentUpdated: boolean;
    readonly type: 'Other' | 'Consensus' | 'Seal' | 'PreRuntime' | 'RuntimeEnvironmentUpdated';
  }

  /** @name FrameSystemEventRecord (18) */
  interface FrameSystemEventRecord extends Struct {
    readonly phase: FrameSystemPhase;
    readonly event: Event;
    readonly topics: Vec<H256>;
  }

  /** @name FrameSystemEvent (20) */
  interface FrameSystemEvent extends Enum {
    readonly isExtrinsicSuccess: boolean;
    readonly asExtrinsicSuccess: {
      readonly dispatchInfo: FrameSupportDispatchDispatchInfo;
    } & Struct;
    readonly isExtrinsicFailed: boolean;
    readonly asExtrinsicFailed: {
      readonly dispatchError: SpRuntimeDispatchError;
      readonly dispatchInfo: FrameSupportDispatchDispatchInfo;
    } & Struct;
    readonly isCodeUpdated: boolean;
    readonly isNewAccount: boolean;
    readonly asNewAccount: {
      readonly account: AccountId32;
    } & Struct;
    readonly isKilledAccount: boolean;
    readonly asKilledAccount: {
      readonly account: AccountId32;
    } & Struct;
    readonly isRemarked: boolean;
    readonly asRemarked: {
      readonly sender: AccountId32;
      readonly hash_: H256;
    } & Struct;
    readonly type: 'ExtrinsicSuccess' | 'ExtrinsicFailed' | 'CodeUpdated' | 'NewAccount' | 'KilledAccount' | 'Remarked';
  }

  /** @name FrameSupportDispatchDispatchInfo (21) */
  interface FrameSupportDispatchDispatchInfo extends Struct {
    readonly weight: SpWeightsWeightV2Weight;
    readonly class: FrameSupportDispatchDispatchClass;
    readonly paysFee: FrameSupportDispatchPays;
  }

  /** @name FrameSupportDispatchDispatchClass (22) */
  interface FrameSupportDispatchDispatchClass extends Enum {
    readonly isNormal: boolean;
    readonly isOperational: boolean;
    readonly isMandatory: boolean;
    readonly type: 'Normal' | 'Operational' | 'Mandatory';
  }

  /** @name FrameSupportDispatchPays (23) */
  interface FrameSupportDispatchPays extends Enum {
    readonly isYes: boolean;
    readonly isNo: boolean;
    readonly type: 'Yes' | 'No';
  }

  /** @name SpRuntimeDispatchError (24) */
  interface SpRuntimeDispatchError extends Enum {
    readonly isOther: boolean;
    readonly isCannotLookup: boolean;
    readonly isBadOrigin: boolean;
    readonly isModule: boolean;
    readonly asModule: SpRuntimeModuleError;
    readonly isConsumerRemaining: boolean;
    readonly isNoProviders: boolean;
    readonly isTooManyConsumers: boolean;
    readonly isToken: boolean;
    readonly asToken: SpRuntimeTokenError;
    readonly isArithmetic: boolean;
    readonly asArithmetic: SpRuntimeArithmeticError;
    readonly isTransactional: boolean;
    readonly asTransactional: SpRuntimeTransactionalError;
    readonly isExhausted: boolean;
    readonly isCorruption: boolean;
    readonly isUnavailable: boolean;
    readonly type: 'Other' | 'CannotLookup' | 'BadOrigin' | 'Module' | 'ConsumerRemaining' | 'NoProviders' | 'TooManyConsumers' | 'Token' | 'Arithmetic' | 'Transactional' | 'Exhausted' | 'Corruption' | 'Unavailable';
  }

  /** @name SpRuntimeModuleError (25) */
  interface SpRuntimeModuleError extends Struct {
    readonly index: u8;
    readonly error: U8aFixed;
  }

  /** @name SpRuntimeTokenError (26) */
  interface SpRuntimeTokenError extends Enum {
    readonly isNoFunds: boolean;
    readonly isWouldDie: boolean;
    readonly isBelowMinimum: boolean;
    readonly isCannotCreate: boolean;
    readonly isUnknownAsset: boolean;
    readonly isFrozen: boolean;
    readonly isUnsupported: boolean;
    readonly type: 'NoFunds' | 'WouldDie' | 'BelowMinimum' | 'CannotCreate' | 'UnknownAsset' | 'Frozen' | 'Unsupported';
  }

  /** @name SpRuntimeArithmeticError (27) */
  interface SpRuntimeArithmeticError extends Enum {
    readonly isUnderflow: boolean;
    readonly isOverflow: boolean;
    readonly isDivisionByZero: boolean;
    readonly type: 'Underflow' | 'Overflow' | 'DivisionByZero';
  }

  /** @name SpRuntimeTransactionalError (28) */
  interface SpRuntimeTransactionalError extends Enum {
    readonly isLimitReached: boolean;
    readonly isNoLayer: boolean;
    readonly type: 'LimitReached' | 'NoLayer';
  }

  /** @name CumulusPalletParachainSystemEvent (29) */
  interface CumulusPalletParachainSystemEvent extends Enum {
    readonly isValidationFunctionStored: boolean;
    readonly isValidationFunctionApplied: boolean;
    readonly asValidationFunctionApplied: {
      readonly relayChainBlockNum: u32;
    } & Struct;
    readonly isValidationFunctionDiscarded: boolean;
    readonly isUpgradeAuthorized: boolean;
    readonly asUpgradeAuthorized: {
      readonly codeHash: H256;
    } & Struct;
    readonly isDownwardMessagesReceived: boolean;
    readonly asDownwardMessagesReceived: {
      readonly count: u32;
    } & Struct;
    readonly isDownwardMessagesProcessed: boolean;
    readonly asDownwardMessagesProcessed: {
      readonly weightUsed: SpWeightsWeightV2Weight;
      readonly dmqHead: H256;
    } & Struct;
    readonly type: 'ValidationFunctionStored' | 'ValidationFunctionApplied' | 'ValidationFunctionDiscarded' | 'UpgradeAuthorized' | 'DownwardMessagesReceived' | 'DownwardMessagesProcessed';
  }

  /** @name PalletBalancesEvent (30) */
  interface PalletBalancesEvent extends Enum {
    readonly isEndowed: boolean;
    readonly asEndowed: {
      readonly account: AccountId32;
      readonly freeBalance: u128;
    } & Struct;
    readonly isDustLost: boolean;
    readonly asDustLost: {
      readonly account: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isBalanceSet: boolean;
    readonly asBalanceSet: {
      readonly who: AccountId32;
      readonly free: u128;
      readonly reserved: u128;
    } & Struct;
    readonly isReserved: boolean;
    readonly asReserved: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isUnreserved: boolean;
    readonly asUnreserved: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isReserveRepatriated: boolean;
    readonly asReserveRepatriated: {
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
      readonly destinationStatus: FrameSupportTokensMiscBalanceStatus;
    } & Struct;
    readonly isDeposit: boolean;
    readonly asDeposit: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isWithdraw: boolean;
    readonly asWithdraw: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isSlashed: boolean;
    readonly asSlashed: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly type: 'Endowed' | 'DustLost' | 'Transfer' | 'BalanceSet' | 'Reserved' | 'Unreserved' | 'ReserveRepatriated' | 'Deposit' | 'Withdraw' | 'Slashed';
  }

  /** @name FrameSupportTokensMiscBalanceStatus (31) */
  interface FrameSupportTokensMiscBalanceStatus extends Enum {
    readonly isFree: boolean;
    readonly isReserved: boolean;
    readonly type: 'Free' | 'Reserved';
  }

  /** @name PalletTransactionPaymentEvent (32) */
  interface PalletTransactionPaymentEvent extends Enum {
    readonly isTransactionFeePaid: boolean;
    readonly asTransactionFeePaid: {
      readonly who: AccountId32;
      readonly actualFee: u128;
      readonly tip: u128;
    } & Struct;
    readonly type: 'TransactionFeePaid';
  }

  /** @name PalletTreasuryEvent (33) */
  interface PalletTreasuryEvent extends Enum {
    readonly isProposed: boolean;
    readonly asProposed: {
      readonly proposalIndex: u32;
    } & Struct;
    readonly isSpending: boolean;
    readonly asSpending: {
      readonly budgetRemaining: u128;
    } & Struct;
    readonly isAwarded: boolean;
    readonly asAwarded: {
      readonly proposalIndex: u32;
      readonly award: u128;
      readonly account: AccountId32;
    } & Struct;
    readonly isRejected: boolean;
    readonly asRejected: {
      readonly proposalIndex: u32;
      readonly slashed: u128;
    } & Struct;
    readonly isBurnt: boolean;
    readonly asBurnt: {
      readonly burntFunds: u128;
    } & Struct;
    readonly isRollover: boolean;
    readonly asRollover: {
      readonly rolloverBalance: u128;
    } & Struct;
    readonly isDeposit: boolean;
    readonly asDeposit: {
      readonly value: u128;
    } & Struct;
    readonly isSpendApproved: boolean;
    readonly asSpendApproved: {
      readonly proposalIndex: u32;
      readonly amount: u128;
      readonly beneficiary: AccountId32;
    } & Struct;
    readonly type: 'Proposed' | 'Spending' | 'Awarded' | 'Rejected' | 'Burnt' | 'Rollover' | 'Deposit' | 'SpendApproved';
  }

  /** @name PalletSudoEvent (34) */
  interface PalletSudoEvent extends Enum {
    readonly isSudid: boolean;
    readonly asSudid: {
      readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly isKeyChanged: boolean;
    readonly asKeyChanged: {
      readonly oldSudoer: Option<AccountId32>;
    } & Struct;
    readonly isSudoAsDone: boolean;
    readonly asSudoAsDone: {
      readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly type: 'Sudid' | 'KeyChanged' | 'SudoAsDone';
  }

  /** @name OrmlVestingModuleEvent (38) */
  interface OrmlVestingModuleEvent extends Enum {
    readonly isVestingScheduleAdded: boolean;
    readonly asVestingScheduleAdded: {
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly vestingSchedule: OrmlVestingVestingSchedule;
    } & Struct;
    readonly isClaimed: boolean;
    readonly asClaimed: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isVestingSchedulesUpdated: boolean;
    readonly asVestingSchedulesUpdated: {
      readonly who: AccountId32;
    } & Struct;
    readonly type: 'VestingScheduleAdded' | 'Claimed' | 'VestingSchedulesUpdated';
  }

  /** @name OrmlVestingVestingSchedule (39) */
  interface OrmlVestingVestingSchedule extends Struct {
    readonly start: u32;
    readonly period: u32;
    readonly periodCount: u32;
    readonly perPeriod: Compact<u128>;
  }

  /** @name OrmlXtokensModuleEvent (41) */
  interface OrmlXtokensModuleEvent extends Enum {
    readonly isTransferredMultiAssets: boolean;
    readonly asTransferredMultiAssets: {
      readonly sender: AccountId32;
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly fee: XcmV1MultiAsset;
      readonly dest: XcmV1MultiLocation;
    } & Struct;
    readonly type: 'TransferredMultiAssets';
  }

  /** @name XcmV1MultiassetMultiAssets (42) */
  interface XcmV1MultiassetMultiAssets extends Vec<XcmV1MultiAsset> {}

  /** @name XcmV1MultiAsset (44) */
  interface XcmV1MultiAsset extends Struct {
    readonly id: XcmV1MultiassetAssetId;
    readonly fun: XcmV1MultiassetFungibility;
  }

  /** @name XcmV1MultiassetAssetId (45) */
  interface XcmV1MultiassetAssetId extends Enum {
    readonly isConcrete: boolean;
    readonly asConcrete: XcmV1MultiLocation;
    readonly isAbstract: boolean;
    readonly asAbstract: Bytes;
    readonly type: 'Concrete' | 'Abstract';
  }

  /** @name XcmV1MultiLocation (46) */
  interface XcmV1MultiLocation extends Struct {
    readonly parents: u8;
    readonly interior: XcmV1MultilocationJunctions;
  }

  /** @name XcmV1MultilocationJunctions (47) */
  interface XcmV1MultilocationJunctions extends Enum {
    readonly isHere: boolean;
    readonly isX1: boolean;
    readonly asX1: XcmV1Junction;
    readonly isX2: boolean;
    readonly asX2: ITuple<[XcmV1Junction, XcmV1Junction]>;
    readonly isX3: boolean;
    readonly asX3: ITuple<[XcmV1Junction, XcmV1Junction, XcmV1Junction]>;
    readonly isX4: boolean;
    readonly asX4: ITuple<[XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction]>;
    readonly isX5: boolean;
    readonly asX5: ITuple<[XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction]>;
    readonly isX6: boolean;
    readonly asX6: ITuple<[XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction]>;
    readonly isX7: boolean;
    readonly asX7: ITuple<[XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction]>;
    readonly isX8: boolean;
    readonly asX8: ITuple<[XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction, XcmV1Junction]>;
    readonly type: 'Here' | 'X1' | 'X2' | 'X3' | 'X4' | 'X5' | 'X6' | 'X7' | 'X8';
  }

  /** @name XcmV1Junction (48) */
  interface XcmV1Junction extends Enum {
    readonly isParachain: boolean;
    readonly asParachain: Compact<u32>;
    readonly isAccountId32: boolean;
    readonly asAccountId32: {
      readonly network: XcmV0JunctionNetworkId;
      readonly id: U8aFixed;
    } & Struct;
    readonly isAccountIndex64: boolean;
    readonly asAccountIndex64: {
      readonly network: XcmV0JunctionNetworkId;
      readonly index: Compact<u64>;
    } & Struct;
    readonly isAccountKey20: boolean;
    readonly asAccountKey20: {
      readonly network: XcmV0JunctionNetworkId;
      readonly key: U8aFixed;
    } & Struct;
    readonly isPalletInstance: boolean;
    readonly asPalletInstance: u8;
    readonly isGeneralIndex: boolean;
    readonly asGeneralIndex: Compact<u128>;
    readonly isGeneralKey: boolean;
    readonly asGeneralKey: Bytes;
    readonly isOnlyChild: boolean;
    readonly isPlurality: boolean;
    readonly asPlurality: {
      readonly id: XcmV0JunctionBodyId;
      readonly part: XcmV0JunctionBodyPart;
    } & Struct;
    readonly type: 'Parachain' | 'AccountId32' | 'AccountIndex64' | 'AccountKey20' | 'PalletInstance' | 'GeneralIndex' | 'GeneralKey' | 'OnlyChild' | 'Plurality';
  }

  /** @name XcmV0JunctionNetworkId (50) */
  interface XcmV0JunctionNetworkId extends Enum {
    readonly isAny: boolean;
    readonly isNamed: boolean;
    readonly asNamed: Bytes;
    readonly isPolkadot: boolean;
    readonly isKusama: boolean;
    readonly type: 'Any' | 'Named' | 'Polkadot' | 'Kusama';
  }

  /** @name XcmV0JunctionBodyId (53) */
  interface XcmV0JunctionBodyId extends Enum {
    readonly isUnit: boolean;
    readonly isNamed: boolean;
    readonly asNamed: Bytes;
    readonly isIndex: boolean;
    readonly asIndex: Compact<u32>;
    readonly isExecutive: boolean;
    readonly isTechnical: boolean;
    readonly isLegislative: boolean;
    readonly isJudicial: boolean;
    readonly type: 'Unit' | 'Named' | 'Index' | 'Executive' | 'Technical' | 'Legislative' | 'Judicial';
  }

  /** @name XcmV0JunctionBodyPart (54) */
  interface XcmV0JunctionBodyPart extends Enum {
    readonly isVoice: boolean;
    readonly isMembers: boolean;
    readonly asMembers: {
      readonly count: Compact<u32>;
    } & Struct;
    readonly isFraction: boolean;
    readonly asFraction: {
      readonly nom: Compact<u32>;
      readonly denom: Compact<u32>;
    } & Struct;
    readonly isAtLeastProportion: boolean;
    readonly asAtLeastProportion: {
      readonly nom: Compact<u32>;
      readonly denom: Compact<u32>;
    } & Struct;
    readonly isMoreThanProportion: boolean;
    readonly asMoreThanProportion: {
      readonly nom: Compact<u32>;
      readonly denom: Compact<u32>;
    } & Struct;
    readonly type: 'Voice' | 'Members' | 'Fraction' | 'AtLeastProportion' | 'MoreThanProportion';
  }

  /** @name XcmV1MultiassetFungibility (55) */
  interface XcmV1MultiassetFungibility extends Enum {
    readonly isFungible: boolean;
    readonly asFungible: Compact<u128>;
    readonly isNonFungible: boolean;
    readonly asNonFungible: XcmV1MultiassetAssetInstance;
    readonly type: 'Fungible' | 'NonFungible';
  }

  /** @name XcmV1MultiassetAssetInstance (56) */
  interface XcmV1MultiassetAssetInstance extends Enum {
    readonly isUndefined: boolean;
    readonly isIndex: boolean;
    readonly asIndex: Compact<u128>;
    readonly isArray4: boolean;
    readonly asArray4: U8aFixed;
    readonly isArray8: boolean;
    readonly asArray8: U8aFixed;
    readonly isArray16: boolean;
    readonly asArray16: U8aFixed;
    readonly isArray32: boolean;
    readonly asArray32: U8aFixed;
    readonly isBlob: boolean;
    readonly asBlob: Bytes;
    readonly type: 'Undefined' | 'Index' | 'Array4' | 'Array8' | 'Array16' | 'Array32' | 'Blob';
  }

  /** @name OrmlTokensModuleEvent (59) */
  interface OrmlTokensModuleEvent extends Enum {
    readonly isEndowed: boolean;
    readonly asEndowed: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isDustLost: boolean;
    readonly asDustLost: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isReserved: boolean;
    readonly asReserved: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isUnreserved: boolean;
    readonly asUnreserved: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isReserveRepatriated: boolean;
    readonly asReserveRepatriated: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
      readonly status: FrameSupportTokensMiscBalanceStatus;
    } & Struct;
    readonly isBalanceSet: boolean;
    readonly asBalanceSet: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly free: u128;
      readonly reserved: u128;
    } & Struct;
    readonly isTotalIssuanceSet: boolean;
    readonly asTotalIssuanceSet: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: u128;
    } & Struct;
    readonly isWithdrawn: boolean;
    readonly asWithdrawn: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isSlashed: boolean;
    readonly asSlashed: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly freeAmount: u128;
      readonly reservedAmount: u128;
    } & Struct;
    readonly isDeposited: boolean;
    readonly asDeposited: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isLockSet: boolean;
    readonly asLockSet: {
      readonly lockId: U8aFixed;
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isLockRemoved: boolean;
    readonly asLockRemoved: {
      readonly lockId: U8aFixed;
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly who: AccountId32;
    } & Struct;
    readonly type: 'Endowed' | 'DustLost' | 'Transfer' | 'Reserved' | 'Unreserved' | 'ReserveRepatriated' | 'BalanceSet' | 'TotalIssuanceSet' | 'Withdrawn' | 'Slashed' | 'Deposited' | 'LockSet' | 'LockRemoved';
  }

  /** @name PalletForeignAssetsAssetIds (60) */
  interface PalletForeignAssetsAssetIds extends Enum {
    readonly isForeignAssetId: boolean;
    readonly asForeignAssetId: u32;
    readonly isNativeAssetId: boolean;
    readonly asNativeAssetId: PalletForeignAssetsNativeCurrency;
    readonly type: 'ForeignAssetId' | 'NativeAssetId';
  }

  /** @name PalletForeignAssetsNativeCurrency (61) */
  interface PalletForeignAssetsNativeCurrency extends Enum {
    readonly isHere: boolean;
    readonly isParent: boolean;
    readonly type: 'Here' | 'Parent';
  }

  /** @name CumulusPalletXcmpQueueEvent (62) */
  interface CumulusPalletXcmpQueueEvent extends Enum {
    readonly isSuccess: boolean;
    readonly asSuccess: {
      readonly messageHash: Option<H256>;
      readonly weight: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isFail: boolean;
    readonly asFail: {
      readonly messageHash: Option<H256>;
      readonly error: XcmV2TraitsError;
      readonly weight: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isBadVersion: boolean;
    readonly asBadVersion: {
      readonly messageHash: Option<H256>;
    } & Struct;
    readonly isBadFormat: boolean;
    readonly asBadFormat: {
      readonly messageHash: Option<H256>;
    } & Struct;
    readonly isUpwardMessageSent: boolean;
    readonly asUpwardMessageSent: {
      readonly messageHash: Option<H256>;
    } & Struct;
    readonly isXcmpMessageSent: boolean;
    readonly asXcmpMessageSent: {
      readonly messageHash: Option<H256>;
    } & Struct;
    readonly isOverweightEnqueued: boolean;
    readonly asOverweightEnqueued: {
      readonly sender: u32;
      readonly sentAt: u32;
      readonly index: u64;
      readonly required: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isOverweightServiced: boolean;
    readonly asOverweightServiced: {
      readonly index: u64;
      readonly used: SpWeightsWeightV2Weight;
    } & Struct;
    readonly type: 'Success' | 'Fail' | 'BadVersion' | 'BadFormat' | 'UpwardMessageSent' | 'XcmpMessageSent' | 'OverweightEnqueued' | 'OverweightServiced';
  }

  /** @name XcmV2TraitsError (64) */
  interface XcmV2TraitsError extends Enum {
    readonly isOverflow: boolean;
    readonly isUnimplemented: boolean;
    readonly isUntrustedReserveLocation: boolean;
    readonly isUntrustedTeleportLocation: boolean;
    readonly isMultiLocationFull: boolean;
    readonly isMultiLocationNotInvertible: boolean;
    readonly isBadOrigin: boolean;
    readonly isInvalidLocation: boolean;
    readonly isAssetNotFound: boolean;
    readonly isFailedToTransactAsset: boolean;
    readonly isNotWithdrawable: boolean;
    readonly isLocationCannotHold: boolean;
    readonly isExceedsMaxMessageSize: boolean;
    readonly isDestinationUnsupported: boolean;
    readonly isTransport: boolean;
    readonly isUnroutable: boolean;
    readonly isUnknownClaim: boolean;
    readonly isFailedToDecode: boolean;
    readonly isMaxWeightInvalid: boolean;
    readonly isNotHoldingFees: boolean;
    readonly isTooExpensive: boolean;
    readonly isTrap: boolean;
    readonly asTrap: u64;
    readonly isUnhandledXcmVersion: boolean;
    readonly isWeightLimitReached: boolean;
    readonly asWeightLimitReached: u64;
    readonly isBarrier: boolean;
    readonly isWeightNotComputable: boolean;
    readonly type: 'Overflow' | 'Unimplemented' | 'UntrustedReserveLocation' | 'UntrustedTeleportLocation' | 'MultiLocationFull' | 'MultiLocationNotInvertible' | 'BadOrigin' | 'InvalidLocation' | 'AssetNotFound' | 'FailedToTransactAsset' | 'NotWithdrawable' | 'LocationCannotHold' | 'ExceedsMaxMessageSize' | 'DestinationUnsupported' | 'Transport' | 'Unroutable' | 'UnknownClaim' | 'FailedToDecode' | 'MaxWeightInvalid' | 'NotHoldingFees' | 'TooExpensive' | 'Trap' | 'UnhandledXcmVersion' | 'WeightLimitReached' | 'Barrier' | 'WeightNotComputable';
  }

  /** @name PalletXcmEvent (66) */
  interface PalletXcmEvent extends Enum {
    readonly isAttempted: boolean;
    readonly asAttempted: XcmV2TraitsOutcome;
    readonly isSent: boolean;
    readonly asSent: ITuple<[XcmV1MultiLocation, XcmV1MultiLocation, XcmV2Xcm]>;
    readonly isUnexpectedResponse: boolean;
    readonly asUnexpectedResponse: ITuple<[XcmV1MultiLocation, u64]>;
    readonly isResponseReady: boolean;
    readonly asResponseReady: ITuple<[u64, XcmV2Response]>;
    readonly isNotified: boolean;
    readonly asNotified: ITuple<[u64, u8, u8]>;
    readonly isNotifyOverweight: boolean;
    readonly asNotifyOverweight: ITuple<[u64, u8, u8, SpWeightsWeightV2Weight, SpWeightsWeightV2Weight]>;
    readonly isNotifyDispatchError: boolean;
    readonly asNotifyDispatchError: ITuple<[u64, u8, u8]>;
    readonly isNotifyDecodeFailed: boolean;
    readonly asNotifyDecodeFailed: ITuple<[u64, u8, u8]>;
    readonly isInvalidResponder: boolean;
    readonly asInvalidResponder: ITuple<[XcmV1MultiLocation, u64, Option<XcmV1MultiLocation>]>;
    readonly isInvalidResponderVersion: boolean;
    readonly asInvalidResponderVersion: ITuple<[XcmV1MultiLocation, u64]>;
    readonly isResponseTaken: boolean;
    readonly asResponseTaken: u64;
    readonly isAssetsTrapped: boolean;
    readonly asAssetsTrapped: ITuple<[H256, XcmV1MultiLocation, XcmVersionedMultiAssets]>;
    readonly isVersionChangeNotified: boolean;
    readonly asVersionChangeNotified: ITuple<[XcmV1MultiLocation, u32]>;
    readonly isSupportedVersionChanged: boolean;
    readonly asSupportedVersionChanged: ITuple<[XcmV1MultiLocation, u32]>;
    readonly isNotifyTargetSendFail: boolean;
    readonly asNotifyTargetSendFail: ITuple<[XcmV1MultiLocation, u64, XcmV2TraitsError]>;
    readonly isNotifyTargetMigrationFail: boolean;
    readonly asNotifyTargetMigrationFail: ITuple<[XcmVersionedMultiLocation, u64]>;
    readonly isAssetsClaimed: boolean;
    readonly asAssetsClaimed: ITuple<[H256, XcmV1MultiLocation, XcmVersionedMultiAssets]>;
    readonly type: 'Attempted' | 'Sent' | 'UnexpectedResponse' | 'ResponseReady' | 'Notified' | 'NotifyOverweight' | 'NotifyDispatchError' | 'NotifyDecodeFailed' | 'InvalidResponder' | 'InvalidResponderVersion' | 'ResponseTaken' | 'AssetsTrapped' | 'VersionChangeNotified' | 'SupportedVersionChanged' | 'NotifyTargetSendFail' | 'NotifyTargetMigrationFail' | 'AssetsClaimed';
  }

  /** @name XcmV2TraitsOutcome (67) */
  interface XcmV2TraitsOutcome extends Enum {
    readonly isComplete: boolean;
    readonly asComplete: u64;
    readonly isIncomplete: boolean;
    readonly asIncomplete: ITuple<[u64, XcmV2TraitsError]>;
    readonly isError: boolean;
    readonly asError: XcmV2TraitsError;
    readonly type: 'Complete' | 'Incomplete' | 'Error';
  }

  /** @name XcmV2Xcm (68) */
  interface XcmV2Xcm extends Vec<XcmV2Instruction> {}

  /** @name XcmV2Instruction (70) */
  interface XcmV2Instruction extends Enum {
    readonly isWithdrawAsset: boolean;
    readonly asWithdrawAsset: XcmV1MultiassetMultiAssets;
    readonly isReserveAssetDeposited: boolean;
    readonly asReserveAssetDeposited: XcmV1MultiassetMultiAssets;
    readonly isReceiveTeleportedAsset: boolean;
    readonly asReceiveTeleportedAsset: XcmV1MultiassetMultiAssets;
    readonly isQueryResponse: boolean;
    readonly asQueryResponse: {
      readonly queryId: Compact<u64>;
      readonly response: XcmV2Response;
      readonly maxWeight: Compact<u64>;
    } & Struct;
    readonly isTransferAsset: boolean;
    readonly asTransferAsset: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly beneficiary: XcmV1MultiLocation;
    } & Struct;
    readonly isTransferReserveAsset: boolean;
    readonly asTransferReserveAsset: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly dest: XcmV1MultiLocation;
      readonly xcm: XcmV2Xcm;
    } & Struct;
    readonly isTransact: boolean;
    readonly asTransact: {
      readonly originType: XcmV0OriginKind;
      readonly requireWeightAtMost: Compact<u64>;
      readonly call: XcmDoubleEncoded;
    } & Struct;
    readonly isHrmpNewChannelOpenRequest: boolean;
    readonly asHrmpNewChannelOpenRequest: {
      readonly sender: Compact<u32>;
      readonly maxMessageSize: Compact<u32>;
      readonly maxCapacity: Compact<u32>;
    } & Struct;
    readonly isHrmpChannelAccepted: boolean;
    readonly asHrmpChannelAccepted: {
      readonly recipient: Compact<u32>;
    } & Struct;
    readonly isHrmpChannelClosing: boolean;
    readonly asHrmpChannelClosing: {
      readonly initiator: Compact<u32>;
      readonly sender: Compact<u32>;
      readonly recipient: Compact<u32>;
    } & Struct;
    readonly isClearOrigin: boolean;
    readonly isDescendOrigin: boolean;
    readonly asDescendOrigin: XcmV1MultilocationJunctions;
    readonly isReportError: boolean;
    readonly asReportError: {
      readonly queryId: Compact<u64>;
      readonly dest: XcmV1MultiLocation;
      readonly maxResponseWeight: Compact<u64>;
    } & Struct;
    readonly isDepositAsset: boolean;
    readonly asDepositAsset: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly maxAssets: Compact<u32>;
      readonly beneficiary: XcmV1MultiLocation;
    } & Struct;
    readonly isDepositReserveAsset: boolean;
    readonly asDepositReserveAsset: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly maxAssets: Compact<u32>;
      readonly dest: XcmV1MultiLocation;
      readonly xcm: XcmV2Xcm;
    } & Struct;
    readonly isExchangeAsset: boolean;
    readonly asExchangeAsset: {
      readonly give: XcmV1MultiassetMultiAssetFilter;
      readonly receive: XcmV1MultiassetMultiAssets;
    } & Struct;
    readonly isInitiateReserveWithdraw: boolean;
    readonly asInitiateReserveWithdraw: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly reserve: XcmV1MultiLocation;
      readonly xcm: XcmV2Xcm;
    } & Struct;
    readonly isInitiateTeleport: boolean;
    readonly asInitiateTeleport: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly dest: XcmV1MultiLocation;
      readonly xcm: XcmV2Xcm;
    } & Struct;
    readonly isQueryHolding: boolean;
    readonly asQueryHolding: {
      readonly queryId: Compact<u64>;
      readonly dest: XcmV1MultiLocation;
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly maxResponseWeight: Compact<u64>;
    } & Struct;
    readonly isBuyExecution: boolean;
    readonly asBuyExecution: {
      readonly fees: XcmV1MultiAsset;
      readonly weightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly isRefundSurplus: boolean;
    readonly isSetErrorHandler: boolean;
    readonly asSetErrorHandler: XcmV2Xcm;
    readonly isSetAppendix: boolean;
    readonly asSetAppendix: XcmV2Xcm;
    readonly isClearError: boolean;
    readonly isClaimAsset: boolean;
    readonly asClaimAsset: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly ticket: XcmV1MultiLocation;
    } & Struct;
    readonly isTrap: boolean;
    readonly asTrap: Compact<u64>;
    readonly isSubscribeVersion: boolean;
    readonly asSubscribeVersion: {
      readonly queryId: Compact<u64>;
      readonly maxResponseWeight: Compact<u64>;
    } & Struct;
    readonly isUnsubscribeVersion: boolean;
    readonly type: 'WithdrawAsset' | 'ReserveAssetDeposited' | 'ReceiveTeleportedAsset' | 'QueryResponse' | 'TransferAsset' | 'TransferReserveAsset' | 'Transact' | 'HrmpNewChannelOpenRequest' | 'HrmpChannelAccepted' | 'HrmpChannelClosing' | 'ClearOrigin' | 'DescendOrigin' | 'ReportError' | 'DepositAsset' | 'DepositReserveAsset' | 'ExchangeAsset' | 'InitiateReserveWithdraw' | 'InitiateTeleport' | 'QueryHolding' | 'BuyExecution' | 'RefundSurplus' | 'SetErrorHandler' | 'SetAppendix' | 'ClearError' | 'ClaimAsset' | 'Trap' | 'SubscribeVersion' | 'UnsubscribeVersion';
  }

  /** @name XcmV2Response (71) */
  interface XcmV2Response extends Enum {
    readonly isNull: boolean;
    readonly isAssets: boolean;
    readonly asAssets: XcmV1MultiassetMultiAssets;
    readonly isExecutionResult: boolean;
    readonly asExecutionResult: Option<ITuple<[u32, XcmV2TraitsError]>>;
    readonly isVersion: boolean;
    readonly asVersion: u32;
    readonly type: 'Null' | 'Assets' | 'ExecutionResult' | 'Version';
  }

  /** @name XcmV0OriginKind (74) */
  interface XcmV0OriginKind extends Enum {
    readonly isNative: boolean;
    readonly isSovereignAccount: boolean;
    readonly isSuperuser: boolean;
    readonly isXcm: boolean;
    readonly type: 'Native' | 'SovereignAccount' | 'Superuser' | 'Xcm';
  }

  /** @name XcmDoubleEncoded (75) */
  interface XcmDoubleEncoded extends Struct {
    readonly encoded: Bytes;
  }

  /** @name XcmV1MultiassetMultiAssetFilter (76) */
  interface XcmV1MultiassetMultiAssetFilter extends Enum {
    readonly isDefinite: boolean;
    readonly asDefinite: XcmV1MultiassetMultiAssets;
    readonly isWild: boolean;
    readonly asWild: XcmV1MultiassetWildMultiAsset;
    readonly type: 'Definite' | 'Wild';
  }

  /** @name XcmV1MultiassetWildMultiAsset (77) */
  interface XcmV1MultiassetWildMultiAsset extends Enum {
    readonly isAll: boolean;
    readonly isAllOf: boolean;
    readonly asAllOf: {
      readonly id: XcmV1MultiassetAssetId;
      readonly fun: XcmV1MultiassetWildFungibility;
    } & Struct;
    readonly type: 'All' | 'AllOf';
  }

  /** @name XcmV1MultiassetWildFungibility (78) */
  interface XcmV1MultiassetWildFungibility extends Enum {
    readonly isFungible: boolean;
    readonly isNonFungible: boolean;
    readonly type: 'Fungible' | 'NonFungible';
  }

  /** @name XcmV2WeightLimit (79) */
  interface XcmV2WeightLimit extends Enum {
    readonly isUnlimited: boolean;
    readonly isLimited: boolean;
    readonly asLimited: Compact<u64>;
    readonly type: 'Unlimited' | 'Limited';
  }

  /** @name XcmVersionedMultiAssets (81) */
  interface XcmVersionedMultiAssets extends Enum {
    readonly isV0: boolean;
    readonly asV0: Vec<XcmV0MultiAsset>;
    readonly isV1: boolean;
    readonly asV1: XcmV1MultiassetMultiAssets;
    readonly type: 'V0' | 'V1';
  }

  /** @name XcmV0MultiAsset (83) */
  interface XcmV0MultiAsset extends Enum {
    readonly isNone: boolean;
    readonly isAll: boolean;
    readonly isAllFungible: boolean;
    readonly isAllNonFungible: boolean;
    readonly isAllAbstractFungible: boolean;
    readonly asAllAbstractFungible: {
      readonly id: Bytes;
    } & Struct;
    readonly isAllAbstractNonFungible: boolean;
    readonly asAllAbstractNonFungible: {
      readonly class: Bytes;
    } & Struct;
    readonly isAllConcreteFungible: boolean;
    readonly asAllConcreteFungible: {
      readonly id: XcmV0MultiLocation;
    } & Struct;
    readonly isAllConcreteNonFungible: boolean;
    readonly asAllConcreteNonFungible: {
      readonly class: XcmV0MultiLocation;
    } & Struct;
    readonly isAbstractFungible: boolean;
    readonly asAbstractFungible: {
      readonly id: Bytes;
      readonly amount: Compact<u128>;
    } & Struct;
    readonly isAbstractNonFungible: boolean;
    readonly asAbstractNonFungible: {
      readonly class: Bytes;
      readonly instance: XcmV1MultiassetAssetInstance;
    } & Struct;
    readonly isConcreteFungible: boolean;
    readonly asConcreteFungible: {
      readonly id: XcmV0MultiLocation;
      readonly amount: Compact<u128>;
    } & Struct;
    readonly isConcreteNonFungible: boolean;
    readonly asConcreteNonFungible: {
      readonly class: XcmV0MultiLocation;
      readonly instance: XcmV1MultiassetAssetInstance;
    } & Struct;
    readonly type: 'None' | 'All' | 'AllFungible' | 'AllNonFungible' | 'AllAbstractFungible' | 'AllAbstractNonFungible' | 'AllConcreteFungible' | 'AllConcreteNonFungible' | 'AbstractFungible' | 'AbstractNonFungible' | 'ConcreteFungible' | 'ConcreteNonFungible';
  }

  /** @name XcmV0MultiLocation (84) */
  interface XcmV0MultiLocation extends Enum {
    readonly isNull: boolean;
    readonly isX1: boolean;
    readonly asX1: XcmV0Junction;
    readonly isX2: boolean;
    readonly asX2: ITuple<[XcmV0Junction, XcmV0Junction]>;
    readonly isX3: boolean;
    readonly asX3: ITuple<[XcmV0Junction, XcmV0Junction, XcmV0Junction]>;
    readonly isX4: boolean;
    readonly asX4: ITuple<[XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction]>;
    readonly isX5: boolean;
    readonly asX5: ITuple<[XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction]>;
    readonly isX6: boolean;
    readonly asX6: ITuple<[XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction]>;
    readonly isX7: boolean;
    readonly asX7: ITuple<[XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction]>;
    readonly isX8: boolean;
    readonly asX8: ITuple<[XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction, XcmV0Junction]>;
    readonly type: 'Null' | 'X1' | 'X2' | 'X3' | 'X4' | 'X5' | 'X6' | 'X7' | 'X8';
  }

  /** @name XcmV0Junction (85) */
  interface XcmV0Junction extends Enum {
    readonly isParent: boolean;
    readonly isParachain: boolean;
    readonly asParachain: Compact<u32>;
    readonly isAccountId32: boolean;
    readonly asAccountId32: {
      readonly network: XcmV0JunctionNetworkId;
      readonly id: U8aFixed;
    } & Struct;
    readonly isAccountIndex64: boolean;
    readonly asAccountIndex64: {
      readonly network: XcmV0JunctionNetworkId;
      readonly index: Compact<u64>;
    } & Struct;
    readonly isAccountKey20: boolean;
    readonly asAccountKey20: {
      readonly network: XcmV0JunctionNetworkId;
      readonly key: U8aFixed;
    } & Struct;
    readonly isPalletInstance: boolean;
    readonly asPalletInstance: u8;
    readonly isGeneralIndex: boolean;
    readonly asGeneralIndex: Compact<u128>;
    readonly isGeneralKey: boolean;
    readonly asGeneralKey: Bytes;
    readonly isOnlyChild: boolean;
    readonly isPlurality: boolean;
    readonly asPlurality: {
      readonly id: XcmV0JunctionBodyId;
      readonly part: XcmV0JunctionBodyPart;
    } & Struct;
    readonly type: 'Parent' | 'Parachain' | 'AccountId32' | 'AccountIndex64' | 'AccountKey20' | 'PalletInstance' | 'GeneralIndex' | 'GeneralKey' | 'OnlyChild' | 'Plurality';
  }

  /** @name XcmVersionedMultiLocation (86) */
  interface XcmVersionedMultiLocation extends Enum {
    readonly isV0: boolean;
    readonly asV0: XcmV0MultiLocation;
    readonly isV1: boolean;
    readonly asV1: XcmV1MultiLocation;
    readonly type: 'V0' | 'V1';
  }

  /** @name CumulusPalletXcmEvent (87) */
  interface CumulusPalletXcmEvent extends Enum {
    readonly isInvalidFormat: boolean;
    readonly asInvalidFormat: U8aFixed;
    readonly isUnsupportedVersion: boolean;
    readonly asUnsupportedVersion: U8aFixed;
    readonly isExecutedDownward: boolean;
    readonly asExecutedDownward: ITuple<[U8aFixed, XcmV2TraitsOutcome]>;
    readonly type: 'InvalidFormat' | 'UnsupportedVersion' | 'ExecutedDownward';
  }

  /** @name CumulusPalletDmpQueueEvent (88) */
  interface CumulusPalletDmpQueueEvent extends Enum {
    readonly isInvalidFormat: boolean;
    readonly asInvalidFormat: {
      readonly messageId: U8aFixed;
    } & Struct;
    readonly isUnsupportedVersion: boolean;
    readonly asUnsupportedVersion: {
      readonly messageId: U8aFixed;
    } & Struct;
    readonly isExecutedDownward: boolean;
    readonly asExecutedDownward: {
      readonly messageId: U8aFixed;
      readonly outcome: XcmV2TraitsOutcome;
    } & Struct;
    readonly isWeightExhausted: boolean;
    readonly asWeightExhausted: {
      readonly messageId: U8aFixed;
      readonly remainingWeight: SpWeightsWeightV2Weight;
      readonly requiredWeight: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isOverweightEnqueued: boolean;
    readonly asOverweightEnqueued: {
      readonly messageId: U8aFixed;
      readonly overweightIndex: u64;
      readonly requiredWeight: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isOverweightServiced: boolean;
    readonly asOverweightServiced: {
      readonly overweightIndex: u64;
      readonly weightUsed: SpWeightsWeightV2Weight;
    } & Struct;
    readonly type: 'InvalidFormat' | 'UnsupportedVersion' | 'ExecutedDownward' | 'WeightExhausted' | 'OverweightEnqueued' | 'OverweightServiced';
  }

  /** @name PalletCommonEvent (89) */
  interface PalletCommonEvent extends Enum {
    readonly isCollectionCreated: boolean;
    readonly asCollectionCreated: ITuple<[u32, u8, AccountId32]>;
    readonly isCollectionDestroyed: boolean;
    readonly asCollectionDestroyed: u32;
    readonly isItemCreated: boolean;
    readonly asItemCreated: ITuple<[u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
    readonly isItemDestroyed: boolean;
    readonly asItemDestroyed: ITuple<[u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
    readonly isTransfer: boolean;
    readonly asTransfer: ITuple<[u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
    readonly isApproved: boolean;
    readonly asApproved: ITuple<[u32, u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, u128]>;
    readonly isApprovedForAll: boolean;
    readonly asApprovedForAll: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmAccountBasicCrossAccountIdRepr, bool]>;
    readonly isCollectionPropertySet: boolean;
    readonly asCollectionPropertySet: ITuple<[u32, Bytes]>;
    readonly isCollectionPropertyDeleted: boolean;
    readonly asCollectionPropertyDeleted: ITuple<[u32, Bytes]>;
    readonly isTokenPropertySet: boolean;
    readonly asTokenPropertySet: ITuple<[u32, u32, Bytes]>;
    readonly isTokenPropertyDeleted: boolean;
    readonly asTokenPropertyDeleted: ITuple<[u32, u32, Bytes]>;
    readonly isPropertyPermissionSet: boolean;
    readonly asPropertyPermissionSet: ITuple<[u32, Bytes]>;
    readonly isAllowListAddressAdded: boolean;
    readonly asAllowListAddressAdded: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isAllowListAddressRemoved: boolean;
    readonly asAllowListAddressRemoved: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isCollectionAdminAdded: boolean;
    readonly asCollectionAdminAdded: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isCollectionAdminRemoved: boolean;
    readonly asCollectionAdminRemoved: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isCollectionLimitSet: boolean;
    readonly asCollectionLimitSet: u32;
    readonly isCollectionOwnerChanged: boolean;
    readonly asCollectionOwnerChanged: ITuple<[u32, AccountId32]>;
    readonly isCollectionPermissionSet: boolean;
    readonly asCollectionPermissionSet: u32;
    readonly isCollectionSponsorSet: boolean;
    readonly asCollectionSponsorSet: ITuple<[u32, AccountId32]>;
    readonly isSponsorshipConfirmed: boolean;
    readonly asSponsorshipConfirmed: ITuple<[u32, AccountId32]>;
    readonly isCollectionSponsorRemoved: boolean;
    readonly asCollectionSponsorRemoved: u32;
    readonly type: 'CollectionCreated' | 'CollectionDestroyed' | 'ItemCreated' | 'ItemDestroyed' | 'Transfer' | 'Approved' | 'ApprovedForAll' | 'CollectionPropertySet' | 'CollectionPropertyDeleted' | 'TokenPropertySet' | 'TokenPropertyDeleted' | 'PropertyPermissionSet' | 'AllowListAddressAdded' | 'AllowListAddressRemoved' | 'CollectionAdminAdded' | 'CollectionAdminRemoved' | 'CollectionLimitSet' | 'CollectionOwnerChanged' | 'CollectionPermissionSet' | 'CollectionSponsorSet' | 'SponsorshipConfirmed' | 'CollectionSponsorRemoved';
  }

  /** @name PalletEvmAccountBasicCrossAccountIdRepr (92) */
  interface PalletEvmAccountBasicCrossAccountIdRepr extends Enum {
    readonly isSubstrate: boolean;
    readonly asSubstrate: AccountId32;
    readonly isEthereum: boolean;
    readonly asEthereum: H160;
    readonly type: 'Substrate' | 'Ethereum';
  }

  /** @name PalletStructureEvent (96) */
  interface PalletStructureEvent extends Enum {
    readonly isExecuted: boolean;
    readonly asExecuted: Result<Null, SpRuntimeDispatchError>;
    readonly type: 'Executed';
  }

  /** @name PalletRmrkCoreEvent (97) */
  interface PalletRmrkCoreEvent extends Enum {
    readonly isCollectionCreated: boolean;
    readonly asCollectionCreated: {
      readonly issuer: AccountId32;
      readonly collectionId: u32;
    } & Struct;
    readonly isCollectionDestroyed: boolean;
    readonly asCollectionDestroyed: {
      readonly issuer: AccountId32;
      readonly collectionId: u32;
    } & Struct;
    readonly isIssuerChanged: boolean;
    readonly asIssuerChanged: {
      readonly oldIssuer: AccountId32;
      readonly newIssuer: AccountId32;
      readonly collectionId: u32;
    } & Struct;
    readonly isCollectionLocked: boolean;
    readonly asCollectionLocked: {
      readonly issuer: AccountId32;
      readonly collectionId: u32;
    } & Struct;
    readonly isNftMinted: boolean;
    readonly asNftMinted: {
      readonly owner: AccountId32;
      readonly collectionId: u32;
      readonly nftId: u32;
    } & Struct;
    readonly isNftBurned: boolean;
    readonly asNftBurned: {
      readonly owner: AccountId32;
      readonly nftId: u32;
    } & Struct;
    readonly isNftSent: boolean;
    readonly asNftSent: {
      readonly sender: AccountId32;
      readonly recipient: RmrkTraitsNftAccountIdOrCollectionNftTuple;
      readonly collectionId: u32;
      readonly nftId: u32;
      readonly approvalRequired: bool;
    } & Struct;
    readonly isNftAccepted: boolean;
    readonly asNftAccepted: {
      readonly sender: AccountId32;
      readonly recipient: RmrkTraitsNftAccountIdOrCollectionNftTuple;
      readonly collectionId: u32;
      readonly nftId: u32;
    } & Struct;
    readonly isNftRejected: boolean;
    readonly asNftRejected: {
      readonly sender: AccountId32;
      readonly collectionId: u32;
      readonly nftId: u32;
    } & Struct;
    readonly isPropertySet: boolean;
    readonly asPropertySet: {
      readonly collectionId: u32;
      readonly maybeNftId: Option<u32>;
      readonly key: Bytes;
      readonly value: Bytes;
    } & Struct;
    readonly isResourceAdded: boolean;
    readonly asResourceAdded: {
      readonly nftId: u32;
      readonly resourceId: u32;
    } & Struct;
    readonly isResourceRemoval: boolean;
    readonly asResourceRemoval: {
      readonly nftId: u32;
      readonly resourceId: u32;
    } & Struct;
    readonly isResourceAccepted: boolean;
    readonly asResourceAccepted: {
      readonly nftId: u32;
      readonly resourceId: u32;
    } & Struct;
    readonly isResourceRemovalAccepted: boolean;
    readonly asResourceRemovalAccepted: {
      readonly nftId: u32;
      readonly resourceId: u32;
    } & Struct;
    readonly isPrioritySet: boolean;
    readonly asPrioritySet: {
      readonly collectionId: u32;
      readonly nftId: u32;
    } & Struct;
    readonly type: 'CollectionCreated' | 'CollectionDestroyed' | 'IssuerChanged' | 'CollectionLocked' | 'NftMinted' | 'NftBurned' | 'NftSent' | 'NftAccepted' | 'NftRejected' | 'PropertySet' | 'ResourceAdded' | 'ResourceRemoval' | 'ResourceAccepted' | 'ResourceRemovalAccepted' | 'PrioritySet';
  }

  /** @name RmrkTraitsNftAccountIdOrCollectionNftTuple (98) */
  interface RmrkTraitsNftAccountIdOrCollectionNftTuple extends Enum {
    readonly isAccountId: boolean;
    readonly asAccountId: AccountId32;
    readonly isCollectionAndNftTuple: boolean;
    readonly asCollectionAndNftTuple: ITuple<[u32, u32]>;
    readonly type: 'AccountId' | 'CollectionAndNftTuple';
  }

  /** @name PalletRmrkEquipEvent (102) */
  interface PalletRmrkEquipEvent extends Enum {
    readonly isBaseCreated: boolean;
    readonly asBaseCreated: {
      readonly issuer: AccountId32;
      readonly baseId: u32;
    } & Struct;
    readonly isEquippablesUpdated: boolean;
    readonly asEquippablesUpdated: {
      readonly baseId: u32;
      readonly slotId: u32;
    } & Struct;
    readonly type: 'BaseCreated' | 'EquippablesUpdated';
  }

  /** @name PalletAppPromotionEvent (103) */
  interface PalletAppPromotionEvent extends Enum {
    readonly isStakingRecalculation: boolean;
    readonly asStakingRecalculation: ITuple<[AccountId32, u128, u128]>;
    readonly isStake: boolean;
    readonly asStake: ITuple<[AccountId32, u128]>;
    readonly isUnstake: boolean;
    readonly asUnstake: ITuple<[AccountId32, u128]>;
    readonly isSetAdmin: boolean;
    readonly asSetAdmin: AccountId32;
    readonly type: 'StakingRecalculation' | 'Stake' | 'Unstake' | 'SetAdmin';
  }

  /** @name PalletForeignAssetsModuleEvent (104) */
  interface PalletForeignAssetsModuleEvent extends Enum {
    readonly isForeignAssetRegistered: boolean;
    readonly asForeignAssetRegistered: {
      readonly assetId: u32;
      readonly assetAddress: XcmV1MultiLocation;
      readonly metadata: PalletForeignAssetsModuleAssetMetadata;
    } & Struct;
    readonly isForeignAssetUpdated: boolean;
    readonly asForeignAssetUpdated: {
      readonly assetId: u32;
      readonly assetAddress: XcmV1MultiLocation;
      readonly metadata: PalletForeignAssetsModuleAssetMetadata;
    } & Struct;
    readonly isAssetRegistered: boolean;
    readonly asAssetRegistered: {
      readonly assetId: PalletForeignAssetsAssetIds;
      readonly metadata: PalletForeignAssetsModuleAssetMetadata;
    } & Struct;
    readonly isAssetUpdated: boolean;
    readonly asAssetUpdated: {
      readonly assetId: PalletForeignAssetsAssetIds;
      readonly metadata: PalletForeignAssetsModuleAssetMetadata;
    } & Struct;
    readonly type: 'ForeignAssetRegistered' | 'ForeignAssetUpdated' | 'AssetRegistered' | 'AssetUpdated';
  }

  /** @name PalletForeignAssetsModuleAssetMetadata (105) */
  interface PalletForeignAssetsModuleAssetMetadata extends Struct {
    readonly name: Bytes;
    readonly symbol: Bytes;
    readonly decimals: u8;
    readonly minimalBalance: u128;
  }

  /** @name PalletEvmEvent (106) */
  interface PalletEvmEvent extends Enum {
    readonly isLog: boolean;
    readonly asLog: {
      readonly log: EthereumLog;
    } & Struct;
    readonly isCreated: boolean;
    readonly asCreated: {
      readonly address: H160;
    } & Struct;
    readonly isCreatedFailed: boolean;
    readonly asCreatedFailed: {
      readonly address: H160;
    } & Struct;
    readonly isExecuted: boolean;
    readonly asExecuted: {
      readonly address: H160;
    } & Struct;
    readonly isExecutedFailed: boolean;
    readonly asExecutedFailed: {
      readonly address: H160;
    } & Struct;
    readonly type: 'Log' | 'Created' | 'CreatedFailed' | 'Executed' | 'ExecutedFailed';
  }

  /** @name EthereumLog (107) */
  interface EthereumLog extends Struct {
    readonly address: H160;
    readonly topics: Vec<H256>;
    readonly data: Bytes;
  }

  /** @name PalletEthereumEvent (109) */
  interface PalletEthereumEvent extends Enum {
    readonly isExecuted: boolean;
    readonly asExecuted: {
      readonly from: H160;
      readonly to: H160;
      readonly transactionHash: H256;
      readonly exitReason: EvmCoreErrorExitReason;
    } & Struct;
    readonly type: 'Executed';
  }

  /** @name EvmCoreErrorExitReason (110) */
  interface EvmCoreErrorExitReason extends Enum {
    readonly isSucceed: boolean;
    readonly asSucceed: EvmCoreErrorExitSucceed;
    readonly isError: boolean;
    readonly asError: EvmCoreErrorExitError;
    readonly isRevert: boolean;
    readonly asRevert: EvmCoreErrorExitRevert;
    readonly isFatal: boolean;
    readonly asFatal: EvmCoreErrorExitFatal;
    readonly type: 'Succeed' | 'Error' | 'Revert' | 'Fatal';
  }

  /** @name EvmCoreErrorExitSucceed (111) */
  interface EvmCoreErrorExitSucceed extends Enum {
    readonly isStopped: boolean;
    readonly isReturned: boolean;
    readonly isSuicided: boolean;
    readonly type: 'Stopped' | 'Returned' | 'Suicided';
  }

  /** @name EvmCoreErrorExitError (112) */
  interface EvmCoreErrorExitError extends Enum {
    readonly isStackUnderflow: boolean;
    readonly isStackOverflow: boolean;
    readonly isInvalidJump: boolean;
    readonly isInvalidRange: boolean;
    readonly isDesignatedInvalid: boolean;
    readonly isCallTooDeep: boolean;
    readonly isCreateCollision: boolean;
    readonly isCreateContractLimit: boolean;
    readonly isOutOfOffset: boolean;
    readonly isOutOfGas: boolean;
    readonly isOutOfFund: boolean;
    readonly isPcUnderflow: boolean;
    readonly isCreateEmpty: boolean;
    readonly isOther: boolean;
    readonly asOther: Text;
    readonly isInvalidCode: boolean;
    readonly type: 'StackUnderflow' | 'StackOverflow' | 'InvalidJump' | 'InvalidRange' | 'DesignatedInvalid' | 'CallTooDeep' | 'CreateCollision' | 'CreateContractLimit' | 'OutOfOffset' | 'OutOfGas' | 'OutOfFund' | 'PcUnderflow' | 'CreateEmpty' | 'Other' | 'InvalidCode';
  }

  /** @name EvmCoreErrorExitRevert (115) */
  interface EvmCoreErrorExitRevert extends Enum {
    readonly isReverted: boolean;
    readonly type: 'Reverted';
  }

  /** @name EvmCoreErrorExitFatal (116) */
  interface EvmCoreErrorExitFatal extends Enum {
    readonly isNotSupported: boolean;
    readonly isUnhandledInterrupt: boolean;
    readonly isCallErrorAsFatal: boolean;
    readonly asCallErrorAsFatal: EvmCoreErrorExitError;
    readonly isOther: boolean;
    readonly asOther: Text;
    readonly type: 'NotSupported' | 'UnhandledInterrupt' | 'CallErrorAsFatal' | 'Other';
  }

  /** @name PalletEvmContractHelpersEvent (117) */
  interface PalletEvmContractHelpersEvent extends Enum {
    readonly isContractSponsorSet: boolean;
    readonly asContractSponsorSet: ITuple<[H160, AccountId32]>;
    readonly isContractSponsorshipConfirmed: boolean;
    readonly asContractSponsorshipConfirmed: ITuple<[H160, AccountId32]>;
    readonly isContractSponsorRemoved: boolean;
    readonly asContractSponsorRemoved: H160;
    readonly type: 'ContractSponsorSet' | 'ContractSponsorshipConfirmed' | 'ContractSponsorRemoved';
  }

  /** @name PalletEvmMigrationEvent (118) */
  interface PalletEvmMigrationEvent extends Enum {
    readonly isTestEvent: boolean;
    readonly type: 'TestEvent';
  }

  /** @name PalletMaintenanceEvent (119) */
  interface PalletMaintenanceEvent extends Enum {
    readonly isMaintenanceEnabled: boolean;
    readonly isMaintenanceDisabled: boolean;
    readonly type: 'MaintenanceEnabled' | 'MaintenanceDisabled';
  }

  /** @name PalletTestUtilsEvent (120) */
  interface PalletTestUtilsEvent extends Enum {
    readonly isValueIsSet: boolean;
    readonly isShouldRollback: boolean;
    readonly isBatchCompleted: boolean;
    readonly type: 'ValueIsSet' | 'ShouldRollback' | 'BatchCompleted';
  }

  /** @name FrameSystemPhase (121) */
  interface FrameSystemPhase extends Enum {
    readonly isApplyExtrinsic: boolean;
    readonly asApplyExtrinsic: u32;
    readonly isFinalization: boolean;
    readonly isInitialization: boolean;
    readonly type: 'ApplyExtrinsic' | 'Finalization' | 'Initialization';
  }

  /** @name FrameSystemLastRuntimeUpgradeInfo (124) */
  interface FrameSystemLastRuntimeUpgradeInfo extends Struct {
    readonly specVersion: Compact<u32>;
    readonly specName: Text;
  }

  /** @name FrameSystemCall (125) */
  interface FrameSystemCall extends Enum {
    readonly isRemark: boolean;
    readonly asRemark: {
      readonly remark: Bytes;
    } & Struct;
    readonly isSetHeapPages: boolean;
    readonly asSetHeapPages: {
      readonly pages: u64;
    } & Struct;
    readonly isSetCode: boolean;
    readonly asSetCode: {
      readonly code: Bytes;
    } & Struct;
    readonly isSetCodeWithoutChecks: boolean;
    readonly asSetCodeWithoutChecks: {
      readonly code: Bytes;
    } & Struct;
    readonly isSetStorage: boolean;
    readonly asSetStorage: {
      readonly items: Vec<ITuple<[Bytes, Bytes]>>;
    } & Struct;
    readonly isKillStorage: boolean;
    readonly asKillStorage: {
      readonly keys_: Vec<Bytes>;
    } & Struct;
    readonly isKillPrefix: boolean;
    readonly asKillPrefix: {
      readonly prefix: Bytes;
      readonly subkeys: u32;
    } & Struct;
    readonly isRemarkWithEvent: boolean;
    readonly asRemarkWithEvent: {
      readonly remark: Bytes;
    } & Struct;
    readonly type: 'Remark' | 'SetHeapPages' | 'SetCode' | 'SetCodeWithoutChecks' | 'SetStorage' | 'KillStorage' | 'KillPrefix' | 'RemarkWithEvent';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockWeights (129) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockWeights (130) */
=======
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockWeights (133) */
=======
  /** @name FrameSystemLimitsBlockWeights (134) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name FrameSystemLimitsBlockWeights (133) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name FrameSystemLimitsBlockWeights (129) */
>>>>>>> chore: regenerate types
  interface FrameSystemLimitsBlockWeights extends Struct {
    readonly baseBlock: SpWeightsWeightV2Weight;
    readonly maxBlock: SpWeightsWeightV2Weight;
    readonly perClass: FrameSupportDispatchPerDispatchClassWeightsPerClass;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (130) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (131) */
=======
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (134) */
=======
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (135) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (134) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (130) */
>>>>>>> chore: regenerate types
  interface FrameSupportDispatchPerDispatchClassWeightsPerClass extends Struct {
    readonly normal: FrameSystemLimitsWeightsPerClass;
    readonly operational: FrameSystemLimitsWeightsPerClass;
    readonly mandatory: FrameSystemLimitsWeightsPerClass;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemLimitsWeightsPerClass (131) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FrameSystemLimitsWeightsPerClass (132) */
=======
<<<<<<< HEAD
  /** @name FrameSystemLimitsWeightsPerClass (135) */
=======
  /** @name FrameSystemLimitsWeightsPerClass (136) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name FrameSystemLimitsWeightsPerClass (135) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name FrameSystemLimitsWeightsPerClass (131) */
>>>>>>> chore: regenerate types
  interface FrameSystemLimitsWeightsPerClass extends Struct {
    readonly baseExtrinsic: SpWeightsWeightV2Weight;
    readonly maxExtrinsic: Option<SpWeightsWeightV2Weight>;
    readonly maxTotal: Option<SpWeightsWeightV2Weight>;
    readonly reserved: Option<SpWeightsWeightV2Weight>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockLength (133) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockLength (134) */
=======
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockLength (137) */
=======
  /** @name FrameSystemLimitsBlockLength (138) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name FrameSystemLimitsBlockLength (137) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name FrameSystemLimitsBlockLength (133) */
>>>>>>> chore: regenerate types
  interface FrameSystemLimitsBlockLength extends Struct {
    readonly max: FrameSupportDispatchPerDispatchClassU32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassU32 (134) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassU32 (135) */
=======
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassU32 (138) */
=======
  /** @name FrameSupportDispatchPerDispatchClassU32 (139) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name FrameSupportDispatchPerDispatchClassU32 (138) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name FrameSupportDispatchPerDispatchClassU32 (134) */
>>>>>>> chore: regenerate types
  interface FrameSupportDispatchPerDispatchClassU32 extends Struct {
    readonly normal: u32;
    readonly operational: u32;
    readonly mandatory: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpWeightsRuntimeDbWeight (135) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name SpWeightsRuntimeDbWeight (136) */
=======
<<<<<<< HEAD
  /** @name SpWeightsRuntimeDbWeight (139) */
=======
  /** @name SpWeightsRuntimeDbWeight (140) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name SpWeightsRuntimeDbWeight (139) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name SpWeightsRuntimeDbWeight (135) */
>>>>>>> chore: regenerate types
  interface SpWeightsRuntimeDbWeight extends Struct {
    readonly read: u64;
    readonly write: u64;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpVersionRuntimeVersion (136) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name SpVersionRuntimeVersion (137) */
=======
<<<<<<< HEAD
  /** @name SpVersionRuntimeVersion (140) */
=======
  /** @name SpVersionRuntimeVersion (141) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name SpVersionRuntimeVersion (140) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name SpVersionRuntimeVersion (136) */
>>>>>>> chore: regenerate types
  interface SpVersionRuntimeVersion extends Struct {
    readonly specName: Text;
    readonly implName: Text;
    readonly authoringVersion: u32;
    readonly specVersion: u32;
    readonly implVersion: u32;
    readonly apis: Vec<ITuple<[U8aFixed, u32]>>;
    readonly transactionVersion: u32;
    readonly stateVersion: u8;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemError (141) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FrameSystemError (142) */
=======
<<<<<<< HEAD
  /** @name FrameSystemError (145) */
=======
  /** @name FrameSystemError (146) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name FrameSystemError (145) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name FrameSystemError (141) */
>>>>>>> chore: regenerate types
  interface FrameSystemError extends Enum {
    readonly isInvalidSpecName: boolean;
    readonly isSpecVersionNeedsToIncrease: boolean;
    readonly isFailedToExtractRuntimeVersion: boolean;
    readonly isNonDefaultComposite: boolean;
    readonly isNonZeroRefCount: boolean;
    readonly isCallFiltered: boolean;
    readonly type: 'InvalidSpecName' | 'SpecVersionNeedsToIncrease' | 'FailedToExtractRuntimeVersion' | 'NonDefaultComposite' | 'NonZeroRefCount' | 'CallFiltered';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2PersistedValidationData (142) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2PersistedValidationData (143) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2PersistedValidationData (146) */
=======
  /** @name PolkadotPrimitivesV2PersistedValidationData (147) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PolkadotPrimitivesV2PersistedValidationData (146) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotPrimitivesV2PersistedValidationData (142) */
>>>>>>> chore: regenerate types
  interface PolkadotPrimitivesV2PersistedValidationData extends Struct {
    readonly parentHead: Bytes;
    readonly relayParentNumber: u32;
    readonly relayParentStorageRoot: H256;
    readonly maxPovSize: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2UpgradeRestriction (145) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2UpgradeRestriction (146) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2UpgradeRestriction (149) */
=======
  /** @name PolkadotPrimitivesV2UpgradeRestriction (150) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PolkadotPrimitivesV2UpgradeRestriction (149) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotPrimitivesV2UpgradeRestriction (145) */
>>>>>>> chore: regenerate types
  interface PolkadotPrimitivesV2UpgradeRestriction extends Enum {
    readonly isPresent: boolean;
    readonly type: 'Present';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpTrieStorageProof (146) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name SpTrieStorageProof (147) */
=======
<<<<<<< HEAD
  /** @name SpTrieStorageProof (150) */
=======
  /** @name SpTrieStorageProof (151) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name SpTrieStorageProof (150) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name SpTrieStorageProof (146) */
>>>>>>> chore: regenerate types
  interface SpTrieStorageProof extends Struct {
    readonly trieNodes: BTreeSet<Bytes>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (148) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (149) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (152) */
=======
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (153) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (152) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (148) */
>>>>>>> chore: regenerate types
  interface CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot extends Struct {
    readonly dmqMqcHead: H256;
    readonly relayDispatchQueueSize: ITuple<[u32, u32]>;
    readonly ingressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
    readonly egressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (151) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (152) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (155) */
=======
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (156) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (155) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (151) */
>>>>>>> chore: regenerate types
  interface PolkadotPrimitivesV2AbridgedHrmpChannel extends Struct {
    readonly maxCapacity: u32;
    readonly maxTotalSize: u32;
    readonly maxMessageSize: u32;
    readonly msgCount: u32;
    readonly totalSize: u32;
    readonly mqcHead: Option<H256>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (152) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (153) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (156) */
=======
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (157) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (156) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (152) */
>>>>>>> chore: regenerate types
  interface PolkadotPrimitivesV2AbridgedHostConfiguration extends Struct {
    readonly maxCodeSize: u32;
    readonly maxHeadDataSize: u32;
    readonly maxUpwardQueueCount: u32;
    readonly maxUpwardQueueSize: u32;
    readonly maxUpwardMessageSize: u32;
    readonly maxUpwardMessageNumPerCandidate: u32;
    readonly hrmpMaxMessageNumPerCandidate: u32;
    readonly validationUpgradeCooldown: u32;
    readonly validationUpgradeDelay: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (158) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (159) */
=======
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (162) */
=======
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (163) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (162) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (158) */
>>>>>>> chore: regenerate types
  interface PolkadotCorePrimitivesOutboundHrmpMessage extends Struct {
    readonly recipient: u32;
    readonly data: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemCall (159) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemCall (160) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemCall (163) */
=======
  /** @name CumulusPalletParachainSystemCall (164) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name CumulusPalletParachainSystemCall (163) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletParachainSystemCall (159) */
>>>>>>> chore: regenerate types
  interface CumulusPalletParachainSystemCall extends Enum {
    readonly isSetValidationData: boolean;
    readonly asSetValidationData: {
      readonly data: CumulusPrimitivesParachainInherentParachainInherentData;
    } & Struct;
    readonly isSudoSendUpwardMessage: boolean;
    readonly asSudoSendUpwardMessage: {
      readonly message: Bytes;
    } & Struct;
    readonly isAuthorizeUpgrade: boolean;
    readonly asAuthorizeUpgrade: {
      readonly codeHash: H256;
    } & Struct;
    readonly isEnactAuthorizedUpgrade: boolean;
    readonly asEnactAuthorizedUpgrade: {
      readonly code: Bytes;
    } & Struct;
    readonly type: 'SetValidationData' | 'SudoSendUpwardMessage' | 'AuthorizeUpgrade' | 'EnactAuthorizedUpgrade';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (160) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (161) */
=======
<<<<<<< HEAD
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (164) */
=======
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (165) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (164) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (160) */
>>>>>>> chore: regenerate types
  interface CumulusPrimitivesParachainInherentParachainInherentData extends Struct {
    readonly validationData: PolkadotPrimitivesV2PersistedValidationData;
    readonly relayChainState: SpTrieStorageProof;
    readonly downwardMessages: Vec<PolkadotCorePrimitivesInboundDownwardMessage>;
    readonly horizontalMessages: BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (162) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (163) */
=======
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (166) */
=======
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (167) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (166) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (162) */
>>>>>>> chore: regenerate types
  interface PolkadotCorePrimitivesInboundDownwardMessage extends Struct {
    readonly sentAt: u32;
    readonly msg: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (165) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (166) */
=======
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (169) */
=======
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (170) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (169) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (165) */
>>>>>>> chore: regenerate types
  interface PolkadotCorePrimitivesInboundHrmpMessage extends Struct {
    readonly sentAt: u32;
    readonly data: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemError (168) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemError (169) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemError (172) */
=======
  /** @name CumulusPalletParachainSystemError (173) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name CumulusPalletParachainSystemError (172) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletParachainSystemError (168) */
>>>>>>> chore: regenerate types
  interface CumulusPalletParachainSystemError extends Enum {
    readonly isOverlappingUpgrades: boolean;
    readonly isProhibitedByPolkadot: boolean;
    readonly isTooBig: boolean;
    readonly isValidationDataNotAvailable: boolean;
    readonly isHostConfigurationNotAvailable: boolean;
    readonly isNotScheduled: boolean;
    readonly isNothingAuthorized: boolean;
    readonly isUnauthorized: boolean;
    readonly type: 'OverlappingUpgrades' | 'ProhibitedByPolkadot' | 'TooBig' | 'ValidationDataNotAvailable' | 'HostConfigurationNotAvailable' | 'NotScheduled' | 'NothingAuthorized' | 'Unauthorized';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesBalanceLock (170) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletBalancesBalanceLock (171) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesBalanceLock (174) */
=======
  /** @name PalletBalancesBalanceLock (175) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletBalancesBalanceLock (174) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletBalancesBalanceLock (170) */
>>>>>>> chore: regenerate types
  interface PalletBalancesBalanceLock extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
    readonly reasons: PalletBalancesReasons;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesReasons (171) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletBalancesReasons (172) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesReasons (175) */
=======
  /** @name PalletBalancesReasons (176) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletBalancesReasons (175) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletBalancesReasons (171) */
>>>>>>> chore: regenerate types
  interface PalletBalancesReasons extends Enum {
    readonly isFee: boolean;
    readonly isMisc: boolean;
    readonly isAll: boolean;
    readonly type: 'Fee' | 'Misc' | 'All';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesReserveData (174) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletBalancesReserveData (175) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesReserveData (178) */
=======
  /** @name PalletBalancesReserveData (179) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletBalancesReserveData (178) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletBalancesReserveData (174) */
>>>>>>> chore: regenerate types
  interface PalletBalancesReserveData extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesCall (176) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletBalancesReleases (177) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesReleases (180) */
=======
  /** @name PalletBalancesReleases (181) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletBalancesReleases (180) */
>>>>>>> fix: regenerate types after rebase
  interface PalletBalancesReleases extends Enum {
    readonly isV100: boolean;
    readonly isV200: boolean;
    readonly type: 'V100' | 'V200';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesCall (178) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesCall (181) */
=======
  /** @name PalletBalancesCall (182) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletBalancesCall (181) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletBalancesCall (176) */
>>>>>>> chore: regenerate types
  interface PalletBalancesCall extends Enum {
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isSetBalance: boolean;
    readonly asSetBalance: {
      readonly who: MultiAddress;
      readonly newFree: Compact<u128>;
      readonly newReserved: Compact<u128>;
    } & Struct;
    readonly isForceTransfer: boolean;
    readonly asForceTransfer: {
      readonly source: MultiAddress;
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isTransferKeepAlive: boolean;
    readonly asTransferKeepAlive: {
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isTransferAll: boolean;
    readonly asTransferAll: {
      readonly dest: MultiAddress;
      readonly keepAlive: bool;
    } & Struct;
    readonly isForceUnreserve: boolean;
    readonly asForceUnreserve: {
      readonly who: MultiAddress;
      readonly amount: u128;
    } & Struct;
    readonly type: 'Transfer' | 'SetBalance' | 'ForceTransfer' | 'TransferKeepAlive' | 'TransferAll' | 'ForceUnreserve';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesError (179) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletBalancesError (181) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesError (184) */
=======
  /** @name PalletBalancesError (185) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletBalancesError (184) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletBalancesError (179) */
>>>>>>> chore: regenerate types
  interface PalletBalancesError extends Enum {
    readonly isVestingBalance: boolean;
    readonly isLiquidityRestrictions: boolean;
    readonly isInsufficientBalance: boolean;
    readonly isExistentialDeposit: boolean;
    readonly isKeepAlive: boolean;
    readonly isExistingVestingSchedule: boolean;
    readonly isDeadAccount: boolean;
    readonly isTooManyReserves: boolean;
    readonly type: 'VestingBalance' | 'LiquidityRestrictions' | 'InsufficientBalance' | 'ExistentialDeposit' | 'KeepAlive' | 'ExistingVestingSchedule' | 'DeadAccount' | 'TooManyReserves';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTimestampCall (181) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletTimestampCall (183) */
=======
<<<<<<< HEAD
  /** @name PalletTimestampCall (186) */
=======
  /** @name PalletTimestampCall (187) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletTimestampCall (186) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletTimestampCall (181) */
>>>>>>> chore: regenerate types
  interface PalletTimestampCall extends Enum {
    readonly isSet: boolean;
    readonly asSet: {
      readonly now: Compact<u64>;
    } & Struct;
    readonly type: 'Set';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTransactionPaymentReleases (183) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletTransactionPaymentReleases (185) */
=======
<<<<<<< HEAD
  /** @name PalletTransactionPaymentReleases (188) */
=======
  /** @name PalletTransactionPaymentReleases (189) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletTransactionPaymentReleases (188) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletTransactionPaymentReleases (183) */
>>>>>>> chore: regenerate types
  interface PalletTransactionPaymentReleases extends Enum {
    readonly isV1Ancient: boolean;
    readonly isV2: boolean;
    readonly type: 'V1Ancient' | 'V2';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTreasuryProposal (184) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletTreasuryProposal (186) */
=======
<<<<<<< HEAD
  /** @name PalletTreasuryProposal (189) */
=======
  /** @name PalletTreasuryProposal (190) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletTreasuryProposal (189) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletTreasuryProposal (184) */
>>>>>>> chore: regenerate types
  interface PalletTreasuryProposal extends Struct {
    readonly proposer: AccountId32;
    readonly value: u128;
    readonly beneficiary: AccountId32;
    readonly bond: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTreasuryCall (187) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletTreasuryCall (189) */
=======
<<<<<<< HEAD
  /** @name PalletTreasuryCall (192) */
=======
  /** @name PalletTreasuryCall (193) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletTreasuryCall (192) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletTreasuryCall (187) */
>>>>>>> chore: regenerate types
  interface PalletTreasuryCall extends Enum {
    readonly isProposeSpend: boolean;
    readonly asProposeSpend: {
      readonly value: Compact<u128>;
      readonly beneficiary: MultiAddress;
    } & Struct;
    readonly isRejectProposal: boolean;
    readonly asRejectProposal: {
      readonly proposalId: Compact<u32>;
    } & Struct;
    readonly isApproveProposal: boolean;
    readonly asApproveProposal: {
      readonly proposalId: Compact<u32>;
    } & Struct;
    readonly isSpend: boolean;
    readonly asSpend: {
      readonly amount: Compact<u128>;
      readonly beneficiary: MultiAddress;
    } & Struct;
    readonly isRemoveApproval: boolean;
    readonly asRemoveApproval: {
      readonly proposalId: Compact<u32>;
    } & Struct;
    readonly type: 'ProposeSpend' | 'RejectProposal' | 'ApproveProposal' | 'Spend' | 'RemoveApproval';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSupportPalletId (190) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (191) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FrameSupportPalletId (192) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (193) */
=======
<<<<<<< HEAD
=======
>>>>>>> fix: regenerate types after rebase
  /** @name FrameSupportPalletId (195) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (196) */
<<<<<<< HEAD
=======
  /** @name FrameSupportPalletId (196) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (197) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name FrameSupportPalletId (190) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (191) */
>>>>>>> chore: regenerate types
  interface PalletTreasuryError extends Enum {
    readonly isInsufficientProposersBalance: boolean;
    readonly isInvalidIndex: boolean;
    readonly isTooManyApprovals: boolean;
    readonly isInsufficientPermission: boolean;
    readonly isProposalNotApproved: boolean;
    readonly type: 'InsufficientProposersBalance' | 'InvalidIndex' | 'TooManyApprovals' | 'InsufficientPermission' | 'ProposalNotApproved';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletSudoCall (192) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletSudoCall (194) */
=======
<<<<<<< HEAD
  /** @name PalletSudoCall (197) */
=======
  /** @name PalletSudoCall (198) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletSudoCall (197) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletSudoCall (192) */
>>>>>>> chore: regenerate types
  interface PalletSudoCall extends Enum {
    readonly isSudo: boolean;
    readonly asSudo: {
      readonly call: Call;
    } & Struct;
    readonly isSudoUncheckedWeight: boolean;
    readonly asSudoUncheckedWeight: {
      readonly call: Call;
      readonly weight: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isSetKey: boolean;
    readonly asSetKey: {
      readonly new_: MultiAddress;
    } & Struct;
    readonly isSudoAs: boolean;
    readonly asSudoAs: {
      readonly who: MultiAddress;
      readonly call: Call;
    } & Struct;
    readonly type: 'Sudo' | 'SudoUncheckedWeight' | 'SetKey' | 'SudoAs';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlVestingModuleCall (194) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name OrmlVestingModuleCall (196) */
=======
<<<<<<< HEAD
  /** @name OrmlVestingModuleCall (199) */
=======
  /** @name OrmlVestingModuleCall (200) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name OrmlVestingModuleCall (199) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlVestingModuleCall (194) */
>>>>>>> chore: regenerate types
  interface OrmlVestingModuleCall extends Enum {
    readonly isClaim: boolean;
    readonly isVestedTransfer: boolean;
    readonly asVestedTransfer: {
      readonly dest: MultiAddress;
      readonly schedule: OrmlVestingVestingSchedule;
    } & Struct;
    readonly isUpdateVestingSchedules: boolean;
    readonly asUpdateVestingSchedules: {
      readonly who: MultiAddress;
      readonly vestingSchedules: Vec<OrmlVestingVestingSchedule>;
    } & Struct;
    readonly isClaimFor: boolean;
    readonly asClaimFor: {
      readonly dest: MultiAddress;
    } & Struct;
    readonly type: 'Claim' | 'VestedTransfer' | 'UpdateVestingSchedules' | 'ClaimFor';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlXtokensModuleCall (196) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name OrmlXtokensModuleCall (198) */
=======
<<<<<<< HEAD
  /** @name OrmlXtokensModuleCall (201) */
=======
  /** @name OrmlXtokensModuleCall (202) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name OrmlXtokensModuleCall (201) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlXtokensModuleCall (196) */
>>>>>>> chore: regenerate types
  interface OrmlXtokensModuleCall extends Enum {
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: u128;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly isTransferMultiasset: boolean;
    readonly asTransferMultiasset: {
      readonly asset: XcmVersionedMultiAsset;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly isTransferWithFee: boolean;
    readonly asTransferWithFee: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: u128;
      readonly fee: u128;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly isTransferMultiassetWithFee: boolean;
    readonly asTransferMultiassetWithFee: {
      readonly asset: XcmVersionedMultiAsset;
      readonly fee: XcmVersionedMultiAsset;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly isTransferMulticurrencies: boolean;
    readonly asTransferMulticurrencies: {
      readonly currencies: Vec<ITuple<[PalletForeignAssetsAssetIds, u128]>>;
      readonly feeItem: u32;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly isTransferMultiassets: boolean;
    readonly asTransferMultiassets: {
      readonly assets: XcmVersionedMultiAssets;
      readonly feeItem: u32;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly type: 'Transfer' | 'TransferMultiasset' | 'TransferWithFee' | 'TransferMultiassetWithFee' | 'TransferMulticurrencies' | 'TransferMultiassets';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmVersionedMultiAsset (197) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmVersionedMultiAsset (199) */
=======
<<<<<<< HEAD
  /** @name XcmVersionedMultiAsset (202) */
=======
  /** @name XcmVersionedMultiAsset (203) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmVersionedMultiAsset (202) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmVersionedMultiAsset (197) */
>>>>>>> chore: regenerate types
  interface XcmVersionedMultiAsset extends Enum {
    readonly isV0: boolean;
    readonly asV0: XcmV0MultiAsset;
    readonly isV1: boolean;
    readonly asV1: XcmV1MultiAsset;
    readonly type: 'V0' | 'V1';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlTokensModuleCall (200) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name OrmlTokensModuleCall (202) */
=======
<<<<<<< HEAD
  /** @name OrmlTokensModuleCall (205) */
=======
  /** @name OrmlTokensModuleCall (206) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name OrmlTokensModuleCall (205) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlTokensModuleCall (200) */
>>>>>>> chore: regenerate types
  interface OrmlTokensModuleCall extends Enum {
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly dest: MultiAddress;
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: Compact<u128>;
    } & Struct;
    readonly isTransferAll: boolean;
    readonly asTransferAll: {
      readonly dest: MultiAddress;
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly keepAlive: bool;
    } & Struct;
    readonly isTransferKeepAlive: boolean;
    readonly asTransferKeepAlive: {
      readonly dest: MultiAddress;
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: Compact<u128>;
    } & Struct;
    readonly isForceTransfer: boolean;
    readonly asForceTransfer: {
      readonly source: MultiAddress;
      readonly dest: MultiAddress;
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: Compact<u128>;
    } & Struct;
    readonly isSetBalance: boolean;
    readonly asSetBalance: {
      readonly who: MultiAddress;
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly newFree: Compact<u128>;
      readonly newReserved: Compact<u128>;
    } & Struct;
    readonly type: 'Transfer' | 'TransferAll' | 'TransferKeepAlive' | 'ForceTransfer' | 'SetBalance';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueCall (201) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueCall (203) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueCall (206) */
=======
  /** @name CumulusPalletXcmpQueueCall (207) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name CumulusPalletXcmpQueueCall (206) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmpQueueCall (201) */
>>>>>>> chore: regenerate types
  interface CumulusPalletXcmpQueueCall extends Enum {
    readonly isServiceOverweight: boolean;
    readonly asServiceOverweight: {
      readonly index: u64;
      readonly weightLimit: u64;
    } & Struct;
    readonly isSuspendXcmExecution: boolean;
    readonly isResumeXcmExecution: boolean;
    readonly isUpdateSuspendThreshold: boolean;
    readonly asUpdateSuspendThreshold: {
      readonly new_: u32;
    } & Struct;
    readonly isUpdateDropThreshold: boolean;
    readonly asUpdateDropThreshold: {
      readonly new_: u32;
    } & Struct;
    readonly isUpdateResumeThreshold: boolean;
    readonly asUpdateResumeThreshold: {
      readonly new_: u32;
    } & Struct;
    readonly isUpdateThresholdWeight: boolean;
    readonly asUpdateThresholdWeight: {
      readonly new_: u64;
    } & Struct;
    readonly isUpdateWeightRestrictDecay: boolean;
    readonly asUpdateWeightRestrictDecay: {
      readonly new_: u64;
    } & Struct;
    readonly isUpdateXcmpMaxIndividualWeight: boolean;
    readonly asUpdateXcmpMaxIndividualWeight: {
      readonly new_: u64;
    } & Struct;
    readonly type: 'ServiceOverweight' | 'SuspendXcmExecution' | 'ResumeXcmExecution' | 'UpdateSuspendThreshold' | 'UpdateDropThreshold' | 'UpdateResumeThreshold' | 'UpdateThresholdWeight' | 'UpdateWeightRestrictDecay' | 'UpdateXcmpMaxIndividualWeight';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletXcmCall (202) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletXcmCall (204) */
=======
<<<<<<< HEAD
  /** @name PalletXcmCall (207) */
=======
  /** @name PalletXcmCall (208) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletXcmCall (207) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletXcmCall (202) */
>>>>>>> chore: regenerate types
  interface PalletXcmCall extends Enum {
    readonly isSend: boolean;
    readonly asSend: {
      readonly dest: XcmVersionedMultiLocation;
      readonly message: XcmVersionedXcm;
    } & Struct;
    readonly isTeleportAssets: boolean;
    readonly asTeleportAssets: {
      readonly dest: XcmVersionedMultiLocation;
      readonly beneficiary: XcmVersionedMultiLocation;
      readonly assets: XcmVersionedMultiAssets;
      readonly feeAssetItem: u32;
    } & Struct;
    readonly isReserveTransferAssets: boolean;
    readonly asReserveTransferAssets: {
      readonly dest: XcmVersionedMultiLocation;
      readonly beneficiary: XcmVersionedMultiLocation;
      readonly assets: XcmVersionedMultiAssets;
      readonly feeAssetItem: u32;
    } & Struct;
    readonly isExecute: boolean;
    readonly asExecute: {
      readonly message: XcmVersionedXcm;
      readonly maxWeight: u64;
    } & Struct;
    readonly isForceXcmVersion: boolean;
    readonly asForceXcmVersion: {
      readonly location: XcmV1MultiLocation;
      readonly xcmVersion: u32;
    } & Struct;
    readonly isForceDefaultXcmVersion: boolean;
    readonly asForceDefaultXcmVersion: {
      readonly maybeXcmVersion: Option<u32>;
    } & Struct;
    readonly isForceSubscribeVersionNotify: boolean;
    readonly asForceSubscribeVersionNotify: {
      readonly location: XcmVersionedMultiLocation;
    } & Struct;
    readonly isForceUnsubscribeVersionNotify: boolean;
    readonly asForceUnsubscribeVersionNotify: {
      readonly location: XcmVersionedMultiLocation;
    } & Struct;
    readonly isLimitedReserveTransferAssets: boolean;
    readonly asLimitedReserveTransferAssets: {
      readonly dest: XcmVersionedMultiLocation;
      readonly beneficiary: XcmVersionedMultiLocation;
      readonly assets: XcmVersionedMultiAssets;
      readonly feeAssetItem: u32;
      readonly weightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly isLimitedTeleportAssets: boolean;
    readonly asLimitedTeleportAssets: {
      readonly dest: XcmVersionedMultiLocation;
      readonly beneficiary: XcmVersionedMultiLocation;
      readonly assets: XcmVersionedMultiAssets;
      readonly feeAssetItem: u32;
      readonly weightLimit: XcmV2WeightLimit;
    } & Struct;
    readonly type: 'Send' | 'TeleportAssets' | 'ReserveTransferAssets' | 'Execute' | 'ForceXcmVersion' | 'ForceDefaultXcmVersion' | 'ForceSubscribeVersionNotify' | 'ForceUnsubscribeVersionNotify' | 'LimitedReserveTransferAssets' | 'LimitedTeleportAssets';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmVersionedXcm (203) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmVersionedXcm (205) */
=======
<<<<<<< HEAD
  /** @name XcmVersionedXcm (208) */
=======
  /** @name XcmVersionedXcm (209) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmVersionedXcm (208) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmVersionedXcm (203) */
>>>>>>> chore: regenerate types
  interface XcmVersionedXcm extends Enum {
    readonly isV0: boolean;
    readonly asV0: XcmV0Xcm;
    readonly isV1: boolean;
    readonly asV1: XcmV1Xcm;
    readonly isV2: boolean;
    readonly asV2: XcmV2Xcm;
    readonly type: 'V0' | 'V1' | 'V2';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmV0Xcm (204) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmV0Xcm (206) */
=======
<<<<<<< HEAD
  /** @name XcmV0Xcm (209) */
=======
  /** @name XcmV0Xcm (210) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmV0Xcm (209) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmV0Xcm (204) */
>>>>>>> chore: regenerate types
  interface XcmV0Xcm extends Enum {
    readonly isWithdrawAsset: boolean;
    readonly asWithdrawAsset: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly effects: Vec<XcmV0Order>;
    } & Struct;
    readonly isReserveAssetDeposit: boolean;
    readonly asReserveAssetDeposit: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly effects: Vec<XcmV0Order>;
    } & Struct;
    readonly isTeleportAsset: boolean;
    readonly asTeleportAsset: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly effects: Vec<XcmV0Order>;
    } & Struct;
    readonly isQueryResponse: boolean;
    readonly asQueryResponse: {
      readonly queryId: Compact<u64>;
      readonly response: XcmV0Response;
    } & Struct;
    readonly isTransferAsset: boolean;
    readonly asTransferAsset: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly dest: XcmV0MultiLocation;
    } & Struct;
    readonly isTransferReserveAsset: boolean;
    readonly asTransferReserveAsset: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly dest: XcmV0MultiLocation;
      readonly effects: Vec<XcmV0Order>;
    } & Struct;
    readonly isTransact: boolean;
    readonly asTransact: {
      readonly originType: XcmV0OriginKind;
      readonly requireWeightAtMost: u64;
      readonly call: XcmDoubleEncoded;
    } & Struct;
    readonly isHrmpNewChannelOpenRequest: boolean;
    readonly asHrmpNewChannelOpenRequest: {
      readonly sender: Compact<u32>;
      readonly maxMessageSize: Compact<u32>;
      readonly maxCapacity: Compact<u32>;
    } & Struct;
    readonly isHrmpChannelAccepted: boolean;
    readonly asHrmpChannelAccepted: {
      readonly recipient: Compact<u32>;
    } & Struct;
    readonly isHrmpChannelClosing: boolean;
    readonly asHrmpChannelClosing: {
      readonly initiator: Compact<u32>;
      readonly sender: Compact<u32>;
      readonly recipient: Compact<u32>;
    } & Struct;
    readonly isRelayedFrom: boolean;
    readonly asRelayedFrom: {
      readonly who: XcmV0MultiLocation;
      readonly message: XcmV0Xcm;
    } & Struct;
    readonly type: 'WithdrawAsset' | 'ReserveAssetDeposit' | 'TeleportAsset' | 'QueryResponse' | 'TransferAsset' | 'TransferReserveAsset' | 'Transact' | 'HrmpNewChannelOpenRequest' | 'HrmpChannelAccepted' | 'HrmpChannelClosing' | 'RelayedFrom';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmV0Order (206) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmV0Order (208) */
=======
<<<<<<< HEAD
  /** @name XcmV0Order (211) */
=======
  /** @name XcmV0Order (212) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmV0Order (211) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmV0Order (206) */
>>>>>>> chore: regenerate types
  interface XcmV0Order extends Enum {
    readonly isNull: boolean;
    readonly isDepositAsset: boolean;
    readonly asDepositAsset: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly dest: XcmV0MultiLocation;
    } & Struct;
    readonly isDepositReserveAsset: boolean;
    readonly asDepositReserveAsset: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly dest: XcmV0MultiLocation;
      readonly effects: Vec<XcmV0Order>;
    } & Struct;
    readonly isExchangeAsset: boolean;
    readonly asExchangeAsset: {
      readonly give: Vec<XcmV0MultiAsset>;
      readonly receive: Vec<XcmV0MultiAsset>;
    } & Struct;
    readonly isInitiateReserveWithdraw: boolean;
    readonly asInitiateReserveWithdraw: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly reserve: XcmV0MultiLocation;
      readonly effects: Vec<XcmV0Order>;
    } & Struct;
    readonly isInitiateTeleport: boolean;
    readonly asInitiateTeleport: {
      readonly assets: Vec<XcmV0MultiAsset>;
      readonly dest: XcmV0MultiLocation;
      readonly effects: Vec<XcmV0Order>;
    } & Struct;
    readonly isQueryHolding: boolean;
    readonly asQueryHolding: {
      readonly queryId: Compact<u64>;
      readonly dest: XcmV0MultiLocation;
      readonly assets: Vec<XcmV0MultiAsset>;
    } & Struct;
    readonly isBuyExecution: boolean;
    readonly asBuyExecution: {
      readonly fees: XcmV0MultiAsset;
      readonly weight: u64;
      readonly debt: u64;
      readonly haltOnError: bool;
      readonly xcm: Vec<XcmV0Xcm>;
    } & Struct;
    readonly type: 'Null' | 'DepositAsset' | 'DepositReserveAsset' | 'ExchangeAsset' | 'InitiateReserveWithdraw' | 'InitiateTeleport' | 'QueryHolding' | 'BuyExecution';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmV0Response (208) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmV0Response (210) */
=======
<<<<<<< HEAD
  /** @name XcmV0Response (213) */
=======
  /** @name XcmV0Response (214) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmV0Response (213) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmV0Response (208) */
>>>>>>> chore: regenerate types
  interface XcmV0Response extends Enum {
    readonly isAssets: boolean;
    readonly asAssets: Vec<XcmV0MultiAsset>;
    readonly type: 'Assets';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmV1Xcm (209) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmV1Xcm (211) */
=======
<<<<<<< HEAD
  /** @name XcmV1Xcm (214) */
=======
  /** @name XcmV1Xcm (215) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmV1Xcm (214) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmV1Xcm (209) */
>>>>>>> chore: regenerate types
  interface XcmV1Xcm extends Enum {
    readonly isWithdrawAsset: boolean;
    readonly asWithdrawAsset: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly effects: Vec<XcmV1Order>;
    } & Struct;
    readonly isReserveAssetDeposited: boolean;
    readonly asReserveAssetDeposited: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly effects: Vec<XcmV1Order>;
    } & Struct;
    readonly isReceiveTeleportedAsset: boolean;
    readonly asReceiveTeleportedAsset: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly effects: Vec<XcmV1Order>;
    } & Struct;
    readonly isQueryResponse: boolean;
    readonly asQueryResponse: {
      readonly queryId: Compact<u64>;
      readonly response: XcmV1Response;
    } & Struct;
    readonly isTransferAsset: boolean;
    readonly asTransferAsset: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly beneficiary: XcmV1MultiLocation;
    } & Struct;
    readonly isTransferReserveAsset: boolean;
    readonly asTransferReserveAsset: {
      readonly assets: XcmV1MultiassetMultiAssets;
      readonly dest: XcmV1MultiLocation;
      readonly effects: Vec<XcmV1Order>;
    } & Struct;
    readonly isTransact: boolean;
    readonly asTransact: {
      readonly originType: XcmV0OriginKind;
      readonly requireWeightAtMost: u64;
      readonly call: XcmDoubleEncoded;
    } & Struct;
    readonly isHrmpNewChannelOpenRequest: boolean;
    readonly asHrmpNewChannelOpenRequest: {
      readonly sender: Compact<u32>;
      readonly maxMessageSize: Compact<u32>;
      readonly maxCapacity: Compact<u32>;
    } & Struct;
    readonly isHrmpChannelAccepted: boolean;
    readonly asHrmpChannelAccepted: {
      readonly recipient: Compact<u32>;
    } & Struct;
    readonly isHrmpChannelClosing: boolean;
    readonly asHrmpChannelClosing: {
      readonly initiator: Compact<u32>;
      readonly sender: Compact<u32>;
      readonly recipient: Compact<u32>;
    } & Struct;
    readonly isRelayedFrom: boolean;
    readonly asRelayedFrom: {
      readonly who: XcmV1MultilocationJunctions;
      readonly message: XcmV1Xcm;
    } & Struct;
    readonly isSubscribeVersion: boolean;
    readonly asSubscribeVersion: {
      readonly queryId: Compact<u64>;
      readonly maxResponseWeight: Compact<u64>;
    } & Struct;
    readonly isUnsubscribeVersion: boolean;
    readonly type: 'WithdrawAsset' | 'ReserveAssetDeposited' | 'ReceiveTeleportedAsset' | 'QueryResponse' | 'TransferAsset' | 'TransferReserveAsset' | 'Transact' | 'HrmpNewChannelOpenRequest' | 'HrmpChannelAccepted' | 'HrmpChannelClosing' | 'RelayedFrom' | 'SubscribeVersion' | 'UnsubscribeVersion';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmV1Order (211) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmV1Order (213) */
=======
<<<<<<< HEAD
  /** @name XcmV1Order (216) */
=======
  /** @name XcmV1Order (217) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmV1Order (216) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmV1Order (211) */
>>>>>>> chore: regenerate types
  interface XcmV1Order extends Enum {
    readonly isNoop: boolean;
    readonly isDepositAsset: boolean;
    readonly asDepositAsset: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly maxAssets: u32;
      readonly beneficiary: XcmV1MultiLocation;
    } & Struct;
    readonly isDepositReserveAsset: boolean;
    readonly asDepositReserveAsset: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly maxAssets: u32;
      readonly dest: XcmV1MultiLocation;
      readonly effects: Vec<XcmV1Order>;
    } & Struct;
    readonly isExchangeAsset: boolean;
    readonly asExchangeAsset: {
      readonly give: XcmV1MultiassetMultiAssetFilter;
      readonly receive: XcmV1MultiassetMultiAssets;
    } & Struct;
    readonly isInitiateReserveWithdraw: boolean;
    readonly asInitiateReserveWithdraw: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly reserve: XcmV1MultiLocation;
      readonly effects: Vec<XcmV1Order>;
    } & Struct;
    readonly isInitiateTeleport: boolean;
    readonly asInitiateTeleport: {
      readonly assets: XcmV1MultiassetMultiAssetFilter;
      readonly dest: XcmV1MultiLocation;
      readonly effects: Vec<XcmV1Order>;
    } & Struct;
    readonly isQueryHolding: boolean;
    readonly asQueryHolding: {
      readonly queryId: Compact<u64>;
      readonly dest: XcmV1MultiLocation;
      readonly assets: XcmV1MultiassetMultiAssetFilter;
    } & Struct;
    readonly isBuyExecution: boolean;
    readonly asBuyExecution: {
      readonly fees: XcmV1MultiAsset;
      readonly weight: u64;
      readonly debt: u64;
      readonly haltOnError: bool;
      readonly instructions: Vec<XcmV1Xcm>;
    } & Struct;
    readonly type: 'Noop' | 'DepositAsset' | 'DepositReserveAsset' | 'ExchangeAsset' | 'InitiateReserveWithdraw' | 'InitiateTeleport' | 'QueryHolding' | 'BuyExecution';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmV1Response (213) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name XcmV1Response (215) */
=======
<<<<<<< HEAD
  /** @name XcmV1Response (218) */
=======
  /** @name XcmV1Response (219) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name XcmV1Response (218) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name XcmV1Response (213) */
>>>>>>> chore: regenerate types
  interface XcmV1Response extends Enum {
    readonly isAssets: boolean;
    readonly asAssets: XcmV1MultiassetMultiAssets;
    readonly isVersion: boolean;
    readonly asVersion: u32;
    readonly type: 'Assets' | 'Version';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmCall (227) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (228) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name CumulusPalletXcmCall (229) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (230) */
=======
<<<<<<< HEAD
=======
>>>>>>> fix: regenerate types after rebase
  /** @name CumulusPalletXcmCall (232) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (233) */
<<<<<<< HEAD
=======
  /** @name CumulusPalletXcmCall (233) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (234) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmCall (227) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (228) */
>>>>>>> chore: regenerate types
  interface CumulusPalletDmpQueueCall extends Enum {
    readonly isServiceOverweight: boolean;
    readonly asServiceOverweight: {
      readonly index: u64;
      readonly weightLimit: u64;
    } & Struct;
    readonly type: 'ServiceOverweight';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletInflationCall (229) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletInflationCall (231) */
=======
<<<<<<< HEAD
  /** @name PalletInflationCall (234) */
=======
  /** @name PalletInflationCall (235) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletInflationCall (234) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletInflationCall (229) */
>>>>>>> chore: regenerate types
  interface PalletInflationCall extends Enum {
    readonly isStartInflation: boolean;
    readonly asStartInflation: {
      readonly inflationStartRelayBlock: u32;
    } & Struct;
    readonly type: 'StartInflation';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletUniqueCall (230) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletUniqueCall (232) */
=======
<<<<<<< HEAD
  /** @name PalletUniqueCall (235) */
=======
  /** @name PalletUniqueCall (236) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletUniqueCall (235) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletUniqueCall (230) */
>>>>>>> chore: regenerate types
  interface PalletUniqueCall extends Enum {
    readonly isCreateCollection: boolean;
    readonly asCreateCollection: {
      readonly collectionName: Vec<u16>;
      readonly collectionDescription: Vec<u16>;
      readonly tokenPrefix: Bytes;
      readonly mode: UpDataStructsCollectionMode;
    } & Struct;
    readonly isCreateCollectionEx: boolean;
    readonly asCreateCollectionEx: {
      readonly data: UpDataStructsCreateCollectionData;
    } & Struct;
    readonly isDestroyCollection: boolean;
    readonly asDestroyCollection: {
      readonly collectionId: u32;
    } & Struct;
    readonly isAddToAllowList: boolean;
    readonly asAddToAllowList: {
      readonly collectionId: u32;
      readonly address: PalletEvmAccountBasicCrossAccountIdRepr;
    } & Struct;
    readonly isRemoveFromAllowList: boolean;
    readonly asRemoveFromAllowList: {
      readonly collectionId: u32;
      readonly address: PalletEvmAccountBasicCrossAccountIdRepr;
    } & Struct;
    readonly isChangeCollectionOwner: boolean;
    readonly asChangeCollectionOwner: {
      readonly collectionId: u32;
      readonly newOwner: AccountId32;
    } & Struct;
    readonly isAddCollectionAdmin: boolean;
    readonly asAddCollectionAdmin: {
      readonly collectionId: u32;
      readonly newAdminId: PalletEvmAccountBasicCrossAccountIdRepr;
    } & Struct;
    readonly isRemoveCollectionAdmin: boolean;
    readonly asRemoveCollectionAdmin: {
      readonly collectionId: u32;
      readonly accountId: PalletEvmAccountBasicCrossAccountIdRepr;
    } & Struct;
    readonly isSetCollectionSponsor: boolean;
    readonly asSetCollectionSponsor: {
      readonly collectionId: u32;
      readonly newSponsor: AccountId32;
    } & Struct;
    readonly isConfirmSponsorship: boolean;
    readonly asConfirmSponsorship: {
      readonly collectionId: u32;
    } & Struct;
    readonly isRemoveCollectionSponsor: boolean;
    readonly asRemoveCollectionSponsor: {
      readonly collectionId: u32;
    } & Struct;
    readonly isCreateItem: boolean;
    readonly asCreateItem: {
      readonly collectionId: u32;
      readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly data: UpDataStructsCreateItemData;
    } & Struct;
    readonly isCreateMultipleItems: boolean;
    readonly asCreateMultipleItems: {
      readonly collectionId: u32;
      readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly itemsData: Vec<UpDataStructsCreateItemData>;
    } & Struct;
    readonly isSetCollectionProperties: boolean;
    readonly asSetCollectionProperties: {
      readonly collectionId: u32;
      readonly properties: Vec<UpDataStructsProperty>;
    } & Struct;
    readonly isDeleteCollectionProperties: boolean;
    readonly asDeleteCollectionProperties: {
      readonly collectionId: u32;
      readonly propertyKeys: Vec<Bytes>;
    } & Struct;
    readonly isSetTokenProperties: boolean;
    readonly asSetTokenProperties: {
      readonly collectionId: u32;
      readonly tokenId: u32;
      readonly properties: Vec<UpDataStructsProperty>;
    } & Struct;
    readonly isDeleteTokenProperties: boolean;
    readonly asDeleteTokenProperties: {
      readonly collectionId: u32;
      readonly tokenId: u32;
      readonly propertyKeys: Vec<Bytes>;
    } & Struct;
    readonly isSetTokenPropertyPermissions: boolean;
    readonly asSetTokenPropertyPermissions: {
      readonly collectionId: u32;
      readonly propertyPermissions: Vec<UpDataStructsPropertyKeyPermission>;
    } & Struct;
    readonly isCreateMultipleItemsEx: boolean;
    readonly asCreateMultipleItemsEx: {
      readonly collectionId: u32;
      readonly data: UpDataStructsCreateItemExData;
    } & Struct;
    readonly isSetTransfersEnabledFlag: boolean;
    readonly asSetTransfersEnabledFlag: {
      readonly collectionId: u32;
      readonly value: bool;
    } & Struct;
    readonly isBurnItem: boolean;
    readonly asBurnItem: {
      readonly collectionId: u32;
      readonly itemId: u32;
      readonly value: u128;
    } & Struct;
    readonly isBurnFrom: boolean;
    readonly asBurnFrom: {
      readonly collectionId: u32;
      readonly from: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly itemId: u32;
      readonly value: u128;
    } & Struct;
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly recipient: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly collectionId: u32;
      readonly itemId: u32;
      readonly value: u128;
    } & Struct;
    readonly isApprove: boolean;
    readonly asApprove: {
      readonly spender: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly collectionId: u32;
      readonly itemId: u32;
      readonly amount: u128;
    } & Struct;
    readonly isTransferFrom: boolean;
    readonly asTransferFrom: {
      readonly from: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly recipient: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly collectionId: u32;
      readonly itemId: u32;
      readonly value: u128;
    } & Struct;
    readonly isSetCollectionLimits: boolean;
    readonly asSetCollectionLimits: {
      readonly collectionId: u32;
      readonly newLimit: UpDataStructsCollectionLimits;
    } & Struct;
    readonly isSetCollectionPermissions: boolean;
    readonly asSetCollectionPermissions: {
      readonly collectionId: u32;
      readonly newPermission: UpDataStructsCollectionPermissions;
    } & Struct;
    readonly isRepartition: boolean;
    readonly asRepartition: {
      readonly collectionId: u32;
      readonly tokenId: u32;
      readonly amount: u128;
    } & Struct;
    readonly isSetAllowanceForAll: boolean;
    readonly asSetAllowanceForAll: {
      readonly collectionId: u32;
      readonly operator: PalletEvmAccountBasicCrossAccountIdRepr;
      readonly approve: bool;
    } & Struct;
    readonly isForceRepairCollection: boolean;
    readonly asForceRepairCollection: {
      readonly collectionId: u32;
    } & Struct;
    readonly isForceRepairItem: boolean;
    readonly asForceRepairItem: {
      readonly collectionId: u32;
      readonly itemId: u32;
    } & Struct;
    readonly type: 'CreateCollection' | 'CreateCollectionEx' | 'DestroyCollection' | 'AddToAllowList' | 'RemoveFromAllowList' | 'ChangeCollectionOwner' | 'AddCollectionAdmin' | 'RemoveCollectionAdmin' | 'SetCollectionSponsor' | 'ConfirmSponsorship' | 'RemoveCollectionSponsor' | 'CreateItem' | 'CreateMultipleItems' | 'SetCollectionProperties' | 'DeleteCollectionProperties' | 'SetTokenProperties' | 'DeleteTokenProperties' | 'SetTokenPropertyPermissions' | 'CreateMultipleItemsEx' | 'SetTransfersEnabledFlag' | 'BurnItem' | 'BurnFrom' | 'Transfer' | 'Approve' | 'TransferFrom' | 'SetCollectionLimits' | 'SetCollectionPermissions' | 'Repartition' | 'SetAllowanceForAll' | 'ForceRepairCollection' | 'ForceRepairItem';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCollectionMode (235) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCollectionMode (237) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCollectionMode (240) */
=======
  /** @name UpDataStructsCollectionMode (241) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCollectionMode (240) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCollectionMode (235) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCollectionMode extends Enum {
    readonly isNft: boolean;
    readonly isFungible: boolean;
    readonly asFungible: u8;
    readonly isReFungible: boolean;
    readonly type: 'Nft' | 'Fungible' | 'ReFungible';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateCollectionData (236) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateCollectionData (238) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateCollectionData (241) */
=======
  /** @name UpDataStructsCreateCollectionData (242) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateCollectionData (241) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateCollectionData (236) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateCollectionData extends Struct {
    readonly mode: UpDataStructsCollectionMode;
    readonly access: Option<UpDataStructsAccessMode>;
    readonly name: Vec<u16>;
    readonly description: Vec<u16>;
    readonly tokenPrefix: Bytes;
    readonly pendingSponsor: Option<AccountId32>;
    readonly limits: Option<UpDataStructsCollectionLimits>;
    readonly permissions: Option<UpDataStructsCollectionPermissions>;
    readonly tokenPropertyPermissions: Vec<UpDataStructsPropertyKeyPermission>;
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsAccessMode (238) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsAccessMode (240) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsAccessMode (243) */
=======
  /** @name UpDataStructsAccessMode (244) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsAccessMode (243) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsAccessMode (238) */
>>>>>>> chore: regenerate types
  interface UpDataStructsAccessMode extends Enum {
    readonly isNormal: boolean;
    readonly isAllowList: boolean;
    readonly type: 'Normal' | 'AllowList';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCollectionLimits (240) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCollectionLimits (242) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCollectionLimits (245) */
=======
  /** @name UpDataStructsCollectionLimits (246) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCollectionLimits (245) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCollectionLimits (240) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCollectionLimits extends Struct {
    readonly accountTokenOwnershipLimit: Option<u32>;
    readonly sponsoredDataSize: Option<u32>;
    readonly sponsoredDataRateLimit: Option<UpDataStructsSponsoringRateLimit>;
    readonly tokenLimit: Option<u32>;
    readonly sponsorTransferTimeout: Option<u32>;
    readonly sponsorApproveTimeout: Option<u32>;
    readonly ownerCanTransfer: Option<bool>;
    readonly ownerCanDestroy: Option<bool>;
    readonly transfersEnabled: Option<bool>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsSponsoringRateLimit (242) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsSponsoringRateLimit (244) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsSponsoringRateLimit (247) */
=======
  /** @name UpDataStructsSponsoringRateLimit (248) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsSponsoringRateLimit (247) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsSponsoringRateLimit (242) */
>>>>>>> chore: regenerate types
  interface UpDataStructsSponsoringRateLimit extends Enum {
    readonly isSponsoringDisabled: boolean;
    readonly isBlocks: boolean;
    readonly asBlocks: u32;
    readonly type: 'SponsoringDisabled' | 'Blocks';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCollectionPermissions (245) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCollectionPermissions (247) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCollectionPermissions (250) */
=======
  /** @name UpDataStructsCollectionPermissions (251) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCollectionPermissions (250) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCollectionPermissions (245) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCollectionPermissions extends Struct {
    readonly access: Option<UpDataStructsAccessMode>;
    readonly mintMode: Option<bool>;
    readonly nesting: Option<UpDataStructsNestingPermissions>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsNestingPermissions (247) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsNestingPermissions (249) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsNestingPermissions (252) */
=======
  /** @name UpDataStructsNestingPermissions (253) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsNestingPermissions (252) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsNestingPermissions (247) */
>>>>>>> chore: regenerate types
  interface UpDataStructsNestingPermissions extends Struct {
    readonly tokenOwner: bool;
    readonly collectionAdmin: bool;
    readonly restricted: Option<UpDataStructsOwnerRestrictedSet>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsOwnerRestrictedSet (249) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (254) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsOwnerRestrictedSet (251) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (256) */
=======
<<<<<<< HEAD
=======
>>>>>>> fix: regenerate types after rebase
  /** @name UpDataStructsOwnerRestrictedSet (254) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (259) */
<<<<<<< HEAD
=======
  /** @name UpDataStructsOwnerRestrictedSet (255) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (260) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsOwnerRestrictedSet (249) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (254) */
>>>>>>> chore: regenerate types
  interface UpDataStructsPropertyKeyPermission extends Struct {
    readonly key: Bytes;
    readonly permission: UpDataStructsPropertyPermission;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsPropertyPermission (255) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsPropertyPermission (257) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsPropertyPermission (260) */
=======
  /** @name UpDataStructsPropertyPermission (261) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsPropertyPermission (260) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsPropertyPermission (255) */
>>>>>>> chore: regenerate types
  interface UpDataStructsPropertyPermission extends Struct {
    readonly mutable: bool;
    readonly collectionAdmin: bool;
    readonly tokenOwner: bool;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsProperty (258) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsProperty (260) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsProperty (263) */
=======
  /** @name UpDataStructsProperty (264) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsProperty (263) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsProperty (258) */
>>>>>>> chore: regenerate types
  interface UpDataStructsProperty extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemData (261) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemData (263) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemData (266) */
=======
  /** @name UpDataStructsCreateItemData (267) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateItemData (266) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateItemData (261) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateItemData extends Enum {
    readonly isNft: boolean;
    readonly asNft: UpDataStructsCreateNftData;
    readonly isFungible: boolean;
    readonly asFungible: UpDataStructsCreateFungibleData;
    readonly isReFungible: boolean;
    readonly asReFungible: UpDataStructsCreateReFungibleData;
    readonly type: 'Nft' | 'Fungible' | 'ReFungible';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftData (262) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftData (264) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftData (267) */
=======
  /** @name UpDataStructsCreateNftData (268) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateNftData (267) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateNftData (262) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateNftData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateFungibleData (263) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateFungibleData (265) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateFungibleData (268) */
=======
  /** @name UpDataStructsCreateFungibleData (269) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateFungibleData (268) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateFungibleData (263) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateFungibleData extends Struct {
    readonly value: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateReFungibleData (264) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateReFungibleData (266) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateReFungibleData (269) */
=======
  /** @name UpDataStructsCreateReFungibleData (270) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateReFungibleData (269) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateReFungibleData (264) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateReFungibleData extends Struct {
    readonly pieces: u128;
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemExData (267) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemExData (269) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemExData (272) */
=======
  /** @name UpDataStructsCreateItemExData (273) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateItemExData (272) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateItemExData (267) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateItemExData extends Enum {
    readonly isNft: boolean;
    readonly asNft: Vec<UpDataStructsCreateNftExData>;
    readonly isFungible: boolean;
    readonly asFungible: BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>;
    readonly isRefungibleMultipleItems: boolean;
    readonly asRefungibleMultipleItems: Vec<UpDataStructsCreateRefungibleExSingleOwner>;
    readonly isRefungibleMultipleOwners: boolean;
    readonly asRefungibleMultipleOwners: UpDataStructsCreateRefungibleExMultipleOwners;
    readonly type: 'Nft' | 'Fungible' | 'RefungibleMultipleItems' | 'RefungibleMultipleOwners';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftExData (269) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftExData (271) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftExData (274) */
=======
  /** @name UpDataStructsCreateNftExData (275) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateNftExData (274) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateNftExData (269) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateNftExData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
    readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExSingleOwner (276) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExSingleOwner (278) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExSingleOwner (281) */
=======
  /** @name UpDataStructsCreateRefungibleExSingleOwner (282) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateRefungibleExSingleOwner (281) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateRefungibleExSingleOwner (276) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateRefungibleExSingleOwner extends Struct {
    readonly user: PalletEvmAccountBasicCrossAccountIdRepr;
    readonly pieces: u128;
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (278) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (280) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (283) */
=======
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (284) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (283) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (278) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCreateRefungibleExMultipleOwners extends Struct {
    readonly users: BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>;
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletConfigurationCall (279) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletConfigurationCall (281) */
=======
<<<<<<< HEAD
=======
>>>>>>> fix: regenerate types after rebase
  /** @name PalletUniqueSchedulerV2Call (284) */
  interface PalletUniqueSchedulerV2Call extends Enum {
    readonly isSchedule: boolean;
    readonly asSchedule: {
      readonly when: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: Option<u8>;
      readonly call: Call;
    } & Struct;
    readonly isCancel: boolean;
    readonly asCancel: {
      readonly when: u32;
      readonly index: u32;
    } & Struct;
    readonly isScheduleNamed: boolean;
    readonly asScheduleNamed: {
      readonly id: U8aFixed;
      readonly when: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: Option<u8>;
      readonly call: Call;
    } & Struct;
    readonly isCancelNamed: boolean;
    readonly asCancelNamed: {
      readonly id: U8aFixed;
    } & Struct;
    readonly isScheduleAfter: boolean;
    readonly asScheduleAfter: {
      readonly after: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: Option<u8>;
      readonly call: Call;
    } & Struct;
    readonly isScheduleNamedAfter: boolean;
    readonly asScheduleNamedAfter: {
      readonly id: U8aFixed;
      readonly after: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: Option<u8>;
      readonly call: Call;
    } & Struct;
    readonly isChangeNamedPriority: boolean;
    readonly asChangeNamedPriority: {
      readonly id: U8aFixed;
      readonly priority: u8;
    } & Struct;
    readonly type: 'Schedule' | 'Cancel' | 'ScheduleNamed' | 'CancelNamed' | 'ScheduleAfter' | 'ScheduleNamedAfter' | 'ChangeNamedPriority';
  }

  /** @name PalletConfigurationCall (287) */
<<<<<<< HEAD
=======
  /** @name PalletConfigurationCall (288) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletConfigurationCall (279) */
>>>>>>> chore: regenerate types
  interface PalletConfigurationCall extends Enum {
    readonly isSetWeightToFeeCoefficientOverride: boolean;
    readonly asSetWeightToFeeCoefficientOverride: {
      readonly coeff: Option<u64>;
    } & Struct;
    readonly isSetMinGasPriceOverride: boolean;
    readonly asSetMinGasPriceOverride: {
      readonly coeff: Option<u64>;
    } & Struct;
    readonly isSetXcmAllowedLocations: boolean;
    readonly asSetXcmAllowedLocations: {
      readonly locations: Option<Vec<XcmV1MultiLocation>>;
    } & Struct;
    readonly isSetAppPromotionConfigurationOverride: boolean;
    readonly asSetAppPromotionConfigurationOverride: {
      readonly configuration: PalletConfigurationAppPromotionConfiguration;
    } & Struct;
    readonly type: 'SetWeightToFeeCoefficientOverride' | 'SetMinGasPriceOverride' | 'SetXcmAllowedLocations' | 'SetAppPromotionConfigurationOverride';
  }

  /** @name PalletConfigurationAppPromotionConfiguration (284) */
  interface PalletConfigurationAppPromotionConfiguration extends Struct {
    readonly recalculationInterval: Option<u32>;
    readonly pendingInterval: Option<u32>;
    readonly intervalIncome: Option<Perbill>;
    readonly maxStakersPerCalculation: Option<u8>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTemplateTransactionPaymentCall (288) */
=======
<<<<<<< HEAD
=======
>>>>>>> fix: regenerate types after rebase
  /** @name PalletTemplateTransactionPaymentCall (289) */
>>>>>>> chore:  regenerate types
=======
  /** @name PalletTemplateTransactionPaymentCall (288) */
>>>>>>> chore: regenerate types
  type PalletTemplateTransactionPaymentCall = Null;

  /** @name PalletStructureCall (289) */
  type PalletStructureCall = Null;

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletRmrkCoreCall (290) */
=======
  /** @name PalletRmrkCoreCall (291) */
<<<<<<< HEAD
=======
  /** @name PalletTemplateTransactionPaymentCall (290) */
  type PalletTemplateTransactionPaymentCall = Null;

  /** @name PalletStructureCall (291) */
  type PalletStructureCall = Null;

  /** @name PalletRmrkCoreCall (292) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletRmrkCoreCall (290) */
>>>>>>> chore: regenerate types
  interface PalletRmrkCoreCall extends Enum {
    readonly isCreateCollection: boolean;
    readonly asCreateCollection: {
      readonly metadata: Bytes;
      readonly max: Option<u32>;
      readonly symbol: Bytes;
    } & Struct;
    readonly isDestroyCollection: boolean;
    readonly asDestroyCollection: {
      readonly collectionId: u32;
    } & Struct;
    readonly isChangeCollectionIssuer: boolean;
    readonly asChangeCollectionIssuer: {
      readonly collectionId: u32;
      readonly newIssuer: MultiAddress;
    } & Struct;
    readonly isLockCollection: boolean;
    readonly asLockCollection: {
      readonly collectionId: u32;
    } & Struct;
    readonly isMintNft: boolean;
    readonly asMintNft: {
      readonly owner: Option<AccountId32>;
      readonly collectionId: u32;
      readonly recipient: Option<AccountId32>;
      readonly royaltyAmount: Option<Permill>;
      readonly metadata: Bytes;
      readonly transferable: bool;
      readonly resources: Option<Vec<RmrkTraitsResourceResourceTypes>>;
    } & Struct;
    readonly isBurnNft: boolean;
    readonly asBurnNft: {
      readonly collectionId: u32;
      readonly nftId: u32;
      readonly maxBurns: u32;
    } & Struct;
    readonly isSend: boolean;
    readonly asSend: {
      readonly rmrkCollectionId: u32;
      readonly rmrkNftId: u32;
      readonly newOwner: RmrkTraitsNftAccountIdOrCollectionNftTuple;
    } & Struct;
    readonly isAcceptNft: boolean;
    readonly asAcceptNft: {
      readonly rmrkCollectionId: u32;
      readonly rmrkNftId: u32;
      readonly newOwner: RmrkTraitsNftAccountIdOrCollectionNftTuple;
    } & Struct;
    readonly isRejectNft: boolean;
    readonly asRejectNft: {
      readonly rmrkCollectionId: u32;
      readonly rmrkNftId: u32;
    } & Struct;
    readonly isAcceptResource: boolean;
    readonly asAcceptResource: {
      readonly rmrkCollectionId: u32;
      readonly rmrkNftId: u32;
      readonly resourceId: u32;
    } & Struct;
    readonly isAcceptResourceRemoval: boolean;
    readonly asAcceptResourceRemoval: {
      readonly rmrkCollectionId: u32;
      readonly rmrkNftId: u32;
      readonly resourceId: u32;
    } & Struct;
    readonly isSetProperty: boolean;
    readonly asSetProperty: {
      readonly rmrkCollectionId: Compact<u32>;
      readonly maybeNftId: Option<u32>;
      readonly key: Bytes;
      readonly value: Bytes;
    } & Struct;
    readonly isSetPriority: boolean;
    readonly asSetPriority: {
      readonly rmrkCollectionId: u32;
      readonly rmrkNftId: u32;
      readonly priorities: Vec<u32>;
    } & Struct;
    readonly isAddBasicResource: boolean;
    readonly asAddBasicResource: {
      readonly rmrkCollectionId: u32;
      readonly nftId: u32;
      readonly resource: RmrkTraitsResourceBasicResource;
    } & Struct;
    readonly isAddComposableResource: boolean;
    readonly asAddComposableResource: {
      readonly rmrkCollectionId: u32;
      readonly nftId: u32;
      readonly resource: RmrkTraitsResourceComposableResource;
    } & Struct;
    readonly isAddSlotResource: boolean;
    readonly asAddSlotResource: {
      readonly rmrkCollectionId: u32;
      readonly nftId: u32;
      readonly resource: RmrkTraitsResourceSlotResource;
    } & Struct;
    readonly isRemoveResource: boolean;
    readonly asRemoveResource: {
      readonly rmrkCollectionId: u32;
      readonly nftId: u32;
      readonly resourceId: u32;
    } & Struct;
    readonly type: 'CreateCollection' | 'DestroyCollection' | 'ChangeCollectionIssuer' | 'LockCollection' | 'MintNft' | 'BurnNft' | 'Send' | 'AcceptNft' | 'RejectNft' | 'AcceptResource' | 'AcceptResourceRemoval' | 'SetProperty' | 'SetPriority' | 'AddBasicResource' | 'AddComposableResource' | 'AddSlotResource' | 'RemoveResource';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsResourceResourceTypes (296) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceResourceTypes (297) */
=======
  /** @name RmrkTraitsResourceResourceTypes (298) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsResourceResourceTypes (297) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsResourceResourceTypes (296) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsResourceResourceTypes extends Enum {
    readonly isBasic: boolean;
    readonly asBasic: RmrkTraitsResourceBasicResource;
    readonly isComposable: boolean;
    readonly asComposable: RmrkTraitsResourceComposableResource;
    readonly isSlot: boolean;
    readonly asSlot: RmrkTraitsResourceSlotResource;
    readonly type: 'Basic' | 'Composable' | 'Slot';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsResourceBasicResource (298) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceBasicResource (299) */
=======
  /** @name RmrkTraitsResourceBasicResource (300) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsResourceBasicResource (299) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsResourceBasicResource (298) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsResourceBasicResource extends Struct {
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsResourceComposableResource (300) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceComposableResource (301) */
=======
  /** @name RmrkTraitsResourceComposableResource (302) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsResourceComposableResource (301) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsResourceComposableResource (300) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsResourceComposableResource extends Struct {
    readonly parts: Vec<u32>;
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsResourceSlotResource (301) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceSlotResource (302) */
=======
  /** @name RmrkTraitsResourceSlotResource (303) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsResourceSlotResource (302) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsResourceSlotResource (301) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsResourceSlotResource extends Struct {
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly slot: u32;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletRmrkEquipCall (304) */
=======
<<<<<<< HEAD
  /** @name PalletRmrkEquipCall (305) */
=======
  /** @name PalletRmrkEquipCall (306) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletRmrkEquipCall (305) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletRmrkEquipCall (304) */
>>>>>>> chore: regenerate types
  interface PalletRmrkEquipCall extends Enum {
    readonly isCreateBase: boolean;
    readonly asCreateBase: {
      readonly baseType: Bytes;
      readonly symbol: Bytes;
      readonly parts: Vec<RmrkTraitsPartPartType>;
    } & Struct;
    readonly isThemeAdd: boolean;
    readonly asThemeAdd: {
      readonly baseId: u32;
      readonly theme: RmrkTraitsTheme;
    } & Struct;
    readonly isEquippable: boolean;
    readonly asEquippable: {
      readonly baseId: u32;
      readonly slotId: u32;
      readonly equippables: RmrkTraitsPartEquippableList;
    } & Struct;
    readonly type: 'CreateBase' | 'ThemeAdd' | 'Equippable';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsPartPartType (307) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartPartType (308) */
=======
  /** @name RmrkTraitsPartPartType (309) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsPartPartType (308) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsPartPartType (307) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsPartPartType extends Enum {
    readonly isFixedPart: boolean;
    readonly asFixedPart: RmrkTraitsPartFixedPart;
    readonly isSlotPart: boolean;
    readonly asSlotPart: RmrkTraitsPartSlotPart;
    readonly type: 'FixedPart' | 'SlotPart';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsPartFixedPart (309) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartFixedPart (310) */
=======
  /** @name RmrkTraitsPartFixedPart (311) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsPartFixedPart (310) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsPartFixedPart (309) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsPartFixedPart extends Struct {
    readonly id: u32;
    readonly z: u32;
    readonly src: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsPartSlotPart (310) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartSlotPart (311) */
=======
  /** @name RmrkTraitsPartSlotPart (312) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsPartSlotPart (311) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsPartSlotPart (310) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsPartSlotPart extends Struct {
    readonly id: u32;
    readonly equippable: RmrkTraitsPartEquippableList;
    readonly src: Bytes;
    readonly z: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsPartEquippableList (311) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartEquippableList (312) */
=======
  /** @name RmrkTraitsPartEquippableList (313) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsPartEquippableList (312) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsPartEquippableList (311) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsPartEquippableList extends Enum {
    readonly isAll: boolean;
    readonly isEmpty: boolean;
    readonly isCustom: boolean;
    readonly asCustom: Vec<u32>;
    readonly type: 'All' | 'Empty' | 'Custom';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsTheme (313) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsTheme (314) */
=======
  /** @name RmrkTraitsTheme (315) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsTheme (314) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsTheme (313) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsTheme extends Struct {
    readonly name: Bytes;
    readonly properties: Vec<RmrkTraitsThemeThemeProperty>;
    readonly inherit: bool;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsThemeThemeProperty (315) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsThemeThemeProperty (316) */
=======
  /** @name RmrkTraitsThemeThemeProperty (317) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name RmrkTraitsThemeThemeProperty (316) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsThemeThemeProperty (315) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsThemeThemeProperty extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletAppPromotionCall (317) */
=======
<<<<<<< HEAD
  /** @name PalletAppPromotionCall (318) */
=======
  /** @name PalletAppPromotionCall (319) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletAppPromotionCall (318) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletAppPromotionCall (317) */
>>>>>>> chore: regenerate types
  interface PalletAppPromotionCall extends Enum {
    readonly isSetAdminAddress: boolean;
    readonly asSetAdminAddress: {
      readonly admin: PalletEvmAccountBasicCrossAccountIdRepr;
    } & Struct;
    readonly isStake: boolean;
    readonly asStake: {
      readonly amount: u128;
    } & Struct;
    readonly isUnstake: boolean;
    readonly isSponsorCollection: boolean;
    readonly asSponsorCollection: {
      readonly collectionId: u32;
    } & Struct;
    readonly isStopSponsoringCollection: boolean;
    readonly asStopSponsoringCollection: {
      readonly collectionId: u32;
    } & Struct;
    readonly isSponsorContract: boolean;
    readonly asSponsorContract: {
      readonly contractId: H160;
    } & Struct;
    readonly isStopSponsoringContract: boolean;
    readonly asStopSponsoringContract: {
      readonly contractId: H160;
    } & Struct;
    readonly isPayoutStakers: boolean;
    readonly asPayoutStakers: {
      readonly stakersNumber: Option<u8>;
    } & Struct;
    readonly type: 'SetAdminAddress' | 'Stake' | 'Unstake' | 'SponsorCollection' | 'StopSponsoringCollection' | 'SponsorContract' | 'StopSponsoringContract' | 'PayoutStakers';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletForeignAssetsModuleCall (318) */
=======
<<<<<<< HEAD
  /** @name PalletForeignAssetsModuleCall (319) */
=======
  /** @name PalletForeignAssetsModuleCall (320) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletForeignAssetsModuleCall (319) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletForeignAssetsModuleCall (318) */
>>>>>>> chore: regenerate types
  interface PalletForeignAssetsModuleCall extends Enum {
    readonly isRegisterForeignAsset: boolean;
    readonly asRegisterForeignAsset: {
      readonly owner: AccountId32;
      readonly location: XcmVersionedMultiLocation;
      readonly metadata: PalletForeignAssetsModuleAssetMetadata;
    } & Struct;
    readonly isUpdateForeignAsset: boolean;
    readonly asUpdateForeignAsset: {
      readonly foreignAssetId: u32;
      readonly location: XcmVersionedMultiLocation;
      readonly metadata: PalletForeignAssetsModuleAssetMetadata;
    } & Struct;
    readonly type: 'RegisterForeignAsset' | 'UpdateForeignAsset';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmCall (319) */
=======
<<<<<<< HEAD
  /** @name PalletEvmCall (320) */
=======
  /** @name PalletEvmCall (321) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletEvmCall (320) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletEvmCall (319) */
>>>>>>> chore: regenerate types
  interface PalletEvmCall extends Enum {
    readonly isWithdraw: boolean;
    readonly asWithdraw: {
      readonly address: H160;
      readonly value: u128;
    } & Struct;
    readonly isCall: boolean;
    readonly asCall: {
      readonly source: H160;
      readonly target: H160;
      readonly input: Bytes;
      readonly value: U256;
      readonly gasLimit: u64;
      readonly maxFeePerGas: U256;
      readonly maxPriorityFeePerGas: Option<U256>;
      readonly nonce: Option<U256>;
      readonly accessList: Vec<ITuple<[H160, Vec<H256>]>>;
    } & Struct;
    readonly isCreate: boolean;
    readonly asCreate: {
      readonly source: H160;
      readonly init: Bytes;
      readonly value: U256;
      readonly gasLimit: u64;
      readonly maxFeePerGas: U256;
      readonly maxPriorityFeePerGas: Option<U256>;
      readonly nonce: Option<U256>;
      readonly accessList: Vec<ITuple<[H160, Vec<H256>]>>;
    } & Struct;
    readonly isCreate2: boolean;
    readonly asCreate2: {
      readonly source: H160;
      readonly init: Bytes;
      readonly salt: H256;
      readonly value: U256;
      readonly gasLimit: u64;
      readonly maxFeePerGas: U256;
      readonly maxPriorityFeePerGas: Option<U256>;
      readonly nonce: Option<U256>;
      readonly accessList: Vec<ITuple<[H160, Vec<H256>]>>;
    } & Struct;
    readonly type: 'Withdraw' | 'Call' | 'Create' | 'Create2';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEthereumCall (325) */
=======
<<<<<<< HEAD
  /** @name PalletEthereumCall (326) */
=======
  /** @name PalletEthereumCall (325) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletEthereumCall (326) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletEthereumCall (325) */
>>>>>>> chore: regenerate types
  interface PalletEthereumCall extends Enum {
    readonly isTransact: boolean;
    readonly asTransact: {
      readonly transaction: EthereumTransactionTransactionV2;
    } & Struct;
    readonly type: 'Transact';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTransactionTransactionV2 (326) */
=======
<<<<<<< HEAD
  /** @name EthereumTransactionTransactionV2 (327) */
=======
  /** @name EthereumTransactionTransactionV2 (326) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name EthereumTransactionTransactionV2 (327) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name EthereumTransactionTransactionV2 (326) */
>>>>>>> chore: regenerate types
  interface EthereumTransactionTransactionV2 extends Enum {
    readonly isLegacy: boolean;
    readonly asLegacy: EthereumTransactionLegacyTransaction;
    readonly isEip2930: boolean;
    readonly asEip2930: EthereumTransactionEip2930Transaction;
    readonly isEip1559: boolean;
    readonly asEip1559: EthereumTransactionEip1559Transaction;
    readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTransactionLegacyTransaction (327) */
=======
<<<<<<< HEAD
  /** @name EthereumTransactionLegacyTransaction (328) */
=======
  /** @name EthereumTransactionLegacyTransaction (327) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name EthereumTransactionLegacyTransaction (328) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name EthereumTransactionLegacyTransaction (327) */
>>>>>>> chore: regenerate types
  interface EthereumTransactionLegacyTransaction extends Struct {
    readonly nonce: U256;
    readonly gasPrice: U256;
    readonly gasLimit: U256;
    readonly action: EthereumTransactionTransactionAction;
    readonly value: U256;
    readonly input: Bytes;
    readonly signature: EthereumTransactionTransactionSignature;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTransactionTransactionAction (328) */
=======
<<<<<<< HEAD
  /** @name EthereumTransactionTransactionAction (329) */
=======
  /** @name EthereumTransactionTransactionAction (328) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name EthereumTransactionTransactionAction (329) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name EthereumTransactionTransactionAction (328) */
>>>>>>> chore: regenerate types
  interface EthereumTransactionTransactionAction extends Enum {
    readonly isCall: boolean;
    readonly asCall: H160;
    readonly isCreate: boolean;
    readonly type: 'Call' | 'Create';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTransactionTransactionSignature (329) */
=======
<<<<<<< HEAD
  /** @name EthereumTransactionTransactionSignature (330) */
=======
  /** @name EthereumTransactionTransactionSignature (329) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name EthereumTransactionTransactionSignature (330) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name EthereumTransactionTransactionSignature (329) */
>>>>>>> chore: regenerate types
  interface EthereumTransactionTransactionSignature extends Struct {
    readonly v: u64;
    readonly r: H256;
    readonly s: H256;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTransactionEip2930Transaction (331) */
=======
<<<<<<< HEAD
  /** @name EthereumTransactionEip2930Transaction (332) */
=======
  /** @name EthereumTransactionEip2930Transaction (331) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name EthereumTransactionEip2930Transaction (332) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name EthereumTransactionEip2930Transaction (331) */
>>>>>>> chore: regenerate types
  interface EthereumTransactionEip2930Transaction extends Struct {
    readonly chainId: u64;
    readonly nonce: U256;
    readonly gasPrice: U256;
    readonly gasLimit: U256;
    readonly action: EthereumTransactionTransactionAction;
    readonly value: U256;
    readonly input: Bytes;
    readonly accessList: Vec<EthereumTransactionAccessListItem>;
    readonly oddYParity: bool;
    readonly r: H256;
    readonly s: H256;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTransactionAccessListItem (333) */
=======
<<<<<<< HEAD
  /** @name EthereumTransactionAccessListItem (334) */
=======
  /** @name EthereumTransactionAccessListItem (333) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name EthereumTransactionAccessListItem (334) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name EthereumTransactionAccessListItem (333) */
>>>>>>> chore: regenerate types
  interface EthereumTransactionAccessListItem extends Struct {
    readonly address: H160;
    readonly storageKeys: Vec<H256>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTransactionEip1559Transaction (334) */
=======
<<<<<<< HEAD
  /** @name EthereumTransactionEip1559Transaction (335) */
=======
  /** @name EthereumTransactionEip1559Transaction (334) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name EthereumTransactionEip1559Transaction (335) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name EthereumTransactionEip1559Transaction (334) */
>>>>>>> chore: regenerate types
  interface EthereumTransactionEip1559Transaction extends Struct {
    readonly chainId: u64;
    readonly nonce: U256;
    readonly maxPriorityFeePerGas: U256;
    readonly maxFeePerGas: U256;
    readonly gasLimit: U256;
    readonly action: EthereumTransactionTransactionAction;
    readonly value: U256;
    readonly input: Bytes;
    readonly accessList: Vec<EthereumTransactionAccessListItem>;
    readonly oddYParity: bool;
    readonly r: H256;
    readonly s: H256;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmMigrationCall (335) */
=======
<<<<<<< HEAD
  /** @name PalletEvmMigrationCall (336) */
=======
  /** @name PalletEvmMigrationCall (335) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletEvmMigrationCall (336) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletEvmMigrationCall (335) */
>>>>>>> chore: regenerate types
  interface PalletEvmMigrationCall extends Enum {
    readonly isBegin: boolean;
    readonly asBegin: {
      readonly address: H160;
    } & Struct;
    readonly isSetData: boolean;
    readonly asSetData: {
      readonly address: H160;
      readonly data: Vec<ITuple<[H256, H256]>>;
    } & Struct;
    readonly isFinish: boolean;
    readonly asFinish: {
      readonly address: H160;
      readonly code: Bytes;
    } & Struct;
    readonly isInsertEthLogs: boolean;
    readonly asInsertEthLogs: {
      readonly logs: Vec<EthereumLog>;
    } & Struct;
    readonly isInsertEvents: boolean;
    readonly asInsertEvents: {
      readonly events: Vec<Bytes>;
    } & Struct;
    readonly type: 'Begin' | 'SetData' | 'Finish' | 'InsertEthLogs' | 'InsertEvents';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletMaintenanceCall (339) */
=======
  /** @name PalletMaintenanceCall (338) */
>>>>>>> chore:  regenerate types
=======
  /** @name PalletMaintenanceCall (340) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletMaintenanceCall (339) */
>>>>>>> chore: regenerate types
  interface PalletMaintenanceCall extends Enum {
    readonly isEnable: boolean;
    readonly isDisable: boolean;
    readonly type: 'Enable' | 'Disable';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTestUtilsCall (340) */
=======
  /** @name PalletTestUtilsCall (339) */
>>>>>>> chore:  regenerate types
=======
  /** @name PalletTestUtilsCall (341) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletTestUtilsCall (340) */
>>>>>>> chore: regenerate types
  interface PalletTestUtilsCall extends Enum {
    readonly isEnable: boolean;
    readonly isSetTestValue: boolean;
    readonly asSetTestValue: {
      readonly value: u32;
    } & Struct;
    readonly isSetTestValueAndRollback: boolean;
    readonly asSetTestValueAndRollback: {
      readonly value: u32;
    } & Struct;
    readonly isIncTestValue: boolean;
    readonly isJustTakeFee: boolean;
    readonly isBatchAll: boolean;
    readonly asBatchAll: {
      readonly calls: Vec<Call>;
    } & Struct;
    readonly type: 'Enable' | 'SetTestValue' | 'SetTestValueAndRollback' | 'IncTestValue' | 'JustTakeFee' | 'BatchAll';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletSudoError (342) */
=======
<<<<<<< HEAD
  /** @name PalletSudoError (343) */
=======
  /** @name PalletSudoError (341) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletSudoError (343) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletSudoError (342) */
>>>>>>> chore: regenerate types
  interface PalletSudoError extends Enum {
    readonly isRequireSudo: boolean;
    readonly type: 'RequireSudo';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlVestingModuleError (344) */
=======
<<<<<<< HEAD
  /** @name OrmlVestingModuleError (345) */
=======
  /** @name OrmlVestingModuleError (343) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name OrmlVestingModuleError (345) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlVestingModuleError (344) */
>>>>>>> chore: regenerate types
  interface OrmlVestingModuleError extends Enum {
    readonly isZeroVestingPeriod: boolean;
    readonly isZeroVestingPeriodCount: boolean;
    readonly isInsufficientBalanceToLock: boolean;
    readonly isTooManyVestingSchedules: boolean;
    readonly isAmountLow: boolean;
    readonly isMaxVestingSchedulesExceeded: boolean;
    readonly type: 'ZeroVestingPeriod' | 'ZeroVestingPeriodCount' | 'InsufficientBalanceToLock' | 'TooManyVestingSchedules' | 'AmountLow' | 'MaxVestingSchedulesExceeded';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlXtokensModuleError (345) */
=======
<<<<<<< HEAD
  /** @name OrmlXtokensModuleError (346) */
=======
  /** @name OrmlXtokensModuleError (344) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name OrmlXtokensModuleError (346) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlXtokensModuleError (345) */
>>>>>>> chore: regenerate types
  interface OrmlXtokensModuleError extends Enum {
    readonly isAssetHasNoReserve: boolean;
    readonly isNotCrossChainTransfer: boolean;
    readonly isInvalidDest: boolean;
    readonly isNotCrossChainTransferableCurrency: boolean;
    readonly isUnweighableMessage: boolean;
    readonly isXcmExecutionFailed: boolean;
    readonly isCannotReanchor: boolean;
    readonly isInvalidAncestry: boolean;
    readonly isInvalidAsset: boolean;
    readonly isDestinationNotInvertible: boolean;
    readonly isBadVersion: boolean;
    readonly isDistinctReserveForAssetAndFee: boolean;
    readonly isZeroFee: boolean;
    readonly isZeroAmount: boolean;
    readonly isTooManyAssetsBeingSent: boolean;
    readonly isAssetIndexNonExistent: boolean;
    readonly isFeeNotEnough: boolean;
    readonly isNotSupportedMultiLocation: boolean;
    readonly isMinXcmFeeNotDefined: boolean;
    readonly type: 'AssetHasNoReserve' | 'NotCrossChainTransfer' | 'InvalidDest' | 'NotCrossChainTransferableCurrency' | 'UnweighableMessage' | 'XcmExecutionFailed' | 'CannotReanchor' | 'InvalidAncestry' | 'InvalidAsset' | 'DestinationNotInvertible' | 'BadVersion' | 'DistinctReserveForAssetAndFee' | 'ZeroFee' | 'ZeroAmount' | 'TooManyAssetsBeingSent' | 'AssetIndexNonExistent' | 'FeeNotEnough' | 'NotSupportedMultiLocation' | 'MinXcmFeeNotDefined';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlTokensBalanceLock (348) */
=======
<<<<<<< HEAD
  /** @name OrmlTokensBalanceLock (349) */
=======
  /** @name OrmlTokensBalanceLock (347) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name OrmlTokensBalanceLock (349) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlTokensBalanceLock (348) */
>>>>>>> chore: regenerate types
  interface OrmlTokensBalanceLock extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlTokensAccountData (350) */
=======
<<<<<<< HEAD
  /** @name OrmlTokensAccountData (351) */
=======
  /** @name OrmlTokensAccountData (349) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name OrmlTokensAccountData (351) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlTokensAccountData (350) */
>>>>>>> chore: regenerate types
  interface OrmlTokensAccountData extends Struct {
    readonly free: u128;
    readonly reserved: u128;
    readonly frozen: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlTokensReserveData (352) */
=======
<<<<<<< HEAD
  /** @name OrmlTokensReserveData (353) */
=======
  /** @name OrmlTokensReserveData (351) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name OrmlTokensReserveData (353) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlTokensReserveData (352) */
>>>>>>> chore: regenerate types
  interface OrmlTokensReserveData extends Struct {
    readonly id: Null;
    readonly amount: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlTokensModuleError (354) */
=======
<<<<<<< HEAD
  /** @name OrmlTokensModuleError (355) */
=======
  /** @name OrmlTokensModuleError (353) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name OrmlTokensModuleError (355) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name OrmlTokensModuleError (354) */
>>>>>>> chore: regenerate types
  interface OrmlTokensModuleError extends Enum {
    readonly isBalanceTooLow: boolean;
    readonly isAmountIntoBalanceFailed: boolean;
    readonly isLiquidityRestrictions: boolean;
    readonly isMaxLocksExceeded: boolean;
    readonly isKeepAlive: boolean;
    readonly isExistentialDeposit: boolean;
    readonly isDeadAccount: boolean;
    readonly isTooManyReserves: boolean;
    readonly type: 'BalanceTooLow' | 'AmountIntoBalanceFailed' | 'LiquidityRestrictions' | 'MaxLocksExceeded' | 'KeepAlive' | 'ExistentialDeposit' | 'DeadAccount' | 'TooManyReserves';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueInboundChannelDetails (356) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueInboundChannelDetails (357) */
=======
  /** @name CumulusPalletXcmpQueueInboundChannelDetails (355) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletXcmpQueueInboundChannelDetails (357) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmpQueueInboundChannelDetails (356) */
>>>>>>> chore: regenerate types
  interface CumulusPalletXcmpQueueInboundChannelDetails extends Struct {
    readonly sender: u32;
    readonly state: CumulusPalletXcmpQueueInboundState;
    readonly messageMetadata: Vec<ITuple<[u32, PolkadotParachainPrimitivesXcmpMessageFormat]>>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueInboundState (357) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueInboundState (358) */
=======
  /** @name CumulusPalletXcmpQueueInboundState (356) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletXcmpQueueInboundState (358) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmpQueueInboundState (357) */
>>>>>>> chore: regenerate types
  interface CumulusPalletXcmpQueueInboundState extends Enum {
    readonly isOk: boolean;
    readonly isSuspended: boolean;
    readonly type: 'Ok' | 'Suspended';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotParachainPrimitivesXcmpMessageFormat (360) */
=======
<<<<<<< HEAD
  /** @name PolkadotParachainPrimitivesXcmpMessageFormat (361) */
=======
  /** @name PolkadotParachainPrimitivesXcmpMessageFormat (359) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PolkadotParachainPrimitivesXcmpMessageFormat (361) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PolkadotParachainPrimitivesXcmpMessageFormat (360) */
>>>>>>> chore: regenerate types
  interface PolkadotParachainPrimitivesXcmpMessageFormat extends Enum {
    readonly isConcatenatedVersionedXcm: boolean;
    readonly isConcatenatedEncodedBlob: boolean;
    readonly isSignals: boolean;
    readonly type: 'ConcatenatedVersionedXcm' | 'ConcatenatedEncodedBlob' | 'Signals';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueOutboundChannelDetails (363) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueOutboundChannelDetails (364) */
=======
  /** @name CumulusPalletXcmpQueueOutboundChannelDetails (362) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletXcmpQueueOutboundChannelDetails (364) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmpQueueOutboundChannelDetails (363) */
>>>>>>> chore: regenerate types
  interface CumulusPalletXcmpQueueOutboundChannelDetails extends Struct {
    readonly recipient: u32;
    readonly state: CumulusPalletXcmpQueueOutboundState;
    readonly signalsExist: bool;
    readonly firstIndex: u16;
    readonly lastIndex: u16;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueOutboundState (364) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueOutboundState (365) */
=======
  /** @name CumulusPalletXcmpQueueOutboundState (363) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletXcmpQueueOutboundState (365) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmpQueueOutboundState (364) */
>>>>>>> chore: regenerate types
  interface CumulusPalletXcmpQueueOutboundState extends Enum {
    readonly isOk: boolean;
    readonly isSuspended: boolean;
    readonly type: 'Ok' | 'Suspended';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueQueueConfigData (366) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueQueueConfigData (367) */
=======
  /** @name CumulusPalletXcmpQueueQueueConfigData (365) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletXcmpQueueQueueConfigData (367) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmpQueueQueueConfigData (366) */
>>>>>>> chore: regenerate types
  interface CumulusPalletXcmpQueueQueueConfigData extends Struct {
    readonly suspendThreshold: u32;
    readonly dropThreshold: u32;
    readonly resumeThreshold: u32;
    readonly thresholdWeight: SpWeightsWeightV2Weight;
    readonly weightRestrictDecay: SpWeightsWeightV2Weight;
    readonly xcmpMaxIndividualWeight: SpWeightsWeightV2Weight;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueError (368) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueError (369) */
=======
  /** @name CumulusPalletXcmpQueueError (367) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletXcmpQueueError (369) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmpQueueError (368) */
>>>>>>> chore: regenerate types
  interface CumulusPalletXcmpQueueError extends Enum {
    readonly isFailedToSend: boolean;
    readonly isBadXcmOrigin: boolean;
    readonly isBadXcm: boolean;
    readonly isBadOverweightIndex: boolean;
    readonly isWeightOverLimit: boolean;
    readonly type: 'FailedToSend' | 'BadXcmOrigin' | 'BadXcm' | 'BadOverweightIndex' | 'WeightOverLimit';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletXcmError (369) */
=======
<<<<<<< HEAD
  /** @name PalletXcmError (370) */
=======
  /** @name PalletXcmError (368) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletXcmError (370) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletXcmError (369) */
>>>>>>> chore: regenerate types
  interface PalletXcmError extends Enum {
    readonly isUnreachable: boolean;
    readonly isSendFailure: boolean;
    readonly isFiltered: boolean;
    readonly isUnweighableMessage: boolean;
    readonly isDestinationNotInvertible: boolean;
    readonly isEmpty: boolean;
    readonly isCannotReanchor: boolean;
    readonly isTooManyAssets: boolean;
    readonly isInvalidOrigin: boolean;
    readonly isBadVersion: boolean;
    readonly isBadLocation: boolean;
    readonly isNoSubscription: boolean;
    readonly isAlreadySubscribed: boolean;
    readonly type: 'Unreachable' | 'SendFailure' | 'Filtered' | 'UnweighableMessage' | 'DestinationNotInvertible' | 'Empty' | 'CannotReanchor' | 'TooManyAssets' | 'InvalidOrigin' | 'BadVersion' | 'BadLocation' | 'NoSubscription' | 'AlreadySubscribed';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmError (370) */
  type CumulusPalletXcmError = Null;

  /** @name CumulusPalletDmpQueueConfigData (371) */
=======
<<<<<<< HEAD
=======
>>>>>>> fix: regenerate types after rebase
  /** @name CumulusPalletXcmError (371) */
  type CumulusPalletXcmError = Null;

  /** @name CumulusPalletDmpQueueConfigData (372) */
<<<<<<< HEAD
=======
  /** @name CumulusPalletXcmError (369) */
  type CumulusPalletXcmError = Null;

  /** @name CumulusPalletDmpQueueConfigData (370) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletXcmError (370) */
  type CumulusPalletXcmError = Null;

  /** @name CumulusPalletDmpQueueConfigData (371) */
>>>>>>> chore: regenerate types
  interface CumulusPalletDmpQueueConfigData extends Struct {
    readonly maxIndividual: SpWeightsWeightV2Weight;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletDmpQueuePageIndexData (372) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletDmpQueuePageIndexData (373) */
=======
  /** @name CumulusPalletDmpQueuePageIndexData (371) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletDmpQueuePageIndexData (373) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletDmpQueuePageIndexData (372) */
>>>>>>> chore: regenerate types
  interface CumulusPalletDmpQueuePageIndexData extends Struct {
    readonly beginUsed: u32;
    readonly endUsed: u32;
    readonly overweightCount: u64;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletDmpQueueError (375) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletDmpQueueError (376) */
=======
  /** @name CumulusPalletDmpQueueError (374) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name CumulusPalletDmpQueueError (376) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name CumulusPalletDmpQueueError (375) */
>>>>>>> chore: regenerate types
  interface CumulusPalletDmpQueueError extends Enum {
    readonly isUnknown: boolean;
    readonly isOverLimit: boolean;
    readonly type: 'Unknown' | 'OverLimit';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletUniqueError (379) */
=======
<<<<<<< HEAD
  /** @name PalletUniqueError (380) */
=======
  /** @name PalletUniqueError (378) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
=======
  /** @name PalletUniqueError (380) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletUniqueError (379) */
>>>>>>> chore: regenerate types
  interface PalletUniqueError extends Enum {
    readonly isCollectionDecimalPointLimitExceeded: boolean;
    readonly isEmptyArgument: boolean;
    readonly isRepartitionCalledOnNonRefungibleCollection: boolean;
    readonly type: 'CollectionDecimalPointLimitExceeded' | 'EmptyArgument' | 'RepartitionCalledOnNonRefungibleCollection';
  }

  /** @name PalletConfigurationError (380) */
  interface PalletConfigurationError extends Enum {
    readonly isInconsistentConfiguration: boolean;
    readonly type: 'InconsistentConfiguration';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCollection (381) */
=======
  /** @name UpDataStructsCollection (382) */
=======
    readonly type: 'CollectionDecimalPointLimitExceeded' | 'ConfirmUnsetSponsorFail' | 'EmptyArgument' | 'RepartitionCalledOnNonRefungibleCollection';
  }

  /** @name PalletUniqueSchedulerV2BlockAgenda (381) */
  interface PalletUniqueSchedulerV2BlockAgenda extends Struct {
    readonly agenda: Vec<Option<PalletUniqueSchedulerV2Scheduled>>;
    readonly freePlaces: u32;
  }

  /** @name PalletUniqueSchedulerV2Scheduled (384) */
  interface PalletUniqueSchedulerV2Scheduled extends Struct {
    readonly maybeId: Option<U8aFixed>;
    readonly priority: u8;
    readonly call: PalletUniqueSchedulerV2ScheduledCall;
    readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
    readonly origin: OpalRuntimeOriginCaller;
  }

  /** @name PalletUniqueSchedulerV2ScheduledCall (385) */
  interface PalletUniqueSchedulerV2ScheduledCall extends Enum {
    readonly isInline: boolean;
    readonly asInline: Bytes;
    readonly isPreimageLookup: boolean;
    readonly asPreimageLookup: {
      readonly hash_: H256;
      readonly unboundedLen: u32;
    } & Struct;
    readonly type: 'Inline' | 'PreimageLookup';
  }

  /** @name OpalRuntimeOriginCaller (387) */
  interface OpalRuntimeOriginCaller extends Enum {
    readonly isSystem: boolean;
    readonly asSystem: FrameSupportDispatchRawOrigin;
    readonly isVoid: boolean;
    readonly isPolkadotXcm: boolean;
    readonly asPolkadotXcm: PalletXcmOrigin;
    readonly isCumulusXcm: boolean;
    readonly asCumulusXcm: CumulusPalletXcmOrigin;
    readonly isEthereum: boolean;
    readonly asEthereum: PalletEthereumRawOrigin;
    readonly type: 'System' | 'Void' | 'PolkadotXcm' | 'CumulusXcm' | 'Ethereum';
  }

  /** @name FrameSupportDispatchRawOrigin (388) */
  interface FrameSupportDispatchRawOrigin extends Enum {
    readonly isRoot: boolean;
    readonly isSigned: boolean;
    readonly asSigned: AccountId32;
    readonly isNone: boolean;
    readonly type: 'Root' | 'Signed' | 'None';
  }

  /** @name PalletXcmOrigin (389) */
  interface PalletXcmOrigin extends Enum {
    readonly isXcm: boolean;
    readonly asXcm: XcmV1MultiLocation;
    readonly isResponse: boolean;
    readonly asResponse: XcmV1MultiLocation;
    readonly type: 'Xcm' | 'Response';
  }

  /** @name CumulusPalletXcmOrigin (390) */
  interface CumulusPalletXcmOrigin extends Enum {
    readonly isRelay: boolean;
    readonly isSiblingParachain: boolean;
    readonly asSiblingParachain: u32;
    readonly type: 'Relay' | 'SiblingParachain';
  }

  /** @name PalletEthereumRawOrigin (391) */
  interface PalletEthereumRawOrigin extends Enum {
    readonly isEthereumTransaction: boolean;
    readonly asEthereumTransaction: H160;
    readonly type: 'EthereumTransaction';
  }

  /** @name SpCoreVoid (392) */
  type SpCoreVoid = Null;

  /** @name PalletUniqueSchedulerV2Error (394) */
  interface PalletUniqueSchedulerV2Error extends Enum {
    readonly isFailedToSchedule: boolean;
    readonly isAgendaIsExhausted: boolean;
    readonly isScheduledCallCorrupted: boolean;
    readonly isPreimageNotFound: boolean;
    readonly isTooBigScheduledCall: boolean;
    readonly isNotFound: boolean;
    readonly isTargetBlockNumberInPast: boolean;
    readonly isNamed: boolean;
    readonly type: 'FailedToSchedule' | 'AgendaIsExhausted' | 'ScheduledCallCorrupted' | 'PreimageNotFound' | 'TooBigScheduledCall' | 'NotFound' | 'TargetBlockNumberInPast' | 'Named';
  }

  /** @name UpDataStructsCollection (395) */
<<<<<<< HEAD
=======
  /** @name UpDataStructsCollection (393) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCollection (381) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCollection extends Struct {
    readonly owner: AccountId32;
    readonly mode: UpDataStructsCollectionMode;
    readonly name: Vec<u16>;
    readonly description: Vec<u16>;
    readonly tokenPrefix: Bytes;
    readonly sponsorship: UpDataStructsSponsorshipStateAccountId32;
    readonly limits: UpDataStructsCollectionLimits;
    readonly permissions: UpDataStructsCollectionPermissions;
    readonly flags: U8aFixed;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsSponsorshipStateAccountId32 (382) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsSponsorshipStateAccountId32 (383) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsSponsorshipStateAccountId32 (396) */
=======
  /** @name UpDataStructsSponsorshipStateAccountId32 (394) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsSponsorshipStateAccountId32 (396) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsSponsorshipStateAccountId32 (382) */
>>>>>>> chore: regenerate types
  interface UpDataStructsSponsorshipStateAccountId32 extends Enum {
    readonly isDisabled: boolean;
    readonly isUnconfirmed: boolean;
    readonly asUnconfirmed: AccountId32;
    readonly isConfirmed: boolean;
    readonly asConfirmed: AccountId32;
    readonly type: 'Disabled' | 'Unconfirmed' | 'Confirmed';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsProperties (384) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsProperties (385) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsProperties (398) */
=======
  /** @name UpDataStructsProperties (396) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsProperties (398) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsProperties (384) */
>>>>>>> chore: regenerate types
  interface UpDataStructsProperties extends Struct {
    readonly map: UpDataStructsPropertiesMapBoundedVec;
    readonly consumedSpace: u32;
    readonly spaceLimit: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsPropertiesMapBoundedVec (385) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsPropertiesMapBoundedVec (386) */
=======
<<<<<<< HEAD
=======
>>>>>>> fix: regenerate types after rebase
  /** @name UpDataStructsPropertiesMapBoundedVec (399) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
  interface UpDataStructsPropertiesMapBoundedVec extends BTreeMap<Bytes, Bytes> {}

  /** @name UpDataStructsPropertiesMapPropertyPermission (390) */
  interface UpDataStructsPropertiesMapPropertyPermission extends BTreeMap<Bytes, UpDataStructsPropertyPermission> {}

<<<<<<< HEAD
  /** @name UpDataStructsCollectionStats (397) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCollectionStats (398) */
=======
  /** @name UpDataStructsCollectionStats (411) */
<<<<<<< HEAD
=======
  /** @name UpDataStructsPropertiesMapBoundedVec (397) */
=======
  /** @name UpDataStructsPropertiesMapBoundedVec (385) */
>>>>>>> chore: regenerate types
  interface UpDataStructsPropertiesMapBoundedVec extends BTreeMap<Bytes, Bytes> {}

  /** @name UpDataStructsPropertiesMapPropertyPermission (390) */
  interface UpDataStructsPropertiesMapPropertyPermission extends BTreeMap<Bytes, UpDataStructsPropertyPermission> {}

<<<<<<< HEAD
  /** @name UpDataStructsCollectionStats (409) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsCollectionStats (397) */
>>>>>>> chore: regenerate types
  interface UpDataStructsCollectionStats extends Struct {
    readonly created: u32;
    readonly destroyed: u32;
    readonly alive: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsTokenChild (398) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsTokenChild (399) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsTokenChild (412) */
=======
  /** @name UpDataStructsTokenChild (410) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsTokenChild (412) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsTokenChild (398) */
>>>>>>> chore: regenerate types
  interface UpDataStructsTokenChild extends Struct {
    readonly token: u32;
    readonly collection: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PhantomTypeUpDataStructs (399) */
=======
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PhantomTypeUpDataStructs (400) */
=======
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PhantomTypeUpDataStructs (413) */
>>>>>>> fix: update polkadot types and definitions
>>>>>>> fix: update polkadot types and definitions
  interface PhantomTypeUpDataStructs extends Vec<ITuple<[UpDataStructsTokenData, UpDataStructsRpcCollection, RmrkTraitsCollectionCollectionInfo, RmrkTraitsNftNftInfo, RmrkTraitsResourceResourceInfo, RmrkTraitsPropertyPropertyInfo, RmrkTraitsBaseBaseInfo, RmrkTraitsPartPartType, RmrkTraitsTheme, RmrkTraitsNftNftChild]>> {}
=======
  /** @name PhantomTypeUpDataStructs (408) */
=======
  /** @name PhantomTypeUpDataStructs (411) */
>>>>>>> chore:  regenerate types
=======
  /** @name PhantomTypeUpDataStructs (413) */
>>>>>>> fix: regenerate types after rebase
  interface PhantomTypeUpDataStructs extends Vec<ITuple<[UpDataStructsTokenData, UpDataStructsRpcCollection, RmrkTraitsCollectionCollectionInfo, RmrkTraitsNftNftInfo, RmrkTraitsResourceResourceInfo, RmrkTraitsPropertyPropertyInfo, RmrkTraitsBaseBaseInfo, RmrkTraitsPartPartType, RmrkTraitsTheme, RmrkTraitsNftNftChild, UpPovEstimateRpcPovInfo]>> {}

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsTokenData (401) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsTokenData (402) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsTokenData (415) */
=======
  /** @name UpDataStructsTokenData (413) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsTokenData (415) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PhantomTypeUpDataStructs (399) */
  interface PhantomTypeUpDataStructs extends Vec<ITuple<[UpDataStructsTokenData, UpDataStructsRpcCollection, RmrkTraitsCollectionCollectionInfo, RmrkTraitsNftNftInfo, RmrkTraitsResourceResourceInfo, RmrkTraitsPropertyPropertyInfo, RmrkTraitsBaseBaseInfo, RmrkTraitsPartPartType, RmrkTraitsTheme, RmrkTraitsNftNftChild, UpPovEstimateRpcPovInfo]>> {}

  /** @name UpDataStructsTokenData (401) */
>>>>>>> chore: regenerate types
  interface UpDataStructsTokenData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
    readonly owner: Option<PalletEvmAccountBasicCrossAccountIdRepr>;
    readonly pieces: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsRpcCollection (403) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsRpcCollection (404) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsRpcCollection (417) */
=======
  /** @name UpDataStructsRpcCollection (415) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsRpcCollection (417) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsRpcCollection (403) */
>>>>>>> chore: regenerate types
  interface UpDataStructsRpcCollection extends Struct {
    readonly owner: AccountId32;
    readonly mode: UpDataStructsCollectionMode;
    readonly name: Vec<u16>;
    readonly description: Vec<u16>;
    readonly tokenPrefix: Bytes;
    readonly sponsorship: UpDataStructsSponsorshipStateAccountId32;
    readonly limits: UpDataStructsCollectionLimits;
    readonly permissions: UpDataStructsCollectionPermissions;
    readonly tokenPropertyPermissions: Vec<UpDataStructsPropertyKeyPermission>;
    readonly properties: Vec<UpDataStructsProperty>;
    readonly readOnly: bool;
    readonly flags: UpDataStructsRpcCollectionFlags;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsRpcCollectionFlags (404) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsRpcCollectionFlags (405) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsRpcCollectionFlags (418) */
=======
  /** @name UpDataStructsRpcCollectionFlags (416) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name UpDataStructsRpcCollectionFlags (418) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpDataStructsRpcCollectionFlags (404) */
>>>>>>> chore: regenerate types
  interface UpDataStructsRpcCollectionFlags extends Struct {
    readonly foreign: bool;
    readonly erc721metadata: bool;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsCollectionCollectionInfo (405) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name RmrkTraitsCollectionCollectionInfo (406) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsCollectionCollectionInfo (419) */
=======
  /** @name RmrkTraitsCollectionCollectionInfo (417) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name RmrkTraitsCollectionCollectionInfo (419) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsCollectionCollectionInfo (405) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsCollectionCollectionInfo extends Struct {
    readonly issuer: AccountId32;
    readonly metadata: Bytes;
    readonly max: Option<u32>;
    readonly symbol: Bytes;
    readonly nftsCount: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsNftNftInfo (406) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name RmrkTraitsNftNftInfo (407) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsNftNftInfo (420) */
=======
  /** @name RmrkTraitsNftNftInfo (418) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name RmrkTraitsNftNftInfo (420) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsNftNftInfo (406) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsNftNftInfo extends Struct {
    readonly owner: RmrkTraitsNftAccountIdOrCollectionNftTuple;
    readonly royalty: Option<RmrkTraitsNftRoyaltyInfo>;
    readonly metadata: Bytes;
    readonly equipped: bool;
    readonly pending: bool;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsNftRoyaltyInfo (408) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name RmrkTraitsNftRoyaltyInfo (409) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsNftRoyaltyInfo (422) */
=======
  /** @name RmrkTraitsNftRoyaltyInfo (420) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name RmrkTraitsNftRoyaltyInfo (422) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsNftRoyaltyInfo (408) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsNftRoyaltyInfo extends Struct {
    readonly recipient: AccountId32;
    readonly amount: Permill;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsResourceResourceInfo (409) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name RmrkTraitsResourceResourceInfo (410) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceResourceInfo (423) */
=======
  /** @name RmrkTraitsResourceResourceInfo (421) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name RmrkTraitsResourceResourceInfo (423) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsResourceResourceInfo (409) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsResourceResourceInfo extends Struct {
    readonly id: u32;
    readonly resource: RmrkTraitsResourceResourceTypes;
    readonly pending: bool;
    readonly pendingRemoval: bool;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsPropertyPropertyInfo (410) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name RmrkTraitsPropertyPropertyInfo (411) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPropertyPropertyInfo (424) */
=======
  /** @name RmrkTraitsPropertyPropertyInfo (422) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name RmrkTraitsPropertyPropertyInfo (424) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsPropertyPropertyInfo (410) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsPropertyPropertyInfo extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsBaseBaseInfo (411) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name RmrkTraitsBaseBaseInfo (412) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsBaseBaseInfo (425) */
=======
  /** @name RmrkTraitsBaseBaseInfo (423) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name RmrkTraitsBaseBaseInfo (425) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsBaseBaseInfo (411) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsBaseBaseInfo extends Struct {
    readonly issuer: AccountId32;
    readonly baseType: Bytes;
    readonly symbol: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name RmrkTraitsNftNftChild (412) */
=======
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name RmrkTraitsNftNftChild (413) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsNftNftChild (426) */
=======
  /** @name RmrkTraitsNftNftChild (424) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name RmrkTraitsNftNftChild (426) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name RmrkTraitsNftNftChild (412) */
>>>>>>> chore: regenerate types
  interface RmrkTraitsNftNftChild extends Struct {
    readonly collectionId: u32;
    readonly nftId: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletCommonError (414) */
=======
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletCommonError (415) */
=======
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletCommonError (428) */
=======
  /** @name UpPovEstimateRpcPovInfo (422) */
=======
  /** @name UpPovEstimateRpcPovInfo (425) */
>>>>>>> chore:  regenerate types
=======
  /** @name UpPovEstimateRpcPovInfo (427) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpPovEstimateRpcPovInfo (413) */
>>>>>>> chore: regenerate types
  interface UpPovEstimateRpcPovInfo extends Struct {
    readonly proofSize: u64;
    readonly compactProofSize: u64;
    readonly compressedProofSize: u64;
    readonly results: Vec<Result<Result<Null, SpRuntimeDispatchError>, SpRuntimeTransactionValidityTransactionValidityError>>;
    readonly keyValues: Vec<UpPovEstimateRpcTrieKeyValue>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletCommonError (424) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
  /** @name SpRuntimeTransactionValidityTransactionValidityError (424) */
=======
  /** @name SpRuntimeTransactionValidityTransactionValidityError (428) */
>>>>>>> chore:  regenerate types
=======
  /** @name SpRuntimeTransactionValidityTransactionValidityError (430) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name SpRuntimeTransactionValidityTransactionValidityError (416) */
>>>>>>> chore: regenerate types
  interface SpRuntimeTransactionValidityTransactionValidityError extends Enum {
    readonly isInvalid: boolean;
    readonly asInvalid: SpRuntimeTransactionValidityInvalidTransaction;
    readonly isUnknown: boolean;
    readonly asUnknown: SpRuntimeTransactionValidityUnknownTransaction;
    readonly type: 'Invalid' | 'Unknown';
  }

  /** @name SpRuntimeTransactionValidityInvalidTransaction (417) */
  interface SpRuntimeTransactionValidityInvalidTransaction extends Enum {
    readonly isCall: boolean;
    readonly isPayment: boolean;
    readonly isFuture: boolean;
    readonly isStale: boolean;
    readonly isBadProof: boolean;
    readonly isAncientBirthBlock: boolean;
    readonly isExhaustsResources: boolean;
    readonly isCustom: boolean;
    readonly asCustom: u8;
    readonly isBadMandatory: boolean;
    readonly isMandatoryValidation: boolean;
    readonly isBadSigner: boolean;
    readonly type: 'Call' | 'Payment' | 'Future' | 'Stale' | 'BadProof' | 'AncientBirthBlock' | 'ExhaustsResources' | 'Custom' | 'BadMandatory' | 'MandatoryValidation' | 'BadSigner';
  }

  /** @name SpRuntimeTransactionValidityUnknownTransaction (418) */
  interface SpRuntimeTransactionValidityUnknownTransaction extends Enum {
    readonly isCannotLookup: boolean;
    readonly isNoUnsignedValidator: boolean;
    readonly isCustom: boolean;
    readonly asCustom: u8;
    readonly type: 'CannotLookup' | 'NoUnsignedValidator' | 'Custom';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletCommonError (428) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
  /** @name UpPovEstimateRpcTrieKeyValue (432) */
=======
  /** @name UpPovEstimateRpcTrieKeyValue (434) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name UpPovEstimateRpcTrieKeyValue (420) */
>>>>>>> chore: regenerate types
  interface UpPovEstimateRpcTrieKeyValue extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletCommonError (434) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletCommonError (436) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletCommonError (422) */
>>>>>>> chore: regenerate types
  interface PalletCommonError extends Enum {
    readonly isCollectionNotFound: boolean;
    readonly isMustBeTokenOwner: boolean;
    readonly isNoPermission: boolean;
    readonly isCantDestroyNotEmptyCollection: boolean;
    readonly isPublicMintingNotAllowed: boolean;
    readonly isAddressNotInAllowlist: boolean;
    readonly isCollectionNameLimitExceeded: boolean;
    readonly isCollectionDescriptionLimitExceeded: boolean;
    readonly isCollectionTokenPrefixLimitExceeded: boolean;
    readonly isTotalCollectionsLimitExceeded: boolean;
    readonly isCollectionAdminCountExceeded: boolean;
    readonly isCollectionLimitBoundsExceeded: boolean;
    readonly isOwnerPermissionsCantBeReverted: boolean;
    readonly isTransferNotAllowed: boolean;
    readonly isAccountTokenLimitExceeded: boolean;
    readonly isCollectionTokenLimitExceeded: boolean;
    readonly isMetadataFlagFrozen: boolean;
    readonly isTokenNotFound: boolean;
    readonly isTokenValueTooLow: boolean;
    readonly isApprovedValueTooLow: boolean;
    readonly isCantApproveMoreThanOwned: boolean;
    readonly isAddressIsZero: boolean;
    readonly isUnsupportedOperation: boolean;
    readonly isNotSufficientFounds: boolean;
    readonly isUserIsNotAllowedToNest: boolean;
    readonly isSourceCollectionIsNotAllowedToNest: boolean;
    readonly isCollectionFieldSizeExceeded: boolean;
    readonly isNoSpaceForProperty: boolean;
    readonly isPropertyLimitReached: boolean;
    readonly isPropertyKeyIsTooLong: boolean;
    readonly isInvalidCharacterInPropertyKey: boolean;
    readonly isEmptyPropertyKey: boolean;
    readonly isCollectionIsExternal: boolean;
    readonly isCollectionIsInternal: boolean;
    readonly isConfirmSponsorshipFail: boolean;
    readonly isUserIsNotCollectionAdmin: boolean;
    readonly type: 'CollectionNotFound' | 'MustBeTokenOwner' | 'NoPermission' | 'CantDestroyNotEmptyCollection' | 'PublicMintingNotAllowed' | 'AddressNotInAllowlist' | 'CollectionNameLimitExceeded' | 'CollectionDescriptionLimitExceeded' | 'CollectionTokenPrefixLimitExceeded' | 'TotalCollectionsLimitExceeded' | 'CollectionAdminCountExceeded' | 'CollectionLimitBoundsExceeded' | 'OwnerPermissionsCantBeReverted' | 'TransferNotAllowed' | 'AccountTokenLimitExceeded' | 'CollectionTokenLimitExceeded' | 'MetadataFlagFrozen' | 'TokenNotFound' | 'TokenValueTooLow' | 'ApprovedValueTooLow' | 'CantApproveMoreThanOwned' | 'AddressIsZero' | 'UnsupportedOperation' | 'NotSufficientFounds' | 'UserIsNotAllowedToNest' | 'SourceCollectionIsNotAllowedToNest' | 'CollectionFieldSizeExceeded' | 'NoSpaceForProperty' | 'PropertyLimitReached' | 'PropertyKeyIsTooLong' | 'InvalidCharacterInPropertyKey' | 'EmptyPropertyKey' | 'CollectionIsExternal' | 'CollectionIsInternal' | 'ConfirmSponsorshipFail' | 'UserIsNotCollectionAdmin';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletFungibleError (416) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletFungibleError (417) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletFungibleError (430) */
=======
  /** @name PalletFungibleError (426) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
  /** @name PalletFungibleError (430) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
  /** @name PalletFungibleError (436) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletFungibleError (438) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletFungibleError (424) */
>>>>>>> chore: regenerate types
  interface PalletFungibleError extends Enum {
    readonly isNotFungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isFungibleItemsHaveNoId: boolean;
    readonly isFungibleItemsDontHaveData: boolean;
    readonly isFungibleDisallowsNesting: boolean;
    readonly isSettingPropertiesNotAllowed: boolean;
    readonly isSettingAllowanceForAllNotAllowed: boolean;
    readonly isFungibleTokensAreAlwaysValid: boolean;
    readonly type: 'NotFungibleDataUsedToMintFungibleCollectionToken' | 'FungibleItemsHaveNoId' | 'FungibleItemsDontHaveData' | 'FungibleDisallowsNesting' | 'SettingPropertiesNotAllowed' | 'SettingAllowanceForAllNotAllowed' | 'FungibleTokensAreAlwaysValid';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletRefungibleError (420) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletRefungibleItemData (417) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletRefungibleItemData (418) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletRefungibleItemData (431) */
=======
  /** @name PalletRefungibleItemData (427) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
  /** @name PalletRefungibleItemData (431) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
  /** @name PalletRefungibleItemData (437) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
  /** @name PalletRefungibleItemData (439) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
=======
  /** @name PalletRefungibleItemData (425) */
>>>>>>> chore: regenerate types
  interface PalletRefungibleItemData extends Struct {
    readonly constData: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletRefungibleError (422) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletRefungibleError (423) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletRefungibleError (436) */
=======
  /** @name PalletRefungibleError (432) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletRefungibleError (436) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletRefungibleError (442) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletRefungibleError (444) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletRefungibleError (430) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletRefungibleError extends Enum {
    readonly isNotRefungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isWrongRefungiblePieces: boolean;
    readonly isRepartitionWhileNotOwningAllPieces: boolean;
    readonly isRefungibleDisallowsNesting: boolean;
    readonly isSettingPropertiesNotAllowed: boolean;
    readonly type: 'NotRefungibleDataUsedToMintFungibleCollectionToken' | 'WrongRefungiblePieces' | 'RepartitionWhileNotOwningAllPieces' | 'RefungibleDisallowsNesting' | 'SettingPropertiesNotAllowed';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletNonfungibleItemData (421) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletNonfungibleItemData (423) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletNonfungibleItemData (424) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletNonfungibleItemData (437) */
=======
  /** @name PalletNonfungibleItemData (433) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletNonfungibleItemData (437) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletNonfungibleItemData (443) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletNonfungibleItemData (445) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletNonfungibleItemData (431) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletNonfungibleItemData extends Struct {
    readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsPropertyScope (423) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name UpDataStructsPropertyScope (425) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsPropertyScope (426) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name UpDataStructsPropertyScope (439) */
=======
  /** @name UpDataStructsPropertyScope (435) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name UpDataStructsPropertyScope (439) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name UpDataStructsPropertyScope (445) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name UpDataStructsPropertyScope (447) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name UpDataStructsPropertyScope (433) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface UpDataStructsPropertyScope extends Enum {
    readonly isNone: boolean;
    readonly isRmrk: boolean;
    readonly type: 'None' | 'Rmrk';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletNonfungibleError (426) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletNonfungibleError (427) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletNonfungibleError (428) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletNonfungibleError (441) */
=======
  /** @name PalletNonfungibleError (437) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletNonfungibleError (441) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletNonfungibleError (447) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletNonfungibleError (449) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletNonfungibleError (435) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletNonfungibleError extends Enum {
    readonly isNotNonfungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isNonfungibleItemsHaveNoAmount: boolean;
    readonly isCantBurnNftWithChildren: boolean;
    readonly type: 'NotNonfungibleDataUsedToMintFungibleCollectionToken' | 'NonfungibleItemsHaveNoAmount' | 'CantBurnNftWithChildren';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletStructureError (427) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletStructureError (428) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletStructureError (429) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletStructureError (442) */
=======
  /** @name PalletStructureError (438) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletStructureError (442) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletStructureError (448) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletStructureError (450) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletStructureError (436) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletStructureError extends Enum {
    readonly isOuroborosDetected: boolean;
    readonly isDepthLimit: boolean;
    readonly isBreadthLimit: boolean;
    readonly isTokenNotFound: boolean;
    readonly type: 'OuroborosDetected' | 'DepthLimit' | 'BreadthLimit' | 'TokenNotFound';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletRmrkCoreError (428) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletRmrkCoreError (429) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletRmrkCoreError (430) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletRmrkCoreError (443) */
=======
  /** @name PalletRmrkCoreError (439) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletRmrkCoreError (443) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletRmrkCoreError (449) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletRmrkCoreError (451) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletRmrkCoreError (437) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletRmrkCoreError extends Enum {
    readonly isCorruptedCollectionType: boolean;
    readonly isRmrkPropertyKeyIsTooLong: boolean;
    readonly isRmrkPropertyValueIsTooLong: boolean;
    readonly isRmrkPropertyIsNotFound: boolean;
    readonly isUnableToDecodeRmrkData: boolean;
    readonly isCollectionNotEmpty: boolean;
    readonly isNoAvailableCollectionId: boolean;
    readonly isNoAvailableNftId: boolean;
    readonly isCollectionUnknown: boolean;
    readonly isNoPermission: boolean;
    readonly isNonTransferable: boolean;
    readonly isCollectionFullOrLocked: boolean;
    readonly isResourceDoesntExist: boolean;
    readonly isCannotSendToDescendentOrSelf: boolean;
    readonly isCannotAcceptNonOwnedNft: boolean;
    readonly isCannotRejectNonOwnedNft: boolean;
    readonly isCannotRejectNonPendingNft: boolean;
    readonly isResourceNotPending: boolean;
    readonly isNoAvailableResourceId: boolean;
    readonly type: 'CorruptedCollectionType' | 'RmrkPropertyKeyIsTooLong' | 'RmrkPropertyValueIsTooLong' | 'RmrkPropertyIsNotFound' | 'UnableToDecodeRmrkData' | 'CollectionNotEmpty' | 'NoAvailableCollectionId' | 'NoAvailableNftId' | 'CollectionUnknown' | 'NoPermission' | 'NonTransferable' | 'CollectionFullOrLocked' | 'ResourceDoesntExist' | 'CannotSendToDescendentOrSelf' | 'CannotAcceptNonOwnedNft' | 'CannotRejectNonOwnedNft' | 'CannotRejectNonPendingNft' | 'ResourceNotPending' | 'NoAvailableResourceId';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletRmrkEquipError (430) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletRmrkEquipError (431) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletRmrkEquipError (432) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletRmrkEquipError (445) */
=======
  /** @name PalletRmrkEquipError (441) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletRmrkEquipError (445) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletRmrkEquipError (451) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletRmrkEquipError (453) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletRmrkEquipError (439) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletRmrkEquipError extends Enum {
    readonly isPermissionError: boolean;
    readonly isNoAvailableBaseId: boolean;
    readonly isNoAvailablePartId: boolean;
    readonly isBaseDoesntExist: boolean;
    readonly isNeedsDefaultThemeFirst: boolean;
    readonly isPartDoesntExist: boolean;
    readonly isNoEquippableOnFixedPart: boolean;
    readonly type: 'PermissionError' | 'NoAvailableBaseId' | 'NoAvailablePartId' | 'BaseDoesntExist' | 'NeedsDefaultThemeFirst' | 'PartDoesntExist' | 'NoEquippableOnFixedPart';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletAppPromotionError (436) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletAppPromotionError (437) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletAppPromotionError (438) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletAppPromotionError (451) */
=======
  /** @name PalletAppPromotionError (447) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletAppPromotionError (451) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletAppPromotionError (457) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletAppPromotionError (459) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletAppPromotionError (445) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletAppPromotionError extends Enum {
    readonly isAdminNotSet: boolean;
    readonly isNoPermission: boolean;
    readonly isNotSufficientFunds: boolean;
    readonly isPendingForBlockOverflow: boolean;
    readonly isSponsorNotSet: boolean;
    readonly isIncorrectLockedBalanceOperation: boolean;
    readonly type: 'AdminNotSet' | 'NoPermission' | 'NotSufficientFunds' | 'PendingForBlockOverflow' | 'SponsorNotSet' | 'IncorrectLockedBalanceOperation';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletForeignAssetsModuleError (437) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletForeignAssetsModuleError (438) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletForeignAssetsModuleError (439) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletForeignAssetsModuleError (452) */
=======
  /** @name PalletForeignAssetsModuleError (448) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletForeignAssetsModuleError (452) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletForeignAssetsModuleError (458) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletForeignAssetsModuleError (460) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletForeignAssetsModuleError (446) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletForeignAssetsModuleError extends Enum {
    readonly isBadLocation: boolean;
    readonly isMultiLocationExisted: boolean;
    readonly isAssetIdNotExists: boolean;
    readonly isAssetIdExisted: boolean;
    readonly type: 'BadLocation' | 'MultiLocationExisted' | 'AssetIdNotExists' | 'AssetIdExisted';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmError (439) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletEvmError (440) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletEvmError (441) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletEvmError (454) */
=======
  /** @name PalletEvmError (451) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletEvmError (455) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletEvmError (461) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletEvmError (462) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletEvmError (448) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletEvmError extends Enum {
    readonly isBalanceLow: boolean;
    readonly isFeeOverflow: boolean;
    readonly isPaymentOverflow: boolean;
    readonly isWithdrawFailed: boolean;
    readonly isGasPriceTooLow: boolean;
    readonly isInvalidNonce: boolean;
    readonly isGasLimitTooLow: boolean;
    readonly isGasLimitTooHigh: boolean;
    readonly isUndefined: boolean;
    readonly isReentrancy: boolean;
    readonly isTransactionMustComeFromEOA: boolean;
    readonly type: 'BalanceLow' | 'FeeOverflow' | 'PaymentOverflow' | 'WithdrawFailed' | 'GasPriceTooLow' | 'InvalidNonce' | 'GasLimitTooLow' | 'GasLimitTooHigh' | 'Undefined' | 'Reentrancy' | 'TransactionMustComeFromEOA';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FpRpcTransactionStatus (442) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name FpRpcTransactionStatus (443) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name FpRpcTransactionStatus (444) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name FpRpcTransactionStatus (457) */
=======
  /** @name FpRpcTransactionStatus (454) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name FpRpcTransactionStatus (458) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name FpRpcTransactionStatus (464) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name FpRpcTransactionStatus (465) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name FpRpcTransactionStatus (451) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface FpRpcTransactionStatus extends Struct {
    readonly transactionHash: H256;
    readonly transactionIndex: u32;
    readonly from: H160;
    readonly to: Option<H160>;
    readonly contractAddress: Option<H160>;
    readonly logs: Vec<EthereumLog>;
    readonly logsBloom: EthbloomBloom;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthbloomBloom (444) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (446) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name EthbloomBloom (445) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (447) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name EthbloomBloom (446) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (448) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name EthbloomBloom (459) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (461) */
=======
  /** @name EthbloomBloom (456) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (458) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name EthbloomBloom (460) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (462) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name EthbloomBloom (466) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (468) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name EthbloomBloom (467) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (469) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name EthbloomBloom (453) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (455) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface EthereumReceiptReceiptV3 extends Enum {
    readonly isLegacy: boolean;
    readonly asLegacy: EthereumReceiptEip658ReceiptData;
    readonly isEip2930: boolean;
    readonly asEip2930: EthereumReceiptEip658ReceiptData;
    readonly isEip1559: boolean;
    readonly asEip1559: EthereumReceiptEip658ReceiptData;
    readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumReceiptEip658ReceiptData (447) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name EthereumReceiptEip658ReceiptData (448) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name EthereumReceiptEip658ReceiptData (449) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name EthereumReceiptEip658ReceiptData (462) */
=======
  /** @name EthereumReceiptEip658ReceiptData (459) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name EthereumReceiptEip658ReceiptData (463) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name EthereumReceiptEip658ReceiptData (469) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name EthereumReceiptEip658ReceiptData (470) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name EthereumReceiptEip658ReceiptData (456) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface EthereumReceiptEip658ReceiptData extends Struct {
    readonly statusCode: u8;
    readonly usedGas: U256;
    readonly logsBloom: EthbloomBloom;
    readonly logs: Vec<EthereumLog>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumBlock (448) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name EthereumBlock (449) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name EthereumBlock (450) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name EthereumBlock (463) */
=======
  /** @name EthereumBlock (460) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name EthereumBlock (464) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name EthereumBlock (470) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name EthereumBlock (471) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name EthereumBlock (457) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface EthereumBlock extends Struct {
    readonly header: EthereumHeader;
    readonly transactions: Vec<EthereumTransactionTransactionV2>;
    readonly ommers: Vec<EthereumHeader>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumHeader (449) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name EthereumHeader (450) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name EthereumHeader (451) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name EthereumHeader (464) */
=======
  /** @name EthereumHeader (461) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name EthereumHeader (465) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name EthereumHeader (471) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name EthereumHeader (472) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name EthereumHeader (458) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface EthereumHeader extends Struct {
    readonly parentHash: H256;
    readonly ommersHash: H256;
    readonly beneficiary: H160;
    readonly stateRoot: H256;
    readonly transactionsRoot: H256;
    readonly receiptsRoot: H256;
    readonly logsBloom: EthbloomBloom;
    readonly difficulty: U256;
    readonly number: U256;
    readonly gasLimit: U256;
    readonly gasUsed: U256;
    readonly timestamp: u64;
    readonly extraData: Bytes;
    readonly mixHash: H256;
    readonly nonce: EthereumTypesHashH64;
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EthereumTypesHashH64 (450) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (455) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name EthereumTypesHashH64 (451) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (456) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name EthereumTypesHashH64 (452) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (457) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name EthereumTypesHashH64 (465) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (470) */
=======
  /** @name EthereumTypesHashH64 (462) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (467) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name EthereumTypesHashH64 (466) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (471) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name EthereumTypesHashH64 (472) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (477) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name EthereumTypesHashH64 (473) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (478) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name EthereumTypesHashH64 (459) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (464) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletEthereumError extends Enum {
    readonly isInvalidSignature: boolean;
    readonly isPreLogExists: boolean;
    readonly type: 'InvalidSignature' | 'PreLogExists';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmCoderSubstrateError (456) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletEvmCoderSubstrateError (457) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletEvmCoderSubstrateError (458) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletEvmCoderSubstrateError (471) */
=======
  /** @name PalletEvmCoderSubstrateError (468) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletEvmCoderSubstrateError (472) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletEvmCoderSubstrateError (478) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletEvmCoderSubstrateError (479) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletEvmCoderSubstrateError (465) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletEvmCoderSubstrateError extends Enum {
    readonly isOutOfGas: boolean;
    readonly isOutOfFund: boolean;
    readonly type: 'OutOfGas' | 'OutOfFund';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (457) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (458) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (459) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (472) */
=======
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (469) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (473) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (479) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (480) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (466) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface UpDataStructsSponsorshipStateBasicCrossAccountIdRepr extends Enum {
    readonly isDisabled: boolean;
    readonly isUnconfirmed: boolean;
    readonly asUnconfirmed: PalletEvmAccountBasicCrossAccountIdRepr;
    readonly isConfirmed: boolean;
    readonly asConfirmed: PalletEvmAccountBasicCrossAccountIdRepr;
    readonly type: 'Disabled' | 'Unconfirmed' | 'Confirmed';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersSponsoringModeT (458) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersSponsoringModeT (459) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersSponsoringModeT (460) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersSponsoringModeT (473) */
=======
  /** @name PalletEvmContractHelpersSponsoringModeT (470) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletEvmContractHelpersSponsoringModeT (474) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletEvmContractHelpersSponsoringModeT (480) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletEvmContractHelpersSponsoringModeT (481) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletEvmContractHelpersSponsoringModeT (467) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletEvmContractHelpersSponsoringModeT extends Enum {
    readonly isDisabled: boolean;
    readonly isAllowlisted: boolean;
    readonly isGenerous: boolean;
    readonly type: 'Disabled' | 'Allowlisted' | 'Generous';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersError (464) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersError (465) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersError (466) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersError (479) */
=======
  /** @name PalletEvmContractHelpersError (476) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletEvmContractHelpersError (480) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletEvmContractHelpersError (486) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletEvmContractHelpersError (487) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletEvmContractHelpersError (473) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletEvmContractHelpersError extends Enum {
    readonly isNoPermission: boolean;
    readonly isNoPendingSponsor: boolean;
    readonly isTooManyMethodsHaveSponsoredLimit: boolean;
    readonly type: 'NoPermission' | 'NoPendingSponsor' | 'TooManyMethodsHaveSponsoredLimit';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmMigrationError (465) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletEvmMigrationError (466) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletEvmMigrationError (467) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletEvmMigrationError (480) */
=======
  /** @name PalletEvmMigrationError (477) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletEvmMigrationError (481) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletEvmMigrationError (487) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletEvmMigrationError (488) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletEvmMigrationError (474) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletEvmMigrationError extends Enum {
    readonly isAccountNotEmpty: boolean;
    readonly isAccountIsNotMigrating: boolean;
    readonly isBadEvent: boolean;
    readonly type: 'AccountNotEmpty' | 'AccountIsNotMigrating' | 'BadEvent';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletMaintenanceError (466) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (467) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name PalletMaintenanceError (467) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (468) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name PalletMaintenanceError (468) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (469) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name PalletMaintenanceError (481) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (482) */
=======
  /** @name PalletMaintenanceError (478) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (479) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletMaintenanceError (482) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (483) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletMaintenanceError (488) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (489) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletMaintenanceError (489) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (490) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletMaintenanceError (475) */
  type PalletMaintenanceError = Null;

  /** @name PalletTestUtilsError (476) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface PalletTestUtilsError extends Enum {
    readonly isTestPalletDisabled: boolean;
    readonly isTriggerRollback: boolean;
    readonly type: 'TestPalletDisabled' | 'TriggerRollback';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpRuntimeMultiSignature (469) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name SpRuntimeMultiSignature (470) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name SpRuntimeMultiSignature (471) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name SpRuntimeMultiSignature (484) */
=======
  /** @name SpRuntimeMultiSignature (481) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name SpRuntimeMultiSignature (485) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name SpRuntimeMultiSignature (491) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name SpRuntimeMultiSignature (492) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name SpRuntimeMultiSignature (478) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  interface SpRuntimeMultiSignature extends Enum {
    readonly isEd25519: boolean;
    readonly asEd25519: SpCoreEd25519Signature;
    readonly isSr25519: boolean;
    readonly asSr25519: SpCoreSr25519Signature;
    readonly isEcdsa: boolean;
    readonly asEcdsa: SpCoreEcdsaSignature;
    readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpCoreEd25519Signature (470) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
=======
>>>>>>> chore: regenerate types
<<<<<<< HEAD
  /** @name SpCoreEd25519Signature (471) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
=======
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
  /** @name SpCoreEd25519Signature (472) */
=======
=======
>>>>>>> chore: regenerate types
=======
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
  /** @name SpCoreEd25519Signature (485) */
>>>>>>> fix: update polkadot types and definitions
>>>>>>> fix: update polkadot types and definitions
>>>>>>> fix: update polkadot types and definitions
  interface SpCoreEd25519Signature extends U8aFixed {}

  /** @name SpCoreSr25519Signature (472) */
  interface SpCoreSr25519Signature extends U8aFixed {}

  /** @name SpCoreEcdsaSignature (473) */
  interface SpCoreEcdsaSignature extends U8aFixed {}

  /** @name FrameSystemExtensionsCheckSpecVersion (476) */
  type FrameSystemExtensionsCheckSpecVersion = Null;

  /** @name FrameSystemExtensionsCheckTxVersion (477) */
  type FrameSystemExtensionsCheckTxVersion = Null;

  /** @name FrameSystemExtensionsCheckGenesis (478) */
  type FrameSystemExtensionsCheckGenesis = Null;

  /** @name FrameSystemExtensionsCheckNonce (481) */
  interface FrameSystemExtensionsCheckNonce extends Compact<u32> {}

  /** @name FrameSystemExtensionsCheckWeight (482) */
  type FrameSystemExtensionsCheckWeight = Null;

  /** @name OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance (483) */
  type OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance = Null;

  /** @name PalletTemplateTransactionPaymentChargeTransactionPayment (484) */
  interface PalletTemplateTransactionPaymentChargeTransactionPayment extends Compact<u128> {}

  /** @name OpalRuntimeRuntime (485) */
  type OpalRuntimeRuntime = Null;

<<<<<<< HEAD
  /** @name PalletEthereumFakeTransactionFinalizer (486) */
=======
<<<<<<< HEAD
  /** @name PalletEthereumFakeTransactionFinalizer (487) */
=======
<<<<<<< HEAD
  /** @name PalletEthereumFakeTransactionFinalizer (488) */
=======
  /** @name PalletEthereumFakeTransactionFinalizer (501) */
=======
  /** @name SpCoreEd25519Signature (482) */
=======
  /** @name SpCoreEd25519Signature (486) */
>>>>>>> chore: regenerate types
=======
  /** @name SpCoreEd25519Signature (492) */
>>>>>>> chore:  regenerate types
=======
  /** @name SpCoreEd25519Signature (493) */
>>>>>>> fix: regenerate types after rebase
=======
  /** @name SpCoreEd25519Signature (479) */
>>>>>>> chore: regenerate types
  interface SpCoreEd25519Signature extends U8aFixed {}

  /** @name SpCoreSr25519Signature (481) */
  interface SpCoreSr25519Signature extends U8aFixed {}

  /** @name SpCoreEcdsaSignature (482) */
  interface SpCoreEcdsaSignature extends U8aFixed {}

  /** @name FrameSystemExtensionsCheckSpecVersion (485) */
  type FrameSystemExtensionsCheckSpecVersion = Null;

  /** @name FrameSystemExtensionsCheckTxVersion (486) */
  type FrameSystemExtensionsCheckTxVersion = Null;

  /** @name FrameSystemExtensionsCheckGenesis (487) */
  type FrameSystemExtensionsCheckGenesis = Null;

  /** @name FrameSystemExtensionsCheckNonce (490) */
  interface FrameSystemExtensionsCheckNonce extends Compact<u32> {}

  /** @name FrameSystemExtensionsCheckWeight (491) */
  type FrameSystemExtensionsCheckWeight = Null;

  /** @name OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance (492) */
  type OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance = Null;

  /** @name PalletTemplateTransactionPaymentChargeTransactionPayment (493) */
  interface PalletTemplateTransactionPaymentChargeTransactionPayment extends Compact<u128> {}

  /** @name OpalRuntimeRuntime (494) */
  type OpalRuntimeRuntime = Null;

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEthereumFakeTransactionFinalizer (498) */
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
<<<<<<< HEAD
>>>>>>> fix: update polkadot types and definitions
=======
=======
=======
=======
  /** @name PalletEthereumFakeTransactionFinalizer (502) */
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
<<<<<<< HEAD
>>>>>>> chore: regenerate types
=======
=======
=======
=======
  /** @name PalletEthereumFakeTransactionFinalizer (508) */
>>>>>>> chore:  regenerate types
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
<<<<<<< HEAD
>>>>>>> chore:  regenerate types
=======
=======
=======
  /** @name PalletEthereumFakeTransactionFinalizer (509) */
>>>>>>> fix: regenerate types after rebase
>>>>>>> fix: regenerate types after rebase
<<<<<<< HEAD
>>>>>>> fix: regenerate types after rebase
=======
=======
  /** @name PalletEthereumFakeTransactionFinalizer (495) */
>>>>>>> chore: regenerate types
>>>>>>> chore: regenerate types
  type PalletEthereumFakeTransactionFinalizer = Null;

} // declare module
