import {getApiConnection} from '../substrate/substrate-api';
import {expectTxFailure} from './util/helpers';
import {createCollection, deleteCollection} from './util/tx';

describe('integration test: delete collection', () => {
  let api: any;
  before(async () => {
    api = await getApiConnection();
  });

  const Alice = '//Alice';
  const Bob = '//Bob';

  it('delete NFT collection', async () => {
    await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      await deleteCollection(api, Alice, collectionId.toString());
    });
  });

  it('[negative] delete non-existing NFT collection', async () => {
    const tx = deleteCollection(api, Alice, '99999');
    await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx);
  });

  it('[negative] delete not an owner NFT collection', async () => {
    await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const tx = deleteCollection(api, Bob, collectionId.toString());
      await expectTxFailure(/uniques.NoPermission/, tx);
    });
  });

  after(() => {
    api.disconnect();
  });
});
