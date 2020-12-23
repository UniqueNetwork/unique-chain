import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi, submitTransactionAsync } from "./substrate/substrate-api";
import { createCollectionExpectSuccess, createCollectionExpectFailure } from "./util/helpers";
import type { AccountId, EventRecord } from '@polkadot/types/interfaces';
import privateKey from './substrate/privateKey';
import { nullPublicKey } from './accounts'; 

chai.use(chaiAsPromised);
const expect = chai.expect;

function getDestroyResult(events: EventRecord[]): boolean {
  let success: boolean = false;
  events.forEach(({ phase, event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    }
  });
  return success;
}

async function destroyCollectionExpectSuccess(collectionId: number, senderSeed: string = '//Alice') {
  await usingApi(async (api) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.destroyCollection(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getDestroyResult(events);

    // Get the collection 
    const collection: any = (await api.query.nft.collection(collectionId)).toJSON();

    // What to expect
    expect(result).to.be.true;
    expect(collection).to.be.not.null;
    expect(collection.Owner).to.be.equal(nullPublicKey);
  });
}

async function destroyCollectionExpectFailure(collectionId: number, senderSeed: string = '//Alice') {
  await usingApi(async (api) => {
    // Run the DestroyCollection transaction
    const alicePrivateKey = privateKey(senderSeed);
    const tx = api.tx.nft.destroyCollection(collectionId);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getDestroyResult(events);

    // What to expect
    expect(result).to.be.false;
  });
}

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
