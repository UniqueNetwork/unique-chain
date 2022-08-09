import {getApiConnection} from '../substrate/substrate-api';
import {expectTxFailure} from './util/helpers';
import {NftIdTuple, getChildren} from './util/fetch';
import {burnNft, createCollection, sendNft, mintNft} from './util/tx';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { requirePallets, Pallets } from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('integration test: burn nft', () => {
  const Alice = '//Alice';
  const Bob = '//Bob';

  let api: any;
  before(async function() {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });


  it('burn nft', async () => {
    await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const nftId = await mintNft(
        api,
        Alice,
        Alice,
        collectionId,
        'nft-metadata',
      );
      await burnNft(api, Alice, collectionId, nftId);
    });
  });

  it('burn nft with children', async () => {
    const collectionId = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const parentNftId = await mintNft(
      api,
      Alice,
      Alice,
      collectionId,
      'nft-metadata',
    );

    const childNftId = await mintNft(
      api,
      Alice,
      Alice,
      collectionId,
      'nft-metadata',
    );

    const newOwnerNFT: NftIdTuple = [collectionId, parentNftId];

    await sendNft(api, 'sent', Alice, collectionId, childNftId, newOwnerNFT);

    const childrenBefore = await getChildren(api, collectionId, parentNftId);
    expect(childrenBefore.length === 1, 'Error: parent NFT should have children')
      .to.be.true;

    const child = childrenBefore[0];
    expect(child.collectionId.eq(collectionId), 'Error: invalid child collection Id')
      .to.be.true;

    expect(child.nftId.eq(childNftId), 'Error: invalid child NFT Id')
      .to.be.true;

    await burnNft(api, Alice, collectionId, parentNftId);

    const childrenAfter = await getChildren(api, collectionId, parentNftId);

    expect(childrenAfter.length === 0, 'Error: children should be burned').to.be.true;
  });

  it('burn child nft', async () => {
    const collectionId = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const parentNftId = await mintNft(
      api,
      Alice,
      Alice,
      collectionId,
      'nft-metadata',
    );

    const childNftId = await mintNft(
      api,
      Alice,
      Alice,
      collectionId,
      'nft-metadata',
    );

    const newOwnerNFT: NftIdTuple = [collectionId, parentNftId];

    await sendNft(api, 'sent', Alice, collectionId, childNftId, newOwnerNFT);

    const childrenBefore = await getChildren(api, collectionId, parentNftId);
    expect(childrenBefore.length === 1, 'Error: parent NFT should have children')
      .to.be.true;

    const child = childrenBefore[0];
    expect(child.collectionId.eq(collectionId), 'Error: invalid child collection Id')
      .to.be.true;

    expect(child.nftId.eq(childNftId), 'Error: invalid child NFT Id')
      .to.be.true;

    await burnNft(api, Alice, collectionId, childNftId);

    const childrenAfter = await getChildren(api, collectionId, parentNftId);

    expect(childrenAfter.length === 0, 'Error: children should be burned').to.be.true;
  });

  it('[negative] burn non-existing NFT', async () => {
    await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const tx = burnNft(api, Alice, collectionId, 99999);
      await expectTxFailure(/rmrkCore\.NoAvailableNftId/, tx);
    });
  });

  it('[negative] burn not an owner NFT user', async () => {
    await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    ).then(async (collectionId) => {
      const nftId = await mintNft(
        api,
        Alice,
        Alice,
        collectionId,
        'nft-metadata',
      );
      const tx = burnNft(api, Bob, collectionId, nftId);
      await expectTxFailure(/rmrkCore\.NoPermission/, tx);
    });
  });

  after(() => {
    api.disconnect();
  });
});
