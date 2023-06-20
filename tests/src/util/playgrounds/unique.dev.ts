// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {stringToU8a} from '@polkadot/util';
import {blake2AsHex, encodeAddress, mnemonicGenerate} from '@polkadot/util-crypto';
import {UniqueHelper, MoonbeamHelper, ChainHelperBase, AcalaHelper, RelayHelper, WestmintHelper, AstarHelper} from './unique';
import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import * as defs from '../../interfaces/definitions';
import {IKeyringPair} from '@polkadot/types/types';
import {EventRecord} from '@polkadot/types/interfaces';
import {ICrossAccountId, IPovInfo, TSigner} from './types';
import {FrameSystemEventRecord, XcmV2TraitsError} from '@polkadot/types/lookup';
import {VoidFn} from '@polkadot/api/types';
import {Pallets} from '..';
import {spawnSync} from 'child_process';

export class SilentLogger {
  log(_msg: any, _level: any): void { }
  level = {
    ERROR: 'ERROR' as const,
    WARNING: 'WARNING' as const,
    INFO: 'INFO' as const,
  };
}

export class SilentConsole {
  // TODO: Remove, this is temporary: Filter unneeded API output
  // (Jaco promised it will be removed in the next version)
  consoleErr: any;
  consoleLog: any;
  consoleWarn: any;

  constructor() {
    this.consoleErr = console.error;
    this.consoleLog = console.log;
    this.consoleWarn = console.warn;
  }

  enable() {
    const outFn = (printer: any) => (...args: any[]) => {
      for(const arg of args) {
        if(typeof arg !== 'string')
          continue;
        if(arg.includes('1000:: Normal connection closure') || arg.includes('Not decorating unknown runtime apis:') || arg.includes('RPC methods not decorated:') || arg === 'Normal connection closure')
          return;
      }
      printer(...args);
    };

    console.error = outFn(this.consoleErr.bind(console));
    console.log = outFn(this.consoleLog.bind(console));
    console.warn = outFn(this.consoleWarn.bind(console));
  }

  disable() {
    console.error = this.consoleErr;
    console.log = this.consoleLog;
    console.warn = this.consoleWarn;
  }
}

export interface IEventHelper {
  section(): string;

  method(): string;

  bindEventRecord(e: FrameSystemEventRecord): void;

