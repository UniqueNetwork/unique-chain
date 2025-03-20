// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import '@unique-nft/opal-testnet-types/augment-api.js';
import '@unique-nft/opal-testnet-types/augment-types.js';
import '@unique-nft/opal-testnet-types/types-lookup.js';

import {stringToU8a} from '@polkadot/util';
import {blake2AsHex, encodeAddress, mnemonicGenerate} from '@polkadot/util-crypto';
import type {ChainHelperBaseConstructor, UniqueHelperConstructor} from '@unique-nft/playgrounds/unique.js';
import {UniqueHelper, ChainHelperBase, HelperGroup} from '@unique-nft/playgrounds/unique.js';
import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import * as defs from '@unique-nft/opal-testnet-types/definitions.js';
import type {IKeyringPair} from '@polkadot/types/types';
import type {EventRecord} from '@polkadot/types/interfaces';
import type {ICrossAccountId, ILogger, IPovInfo, ISchedulerOptions, ITransactionResult, TSigner} from '@unique-nft/playgrounds/types.js';
import type {FrameSystemEventRecord, XcmV3TraitsError, StagingXcmV5TraitsOutcome} from '@polkadot/types/lookup';
import type {SignerOptions, VoidFn} from '@polkadot/api/types';
import {spawnSync} from 'child_process';
import {AcalaHelper, AstarHelper, MoonbeamHelper, RelayHelper, WestmintHelper, ForeignAssetsGroup, XcmGroup, XTokensGroup, TokensGroup, HydraDxHelper} from './xcm/index.js';
import {CollectiveGroup, CollectiveMembershipGroup, DemocracyGroup, RankedCollectiveGroup, ReferendaGroup} from './governance.js';
import type {ICollectiveGroup, IFellowshipGroup} from './governance.js';

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
        const skippedWarnings = ['1000:: Normal connection closure', 'Not decorating unknown runtime apis:', 'RPC methods not decorated:', 'Not decorating runtime apis', 'Bad input data provided to validate_transaction', 'account balance too low', '1006:: Abnormal Closure'];
        const needToSkip = skippedWarnings.reduce((a,  b) => a || arg.includes(b), false);
        if(needToSkip || arg === 'Normal connection closure')
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

  wrapEvent(data: any[]): any;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function EventHelper(section: string, method: string, wrapEvent: (data: any[]) => any) {
  const helperClass = class implements IEventHelper {
    wrapEvent: (data: any[]) => any;
    _section: string;
    _method: string;

    constructor() {
      this.wrapEvent = wrapEvent;
      this._section = section;
      this._method = method;
    }

    section(): string {
      return this._section;
    }

    method(): string {
      return this._method;
    }

    filter(txres: ITransactionResult) {
      return txres.result.events.filter(e => e.event.section === section && e.event.method === method)
        .map(e => this.wrapEvent(e.event.data));
    }

    find(txres: ITransactionResult) {
      const e = txres.result.events.find(e => e.event.section === section && e.event.method === method);
      return e ? this.wrapEvent(e.event.data) : null;
    }

    expect(txres: ITransactionResult) {
      const e = this.find(txres);
      if(e) {
        return e;
      } else {
        throw Error(`Expected event ${section}.${method}`);
      }
    }
  };

  return helperClass;
}

function eventJsonData<T = any>(data: any[], index: number) {
  return data[index].toJSON() as T;
}

function eventHumanData(data: any[], index: number) {
  return data[index].toHuman();
}

