// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Data } from '@polkadot/types';
import type { BTreeMap, BTreeSet, Bytes, Compact, Enum, Null, Option, Result, Struct, Text, U256, U8aFixed, Vec, bool, i64, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { Vote } from '@polkadot/types/interfaces/elections';
import type { AccountId32, Call, H160, H256, MultiAddress, Perbill } from '@polkadot/types/interfaces/runtime';
import type { Event } from '@polkadot/types/interfaces/system';

/** @name CumulusPalletDmpQueueCall */
export interface CumulusPalletDmpQueueCall extends Null {}

/** @name CumulusPalletDmpQueueEvent */
export interface CumulusPalletDmpQueueEvent extends Enum {
  readonly isStartedExport: boolean;
  readonly isExported: boolean;
  readonly asExported: {
    readonly page: u32;
  } & Struct;
  readonly isExportFailed: boolean;
  readonly asExportFailed: {
    readonly page: u32;
  } & Struct;
  readonly isCompletedExport: boolean;
  readonly isStartedOverweightExport: boolean;
  readonly isExportedOverweight: boolean;
  readonly asExportedOverweight: {
    readonly index: u64;
  } & Struct;
  readonly isExportOverweightFailed: boolean;
  readonly asExportOverweightFailed: {
    readonly index: u64;
  } & Struct;
  readonly isCompletedOverweightExport: boolean;
  readonly isStartedCleanup: boolean;
  readonly isCleanedSome: boolean;
  readonly asCleanedSome: {
    readonly keysRemoved: u32;
  } & Struct;
  readonly isCompleted: boolean;
  readonly asCompleted: {
    readonly error: bool;
  } & Struct;
  readonly type: 'StartedExport' | 'Exported' | 'ExportFailed' | 'CompletedExport' | 'StartedOverweightExport' | 'ExportedOverweight' | 'ExportOverweightFailed' | 'CompletedOverweightExport' | 'StartedCleanup' | 'CleanedSome' | 'Completed';
}

/** @name CumulusPalletDmpQueueMigrationState */
export interface CumulusPalletDmpQueueMigrationState extends Enum {
  readonly isNotStarted: boolean;
  readonly isStartedExport: boolean;
  readonly asStartedExport: {
    readonly nextBeginUsed: u32;
  } & Struct;
  readonly isCompletedExport: boolean;
  readonly isStartedOverweightExport: boolean;
  readonly asStartedOverweightExport: {
    readonly nextOverweightIndex: u64;
  } & Struct;
  readonly isCompletedOverweightExport: boolean;
  readonly isStartedCleanup: boolean;
  readonly asStartedCleanup: {
    readonly cursor: Option<Bytes>;
  } & Struct;
  readonly isCompleted: boolean;
  readonly type: 'NotStarted' | 'StartedExport' | 'CompletedExport' | 'StartedOverweightExport' | 'CompletedOverweightExport' | 'StartedCleanup' | 'Completed';
}

/** @name CumulusPalletParachainSystemCall */
export interface CumulusPalletParachainSystemCall extends Enum {
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
    readonly checkVersion: bool;
  } & Struct;
  readonly isEnactAuthorizedUpgrade: boolean;
  readonly asEnactAuthorizedUpgrade: {
    readonly code: Bytes;
  } & Struct;
  readonly type: 'SetValidationData' | 'SudoSendUpwardMessage' | 'AuthorizeUpgrade' | 'EnactAuthorizedUpgrade';
}

/** @name CumulusPalletParachainSystemError */
export interface CumulusPalletParachainSystemError extends Enum {
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

/** @name CumulusPalletParachainSystemEvent */
export interface CumulusPalletParachainSystemEvent extends Enum {
  readonly isValidationFunctionStored: boolean;
  readonly isValidationFunctionApplied: boolean;
  readonly asValidationFunctionApplied: {
    readonly relayChainBlockNum: u32;
  } & Struct;
  readonly isValidationFunctionDiscarded: boolean;
  readonly isDownwardMessagesReceived: boolean;
  readonly asDownwardMessagesReceived: {
    readonly count: u32;
  } & Struct;
  readonly isDownwardMessagesProcessed: boolean;
  readonly asDownwardMessagesProcessed: {
    readonly weightUsed: SpWeightsWeightV2Weight;
    readonly dmqHead: H256;
  } & Struct;
  readonly isUpwardMessageSent: boolean;
  readonly asUpwardMessageSent: {
    readonly messageHash: Option<U8aFixed>;
  } & Struct;
  readonly type: 'ValidationFunctionStored' | 'ValidationFunctionApplied' | 'ValidationFunctionDiscarded' | 'DownwardMessagesReceived' | 'DownwardMessagesProcessed' | 'UpwardMessageSent';
}

/** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot */
export interface CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot extends Struct {
  readonly dmqMqcHead: H256;
  readonly relayDispatchQueueRemainingCapacity: CumulusPalletParachainSystemRelayStateSnapshotRelayDispatchQueueRemainingCapacity;
  readonly ingressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV6AbridgedHrmpChannel]>>;
  readonly egressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV6AbridgedHrmpChannel]>>;
}

/** @name CumulusPalletParachainSystemRelayStateSnapshotRelayDispatchQueueRemainingCapacity */
export interface CumulusPalletParachainSystemRelayStateSnapshotRelayDispatchQueueRemainingCapacity extends Struct {
  readonly remainingCount: u32;
  readonly remainingSize: u32;
}

/** @name CumulusPalletParachainSystemUnincludedSegmentAncestor */
export interface CumulusPalletParachainSystemUnincludedSegmentAncestor extends Struct {
  readonly usedBandwidth: CumulusPalletParachainSystemUnincludedSegmentUsedBandwidth;
  readonly paraHeadHash: Option<H256>;
  readonly consumedGoAheadSignal: Option<PolkadotPrimitivesV6UpgradeGoAhead>;
}

/** @name CumulusPalletParachainSystemUnincludedSegmentHrmpChannelUpdate */
export interface CumulusPalletParachainSystemUnincludedSegmentHrmpChannelUpdate extends Struct {
  readonly msgCount: u32;
  readonly totalBytes: u32;
}

/** @name CumulusPalletParachainSystemUnincludedSegmentSegmentTracker */
export interface CumulusPalletParachainSystemUnincludedSegmentSegmentTracker extends Struct {
  readonly usedBandwidth: CumulusPalletParachainSystemUnincludedSegmentUsedBandwidth;
  readonly hrmpWatermark: Option<u32>;
  readonly consumedGoAheadSignal: Option<PolkadotPrimitivesV6UpgradeGoAhead>;
}

/** @name CumulusPalletParachainSystemUnincludedSegmentUsedBandwidth */
export interface CumulusPalletParachainSystemUnincludedSegmentUsedBandwidth extends Struct {
  readonly umpMsgCount: u32;
  readonly umpTotalBytes: u32;
  readonly hrmpOutgoing: BTreeMap<u32, CumulusPalletParachainSystemUnincludedSegmentHrmpChannelUpdate>;
}

/** @name CumulusPalletXcmCall */
export interface CumulusPalletXcmCall extends Null {}

/** @name CumulusPalletXcmEvent */
export interface CumulusPalletXcmEvent extends Enum {
  readonly isInvalidFormat: boolean;
  readonly asInvalidFormat: U8aFixed;
  readonly isUnsupportedVersion: boolean;
  readonly asUnsupportedVersion: U8aFixed;
  readonly isExecutedDownward: boolean;
  readonly asExecutedDownward: ITuple<[U8aFixed, StagingXcmV4TraitsOutcome]>;
  readonly type: 'InvalidFormat' | 'UnsupportedVersion' | 'ExecutedDownward';
}

/** @name CumulusPalletXcmOrigin */
export interface CumulusPalletXcmOrigin extends Enum {
  readonly isRelay: boolean;
  readonly isSiblingParachain: boolean;
  readonly asSiblingParachain: u32;
  readonly type: 'Relay' | 'SiblingParachain';
}

/** @name CumulusPalletXcmpQueueCall */
export interface CumulusPalletXcmpQueueCall extends Enum {
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
  readonly type: 'SuspendXcmExecution' | 'ResumeXcmExecution' | 'UpdateSuspendThreshold' | 'UpdateDropThreshold' | 'UpdateResumeThreshold';
}

/** @name CumulusPalletXcmpQueueError */
export interface CumulusPalletXcmpQueueError extends Enum {
  readonly isBadQueueConfig: boolean;
  readonly isAlreadySuspended: boolean;
  readonly isAlreadyResumed: boolean;
  readonly type: 'BadQueueConfig' | 'AlreadySuspended' | 'AlreadyResumed';
}

/** @name CumulusPalletXcmpQueueEvent */
export interface CumulusPalletXcmpQueueEvent extends Enum {
  readonly isXcmpMessageSent: boolean;
  readonly asXcmpMessageSent: {
    readonly messageHash: U8aFixed;
  } & Struct;
  readonly type: 'XcmpMessageSent';
}

/** @name CumulusPalletXcmpQueueOutboundChannelDetails */
export interface CumulusPalletXcmpQueueOutboundChannelDetails extends Struct {
  readonly recipient: u32;
  readonly state: CumulusPalletXcmpQueueOutboundState;
  readonly signalsExist: bool;
  readonly firstIndex: u16;
  readonly lastIndex: u16;
}

/** @name CumulusPalletXcmpQueueOutboundState */
export interface CumulusPalletXcmpQueueOutboundState extends Enum {
  readonly isOk: boolean;
  readonly isSuspended: boolean;
  readonly type: 'Ok' | 'Suspended';
}

/** @name CumulusPalletXcmpQueueQueueConfigData */
export interface CumulusPalletXcmpQueueQueueConfigData extends Struct {
  readonly suspendThreshold: u32;
  readonly dropThreshold: u32;
  readonly resumeThreshold: u32;
}

/** @name CumulusPrimitivesCoreAggregateMessageOrigin */
export interface CumulusPrimitivesCoreAggregateMessageOrigin extends Enum {
  readonly isHere: boolean;
  readonly isParent: boolean;
  readonly isSibling: boolean;
  readonly asSibling: u32;
  readonly type: 'Here' | 'Parent' | 'Sibling';
}

/** @name CumulusPrimitivesParachainInherentParachainInherentData */
export interface CumulusPrimitivesParachainInherentParachainInherentData extends Struct {
  readonly validationData: PolkadotPrimitivesV6PersistedValidationData;
  readonly relayChainState: SpTrieStorageProof;
  readonly downwardMessages: Vec<PolkadotCorePrimitivesInboundDownwardMessage>;
  readonly horizontalMessages: BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>;
}

/** @name EthbloomBloom */
export interface EthbloomBloom extends U8aFixed {}

/** @name EthereumBlock */
export interface EthereumBlock extends Struct {
  readonly header: EthereumHeader;
  readonly transactions: Vec<EthereumTransactionTransactionV2>;
  readonly ommers: Vec<EthereumHeader>;
}