  raw(): FrameSystemEventRecord;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function EventHelper(section: string, method: string) {
  return class implements IEventHelper {
    eventRecord: FrameSystemEventRecord | null;
    _section: string;
    _method: string;

    constructor() {
      this.eventRecord = null;
      this._section = section;
      this._method = method;
    }

    section(): string {
      return this._section;
    }

    method(): string {
      return this._method;
    }

    bindEventRecord(e: FrameSystemEventRecord) {
      this.eventRecord = e;
    }

    raw() {
      return this.eventRecord!;
    }

    eventJsonData<T = any>(index: number) {
      return this.raw().event.data[index].toJSON() as T;
    }

    eventData<T>(index: number) {
      return this.raw().event.data[index] as T;
    }
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function EventSection(section: string) {
  return class Section {
    static section = section;

    static Method(name: string) {
      return EventHelper(Section.section, name);
    }
  };
}

export class Event {
  static Democracy = class extends EventSection('democracy') {
    static Started = class extends this.Method('Started') {
      referendumIndex() {
        return this.eventJsonData<number>(0);
      }

      threshold() {
        return this.eventJsonData(1);
      }
    };

    static Voted = class extends this.Method('Voted') {
      voter() {
        return this.eventJsonData(0);
      }

      referendumIndex() {
        return this.eventJsonData<number>(1);
      }

      vote() {
        return this.eventJsonData(2);
      }
    };

    static Passed = class extends this.Method('Passed') {
      referendumIndex() {
        return this.eventJsonData<number>(0);
      }
    };
  };

  static Scheduler = class extends EventSection('scheduler') {
    static PriorityChanged = class extends this.Method('PriorityChanged') {
      task() {
        return this.eventJsonData(0);
      }

      priority() {
        return this.eventJsonData(1);
      }
    };
  };

  static XcmpQueue = class extends EventSection('xcmpQueue') {
    static XcmpMessageSent = class extends this.Method('XcmpMessageSent') {
      messageHash() {
        return this.eventJsonData(0);
      }
    };

    static Fail = class extends this.Method('Fail') {
      messageHash() {
        return this.eventJsonData(0);
      }

      outcome() {
        return this.eventData<XcmV2TraitsError>(1);
      }
    };
  };
}

export class DevUniqueHelper extends UniqueHelper {
  /**
   * Arrange methods for tests
   */
  arrange: ArrangeGroup;
  wait: WaitGroup;
  admin: AdminGroup;
  session: SessionGroup;
  testUtils: TestUtilGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevUniqueHelper;

    super(logger, options);
    this.arrange = new ArrangeGroup(this);
    this.wait = new WaitGroup(this);
    this.admin = new AdminGroup(this);
    this.testUtils = new TestUtilGroup(this);
    this.session = new SessionGroup(this);
  }

  async connect(wsEndpoint: string, _listeners?: any): Promise<void> {
    const wsProvider = new WsProvider(wsEndpoint);
    this.api = new ApiPromise({
      provider: wsProvider,
      signedExtensions: {
        ContractHelpers: {
          extrinsic: {},
          payload: {},
        },
        CheckMaintenance: {
          extrinsic: {},
          payload: {},
        },
        DisableIdentityCalls: {
          extrinsic: {},
          payload: {},
        },
        FakeTransactionFinalizer: {
          extrinsic: {},
          payload: {},
        },
      },
      rpc: {
        unique: defs.unique.rpc,
        appPromotion: defs.appPromotion.rpc,
        povinfo: defs.povinfo.rpc,
        eth: {
          feeHistory: {
            description: 'Dummy',
            params: [],
            type: 'u8',
          },
          maxPriorityFeePerGas: {
            description: 'Dummy',
            params: [],
            type: 'u8',
          },
        },
      },
    });
    await this.api.isReadyOrError;
    this.network = await UniqueHelper.detectNetwork(this.api);
    this.wsEndpoint = wsEndpoint;
  }
}

export class DevRelayHelper extends RelayHelper {
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevRelayHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
}

export class DevWestmintHelper extends WestmintHelper {
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevWestmintHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
}

export class DevStatemineHelper extends DevWestmintHelper {}

export class DevStatemintHelper extends DevWestmintHelper {}

export class DevMoonbeamHelper extends MoonbeamHelper {
  account: MoonbeamAccountGroup;
  wait: WaitGroup;
  fastDemocracy: MoonbeamFastDemocracyGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevMoonbeamHelper;
    options.notePreimagePallet = options.notePreimagePallet ?? 'preimage';

    super(logger, options);
    this.account = new MoonbeamAccountGroup(this);
    this.wait = new WaitGroup(this);
    this.fastDemocracy = new MoonbeamFastDemocracyGroup(this);
  }
}

export class DevMoonriverHelper extends DevMoonbeamHelper {
  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.notePreimagePallet = options.notePreimagePallet ?? 'preimage';
    super(logger, options);
  }
}

export class DevAstarHelper extends AstarHelper {
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevAstarHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
}

export class DevShidenHelper extends AstarHelper {
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevShidenHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
}

export class DevAcalaHelper extends AcalaHelper {
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevAcalaHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
}

export class DevKaruraHelper extends DevAcalaHelper {}

export class ArrangeGroup {
  helper: DevUniqueHelper;

  scheduledIdSlider = 0;

  constructor(helper: DevUniqueHelper) {
    this.helper = helper;
  }

