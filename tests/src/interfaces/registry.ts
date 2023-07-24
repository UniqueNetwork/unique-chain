// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/types/types/registry';

import type { CumulusPalletDmpQueueCall, CumulusPalletDmpQueueConfigData, CumulusPalletDmpQueueError, CumulusPalletDmpQueueEvent, CumulusPalletDmpQueuePageIndexData, CumulusPalletParachainSystemCall, CumulusPalletParachainSystemCodeUpgradeAuthorization, CumulusPalletParachainSystemError, CumulusPalletParachainSystemEvent, CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot, CumulusPalletXcmCall, CumulusPalletXcmError, CumulusPalletXcmEvent, CumulusPalletXcmOrigin, CumulusPalletXcmpQueueCall, CumulusPalletXcmpQueueError, CumulusPalletXcmpQueueEvent, CumulusPalletXcmpQueueInboundChannelDetails, CumulusPalletXcmpQueueInboundState, CumulusPalletXcmpQueueOutboundChannelDetails, CumulusPalletXcmpQueueOutboundState, CumulusPalletXcmpQueueQueueConfigData, CumulusPrimitivesParachainInherentParachainInherentData, EthbloomBloom, EthereumBlock, EthereumHeader, EthereumLog, EthereumReceiptEip658ReceiptData, EthereumReceiptReceiptV3, EthereumTransactionAccessListItem, EthereumTransactionEip1559Transaction, EthereumTransactionEip2930Transaction, EthereumTransactionLegacyTransaction, EthereumTransactionTransactionAction, EthereumTransactionTransactionSignature, EthereumTransactionTransactionV2, EthereumTypesHashH64, EvmCoreErrorExitError, EvmCoreErrorExitFatal, EvmCoreErrorExitReason, EvmCoreErrorExitRevert, EvmCoreErrorExitSucceed, FpRpcTransactionStatus, FrameSupportDispatchDispatchClass, FrameSupportDispatchDispatchInfo, FrameSupportDispatchPays, FrameSupportDispatchPerDispatchClassU32, FrameSupportDispatchPerDispatchClassWeight, FrameSupportDispatchPerDispatchClassWeightsPerClass, FrameSupportDispatchRawOrigin, FrameSupportPalletId, FrameSupportPreimagesBounded, FrameSupportScheduleDispatchTime, FrameSupportTokensMiscBalanceStatus, FrameSystemAccountInfo, FrameSystemCall, FrameSystemError, FrameSystemEvent, FrameSystemEventRecord, FrameSystemExtensionsCheckGenesis, FrameSystemExtensionsCheckNonce, FrameSystemExtensionsCheckSpecVersion, FrameSystemExtensionsCheckTxVersion, FrameSystemExtensionsCheckWeight, FrameSystemLastRuntimeUpgradeInfo, FrameSystemLimitsBlockLength, FrameSystemLimitsBlockWeights, FrameSystemLimitsWeightsPerClass, FrameSystemPhase, OpalRuntimeOriginCaller, OpalRuntimeRuntime, OpalRuntimeRuntimeCommonConfigPalletsGovernanceOriginsPalletCustomOriginsOrigin, OpalRuntimeRuntimeCommonIdentityDisableIdentityCalls, OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance, OpalRuntimeRuntimeCommonSessionKeys, OrmlTokensAccountData, OrmlTokensBalanceLock, OrmlTokensModuleCall, OrmlTokensModuleError, OrmlTokensModuleEvent, OrmlTokensReserveData, OrmlVestingModuleCall, OrmlVestingModuleError, OrmlVestingModuleEvent, OrmlVestingVestingSchedule, OrmlXtokensModuleCall, OrmlXtokensModuleError, OrmlXtokensModuleEvent, PalletAppPromotionCall, PalletAppPromotionError, PalletAppPromotionEvent, PalletBalancesAccountData, PalletBalancesBalanceLock, PalletBalancesCall, PalletBalancesError, PalletBalancesEvent, PalletBalancesIdAmount, PalletBalancesReasons, PalletBalancesReserveData, PalletCollatorSelectionCall, PalletCollatorSelectionError, PalletCollatorSelectionEvent, PalletCollectiveCall, PalletCollectiveError, PalletCollectiveEvent, PalletCollectiveRawOrigin, PalletCollectiveVotes, PalletCommonError, PalletCommonEvent, PalletConfigurationAppPromotionConfiguration, PalletConfigurationCall, PalletConfigurationError, PalletConfigurationEvent, PalletConfigurationGovernanceArgs, PalletConfigurationGovernanceConfiguration, PalletDemocracyCall, PalletDemocracyConviction, PalletDemocracyDelegations, PalletDemocracyError, PalletDemocracyEvent, PalletDemocracyMetadataOwner, PalletDemocracyReferendumInfo, PalletDemocracyReferendumStatus, PalletDemocracyTally, PalletDemocracyVoteAccountVote, PalletDemocracyVotePriorLock, PalletDemocracyVoteThreshold, PalletDemocracyVoteVoting, PalletEthereumCall, PalletEthereumError, PalletEthereumEvent, PalletEthereumFakeTransactionFinalizer, PalletEthereumRawOrigin, PalletEvmAccountBasicCrossAccountIdRepr, PalletEvmCall, PalletEvmCoderSubstrateCall, PalletEvmCoderSubstrateError, PalletEvmContractHelpersCall, PalletEvmContractHelpersError, PalletEvmContractHelpersEvent, PalletEvmContractHelpersSponsoringModeT, PalletEvmError, PalletEvmEvent, PalletEvmMigrationCall, PalletEvmMigrationError, PalletEvmMigrationEvent, PalletForeignAssetsAssetIds, PalletForeignAssetsModuleAssetMetadata, PalletForeignAssetsModuleCall, PalletForeignAssetsModuleError, PalletForeignAssetsModuleEvent, PalletForeignAssetsNativeCurrency, PalletFungibleError, PalletIdentityBitFlags, PalletIdentityCall, PalletIdentityError, PalletIdentityEvent, PalletIdentityIdentityField, PalletIdentityIdentityInfo, PalletIdentityJudgement, PalletIdentityRegistrarInfo, PalletIdentityRegistration, PalletInflationCall, PalletMaintenanceCall, PalletMaintenanceError, PalletMaintenanceEvent, PalletMembershipCall, PalletMembershipError, PalletMembershipEvent, PalletNonfungibleError, PalletNonfungibleItemData, PalletPreimageCall, PalletPreimageError, PalletPreimageEvent, PalletPreimageRequestStatus, PalletRankedCollectiveCall, PalletRankedCollectiveError, PalletRankedCollectiveEvent, PalletRankedCollectiveMemberRecord, PalletRankedCollectiveTally, PalletRankedCollectiveVoteRecord, PalletReferendaCall, PalletReferendaCurve, PalletReferendaDecidingStatus, PalletReferendaDeposit, PalletReferendaError, PalletReferendaEvent, PalletReferendaReferendumInfo, PalletReferendaReferendumStatus, PalletReferendaTrackInfo, PalletRefungibleError, PalletSchedulerCall, PalletSchedulerError, PalletSchedulerEvent, PalletSchedulerScheduled, PalletSessionCall, PalletSessionError, PalletSessionEvent, PalletStateTrieMigrationCall, PalletStateTrieMigrationError, PalletStateTrieMigrationEvent, PalletStateTrieMigrationMigrationCompute, PalletStateTrieMigrationMigrationLimits, PalletStateTrieMigrationMigrationTask, PalletStateTrieMigrationProgress, PalletStructureCall, PalletStructureError, PalletStructureEvent, PalletSudoCall, PalletSudoError, PalletSudoEvent, PalletTemplateTransactionPaymentChargeTransactionPayment, PalletTestUtilsCall, PalletTestUtilsError, PalletTestUtilsEvent, PalletTimestampCall, PalletTransactionPaymentEvent, PalletTransactionPaymentReleases, PalletTreasuryCall, PalletTreasuryError, PalletTreasuryEvent, PalletTreasuryProposal, PalletUniqueCall, PalletUniqueError, PalletXcmCall, PalletXcmError, PalletXcmEvent, PalletXcmOrigin, PalletXcmQueryStatus, PalletXcmRemoteLockedFungibleRecord, PalletXcmVersionMigrationStage, ParachainInfoCall, PhantomTypeUpDataStructs, PolkadotCorePrimitivesInboundDownwardMessage, PolkadotCorePrimitivesInboundHrmpMessage, PolkadotCorePrimitivesOutboundHrmpMessage, PolkadotParachainPrimitivesXcmpMessageFormat, PolkadotPrimitivesV4AbridgedHostConfiguration, PolkadotPrimitivesV4AbridgedHrmpChannel, PolkadotPrimitivesV4PersistedValidationData, PolkadotPrimitivesV4UpgradeRestriction, SpArithmeticArithmeticError, SpConsensusAuraSr25519AppSr25519Public, SpCoreCryptoKeyTypeId, SpCoreEcdsaSignature, SpCoreEd25519Signature, SpCoreSr25519Public, SpCoreSr25519Signature, SpCoreVoid, SpRuntimeDigest, SpRuntimeDigestDigestItem, SpRuntimeDispatchError, SpRuntimeModuleError, SpRuntimeMultiSignature, SpRuntimeTokenError, SpRuntimeTransactionValidityInvalidTransaction, SpRuntimeTransactionValidityTransactionValidityError, SpRuntimeTransactionValidityUnknownTransaction, SpRuntimeTransactionalError, SpTrieStorageProof, SpVersionRuntimeVersion, SpWeightsRuntimeDbWeight, SpWeightsWeightV2Weight, UpDataStructsAccessMode, UpDataStructsCollection, UpDataStructsCollectionLimits, UpDataStructsCollectionMode, UpDataStructsCollectionPermissions, UpDataStructsCollectionStats, UpDataStructsCreateCollectionData, UpDataStructsCreateFungibleData, UpDataStructsCreateItemData, UpDataStructsCreateItemExData, UpDataStructsCreateNftData, UpDataStructsCreateNftExData, UpDataStructsCreateReFungibleData, UpDataStructsCreateRefungibleExMultipleOwners, UpDataStructsCreateRefungibleExSingleOwner, UpDataStructsNestingPermissions, UpDataStructsOwnerRestrictedSet, UpDataStructsProperties, UpDataStructsPropertiesMapBoundedVec, UpDataStructsPropertiesMapPropertyPermission, UpDataStructsProperty, UpDataStructsPropertyKeyPermission, UpDataStructsPropertyPermission, UpDataStructsPropertyScope, UpDataStructsRpcCollection, UpDataStructsRpcCollectionFlags, UpDataStructsSponsoringRateLimit, UpDataStructsSponsorshipStateAccountId32, UpDataStructsSponsorshipStateBasicCrossAccountIdRepr, UpDataStructsTokenChild, UpDataStructsTokenData, UpPovEstimateRpcPovInfo, UpPovEstimateRpcTrieKeyValue, XcmDoubleEncoded, XcmV2BodyId, XcmV2BodyPart, XcmV2Instruction, XcmV2Junction, XcmV2MultiAsset, XcmV2MultiLocation, XcmV2MultiassetAssetId, XcmV2MultiassetAssetInstance, XcmV2MultiassetFungibility, XcmV2MultiassetMultiAssetFilter, XcmV2MultiassetMultiAssets, XcmV2MultiassetWildFungibility, XcmV2MultiassetWildMultiAsset, XcmV2MultilocationJunctions, XcmV2NetworkId, XcmV2OriginKind, XcmV2Response, XcmV2TraitsError, XcmV2WeightLimit, XcmV2Xcm, XcmV3Instruction, XcmV3Junction, XcmV3JunctionBodyId, XcmV3JunctionBodyPart, XcmV3JunctionNetworkId, XcmV3Junctions, XcmV3MaybeErrorCode, XcmV3MultiAsset, XcmV3MultiLocation, XcmV3MultiassetAssetId, XcmV3MultiassetAssetInstance, XcmV3MultiassetFungibility, XcmV3MultiassetMultiAssetFilter, XcmV3MultiassetMultiAssets, XcmV3MultiassetWildFungibility, XcmV3MultiassetWildMultiAsset, XcmV3PalletInfo, XcmV3QueryResponseInfo, XcmV3Response, XcmV3TraitsError, XcmV3TraitsOutcome, XcmV3WeightLimit, XcmV3Xcm, XcmVersionedAssetId, XcmVersionedMultiAsset, XcmVersionedMultiAssets, XcmVersionedMultiLocation, XcmVersionedResponse, XcmVersionedXcm } from '@polkadot/types/lookup';

