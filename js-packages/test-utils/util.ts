// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type {IKeyringPair} from '@polkadot/types/types/interfaces';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import config from '../tests/config.ts';
import {ChainHelperBase} from '@unique-nft/playgrounds/unique';
import type {ILogger} from '@unique-nft/playgrounds/types';
import {DevUniqueHelper, SilentLogger, SilentConsole, DevMoonbeamHelper, DevMoonriverHelper, DevAcalaHelper, DevKaruraHelper, DevRelayHelper, DevWestmintHelper, DevStatemineHelper, DevStatemintHelper, DevAstarHelper, DevShidenHelper, DevHydraDxHelper} from '@unique/test-utils';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  afterEach as afterEachBdd,
  beforeEach as beforeEachBdd,
  describe as describeBdd,
  before as beforeBdd,
  after as afterBdd,
  it,
  DescribeArgs,
  TestSuite,
} from "@std/testing/bdd";
import {
  configureGlobalSanitizers,
  type ConfigureGlobalSanitizersOptions
} from "@std/testing/unstable-bdd";
import process from "node:process";

chai.config.truncateThreshold = 0;
chai.use(chaiAsPromised);
chai.use(chaiSubset);
export const expect = chai.expect;

const getTestHash = (filename: string) => crypto.createHash('md5').update(filename).digest('hex');

export const getTestSeed = (filename: string) => `//Alice+${getTestHash(filename)}`;

async function usingPlaygroundsGeneral<T extends ChainHelperBase, R = void>(
  helperType: new (logger: ILogger) => T,
  url: string,
  code: (helper: T, privateKey: (seed: string | { filename?: string, url?: string, ignoreFundsPresence?: boolean }) => Promise<IKeyringPair>) => Promise<R> | R,
): Promise<R> {
  const silentConsole = new SilentConsole();
  silentConsole.enable();

  const helper = new helperType(new SilentLogger());
  let result: R;
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
    const resultOrPromise = code(helper, privateKey);
    if (resultOrPromise instanceof Promise)
      result = await resultOrPromise;
    else
      result = resultOrPromise;
  }
  finally {
    await helper.disconnect();
    silentConsole.disable();
  }
  return result;
}

export const usingPlaygrounds = <R = void>(code: (helper: DevUniqueHelper, privateKey: (seed: string | {filename?: string, url?: string, ignoreFundsPresence?: boolean}) => Promise<IKeyringPair>) => Promise<R> | R, url: string = config.substrateUrl) => usingPlaygroundsGeneral<DevUniqueHelper, R>(DevUniqueHelper, url, code);