  /**
   * Generates accounts with the specified UNQ token balance
   * @param balances balances for generated accounts. Each balance will be multiplied by the token nominal.
   * @param donor donor account for balances
   * @returns array of newly created accounts
   * @example const [acc1, acc2, acc3] = await createAccounts([0n, 10n, 20n], donor);
   */
  createAccounts = async (balances: bigint[], donor: IKeyringPair): Promise<IKeyringPair[]> => {
    let nonce = await this.helper.chain.getNonce(donor.address);
    const wait = new WaitGroup(this.helper);
    const ss58Format = this.helper.chain.getChainProperties().ss58Format;
    const tokenNominal = this.helper.balance.getOneTokenNominal();
    const transactions = [];
    const accounts: IKeyringPair[] = [];
    for(const balance of balances) {
      const recipient = this.helper.util.fromSeed(mnemonicGenerate(), ss58Format);
      accounts.push(recipient);
      if(balance !== 0n) {
        const tx = this.helper.constructApiCall('api.tx.balances.transfer', [{Id: recipient.address}, balance * tokenNominal]);
        transactions.push(this.helper.signTransaction(donor, tx, {nonce, era: 0}, 'account generation'));
        nonce++;
      }
    }

    await Promise.all(transactions).catch(_e => {});

    //#region TODO remove this region, when nonce problem will be solved
    const checkBalances = async () => {
      let isSuccess = true;
      for(let i = 0; i < balances.length; i++) {
        const balance = await this.helper.balance.getSubstrate(accounts[i].address);
        if(balance !== balances[i] * tokenNominal) {
          isSuccess = false;
          break;
        }
      }
      return isSuccess;
    };

    let accountsCreated = false;
    const maxBlocksChecked = await this.helper.arrange.isDevNode() ? 50 : 5;
    // checkBalances retry up to 5-50 blocks
    for(let index = 0; index < maxBlocksChecked; index++) {
      accountsCreated = await checkBalances();
      if(accountsCreated) break;
      await wait.newBlocks(1);
    }

    if(!accountsCreated) throw Error('Accounts generation failed');
    //#endregion

    return accounts;
  };

  // TODO combine this method and createAccounts into one
  createCrowd = async (accountsToCreate: number, withBalance: bigint, donor: IKeyringPair): Promise<IKeyringPair[]> => {
    const createAsManyAsCan = async () => {
      let transactions: any = [];
      const accounts: IKeyringPair[] = [];
      let nonce = await this.helper.chain.getNonce(donor.address);
      const tokenNominal = this.helper.balance.getOneTokenNominal();
      const ss58Format = this.helper.chain.getChainProperties().ss58Format;
      for(let i = 0; i < accountsToCreate; i++) {
        if(i === 500) { // if there are too many accounts to create
          await Promise.allSettled(transactions); // wait while first 500 (should be 100 for devnode) tx will be settled
          transactions = []; //
          nonce = await this.helper.chain.getNonce(donor.address); // update nonce
        }
        const recipient = this.helper.util.fromSeed(mnemonicGenerate(), ss58Format);
        accounts.push(recipient);
        if(withBalance !== 0n) {
          const tx = this.helper.constructApiCall('api.tx.balances.transfer', [{Id: recipient.address}, withBalance * tokenNominal]);
          transactions.push(this.helper.signTransaction(donor, tx, {nonce}, 'account generation'));
          nonce++;
        }
      }

      const fullfilledAccounts = [];
      await Promise.allSettled(transactions);
      for(const account of accounts) {
        const accountBalance = await this.helper.balance.getSubstrate(account.address);
        if(accountBalance === withBalance * tokenNominal) {
          fullfilledAccounts.push(account);
        }
      }
      return fullfilledAccounts;
    };


    const crowd: IKeyringPair[] = [];
    // do up to 5 retries
    for(let index = 0; index < 5 && accountsToCreate !== 0; index++) {
      const asManyAsCan = await createAsManyAsCan();
      crowd.push(...asManyAsCan);
      accountsToCreate -= asManyAsCan.length;
    }

    if(accountsToCreate !== 0) throw Error(`Crowd generation failed: ${accountsToCreate} accounts left`);

    return crowd;
  };

