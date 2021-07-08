import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Ferdie: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
    Ferdie = privateKey('//Ferdie');
  });
});

describe('Admin vs Owner take token: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The collection admin burns the token and in the same block the token owner performs a transaction on it ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, changeAdminTx);
      const timeoutPromise = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));
      const itemId = await createItemExpectSuccess(Bob, collectionId, 'NFT');
      //
      const sendItem = api.tx.nft.transfer(Ferdie.address, collectionId, itemId, 1);
      const burnItem = api.tx.nft.burnItem(collectionId, itemId, 1);
      await Promise.all([
        sendItem.signAndSend(Bob),
        burnItem.signAndSend(Alice),
      ]);
      await timeoutPromise(10000);
      let itemBurn = false;
      itemBurn = (await (api.query.nft.nftItemList(collectionId, itemId))).toJSON() as boolean;
      // tslint:disable-next-line: no-unused-expression
      expect(itemBurn).to.be.null;
      await timeoutPromise(20000);
    });
  });
});
