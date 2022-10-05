// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import * as crypto from 'crypto';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Context} from 'mocha';
import config from '../../config';
import '../../interfaces/augment-api-events';
import {DevUniqueHelper, SilentLogger, SilentConsole} from './unique.dev';

chai.use(chaiAsPromised);
export const expect = chai.expect;

const getTestHash = (filename: string) => {
  return crypto.createHash('md5').update(path.basename(filename)).digest('hex');
};

export const getTestSeed = (filename: string) => {
  return `//Alice+${getTestHash(filename)}`;
};

// todo:playgrounds normalize to seed and filename
export const usingPlaygrounds = async (code: (helper: DevUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair>) => Promise<void>, url: string = config.substrateUrl) => {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new DevUniqueHelper(new SilentLogger());

  try {
    await helper.connect(url);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey = async (seed: string | {filename: string}) => {
      if (typeof seed === 'string') {
        return helper.util.fromSeed(seed, ss58Format);
      }
      else {
        const actualSeed = getTestSeed(seed.filename);
        let account = helper.util.fromSeed(actualSeed, ss58Format);
        if (await helper.balance.getSubstrate(account.address) == 0n) {
          console.warn(`${path.basename(seed.filename)}: Not enough funds present on the filename account. Using the default one as the donor instead.`);
          account = helper.util.fromSeed('//Alice', ss58Format);
        }
        return account;
      }
    };
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

export async function itSub(name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
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
export async function itSubIfWithPallet(name: string, required: string[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  return itSub(name, cb, {requiredPallets: required, ...opts});
}
itSub.only = (name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSub(name, cb, {only: true});
itSub.skip = (name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSub(name, cb, {skip: true});

itSubIfWithPallet.only = (name: string, required: string[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSubIfWithPallet(name, required, cb, {only: true});
itSubIfWithPallet.skip = (name: string, required: string[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSubIfWithPallet(name, required, cb, {skip: true});
itSub.ifWithPallets = itSubIfWithPallet;