  isDevNode = async () => {
    let blockNumber = (await this.helper.callRpc('api.query.system.number')).toJSON();
    if(blockNumber == 0) {
      await this.helper.wait.newBlocks(1);
      blockNumber = (await this.helper.callRpc('api.query.system.number')).toJSON();
    }
    const block2 = await this.helper.callRpc('api.rpc.chain.getBlock', [await this.helper.callRpc('api.rpc.chain.getBlockHash', [blockNumber])]);
    const block1 = await this.helper.callRpc('api.rpc.chain.getBlock', [await this.helper.callRpc('api.rpc.chain.getBlockHash', [blockNumber - 1])]);
    const findCreationDate = (block: any) => {
      const humanBlock = block.toHuman();
      let date;
      humanBlock.block.extrinsics.forEach((ext: any) => {
        if(ext.method.section === 'timestamp') {
          date = Number(ext.method.args.now.replaceAll(',', ''));
        }
      });
      return date;
    };
    const block1date = await findCreationDate(block1);
    const block2date = await findCreationDate(block2);
    if(block2date! - block1date! < 9000) return true;
  };

  async calculcateFee(payer: ICrossAccountId, promise: () => Promise<any>): Promise<bigint> {
    const address = 'Substrate' in payer ? payer.Substrate : this.helper.address.ethToSubstrate(payer.Ethereum);
    let balance = await this.helper.balance.getSubstrate(address);

    await promise();

    balance -= await this.helper.balance.getSubstrate(address);

    return balance;
  }

  async calculatePoVInfo(txs: any[]): Promise<IPovInfo> {
    const rawPovInfo = await this.helper.callRpc('api.rpc.povinfo.estimateExtrinsicPoV', [txs]);

    const kvJson: {[key: string]: string} = {};

    for(const kv of rawPovInfo.keyValues) {
      kvJson[kv.key.toHex()] = kv.value.toHex();
    }

    const kvStr = JSON.stringify(kvJson);

    const chainql = spawnSync(
      'chainql',
      [
        `--tla-code=data=${kvStr}`,
        '-e', `function(data) cql.dump(cql.chain("${this.helper.getEndpoint()}").latest._meta, data, {omit_empty:true})`,
      ],
    );

    if(!chainql.stdout) {
      throw Error('unable to get an output from the `chainql`');
    }

    return {
      proofSize: rawPovInfo.proofSize.toNumber(),
      compactProofSize: rawPovInfo.compactProofSize.toNumber(),
      compressedProofSize: rawPovInfo.compressedProofSize.toNumber(),
      results: rawPovInfo.results,
      kv: JSON.parse(chainql.stdout.toString()),
    };
  }

  calculatePalletAddress(palletId: any) {
    const address = stringToU8a(('modl' + palletId).padEnd(32, '\0'));
    return encodeAddress(address, this.helper.chain.getChainProperties().ss58Format);
  }

  makeScheduledIds(num: number): string[] {
    function makeId(slider: number) {
      const scheduledIdSize = 64;
      const hexId = slider.toString(16);
      const prefixSize = scheduledIdSize - hexId.length;

      const scheduledId = '0x' + '0'.repeat(prefixSize) + hexId;

      return scheduledId;
    }

    const ids = [];
    for(let i = 0; i < num; i++) {
      ids.push(makeId(this.scheduledIdSlider));
      this.scheduledIdSlider += 1;
    }

    return ids;
  }

  makeScheduledId(): string {
    return (this.makeScheduledIds(1))[0];
  }

  async captureEvents(eventSection: string, eventMethod: string): Promise<EventCapture> {
    const capture = new EventCapture(this.helper, eventSection, eventMethod);
    await capture.startCapture();

    return capture;
  }

  makeXcmProgramWithdrawDeposit(beneficiary: Uint8Array, id: any, amount: bigint) {
    return {
      V2: [
        {
          WithdrawAsset: [
            {
              id,
              fun: {
                Fungible: amount,
              },
            },
          ],
        },
        {
          BuyExecution: {
            fees: {
              id,
              fun: {
                Fungible: amount,
              },
            },
            weightLimit: 'Unlimited',
          },
        },
        {
          DepositAsset: {
            assets: {
              Wild: 'All',
            },
            maxAssets: 1,
            beneficiary: {
              parents: 0,
              interior: {
                X1: {
                  AccountId32: {
                    network: 'Any',
                    id: beneficiary,
                  },
                },
              },
            },
          },
        },
      ],
    };
  }

