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

describe('Deprivation of admin rights: ', () => {
  // tslint:disable-next-line: max-line-length
  it('In the block, the collection admin adds a token or changes data, and the collection owner deprives the admin of rights ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, changeAdminTx);
      const timeoutPromise = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));
      await timeoutPromise(10000);
      //
      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const addItemAdm = api.tx.nft.createMultipleItems(collectionId, Bob.address, args);
      const removeAdm = api.tx.nft.removeCollectionAdmin(collectionId, Bob.address);
      await Promise.all
      ([
        addItemAdm.signAndSend(Bob),
        removeAdm.signAndSend(Alice),
      ]);
      await timeoutPromise(10000);
      const itemsListIndex = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndex.toNumber()).to.be.equal(0);
      const adminList: any = (await api.query.nft.adminList(collectionId));
      expect(adminList).not.to.be.contains(Bob.address);
    });
  });
});
