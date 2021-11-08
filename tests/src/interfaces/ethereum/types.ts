// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Struct, u32 } from '@polkadot/types';

/** @name EthereumBlock */
export interface EthereumBlock extends Struct {
  readonly dummyEthBlock: u32;
}

/** @name EthereumLog */
export interface EthereumLog extends Struct {
  readonly dummyLog: u32;
}

/** @name EthereumReceipt */
export interface EthereumReceipt extends Struct {
  readonly dummyEthReceipt: u32;
}

/** @name EthereumTransactionLegacyTransaction */
export interface EthereumTransactionLegacyTransaction extends Struct {
  readonly dummyLegacyTx: u32;
}

/** @name EvmCoreErrorExitReason */
export interface EvmCoreErrorExitReason extends Struct {
  readonly dummyExitReason: u32;
}

/** @name FpRpcTransactionStatus */
export interface FpRpcTransactionStatus extends Struct {
  readonly dummyEthTxStatus: u32;
}

export type PHANTOM_ETHEREUM = 'ethereum';