/** @name EthereumHeader */
export interface EthereumHeader extends Struct {
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

/** @name EthereumLog */
export interface EthereumLog extends Struct {
  readonly address: H160;
  readonly topics: Vec<H256>;
  readonly data: Bytes;
}

/** @name EthereumReceiptEip658ReceiptData */
export interface EthereumReceiptEip658ReceiptData extends Struct {
  readonly statusCode: u8;
  readonly usedGas: U256;
  readonly logsBloom: EthbloomBloom;
  readonly logs: Vec<EthereumLog>;
}

/** @name EthereumReceiptReceiptV3 */
export interface EthereumReceiptReceiptV3 extends Enum {
  readonly isLegacy: boolean;
  readonly asLegacy: EthereumReceiptEip658ReceiptData;
  readonly isEip2930: boolean;
  readonly asEip2930: EthereumReceiptEip658ReceiptData;
  readonly isEip1559: boolean;
  readonly asEip1559: EthereumReceiptEip658ReceiptData;
  readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
}

/** @name EthereumTransactionAccessListItem */
export interface EthereumTransactionAccessListItem extends Struct {
  readonly address: H160;
  readonly storageKeys: Vec<H256>;
}

/** @name EthereumTransactionEip1559Transaction */
export interface EthereumTransactionEip1559Transaction extends Struct {
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

/** @name EthereumTransactionEip2930Transaction */
export interface EthereumTransactionEip2930Transaction extends Struct {
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

/** @name EthereumTransactionLegacyTransaction */
export interface EthereumTransactionLegacyTransaction extends Struct {
  readonly nonce: U256;
  readonly gasPrice: U256;
  readonly gasLimit: U256;
  readonly action: EthereumTransactionTransactionAction;
  readonly value: U256;
  readonly input: Bytes;
  readonly signature: EthereumTransactionTransactionSignature;
}

/** @name EthereumTransactionTransactionAction */
export interface EthereumTransactionTransactionAction extends Enum {
  readonly isCall: boolean;
  readonly asCall: H160;
  readonly isCreate: boolean;
  readonly type: 'Call' | 'Create';
}

/** @name EthereumTransactionTransactionSignature */
export interface EthereumTransactionTransactionSignature extends Struct {
  readonly v: u64;
  readonly r: H256;
  readonly s: H256;
}

/** @name EthereumTransactionTransactionV2 */
export interface EthereumTransactionTransactionV2 extends Enum {
  readonly isLegacy: boolean;
  readonly asLegacy: EthereumTransactionLegacyTransaction;
  readonly isEip2930: boolean;
  readonly asEip2930: EthereumTransactionEip2930Transaction;
  readonly isEip1559: boolean;
  readonly asEip1559: EthereumTransactionEip1559Transaction;
  readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
}

/** @name EthereumTypesHashH64 */
export interface EthereumTypesHashH64 extends U8aFixed {}

/** @name EvmCoreErrorExitError */
export interface EvmCoreErrorExitError extends Enum {
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
  readonly isMaxNonce: boolean;
  readonly isInvalidCode: boolean;
  readonly asInvalidCode: u8;
  readonly type: 'StackUnderflow' | 'StackOverflow' | 'InvalidJump' | 'InvalidRange' | 'DesignatedInvalid' | 'CallTooDeep' | 'CreateCollision' | 'CreateContractLimit' | 'OutOfOffset' | 'OutOfGas' | 'OutOfFund' | 'PcUnderflow' | 'CreateEmpty' | 'Other' | 'MaxNonce' | 'InvalidCode';
}

/** @name EvmCoreErrorExitFatal */
export interface EvmCoreErrorExitFatal extends Enum {
  readonly isNotSupported: boolean;
  readonly isUnhandledInterrupt: boolean;
  readonly isCallErrorAsFatal: boolean;
  readonly asCallErrorAsFatal: EvmCoreErrorExitError;
  readonly isOther: boolean;
  readonly asOther: Text;
  readonly type: 'NotSupported' | 'UnhandledInterrupt' | 'CallErrorAsFatal' | 'Other';
}

/** @name EvmCoreErrorExitReason */
export interface EvmCoreErrorExitReason extends Enum {
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

/** @name EvmCoreErrorExitRevert */
export interface EvmCoreErrorExitRevert extends Enum {
  readonly isReverted: boolean;
  readonly type: 'Reverted';
}

/** @name EvmCoreErrorExitSucceed */
export interface EvmCoreErrorExitSucceed extends Enum {
  readonly isStopped: boolean;
  readonly isReturned: boolean;
  readonly isSuicided: boolean;
  readonly type: 'Stopped' | 'Returned' | 'Suicided';
}

/** @name FpRpcTransactionStatus */
export interface FpRpcTransactionStatus extends Struct {
  readonly transactionHash: H256;
  readonly transactionIndex: u32;
  readonly from: H160;
  readonly to: Option<H160>;
  readonly contractAddress: Option<H160>;
  readonly logs: Vec<EthereumLog>;
  readonly logsBloom: EthbloomBloom;
}

/** @name FrameSupportDispatchDispatchClass */
export interface FrameSupportDispatchDispatchClass extends Enum {
  readonly isNormal: boolean;
  readonly isOperational: boolean;
  readonly isMandatory: boolean;
  readonly type: 'Normal' | 'Operational' | 'Mandatory';
}

/** @name FrameSupportDispatchDispatchInfo */
export interface FrameSupportDispatchDispatchInfo extends Struct {
  readonly weight: SpWeightsWeightV2Weight;
  readonly class: FrameSupportDispatchDispatchClass;
  readonly paysFee: FrameSupportDispatchPays;
}

/** @name FrameSupportDispatchPays */
export interface FrameSupportDispatchPays extends Enum {
  readonly isYes: boolean;
  readonly isNo: boolean;
  readonly type: 'Yes' | 'No';
}

/** @name FrameSupportDispatchPerDispatchClassU32 */
export interface FrameSupportDispatchPerDispatchClassU32 extends Struct {
  readonly normal: u32;
  readonly operational: u32;
  readonly mandatory: u32;
}

/** @name FrameSupportDispatchPerDispatchClassWeight */
export interface FrameSupportDispatchPerDispatchClassWeight extends Struct {
  readonly normal: SpWeightsWeightV2Weight;
  readonly operational: SpWeightsWeightV2Weight;
  readonly mandatory: SpWeightsWeightV2Weight;
}

/** @name FrameSupportDispatchPerDispatchClassWeightsPerClass */
export interface FrameSupportDispatchPerDispatchClassWeightsPerClass extends Struct {
  readonly normal: FrameSystemLimitsWeightsPerClass;
  readonly operational: FrameSystemLimitsWeightsPerClass;
  readonly mandatory: FrameSystemLimitsWeightsPerClass;
}

/** @name FrameSupportDispatchRawOrigin */
export interface FrameSupportDispatchRawOrigin extends Enum {
  readonly isRoot: boolean;
  readonly isSigned: boolean;
  readonly asSigned: AccountId32;
  readonly isNone: boolean;
  readonly type: 'Root' | 'Signed' | 'None';
}

/** @name FrameSupportMessagesProcessMessageError */
export interface FrameSupportMessagesProcessMessageError extends Enum {
  readonly isBadFormat: boolean;
  readonly isCorrupt: boolean;
  readonly isUnsupported: boolean;
  readonly isOverweight: boolean;
  readonly asOverweight: SpWeightsWeightV2Weight;
  readonly isYield: boolean;
  readonly type: 'BadFormat' | 'Corrupt' | 'Unsupported' | 'Overweight' | 'Yield';
}

/** @name FrameSupportPalletId */
export interface FrameSupportPalletId extends U8aFixed {}

/** @name FrameSupportPreimagesBounded */
export interface FrameSupportPreimagesBounded extends Enum {
  readonly isLegacy: boolean;
  readonly asLegacy: {
    readonly hash_: H256;
  } & Struct;
  readonly isInline: boolean;
  readonly asInline: Bytes;
  readonly isLookup: boolean;
  readonly asLookup: {
    readonly hash_: H256;
    readonly len: u32;
  } & Struct;
  readonly type: 'Legacy' | 'Inline' | 'Lookup';
}

/** @name FrameSupportScheduleDispatchTime */
export interface FrameSupportScheduleDispatchTime extends Enum {
  readonly isAt: boolean;
  readonly asAt: u32;
  readonly isAfter: boolean;
  readonly asAfter: u32;
  readonly type: 'At' | 'After';
}

/** @name FrameSupportTokensMiscBalanceStatus */
export interface FrameSupportTokensMiscBalanceStatus extends Enum {
  readonly isFree: boolean;
  readonly isReserved: boolean;
  readonly type: 'Free' | 'Reserved';
}

/** @name FrameSystemAccountInfo */
export interface FrameSystemAccountInfo extends Struct {
  readonly nonce: u32;
  readonly consumers: u32;
  readonly providers: u32;
  readonly sufficients: u32;
  readonly data: PalletBalancesAccountData;
}

/** @name FrameSystemCall */
export interface FrameSystemCall extends Enum {
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
  readonly isAuthorizeUpgrade: boolean;
  readonly asAuthorizeUpgrade: {
    readonly codeHash: H256;
  } & Struct;
  readonly isAuthorizeUpgradeWithoutChecks: boolean;
  readonly asAuthorizeUpgradeWithoutChecks: {
    readonly codeHash: H256;
  } & Struct;
  readonly isApplyAuthorizedUpgrade: boolean;
  readonly asApplyAuthorizedUpgrade: {
    readonly code: Bytes;
  } & Struct;
  readonly type: 'Remark' | 'SetHeapPages' | 'SetCode' | 'SetCodeWithoutChecks' | 'SetStorage' | 'KillStorage' | 'KillPrefix' | 'RemarkWithEvent' | 'AuthorizeUpgrade' | 'AuthorizeUpgradeWithoutChecks' | 'ApplyAuthorizedUpgrade';
}

/** @name FrameSystemCodeUpgradeAuthorization */
export interface FrameSystemCodeUpgradeAuthorization extends Struct {
  readonly codeHash: H256;
  readonly checkVersion: bool;
}

/** @name FrameSystemError */
export interface FrameSystemError extends Enum {
  readonly isInvalidSpecName: boolean;
  readonly isSpecVersionNeedsToIncrease: boolean;
  readonly isFailedToExtractRuntimeVersion: boolean;
  readonly isNonDefaultComposite: boolean;
  readonly isNonZeroRefCount: boolean;
  readonly isCallFiltered: boolean;
  readonly isMultiBlockMigrationsOngoing: boolean;
  readonly isNothingAuthorized: boolean;
  readonly isUnauthorized: boolean;
  readonly type: 'InvalidSpecName' | 'SpecVersionNeedsToIncrease' | 'FailedToExtractRuntimeVersion' | 'NonDefaultComposite' | 'NonZeroRefCount' | 'CallFiltered' | 'MultiBlockMigrationsOngoing' | 'NothingAuthorized' | 'Unauthorized';
}

/** @name FrameSystemEvent */
export interface FrameSystemEvent extends Enum {
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
  readonly isUpgradeAuthorized: boolean;
  readonly asUpgradeAuthorized: {
    readonly codeHash: H256;
    readonly checkVersion: bool;
  } & Struct;
  readonly type: 'ExtrinsicSuccess' | 'ExtrinsicFailed' | 'CodeUpdated' | 'NewAccount' | 'KilledAccount' | 'Remarked' | 'UpgradeAuthorized';
}

/** @name FrameSystemEventRecord */
export interface FrameSystemEventRecord extends Struct {
  readonly phase: FrameSystemPhase;
  readonly event: Event;
  readonly topics: Vec<H256>;
}

/** @name FrameSystemExtensionsCheckGenesis */
export interface FrameSystemExtensionsCheckGenesis extends Null {}

/** @name FrameSystemExtensionsCheckSpecVersion */
export interface FrameSystemExtensionsCheckSpecVersion extends Null {}

/** @name FrameSystemExtensionsCheckTxVersion */
export interface FrameSystemExtensionsCheckTxVersion extends Null {}

/** @name FrameSystemExtensionsCheckWeight */
export interface FrameSystemExtensionsCheckWeight extends Null {}

/** @name FrameSystemLastRuntimeUpgradeInfo */
export interface FrameSystemLastRuntimeUpgradeInfo extends Struct {
  readonly specVersion: Compact<u32>;
  readonly specName: Text;
}

/** @name FrameSystemLimitsBlockLength */
export interface FrameSystemLimitsBlockLength extends Struct {
  readonly max: FrameSupportDispatchPerDispatchClassU32;
}

/** @name FrameSystemLimitsBlockWeights */
export interface FrameSystemLimitsBlockWeights extends Struct {
  readonly baseBlock: SpWeightsWeightV2Weight;
  readonly maxBlock: SpWeightsWeightV2Weight;
  readonly perClass: FrameSupportDispatchPerDispatchClassWeightsPerClass;
}

/** @name FrameSystemLimitsWeightsPerClass */
export interface FrameSystemLimitsWeightsPerClass extends Struct {
  readonly baseExtrinsic: SpWeightsWeightV2Weight;
  readonly maxExtrinsic: Option<SpWeightsWeightV2Weight>;
  readonly maxTotal: Option<SpWeightsWeightV2Weight>;
  readonly reserved: Option<SpWeightsWeightV2Weight>;
}

/** @name FrameSystemPhase */
export interface FrameSystemPhase extends Enum {
  readonly isApplyExtrinsic: boolean;
  readonly asApplyExtrinsic: u32;
  readonly isFinalization: boolean;
  readonly isInitialization: boolean;
  readonly type: 'ApplyExtrinsic' | 'Finalization' | 'Initialization';
}

/** @name OpalRuntimeOriginCaller */
export interface OpalRuntimeOriginCaller extends Enum {
  readonly isSystem: boolean;
  readonly asSystem: FrameSupportDispatchRawOrigin;
  readonly isVoid: boolean;
  readonly asVoid: SpCoreVoid;
  readonly isCouncil: boolean;
  readonly asCouncil: PalletCollectiveRawOrigin;
  readonly isTechnicalCommittee: boolean;
  readonly asTechnicalCommittee: PalletCollectiveRawOrigin;
  readonly isPolkadotXcm: boolean;
  readonly asPolkadotXcm: PalletXcmOrigin;
  readonly isCumulusXcm: boolean;
  readonly asCumulusXcm: CumulusPalletXcmOrigin;
  readonly isFinancialCouncil: boolean;
  readonly asFinancialCouncil: PalletCollectiveRawOrigin;
  readonly isOrigins: boolean;
  readonly asOrigins: PalletGovOriginsOrigin;
  readonly isEthereum: boolean;
  readonly asEthereum: PalletEthereumRawOrigin;
  readonly type: 'System' | 'Void' | 'Council' | 'TechnicalCommittee' | 'PolkadotXcm' | 'CumulusXcm' | 'FinancialCouncil' | 'Origins' | 'Ethereum';
}

/** @name OpalRuntimeRuntime */
export interface OpalRuntimeRuntime extends Null {}

/** @name OpalRuntimeRuntimeCommonIdentityDisableIdentityCalls */
export interface OpalRuntimeRuntimeCommonIdentityDisableIdentityCalls extends Null {}

/** @name OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance */
export interface OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance extends Null {}

/** @name OpalRuntimeRuntimeCommonSessionKeys */
export interface OpalRuntimeRuntimeCommonSessionKeys extends Struct {
  readonly aura: SpConsensusAuraSr25519AppSr25519Public;
}

/** @name OpalRuntimeRuntimeHoldReason */
export interface OpalRuntimeRuntimeHoldReason extends Enum {
  readonly isStateTrieMigration: boolean;
  readonly asStateTrieMigration: PalletStateTrieMigrationHoldReason;
  readonly isCollatorSelection: boolean;
  readonly asCollatorSelection: PalletCollatorSelectionHoldReason;
  readonly isPreimage: boolean;
  readonly asPreimage: PalletPreimageHoldReason;
  readonly type: 'StateTrieMigration' | 'CollatorSelection' | 'Preimage';
}

/** @name OrmlVestingModuleCall */
export interface OrmlVestingModuleCall extends Enum {
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

/** @name OrmlVestingModuleError */
export interface OrmlVestingModuleError extends Enum {
  readonly isZeroVestingPeriod: boolean;
  readonly isZeroVestingPeriodCount: boolean;
  readonly isInsufficientBalanceToLock: boolean;
  readonly isTooManyVestingSchedules: boolean;
  readonly isAmountLow: boolean;
  readonly isMaxVestingSchedulesExceeded: boolean;
  readonly type: 'ZeroVestingPeriod' | 'ZeroVestingPeriodCount' | 'InsufficientBalanceToLock' | 'TooManyVestingSchedules' | 'AmountLow' | 'MaxVestingSchedulesExceeded';
}

/** @name OrmlVestingModuleEvent */
export interface OrmlVestingModuleEvent extends Enum {
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

/** @name OrmlVestingVestingSchedule */
export interface OrmlVestingVestingSchedule extends Struct {
  readonly start: u32;
  readonly period: u32;
  readonly periodCount: u32;
  readonly perPeriod: Compact<u128>;
}

/** @name OrmlXtokensModuleCall */
export interface OrmlXtokensModuleCall extends Enum {
  readonly isTransfer: boolean;
  readonly asTransfer: {
    readonly currencyId: u32;
    readonly amount: u128;
    readonly dest: XcmVersionedLocation;
    readonly destWeightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isTransferMultiasset: boolean;
  readonly asTransferMultiasset: {
    readonly asset: XcmVersionedAsset;
    readonly dest: XcmVersionedLocation;
    readonly destWeightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isTransferWithFee: boolean;
  readonly asTransferWithFee: {
    readonly currencyId: u32;
    readonly amount: u128;
    readonly fee: u128;
    readonly dest: XcmVersionedLocation;
    readonly destWeightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isTransferMultiassetWithFee: boolean;
  readonly asTransferMultiassetWithFee: {
    readonly asset: XcmVersionedAsset;
    readonly fee: XcmVersionedAsset;
    readonly dest: XcmVersionedLocation;
    readonly destWeightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isTransferMulticurrencies: boolean;
  readonly asTransferMulticurrencies: {
    readonly currencies: Vec<ITuple<[u32, u128]>>;
    readonly feeItem: u32;
    readonly dest: XcmVersionedLocation;
    readonly destWeightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isTransferMultiassets: boolean;
  readonly asTransferMultiassets: {
    readonly assets: XcmVersionedAssets;
    readonly feeItem: u32;
    readonly dest: XcmVersionedLocation;
    readonly destWeightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly type: 'Transfer' | 'TransferMultiasset' | 'TransferWithFee' | 'TransferMultiassetWithFee' | 'TransferMulticurrencies' | 'TransferMultiassets';
}

/** @name OrmlXtokensModuleError */
export interface OrmlXtokensModuleError extends Enum {
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
  readonly isNotSupportedLocation: boolean;
  readonly isMinXcmFeeNotDefined: boolean;
  readonly isRateLimited: boolean;
  readonly type: 'AssetHasNoReserve' | 'NotCrossChainTransfer' | 'InvalidDest' | 'NotCrossChainTransferableCurrency' | 'UnweighableMessage' | 'XcmExecutionFailed' | 'CannotReanchor' | 'InvalidAncestry' | 'InvalidAsset' | 'DestinationNotInvertible' | 'BadVersion' | 'DistinctReserveForAssetAndFee' | 'ZeroFee' | 'ZeroAmount' | 'TooManyAssetsBeingSent' | 'AssetIndexNonExistent' | 'FeeNotEnough' | 'NotSupportedLocation' | 'MinXcmFeeNotDefined' | 'RateLimited';
}

/** @name OrmlXtokensModuleEvent */
export interface OrmlXtokensModuleEvent extends Enum {
  readonly isTransferredAssets: boolean;
  readonly asTransferredAssets: {
    readonly sender: AccountId32;
    readonly assets: StagingXcmV4AssetAssets;
    readonly fee: StagingXcmV4Asset;
    readonly dest: StagingXcmV4Location;
  } & Struct;
  readonly type: 'TransferredAssets';
}

/** @name PalletAppPromotionCall */
export interface PalletAppPromotionCall extends Enum {
  readonly isSetAdminAddress: boolean;
  readonly asSetAdminAddress: {
    readonly admin: PalletEvmAccountBasicCrossAccountIdRepr;
  } & Struct;
  readonly isStake: boolean;
  readonly asStake: {
    readonly amount: u128;
  } & Struct;
  readonly isUnstakeAll: boolean;
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
  readonly isUnstakePartial: boolean;
  readonly asUnstakePartial: {
    readonly amount: u128;
  } & Struct;
  readonly isResolveSkippedBlocks: boolean;
  readonly asResolveSkippedBlocks: {
    readonly pendingBlocks: Vec<u32>;
  } & Struct;
  readonly type: 'SetAdminAddress' | 'Stake' | 'UnstakeAll' | 'SponsorCollection' | 'StopSponsoringCollection' | 'SponsorContract' | 'StopSponsoringContract' | 'PayoutStakers' | 'UnstakePartial' | 'ResolveSkippedBlocks';
}

/** @name PalletAppPromotionError */
export interface PalletAppPromotionError extends Enum {
  readonly isAdminNotSet: boolean;
  readonly isNoPermission: boolean;
  readonly isNotSufficientFunds: boolean;
  readonly isPendingForBlockOverflow: boolean;
  readonly isSponsorNotSet: boolean;
  readonly isInsufficientStakedBalance: boolean;
  readonly isInconsistencyState: boolean;
  readonly type: 'AdminNotSet' | 'NoPermission' | 'NotSufficientFunds' | 'PendingForBlockOverflow' | 'SponsorNotSet' | 'InsufficientStakedBalance' | 'InconsistencyState';
}

/** @name PalletAppPromotionEvent */
export interface PalletAppPromotionEvent extends Enum {
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

/** @name PalletBalancesAccountData */
export interface PalletBalancesAccountData extends Struct {
  readonly free: u128;
  readonly reserved: u128;
  readonly frozen: u128;
  readonly flags: u128;
}

/** @name PalletBalancesAdjustmentDirection */
export interface PalletBalancesAdjustmentDirection extends Enum {
  readonly isIncrease: boolean;
  readonly isDecrease: boolean;
  readonly type: 'Increase' | 'Decrease';
}

/** @name PalletBalancesBalanceLock */
export interface PalletBalancesBalanceLock extends Struct {
  readonly id: U8aFixed;
  readonly amount: u128;
  readonly reasons: PalletBalancesReasons;
}

/** @name PalletBalancesCall */
export interface PalletBalancesCall extends Enum {
  readonly isTransferAllowDeath: boolean;
  readonly asTransferAllowDeath: {
    readonly dest: MultiAddress;
    readonly value: Compact<u128>;
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
  readonly isUpgradeAccounts: boolean;
  readonly asUpgradeAccounts: {
    readonly who: Vec<AccountId32>;
  } & Struct;
  readonly isForceSetBalance: boolean;
  readonly asForceSetBalance: {
    readonly who: MultiAddress;
    readonly newFree: Compact<u128>;
  } & Struct;
  readonly isForceAdjustTotalIssuance: boolean;
  readonly asForceAdjustTotalIssuance: {
    readonly direction: PalletBalancesAdjustmentDirection;
    readonly delta: Compact<u128>;
  } & Struct;
  readonly type: 'TransferAllowDeath' | 'ForceTransfer' | 'TransferKeepAlive' | 'TransferAll' | 'ForceUnreserve' | 'UpgradeAccounts' | 'ForceSetBalance' | 'ForceAdjustTotalIssuance';
}

/** @name PalletBalancesError */
export interface PalletBalancesError extends Enum {
  readonly isVestingBalance: boolean;
  readonly isLiquidityRestrictions: boolean;
  readonly isInsufficientBalance: boolean;
  readonly isExistentialDeposit: boolean;
  readonly isExpendability: boolean;
  readonly isExistingVestingSchedule: boolean;
  readonly isDeadAccount: boolean;
  readonly isTooManyReserves: boolean;
  readonly isTooManyHolds: boolean;
  readonly isTooManyFreezes: boolean;
  readonly isIssuanceDeactivated: boolean;
  readonly isDeltaZero: boolean;
  readonly type: 'VestingBalance' | 'LiquidityRestrictions' | 'InsufficientBalance' | 'ExistentialDeposit' | 'Expendability' | 'ExistingVestingSchedule' | 'DeadAccount' | 'TooManyReserves' | 'TooManyHolds' | 'TooManyFreezes' | 'IssuanceDeactivated' | 'DeltaZero';
}

/** @name PalletBalancesEvent */
export interface PalletBalancesEvent extends Enum {
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
  readonly isMinted: boolean;
  readonly asMinted: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isBurned: boolean;
  readonly asBurned: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isSuspended: boolean;
  readonly asSuspended: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isRestored: boolean;
  readonly asRestored: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isUpgraded: boolean;
  readonly asUpgraded: {
    readonly who: AccountId32;
  } & Struct;
  readonly isIssued: boolean;
  readonly asIssued: {
    readonly amount: u128;
  } & Struct;
  readonly isRescinded: boolean;
  readonly asRescinded: {
    readonly amount: u128;
  } & Struct;
  readonly isLocked: boolean;
  readonly asLocked: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isUnlocked: boolean;
  readonly asUnlocked: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isFrozen: boolean;
  readonly asFrozen: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isThawed: boolean;
  readonly asThawed: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isTotalIssuanceForced: boolean;
  readonly asTotalIssuanceForced: {
    readonly old: u128;
    readonly new_: u128;
  } & Struct;
  readonly type: 'Endowed' | 'DustLost' | 'Transfer' | 'BalanceSet' | 'Reserved' | 'Unreserved' | 'ReserveRepatriated' | 'Deposit' | 'Withdraw' | 'Slashed' | 'Minted' | 'Burned' | 'Suspended' | 'Restored' | 'Upgraded' | 'Issued' | 'Rescinded' | 'Locked' | 'Unlocked' | 'Frozen' | 'Thawed' | 'TotalIssuanceForced';
}

/** @name PalletBalancesIdAmount */
export interface PalletBalancesIdAmount extends Struct {
  readonly id: U8aFixed;
  readonly amount: u128;
}

/** @name PalletBalancesReasons */
export interface PalletBalancesReasons extends Enum {
  readonly isFee: boolean;
  readonly isMisc: boolean;
  readonly isAll: boolean;
  readonly type: 'Fee' | 'Misc' | 'All';
}

/** @name PalletBalancesReserveData */
export interface PalletBalancesReserveData extends Struct {
  readonly id: U8aFixed;
  readonly amount: u128;
}

/** @name PalletCollatorSelectionCall */
export interface PalletCollatorSelectionCall extends Enum {
  readonly isAddInvulnerable: boolean;
  readonly asAddInvulnerable: {
    readonly new_: AccountId32;
  } & Struct;
  readonly isRemoveInvulnerable: boolean;
  readonly asRemoveInvulnerable: {
    readonly who: AccountId32;
  } & Struct;
  readonly isGetLicense: boolean;
  readonly isOnboard: boolean;
  readonly isOffboard: boolean;
  readonly isReleaseLicense: boolean;
  readonly isForceReleaseLicense: boolean;
  readonly asForceReleaseLicense: {
    readonly who: AccountId32;
  } & Struct;
  readonly type: 'AddInvulnerable' | 'RemoveInvulnerable' | 'GetLicense' | 'Onboard' | 'Offboard' | 'ReleaseLicense' | 'ForceReleaseLicense';
}

/** @name PalletCollatorSelectionError */
export interface PalletCollatorSelectionError extends Enum {
  readonly isTooManyCandidates: boolean;
  readonly isUnknown: boolean;
  readonly isPermission: boolean;
  readonly isAlreadyHoldingLicense: boolean;
  readonly isNoLicense: boolean;
  readonly isAlreadyCandidate: boolean;
  readonly isNotCandidate: boolean;
  readonly isTooManyInvulnerables: boolean;
  readonly isTooFewInvulnerables: boolean;
  readonly isAlreadyInvulnerable: boolean;
  readonly isNotInvulnerable: boolean;
  readonly isNoAssociatedValidatorId: boolean;
  readonly isValidatorNotRegistered: boolean;
  readonly type: 'TooManyCandidates' | 'Unknown' | 'Permission' | 'AlreadyHoldingLicense' | 'NoLicense' | 'AlreadyCandidate' | 'NotCandidate' | 'TooManyInvulnerables' | 'TooFewInvulnerables' | 'AlreadyInvulnerable' | 'NotInvulnerable' | 'NoAssociatedValidatorId' | 'ValidatorNotRegistered';
}

/** @name PalletCollatorSelectionEvent */
export interface PalletCollatorSelectionEvent extends Enum {
  readonly isInvulnerableAdded: boolean;
  readonly asInvulnerableAdded: {
    readonly invulnerable: AccountId32;
  } & Struct;
  readonly isInvulnerableRemoved: boolean;
  readonly asInvulnerableRemoved: {
    readonly invulnerable: AccountId32;
  } & Struct;
  readonly isLicenseObtained: boolean;
  readonly asLicenseObtained: {
    readonly accountId: AccountId32;
    readonly deposit: u128;
  } & Struct;
  readonly isLicenseReleased: boolean;
  readonly asLicenseReleased: {
    readonly accountId: AccountId32;
    readonly depositReturned: u128;
  } & Struct;
  readonly isCandidateAdded: boolean;
  readonly asCandidateAdded: {
    readonly accountId: AccountId32;
  } & Struct;
  readonly isCandidateRemoved: boolean;
  readonly asCandidateRemoved: {
    readonly accountId: AccountId32;
  } & Struct;
  readonly type: 'InvulnerableAdded' | 'InvulnerableRemoved' | 'LicenseObtained' | 'LicenseReleased' | 'CandidateAdded' | 'CandidateRemoved';
}

/** @name PalletCollatorSelectionHoldReason */
export interface PalletCollatorSelectionHoldReason extends Enum {
  readonly isLicenseBond: boolean;
  readonly type: 'LicenseBond';
}

/** @name PalletCollectiveCall */
export interface PalletCollectiveCall extends Enum {
  readonly isSetMembers: boolean;
  readonly asSetMembers: {
    readonly newMembers: Vec<AccountId32>;
    readonly prime: Option<AccountId32>;
    readonly oldCount: u32;
  } & Struct;
  readonly isExecute: boolean;
  readonly asExecute: {
    readonly proposal: Call;
    readonly lengthBound: Compact<u32>;
  } & Struct;
  readonly isPropose: boolean;
  readonly asPropose: {
    readonly threshold: Compact<u32>;
    readonly proposal: Call;
    readonly lengthBound: Compact<u32>;
  } & Struct;
  readonly isVote: boolean;
  readonly asVote: {
    readonly proposal: H256;
    readonly index: Compact<u32>;
    readonly approve: bool;
  } & Struct;
  readonly isDisapproveProposal: boolean;
  readonly asDisapproveProposal: {
    readonly proposalHash: H256;
  } & Struct;
  readonly isClose: boolean;
  readonly asClose: {
    readonly proposalHash: H256;
    readonly index: Compact<u32>;
    readonly proposalWeightBound: SpWeightsWeightV2Weight;
    readonly lengthBound: Compact<u32>;
  } & Struct;
  readonly type: 'SetMembers' | 'Execute' | 'Propose' | 'Vote' | 'DisapproveProposal' | 'Close';
}

/** @name PalletCollectiveError */
export interface PalletCollectiveError extends Enum {
  readonly isNotMember: boolean;
  readonly isDuplicateProposal: boolean;
  readonly isProposalMissing: boolean;
  readonly isWrongIndex: boolean;
  readonly isDuplicateVote: boolean;
  readonly isAlreadyInitialized: boolean;
  readonly isTooEarly: boolean;
  readonly isTooManyProposals: boolean;
  readonly isWrongProposalWeight: boolean;
  readonly isWrongProposalLength: boolean;
  readonly isPrimeAccountNotMember: boolean;
  readonly type: 'NotMember' | 'DuplicateProposal' | 'ProposalMissing' | 'WrongIndex' | 'DuplicateVote' | 'AlreadyInitialized' | 'TooEarly' | 'TooManyProposals' | 'WrongProposalWeight' | 'WrongProposalLength' | 'PrimeAccountNotMember';
}

/** @name PalletCollectiveEvent */
export interface PalletCollectiveEvent extends Enum {
  readonly isProposed: boolean;
  readonly asProposed: {
    readonly account: AccountId32;
    readonly proposalIndex: u32;
    readonly proposalHash: H256;
    readonly threshold: u32;
  } & Struct;
  readonly isVoted: boolean;
  readonly asVoted: {
    readonly account: AccountId32;
    readonly proposalHash: H256;
    readonly voted: bool;
    readonly yes: u32;
    readonly no: u32;
  } & Struct;
  readonly isApproved: boolean;
  readonly asApproved: {
    readonly proposalHash: H256;
  } & Struct;
  readonly isDisapproved: boolean;
  readonly asDisapproved: {
    readonly proposalHash: H256;
  } & Struct;
  readonly isExecuted: boolean;
  readonly asExecuted: {
    readonly proposalHash: H256;
    readonly result: Result<Null, SpRuntimeDispatchError>;
  } & Struct;
  readonly isMemberExecuted: boolean;
  readonly asMemberExecuted: {
    readonly proposalHash: H256;
    readonly result: Result<Null, SpRuntimeDispatchError>;
  } & Struct;
  readonly isClosed: boolean;
  readonly asClosed: {
    readonly proposalHash: H256;
    readonly yes: u32;
    readonly no: u32;
  } & Struct;
  readonly type: 'Proposed' | 'Voted' | 'Approved' | 'Disapproved' | 'Executed' | 'MemberExecuted' | 'Closed';
}

/** @name PalletCollectiveRawOrigin */
export interface PalletCollectiveRawOrigin extends Enum {
  readonly isMembers: boolean;
  readonly asMembers: ITuple<[u32, u32]>;
  readonly isMember: boolean;
  readonly asMember: AccountId32;
  readonly isPhantom: boolean;
  readonly type: 'Members' | 'Member' | 'Phantom';
}

/** @name PalletCollectiveVotes */
export interface PalletCollectiveVotes extends Struct {
  readonly index: u32;
  readonly threshold: u32;
  readonly ayes: Vec<AccountId32>;
  readonly nays: Vec<AccountId32>;
  readonly end: u32;
}

/** @name PalletCommonError */
export interface PalletCommonError extends Enum {
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
  readonly isAddressIsNotEthMirror: boolean;
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
  readonly isFungibleItemsHaveNoId: boolean;
  readonly isNotFungibleDataUsedToMintFungibleCollectionToken: boolean;
  readonly type: 'CollectionNotFound' | 'MustBeTokenOwner' | 'NoPermission' | 'CantDestroyNotEmptyCollection' | 'PublicMintingNotAllowed' | 'AddressNotInAllowlist' | 'CollectionNameLimitExceeded' | 'CollectionDescriptionLimitExceeded' | 'CollectionTokenPrefixLimitExceeded' | 'TotalCollectionsLimitExceeded' | 'CollectionAdminCountExceeded' | 'CollectionLimitBoundsExceeded' | 'OwnerPermissionsCantBeReverted' | 'TransferNotAllowed' | 'AccountTokenLimitExceeded' | 'CollectionTokenLimitExceeded' | 'MetadataFlagFrozen' | 'TokenNotFound' | 'TokenValueTooLow' | 'ApprovedValueTooLow' | 'CantApproveMoreThanOwned' | 'AddressIsNotEthMirror' | 'AddressIsZero' | 'UnsupportedOperation' | 'NotSufficientFounds' | 'UserIsNotAllowedToNest' | 'SourceCollectionIsNotAllowedToNest' | 'CollectionFieldSizeExceeded' | 'NoSpaceForProperty' | 'PropertyLimitReached' | 'PropertyKeyIsTooLong' | 'InvalidCharacterInPropertyKey' | 'EmptyPropertyKey' | 'CollectionIsExternal' | 'CollectionIsInternal' | 'ConfirmSponsorshipFail' | 'UserIsNotCollectionAdmin' | 'FungibleItemsHaveNoId' | 'NotFungibleDataUsedToMintFungibleCollectionToken';
}

/** @name PalletCommonEvent */
export interface PalletCommonEvent extends Enum {
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

/** @name PalletConfigurationAppPromotionConfiguration */
export interface PalletConfigurationAppPromotionConfiguration extends Struct {
  readonly recalculationInterval: Option<u32>;
  readonly pendingInterval: Option<u32>;
  readonly intervalIncome: Option<Perbill>;
  readonly maxStakersPerCalculation: Option<u8>;
}

/** @name PalletConfigurationCall */
export interface PalletConfigurationCall extends Enum {
  readonly isSetWeightToFeeCoefficientOverride: boolean;
  readonly asSetWeightToFeeCoefficientOverride: {
    readonly coeff: Option<u64>;
  } & Struct;
  readonly isSetMinGasPriceOverride: boolean;
  readonly asSetMinGasPriceOverride: {
    readonly coeff: Option<u64>;
  } & Struct;
  readonly isSetAppPromotionConfigurationOverride: boolean;
  readonly asSetAppPromotionConfigurationOverride: {
    readonly configuration: PalletConfigurationAppPromotionConfiguration;
  } & Struct;
  readonly isSetCollatorSelectionDesiredCollators: boolean;
  readonly asSetCollatorSelectionDesiredCollators: {
    readonly max: Option<u32>;
  } & Struct;
  readonly isSetCollatorSelectionLicenseBond: boolean;
  readonly asSetCollatorSelectionLicenseBond: {
    readonly amount: Option<u128>;
  } & Struct;
  readonly isSetCollatorSelectionKickThreshold: boolean;
  readonly asSetCollatorSelectionKickThreshold: {
    readonly threshold: Option<u32>;
  } & Struct;
  readonly type: 'SetWeightToFeeCoefficientOverride' | 'SetMinGasPriceOverride' | 'SetAppPromotionConfigurationOverride' | 'SetCollatorSelectionDesiredCollators' | 'SetCollatorSelectionLicenseBond' | 'SetCollatorSelectionKickThreshold';
}

/** @name PalletConfigurationError */
export interface PalletConfigurationError extends Enum {
  readonly isInconsistentConfiguration: boolean;
  readonly type: 'InconsistentConfiguration';
}

/** @name PalletConfigurationEvent */
export interface PalletConfigurationEvent extends Enum {
  readonly isNewDesiredCollators: boolean;
  readonly asNewDesiredCollators: {
    readonly desiredCollators: Option<u32>;
  } & Struct;
  readonly isNewCollatorLicenseBond: boolean;
  readonly asNewCollatorLicenseBond: {
    readonly bondCost: Option<u128>;
  } & Struct;
  readonly isNewCollatorKickThreshold: boolean;
  readonly asNewCollatorKickThreshold: {
    readonly lengthInBlocks: Option<u32>;
  } & Struct;
  readonly type: 'NewDesiredCollators' | 'NewCollatorLicenseBond' | 'NewCollatorKickThreshold';
}

/** @name PalletDemocracyCall */
export interface PalletDemocracyCall extends Enum {
  readonly isPropose: boolean;
  readonly asPropose: {
    readonly proposal: FrameSupportPreimagesBounded;
    readonly value: Compact<u128>;
  } & Struct;
  readonly isSecond: boolean;
  readonly asSecond: {
    readonly proposal: Compact<u32>;
  } & Struct;
  readonly isVote: boolean;
  readonly asVote: {
    readonly refIndex: Compact<u32>;
    readonly vote: PalletDemocracyVoteAccountVote;
  } & Struct;
  readonly isEmergencyCancel: boolean;
  readonly asEmergencyCancel: {
    readonly refIndex: u32;
  } & Struct;
  readonly isExternalPropose: boolean;
  readonly asExternalPropose: {
    readonly proposal: FrameSupportPreimagesBounded;
  } & Struct;
  readonly isExternalProposeMajority: boolean;
  readonly asExternalProposeMajority: {
    readonly proposal: FrameSupportPreimagesBounded;
  } & Struct;
  readonly isExternalProposeDefault: boolean;
  readonly asExternalProposeDefault: {
    readonly proposal: FrameSupportPreimagesBounded;
  } & Struct;
  readonly isFastTrack: boolean;
  readonly asFastTrack: {
    readonly proposalHash: H256;
    readonly votingPeriod: u32;
    readonly delay: u32;
  } & Struct;
  readonly isVetoExternal: boolean;
  readonly asVetoExternal: {
    readonly proposalHash: H256;
  } & Struct;
  readonly isCancelReferendum: boolean;
  readonly asCancelReferendum: {
    readonly refIndex: Compact<u32>;
  } & Struct;
  readonly isDelegate: boolean;
  readonly asDelegate: {
    readonly to: MultiAddress;
    readonly conviction: PalletDemocracyConviction;
    readonly balance: u128;
  } & Struct;
  readonly isUndelegate: boolean;
  readonly isClearPublicProposals: boolean;
  readonly isUnlock: boolean;
  readonly asUnlock: {
    readonly target: MultiAddress;
  } & Struct;
  readonly isRemoveVote: boolean;
  readonly asRemoveVote: {
    readonly index: u32;
  } & Struct;
  readonly isRemoveOtherVote: boolean;
  readonly asRemoveOtherVote: {
    readonly target: MultiAddress;
    readonly index: u32;
  } & Struct;
  readonly isBlacklist: boolean;
  readonly asBlacklist: {
    readonly proposalHash: H256;
    readonly maybeRefIndex: Option<u32>;
  } & Struct;
  readonly isCancelProposal: boolean;
  readonly asCancelProposal: {
    readonly propIndex: Compact<u32>;
  } & Struct;
  readonly isSetMetadata: boolean;
  readonly asSetMetadata: {
    readonly owner: PalletDemocracyMetadataOwner;
    readonly maybeHash: Option<H256>;
  } & Struct;
  readonly type: 'Propose' | 'Second' | 'Vote' | 'EmergencyCancel' | 'ExternalPropose' | 'ExternalProposeMajority' | 'ExternalProposeDefault' | 'FastTrack' | 'VetoExternal' | 'CancelReferendum' | 'Delegate' | 'Undelegate' | 'ClearPublicProposals' | 'Unlock' | 'RemoveVote' | 'RemoveOtherVote' | 'Blacklist' | 'CancelProposal' | 'SetMetadata';
}

/** @name PalletDemocracyConviction */
export interface PalletDemocracyConviction extends Enum {
  readonly isNone: boolean;
  readonly isLocked1x: boolean;
  readonly isLocked2x: boolean;
  readonly isLocked3x: boolean;
  readonly isLocked4x: boolean;
  readonly isLocked5x: boolean;
  readonly isLocked6x: boolean;
  readonly type: 'None' | 'Locked1x' | 'Locked2x' | 'Locked3x' | 'Locked4x' | 'Locked5x' | 'Locked6x';
}

/** @name PalletDemocracyDelegations */
export interface PalletDemocracyDelegations extends Struct {
  readonly votes: u128;
  readonly capital: u128;
}

/** @name PalletDemocracyError */
export interface PalletDemocracyError extends Enum {
  readonly isValueLow: boolean;
  readonly isProposalMissing: boolean;
  readonly isAlreadyCanceled: boolean;
  readonly isDuplicateProposal: boolean;
  readonly isProposalBlacklisted: boolean;
  readonly isNotSimpleMajority: boolean;
  readonly isInvalidHash: boolean;
  readonly isNoProposal: boolean;
  readonly isAlreadyVetoed: boolean;
  readonly isReferendumInvalid: boolean;
  readonly isNoneWaiting: boolean;
  readonly isNotVoter: boolean;
  readonly isNoPermission: boolean;
  readonly isAlreadyDelegating: boolean;
  readonly isInsufficientFunds: boolean;
  readonly isNotDelegating: boolean;
  readonly isVotesExist: boolean;
  readonly isInstantNotAllowed: boolean;
  readonly isNonsense: boolean;
  readonly isWrongUpperBound: boolean;
  readonly isMaxVotesReached: boolean;
  readonly isTooMany: boolean;
  readonly isVotingPeriodLow: boolean;
  readonly isPreimageNotExist: boolean;
  readonly type: 'ValueLow' | 'ProposalMissing' | 'AlreadyCanceled' | 'DuplicateProposal' | 'ProposalBlacklisted' | 'NotSimpleMajority' | 'InvalidHash' | 'NoProposal' | 'AlreadyVetoed' | 'ReferendumInvalid' | 'NoneWaiting' | 'NotVoter' | 'NoPermission' | 'AlreadyDelegating' | 'InsufficientFunds' | 'NotDelegating' | 'VotesExist' | 'InstantNotAllowed' | 'Nonsense' | 'WrongUpperBound' | 'MaxVotesReached' | 'TooMany' | 'VotingPeriodLow' | 'PreimageNotExist';
}

/** @name PalletDemocracyEvent */
export interface PalletDemocracyEvent extends Enum {
  readonly isProposed: boolean;
  readonly asProposed: {
    readonly proposalIndex: u32;
    readonly deposit: u128;
  } & Struct;
  readonly isTabled: boolean;
  readonly asTabled: {
    readonly proposalIndex: u32;
    readonly deposit: u128;
  } & Struct;
  readonly isExternalTabled: boolean;
  readonly isStarted: boolean;
  readonly asStarted: {
    readonly refIndex: u32;
    readonly threshold: PalletDemocracyVoteThreshold;
  } & Struct;
  readonly isPassed: boolean;
  readonly asPassed: {
    readonly refIndex: u32;
  } & Struct;
  readonly isNotPassed: boolean;
  readonly asNotPassed: {
    readonly refIndex: u32;
  } & Struct;
  readonly isCancelled: boolean;
  readonly asCancelled: {
    readonly refIndex: u32;
  } & Struct;
  readonly isDelegated: boolean;
  readonly asDelegated: {
    readonly who: AccountId32;
    readonly target: AccountId32;
  } & Struct;
  readonly isUndelegated: boolean;
  readonly asUndelegated: {
    readonly account: AccountId32;
  } & Struct;
  readonly isVetoed: boolean;
  readonly asVetoed: {
    readonly who: AccountId32;
    readonly proposalHash: H256;
    readonly until: u32;
  } & Struct;
  readonly isBlacklisted: boolean;
  readonly asBlacklisted: {
    readonly proposalHash: H256;
  } & Struct;
  readonly isVoted: boolean;
  readonly asVoted: {
    readonly voter: AccountId32;
    readonly refIndex: u32;
    readonly vote: PalletDemocracyVoteAccountVote;
  } & Struct;
  readonly isSeconded: boolean;
  readonly asSeconded: {
    readonly seconder: AccountId32;
    readonly propIndex: u32;
  } & Struct;
  readonly isProposalCanceled: boolean;
  readonly asProposalCanceled: {
    readonly propIndex: u32;
  } & Struct;
  readonly isMetadataSet: boolean;
  readonly asMetadataSet: {
    readonly owner: PalletDemocracyMetadataOwner;
    readonly hash_: H256;
  } & Struct;
  readonly isMetadataCleared: boolean;
  readonly asMetadataCleared: {
    readonly owner: PalletDemocracyMetadataOwner;
    readonly hash_: H256;
  } & Struct;
  readonly isMetadataTransferred: boolean;
  readonly asMetadataTransferred: {
    readonly prevOwner: PalletDemocracyMetadataOwner;
    readonly owner: PalletDemocracyMetadataOwner;
    readonly hash_: H256;
  } & Struct;
  readonly type: 'Proposed' | 'Tabled' | 'ExternalTabled' | 'Started' | 'Passed' | 'NotPassed' | 'Cancelled' | 'Delegated' | 'Undelegated' | 'Vetoed' | 'Blacklisted' | 'Voted' | 'Seconded' | 'ProposalCanceled' | 'MetadataSet' | 'MetadataCleared' | 'MetadataTransferred';
}

/** @name PalletDemocracyMetadataOwner */
export interface PalletDemocracyMetadataOwner extends Enum {
  readonly isExternal: boolean;
  readonly isProposal: boolean;
  readonly asProposal: u32;
  readonly isReferendum: boolean;
  readonly asReferendum: u32;
  readonly type: 'External' | 'Proposal' | 'Referendum';
}

/** @name PalletDemocracyReferendumInfo */
export interface PalletDemocracyReferendumInfo extends Enum {
  readonly isOngoing: boolean;
  readonly asOngoing: PalletDemocracyReferendumStatus;
  readonly isFinished: boolean;
  readonly asFinished: {
    readonly approved: bool;
    readonly end: u32;
  } & Struct;
  readonly type: 'Ongoing' | 'Finished';
}

/** @name PalletDemocracyReferendumStatus */
export interface PalletDemocracyReferendumStatus extends Struct {
  readonly end: u32;
  readonly proposal: FrameSupportPreimagesBounded;
  readonly threshold: PalletDemocracyVoteThreshold;
  readonly delay: u32;
  readonly tally: PalletDemocracyTally;
}

/** @name PalletDemocracyTally */
export interface PalletDemocracyTally extends Struct {
  readonly ayes: u128;
  readonly nays: u128;
  readonly turnout: u128;
}

/** @name PalletDemocracyVoteAccountVote */
export interface PalletDemocracyVoteAccountVote extends Enum {
  readonly isStandard: boolean;
  readonly asStandard: {
    readonly vote: Vote;
    readonly balance: u128;
  } & Struct;
  readonly isSplit: boolean;
  readonly asSplit: {
    readonly aye: u128;
    readonly nay: u128;
  } & Struct;
  readonly type: 'Standard' | 'Split';
}

/** @name PalletDemocracyVotePriorLock */
export interface PalletDemocracyVotePriorLock extends ITuple<[u32, u128]> {}

/** @name PalletDemocracyVoteThreshold */
export interface PalletDemocracyVoteThreshold extends Enum {
  readonly isSuperMajorityApprove: boolean;
  readonly isSuperMajorityAgainst: boolean;
  readonly isSimpleMajority: boolean;
  readonly type: 'SuperMajorityApprove' | 'SuperMajorityAgainst' | 'SimpleMajority';
}

/** @name PalletDemocracyVoteVoting */
export interface PalletDemocracyVoteVoting extends Enum {
  readonly isDirect: boolean;
  readonly asDirect: {
    readonly votes: Vec<ITuple<[u32, PalletDemocracyVoteAccountVote]>>;
    readonly delegations: PalletDemocracyDelegations;
    readonly prior: PalletDemocracyVotePriorLock;
  } & Struct;
  readonly isDelegating: boolean;
  readonly asDelegating: {
    readonly balance: u128;
    readonly target: AccountId32;
    readonly conviction: PalletDemocracyConviction;
    readonly delegations: PalletDemocracyDelegations;
    readonly prior: PalletDemocracyVotePriorLock;
  } & Struct;
  readonly type: 'Direct' | 'Delegating';
}

/** @name PalletEthereumCall */
export interface PalletEthereumCall extends Enum {
  readonly isTransact: boolean;
  readonly asTransact: {
    readonly transaction: EthereumTransactionTransactionV2;
  } & Struct;
  readonly type: 'Transact';
}

/** @name PalletEthereumError */
export interface PalletEthereumError extends Enum {
  readonly isInvalidSignature: boolean;
  readonly isPreLogExists: boolean;
  readonly type: 'InvalidSignature' | 'PreLogExists';
}

/** @name PalletEthereumEvent */
export interface PalletEthereumEvent extends Enum {
  readonly isExecuted: boolean;
  readonly asExecuted: {
    readonly from: H160;
    readonly to: H160;
    readonly transactionHash: H256;
    readonly exitReason: EvmCoreErrorExitReason;
    readonly extraData: Bytes;
  } & Struct;
  readonly type: 'Executed';
}

/** @name PalletEthereumFakeTransactionFinalizer */
export interface PalletEthereumFakeTransactionFinalizer extends Null {}

/** @name PalletEthereumRawOrigin */
export interface PalletEthereumRawOrigin extends Enum {
  readonly isEthereumTransaction: boolean;
  readonly asEthereumTransaction: H160;
  readonly type: 'EthereumTransaction';
}

/** @name PalletEvmAccountBasicCrossAccountIdRepr */
export interface PalletEvmAccountBasicCrossAccountIdRepr extends Enum {
  readonly isSubstrate: boolean;
  readonly asSubstrate: AccountId32;
  readonly isEthereum: boolean;
  readonly asEthereum: H160;
  readonly type: 'Substrate' | 'Ethereum';
}

/** @name PalletEvmCall */
export interface PalletEvmCall extends Enum {
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

/** @name PalletEvmCodeMetadata */
export interface PalletEvmCodeMetadata extends Struct {
  readonly size_: u64;
  readonly hash_: H256;
}

/** @name PalletEvmCoderSubstrateError */
export interface PalletEvmCoderSubstrateError extends Enum {
  readonly isOutOfGas: boolean;
  readonly isOutOfFund: boolean;
  readonly type: 'OutOfGas' | 'OutOfFund';
}

/** @name PalletEvmContractHelpersCall */
export interface PalletEvmContractHelpersCall extends Enum {
  readonly isMigrateFromSelfSponsoring: boolean;
  readonly asMigrateFromSelfSponsoring: {
    readonly addresses: Vec<H160>;
  } & Struct;
  readonly type: 'MigrateFromSelfSponsoring';
}

/** @name PalletEvmContractHelpersError */
export interface PalletEvmContractHelpersError extends Enum {
  readonly isNoPermission: boolean;
  readonly isNoPendingSponsor: boolean;
  readonly isTooManyMethodsHaveSponsoredLimit: boolean;
  readonly type: 'NoPermission' | 'NoPendingSponsor' | 'TooManyMethodsHaveSponsoredLimit';
}

/** @name PalletEvmContractHelpersEvent */
export interface PalletEvmContractHelpersEvent extends Enum {
  readonly isContractSponsorSet: boolean;
  readonly asContractSponsorSet: ITuple<[H160, AccountId32]>;
  readonly isContractSponsorshipConfirmed: boolean;
  readonly asContractSponsorshipConfirmed: ITuple<[H160, AccountId32]>;
  readonly isContractSponsorRemoved: boolean;
  readonly asContractSponsorRemoved: H160;
  readonly type: 'ContractSponsorSet' | 'ContractSponsorshipConfirmed' | 'ContractSponsorRemoved';
}

/** @name PalletEvmContractHelpersSponsoringModeT */
export interface PalletEvmContractHelpersSponsoringModeT extends Enum {
  readonly isDisabled: boolean;
  readonly isAllowlisted: boolean;
  readonly isGenerous: boolean;
  readonly type: 'Disabled' | 'Allowlisted' | 'Generous';
}

/** @name PalletEvmError */
export interface PalletEvmError extends Enum {
  readonly isBalanceLow: boolean;
  readonly isFeeOverflow: boolean;
  readonly isPaymentOverflow: boolean;
  readonly isWithdrawFailed: boolean;
  readonly isGasPriceTooLow: boolean;
  readonly isInvalidNonce: boolean;
  readonly isGasLimitTooLow: boolean;
  readonly isGasLimitTooHigh: boolean;
  readonly isInvalidChainId: boolean;
  readonly isInvalidSignature: boolean;
  readonly isReentrancy: boolean;
  readonly isTransactionMustComeFromEOA: boolean;
  readonly isUndefined: boolean;
  readonly type: 'BalanceLow' | 'FeeOverflow' | 'PaymentOverflow' | 'WithdrawFailed' | 'GasPriceTooLow' | 'InvalidNonce' | 'GasLimitTooLow' | 'GasLimitTooHigh' | 'InvalidChainId' | 'InvalidSignature' | 'Reentrancy' | 'TransactionMustComeFromEOA' | 'Undefined';
}

/** @name PalletEvmEvent */
export interface PalletEvmEvent extends Enum {
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

/** @name PalletEvmMigrationCall */
export interface PalletEvmMigrationCall extends Enum {
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
  readonly isRemoveRmrkData: boolean;
  readonly type: 'Begin' | 'SetData' | 'Finish' | 'InsertEthLogs' | 'InsertEvents' | 'RemoveRmrkData';
}

/** @name PalletEvmMigrationError */
export interface PalletEvmMigrationError extends Enum {
  readonly isAccountNotEmpty: boolean;
  readonly isAccountIsNotMigrating: boolean;
  readonly isBadEvent: boolean;
  readonly type: 'AccountNotEmpty' | 'AccountIsNotMigrating' | 'BadEvent';
}

/** @name PalletEvmMigrationEvent */
export interface PalletEvmMigrationEvent extends Enum {
  readonly isTestEvent: boolean;
  readonly type: 'TestEvent';
}

/** @name PalletForeignAssetsForeignCollectionMode */
export interface PalletForeignAssetsForeignCollectionMode extends Enum {
  readonly isNft: boolean;
  readonly isFungible: boolean;
  readonly asFungible: u8;
  readonly type: 'Nft' | 'Fungible';
}

/** @name PalletForeignAssetsMigrationStatus */
export interface PalletForeignAssetsMigrationStatus extends Enum {
  readonly isV3ToV4: boolean;
  readonly asV3ToV4: PalletForeignAssetsMigrationStatusV3ToV4;
  readonly type: 'V3ToV4';
}

/** @name PalletForeignAssetsMigrationStatusV3ToV4 */
export interface PalletForeignAssetsMigrationStatusV3ToV4 extends Enum {
  readonly isDone: boolean;
  readonly isSkippedInconsistentAssetData: boolean;
  readonly asSkippedInconsistentAssetData: XcmV3MultiassetAssetId;
  readonly isSkippedInconsistentAssetInstanceData: boolean;
  readonly asSkippedInconsistentAssetInstanceData: {
    readonly assetId: XcmV3MultiassetAssetId;
    readonly assetInstance: XcmV3MultiassetAssetInstance;
  } & Struct;
  readonly isSkippedNotConvertibleAssetId: boolean;
  readonly asSkippedNotConvertibleAssetId: XcmV3MultiassetAssetId;
  readonly isSkippedNotConvertibleAssetInstance: boolean;
  readonly asSkippedNotConvertibleAssetInstance: {
    readonly assetId: XcmV3MultiassetAssetId;
    readonly assetInstance: XcmV3MultiassetAssetInstance;
  } & Struct;
  readonly type: 'Done' | 'SkippedInconsistentAssetData' | 'SkippedInconsistentAssetInstanceData' | 'SkippedNotConvertibleAssetId' | 'SkippedNotConvertibleAssetInstance';
}

/** @name PalletForeignAssetsModuleCall */
export interface PalletForeignAssetsModuleCall extends Enum {
  readonly isForceRegisterForeignAsset: boolean;
  readonly asForceRegisterForeignAsset: {
    readonly versionedAssetId: XcmVersionedAssetId;
    readonly name: Vec<u16>;
    readonly tokenPrefix: Bytes;
    readonly mode: PalletForeignAssetsForeignCollectionMode;
  } & Struct;
  readonly type: 'ForceRegisterForeignAsset';
}

/** @name PalletForeignAssetsModuleError */
export interface PalletForeignAssetsModuleError extends Enum {
  readonly isForeignAssetAlreadyRegistered: boolean;
  readonly isBadForeignAssetId: boolean;
  readonly type: 'ForeignAssetAlreadyRegistered' | 'BadForeignAssetId';
}

/** @name PalletForeignAssetsModuleEvent */
export interface PalletForeignAssetsModuleEvent extends Enum {
  readonly isForeignAssetRegistered: boolean;
  readonly asForeignAssetRegistered: {
    readonly collectionId: u32;
    readonly assetId: XcmVersionedAssetId;
  } & Struct;
  readonly isMigrationStatus: boolean;
  readonly asMigrationStatus: PalletForeignAssetsMigrationStatus;
  readonly type: 'ForeignAssetRegistered' | 'MigrationStatus';
}

/** @name PalletFungibleError */
export interface PalletFungibleError extends Enum {
  readonly isFungibleItemsDontHaveData: boolean;
  readonly isFungibleDisallowsNesting: boolean;
  readonly isSettingPropertiesNotAllowed: boolean;
  readonly isSettingAllowanceForAllNotAllowed: boolean;
  readonly isFungibleTokensAreAlwaysValid: boolean;
  readonly type: 'FungibleItemsDontHaveData' | 'FungibleDisallowsNesting' | 'SettingPropertiesNotAllowed' | 'SettingAllowanceForAllNotAllowed' | 'FungibleTokensAreAlwaysValid';
}

/** @name PalletGovOriginsOrigin */
export interface PalletGovOriginsOrigin extends Enum {
  readonly isFellowshipProposition: boolean;
  readonly type: 'FellowshipProposition';
}

/** @name PalletIdentityBitFlags */
export interface PalletIdentityBitFlags extends Struct {
  readonly _bitLength: 64;
  readonly Display: 1;
  readonly Legal: 2;
  readonly Web: 4;
  readonly Riot: 8;
  readonly Email: 16;
  readonly PgpFingerprint: 32;
  readonly Image: 64;
  readonly Twitter: 128;
}

/** @name PalletIdentityCall */
export interface PalletIdentityCall extends Enum {
  readonly isAddRegistrar: boolean;
  readonly asAddRegistrar: {
    readonly account: MultiAddress;
  } & Struct;
  readonly isSetIdentity: boolean;
  readonly asSetIdentity: {
    readonly info: PalletIdentityIdentityInfo;
  } & Struct;
  readonly isSetSubs: boolean;
  readonly asSetSubs: {
    readonly subs: Vec<ITuple<[AccountId32, Data]>>;
  } & Struct;
  readonly isClearIdentity: boolean;
  readonly isRequestJudgement: boolean;
  readonly asRequestJudgement: {
    readonly regIndex: Compact<u32>;
    readonly maxFee: Compact<u128>;
  } & Struct;
  readonly isCancelRequest: boolean;
  readonly asCancelRequest: {
    readonly regIndex: u32;
  } & Struct;
  readonly isSetFee: boolean;
  readonly asSetFee: {
    readonly index: Compact<u32>;
    readonly fee: Compact<u128>;
  } & Struct;
  readonly isSetAccountId: boolean;
  readonly asSetAccountId: {
    readonly index: Compact<u32>;
    readonly new_: MultiAddress;
  } & Struct;
  readonly isSetFields: boolean;
  readonly asSetFields: {
    readonly index: Compact<u32>;
    readonly fields: PalletIdentityBitFlags;
  } & Struct;
  readonly isProvideJudgement: boolean;
  readonly asProvideJudgement: {
    readonly regIndex: Compact<u32>;
    readonly target: MultiAddress;
    readonly judgement: PalletIdentityJudgement;
    readonly identity: H256;
  } & Struct;
  readonly isKillIdentity: boolean;
  readonly asKillIdentity: {
    readonly target: MultiAddress;
  } & Struct;
  readonly isAddSub: boolean;
  readonly asAddSub: {
    readonly sub: MultiAddress;
    readonly data: Data;
  } & Struct;
  readonly isRenameSub: boolean;
  readonly asRenameSub: {
    readonly sub: MultiAddress;
    readonly data: Data;
  } & Struct;
  readonly isRemoveSub: boolean;
  readonly asRemoveSub: {
    readonly sub: MultiAddress;
  } & Struct;
  readonly isQuitSub: boolean;
  readonly isForceInsertIdentities: boolean;
  readonly asForceInsertIdentities: {
    readonly identities: Vec<ITuple<[AccountId32, PalletIdentityRegistration]>>;
  } & Struct;
  readonly isForceRemoveIdentities: boolean;
  readonly asForceRemoveIdentities: {
    readonly identities: Vec<AccountId32>;
  } & Struct;
  readonly isForceSetSubs: boolean;
  readonly asForceSetSubs: {
    readonly subs: Vec<ITuple<[AccountId32, ITuple<[u128, Vec<ITuple<[AccountId32, Data]>>]>]>>;
  } & Struct;
  readonly type: 'AddRegistrar' | 'SetIdentity' | 'SetSubs' | 'ClearIdentity' | 'RequestJudgement' | 'CancelRequest' | 'SetFee' | 'SetAccountId' | 'SetFields' | 'ProvideJudgement' | 'KillIdentity' | 'AddSub' | 'RenameSub' | 'RemoveSub' | 'QuitSub' | 'ForceInsertIdentities' | 'ForceRemoveIdentities' | 'ForceSetSubs';
}

/** @name PalletIdentityError */
export interface PalletIdentityError extends Enum {
  readonly isTooManySubAccounts: boolean;
  readonly isNotFound: boolean;
  readonly isNotNamed: boolean;
  readonly isEmptyIndex: boolean;
  readonly isFeeChanged: boolean;
  readonly isNoIdentity: boolean;
  readonly isStickyJudgement: boolean;
  readonly isJudgementGiven: boolean;
  readonly isInvalidJudgement: boolean;
  readonly isInvalidIndex: boolean;
  readonly isInvalidTarget: boolean;
  readonly isTooManyFields: boolean;
  readonly isTooManyRegistrars: boolean;
  readonly isAlreadyClaimed: boolean;
  readonly isNotSub: boolean;
  readonly isNotOwned: boolean;
  readonly isJudgementForDifferentIdentity: boolean;
  readonly isJudgementPaymentFailed: boolean;
  readonly type: 'TooManySubAccounts' | 'NotFound' | 'NotNamed' | 'EmptyIndex' | 'FeeChanged' | 'NoIdentity' | 'StickyJudgement' | 'JudgementGiven' | 'InvalidJudgement' | 'InvalidIndex' | 'InvalidTarget' | 'TooManyFields' | 'TooManyRegistrars' | 'AlreadyClaimed' | 'NotSub' | 'NotOwned' | 'JudgementForDifferentIdentity' | 'JudgementPaymentFailed';
}

/** @name PalletIdentityEvent */
export interface PalletIdentityEvent extends Enum {
  readonly isIdentitySet: boolean;
  readonly asIdentitySet: {
    readonly who: AccountId32;
  } & Struct;
  readonly isIdentityCleared: boolean;
  readonly asIdentityCleared: {
    readonly who: AccountId32;
    readonly deposit: u128;
  } & Struct;
  readonly isIdentityKilled: boolean;
  readonly asIdentityKilled: {
    readonly who: AccountId32;
    readonly deposit: u128;
  } & Struct;
  readonly isIdentitiesInserted: boolean;
  readonly asIdentitiesInserted: {
    readonly amount: u32;
  } & Struct;
  readonly isIdentitiesRemoved: boolean;
  readonly asIdentitiesRemoved: {
    readonly amount: u32;
  } & Struct;
  readonly isJudgementRequested: boolean;
  readonly asJudgementRequested: {
    readonly who: AccountId32;
    readonly registrarIndex: u32;
  } & Struct;
  readonly isJudgementUnrequested: boolean;
  readonly asJudgementUnrequested: {
    readonly who: AccountId32;
    readonly registrarIndex: u32;
  } & Struct;
  readonly isJudgementGiven: boolean;
  readonly asJudgementGiven: {
    readonly target: AccountId32;
    readonly registrarIndex: u32;
  } & Struct;
  readonly isRegistrarAdded: boolean;
  readonly asRegistrarAdded: {
    readonly registrarIndex: u32;
  } & Struct;
  readonly isSubIdentityAdded: boolean;
  readonly asSubIdentityAdded: {
    readonly sub: AccountId32;
    readonly main: AccountId32;
    readonly deposit: u128;
  } & Struct;
  readonly isSubIdentityRemoved: boolean;
  readonly asSubIdentityRemoved: {
    readonly sub: AccountId32;
    readonly main: AccountId32;
    readonly deposit: u128;
  } & Struct;
  readonly isSubIdentityRevoked: boolean;
  readonly asSubIdentityRevoked: {
    readonly sub: AccountId32;
    readonly main: AccountId32;
    readonly deposit: u128;
  } & Struct;
  readonly isSubIdentitiesInserted: boolean;
  readonly asSubIdentitiesInserted: {
    readonly amount: u32;
  } & Struct;
  readonly type: 'IdentitySet' | 'IdentityCleared' | 'IdentityKilled' | 'IdentitiesInserted' | 'IdentitiesRemoved' | 'JudgementRequested' | 'JudgementUnrequested' | 'JudgementGiven' | 'RegistrarAdded' | 'SubIdentityAdded' | 'SubIdentityRemoved' | 'SubIdentityRevoked' | 'SubIdentitiesInserted';
}

/** @name PalletIdentityIdentityField */
export interface PalletIdentityIdentityField extends Enum {
  readonly isDisplay: boolean;
  readonly isLegal: boolean;
  readonly isWeb: boolean;
  readonly isRiot: boolean;
  readonly isEmail: boolean;
  readonly isPgpFingerprint: boolean;
  readonly isImage: boolean;
  readonly isTwitter: boolean;
  readonly type: 'Display' | 'Legal' | 'Web' | 'Riot' | 'Email' | 'PgpFingerprint' | 'Image' | 'Twitter';
}

/** @name PalletIdentityIdentityInfo */
export interface PalletIdentityIdentityInfo extends Struct {
  readonly additional: Vec<ITuple<[Data, Data]>>;
  readonly display: Data;
  readonly legal: Data;
  readonly web: Data;
  readonly riot: Data;
  readonly email: Data;
  readonly pgpFingerprint: Option<U8aFixed>;
  readonly image: Data;
  readonly twitter: Data;
}

/** @name PalletIdentityJudgement */
export interface PalletIdentityJudgement extends Enum {
  readonly isUnknown: boolean;
  readonly isFeePaid: boolean;
  readonly asFeePaid: u128;
  readonly isReasonable: boolean;
  readonly isKnownGood: boolean;
  readonly isOutOfDate: boolean;
  readonly isLowQuality: boolean;
  readonly isErroneous: boolean;
  readonly type: 'Unknown' | 'FeePaid' | 'Reasonable' | 'KnownGood' | 'OutOfDate' | 'LowQuality' | 'Erroneous';
}

/** @name PalletIdentityRegistrarInfo */
export interface PalletIdentityRegistrarInfo extends Struct {
  readonly account: AccountId32;
  readonly fee: u128;
  readonly fields: PalletIdentityBitFlags;
}

/** @name PalletIdentityRegistration */
export interface PalletIdentityRegistration extends Struct {
  readonly judgements: Vec<ITuple<[u32, PalletIdentityJudgement]>>;
  readonly deposit: u128;
  readonly info: PalletIdentityIdentityInfo;
}

/** @name PalletInflationCall */
export interface PalletInflationCall extends Enum {
  readonly isStartInflation: boolean;
  readonly asStartInflation: {
    readonly inflationStartRelayBlock: u32;
  } & Struct;
  readonly type: 'StartInflation';
}

/** @name PalletMaintenanceCall */
export interface PalletMaintenanceCall extends Enum {
  readonly isEnable: boolean;
  readonly isDisable: boolean;
  readonly type: 'Enable' | 'Disable';
}

/** @name PalletMaintenanceError */
export interface PalletMaintenanceError extends Null {}

/** @name PalletMaintenanceEvent */
export interface PalletMaintenanceEvent extends Enum {
  readonly isMaintenanceEnabled: boolean;
  readonly isMaintenanceDisabled: boolean;
  readonly type: 'MaintenanceEnabled' | 'MaintenanceDisabled';
}

/** @name PalletMembershipCall */
export interface PalletMembershipCall extends Enum {
  readonly isAddMember: boolean;
  readonly asAddMember: {
    readonly who: MultiAddress;
  } & Struct;
  readonly isRemoveMember: boolean;
  readonly asRemoveMember: {
    readonly who: MultiAddress;
  } & Struct;
  readonly isSwapMember: boolean;
  readonly asSwapMember: {
    readonly remove: MultiAddress;
    readonly add: MultiAddress;
  } & Struct;
  readonly isResetMembers: boolean;
  readonly asResetMembers: {
    readonly members: Vec<AccountId32>;
  } & Struct;
  readonly isChangeKey: boolean;
  readonly asChangeKey: {
    readonly new_: MultiAddress;
  } & Struct;
  readonly isSetPrime: boolean;
  readonly asSetPrime: {
    readonly who: MultiAddress;
  } & Struct;
  readonly isClearPrime: boolean;
  readonly type: 'AddMember' | 'RemoveMember' | 'SwapMember' | 'ResetMembers' | 'ChangeKey' | 'SetPrime' | 'ClearPrime';
}

/** @name PalletMembershipError */
export interface PalletMembershipError extends Enum {
  readonly isAlreadyMember: boolean;
  readonly isNotMember: boolean;
  readonly isTooManyMembers: boolean;
  readonly type: 'AlreadyMember' | 'NotMember' | 'TooManyMembers';
}

/** @name PalletMembershipEvent */
export interface PalletMembershipEvent extends Enum {
  readonly isMemberAdded: boolean;
  readonly isMemberRemoved: boolean;
  readonly isMembersSwapped: boolean;
  readonly isMembersReset: boolean;
  readonly isKeyChanged: boolean;
  readonly isDummy: boolean;
  readonly type: 'MemberAdded' | 'MemberRemoved' | 'MembersSwapped' | 'MembersReset' | 'KeyChanged' | 'Dummy';
}

/** @name PalletMessageQueueBookState */
export interface PalletMessageQueueBookState extends Struct {
  readonly begin: u32;
  readonly end: u32;
  readonly count: u32;
  readonly readyNeighbours: Option<PalletMessageQueueNeighbours>;
  readonly messageCount: u64;
  readonly size_: u64;
}

/** @name PalletMessageQueueCall */
export interface PalletMessageQueueCall extends Enum {
  readonly isReapPage: boolean;
  readonly asReapPage: {
    readonly messageOrigin: CumulusPrimitivesCoreAggregateMessageOrigin;
    readonly pageIndex: u32;
  } & Struct;
  readonly isExecuteOverweight: boolean;
  readonly asExecuteOverweight: {
    readonly messageOrigin: CumulusPrimitivesCoreAggregateMessageOrigin;
    readonly page: u32;
    readonly index: u32;
    readonly weightLimit: SpWeightsWeightV2Weight;
  } & Struct;
  readonly type: 'ReapPage' | 'ExecuteOverweight';
}

/** @name PalletMessageQueueError */
export interface PalletMessageQueueError extends Enum {
  readonly isNotReapable: boolean;
  readonly isNoPage: boolean;
  readonly isNoMessage: boolean;
  readonly isAlreadyProcessed: boolean;
  readonly isQueued: boolean;
  readonly isInsufficientWeight: boolean;
  readonly isTemporarilyUnprocessable: boolean;
  readonly isQueuePaused: boolean;
  readonly isRecursiveDisallowed: boolean;
  readonly type: 'NotReapable' | 'NoPage' | 'NoMessage' | 'AlreadyProcessed' | 'Queued' | 'InsufficientWeight' | 'TemporarilyUnprocessable' | 'QueuePaused' | 'RecursiveDisallowed';
}

/** @name PalletMessageQueueEvent */
export interface PalletMessageQueueEvent extends Enum {
  readonly isProcessingFailed: boolean;
  readonly asProcessingFailed: {
    readonly id: H256;
    readonly origin: CumulusPrimitivesCoreAggregateMessageOrigin;
    readonly error: FrameSupportMessagesProcessMessageError;
  } & Struct;
  readonly isProcessed: boolean;
  readonly asProcessed: {
    readonly id: H256;
    readonly origin: CumulusPrimitivesCoreAggregateMessageOrigin;
    readonly weightUsed: SpWeightsWeightV2Weight;
    readonly success: bool;
  } & Struct;
  readonly isOverweightEnqueued: boolean;
  readonly asOverweightEnqueued: {
    readonly id: U8aFixed;
    readonly origin: CumulusPrimitivesCoreAggregateMessageOrigin;
    readonly pageIndex: u32;
    readonly messageIndex: u32;
  } & Struct;
  readonly isPageReaped: boolean;
  readonly asPageReaped: {
    readonly origin: CumulusPrimitivesCoreAggregateMessageOrigin;
    readonly index: u32;
  } & Struct;
  readonly type: 'ProcessingFailed' | 'Processed' | 'OverweightEnqueued' | 'PageReaped';
}

/** @name PalletMessageQueueNeighbours */
export interface PalletMessageQueueNeighbours extends Struct {
  readonly prev: CumulusPrimitivesCoreAggregateMessageOrigin;
  readonly next: CumulusPrimitivesCoreAggregateMessageOrigin;
}

/** @name PalletMessageQueuePage */
export interface PalletMessageQueuePage extends Struct {
  readonly remaining: u32;
  readonly remainingSize: u32;
  readonly firstIndex: u32;
  readonly first: u32;
  readonly last: u32;
  readonly heap: Bytes;
}

/** @name PalletNonfungibleError */
export interface PalletNonfungibleError extends Enum {
  readonly isNotNonfungibleDataUsedToMintFungibleCollectionToken: boolean;
  readonly isNonfungibleItemsHaveNoAmount: boolean;
  readonly isCantBurnNftWithChildren: boolean;
  readonly type: 'NotNonfungibleDataUsedToMintFungibleCollectionToken' | 'NonfungibleItemsHaveNoAmount' | 'CantBurnNftWithChildren';
}

/** @name PalletNonfungibleItemData */
export interface PalletNonfungibleItemData extends Struct {
  readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
}

/** @name PalletPreimageCall */
export interface PalletPreimageCall extends Enum {
  readonly isNotePreimage: boolean;
  readonly asNotePreimage: {
    readonly bytes: Bytes;
  } & Struct;
  readonly isUnnotePreimage: boolean;
  readonly asUnnotePreimage: {
    readonly hash_: H256;
  } & Struct;
  readonly isRequestPreimage: boolean;
  readonly asRequestPreimage: {
    readonly hash_: H256;
  } & Struct;
  readonly isUnrequestPreimage: boolean;
  readonly asUnrequestPreimage: {
    readonly hash_: H256;
  } & Struct;
  readonly isEnsureUpdated: boolean;
  readonly asEnsureUpdated: {
    readonly hashes: Vec<H256>;
  } & Struct;
  readonly type: 'NotePreimage' | 'UnnotePreimage' | 'RequestPreimage' | 'UnrequestPreimage' | 'EnsureUpdated';
}

/** @name PalletPreimageError */
export interface PalletPreimageError extends Enum {
  readonly isTooBig: boolean;
  readonly isAlreadyNoted: boolean;
  readonly isNotAuthorized: boolean;
  readonly isNotNoted: boolean;
  readonly isRequested: boolean;
  readonly isNotRequested: boolean;
  readonly isTooMany: boolean;
  readonly isTooFew: boolean;
  readonly type: 'TooBig' | 'AlreadyNoted' | 'NotAuthorized' | 'NotNoted' | 'Requested' | 'NotRequested' | 'TooMany' | 'TooFew';
}

/** @name PalletPreimageEvent */
export interface PalletPreimageEvent extends Enum {
  readonly isNoted: boolean;
  readonly asNoted: {
    readonly hash_: H256;
  } & Struct;
  readonly isRequested: boolean;
  readonly asRequested: {
    readonly hash_: H256;
  } & Struct;
  readonly isCleared: boolean;
  readonly asCleared: {
    readonly hash_: H256;
  } & Struct;
  readonly type: 'Noted' | 'Requested' | 'Cleared';
}

/** @name PalletPreimageHoldReason */
export interface PalletPreimageHoldReason extends Enum {
  readonly isPreimage: boolean;
  readonly type: 'Preimage';
}

/** @name PalletPreimageOldRequestStatus */
export interface PalletPreimageOldRequestStatus extends Enum {
  readonly isUnrequested: boolean;
  readonly asUnrequested: {
    readonly deposit: ITuple<[AccountId32, u128]>;
    readonly len: u32;
  } & Struct;
  readonly isRequested: boolean;
  readonly asRequested: {
    readonly deposit: Option<ITuple<[AccountId32, u128]>>;
    readonly count: u32;
    readonly len: Option<u32>;
  } & Struct;
  readonly type: 'Unrequested' | 'Requested';
}

/** @name PalletPreimageRequestStatus */
export interface PalletPreimageRequestStatus extends Enum {
  readonly isUnrequested: boolean;
  readonly asUnrequested: {
    readonly ticket: ITuple<[AccountId32, u128]>;
    readonly len: u32;
  } & Struct;
  readonly isRequested: boolean;
  readonly asRequested: {
    readonly maybeTicket: Option<ITuple<[AccountId32, u128]>>;
    readonly count: u32;
    readonly maybeLen: Option<u32>;
  } & Struct;
  readonly type: 'Unrequested' | 'Requested';
}

/** @name PalletRankedCollectiveCall */
export interface PalletRankedCollectiveCall extends Enum {
  readonly isAddMember: boolean;
  readonly asAddMember: {
    readonly who: MultiAddress;
  } & Struct;
  readonly isPromoteMember: boolean;
  readonly asPromoteMember: {
    readonly who: MultiAddress;
  } & Struct;
  readonly isDemoteMember: boolean;
  readonly asDemoteMember: {
    readonly who: MultiAddress;
  } & Struct;
  readonly isRemoveMember: boolean;
  readonly asRemoveMember: {
    readonly who: MultiAddress;
    readonly minRank: u16;
  } & Struct;
  readonly isVote: boolean;
  readonly asVote: {
    readonly poll: u32;
    readonly aye: bool;
  } & Struct;
  readonly isCleanupPoll: boolean;
  readonly asCleanupPoll: {
    readonly pollIndex: u32;
    readonly max: u32;
  } & Struct;
  readonly isExchangeMember: boolean;
  readonly asExchangeMember: {
    readonly who: MultiAddress;
    readonly newWho: MultiAddress;
  } & Struct;
  readonly type: 'AddMember' | 'PromoteMember' | 'DemoteMember' | 'RemoveMember' | 'Vote' | 'CleanupPoll' | 'ExchangeMember';
}

/** @name PalletRankedCollectiveError */
export interface PalletRankedCollectiveError extends Enum {
  readonly isAlreadyMember: boolean;
  readonly isNotMember: boolean;
  readonly isNotPolling: boolean;
  readonly isOngoing: boolean;
  readonly isNoneRemaining: boolean;
  readonly isCorruption: boolean;
  readonly isRankTooLow: boolean;
  readonly isInvalidWitness: boolean;
  readonly isNoPermission: boolean;
  readonly isSameMember: boolean;
  readonly type: 'AlreadyMember' | 'NotMember' | 'NotPolling' | 'Ongoing' | 'NoneRemaining' | 'Corruption' | 'RankTooLow' | 'InvalidWitness' | 'NoPermission' | 'SameMember';
}

/** @name PalletRankedCollectiveEvent */
export interface PalletRankedCollectiveEvent extends Enum {
  readonly isMemberAdded: boolean;
  readonly asMemberAdded: {
    readonly who: AccountId32;
  } & Struct;
  readonly isRankChanged: boolean;
  readonly asRankChanged: {
    readonly who: AccountId32;
    readonly rank: u16;
  } & Struct;
  readonly isMemberRemoved: boolean;
  readonly asMemberRemoved: {
    readonly who: AccountId32;
    readonly rank: u16;
  } & Struct;
  readonly isVoted: boolean;
  readonly asVoted: {
    readonly who: AccountId32;
    readonly poll: u32;
    readonly vote: PalletRankedCollectiveVoteRecord;
    readonly tally: PalletRankedCollectiveTally;
  } & Struct;
  readonly isMemberExchanged: boolean;
  readonly asMemberExchanged: {
    readonly who: AccountId32;
    readonly newWho: AccountId32;
  } & Struct;
  readonly type: 'MemberAdded' | 'RankChanged' | 'MemberRemoved' | 'Voted' | 'MemberExchanged';
}

/** @name PalletRankedCollectiveMemberRecord */
export interface PalletRankedCollectiveMemberRecord extends Struct {
  readonly rank: u16;
}

/** @name PalletRankedCollectiveTally */
export interface PalletRankedCollectiveTally extends Struct {
  readonly bareAyes: u32;
  readonly ayes: u32;
  readonly nays: u32;
}

/** @name PalletRankedCollectiveVoteRecord */
export interface PalletRankedCollectiveVoteRecord extends Enum {
  readonly isAye: boolean;
  readonly asAye: u32;
  readonly isNay: boolean;
  readonly asNay: u32;
  readonly type: 'Aye' | 'Nay';
}

/** @name PalletReferendaCall */
export interface PalletReferendaCall extends Enum {
  readonly isSubmit: boolean;
  readonly asSubmit: {
    readonly proposalOrigin: OpalRuntimeOriginCaller;
    readonly proposal: FrameSupportPreimagesBounded;
    readonly enactmentMoment: FrameSupportScheduleDispatchTime;
  } & Struct;
  readonly isPlaceDecisionDeposit: boolean;
  readonly asPlaceDecisionDeposit: {
    readonly index: u32;
  } & Struct;
  readonly isRefundDecisionDeposit: boolean;
  readonly asRefundDecisionDeposit: {
    readonly index: u32;
  } & Struct;
  readonly isCancel: boolean;
  readonly asCancel: {
    readonly index: u32;
  } & Struct;
  readonly isKill: boolean;
  readonly asKill: {
    readonly index: u32;
  } & Struct;
  readonly isNudgeReferendum: boolean;
  readonly asNudgeReferendum: {
    readonly index: u32;
  } & Struct;
  readonly isOneFewerDeciding: boolean;
  readonly asOneFewerDeciding: {
    readonly track: u16;
  } & Struct;
  readonly isRefundSubmissionDeposit: boolean;
  readonly asRefundSubmissionDeposit: {
    readonly index: u32;
  } & Struct;
  readonly isSetMetadata: boolean;
  readonly asSetMetadata: {
    readonly index: u32;
    readonly maybeHash: Option<H256>;
  } & Struct;
  readonly type: 'Submit' | 'PlaceDecisionDeposit' | 'RefundDecisionDeposit' | 'Cancel' | 'Kill' | 'NudgeReferendum' | 'OneFewerDeciding' | 'RefundSubmissionDeposit' | 'SetMetadata';
}

/** @name PalletReferendaCurve */
export interface PalletReferendaCurve extends Enum {
  readonly isLinearDecreasing: boolean;
  readonly asLinearDecreasing: {
    readonly length: Perbill;
    readonly floor: Perbill;
    readonly ceil: Perbill;
  } & Struct;
  readonly isSteppedDecreasing: boolean;
  readonly asSteppedDecreasing: {
    readonly begin: Perbill;
    readonly end: Perbill;
    readonly step: Perbill;
    readonly period: Perbill;
  } & Struct;
  readonly isReciprocal: boolean;
  readonly asReciprocal: {
    readonly factor: i64;
    readonly xOffset: i64;
    readonly yOffset: i64;
  } & Struct;
  readonly type: 'LinearDecreasing' | 'SteppedDecreasing' | 'Reciprocal';
}

/** @name PalletReferendaDecidingStatus */
export interface PalletReferendaDecidingStatus extends Struct {
  readonly since: u32;
  readonly confirming: Option<u32>;
}

/** @name PalletReferendaDeposit */
export interface PalletReferendaDeposit extends Struct {
  readonly who: AccountId32;
  readonly amount: u128;
}

/** @name PalletReferendaError */
export interface PalletReferendaError extends Enum {
  readonly isNotOngoing: boolean;
  readonly isHasDeposit: boolean;
  readonly isBadTrack: boolean;
  readonly isFull: boolean;
  readonly isQueueEmpty: boolean;
  readonly isBadReferendum: boolean;
  readonly isNothingToDo: boolean;
  readonly isNoTrack: boolean;
  readonly isUnfinished: boolean;
  readonly isNoPermission: boolean;
  readonly isNoDeposit: boolean;
  readonly isBadStatus: boolean;
  readonly isPreimageNotExist: boolean;
  readonly type: 'NotOngoing' | 'HasDeposit' | 'BadTrack' | 'Full' | 'QueueEmpty' | 'BadReferendum' | 'NothingToDo' | 'NoTrack' | 'Unfinished' | 'NoPermission' | 'NoDeposit' | 'BadStatus' | 'PreimageNotExist';
}

/** @name PalletReferendaEvent */
export interface PalletReferendaEvent extends Enum {
  readonly isSubmitted: boolean;
  readonly asSubmitted: {
    readonly index: u32;
    readonly track: u16;
    readonly proposal: FrameSupportPreimagesBounded;
  } & Struct;
  readonly isDecisionDepositPlaced: boolean;
  readonly asDecisionDepositPlaced: {
    readonly index: u32;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isDecisionDepositRefunded: boolean;
  readonly asDecisionDepositRefunded: {
    readonly index: u32;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isDepositSlashed: boolean;
  readonly asDepositSlashed: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isDecisionStarted: boolean;
  readonly asDecisionStarted: {
    readonly index: u32;
    readonly track: u16;
    readonly proposal: FrameSupportPreimagesBounded;
    readonly tally: PalletRankedCollectiveTally;
  } & Struct;
  readonly isConfirmStarted: boolean;
  readonly asConfirmStarted: {
    readonly index: u32;
  } & Struct;
  readonly isConfirmAborted: boolean;
  readonly asConfirmAborted: {
    readonly index: u32;
  } & Struct;
  readonly isConfirmed: boolean;
  readonly asConfirmed: {
    readonly index: u32;
    readonly tally: PalletRankedCollectiveTally;
  } & Struct;
  readonly isApproved: boolean;
  readonly asApproved: {
    readonly index: u32;
  } & Struct;
  readonly isRejected: boolean;
  readonly asRejected: {
    readonly index: u32;
    readonly tally: PalletRankedCollectiveTally;
  } & Struct;
  readonly isTimedOut: boolean;
  readonly asTimedOut: {
    readonly index: u32;
    readonly tally: PalletRankedCollectiveTally;
  } & Struct;
  readonly isCancelled: boolean;
  readonly asCancelled: {
    readonly index: u32;
    readonly tally: PalletRankedCollectiveTally;
  } & Struct;
  readonly isKilled: boolean;
  readonly asKilled: {
    readonly index: u32;
    readonly tally: PalletRankedCollectiveTally;
  } & Struct;
  readonly isSubmissionDepositRefunded: boolean;
  readonly asSubmissionDepositRefunded: {
    readonly index: u32;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isMetadataSet: boolean;
  readonly asMetadataSet: {
    readonly index: u32;
    readonly hash_: H256;
  } & Struct;
  readonly isMetadataCleared: boolean;
  readonly asMetadataCleared: {
    readonly index: u32;
    readonly hash_: H256;
  } & Struct;
  readonly type: 'Submitted' | 'DecisionDepositPlaced' | 'DecisionDepositRefunded' | 'DepositSlashed' | 'DecisionStarted' | 'ConfirmStarted' | 'ConfirmAborted' | 'Confirmed' | 'Approved' | 'Rejected' | 'TimedOut' | 'Cancelled' | 'Killed' | 'SubmissionDepositRefunded' | 'MetadataSet' | 'MetadataCleared';
}

/** @name PalletReferendaReferendumInfo */
export interface PalletReferendaReferendumInfo extends Enum {
  readonly isOngoing: boolean;
  readonly asOngoing: PalletReferendaReferendumStatus;
  readonly isApproved: boolean;
  readonly asApproved: ITuple<[u32, Option<PalletReferendaDeposit>, Option<PalletReferendaDeposit>]>;
  readonly isRejected: boolean;
  readonly asRejected: ITuple<[u32, Option<PalletReferendaDeposit>, Option<PalletReferendaDeposit>]>;
  readonly isCancelled: boolean;
  readonly asCancelled: ITuple<[u32, Option<PalletReferendaDeposit>, Option<PalletReferendaDeposit>]>;
  readonly isTimedOut: boolean;
  readonly asTimedOut: ITuple<[u32, Option<PalletReferendaDeposit>, Option<PalletReferendaDeposit>]>;
  readonly isKilled: boolean;
  readonly asKilled: u32;
  readonly type: 'Ongoing' | 'Approved' | 'Rejected' | 'Cancelled' | 'TimedOut' | 'Killed';
}

/** @name PalletReferendaReferendumStatus */
export interface PalletReferendaReferendumStatus extends Struct {
  readonly track: u16;
  readonly origin: OpalRuntimeOriginCaller;
  readonly proposal: FrameSupportPreimagesBounded;
  readonly enactment: FrameSupportScheduleDispatchTime;
  readonly submitted: u32;
  readonly submissionDeposit: PalletReferendaDeposit;
  readonly decisionDeposit: Option<PalletReferendaDeposit>;
  readonly deciding: Option<PalletReferendaDecidingStatus>;
  readonly tally: PalletRankedCollectiveTally;
  readonly inQueue: bool;
  readonly alarm: Option<ITuple<[u32, ITuple<[u32, u32]>]>>;
}

/** @name PalletReferendaTrackInfo */
export interface PalletReferendaTrackInfo extends Struct {
  readonly name: Text;
  readonly maxDeciding: u32;
  readonly decisionDeposit: u128;
  readonly preparePeriod: u32;
  readonly decisionPeriod: u32;
  readonly confirmPeriod: u32;
  readonly minEnactmentPeriod: u32;
  readonly minApproval: PalletReferendaCurve;
  readonly minSupport: PalletReferendaCurve;
}

/** @name PalletRefungibleError */
export interface PalletRefungibleError extends Enum {
  readonly isNotRefungibleDataUsedToMintFungibleCollectionToken: boolean;
  readonly isWrongRefungiblePieces: boolean;
  readonly isRepartitionWhileNotOwningAllPieces: boolean;
  readonly isRefungibleDisallowsNesting: boolean;
  readonly isSettingPropertiesNotAllowed: boolean;
  readonly type: 'NotRefungibleDataUsedToMintFungibleCollectionToken' | 'WrongRefungiblePieces' | 'RepartitionWhileNotOwningAllPieces' | 'RefungibleDisallowsNesting' | 'SettingPropertiesNotAllowed';
}

/** @name PalletSchedulerCall */
export interface PalletSchedulerCall extends Enum {
  readonly isSchedule: boolean;
  readonly asSchedule: {
    readonly when: u32;
    readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
    readonly priority: u8;
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
    readonly priority: u8;
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
    readonly priority: u8;
    readonly call: Call;
  } & Struct;
  readonly isScheduleNamedAfter: boolean;
  readonly asScheduleNamedAfter: {
    readonly id: U8aFixed;
    readonly after: u32;
    readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
    readonly priority: u8;
    readonly call: Call;
  } & Struct;
  readonly isSetRetry: boolean;
  readonly asSetRetry: {
    readonly task: ITuple<[u32, u32]>;
    readonly retries: u8;
    readonly period: u32;
  } & Struct;
  readonly isSetRetryNamed: boolean;
  readonly asSetRetryNamed: {
    readonly id: U8aFixed;
    readonly retries: u8;
    readonly period: u32;
  } & Struct;
  readonly isCancelRetry: boolean;
  readonly asCancelRetry: {
    readonly task: ITuple<[u32, u32]>;
  } & Struct;
  readonly isCancelRetryNamed: boolean;
  readonly asCancelRetryNamed: {
    readonly id: U8aFixed;
  } & Struct;
  readonly type: 'Schedule' | 'Cancel' | 'ScheduleNamed' | 'CancelNamed' | 'ScheduleAfter' | 'ScheduleNamedAfter' | 'SetRetry' | 'SetRetryNamed' | 'CancelRetry' | 'CancelRetryNamed';
}

/** @name PalletSchedulerError */
export interface PalletSchedulerError extends Enum {
  readonly isFailedToSchedule: boolean;
  readonly isNotFound: boolean;
  readonly isTargetBlockNumberInPast: boolean;
  readonly isRescheduleNoChange: boolean;
  readonly isNamed: boolean;
  readonly type: 'FailedToSchedule' | 'NotFound' | 'TargetBlockNumberInPast' | 'RescheduleNoChange' | 'Named';
}

/** @name PalletSchedulerEvent */
export interface PalletSchedulerEvent extends Enum {
  readonly isScheduled: boolean;
  readonly asScheduled: {
    readonly when: u32;
    readonly index: u32;
  } & Struct;
  readonly isCanceled: boolean;
  readonly asCanceled: {
    readonly when: u32;
    readonly index: u32;
  } & Struct;
  readonly isDispatched: boolean;
  readonly asDispatched: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
    readonly result: Result<Null, SpRuntimeDispatchError>;
  } & Struct;
  readonly isRetrySet: boolean;
  readonly asRetrySet: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
    readonly period: u32;
    readonly retries: u8;
  } & Struct;
  readonly isRetryCancelled: boolean;
  readonly asRetryCancelled: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
  } & Struct;
  readonly isCallUnavailable: boolean;
  readonly asCallUnavailable: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
  } & Struct;
  readonly isPeriodicFailed: boolean;
  readonly asPeriodicFailed: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
  } & Struct;
  readonly isRetryFailed: boolean;
  readonly asRetryFailed: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
  } & Struct;
  readonly isPermanentlyOverweight: boolean;
  readonly asPermanentlyOverweight: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
  } & Struct;
  readonly type: 'Scheduled' | 'Canceled' | 'Dispatched' | 'RetrySet' | 'RetryCancelled' | 'CallUnavailable' | 'PeriodicFailed' | 'RetryFailed' | 'PermanentlyOverweight';
}

/** @name PalletSchedulerRetryConfig */
export interface PalletSchedulerRetryConfig extends Struct {
  readonly totalRetries: u8;
  readonly remaining: u8;
  readonly period: u32;
}

/** @name PalletSchedulerScheduled */
export interface PalletSchedulerScheduled extends Struct {
  readonly maybeId: Option<U8aFixed>;
  readonly priority: u8;
  readonly call: FrameSupportPreimagesBounded;
  readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
  readonly origin: OpalRuntimeOriginCaller;
}

/** @name PalletSessionCall */
export interface PalletSessionCall extends Enum {
  readonly isSetKeys: boolean;
  readonly asSetKeys: {
    readonly keys_: OpalRuntimeRuntimeCommonSessionKeys;
    readonly proof: Bytes;
  } & Struct;
  readonly isPurgeKeys: boolean;
  readonly type: 'SetKeys' | 'PurgeKeys';
}

/** @name PalletSessionError */
export interface PalletSessionError extends Enum {
  readonly isInvalidProof: boolean;
  readonly isNoAssociatedValidatorId: boolean;
  readonly isDuplicatedKey: boolean;
  readonly isNoKeys: boolean;
  readonly isNoAccount: boolean;
  readonly type: 'InvalidProof' | 'NoAssociatedValidatorId' | 'DuplicatedKey' | 'NoKeys' | 'NoAccount';
}

/** @name PalletSessionEvent */
export interface PalletSessionEvent extends Enum {
  readonly isNewSession: boolean;
  readonly asNewSession: {
    readonly sessionIndex: u32;
  } & Struct;
  readonly type: 'NewSession';
}

/** @name PalletStateTrieMigrationCall */
export interface PalletStateTrieMigrationCall extends Enum {
  readonly isControlAutoMigration: boolean;
  readonly asControlAutoMigration: {
    readonly maybeConfig: Option<PalletStateTrieMigrationMigrationLimits>;
  } & Struct;
  readonly isContinueMigrate: boolean;
  readonly asContinueMigrate: {
    readonly limits: PalletStateTrieMigrationMigrationLimits;
    readonly realSizeUpper: u32;
    readonly witnessTask: PalletStateTrieMigrationMigrationTask;
  } & Struct;
  readonly isMigrateCustomTop: boolean;
  readonly asMigrateCustomTop: {
    readonly keys_: Vec<Bytes>;
    readonly witnessSize: u32;
  } & Struct;
  readonly isMigrateCustomChild: boolean;
  readonly asMigrateCustomChild: {
    readonly root: Bytes;
    readonly childKeys: Vec<Bytes>;
    readonly totalSize: u32;
  } & Struct;
  readonly isSetSignedMaxLimits: boolean;
  readonly asSetSignedMaxLimits: {
    readonly limits: PalletStateTrieMigrationMigrationLimits;
  } & Struct;
  readonly isForceSetProgress: boolean;
  readonly asForceSetProgress: {
    readonly progressTop: PalletStateTrieMigrationProgress;
    readonly progressChild: PalletStateTrieMigrationProgress;
  } & Struct;
  readonly type: 'ControlAutoMigration' | 'ContinueMigrate' | 'MigrateCustomTop' | 'MigrateCustomChild' | 'SetSignedMaxLimits' | 'ForceSetProgress';
}

/** @name PalletStateTrieMigrationError */
export interface PalletStateTrieMigrationError extends Enum {
  readonly isMaxSignedLimits: boolean;
  readonly isKeyTooLong: boolean;
  readonly isNotEnoughFunds: boolean;
  readonly isBadWitness: boolean;
  readonly isSignedMigrationNotAllowed: boolean;
  readonly isBadChildRoot: boolean;
  readonly type: 'MaxSignedLimits' | 'KeyTooLong' | 'NotEnoughFunds' | 'BadWitness' | 'SignedMigrationNotAllowed' | 'BadChildRoot';
}

/** @name PalletStateTrieMigrationEvent */
export interface PalletStateTrieMigrationEvent extends Enum {
  readonly isMigrated: boolean;
  readonly asMigrated: {
    readonly top: u32;
    readonly child: u32;
    readonly compute: PalletStateTrieMigrationMigrationCompute;
  } & Struct;
  readonly isSlashed: boolean;
  readonly asSlashed: {
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isAutoMigrationFinished: boolean;
  readonly isHalted: boolean;
  readonly asHalted: {
    readonly error: PalletStateTrieMigrationError;
  } & Struct;
  readonly type: 'Migrated' | 'Slashed' | 'AutoMigrationFinished' | 'Halted';
}

/** @name PalletStateTrieMigrationHoldReason */
export interface PalletStateTrieMigrationHoldReason extends Enum {
  readonly isSlashForMigrate: boolean;
  readonly type: 'SlashForMigrate';
}

/** @name PalletStateTrieMigrationMigrationCompute */
export interface PalletStateTrieMigrationMigrationCompute extends Enum {
  readonly isSigned: boolean;
  readonly isAuto: boolean;
  readonly type: 'Signed' | 'Auto';
}

/** @name PalletStateTrieMigrationMigrationLimits */
export interface PalletStateTrieMigrationMigrationLimits extends Struct {
  readonly size_: u32;
  readonly item: u32;
}

/** @name PalletStateTrieMigrationMigrationTask */
export interface PalletStateTrieMigrationMigrationTask extends Struct {
  readonly progressTop: PalletStateTrieMigrationProgress;
  readonly progressChild: PalletStateTrieMigrationProgress;
  readonly size_: u32;
  readonly topItems: u32;
  readonly childItems: u32;
}

/** @name PalletStateTrieMigrationProgress */
export interface PalletStateTrieMigrationProgress extends Enum {
  readonly isToStart: boolean;
  readonly isLastKey: boolean;
  readonly asLastKey: Bytes;
  readonly isComplete: boolean;
  readonly type: 'ToStart' | 'LastKey' | 'Complete';
}

/** @name PalletStructureCall */
export interface PalletStructureCall extends Null {}

/** @name PalletStructureError */
export interface PalletStructureError extends Enum {
  readonly isOuroborosDetected: boolean;
  readonly isDepthLimit: boolean;
  readonly isBreadthLimit: boolean;
  readonly isTokenNotFound: boolean;
  readonly isCantNestTokenUnderCollection: boolean;
  readonly type: 'OuroborosDetected' | 'DepthLimit' | 'BreadthLimit' | 'TokenNotFound' | 'CantNestTokenUnderCollection';
}

/** @name PalletStructureEvent */
export interface PalletStructureEvent extends Enum {
  readonly isExecuted: boolean;
  readonly asExecuted: Result<Null, SpRuntimeDispatchError>;
  readonly type: 'Executed';
}

/** @name PalletSudoCall */
export interface PalletSudoCall extends Enum {
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
  readonly isRemoveKey: boolean;
  readonly type: 'Sudo' | 'SudoUncheckedWeight' | 'SetKey' | 'SudoAs' | 'RemoveKey';
}

/** @name PalletSudoError */
export interface PalletSudoError extends Enum {
  readonly isRequireSudo: boolean;
  readonly type: 'RequireSudo';
}

/** @name PalletSudoEvent */
export interface PalletSudoEvent extends Enum {
  readonly isSudid: boolean;
  readonly asSudid: {
    readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
  } & Struct;
  readonly isKeyChanged: boolean;
  readonly asKeyChanged: {
    readonly old: Option<AccountId32>;
    readonly new_: AccountId32;
  } & Struct;
  readonly isKeyRemoved: boolean;
  readonly isSudoAsDone: boolean;
  readonly asSudoAsDone: {
    readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
  } & Struct;
  readonly type: 'Sudid' | 'KeyChanged' | 'KeyRemoved' | 'SudoAsDone';
}

/** @name PalletTemplateTransactionPaymentChargeTransactionPayment */
export interface PalletTemplateTransactionPaymentChargeTransactionPayment extends Compact<u128> {}

/** @name PalletTemplateTransactionPaymentCheckNonce */
export interface PalletTemplateTransactionPaymentCheckNonce extends Compact<u32> {}

/** @name PalletTestUtilsCall */
export interface PalletTestUtilsCall extends Enum {
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

/** @name PalletTestUtilsError */
export interface PalletTestUtilsError extends Enum {
  readonly isTestPalletDisabled: boolean;
  readonly isTriggerRollback: boolean;
  readonly type: 'TestPalletDisabled' | 'TriggerRollback';
}

/** @name PalletTestUtilsEvent */
export interface PalletTestUtilsEvent extends Enum {
  readonly isValueIsSet: boolean;
  readonly isShouldRollback: boolean;
  readonly isBatchCompleted: boolean;
  readonly type: 'ValueIsSet' | 'ShouldRollback' | 'BatchCompleted';
}

/** @name PalletTimestampCall */
export interface PalletTimestampCall extends Enum {
  readonly isSet: boolean;
  readonly asSet: {
    readonly now: Compact<u64>;
  } & Struct;
  readonly type: 'Set';
}

/** @name PalletTransactionPaymentEvent */
export interface PalletTransactionPaymentEvent extends Enum {
  readonly isTransactionFeePaid: boolean;
  readonly asTransactionFeePaid: {
    readonly who: AccountId32;
    readonly actualFee: u128;
    readonly tip: u128;
  } & Struct;
  readonly type: 'TransactionFeePaid';
}

/** @name PalletTransactionPaymentReleases */
export interface PalletTransactionPaymentReleases extends Enum {
  readonly isV1Ancient: boolean;
  readonly isV2: boolean;
  readonly type: 'V1Ancient' | 'V2';
}

/** @name PalletTreasuryCall */
export interface PalletTreasuryCall extends Enum {
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
  readonly isSpendLocal: boolean;
  readonly asSpendLocal: {
    readonly amount: Compact<u128>;
    readonly beneficiary: MultiAddress;
  } & Struct;
  readonly isRemoveApproval: boolean;
  readonly asRemoveApproval: {
    readonly proposalId: Compact<u32>;
  } & Struct;
  readonly isSpend: boolean;
  readonly asSpend: {
    readonly assetKind: Null;
    readonly amount: Compact<u128>;
    readonly beneficiary: AccountId32;
    readonly validFrom: Option<u32>;
  } & Struct;
  readonly isPayout: boolean;
  readonly asPayout: {
    readonly index: u32;
  } & Struct;
  readonly isCheckStatus: boolean;
  readonly asCheckStatus: {
    readonly index: u32;
  } & Struct;
  readonly isVoidSpend: boolean;
  readonly asVoidSpend: {
    readonly index: u32;
  } & Struct;
  readonly type: 'ProposeSpend' | 'RejectProposal' | 'ApproveProposal' | 'SpendLocal' | 'RemoveApproval' | 'Spend' | 'Payout' | 'CheckStatus' | 'VoidSpend';
}

/** @name PalletTreasuryError */
export interface PalletTreasuryError extends Enum {
  readonly isInsufficientProposersBalance: boolean;
  readonly isInvalidIndex: boolean;
  readonly isTooManyApprovals: boolean;
  readonly isInsufficientPermission: boolean;
  readonly isProposalNotApproved: boolean;
  readonly isFailedToConvertBalance: boolean;
  readonly isSpendExpired: boolean;
  readonly isEarlyPayout: boolean;
  readonly isAlreadyAttempted: boolean;
  readonly isPayoutError: boolean;
  readonly isNotAttempted: boolean;
  readonly isInconclusive: boolean;
  readonly type: 'InsufficientProposersBalance' | 'InvalidIndex' | 'TooManyApprovals' | 'InsufficientPermission' | 'ProposalNotApproved' | 'FailedToConvertBalance' | 'SpendExpired' | 'EarlyPayout' | 'AlreadyAttempted' | 'PayoutError' | 'NotAttempted' | 'Inconclusive';
}

/** @name PalletTreasuryEvent */
export interface PalletTreasuryEvent extends Enum {
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
  readonly isUpdatedInactive: boolean;
  readonly asUpdatedInactive: {
    readonly reactivated: u128;
    readonly deactivated: u128;
  } & Struct;
  readonly isAssetSpendApproved: boolean;
  readonly asAssetSpendApproved: {
    readonly index: u32;
    readonly assetKind: Null;
    readonly amount: u128;
    readonly beneficiary: AccountId32;
    readonly validFrom: u32;
    readonly expireAt: u32;
  } & Struct;
  readonly isAssetSpendVoided: boolean;
  readonly asAssetSpendVoided: {
    readonly index: u32;
  } & Struct;
  readonly isPaid: boolean;
  readonly asPaid: {
    readonly index: u32;
    readonly paymentId: Null;
  } & Struct;
  readonly isPaymentFailed: boolean;
  readonly asPaymentFailed: {
    readonly index: u32;
    readonly paymentId: Null;
  } & Struct;
  readonly isSpendProcessed: boolean;
  readonly asSpendProcessed: {
    readonly index: u32;
  } & Struct;
  readonly type: 'Proposed' | 'Spending' | 'Awarded' | 'Rejected' | 'Burnt' | 'Rollover' | 'Deposit' | 'SpendApproved' | 'UpdatedInactive' | 'AssetSpendApproved' | 'AssetSpendVoided' | 'Paid' | 'PaymentFailed' | 'SpendProcessed';
}

/** @name PalletTreasuryPaymentState */
export interface PalletTreasuryPaymentState extends Enum {
  readonly isPending: boolean;
  readonly isAttempted: boolean;
  readonly asAttempted: {
    readonly id: Null;
  } & Struct;
  readonly isFailed: boolean;
  readonly type: 'Pending' | 'Attempted' | 'Failed';
}

/** @name PalletTreasuryProposal */
export interface PalletTreasuryProposal extends Struct {
  readonly proposer: AccountId32;
  readonly value: u128;
  readonly beneficiary: AccountId32;
  readonly bond: u128;
}

/** @name PalletTreasurySpendStatus */
export interface PalletTreasurySpendStatus extends Struct {
  readonly assetKind: Null;
  readonly amount: u128;
  readonly beneficiary: AccountId32;
  readonly validFrom: u32;
  readonly expireAt: u32;
  readonly status: PalletTreasuryPaymentState;
}

/** @name PalletUniqueCall */
export interface PalletUniqueCall extends Enum {
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
  readonly isApproveFrom: boolean;
  readonly asApproveFrom: {
    readonly from: PalletEvmAccountBasicCrossAccountIdRepr;
    readonly to: PalletEvmAccountBasicCrossAccountIdRepr;
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
  readonly type: 'CreateCollection' | 'CreateCollectionEx' | 'DestroyCollection' | 'AddToAllowList' | 'RemoveFromAllowList' | 'ChangeCollectionOwner' | 'AddCollectionAdmin' | 'RemoveCollectionAdmin' | 'SetCollectionSponsor' | 'ConfirmSponsorship' | 'RemoveCollectionSponsor' | 'CreateItem' | 'CreateMultipleItems' | 'SetCollectionProperties' | 'DeleteCollectionProperties' | 'SetTokenProperties' | 'DeleteTokenProperties' | 'SetTokenPropertyPermissions' | 'CreateMultipleItemsEx' | 'SetTransfersEnabledFlag' | 'BurnItem' | 'BurnFrom' | 'Transfer' | 'Approve' | 'ApproveFrom' | 'TransferFrom' | 'SetCollectionLimits' | 'SetCollectionPermissions' | 'Repartition' | 'SetAllowanceForAll' | 'ForceRepairCollection' | 'ForceRepairItem';
}

/** @name PalletUniqueError */
export interface PalletUniqueError extends Enum {
  readonly isCollectionDecimalPointLimitExceeded: boolean;
  readonly isEmptyArgument: boolean;
  readonly isRepartitionCalledOnNonRefungibleCollection: boolean;
  readonly type: 'CollectionDecimalPointLimitExceeded' | 'EmptyArgument' | 'RepartitionCalledOnNonRefungibleCollection';
}

/** @name PalletUtilityCall */
export interface PalletUtilityCall extends Enum {
  readonly isBatch: boolean;
  readonly asBatch: {
    readonly calls: Vec<Call>;
  } & Struct;
  readonly isAsDerivative: boolean;
  readonly asAsDerivative: {
    readonly index: u16;
    readonly call: Call;
  } & Struct;
  readonly isBatchAll: boolean;
  readonly asBatchAll: {
    readonly calls: Vec<Call>;
  } & Struct;
  readonly isDispatchAs: boolean;
  readonly asDispatchAs: {
    readonly asOrigin: OpalRuntimeOriginCaller;
    readonly call: Call;
  } & Struct;
  readonly isForceBatch: boolean;
  readonly asForceBatch: {
    readonly calls: Vec<Call>;
  } & Struct;
  readonly isWithWeight: boolean;
  readonly asWithWeight: {
    readonly call: Call;
    readonly weight: SpWeightsWeightV2Weight;
  } & Struct;
  readonly type: 'Batch' | 'AsDerivative' | 'BatchAll' | 'DispatchAs' | 'ForceBatch' | 'WithWeight';
}

/** @name PalletUtilityError */
export interface PalletUtilityError extends Enum {
  readonly isTooManyCalls: boolean;
  readonly type: 'TooManyCalls';
}

/** @name PalletUtilityEvent */
export interface PalletUtilityEvent extends Enum {
  readonly isBatchInterrupted: boolean;
  readonly asBatchInterrupted: {
    readonly index: u32;
    readonly error: SpRuntimeDispatchError;
  } & Struct;
  readonly isBatchCompleted: boolean;
  readonly isBatchCompletedWithErrors: boolean;
  readonly isItemCompleted: boolean;
  readonly isItemFailed: boolean;
  readonly asItemFailed: {
    readonly error: SpRuntimeDispatchError;
  } & Struct;
  readonly isDispatchedAs: boolean;
  readonly asDispatchedAs: {
    readonly result: Result<Null, SpRuntimeDispatchError>;
  } & Struct;
  readonly type: 'BatchInterrupted' | 'BatchCompleted' | 'BatchCompletedWithErrors' | 'ItemCompleted' | 'ItemFailed' | 'DispatchedAs';
}

/** @name PalletXcmCall */
export interface PalletXcmCall extends Enum {
  readonly isSend: boolean;
  readonly asSend: {
    readonly dest: XcmVersionedLocation;
    readonly message: XcmVersionedXcm;
  } & Struct;
  readonly isTeleportAssets: boolean;
  readonly asTeleportAssets: {
    readonly dest: XcmVersionedLocation;
    readonly beneficiary: XcmVersionedLocation;
    readonly assets: XcmVersionedAssets;
    readonly feeAssetItem: u32;
  } & Struct;
  readonly isReserveTransferAssets: boolean;
  readonly asReserveTransferAssets: {
    readonly dest: XcmVersionedLocation;
    readonly beneficiary: XcmVersionedLocation;
    readonly assets: XcmVersionedAssets;
    readonly feeAssetItem: u32;
  } & Struct;
  readonly isExecute: boolean;
  readonly asExecute: {
    readonly message: XcmVersionedXcm;
    readonly maxWeight: SpWeightsWeightV2Weight;
  } & Struct;
  readonly isForceXcmVersion: boolean;
  readonly asForceXcmVersion: {
    readonly location: StagingXcmV4Location;
    readonly version: u32;
  } & Struct;
  readonly isForceDefaultXcmVersion: boolean;
  readonly asForceDefaultXcmVersion: {
    readonly maybeXcmVersion: Option<u32>;
  } & Struct;
  readonly isForceSubscribeVersionNotify: boolean;
  readonly asForceSubscribeVersionNotify: {
    readonly location: XcmVersionedLocation;
  } & Struct;
  readonly isForceUnsubscribeVersionNotify: boolean;
  readonly asForceUnsubscribeVersionNotify: {
    readonly location: XcmVersionedLocation;
  } & Struct;
  readonly isLimitedReserveTransferAssets: boolean;
  readonly asLimitedReserveTransferAssets: {
    readonly dest: XcmVersionedLocation;
    readonly beneficiary: XcmVersionedLocation;
    readonly assets: XcmVersionedAssets;
    readonly feeAssetItem: u32;
    readonly weightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isLimitedTeleportAssets: boolean;
  readonly asLimitedTeleportAssets: {
    readonly dest: XcmVersionedLocation;
    readonly beneficiary: XcmVersionedLocation;
    readonly assets: XcmVersionedAssets;
    readonly feeAssetItem: u32;
    readonly weightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isForceSuspension: boolean;
  readonly asForceSuspension: {
    readonly suspended: bool;
  } & Struct;
  readonly isTransferAssets: boolean;
  readonly asTransferAssets: {
    readonly dest: XcmVersionedLocation;
    readonly beneficiary: XcmVersionedLocation;
    readonly assets: XcmVersionedAssets;
    readonly feeAssetItem: u32;
    readonly weightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isClaimAssets: boolean;
  readonly asClaimAssets: {
    readonly assets: XcmVersionedAssets;
    readonly beneficiary: XcmVersionedLocation;
  } & Struct;
  readonly type: 'Send' | 'TeleportAssets' | 'ReserveTransferAssets' | 'Execute' | 'ForceXcmVersion' | 'ForceDefaultXcmVersion' | 'ForceSubscribeVersionNotify' | 'ForceUnsubscribeVersionNotify' | 'LimitedReserveTransferAssets' | 'LimitedTeleportAssets' | 'ForceSuspension' | 'TransferAssets' | 'ClaimAssets';
}

/** @name PalletXcmError */
export interface PalletXcmError extends Enum {
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
  readonly isCannotCheckOutTeleport: boolean;
  readonly isLowBalance: boolean;
  readonly isTooManyLocks: boolean;
  readonly isAccountNotSovereign: boolean;
  readonly isFeesNotMet: boolean;
  readonly isLockNotFound: boolean;
  readonly isInUse: boolean;
  readonly isInvalidAssetNotConcrete: boolean;
  readonly isInvalidAssetUnknownReserve: boolean;
  readonly isInvalidAssetUnsupportedReserve: boolean;
  readonly isTooManyReserves: boolean;
  readonly isLocalExecutionIncomplete: boolean;
  readonly type: 'Unreachable' | 'SendFailure' | 'Filtered' | 'UnweighableMessage' | 'DestinationNotInvertible' | 'Empty' | 'CannotReanchor' | 'TooManyAssets' | 'InvalidOrigin' | 'BadVersion' | 'BadLocation' | 'NoSubscription' | 'AlreadySubscribed' | 'CannotCheckOutTeleport' | 'LowBalance' | 'TooManyLocks' | 'AccountNotSovereign' | 'FeesNotMet' | 'LockNotFound' | 'InUse' | 'InvalidAssetNotConcrete' | 'InvalidAssetUnknownReserve' | 'InvalidAssetUnsupportedReserve' | 'TooManyReserves' | 'LocalExecutionIncomplete';
}

/** @name PalletXcmEvent */
export interface PalletXcmEvent extends Enum {
  readonly isAttempted: boolean;
  readonly asAttempted: {
    readonly outcome: StagingXcmV4TraitsOutcome;
  } & Struct;
  readonly isSent: boolean;
  readonly asSent: {
    readonly origin: StagingXcmV4Location;
    readonly destination: StagingXcmV4Location;
    readonly message: StagingXcmV4Xcm;
    readonly messageId: U8aFixed;
  } & Struct;
  readonly isUnexpectedResponse: boolean;
  readonly asUnexpectedResponse: {
    readonly origin: StagingXcmV4Location;
    readonly queryId: u64;
  } & Struct;
  readonly isResponseReady: boolean;
  readonly asResponseReady: {
    readonly queryId: u64;
    readonly response: StagingXcmV4Response;
  } & Struct;
  readonly isNotified: boolean;
  readonly asNotified: {
    readonly queryId: u64;
    readonly palletIndex: u8;
    readonly callIndex: u8;
  } & Struct;
  readonly isNotifyOverweight: boolean;
  readonly asNotifyOverweight: {
    readonly queryId: u64;
    readonly palletIndex: u8;
    readonly callIndex: u8;
    readonly actualWeight: SpWeightsWeightV2Weight;
    readonly maxBudgetedWeight: SpWeightsWeightV2Weight;
  } & Struct;
  readonly isNotifyDispatchError: boolean;
  readonly asNotifyDispatchError: {
    readonly queryId: u64;
    readonly palletIndex: u8;
    readonly callIndex: u8;
  } & Struct;
  readonly isNotifyDecodeFailed: boolean;
  readonly asNotifyDecodeFailed: {
    readonly queryId: u64;
    readonly palletIndex: u8;
    readonly callIndex: u8;
  } & Struct;
  readonly isInvalidResponder: boolean;
  readonly asInvalidResponder: {
    readonly origin: StagingXcmV4Location;
    readonly queryId: u64;
    readonly expectedLocation: Option<StagingXcmV4Location>;
  } & Struct;
  readonly isInvalidResponderVersion: boolean;
  readonly asInvalidResponderVersion: {
    readonly origin: StagingXcmV4Location;
    readonly queryId: u64;
  } & Struct;
  readonly isResponseTaken: boolean;
  readonly asResponseTaken: {
    readonly queryId: u64;
  } & Struct;
  readonly isAssetsTrapped: boolean;
  readonly asAssetsTrapped: {
    readonly hash_: H256;
    readonly origin: StagingXcmV4Location;
    readonly assets: XcmVersionedAssets;
  } & Struct;
  readonly isVersionChangeNotified: boolean;
  readonly asVersionChangeNotified: {
    readonly destination: StagingXcmV4Location;
    readonly result: u32;
    readonly cost: StagingXcmV4AssetAssets;
    readonly messageId: U8aFixed;
  } & Struct;
  readonly isSupportedVersionChanged: boolean;
  readonly asSupportedVersionChanged: {
    readonly location: StagingXcmV4Location;
    readonly version: u32;
  } & Struct;
  readonly isNotifyTargetSendFail: boolean;
  readonly asNotifyTargetSendFail: {
    readonly location: StagingXcmV4Location;
    readonly queryId: u64;
    readonly error: XcmV3TraitsError;
  } & Struct;
  readonly isNotifyTargetMigrationFail: boolean;
  readonly asNotifyTargetMigrationFail: {
    readonly location: XcmVersionedLocation;
    readonly queryId: u64;
  } & Struct;
  readonly isInvalidQuerierVersion: boolean;
  readonly asInvalidQuerierVersion: {
    readonly origin: StagingXcmV4Location;
    readonly queryId: u64;
  } & Struct;
  readonly isInvalidQuerier: boolean;
  readonly asInvalidQuerier: {
    readonly origin: StagingXcmV4Location;
    readonly queryId: u64;
    readonly expectedQuerier: StagingXcmV4Location;
    readonly maybeActualQuerier: Option<StagingXcmV4Location>;
  } & Struct;
  readonly isVersionNotifyStarted: boolean;
  readonly asVersionNotifyStarted: {
    readonly destination: StagingXcmV4Location;
    readonly cost: StagingXcmV4AssetAssets;
    readonly messageId: U8aFixed;
  } & Struct;
  readonly isVersionNotifyRequested: boolean;
  readonly asVersionNotifyRequested: {
    readonly destination: StagingXcmV4Location;
    readonly cost: StagingXcmV4AssetAssets;
    readonly messageId: U8aFixed;
  } & Struct;
  readonly isVersionNotifyUnrequested: boolean;
  readonly asVersionNotifyUnrequested: {
    readonly destination: StagingXcmV4Location;
    readonly cost: StagingXcmV4AssetAssets;
    readonly messageId: U8aFixed;
  } & Struct;
  readonly isFeesPaid: boolean;
  readonly asFeesPaid: {
    readonly paying: StagingXcmV4Location;
    readonly fees: StagingXcmV4AssetAssets;
  } & Struct;
  readonly isAssetsClaimed: boolean;
  readonly asAssetsClaimed: {
    readonly hash_: H256;
    readonly origin: StagingXcmV4Location;
    readonly assets: XcmVersionedAssets;
  } & Struct;
  readonly isVersionMigrationFinished: boolean;
  readonly asVersionMigrationFinished: {
    readonly version: u32;
  } & Struct;
  readonly type: 'Attempted' | 'Sent' | 'UnexpectedResponse' | 'ResponseReady' | 'Notified' | 'NotifyOverweight' | 'NotifyDispatchError' | 'NotifyDecodeFailed' | 'InvalidResponder' | 'InvalidResponderVersion' | 'ResponseTaken' | 'AssetsTrapped' | 'VersionChangeNotified' | 'SupportedVersionChanged' | 'NotifyTargetSendFail' | 'NotifyTargetMigrationFail' | 'InvalidQuerierVersion' | 'InvalidQuerier' | 'VersionNotifyStarted' | 'VersionNotifyRequested' | 'VersionNotifyUnrequested' | 'FeesPaid' | 'AssetsClaimed' | 'VersionMigrationFinished';
}

/** @name PalletXcmOrigin */
export interface PalletXcmOrigin extends Enum {
  readonly isXcm: boolean;
  readonly asXcm: StagingXcmV4Location;
  readonly isResponse: boolean;
  readonly asResponse: StagingXcmV4Location;
  readonly type: 'Xcm' | 'Response';
}

/** @name PalletXcmQueryStatus */
export interface PalletXcmQueryStatus extends Enum {
  readonly isPending: boolean;
  readonly asPending: {
    readonly responder: XcmVersionedLocation;
    readonly maybeMatchQuerier: Option<XcmVersionedLocation>;
    readonly maybeNotify: Option<ITuple<[u8, u8]>>;
    readonly timeout: u32;
  } & Struct;
  readonly isVersionNotifier: boolean;
  readonly asVersionNotifier: {
    readonly origin: XcmVersionedLocation;
    readonly isActive: bool;
  } & Struct;
  readonly isReady: boolean;
  readonly asReady: {
    readonly response: XcmVersionedResponse;
    readonly at: u32;
  } & Struct;
  readonly type: 'Pending' | 'VersionNotifier' | 'Ready';
}

/** @name PalletXcmRemoteLockedFungibleRecord */
export interface PalletXcmRemoteLockedFungibleRecord extends Struct {
  readonly amount: u128;
  readonly owner: XcmVersionedLocation;
  readonly locker: XcmVersionedLocation;
  readonly consumers: Vec<ITuple<[Null, u128]>>;
}

/** @name PalletXcmVersionMigrationStage */
export interface PalletXcmVersionMigrationStage extends Enum {
  readonly isMigrateSupportedVersion: boolean;
  readonly isMigrateVersionNotifiers: boolean;
  readonly isNotifyCurrentTargets: boolean;
  readonly asNotifyCurrentTargets: Option<Bytes>;
  readonly isMigrateAndNotifyOldTargets: boolean;
  readonly type: 'MigrateSupportedVersion' | 'MigrateVersionNotifiers' | 'NotifyCurrentTargets' | 'MigrateAndNotifyOldTargets';
}

/** @name PhantomTypeUpDataStructs */
export interface PhantomTypeUpDataStructs extends Vec<ITuple<[UpDataStructsTokenData, UpDataStructsRpcCollection, UpPovEstimateRpcPovInfo]>> {}

/** @name PolkadotCorePrimitivesInboundDownwardMessage */
export interface PolkadotCorePrimitivesInboundDownwardMessage extends Struct {
  readonly sentAt: u32;
  readonly msg: Bytes;
}

/** @name PolkadotCorePrimitivesInboundHrmpMessage */
export interface PolkadotCorePrimitivesInboundHrmpMessage extends Struct {
  readonly sentAt: u32;
  readonly data: Bytes;
}

/** @name PolkadotCorePrimitivesOutboundHrmpMessage */
export interface PolkadotCorePrimitivesOutboundHrmpMessage extends Struct {
  readonly recipient: u32;
  readonly data: Bytes;
}

/** @name PolkadotPrimitivesV6AbridgedHostConfiguration */
export interface PolkadotPrimitivesV6AbridgedHostConfiguration extends Struct {
  readonly maxCodeSize: u32;
  readonly maxHeadDataSize: u32;
  readonly maxUpwardQueueCount: u32;
  readonly maxUpwardQueueSize: u32;
  readonly maxUpwardMessageSize: u32;
  readonly maxUpwardMessageNumPerCandidate: u32;
  readonly hrmpMaxMessageNumPerCandidate: u32;
  readonly validationUpgradeCooldown: u32;
  readonly validationUpgradeDelay: u32;
  readonly asyncBackingParams: PolkadotPrimitivesV6AsyncBackingAsyncBackingParams;
}

/** @name PolkadotPrimitivesV6AbridgedHrmpChannel */
export interface PolkadotPrimitivesV6AbridgedHrmpChannel extends Struct {
  readonly maxCapacity: u32;
  readonly maxTotalSize: u32;
  readonly maxMessageSize: u32;
  readonly msgCount: u32;
  readonly totalSize: u32;
  readonly mqcHead: Option<H256>;
}

/** @name PolkadotPrimitivesV6AsyncBackingAsyncBackingParams */
export interface PolkadotPrimitivesV6AsyncBackingAsyncBackingParams extends Struct {
  readonly maxCandidateDepth: u32;
  readonly allowedAncestryLen: u32;
}

/** @name PolkadotPrimitivesV6PersistedValidationData */
export interface PolkadotPrimitivesV6PersistedValidationData extends Struct {
  readonly parentHead: Bytes;
  readonly relayParentNumber: u32;
  readonly relayParentStorageRoot: H256;
  readonly maxPovSize: u32;
}

/** @name PolkadotPrimitivesV6UpgradeGoAhead */
export interface PolkadotPrimitivesV6UpgradeGoAhead extends Enum {
  readonly isAbort: boolean;
  readonly isGoAhead: boolean;
  readonly type: 'Abort' | 'GoAhead';
}

/** @name PolkadotPrimitivesV6UpgradeRestriction */
export interface PolkadotPrimitivesV6UpgradeRestriction extends Enum {
  readonly isPresent: boolean;
  readonly type: 'Present';
}

/** @name SpArithmeticArithmeticError */
export interface SpArithmeticArithmeticError extends Enum {
  readonly isUnderflow: boolean;
  readonly isOverflow: boolean;
  readonly isDivisionByZero: boolean;
  readonly type: 'Underflow' | 'Overflow' | 'DivisionByZero';
}

/** @name SpConsensusAuraSr25519AppSr25519Public */
export interface SpConsensusAuraSr25519AppSr25519Public extends SpCoreSr25519Public {}

/** @name SpCoreCryptoKeyTypeId */
export interface SpCoreCryptoKeyTypeId extends U8aFixed {}

/** @name SpCoreEcdsaSignature */
export interface SpCoreEcdsaSignature extends U8aFixed {}

/** @name SpCoreEd25519Signature */
export interface SpCoreEd25519Signature extends U8aFixed {}

/** @name SpCoreSr25519Public */
export interface SpCoreSr25519Public extends U8aFixed {}

/** @name SpCoreSr25519Signature */
export interface SpCoreSr25519Signature extends U8aFixed {}

/** @name SpCoreVoid */
export interface SpCoreVoid extends Null {}

/** @name SpRuntimeBlakeTwo256 */
export interface SpRuntimeBlakeTwo256 extends Null {}

/** @name SpRuntimeDigest */
export interface SpRuntimeDigest extends Struct {
  readonly logs: Vec<SpRuntimeDigestDigestItem>;
}

/** @name SpRuntimeDigestDigestItem */
export interface SpRuntimeDigestDigestItem extends Enum {
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

/** @name SpRuntimeDispatchError */
export interface SpRuntimeDispatchError extends Enum {
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
  readonly asArithmetic: SpArithmeticArithmeticError;
  readonly isTransactional: boolean;
  readonly asTransactional: SpRuntimeTransactionalError;
  readonly isExhausted: boolean;
  readonly isCorruption: boolean;
  readonly isUnavailable: boolean;
  readonly isRootNotAllowed: boolean;
  readonly type: 'Other' | 'CannotLookup' | 'BadOrigin' | 'Module' | 'ConsumerRemaining' | 'NoProviders' | 'TooManyConsumers' | 'Token' | 'Arithmetic' | 'Transactional' | 'Exhausted' | 'Corruption' | 'Unavailable' | 'RootNotAllowed';
}

/** @name SpRuntimeModuleError */
export interface SpRuntimeModuleError extends Struct {
  readonly index: u8;
  readonly error: U8aFixed;
}

/** @name SpRuntimeMultiSignature */
export interface SpRuntimeMultiSignature extends Enum {
  readonly isEd25519: boolean;
  readonly asEd25519: SpCoreEd25519Signature;
  readonly isSr25519: boolean;
  readonly asSr25519: SpCoreSr25519Signature;
  readonly isEcdsa: boolean;
  readonly asEcdsa: SpCoreEcdsaSignature;
  readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
}

/** @name SpRuntimeTokenError */
export interface SpRuntimeTokenError extends Enum {
  readonly isFundsUnavailable: boolean;
  readonly isOnlyProvider: boolean;
  readonly isBelowMinimum: boolean;
  readonly isCannotCreate: boolean;
  readonly isUnknownAsset: boolean;
  readonly isFrozen: boolean;
  readonly isUnsupported: boolean;
  readonly isCannotCreateHold: boolean;
  readonly isNotExpendable: boolean;
  readonly isBlocked: boolean;
  readonly type: 'FundsUnavailable' | 'OnlyProvider' | 'BelowMinimum' | 'CannotCreate' | 'UnknownAsset' | 'Frozen' | 'Unsupported' | 'CannotCreateHold' | 'NotExpendable' | 'Blocked';
}

/** @name SpRuntimeTransactionalError */
export interface SpRuntimeTransactionalError extends Enum {
  readonly isLimitReached: boolean;
  readonly isNoLayer: boolean;
  readonly type: 'LimitReached' | 'NoLayer';
}

/** @name SpRuntimeTransactionValidityInvalidTransaction */
export interface SpRuntimeTransactionValidityInvalidTransaction extends Enum {
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

/** @name SpRuntimeTransactionValidityTransactionValidityError */
export interface SpRuntimeTransactionValidityTransactionValidityError extends Enum {
  readonly isInvalid: boolean;
  readonly asInvalid: SpRuntimeTransactionValidityInvalidTransaction;
  readonly isUnknown: boolean;
  readonly asUnknown: SpRuntimeTransactionValidityUnknownTransaction;
  readonly type: 'Invalid' | 'Unknown';
}

/** @name SpRuntimeTransactionValidityUnknownTransaction */
export interface SpRuntimeTransactionValidityUnknownTransaction extends Enum {
  readonly isCannotLookup: boolean;
  readonly isNoUnsignedValidator: boolean;
  readonly isCustom: boolean;
  readonly asCustom: u8;
  readonly type: 'CannotLookup' | 'NoUnsignedValidator' | 'Custom';
}

/** @name SpTrieStorageProof */
export interface SpTrieStorageProof extends Struct {
  readonly trieNodes: BTreeSet<Bytes>;
}

/** @name SpVersionRuntimeVersion */
export interface SpVersionRuntimeVersion extends Struct {
  readonly specName: Text;
  readonly implName: Text;
  readonly authoringVersion: u32;
  readonly specVersion: u32;
  readonly implVersion: u32;
  readonly apis: Vec<ITuple<[U8aFixed, u32]>>;
  readonly transactionVersion: u32;
  readonly stateVersion: u8;
}

/** @name SpWeightsRuntimeDbWeight */
export interface SpWeightsRuntimeDbWeight extends Struct {
  readonly read: u64;
  readonly write: u64;
}

/** @name SpWeightsWeightV2Weight */
export interface SpWeightsWeightV2Weight extends Struct {
  readonly refTime: Compact<u64>;
  readonly proofSize: Compact<u64>;
}

/** @name StagingParachainInfoCall */
export interface StagingParachainInfoCall extends Null {}

/** @name StagingXcmV3MultiLocation */
export interface StagingXcmV3MultiLocation extends Struct {
  readonly parents: u8;
  readonly interior: XcmV3Junctions;
}

/** @name StagingXcmV4Asset */
export interface StagingXcmV4Asset extends Struct {
  readonly id: StagingXcmV4AssetAssetId;
  readonly fun: StagingXcmV4AssetFungibility;
}

/** @name StagingXcmV4AssetAssetFilter */
export interface StagingXcmV4AssetAssetFilter extends Enum {
  readonly isDefinite: boolean;
  readonly asDefinite: StagingXcmV4AssetAssets;
  readonly isWild: boolean;
  readonly asWild: StagingXcmV4AssetWildAsset;
  readonly type: 'Definite' | 'Wild';
}

/** @name StagingXcmV4AssetAssetId */
export interface StagingXcmV4AssetAssetId extends StagingXcmV4Location {}

/** @name StagingXcmV4AssetAssetInstance */
export interface StagingXcmV4AssetAssetInstance extends Enum {
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
  readonly type: 'Undefined' | 'Index' | 'Array4' | 'Array8' | 'Array16' | 'Array32';
}

/** @name StagingXcmV4AssetAssets */
export interface StagingXcmV4AssetAssets extends Vec<StagingXcmV4Asset> {}

/** @name StagingXcmV4AssetFungibility */
export interface StagingXcmV4AssetFungibility extends Enum {
  readonly isFungible: boolean;
  readonly asFungible: Compact<u128>;
  readonly isNonFungible: boolean;
  readonly asNonFungible: StagingXcmV4AssetAssetInstance;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name StagingXcmV4AssetWildAsset */
export interface StagingXcmV4AssetWildAsset extends Enum {
  readonly isAll: boolean;
  readonly isAllOf: boolean;
  readonly asAllOf: {
    readonly id: StagingXcmV4AssetAssetId;
    readonly fun: StagingXcmV4AssetWildFungibility;
  } & Struct;
  readonly isAllCounted: boolean;
  readonly asAllCounted: Compact<u32>;
  readonly isAllOfCounted: boolean;
  readonly asAllOfCounted: {
    readonly id: StagingXcmV4AssetAssetId;
    readonly fun: StagingXcmV4AssetWildFungibility;
    readonly count: Compact<u32>;
  } & Struct;
  readonly type: 'All' | 'AllOf' | 'AllCounted' | 'AllOfCounted';
}

/** @name StagingXcmV4AssetWildFungibility */
export interface StagingXcmV4AssetWildFungibility extends Enum {
  readonly isFungible: boolean;
  readonly isNonFungible: boolean;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name StagingXcmV4Instruction */
export interface StagingXcmV4Instruction extends Enum {
  readonly isWithdrawAsset: boolean;
  readonly asWithdrawAsset: StagingXcmV4AssetAssets;
  readonly isReserveAssetDeposited: boolean;
  readonly asReserveAssetDeposited: StagingXcmV4AssetAssets;
  readonly isReceiveTeleportedAsset: boolean;
  readonly asReceiveTeleportedAsset: StagingXcmV4AssetAssets;
  readonly isQueryResponse: boolean;
  readonly asQueryResponse: {
    readonly queryId: Compact<u64>;
    readonly response: StagingXcmV4Response;
    readonly maxWeight: SpWeightsWeightV2Weight;
    readonly querier: Option<StagingXcmV4Location>;
  } & Struct;
  readonly isTransferAsset: boolean;
  readonly asTransferAsset: {
    readonly assets: StagingXcmV4AssetAssets;
    readonly beneficiary: StagingXcmV4Location;
  } & Struct;
  readonly isTransferReserveAsset: boolean;
  readonly asTransferReserveAsset: {
    readonly assets: StagingXcmV4AssetAssets;
    readonly dest: StagingXcmV4Location;
    readonly xcm: StagingXcmV4Xcm;
  } & Struct;
  readonly isTransact: boolean;
  readonly asTransact: {
    readonly originKind: XcmV2OriginKind;
    readonly requireWeightAtMost: SpWeightsWeightV2Weight;
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
  readonly asDescendOrigin: StagingXcmV4Junctions;
  readonly isReportError: boolean;
  readonly asReportError: StagingXcmV4QueryResponseInfo;
  readonly isDepositAsset: boolean;
  readonly asDepositAsset: {
    readonly assets: StagingXcmV4AssetAssetFilter;
    readonly beneficiary: StagingXcmV4Location;
  } & Struct;
  readonly isDepositReserveAsset: boolean;
  readonly asDepositReserveAsset: {
    readonly assets: StagingXcmV4AssetAssetFilter;
    readonly dest: StagingXcmV4Location;
    readonly xcm: StagingXcmV4Xcm;
  } & Struct;
  readonly isExchangeAsset: boolean;
  readonly asExchangeAsset: {
    readonly give: StagingXcmV4AssetAssetFilter;
    readonly want: StagingXcmV4AssetAssets;
    readonly maximal: bool;
  } & Struct;
  readonly isInitiateReserveWithdraw: boolean;
  readonly asInitiateReserveWithdraw: {
    readonly assets: StagingXcmV4AssetAssetFilter;
    readonly reserve: StagingXcmV4Location;
    readonly xcm: StagingXcmV4Xcm;
  } & Struct;
  readonly isInitiateTeleport: boolean;
  readonly asInitiateTeleport: {
    readonly assets: StagingXcmV4AssetAssetFilter;
    readonly dest: StagingXcmV4Location;
    readonly xcm: StagingXcmV4Xcm;
  } & Struct;
  readonly isReportHolding: boolean;
  readonly asReportHolding: {
    readonly responseInfo: StagingXcmV4QueryResponseInfo;
    readonly assets: StagingXcmV4AssetAssetFilter;
  } & Struct;
  readonly isBuyExecution: boolean;
  readonly asBuyExecution: {
    readonly fees: StagingXcmV4Asset;
    readonly weightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isRefundSurplus: boolean;
  readonly isSetErrorHandler: boolean;
  readonly asSetErrorHandler: StagingXcmV4Xcm;
  readonly isSetAppendix: boolean;
  readonly asSetAppendix: StagingXcmV4Xcm;
  readonly isClearError: boolean;
  readonly isClaimAsset: boolean;
  readonly asClaimAsset: {
    readonly assets: StagingXcmV4AssetAssets;
    readonly ticket: StagingXcmV4Location;
  } & Struct;
  readonly isTrap: boolean;
  readonly asTrap: Compact<u64>;
  readonly isSubscribeVersion: boolean;
  readonly asSubscribeVersion: {
    readonly queryId: Compact<u64>;
    readonly maxResponseWeight: SpWeightsWeightV2Weight;
  } & Struct;
  readonly isUnsubscribeVersion: boolean;
  readonly isBurnAsset: boolean;
  readonly asBurnAsset: StagingXcmV4AssetAssets;
  readonly isExpectAsset: boolean;
  readonly asExpectAsset: StagingXcmV4AssetAssets;
  readonly isExpectOrigin: boolean;
  readonly asExpectOrigin: Option<StagingXcmV4Location>;
  readonly isExpectError: boolean;
  readonly asExpectError: Option<ITuple<[u32, XcmV3TraitsError]>>;
  readonly isExpectTransactStatus: boolean;
  readonly asExpectTransactStatus: XcmV3MaybeErrorCode;
  readonly isQueryPallet: boolean;
  readonly asQueryPallet: {
    readonly moduleName: Bytes;
    readonly responseInfo: StagingXcmV4QueryResponseInfo;
  } & Struct;
  readonly isExpectPallet: boolean;
  readonly asExpectPallet: {
    readonly index: Compact<u32>;
    readonly name: Bytes;
    readonly moduleName: Bytes;
    readonly crateMajor: Compact<u32>;
    readonly minCrateMinor: Compact<u32>;
  } & Struct;
  readonly isReportTransactStatus: boolean;
  readonly asReportTransactStatus: StagingXcmV4QueryResponseInfo;
  readonly isClearTransactStatus: boolean;
  readonly isUniversalOrigin: boolean;
  readonly asUniversalOrigin: StagingXcmV4Junction;
  readonly isExportMessage: boolean;
  readonly asExportMessage: {
    readonly network: StagingXcmV4JunctionNetworkId;
    readonly destination: StagingXcmV4Junctions;
    readonly xcm: StagingXcmV4Xcm;
  } & Struct;
  readonly isLockAsset: boolean;
  readonly asLockAsset: {
    readonly asset: StagingXcmV4Asset;
    readonly unlocker: StagingXcmV4Location;
  } & Struct;
  readonly isUnlockAsset: boolean;
  readonly asUnlockAsset: {
    readonly asset: StagingXcmV4Asset;
    readonly target: StagingXcmV4Location;
  } & Struct;
  readonly isNoteUnlockable: boolean;
  readonly asNoteUnlockable: {
    readonly asset: StagingXcmV4Asset;
    readonly owner: StagingXcmV4Location;
  } & Struct;
  readonly isRequestUnlock: boolean;
  readonly asRequestUnlock: {
    readonly asset: StagingXcmV4Asset;
    readonly locker: StagingXcmV4Location;
  } & Struct;
  readonly isSetFeesMode: boolean;
  readonly asSetFeesMode: {
    readonly jitWithdraw: bool;
  } & Struct;
  readonly isSetTopic: boolean;
  readonly asSetTopic: U8aFixed;
  readonly isClearTopic: boolean;
  readonly isAliasOrigin: boolean;
  readonly asAliasOrigin: StagingXcmV4Location;
  readonly isUnpaidExecution: boolean;
  readonly asUnpaidExecution: {
    readonly weightLimit: XcmV3WeightLimit;
    readonly checkOrigin: Option<StagingXcmV4Location>;
  } & Struct;
  readonly type: 'WithdrawAsset' | 'ReserveAssetDeposited' | 'ReceiveTeleportedAsset' | 'QueryResponse' | 'TransferAsset' | 'TransferReserveAsset' | 'Transact' | 'HrmpNewChannelOpenRequest' | 'HrmpChannelAccepted' | 'HrmpChannelClosing' | 'ClearOrigin' | 'DescendOrigin' | 'ReportError' | 'DepositAsset' | 'DepositReserveAsset' | 'ExchangeAsset' | 'InitiateReserveWithdraw' | 'InitiateTeleport' | 'ReportHolding' | 'BuyExecution' | 'RefundSurplus' | 'SetErrorHandler' | 'SetAppendix' | 'ClearError' | 'ClaimAsset' | 'Trap' | 'SubscribeVersion' | 'UnsubscribeVersion' | 'BurnAsset' | 'ExpectAsset' | 'ExpectOrigin' | 'ExpectError' | 'ExpectTransactStatus' | 'QueryPallet' | 'ExpectPallet' | 'ReportTransactStatus' | 'ClearTransactStatus' | 'UniversalOrigin' | 'ExportMessage' | 'LockAsset' | 'UnlockAsset' | 'NoteUnlockable' | 'RequestUnlock' | 'SetFeesMode' | 'SetTopic' | 'ClearTopic' | 'AliasOrigin' | 'UnpaidExecution';
}

/** @name StagingXcmV4Junction */
export interface StagingXcmV4Junction extends Enum {
  readonly isParachain: boolean;
  readonly asParachain: Compact<u32>;
  readonly isAccountId32: boolean;
  readonly asAccountId32: {
    readonly network: Option<StagingXcmV4JunctionNetworkId>;
    readonly id: U8aFixed;
  } & Struct;
  readonly isAccountIndex64: boolean;
  readonly asAccountIndex64: {
    readonly network: Option<StagingXcmV4JunctionNetworkId>;
    readonly index: Compact<u64>;
  } & Struct;
  readonly isAccountKey20: boolean;
  readonly asAccountKey20: {
    readonly network: Option<StagingXcmV4JunctionNetworkId>;
    readonly key: U8aFixed;
  } & Struct;
  readonly isPalletInstance: boolean;
  readonly asPalletInstance: u8;
  readonly isGeneralIndex: boolean;
  readonly asGeneralIndex: Compact<u128>;
  readonly isGeneralKey: boolean;
  readonly asGeneralKey: {
    readonly length: u8;
    readonly data: U8aFixed;
  } & Struct;
  readonly isOnlyChild: boolean;
  readonly isPlurality: boolean;
  readonly asPlurality: {
    readonly id: XcmV3JunctionBodyId;
    readonly part: XcmV3JunctionBodyPart;
  } & Struct;
  readonly isGlobalConsensus: boolean;
  readonly asGlobalConsensus: StagingXcmV4JunctionNetworkId;
  readonly type: 'Parachain' | 'AccountId32' | 'AccountIndex64' | 'AccountKey20' | 'PalletInstance' | 'GeneralIndex' | 'GeneralKey' | 'OnlyChild' | 'Plurality' | 'GlobalConsensus';
}

/** @name StagingXcmV4JunctionNetworkId */
export interface StagingXcmV4JunctionNetworkId extends Enum {
  readonly isByGenesis: boolean;
  readonly asByGenesis: U8aFixed;
  readonly isByFork: boolean;
  readonly asByFork: {
    readonly blockNumber: u64;
    readonly blockHash: U8aFixed;
  } & Struct;
  readonly isPolkadot: boolean;
  readonly isKusama: boolean;
  readonly isWestend: boolean;
  readonly isRococo: boolean;
  readonly isWococo: boolean;
  readonly isEthereum: boolean;
  readonly asEthereum: {
    readonly chainId: Compact<u64>;
  } & Struct;
  readonly isBitcoinCore: boolean;
  readonly isBitcoinCash: boolean;
  readonly isPolkadotBulletin: boolean;
  readonly type: 'ByGenesis' | 'ByFork' | 'Polkadot' | 'Kusama' | 'Westend' | 'Rococo' | 'Wococo' | 'Ethereum' | 'BitcoinCore' | 'BitcoinCash' | 'PolkadotBulletin';
}

/** @name StagingXcmV4Junctions */
export interface StagingXcmV4Junctions extends Enum {
  readonly isHere: boolean;
  readonly isX1: boolean;
  readonly asX1: Vec<Lookup57>;
  readonly isX2: boolean;
  readonly asX2: Vec<Lookup57>;
  readonly isX3: boolean;
  readonly asX3: Vec<Lookup57>;
  readonly isX4: boolean;
  readonly asX4: Vec<Lookup57>;
  readonly isX5: boolean;
  readonly asX5: Vec<Lookup57>;
  readonly isX6: boolean;
  readonly asX6: Vec<Lookup57>;
  readonly isX7: boolean;
  readonly asX7: Vec<Lookup57>;
  readonly isX8: boolean;
  readonly asX8: Vec<Lookup57>;
  readonly type: 'Here' | 'X1' | 'X2' | 'X3' | 'X4' | 'X5' | 'X6' | 'X7' | 'X8';
}

/** @name StagingXcmV4Location */
export interface StagingXcmV4Location extends Struct {
  readonly parents: u8;
  readonly interior: StagingXcmV4Junctions;
}

/** @name StagingXcmV4PalletInfo */
export interface StagingXcmV4PalletInfo extends Struct {
  readonly index: Compact<u32>;
  readonly name: Bytes;
  readonly moduleName: Bytes;
  readonly major: Compact<u32>;
  readonly minor: Compact<u32>;
  readonly patch: Compact<u32>;
}

/** @name StagingXcmV4QueryResponseInfo */
export interface StagingXcmV4QueryResponseInfo extends Struct {
  readonly destination: StagingXcmV4Location;
  readonly queryId: Compact<u64>;
  readonly maxWeight: SpWeightsWeightV2Weight;
}

/** @name StagingXcmV4Response */
export interface StagingXcmV4Response extends Enum {
  readonly isNull: boolean;
  readonly isAssets: boolean;
  readonly asAssets: StagingXcmV4AssetAssets;
  readonly isExecutionResult: boolean;
  readonly asExecutionResult: Option<ITuple<[u32, XcmV3TraitsError]>>;
  readonly isVersion: boolean;
  readonly asVersion: u32;
  readonly isPalletsInfo: boolean;
  readonly asPalletsInfo: Vec<StagingXcmV4PalletInfo>;
  readonly isDispatchResult: boolean;
  readonly asDispatchResult: XcmV3MaybeErrorCode;
  readonly type: 'Null' | 'Assets' | 'ExecutionResult' | 'Version' | 'PalletsInfo' | 'DispatchResult';
}

/** @name StagingXcmV4TraitsOutcome */
export interface StagingXcmV4TraitsOutcome extends Enum {
  readonly isComplete: boolean;
  readonly asComplete: {
    readonly used: SpWeightsWeightV2Weight;
  } & Struct;
  readonly isIncomplete: boolean;
  readonly asIncomplete: {
    readonly used: SpWeightsWeightV2Weight;
    readonly error: XcmV3TraitsError;
  } & Struct;
  readonly isError: boolean;
  readonly asError: {
    readonly error: XcmV3TraitsError;
  } & Struct;
  readonly type: 'Complete' | 'Incomplete' | 'Error';
}

/** @name StagingXcmV4Xcm */
export interface StagingXcmV4Xcm extends Vec<StagingXcmV4Instruction> {}

/** @name UpDataStructsAccessMode */
export interface UpDataStructsAccessMode extends Enum {
  readonly isNormal: boolean;
  readonly isAllowList: boolean;
  readonly type: 'Normal' | 'AllowList';
}

/** @name UpDataStructsCollection */
export interface UpDataStructsCollection extends Struct {
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

/** @name UpDataStructsCollectionLimits */
export interface UpDataStructsCollectionLimits extends Struct {
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

/** @name UpDataStructsCollectionMode */
export interface UpDataStructsCollectionMode extends Enum {
  readonly isNft: boolean;
  readonly isFungible: boolean;
  readonly asFungible: u8;
  readonly isReFungible: boolean;
  readonly type: 'Nft' | 'Fungible' | 'ReFungible';
}

/** @name UpDataStructsCollectionPermissions */
export interface UpDataStructsCollectionPermissions extends Struct {
  readonly access: Option<UpDataStructsAccessMode>;
  readonly mintMode: Option<bool>;
  readonly nesting: Option<UpDataStructsNestingPermissions>;
}

/** @name UpDataStructsCollectionStats */
export interface UpDataStructsCollectionStats extends Struct {
  readonly created: u32;
  readonly destroyed: u32;
  readonly alive: u32;
}

/** @name UpDataStructsCreateCollectionData */
export interface UpDataStructsCreateCollectionData extends Struct {
  readonly mode: UpDataStructsCollectionMode;
  readonly access: Option<UpDataStructsAccessMode>;
  readonly name: Vec<u16>;
  readonly description: Vec<u16>;
  readonly tokenPrefix: Bytes;
  readonly limits: Option<UpDataStructsCollectionLimits>;
  readonly permissions: Option<UpDataStructsCollectionPermissions>;
  readonly tokenPropertyPermissions: Vec<UpDataStructsPropertyKeyPermission>;
  readonly properties: Vec<UpDataStructsProperty>;
  readonly adminList: Vec<PalletEvmAccountBasicCrossAccountIdRepr>;
  readonly pendingSponsor: Option<PalletEvmAccountBasicCrossAccountIdRepr>;
  readonly flags: U8aFixed;
}

/** @name UpDataStructsCreateFungibleData */
export interface UpDataStructsCreateFungibleData extends Struct {
  readonly value: u128;
}

/** @name UpDataStructsCreateItemData */
export interface UpDataStructsCreateItemData extends Enum {
  readonly isNft: boolean;
  readonly asNft: UpDataStructsCreateNftData;
  readonly isFungible: boolean;
  readonly asFungible: UpDataStructsCreateFungibleData;
  readonly isReFungible: boolean;
  readonly asReFungible: UpDataStructsCreateReFungibleData;
  readonly type: 'Nft' | 'Fungible' | 'ReFungible';
}

/** @name UpDataStructsCreateItemExData */
export interface UpDataStructsCreateItemExData extends Enum {
  readonly isNft: boolean;
  readonly asNft: Vec<UpDataStructsCreateNftExData>;
  readonly isFungible: boolean;
  readonly asFungible: BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr,u128>;
  readonly isRefungibleMultipleItems: boolean;
  readonly asRefungibleMultipleItems: Vec<UpDataStructsCreateRefungibleExSingleOwner>;
  readonly isRefungibleMultipleOwners: boolean;
  readonly asRefungibleMultipleOwners: UpDataStructsCreateRefungibleExMultipleOwners;
  readonly type: 'Nft' | 'Fungible' | 'RefungibleMultipleItems' | 'RefungibleMultipleOwners';
}

/** @name UpDataStructsCreateNftData */
export interface UpDataStructsCreateNftData extends Struct {
  readonly properties: Vec<UpDataStructsProperty>;
}

/** @name UpDataStructsCreateNftExData */
export interface UpDataStructsCreateNftExData extends Struct {
  readonly properties: Vec<UpDataStructsProperty>;
  readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
}

/** @name UpDataStructsCreateReFungibleData */
export interface UpDataStructsCreateReFungibleData extends Struct {
  readonly pieces: u128;
  readonly properties: Vec<UpDataStructsProperty>;
}

/** @name UpDataStructsCreateRefungibleExMultipleOwners */
export interface UpDataStructsCreateRefungibleExMultipleOwners extends Struct {
  readonly users: BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>;
  readonly properties: Vec<UpDataStructsProperty>;
}

/** @name UpDataStructsCreateRefungibleExSingleOwner */
export interface UpDataStructsCreateRefungibleExSingleOwner extends Struct {
  readonly user: PalletEvmAccountBasicCrossAccountIdRepr;
  readonly pieces: u128;
  readonly properties: Vec<UpDataStructsProperty>;
}

/** @name UpDataStructsNestingPermissions */
export interface UpDataStructsNestingPermissions extends Struct {
  readonly tokenOwner: bool;
  readonly collectionAdmin: bool;
  readonly restricted: Option<UpDataStructsOwnerRestrictedSet>;
}

/** @name UpDataStructsOwnerRestrictedSet */
export interface UpDataStructsOwnerRestrictedSet extends BTreeSet<u32> {}

/** @name UpDataStructsProperties */
export interface UpDataStructsProperties extends Struct {
  readonly map: UpDataStructsPropertiesMapBoundedVec;
  readonly consumedSpace: u32;
  readonly reserved: u32;
}

/** @name UpDataStructsPropertiesMapBoundedVec */
export interface UpDataStructsPropertiesMapBoundedVec extends BTreeMap<Bytes, Bytes> {}

/** @name UpDataStructsPropertiesMapPropertyPermission */
export interface UpDataStructsPropertiesMapPropertyPermission extends BTreeMap<Bytes, UpDataStructsPropertyPermission> {}

/** @name UpDataStructsProperty */
export interface UpDataStructsProperty extends Struct {
  readonly key: Bytes;
  readonly value: Bytes;
}

/** @name UpDataStructsPropertyKeyPermission */
export interface UpDataStructsPropertyKeyPermission extends Struct {
  readonly key: Bytes;
  readonly permission: UpDataStructsPropertyPermission;
}

/** @name UpDataStructsPropertyPermission */
export interface UpDataStructsPropertyPermission extends Struct {
  readonly mutable: bool;
  readonly collectionAdmin: bool;
  readonly tokenOwner: bool;
}

/** @name UpDataStructsPropertyScope */
export interface UpDataStructsPropertyScope extends Enum {
  readonly isNone: boolean;
  readonly isRmrk: boolean;
  readonly type: 'None' | 'Rmrk';
}

/** @name UpDataStructsRpcCollection */
export interface UpDataStructsRpcCollection extends Struct {
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

/** @name UpDataStructsRpcCollectionFlags */
export interface UpDataStructsRpcCollectionFlags extends Struct {
  readonly foreign: bool;
  readonly erc721metadata: bool;
}

/** @name UpDataStructsSponsoringRateLimit */
export interface UpDataStructsSponsoringRateLimit extends Enum {
  readonly isSponsoringDisabled: boolean;
  readonly isBlocks: boolean;
  readonly asBlocks: u32;
  readonly type: 'SponsoringDisabled' | 'Blocks';
}

/** @name UpDataStructsSponsorshipStateAccountId32 */
export interface UpDataStructsSponsorshipStateAccountId32 extends Enum {
  readonly isDisabled: boolean;
  readonly isUnconfirmed: boolean;
  readonly asUnconfirmed: AccountId32;
  readonly isConfirmed: boolean;
  readonly asConfirmed: AccountId32;
  readonly type: 'Disabled' | 'Unconfirmed' | 'Confirmed';
}

/** @name UpDataStructsSponsorshipStateBasicCrossAccountIdRepr */
export interface UpDataStructsSponsorshipStateBasicCrossAccountIdRepr extends Enum {
  readonly isDisabled: boolean;
  readonly isUnconfirmed: boolean;
  readonly asUnconfirmed: PalletEvmAccountBasicCrossAccountIdRepr;
  readonly isConfirmed: boolean;
  readonly asConfirmed: PalletEvmAccountBasicCrossAccountIdRepr;
  readonly type: 'Disabled' | 'Unconfirmed' | 'Confirmed';
}

/** @name UpDataStructsTokenChild */
export interface UpDataStructsTokenChild extends Struct {
  readonly token: u32;
  readonly collection: u32;
}

/** @name UpDataStructsTokenData */
export interface UpDataStructsTokenData extends Struct {
  readonly properties: Vec<UpDataStructsProperty>;
  readonly owner: Option<PalletEvmAccountBasicCrossAccountIdRepr>;
  readonly pieces: u128;
}

/** @name UpPovEstimateRpcPovInfo */
export interface UpPovEstimateRpcPovInfo extends Struct {
  readonly proofSize: u64;
  readonly compactProofSize: u64;
  readonly compressedProofSize: u64;
  readonly results: Vec<Result<Result<Null, SpRuntimeDispatchError>, SpRuntimeTransactionValidityTransactionValidityError>>;
  readonly keyValues: Vec<UpPovEstimateRpcTrieKeyValue>;
}

/** @name UpPovEstimateRpcTrieKeyValue */
export interface UpPovEstimateRpcTrieKeyValue extends Struct {
  readonly key: Bytes;
  readonly value: Bytes;
}

/** @name XcmDoubleEncoded */
export interface XcmDoubleEncoded extends Struct {
  readonly encoded: Bytes;
}

/** @name XcmV2BodyId */
export interface XcmV2BodyId extends Enum {
  readonly isUnit: boolean;
  readonly isNamed: boolean;
  readonly asNamed: Bytes;
  readonly isIndex: boolean;
  readonly asIndex: Compact<u32>;
  readonly isExecutive: boolean;
  readonly isTechnical: boolean;
  readonly isLegislative: boolean;
  readonly isJudicial: boolean;
  readonly isDefense: boolean;
  readonly isAdministration: boolean;
  readonly isTreasury: boolean;
  readonly type: 'Unit' | 'Named' | 'Index' | 'Executive' | 'Technical' | 'Legislative' | 'Judicial' | 'Defense' | 'Administration' | 'Treasury';
}

/** @name XcmV2BodyPart */
export interface XcmV2BodyPart extends Enum {
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

/** @name XcmV2Instruction */
export interface XcmV2Instruction extends Enum {
  readonly isWithdrawAsset: boolean;
  readonly asWithdrawAsset: XcmV2MultiassetMultiAssets;
  readonly isReserveAssetDeposited: boolean;
  readonly asReserveAssetDeposited: XcmV2MultiassetMultiAssets;
  readonly isReceiveTeleportedAsset: boolean;
  readonly asReceiveTeleportedAsset: XcmV2MultiassetMultiAssets;
  readonly isQueryResponse: boolean;
  readonly asQueryResponse: {
    readonly queryId: Compact<u64>;
    readonly response: XcmV2Response;
    readonly maxWeight: Compact<u64>;
  } & Struct;
  readonly isTransferAsset: boolean;
  readonly asTransferAsset: {
    readonly assets: XcmV2MultiassetMultiAssets;
    readonly beneficiary: XcmV2MultiLocation;
  } & Struct;
  readonly isTransferReserveAsset: boolean;
  readonly asTransferReserveAsset: {
    readonly assets: XcmV2MultiassetMultiAssets;
    readonly dest: XcmV2MultiLocation;
    readonly xcm: XcmV2Xcm;
  } & Struct;
  readonly isTransact: boolean;
  readonly asTransact: {
    readonly originType: XcmV2OriginKind;
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
  readonly asDescendOrigin: XcmV2MultilocationJunctions;
  readonly isReportError: boolean;
  readonly asReportError: {
    readonly queryId: Compact<u64>;
    readonly dest: XcmV2MultiLocation;
    readonly maxResponseWeight: Compact<u64>;
  } & Struct;
  readonly isDepositAsset: boolean;
  readonly asDepositAsset: {
    readonly assets: XcmV2MultiassetMultiAssetFilter;
    readonly maxAssets: Compact<u32>;
    readonly beneficiary: XcmV2MultiLocation;
  } & Struct;
  readonly isDepositReserveAsset: boolean;
  readonly asDepositReserveAsset: {
    readonly assets: XcmV2MultiassetMultiAssetFilter;
    readonly maxAssets: Compact<u32>;
    readonly dest: XcmV2MultiLocation;
    readonly xcm: XcmV2Xcm;
  } & Struct;
  readonly isExchangeAsset: boolean;
  readonly asExchangeAsset: {
    readonly give: XcmV2MultiassetMultiAssetFilter;
    readonly receive: XcmV2MultiassetMultiAssets;
  } & Struct;
  readonly isInitiateReserveWithdraw: boolean;
  readonly asInitiateReserveWithdraw: {
    readonly assets: XcmV2MultiassetMultiAssetFilter;
    readonly reserve: XcmV2MultiLocation;
    readonly xcm: XcmV2Xcm;
  } & Struct;
  readonly isInitiateTeleport: boolean;
  readonly asInitiateTeleport: {
    readonly assets: XcmV2MultiassetMultiAssetFilter;
    readonly dest: XcmV2MultiLocation;
    readonly xcm: XcmV2Xcm;
  } & Struct;
  readonly isQueryHolding: boolean;
  readonly asQueryHolding: {
    readonly queryId: Compact<u64>;
    readonly dest: XcmV2MultiLocation;
    readonly assets: XcmV2MultiassetMultiAssetFilter;
    readonly maxResponseWeight: Compact<u64>;
  } & Struct;
  readonly isBuyExecution: boolean;
  readonly asBuyExecution: {
    readonly fees: XcmV2MultiAsset;
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
    readonly assets: XcmV2MultiassetMultiAssets;
    readonly ticket: XcmV2MultiLocation;
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

/** @name XcmV2Junction */
export interface XcmV2Junction extends Enum {
  readonly isParachain: boolean;
  readonly asParachain: Compact<u32>;
  readonly isAccountId32: boolean;
  readonly asAccountId32: {
    readonly network: XcmV2NetworkId;
    readonly id: U8aFixed;
  } & Struct;
  readonly isAccountIndex64: boolean;
  readonly asAccountIndex64: {
    readonly network: XcmV2NetworkId;
    readonly index: Compact<u64>;
  } & Struct;
  readonly isAccountKey20: boolean;
  readonly asAccountKey20: {
    readonly network: XcmV2NetworkId;
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
    readonly id: XcmV2BodyId;
    readonly part: XcmV2BodyPart;
  } & Struct;
  readonly type: 'Parachain' | 'AccountId32' | 'AccountIndex64' | 'AccountKey20' | 'PalletInstance' | 'GeneralIndex' | 'GeneralKey' | 'OnlyChild' | 'Plurality';
}

/** @name XcmV2MultiAsset */
export interface XcmV2MultiAsset extends Struct {
  readonly id: XcmV2MultiassetAssetId;
  readonly fun: XcmV2MultiassetFungibility;
}

/** @name XcmV2MultiassetAssetId */
export interface XcmV2MultiassetAssetId extends Enum {
  readonly isConcrete: boolean;
  readonly asConcrete: XcmV2MultiLocation;
  readonly isAbstract: boolean;
  readonly asAbstract: Bytes;
  readonly type: 'Concrete' | 'Abstract';
}

/** @name XcmV2MultiassetAssetInstance */
export interface XcmV2MultiassetAssetInstance extends Enum {
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

/** @name XcmV2MultiassetFungibility */
export interface XcmV2MultiassetFungibility extends Enum {
  readonly isFungible: boolean;
  readonly asFungible: Compact<u128>;
  readonly isNonFungible: boolean;
  readonly asNonFungible: XcmV2MultiassetAssetInstance;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name XcmV2MultiassetMultiAssetFilter */
export interface XcmV2MultiassetMultiAssetFilter extends Enum {
  readonly isDefinite: boolean;
  readonly asDefinite: XcmV2MultiassetMultiAssets;
  readonly isWild: boolean;
  readonly asWild: XcmV2MultiassetWildMultiAsset;
  readonly type: 'Definite' | 'Wild';
}

/** @name XcmV2MultiassetMultiAssets */
export interface XcmV2MultiassetMultiAssets extends Vec<XcmV2MultiAsset> {}

/** @name XcmV2MultiassetWildFungibility */
export interface XcmV2MultiassetWildFungibility extends Enum {
  readonly isFungible: boolean;
  readonly isNonFungible: boolean;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name XcmV2MultiassetWildMultiAsset */
export interface XcmV2MultiassetWildMultiAsset extends Enum {
  readonly isAll: boolean;
  readonly isAllOf: boolean;
  readonly asAllOf: {
    readonly id: XcmV2MultiassetAssetId;
    readonly fun: XcmV2MultiassetWildFungibility;
  } & Struct;
  readonly type: 'All' | 'AllOf';
}

/** @name XcmV2MultiLocation */
export interface XcmV2MultiLocation extends Struct {
  readonly parents: u8;
  readonly interior: XcmV2MultilocationJunctions;
}

/** @name XcmV2MultilocationJunctions */
export interface XcmV2MultilocationJunctions extends Enum {
  readonly isHere: boolean;
  readonly isX1: boolean;
  readonly asX1: XcmV2Junction;
  readonly isX2: boolean;
  readonly asX2: ITuple<[XcmV2Junction, XcmV2Junction]>;
  readonly isX3: boolean;
  readonly asX3: ITuple<[XcmV2Junction, XcmV2Junction, XcmV2Junction]>;
  readonly isX4: boolean;
  readonly asX4: ITuple<[XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction]>;
  readonly isX5: boolean;
  readonly asX5: ITuple<[XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction]>;
  readonly isX6: boolean;
  readonly asX6: ITuple<[XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction]>;
  readonly isX7: boolean;
  readonly asX7: ITuple<[XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction]>;
  readonly isX8: boolean;
  readonly asX8: ITuple<[XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction]>;
  readonly type: 'Here' | 'X1' | 'X2' | 'X3' | 'X4' | 'X5' | 'X6' | 'X7' | 'X8';
}

/** @name XcmV2NetworkId */
export interface XcmV2NetworkId extends Enum {
  readonly isAny: boolean;
  readonly isNamed: boolean;
  readonly asNamed: Bytes;
  readonly isPolkadot: boolean;
  readonly isKusama: boolean;
  readonly type: 'Any' | 'Named' | 'Polkadot' | 'Kusama';
}

/** @name XcmV2OriginKind */
export interface XcmV2OriginKind extends Enum {
  readonly isNative: boolean;
  readonly isSovereignAccount: boolean;
  readonly isSuperuser: boolean;
  readonly isXcm: boolean;
  readonly type: 'Native' | 'SovereignAccount' | 'Superuser' | 'Xcm';
}

/** @name XcmV2Response */
export interface XcmV2Response extends Enum {
  readonly isNull: boolean;
  readonly isAssets: boolean;
  readonly asAssets: XcmV2MultiassetMultiAssets;
  readonly isExecutionResult: boolean;
  readonly asExecutionResult: Option<ITuple<[u32, XcmV2TraitsError]>>;
  readonly isVersion: boolean;
  readonly asVersion: u32;
  readonly type: 'Null' | 'Assets' | 'ExecutionResult' | 'Version';
}

/** @name XcmV2TraitsError */
export interface XcmV2TraitsError extends Enum {
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

/** @name XcmV2WeightLimit */
export interface XcmV2WeightLimit extends Enum {
  readonly isUnlimited: boolean;
  readonly isLimited: boolean;
  readonly asLimited: Compact<u64>;
  readonly type: 'Unlimited' | 'Limited';
}

/** @name XcmV2Xcm */
export interface XcmV2Xcm extends Vec<XcmV2Instruction> {}

/** @name XcmV3Instruction */
export interface XcmV3Instruction extends Enum {
  readonly isWithdrawAsset: boolean;
  readonly asWithdrawAsset: XcmV3MultiassetMultiAssets;
  readonly isReserveAssetDeposited: boolean;
  readonly asReserveAssetDeposited: XcmV3MultiassetMultiAssets;
  readonly isReceiveTeleportedAsset: boolean;
  readonly asReceiveTeleportedAsset: XcmV3MultiassetMultiAssets;
  readonly isQueryResponse: boolean;
  readonly asQueryResponse: {
    readonly queryId: Compact<u64>;
    readonly response: XcmV3Response;
    readonly maxWeight: SpWeightsWeightV2Weight;
    readonly querier: Option<StagingXcmV3MultiLocation>;
  } & Struct;
  readonly isTransferAsset: boolean;
  readonly asTransferAsset: {
    readonly assets: XcmV3MultiassetMultiAssets;
    readonly beneficiary: StagingXcmV3MultiLocation;
  } & Struct;
  readonly isTransferReserveAsset: boolean;
  readonly asTransferReserveAsset: {
    readonly assets: XcmV3MultiassetMultiAssets;
    readonly dest: StagingXcmV3MultiLocation;
    readonly xcm: XcmV3Xcm;
  } & Struct;
  readonly isTransact: boolean;
  readonly asTransact: {
    readonly originKind: XcmV2OriginKind;
    readonly requireWeightAtMost: SpWeightsWeightV2Weight;
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
  readonly asDescendOrigin: XcmV3Junctions;
  readonly isReportError: boolean;
  readonly asReportError: XcmV3QueryResponseInfo;
  readonly isDepositAsset: boolean;
  readonly asDepositAsset: {
    readonly assets: XcmV3MultiassetMultiAssetFilter;
    readonly beneficiary: StagingXcmV3MultiLocation;
  } & Struct;
  readonly isDepositReserveAsset: boolean;
  readonly asDepositReserveAsset: {
    readonly assets: XcmV3MultiassetMultiAssetFilter;
    readonly dest: StagingXcmV3MultiLocation;
    readonly xcm: XcmV3Xcm;
  } & Struct;
  readonly isExchangeAsset: boolean;
  readonly asExchangeAsset: {
    readonly give: XcmV3MultiassetMultiAssetFilter;
    readonly want: XcmV3MultiassetMultiAssets;
    readonly maximal: bool;
  } & Struct;
  readonly isInitiateReserveWithdraw: boolean;
  readonly asInitiateReserveWithdraw: {
    readonly assets: XcmV3MultiassetMultiAssetFilter;
    readonly reserve: StagingXcmV3MultiLocation;
    readonly xcm: XcmV3Xcm;
  } & Struct;
  readonly isInitiateTeleport: boolean;
  readonly asInitiateTeleport: {
    readonly assets: XcmV3MultiassetMultiAssetFilter;
    readonly dest: StagingXcmV3MultiLocation;
    readonly xcm: XcmV3Xcm;
  } & Struct;
  readonly isReportHolding: boolean;
  readonly asReportHolding: {
    readonly responseInfo: XcmV3QueryResponseInfo;
    readonly assets: XcmV3MultiassetMultiAssetFilter;
  } & Struct;
  readonly isBuyExecution: boolean;
  readonly asBuyExecution: {
    readonly fees: XcmV3MultiAsset;
    readonly weightLimit: XcmV3WeightLimit;
  } & Struct;
  readonly isRefundSurplus: boolean;
  readonly isSetErrorHandler: boolean;
  readonly asSetErrorHandler: XcmV3Xcm;
  readonly isSetAppendix: boolean;
  readonly asSetAppendix: XcmV3Xcm;
  readonly isClearError: boolean;
  readonly isClaimAsset: boolean;
  readonly asClaimAsset: {
    readonly assets: XcmV3MultiassetMultiAssets;
    readonly ticket: StagingXcmV3MultiLocation;
  } & Struct;
  readonly isTrap: boolean;
  readonly asTrap: Compact<u64>;
  readonly isSubscribeVersion: boolean;
  readonly asSubscribeVersion: {
    readonly queryId: Compact<u64>;
    readonly maxResponseWeight: SpWeightsWeightV2Weight;
  } & Struct;
  readonly isUnsubscribeVersion: boolean;
  readonly isBurnAsset: boolean;
  readonly asBurnAsset: XcmV3MultiassetMultiAssets;
  readonly isExpectAsset: boolean;
  readonly asExpectAsset: XcmV3MultiassetMultiAssets;
  readonly isExpectOrigin: boolean;
  readonly asExpectOrigin: Option<StagingXcmV3MultiLocation>;
  readonly isExpectError: boolean;
  readonly asExpectError: Option<ITuple<[u32, XcmV3TraitsError]>>;
  readonly isExpectTransactStatus: boolean;
  readonly asExpectTransactStatus: XcmV3MaybeErrorCode;
  readonly isQueryPallet: boolean;
  readonly asQueryPallet: {
    readonly moduleName: Bytes;
    readonly responseInfo: XcmV3QueryResponseInfo;
  } & Struct;
  readonly isExpectPallet: boolean;
  readonly asExpectPallet: {
    readonly index: Compact<u32>;
    readonly name: Bytes;
    readonly moduleName: Bytes;
    readonly crateMajor: Compact<u32>;
    readonly minCrateMinor: Compact<u32>;
  } & Struct;
  readonly isReportTransactStatus: boolean;
  readonly asReportTransactStatus: XcmV3QueryResponseInfo;
  readonly isClearTransactStatus: boolean;
  readonly isUniversalOrigin: boolean;
  readonly asUniversalOrigin: XcmV3Junction;
  readonly isExportMessage: boolean;
  readonly asExportMessage: {
    readonly network: XcmV3JunctionNetworkId;
    readonly destination: XcmV3Junctions;
    readonly xcm: XcmV3Xcm;
  } & Struct;
  readonly isLockAsset: boolean;
  readonly asLockAsset: {
    readonly asset: XcmV3MultiAsset;
    readonly unlocker: StagingXcmV3MultiLocation;
  } & Struct;
  readonly isUnlockAsset: boolean;
  readonly asUnlockAsset: {
    readonly asset: XcmV3MultiAsset;
    readonly target: StagingXcmV3MultiLocation;
  } & Struct;
  readonly isNoteUnlockable: boolean;
  readonly asNoteUnlockable: {
    readonly asset: XcmV3MultiAsset;
    readonly owner: StagingXcmV3MultiLocation;
  } & Struct;
  readonly isRequestUnlock: boolean;
  readonly asRequestUnlock: {
    readonly asset: XcmV3MultiAsset;
    readonly locker: StagingXcmV3MultiLocation;
  } & Struct;
  readonly isSetFeesMode: boolean;
  readonly asSetFeesMode: {
    readonly jitWithdraw: bool;
  } & Struct;
  readonly isSetTopic: boolean;
  readonly asSetTopic: U8aFixed;
  readonly isClearTopic: boolean;
  readonly isAliasOrigin: boolean;
  readonly asAliasOrigin: StagingXcmV3MultiLocation;
  readonly isUnpaidExecution: boolean;
  readonly asUnpaidExecution: {
    readonly weightLimit: XcmV3WeightLimit;
    readonly checkOrigin: Option<StagingXcmV3MultiLocation>;
  } & Struct;
  readonly type: 'WithdrawAsset' | 'ReserveAssetDeposited' | 'ReceiveTeleportedAsset' | 'QueryResponse' | 'TransferAsset' | 'TransferReserveAsset' | 'Transact' | 'HrmpNewChannelOpenRequest' | 'HrmpChannelAccepted' | 'HrmpChannelClosing' | 'ClearOrigin' | 'DescendOrigin' | 'ReportError' | 'DepositAsset' | 'DepositReserveAsset' | 'ExchangeAsset' | 'InitiateReserveWithdraw' | 'InitiateTeleport' | 'ReportHolding' | 'BuyExecution' | 'RefundSurplus' | 'SetErrorHandler' | 'SetAppendix' | 'ClearError' | 'ClaimAsset' | 'Trap' | 'SubscribeVersion' | 'UnsubscribeVersion' | 'BurnAsset' | 'ExpectAsset' | 'ExpectOrigin' | 'ExpectError' | 'ExpectTransactStatus' | 'QueryPallet' | 'ExpectPallet' | 'ReportTransactStatus' | 'ClearTransactStatus' | 'UniversalOrigin' | 'ExportMessage' | 'LockAsset' | 'UnlockAsset' | 'NoteUnlockable' | 'RequestUnlock' | 'SetFeesMode' | 'SetTopic' | 'ClearTopic' | 'AliasOrigin' | 'UnpaidExecution';
}

/** @name XcmV3Junction */
export interface XcmV3Junction extends Enum {
  readonly isParachain: boolean;
  readonly asParachain: Compact<u32>;
  readonly isAccountId32: boolean;
  readonly asAccountId32: {
    readonly network: Option<XcmV3JunctionNetworkId>;
    readonly id: U8aFixed;
  } & Struct;
  readonly isAccountIndex64: boolean;
  readonly asAccountIndex64: {
    readonly network: Option<XcmV3JunctionNetworkId>;
    readonly index: Compact<u64>;
  } & Struct;
  readonly isAccountKey20: boolean;
  readonly asAccountKey20: {
    readonly network: Option<XcmV3JunctionNetworkId>;
    readonly key: U8aFixed;
  } & Struct;
  readonly isPalletInstance: boolean;
  readonly asPalletInstance: u8;
  readonly isGeneralIndex: boolean;
  readonly asGeneralIndex: Compact<u128>;
  readonly isGeneralKey: boolean;
  readonly asGeneralKey: {
    readonly length: u8;
    readonly data: U8aFixed;
  } & Struct;
  readonly isOnlyChild: boolean;
  readonly isPlurality: boolean;
  readonly asPlurality: {
    readonly id: XcmV3JunctionBodyId;
    readonly part: XcmV3JunctionBodyPart;
  } & Struct;
  readonly isGlobalConsensus: boolean;
  readonly asGlobalConsensus: XcmV3JunctionNetworkId;
  readonly type: 'Parachain' | 'AccountId32' | 'AccountIndex64' | 'AccountKey20' | 'PalletInstance' | 'GeneralIndex' | 'GeneralKey' | 'OnlyChild' | 'Plurality' | 'GlobalConsensus';
}

/** @name XcmV3JunctionBodyId */
export interface XcmV3JunctionBodyId extends Enum {
  readonly isUnit: boolean;
  readonly isMoniker: boolean;
  readonly asMoniker: U8aFixed;
  readonly isIndex: boolean;
  readonly asIndex: Compact<u32>;
  readonly isExecutive: boolean;
  readonly isTechnical: boolean;
  readonly isLegislative: boolean;
  readonly isJudicial: boolean;
  readonly isDefense: boolean;
  readonly isAdministration: boolean;
  readonly isTreasury: boolean;
  readonly type: 'Unit' | 'Moniker' | 'Index' | 'Executive' | 'Technical' | 'Legislative' | 'Judicial' | 'Defense' | 'Administration' | 'Treasury';
}

/** @name XcmV3JunctionBodyPart */
export interface XcmV3JunctionBodyPart extends Enum {
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

/** @name XcmV3JunctionNetworkId */
export interface XcmV3JunctionNetworkId extends Enum {
  readonly isByGenesis: boolean;
  readonly asByGenesis: U8aFixed;
  readonly isByFork: boolean;
  readonly asByFork: {
    readonly blockNumber: u64;
    readonly blockHash: U8aFixed;
  } & Struct;
  readonly isPolkadot: boolean;
  readonly isKusama: boolean;
  readonly isWestend: boolean;
  readonly isRococo: boolean;
  readonly isWococo: boolean;
  readonly isEthereum: boolean;
  readonly asEthereum: {
    readonly chainId: Compact<u64>;
  } & Struct;
  readonly isBitcoinCore: boolean;
  readonly isBitcoinCash: boolean;
  readonly isPolkadotBulletin: boolean;
  readonly type: 'ByGenesis' | 'ByFork' | 'Polkadot' | 'Kusama' | 'Westend' | 'Rococo' | 'Wococo' | 'Ethereum' | 'BitcoinCore' | 'BitcoinCash' | 'PolkadotBulletin';
}

/** @name XcmV3Junctions */
export interface XcmV3Junctions extends Enum {
  readonly isHere: boolean;
  readonly isX1: boolean;
  readonly asX1: XcmV3Junction;
  readonly isX2: boolean;
  readonly asX2: ITuple<[XcmV3Junction, XcmV3Junction]>;
  readonly isX3: boolean;
  readonly asX3: ITuple<[XcmV3Junction, XcmV3Junction, XcmV3Junction]>;
  readonly isX4: boolean;
  readonly asX4: ITuple<[XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction]>;
  readonly isX5: boolean;
  readonly asX5: ITuple<[XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction]>;
  readonly isX6: boolean;
  readonly asX6: ITuple<[XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction]>;
  readonly isX7: boolean;
  readonly asX7: ITuple<[XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction]>;
  readonly isX8: boolean;
  readonly asX8: ITuple<[XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction]>;
  readonly type: 'Here' | 'X1' | 'X2' | 'X3' | 'X4' | 'X5' | 'X6' | 'X7' | 'X8';
}

/** @name XcmV3MaybeErrorCode */
export interface XcmV3MaybeErrorCode extends Enum {
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly asError: Bytes;
  readonly isTruncatedError: boolean;
  readonly asTruncatedError: Bytes;
  readonly type: 'Success' | 'Error' | 'TruncatedError';
}

/** @name XcmV3MultiAsset */
export interface XcmV3MultiAsset extends Struct {
  readonly id: XcmV3MultiassetAssetId;
  readonly fun: XcmV3MultiassetFungibility;
}

/** @name XcmV3MultiassetAssetId */
export interface XcmV3MultiassetAssetId extends Enum {
  readonly isConcrete: boolean;
  readonly asConcrete: StagingXcmV3MultiLocation;
  readonly isAbstract: boolean;
  readonly asAbstract: U8aFixed;
  readonly type: 'Concrete' | 'Abstract';
}

/** @name XcmV3MultiassetAssetInstance */
export interface XcmV3MultiassetAssetInstance extends Enum {
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
  readonly type: 'Undefined' | 'Index' | 'Array4' | 'Array8' | 'Array16' | 'Array32';
}

/** @name XcmV3MultiassetFungibility */
export interface XcmV3MultiassetFungibility extends Enum {
  readonly isFungible: boolean;
  readonly asFungible: Compact<u128>;
  readonly isNonFungible: boolean;
  readonly asNonFungible: XcmV3MultiassetAssetInstance;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name XcmV3MultiassetMultiAssetFilter */
export interface XcmV3MultiassetMultiAssetFilter extends Enum {
  readonly isDefinite: boolean;
  readonly asDefinite: XcmV3MultiassetMultiAssets;
  readonly isWild: boolean;
  readonly asWild: XcmV3MultiassetWildMultiAsset;
  readonly type: 'Definite' | 'Wild';
}

/** @name XcmV3MultiassetMultiAssets */
export interface XcmV3MultiassetMultiAssets extends Vec<XcmV3MultiAsset> {}

/** @name XcmV3MultiassetWildFungibility */
export interface XcmV3MultiassetWildFungibility extends Enum {
  readonly isFungible: boolean;
  readonly isNonFungible: boolean;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name XcmV3MultiassetWildMultiAsset */
export interface XcmV3MultiassetWildMultiAsset extends Enum {
  readonly isAll: boolean;
  readonly isAllOf: boolean;
  readonly asAllOf: {
    readonly id: XcmV3MultiassetAssetId;
    readonly fun: XcmV3MultiassetWildFungibility;
  } & Struct;
  readonly isAllCounted: boolean;
  readonly asAllCounted: Compact<u32>;
  readonly isAllOfCounted: boolean;
  readonly asAllOfCounted: {
    readonly id: XcmV3MultiassetAssetId;
    readonly fun: XcmV3MultiassetWildFungibility;
    readonly count: Compact<u32>;
  } & Struct;
  readonly type: 'All' | 'AllOf' | 'AllCounted' | 'AllOfCounted';
}

/** @name XcmV3PalletInfo */
export interface XcmV3PalletInfo extends Struct {
  readonly index: Compact<u32>;
  readonly name: Bytes;
  readonly moduleName: Bytes;
  readonly major: Compact<u32>;
  readonly minor: Compact<u32>;
  readonly patch: Compact<u32>;
}

/** @name XcmV3QueryResponseInfo */
export interface XcmV3QueryResponseInfo extends Struct {
  readonly destination: StagingXcmV3MultiLocation;
  readonly queryId: Compact<u64>;
  readonly maxWeight: SpWeightsWeightV2Weight;
}

/** @name XcmV3Response */
export interface XcmV3Response extends Enum {
  readonly isNull: boolean;
  readonly isAssets: boolean;
  readonly asAssets: XcmV3MultiassetMultiAssets;
  readonly isExecutionResult: boolean;
  readonly asExecutionResult: Option<ITuple<[u32, XcmV3TraitsError]>>;
  readonly isVersion: boolean;
  readonly asVersion: u32;
  readonly isPalletsInfo: boolean;
  readonly asPalletsInfo: Vec<XcmV3PalletInfo>;
  readonly isDispatchResult: boolean;
  readonly asDispatchResult: XcmV3MaybeErrorCode;
  readonly type: 'Null' | 'Assets' | 'ExecutionResult' | 'Version' | 'PalletsInfo' | 'DispatchResult';
}

/** @name XcmV3TraitsError */
export interface XcmV3TraitsError extends Enum {
  readonly isOverflow: boolean;
  readonly isUnimplemented: boolean;
  readonly isUntrustedReserveLocation: boolean;
  readonly isUntrustedTeleportLocation: boolean;
  readonly isLocationFull: boolean;
  readonly isLocationNotInvertible: boolean;
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
  readonly isExpectationFalse: boolean;
  readonly isPalletNotFound: boolean;
  readonly isNameMismatch: boolean;
  readonly isVersionIncompatible: boolean;
  readonly isHoldingWouldOverflow: boolean;
  readonly isExportError: boolean;
  readonly isReanchorFailed: boolean;
  readonly isNoDeal: boolean;
  readonly isFeesNotMet: boolean;
  readonly isLockError: boolean;
  readonly isNoPermission: boolean;
  readonly isUnanchored: boolean;
  readonly isNotDepositable: boolean;
  readonly isUnhandledXcmVersion: boolean;
  readonly isWeightLimitReached: boolean;
  readonly asWeightLimitReached: SpWeightsWeightV2Weight;
  readonly isBarrier: boolean;
  readonly isWeightNotComputable: boolean;
  readonly isExceedsStackLimit: boolean;
  readonly type: 'Overflow' | 'Unimplemented' | 'UntrustedReserveLocation' | 'UntrustedTeleportLocation' | 'LocationFull' | 'LocationNotInvertible' | 'BadOrigin' | 'InvalidLocation' | 'AssetNotFound' | 'FailedToTransactAsset' | 'NotWithdrawable' | 'LocationCannotHold' | 'ExceedsMaxMessageSize' | 'DestinationUnsupported' | 'Transport' | 'Unroutable' | 'UnknownClaim' | 'FailedToDecode' | 'MaxWeightInvalid' | 'NotHoldingFees' | 'TooExpensive' | 'Trap' | 'ExpectationFalse' | 'PalletNotFound' | 'NameMismatch' | 'VersionIncompatible' | 'HoldingWouldOverflow' | 'ExportError' | 'ReanchorFailed' | 'NoDeal' | 'FeesNotMet' | 'LockError' | 'NoPermission' | 'Unanchored' | 'NotDepositable' | 'UnhandledXcmVersion' | 'WeightLimitReached' | 'Barrier' | 'WeightNotComputable' | 'ExceedsStackLimit';
}

/** @name XcmV3WeightLimit */
export interface XcmV3WeightLimit extends Enum {
  readonly isUnlimited: boolean;
  readonly isLimited: boolean;
  readonly asLimited: SpWeightsWeightV2Weight;
  readonly type: 'Unlimited' | 'Limited';
}

/** @name XcmV3Xcm */
export interface XcmV3Xcm extends Vec<XcmV3Instruction> {}

/** @name XcmVersionedAsset */
export interface XcmVersionedAsset extends Enum {
  readonly isV2: boolean;
  readonly asV2: XcmV2MultiAsset;
  readonly isV3: boolean;
  readonly asV3: XcmV3MultiAsset;
  readonly isV4: boolean;
  readonly asV4: StagingXcmV4Asset;
  readonly type: 'V2' | 'V3' | 'V4';
}

/** @name XcmVersionedAssetId */
export interface XcmVersionedAssetId extends Enum {
  readonly isV3: boolean;
  readonly asV3: XcmV3MultiassetAssetId;
  readonly isV4: boolean;
  readonly asV4: StagingXcmV4AssetAssetId;
  readonly type: 'V3' | 'V4';
}

/** @name XcmVersionedAssets */
export interface XcmVersionedAssets extends Enum {
  readonly isV2: boolean;
  readonly asV2: XcmV2MultiassetMultiAssets;
  readonly isV3: boolean;
  readonly asV3: XcmV3MultiassetMultiAssets;
  readonly isV4: boolean;
  readonly asV4: StagingXcmV4AssetAssets;
  readonly type: 'V2' | 'V3' | 'V4';
}

/** @name XcmVersionedLocation */
export interface XcmVersionedLocation extends Enum {
  readonly isV2: boolean;
  readonly asV2: XcmV2MultiLocation;
  readonly isV3: boolean;
  readonly asV3: StagingXcmV3MultiLocation;
  readonly isV4: boolean;
  readonly asV4: StagingXcmV4Location;
  readonly type: 'V2' | 'V3' | 'V4';
}

/** @name XcmVersionedResponse */
export interface XcmVersionedResponse extends Enum {
  readonly isV2: boolean;
  readonly asV2: XcmV2Response;
  readonly isV3: boolean;
  readonly asV3: XcmV3Response;
  readonly isV4: boolean;
  readonly asV4: StagingXcmV4Response;
  readonly type: 'V2' | 'V3' | 'V4';
}

/** @name XcmVersionedXcm */
export interface XcmVersionedXcm extends Enum {
  readonly isV2: boolean;
  readonly asV2: XcmV2Xcm;
  readonly isV3: boolean;
  readonly asV3: XcmV3Xcm;
  readonly isV4: boolean;
  readonly asV4: StagingXcmV4Xcm;
  readonly type: 'V2' | 'V3' | 'V4';
}

export type PHANTOM_DEFAULT = 'default';
