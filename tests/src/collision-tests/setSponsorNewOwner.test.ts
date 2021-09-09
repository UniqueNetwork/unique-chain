import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess, 
  setCollectionSponsorExpectSuccess,
  normalizeAccountId,
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

describe('Sponsored with new owner ', () => {
  // tslint:disable-next-line: max-line-length
  it('Confirmation of sponsorship of a collection in a block with a change in the owner of the collection: ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await setCollectionSponsorExpectSuccess(collectionId, Bob.address);
      const timeoutPromise = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));
      await timeoutPromise(20000);
      const confirmSponsorship = api.tx.nft.confirmSponsorship(collectionId);
      const changeCollectionOwner = api.tx.nft.changeCollectionOwner(collectionId, Ferdie.address);
      await Promise.all([
        confirmSponsorship.signAndSend(Bob),
        changeCollectionOwner.signAndSend(Alice),
      ]);
      await timeoutPromise(20000);
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.Sponsorship.confirmed).to.be.eq(Bob.address);
      expect(collection.Owner).to.be.eq(Ferdie.address);
      await timeoutPromise(20000);
    });
  });
});