  makeXcmProgramReserveAssetDeposited(beneficiary: Uint8Array, id: any, amount: bigint) {
    return {
      V2: [
        {
          ReserveAssetDeposited: [
            {
              id,
              fun: {
                Fungible: amount,
              },
            },
          ],
        },
        {
          BuyExecution: {
            fees: {
              id,
              fun: {
                Fungible: amount,
              },
            },
            weightLimit: 'Unlimited',
          },
        },
        {
          DepositAsset: {
            assets: {
              Wild: 'All',
            },
            maxAssets: 1,
            beneficiary: {
              parents: 0,
              interior: {
                X1: {
                  AccountId32: {
                    network: 'Any',
                    id: beneficiary,
                  },
                },
              },
            },
          },
        },
      ],
    };
  }
}

class MoonbeamAccountGroup {
  helper: MoonbeamHelper;

  keyring: Keyring;
  _alithAccount: IKeyringPair;
  _baltatharAccount: IKeyringPair;
  _dorothyAccount: IKeyringPair;

  constructor(helper: MoonbeamHelper) {
    this.helper = helper;

    this.keyring = new Keyring({type: 'ethereum'});
    const alithPrivateKey = '0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133';
    const baltatharPrivateKey = '0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b';
    const dorothyPrivateKey = '0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68';

    this._alithAccount = this.keyring.addFromUri(alithPrivateKey, undefined, 'ethereum');
    this._baltatharAccount = this.keyring.addFromUri(baltatharPrivateKey, undefined, 'ethereum');
    this._dorothyAccount = this.keyring.addFromUri(dorothyPrivateKey, undefined, 'ethereum');
  }

  alithAccount() {
    return this._alithAccount;
  }

  baltatharAccount() {
    return this._baltatharAccount;
  }

  dorothyAccount() {
    return this._dorothyAccount;
  }

  create() {
    return this.keyring.addFromUri(mnemonicGenerate());
  }
}

class MoonbeamFastDemocracyGroup {
  helper: DevMoonbeamHelper;

  constructor(helper: DevMoonbeamHelper) {
    this.helper = helper;
  }

