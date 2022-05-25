import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';
import {tokenIdToCross} from '../eth/util/helpers';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {getCreateCollectionResult, transferExpectSuccess} from '../util/helpers';

/**
 * ```dot
 * 4 -> 3 -> 2 -> 1
 * 7 -> 6 -> 5 -> 2
 * 8 -> 5
 * ```
 */
async function buildComplexObjectGraph(api: ApiPromise, sender: IKeyringPair): Promise<number> {
  const events = await executeTransaction(api, sender, api.tx.unique.createCollectionEx({mode: 'NFT', limits: {nestingRule: 'Owner'}}));
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

describe.skip('Graphs', () => {
  it('Ouroboros can\'t be created in a complex graph', async () => {
    await usingApi(async api => {
      const alice = privateKey('//alice');
      const collection = await buildComplexObjectGraph(api, alice);

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
        executeTransaction(api, alice, api.tx.unique.transfer(tokenIdToCross(collection, 8), collection, 2, 1)),
        'third transaction',
      ).to.be.rejectedWith(/structure\.OuroborosDetected/);
    });
  });
});

import type { EventRecord } from '@polkadot/types/interfaces';
import type { GenericEventData } from '@polkadot/types';
import type { Option, Bytes } from '@polkadot/types-codec';
import type {
    RmrkTypesCollectionInfo as Collection,
    RmrkTypesNftInfo as Nft,
    RmrkTypesResourceInfo as Resource,
    RmrkTypesBaseInfo as Base,
    RmrkTypesPartType as PartType,
    RmrkTypesNftChild as NftChild,
    RmrkTypesTheme as Theme,
    RmrkTypesPropertyInfo as Property,
} from '@polkadot/types/lookup';

interface TxResult<T> {
  success: boolean;
  successData: T | null;
}

export function extractTxResult<T>(
  events: EventRecord[],
  expectSection: string,
  expectMethod: string,
  extractAction: (data: GenericEventData) => T
): TxResult<T> {
  let success = false;
  let successData = null;
  events.forEach(({event: {data, method, section}}) => {
    //console.log(expectSection + " "+ " " + section + " " + expectMethod + " " + method)
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((expectSection == section) && (expectMethod == method)) {
      successData = extractAction(data);
    }
  });
  const result: TxResult<T> = {
      success,
      successData,
  };
  return result;
}

export function extractRmrkCoreTxResult<T>(
  events: EventRecord[],
  expectMethod: string,
  extractAction: (data: GenericEventData) => T
): TxResult<T> {
  return extractTxResult(events, 'rmrkCore', expectMethod, extractAction);
}

export async function expectTxFailure(expectedError: RegExp, promise: Promise<any>) {
  await expect(promise).to.be.rejectedWith(expectedError);
}

export async function getCollectionsCount(api: ApiPromise): Promise<number> {
  return (await api.rpc.rmrk.lastCollectionIdx()).toNumber();
}

export async function getCollection(api: ApiPromise, id: number): Promise<Option<Collection>> {
  return api.rpc.rmrk.collectionById(id);
}

export async function createCollection(
  api: ApiPromise,
  issuerUri: string,
  metadata: string,
  max: number | null,
  symbol: string
): Promise<number> {
  let collectionId = 0;

  const oldCollectionCount = await getCollectionsCount(api);
  const maxOptional = max ? max.toString() : null;
  console.log(maxOptional)
  console.log('right above me')

  const issuer = privateKey(issuerUri);
  const tx = api.tx.rmrkCore.createCollection(metadata, maxOptional, symbol);
  const events = await executeTransaction(api, issuer, tx);

  const collectionResult = extractRmrkCoreTxResult(
    events, 'CollectionCreated', (data) => {
      return parseInt(data[1].toString(), 10)
    }
  );
  expect(collectionResult.success, 'Error: unable to create a collection').to.be.true;
  const newCollectionCount = await getCollectionsCount(api);
  expect(newCollectionCount).to.be.equal(oldCollectionCount + 1, 'Error: NFT collection count should increase');

  collectionId = collectionResult.successData ?? 0;
  
  console.log(collectionId);

  const collectionOption = await getCollection(api, collectionId);

  expect(collectionOption.isSome, 'Error: unable to fetch created NFT collection').to.be.true;

  const collection = collectionOption.unwrap();

  expect(collection.metadata.toUtf8()).to.be.equal(metadata, "Error: Invalid NFT collection metadata");
  console.log(collection.max, max)
  expect(collection.max.isSome).to.be.equal(max !== null, "Error: Invalid NFT collection max");

  if (collection.max.isSome) {
      expect(collection.max.unwrap().toNumber()).to.be.equal(max, "Error: Invalid NFT collection max");
  }
  expect(collection.symbol.toUtf8()).to.be.equal(symbol, "Error: Invalid NFT collection's symbol");
  expect(collection.nftsCount.toNumber()).to.be.equal(0, "Error: NFT collection shoudn't have any tokens");
  expect(collection.issuer.toString()).to.be.equal(issuer.address, "Error: Invalid NFT collection issuer");

  return collectionId;
}

export async function deleteCollection(
  api: ApiPromise,
  issuerUri: string,
  collectionId: string
): Promise<number> {
  const issuer = privateKey(issuerUri);
  const tx = api.tx.rmrkCore.destroyCollection(collectionId);
  const events = await executeTransaction(api, issuer, tx);

  const collectionTxResult = extractRmrkCoreTxResult(
      events,
      "CollectionDestroy",
      (data) => {
      return parseInt(data[1].toString(), 10);
      }
  );
  expect(collectionTxResult.success, 'Error: Unable to delete NFT collection').to.be.true;

  const collection = await getCollection(
      api,
      parseInt(collectionId, 10)
  );
  expect(collection.isEmpty, 'Error: NFT collection should be deleted').to.be.true;

  return 0;
}

describe('Something', () => {
  const alice = '//Alice';
  const bob = "//Bob";

  it('create NFT collection', async () => {
    await usingApi(async api => {
      await createCollection(api, alice, 'test-metadata', 42, 'test-symbol');
      //console.log((await api.rpc.rmrk.base(3)).toHuman());
    });
  });

  it('create NFT collection without token limit', async () => {
    await usingApi(async api => {
      await createCollection(api, alice, 'no-limit-metadata', null, 'no-limit-symbol');
    });
  });

  it("Delete NFT collection", async () => {
    await usingApi(async api => {
      await createCollection(
        api,
        alice,
        "test-metadata",
        null,
        "test-symbol"
      ).then(async (collectionId) => {
        await deleteCollection(api, alice, collectionId.toString());
      });
    });
  });

  it("[Negative] delete non-existing NFT collection", async () => {
    await usingApi(async api => {
      const tx = deleteCollection(api, alice, "99999");
      await expectTxFailure(/rmrkCore.CollectionUnknown/, tx);
    });
  });

  it("[Negative] delete not an owner NFT collection", async () => {
    await usingApi(async api => {
      await createCollection(
        api,
        alice,
        "test-metadata",
        null,
        "test-symbol"
      ).then(async (collectionId) => {
        const tx = deleteCollection(api, bob, collectionId.toString());
        await expectTxFailure(/uniques.NoPermission/, tx);
      });
    });
  });
});