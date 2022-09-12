// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Context} from 'mocha';
import config from '../../config';
import '../../interfaces/augment-api-events';
import {DevUniqueHelper, SilentLogger, SilentConsole} from './unique.dev';


chai.use(chaiAsPromised);
export const expect = chai.expect;

export const usingPlaygrounds = async (code: (helper: DevUniqueHelper, privateKey: (seed: string) => IKeyringPair) => Promise<void>) => {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new DevUniqueHelper(new SilentLogger());

  try {
    await helper.connect(config.substrateUrl);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey = (seed: string) => helper.util.fromSeed(seed, ss58Format);
    await code(helper, privateKey);
  }
  finally {
    await helper.disconnect();
    silentConsole.disable();
  }
};

export enum Pallets {
  Inflation = 'inflation',
  RmrkCore = 'rmrkcore',
  RmrkEquip = 'rmrkequip',
  ReFungible = 'refungible',
  Fungible = 'fungible',
  NFT = 'nonfungible',
  Scheduler = 'scheduler',
}

export function requirePalletsOrSkip(test: Context, helper: DevUniqueHelper, requiredPallets: string[]) {
  const missingPallets = helper.fetchMissingPalletNames(requiredPallets);
    
  if (missingPallets.length > 0) {
    const skipMsg = `\tSkipping test '${test.test?.title}'.\n\tThe following pallets are missing:\n\t- ${missingPallets.join('\n\t- ')}`;
    console.warn('\x1b[38:5:208m%s\x1b[0m', skipMsg);
    test.skip();
  }
}

export async function itSub(name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  (opts.only ? it.only : 
    opts.skip ? it.skip : it)(name, async function () {
    await usingPlaygrounds(async (helper, privateKey) => {
      if (opts.requiredPallets) {
        requirePalletsOrSkip(this, helper, opts.requiredPallets);
      }
      
      await cb({helper, privateKey});
    });
  });
}
itSub.only = (name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itSub(name, cb, {only: true});
itSub.skip = (name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itSub(name, cb, {skip: true});
itSub.ifWithPallets = (name: string, required: string[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => IKeyringPair }) => any) => itSub(name, cb, {requiredPallets: required});
