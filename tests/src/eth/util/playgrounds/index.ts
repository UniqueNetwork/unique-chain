// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {IKeyringPair} from '@polkadot/types/types';

import config from '../../../config';

import {EthUniqueHelper} from './unique.dev';
import {SilentLogger} from '../../../util/playgrounds/unique.dev';

export {EthUniqueHelper} from './unique.dev';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
export const expect = chai.expect;

export const usingEthPlaygrounds = async (code: (helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair) => Promise<void>) => {
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
  const helper = new EthUniqueHelper(new SilentLogger());

  try {
    await helper.connect(config.substrateUrl);
    await helper.connectWeb3(config.substrateUrl);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey = (seed: string) => helper.util.fromSeed(seed, ss58Format);
    await code(helper, privateKey);
  }
  finally {
    await helper.disconnect();
    await helper.disconnectWeb3();
    console.error = consoleErr;
    console.log = consoleLog;
    console.warn = consoleWarn;
  }
}
  
export async function itEth(name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any, opts: { only?: boolean, skip?: boolean } = {}) {
  let i: any = it;
  if (opts.only) i = i.only;
  else if (opts.skip) i = i.skip;
  i(name, async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      await cb({helper, privateKey});
    });
  });
}
itEth.only = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itEth(name, cb, {only: true});
itEth.skip = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itEth(name, cb, {skip: true});