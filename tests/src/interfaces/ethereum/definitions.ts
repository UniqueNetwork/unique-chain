function mkDummy(name: string) {
  return {
    ['dummy' + name]: 'u32',
  };
}

export default {
  types: {
    EvmCoreErrorExitReason: mkDummy('ExitReason'),
    EthereumLog: mkDummy('Log'),
    EthereumTransactionLegacyTransaction: mkDummy('LegacyTx'),
    EthereumBlock: mkDummy('EthBlock'),
    EthereumReceipt: mkDummy('EthReceipt'),
    FpRpcTransactionStatus: mkDummy('EthTxStatus'),
  },
};
