// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

declare module '@polkadot/types/lookup' {
  import type { BTreeMap, BTreeSet, Bytes, Compact, Enum, Null, Option, OptionBool, Result, Struct, Text, U256, U8aFixed, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
  import type { ITuple } from '@polkadot/types-codec/types';
  import type { AccountId32, Call, H160, H256, MultiAddress, Perbill, Permill } from '@polkadot/types/interfaces/runtime';
  import type { Event } from '@polkadot/types/interfaces/system';

  /** @name PolkadotPrimitivesV2PersistedValidationData (2) */
  export interface PolkadotPrimitivesV2PersistedValidationData extends Struct {
    readonly parentHead: Bytes;
    readonly relayParentNumber: u32;
    readonly relayParentStorageRoot: H256;
    readonly maxPovSize: u32;
  }

  /** @name PolkadotPrimitivesV2UpgradeRestriction (9) */
  export interface PolkadotPrimitivesV2UpgradeRestriction extends Enum {
    readonly isPresent: boolean;
    readonly type: 'Present';
  }

  /** @name SpTrieStorageProof (10) */
  export interface SpTrieStorageProof extends Struct {
    readonly trieNodes: BTreeSet<Bytes>;
  }

  /** @name CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot (13) */
  export interface CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot extends Struct {
    readonly dmqMqcHead: H256;
    readonly relayDispatchQueueSize: ITuple<[u32, u32]>;
    readonly ingressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
    readonly egressChannels: Vec<ITuple<[u32, PolkadotPrimitivesV2AbridgedHrmpChannel]>>;
  }

  /** @name PolkadotPrimitivesV2AbridgedHrmpChannel (18) */
  export interface PolkadotPrimitivesV2AbridgedHrmpChannel extends Struct {
    readonly maxCapacity: u32;
    readonly maxTotalSize: u32;
    readonly maxMessageSize: u32;
    readonly msgCount: u32;
    readonly totalSize: u32;
    readonly mqcHead: Option<H256>;
  }

  /** @name PolkadotPrimitivesV2AbridgedHostConfiguration (20) */
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

  /** @name PolkadotCorePrimitivesOutboundHrmpMessage (26) */
  export interface PolkadotCorePrimitivesOutboundHrmpMessage extends Struct {
    readonly recipient: u32;
    readonly data: Bytes;
  }

  /** @name CumulusPalletParachainSystemCall (28) */
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

  /** @name CumulusPrimitivesParachainInherentParachainInherentData (29) */
  export interface CumulusPrimitivesParachainInherentParachainInherentData extends Struct {
    readonly validationData: PolkadotPrimitivesV2PersistedValidationData;
    readonly relayChainState: SpTrieStorageProof;
    readonly downwardMessages: Vec<PolkadotCorePrimitivesInboundDownwardMessage>;
    readonly horizontalMessages: BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>;
  }

  /** @name PolkadotCorePrimitivesInboundDownwardMessage (31) */
  export interface PolkadotCorePrimitivesInboundDownwardMessage extends Struct {
    readonly sentAt: u32;
    readonly msg: Bytes;
  }

  /** @name PolkadotCorePrimitivesInboundHrmpMessage (34) */
  export interface PolkadotCorePrimitivesInboundHrmpMessage extends Struct {
    readonly sentAt: u32;
    readonly data: Bytes;
  }

  /** @name CumulusPalletParachainSystemEvent (37) */
  export interface CumulusPalletParachainSystemEvent extends Enum {
    readonly isValidationFunctionStored: boolean;
    readonly isValidationFunctionApplied: boolean;
    readonly asValidationFunctionApplied: u32;
    readonly isValidationFunctionDiscarded: boolean;
    readonly isUpgradeAuthorized: boolean;
    readonly asUpgradeAuthorized: H256;
    readonly isDownwardMessagesReceived: boolean;
    readonly asDownwardMessagesReceived: u32;
    readonly isDownwardMessagesProcessed: boolean;
    readonly asDownwardMessagesProcessed: ITuple<[u64, H256]>;
    readonly type: 'ValidationFunctionStored' | 'ValidationFunctionApplied' | 'ValidationFunctionDiscarded' | 'UpgradeAuthorized' | 'DownwardMessagesReceived' | 'DownwardMessagesProcessed';
  }

  /** @name CumulusPalletParachainSystemError (38) */
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

  /** @name PalletBalancesAccountData (41) */
  export interface PalletBalancesAccountData extends Struct {
    readonly free: u128;
    readonly reserved: u128;
    readonly miscFrozen: u128;
    readonly feeFrozen: u128;
  }

  /** @name PalletBalancesBalanceLock (43) */
  export interface PalletBalancesBalanceLock extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
    readonly reasons: PalletBalancesReasons;
  }

  /** @name PalletBalancesReasons (45) */
  export interface PalletBalancesReasons extends Enum {
    readonly isFee: boolean;
    readonly isMisc: boolean;
    readonly isAll: boolean;
    readonly type: 'Fee' | 'Misc' | 'All';
  }

