import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { alicesPublicKey, bobsPublicKey } from '../accounts';
import getBalance from '../substrate/get-balance';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import waitNewBlocks from '../substrate/wait-new-blocks';
import {
  confirmSponsorshipExpectSuccess,
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

describe('Payment of commission if one block: ', () => {
  // tslint:disable-next-line: max-line-length
  it('Payment of commission if one block contains transactions for payment from the sponsor\'s balance and his (sponsor\'s) exclusion from the collection ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTxBob = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, changeAdminTxBob);
      const itemId = await createItemExpectSuccess(Bob, collectionId, 'NFT');
      await setCollectionSponsorExpectSuccess(collectionId, Bob.address);
      await confirmSponsorshipExpectSuccess(collectionId, '//Bob');
      //
      const [alicesBalanceBefore, bobsBalanceBefore] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);
      const sendItem = api.tx.nft.transfer(Alice.address, collectionId, itemId, 1);
      const revokeSponsor = api.tx.nft.removeCollectionSponsor(collectionId);
      await Promise.all
      ([
        sendItem.signAndSend(Bob),
        revokeSponsor.signAndSend(Alice),
      ]);
      const [alicesBalanceAfter, bobsBalanceAfter] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);
      // tslint:disable-next-line:no-unused-expression
      expect(alicesBalanceAfter === alicesBalanceBefore).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(bobsBalanceAfter === bobsBalanceBefore).to.be.true;
      const blockHash = await api.query.system.number();
      console.log(`blockHash: ${blockHash}`);
    });
  });
});
