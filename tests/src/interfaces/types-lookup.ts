// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/types/lookup';

import type { BTreeMap, BTreeSet, Bytes, Compact, Enum, Null, Option, Result, Struct, Text, U256, U8aFixed, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H160, H256, MultiAddress, Perbill, Permill, Weight } from '@polkadot/types/interfaces/runtime';
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
    readonly normal: Weight;
    readonly operational: Weight;
    readonly mandatory: Weight;
  }

  /** @name SpRuntimeDigest (12) */
  interface SpRuntimeDigest extends Struct {
    readonly logs: Vec<SpRuntimeDigestDigestItem>;
  }

  /** @name SpRuntimeDigestDigestItem (14) */
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

  /** @name FrameSystemEventRecord (17) */
  interface FrameSystemEventRecord extends Struct {
    readonly phase: FrameSystemPhase;
    readonly event: Event;
    readonly topics: Vec<H256>;
  }

  /** @name FrameSystemEvent (19) */
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

  /** @name FrameSupportDispatchDispatchInfo (20) */
  interface FrameSupportDispatchDispatchInfo extends Struct {
    readonly weight: Weight;
    readonly class: FrameSupportDispatchDispatchClass;
    readonly paysFee: FrameSupportDispatchPays;
  }

  /** @name FrameSupportDispatchDispatchClass (21) */
  interface FrameSupportDispatchDispatchClass extends Enum {
    readonly isNormal: boolean;
    readonly isOperational: boolean;
    readonly isMandatory: boolean;
    readonly type: 'Normal' | 'Operational' | 'Mandatory';
  }

  /** @name FrameSupportDispatchPays (22) */
  interface FrameSupportDispatchPays extends Enum {
    readonly isYes: boolean;
    readonly isNo: boolean;
    readonly type: 'Yes' | 'No';
  }

  /** @name SpRuntimeDispatchError (23) */
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
    readonly type: 'Other' | 'CannotLookup' | 'BadOrigin' | 'Module' | 'ConsumerRemaining' | 'NoProviders' | 'TooManyConsumers' | 'Token' | 'Arithmetic' | 'Transactional';
  }

  /** @name SpRuntimeModuleError (24) */
  interface SpRuntimeModuleError extends Struct {
    readonly index: u8;
    readonly error: U8aFixed;
  }

  /** @name SpRuntimeTokenError (25) */
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

  /** @name SpRuntimeArithmeticError (26) */
  interface SpRuntimeArithmeticError extends Enum {
    readonly isUnderflow: boolean;
    readonly isOverflow: boolean;
    readonly isDivisionByZero: boolean;
    readonly type: 'Underflow' | 'Overflow' | 'DivisionByZero';
  }

  /** @name SpRuntimeTransactionalError (27) */
  interface SpRuntimeTransactionalError extends Enum {
    readonly isLimitReached: boolean;
    readonly isNoLayer: boolean;
    readonly type: 'LimitReached' | 'NoLayer';
  }

  /** @name CumulusPalletParachainSystemEvent (28) */
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
      readonly weightUsed: Weight;
      readonly dmqHead: H256;
    } & Struct;
    readonly type: 'ValidationFunctionStored' | 'ValidationFunctionApplied' | 'ValidationFunctionDiscarded' | 'UpgradeAuthorized' | 'DownwardMessagesReceived' | 'DownwardMessagesProcessed';
  }

  /** @name PalletBalancesEvent (29) */
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

  /** @name FrameSupportTokensMiscBalanceStatus (30) */
  interface FrameSupportTokensMiscBalanceStatus extends Enum {
    readonly isFree: boolean;
    readonly isReserved: boolean;
    readonly type: 'Free' | 'Reserved';
  }

  /** @name PalletTransactionPaymentEvent (31) */
  interface PalletTransactionPaymentEvent extends Enum {
    readonly isTransactionFeePaid: boolean;
    readonly asTransactionFeePaid: {
      readonly who: AccountId32;
      readonly actualFee: u128;
      readonly tip: u128;
    } & Struct;
    readonly type: 'TransactionFeePaid';
  }

  /** @name PalletTreasuryEvent (32) */
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

  /** @name PalletSudoEvent (33) */
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

  /** @name OrmlVestingModuleEvent (37) */
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

  /** @name OrmlVestingVestingSchedule (38) */
  interface OrmlVestingVestingSchedule extends Struct {
    readonly start: u32;
    readonly period: u32;
    readonly periodCount: u32;
    readonly perPeriod: Compact<u128>;
  }

  /** @name OrmlXtokensModuleEvent (40) */
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

  /** @name XcmV1MultiassetMultiAssets (41) */
  interface XcmV1MultiassetMultiAssets extends Vec<XcmV1MultiAsset> {}

  /** @name XcmV1MultiAsset (43) */
  interface XcmV1MultiAsset extends Struct {
    readonly id: XcmV1MultiassetAssetId;
    readonly fun: XcmV1MultiassetFungibility;
  }

  /** @name XcmV1MultiassetAssetId (44) */
  interface XcmV1MultiassetAssetId extends Enum {
    readonly isConcrete: boolean;
    readonly asConcrete: XcmV1MultiLocation;
    readonly isAbstract: boolean;
    readonly asAbstract: Bytes;
    readonly type: 'Concrete' | 'Abstract';
  }

  /** @name XcmV1MultiLocation (45) */
  interface XcmV1MultiLocation extends Struct {
    readonly parents: u8;
    readonly interior: XcmV1MultilocationJunctions;
  }

  /** @name XcmV1MultilocationJunctions (46) */
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

  /** @name XcmV1Junction (47) */
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

  /** @name XcmV0JunctionNetworkId (49) */
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
      readonly weight: Weight;
    } & Struct;
    readonly isFail: boolean;
    readonly asFail: {
      readonly messageHash: Option<H256>;
      readonly error: XcmV2TraitsError;
      readonly weight: Weight;
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
      readonly required: Weight;
    } & Struct;
    readonly isOverweightServiced: boolean;
    readonly asOverweightServiced: {
      readonly index: u64;
      readonly used: Weight;
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
    readonly asNotifyOverweight: ITuple<[u64, u8, u8, Weight, Weight]>;
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
    readonly type: 'Attempted' | 'Sent' | 'UnexpectedResponse' | 'ResponseReady' | 'Notified' | 'NotifyOverweight' | 'NotifyDispatchError' | 'NotifyDecodeFailed' | 'InvalidResponder' | 'InvalidResponderVersion' | 'ResponseTaken' | 'AssetsTrapped' | 'VersionChangeNotified' | 'SupportedVersionChanged' | 'NotifyTargetSendFail' | 'NotifyTargetMigrationFail';
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
      readonly remainingWeight: Weight;
      readonly requiredWeight: Weight;
    } & Struct;
    readonly isOverweightEnqueued: boolean;
    readonly asOverweightEnqueued: {
      readonly messageId: U8aFixed;
      readonly overweightIndex: u64;
      readonly requiredWeight: Weight;
    } & Struct;
    readonly isOverweightServiced: boolean;
    readonly asOverweightServiced: {
      readonly overweightIndex: u64;
      readonly weightUsed: Weight;
    } & Struct;
    readonly type: 'InvalidFormat' | 'UnsupportedVersion' | 'ExecutedDownward' | 'WeightExhausted' | 'OverweightEnqueued' | 'OverweightServiced';
  }

  /** @name PalletUniqueRawEvent (89) */
  interface PalletUniqueRawEvent extends Enum {
    readonly isCollectionSponsorRemoved: boolean;
    readonly asCollectionSponsorRemoved: u32;
    readonly isCollectionAdminAdded: boolean;
    readonly asCollectionAdminAdded: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isCollectionOwnedChanged: boolean;
    readonly asCollectionOwnedChanged: ITuple<[u32, AccountId32]>;
    readonly isCollectionSponsorSet: boolean;
    readonly asCollectionSponsorSet: ITuple<[u32, AccountId32]>;
    readonly isSponsorshipConfirmed: boolean;
    readonly asSponsorshipConfirmed: ITuple<[u32, AccountId32]>;
    readonly isCollectionAdminRemoved: boolean;
    readonly asCollectionAdminRemoved: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isAllowListAddressRemoved: boolean;
    readonly asAllowListAddressRemoved: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isAllowListAddressAdded: boolean;
    readonly asAllowListAddressAdded: ITuple<[u32, PalletEvmAccountBasicCrossAccountIdRepr]>;
    readonly isCollectionLimitSet: boolean;
    readonly asCollectionLimitSet: u32;
    readonly isCollectionPermissionSet: boolean;
    readonly asCollectionPermissionSet: u32;
    readonly type: 'CollectionSponsorRemoved' | 'CollectionAdminAdded' | 'CollectionOwnedChanged' | 'CollectionSponsorSet' | 'SponsorshipConfirmed' | 'CollectionAdminRemoved' | 'AllowListAddressRemoved' | 'AllowListAddressAdded' | 'CollectionLimitSet' | 'CollectionPermissionSet';
  }

  /** @name PalletEvmAccountBasicCrossAccountIdRepr (90) */
  interface PalletEvmAccountBasicCrossAccountIdRepr extends Enum {
    readonly isSubstrate: boolean;
    readonly asSubstrate: AccountId32;
    readonly isEthereum: boolean;
    readonly asEthereum: H160;
    readonly type: 'Substrate' | 'Ethereum';
  }

  /** @name PalletCommonEvent (93) */
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
    readonly type: 'CollectionCreated' | 'CollectionDestroyed' | 'ItemCreated' | 'ItemDestroyed' | 'Transfer' | 'Approved' | 'CollectionPropertySet' | 'CollectionPropertyDeleted' | 'TokenPropertySet' | 'TokenPropertyDeleted' | 'PropertyPermissionSet';
  }

  /** @name PalletStructureEvent (96) */
  interface PalletStructureEvent extends Enum {
    readonly isExecuted: boolean;
    readonly asExecuted: Result<Null, SpRuntimeDispatchError>;
    readonly type: 'Executed';
  }

  /** @name PalletAppPromotionEvent (97) */
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

  /** @name PalletForeignAssetsModuleEvent (98) */
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

  /** @name PalletForeignAssetsModuleAssetMetadata (99) */
  interface PalletForeignAssetsModuleAssetMetadata extends Struct {
    readonly name: Bytes;
    readonly symbol: Bytes;
    readonly decimals: u8;
    readonly minimalBalance: u128;
  }

  /** @name PalletEvmEvent (100) */
  interface PalletEvmEvent extends Enum {
    readonly isLog: boolean;
    readonly asLog: EthereumLog;
    readonly isCreated: boolean;
    readonly asCreated: H160;
    readonly isCreatedFailed: boolean;
    readonly asCreatedFailed: H160;
    readonly isExecuted: boolean;
    readonly asExecuted: H160;
    readonly isExecutedFailed: boolean;
    readonly asExecutedFailed: H160;
    readonly isBalanceDeposit: boolean;
    readonly asBalanceDeposit: ITuple<[AccountId32, H160, U256]>;
    readonly isBalanceWithdraw: boolean;
    readonly asBalanceWithdraw: ITuple<[AccountId32, H160, U256]>;
    readonly type: 'Log' | 'Created' | 'CreatedFailed' | 'Executed' | 'ExecutedFailed' | 'BalanceDeposit' | 'BalanceWithdraw';
  }

  /** @name EthereumLog (101) */
  interface EthereumLog extends Struct {
    readonly address: H160;
    readonly topics: Vec<H256>;
    readonly data: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEthereumEvent (116) */
=======
<<<<<<< HEAD
  /** @name PalletEthereumEvent (114) */
=======
  /** @name PalletEthereumEvent (109) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletEthereumEvent (103) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletEthereumEvent extends Enum {
    readonly isExecuted: boolean;
    readonly asExecuted: ITuple<[H160, H160, H256, EvmCoreErrorExitReason]>;
    readonly type: 'Executed';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EvmCoreErrorExitReason (117) */
=======
<<<<<<< HEAD
  /** @name EvmCoreErrorExitReason (115) */
=======
  /** @name EvmCoreErrorExitReason (110) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name EvmCoreErrorExitReason (104) */
>>>>>>> ec6ecdbe... chore: regenerate types
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

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EvmCoreErrorExitSucceed (118) */
=======
<<<<<<< HEAD
  /** @name EvmCoreErrorExitSucceed (116) */
=======
  /** @name EvmCoreErrorExitSucceed (111) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name EvmCoreErrorExitSucceed (105) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface EvmCoreErrorExitSucceed extends Enum {
    readonly isStopped: boolean;
    readonly isReturned: boolean;
    readonly isSuicided: boolean;
    readonly type: 'Stopped' | 'Returned' | 'Suicided';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EvmCoreErrorExitError (119) */
=======
<<<<<<< HEAD
  /** @name EvmCoreErrorExitError (117) */
=======
  /** @name EvmCoreErrorExitError (112) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name EvmCoreErrorExitError (106) */
>>>>>>> ec6ecdbe... chore: regenerate types
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

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EvmCoreErrorExitRevert (122) */
=======
<<<<<<< HEAD
  /** @name EvmCoreErrorExitRevert (120) */
=======
  /** @name EvmCoreErrorExitRevert (115) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name EvmCoreErrorExitRevert (109) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface EvmCoreErrorExitRevert extends Enum {
    readonly isReverted: boolean;
    readonly type: 'Reverted';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name EvmCoreErrorExitFatal (123) */
=======
<<<<<<< HEAD
  /** @name EvmCoreErrorExitFatal (121) */
=======
  /** @name EvmCoreErrorExitFatal (116) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name EvmCoreErrorExitFatal (110) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface EvmCoreErrorExitFatal extends Enum {
    readonly isNotSupported: boolean;
    readonly isUnhandledInterrupt: boolean;
    readonly isCallErrorAsFatal: boolean;
    readonly asCallErrorAsFatal: EvmCoreErrorExitError;
    readonly isOther: boolean;
    readonly asOther: Text;
    readonly type: 'NotSupported' | 'UnhandledInterrupt' | 'CallErrorAsFatal' | 'Other';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersEvent (124) */
=======
<<<<<<< HEAD
  /** @name PalletEvmContractHelpersEvent (122) */
=======
  /** @name PalletEvmContractHelpersEvent (117) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletEvmContractHelpersEvent (111) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletEvmContractHelpersEvent extends Enum {
    readonly isContractSponsorSet: boolean;
    readonly asContractSponsorSet: ITuple<[H160, AccountId32]>;
    readonly isContractSponsorshipConfirmed: boolean;
    readonly asContractSponsorshipConfirmed: ITuple<[H160, AccountId32]>;
    readonly isContractSponsorRemoved: boolean;
    readonly asContractSponsorRemoved: H160;
    readonly type: 'ContractSponsorSet' | 'ContractSponsorshipConfirmed' | 'ContractSponsorRemoved';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletMaintenanceEvent (125) */
=======
<<<<<<< HEAD
  /** @name PalletMaintenanceEvent (123) */
=======
  /** @name PalletEvmMigrationEvent (118) */
=======
  /** @name PalletEvmMigrationEvent (112) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletEvmMigrationEvent extends Enum {
    readonly isTestEvent: boolean;
    readonly type: 'TestEvent';
  }

<<<<<<< HEAD
  /** @name PalletMaintenanceEvent (119) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletMaintenanceEvent (113) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletMaintenanceEvent extends Enum {
    readonly isMaintenanceEnabled: boolean;
    readonly isMaintenanceDisabled: boolean;
    readonly type: 'MaintenanceEnabled' | 'MaintenanceDisabled';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTestUtilsEvent (126) */
=======
<<<<<<< HEAD
  /** @name PalletTestUtilsEvent (124) */
=======
  /** @name PalletTestUtilsEvent (120) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface PalletTestUtilsEvent extends Enum {
    readonly isValueIsSet: boolean;
    readonly isShouldRollback: boolean;
    readonly type: 'ValueIsSet' | 'ShouldRollback';
  }

<<<<<<< HEAD
  /** @name FrameSystemPhase (127) */
=======
<<<<<<< HEAD
  /** @name FrameSystemPhase (125) */
=======
  /** @name FrameSystemPhase (121) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSystemPhase (114) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSystemPhase extends Enum {
    readonly isApplyExtrinsic: boolean;
    readonly asApplyExtrinsic: u32;
    readonly isFinalization: boolean;
    readonly isInitialization: boolean;
    readonly type: 'ApplyExtrinsic' | 'Finalization' | 'Initialization';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemLastRuntimeUpgradeInfo (129) */
=======
<<<<<<< HEAD
  /** @name FrameSystemLastRuntimeUpgradeInfo (127) */
=======
  /** @name FrameSystemLastRuntimeUpgradeInfo (124) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSystemLastRuntimeUpgradeInfo (117) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSystemLastRuntimeUpgradeInfo extends Struct {
    readonly specVersion: Compact<u32>;
    readonly specName: Text;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemCall (130) */
=======
<<<<<<< HEAD
  /** @name FrameSystemCall (128) */
=======
  /** @name FrameSystemCall (125) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSystemCall (119) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSystemCall extends Enum {
    readonly isFillBlock: boolean;
    readonly asFillBlock: {
      readonly ratio: Perbill;
    } & Struct;
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
    readonly type: 'FillBlock' | 'Remark' | 'SetHeapPages' | 'SetCode' | 'SetCodeWithoutChecks' | 'SetStorage' | 'KillStorage' | 'KillPrefix' | 'RemarkWithEvent';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockWeights (135) */
=======
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockWeights (133) */
=======
  /** @name FrameSystemLimitsBlockWeights (130) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSystemLimitsBlockWeights (124) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSystemLimitsBlockWeights extends Struct {
    readonly baseBlock: Weight;
    readonly maxBlock: Weight;
    readonly perClass: FrameSupportDispatchPerDispatchClassWeightsPerClass;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (136) */
=======
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (134) */
=======
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (131) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (125) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSupportDispatchPerDispatchClassWeightsPerClass extends Struct {
    readonly normal: FrameSystemLimitsWeightsPerClass;
    readonly operational: FrameSystemLimitsWeightsPerClass;
    readonly mandatory: FrameSystemLimitsWeightsPerClass;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemLimitsWeightsPerClass (137) */
=======
<<<<<<< HEAD
  /** @name FrameSystemLimitsWeightsPerClass (135) */
=======
  /** @name FrameSystemLimitsWeightsPerClass (132) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSystemLimitsWeightsPerClass (126) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSystemLimitsWeightsPerClass extends Struct {
    readonly baseExtrinsic: Weight;
    readonly maxExtrinsic: Option<Weight>;
    readonly maxTotal: Option<Weight>;
    readonly reserved: Option<Weight>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockLength (139) */
=======
<<<<<<< HEAD
  /** @name FrameSystemLimitsBlockLength (137) */
=======
  /** @name FrameSystemLimitsBlockLength (134) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSystemLimitsBlockLength (128) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSystemLimitsBlockLength extends Struct {
    readonly max: FrameSupportDispatchPerDispatchClassU32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassU32 (140) */
=======
<<<<<<< HEAD
  /** @name FrameSupportDispatchPerDispatchClassU32 (138) */
=======
  /** @name FrameSupportDispatchPerDispatchClassU32 (135) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSupportDispatchPerDispatchClassU32 (129) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface FrameSupportDispatchPerDispatchClassU32 extends Struct {
    readonly normal: u32;
    readonly operational: u32;
    readonly mandatory: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpWeightsRuntimeDbWeight (141) */
=======
<<<<<<< HEAD
  /** @name SpWeightsRuntimeDbWeight (139) */
=======
  /** @name SpWeightsRuntimeDbWeight (136) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name SpWeightsRuntimeDbWeight (130) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface SpWeightsRuntimeDbWeight extends Struct {
    readonly read: u64;
    readonly write: u64;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpVersionRuntimeVersion (142) */
=======
<<<<<<< HEAD
  /** @name SpVersionRuntimeVersion (140) */
=======
  /** @name SpVersionRuntimeVersion (137) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name SpVersionRuntimeVersion (131) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name FrameSystemError (147) */
=======
<<<<<<< HEAD
  /** @name FrameSystemError (145) */
=======
  /** @name FrameSystemError (142) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSystemError (136) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PolkadotPrimitivesV2PersistedValidationData (148) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2PersistedValidationData (146) */
=======
  /** @name PolkadotPrimitivesV2PersistedValidationData (143) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PolkadotPrimitivesV2PersistedValidationData (137) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PolkadotPrimitivesV2PersistedValidationData extends Struct {
    readonly parentHead: Bytes;
    readonly relayParentNumber: u32;
    readonly relayParentStorageRoot: H256;
    readonly maxPovSize: u32;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2UpgradeRestriction (151) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2UpgradeRestriction (149) */
=======
  /** @name PolkadotPrimitivesV2UpgradeRestriction (146) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PolkadotPrimitivesV2UpgradeRestriction (140) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PolkadotPrimitivesV2UpgradeRestriction extends Enum {
    readonly isPresent: boolean;
    readonly type: 'Present';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name SpTrieStorageProof (152) */
=======
<<<<<<< HEAD
  /** @name SpTrieStorageProof (150) */
=======
  /** @name SpTrieStorageProof (147) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name SpTrieStorageProof (141) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface SpTrieStorageProof extends Struct {
    readonly trieNodes: BTreeSet<Bytes>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (154) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (152) */
=======
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (149) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (143) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot extends Struct {
    readonly dmqMqcHead: H256;
    readonly relayDispatchQueueSize: ITuple<[u32, u32]>;
    readonly ingressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
    readonly egressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (157) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (155) */
=======
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (152) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (146) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (158) */
=======
<<<<<<< HEAD
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (156) */
=======
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (153) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (147) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (164) */
=======
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (162) */
=======
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (159) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (153) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PolkadotCorePrimitivesOutboundHrmpMessage extends Struct {
    readonly recipient: u32;
    readonly data: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemCall (165) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemCall (163) */
=======
  /** @name CumulusPalletParachainSystemCall (160) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name CumulusPalletParachainSystemCall (154) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (166) */
=======
<<<<<<< HEAD
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (164) */
=======
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (161) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name CumulusPrimitivesParachainInherentParachainInherentData (155) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface CumulusPrimitivesParachainInherentParachainInherentData extends Struct {
    readonly validationData: PolkadotPrimitivesV2PersistedValidationData;
    readonly relayChainState: SpTrieStorageProof;
    readonly downwardMessages: Vec<PolkadotCorePrimitivesInboundDownwardMessage>;
    readonly horizontalMessages: BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (168) */
=======
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (166) */
=======
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (163) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PolkadotCorePrimitivesInboundDownwardMessage (157) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PolkadotCorePrimitivesInboundDownwardMessage extends Struct {
    readonly sentAt: u32;
    readonly msg: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (171) */
=======
<<<<<<< HEAD
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (169) */
=======
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (166) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PolkadotCorePrimitivesInboundHrmpMessage (160) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PolkadotCorePrimitivesInboundHrmpMessage extends Struct {
    readonly sentAt: u32;
    readonly data: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemError (174) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletParachainSystemError (172) */
=======
  /** @name CumulusPalletParachainSystemError (169) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name CumulusPalletParachainSystemError (163) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PalletBalancesBalanceLock (176) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesBalanceLock (174) */
=======
  /** @name PalletBalancesBalanceLock (171) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletBalancesBalanceLock (165) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletBalancesBalanceLock extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
    readonly reasons: PalletBalancesReasons;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesReasons (177) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesReasons (175) */
=======
  /** @name PalletBalancesReasons (172) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletBalancesReasons (166) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletBalancesReasons extends Enum {
    readonly isFee: boolean;
    readonly isMisc: boolean;
    readonly isAll: boolean;
    readonly type: 'Fee' | 'Misc' | 'All';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesReserveData (180) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesReserveData (178) */
=======
  /** @name PalletBalancesReserveData (175) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletBalancesReserveData (169) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletBalancesReserveData extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesReleases (182) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesReleases (180) */
=======
  /** @name PalletBalancesReleases (177) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletBalancesReleases (171) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletBalancesReleases extends Enum {
    readonly isV100: boolean;
    readonly isV200: boolean;
    readonly type: 'V100' | 'V200';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletBalancesCall (183) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesCall (181) */
=======
  /** @name PalletBalancesCall (178) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletBalancesCall (172) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PalletBalancesError (186) */
=======
<<<<<<< HEAD
  /** @name PalletBalancesError (184) */
=======
  /** @name PalletBalancesError (181) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletBalancesError (175) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PalletTimestampCall (188) */
=======
<<<<<<< HEAD
  /** @name PalletTimestampCall (186) */
=======
  /** @name PalletTimestampCall (183) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletTimestampCall (177) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletTimestampCall extends Enum {
    readonly isSet: boolean;
    readonly asSet: {
      readonly now: Compact<u64>;
    } & Struct;
    readonly type: 'Set';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTransactionPaymentReleases (190) */
=======
<<<<<<< HEAD
  /** @name PalletTransactionPaymentReleases (188) */
=======
  /** @name PalletTransactionPaymentReleases (185) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletTransactionPaymentReleases (179) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletTransactionPaymentReleases extends Enum {
    readonly isV1Ancient: boolean;
    readonly isV2: boolean;
    readonly type: 'V1Ancient' | 'V2';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTreasuryProposal (191) */
=======
<<<<<<< HEAD
  /** @name PalletTreasuryProposal (189) */
=======
  /** @name PalletTreasuryProposal (186) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletTreasuryProposal (180) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletTreasuryProposal extends Struct {
    readonly proposer: AccountId32;
    readonly value: u128;
    readonly beneficiary: AccountId32;
    readonly bond: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletTreasuryCall (194) */
=======
<<<<<<< HEAD
  /** @name PalletTreasuryCall (192) */
=======
  /** @name PalletTreasuryCall (189) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletTreasuryCall (183) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name FrameSupportPalletId (197) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (198) */
=======
<<<<<<< HEAD
  /** @name FrameSupportPalletId (195) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (196) */
=======
  /** @name FrameSupportPalletId (192) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (193) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name FrameSupportPalletId (186) */
  interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (187) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PalletSudoCall (199) */
=======
<<<<<<< HEAD
  /** @name PalletSudoCall (197) */
=======
  /** @name PalletSudoCall (194) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletSudoCall (188) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletSudoCall extends Enum {
    readonly isSudo: boolean;
    readonly asSudo: {
      readonly call: Call;
    } & Struct;
    readonly isSudoUncheckedWeight: boolean;
    readonly asSudoUncheckedWeight: {
      readonly call: Call;
      readonly weight: Weight;
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
  /** @name OrmlVestingModuleCall (201) */
=======
<<<<<<< HEAD
  /** @name OrmlVestingModuleCall (199) */
=======
  /** @name OrmlVestingModuleCall (196) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name OrmlVestingModuleCall (190) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name OrmlXtokensModuleCall (203) */
=======
<<<<<<< HEAD
  /** @name OrmlXtokensModuleCall (201) */
=======
  /** @name OrmlXtokensModuleCall (198) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name OrmlXtokensModuleCall (192) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface OrmlXtokensModuleCall extends Enum {
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: u128;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeight: u64;
    } & Struct;
    readonly isTransferMultiasset: boolean;
    readonly asTransferMultiasset: {
      readonly asset: XcmVersionedMultiAsset;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeight: u64;
    } & Struct;
    readonly isTransferWithFee: boolean;
    readonly asTransferWithFee: {
      readonly currencyId: PalletForeignAssetsAssetIds;
      readonly amount: u128;
      readonly fee: u128;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeight: u64;
    } & Struct;
    readonly isTransferMultiassetWithFee: boolean;
    readonly asTransferMultiassetWithFee: {
      readonly asset: XcmVersionedMultiAsset;
      readonly fee: XcmVersionedMultiAsset;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeight: u64;
    } & Struct;
    readonly isTransferMulticurrencies: boolean;
    readonly asTransferMulticurrencies: {
      readonly currencies: Vec<ITuple<[PalletForeignAssetsAssetIds, u128]>>;
      readonly feeItem: u32;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeight: u64;
    } & Struct;
    readonly isTransferMultiassets: boolean;
    readonly asTransferMultiassets: {
      readonly assets: XcmVersionedMultiAssets;
      readonly feeItem: u32;
      readonly dest: XcmVersionedMultiLocation;
      readonly destWeight: u64;
    } & Struct;
    readonly type: 'Transfer' | 'TransferMultiasset' | 'TransferWithFee' | 'TransferMultiassetWithFee' | 'TransferMulticurrencies' | 'TransferMultiassets';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmVersionedMultiAsset (204) */
=======
<<<<<<< HEAD
  /** @name XcmVersionedMultiAsset (202) */
=======
  /** @name XcmVersionedMultiAsset (199) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmVersionedMultiAsset (193) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface XcmVersionedMultiAsset extends Enum {
    readonly isV0: boolean;
    readonly asV0: XcmV0MultiAsset;
    readonly isV1: boolean;
    readonly asV1: XcmV1MultiAsset;
    readonly type: 'V0' | 'V1';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name OrmlTokensModuleCall (207) */
=======
<<<<<<< HEAD
  /** @name OrmlTokensModuleCall (205) */
=======
  /** @name OrmlTokensModuleCall (202) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name OrmlTokensModuleCall (196) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name CumulusPalletXcmpQueueCall (208) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmpQueueCall (206) */
=======
  /** @name CumulusPalletXcmpQueueCall (203) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name CumulusPalletXcmpQueueCall (197) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface CumulusPalletXcmpQueueCall extends Enum {
    readonly isServiceOverweight: boolean;
    readonly asServiceOverweight: {
      readonly index: u64;
      readonly weightLimit: Weight;
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
      readonly new_: Weight;
    } & Struct;
    readonly isUpdateWeightRestrictDecay: boolean;
    readonly asUpdateWeightRestrictDecay: {
      readonly new_: Weight;
    } & Struct;
    readonly isUpdateXcmpMaxIndividualWeight: boolean;
    readonly asUpdateXcmpMaxIndividualWeight: {
      readonly new_: Weight;
    } & Struct;
    readonly type: 'ServiceOverweight' | 'SuspendXcmExecution' | 'ResumeXcmExecution' | 'UpdateSuspendThreshold' | 'UpdateDropThreshold' | 'UpdateResumeThreshold' | 'UpdateThresholdWeight' | 'UpdateWeightRestrictDecay' | 'UpdateXcmpMaxIndividualWeight';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletXcmCall (209) */
=======
<<<<<<< HEAD
  /** @name PalletXcmCall (207) */
=======
  /** @name PalletXcmCall (204) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletXcmCall (198) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
      readonly maxWeight: Weight;
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
  /** @name XcmVersionedXcm (210) */
=======
<<<<<<< HEAD
  /** @name XcmVersionedXcm (208) */
=======
  /** @name XcmVersionedXcm (205) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmVersionedXcm (199) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name XcmV0Xcm (211) */
=======
<<<<<<< HEAD
  /** @name XcmV0Xcm (209) */
=======
  /** @name XcmV0Xcm (206) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmV0Xcm (200) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name XcmV0Order (213) */
=======
<<<<<<< HEAD
  /** @name XcmV0Order (211) */
=======
  /** @name XcmV0Order (208) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmV0Order (202) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name XcmV0Response (215) */
=======
<<<<<<< HEAD
  /** @name XcmV0Response (213) */
=======
  /** @name XcmV0Response (210) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmV0Response (204) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface XcmV0Response extends Enum {
    readonly isAssets: boolean;
    readonly asAssets: Vec<XcmV0MultiAsset>;
    readonly type: 'Assets';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name XcmV1Xcm (216) */
=======
<<<<<<< HEAD
  /** @name XcmV1Xcm (214) */
=======
  /** @name XcmV1Xcm (211) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmV1Xcm (205) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name XcmV1Order (218) */
=======
<<<<<<< HEAD
  /** @name XcmV1Order (216) */
=======
  /** @name XcmV1Order (213) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmV1Order (207) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name XcmV1Response (220) */
=======
<<<<<<< HEAD
  /** @name XcmV1Response (218) */
=======
  /** @name XcmV1Response (215) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name XcmV1Response (209) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface XcmV1Response extends Enum {
    readonly isAssets: boolean;
    readonly asAssets: XcmV1MultiassetMultiAssets;
    readonly isVersion: boolean;
    readonly asVersion: u32;
    readonly type: 'Assets' | 'Version';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name CumulusPalletXcmCall (234) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (235) */
=======
<<<<<<< HEAD
  /** @name CumulusPalletXcmCall (232) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (233) */
=======
  /** @name CumulusPalletXcmCall (229) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (230) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name CumulusPalletXcmCall (224) */
  type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (225) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface CumulusPalletDmpQueueCall extends Enum {
    readonly isServiceOverweight: boolean;
    readonly asServiceOverweight: {
      readonly index: u64;
      readonly weightLimit: Weight;
    } & Struct;
    readonly type: 'ServiceOverweight';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletInflationCall (236) */
=======
<<<<<<< HEAD
  /** @name PalletInflationCall (234) */
=======
  /** @name PalletInflationCall (231) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletInflationCall (226) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletInflationCall extends Enum {
    readonly isStartInflation: boolean;
    readonly asStartInflation: {
      readonly inflationStartRelayBlock: u32;
    } & Struct;
    readonly type: 'StartInflation';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletUniqueCall (237) */
=======
<<<<<<< HEAD
  /** @name PalletUniqueCall (235) */
=======
  /** @name PalletUniqueCall (232) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletUniqueCall (227) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
    readonly isRepairItem: boolean;
    readonly asRepairItem: {
      readonly collectionId: u32;
      readonly itemId: u32;
    } & Struct;
    readonly type: 'CreateCollection' | 'CreateCollectionEx' | 'DestroyCollection' | 'AddToAllowList' | 'RemoveFromAllowList' | 'ChangeCollectionOwner' | 'AddCollectionAdmin' | 'RemoveCollectionAdmin' | 'SetCollectionSponsor' | 'ConfirmSponsorship' | 'RemoveCollectionSponsor' | 'CreateItem' | 'CreateMultipleItems' | 'SetCollectionProperties' | 'DeleteCollectionProperties' | 'SetTokenProperties' | 'DeleteTokenProperties' | 'SetTokenPropertyPermissions' | 'CreateMultipleItemsEx' | 'SetTransfersEnabledFlag' | 'BurnItem' | 'BurnFrom' | 'Transfer' | 'Approve' | 'TransferFrom' | 'SetCollectionLimits' | 'SetCollectionPermissions' | 'Repartition' | 'RepairItem';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCollectionMode (242) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCollectionMode (240) */
=======
  /** @name UpDataStructsCollectionMode (237) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCollectionMode (232) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCollectionMode extends Enum {
    readonly isNft: boolean;
    readonly isFungible: boolean;
    readonly asFungible: u8;
    readonly isReFungible: boolean;
    readonly type: 'Nft' | 'Fungible' | 'ReFungible';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateCollectionData (243) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateCollectionData (241) */
=======
  /** @name UpDataStructsCreateCollectionData (238) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateCollectionData (233) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name UpDataStructsAccessMode (245) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsAccessMode (243) */
=======
  /** @name UpDataStructsAccessMode (240) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsAccessMode (235) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsAccessMode extends Enum {
    readonly isNormal: boolean;
    readonly isAllowList: boolean;
    readonly type: 'Normal' | 'AllowList';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCollectionLimits (247) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCollectionLimits (245) */
=======
  /** @name UpDataStructsCollectionLimits (242) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCollectionLimits (237) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name UpDataStructsSponsoringRateLimit (249) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsSponsoringRateLimit (247) */
=======
  /** @name UpDataStructsSponsoringRateLimit (244) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsSponsoringRateLimit (239) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsSponsoringRateLimit extends Enum {
    readonly isSponsoringDisabled: boolean;
    readonly isBlocks: boolean;
    readonly asBlocks: u32;
    readonly type: 'SponsoringDisabled' | 'Blocks';
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCollectionPermissions (252) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCollectionPermissions (250) */
=======
  /** @name UpDataStructsCollectionPermissions (247) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCollectionPermissions (242) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCollectionPermissions extends Struct {
    readonly access: Option<UpDataStructsAccessMode>;
    readonly mintMode: Option<bool>;
    readonly nesting: Option<UpDataStructsNestingPermissions>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsNestingPermissions (254) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsNestingPermissions (252) */
=======
  /** @name UpDataStructsNestingPermissions (249) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsNestingPermissions (244) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsNestingPermissions extends Struct {
    readonly tokenOwner: bool;
    readonly collectionAdmin: bool;
    readonly restricted: Option<UpDataStructsOwnerRestrictedSet>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsOwnerRestrictedSet (256) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (261) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsOwnerRestrictedSet (254) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (259) */
=======
  /** @name UpDataStructsOwnerRestrictedSet (251) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (256) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsOwnerRestrictedSet (246) */
  interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

  /** @name UpDataStructsPropertyKeyPermission (251) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsPropertyKeyPermission extends Struct {
    readonly key: Bytes;
    readonly permission: UpDataStructsPropertyPermission;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsPropertyPermission (262) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsPropertyPermission (260) */
=======
  /** @name UpDataStructsPropertyPermission (257) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsPropertyPermission (252) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsPropertyPermission extends Struct {
    readonly mutable: bool;
    readonly collectionAdmin: bool;
    readonly tokenOwner: bool;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsProperty (265) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsProperty (263) */
=======
  /** @name UpDataStructsProperty (260) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsProperty (255) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsProperty extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemData (268) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemData (266) */
=======
  /** @name UpDataStructsCreateItemData (263) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateItemData (258) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name UpDataStructsCreateNftData (269) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftData (267) */
=======
  /** @name UpDataStructsCreateNftData (264) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateNftData (259) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCreateNftData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateFungibleData (270) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateFungibleData (268) */
=======
  /** @name UpDataStructsCreateFungibleData (265) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateFungibleData (260) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCreateFungibleData extends Struct {
    readonly value: u128;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateReFungibleData (271) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateReFungibleData (269) */
=======
  /** @name UpDataStructsCreateReFungibleData (266) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateReFungibleData (261) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCreateReFungibleData extends Struct {
    readonly pieces: u128;
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemExData (274) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateItemExData (272) */
=======
  /** @name UpDataStructsCreateItemExData (269) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateItemExData (264) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name UpDataStructsCreateNftExData (276) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateNftExData (274) */
=======
  /** @name UpDataStructsCreateNftExData (271) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateNftExData (266) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCreateNftExData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
    readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExSingleOwner (283) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExSingleOwner (281) */
=======
  /** @name UpDataStructsCreateRefungibleExSingleOwner (278) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateRefungibleExSingleOwner (273) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCreateRefungibleExSingleOwner extends Struct {
    readonly user: PalletEvmAccountBasicCrossAccountIdRepr;
    readonly pieces: u128;
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (285) */
=======
<<<<<<< HEAD
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (283) */
=======
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (280) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name UpDataStructsCreateRefungibleExMultipleOwners (275) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface UpDataStructsCreateRefungibleExMultipleOwners extends Struct {
    readonly users: BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>;
    readonly properties: Vec<UpDataStructsProperty>;
  }

<<<<<<< HEAD
<<<<<<< HEAD
  /** @name PalletUniqueSchedulerCall (286) */
=======
<<<<<<< HEAD
  /** @name PalletUniqueSchedulerCall (284) */
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface PalletUniqueSchedulerCall extends Enum {
    readonly isScheduleNamed: boolean;
    readonly asScheduleNamed: {
      readonly id: U8aFixed;
      readonly when: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: Option<u8>;
      readonly call: FrameSupportScheduleMaybeHashed;
    } & Struct;
    readonly isCancelNamed: boolean;
    readonly asCancelNamed: {
      readonly id: U8aFixed;
    } & Struct;
    readonly isScheduleNamedAfter: boolean;
    readonly asScheduleNamedAfter: {
      readonly id: U8aFixed;
      readonly after: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: Option<u8>;
      readonly call: FrameSupportScheduleMaybeHashed;
    } & Struct;
    readonly isChangeNamedPriority: boolean;
    readonly asChangeNamedPriority: {
      readonly id: U8aFixed;
      readonly priority: u8;
    } & Struct;
    readonly type: 'ScheduleNamed' | 'CancelNamed' | 'ScheduleNamedAfter' | 'ChangeNamedPriority';
  }

  /** @name FrameSupportScheduleMaybeHashed (289) */
  interface FrameSupportScheduleMaybeHashed extends Enum {
    readonly isValue: boolean;
    readonly asValue: Call;
    readonly isHash: boolean;
    readonly asHash: H256;
    readonly type: 'Value' | 'Hash';
  }

<<<<<<< HEAD
  /** @name PalletConfigurationCall (290) */
=======
  /** @name PalletConfigurationCall (288) */
=======
  /** @name PalletConfigurationCall (281) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletConfigurationCall (276) */
>>>>>>> ec6ecdbe... chore: regenerate types
  interface PalletConfigurationCall extends Enum {
    readonly isSetWeightToFeeCoefficientOverride: boolean;
    readonly asSetWeightToFeeCoefficientOverride: {
      readonly coeff: Option<u32>;
    } & Struct;
    readonly isSetMinGasPriceOverride: boolean;
    readonly asSetMinGasPriceOverride: {
      readonly coeff: Option<u64>;
    } & Struct;
<<<<<<< HEAD
<<<<<<< HEAD
    readonly type: 'SetWeightToFeeCoefficientOverride' | 'SetMinGasPriceOverride';
  }

  /** @name PalletTemplateTransactionPaymentCall (292) */
  type PalletTemplateTransactionPaymentCall = Null;

  /** @name PalletStructureCall (293) */
  type PalletStructureCall = Null;

<<<<<<< HEAD
  /** @name PalletRmrkCoreCall (294) */
=======
  /** @name PalletRmrkCoreCall (292) */
=======
=======
>>>>>>> ec6ecdbe... chore: regenerate types
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

  /** @name PalletConfigurationAppPromotionConfiguration (281) */
  interface PalletConfigurationAppPromotionConfiguration extends Struct {
    readonly recalculationInterval: Option<u32>;
    readonly pendingInterval: Option<u32>;
    readonly intervalIncome: Option<Perbill>;
    readonly maxStakersPerCalculation: Option<u8>;
  }

  /** @name PalletTemplateTransactionPaymentCall (284) */
  type PalletTemplateTransactionPaymentCall = Null;

  /** @name PalletStructureCall (285) */
  type PalletStructureCall = Null;

<<<<<<< HEAD
  /** @name PalletRmrkCoreCall (291) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
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
  /** @name RmrkTraitsResourceResourceTypes (300) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceResourceTypes (298) */
=======
  /** @name RmrkTraitsResourceResourceTypes (297) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
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
  /** @name RmrkTraitsResourceBasicResource (302) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceBasicResource (300) */
=======
  /** @name RmrkTraitsResourceBasicResource (299) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsResourceBasicResource extends Struct {
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

<<<<<<< HEAD
  /** @name RmrkTraitsResourceComposableResource (304) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceComposableResource (302) */
=======
  /** @name RmrkTraitsResourceComposableResource (301) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsResourceComposableResource extends Struct {
    readonly parts: Vec<u32>;
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

<<<<<<< HEAD
  /** @name RmrkTraitsResourceSlotResource (305) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsResourceSlotResource (303) */
=======
  /** @name RmrkTraitsResourceSlotResource (302) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsResourceSlotResource extends Struct {
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly slot: u32;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

<<<<<<< HEAD
  /** @name PalletRmrkEquipCall (308) */
=======
<<<<<<< HEAD
  /** @name PalletRmrkEquipCall (306) */
=======
  /** @name PalletRmrkEquipCall (305) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
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
  /** @name RmrkTraitsPartPartType (311) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartPartType (309) */
=======
  /** @name RmrkTraitsPartPartType (308) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsPartPartType extends Enum {
    readonly isFixedPart: boolean;
    readonly asFixedPart: RmrkTraitsPartFixedPart;
    readonly isSlotPart: boolean;
    readonly asSlotPart: RmrkTraitsPartSlotPart;
    readonly type: 'FixedPart' | 'SlotPart';
  }

<<<<<<< HEAD
  /** @name RmrkTraitsPartFixedPart (313) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartFixedPart (311) */
=======
  /** @name RmrkTraitsPartFixedPart (310) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsPartFixedPart extends Struct {
    readonly id: u32;
    readonly z: u32;
    readonly src: Bytes;
  }

<<<<<<< HEAD
  /** @name RmrkTraitsPartSlotPart (314) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartSlotPart (312) */
=======
  /** @name RmrkTraitsPartSlotPart (311) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsPartSlotPart extends Struct {
    readonly id: u32;
    readonly equippable: RmrkTraitsPartEquippableList;
    readonly src: Bytes;
    readonly z: u32;
  }

<<<<<<< HEAD
  /** @name RmrkTraitsPartEquippableList (315) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsPartEquippableList (313) */
=======
  /** @name RmrkTraitsPartEquippableList (312) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsPartEquippableList extends Enum {
    readonly isAll: boolean;
    readonly isEmpty: boolean;
    readonly isCustom: boolean;
    readonly asCustom: Vec<u32>;
    readonly type: 'All' | 'Empty' | 'Custom';
  }

<<<<<<< HEAD
  /** @name RmrkTraitsTheme (317) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsTheme (315) */
=======
  /** @name RmrkTraitsTheme (314) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsTheme extends Struct {
    readonly name: Bytes;
    readonly properties: Vec<RmrkTraitsThemeThemeProperty>;
    readonly inherit: bool;
  }

<<<<<<< HEAD
  /** @name RmrkTraitsThemeThemeProperty (319) */
=======
<<<<<<< HEAD
  /** @name RmrkTraitsThemeThemeProperty (317) */
=======
  /** @name RmrkTraitsThemeThemeProperty (316) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
  interface RmrkTraitsThemeThemeProperty extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

<<<<<<< HEAD
  /** @name PalletAppPromotionCall (321) */
=======
<<<<<<< HEAD
  /** @name PalletAppPromotionCall (319) */
=======
  /** @name PalletAppPromotionCall (318) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletAppPromotionCall (286) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PalletForeignAssetsModuleCall (322) */
=======
<<<<<<< HEAD
  /** @name PalletForeignAssetsModuleCall (320) */
=======
  /** @name PalletForeignAssetsModuleCall (319) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletForeignAssetsModuleCall (287) */
>>>>>>> ec6ecdbe... chore: regenerate types
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
  /** @name PalletEvmCall (323) */
=======
<<<<<<< HEAD
  /** @name PalletEvmCall (321) */
=======
  /** @name PalletEvmCall (320) */
>>>>>>> 57a85f52... chore: regenerate stubs & types
>>>>>>> 394f6563... chore: regenerate stubs & types
=======
  /** @name PalletEvmCall (288) */
>>>>>>> ec6ecdbe... chore: regenerate types
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

  /** @name PalletEthereumCall (294) */
  interface PalletEthereumCall extends Enum {
    readonly isTransact: boolean;
    readonly asTransact: {
      readonly transaction: EthereumTransactionTransactionV2;
    } & Struct;
    readonly type: 'Transact';
  }

  /** @name EthereumTransactionTransactionV2 (295) */
  interface EthereumTransactionTransactionV2 extends Enum {
    readonly isLegacy: boolean;
    readonly asLegacy: EthereumTransactionLegacyTransaction;
    readonly isEip2930: boolean;
    readonly asEip2930: EthereumTransactionEip2930Transaction;
    readonly isEip1559: boolean;
    readonly asEip1559: EthereumTransactionEip1559Transaction;
    readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
  }

  /** @name EthereumTransactionLegacyTransaction (296) */
  interface EthereumTransactionLegacyTransaction extends Struct {
    readonly nonce: U256;
    readonly gasPrice: U256;
    readonly gasLimit: U256;
    readonly action: EthereumTransactionTransactionAction;
    readonly value: U256;
    readonly input: Bytes;
    readonly signature: EthereumTransactionTransactionSignature;
  }

  /** @name EthereumTransactionTransactionAction (297) */
  interface EthereumTransactionTransactionAction extends Enum {
    readonly isCall: boolean;
    readonly asCall: H160;
    readonly isCreate: boolean;
    readonly type: 'Call' | 'Create';
  }

  /** @name EthereumTransactionTransactionSignature (298) */
  interface EthereumTransactionTransactionSignature extends Struct {
    readonly v: u64;
    readonly r: H256;
    readonly s: H256;
  }

  /** @name EthereumTransactionEip2930Transaction (300) */
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

  /** @name EthereumTransactionAccessListItem (302) */
  interface EthereumTransactionAccessListItem extends Struct {
    readonly address: H160;
    readonly storageKeys: Vec<H256>;
  }

  /** @name EthereumTransactionEip1559Transaction (303) */
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

  /** @name PalletEvmMigrationCall (304) */
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

  /** @name PalletMaintenanceCall (308) */
  interface PalletMaintenanceCall extends Enum {
    readonly isEnable: boolean;
    readonly isDisable: boolean;
    readonly type: 'Enable' | 'Disable';
  }

  /** @name PalletSudoError (309) */
  interface PalletSudoError extends Enum {
    readonly isRequireSudo: boolean;
    readonly type: 'RequireSudo';
  }

  /** @name OrmlVestingModuleError (311) */
  interface OrmlVestingModuleError extends Enum {
    readonly isZeroVestingPeriod: boolean;
    readonly isZeroVestingPeriodCount: boolean;
    readonly isInsufficientBalanceToLock: boolean;
    readonly isTooManyVestingSchedules: boolean;
    readonly isAmountLow: boolean;
    readonly isMaxVestingSchedulesExceeded: boolean;
    readonly type: 'ZeroVestingPeriod' | 'ZeroVestingPeriodCount' | 'InsufficientBalanceToLock' | 'TooManyVestingSchedules' | 'AmountLow' | 'MaxVestingSchedulesExceeded';
  }

  /** @name OrmlXtokensModuleError (312) */
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

  /** @name OrmlTokensBalanceLock (315) */
  interface OrmlTokensBalanceLock extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
  }

  /** @name OrmlTokensAccountData (317) */
  interface OrmlTokensAccountData extends Struct {
    readonly free: u128;
    readonly reserved: u128;
    readonly frozen: u128;
  }

  /** @name OrmlTokensReserveData (319) */
  interface OrmlTokensReserveData extends Struct {
    readonly id: Null;
    readonly amount: u128;
  }

  /** @name OrmlTokensModuleError (321) */
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

  /** @name CumulusPalletXcmpQueueInboundChannelDetails (323) */
  interface CumulusPalletXcmpQueueInboundChannelDetails extends Struct {
    readonly sender: u32;
    readonly state: CumulusPalletXcmpQueueInboundState;
    readonly messageMetadata: Vec<ITuple<[u32, PolkadotParachainPrimitivesXcmpMessageFormat]>>;
  }

  /** @name CumulusPalletXcmpQueueInboundState (324) */
  interface CumulusPalletXcmpQueueInboundState extends Enum {
    readonly isOk: boolean;
    readonly isSuspended: boolean;
    readonly type: 'Ok' | 'Suspended';
  }

  /** @name PolkadotParachainPrimitivesXcmpMessageFormat (327) */
  interface PolkadotParachainPrimitivesXcmpMessageFormat extends Enum {
    readonly isConcatenatedVersionedXcm: boolean;
    readonly isConcatenatedEncodedBlob: boolean;
    readonly isSignals: boolean;
    readonly type: 'ConcatenatedVersionedXcm' | 'ConcatenatedEncodedBlob' | 'Signals';
  }

  /** @name CumulusPalletXcmpQueueOutboundChannelDetails (330) */
  interface CumulusPalletXcmpQueueOutboundChannelDetails extends Struct {
    readonly recipient: u32;
    readonly state: CumulusPalletXcmpQueueOutboundState;
    readonly signalsExist: bool;
    readonly firstIndex: u16;
    readonly lastIndex: u16;
  }

  /** @name CumulusPalletXcmpQueueOutboundState (331) */
  interface CumulusPalletXcmpQueueOutboundState extends Enum {
    readonly isOk: boolean;
    readonly isSuspended: boolean;
    readonly type: 'Ok' | 'Suspended';
  }

  /** @name CumulusPalletXcmpQueueQueueConfigData (333) */
  interface CumulusPalletXcmpQueueQueueConfigData extends Struct {
    readonly suspendThreshold: u32;
    readonly dropThreshold: u32;
    readonly resumeThreshold: u32;
    readonly thresholdWeight: Weight;
    readonly weightRestrictDecay: Weight;
    readonly xcmpMaxIndividualWeight: Weight;
  }

  /** @name CumulusPalletXcmpQueueError (335) */
  interface CumulusPalletXcmpQueueError extends Enum {
    readonly isFailedToSend: boolean;
    readonly isBadXcmOrigin: boolean;
    readonly isBadXcm: boolean;
    readonly isBadOverweightIndex: boolean;
    readonly isWeightOverLimit: boolean;
    readonly type: 'FailedToSend' | 'BadXcmOrigin' | 'BadXcm' | 'BadOverweightIndex' | 'WeightOverLimit';
  }

  /** @name PalletXcmError (336) */
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

  /** @name CumulusPalletXcmError (337) */
  type CumulusPalletXcmError = Null;

  /** @name CumulusPalletDmpQueueConfigData (338) */
  interface CumulusPalletDmpQueueConfigData extends Struct {
    readonly maxIndividual: Weight;
  }

  /** @name CumulusPalletDmpQueuePageIndexData (339) */
  interface CumulusPalletDmpQueuePageIndexData extends Struct {
    readonly beginUsed: u32;
    readonly endUsed: u32;
    readonly overweightCount: u64;
  }

  /** @name CumulusPalletDmpQueueError (342) */
  interface CumulusPalletDmpQueueError extends Enum {
    readonly isUnknown: boolean;
    readonly isOverLimit: boolean;
    readonly type: 'Unknown' | 'OverLimit';
  }

  /** @name PalletUniqueError (346) */
  interface PalletUniqueError extends Enum {
    readonly isCollectionDecimalPointLimitExceeded: boolean;
    readonly isConfirmUnsetSponsorFail: boolean;
    readonly isEmptyArgument: boolean;
    readonly isRepartitionCalledOnNonRefungibleCollection: boolean;
    readonly type: 'CollectionDecimalPointLimitExceeded' | 'ConfirmUnsetSponsorFail' | 'EmptyArgument' | 'RepartitionCalledOnNonRefungibleCollection';
  }

  /** @name PalletConfigurationError (347) */
  interface PalletConfigurationError extends Enum {
    readonly isInconsistentConfiguration: boolean;
    readonly type: 'InconsistentConfiguration';
  }

  /** @name UpDataStructsCollection (348) */
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

  /** @name UpDataStructsSponsorshipStateAccountId32 (349) */
  interface UpDataStructsSponsorshipStateAccountId32 extends Enum {
    readonly isDisabled: boolean;
    readonly isUnconfirmed: boolean;
    readonly asUnconfirmed: AccountId32;
    readonly isConfirmed: boolean;
    readonly asConfirmed: AccountId32;
    readonly type: 'Disabled' | 'Unconfirmed' | 'Confirmed';
  }

  /** @name UpDataStructsProperties (351) */
  interface UpDataStructsProperties extends Struct {
    readonly map: UpDataStructsPropertiesMapBoundedVec;
    readonly consumedSpace: u32;
    readonly spaceLimit: u32;
  }

  /** @name UpDataStructsPropertiesMapBoundedVec (352) */
  interface UpDataStructsPropertiesMapBoundedVec extends BTreeMap<Bytes, Bytes> {}

  /** @name UpDataStructsPropertiesMapPropertyPermission (357) */
  interface UpDataStructsPropertiesMapPropertyPermission extends BTreeMap<Bytes, UpDataStructsPropertyPermission> {}

  /** @name UpDataStructsCollectionStats (364) */
  interface UpDataStructsCollectionStats extends Struct {
    readonly created: u32;
    readonly destroyed: u32;
    readonly alive: u32;
  }

  /** @name UpDataStructsTokenChild (365) */
  interface UpDataStructsTokenChild extends Struct {
    readonly token: u32;
    readonly collection: u32;
  }

  /** @name PhantomTypeUpDataStructs (366) */
  interface PhantomTypeUpDataStructs extends Vec<ITuple<[UpDataStructsTokenData, UpDataStructsRpcCollection, RmrkTraitsCollectionCollectionInfo, RmrkTraitsNftNftInfo, RmrkTraitsResourceResourceInfo, RmrkTraitsPropertyPropertyInfo, RmrkTraitsBaseBaseInfo, RmrkTraitsPartPartType, RmrkTraitsTheme, RmrkTraitsNftNftChild]>> {}

  /** @name UpDataStructsTokenData (368) */
  interface UpDataStructsTokenData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
    readonly owner: Option<PalletEvmAccountBasicCrossAccountIdRepr>;
    readonly pieces: u128;
  }

  /** @name UpDataStructsRpcCollection (370) */
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

  /** @name UpDataStructsRpcCollectionFlags (371) */
  interface UpDataStructsRpcCollectionFlags extends Struct {
    readonly foreign: bool;
    readonly erc721metadata: bool;
  }

  /** @name RmrkTraitsCollectionCollectionInfo (372) */
  interface RmrkTraitsCollectionCollectionInfo extends Struct {
    readonly issuer: AccountId32;
    readonly metadata: Bytes;
    readonly max: Option<u32>;
    readonly symbol: Bytes;
    readonly nftsCount: u32;
  }

  /** @name RmrkTraitsNftNftInfo (375) */
  interface RmrkTraitsNftNftInfo extends Struct {
    readonly owner: RmrkTraitsNftAccountIdOrCollectionNftTuple;
    readonly royalty: Option<RmrkTraitsNftRoyaltyInfo>;
    readonly metadata: Bytes;
    readonly equipped: bool;
    readonly pending: bool;
  }

  /** @name RmrkTraitsNftAccountIdOrCollectionNftTuple (376) */
  interface RmrkTraitsNftAccountIdOrCollectionNftTuple extends Enum {
    readonly isAccountId: boolean;
    readonly asAccountId: AccountId32;
    readonly isCollectionAndNftTuple: boolean;
    readonly asCollectionAndNftTuple: ITuple<[u32, u32]>;
    readonly type: 'AccountId' | 'CollectionAndNftTuple';
  }

  /** @name RmrkTraitsNftRoyaltyInfo (378) */
  interface RmrkTraitsNftRoyaltyInfo extends Struct {
    readonly recipient: AccountId32;
    readonly amount: Permill;
  }

  /** @name RmrkTraitsResourceResourceInfo (379) */
  interface RmrkTraitsResourceResourceInfo extends Struct {
    readonly id: u32;
    readonly resource: RmrkTraitsResourceResourceTypes;
    readonly pending: bool;
    readonly pendingRemoval: bool;
  }

  /** @name RmrkTraitsResourceResourceTypes (381) */
  interface RmrkTraitsResourceResourceTypes extends Enum {
    readonly isBasic: boolean;
    readonly asBasic: RmrkTraitsResourceBasicResource;
    readonly isComposable: boolean;
    readonly asComposable: RmrkTraitsResourceComposableResource;
    readonly isSlot: boolean;
    readonly asSlot: RmrkTraitsResourceSlotResource;
    readonly type: 'Basic' | 'Composable' | 'Slot';
  }

  /** @name RmrkTraitsResourceBasicResource (382) */
  interface RmrkTraitsResourceBasicResource extends Struct {
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

  /** @name RmrkTraitsResourceComposableResource (384) */
  interface RmrkTraitsResourceComposableResource extends Struct {
    readonly parts: Vec<u32>;
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

  /** @name RmrkTraitsResourceSlotResource (385) */
  interface RmrkTraitsResourceSlotResource extends Struct {
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly slot: u32;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

  /** @name RmrkTraitsPropertyPropertyInfo (386) */
  interface RmrkTraitsPropertyPropertyInfo extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

  /** @name RmrkTraitsBaseBaseInfo (389) */
  interface RmrkTraitsBaseBaseInfo extends Struct {
    readonly issuer: AccountId32;
    readonly baseType: Bytes;
    readonly symbol: Bytes;
  }

  /** @name RmrkTraitsPartPartType (390) */
  interface RmrkTraitsPartPartType extends Enum {
    readonly isFixedPart: boolean;
    readonly asFixedPart: RmrkTraitsPartFixedPart;
    readonly isSlotPart: boolean;
    readonly asSlotPart: RmrkTraitsPartSlotPart;
    readonly type: 'FixedPart' | 'SlotPart';
  }

  /** @name RmrkTraitsPartFixedPart (392) */
  interface RmrkTraitsPartFixedPart extends Struct {
    readonly id: u32;
    readonly z: u32;
    readonly src: Bytes;
  }

  /** @name RmrkTraitsPartSlotPart (393) */
  interface RmrkTraitsPartSlotPart extends Struct {
    readonly id: u32;
    readonly equippable: RmrkTraitsPartEquippableList;
    readonly src: Bytes;
    readonly z: u32;
  }

  /** @name RmrkTraitsPartEquippableList (394) */
  interface RmrkTraitsPartEquippableList extends Enum {
    readonly isAll: boolean;
    readonly isEmpty: boolean;
    readonly isCustom: boolean;
    readonly asCustom: Vec<u32>;
    readonly type: 'All' | 'Empty' | 'Custom';
  }

  /** @name RmrkTraitsTheme (395) */
  interface RmrkTraitsTheme extends Struct {
    readonly name: Bytes;
    readonly properties: Vec<RmrkTraitsThemeThemeProperty>;
    readonly inherit: bool;
  }

  /** @name RmrkTraitsThemeThemeProperty (397) */
  interface RmrkTraitsThemeThemeProperty extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

  /** @name RmrkTraitsNftNftChild (399) */
  interface RmrkTraitsNftNftChild extends Struct {
    readonly collectionId: u32;
    readonly nftId: u32;
  }

  /** @name PalletCommonError (401) */
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
    readonly type: 'CollectionNotFound' | 'MustBeTokenOwner' | 'NoPermission' | 'CantDestroyNotEmptyCollection' | 'PublicMintingNotAllowed' | 'AddressNotInAllowlist' | 'CollectionNameLimitExceeded' | 'CollectionDescriptionLimitExceeded' | 'CollectionTokenPrefixLimitExceeded' | 'TotalCollectionsLimitExceeded' | 'CollectionAdminCountExceeded' | 'CollectionLimitBoundsExceeded' | 'OwnerPermissionsCantBeReverted' | 'TransferNotAllowed' | 'AccountTokenLimitExceeded' | 'CollectionTokenLimitExceeded' | 'MetadataFlagFrozen' | 'TokenNotFound' | 'TokenValueTooLow' | 'ApprovedValueTooLow' | 'CantApproveMoreThanOwned' | 'AddressIsZero' | 'UnsupportedOperation' | 'NotSufficientFounds' | 'UserIsNotAllowedToNest' | 'SourceCollectionIsNotAllowedToNest' | 'CollectionFieldSizeExceeded' | 'NoSpaceForProperty' | 'PropertyLimitReached' | 'PropertyKeyIsTooLong' | 'InvalidCharacterInPropertyKey' | 'EmptyPropertyKey' | 'CollectionIsExternal' | 'CollectionIsInternal';
  }

  /** @name PalletFungibleError (403) */
  interface PalletFungibleError extends Enum {
    readonly isNotFungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isFungibleItemsHaveNoId: boolean;
    readonly isFungibleItemsDontHaveData: boolean;
    readonly isFungibleDisallowsNesting: boolean;
    readonly isSettingPropertiesNotAllowed: boolean;
    readonly isFungibleTokensAreAlwaysValid: boolean;
    readonly type: 'NotFungibleDataUsedToMintFungibleCollectionToken' | 'FungibleItemsHaveNoId' | 'FungibleItemsDontHaveData' | 'FungibleDisallowsNesting' | 'SettingPropertiesNotAllowed' | 'FungibleTokensAreAlwaysValid';
  }

  /** @name PalletRefungibleItemData (404) */
  interface PalletRefungibleItemData extends Struct {
    readonly constData: Bytes;
  }

  /** @name PalletRefungibleError (409) */
  interface PalletRefungibleError extends Enum {
    readonly isNotRefungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isWrongRefungiblePieces: boolean;
    readonly isRepartitionWhileNotOwningAllPieces: boolean;
    readonly isRefungibleDisallowsNesting: boolean;
    readonly isSettingPropertiesNotAllowed: boolean;
    readonly type: 'NotRefungibleDataUsedToMintFungibleCollectionToken' | 'WrongRefungiblePieces' | 'RepartitionWhileNotOwningAllPieces' | 'RefungibleDisallowsNesting' | 'SettingPropertiesNotAllowed';
  }

  /** @name PalletNonfungibleItemData (410) */
  interface PalletNonfungibleItemData extends Struct {
    readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
  }

  /** @name UpDataStructsPropertyScope (412) */
  interface UpDataStructsPropertyScope extends Enum {
    readonly isNone: boolean;
    readonly isRmrk: boolean;
    readonly type: 'None' | 'Rmrk';
  }

  /** @name PalletNonfungibleError (414) */
  interface PalletNonfungibleError extends Enum {
    readonly isNotNonfungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isNonfungibleItemsHaveNoAmount: boolean;
    readonly isCantBurnNftWithChildren: boolean;
    readonly type: 'NotNonfungibleDataUsedToMintFungibleCollectionToken' | 'NonfungibleItemsHaveNoAmount' | 'CantBurnNftWithChildren';
  }

  /** @name PalletStructureError (415) */
  interface PalletStructureError extends Enum {
    readonly isOuroborosDetected: boolean;
    readonly isDepthLimit: boolean;
    readonly isBreadthLimit: boolean;
    readonly isTokenNotFound: boolean;
    readonly type: 'OuroborosDetected' | 'DepthLimit' | 'BreadthLimit' | 'TokenNotFound';
  }

  /** @name PalletAppPromotionError (421) */
  interface PalletAppPromotionError extends Enum {
    readonly isAdminNotSet: boolean;
    readonly isNoPermission: boolean;
    readonly isNotSufficientFunds: boolean;
    readonly isPendingForBlockOverflow: boolean;
    readonly isSponsorNotSet: boolean;
    readonly isIncorrectLockedBalanceOperation: boolean;
    readonly type: 'AdminNotSet' | 'NoPermission' | 'NotSufficientFunds' | 'PendingForBlockOverflow' | 'SponsorNotSet' | 'IncorrectLockedBalanceOperation';
  }

  /** @name PalletForeignAssetsModuleError (422) */
  interface PalletForeignAssetsModuleError extends Enum {
    readonly isBadLocation: boolean;
    readonly isMultiLocationExisted: boolean;
    readonly isAssetIdNotExists: boolean;
    readonly isAssetIdExisted: boolean;
    readonly type: 'BadLocation' | 'MultiLocationExisted' | 'AssetIdNotExists' | 'AssetIdExisted';
  }

  /** @name PalletEvmError (424) */
  interface PalletEvmError extends Enum {
    readonly isBalanceLow: boolean;
    readonly isFeeOverflow: boolean;
    readonly isPaymentOverflow: boolean;
    readonly isWithdrawFailed: boolean;
    readonly isGasPriceTooLow: boolean;
    readonly isInvalidNonce: boolean;
    readonly type: 'BalanceLow' | 'FeeOverflow' | 'PaymentOverflow' | 'WithdrawFailed' | 'GasPriceTooLow' | 'InvalidNonce';
  }

  /** @name FpRpcTransactionStatus (427) */
  interface FpRpcTransactionStatus extends Struct {
    readonly transactionHash: H256;
    readonly transactionIndex: u32;
    readonly from: H160;
    readonly to: Option<H160>;
    readonly contractAddress: Option<H160>;
    readonly logs: Vec<EthereumLog>;
    readonly logsBloom: EthbloomBloom;
  }

  /** @name EthbloomBloom (429) */
  interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (431) */
  interface EthereumReceiptReceiptV3 extends Enum {
    readonly isLegacy: boolean;
    readonly asLegacy: EthereumReceiptEip658ReceiptData;
    readonly isEip2930: boolean;
    readonly asEip2930: EthereumReceiptEip658ReceiptData;
    readonly isEip1559: boolean;
    readonly asEip1559: EthereumReceiptEip658ReceiptData;
    readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
  }

  /** @name EthereumReceiptEip658ReceiptData (432) */
  interface EthereumReceiptEip658ReceiptData extends Struct {
    readonly statusCode: u8;
    readonly usedGas: U256;
    readonly logsBloom: EthbloomBloom;
    readonly logs: Vec<EthereumLog>;
  }

  /** @name EthereumBlock (433) */
  interface EthereumBlock extends Struct {
    readonly header: EthereumHeader;
    readonly transactions: Vec<EthereumTransactionTransactionV2>;
    readonly ommers: Vec<EthereumHeader>;
  }

  /** @name EthereumHeader (434) */
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

  /** @name EthereumTypesHashH64 (435) */
  interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (440) */
  interface PalletEthereumError extends Enum {
    readonly isInvalidSignature: boolean;
    readonly isPreLogExists: boolean;
    readonly type: 'InvalidSignature' | 'PreLogExists';
  }

  /** @name PalletEvmCoderSubstrateError (441) */
  interface PalletEvmCoderSubstrateError extends Enum {
    readonly isOutOfGas: boolean;
    readonly isOutOfFund: boolean;
    readonly type: 'OutOfGas' | 'OutOfFund';
  }

  /** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr (442) */
  interface UpDataStructsSponsorshipStateBasicCrossAccountIdRepr extends Enum {
    readonly isDisabled: boolean;
    readonly isUnconfirmed: boolean;
    readonly asUnconfirmed: PalletEvmAccountBasicCrossAccountIdRepr;
    readonly isConfirmed: boolean;
    readonly asConfirmed: PalletEvmAccountBasicCrossAccountIdRepr;
    readonly type: 'Disabled' | 'Unconfirmed' | 'Confirmed';
  }

  /** @name PalletEvmContractHelpersSponsoringModeT (443) */
  interface PalletEvmContractHelpersSponsoringModeT extends Enum {
    readonly isDisabled: boolean;
    readonly isAllowlisted: boolean;
    readonly isGenerous: boolean;
    readonly type: 'Disabled' | 'Allowlisted' | 'Generous';
  }

  /** @name PalletEvmContractHelpersError (449) */
  interface PalletEvmContractHelpersError extends Enum {
    readonly isNoPermission: boolean;
    readonly isNoPendingSponsor: boolean;
    readonly isTooManyMethodsHaveSponsoredLimit: boolean;
    readonly type: 'NoPermission' | 'NoPendingSponsor' | 'TooManyMethodsHaveSponsoredLimit';
  }

  /** @name PalletEvmMigrationError (450) */
  interface PalletEvmMigrationError extends Enum {
    readonly isAccountNotEmpty: boolean;
    readonly isAccountIsNotMigrating: boolean;
    readonly isBadEvent: boolean;
    readonly type: 'AccountNotEmpty' | 'AccountIsNotMigrating' | 'BadEvent';
  }

  /** @name PalletMaintenanceError (451) */
  type PalletMaintenanceError = Null;

  /** @name SpRuntimeMultiSignature (453) */
  interface SpRuntimeMultiSignature extends Enum {
    readonly isEd25519: boolean;
    readonly asEd25519: SpCoreEd25519Signature;
    readonly isSr25519: boolean;
    readonly asSr25519: SpCoreSr25519Signature;
    readonly isEcdsa: boolean;
    readonly asEcdsa: SpCoreEcdsaSignature;
    readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
  }

  /** @name SpCoreEd25519Signature (454) */
  interface SpCoreEd25519Signature extends U8aFixed {}

  /** @name SpCoreSr25519Signature (456) */
  interface SpCoreSr25519Signature extends U8aFixed {}

  /** @name SpCoreEcdsaSignature (457) */
  interface SpCoreEcdsaSignature extends U8aFixed {}

  /** @name FrameSystemExtensionsCheckSpecVersion (460) */
  type FrameSystemExtensionsCheckSpecVersion = Null;

  /** @name FrameSystemExtensionsCheckTxVersion (461) */
  type FrameSystemExtensionsCheckTxVersion = Null;

  /** @name FrameSystemExtensionsCheckGenesis (462) */
  type FrameSystemExtensionsCheckGenesis = Null;

  /** @name FrameSystemExtensionsCheckNonce (465) */
  interface FrameSystemExtensionsCheckNonce extends Compact<u32> {}

  /** @name FrameSystemExtensionsCheckWeight (466) */
  type FrameSystemExtensionsCheckWeight = Null;

  /** @name OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance (467) */
  type OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance = Null;

  /** @name PalletTemplateTransactionPaymentChargeTransactionPayment (468) */
  interface PalletTemplateTransactionPaymentChargeTransactionPayment extends Compact<u128> {}

  /** @name OpalRuntimeRuntime (469) */
  type OpalRuntimeRuntime = Null;

  /** @name PalletEthereumFakeTransactionFinalizer (470) */
  type PalletEthereumFakeTransactionFinalizer = Null;

} // declare module