  async executeProposal(proposalDesciption: string, encodedProposal: string) {
    const proposalHash = blake2AsHex(encodedProposal);

    const alithAccount = this.helper.account.alithAccount();
    const baltatharAccount = this.helper.account.baltatharAccount();
    const dorothyAccount = this.helper.account.dorothyAccount();

    const councilVotingThreshold = 2;
    const technicalCommitteeThreshold = 2;
    const fastTrackVotingPeriod = 3;
    const fastTrackDelayPeriod = 0;

    console.log(`[democracy] executing '${proposalDesciption}' proposal`);

    // >>> Propose external motion through council >>>
    console.log('\t* Propose external motion through council.......');
    const externalMotion = this.helper.democracy.externalProposeMajority({Inline: encodedProposal});
    const encodedMotion = externalMotion?.method.toHex() || '';
    const motionHash = blake2AsHex(encodedMotion);
    console.log('\t* Motion hash is %s', motionHash);

    await this.helper.collective.council.propose(
      baltatharAccount,
      councilVotingThreshold,
      externalMotion,
      externalMotion.encodedLength,
    );

    const councilProposalIdx = await this.helper.collective.council.proposalCount() - 1;
    await this.helper.collective.council.vote(dorothyAccount, motionHash, councilProposalIdx, true);
    await this.helper.collective.council.vote(baltatharAccount, motionHash, councilProposalIdx, true);

    await this.helper.collective.council.close(
      dorothyAccount,
      motionHash,
      councilProposalIdx,
      {
        refTime: 1_000_000_000,
        proofSize: 1_000_000,
      },
      externalMotion.encodedLength,
    );
    console.log('\t* Propose external motion through council.......DONE');
    // <<< Propose external motion through council <<<

    // >>> Fast track proposal through technical committee >>>
    console.log('\t* Fast track proposal through technical committee.......');
    const fastTrack = this.helper.democracy.fastTrack(proposalHash, fastTrackVotingPeriod, fastTrackDelayPeriod);
    const encodedFastTrack = fastTrack?.method.toHex() || '';
    const fastTrackHash = blake2AsHex(encodedFastTrack);
    console.log('\t* FastTrack hash is %s', fastTrackHash);

    await this.helper.collective.techCommittee.propose(alithAccount, technicalCommitteeThreshold, fastTrack, fastTrack.encodedLength);

    const techProposalIdx = await this.helper.collective.techCommittee.proposalCount() - 1;
    await this.helper.collective.techCommittee.vote(baltatharAccount, fastTrackHash, techProposalIdx, true);
    await this.helper.collective.techCommittee.vote(alithAccount, fastTrackHash, techProposalIdx, true);

    await this.helper.collective.techCommittee.close(
      baltatharAccount,
      fastTrackHash,
      techProposalIdx,
      {
        refTime: 1_000_000_000,
        proofSize: 1_000_000,
      },
      fastTrack.encodedLength,
    );
    console.log('\t* Fast track proposal through technical committee.......DONE');
    // <<< Fast track proposal through technical committee <<<

    const democracyStarted = await this.helper.wait.expectEvent(3, Event.Democracy.Started);
    const referendumIndex = democracyStarted.referendumIndex();

    // >>> Referendum voting >>>
    console.log(`\t* Referendum #${referendumIndex} voting.......`);
    await this.helper.democracy.referendumVote(dorothyAccount, referendumIndex, {
      balance: 10_000_000_000_000_000_000n,
      vote: {aye: true, conviction: 1},
    });
    console.log(`\t* Referendum #${referendumIndex} voting.......DONE`);
    // <<< Referendum voting <<<

    // Wait the proposal to pass
    await this.helper.wait.expectEvent(3, Event.Democracy.Passed, event => event.referendumIndex() == referendumIndex);

    await this.helper.wait.newBlocks(1);

    console.log(`[democracy] executing '${proposalDesciption}' proposal.......DONE`);
  }
}

class WaitGroup {
  helper: ChainHelperBase;

  constructor(helper: ChainHelperBase) {
    this.helper = helper;
  }

  sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private async waitWithTimeout(promise: Promise<any>, timeout: number) {
    let isBlock = false;
    promise.then(() => isBlock = true).catch(() => isBlock = true);
    let totalTime = 0;
    const step = 100;
    while(!isBlock) {
      await this.sleep(step);
      totalTime += step;
      if(totalTime >= timeout) throw Error('Blocks production failed');
    }
    return promise;
  }

