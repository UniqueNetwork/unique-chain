// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { BTreeMap, BTreeSet, Bytes, Compact, Enum, Null, Option, Result, Struct, Text, U256, U8aFixed, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H160, H256, MultiAddress, Perbill, Permill } from '@polkadot/types/interfaces/runtime';
import type { Event } from '@polkadot/types/interfaces/system';

/** @name CumulusPalletDmpQueueCall */
export interface CumulusPalletDmpQueueCall extends Enum {
  readonly isServiceOverweight: boolean;
  readonly asServiceOverweight: {
    readonly index: u64;
    readonly weightLimit: u64;
  } & Struct;
  readonly type: 'ServiceOverweight';
}

/** @name CumulusPalletDmpQueueConfigData */
export interface CumulusPalletDmpQueueConfigData extends Struct {
  readonly maxIndividual: u64;
}

/** @name CumulusPalletDmpQueueError */
export interface CumulusPalletDmpQueueError extends Enum {
  readonly isUnknown: boolean;
  readonly isOverLimit: boolean;
  readonly type: 'Unknown' | 'OverLimit';
}

/** @name CumulusPalletDmpQueueEvent */
export interface CumulusPalletDmpQueueEvent extends Enum {
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
    readonly remainingWeight: u64;
    readonly requiredWeight: u64;
  } & Struct;
  readonly isOverweightEnqueued: boolean;
  readonly asOverweightEnqueued: {
    readonly messageId: U8aFixed;
    readonly overweightIndex: u64;
    readonly requiredWeight: u64;
  } & Struct;
  readonly isOverweightServiced: boolean;
  readonly asOverweightServiced: {
    readonly overweightIndex: u64;
    readonly weightUsed: u64;
  } & Struct;
  readonly type: 'InvalidFormat' | 'UnsupportedVersion' | 'ExecutedDownward' | 'WeightExhausted' | 'OverweightEnqueued' | 'OverweightServiced';
}

/** @name CumulusPalletDmpQueuePageIndexData */
export interface CumulusPalletDmpQueuePageIndexData extends Struct {
  readonly beginUsed: u32;
  readonly endUsed: u32;
  readonly overweightCount: u64;
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
    readonly weightUsed: u64;
    readonly dmqHead: H256;
  } & Struct;
  readonly type: 'ValidationFunctionStored' | 'ValidationFunctionApplied' | 'ValidationFunctionDiscarded' | 'UpgradeAuthorized' | 'DownwardMessagesReceived' | 'DownwardMessagesProcessed';
}

/** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot */
export interface CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot extends Struct {
  readonly dmqMqcHead: H256;
  readonly relayDispatchQueueSize: ITuple<[u32, u32]>;
  readonly ingressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
  readonly egressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
}

/** @name CumulusPalletXcmCall */
export interface CumulusPalletXcmCall extends Null {}

/** @name CumulusPalletXcmError */
export interface CumulusPalletXcmError extends Null {}

