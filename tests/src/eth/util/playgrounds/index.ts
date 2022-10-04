// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {IKeyringPair} from '@polkadot/types/types';

import config from '../../../config';

import {EthUniqueHelper} from './unique.dev';
import {SilentLogger, SilentConsole} from '../../../util/playgrounds/unique.dev';

export {EthUniqueHelper} from './unique.dev';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {requirePalletsOrSkip} from '../../../util/playgrounds';
chai.use(chaiAsPromised);
export const expect = chai.expect;

export const usingEthPlaygrounds = async (code: (helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair) => Promise<void>) => {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

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
    silentConsole.disable();
  }
};
  
export async function itEth(name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  (opts.only ? it.only : 
    opts.skip ? it.skip : it)(name, async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      if (opts.requiredPallets) {
        requirePalletsOrSkip(this, helper, opts.requiredPallets);
      }

      await cb({helper, privateKey});
    });
  });
}

export async function itEthIfWithPallet(name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  return itEth(name, cb, {requiredPallets: required, ...opts});
}

itEth.only = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itEth(name, cb, {only: true});
itEth.skip = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itEth(name, cb, {skip: true});

itEthIfWithPallet.only = (name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itEthIfWithPallet(name, required, cb, {only: true});
itEthIfWithPallet.skip = (name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itEthIfWithPallet(name, required, cb, {skip: true});
itEth.ifWithPallets = itEthIfWithPallet;