declare module '@polkadot/types/types/registry' {
  interface InterfaceTypes {
    CumulusPalletDmpQueueCall: CumulusPalletDmpQueueCall;
    CumulusPalletDmpQueueConfigData: CumulusPalletDmpQueueConfigData;
    CumulusPalletDmpQueueError: CumulusPalletDmpQueueError;
    CumulusPalletDmpQueueEvent: CumulusPalletDmpQueueEvent;
    CumulusPalletDmpQueuePageIndexData: CumulusPalletDmpQueuePageIndexData;
    CumulusPalletParachainSystemCall: CumulusPalletParachainSystemCall;
    CumulusPalletParachainSystemCodeUpgradeAuthorization: CumulusPalletParachainSystemCodeUpgradeAuthorization;
    CumulusPalletParachainSystemError: CumulusPalletParachainSystemError;
    CumulusPalletParachainSystemEvent: CumulusPalletParachainSystemEvent;
    CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot: CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot;
    CumulusPalletParachainSystemRelayStateSnapshotRelayDispachQueueSize: CumulusPalletParachainSystemRelayStateSnapshotRelayDispachQueueSize;
    CumulusPalletXcmCall: CumulusPalletXcmCall;
    CumulusPalletXcmError: CumulusPalletXcmError;
    CumulusPalletXcmEvent: CumulusPalletXcmEvent;
    CumulusPalletXcmOrigin: CumulusPalletXcmOrigin;
    CumulusPalletXcmpQueueCall: CumulusPalletXcmpQueueCall;
    CumulusPalletXcmpQueueError: CumulusPalletXcmpQueueError;
    CumulusPalletXcmpQueueEvent: CumulusPalletXcmpQueueEvent;
    CumulusPalletXcmpQueueInboundChannelDetails: CumulusPalletXcmpQueueInboundChannelDetails;
    CumulusPalletXcmpQueueInboundState: CumulusPalletXcmpQueueInboundState;
    CumulusPalletXcmpQueueOutboundChannelDetails: CumulusPalletXcmpQueueOutboundChannelDetails;
    CumulusPalletXcmpQueueOutboundState: CumulusPalletXcmpQueueOutboundState;
    CumulusPalletXcmpQueueQueueConfigData: CumulusPalletXcmpQueueQueueConfigData;
    CumulusPrimitivesParachainInherentParachainInherentData: CumulusPrimitivesParachainInherentParachainInherentData;
    EthbloomBloom: EthbloomBloom;
    EthereumBlock: EthereumBlock;
    EthereumHeader: EthereumHeader;
    EthereumLog: EthereumLog;
    EthereumReceiptEip658ReceiptData: EthereumReceiptEip658ReceiptData;
    EthereumReceiptReceiptV3: EthereumReceiptReceiptV3;
    EthereumTransactionAccessListItem: EthereumTransactionAccessListItem;
    EthereumTransactionEip1559Transaction: EthereumTransactionEip1559Transaction;
    EthereumTransactionEip2930Transaction: EthereumTransactionEip2930Transaction;
    EthereumTransactionLegacyTransaction: EthereumTransactionLegacyTransaction;
    EthereumTransactionTransactionAction: EthereumTransactionTransactionAction;
    EthereumTransactionTransactionSignature: EthereumTransactionTransactionSignature;
    EthereumTransactionTransactionV2: EthereumTransactionTransactionV2;
    EthereumTypesHashH64: EthereumTypesHashH64;
    EvmCoreErrorExitError: EvmCoreErrorExitError;
    EvmCoreErrorExitFatal: EvmCoreErrorExitFatal;
    EvmCoreErrorExitReason: EvmCoreErrorExitReason;
    EvmCoreErrorExitRevert: EvmCoreErrorExitRevert;
    EvmCoreErrorExitSucceed: EvmCoreErrorExitSucceed;
    FpRpcTransactionStatus: FpRpcTransactionStatus;
    FrameSupportDispatchDispatchClass: FrameSupportDispatchDispatchClass;
    FrameSupportDispatchDispatchInfo: FrameSupportDispatchDispatchInfo;
    FrameSupportDispatchPays: FrameSupportDispatchPays;
    FrameSupportDispatchPerDispatchClassU32: FrameSupportDispatchPerDispatchClassU32;
    FrameSupportDispatchPerDispatchClassWeight: FrameSupportDispatchPerDispatchClassWeight;
    FrameSupportDispatchPerDispatchClassWeightsPerClass: FrameSupportDispatchPerDispatchClassWeightsPerClass;
    FrameSupportDispatchRawOrigin: FrameSupportDispatchRawOrigin;
    FrameSupportPalletId: FrameSupportPalletId;
    FrameSupportPreimagesBounded: FrameSupportPreimagesBounded;
    FrameSupportScheduleDispatchTime: FrameSupportScheduleDispatchTime;
    FrameSupportTokensMiscBalanceStatus: FrameSupportTokensMiscBalanceStatus;
    FrameSystemAccountInfo: FrameSystemAccountInfo;
    FrameSystemCall: FrameSystemCall;
    FrameSystemError: FrameSystemError;
    FrameSystemEvent: FrameSystemEvent;
    FrameSystemEventRecord: FrameSystemEventRecord;
    FrameSystemExtensionsCheckGenesis: FrameSystemExtensionsCheckGenesis;
    FrameSystemExtensionsCheckNonce: FrameSystemExtensionsCheckNonce;
    FrameSystemExtensionsCheckSpecVersion: FrameSystemExtensionsCheckSpecVersion;
    FrameSystemExtensionsCheckTxVersion: FrameSystemExtensionsCheckTxVersion;
    FrameSystemExtensionsCheckWeight: FrameSystemExtensionsCheckWeight;
    FrameSystemLastRuntimeUpgradeInfo: FrameSystemLastRuntimeUpgradeInfo;
    FrameSystemLimitsBlockLength: FrameSystemLimitsBlockLength;
    FrameSystemLimitsBlockWeights: FrameSystemLimitsBlockWeights;
    FrameSystemLimitsWeightsPerClass: FrameSystemLimitsWeightsPerClass;
    FrameSystemPhase: FrameSystemPhase;
    OpalRuntimeOriginCaller: OpalRuntimeOriginCaller;
    OpalRuntimeRuntime: OpalRuntimeRuntime;
    OpalRuntimeRuntimeCommonConfigPalletsGovernanceOriginsPalletCustomOriginsOrigin: OpalRuntimeRuntimeCommonConfigPalletsGovernanceOriginsPalletCustomOriginsOrigin;
    OpalRuntimeRuntimeCommonIdentityDisableIdentityCalls: OpalRuntimeRuntimeCommonIdentityDisableIdentityCalls;
    OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance: OpalRuntimeRuntimeCommonMaintenanceCheckMaintenance;
    OpalRuntimeRuntimeCommonSessionKeys: OpalRuntimeRuntimeCommonSessionKeys;
    OrmlTokensAccountData: OrmlTokensAccountData;
    OrmlTokensBalanceLock: OrmlTokensBalanceLock;
    OrmlTokensModuleCall: OrmlTokensModuleCall;
    OrmlTokensModuleError: OrmlTokensModuleError;
    OrmlTokensModuleEvent: OrmlTokensModuleEvent;
    OrmlTokensReserveData: OrmlTokensReserveData;
    OrmlVestingModuleCall: OrmlVestingModuleCall;
    OrmlVestingModuleError: OrmlVestingModuleError;
    OrmlVestingModuleEvent: OrmlVestingModuleEvent;
    OrmlVestingVestingSchedule: OrmlVestingVestingSchedule;
    OrmlXtokensModuleCall: OrmlXtokensModuleCall;
    OrmlXtokensModuleError: OrmlXtokensModuleError;
    OrmlXtokensModuleEvent: OrmlXtokensModuleEvent;
    PalletAppPromotionCall: PalletAppPromotionCall;
    PalletAppPromotionError: PalletAppPromotionError;
    PalletAppPromotionEvent: PalletAppPromotionEvent;
    PalletBalancesAccountData: PalletBalancesAccountData;
    PalletBalancesBalanceLock: PalletBalancesBalanceLock;
    PalletBalancesCall: PalletBalancesCall;
    PalletBalancesError: PalletBalancesError;
    PalletBalancesEvent: PalletBalancesEvent;
    PalletBalancesIdAmount: PalletBalancesIdAmount;
    PalletBalancesReasons: PalletBalancesReasons;
    PalletBalancesReserveData: PalletBalancesReserveData;
    PalletCollatorSelectionCall: PalletCollatorSelectionCall;
    PalletCollatorSelectionError: PalletCollatorSelectionError;
    PalletCollatorSelectionEvent: PalletCollatorSelectionEvent;
    PalletCollectiveCall: PalletCollectiveCall;
    PalletCollectiveError: PalletCollectiveError;
    PalletCollectiveEvent: PalletCollectiveEvent;
    PalletCollectiveRawOrigin: PalletCollectiveRawOrigin;
    PalletCollectiveVotes: PalletCollectiveVotes;
    PalletCommonError: PalletCommonError;
    PalletCommonEvent: PalletCommonEvent;
    PalletConfigurationAppPromotionConfiguration: PalletConfigurationAppPromotionConfiguration;
    PalletConfigurationCall: PalletConfigurationCall;
    PalletConfigurationError: PalletConfigurationError;
    PalletConfigurationEvent: PalletConfigurationEvent;
    PalletConfigurationGovernanceArgs: PalletConfigurationGovernanceArgs;
    PalletConfigurationGovernanceConfiguration: PalletConfigurationGovernanceConfiguration;
    PalletDemocracyCall: PalletDemocracyCall;
    PalletDemocracyConviction: PalletDemocracyConviction;
    PalletDemocracyDelegations: PalletDemocracyDelegations;
    PalletDemocracyError: PalletDemocracyError;
    PalletDemocracyEvent: PalletDemocracyEvent;
    PalletDemocracyMetadataOwner: PalletDemocracyMetadataOwner;
    PalletDemocracyReferendumInfo: PalletDemocracyReferendumInfo;
    PalletDemocracyReferendumStatus: PalletDemocracyReferendumStatus;
    PalletDemocracyTally: PalletDemocracyTally;
    PalletDemocracyVoteAccountVote: PalletDemocracyVoteAccountVote;
    PalletDemocracyVotePriorLock: PalletDemocracyVotePriorLock;
    PalletDemocracyVoteThreshold: PalletDemocracyVoteThreshold;
    PalletDemocracyVoteVoting: PalletDemocracyVoteVoting;
    PalletEthereumCall: PalletEthereumCall;
    PalletEthereumError: PalletEthereumError;
    PalletEthereumEvent: PalletEthereumEvent;
    PalletEthereumFakeTransactionFinalizer: PalletEthereumFakeTransactionFinalizer;
    PalletEthereumRawOrigin: PalletEthereumRawOrigin;
    PalletEvmAccountBasicCrossAccountIdRepr: PalletEvmAccountBasicCrossAccountIdRepr;
    PalletEvmCall: PalletEvmCall;
    PalletEvmCodeMetadata: PalletEvmCodeMetadata;
    PalletEvmCoderSubstrateError: PalletEvmCoderSubstrateError;
    PalletEvmContractHelpersCall: PalletEvmContractHelpersCall;
    PalletEvmContractHelpersError: PalletEvmContractHelpersError;
    PalletEvmContractHelpersEvent: PalletEvmContractHelpersEvent;
    PalletEvmContractHelpersSponsoringModeT: PalletEvmContractHelpersSponsoringModeT;
    PalletEvmError: PalletEvmError;
    PalletEvmEvent: PalletEvmEvent;
    PalletEvmMigrationCall: PalletEvmMigrationCall;
    PalletEvmMigrationError: PalletEvmMigrationError;
    PalletEvmMigrationEvent: PalletEvmMigrationEvent;
    PalletForeignAssetsAssetIds: PalletForeignAssetsAssetIds;
    PalletForeignAssetsModuleAssetMetadata: PalletForeignAssetsModuleAssetMetadata;
    PalletForeignAssetsModuleCall: PalletForeignAssetsModuleCall;
    PalletForeignAssetsModuleError: PalletForeignAssetsModuleError;
    PalletForeignAssetsModuleEvent: PalletForeignAssetsModuleEvent;
    PalletForeignAssetsNativeCurrency: PalletForeignAssetsNativeCurrency;
    PalletFungibleError: PalletFungibleError;
    PalletIdentityBitFlags: PalletIdentityBitFlags;
    PalletIdentityCall: PalletIdentityCall;
    PalletIdentityError: PalletIdentityError;
    PalletIdentityEvent: PalletIdentityEvent;
    PalletIdentityIdentityField: PalletIdentityIdentityField;
    PalletIdentityIdentityInfo: PalletIdentityIdentityInfo;
    PalletIdentityJudgement: PalletIdentityJudgement;
    PalletIdentityRegistrarInfo: PalletIdentityRegistrarInfo;
    PalletIdentityRegistration: PalletIdentityRegistration;
    PalletInflationCall: PalletInflationCall;
    PalletMaintenanceCall: PalletMaintenanceCall;
    PalletMaintenanceError: PalletMaintenanceError;
    PalletMaintenanceEvent: PalletMaintenanceEvent;
    PalletMembershipCall: PalletMembershipCall;
    PalletMembershipError: PalletMembershipError;
    PalletMembershipEvent: PalletMembershipEvent;
    PalletNonfungibleError: PalletNonfungibleError;
    PalletNonfungibleItemData: PalletNonfungibleItemData;
    PalletPreimageCall: PalletPreimageCall;
    PalletPreimageError: PalletPreimageError;
    PalletPreimageEvent: PalletPreimageEvent;
    PalletPreimageRequestStatus: PalletPreimageRequestStatus;
    PalletRankedCollectiveCall: PalletRankedCollectiveCall;
    PalletRankedCollectiveError: PalletRankedCollectiveError;
    PalletRankedCollectiveEvent: PalletRankedCollectiveEvent;
    PalletRankedCollectiveMemberRecord: PalletRankedCollectiveMemberRecord;
    PalletRankedCollectiveTally: PalletRankedCollectiveTally;
    PalletRankedCollectiveVoteRecord: PalletRankedCollectiveVoteRecord;
    PalletReferendaCall: PalletReferendaCall;
    PalletReferendaCurve: PalletReferendaCurve;
    PalletReferendaDecidingStatus: PalletReferendaDecidingStatus;
    PalletReferendaDeposit: PalletReferendaDeposit;
    PalletReferendaError: PalletReferendaError;
    PalletReferendaEvent: PalletReferendaEvent;
    PalletReferendaReferendumInfo: PalletReferendaReferendumInfo;
    PalletReferendaReferendumStatus: PalletReferendaReferendumStatus;
    PalletReferendaTrackInfo: PalletReferendaTrackInfo;
    PalletRefungibleError: PalletRefungibleError;
    PalletSchedulerCall: PalletSchedulerCall;
    PalletSchedulerError: PalletSchedulerError;
    PalletSchedulerEvent: PalletSchedulerEvent;
    PalletSchedulerScheduled: PalletSchedulerScheduled;
    PalletSessionCall: PalletSessionCall;
    PalletSessionError: PalletSessionError;
    PalletSessionEvent: PalletSessionEvent;
    PalletStateTrieMigrationCall: PalletStateTrieMigrationCall;
    PalletStateTrieMigrationError: PalletStateTrieMigrationError;
    PalletStateTrieMigrationEvent: PalletStateTrieMigrationEvent;
    PalletStateTrieMigrationMigrationCompute: PalletStateTrieMigrationMigrationCompute;
    PalletStateTrieMigrationMigrationLimits: PalletStateTrieMigrationMigrationLimits;
    PalletStateTrieMigrationMigrationTask: PalletStateTrieMigrationMigrationTask;
    PalletStateTrieMigrationProgress: PalletStateTrieMigrationProgress;
    PalletStructureCall: PalletStructureCall;
    PalletStructureError: PalletStructureError;
    PalletStructureEvent: PalletStructureEvent;
    PalletSudoCall: PalletSudoCall;
    PalletSudoError: PalletSudoError;
    PalletSudoEvent: PalletSudoEvent;
    PalletTemplateTransactionPaymentChargeTransactionPayment: PalletTemplateTransactionPaymentChargeTransactionPayment;
    PalletTestUtilsCall: PalletTestUtilsCall;
    PalletTestUtilsError: PalletTestUtilsError;
    PalletTestUtilsEvent: PalletTestUtilsEvent;
    PalletTimestampCall: PalletTimestampCall;
    PalletTransactionPaymentEvent: PalletTransactionPaymentEvent;
    PalletTransactionPaymentReleases: PalletTransactionPaymentReleases;
    PalletTreasuryCall: PalletTreasuryCall;
    PalletTreasuryError: PalletTreasuryError;
    PalletTreasuryEvent: PalletTreasuryEvent;
    PalletTreasuryProposal: PalletTreasuryProposal;
    PalletUniqueCall: PalletUniqueCall;
    PalletUniqueError: PalletUniqueError;
    PalletXcmCall: PalletXcmCall;
    PalletXcmError: PalletXcmError;
    PalletXcmEvent: PalletXcmEvent;
    PalletXcmOrigin: PalletXcmOrigin;
    PalletXcmQueryStatus: PalletXcmQueryStatus;
    PalletXcmRemoteLockedFungibleRecord: PalletXcmRemoteLockedFungibleRecord;
    PalletXcmVersionMigrationStage: PalletXcmVersionMigrationStage;
    ParachainInfoCall: ParachainInfoCall;
    PhantomTypeUpDataStructs: PhantomTypeUpDataStructs;
    PolkadotCorePrimitivesInboundDownwardMessage: PolkadotCorePrimitivesInboundDownwardMessage;
    PolkadotCorePrimitivesInboundHrmpMessage: PolkadotCorePrimitivesInboundHrmpMessage;
    PolkadotCorePrimitivesOutboundHrmpMessage: PolkadotCorePrimitivesOutboundHrmpMessage;
    PolkadotParachainPrimitivesXcmpMessageFormat: PolkadotParachainPrimitivesXcmpMessageFormat;
    PolkadotPrimitivesV4AbridgedHostConfiguration: PolkadotPrimitivesV4AbridgedHostConfiguration;
    PolkadotPrimitivesV4AbridgedHrmpChannel: PolkadotPrimitivesV4AbridgedHrmpChannel;
    PolkadotPrimitivesV4PersistedValidationData: PolkadotPrimitivesV4PersistedValidationData;
    PolkadotPrimitivesV4UpgradeRestriction: PolkadotPrimitivesV4UpgradeRestriction;
    SpArithmeticArithmeticError: SpArithmeticArithmeticError;
    SpConsensusAuraSr25519AppSr25519Public: SpConsensusAuraSr25519AppSr25519Public;
    SpCoreCryptoKeyTypeId: SpCoreCryptoKeyTypeId;
    SpCoreEcdsaSignature: SpCoreEcdsaSignature;
    SpCoreEd25519Signature: SpCoreEd25519Signature;
    SpCoreSr25519Public: SpCoreSr25519Public;
    SpCoreSr25519Signature: SpCoreSr25519Signature;
    SpCoreVoid: SpCoreVoid;
    SpRuntimeDigest: SpRuntimeDigest;
    SpRuntimeDigestDigestItem: SpRuntimeDigestDigestItem;
    SpRuntimeDispatchError: SpRuntimeDispatchError;
    SpRuntimeModuleError: SpRuntimeModuleError;
    SpRuntimeMultiSignature: SpRuntimeMultiSignature;
    SpRuntimeTokenError: SpRuntimeTokenError;
    SpRuntimeTransactionValidityInvalidTransaction: SpRuntimeTransactionValidityInvalidTransaction;
    SpRuntimeTransactionValidityTransactionValidityError: SpRuntimeTransactionValidityTransactionValidityError;
    SpRuntimeTransactionValidityUnknownTransaction: SpRuntimeTransactionValidityUnknownTransaction;
    SpRuntimeTransactionalError: SpRuntimeTransactionalError;
    SpTrieStorageProof: SpTrieStorageProof;
    SpVersionRuntimeVersion: SpVersionRuntimeVersion;
    SpWeightsRuntimeDbWeight: SpWeightsRuntimeDbWeight;
    SpWeightsWeightV2Weight: SpWeightsWeightV2Weight;
    UpDataStructsAccessMode: UpDataStructsAccessMode;
    UpDataStructsCollection: UpDataStructsCollection;
    UpDataStructsCollectionLimits: UpDataStructsCollectionLimits;
    UpDataStructsCollectionMode: UpDataStructsCollectionMode;
    UpDataStructsCollectionPermissions: UpDataStructsCollectionPermissions;
    UpDataStructsCollectionStats: UpDataStructsCollectionStats;
    UpDataStructsCreateCollectionData: UpDataStructsCreateCollectionData;
    UpDataStructsCreateFungibleData: UpDataStructsCreateFungibleData;
    UpDataStructsCreateItemData: UpDataStructsCreateItemData;
    UpDataStructsCreateItemExData: UpDataStructsCreateItemExData;
    UpDataStructsCreateNftData: UpDataStructsCreateNftData;
    UpDataStructsCreateNftExData: UpDataStructsCreateNftExData;
    UpDataStructsCreateReFungibleData: UpDataStructsCreateReFungibleData;
    UpDataStructsCreateRefungibleExMultipleOwners: UpDataStructsCreateRefungibleExMultipleOwners;
    UpDataStructsCreateRefungibleExSingleOwner: UpDataStructsCreateRefungibleExSingleOwner;
    UpDataStructsNestingPermissions: UpDataStructsNestingPermissions;
    UpDataStructsOwnerRestrictedSet: UpDataStructsOwnerRestrictedSet;
    UpDataStructsProperties: UpDataStructsProperties;
    UpDataStructsPropertiesMapBoundedVec: UpDataStructsPropertiesMapBoundedVec;
    UpDataStructsPropertiesMapPropertyPermission: UpDataStructsPropertiesMapPropertyPermission;
    UpDataStructsProperty: UpDataStructsProperty;
    UpDataStructsPropertyKeyPermission: UpDataStructsPropertyKeyPermission;
    UpDataStructsPropertyPermission: UpDataStructsPropertyPermission;
    UpDataStructsPropertyScope: UpDataStructsPropertyScope;
    UpDataStructsRpcCollection: UpDataStructsRpcCollection;
    UpDataStructsRpcCollectionFlags: UpDataStructsRpcCollectionFlags;
    UpDataStructsSponsoringRateLimit: UpDataStructsSponsoringRateLimit;
    UpDataStructsSponsorshipStateAccountId32: UpDataStructsSponsorshipStateAccountId32;
    UpDataStructsSponsorshipStateBasicCrossAccountIdRepr: UpDataStructsSponsorshipStateBasicCrossAccountIdRepr;
    UpDataStructsTokenChild: UpDataStructsTokenChild;
    UpDataStructsTokenData: UpDataStructsTokenData;
    UpPovEstimateRpcPovInfo: UpPovEstimateRpcPovInfo;
    UpPovEstimateRpcTrieKeyValue: UpPovEstimateRpcTrieKeyValue;
    XcmDoubleEncoded: XcmDoubleEncoded;
    XcmV2BodyId: XcmV2BodyId;
    XcmV2BodyPart: XcmV2BodyPart;
    XcmV2Instruction: XcmV2Instruction;
    XcmV2Junction: XcmV2Junction;
    XcmV2MultiAsset: XcmV2MultiAsset;
    XcmV2MultiLocation: XcmV2MultiLocation;
    XcmV2MultiassetAssetId: XcmV2MultiassetAssetId;
    XcmV2MultiassetAssetInstance: XcmV2MultiassetAssetInstance;
    XcmV2MultiassetFungibility: XcmV2MultiassetFungibility;
    XcmV2MultiassetMultiAssetFilter: XcmV2MultiassetMultiAssetFilter;
    XcmV2MultiassetMultiAssets: XcmV2MultiassetMultiAssets;
    XcmV2MultiassetWildFungibility: XcmV2MultiassetWildFungibility;
    XcmV2MultiassetWildMultiAsset: XcmV2MultiassetWildMultiAsset;
    XcmV2MultilocationJunctions: XcmV2MultilocationJunctions;
    XcmV2NetworkId: XcmV2NetworkId;
    XcmV2OriginKind: XcmV2OriginKind;
    XcmV2Response: XcmV2Response;
    XcmV2TraitsError: XcmV2TraitsError;
    XcmV2WeightLimit: XcmV2WeightLimit;
    XcmV2Xcm: XcmV2Xcm;
    XcmV3Instruction: XcmV3Instruction;
    XcmV3Junction: XcmV3Junction;
    XcmV3JunctionBodyId: XcmV3JunctionBodyId;
    XcmV3JunctionBodyPart: XcmV3JunctionBodyPart;
    XcmV3JunctionNetworkId: XcmV3JunctionNetworkId;
    XcmV3Junctions: XcmV3Junctions;
    XcmV3MaybeErrorCode: XcmV3MaybeErrorCode;
    XcmV3MultiAsset: XcmV3MultiAsset;
    XcmV3MultiLocation: XcmV3MultiLocation;
    XcmV3MultiassetAssetId: XcmV3MultiassetAssetId;
    XcmV3MultiassetAssetInstance: XcmV3MultiassetAssetInstance;
    XcmV3MultiassetFungibility: XcmV3MultiassetFungibility;
    XcmV3MultiassetMultiAssetFilter: XcmV3MultiassetMultiAssetFilter;
    XcmV3MultiassetMultiAssets: XcmV3MultiassetMultiAssets;
    XcmV3MultiassetWildFungibility: XcmV3MultiassetWildFungibility;
    XcmV3MultiassetWildMultiAsset: XcmV3MultiassetWildMultiAsset;
    XcmV3PalletInfo: XcmV3PalletInfo;
    XcmV3QueryResponseInfo: XcmV3QueryResponseInfo;
    XcmV3Response: XcmV3Response;
    XcmV3TraitsError: XcmV3TraitsError;
    XcmV3TraitsOutcome: XcmV3TraitsOutcome;
    XcmV3WeightLimit: XcmV3WeightLimit;
    XcmV3Xcm: XcmV3Xcm;
    XcmVersionedAssetId: XcmVersionedAssetId;
    XcmVersionedMultiAsset: XcmVersionedMultiAsset;
    XcmVersionedMultiAssets: XcmVersionedMultiAssets;
    XcmVersionedMultiLocation: XcmVersionedMultiLocation;
    XcmVersionedResponse: XcmVersionedResponse;
    XcmVersionedXcm: XcmVersionedXcm;
  } // InterfaceTypes
} // declare module