/** @name CumulusPalletXcmEvent */
export interface CumulusPalletXcmEvent extends Enum {
  readonly isInvalidFormat: boolean;
  readonly asInvalidFormat: U8aFixed;
  readonly isUnsupportedVersion: boolean;
  readonly asUnsupportedVersion: U8aFixed;
  readonly isExecutedDownward: boolean;
  readonly asExecutedDownward: ITuple<[U8aFixed, XcmV2TraitsOutcome]>;
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

/** @name CumulusPalletXcmpQueueError */
export interface CumulusPalletXcmpQueueError extends Enum {
  readonly isFailedToSend: boolean;
  readonly isBadXcmOrigin: boolean;
  readonly isBadXcm: boolean;
  readonly isBadOverweightIndex: boolean;
  readonly isWeightOverLimit: boolean;
  readonly type: 'FailedToSend' | 'BadXcmOrigin' | 'BadXcm' | 'BadOverweightIndex' | 'WeightOverLimit';
}

/** @name CumulusPalletXcmpQueueEvent */
export interface CumulusPalletXcmpQueueEvent extends Enum {
  readonly isSuccess: boolean;
  readonly asSuccess: {
    readonly messageHash: Option<H256>;
    readonly weight: u64;
  } & Struct;
  readonly isFail: boolean;
  readonly asFail: {
    readonly messageHash: Option<H256>;
    readonly error: XcmV2TraitsError;
    readonly weight: u64;
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
    readonly required: u64;
  } & Struct;
  readonly isOverweightServiced: boolean;
  readonly asOverweightServiced: {
    readonly index: u64;
    readonly used: u64;
  } & Struct;
  readonly type: 'Success' | 'Fail' | 'BadVersion' | 'BadFormat' | 'UpwardMessageSent' | 'XcmpMessageSent' | 'OverweightEnqueued' | 'OverweightServiced';
}

/** @name CumulusPalletXcmpQueueInboundChannelDetails */
export interface CumulusPalletXcmpQueueInboundChannelDetails extends Struct {
  readonly sender: u32;
  readonly state: CumulusPalletXcmpQueueInboundState;
  readonly messageMetadata: Vec<ITuple<[u32, PolkadotParachainPrimitivesXcmpMessageFormat]>>;
}

/** @name CumulusPalletXcmpQueueInboundState */
export interface CumulusPalletXcmpQueueInboundState extends Enum {
  readonly isOk: boolean;
  readonly isSuspended: boolean;
  readonly type: 'Ok' | 'Suspended';
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
  readonly thresholdWeight: u64;
  readonly weightRestrictDecay: u64;
  readonly xcmpMaxIndividualWeight: u64;
}

/** @name CumulusPrimitivesParachainInherentParachainInherentData */
export interface CumulusPrimitivesParachainInherentParachainInherentData extends Struct {
  readonly validationData: PolkadotPrimitivesV2PersistedValidationData;
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
  readonly isInvalidCode: boolean;
  readonly type: 'StackUnderflow' | 'StackOverflow' | 'InvalidJump' | 'InvalidRange' | 'DesignatedInvalid' | 'CallTooDeep' | 'CreateCollision' | 'CreateContractLimit' | 'OutOfOffset' | 'OutOfGas' | 'OutOfFund' | 'PcUnderflow' | 'CreateEmpty' | 'Other' | 'InvalidCode';
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

/** @name FrameSupportDispatchRawOrigin */
export interface FrameSupportDispatchRawOrigin extends Enum {
  readonly isRoot: boolean;
  readonly isSigned: boolean;
  readonly asSigned: AccountId32;
  readonly isNone: boolean;
  readonly type: 'Root' | 'Signed' | 'None';
}

/** @name FrameSupportPalletId */
export interface FrameSupportPalletId extends U8aFixed {}

/** @name FrameSupportScheduleLookupError */
export interface FrameSupportScheduleLookupError extends Enum {
  readonly isUnknown: boolean;
  readonly isBadFormat: boolean;
  readonly type: 'Unknown' | 'BadFormat';
}

/** @name FrameSupportScheduleMaybeHashed */
export interface FrameSupportScheduleMaybeHashed extends Enum {
  readonly isValue: boolean;
  readonly asValue: Call;
  readonly isHash: boolean;
  readonly asHash: H256;
  readonly type: 'Value' | 'Hash';
}

/** @name FrameSupportTokensMiscBalanceStatus */
export interface FrameSupportTokensMiscBalanceStatus extends Enum {
  readonly isFree: boolean;
  readonly isReserved: boolean;
  readonly type: 'Free' | 'Reserved';
}

/** @name FrameSupportWeightsDispatchClass */
export interface FrameSupportWeightsDispatchClass extends Enum {
  readonly isNormal: boolean;
  readonly isOperational: boolean;
  readonly isMandatory: boolean;
  readonly type: 'Normal' | 'Operational' | 'Mandatory';
}

/** @name FrameSupportWeightsDispatchInfo */
export interface FrameSupportWeightsDispatchInfo extends Struct {
  readonly weight: u64;
  readonly class: FrameSupportWeightsDispatchClass;
  readonly paysFee: FrameSupportWeightsPays;
}

/** @name FrameSupportWeightsPays */
export interface FrameSupportWeightsPays extends Enum {
  readonly isYes: boolean;
  readonly isNo: boolean;
  readonly type: 'Yes' | 'No';
}

/** @name FrameSupportWeightsPerDispatchClassU32 */
export interface FrameSupportWeightsPerDispatchClassU32 extends Struct {
  readonly normal: u32;
  readonly operational: u32;
  readonly mandatory: u32;
}

/** @name FrameSupportWeightsPerDispatchClassU64 */
export interface FrameSupportWeightsPerDispatchClassU64 extends Struct {
  readonly normal: u64;
  readonly operational: u64;
  readonly mandatory: u64;
}

/** @name FrameSupportWeightsPerDispatchClassWeightsPerClass */
export interface FrameSupportWeightsPerDispatchClassWeightsPerClass extends Struct {
  readonly normal: FrameSystemLimitsWeightsPerClass;
  readonly operational: FrameSystemLimitsWeightsPerClass;
  readonly mandatory: FrameSystemLimitsWeightsPerClass;
}

/** @name FrameSupportWeightsRuntimeDbWeight */
export interface FrameSupportWeightsRuntimeDbWeight extends Struct {
  readonly read: u64;
  readonly write: u64;
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

/** @name FrameSystemError */
export interface FrameSystemError extends Enum {
  readonly isInvalidSpecName: boolean;
  readonly isSpecVersionNeedsToIncrease: boolean;
  readonly isFailedToExtractRuntimeVersion: boolean;
  readonly isNonDefaultComposite: boolean;
  readonly isNonZeroRefCount: boolean;
  readonly isCallFiltered: boolean;
  readonly type: 'InvalidSpecName' | 'SpecVersionNeedsToIncrease' | 'FailedToExtractRuntimeVersion' | 'NonDefaultComposite' | 'NonZeroRefCount' | 'CallFiltered';
}

/** @name FrameSystemEvent */
export interface FrameSystemEvent extends Enum {
  readonly isExtrinsicSuccess: boolean;
  readonly asExtrinsicSuccess: {
    readonly dispatchInfo: FrameSupportWeightsDispatchInfo;
  } & Struct;
  readonly isExtrinsicFailed: boolean;
  readonly asExtrinsicFailed: {
    readonly dispatchError: SpRuntimeDispatchError;
    readonly dispatchInfo: FrameSupportWeightsDispatchInfo;
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

/** @name FrameSystemEventRecord */
export interface FrameSystemEventRecord extends Struct {
  readonly phase: FrameSystemPhase;
  readonly event: Event;
  readonly topics: Vec<H256>;
}

/** @name FrameSystemExtensionsCheckGenesis */
export interface FrameSystemExtensionsCheckGenesis extends Null {}

/** @name FrameSystemExtensionsCheckNonce */
export interface FrameSystemExtensionsCheckNonce extends Compact<u32> {}

/** @name FrameSystemExtensionsCheckSpecVersion */
export interface FrameSystemExtensionsCheckSpecVersion extends Null {}

/** @name FrameSystemExtensionsCheckWeight */
export interface FrameSystemExtensionsCheckWeight extends Null {}

/** @name FrameSystemLastRuntimeUpgradeInfo */
export interface FrameSystemLastRuntimeUpgradeInfo extends Struct {
  readonly specVersion: Compact<u32>;
  readonly specName: Text;
}

/** @name FrameSystemLimitsBlockLength */
export interface FrameSystemLimitsBlockLength extends Struct {
  readonly max: FrameSupportWeightsPerDispatchClassU32;
}

/** @name FrameSystemLimitsBlockWeights */
export interface FrameSystemLimitsBlockWeights extends Struct {
  readonly baseBlock: u64;
  readonly maxBlock: u64;
  readonly perClass: FrameSupportWeightsPerDispatchClassWeightsPerClass;
}

/** @name FrameSystemLimitsWeightsPerClass */
export interface FrameSystemLimitsWeightsPerClass extends Struct {
  readonly baseExtrinsic: u64;
  readonly maxExtrinsic: Option<u64>;
  readonly maxTotal: Option<u64>;
  readonly reserved: Option<u64>;
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
  readonly isPolkadotXcm: boolean;
  readonly asPolkadotXcm: PalletXcmOrigin;
  readonly isCumulusXcm: boolean;
  readonly asCumulusXcm: CumulusPalletXcmOrigin;
  readonly isEthereum: boolean;
  readonly asEthereum: PalletEthereumRawOrigin;
  readonly type: 'System' | 'Void' | 'PolkadotXcm' | 'CumulusXcm' | 'Ethereum';
}

/** @name OpalRuntimeRuntime */
export interface OpalRuntimeRuntime extends Null {}

/** @name OrmlTokensAccountData */
export interface OrmlTokensAccountData extends Struct {
  readonly free: u128;
  readonly reserved: u128;
  readonly frozen: u128;
}

/** @name OrmlTokensBalanceLock */
export interface OrmlTokensBalanceLock extends Struct {
  readonly id: U8aFixed;
  readonly amount: u128;
}

/** @name OrmlTokensModuleCall */
export interface OrmlTokensModuleCall extends Enum {
  readonly isTransfer: boolean;
  readonly asTransfer: {
    readonly dest: MultiAddress;
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly amount: Compact<u128>;
  } & Struct;
  readonly isTransferAll: boolean;
  readonly asTransferAll: {
    readonly dest: MultiAddress;
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly keepAlive: bool;
  } & Struct;
  readonly isTransferKeepAlive: boolean;
  readonly asTransferKeepAlive: {
    readonly dest: MultiAddress;
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly amount: Compact<u128>;
  } & Struct;
  readonly isForceTransfer: boolean;
  readonly asForceTransfer: {
    readonly source: MultiAddress;
    readonly dest: MultiAddress;
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly amount: Compact<u128>;
  } & Struct;
  readonly isSetBalance: boolean;
  readonly asSetBalance: {
    readonly who: MultiAddress;
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly newFree: Compact<u128>;
    readonly newReserved: Compact<u128>;
  } & Struct;
  readonly type: 'Transfer' | 'TransferAll' | 'TransferKeepAlive' | 'ForceTransfer' | 'SetBalance';
}

/** @name OrmlTokensModuleError */
export interface OrmlTokensModuleError extends Enum {
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

/** @name OrmlTokensModuleEvent */
export interface OrmlTokensModuleEvent extends Enum {
  readonly isEndowed: boolean;
  readonly asEndowed: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isDustLost: boolean;
  readonly asDustLost: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isTransfer: boolean;
  readonly asTransfer: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly from: AccountId32;
    readonly to: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isReserved: boolean;
  readonly asReserved: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isUnreserved: boolean;
  readonly asUnreserved: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isReserveRepatriated: boolean;
  readonly asReserveRepatriated: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly from: AccountId32;
    readonly to: AccountId32;
    readonly amount: u128;
    readonly status: FrameSupportTokensMiscBalanceStatus;
  } & Struct;
  readonly isBalanceSet: boolean;
  readonly asBalanceSet: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly free: u128;
    readonly reserved: u128;
  } & Struct;
  readonly isTotalIssuanceSet: boolean;
  readonly asTotalIssuanceSet: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly amount: u128;
  } & Struct;
  readonly isWithdrawn: boolean;
  readonly asWithdrawn: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isSlashed: boolean;
  readonly asSlashed: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly freeAmount: u128;
    readonly reservedAmount: u128;
  } & Struct;
  readonly isDeposited: boolean;
  readonly asDeposited: {
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isLockSet: boolean;
  readonly asLockSet: {
    readonly lockId: U8aFixed;
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
    readonly amount: u128;
  } & Struct;
  readonly isLockRemoved: boolean;
  readonly asLockRemoved: {
    readonly lockId: U8aFixed;
    readonly currencyId: PalletForeingAssetsAssetIds;
    readonly who: AccountId32;
  } & Struct;
  readonly type: 'Endowed' | 'DustLost' | 'Transfer' | 'Reserved' | 'Unreserved' | 'ReserveRepatriated' | 'BalanceSet' | 'TotalIssuanceSet' | 'Withdrawn' | 'Slashed' | 'Deposited' | 'LockSet' | 'LockRemoved';
}

/** @name OrmlTokensReserveData */
export interface OrmlTokensReserveData extends Struct {
  readonly id: Null;
  readonly amount: u128;
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
    readonly currencyId: PalletForeingAssetsAssetIds;
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
    readonly currencyId: PalletForeingAssetsAssetIds;
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
    readonly currencies: Vec<ITuple<[PalletForeingAssetsAssetIds, u128]>>;
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
  readonly isNotSupportedMultiLocation: boolean;
  readonly isMinXcmFeeNotDefined: boolean;
  readonly type: 'AssetHasNoReserve' | 'NotCrossChainTransfer' | 'InvalidDest' | 'NotCrossChainTransferableCurrency' | 'UnweighableMessage' | 'XcmExecutionFailed' | 'CannotReanchor' | 'InvalidAncestry' | 'InvalidAsset' | 'DestinationNotInvertible' | 'BadVersion' | 'DistinctReserveForAssetAndFee' | 'ZeroFee' | 'ZeroAmount' | 'TooManyAssetsBeingSent' | 'AssetIndexNonExistent' | 'FeeNotEnough' | 'NotSupportedMultiLocation' | 'MinXcmFeeNotDefined';
}

/** @name OrmlXtokensModuleEvent */
export interface OrmlXtokensModuleEvent extends Enum {
  readonly isTransferredMultiAssets: boolean;
  readonly asTransferredMultiAssets: {
    readonly sender: AccountId32;
    readonly assets: XcmV1MultiassetMultiAssets;
    readonly fee: XcmV1MultiAsset;
    readonly dest: XcmV1MultiLocation;
  } & Struct;
  readonly type: 'TransferredMultiAssets';
}

/** @name PalletBalancesAccountData */
export interface PalletBalancesAccountData extends Struct {
  readonly free: u128;
  readonly reserved: u128;
  readonly miscFrozen: u128;
  readonly feeFrozen: u128;
}

/** @name PalletBalancesBalanceLock */
export interface PalletBalancesBalanceLock extends Struct {
  readonly id: U8aFixed;
  readonly amount: u128;
  readonly reasons: PalletBalancesReasons;
}

/** @name PalletBalancesCall */
export interface PalletBalancesCall extends Enum {
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

/** @name PalletBalancesError */
export interface PalletBalancesError extends Enum {
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

/** @name PalletBalancesReasons */
export interface PalletBalancesReasons extends Enum {
  readonly isFee: boolean;
  readonly isMisc: boolean;
  readonly isAll: boolean;
  readonly type: 'Fee' | 'Misc' | 'All';
}

/** @name PalletBalancesReleases */
export interface PalletBalancesReleases extends Enum {
  readonly isV100: boolean;
  readonly isV200: boolean;
  readonly type: 'V100' | 'V200';
}

/** @name PalletBalancesReserveData */
export interface PalletBalancesReserveData extends Struct {
  readonly id: U8aFixed;
  readonly amount: u128;
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

/** @name PalletConfigurationCall */
export interface PalletConfigurationCall extends Enum {
  readonly isSetWeightToFeeCoefficientOverride: boolean;
  readonly asSetWeightToFeeCoefficientOverride: {
    readonly coeff: Option<u32>;
  } & Struct;
  readonly isSetMinGasPriceOverride: boolean;
  readonly asSetMinGasPriceOverride: {
    readonly coeff: Option<u64>;
  } & Struct;
  readonly type: 'SetWeightToFeeCoefficientOverride' | 'SetMinGasPriceOverride';
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
  readonly asExecuted: ITuple<[H160, H160, H256, EvmCoreErrorExitReason]>;
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

/** @name PalletEvmCoderSubstrateError */
export interface PalletEvmCoderSubstrateError extends Enum {
  readonly isOutOfGas: boolean;
  readonly isOutOfFund: boolean;
  readonly type: 'OutOfGas' | 'OutOfFund';
}

/** @name PalletEvmContractHelpersError */
export interface PalletEvmContractHelpersError extends Enum {
  readonly isNoPermission: boolean;
  readonly isNoPendingSponsor: boolean;
  readonly type: 'NoPermission' | 'NoPendingSponsor';
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
  readonly type: 'BalanceLow' | 'FeeOverflow' | 'PaymentOverflow' | 'WithdrawFailed' | 'GasPriceTooLow' | 'InvalidNonce';
}

/** @name PalletEvmEvent */
export interface PalletEvmEvent extends Enum {
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
  readonly type: 'Begin' | 'SetData' | 'Finish';
}

/** @name PalletEvmMigrationError */
export interface PalletEvmMigrationError extends Enum {
  readonly isAccountNotEmpty: boolean;
  readonly isAccountIsNotMigrating: boolean;
  readonly type: 'AccountNotEmpty' | 'AccountIsNotMigrating';
}

/** @name PalletForeingAssetsAssetIds */
export interface PalletForeingAssetsAssetIds extends Enum {
  readonly isForeignAssetId: boolean;
  readonly asForeignAssetId: u32;
  readonly isNativeAssetId: boolean;
  readonly asNativeAssetId: PalletForeingAssetsNativeCurrency;
  readonly type: 'ForeignAssetId' | 'NativeAssetId';
}

/** @name PalletForeingAssetsModuleAssetMetadata */
export interface PalletForeingAssetsModuleAssetMetadata extends Struct {
  readonly name: Bytes;
  readonly symbol: Bytes;
  readonly decimals: u8;
  readonly minimalBalance: u128;
}

/** @name PalletForeingAssetsModuleCall */
export interface PalletForeingAssetsModuleCall extends Enum {
  readonly isRegisterForeignAsset: boolean;
  readonly asRegisterForeignAsset: {
    readonly owner: AccountId32;
    readonly location: XcmVersionedMultiLocation;
    readonly metadata: PalletForeingAssetsModuleAssetMetadata;
  } & Struct;
  readonly isUpdateForeignAsset: boolean;
  readonly asUpdateForeignAsset: {
    readonly foreignAssetId: u32;
    readonly location: XcmVersionedMultiLocation;
    readonly metadata: PalletForeingAssetsModuleAssetMetadata;
  } & Struct;
  readonly type: 'RegisterForeignAsset' | 'UpdateForeignAsset';
}

/** @name PalletForeingAssetsModuleError */
export interface PalletForeingAssetsModuleError extends Enum {
  readonly isBadLocation: boolean;
  readonly isMultiLocationExisted: boolean;
  readonly isAssetIdNotExists: boolean;
  readonly isAssetIdExisted: boolean;
  readonly type: 'BadLocation' | 'MultiLocationExisted' | 'AssetIdNotExists' | 'AssetIdExisted';
}

/** @name PalletForeingAssetsModuleEvent */
export interface PalletForeingAssetsModuleEvent extends Enum {
  readonly isForeignAssetRegistered: boolean;
  readonly asForeignAssetRegistered: {
    readonly assetId: u32;
    readonly assetAddress: XcmV1MultiLocation;
    readonly metadata: PalletForeingAssetsModuleAssetMetadata;
  } & Struct;
  readonly isForeignAssetUpdated: boolean;
  readonly asForeignAssetUpdated: {
    readonly assetId: u32;
    readonly assetAddress: XcmV1MultiLocation;
    readonly metadata: PalletForeingAssetsModuleAssetMetadata;
  } & Struct;
  readonly isAssetRegistered: boolean;
  readonly asAssetRegistered: {
    readonly assetId: PalletForeingAssetsAssetIds;
    readonly metadata: PalletForeingAssetsModuleAssetMetadata;
  } & Struct;
  readonly isAssetUpdated: boolean;
  readonly asAssetUpdated: {
    readonly assetId: PalletForeingAssetsAssetIds;
    readonly metadata: PalletForeingAssetsModuleAssetMetadata;
  } & Struct;
  readonly type: 'ForeignAssetRegistered' | 'ForeignAssetUpdated' | 'AssetRegistered' | 'AssetUpdated';
}

/** @name PalletForeingAssetsNativeCurrency */
export interface PalletForeingAssetsNativeCurrency extends Enum {
  readonly isHere: boolean;
  readonly isParent: boolean;
  readonly type: 'Here' | 'Parent';
}

/** @name PalletFungibleError */
export interface PalletFungibleError extends Enum {
  readonly isNotFungibleDataUsedToMintFungibleCollectionToken: boolean;
  readonly isFungibleItemsHaveNoId: boolean;
  readonly isFungibleItemsDontHaveData: boolean;
  readonly isFungibleDisallowsNesting: boolean;
  readonly isSettingPropertiesNotAllowed: boolean;
  readonly type: 'NotFungibleDataUsedToMintFungibleCollectionToken' | 'FungibleItemsHaveNoId' | 'FungibleItemsDontHaveData' | 'FungibleDisallowsNesting' | 'SettingPropertiesNotAllowed';
}

/** @name PalletInflationCall */
export interface PalletInflationCall extends Enum {
  readonly isStartInflation: boolean;
  readonly asStartInflation: {
    readonly inflationStartRelayBlock: u32;
  } & Struct;
  readonly type: 'StartInflation';
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

/** @name PalletRefungibleError */
export interface PalletRefungibleError extends Enum {
  readonly isNotRefungibleDataUsedToMintFungibleCollectionToken: boolean;
  readonly isWrongRefungiblePieces: boolean;
  readonly isRepartitionWhileNotOwningAllPieces: boolean;
  readonly isRefungibleDisallowsNesting: boolean;
  readonly isSettingPropertiesNotAllowed: boolean;
  readonly type: 'NotRefungibleDataUsedToMintFungibleCollectionToken' | 'WrongRefungiblePieces' | 'RepartitionWhileNotOwningAllPieces' | 'RefungibleDisallowsNesting' | 'SettingPropertiesNotAllowed';
}

/** @name PalletRefungibleItemData */
export interface PalletRefungibleItemData extends Struct {
  readonly constData: Bytes;
}

/** @name PalletRmrkCoreCall */
export interface PalletRmrkCoreCall extends Enum {
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

/** @name PalletRmrkCoreError */
export interface PalletRmrkCoreError extends Enum {
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

/** @name PalletRmrkCoreEvent */
export interface PalletRmrkCoreEvent extends Enum {
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

/** @name PalletRmrkEquipCall */
export interface PalletRmrkEquipCall extends Enum {
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

/** @name PalletRmrkEquipError */
export interface PalletRmrkEquipError extends Enum {
  readonly isPermissionError: boolean;
  readonly isNoAvailableBaseId: boolean;
  readonly isNoAvailablePartId: boolean;
  readonly isBaseDoesntExist: boolean;
  readonly isNeedsDefaultThemeFirst: boolean;
  readonly isPartDoesntExist: boolean;
  readonly isNoEquippableOnFixedPart: boolean;
  readonly type: 'PermissionError' | 'NoAvailableBaseId' | 'NoAvailablePartId' | 'BaseDoesntExist' | 'NeedsDefaultThemeFirst' | 'PartDoesntExist' | 'NoEquippableOnFixedPart';
}

/** @name PalletRmrkEquipEvent */
export interface PalletRmrkEquipEvent extends Enum {
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

/** @name PalletStructureCall */
export interface PalletStructureCall extends Null {}

/** @name PalletStructureError */
export interface PalletStructureError extends Enum {
  readonly isOuroborosDetected: boolean;
  readonly isDepthLimit: boolean;
  readonly isBreadthLimit: boolean;
  readonly isTokenNotFound: boolean;
  readonly type: 'OuroborosDetected' | 'DepthLimit' | 'BreadthLimit' | 'TokenNotFound';
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
    readonly weight: u64;
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
    readonly oldSudoer: Option<AccountId32>;
  } & Struct;
  readonly isSudoAsDone: boolean;
  readonly asSudoAsDone: {
    readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
  } & Struct;
  readonly type: 'Sudid' | 'KeyChanged' | 'SudoAsDone';
}

/** @name PalletTemplateTransactionPaymentCall */
export interface PalletTemplateTransactionPaymentCall extends Null {}

/** @name PalletTemplateTransactionPaymentChargeTransactionPayment */
export interface PalletTemplateTransactionPaymentChargeTransactionPayment extends Compact<u128> {}

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

/** @name PalletTreasuryError */
export interface PalletTreasuryError extends Enum {
  readonly isInsufficientProposersBalance: boolean;
  readonly isInvalidIndex: boolean;
  readonly isTooManyApprovals: boolean;
  readonly isInsufficientPermission: boolean;
  readonly isProposalNotApproved: boolean;
  readonly type: 'InsufficientProposersBalance' | 'InvalidIndex' | 'TooManyApprovals' | 'InsufficientPermission' | 'ProposalNotApproved';
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
  readonly type: 'Proposed' | 'Spending' | 'Awarded' | 'Rejected' | 'Burnt' | 'Rollover' | 'Deposit' | 'SpendApproved';
}

/** @name PalletTreasuryProposal */
export interface PalletTreasuryProposal extends Struct {
  readonly proposer: AccountId32;
  readonly value: u128;
  readonly beneficiary: AccountId32;
  readonly bond: u128;
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
  readonly type: 'CreateCollection' | 'CreateCollectionEx' | 'DestroyCollection' | 'AddToAllowList' | 'RemoveFromAllowList' | 'ChangeCollectionOwner' | 'AddCollectionAdmin' | 'RemoveCollectionAdmin' | 'SetCollectionSponsor' | 'ConfirmSponsorship' | 'RemoveCollectionSponsor' | 'CreateItem' | 'CreateMultipleItems' | 'SetCollectionProperties' | 'DeleteCollectionProperties' | 'SetTokenProperties' | 'DeleteTokenProperties' | 'SetTokenPropertyPermissions' | 'CreateMultipleItemsEx' | 'SetTransfersEnabledFlag' | 'BurnItem' | 'BurnFrom' | 'Transfer' | 'Approve' | 'TransferFrom' | 'SetCollectionLimits' | 'SetCollectionPermissions' | 'Repartition';
}

/** @name PalletUniqueError */
export interface PalletUniqueError extends Enum {
  readonly isCollectionDecimalPointLimitExceeded: boolean;
  readonly isConfirmUnsetSponsorFail: boolean;
  readonly isEmptyArgument: boolean;
  readonly isRepartitionCalledOnNonRefungibleCollection: boolean;
  readonly type: 'CollectionDecimalPointLimitExceeded' | 'ConfirmUnsetSponsorFail' | 'EmptyArgument' | 'RepartitionCalledOnNonRefungibleCollection';
}

/** @name PalletUniqueRawEvent */
export interface PalletUniqueRawEvent extends Enum {
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

/** @name PalletUniqueSchedulerCall */
export interface PalletUniqueSchedulerCall extends Enum {
  readonly isScheduleNamed: boolean;
  readonly asScheduleNamed: {
    readonly id: U8aFixed;
    readonly when: u32;
    readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
    readonly priority: u8;
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
    readonly priority: u8;
    readonly call: FrameSupportScheduleMaybeHashed;
  } & Struct;
  readonly type: 'ScheduleNamed' | 'CancelNamed' | 'ScheduleNamedAfter';
}

/** @name PalletUniqueSchedulerError */
export interface PalletUniqueSchedulerError extends Enum {
  readonly isFailedToSchedule: boolean;
  readonly isNotFound: boolean;
  readonly isTargetBlockNumberInPast: boolean;
  readonly isRescheduleNoChange: boolean;
  readonly type: 'FailedToSchedule' | 'NotFound' | 'TargetBlockNumberInPast' | 'RescheduleNoChange';
}

/** @name PalletUniqueSchedulerEvent */
export interface PalletUniqueSchedulerEvent extends Enum {
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
  readonly isCallLookupFailed: boolean;
  readonly asCallLookupFailed: {
    readonly task: ITuple<[u32, u32]>;
    readonly id: Option<U8aFixed>;
    readonly error: FrameSupportScheduleLookupError;
  } & Struct;
  readonly type: 'Scheduled' | 'Canceled' | 'Dispatched' | 'CallLookupFailed';
}

/** @name PalletUniqueSchedulerScheduledV3 */
export interface PalletUniqueSchedulerScheduledV3 extends Struct {
  readonly maybeId: Option<U8aFixed>;
  readonly priority: u8;
  readonly call: FrameSupportScheduleMaybeHashed;
  readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
  readonly origin: OpalRuntimeOriginCaller;
}

/** @name PalletXcmCall */
export interface PalletXcmCall extends Enum {
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
  readonly type: 'Unreachable' | 'SendFailure' | 'Filtered' | 'UnweighableMessage' | 'DestinationNotInvertible' | 'Empty' | 'CannotReanchor' | 'TooManyAssets' | 'InvalidOrigin' | 'BadVersion' | 'BadLocation' | 'NoSubscription' | 'AlreadySubscribed';
}

/** @name PalletXcmEvent */
export interface PalletXcmEvent extends Enum {
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
  readonly asNotifyOverweight: ITuple<[u64, u8, u8, u64, u64]>;
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

/** @name PalletXcmOrigin */
export interface PalletXcmOrigin extends Enum {
  readonly isXcm: boolean;
  readonly asXcm: XcmV1MultiLocation;
  readonly isResponse: boolean;
  readonly asResponse: XcmV1MultiLocation;
  readonly type: 'Xcm' | 'Response';
}

/** @name PhantomTypeUpDataStructs */
export interface PhantomTypeUpDataStructs extends Vec<ITuple<[UpDataStructsTokenData, UpDataStructsRpcCollection, RmrkTraitsCollectionCollectionInfo, RmrkTraitsNftNftInfo, RmrkTraitsResourceResourceInfo, RmrkTraitsPropertyPropertyInfo, RmrkTraitsBaseBaseInfo, RmrkTraitsPartPartType, RmrkTraitsTheme, RmrkTraitsNftNftChild]>> {}

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

/** @name PolkadotParachainPrimitivesXcmpMessageFormat */
export interface PolkadotParachainPrimitivesXcmpMessageFormat extends Enum {
  readonly isConcatenatedVersionedXcm: boolean;
  readonly isConcatenatedEncodedBlob: boolean;
  readonly isSignals: boolean;
  readonly type: 'ConcatenatedVersionedXcm' | 'ConcatenatedEncodedBlob' | 'Signals';
}

/** @name PolkadotPrimitivesV2AbridgedHostConfiguration */
export interface PolkadotPrimitivesV2AbridgedHostConfiguration extends Struct {
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

/** @name PolkadotPrimitivesV2AbridgedHrmpChannel */
export interface PolkadotPrimitivesV2AbridgedHrmpChannel extends Struct {
  readonly maxCapacity: u32;
  readonly maxTotalSize: u32;
  readonly maxMessageSize: u32;
  readonly msgCount: u32;
  readonly totalSize: u32;
  readonly mqcHead: Option<H256>;
}

/** @name PolkadotPrimitivesV2PersistedValidationData */
export interface PolkadotPrimitivesV2PersistedValidationData extends Struct {
  readonly parentHead: Bytes;
  readonly relayParentNumber: u32;
  readonly relayParentStorageRoot: H256;
  readonly maxPovSize: u32;
}

/** @name PolkadotPrimitivesV2UpgradeRestriction */
export interface PolkadotPrimitivesV2UpgradeRestriction extends Enum {
  readonly isPresent: boolean;
  readonly type: 'Present';
}

/** @name RmrkTraitsBaseBaseInfo */
export interface RmrkTraitsBaseBaseInfo extends Struct {
  readonly issuer: AccountId32;
  readonly baseType: Bytes;
  readonly symbol: Bytes;
}

/** @name RmrkTraitsCollectionCollectionInfo */
export interface RmrkTraitsCollectionCollectionInfo extends Struct {
  readonly issuer: AccountId32;
  readonly metadata: Bytes;
  readonly max: Option<u32>;
  readonly symbol: Bytes;
  readonly nftsCount: u32;
}

/** @name RmrkTraitsNftAccountIdOrCollectionNftTuple */
export interface RmrkTraitsNftAccountIdOrCollectionNftTuple extends Enum {
  readonly isAccountId: boolean;
  readonly asAccountId: AccountId32;
  readonly isCollectionAndNftTuple: boolean;
  readonly asCollectionAndNftTuple: ITuple<[u32, u32]>;
  readonly type: 'AccountId' | 'CollectionAndNftTuple';
}

/** @name RmrkTraitsNftNftChild */
export interface RmrkTraitsNftNftChild extends Struct {
  readonly collectionId: u32;
  readonly nftId: u32;
}

/** @name RmrkTraitsNftNftInfo */
export interface RmrkTraitsNftNftInfo extends Struct {
  readonly owner: RmrkTraitsNftAccountIdOrCollectionNftTuple;
  readonly royalty: Option<RmrkTraitsNftRoyaltyInfo>;
  readonly metadata: Bytes;
  readonly equipped: bool;
  readonly pending: bool;
}

/** @name RmrkTraitsNftRoyaltyInfo */
export interface RmrkTraitsNftRoyaltyInfo extends Struct {
  readonly recipient: AccountId32;
  readonly amount: Permill;
}

/** @name RmrkTraitsPartEquippableList */
export interface RmrkTraitsPartEquippableList extends Enum {
  readonly isAll: boolean;
  readonly isEmpty: boolean;
  readonly isCustom: boolean;
  readonly asCustom: Vec<u32>;
  readonly type: 'All' | 'Empty' | 'Custom';
}

/** @name RmrkTraitsPartFixedPart */
export interface RmrkTraitsPartFixedPart extends Struct {
  readonly id: u32;
  readonly z: u32;
  readonly src: Bytes;
}

/** @name RmrkTraitsPartPartType */
export interface RmrkTraitsPartPartType extends Enum {
  readonly isFixedPart: boolean;
  readonly asFixedPart: RmrkTraitsPartFixedPart;
  readonly isSlotPart: boolean;
  readonly asSlotPart: RmrkTraitsPartSlotPart;
  readonly type: 'FixedPart' | 'SlotPart';
}

/** @name RmrkTraitsPartSlotPart */
export interface RmrkTraitsPartSlotPart extends Struct {
  readonly id: u32;
  readonly equippable: RmrkTraitsPartEquippableList;
  readonly src: Bytes;
  readonly z: u32;
}

/** @name RmrkTraitsPropertyPropertyInfo */
export interface RmrkTraitsPropertyPropertyInfo extends Struct {
  readonly key: Bytes;
  readonly value: Bytes;
}

/** @name RmrkTraitsResourceBasicResource */
export interface RmrkTraitsResourceBasicResource extends Struct {
  readonly src: Option<Bytes>;
  readonly metadata: Option<Bytes>;
  readonly license: Option<Bytes>;
  readonly thumb: Option<Bytes>;
}

/** @name RmrkTraitsResourceComposableResource */
export interface RmrkTraitsResourceComposableResource extends Struct {
  readonly parts: Vec<u32>;
  readonly base: u32;
  readonly src: Option<Bytes>;
  readonly metadata: Option<Bytes>;
  readonly license: Option<Bytes>;
  readonly thumb: Option<Bytes>;
}

/** @name RmrkTraitsResourceResourceInfo */
export interface RmrkTraitsResourceResourceInfo extends Struct {
  readonly id: u32;
  readonly resource: RmrkTraitsResourceResourceTypes;
  readonly pending: bool;
  readonly pendingRemoval: bool;
}

/** @name RmrkTraitsResourceResourceTypes */
export interface RmrkTraitsResourceResourceTypes extends Enum {
  readonly isBasic: boolean;
  readonly asBasic: RmrkTraitsResourceBasicResource;
  readonly isComposable: boolean;
  readonly asComposable: RmrkTraitsResourceComposableResource;
  readonly isSlot: boolean;
  readonly asSlot: RmrkTraitsResourceSlotResource;
  readonly type: 'Basic' | 'Composable' | 'Slot';
}

/** @name RmrkTraitsResourceSlotResource */
export interface RmrkTraitsResourceSlotResource extends Struct {
  readonly base: u32;
  readonly src: Option<Bytes>;
  readonly metadata: Option<Bytes>;
  readonly slot: u32;
  readonly license: Option<Bytes>;
  readonly thumb: Option<Bytes>;
}

/** @name RmrkTraitsTheme */
export interface RmrkTraitsTheme extends Struct {
  readonly name: Bytes;
  readonly properties: Vec<RmrkTraitsThemeThemeProperty>;
  readonly inherit: bool;
}

/** @name RmrkTraitsThemeThemeProperty */
export interface RmrkTraitsThemeThemeProperty extends Struct {
  readonly key: Bytes;
  readonly value: Bytes;
}

/** @name SpCoreEcdsaSignature */
export interface SpCoreEcdsaSignature extends U8aFixed {}

/** @name SpCoreEd25519Signature */
export interface SpCoreEd25519Signature extends U8aFixed {}

/** @name SpCoreSr25519Signature */
export interface SpCoreSr25519Signature extends U8aFixed {}

/** @name SpCoreVoid */
export interface SpCoreVoid extends Null {}

/** @name SpRuntimeArithmeticError */
export interface SpRuntimeArithmeticError extends Enum {
  readonly isUnderflow: boolean;
  readonly isOverflow: boolean;
  readonly isDivisionByZero: boolean;
  readonly type: 'Underflow' | 'Overflow' | 'DivisionByZero';
}

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
  readonly asArithmetic: SpRuntimeArithmeticError;
  readonly isTransactional: boolean;
  readonly asTransactional: SpRuntimeTransactionalError;
  readonly type: 'Other' | 'CannotLookup' | 'BadOrigin' | 'Module' | 'ConsumerRemaining' | 'NoProviders' | 'TooManyConsumers' | 'Token' | 'Arithmetic' | 'Transactional';
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
  readonly isNoFunds: boolean;
  readonly isWouldDie: boolean;
  readonly isBelowMinimum: boolean;
  readonly isCannotCreate: boolean;
  readonly isUnknownAsset: boolean;
  readonly isFrozen: boolean;
  readonly isUnsupported: boolean;
  readonly type: 'NoFunds' | 'WouldDie' | 'BelowMinimum' | 'CannotCreate' | 'UnknownAsset' | 'Frozen' | 'Unsupported';
}

/** @name SpRuntimeTransactionalError */
export interface SpRuntimeTransactionalError extends Enum {
  readonly isLimitReached: boolean;
  readonly isNoLayer: boolean;
  readonly type: 'LimitReached' | 'NoLayer';
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
  readonly externalCollection: bool;
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
  readonly pendingSponsor: Option<AccountId32>;
  readonly limits: Option<UpDataStructsCollectionLimits>;
  readonly permissions: Option<UpDataStructsCollectionPermissions>;
  readonly tokenPropertyPermissions: Vec<UpDataStructsPropertyKeyPermission>;
  readonly properties: Vec<UpDataStructsProperty>;
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
  readonly spaceLimit: u32;
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

/** @name XcmDoubleEncoded */
export interface XcmDoubleEncoded extends Struct {
  readonly encoded: Bytes;
}

/** @name XcmV0Junction */
export interface XcmV0Junction extends Enum {
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

/** @name XcmV0JunctionBodyId */
export interface XcmV0JunctionBodyId extends Enum {
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

/** @name XcmV0JunctionBodyPart */
export interface XcmV0JunctionBodyPart extends Enum {
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

/** @name XcmV0JunctionNetworkId */
export interface XcmV0JunctionNetworkId extends Enum {
  readonly isAny: boolean;
  readonly isNamed: boolean;
  readonly asNamed: Bytes;
  readonly isPolkadot: boolean;
  readonly isKusama: boolean;
  readonly type: 'Any' | 'Named' | 'Polkadot' | 'Kusama';
}

/** @name XcmV0MultiAsset */
export interface XcmV0MultiAsset extends Enum {
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

/** @name XcmV0MultiLocation */
export interface XcmV0MultiLocation extends Enum {
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

/** @name XcmV0Order */
export interface XcmV0Order extends Enum {
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

/** @name XcmV0OriginKind */
export interface XcmV0OriginKind extends Enum {
  readonly isNative: boolean;
  readonly isSovereignAccount: boolean;
  readonly isSuperuser: boolean;
  readonly isXcm: boolean;
  readonly type: 'Native' | 'SovereignAccount' | 'Superuser' | 'Xcm';
}

/** @name XcmV0Response */
export interface XcmV0Response extends Enum {
  readonly isAssets: boolean;
  readonly asAssets: Vec<XcmV0MultiAsset>;
  readonly type: 'Assets';
}

/** @name XcmV0Xcm */
export interface XcmV0Xcm extends Enum {
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

/** @name XcmV1Junction */
export interface XcmV1Junction extends Enum {
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

/** @name XcmV1MultiAsset */
export interface XcmV1MultiAsset extends Struct {
  readonly id: XcmV1MultiassetAssetId;
  readonly fun: XcmV1MultiassetFungibility;
}

/** @name XcmV1MultiassetAssetId */
export interface XcmV1MultiassetAssetId extends Enum {
  readonly isConcrete: boolean;
  readonly asConcrete: XcmV1MultiLocation;
  readonly isAbstract: boolean;
  readonly asAbstract: Bytes;
  readonly type: 'Concrete' | 'Abstract';
}

/** @name XcmV1MultiassetAssetInstance */
export interface XcmV1MultiassetAssetInstance extends Enum {
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

/** @name XcmV1MultiassetFungibility */
export interface XcmV1MultiassetFungibility extends Enum {
  readonly isFungible: boolean;
  readonly asFungible: Compact<u128>;
  readonly isNonFungible: boolean;
  readonly asNonFungible: XcmV1MultiassetAssetInstance;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name XcmV1MultiassetMultiAssetFilter */
export interface XcmV1MultiassetMultiAssetFilter extends Enum {
  readonly isDefinite: boolean;
  readonly asDefinite: XcmV1MultiassetMultiAssets;
  readonly isWild: boolean;
  readonly asWild: XcmV1MultiassetWildMultiAsset;
  readonly type: 'Definite' | 'Wild';
}

/** @name XcmV1MultiassetMultiAssets */
export interface XcmV1MultiassetMultiAssets extends Vec<XcmV1MultiAsset> {}

/** @name XcmV1MultiassetWildFungibility */
export interface XcmV1MultiassetWildFungibility extends Enum {
  readonly isFungible: boolean;
  readonly isNonFungible: boolean;
  readonly type: 'Fungible' | 'NonFungible';
}

/** @name XcmV1MultiassetWildMultiAsset */
export interface XcmV1MultiassetWildMultiAsset extends Enum {
  readonly isAll: boolean;
  readonly isAllOf: boolean;
  readonly asAllOf: {
    readonly id: XcmV1MultiassetAssetId;
    readonly fun: XcmV1MultiassetWildFungibility;
  } & Struct;
  readonly type: 'All' | 'AllOf';
}

/** @name XcmV1MultiLocation */
export interface XcmV1MultiLocation extends Struct {
  readonly parents: u8;
  readonly interior: XcmV1MultilocationJunctions;
}

/** @name XcmV1MultilocationJunctions */
export interface XcmV1MultilocationJunctions extends Enum {
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

/** @name XcmV1Order */
export interface XcmV1Order extends Enum {
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

/** @name XcmV1Response */
export interface XcmV1Response extends Enum {
  readonly isAssets: boolean;
  readonly asAssets: XcmV1MultiassetMultiAssets;
  readonly isVersion: boolean;
  readonly asVersion: u32;
  readonly type: 'Assets' | 'Version';
}

/** @name XcmV1Xcm */
export interface XcmV1Xcm extends Enum {
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

/** @name XcmV2Instruction */
export interface XcmV2Instruction extends Enum {
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

/** @name XcmV2Response */
export interface XcmV2Response extends Enum {
  readonly isNull: boolean;
  readonly isAssets: boolean;
  readonly asAssets: XcmV1MultiassetMultiAssets;
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

/** @name XcmV2TraitsOutcome */
export interface XcmV2TraitsOutcome extends Enum {
  readonly isComplete: boolean;
  readonly asComplete: u64;
  readonly isIncomplete: boolean;
  readonly asIncomplete: ITuple<[u64, XcmV2TraitsError]>;
  readonly isError: boolean;
  readonly asError: XcmV2TraitsError;
  readonly type: 'Complete' | 'Incomplete' | 'Error';
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

/** @name XcmVersionedMultiAsset */
export interface XcmVersionedMultiAsset extends Enum {
  readonly isV0: boolean;
  readonly asV0: XcmV0MultiAsset;
  readonly isV1: boolean;
  readonly asV1: XcmV1MultiAsset;
  readonly type: 'V0' | 'V1';
}

/** @name XcmVersionedMultiAssets */
export interface XcmVersionedMultiAssets extends Enum {
  readonly isV0: boolean;
  readonly asV0: Vec<XcmV0MultiAsset>;
  readonly isV1: boolean;
  readonly asV1: XcmV1MultiassetMultiAssets;
  readonly type: 'V0' | 'V1';
}

/** @name XcmVersionedMultiLocation */
export interface XcmVersionedMultiLocation extends Enum {
  readonly isV0: boolean;
  readonly asV0: XcmV0MultiLocation;
  readonly isV1: boolean;
  readonly asV1: XcmV1MultiLocation;
  readonly type: 'V0' | 'V1';
}

/** @name XcmVersionedXcm */
export interface XcmVersionedXcm extends Enum {
  readonly isV0: boolean;
  readonly asV0: XcmV0Xcm;
  readonly isV1: boolean;
  readonly asV1: XcmV1Xcm;
  readonly isV2: boolean;
  readonly asV2: XcmV2Xcm;
  readonly type: 'V0' | 'V1' | 'V2';
}

export type PHANTOM_DEFAULT = 'default';
