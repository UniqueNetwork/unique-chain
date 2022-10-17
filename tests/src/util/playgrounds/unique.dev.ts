// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {stringToU8a} from '@polkadot/util';
import {encodeAddress, mnemonicGenerate} from '@polkadot/util-crypto';
import {UniqueHelper, MoonbeamHelper, ChainHelperBase, AcalaHelper, RelayHelper, WestmintHelper} from './unique';
import {ApiPromise, Keyring, WsProvider} from '@polkadot/api';
import * as defs from '../../interfaces/definitions';
import {IKeyringPair} from '@polkadot/types/types';
import {EventRecord} from '@polkadot/types/interfaces';
import {ICrossAccountId} from './types';
import {FrameSystemEventRecord} from '@polkadot/types/lookup';

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
      for (const arg of args) {
        if (typeof arg !== 'string')
          continue;
        if (arg.includes('1000:: Normal connection closure') || arg.includes('Not decorating unknown runtime apis:') || arg.includes('RPC methods not decorated:') || arg === 'Normal connection closure')
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

export class DevUniqueHelper extends UniqueHelper {
  /**
   * Arrange methods for tests
   */
  arrange: ArrangeGroup;
  wait: WaitGroup;
  admin: AdminGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevUniqueHelper;

    super(logger, options);
    this.arrange = new ArrangeGroup(this);
    this.wait = new WaitGroup(this);
    this.admin = new AdminGroup(this);
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
        FakeTransactionFinalizer: {
          extrinsic: {},
          payload: {},
        },
      },
      rpc: {
        unique: defs.unique.rpc,
        appPromotion: defs.appPromotion.rpc,
        rmrk: defs.rmrk.rpc,
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
  }
}

export class DevRelayHelper extends RelayHelper {}

export class DevWestmintHelper extends WestmintHelper {
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevWestmintHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
}

export class DevMoonbeamHelper extends MoonbeamHelper {
  account: MoonbeamAccountGroup;
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevMoonbeamHelper;

    super(logger, options);
    this.account = new MoonbeamAccountGroup(this);
    this.wait = new WaitGroup(this);
  }
}

export class DevMoonriverHelper extends DevMoonbeamHelper {}

export class DevAcalaHelper extends AcalaHelper {
  wait: WaitGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }, options: {[key: string]: any} = {}) {
    options.helperBase = options.helperBase ?? DevAcalaHelper;

    super(logger, options);
    this.wait = new WaitGroup(this);
  }
}

export class DevKaruraHelper extends DevAcalaHelper {}

class ArrangeGroup {
  helper: DevUniqueHelper;

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
    for (const balance of balances) {
      const recipient = this.helper.util.fromSeed(mnemonicGenerate(), ss58Format);
      accounts.push(recipient);
      if (balance !== 0n) {
        const tx = this.helper.constructApiCall('api.tx.balances.transfer', [{Id: recipient.address}, balance * tokenNominal]);
        transactions.push(this.helper.signTransaction(donor, tx, {nonce}, 'account generation'));
        nonce++;
      }
    }

    await Promise.all(transactions).catch(_e => {});
    
    //#region TODO remove this region, when nonce problem will be solved
    const checkBalances = async () => {
      let isSuccess = true;
      for (let i = 0; i < balances.length; i++) {
        const balance = await this.helper.balance.getSubstrate(accounts[i].address);
        if (balance !== balances[i] * tokenNominal) {
          isSuccess = false;
          break;
        }
      }
      return isSuccess;
    };

    let accountsCreated = false;
    const maxBlocksChecked = await this.helper.arrange.isDevNode() ? 50 : 5;
    // checkBalances retry up to 5-50 blocks
    for (let index = 0; index < maxBlocksChecked; index++) {
      accountsCreated = await checkBalances();
      if(accountsCreated) break;
      await wait.newBlocks(1);
    }

    if (!accountsCreated) throw Error('Accounts generation failed');
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
      for (let i = 0; i < accountsToCreate; i++) {
        if (i === 500) { // if there are too many accounts to create
          await Promise.allSettled(transactions); // wait while first 500 (should be 100 for devnode) tx will be settled 
          transactions = []; //
          nonce = await this.helper.chain.getNonce(donor.address); // update nonce 
        }
        const recepient = this.helper.util.fromSeed(mnemonicGenerate());
        accounts.push(recepient);
        if (withBalance !== 0n) {
          const tx = this.helper.constructApiCall('api.tx.balances.transfer', [{Id: recepient.address}, withBalance * tokenNominal]);
          transactions.push(this.helper.signTransaction(donor, tx, {nonce}, 'account generation'));
          nonce++;
        }
      }
      
