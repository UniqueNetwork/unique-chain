// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import * as crypto from 'crypto';
import {IKeyringPair} from '@polkadot/types/types/interfaces';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import {Context} from 'mocha';
import config from '../config';
import {ChainHelperBase} from './playgrounds/unique';
import {ILogger} from './playgrounds/types';
import {DevUniqueHelper, SilentLogger, SilentConsole, DevMoonbeamHelper, DevMoonriverHelper, DevAcalaHelper, DevKaruraHelper, DevRelayHelper, DevWestmintHelper, DevStatemineHelper, DevStatemintHelper, DevAstarHelper, DevShidenHelper, DevPolkadexHelper} from './playgrounds/unique.dev';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

chai.config.truncateThreshold = 0;
chai.use(chaiAsPromised);
chai.use(chaiSubset);
export const expect = chai.expect;

const getTestHash = (filename: string) => crypto.createHash('md5').update(filename).digest('hex');

export const getTestSeed = (filename: string) => `//Alice+${getTestHash(filename)}`;

async function usingPlaygroundsGeneral<T extends ChainHelperBase, R = void>(
  helperType: new (logger: ILogger) => T,
  url: string,
  code: (helper: T, privateKey: (seed: string | { filename?: string, url?: string, ignoreFundsPresence?: boolean }) => Promise<IKeyringPair>) => Promise<R>,
): Promise<R> {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new helperType(new SilentLogger());
  let result;
  try {
    await helper.connect(url);
    const ss58Format = helper.chain.getChainProperties().ss58Format;
    const privateKey = async (seed: string | {filename?: string, url?: string, ignoreFundsPresence?: boolean}) => {
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
      // here's to hoping that no
      if(!seed.ignoreFundsPresence && ((helper as any)['balance'] == undefined || await (helper as any).balance.getSubstrate(account.address) < MINIMUM_DONOR_FUND)) {
        console.warn(`${path.basename(seed.filename)}: Not enough funds present on the filename account. Using the default one as the donor instead.`);
        account = helper.util.fromSeed('//Alice', ss58Format);
      }
      return account;
    };
    result = await code(helper, privateKey);
  }
  catch (e) {
    console.log(e);
    throw e;
  }
  finally {
    await helper.disconnect();
    silentConsole.disable();
  }
  return result as any as R;
}

export const usingPlaygrounds = <R = void>(code: (helper: DevUniqueHelper, privateKey: (seed: string | {filename?: string, url?: string, ignoreFundsPresence?: boolean}) => Promise<IKeyringPair>) => Promise<R>, url: string = config.substrateUrl) => usingPlaygroundsGeneral<DevUniqueHelper, R>(DevUniqueHelper, url, code);