  /**
   * Launch some async operation, or throw an error after some time. Note that it will still continue executing after the timeout.
   * @param promise async operation to race against the timeout
   * @param timeoutMS time after which to time out
   * @param timeoutError error message to throw
   * @returns promise of the same type the operation had
   */
  withTimeout<T>(
    promise: Promise<T>,
    timeoutMS = 30000,
    timeoutError = 'The operation has timed out!',
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutError));
      }, timeoutMS);
    });

    return Promise.race<T>([promise, timeout]).catch(e => {throw new Error(e);});
  }

  /**
   * Wait for specified number of blocks
   * @param blocksCount number of blocks to wait
   * @returns
   */
  async newBlocks(blocksCount = 1, timeout?: number): Promise<void> {
    timeout = timeout ?? blocksCount * 60_000;
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads(() => {
        if(blocksCount > 0) {
          blocksCount--;
        } else {
          unsubscribe();
          resolve();
        }
      });
    });
    await this.waitWithTimeout(promise, timeout);
    return promise;
  }

  /**
   * Wait for the specified number of sessions to pass.
   * Only applicable if the Session pallet is turned on.
   * @param sessionCount number of sessions to wait
   * @param blockTimeout time in ms until panicking that the chain has stopped producing blocks
   * @returns
   */
  async newSessions(sessionCount = 1, blockTimeout = 60000): Promise<void> {
    console.log(`Waiting for ${sessionCount} new session${sessionCount > 1 ? 's' : ''}.`
      + ' This might take a while -- check SessionPeriod in pallet_session::Config for session time.');

    const expectedSessionIndex = await (this.helper as DevUniqueHelper).session.getIndex() + sessionCount;
    let currentSessionIndex = -1;

    while(currentSessionIndex < expectedSessionIndex) {
      // eslint-disable-next-line no-async-promise-executor
      currentSessionIndex = await this.withTimeout(new Promise(async (resolve) => {
        await this.newBlocks(1);
        const res = await (this.helper as DevUniqueHelper).session.getIndex();
        resolve(res);
      }), blockTimeout, 'The chain has stopped producing blocks!');
    }
  }

  async forParachainBlockNumber(blockNumber: bigint | number, timeout?: number) {
    timeout = timeout ?? 30 * 60 * 1000;
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads((data: any) => {
        if(data.number.toNumber() >= blockNumber) {
          unsubscribe();
          resolve();
        }
      });
    });
    await this.waitWithTimeout(promise, timeout);
    return promise;
  }

  async forRelayBlockNumber(blockNumber: bigint | number, timeout?: number) {
    timeout = timeout ?? 30 * 60 * 1000;
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().query.parachainSystem.validationData((data: any) => {
        if(data.value.relayParentNumber.toNumber() >= blockNumber) {
          // @ts-ignore
          unsubscribe();
          resolve();
        }
      });
    });
    await this.waitWithTimeout(promise, timeout);
    return promise;
  }

  noScheduledTasks() {
    const api = this.helper.getApi();

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async resolve => {
      const unsubscribe = await api.rpc.chain.subscribeNewHeads(async () => {
        const areThereScheduledTasks = await api.query.scheduler.lookup.entries();

        if(areThereScheduledTasks.length == 0) {
          unsubscribe();
          resolve();
        }
      });
    });

    return promise;
  }

  event<T extends IEventHelper>(
    maxBlocksToWait: number,
    eventHelperType: new () => T,
    filter: (_: T) => boolean = () => true,
  ) {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<T | null>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads(async header => {
        const eventHelper = new eventHelperType();
        const blockNumber = header.number.toHuman();
        const blockHash = header.hash;
        const eventIdStr = `${eventHelper.section()}.${eventHelper.method()}`;
        const waitLimitStr = `wait blocks remaining: ${maxBlocksToWait}`;

        this.helper.logger.log(`[Block #${blockNumber}] Waiting for event \`${eventIdStr}\` (${waitLimitStr})`);

        const apiAt = await this.helper.getApi().at(blockHash);
        const eventRecords = (await apiAt.query.system.events()) as any;

        const neededEvent = eventRecords.toArray().find((r: FrameSystemEventRecord) => {
          if(
            r.event.section == eventHelper.section()
            && r.event.method == eventHelper.method()
          ) {
            eventHelper.bindEventRecord(r);
            return filter(eventHelper);
          } else {
            return false;
          }
        });

        if(neededEvent) {
          unsubscribe();
          resolve(eventHelper);
        } else if(maxBlocksToWait > 0) {
          maxBlocksToWait--;
        } else {
          this.helper.logger.log(`Eligible event \`${eventIdStr}\` is NOT found`);
          unsubscribe();
          resolve(null);
        }
      });
    });
    return promise;
  }

  async expectEvent<T extends IEventHelper>(
    maxBlocksToWait: number,
    eventHelperType: new () => T,
    filter: (e: T) => boolean = () => true,
  ) {
    const e = await this.event(maxBlocksToWait, eventHelperType, filter);
    if(e == null) {
      const eventHelper = new eventHelperType();
      throw Error(`The event '${eventHelper.section()}.${eventHelper.method()}' is expected`);
    } else {
      return e;
    }
  }
}

class SessionGroup {
  helper: ChainHelperBase;

  constructor(helper: ChainHelperBase) {
    this.helper = helper;
  }

