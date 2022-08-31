// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {mnemonicGenerate} from '@polkadot/util-crypto';
import {UniqueHelper} from './unique';
import {ApiPromise, WsProvider} from '@polkadot/api';
import * as defs from '../../interfaces/definitions';
import {IKeyringPair} from '@polkadot/types/types';


export class DevUniqueHelper extends UniqueHelper {
  /**
   * Arrange methods for tests
   */
  arrange: ArrangeGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }) {
    super(logger);
    this.arrange = new ArrangeGroup(this);
  }

  async connect(wsEndpoint: string, listeners?: any): Promise<void> {
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

class ArrangeGroup {
  helper: UniqueHelper;

  constructor(helper: UniqueHelper) {
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
    const tokenNominal = this.helper.balance.getOneTokenNominal();
    const transactions = [];
    const accounts: IKeyringPair[] = [];
    for (const balance of balances) {
      const recepient = this.helper.util.fromSeed(mnemonicGenerate());
      accounts.push(recepient);
      if (balance !== 0n) {
        const tx = this.helper.constructApiCall('api.tx.balances.transfer', [{Id: recepient.address}, balance * tokenNominal]);
        transactions.push(this.helper.signTransaction(donor, tx, 'account generation', {nonce}));
        nonce++;
      }
    }

    await Promise.all(transactions).catch(e => {});
    
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
    // checkBalances retry up to 5 blocks
    for (let index = 0; index < 5; index++) {
      accountsCreated = await checkBalances();
      if(accountsCreated) break;
      await this.waitNewBlocks(1);
    }

    if (!accountsCreated) throw Error('Accounts generation failed');
    //#endregion

    return accounts;
  };

  // TODO combine this method and createAccounts into one
  createCrowd = async (accountsToCreate: number, withBalance: bigint, donor: IKeyringPair): Promise<IKeyringPair[]> => {
    let transactions: any = [];
    const accounts: IKeyringPair[] = [];

    const createAsManyAsCan = async () => {
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
          transactions.push(this.helper.signTransaction(donor, tx, 'account generation', {nonce}));
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
    const block1 = await this.helper.api?.rpc.chain.getBlock(await this.helper.api?.rpc.chain.getBlockHash(1));
    const block2 = await this.helper.api?.rpc.chain.getBlock(await this.helper.api?.rpc.chain.getBlockHash(2));
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

  /**
   * Wait for specified bnumber of blocks
   * @param blocksCount number of blocks to wait
   * @returns 
   */
  async waitNewBlocks(blocksCount = 1): Promise<void> {
    const promise = new Promise<void>(async (resolve) => {
      const unsubscribe = await this.helper.api!.rpc.chain.subscribeNewHeads(() => {
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
}