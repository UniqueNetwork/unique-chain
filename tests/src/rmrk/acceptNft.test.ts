import {expect} from 'chai';
import {getApiConnection} from '../substrate/substrate-api';
import {
  createCollection,
  mintNft,
  sendNft,
  acceptNft,
} from './util/tx';
import {NftIdTuple} from './util/fetch';
import {isNftChildOfAnother, expectTxFailure, requirePallets, Pallets} from './util/helpers';

describe('integration test: accept NFT', () => {
  let api: any;
  before(async function() {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });
  
  
  const alice = '//Alice';
  const bob = '//Bob';
  
  const createTestCollection = async (issuerUri: string) => {
    return await createCollection(
      api,
      issuerUri,
      'accept-metadata',
      null,
      'acpt',
    );
  };

  it('accept NFT', async () => {
    const ownerAlice = alice;
    const ownerBob = bob;

    const aliceCollectionId = await createTestCollection(alice);
    const bobCollectionId = await createTestCollection(bob);

    const parentNftId = await mintNft(api, alice, ownerAlice, aliceCollectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, bob, ownerBob, bobCollectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [aliceCollectionId, parentNftId];

    await sendNft(api, 'pending', ownerBob, bobCollectionId, childNftId, newOwnerNFT);
    await acceptNft(api, alice, bobCollectionId, childNftId, newOwnerNFT);

    const isChild = await isNftChildOfAnother(api, bobCollectionId, childNftId, newOwnerNFT);
    expect(isChild).to.be.true;
  });

  it('[negative] unable to accept NFT by a not-an-owner', async () => {
    const ownerAlice = alice;
    const ownerBob = bob;

    const aliceCollectionId = await createTestCollection(alice);
    const bobCollectionId = await createTestCollection(bob);

    const parentNftId = await mintNft(api, alice, ownerAlice, aliceCollectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, bob, ownerBob, bobCollectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [aliceCollectionId, parentNftId];

    await sendNft(api, 'pending', ownerBob, bobCollectionId, childNftId, newOwnerNFT);
    const tx = acceptNft(api, bob, bobCollectionId, childNftId, newOwnerNFT);

    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  it('[negative] unable to accept non-existing NFT', async () => {
    const collectionId = 0;
    const maxNftId = 0xFFFFFFFF;

    const owner = alice;
    const aliceCollectionId = await createTestCollection(alice);

    const parentNftId = await mintNft(api, alice, owner, aliceCollectionId, 'parent-nft-metadata');

    const newOwnerNFT: NftIdTuple = [aliceCollectionId, parentNftId];

    const tx = acceptNft(api, alice, collectionId, maxNftId, newOwnerNFT);

    await expectTxFailure(/rmrkCore\.NoAvailableNftId/, tx);
  });

  it('[negative] unable to accept NFT which is not sent', async () => {
    const ownerAlice = alice;
    const ownerBob = bob;

    const aliceCollectionId = await createTestCollection(alice);
    const bobCollectionId = await createTestCollection(bob);

    const parentNftId = await mintNft(api, alice, ownerAlice, aliceCollectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, bob, ownerBob, bobCollectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [aliceCollectionId, parentNftId];

    const tx = acceptNft(api, alice, bobCollectionId, childNftId, newOwnerNFT);

    await expectTxFailure(/rmrkCore\.NoPermission/, tx);

    const isChild = await isNftChildOfAnother(api, bobCollectionId, childNftId, newOwnerNFT);
    expect(isChild).to.be.false;
  });

  after(() => { api.disconnect(); });
});