  /** @name PalletBalancesReserveData (48) */
  export interface PalletBalancesReserveData extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
  }

  /** @name PalletBalancesReleases (50) */
  export interface PalletBalancesReleases extends Enum {
    readonly isV100: boolean;
    readonly isV200: boolean;
    readonly type: 'V100' | 'V200';
  }

  /** @name PalletBalancesCall (51) */
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

  /** @name PalletBalancesEvent (57) */
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

  /** @name FrameSupportTokensMiscBalanceStatus (58) */
  export interface FrameSupportTokensMiscBalanceStatus extends Enum {
    readonly isFree: boolean;
    readonly isReserved: boolean;
    readonly type: 'Free' | 'Reserved';
  }

  /** @name PalletBalancesError (59) */
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

  /** @name PalletTimestampCall (62) */
  export interface PalletTimestampCall extends Enum {
    readonly isSet: boolean;
    readonly asSet: {
      readonly now: Compact<u64>;
    } & Struct;
    readonly type: 'Set';
  }

  /** @name PalletTransactionPaymentReleases (65) */
  export interface PalletTransactionPaymentReleases extends Enum {
    readonly isV1Ancient: boolean;
    readonly isV2: boolean;
    readonly type: 'V1Ancient' | 'V2';
  }

  /** @name FrameSupportWeightsWeightToFeeCoefficient (67) */
  export interface FrameSupportWeightsWeightToFeeCoefficient extends Struct {
    readonly coeffInteger: u128;
    readonly coeffFrac: Perbill;
    readonly negative: bool;
    readonly degree: u8;
  }

  /** @name PalletTreasuryProposal (69) */
  export interface PalletTreasuryProposal extends Struct {
    readonly proposer: AccountId32;
    readonly value: u128;
    readonly beneficiary: AccountId32;
    readonly bond: u128;
  }

  /** @name PalletTreasuryCall (72) */
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
    readonly type: 'ProposeSpend' | 'RejectProposal' | 'ApproveProposal';
  }

  /** @name PalletTreasuryEvent (74) */
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
    readonly type: 'Proposed' | 'Spending' | 'Awarded' | 'Rejected' | 'Burnt' | 'Rollover' | 'Deposit';
  }

  /** @name FrameSupportPalletId (77) */
  export interface FrameSupportPalletId extends U8aFixed {}

  /** @name PalletTreasuryError (78) */
  export interface PalletTreasuryError extends Enum {
    readonly isInsufficientProposersBalance: boolean;
    readonly isInvalidIndex: boolean;
    readonly isTooManyApprovals: boolean;
    readonly type: 'InsufficientProposersBalance' | 'InvalidIndex' | 'TooManyApprovals';
  }

  /** @name PalletSudoCall (79) */
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

  /** @name FrameSystemCall (81) */
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

  /** @name OrmlVestingModuleCall (84) */
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

  /** @name OrmlVestingVestingSchedule (85) */
  export interface OrmlVestingVestingSchedule extends Struct {
    readonly start: u32;
    readonly period: u32;
    readonly periodCount: u32;
    readonly perPeriod: Compact<u128>;
  }

  /** @name CumulusPalletXcmpQueueCall (87) */
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

  /** @name PalletXcmCall (88) */
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

  /** @name XcmVersionedMultiLocation (89) */
  export interface XcmVersionedMultiLocation extends Enum {
    readonly isV0: boolean;
    readonly asV0: XcmV0MultiLocation;
    readonly isV1: boolean;
    readonly asV1: XcmV1MultiLocation;
    readonly type: 'V0' | 'V1';
  }

  /** @name XcmV0MultiLocation (90) */
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

  /** @name XcmV0Junction (91) */
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

  /** @name XcmV0JunctionNetworkId (92) */
  export interface XcmV0JunctionNetworkId extends Enum {
    readonly isAny: boolean;
    readonly isNamed: boolean;
    readonly asNamed: Bytes;
    readonly isPolkadot: boolean;
    readonly isKusama: boolean;
    readonly type: 'Any' | 'Named' | 'Polkadot' | 'Kusama';
  }

  /** @name XcmV0JunctionBodyId (93) */
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

  /** @name XcmV0JunctionBodyPart (94) */
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

  /** @name XcmV1MultiLocation (95) */
  export interface XcmV1MultiLocation extends Struct {
    readonly parents: u8;
    readonly interior: XcmV1MultilocationJunctions;
  }

  /** @name XcmV1MultilocationJunctions (96) */
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

  /** @name XcmV1Junction (97) */
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

  /** @name XcmVersionedXcm (98) */
  export interface XcmVersionedXcm extends Enum {
    readonly isV0: boolean;
    readonly asV0: XcmV0Xcm;
    readonly isV1: boolean;
    readonly asV1: XcmV1Xcm;
    readonly isV2: boolean;
    readonly asV2: XcmV2Xcm;
    readonly type: 'V0' | 'V1' | 'V2';
  }

  /** @name XcmV0Xcm (99) */
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

  /** @name XcmV0MultiAsset (101) */
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

  /** @name XcmV1MultiassetAssetInstance (102) */
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

  /** @name XcmV0Order (106) */
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

  /** @name XcmV0Response (108) */
  export interface XcmV0Response extends Enum {
    readonly isAssets: boolean;
    readonly asAssets: Vec<XcmV0MultiAsset>;
    readonly type: 'Assets';
  }

  /** @name XcmV0OriginKind (109) */
  export interface XcmV0OriginKind extends Enum {
    readonly isNative: boolean;
    readonly isSovereignAccount: boolean;
    readonly isSuperuser: boolean;
    readonly isXcm: boolean;
    readonly type: 'Native' | 'SovereignAccount' | 'Superuser' | 'Xcm';
  }

  /** @name XcmDoubleEncoded (110) */
  export interface XcmDoubleEncoded extends Struct {
    readonly encoded: Bytes;
  }

  /** @name XcmV1Xcm (111) */
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

  /** @name XcmV1MultiassetMultiAssets (112) */
  export interface XcmV1MultiassetMultiAssets extends Vec<XcmV1MultiAsset> {}

  /** @name XcmV1MultiAsset (114) */
  export interface XcmV1MultiAsset extends Struct {
    readonly id: XcmV1MultiassetAssetId;
    readonly fun: XcmV1MultiassetFungibility;
  }

  /** @name XcmV1MultiassetAssetId (115) */
  export interface XcmV1MultiassetAssetId extends Enum {
    readonly isConcrete: boolean;
    readonly asConcrete: XcmV1MultiLocation;
    readonly isAbstract: boolean;
    readonly asAbstract: Bytes;
    readonly type: 'Concrete' | 'Abstract';
  }

  /** @name XcmV1MultiassetFungibility (116) */
  export interface XcmV1MultiassetFungibility extends Enum {
    readonly isFungible: boolean;
    readonly asFungible: Compact<u128>;
    readonly isNonFungible: boolean;
    readonly asNonFungible: XcmV1MultiassetAssetInstance;
    readonly type: 'Fungible' | 'NonFungible';
  }

  /** @name XcmV1Order (118) */
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

  /** @name XcmV1MultiassetMultiAssetFilter (119) */
  export interface XcmV1MultiassetMultiAssetFilter extends Enum {
    readonly isDefinite: boolean;
    readonly asDefinite: XcmV1MultiassetMultiAssets;
    readonly isWild: boolean;
    readonly asWild: XcmV1MultiassetWildMultiAsset;
    readonly type: 'Definite' | 'Wild';
  }

  /** @name XcmV1MultiassetWildMultiAsset (120) */
  export interface XcmV1MultiassetWildMultiAsset extends Enum {
    readonly isAll: boolean;
    readonly isAllOf: boolean;
    readonly asAllOf: {
      readonly id: XcmV1MultiassetAssetId;
      readonly fun: XcmV1MultiassetWildFungibility;
    } & Struct;
    readonly type: 'All' | 'AllOf';
  }

  /** @name XcmV1MultiassetWildFungibility (121) */
  export interface XcmV1MultiassetWildFungibility extends Enum {
    readonly isFungible: boolean;
    readonly isNonFungible: boolean;
    readonly type: 'Fungible' | 'NonFungible';
  }

  /** @name XcmV1Response (123) */
  export interface XcmV1Response extends Enum {
    readonly isAssets: boolean;
    readonly asAssets: XcmV1MultiassetMultiAssets;
    readonly isVersion: boolean;
    readonly asVersion: u32;
    readonly type: 'Assets' | 'Version';
  }

  /** @name XcmV2Xcm (124) */
  export interface XcmV2Xcm extends Vec<XcmV2Instruction> {}

  /** @name XcmV2Instruction (126) */
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

  /** @name XcmV2Response (127) */
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

  /** @name XcmV2TraitsError (130) */
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

  /** @name XcmV2WeightLimit (131) */
  export interface XcmV2WeightLimit extends Enum {
    readonly isUnlimited: boolean;
    readonly isLimited: boolean;
    readonly asLimited: Compact<u64>;
    readonly type: 'Unlimited' | 'Limited';
  }

  /** @name XcmVersionedMultiAssets (132) */
  export interface XcmVersionedMultiAssets extends Enum {
    readonly isV0: boolean;
    readonly asV0: Vec<XcmV0MultiAsset>;
    readonly isV1: boolean;
    readonly asV1: XcmV1MultiassetMultiAssets;
    readonly type: 'V0' | 'V1';
  }

  /** @name CumulusPalletXcmCall (147) */
  export type CumulusPalletXcmCall = Null;

  /** @name CumulusPalletDmpQueueCall (148) */
  export interface CumulusPalletDmpQueueCall extends Enum {
    readonly isServiceOverweight: boolean;
    readonly asServiceOverweight: {
      readonly index: u64;
      readonly weightLimit: u64;
    } & Struct;
    readonly type: 'ServiceOverweight';
  }

  /** @name PalletInflationCall (149) */
  export interface PalletInflationCall extends Enum {
    readonly isStartInflation: boolean;
    readonly asStartInflation: {
      readonly inflationStartRelayBlock: u32;
    } & Struct;
    readonly type: 'StartInflation';
  }

  /** @name PalletUniqueCall (150) */
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
    readonly isSetPropertyPermissions: boolean;
    readonly asSetPropertyPermissions: {
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
      readonly newLimit: UpDataStructsCollectionPermissions;
    } & Struct;
    readonly type: 'CreateCollection' | 'CreateCollectionEx' | 'DestroyCollection' | 'AddToAllowList' | 'RemoveFromAllowList' | 'ChangeCollectionOwner' | 'AddCollectionAdmin' | 'RemoveCollectionAdmin' | 'SetCollectionSponsor' | 'ConfirmSponsorship' | 'RemoveCollectionSponsor' | 'CreateItem' | 'CreateMultipleItems' | 'SetCollectionProperties' | 'DeleteCollectionProperties' | 'SetTokenProperties' | 'DeleteTokenProperties' | 'SetPropertyPermissions' | 'CreateMultipleItemsEx' | 'SetTransfersEnabledFlag' | 'BurnItem' | 'BurnFrom' | 'Transfer' | 'Approve' | 'TransferFrom' | 'SetCollectionLimits' | 'SetCollectionPermissions';
  }

  /** @name UpDataStructsCollectionMode (156) */
  export interface UpDataStructsCollectionMode extends Enum {
    readonly isNft: boolean;
    readonly isFungible: boolean;
    readonly asFungible: u8;
    readonly isReFungible: boolean;
    readonly type: 'Nft' | 'Fungible' | 'ReFungible';
  }

  /** @name UpDataStructsCreateCollectionData (157) */
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

  /** @name UpDataStructsAccessMode (159) */
  export interface UpDataStructsAccessMode extends Enum {
    readonly isNormal: boolean;
    readonly isAllowList: boolean;
    readonly type: 'Normal' | 'AllowList';
  }

  /** @name UpDataStructsCollectionLimits (162) */
  export interface UpDataStructsCollectionLimits extends Struct {
    readonly accountTokenOwnershipLimit: Option<u32>;
    readonly sponsoredDataSize: Option<u32>;
    readonly sponsoredDataRateLimit: Option<UpDataStructsSponsoringRateLimit>;
    readonly tokenLimit: Option<u32>;
    readonly sponsorTransferTimeout: Option<u32>;
    readonly sponsorApproveTimeout: Option<u32>;
    readonly ownerCanTransfer: OptionBool;
    readonly ownerCanDestroy: OptionBool;
    readonly transfersEnabled: OptionBool;
  }

  /** @name UpDataStructsSponsoringRateLimit (164) */
  export interface UpDataStructsSponsoringRateLimit extends Enum {
    readonly isSponsoringDisabled: boolean;
    readonly isBlocks: boolean;
    readonly asBlocks: u32;
    readonly type: 'SponsoringDisabled' | 'Blocks';
  }

  /** @name UpDataStructsCollectionPermissions (167) */
  export interface UpDataStructsCollectionPermissions extends Struct {
    readonly access: Option<UpDataStructsAccessMode>;
    readonly mintMode: OptionBool;
    readonly nesting: Option<UpDataStructsNestingRule>;
  }

  /** @name UpDataStructsNestingRule (169) */
  export interface UpDataStructsNestingRule extends Enum {
    readonly isDisabled: boolean;
    readonly isOwner: boolean;
    readonly isOwnerRestricted: boolean;
    readonly asOwnerRestricted: BTreeSet<u32>;
    readonly type: 'Disabled' | 'Owner' | 'OwnerRestricted';
  }

  /** @name UpDataStructsPropertyKeyPermission (175) */
  export interface UpDataStructsPropertyKeyPermission extends Struct {
    readonly key: Bytes;
    readonly permission: UpDataStructsPropertyPermission;
  }

  /** @name UpDataStructsPropertyPermission (177) */
  export interface UpDataStructsPropertyPermission extends Struct {
    readonly mutable: bool;
    readonly collectionAdmin: bool;
    readonly tokenOwner: bool;
  }

  /** @name UpDataStructsProperty (180) */
  export interface UpDataStructsProperty extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

  /** @name PalletEvmAccountBasicCrossAccountIdRepr (183) */
  export interface PalletEvmAccountBasicCrossAccountIdRepr extends Enum {
    readonly isSubstrate: boolean;
    readonly asSubstrate: AccountId32;
    readonly isEthereum: boolean;
    readonly asEthereum: H160;
    readonly type: 'Substrate' | 'Ethereum';
  }

  /** @name UpDataStructsCreateItemData (185) */
  export interface UpDataStructsCreateItemData extends Enum {
    readonly isNft: boolean;
    readonly asNft: UpDataStructsCreateNftData;
    readonly isFungible: boolean;
    readonly asFungible: UpDataStructsCreateFungibleData;
    readonly isReFungible: boolean;
    readonly asReFungible: UpDataStructsCreateReFungibleData;
    readonly type: 'Nft' | 'Fungible' | 'ReFungible';
  }

  /** @name UpDataStructsCreateNftData (186) */
  export interface UpDataStructsCreateNftData extends Struct {
    readonly constData: Bytes;
    readonly properties: Vec<UpDataStructsProperty>;
  }

  /** @name UpDataStructsCreateFungibleData (188) */
  export interface UpDataStructsCreateFungibleData extends Struct {
    readonly value: u128;
  }

  /** @name UpDataStructsCreateReFungibleData (189) */
  export interface UpDataStructsCreateReFungibleData extends Struct {
    readonly constData: Bytes;
    readonly pieces: u128;
  }

  /** @name UpDataStructsCreateItemExData (193) */
  export interface UpDataStructsCreateItemExData extends Enum {
    readonly isNft: boolean;
    readonly asNft: Vec<UpDataStructsCreateNftExData>;
    readonly isFungible: boolean;
    readonly asFungible: BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>;
    readonly isRefungibleMultipleItems: boolean;
    readonly asRefungibleMultipleItems: Vec<UpDataStructsCreateRefungibleExData>;
    readonly isRefungibleMultipleOwners: boolean;
    readonly asRefungibleMultipleOwners: UpDataStructsCreateRefungibleExData;
    readonly type: 'Nft' | 'Fungible' | 'RefungibleMultipleItems' | 'RefungibleMultipleOwners';
  }

  /** @name UpDataStructsCreateNftExData (195) */
  export interface UpDataStructsCreateNftExData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
    readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
  }

  /** @name UpDataStructsCreateRefungibleExData (202) */
  export interface UpDataStructsCreateRefungibleExData extends Struct {
    readonly constData: Bytes;
    readonly users: BTreeMap<PalletEvmAccountBasicCrossAccountIdRepr, u128>;
  }

  /** @name PalletTemplateTransactionPaymentCall (204) */
  export type PalletTemplateTransactionPaymentCall = Null;

  /** @name PalletStructureCall (205) */
  export type PalletStructureCall = Null;

  /** @name PalletEvmCall (206) */
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

  /** @name PalletEthereumCall (212) */
  export interface PalletEthereumCall extends Enum {
    readonly isTransact: boolean;
    readonly asTransact: {
      readonly transaction: EthereumTransactionTransactionV2;
    } & Struct;
    readonly type: 'Transact';
  }

  /** @name EthereumTransactionTransactionV2 (213) */
  export interface EthereumTransactionTransactionV2 extends Enum {
    readonly isLegacy: boolean;
    readonly asLegacy: EthereumTransactionLegacyTransaction;
    readonly isEip2930: boolean;
    readonly asEip2930: EthereumTransactionEip2930Transaction;
    readonly isEip1559: boolean;
    readonly asEip1559: EthereumTransactionEip1559Transaction;
    readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
  }

  /** @name EthereumTransactionLegacyTransaction (214) */
  export interface EthereumTransactionLegacyTransaction extends Struct {
    readonly nonce: U256;
    readonly gasPrice: U256;
    readonly gasLimit: U256;
    readonly action: EthereumTransactionTransactionAction;
    readonly value: U256;
    readonly input: Bytes;
    readonly signature: EthereumTransactionTransactionSignature;
  }

  /** @name EthereumTransactionTransactionAction (215) */
  export interface EthereumTransactionTransactionAction extends Enum {
    readonly isCall: boolean;
    readonly asCall: H160;
    readonly isCreate: boolean;
    readonly type: 'Call' | 'Create';
  }

  /** @name EthereumTransactionTransactionSignature (216) */
  export interface EthereumTransactionTransactionSignature extends Struct {
    readonly v: u64;
    readonly r: H256;
    readonly s: H256;
  }

  /** @name EthereumTransactionEip2930Transaction (218) */
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

  /** @name EthereumTransactionAccessListItem (220) */
  export interface EthereumTransactionAccessListItem extends Struct {
    readonly address: H160;
    readonly storageKeys: Vec<H256>;
  }

  /** @name EthereumTransactionEip1559Transaction (221) */
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

  /** @name PalletEvmMigrationCall (222) */
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

  /** @name PalletSudoEvent (225) */
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

  /** @name SpRuntimeDispatchError (227) */
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

  /** @name SpRuntimeModuleError (228) */
  export interface SpRuntimeModuleError extends Struct {
    readonly index: u8;
    readonly error: U8aFixed;
  }

  /** @name SpRuntimeTokenError (229) */
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

  /** @name SpRuntimeArithmeticError (230) */
  export interface SpRuntimeArithmeticError extends Enum {
    readonly isUnderflow: boolean;
    readonly isOverflow: boolean;
    readonly isDivisionByZero: boolean;
    readonly type: 'Underflow' | 'Overflow' | 'DivisionByZero';
  }

  /** @name SpRuntimeTransactionalError (231) */
  export interface SpRuntimeTransactionalError extends Enum {
    readonly isLimitReached: boolean;
    readonly isNoLayer: boolean;
    readonly type: 'LimitReached' | 'NoLayer';
  }

  /** @name PalletSudoError (232) */
  export interface PalletSudoError extends Enum {
    readonly isRequireSudo: boolean;
    readonly type: 'RequireSudo';
  }

  /** @name FrameSystemAccountInfo (233) */
  export interface FrameSystemAccountInfo extends Struct {
    readonly nonce: u32;
    readonly consumers: u32;
    readonly providers: u32;
    readonly sufficients: u32;
    readonly data: PalletBalancesAccountData;
  }

  /** @name FrameSupportWeightsPerDispatchClassU64 (234) */
  export interface FrameSupportWeightsPerDispatchClassU64 extends Struct {
    readonly normal: u64;
    readonly operational: u64;
    readonly mandatory: u64;
  }

  /** @name SpRuntimeDigest (235) */
  export interface SpRuntimeDigest extends Struct {
    readonly logs: Vec<SpRuntimeDigestDigestItem>;
  }

  /** @name SpRuntimeDigestDigestItem (237) */
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

  /** @name FrameSystemEventRecord (239) */
  export interface FrameSystemEventRecord extends Struct {
    readonly phase: FrameSystemPhase;
    readonly event: Event;
    readonly topics: Vec<H256>;
  }

  /** @name FrameSystemEvent (241) */
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

  /** @name FrameSupportWeightsDispatchInfo (242) */
  export interface FrameSupportWeightsDispatchInfo extends Struct {
    readonly weight: u64;
    readonly class: FrameSupportWeightsDispatchClass;
    readonly paysFee: FrameSupportWeightsPays;
  }

  /** @name FrameSupportWeightsDispatchClass (243) */
  export interface FrameSupportWeightsDispatchClass extends Enum {
    readonly isNormal: boolean;
    readonly isOperational: boolean;
    readonly isMandatory: boolean;
    readonly type: 'Normal' | 'Operational' | 'Mandatory';
  }

  /** @name FrameSupportWeightsPays (244) */
  export interface FrameSupportWeightsPays extends Enum {
    readonly isYes: boolean;
    readonly isNo: boolean;
    readonly type: 'Yes' | 'No';
  }

  /** @name OrmlVestingModuleEvent (245) */
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

  /** @name CumulusPalletXcmpQueueEvent (246) */
  export interface CumulusPalletXcmpQueueEvent extends Enum {
    readonly isSuccess: boolean;
    readonly asSuccess: Option<H256>;
    readonly isFail: boolean;
    readonly asFail: ITuple<[Option<H256>, XcmV2TraitsError]>;
    readonly isBadVersion: boolean;
    readonly asBadVersion: Option<H256>;
    readonly isBadFormat: boolean;
    readonly asBadFormat: Option<H256>;
    readonly isUpwardMessageSent: boolean;
    readonly asUpwardMessageSent: Option<H256>;
    readonly isXcmpMessageSent: boolean;
    readonly asXcmpMessageSent: Option<H256>;
    readonly isOverweightEnqueued: boolean;
    readonly asOverweightEnqueued: ITuple<[u32, u32, u64, u64]>;
    readonly isOverweightServiced: boolean;
    readonly asOverweightServiced: ITuple<[u64, u64]>;
    readonly type: 'Success' | 'Fail' | 'BadVersion' | 'BadFormat' | 'UpwardMessageSent' | 'XcmpMessageSent' | 'OverweightEnqueued' | 'OverweightServiced';
  }

  /** @name PalletXcmEvent (247) */
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

  /** @name XcmV2TraitsOutcome (248) */
  export interface XcmV2TraitsOutcome extends Enum {
    readonly isComplete: boolean;
    readonly asComplete: u64;
    readonly isIncomplete: boolean;
    readonly asIncomplete: ITuple<[u64, XcmV2TraitsError]>;
    readonly isError: boolean;
    readonly asError: XcmV2TraitsError;
    readonly type: 'Complete' | 'Incomplete' | 'Error';
  }

  /** @name CumulusPalletXcmEvent (250) */
  export interface CumulusPalletXcmEvent extends Enum {
    readonly isInvalidFormat: boolean;
    readonly asInvalidFormat: U8aFixed;
    readonly isUnsupportedVersion: boolean;
    readonly asUnsupportedVersion: U8aFixed;
    readonly isExecutedDownward: boolean;
    readonly asExecutedDownward: ITuple<[U8aFixed, XcmV2TraitsOutcome]>;
    readonly type: 'InvalidFormat' | 'UnsupportedVersion' | 'ExecutedDownward';
  }

  /** @name CumulusPalletDmpQueueEvent (251) */
  export interface CumulusPalletDmpQueueEvent extends Enum {
    readonly isInvalidFormat: boolean;
    readonly asInvalidFormat: U8aFixed;
    readonly isUnsupportedVersion: boolean;
    readonly asUnsupportedVersion: U8aFixed;
    readonly isExecutedDownward: boolean;
    readonly asExecutedDownward: ITuple<[U8aFixed, XcmV2TraitsOutcome]>;
    readonly isWeightExhausted: boolean;
    readonly asWeightExhausted: ITuple<[U8aFixed, u64, u64]>;
    readonly isOverweightEnqueued: boolean;
    readonly asOverweightEnqueued: ITuple<[U8aFixed, u64, u64]>;
    readonly isOverweightServiced: boolean;
    readonly asOverweightServiced: ITuple<[u64, u64]>;
    readonly type: 'InvalidFormat' | 'UnsupportedVersion' | 'ExecutedDownward' | 'WeightExhausted' | 'OverweightEnqueued' | 'OverweightServiced';
  }

  /** @name PalletUniqueRawEvent (252) */
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

  /** @name PalletCommonEvent (253) */
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

  /** @name PalletStructureEvent (254) */
  export interface PalletStructureEvent extends Enum {
    readonly isExecuted: boolean;
    readonly asExecuted: Result<Null, SpRuntimeDispatchError>;
    readonly type: 'Executed';
  }

  /** @name PalletEvmEvent (255) */
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

  /** @name EthereumLog (256) */
  export interface EthereumLog extends Struct {
    readonly address: H160;
    readonly topics: Vec<H256>;
    readonly data: Bytes;
  }

  /** @name PalletEthereumEvent (257) */
  export interface PalletEthereumEvent extends Enum {
    readonly isExecuted: boolean;
    readonly asExecuted: ITuple<[H160, H160, H256, EvmCoreErrorExitReason]>;
    readonly type: 'Executed';
  }

  /** @name EvmCoreErrorExitReason (258) */
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

  /** @name EvmCoreErrorExitSucceed (259) */
  export interface EvmCoreErrorExitSucceed extends Enum {
    readonly isStopped: boolean;
    readonly isReturned: boolean;
    readonly isSuicided: boolean;
    readonly type: 'Stopped' | 'Returned' | 'Suicided';
  }

  /** @name EvmCoreErrorExitError (260) */
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

  /** @name EvmCoreErrorExitRevert (263) */
  export interface EvmCoreErrorExitRevert extends Enum {
    readonly isReverted: boolean;
    readonly type: 'Reverted';
  }

  /** @name EvmCoreErrorExitFatal (264) */
  export interface EvmCoreErrorExitFatal extends Enum {
    readonly isNotSupported: boolean;
    readonly isUnhandledInterrupt: boolean;
    readonly isCallErrorAsFatal: boolean;
    readonly asCallErrorAsFatal: EvmCoreErrorExitError;
    readonly isOther: boolean;
    readonly asOther: Text;
    readonly type: 'NotSupported' | 'UnhandledInterrupt' | 'CallErrorAsFatal' | 'Other';
  }

  /** @name FrameSystemPhase (265) */
  export interface FrameSystemPhase extends Enum {
    readonly isApplyExtrinsic: boolean;
    readonly asApplyExtrinsic: u32;
    readonly isFinalization: boolean;
    readonly isInitialization: boolean;
    readonly type: 'ApplyExtrinsic' | 'Finalization' | 'Initialization';
  }

  /** @name FrameSystemLastRuntimeUpgradeInfo (267) */
  export interface FrameSystemLastRuntimeUpgradeInfo extends Struct {
    readonly specVersion: Compact<u32>;
    readonly specName: Text;
  }

  /** @name FrameSystemLimitsBlockWeights (268) */
  export interface FrameSystemLimitsBlockWeights extends Struct {
    readonly baseBlock: u64;
    readonly maxBlock: u64;
    readonly perClass: FrameSupportWeightsPerDispatchClassWeightsPerClass;
  }

  /** @name FrameSupportWeightsPerDispatchClassWeightsPerClass (269) */
  export interface FrameSupportWeightsPerDispatchClassWeightsPerClass extends Struct {
    readonly normal: FrameSystemLimitsWeightsPerClass;
    readonly operational: FrameSystemLimitsWeightsPerClass;
    readonly mandatory: FrameSystemLimitsWeightsPerClass;
  }

  /** @name FrameSystemLimitsWeightsPerClass (270) */
  export interface FrameSystemLimitsWeightsPerClass extends Struct {
    readonly baseExtrinsic: u64;
    readonly maxExtrinsic: Option<u64>;
    readonly maxTotal: Option<u64>;
    readonly reserved: Option<u64>;
  }

  /** @name FrameSystemLimitsBlockLength (272) */
  export interface FrameSystemLimitsBlockLength extends Struct {
    readonly max: FrameSupportWeightsPerDispatchClassU32;
  }

  /** @name FrameSupportWeightsPerDispatchClassU32 (273) */
  export interface FrameSupportWeightsPerDispatchClassU32 extends Struct {
    readonly normal: u32;
    readonly operational: u32;
    readonly mandatory: u32;
  }

  /** @name FrameSupportWeightsRuntimeDbWeight (274) */
  export interface FrameSupportWeightsRuntimeDbWeight extends Struct {
    readonly read: u64;
    readonly write: u64;
  }

  /** @name SpVersionRuntimeVersion (275) */
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

  /** @name FrameSystemError (279) */
  export interface FrameSystemError extends Enum {
    readonly isInvalidSpecName: boolean;
    readonly isSpecVersionNeedsToIncrease: boolean;
    readonly isFailedToExtractRuntimeVersion: boolean;
    readonly isNonDefaultComposite: boolean;
    readonly isNonZeroRefCount: boolean;
    readonly isCallFiltered: boolean;
    readonly type: 'InvalidSpecName' | 'SpecVersionNeedsToIncrease' | 'FailedToExtractRuntimeVersion' | 'NonDefaultComposite' | 'NonZeroRefCount' | 'CallFiltered';
  }

  /** @name OrmlVestingModuleError (281) */
  export interface OrmlVestingModuleError extends Enum {
    readonly isZeroVestingPeriod: boolean;
    readonly isZeroVestingPeriodCount: boolean;
    readonly isInsufficientBalanceToLock: boolean;
    readonly isTooManyVestingSchedules: boolean;
    readonly isAmountLow: boolean;
    readonly isMaxVestingSchedulesExceeded: boolean;
    readonly type: 'ZeroVestingPeriod' | 'ZeroVestingPeriodCount' | 'InsufficientBalanceToLock' | 'TooManyVestingSchedules' | 'AmountLow' | 'MaxVestingSchedulesExceeded';
  }

  /** @name CumulusPalletXcmpQueueInboundChannelDetails (283) */
  export interface CumulusPalletXcmpQueueInboundChannelDetails extends Struct {
    readonly sender: u32;
    readonly state: CumulusPalletXcmpQueueInboundState;
    readonly messageMetadata: Vec<ITuple<[u32, PolkadotParachainPrimitivesXcmpMessageFormat]>>;
  }

  /** @name CumulusPalletXcmpQueueInboundState (284) */
  export interface CumulusPalletXcmpQueueInboundState extends Enum {
    readonly isOk: boolean;
    readonly isSuspended: boolean;
    readonly type: 'Ok' | 'Suspended';
  }

  /** @name PolkadotParachainPrimitivesXcmpMessageFormat (287) */
  export interface PolkadotParachainPrimitivesXcmpMessageFormat extends Enum {
    readonly isConcatenatedVersionedXcm: boolean;
    readonly isConcatenatedEncodedBlob: boolean;
    readonly isSignals: boolean;
    readonly type: 'ConcatenatedVersionedXcm' | 'ConcatenatedEncodedBlob' | 'Signals';
  }

  /** @name CumulusPalletXcmpQueueOutboundChannelDetails (290) */
  export interface CumulusPalletXcmpQueueOutboundChannelDetails extends Struct {
    readonly recipient: u32;
    readonly state: CumulusPalletXcmpQueueOutboundState;
    readonly signalsExist: bool;
    readonly firstIndex: u16;
    readonly lastIndex: u16;
  }

  /** @name CumulusPalletXcmpQueueOutboundState (291) */
  export interface CumulusPalletXcmpQueueOutboundState extends Enum {
    readonly isOk: boolean;
    readonly isSuspended: boolean;
    readonly type: 'Ok' | 'Suspended';
  }

  /** @name CumulusPalletXcmpQueueQueueConfigData (293) */
  export interface CumulusPalletXcmpQueueQueueConfigData extends Struct {
    readonly suspendThreshold: u32;
    readonly dropThreshold: u32;
    readonly resumeThreshold: u32;
    readonly thresholdWeight: u64;
    readonly weightRestrictDecay: u64;
    readonly xcmpMaxIndividualWeight: u64;
  }

  /** @name CumulusPalletXcmpQueueError (295) */
  export interface CumulusPalletXcmpQueueError extends Enum {
    readonly isFailedToSend: boolean;
    readonly isBadXcmOrigin: boolean;
    readonly isBadXcm: boolean;
    readonly isBadOverweightIndex: boolean;
    readonly isWeightOverLimit: boolean;
    readonly type: 'FailedToSend' | 'BadXcmOrigin' | 'BadXcm' | 'BadOverweightIndex' | 'WeightOverLimit';
  }

  /** @name PalletXcmError (296) */
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

  /** @name CumulusPalletXcmError (297) */
  export type CumulusPalletXcmError = Null;

  /** @name CumulusPalletDmpQueueConfigData (298) */
  export interface CumulusPalletDmpQueueConfigData extends Struct {
    readonly maxIndividual: u64;
  }

  /** @name CumulusPalletDmpQueuePageIndexData (299) */
  export interface CumulusPalletDmpQueuePageIndexData extends Struct {
    readonly beginUsed: u32;
    readonly endUsed: u32;
    readonly overweightCount: u64;
  }

  /** @name CumulusPalletDmpQueueError (302) */
  export interface CumulusPalletDmpQueueError extends Enum {
    readonly isUnknown: boolean;
    readonly isOverLimit: boolean;
    readonly type: 'Unknown' | 'OverLimit';
  }

  /** @name PalletUniqueError (306) */
  export interface PalletUniqueError extends Enum {
    readonly isCollectionDecimalPointLimitExceeded: boolean;
    readonly isConfirmUnsetSponsorFail: boolean;
    readonly isEmptyArgument: boolean;
    readonly type: 'CollectionDecimalPointLimitExceeded' | 'ConfirmUnsetSponsorFail' | 'EmptyArgument';
  }

  /** @name UpDataStructsCollection (307) */
  export interface UpDataStructsCollection extends Struct {
    readonly owner: AccountId32;
    readonly mode: UpDataStructsCollectionMode;
    readonly name: Vec<u16>;
    readonly description: Vec<u16>;
    readonly tokenPrefix: Bytes;
    readonly sponsorship: UpDataStructsSponsorshipState;
    readonly limits: UpDataStructsCollectionLimits;
    readonly permissions: UpDataStructsCollectionPermissions;
  }

  /** @name UpDataStructsSponsorshipState (308) */
  export interface UpDataStructsSponsorshipState extends Enum {
    readonly isDisabled: boolean;
    readonly isUnconfirmed: boolean;
    readonly asUnconfirmed: AccountId32;
    readonly isConfirmed: boolean;
    readonly asConfirmed: AccountId32;
    readonly type: 'Disabled' | 'Unconfirmed' | 'Confirmed';
  }

  /** @name UpDataStructsProperties (309) */
  export interface UpDataStructsProperties extends Struct {
    readonly map: UpDataStructsPropertiesMapBoundedVec;
    readonly consumedSpace: u32;
    readonly spaceLimit: u32;
  }

  /** @name UpDataStructsPropertiesMapBoundedVec (310) */
  export interface UpDataStructsPropertiesMapBoundedVec extends BTreeMap<Bytes, Bytes> {}

  /** @name UpDataStructsPropertiesMapPropertyPermission (315) */
  export interface UpDataStructsPropertiesMapPropertyPermission extends BTreeMap<Bytes, UpDataStructsPropertyPermission> {}

  /** @name UpDataStructsCollectionStats (322) */
  export interface UpDataStructsCollectionStats extends Struct {
    readonly created: u32;
    readonly destroyed: u32;
    readonly alive: u32;
  }

  /** @name PhantomTypeUpDataStructs (323) */
  export interface PhantomTypeUpDataStructs extends Vec<ITuple<[UpDataStructsTokenData, UpDataStructsRpcCollection, UpDataStructsRmrkCollectionInfo, UpDataStructsRmrkNftInfo, UpDataStructsRmrkResourceInfo, UpDataStructsRmrkPropertyInfo, UpDataStructsRmrkBaseInfo, UpDataStructsRmrkPartType, UpDataStructsRmrkTheme, UpDataStructsRmrkNftChild]>> {}

  /** @name UpDataStructsTokenData (325) */
  export interface UpDataStructsTokenData extends Struct {
    readonly properties: Vec<UpDataStructsProperty>;
    readonly owner: Option<PalletEvmAccountBasicCrossAccountIdRepr>;
  }

  /** @name UpDataStructsRpcCollection (327) */
  export interface UpDataStructsRpcCollection extends Struct {
    readonly owner: AccountId32;
    readonly mode: UpDataStructsCollectionMode;
    readonly name: Vec<u16>;
    readonly description: Vec<u16>;
    readonly tokenPrefix: Bytes;
    readonly sponsorship: UpDataStructsSponsorshipState;
    readonly limits: UpDataStructsCollectionLimits;
    readonly permissions: UpDataStructsCollectionPermissions;
    readonly tokenPropertyPermissions: Vec<UpDataStructsPropertyKeyPermission>;
    readonly properties: Vec<UpDataStructsProperty>;
  }

  /** @name UpDataStructsRmrkCollectionInfo (328) */
  export interface UpDataStructsRmrkCollectionInfo extends Struct {
    readonly issuer: AccountId32;
    readonly metadata: Bytes;
    readonly max: Option<u32>;
    readonly symbol: Bytes;
    readonly nftsCount: u32;
  }

  /** @name UpDataStructsRmrkNftInfo (331) */
  export interface UpDataStructsRmrkNftInfo extends Struct {
    readonly owner: UpDataStructsRmrkAccountIdOrCollectionNftTuple;
    readonly royalty: Option<UpDataStructsRmrkRoyaltyInfo>;
    readonly metadata: Bytes;
    readonly equipped: bool;
    readonly pending: bool;
  }

  /** @name UpDataStructsRmrkAccountIdOrCollectionNftTuple (332) */
  export interface UpDataStructsRmrkAccountIdOrCollectionNftTuple extends Enum {
    readonly isAccountId: boolean;
    readonly asAccountId: AccountId32;
    readonly isCollectionAndNftTuple: boolean;
    readonly asCollectionAndNftTuple: ITuple<[u32, u32]>;
    readonly type: 'AccountId' | 'CollectionAndNftTuple';
  }

  /** @name UpDataStructsRmrkRoyaltyInfo (334) */
  export interface UpDataStructsRmrkRoyaltyInfo extends Struct {
    readonly recipient: AccountId32;
    readonly amount: Permill;
  }

  /** @name UpDataStructsRmrkResourceInfo (335) */
  export interface UpDataStructsRmrkResourceInfo extends Struct {
    readonly id: Bytes;
    readonly resource: UpDataStructsRmrkResourceTypes;
    readonly pending: bool;
    readonly pendingRemoval: bool;
  }

  /** @name UpDataStructsRmrkResourceTypes (338) */
  export interface UpDataStructsRmrkResourceTypes extends Enum {
    readonly isBasic: boolean;
    readonly asBasic: UpDataStructsRmrkBasicResource;
    readonly isComposable: boolean;
    readonly asComposable: UpDataStructsRmrkComposableResource;
    readonly isSlot: boolean;
    readonly asSlot: UpDataStructsRmrkSlotResource;
    readonly type: 'Basic' | 'Composable' | 'Slot';
  }

  /** @name UpDataStructsRmrkBasicResource (339) */
  export interface UpDataStructsRmrkBasicResource extends Struct {
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

  /** @name UpDataStructsRmrkComposableResource (341) */
  export interface UpDataStructsRmrkComposableResource extends Struct {
    readonly parts: Vec<u32>;
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

  /** @name UpDataStructsRmrkSlotResource (342) */
  export interface UpDataStructsRmrkSlotResource extends Struct {
    readonly base: u32;
    readonly src: Option<Bytes>;
    readonly metadata: Option<Bytes>;
    readonly slot: u32;
    readonly license: Option<Bytes>;
    readonly thumb: Option<Bytes>;
  }

  /** @name UpDataStructsRmrkPropertyInfo (343) */
  export interface UpDataStructsRmrkPropertyInfo extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

  /** @name UpDataStructsRmrkBaseInfo (346) */
  export interface UpDataStructsRmrkBaseInfo extends Struct {
    readonly issuer: AccountId32;
    readonly baseType: Bytes;
    readonly symbol: Bytes;
  }

  /** @name UpDataStructsRmrkPartType (347) */
  export interface UpDataStructsRmrkPartType extends Enum {
    readonly isFixedPart: boolean;
    readonly asFixedPart: UpDataStructsRmrkFixedPart;
    readonly isSlotPart: boolean;
    readonly asSlotPart: UpDataStructsRmrkSlotPart;
    readonly type: 'FixedPart' | 'SlotPart';
  }

  /** @name UpDataStructsRmrkFixedPart (349) */
  export interface UpDataStructsRmrkFixedPart extends Struct {
    readonly id: u32;
    readonly z: u32;
    readonly src: Bytes;
  }

  /** @name UpDataStructsRmrkSlotPart (350) */
  export interface UpDataStructsRmrkSlotPart extends Struct {
    readonly id: u32;
    readonly equippable: UpDataStructsRmrkEquippableList;
    readonly src: Bytes;
    readonly z: u32;
  }

  /** @name UpDataStructsRmrkEquippableList (351) */
  export interface UpDataStructsRmrkEquippableList extends Enum {
    readonly isAll: boolean;
    readonly isEmpty: boolean;
    readonly isCustom: boolean;
    readonly asCustom: Vec<u32>;
    readonly type: 'All' | 'Empty' | 'Custom';
  }

  /** @name UpDataStructsRmrkTheme (352) */
  export interface UpDataStructsRmrkTheme extends Struct {
    readonly name: Bytes;
    readonly properties: Vec<UpDataStructsRmrkThemeProperty>;
    readonly inherit: bool;
  }

  /** @name UpDataStructsRmrkThemeProperty (354) */
  export interface UpDataStructsRmrkThemeProperty extends Struct {
    readonly key: Bytes;
    readonly value: Bytes;
  }

  /** @name UpDataStructsRmrkNftChild (355) */
  export interface UpDataStructsRmrkNftChild extends Struct {
    readonly collectionId: u32;
    readonly nftId: u32;
  }

  /** @name PalletCommonError (357) */
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
    readonly isNestingIsDisabled: boolean;
    readonly isOnlyOwnerAllowedToNest: boolean;
    readonly isSourceCollectionIsNotAllowedToNest: boolean;
    readonly isCollectionFieldSizeExceeded: boolean;
    readonly isNoSpaceForProperty: boolean;
    readonly isPropertyLimitReached: boolean;
    readonly isPropertyKeyIsTooLong: boolean;
    readonly isInvalidCharacterInPropertyKey: boolean;
    readonly isEmptyPropertyKey: boolean;
    readonly type: 'CollectionNotFound' | 'MustBeTokenOwner' | 'NoPermission' | 'CantDestroyNotEmptyCollection' | 'PublicMintingNotAllowed' | 'AddressNotInAllowlist' | 'CollectionNameLimitExceeded' | 'CollectionDescriptionLimitExceeded' | 'CollectionTokenPrefixLimitExceeded' | 'TotalCollectionsLimitExceeded' | 'CollectionAdminCountExceeded' | 'CollectionLimitBoundsExceeded' | 'OwnerPermissionsCantBeReverted' | 'TransferNotAllowed' | 'AccountTokenLimitExceeded' | 'CollectionTokenLimitExceeded' | 'MetadataFlagFrozen' | 'TokenNotFound' | 'TokenValueTooLow' | 'ApprovedValueTooLow' | 'CantApproveMoreThanOwned' | 'AddressIsZero' | 'UnsupportedOperation' | 'NotSufficientFounds' | 'NestingIsDisabled' | 'OnlyOwnerAllowedToNest' | 'SourceCollectionIsNotAllowedToNest' | 'CollectionFieldSizeExceeded' | 'NoSpaceForProperty' | 'PropertyLimitReached' | 'PropertyKeyIsTooLong' | 'InvalidCharacterInPropertyKey' | 'EmptyPropertyKey';
  }

  /** @name PalletFungibleError (359) */
  export interface PalletFungibleError extends Enum {
    readonly isNotFungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isFungibleItemsHaveNoId: boolean;
    readonly isFungibleItemsDontHaveData: boolean;
    readonly isFungibleDisallowsNesting: boolean;
    readonly isSettingPropertiesNotAllowed: boolean;
    readonly type: 'NotFungibleDataUsedToMintFungibleCollectionToken' | 'FungibleItemsHaveNoId' | 'FungibleItemsDontHaveData' | 'FungibleDisallowsNesting' | 'SettingPropertiesNotAllowed';
  }

  /** @name PalletRefungibleItemData (360) */
  export interface PalletRefungibleItemData extends Struct {
    readonly constData: Bytes;
  }

  /** @name PalletRefungibleError (364) */
  export interface PalletRefungibleError extends Enum {
    readonly isNotRefungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isWrongRefungiblePieces: boolean;
    readonly isRefungibleDisallowsNesting: boolean;
    readonly isSettingPropertiesNotAllowed: boolean;
    readonly type: 'NotRefungibleDataUsedToMintFungibleCollectionToken' | 'WrongRefungiblePieces' | 'RefungibleDisallowsNesting' | 'SettingPropertiesNotAllowed';
  }

  /** @name PalletNonfungibleItemData (365) */
  export interface PalletNonfungibleItemData extends Struct {
    readonly owner: PalletEvmAccountBasicCrossAccountIdRepr;
  }

  /** @name PalletNonfungibleError (367) */
  export interface PalletNonfungibleError extends Enum {
    readonly isNotNonfungibleDataUsedToMintFungibleCollectionToken: boolean;
    readonly isNonfungibleItemsHaveNoAmount: boolean;
    readonly isCantBurnNftWithChildren: boolean;
    readonly type: 'NotNonfungibleDataUsedToMintFungibleCollectionToken' | 'NonfungibleItemsHaveNoAmount' | 'CantBurnNftWithChildren';
  }

  /** @name PalletStructureError (368) */
  export interface PalletStructureError extends Enum {
    readonly isOuroborosDetected: boolean;
    readonly isDepthLimit: boolean;
    readonly isTokenNotFound: boolean;
    readonly type: 'OuroborosDetected' | 'DepthLimit' | 'TokenNotFound';
  }

  /** @name PalletEvmError (371) */
  export interface PalletEvmError extends Enum {
    readonly isBalanceLow: boolean;
    readonly isFeeOverflow: boolean;
    readonly isPaymentOverflow: boolean;
    readonly isWithdrawFailed: boolean;
    readonly isGasPriceTooLow: boolean;
    readonly isInvalidNonce: boolean;
    readonly type: 'BalanceLow' | 'FeeOverflow' | 'PaymentOverflow' | 'WithdrawFailed' | 'GasPriceTooLow' | 'InvalidNonce';
  }

  /** @name FpRpcTransactionStatus (374) */
  export interface FpRpcTransactionStatus extends Struct {
    readonly transactionHash: H256;
    readonly transactionIndex: u32;
    readonly from: H160;
    readonly to: Option<H160>;
    readonly contractAddress: Option<H160>;
    readonly logs: Vec<EthereumLog>;
    readonly logsBloom: EthbloomBloom;
  }

  /** @name EthbloomBloom (376) */
  export interface EthbloomBloom extends U8aFixed {}

  /** @name EthereumReceiptReceiptV3 (378) */
  export interface EthereumReceiptReceiptV3 extends Enum {
    readonly isLegacy: boolean;
    readonly asLegacy: EthereumReceiptEip658ReceiptData;
    readonly isEip2930: boolean;
    readonly asEip2930: EthereumReceiptEip658ReceiptData;
    readonly isEip1559: boolean;
    readonly asEip1559: EthereumReceiptEip658ReceiptData;
    readonly type: 'Legacy' | 'Eip2930' | 'Eip1559';
  }

  /** @name EthereumReceiptEip658ReceiptData (379) */
  export interface EthereumReceiptEip658ReceiptData extends Struct {
    readonly statusCode: u8;
    readonly usedGas: U256;
    readonly logsBloom: EthbloomBloom;
    readonly logs: Vec<EthereumLog>;
  }

  /** @name EthereumBlock (380) */
  export interface EthereumBlock extends Struct {
    readonly header: EthereumHeader;
    readonly transactions: Vec<EthereumTransactionTransactionV2>;
    readonly ommers: Vec<EthereumHeader>;
  }

  /** @name EthereumHeader (381) */
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

  /** @name EthereumTypesHashH64 (382) */
  export interface EthereumTypesHashH64 extends U8aFixed {}

  /** @name PalletEthereumError (387) */
  export interface PalletEthereumError extends Enum {
    readonly isInvalidSignature: boolean;
    readonly isPreLogExists: boolean;
    readonly type: 'InvalidSignature' | 'PreLogExists';
  }

  /** @name PalletEvmCoderSubstrateError (388) */
  export interface PalletEvmCoderSubstrateError extends Enum {
    readonly isOutOfGas: boolean;
    readonly isOutOfFund: boolean;
    readonly type: 'OutOfGas' | 'OutOfFund';
  }

  /** @name PalletEvmContractHelpersSponsoringModeT (389) */
  export interface PalletEvmContractHelpersSponsoringModeT extends Enum {
    readonly isDisabled: boolean;
    readonly isAllowlisted: boolean;
    readonly isGenerous: boolean;
    readonly type: 'Disabled' | 'Allowlisted' | 'Generous';
  }

  /** @name PalletEvmContractHelpersError (391) */
  export interface PalletEvmContractHelpersError extends Enum {
    readonly isNoPermission: boolean;
    readonly type: 'NoPermission';
  }

  /** @name PalletEvmMigrationError (392) */
  export interface PalletEvmMigrationError extends Enum {
    readonly isAccountNotEmpty: boolean;
    readonly isAccountIsNotMigrating: boolean;
    readonly type: 'AccountNotEmpty' | 'AccountIsNotMigrating';
  }

  /** @name SpRuntimeMultiSignature (394) */
  export interface SpRuntimeMultiSignature extends Enum {
    readonly isEd25519: boolean;
    readonly asEd25519: SpCoreEd25519Signature;
    readonly isSr25519: boolean;
    readonly asSr25519: SpCoreSr25519Signature;
    readonly isEcdsa: boolean;
    readonly asEcdsa: SpCoreEcdsaSignature;
    readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
  }

  /** @name SpCoreEd25519Signature (395) */
  export interface SpCoreEd25519Signature extends U8aFixed {}

  /** @name SpCoreSr25519Signature (397) */
  export interface SpCoreSr25519Signature extends U8aFixed {}

  /** @name SpCoreEcdsaSignature (398) */
  export interface SpCoreEcdsaSignature extends U8aFixed {}

  /** @name FrameSystemExtensionsCheckSpecVersion (401) */
  export type FrameSystemExtensionsCheckSpecVersion = Null;

  /** @name FrameSystemExtensionsCheckGenesis (402) */
  export type FrameSystemExtensionsCheckGenesis = Null;

  /** @name FrameSystemExtensionsCheckNonce (405) */
  export interface FrameSystemExtensionsCheckNonce extends Compact<u32> {}

  /** @name FrameSystemExtensionsCheckWeight (406) */
  export type FrameSystemExtensionsCheckWeight = Null;

  /** @name PalletTemplateTransactionPaymentChargeTransactionPayment (407) */
  export interface PalletTemplateTransactionPaymentChargeTransactionPayment extends Compact<u128> {}

  /** @name OpalRuntimeRuntime (408) */
  export type OpalRuntimeRuntime = Null;

  /** @name PalletEthereumFakeTransactionFinalizer (409) */
  export type PalletEthereumFakeTransactionFinalizer = Null;

} // declare module
