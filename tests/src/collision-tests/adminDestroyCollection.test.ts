import { IKeyringPair } from '@polkadot/types/types';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync, submitTransactionExpectFailAsync } from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
interface ITokenDataType {
  Owner: number[];
  ConstData: number[];
  VariableData: number[];
}
let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Ferdie: IKeyringPair;
let Charlie: IKeyringPair;
let Eve: IKeyringPair;
let Dave: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
    Ferdie = privateKey('//Ferdie');
    Charlie = privateKey('//Charlie');
    Eve = privateKey('//Eve');
    Dave = privateKey('//Dave');
  });
});

describe('Deleting a collection while add address to whitelist: ', () => {
  // tslint:disable-next-line: max-line-length
  it('Adding an address to the collection whitelist in a block by the admin, and deleting the collection by the owner ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, changeAdminTx);
      const timeoutPromise = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));
      await timeoutPromise(10000);
      //
      const addWhitelistAdm = api.tx.nft.addToWhiteList(collectionId, Ferdie.address);
      const destroyCollection = api.tx.nft.destroyCollection(collectionId);
      await Promise.all
      ([
        addWhitelistAdm.signAndSend(Bob),
        destroyCollection.signAndSend(Alice),
      ]);
      await timeoutPromise(10000);
      let whiteList: boolean = false;
      whiteList = (await api.query.nft.whiteList(collectionId, Ferdie.address)).toJSON() as boolean;
      // tslint:disable-next-line: no-unused-expression
      expect(whiteList).to.be.false;
      await timeoutPromise(20000);
    });
  });
});
