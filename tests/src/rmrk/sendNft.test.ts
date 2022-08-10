import {expect} from 'chai';
import {getApiConnection} from '../substrate/substrate-api';
import {createCollection, mintNft, sendNft} from './util/tx';
import {NftIdTuple} from './util/fetch';
import {isNftChildOfAnother, expectTxFailure} from './util/helpers';
import {requirePallets, Pallets} from '../util/helpers';

describe('integration test: send NFT', () => {
  let api: any;
  before(async function () {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });

  const maxNftId = 0xFFFFFFFF;

  const alice = '//Alice';
  const bob = '//Bob';

  const createTestCollection = async (issuerUri: string) => {
    return await createCollection(
      api,
      issuerUri,
      'nft-collection-metadata',
      null,
      'nft-collection',
    );
  };


  it('send NFT to another user', async () => {
    const originalOwnerUri = alice;
    const newOwnerUri = bob;

    const collectionId = await createTestCollection(alice);

    const nftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'nft-metadata');

    await sendNft(api, 'sent', originalOwnerUri, collectionId, nftId, newOwnerUri);
  });

  it('[negative] unable to send non-existing NFT', async () => {
    const originalOwnerUri = alice;
    const newOwnerUri = bob;

    const collectionId = 0;
    const tx = sendNft(api, 'sent', originalOwnerUri, collectionId, maxNftId, newOwnerUri);

    await expectTxFailure(/rmrkCore\.NoAvailableNftId/, tx);
  });

  it('[negative] unable to send NFT by a not-an-owner', async () => {
    const originalOwnerUri = alice;
    const newOwnerUri = bob;

    const collectionId = await createTestCollection(alice);

    const nftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'nft-metadata');

    const tx = sendNft(api, 'sent', newOwnerUri, collectionId, nftId, newOwnerUri);
    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  it('send NFT to another NFT (same owner)', async () => {
    const originalOwnerUri = alice;

    const collectionId = await createTestCollection(alice);

    const parentNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [collectionId, parentNftId];

    await sendNft(api, 'sent', alice, collectionId, childNftId, newOwnerNFT);

    const isChild = await isNftChildOfAnother(api, collectionId, childNftId, newOwnerNFT);
    expect(isChild).to.be.true;
  });

  it('[negative] send non-existing NFT to another NFT', async () => {
    const originalOwnerUri = alice;

    const collectionId = await createTestCollection(alice);

    const parentNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'parent-nft-metadata');
    const childNftId = maxNftId;

    const newOwnerNFT: NftIdTuple = [collectionId, parentNftId];

    const tx = sendNft(api, 'sent', alice, collectionId, childNftId, newOwnerNFT);

    await expectTxFailure(/rmrkCore\.NoAvailableNftId/, tx);

    const isChild = await isNftChildOfAnother(api, collectionId, childNftId, newOwnerNFT);
    expect(isChild).to.be.false;
  });

  it('send NFT to another NFT (by not-an-owner)', async () => {
    const originalOwnerUri = alice;

    const collectionId = await createTestCollection(alice);

    const author = alice;
    const attacker = bob;

    const parentNftId = await mintNft(api, author, originalOwnerUri, collectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, author, originalOwnerUri, collectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [collectionId, parentNftId];

    const tx = sendNft(api, 'sent', attacker, collectionId, childNftId, newOwnerNFT);

    await expectTxFailure(/rmrkCore\.NoPermission/, tx);

    const isChild = await isNftChildOfAnother(api, collectionId, childNftId, newOwnerNFT);
    expect(isChild).to.be.false;
  });

  it('[negative] send NFT to non-existing NFT', async () => {
    const originalOwnerUri = alice;

    const collectionId = await createTestCollection(alice);

    const parentNftId = maxNftId;
    const childNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [collectionId, parentNftId];

    const tx = sendNft(api, 'sent', alice, collectionId, childNftId, newOwnerNFT);

    await expectTxFailure(/rmrkCore\.NoAvailableNftId/, tx);

    const isChild = await isNftChildOfAnother(api, collectionId, childNftId, newOwnerNFT);
    expect(isChild).to.be.false;
  });

  it('send NFT to another NFT owned by another user', async () => {
    const ownerAlice = alice;
    const ownerBob = bob;

    const aliceCollectionId = await createTestCollection(alice);
    const bobCollectionId = await createTestCollection(bob);

    const parentNftId = await mintNft(api, alice, ownerAlice, aliceCollectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, bob, ownerBob, bobCollectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [aliceCollectionId, parentNftId];

    await sendNft(api, 'pending', bob, bobCollectionId, childNftId, newOwnerNFT);
  });

  it('[negative] unable to send NFT to itself', async () => {
    const nftOwner = alice;
    const collectionId = await createTestCollection(alice);

    const nftId = await mintNft(api, alice, nftOwner, collectionId, 'ouroboros-nft-metadata');

    const newOwnerNFT: NftIdTuple = [collectionId, nftId];

    const tx = sendNft(api, 'sent', alice, collectionId, nftId, newOwnerNFT);

    await expectTxFailure(/rmrkCore\.CannotSendToDescendentOrSelf/, tx);

    const isChild = await isNftChildOfAnother(api, collectionId, nftId, newOwnerNFT);
    expect(isChild).to.be.false;
  });

  it('[negative] unable to send NFT to child NFT', async () => {
    const originalOwnerUri = alice;

    const collectionId = await createTestCollection(alice);

    const parentNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [collectionId, parentNftId];

    await sendNft(api, 'sent', alice, collectionId, childNftId, newOwnerNFT);

    const isChild = await isNftChildOfAnother(api, collectionId, childNftId, newOwnerNFT);
    expect(isChild).to.be.true;

    const descendentOwner: NftIdTuple = [collectionId, childNftId];
    const tx = sendNft(api, 'sent', alice, collectionId, parentNftId, descendentOwner);

    await expectTxFailure(/rmrkCore\.CannotSendToDescendentOrSelf/, tx);
    const isOuroboros = await isNftChildOfAnother(api, collectionId, parentNftId, descendentOwner);
    expect(isOuroboros).to.be.false;
  });

  it('[negative] unable to send NFT to descendent NFT', async () => {
    const originalOwnerUri = alice;

    const collectionId = await createTestCollection(alice);

    const parentNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'child-nft-metadata');
    const grandsonNftId = await mintNft(api, alice, originalOwnerUri, collectionId, 'grandson-nft-metadata');

    const ownerParentNFT: NftIdTuple = [collectionId, parentNftId];

    await sendNft(api, 'sent', alice, collectionId, childNftId, ownerParentNFT);

    const isChild = await isNftChildOfAnother(api, collectionId, childNftId, ownerParentNFT);
    expect(isChild).to.be.true;

    const ownerChildNFT: NftIdTuple = [collectionId, childNftId];
    await sendNft(api, 'sent', alice, collectionId, grandsonNftId, ownerChildNFT);

    const isGrandson = await isNftChildOfAnother(api, collectionId, grandsonNftId, ownerChildNFT);
    expect(isGrandson).to.be.true;

    const ownerGrandsonNFT: NftIdTuple = [collectionId, grandsonNftId];
    const tx = sendNft(api, 'sent', alice, collectionId, parentNftId, ownerGrandsonNFT);

    await expectTxFailure(/rmrkCore\.CannotSendToDescendentOrSelf/, tx);
    const isOuroboros = await isNftChildOfAnother(api, collectionId, parentNftId, ownerGrandsonNFT);
    expect(isOuroboros).to.be.false;
  });

  it('send nested NFT to another user', async () => {
    const originalOwner = alice;
    const newOwner = bob;

    const collectionId = await createTestCollection(alice);

    const parentNftId = await mintNft(api, alice, originalOwner, collectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, alice, originalOwner, collectionId, 'child-nft-metadata');

    const parentNftTuple: NftIdTuple = [collectionId, parentNftId];

    await sendNft(api, 'sent', originalOwner, collectionId, childNftId, parentNftTuple);

    await sendNft(api, 'sent', originalOwner, collectionId, childNftId, newOwner);
  });

  it('[negative] send nested NFT to another user (by a not-root-owner)', async () => {
    const originalOwner = alice;
    const newOwner = bob;

    const collectionId = await createTestCollection(alice);

    const parentNftId = await mintNft(api, alice, originalOwner, collectionId, 'parent-nft-metadata');
    const childNftId = await mintNft(api, alice, originalOwner, collectionId, 'child-nft-metadata');

    const parentNftTuple: NftIdTuple = [collectionId, parentNftId];

    await sendNft(api, 'sent', originalOwner, collectionId, childNftId, parentNftTuple);

    const tx = sendNft(api, 'sent', newOwner, collectionId, childNftId, newOwner);

    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  after(() => { api.disconnect(); });
});
