import {getApiConnection} from '../substrate/substrate-api';
import {expectTxFailure, requirePallets, Pallets} from './util/helpers';
import {createCollection, deleteCollection} from './util/tx';

describe('integration test: delete collection', () => {
  let api: any;
  before(async function () {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });

  const alice = '//Alice';
  const bob = '//Bob';

  it('delete NFT collection', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      await deleteCollection(api, alice, collectionId.toString());
    });
  });

  it('[negative] delete non-existing NFT collection', async () => {
    const tx = deleteCollection(api, alice, '99999');
    await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx);
  });

  it('[negative] delete not an owner NFT collection', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const tx = deleteCollection(api, bob, collectionId.toString());
      await expectTxFailure(/rmrkCore.NoPermission/, tx);
    });
  });

  after(async() => { await api.disconnect(); });
});