function eventData<T = any>(data: any[], index: number) {
  return data[index] as T;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function EventSection(section: string) {
  return class Section {
    static section = section;

    static Method(name: string, wrapEvent: (data: any[]) => any = () => {}) {
      const helperClass = EventHelper(Section.section, name, wrapEvent);
      return new helperClass();
    }
  };
}

function schedulerSection(schedulerInstance: string) {
  return class extends EventSection(schedulerInstance) {
    static Dispatched = this.Method('Dispatched', data => ({
      task: eventJsonData(data, 0),
      id: eventHumanData(data, 1),
      result: data[2],
    }));

    static PriorityChanged = this.Method('PriorityChanged', data => ({
      task: eventJsonData(data, 0),
      priority: eventJsonData(data, 1),
    }));
  };
}

export class Event {
  static Democracy = class extends EventSection('democracy') {
    static Proposed = this.Method('Proposed', data => ({
      proposalIndex: eventJsonData<number>(data, 0),
    }));

    static ExternalTabled = this.Method('ExternalTabled');

    static Started = this.Method('Started', data => ({
      referendumIndex: eventJsonData<number>(data, 0),
      threshold: eventHumanData(data, 1),
    }));

    static Voted = this.Method('Voted', data => ({
      voter: eventJsonData(data, 0),
      referendumIndex: eventJsonData<number>(data, 1),
      vote: eventJsonData(data, 2),
    }));

    static Passed = this.Method('Passed', data => ({
      referendumIndex: eventJsonData<number>(data, 0),
    }));

    static ProposalCanceled = this.Method('ProposalCanceled', data => ({
      propIndex: eventJsonData<number>(data, 0),
    }));

    static Cancelled = this.Method('Cancelled', data => ({
      propIndex: eventJsonData<number>(data, 0),
    }));

    static Vetoed = this.Method('Vetoed', data => ({
      who: eventHumanData(data, 0),
      proposalHash: eventHumanData(data, 1),
      until: eventJsonData<number>(data, 1),
    }));
  };

  static Council = class extends EventSection('council') {
    static Proposed = this.Method('Proposed', data => ({
      account: eventHumanData(data, 0),
      proposalIndex: eventJsonData<number>(data, 1),
      proposalHash: eventHumanData(data, 2),
      threshold: eventJsonData<number>(data, 3),
    }));
    static Closed = this.Method('Closed', data => ({
      proposalHash: eventHumanData(data, 0),
      yes: eventJsonData<number>(data, 1),
      no: eventJsonData<number>(data, 2),
    }));
    static Executed = this.Method('Executed', data => ({
      proposalHash: eventHumanData(data, 0),
    }));
  };

  static FinCouncil = class extends EventSection('financialCouncil') {
    static Proposed = this.Method('Proposed', data => ({
      account: eventHumanData(data, 0),
      proposalIndex: eventJsonData<number>(data, 1),
      proposalHash: eventHumanData(data, 2),
      threshold: eventJsonData<number>(data, 3),
    }));
    static Closed = this.Method('Closed', data => ({
      proposalHash: eventHumanData(data, 0),
      yes: eventJsonData<number>(data, 1),
      no: eventJsonData<number>(data, 2),
    }));
    static Executed = this.Method('Executed', data => ({
      proposalHash: eventHumanData(data, 0),
    }));
  };

  static TechnicalCommittee = class extends EventSection('technicalCommittee') {
    static Proposed = this.Method('Proposed', data => ({
      account: eventHumanData(data, 0),
      proposalIndex: eventJsonData<number>(data, 1),
      proposalHash: eventHumanData(data, 2),
      threshold: eventJsonData<number>(data, 3),
    }));
    static Closed = this.Method('Closed', data => ({
      proposalHash: eventHumanData(data, 0),
      yes: eventJsonData<number>(data, 1),
      no: eventJsonData<number>(data, 2),
    }));
    static Approved = this.Method('Approved', data => ({
      proposalHash: eventHumanData(data, 0),
    }));
    static Executed = this.Method('Executed', data => ({
      proposalHash: eventHumanData(data, 0),
      result: eventHumanData(data, 1),
    }));
  };

  static FellowshipReferenda = class extends EventSection('fellowshipReferenda') {
    static Submitted = this.Method('Submitted', data => ({
      referendumIndex: eventJsonData<number>(data, 0),
      trackId: eventJsonData<number>(data, 1),
      proposal: eventJsonData(data, 2),
    }));

    static Cancelled = this.Method('Cancelled', data => ({
      index: eventJsonData<number>(data, 0),
      tally: eventJsonData(data, 1),
    }));
  };

  static UniqueScheduler = schedulerSection('uniqueScheduler');
  static Scheduler = schedulerSection('scheduler');

  static XcmpQueue = class extends EventSection('xcmpQueue') {
    static XcmpMessageSent = this.Method('XcmpMessageSent', data => ({
      messageHash: eventJsonData(data, 0),
    }));

    static Success = this.Method('Success', data => ({
      messageHash: eventJsonData(data, 0),
    }));

    static Fail = this.Method('Fail', data => ({
      messageHash: eventJsonData(data, 0),
      outcome: eventData<XcmV3TraitsError>(data, 2),
    }));
  };

  static DmpQueue = class extends EventSection('dmpQueue') {
    static ExecutedDownward = this.Method('ExecutedDownward', data => ({
      outcome: eventData<StagingXcmV5TraitsOutcome>(data, 2),
    }));
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function SudoHelper<T extends ChainHelperBaseConstructor>(Base: T) {
  return class extends Base {
    constructor(...args: any[]) {
      super(...args);
    }

    override async executeExtrinsic(
      sender: IKeyringPair,
      extrinsic: string,
      params: any[],
      expectSuccess?: boolean,
      options: Partial<SignerOptions> | null = null,
    ): Promise<ITransactionResult> {
      const call = this.constructApiCall(extrinsic, params);
      const result = await super.executeExtrinsic(
        sender,
        'api.tx.sudo.sudo',
        [call],
        expectSuccess,
        options,
      );

      if(result.status === 'Fail') return result;

      const data = (result.result.events.find(x => x.event.section == 'sudo' && x.event.method == 'Sudid')?.event.data as any).sudoResult;
      if(data.isErr) {
        if(data.asErr.isModule) {
          const error = (result.result.events[1].event.data as any).sudoResult.asErr.asModule;
          const metaError = super.getApi()?.registry.findMetaError(error);
          throw new Error(`${metaError.section}.${metaError.name}`);
        } else if(data.asErr.isToken) {
          throw new Error(`Token: ${data.asErr.asToken}`);
        }
        // May be [object Object] in case of unhandled non-unit enum
        throw new Error(`Misc: ${data.asErr.toHuman()}`);
      }
      return result;
    }
    override async executeExtrinsicUncheckedWeight(
      sender: IKeyringPair,
      extrinsic: string,
      params: any[],
      expectSuccess?: boolean,
      options: Partial<SignerOptions> | null = null,
    ): Promise<ITransactionResult> {
      const call = this.constructApiCall(extrinsic, params);
      const result = await super.executeExtrinsic(
        sender,
        'api.tx.sudo.sudoUncheckedWeight',
        [call, {refTime: 0, proofSize: 0}],
        expectSuccess,
        options,
      );

      if(result.status === 'Fail') return result;

      const data = (result.result.events.find(x => x.event.section == 'sudo' && x.event.method == 'Sudid')?.event.data as any).sudoResult;
      if(data.isErr) {
        if(data.asErr.isModule) {
          const error = (result.result.events[1].event.data as any).sudoResult.asErr.asModule;
          const metaError = super.getApi()?.registry.findMetaError(error);
          throw new Error(`${metaError.section}.${metaError.name}`);
        } else if(data.asErr.isToken) {
          throw new Error(`Token: ${data.asErr.asToken}`);
        }
        // May be [object Object] in case of unhandled non-unit enum
        throw new Error(`Misc: ${data.asErr.toHuman()}`);
      }
      return result;
    }
  };
}

class SchedulerGroup extends HelperGroup<UniqueHelper> {
  constructor(helper: UniqueHelper) {
    super(helper);
  }

  cancelScheduled(signer: TSigner, scheduledId: string) {
    return this.helper.executeExtrinsic(
      signer,
      'api.tx.scheduler.cancelNamed',
      [scheduledId],
      true,
    );
  }

  changePriority(signer: TSigner, scheduledId: string, priority: number) {
    return this.helper.executeExtrinsic(
      signer,
      'api.tx.scheduler.changeNamedPriority',
      [scheduledId, priority],
      true,
    );
  }

  scheduleAt<T extends DevUniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    return this.schedule<T>('schedule', executionBlockNumber, options);
  }

  scheduleAfter<T extends DevUniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    return this.schedule<T>('scheduleAfter', blocksBeforeExecution, options);
  }

  schedule<T extends UniqueHelper>(
    scheduleFn: 'schedule' | 'scheduleAfter',
    blocksNum: number,
    options: ISchedulerOptions = {},
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ScheduledHelperType = ScheduledUniqueHelper(this.helper.helperBase);
    return this.helper.clone(ScheduledHelperType, {
      scheduleFn,
      blocksNum,
      options,
    }) as T;
  }
}

class CollatorSelectionGroup extends HelperGroup<UniqueHelper> {
  //todo:collator documentation
  addInvulnerable(signer: TSigner, address: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.addInvulnerable', [address]);
  }

  removeInvulnerable(signer: TSigner, address: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.removeInvulnerable', [address]);
  }

  async getInvulnerables(): Promise<string[]> {
    return (await this.helper.callRpc('api.query.collatorSelection.invulnerables')).map((x: any) => x.toHuman());
  }

  /** and also total max invulnerables */
  maxCollators(): number {
    return (this.helper.getApi().consts.configuration.defaultCollatorSelectionMaxCollators.toJSON() as number);
  }

  async getDesiredCollators(): Promise<number> {
    return (await this.helper.callRpc('api.query.configuration.collatorSelectionDesiredCollatorsOverride')).toNumber();
  }

  setLicenseBond(signer: TSigner, amount: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.configuration.setCollatorSelectionLicenseBond', [amount]);
  }

  async getLicenseBond(): Promise<bigint> {
    return (await this.helper.callRpc('api.query.configuration.collatorSelectionLicenseBondOverride')).toBigInt();
  }

  obtainLicense(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.getLicense', []);
  }

  releaseLicense(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.releaseLicense', []);
  }

  forceReleaseLicense(signer: TSigner, released: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.forceReleaseLicense', [released]);
  }

  async hasLicense(address: string): Promise<bigint> {
    return (await this.helper.callRpc('api.query.collatorSelection.licenseDepositOf', [address])).toBigInt();
  }

  onboard(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.onboard', []);
  }

  offboard(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.offboard', []);
  }

  async getCandidates(): Promise<string[]> {
    return (await this.helper.callRpc('api.query.collatorSelection.candidates')).map((x: any) => x.toHuman());
  }
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
  foreignAssets: ForeignAssetsGroup;
  xcm: XcmGroup<DevUniqueHelper>;
  xTokens: XTokensGroup<DevUniqueHelper>;
  tokens: TokensGroup<DevUniqueHelper>;
  scheduler: SchedulerGroup;
  collatorSelection: CollatorSelectionGroup;
  council: ICollectiveGroup;
  finCouncil: ICollectiveGroup;
  technicalCommittee: ICollectiveGroup;
  fellowship: IFellowshipGroup;
  democracy: DemocracyGroup;

  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevUniqueHelper;

    super(logger, options);
    this.arrange = new ArrangeGroup(this);
    this.wait = new WaitGroup(this);
    this.admin = new AdminGroup(this);
    this.testUtils = new TestUtilGroup(this);
    this.session = new SessionGroup(this);
    this.foreignAssets = new ForeignAssetsGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
    this.xTokens = new XTokensGroup(this);
    this.tokens = new TokensGroup(this);
    this.scheduler = new SchedulerGroup(this);
    this.collatorSelection = new CollatorSelectionGroup(this);
    this.council = {
      collective: new CollectiveGroup(this, 'council'),
      membership: new CollectiveMembershipGroup(this, 'councilMembership'),
    };
    this.finCouncil = {
      collective: new CollectiveGroup(this, 'financialCouncil'),
      membership: new CollectiveMembershipGroup(this, 'financialCouncilMembership'),
    };
    this.technicalCommittee = {
      collective: new CollectiveGroup(this, 'technicalCommittee'),
      membership: new CollectiveMembershipGroup(this, 'technicalCommitteeMembership'),
    };
    this.fellowship = {
      collective: new RankedCollectiveGroup(this, 'fellowshipCollective'),
      referenda: new ReferendaGroup(this, 'fellowshipReferenda'),
    };
    this.democracy = new DemocracyGroup(this);
  }

  override async connect(wsEndpoint: string, _listeners?: any): Promise<void> {
    if(!wsEndpoint) throw new Error('wsEndpoint was not set');
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
        StorageWeightReclaim: {
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
  getSudo<T extends DevUniqueHelper>() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const SudoHelperType = SudoHelper(this.helperBase);
    return this.clone(SudoHelperType) as T;
  }
}

export class DevRelayHelper extends RelayHelper {
  wait: WaitGroup;

  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevRelayHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }

  getSudo() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const SudoHelperType = SudoHelper(this.helperBase);
    return this.clone(SudoHelperType) as DevRelayHelper;
  }
}