  //todo:collator documentation
  async getIndex(): Promise<number> {
    return (await this.helper.callRpc('api.query.session.currentIndex', [])).toNumber();
  }

  newSessions(sessionCount = 1, blockTimeout = 24000): Promise<void> {
    return (this.helper as DevUniqueHelper).wait.newSessions(sessionCount, blockTimeout);
  }

  setOwnKeys(signer: TSigner, key: string) {
    return this.helper.executeExtrinsic(
      signer,
      'api.tx.session.setKeys',
      [key, '0x0'],
      true,
    );
  }

  setOwnKeysFromAddress(signer: TSigner) {
    return this.setOwnKeys(signer, '0x' + Buffer.from(signer.addressRaw).toString('hex'));
  }
}

class TestUtilGroup {
  helper: DevUniqueHelper;

  constructor(helper: DevUniqueHelper) {
    this.helper = helper;
  }

  async enable() {
    if(this.helper.fetchMissingPalletNames([Pallets.TestUtils]).length != 0) {
      return;
    }

    const signer = this.helper.util.fromSeed('//Alice');
    await this.helper.getSudo<DevUniqueHelper>().executeExtrinsic(signer, 'api.tx.testUtils.enable', [], true);
  }

  async setTestValue(signer: TSigner, testVal: number) {
    await this.helper.executeExtrinsic(signer, 'api.tx.testUtils.setTestValue', [testVal], true);
  }

  async incTestValue(signer: TSigner) {
    await this.helper.executeExtrinsic(signer, 'api.tx.testUtils.incTestValue', [], true);
  }

  async setTestValueAndRollback(signer: TSigner, testVal: number) {
    await this.helper.executeExtrinsic(signer, 'api.tx.testUtils.setTestValueAndRollback', [testVal], true);
  }

  async testValue(blockIdx?: number) {
    const api = blockIdx
      ? await this.helper.getApi().at(await this.helper.callRpc('api.rpc.chain.getBlockHash', [blockIdx]))
      : this.helper.getApi();

    return (await api.query.testUtils.testValue()).toJSON();
  }

  async justTakeFee(signer: TSigner) {
    await this.helper.executeExtrinsic(signer, 'api.tx.testUtils.justTakeFee', [], true);
  }

  async selfCancelingInc(signer: TSigner, scheduledId: string, maxTestVal: number) {
    await this.helper.executeExtrinsic(signer, 'api.tx.testUtils.selfCancelingInc', [scheduledId, maxTestVal], true);
  }
}

class EventCapture {
  helper: DevUniqueHelper;
  eventSection: string;
  eventMethod: string;
  events: EventRecord[] = [];
  unsubscribe: VoidFn | null = null;

  constructor(
    helper: DevUniqueHelper,
    eventSection: string,
    eventMethod: string,
  ) {
    this.helper = helper;
    this.eventSection = eventSection;
    this.eventMethod = eventMethod;
  }

  async startCapture() {
    this.stopCapture();
    this.unsubscribe = (await this.helper.getApi().query.system.events((eventRecords: FrameSystemEventRecord[]) => {
      const newEvents = eventRecords.filter(r => r.event.section == this.eventSection && r.event.method == this.eventMethod);

      this.events.push(...newEvents);
    })) as any;
  }

  stopCapture() {
    if(this.unsubscribe !== null) {
      this.unsubscribe();
    }
  }

  extractCapturedEvents() {
    return this.events;
  }
}

class AdminGroup {
  helper: UniqueHelper;

  constructor(helper: UniqueHelper) {
    this.helper = helper;
  }

  async payoutStakers(signer: IKeyringPair, stakersToPayout: number):  Promise<{staker: string, stake: bigint, payout: bigint}[]> {
    const payoutResult = await this.helper.executeExtrinsic(signer, 'api.tx.appPromotion.payoutStakers', [stakersToPayout], true);
    return payoutResult.result.events.filter(e => e.event.method === 'StakingRecalculation').map(e => ({
      staker: e.event.data[0].toString(),
      stake: e.event.data[1].toBigInt(),
      payout: e.event.data[2].toBigInt(),
    }));
  }
}
