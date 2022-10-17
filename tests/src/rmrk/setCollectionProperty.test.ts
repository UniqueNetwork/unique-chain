import {getApiConnection} from '../substrate/substrate-api';
import {expectTxFailure, requirePallets, Pallets} from './util/helpers';
import {createCollection, setPropertyCollection} from './util/tx';

describe('integration test: set collection property', () => {
  const Alice = '//Alice';
  const Bob = '//Bob';

  let api: any;
  before(async function () {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });

  it('set collection property', async () => {
    await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      await setPropertyCollection(api, Alice, collectionId, 'test_key', '42');
      await setPropertyCollection(api, Alice, collectionId, 'test_key', '10');
      await setPropertyCollection(
        api,
        Alice,
        collectionId,
        'second_test_key',
        '111',
      );
    });
  });

  it('[negative] set non-existing collection property', async () => {
    const tx = setPropertyCollection(
      api,
      Alice,
      9999,
      'test_key',
      '42',
    );
    await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx);
  });

  it('[negative] set property not an owner NFT collection issuer', async () => {
    await createCollection(
      api,
      Bob,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const tx = setPropertyCollection(
        api,
        Alice,
        collectionId,
        'test_key',
        '42',
      );
      await expectTxFailure(/rmrkCore\.NoPermission/, tx);
    });
  });

  after(async() => { await api.disconnect(); });
});