export class DevWestmintHelper extends WestmintHelper {
  wait: WaitGroup;

  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
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

  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevMoonbeamHelper;
    options.notePreimagePallet = options.notePreimagePallet ?? 'preimage';

    super(logger, options);
    this.account = new MoonbeamAccountGroup(this);
    this.wait = new WaitGroup(this);
    this.fastDemocracy = new MoonbeamFastDemocracyGroup(this);
  }
}

export class DevMoonriverHelper extends DevMoonbeamHelper {
  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
    options.notePreimagePallet = options.notePreimagePallet ?? 'preimage';
    super(logger, options);
  }
}

export class DevAstarHelper extends AstarHelper {
  wait: WaitGroup;

  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevAstarHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }

  getSudo<T extends AstarHelper>() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const SudoHelperType = SudoHelper(this.helperBase);
    return this.clone(SudoHelperType) as T;
  }
}

export class DevShidenHelper extends DevAstarHelper { }

export class DevAcalaHelper extends AcalaHelper {
  wait: WaitGroup;

  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevAcalaHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
  getSudo() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const SudoHelperType = SudoHelper(this.helperBase);
    return this.clone(SudoHelperType) as DevAcalaHelper;
  }
}

export class DevHydraDxHelper extends HydraDxHelper {
  wait: WaitGroup;
  fastDemocracy: HydraFastDemocracyGroup;

