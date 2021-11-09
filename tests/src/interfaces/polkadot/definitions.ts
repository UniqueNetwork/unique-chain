function mkDummy(name: string) {
  return {
    ['dummy' + name]: 'u32',
  };
}

export default {
  types: {
    CumulusPrimitivesParachainInherentParachainInherentData: mkDummy('ParachainInherentData'),
    CumulusPalletDmpQueueConfigData: mkDummy('DmpQueueConfigData'),
    CumulusPalletDmpQueuePageIndexData: mkDummy('DmpQueryPageIndexData'),
    PolkadotPrimitivesV1AbridgedHostConfiguration: mkDummy('AbridgedHostConfiguration'),
    CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot: mkDummy('CumulusStateSnapshot'),
    PolkadotPrimitivesV1PersistedValidationData: mkDummy('PersistedValidationData'),
    CumulusPalletXcmpQueueInboundStatus: mkDummy('CumulusInboundStatus'),
    CumulusPalletXcmpQueueOutboundStatus: mkDummy('CumulusOutboundStatus'),
    PolkadotParachainPrimitivesXcmpMessageFormat: mkDummy('XcmpMessageFormat'),
    CumulusPalletXcmpQueueQueueConfigData: mkDummy('QueueConfigData'),
  },
};
