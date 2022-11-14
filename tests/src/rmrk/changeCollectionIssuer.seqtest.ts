import {getApiConnection} from '../substrate/substrate-api';
import {expectTxFailure, requirePallets, Pallets} from './util/helpers';
import {
  changeIssuer,
  createCollection,
} from './util/tx';

describe('integration test: collection issuer', () => {
  const alice = '//Alice';
  const bob = '//Bob';

  let api: any;
  before(async function() {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });



  it('change collection issuer', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      await changeIssuer(api, alice, collectionId, bob);
    });
  });

  it('[negative] change not an owner NFT collection issuer', async () => {
    await createCollection(api, bob, 'test-metadata', null, 'test-symbol').then(async (collectionId) => {
      const tx = changeIssuer(api, alice, collectionId, bob);
      await expectTxFailure(/rmrkCore\.NoPermission/, tx);
    });
  });

  it('[negative] change non-existigit NFT collection issuer', async () => {
    await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async () => {
      const tx = changeIssuer(api, alice, 99999, bob);
      await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx);
    });
  });

  after(async() => { await api.disconnect(); });
});
