// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {mnemonicGenerate} from '@polkadot/util-crypto';
import {UniqueHelper} from './unique';
import {ApiPromise, WsProvider} from '@polkadot/api';
import * as defs from '../../interfaces/definitions';
import {ICollectionCreationOptions, TSigner} from './types';
import {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';


const defaultOptions: ICollectionCreationOptions = {
  name: 'name', description: 'description', tokenPrefix: 'prefix', mode: {nft: null},
};

export class DevUniqueHelper extends UniqueHelper {
  /**
   * Arrange methods for tests
   */
  arrange: ArrangeGroup;
  act: ActGroup;

  constructor(logger: { log: (msg: any, level: any) => void, level: any }) {
    super(logger);
    this.arrange = new ArrangeGroup(this);
    this.act = new ActGroup(this);
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
  creteAccounts = async (balances: bigint[], donor: IKeyringPair): Promise<IKeyringPair[]> => {
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


class ActGroup {
  helper: UniqueHelper;

  constructor(helper: UniqueHelper) {
    this.helper = helper;
  }

  /**
   * Creates collection creation tx object. Then it should be executed with expectSuccess or expectFailure methods
   * @param signer 
   * @param collectionOptions basic collection options and properties
   * @example createCollection(alice, {name: 'Awesome Collection'}).expectSuccess();
   * @returns id of a newly created collection
   */
  createCollection(signer: IKeyringPair, collectionOptions?: ICollectionCreationOptions) {
    return new CreateCollectionTx(signer, {...defaultOptions, ...collectionOptions}, (collectionId) => collectionId, this.helper);
  }

  /**
   * Creates NFT collection tx object. Then it should be executed with expectSuccess or expectFailure methods
   * @param signer IKeyringPair
   * @param collectionOptions basic collection options and properties
   * @example createNFTCollection(alice, {name: 'Awesome Collection'}).expectSuccess();
   * @returns UniqueNFTCollection object
   */
  createNFTCollection(signer: IKeyringPair, collectionOptions?: ICollectionCreationOptions) {
    const mode = {nft: null};
    return new CreateCollectionTx(signer, {...defaultOptions, ...collectionOptions, ...mode}, (collectionId) => this.helper.nft.getCollectionObject(collectionId), this.helper);
  }
}

class CreateCollectionTx<T> {
  readonly extrinsic = 'api.tx.unique.createCollectionEx';
  readonly signer;
  readonly transformationFn: (collectionId: number) => T;
  private collectionOptions: ICollectionCreationOptions;
  private helper: UniqueHelper;

  constructor(signer: IKeyringPair, collectionOptions: ICollectionCreationOptions, transformationFn: (collectionId: number) => T, helper: UniqueHelper) {
    this.helper = helper;
    this.signer = signer;
    this.collectionOptions = collectionOptions;
    this.transformationFn = transformationFn;

    // encode name, description, tokenPrefix properties
    for (const key of ['name', 'description', 'tokenPrefix']) {
      if (typeof this.collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] === 'string') {
        this.collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] = this.helper.util.str2vec(this.collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] as string);
      }
    }
  }

  private async execute(expectSuccess = true): Promise<number> {
    const result = await this.helper.executeExtrinsic(this.signer, this.extrinsic, [this.collectionOptions], expectSuccess);
    const collectionId = this.helper.util.extractCollectionIdFromCreationResult(result);
    return collectionId;
  }

  /**
   * Executes the transaction and assert that the collection has been created
   * @returns extended collection data
   */
  async expectSuccess() {
    const collectionId = await this.execute(true);
    const collectionData = await this.helper.collection.getData(collectionId);
    
    expect(this.helper.util.str2vec(collectionData!.name!)).to.deep.equal(this.collectionOptions.name);
    expect(this.helper.util.str2vec(collectionData!.description!)).to.deep.equal(this.collectionOptions.description);
    expect(this.helper.util.str2vec(collectionData!.raw.tokenPrefix!)).to.deep.equal(this.collectionOptions.tokenPrefix);

    return this.transformationFn(collectionId);
  }

  /**
   * Executes the transaction and asserts that the transaction has been rejected
   */
  async expectFailure(): Promise<void> {
    await expect(this.execute(false)).to.be.rejected;
  }
}