export const usingWestmintPlaygrounds = (url: string, code: (helper: DevWestmintHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevWestmintHelper>(DevWestmintHelper, url, code);

export const usingStateminePlaygrounds = (url: string, code: (helper: DevWestmintHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevStatemineHelper>(DevWestmintHelper, url, code);

export const usingStatemintPlaygrounds = (url: string, code: (helper: DevWestmintHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevStatemintHelper>(DevWestmintHelper, url, code);

export const usingRelayPlaygrounds = (url: string, code: (helper: DevRelayHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevRelayHelper>(DevRelayHelper, url, code);

export const usingAcalaPlaygrounds = (url: string, code: (helper: DevAcalaHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevAcalaHelper>(DevAcalaHelper, url, code);

export const usingKaruraPlaygrounds = (url: string, code: (helper: DevKaruraHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevKaruraHelper>(DevAcalaHelper, url, code);

export const usingMoonbeamPlaygrounds = (url: string, code: (helper: DevMoonbeamHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevMoonbeamHelper>(DevMoonbeamHelper, url, code);

export const usingMoonriverPlaygrounds = (url: string, code: (helper: DevMoonbeamHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevMoonriverHelper>(DevMoonriverHelper, url, code);

export const usingAstarPlaygrounds = (url: string, code: (helper: DevAstarHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevAstarHelper>(DevAstarHelper, url, code);

export const usingShidenPlaygrounds = (url: string, code: (helper: DevShidenHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevShidenHelper>(DevShidenHelper, url, code);

export const usingPolkadexPlaygrounds = (url: string, code: (helper: DevPolkadexHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>) => usingPlaygroundsGeneral<DevPolkadexHelper>(DevPolkadexHelper, url, code);

export const MINIMUM_DONOR_FUND = 4_000_000n;
export const DONOR_FUNDING = 4_000_000n;

// App-promotion periods:
export const LOCKING_PERIOD = 12; // 12 blocks of relay
export const UNLOCKING_PERIOD = 6; // 6 blocks of parachain

// Native contracts
export const COLLECTION_HELPER = '0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f';
export const CONTRACT_HELPER = '0x842899ECF380553E8a4de75bF534cdf6fBF64049';

export enum Pallets {
  Inflation = 'inflation',
  ReFungible = 'refungible',
  Fungible = 'fungible',
  NFT = 'nonfungible',
  Scheduler = 'scheduler',
  UniqueScheduler = 'uniqueScheduler',
  AppPromotion = 'apppromotion',
  CollatorSelection = 'collatorselection',
  Session = 'session',
  Identity = 'identity',
  Democracy = 'democracy',
  Council = 'council',
  //CouncilMembership = 'councilmembership',
  TechnicalCommittee = 'technicalcommittee',
  Fellowship = 'fellowshipcollective',
  Preimage = 'preimage',
  Maintenance = 'maintenance',
  TestUtils = 'testutils',
}

export function requirePalletsOrSkip(test: Context, helper: DevUniqueHelper, requiredPallets: readonly string[]) {
  const missingPallets = helper.fetchMissingPalletNames(requiredPallets);

  if(missingPallets.length > 0) {
    const skipMsg = `\tSkipping test '${test.test?.title}'.\n\tThe following pallets are missing:\n\t- ${missingPallets.join('\n\t- ')}`;
    console.warn('\x1b[38:5:208m%s\x1b[0m', skipMsg);
    test.skip();
  }
}

export function itSub(name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: readonly string[] } = {}) {
  (opts.only ? it.only :
    opts.skip ? it.skip : it)(name, async function () {
    await usingPlaygrounds(async (helper, privateKey) => {
      if(opts.requiredPallets) {
        requirePalletsOrSkip(this, helper, opts.requiredPallets);
      }

      await cb({helper, privateKey});
    });
  });
}
export function itSubIfWithPallet(name: string, required: readonly string[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: readonly string[] } = {}) {
  return itSub(name, cb, {requiredPallets: required, ...opts});
}
itSub.only = (name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSub(name, cb, {only: true});
itSub.skip = (name: string, cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSub(name, cb, {skip: true});

itSubIfWithPallet.only = (name: string, required: readonly string[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSubIfWithPallet(name, required, cb, {only: true});
itSubIfWithPallet.skip = (name: string, required: readonly string[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSubIfWithPallet(name, required, cb, {skip: true});
itSub.ifWithPallets = itSubIfWithPallet;

export type SchedKind = 'anon' | 'named';

export function itSched(
  name: string,
  cb: (schedKind: SchedKind, apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any,
  opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {},
) {
  itSub(name + ' (anonymous scheduling)', (apis) => cb('anon', apis), opts);
  itSub(name + ' (named scheduling)', (apis) => cb('named', apis), opts);
}
itSched.only = (name: string, cb: (schedKind: SchedKind, apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSched(name, cb, {only: true});
itSched.skip = (name: string, cb: (schedKind: SchedKind, apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any) => itSched(name, cb, {skip: true});
itSched.ifWithPallets = itSchedIfWithPallets;

function itSchedIfWithPallets(name: string, required: string[], cb: (schedKind: SchedKind, apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => any, opts: { only?: boolean, skip?: boolean, requiredPallets?: string[] } = {}) {
  return itSched(name, cb, {requiredPallets: required, ...opts});
}

export function describeXCM(title: string, fn: (this: Mocha.Suite) => void, opts: {skip?: boolean} = {}) {
  (process.env.RUN_XCM_TESTS && !opts.skip
    ? describe
    : describe.skip)(title, fn);
}

describeXCM.skip = (name: string, fn: (this: Mocha.Suite) => void) => describeXCM(name, fn, {skip: true});

export function describeGov(title: string, fn: (this: Mocha.Suite) => void, opts: {skip?: boolean} = {}) {
  (process.env.RUN_GOV_TESTS && !opts.skip
    ? describe
    : describe.skip)(title, fn);
}

describeGov.skip = (name: string, fn: (this: Mocha.Suite) => void) => describeGov(name, fn, {skip: true});

export function sizeOfInt(i: number) {
  if(i < 0 || i > 0xffffffff) throw new Error('out of range');
  if(i < 0b11_1111) {
    return 1;
  } else if(i < 0b11_1111_1111_1111) {
    return 2;
  } else if(i < 0b11_1111_1111_1111_1111_1111_1111_1111) {
    return 4;
  } else {
    return 5;
  }
}

const UTF8_ENCODER = new TextEncoder();
export function sizeOfEncodedStr(v: string) {
  const encoded = UTF8_ENCODER.encode(v);
  return sizeOfInt(encoded.length) + encoded.length;
}

export function sizeOfProperty(prop: {key: string, value: string}) {
  return sizeOfEncodedStr(prop.key) + sizeOfEncodedStr(prop.value);
}

export function makeNames(url: string) {
  const filename = fileURLToPath(url);
  return {
    filename,
    dirname: dirname(filename),
  };
}
