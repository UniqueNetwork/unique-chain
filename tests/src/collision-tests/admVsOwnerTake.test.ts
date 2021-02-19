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

describe('Admin vs Owner take token: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The collection admin burns the token and in the same block the token owner performs a transaction on it ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, changeAdminTx);
      const itemId = await createItemExpectSuccess(Bob, collectionId, 'NFT');
      //
      const sendItem = api.tx.nft.transfer(Ferdie.address, collectionId, itemId, 1);
      const burnItem = api.tx.nft.burnItem(collectionId, itemId, 1);
      await Promise.all
      ([
        sendItem.signAndSend(Bob),
        burnItem.signAndSend(Alice),
      ]);
      const itemBurn: any = await api.query.nft.nftItemList(collectionId, itemId);
      expect(itemBurn.Owner.toString()).to.be.eq('5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM');
      const blockHash = await api.query.system.number();
      console.log(`blockHash: ${blockHash}`);
    });
  });
});
