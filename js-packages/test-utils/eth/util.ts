// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import type {IKeyringPair} from '@polkadot/types/types';

import config from '../../tests/config.js';

import {EthUniqueHelper} from './index.js';
import {SilentLogger, SilentConsole} from '@unique/test-utils';
import type {SchedKind} from '@unique/test-utils/util.js';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiLike from 'chai-like';
import {getTestSeed, MINIMUM_DONOR_FUND, requirePalletsOrSkip, makeNames} from '@unique/test-utils/util.js';
import {hexlify, toUtf8Bytes} from 'ethers';

chai.use(chaiAsPromised);
chai.use(chaiLike);
export const expect = chai.expect;

// FIXME: 4? 12? 24? How to select confirmations count?
const confirmations = 4;
// 2 min timeout, ~30 blocks
const timeout = 2 * 60 * 1000;
export const waitParams = [confirmations, timeout];

export const hexlifyString = (value: string): string => hexlify(toUtf8Bytes(value));

export enum SponsoringMode {
  Disabled = 0,
  Allowlisted = 1,
  Generous = 2,
}

type PrivateKeyFn = (seed: string | {filename?: string, url?: string}) => Promise<IKeyringPair>;

export const usingEthPlaygrounds = async (code: (helper: EthUniqueHelper, privateKey: PrivateKeyFn) => Promise<void>) => {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new EthUniqueHelper(new SilentLogger());

  try {
    await helper.connect(config.substrateUrl);
    await helper.connectWeb3(config.substrateUrl);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey: PrivateKeyFn = async (seed) => {
      if(typeof seed === 'string') {
        return helper.util.fromSeed(seed, ss58Format);
      }
      if(seed.url) {
        const {filename} = makeNames(seed.url);
        seed.filename = filename;
      } else if(seed.filename) {
        // Pass
      } else {
        throw new Error('no url nor filename set');
      }
      const actualSeed = getTestSeed(seed.filename);
      let account = helper.util.fromSeed(actualSeed, ss58Format);
      if(await helper.balance.getSubstrate(account.address) < MINIMUM_DONOR_FUND) {
        console.warn(`${path.basename(seed.filename)}: Not enough funds present on the filename account. Using the default one as the donor instead.`);
        account = helper.util.fromSeed('//Alice', ss58Format);
      }
      return account;
    };
    await code(helper, privateKey);
  }
  finally {
    await helper.disconnect();
    silentConsole.disable();
  }
};

export function itEth(name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  (opts.only ? it.only :
    opts.skip ? it.skip : it)(name, async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      if(opts.requiredPallets) {
        requirePalletsOrSkip(this, helper, opts.requiredPallets);
      }

      // HACK: Retry if we got "TypeError: non-canonical s"
      // https://github.com/ethers-io/ethers.js/issues/4223
      // eslint-disable-next-line no-constant-condition
      while(true) {
        try {
          console.log(`# /// run test ${this.test?.fullTitle()}`);
          await cb({helper, privateKey});
          console.log(`# +++ complete ${this.test?.fullTitle()}`);

          break;
        } catch (error: any) {
          if(error.message.startsWith('non-canonical s')) {
            console.warn(`Catch error "non-canonical signature" in test "${this.test?.title}" (issue https://github.com/ethers-io/ethers.js/issues/4223). Retry after 1 second`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
    });
  });
}

export function itEthIfWithPallet(name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  return itEth(name, cb, {requiredPallets: required, ...opts});
}

itEth.only = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any) => itEth(name, cb, {only: true});
itEth.skip = (name: string, cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itEth(name, cb, {skip: true});

itEthIfWithPallet.only = (name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any) => itEthIfWithPallet(name, required, cb, {only: true});
itEthIfWithPallet.skip = (name: string, required: string[], cb: (apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any) => itEthIfWithPallet(name, required, cb, {skip: true});
itEth.ifWithPallets = itEthIfWithPallet;

export function itSchedEth(
  name: string,
  cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any,
  opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {},
) {
  itEth(name + ' (anonymous scheduling)', (apis) => cb('anon', apis), opts);
  itEth(name + ' (named scheduling)', (apis) => cb('named', apis), opts);
}
itSchedEth.only = (name: string, cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itSchedEth(name, cb, {only: true});
itSchedEth.skip = (name: string, cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itSchedEth(name, cb, {skip: true});
itSchedEth.ifWithPallets = itSchedIfWithPallets;

function itSchedIfWithPallets(name: string, required: string[], cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  return itSchedEth(name, cb, {requiredPallets: required, ...opts});
}
