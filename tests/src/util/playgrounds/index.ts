import { IKeyringPair } from '@polkadot/types/types';
import { UniqueHelper } from './unique';
import config from '../../config';
import '../../interfaces/augment-api-events';
import * as defs from '../../interfaces/definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';


class SilentLogger {
  log(msg: any, level: any): void {}
  level = {
    ERROR: 'ERROR' as 'ERROR',
    WARNING: 'WARNING' as 'WARNING',
    INFO: 'INFO' as 'INFO'
  }
}


class DevUniqueHelper extends UniqueHelper {
  async connect(wsEndpoint: string, listeners?: any): Promise<void> {
    const wsProvider = new WsProvider(wsEndpoint);
    this.api = new ApiPromise({
      provider: wsProvider, 
      signedExtensions: {
        ContractHelpers: {
          extrinsic: {},
          payload: {},
        },
        FakeTransactionFinalizer: {
          extrinsic: {},
          payload: {},
        },
      },
      rpc: {
        unique: defs.unique.rpc,
        rmrk: defs.rmrk.rpc,
        eth: {
          feeHistory: {
            description: 'Dummy',
            params: [],
            type: 'u8',
          },
          maxPriorityFeePerGas: {
            description: 'Dummy',
            params: [],
            type: 'u8',
          },
        },
      },
    });
    await this.api.isReadyOrError;
    this.network = await UniqueHelper.detectNetwork(this.api);
  }
}

export const usingPlaygrounds = async (code: (helper: UniqueHelper, privateKey: (seed: string) => IKeyringPair) => Promise<void>) => {
  // TODO: Remove, this is temporary: Filter unneeded API output
  // (Jaco promised it will be removed in the next version)
  const consoleErr = console.error;
  const consoleLog = console.log;
  const consoleWarn = console.warn;

  const outFn = (printer: any) => (...args: any[]) => {
    for (const arg of args) {
      if (typeof arg !== 'string')
        continue;
      if (arg.includes('1000:: Normal connection closure' || arg === 'Normal connection closure'))
        return;
    }
    printer(...args);
  };

  console.error = outFn(consoleErr.bind(console));
  console.log = outFn(consoleLog.bind(console));
  console.warn = outFn(consoleWarn.bind(console));
  const helper = new DevUniqueHelper(new SilentLogger());

  try {
    await helper.connect(config.substrateUrl);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey = (seed: string) => helper.util.fromSeed(seed, ss58Format);
    await code(helper, privateKey);
  } 
  finally {
    await helper.disconnect();
    console.error = consoleErr;
    console.log = consoleLog;
    console.warn = consoleWarn;
  }
}