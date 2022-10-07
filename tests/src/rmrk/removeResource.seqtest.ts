import {getApiConnection} from '../substrate/substrate-api';
import {requirePallets, Pallets} from '../deprecated-helpers/helpers';
import {NftIdTuple} from './util/fetch';
import {expectTxFailure} from './util/helpers';
import {
  acceptResourceRemoval, addNftBasicResource, createCollection, mintNft, removeNftResource, sendNft,
} from './util/tx';




describe('Integration test: remove nft resource', () => {
  let api: any;
  before(async function() {
    api = await getApiConnection();
    await requirePallets(this, [Pallets.RmrkCore]);
  });

  const alice = '//Alice';
  const bob = '//Bob';
  const src = 'test-basic-src';
  const metadata = 'test-basic-metadata';
  const license = 'test-basic-license';
  const thumb = 'test-basic-thumb';

  it('deleting a resource directly by the NFT owner', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      alice,
      alice,
      collectionIdAlice,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'added',
      collectionIdAlice,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );

    await removeNftResource(api, 'removed', alice, collectionIdAlice, nftAlice, resourceId);
  });

  it('deleting resources indirectly by the NFT owner', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const parentNftId = await mintNft(api, alice, alice, collectionIdAlice, 'parent-nft-metadata');
    const childNftId = await mintNft(api, alice, alice, collectionIdAlice, 'child-nft-metadata');

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'added',
      collectionIdAlice,
      childNftId,
      src,
      metadata,
      license,
      thumb,
    );

    const newOwnerNFT: NftIdTuple = [collectionIdAlice, parentNftId];

    await sendNft(api, 'sent', alice, collectionIdAlice, childNftId, newOwnerNFT);

    await removeNftResource(api, 'removed', alice, collectionIdAlice, childNftId, resourceId);
  });

  it('deleting a resource by the collection owner', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftBob = await mintNft(
      api,
      alice,
      bob,
      collectionIdAlice,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'pending',
      collectionIdAlice,
      nftBob,
      src,
      metadata,
      license,
      thumb,
    );

    await removeNftResource(api, 'pending', alice, collectionIdAlice, nftBob, resourceId);
    await acceptResourceRemoval(api, bob, collectionIdAlice, nftBob, resourceId);
  });

  it('deleting a resource in a nested NFT by the collection owner', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const parentNftId = await mintNft(
      api,
      alice,
      bob,
      collectionIdAlice,
      'parent-nft-metadata',
    );
    const childNftId = await mintNft(
      api,
      alice,
      bob,
      collectionIdAlice,
      'child-nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'pending',
      collectionIdAlice,
      childNftId,
      src,
      metadata,
      license,
      thumb,
    );

    const newOwnerNFT: NftIdTuple = [collectionIdAlice, parentNftId];

    await sendNft(api, 'sent', bob, collectionIdAlice, childNftId, newOwnerNFT);

    await removeNftResource(api, 'pending', alice, collectionIdAlice, childNftId, resourceId);
    await acceptResourceRemoval(api, bob, collectionIdAlice, childNftId, resourceId);
  });

  it('[negative]: can\'t delete a resource in a non-existing collection', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      alice,
      alice,
      collectionIdAlice,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'added',
      collectionIdAlice,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );

    const tx = removeNftResource(api, 'removed', alice, 0xFFFFFFFF, nftAlice, resourceId);
    await expectTxFailure(/rmrkCore\.CollectionUnknown/, tx); // FIXME: inappropriate error message (NoAvailableNftId)
  });

  it('[negative]: only collection owner can delete a resource', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      alice,
      alice,
      collectionIdAlice,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'added',
      collectionIdAlice,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );

    const tx = removeNftResource(api, 'removed', bob, collectionIdAlice, nftAlice, resourceId);
    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  it('[negative]: cannot delete a resource that does not exist', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      alice,
      alice,
      collectionIdAlice,
      'nft-metadata',
    );

    const tx = removeNftResource(api, 'removed', alice, collectionIdAlice, nftAlice, 127);
    await expectTxFailure(/rmrkCore\.ResourceDoesntExist/, tx);
  });

  it('[negative]: Cannot accept deleting resource without owner attempt do delete it', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftBob = await mintNft(
      api,
      alice,
      bob,
      collectionIdAlice,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'pending',
      collectionIdAlice,
      nftBob,
      src,
      metadata,
      license,
      thumb,
    );

    const tx = acceptResourceRemoval(api, bob, collectionIdAlice, nftBob, resourceId);
    await expectTxFailure(/rmrkCore\.ResourceNotPending/, tx);
  });

  it('[negative]: cannot confirm the deletion of a non-existing resource', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftBob = await mintNft(
      api,
      alice,
      bob,
      collectionIdAlice,
      'nft-metadata',
    );

    const tx = acceptResourceRemoval(api, bob, collectionIdAlice, nftBob, 127);
    await expectTxFailure(/rmrkCore\.ResourceDoesntExist/, tx);
  });

  it('[negative]: Non-owner user cannot confirm the deletion of resource', async () => {
    const collectionIdAlice = await createCollection(
      api,
      alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      alice,
      alice,
      collectionIdAlice,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      alice,
      'added',
      collectionIdAlice,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );

    const tx = acceptResourceRemoval(api, bob, collectionIdAlice, nftAlice, resourceId);
    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  after(() => {
    api.disconnect();
  });
});
