import {expect} from 'chai';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  getCreateCollectionResult,
  getDetailedCollectionInfo,
  getGenericResult,
} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('RMRK External Integration Test', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Creates a new RMRK collection that is tagged as external', async () => {
    await usingApi(async api => {
      const tx = api.tx.rmrkCore.createCollection('no-limit-metadata', null, 'no-limit-symbol');
      const events = await executeTransaction(api, alice, tx);
      const result = getCreateCollectionResult(events);

      const collection = (await getDetailedCollectionInfo(api, result.collectionId))!;
      expect(collection.readOnly.toHuman()).to.be.true;
    });
  });

  it('[Negative] Forbids NFT operations with an external collection', async () => {
    await usingApi(async api => {
      const tx1 = api.tx.rmrkCore.createCollection('metadata', null, 'symbol');
      const events1 = await executeTransaction(api, alice, tx1);

      const resultUnique1 = getCreateCollectionResult(events1);
      const uniqueCollectionId = resultUnique1.collectionId;

      const resultRmrk1 = getGenericResult(events1, 'rmrkCore', 'CollectionCreated', (data) => {
        return parseInt(data[1].toString(), 10);
      });
      const rmrkCollectionId: number = resultRmrk1.data!;

      const tx2 = api.tx.rmrkCore.mintNft(
        alice.address,
        rmrkCollectionId,
        alice.address,
        null,
        'nft-metadata',
        true,
      );
      const events2 = await executeTransaction(api, alice, tx2);
      const result2 = getGenericResult(events2, 'rmrkCore', 'NftMinted', (data) => {
        return parseInt(data[2].toString(), 10);
      });
      const rmrkNftId: number = result2.data!;

      const tx3 = api.tx.unique.burnItem(uniqueCollectionId, rmrkNftId, 1);
      await expect(executeTransaction(api, alice, tx3)).to.be.rejectedWith(/common\.CollectionIsExternal/);
    });
  });
});