import {getApiConnection} from '../substrate/substrate-api';
import {expectTxFailure, requirePallets, Pallets} from './util/helpers';
import {createCollection, setPropertyCollection} from './util/tx';

describe('integration test: set collection property', () => {
  const alice = '//Alice';
  const bob = '//Bob';

  let api: any;
  before(async function () {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });

  it('set collection property', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      await setPropertyCollection(api, alice, collectionId, 'test_key', '42');
      await setPropertyCollection(api, alice, collectionId, 'test_key', '10');
      await setPropertyCollection(
        api,
        alice,
        collectionId,
        'second_test_key',
        '111',
      );
    });
  });

  it('[negative] set non-existing collection property', async () => {
    const tx = setPropertyCollection(
      api,
      alice,
      9999,
      'test_key',
      '42',
    );
    await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx);
  });

  it('[negative] set property not an owner NFT collection issuer', async () => {
    await createCollection(
      api,
      bob,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const tx = setPropertyCollection(
        api,
        alice,
        collectionId,
        'test_key',
        '42',
      );
      await expectTxFailure(/rmrkCore\.NoPermission/, tx);
    });
  });

  after(async() => { await api.disconnect(); });
});