  constructor(logger?: ILogger, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevHydraDxHelper;

    super(logger, options);

    this.wait = new WaitGroup(this);
    this.fastDemocracy = new HydraFastDemocracyGroup(this);
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
        const tx = this.helper.constructApiCall('api.tx.balances.transferKeepAlive', [{Id: recipient.address}, balance * tokenNominal]);
        transactions.push(this.helper.signTransaction(donor, tx, {nonce}, 'account generation'));
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
          const tx = this.helper.constructApiCall('api.tx.balances.transferKeepAlive', [{Id: recipient.address}, withBalance * tokenNominal]);
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

  /**
   * Generates one account with zero balance
   * @returns the newly generated account
   * @example const account = await helper.arrange.createEmptyAccount();
   */
  createEmptyAccount = (): IKeyringPair => {
    const ss58Format = this.helper.chain.getChainProperties().ss58Format;
    return this.helper.util.fromSeed(mnemonicGenerate(), ss58Format);
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
      const methods = block.block.extrinsics.map((ext: any) => ext.method.toHuman());
      let date;
      methods.forEach((method: any) => {
        if(method.section === 'timestamp') {
          date = Number(method.args.now.replaceAll(',', ''));
        }
      });
      return date;
    };
    const block1date = await findCreationDate(block1);
    const block2date = await findCreationDate(block2);
    if(block2date! - block1date! < 9000) return true;
    return false;
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

  makeUnpaidSudoTransactProgram(info: {weightMultiplier: number, call: string}) {
    return {
      V3: [
        {
          UnpaidExecution: {
            weightLimit: 'Unlimited',
            checkOrigin: null,
          },
        },
        {
          Transact: {
            originKind: 'Superuser',
            requireWeightAtMost: {
              refTime: info.weightMultiplier * 200000000,
              proofSize: info.weightMultiplier * 3000,
            },
            call: {
              encoded: info.call,
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
    const referendumIndex = democracyStarted.referendumIndex;

    // >>> Referendum voting >>>
    console.log(`\t* Referendum #${referendumIndex} voting.......`);
    await this.helper.democracy.referendumVote(dorothyAccount, referendumIndex, {
      balance: 10_000_000_000_000_000_000n,
      vote: {aye: true, conviction: 1},
    });
    console.log(`\t* Referendum #${referendumIndex} voting.......DONE`);
    // <<< Referendum voting <<<

    // Wait the proposal to pass
    await this.helper.wait.expectEvent(3, Event.Democracy.Passed, event => event.referendumIndex == referendumIndex);

    await this.helper.wait.newBlocks(1);

    console.log(`[democracy] executing '${proposalDesciption}' proposal.......DONE`);
  }
}

class HydraFastDemocracyGroup {
  helper: DevHydraDxHelper;

  constructor(helper: DevHydraDxHelper) {
    this.helper = helper;
  }

  async executeProposal(proposalDesciption: string, encodedProposal: string) {
    const proposalHash = blake2AsHex(encodedProposal);
    const aliceAccount = this.helper.util.fromSeed('//Alice');
    const bobAccount = this.helper.util.fromSeed('//Bob');
    const eveAccount = this.helper.util.fromSeed('//Eve');

    const councilVotingThreshold = 1;
    const technicalCommitteeThreshold = 3;
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
      aliceAccount,
      councilVotingThreshold,
      externalMotion,
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

    await this.helper.collective.techCommittee.propose(aliceAccount, technicalCommitteeThreshold, fastTrack, fastTrack.encodedLength);

    const techProposalIdx = await this.helper.collective.techCommittee.proposalCount() - 1;
    await this.helper.collective.techCommittee.vote(aliceAccount, fastTrackHash, techProposalIdx, true);
    await this.helper.collective.techCommittee.vote(bobAccount, fastTrackHash, techProposalIdx, true);
    await this.helper.collective.techCommittee.vote(eveAccount, fastTrackHash, techProposalIdx, true);

    await this.helper.collective.techCommittee.close(
      bobAccount,
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
    const referendumIndex = democracyStarted.referendumIndex;

    // >>> Referendum voting >>>
    console.log(`\t* Referendum #${referendumIndex} voting.......`);
    await this.helper.democracy.referendumVote(eveAccount, referendumIndex, {
      balance: 10_000_000_000_000_000_000n,
      vote: {aye: true, conviction: 1},
    });
    console.log(`\t* Referendum #${referendumIndex} voting.......DONE`);
    // <<< Referendum voting <<<

    // Wait the proposal to pass
    await this.helper.wait.expectEvent(3, Event.Democracy.Passed, event => event.referendumIndex == referendumIndex);

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
      if(totalTime >= timeout) throw Error(`Timeout ${timeout} ms`);
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
    const initialBlocksCount = blocksCount;

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

    try {
      await this.waitWithTimeout(promise, timeout);
    } catch (error) {
      throw Error(`Failed to wait for ${initialBlocksCount} new blocks within ${timeout} ms. ${blocksCount} blocks left`);
    }

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
    let lastBlock = null;
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads((data: any) => {
        lastBlock = data.number.toNumber();
        if(lastBlock >= blockNumber) {
          unsubscribe();
          resolve();
        }
      });
    });

    try {
      await this.waitWithTimeout(promise, timeout);
    } catch (error) {
      throw Error(`Failed to wait for block ${blockNumber} on parachain within ${timeout} ms. Last block from parachain is ${lastBlock}`);
    }

    return promise;
  }

  async forRelayBlockNumber(blockNumber: bigint | number, timeout?: number) {
    timeout = timeout ?? 30 * 60 * 1000;
    let lastBlock = null;
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().query.parachainSystem.validationData((data: any) => {
        lastBlock = data.value.relayParentNumber.toNumber();
        if(lastBlock >= blockNumber) {
          // @ts-ignore
          unsubscribe();
          resolve();
        }
      });
    });

    try {
      await this.waitWithTimeout(promise, timeout);
    } catch (error) {
      throw Error(`Failed to wait for block ${blockNumber} on relay within ${timeout} ms. Last block from relay is ${lastBlock}`);
    }

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

  parachainBlockMultiplesOf(val: bigint) {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async resolve => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads((data: any) => {
        if(data.number.toBigInt() % val == 0n) {
          console.log(`from waiter: ${data.number.toBigInt()}`);
          unsubscribe();
          resolve();
        }
      });
    });
    return promise;
  }

  event<T extends IEventHelper>(
    maxBlocksToWait: number,
    eventHelper: T,
    filter: (_: any) => boolean = () => true,
  ): any {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<T | null>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads(async header => {
        const blockNumber = header.number.toJSON();
        const blockHash = header.hash;
        const eventIdStr = `${eventHelper.section()}.${eventHelper.method()}`;
        const waitLimitStr = `wait blocks remaining: ${maxBlocksToWait}`;

        this.helper.logger.log(`[Block #${blockNumber}] Waiting for event \`${eventIdStr}\` (${waitLimitStr})`);

        const apiAt = await this.helper.getApi().at(blockHash);
        const eventRecords = (await apiAt.query.system.events()) as any;

        const neededEvent = eventRecords.toArray()
          .filter((r: FrameSystemEventRecord) => r.event.section == eventHelper.section() && r.event.method == eventHelper.method())
          .map((r: FrameSystemEventRecord) => eventHelper.wrapEvent(r.event.data))
          .find(filter);

        if(neededEvent) {
          unsubscribe();
          resolve(neededEvent);
        } else if(maxBlocksToWait > 0) {
          maxBlocksToWait--;
        } else {
          this.helper.logger.log(`Eligible event \`${eventIdStr}\` is NOT found.
          The wait lasted until block ${blockNumber} inclusive`);
          unsubscribe();
          resolve(null);
        }
      });
    });
    return promise;
  }

