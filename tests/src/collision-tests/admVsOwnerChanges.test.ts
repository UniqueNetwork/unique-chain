import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { alicesPublicKey, bobsPublicKey } from '../accounts';
import getBalance from '../substrate/get-balance';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import waitNewBlocks from '../substrate/wait-new-blocks';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  setCollectionSponsorExpectSuccess,
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

describe('Admin vs Owner changes token: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The collection admin changes the owner of the token and in the same block the current owner transfers the token to another address ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTxBob = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, changeAdminTxBob);
      const timeoutPromise = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));
      const changeAdminTxFerdie = api.tx.nft.addCollectionAdmin(collectionId, Ferdie.address);
      await submitTransactionAsync(Bob, changeAdminTxFerdie);
      const itemId = await createItemExpectSuccess(Ferdie, collectionId, 'NFT');
      //
      const changeOwner = api.tx.nft.transferFrom(Ferdie.address, Bob.address, collectionId, itemId, 1);
      const approve = api.tx.nft.approve(Bob.address, collectionId, itemId, 1);
      const sendItem = api.tx.nft.transfer(Alice.address, collectionId, itemId, 1);
      await Promise.all
      ([
        changeOwner.signAndSend(Alice),
        approve.signAndSend(Bob),
        sendItem.signAndSend(Ferdie),
      ]);
      const itemBefore: any = await api.query.nft.nftItemList(collectionId, itemId);
      expect(itemBefore.Owner).not.to.be.eq(Bob.address);
      await timeoutPromise(20000);
    });
  });
});
