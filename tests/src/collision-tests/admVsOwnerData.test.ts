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

describe('Admin vs Owner changes the data in the token: ', () => {
  it('The collection admin changes the data in the token and in the same block the token owner also changes the data in it ', async () => {
    await usingApi(async (api) => {
      const AliceData = 1;
      const BobData = 2;
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, changeAdminTx);
      const timeoutPromise = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));
      const itemId = await createItemExpectSuccess(Bob, collectionId, 'NFT');
      //
      // tslint:disable-next-line: max-line-length
      const AliceTx = api.tx.nft.setVariableMetaData(collectionId, itemId, AliceData.toString());
      // tslint:disable-next-line: max-line-length
      const BobTx = api.tx.nft.setVariableMetaData(collectionId, itemId, BobData.toString());
      await Promise.all
      ([
        AliceTx.signAndSend(Alice),
        BobTx.signAndSend(Bob),
      ]);
      const item: any = await api.query.nft.nftItemList(collectionId, itemId);
      expect(item.VariableData).not.to.be.eq(null); // Pseudo-random selection of one of two values
      await timeoutPromise(20000);
    });
  });
});
