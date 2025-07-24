// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'node:path';
import type {IKeyringPair} from '@polkadot/types/types';

import config from '../../tests/config.ts';

import {EthUniqueHelper} from './index.ts';
import {SilentLogger, SilentConsole} from '@unique/test-utils';
import type {Pallets, SchedKind, UniqueTestContext} from '@unique/test-utils/util.ts';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiLike from 'chai-like';
import {getTestSeed, MINIMUM_DONOR_FUND, requirePalletsOrSkip, makeNames, fullTitle, SkipError} from '@unique/test-utils/util.ts';
import {hexlify, toUtf8Bytes} from 'ethers';
import { it } from "jsr:@std/testing/bdd";

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

export type ItEthArgs = [
  name: string,
  cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => void | Promise<void>,
  opts: {skip: boolean, only: boolean, requiredPallets?: Pallets[]}
] | [
  name: string,
  cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => void | Promise<void>,
];


export interface itEth {
  (...args: ItEthArgs): void;
  only(...args: ItEthArgs): void;
  skip(...args: ItEthArgs): void;
}

const defaultOptions = {
  skip: false,
  only: false,
  requiredPallets: []
}; 

export function itEth(...args: ItEthArgs) {
  const [name, cb, options] = args;
  
  const opts = options || defaultOptions;
  (opts.only ? it.only<UniqueTestContext> :
    opts.skip ? it.skip<UniqueTestContext> : it<UniqueTestContext>)(name, async function (t) {
      try {
        if (this.missingPallets)
          throw new SkipError(this.missingPallets);
        await usingEthPlaygrounds(async (helper, privateKey) => {
          if(opts.requiredPallets) {
            requirePalletsOrSkip(helper, opts.requiredPallets);
          }
          while(true) {
            try {
              await cb({helper, privateKey});

              break;
            } catch (error: any) {
              if(error.message.startsWith('non-canonical s')) {
                console.warn(`Catch error "non-canonical signature" in test "${fullTitle(t)}" (issue https://github.com/ethers-io/ethers.js/issues/4223). Retry after 1 second`);
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                throw error;
              }
            }
          };
        })
      } catch(e) {
        if (e instanceof SkipError) {
          if (e.missingPallets) {
            const skipMsg = `\tSkipping test '${fullTitle(t)}'.\n\tThe following pallets are missing:\n\t- ${e.missingPallets.join('\n\t- ')}`;
            console.warn('\x1b[38:5:208m%s\x1b[0m', skipMsg);
          } else {
            const skipMsg = `\tSkipping test '${fullTitle(t)}'.\n\tMessage:\n\t- ${e.message}`;
            console.warn('\x1b[38:5:208m%s\x1b[0m', skipMsg);
          }
        } else {
          throw e;
        }
      }
    }
  );
}

itEth.only = (...args: ItEthArgs) => {
  const [name, cb, opts] = args;
  const options = opts || { ...defaultOptions};
  options.only = true;
  itEth(name, cb, options);
};
itEth.skip = (...args: ItEthArgs) => {
  const [name, cb, opts] = args;
  const options = opts || { ...defaultOptions};
  options.skip = true;
  itEth(name, cb, options);
};
itEth.ifWithPallets = (name: string, requiredPallets: Pallets[], cb: (apis: { helper: EthUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => void | Promise<void>) => {
  itEth(name, cb, {requiredPallets, skip: false, only: false});
};

// export function itSchedEth(
//   name: string,
//   cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any,
//   opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {},
// ) {
//   itEth(name + ' (anonymous scheduling)', (apis) => cb('anon', apis), opts);
//   itEth(name + ' (named scheduling)', (apis) => cb('named', apis), opts);
// }
// itSchedEth.only = (name: string, cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itSchedEth(name, cb, {only: true});
// itSchedEth.skip = (name: string, cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: (seed: string | {filename: string}) => Promise<IKeyringPair> }) => any) => itSchedEth(name, cb, {skip: true});
// itSchedEth.ifWithPallets = itSchedIfWithPallets;

// function itSchedIfWithPallets(name: string, required: string[], cb: (schedKind: SchedKind, apis: { helper: EthUniqueHelper, privateKey: PrivateKeyFn }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
//   return itSchedEth(name, cb, {requiredPallets: required, ...opts});
// }