      const fullfilledAccounts = [];
      await Promise.allSettled(transactions);
      for (const account of accounts) {
        const accountBalance = await this.helper.balance.getSubstrate(account.address);
        if (accountBalance === withBalance * tokenNominal) {
          fullfilledAccounts.push(account);
        }
      }
      return fullfilledAccounts;
    };

    
    const crowd: IKeyringPair[] = [];
    // do up to 5 retries
    for (let index = 0; index < 5 && accountsToCreate !== 0; index++) {
      const asManyAsCan = await createAsManyAsCan();
      crowd.push(...asManyAsCan);
      accountsToCreate -= asManyAsCan.length;
    }

    if (accountsToCreate !== 0) throw Error(`Crowd generation failed: ${accountsToCreate} accounts left`);

    return crowd;
  };

  isDevNode = async () => {
    const block1 = await this.helper.callRpc('api.rpc.chain.getBlock', [await this.helper.callRpc('api.rpc.chain.getBlockHash', [1])]);
    const block2 = await this.helper.callRpc('api.rpc.chain.getBlock', [await this.helper.callRpc('api.rpc.chain.getBlockHash', [2])]);
    const findCreationDate = async (block: any) => {
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
    const address = payer.Substrate ? payer.Substrate : await this.helper.address.ethToSubstrate(payer.Ethereum!);
    let balance = await this.helper.balance.getSubstrate(address); 
    
    await promise();
    
    balance -= await this.helper.balance.getSubstrate(address);
    
    return balance;
  }

  calculatePalletAddress(palletId: any) {
    const address = stringToU8a(('modl' + palletId).padEnd(32, '\0'));
    return encodeAddress(address);
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

class WaitGroup {
  helper: ChainHelperBase;

  constructor(helper: ChainHelperBase) {
    this.helper = helper;
  }

  /**
   * Wait for specified number of blocks
   * @param blocksCount number of blocks to wait
   * @returns 
   */
  async newBlocks(blocksCount = 1): Promise<void> {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads(() => {
        if (blocksCount > 0) {
          blocksCount--;
        } else {
          unsubscribe();
          resolve();
        }
      });
    });
    return promise;
  }

  async forParachainBlockNumber(blockNumber: bigint) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads(async (data: any) => {
        if (data.number.toNumber() >= blockNumber) {
          unsubscribe();
          resolve();
        }
      });
    });
  }
  
  async forRelayBlockNumber(blockNumber: bigint) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().query.parachainSystem.validationData(async (data: any) => {
        if (data.value.relayParentNumber.toNumber() >= blockNumber) {
          // @ts-ignore
          unsubscribe();
          resolve();
        }
      });
    });
  }

  async event(maxBlocksToWait: number, eventSection: string, eventMethod: string) {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise<EventRecord | null>(async (resolve) => {
      const unsubscribe = await this.helper.getApi().rpc.chain.subscribeNewHeads(async header => {
        const blockNumber = header.number.toHuman();
        const blockHash = header.hash;
        const eventIdStr = `${eventSection}.${eventMethod}`;
        const waitLimitStr = `wait blocks remaining: ${maxBlocksToWait}`;
  
        this.helper.logger.log(`[Block #${blockNumber}] Waiting for event \`${eventIdStr}\` (${waitLimitStr})`);
  
        const apiAt = await this.helper.getApi().at(blockHash);
        const eventRecords = (await apiAt.query.system.events()) as any;
  
        const neededEvent = eventRecords.toArray().find((r: FrameSystemEventRecord) => {
          return r.event.section == eventSection && r.event.method == eventMethod;
        });
  
        if (neededEvent) {
          unsubscribe();
          resolve(neededEvent);
        } else if (maxBlocksToWait > 0) {
          maxBlocksToWait--;
        } else {
          this.helper.logger.log(`Event \`${eventIdStr}\` is NOT found`);
  
          unsubscribe();
          resolve(null);
        }
      });
    });
    return promise;
  }
}

class AdminGroup {
  helper: UniqueHelper;

  constructor(helper: UniqueHelper) {
    this.helper = helper;
  }

  async payoutStakers(signer: IKeyringPair, stakersToPayout: number) {
    const payoutResult = await this.helper.executeExtrinsic(signer, 'api.tx.appPromotion.payoutStakers', [stakersToPayout], true);
    return payoutResult.result.events.filter(e => e.event.method === 'StakingRecalculation').map(e => {
      return {
        staker: e.event.data[0].toString(),
        stake: e.event.data[1].toBigInt(),
        payout: e.event.data[2].toBigInt(),
      };
    });
  }
}
