import {getApiConnection} from '../substrate/substrate-api';
import {requirePallets, Pallets} from '../deprecated-helpers/helpers';
import {expectTxFailure} from './util/helpers';
import {createCollection, lockCollection, mintNft} from './util/tx';

describe('integration test: lock collection', () => {
  const alice = '//Alice';
  const bob = '//Bob';
  const max = 5;

  let api: any;
  before(async function () {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });

  it('lock collection', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      await lockCollection(api, alice, collectionId);
    });
  });

  it('[negative] lock non-existing NFT collection', async () => {
    const tx = lockCollection(api, alice, 99999);
    await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx);
  });

  it('[negative] lock not an owner NFT collection issuer', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const tx = lockCollection(api, bob, collectionId);
      await expectTxFailure(/rmrkCore\.NoPermission/, tx);
    });
  });

  it('lock collection with minting', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      max,
      'test-symbol',
    ).then(async (collectionId) => {
      for (let i = 0; i < 5; i++) {
        await mintNft(
          api,
          alice,
          alice,
          collectionId,
          'test-metadata',
          null,
          null,
        );
      }
      await lockCollection(api, alice, collectionId, max);
    });
  });

  it('[negative] unable to mint NFT inside a locked collection', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      max,
      'test-symbol',
    ).then(async (collectionId) => {
      await lockCollection(api, alice, collectionId);
      const tx = mintNft(
        api,
        alice,
        alice,
        collectionId,
        'test-metadata',
        null,
        null,
      );
      await expectTxFailure(/rmrkCore\.CollectionFullOrLocked/, tx);
    });
  });

  it('[negative] unable to mint NFT inside a full collection', async () => {
    await createCollection(api, alice, 'test-metadata', 1, 'test-symbol').then(async (collectionId) => {
      await mintNft(
        api,
        alice,
        alice,
        collectionId,
        'test-metadata',
        null,
        null,
      );
      const tx = mintNft(
        api,
        alice,
        alice,
        collectionId,
        'test-metadata',
        null,
        null,
      );
      await expectTxFailure(/rmrkCore\.CollectionFullOrLocked/, tx);
    });
  });

  after(() => {
    api.disconnect();
  });
});
