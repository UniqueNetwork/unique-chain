import {getApiConnection} from '../substrate/substrate-api';
import {requirePallets, Pallets} from '../deprecated-helpers/helpers';
import {expectTxFailure} from './util/helpers';
import {mintNft, createCollection, setResourcePriorities} from './util/tx';

describe('integration test: set NFT resource priorities', () => {
  let api: any;
  before(async function () {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });

  const alice = '//Alice';
  const bob = '//Bob';

  const createTestCollection = (issuerUri: string) => {
    return createCollection(
      api,
      issuerUri,
      'resprio-collection-metadata',
      null,
      'resprio',
    );
  };

  it('set NFT resource priorities', async () => {
    const owner = alice;

    const collectionId = await createTestCollection(alice);
    const nftId = await mintNft(api, alice, owner, collectionId, 'resprio-nft-metadata');

    await setResourcePriorities(api, alice, collectionId, nftId, [10, 42]);
  });

  it('[negative] set NFT resource priorities by a not-an-owner', async () => {
    const owner = alice;
    const attacker = bob;

    const collectionId = await createTestCollection(alice);
    const nftId = await mintNft(api, alice, owner, collectionId, 'resprio-nft-metadata');

    const tx = setResourcePriorities(api, attacker, collectionId, nftId, [10, 42]);

    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  it('[negative] set NFT resource priorities to non-existing NFT', async () => {
    const owner = alice;

    const collectionId = 0;
    const maxNftId = 0xFFFFFFFF;

    const tx = setResourcePriorities(api, alice, collectionId, maxNftId, [10, 42]);

    await expectTxFailure(/rmrkCore\.NoAvailableNftId/, tx);
  });

  after(() => { api.disconnect(); });
});
