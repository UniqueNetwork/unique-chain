// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {IKeyringPair} from '@polkadot/types/types';
import config from '../../config';
import '../../interfaces/augment-api-events';
import {DevUniqueHelper} from './unique.dev';

class SilentLogger {
  log(msg: any, level: any): void { }
  level = {
    ERROR: 'ERROR' as const,
    WARNING: 'WARNING' as const,
    INFO: 'INFO' as const,
  };
}

export const usingPlaygrounds = async (code: (helper: DevUniqueHelper, privateKey: (seed: string) => IKeyringPair) => Promise<void>) => {
  // TODO: Remove, this is temporary: Filter unneeded API output
  // (Jaco promised it will be removed in the next version)
  const consoleErr = console.error;
  const consoleLog = console.log;
  const consoleWarn = console.warn;

  const outFn = (printer: any) => (...args: any[]) => {
    for (const arg of args) {
      if (typeof arg !== 'string')
        continue;
      if (arg.includes('1000:: Normal connection closure') || arg.includes('Not decorating unknown runtime apis: UniqueApi/2, RmrkApi/1') || arg.includes('RPC methods not decorated:') || arg === 'Normal connection closure')
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
};