  async expectEvent<T extends IEventHelper>(
    maxBlocksToWait: number,
    eventHelper: T,
    filter: (e: any) => boolean = () => true,
  ) {
    const e = await this.event(maxBlocksToWait, eventHelper, filter);
    if(e == null) {
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

  // TODO: Add nonce
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

  async enable(testUtilsPalletName: string) {
    if(this.helper.fetchMissingPalletNames([testUtilsPalletName]).length != 0) {
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

// eslint-disable-next-line @typescript-eslint/naming-convention
function ScheduledUniqueHelper<T extends UniqueHelperConstructor>(Base: T) {
  return class extends Base {
    scheduleFn: 'schedule' | 'scheduleAfter';
    blocksNum: number;
    options: ISchedulerOptions;

    constructor(...args: any[]) {
      const logger = args[0] as ILogger;
      const options = args[1] as {
        scheduleFn: 'schedule' | 'scheduleAfter',
        blocksNum: number,
        options: ISchedulerOptions
      };

      super(logger);

      this.scheduleFn = options.scheduleFn;
      this.blocksNum = options.blocksNum;
      this.options = options.options;
    }

    override executeExtrinsic(sender: IKeyringPair, scheduledExtrinsic: string, scheduledParams: any[], expectSuccess?: boolean): Promise<ITransactionResult> {
      const scheduledTx = this.constructApiCall(scheduledExtrinsic, scheduledParams);

      const mandatorySchedArgs = [
        this.blocksNum,
        this.options.periodic ? [this.options.periodic.period, this.options.periodic.repetitions] : null,
        this.options.priority ?? null,
        scheduledTx,
      ];

      let schedArgs;
      let scheduleFn;

      if(this.options.scheduledId) {
        schedArgs = [this.options.scheduledId!, ...mandatorySchedArgs];

        if(this.scheduleFn == 'schedule') {
          scheduleFn = 'scheduleNamed';
        } else if(this.scheduleFn == 'scheduleAfter') {
          scheduleFn = 'scheduleNamedAfter';
        }
      } else {
        schedArgs = mandatorySchedArgs;
        scheduleFn = this.scheduleFn;
      }

      const extrinsic = 'api.tx.scheduler.' + scheduleFn;

      return super.executeExtrinsic(
        sender,
        extrinsic as any,
        schedArgs,
        expectSuccess,
      );
    }
  };
}
