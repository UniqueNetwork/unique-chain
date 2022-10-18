// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {IKeyringPair} from '@polkadot/types/types';

import config from '../../config';

import {EthUniqueHelper} from './playgrounds/unique.dev';
import {SilentLogger, SilentConsole} from '../../util/playgrounds/unique.dev';

export {EthUniqueHelper} from './playgrounds/unique.dev';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiLike from 'chai-like';
import {getTestSeed, requirePalletsOrSkip} from '../../util';

chai.use(chaiAsPromised);
chai.use(chaiLike);
export const expect = chai.expect;

export enum SponsoringMode {
  Disabled = 0,
  Allowlisted = 1,
  Generous = 2,
}

export const usingEthPlaygrounds = async (code: (helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair>) => Promise<void>) => {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new EthUniqueHelper(new SilentLogger());

  try {
    await helper.connect(config.substrateUrl);
    await helper.connectWeb3(config.substrateUrl);
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
  
export async function itEth(name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
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

export async function itEthIfWithPallet(name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  return itEth(name, cb, {requiredPallets: required, ...opts});
}

itEth.only = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itEth(name, cb, {only: true});
itEth.skip = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itEth(name, cb, {skip: true});

itEthIfWithPallet.only = (name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itEthIfWithPallet(name, required, cb, {only: true});
itEthIfWithPallet.skip = (name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itEthIfWithPallet(name, required, cb, {skip: true});
itEth.ifWithPallets = itEthIfWithPallet;
