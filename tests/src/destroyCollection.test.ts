import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi, submitTransactionAsync } from "./substrate/substrate-api";
import { createCollectionExpectSuccess, createCollectionExpectFailure, destroyCollectionExpectSuccess, destroyCollectionExpectFailure } from "./util/helpers";
import type { AccountId, EventRecord } from '@polkadot/types/interfaces';
import privateKey from './substrate/privateKey';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('integration test: ext. destroyCollection():', () => {
  it('NFT collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess('A', 'B', 'C', 'NFT');
    await destroyCollectionExpectSuccess(collectionId);
  });
  it('Fungible collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess('A', 'B', 'C', 'Fungible');
    await destroyCollectionExpectSuccess(collectionId);
  });
  it('ReFungible collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess('A', 'B', 'C', 'ReFungible');
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('(!negative test!) integration test: ext. destroyCollection():', () => {
  it('(!negative test!) Destroy a collection that never existed', async () => {
    await usingApi(async (api) => {
      // Find the collection that never existed
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      await destroyCollectionExpectFailure(collectionId);
    });
  });
  it('(!negative test!) Destroy a collection that has already been destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess('A', 'B', 'C', 'NFT');
    await destroyCollectionExpectSuccess(collectionId);
    await destroyCollectionExpectFailure(collectionId);
  });
  it('(!negative test!) Destroy a collection using non-owner account', async () => {
    const collectionId = await createCollectionExpectSuccess('A', 'B', 'C', 'NFT');
    await destroyCollectionExpectFailure(collectionId, '//Bob');
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
  });
});