export const usingWestendAssetHubPlaygrounds = (code: (helper: DevWestmintHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.westendAssetHubUrl) => usingPlaygroundsGeneral<DevWestmintHelper>(DevWestmintHelper, url, code);

export const usingKusamaAssetHubPlaygrounds = (code: (helper: DevWestmintHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.kusamaAssetHubUrl) => usingPlaygroundsGeneral<DevStatemineHelper>(DevWestmintHelper, url, code);

export const usingPolkadotAssetHubPlaygrounds = (code: (helper: DevWestmintHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.polkadotAssetHubUrl) => usingPlaygroundsGeneral<DevStatemintHelper>(DevWestmintHelper, url, code);

export const usingRelayPlaygrounds = (code: (helper: DevRelayHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.relayUrl) => usingPlaygroundsGeneral<DevRelayHelper>(DevRelayHelper, url, code);

export const usingAcalaPlaygrounds = (code: (helper: DevAcalaHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.acalaUrl) => usingPlaygroundsGeneral<DevAcalaHelper>(DevAcalaHelper, url, code);

export const usingKaruraPlaygrounds = (code: (helper: DevKaruraHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.karuraUrl) => usingPlaygroundsGeneral<DevKaruraHelper>(DevAcalaHelper, url, code);

export const usingMoonbeamPlaygrounds = (code: (helper: DevMoonbeamHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.moonbeamUrl) => usingPlaygroundsGeneral<DevMoonbeamHelper>(DevMoonbeamHelper, url, code);

export const usingMoonriverPlaygrounds = (code: (helper: DevMoonbeamHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.moonriverUrl) => usingPlaygroundsGeneral<DevMoonriverHelper>(DevMoonriverHelper, url, code);

export const usingAstarPlaygrounds = (code: (helper: DevAstarHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.astarUrl) => usingPlaygroundsGeneral<DevAstarHelper>(DevAstarHelper, url, code);

export const usingShidenPlaygrounds = (code: (helper: DevShidenHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.shidenUrl) => usingPlaygroundsGeneral<DevShidenHelper>(DevShidenHelper, url, code);

export const usingHydraDxPlaygrounds = (code: (helper: DevHydraDxHelper, privateKey: (seed: string) => Promise<IKeyringPair>) => Promise<void>, url: string = config.hydraDxUrl) => usingPlaygroundsGeneral<DevHydraDxHelper>(DevHydraDxHelper, url, code);

export const MINIMUM_DONOR_FUND = 4_000_000n;
export const DONOR_FUNDING = 4_000_000n;

// App-promotion periods:
export const LOCKING_PERIOD = 12n; // 12 blocks of relay
export const CALCULATION_PERIOD = 12n; // 12 blocks of parachain
export const UNLOCKING_PERIOD = 24n; // 24 blocks of parachain
export const INTERVAL_INCOME = 453_256n; // perbill

// Native contracts
export const COLLECTION_HELPER = '0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f';
export const CONTRACT_HELPER = '0x842899ECF380553E8a4de75bF534cdf6fBF64049';

export enum Pallets {
  Inflation = 'inflation',
  ReFungible = 'refungible',
  Fungible = 'fungible',
  NFT = 'nonfungible',
  Scheduler = 'scheduler',
  AppPromotion = 'apppromotion',
  CollatorSelection = 'collatorselection',
  Session = 'session',
  Identity = 'identity',
  Democracy = 'democracy',
  Council = 'council',
  CouncilMembership = 'councilmembership',
  TechnicalCommittee = 'technicalcommittee',
  Fellowship = 'fellowshipcollective',
  Preimage = 'preimage',
  Maintenance = 'maintenance',
  TestUtils = 'testutils',
}

configureGlobalSanitizers({
  sanitizeOps: false,
  sanitizeResources: false,
  sanitizeExit: true
} as ConfigureGlobalSanitizersOptions);

export type FixedDescribe = {
  (...args: DescribeArgs<UniqueTestContext>): TestSuite<UniqueTestContext>;
  only: (...args: DescribeArgs<UniqueTestContext>) => TestSuite<UniqueTestContext>;
  ignore: (...args: DescribeArgs<UniqueTestContext>) => TestSuite<UniqueTestContext>;
  skip: (...args: DescribeArgs<UniqueTestContext>) => void;
  ifRunGov: (...args: DescribeArgs<UniqueTestContext>) => TestSuite<UniqueTestContext>;
  ifRunXcm: (...args: DescribeArgs<UniqueTestContext>) => TestSuite<UniqueTestContext>;
  ifRunOcw: (...args: DescribeArgs<UniqueTestContext>) => TestSuite<UniqueTestContext>;
  ifRunCollators: (...args: DescribeArgs<UniqueTestContext>) => TestSuite<UniqueTestContext>;
};

// Create a new function object by rebinding methods
export const describe: FixedDescribe = Object.assign(
  (...args: DescribeArgs<UniqueTestContext>) => describeBdd<UniqueTestContext>(...args),
  {
    only: (...args: DescribeArgs<UniqueTestContext>) => describeBdd.only<UniqueTestContext>(...args),
    ignore: (...args: DescribeArgs<UniqueTestContext>) => describeBdd.ignore<UniqueTestContext>(...args),
    skip: (...args: DescribeArgs<UniqueTestContext>) => describeBdd.skip<UniqueTestContext>(...args),
    ifRunGov: (...args: DescribeArgs<UniqueTestContext>) => {
      return process.env.RUN_GOV_TESTS
        ? describeBdd<UniqueTestContext>(...args)
        : describeBdd.skip<UniqueTestContext>(...args);
    },
    ifRunXcm: (...args: DescribeArgs<UniqueTestContext>) => {
      return process.env.RUN_XCM_TESTS
        ? describeBdd<UniqueTestContext>(...args)
        : describeBdd.skip<UniqueTestContext>(...args);
    },
    ifRunOcw: (...args: DescribeArgs<UniqueTestContext>) => {
      return process.env.RUN_OCW_TESTS
        ? describeBdd<UniqueTestContext>(...args)
        : describeBdd.skip<UniqueTestContext>(...args);
    },
    ifRunCollators: (...args: DescribeArgs<UniqueTestContext>) => {
      return process.env.RUN_COLLATOR_TESTS
        ? describeBdd<UniqueTestContext>(...args)
        : describeBdd.skip<UniqueTestContext>(...args);
    },
  }
);

export const before = (fn: (this: UniqueTestContext) => void | Promise<void>) => {
  beforeBdd<UniqueTestContext>(wrapBddFunctionCallback(fn));
}

export const after = (fn: (this: UniqueTestContext) => void | Promise<void>) => {
  afterBdd<UniqueTestContext>(wrapBddFunctionCallback(fn));
}

export const beforeEach = (fn: (this: UniqueTestContext) => void | Promise<void>) => {
  beforeEachBdd<UniqueTestContext>(wrapBddFunctionCallback(fn));
}

export const afterEach = (fn: (this: UniqueTestContext) => void | Promise<void>) => {
  afterEachBdd<UniqueTestContext>(wrapBddFunctionCallback(fn));
}

function wrapBddFunctionCallback(cb: (this: UniqueTestContext) => void | Promise<void>): (this: UniqueTestContext) => void | Promise<void> {
  return function (this: UniqueTestContext): void | Promise<void> {
    if (!(this instanceof UniqueTestContext)) {
      const ctx = new UniqueTestContext();
      Object.assign(this, ctx);
      Object.setPrototypeOf(this, Object.getPrototypeOf(ctx));
    }
    try {
      const result =  cb.call(this);
      if (result instanceof Promise) {
        return result.catch((e) => {
          handleSkipError(this, e);
        });
      }
      return result;
    } catch (e) {
      handleSkipError(this, e);
    }
  }
}

function handleSkipError(ctx:UniqueTestContext, e) {
  if (e instanceof SkipError) {
    ctx.missingPallets = e.missingPallets;
    ctx.skipMessage = e.message;
  } else {
    throw e;
  }
}

export function requirePalletsOrSkip(helper: DevUniqueHelper, requiredPallets: readonly Pallets[]) {
  const missingPallets = helper.fetchMissingPalletNames(requiredPallets);
  if(missingPallets.length > 0) {
    throw new SkipError(missingPallets);
  }
}

export class SkipError {
  public missingPallets: string[] | undefined;
  public message: string | undefined;
  constructor(missingPalletsOrMessage: string[] | string) {
    if (typeof missingPalletsOrMessage === "string")
      this.message = missingPalletsOrMessage;
    else
      this.missingPallets = missingPalletsOrMessage;
  }
}

export function fullTitle(t: Deno.TestContext, suffix?: string): string {
  let title: string;
  if (suffix)
    title = `${t.name} ${suffix}`;
  else
    title = t.name;
  if (!t.parent)
    return title;
  else
    return fullTitle(t.parent, title);
}

export type ItSubArgs = [
  name: string,
  cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => void | Promise<void>,
  opts: {skip: boolean, only: boolean, requiredPallets?: readonly Pallets[]}
] | [
  name: string,
  cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => void | Promise<void>,
];


export interface itSub {
  (...args: ItSubArgs): void;
  only(...args: ItSubArgs): void;
  skip(...args: ItSubArgs): void;
}

const defaultOptions = {
  skip: false,
  only: false,
  requiredPallets: undefined
}; 

export function itSub(...args: ItSubArgs) {
  const [name, cb, options] = args;
  
  const opts = options || defaultOptions;
  (opts.only ? it.only<UniqueTestContext> :
    opts.skip ? it.skip<UniqueTestContext> : it<UniqueTestContext>)(name, async function (t) {
    try {
      if (this.missingPallets)
        throw new SkipError(this.missingPallets);
      if (this.skipMessage)
        throw new SkipError(this.skipMessage);
      await usingPlaygrounds(async (helper, privateKey) => {
        if(opts.requiredPallets) {
          requirePalletsOrSkip(helper, opts.requiredPallets);
        }
        await cb({helper, privateKey});
      });
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
  });
}

itSub.only = (...args: ItSubArgs) => {
  const [name, cb, opts] = args;
  const options = opts || { ...defaultOptions};
  options.only = true;
  itSub(name, cb, options);
};
itSub.skip = (...args: ItSubArgs) => {
  const [name, cb, opts] = args;
  const options = opts || { ...defaultOptions};
  options.skip = true;
  itSub(name, cb, options);
};
itSub.ifWithPallets = (name: string, requiredPallets: readonly Pallets[], cb: (apis: { helper: DevUniqueHelper, privateKey: (seed: string) => Promise<IKeyringPair> }) => void | Promise<void>) => {
  itSub(name, cb, {requiredPallets, skip: false, only: false});
};

export class UniqueTestContext {
  public missingPallets: string[] | undefined;
  public skipMessage: string | undefined;

  public skip(message: string) {
    throw new SkipError(message);
  }
}

export type SchedKind = 'anon' | 'named';

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
