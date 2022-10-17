// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import * as crypto from 'crypto';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Context} from 'mocha';
import config from '../config';
import {ChainHelperBase} from './playgrounds/unique';
import {ILogger} from './playgrounds/types';
import {DevUniqueHelper, SilentLogger, SilentConsole, DevMoonbeamHelper, DevMoonriverHelper, DevAcalaHelper, DevKaruraHelper, DevRelayHelper, DevWestmintHelper} from './playgrounds/unique.dev';

chai.use(chaiAsPromised);
export const expect = chai.expect;

const getTestHash = (filename: string) => {
  return crypto.createHash('md5').update(filename).digest('hex');
};

export const getTestSeed = (filename: string) => {
  return `//Alice+${getTestHash(filename)}`;
};

async function usingPlaygroundsGeneral<T extends ChainHelperBase>(helperType: new(logger: ILogger) => T, url: string, code: (helper: T, privateKey: (seed: string | {filename: string, ignoreFundsPresence?: boolean}) => Promise<IKeyringPair>) => Promise<void>) {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new helperType(new SilentLogger());

  try {
    await helper.connect(url);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey = async (seed: string | {filename: string, ignoreFundsPresence?: boolean}) => {
      if (typeof seed === 'string') {
        return helper.util.fromSeed(seed, ss58Format);
      }
      else {
        const actualSeed = getTestSeed(seed.filename);
        let account = helper.util.fromSeed(actualSeed, ss58Format);
        // here's to hoping that no 
        if (!seed.ignoreFundsPresence && ((helper as any)['balance'] == undefined || await (helper as any).balance.getSubstrate(account.address) < MINIMUM_DONOR_FUND)) {
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
}

export const usingPlaygrounds = (code: (helper: DevUniqueHelper, privateKey: (seed: string | {filename: string, ignoreFundsPresence?: boolean}) => Promise<IKeyringPair>) => Promise<void>, url: string = config.substrateUrl) => {
  return usingPlaygroundsGeneral<DevUniqueHelper>(DevUniqueHelper, url, code);
};

export const usingWestmintPlaygrounds = async (url: string, code: (helper: DevWestmintHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => {
  return usingPlaygroundsGeneral<DevWestmintHelper>(DevWestmintHelper, url, code);
};

export const usingRelayPlaygrounds = async (url: string, code: (helper: DevRelayHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => {
  return usingPlaygroundsGeneral<DevRelayHelper>(DevRelayHelper, url, code);
};

export const usingAcalaPlaygrounds = async (url: string, code: (helper: DevAcalaHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => {
  return usingPlaygroundsGeneral<DevAcalaHelper>(DevAcalaHelper, url, code);
};

export const usingKaruraPlaygrounds = async (url: string, code: (helper: DevKaruraHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => {
  return usingPlaygroundsGeneral<DevKaruraHelper>(DevAcalaHelper, url, code);
};

export const usingMoonbeamPlaygrounds = async (url: string, code: (helper: DevMoonbeamHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => {
  return usingPlaygroundsGeneral<DevMoonbeamHelper>(DevMoonbeamHelper, url, code);
};

export const usingMoonriverPlaygrounds = async (url: string, code: (helper: DevMoonbeamHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => {
  return usingPlaygroundsGeneral<DevMoonriverHelper>(DevMoonriverHelper, url, code);
};

export const MINIMUM_DONOR_FUND = 100_000n;
export const DONOR_FUNDING = 1_000_000n;

export enum Pallets {
  Inflation = 'inflation',
  RmrkCore = 'rmrkcore',
  RmrkEquip = 'rmrkequip',
  ReFungible = 'refungible',
  Fungible = 'fungible',
  NFT = 'nonfungible',
  Scheduler = 'scheduler',
  AppPromotion = 'apppromotion',
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

export async function describeXCM(title: string, fn: (this: Mocha.Suite) => void, opts: {skip?: boolean} = {}) {
  (process.env.RUN_XCM_TESTS && !opts.skip
    ? describe
    : describe.skip)(title, fn);
}

describeXCM.skip = (name: string, fn: (this: Mocha.Suite) => void) => describeXCM(name, fn, {skip: true});
