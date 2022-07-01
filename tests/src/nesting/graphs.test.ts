import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';
import {tokenIdToCross} from '../eth/util/helpers';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {getCreateCollectionResult, transferExpectSuccess, setCollectionLimitsExpectSuccess} from '../util/helpers';

/**
 * ```dot
 * 4 -> 3 -> 2 -> 1
 * 7 -> 6 -> 5 -> 2
 * 8 -> 5
 * ```
 */
async function buildComplexObjectGraph(api: ApiPromise, sender: IKeyringPair): Promise<number> {
  const events = await executeTransaction(api, sender, api.tx.unique.createCollectionEx({mode: 'NFT', permissions: {nesting: {tokenOwner: true}}}));
  const {collectionId} = getCreateCollectionResult(events);

  await executeTransaction(api, sender, api.tx.unique.createMultipleItemsEx(collectionId, {NFT: Array(8).fill({owner: {Substrate: sender.address}})}));

  await transferExpectSuccess(collectionId, 8, sender, tokenIdToCross(collectionId, 5));

  await transferExpectSuccess(collectionId, 7, sender, tokenIdToCross(collectionId, 6));
  await transferExpectSuccess(collectionId, 6, sender, tokenIdToCross(collectionId, 5));
  await transferExpectSuccess(collectionId, 5, sender, tokenIdToCross(collectionId, 2));

  await transferExpectSuccess(collectionId, 4, sender, tokenIdToCross(collectionId, 3));
  await transferExpectSuccess(collectionId, 3, sender, tokenIdToCross(collectionId, 2));
  await transferExpectSuccess(collectionId, 2, sender, tokenIdToCross(collectionId, 1));

  return collectionId;
}

describe('Graphs', () => {
  it('Ouroboros can\'t be created in a complex graph', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const collection = await buildComplexObjectGraph(api, alice);
      const tokenTwoParent = tokenIdToCross(collection, 1);

      // to self
      await expect(
        executeTransaction(api, alice, api.tx.unique.transfer(tokenIdToCross(collection, 1), collection, 1, 1)),
        'first transaction',  
      ).to.be.rejectedWith(/structure\.OuroborosDetected/);
      // to nested part of graph
      await expect(
        executeTransaction(api, alice, api.tx.unique.transfer(tokenIdToCross(collection, 5), collection, 1, 1)),
        'second transaction',
      ).to.be.rejectedWith(/structure\.OuroborosDetected/);
      await expect(
        executeTransaction(api, alice, api.tx.unique.transferFrom(tokenTwoParent, tokenIdToCross(collection, 8), collection, 2, 1)),
        'third transaction',
      ).to.be.rejectedWith(/structure\.OuroborosDetected/);
    });
  });
});
