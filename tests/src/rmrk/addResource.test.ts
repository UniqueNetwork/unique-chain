import {expect} from 'chai';
import {getApiConnection} from '../substrate/substrate-api';
import {NftIdTuple} from './util/fetch';
import {expectTxFailure, getResourceById} from './util/helpers';
import {
  addNftBasicResource,
  acceptNftResource,
  createCollection,
  mintNft,
  sendNft,
  addNftSlotResource,
  addNftComposableResource,
} from './util/tx';
import {RmrkTraitsResourceResourceInfo as ResourceInfo} from '@polkadot/types/lookup';

describe('integration test: add NFT resource', () => {
  const Alice = '//Alice';
  const Bob = '//Bob';
  const src = 'test-res-src';
  const metadata = 'test-res-metadata';
  const license = 'test-res-license';
  const thumb = 'test-res-thumb';

  const nonexistentId = 99999;

  let api: any;
  before(async () => {
    api = await getApiConnection();
  });

  it('add resource', async () => {
    const collectionIdAlice = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      Alice,
      Alice,
      collectionIdAlice,
      'nft-metadata',
    );

    await addNftBasicResource(
      api,
      Alice,
      'added',
      collectionIdAlice,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );
  });

  it('add a resource to the nested NFT', async () => {
    const collectionIdAlice = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const parentNftId = await mintNft(api, Alice, Alice, collectionIdAlice, 'parent-nft-metadata');
    const childNftId = await mintNft(api, Alice, Alice, collectionIdAlice, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [collectionIdAlice, parentNftId];

    await sendNft(api, 'sent', Alice, collectionIdAlice, childNftId, newOwnerNFT);

    await addNftBasicResource(
      api,
      Alice,
      'added',
      collectionIdAlice,
      childNftId,
      src,
      metadata,
      license,
      thumb,
    );
  });

  it('add multiple resources', async () => {
    const collectionIdAlice = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      Alice,
      Alice,
      collectionIdAlice,
      'nft-metadata',
    );

    const baseId = 42;
    const slotId = 10;
    const parts = [0, 5, 2];

    const resourcesInfo = [];
    const resourceNum = 4;

    const checkResource = async (resource: ResourceInfo, resType: string, expectedId: number, expected: {
      src: string,
      metadata: string,
      license: string,
      thumb: string
    }) => {

      // FIXME A workaround. It seems it is a PolkadotJS bug.
      // All of the following are `false`.
      //
      // console.log('>>> basic:', resource.resource.isBasic);
      // console.log('>>> composable:', resource.resource.isComposable);
      // console.log('>>> slot:', resource.resource.isSlot);
      const resourceJson = (resource.resource.toHuman() as any)[resType];

      expect(resource.id.toNumber(), 'Error: Invalid resource Id')
        .to.be.eq(expectedId);

      expect(resourceJson.src, 'Error: Invalid resource src')
        .to.be.eq(expected.src);
      expect(resourceJson.metadata, 'Error: Invalid resource metadata')
        .to.be.eq(expected.metadata);
      expect(resourceJson.license, 'Error: Invalid resource license')
        .to.be.eq(expected.license);
      expect(resourceJson.thumb, 'Error: Invalid resource thumb')
        .to.be.eq(expected.thumb);
    };

    for (let i = 0; i < resourceNum; i++) {
      resourcesInfo.push({
        src: src + 'r-' + i,
        metadata: metadata + 'r-' + i,
        license: license + 'r-' + i,
        thumb: thumb + 'r-' + i,
      });
    }

    const firstBasicResourceId = await addNftBasicResource(
      api,
      Alice,
      'added',
      collectionIdAlice,
      nftAlice,
      resourcesInfo[0].src,
      resourcesInfo[0].metadata,
      resourcesInfo[0].license,
      resourcesInfo[0].thumb,
    );

    const secondBasicResourceId = await addNftBasicResource(
      api,
      Alice,
      'added',
      collectionIdAlice,
      nftAlice,
      resourcesInfo[1].src,
      resourcesInfo[1].metadata,
      resourcesInfo[1].license,
      resourcesInfo[1].thumb,
    );

    const composableResourceId = await addNftComposableResource(
      api,
      Alice,
      'added',
      collectionIdAlice,
      nftAlice,
      parts,
      baseId,
      resourcesInfo[2].src,
      resourcesInfo[2].metadata,
      resourcesInfo[2].license,
      resourcesInfo[2].thumb,
    );

    const slotResourceId = await addNftSlotResource(
      api,
      Alice,
      'added',
      collectionIdAlice,
      nftAlice,
      baseId,
      slotId,
      resourcesInfo[3].src,
      resourcesInfo[3].metadata,
      resourcesInfo[3].license,
      resourcesInfo[3].thumb,
    );

    const firstResource = await getResourceById(api, collectionIdAlice, nftAlice, firstBasicResourceId);
    await checkResource(firstResource, 'Basic', firstBasicResourceId, resourcesInfo[0]);

    const secondResource = await getResourceById(api, collectionIdAlice, nftAlice, secondBasicResourceId);
    await checkResource(secondResource, 'Basic', secondBasicResourceId, resourcesInfo[1]);

    const composableResource = await getResourceById(api, collectionIdAlice, nftAlice, composableResourceId);
    await checkResource(composableResource, 'Composable', composableResourceId, resourcesInfo[2]);

    const slotResource = await getResourceById(api, collectionIdAlice, nftAlice, slotResourceId);
    await checkResource(slotResource, 'Slot', slotResourceId, resourcesInfo[3]);
  });

  it('[negative]: unable to add a resource to the non-existing NFT', async () => {
    const collectionIdAlice = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const tx = addNftBasicResource(
      api,
      Alice,
      'added',
      collectionIdAlice,
      nonexistentId,
      src,
      metadata,
      license,
      thumb,
    );
  
    await expectTxFailure(/rmrkCore\.NoAvailableNftId/, tx);
  });

  it('[negative]: unable to add a resource by a not-an-owner user', async () => {
    const collectionIdAlice = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      Alice,
      Alice,
      collectionIdAlice,
      'nft-metadata',
    );

    const tx = addNftBasicResource(
      api,
      Bob,
      'added',
      collectionIdAlice,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );
  
    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  it('[negative]: unable to add a resource to the nested NFT if it isnt root owned by the caller', async () => {
    const collectionIdAlice = await createCollection(
      api,
      Alice,
      'test-metadata',
      null,
      'test-symbol',
    );

    const parentNftId = await mintNft(api, Alice, Alice, collectionIdAlice, 'parent-nft-metadata');
    const childNftId = await mintNft(api, Alice, Alice, collectionIdAlice, 'child-nft-metadata');

    const newOwnerNFT: NftIdTuple = [collectionIdAlice, parentNftId];

    await sendNft(api, 'sent', Alice, collectionIdAlice, childNftId, newOwnerNFT);

    const tx = addNftBasicResource(
      api,
      Bob,
      'added',
      collectionIdAlice,
      childNftId,
      src,
      metadata,
      license,
      thumb,
    );
    
    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  it('accept resource', async () => {
    const collectionIdBob = await createCollection(
      api,
      Bob,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      Bob,
      Alice,
      collectionIdBob,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      Bob,
      'pending',
      collectionIdBob,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );

    await acceptNftResource(api, Alice, collectionIdBob, nftAlice, resourceId);
  });

  it('[negative]: unable to accept a non-existing resource', async () => {
    const collectionIdBob = await createCollection(
      api,
      Bob,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      Bob,
      Alice,
      collectionIdBob,
      'nft-metadata',
    );

    const tx = acceptNftResource(api, Alice, collectionIdBob, nftAlice, nonexistentId);
    await expectTxFailure(/rmrkCore\.ResourceDoesntExist/, tx);
  });

  it('[negative]: unable to accept a resource by a not-an-NFT-owner user', async () => {
    const collectionIdBob = await createCollection(
      api,
      Bob,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      Bob,
      Alice,
      collectionIdBob,
      'nft-metadata',
    );

    const resourceId = await addNftBasicResource(
      api,
      Bob,
      'pending',
      collectionIdBob,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );

    const tx = acceptNftResource(api, Bob, collectionIdBob, nftAlice, resourceId);

    await expectTxFailure(/rmrkCore\.NoPermission/, tx);
  });

  it('[negative]: unable to accept a resource to a non-target NFT', async () => {
    const collectionIdBob = await createCollection(
      api,
      Bob,
      'test-metadata',
      null,
      'test-symbol',
    );

    const nftAlice = await mintNft(
      api,
      Bob,
      Alice,
      collectionIdBob,
      'nft-metadata',
    );

    const wrongNft = await mintNft(
      api,
      Bob,
      Alice,
      collectionIdBob,
      'nft-metadata',
    );
    
    const resourceId = await addNftBasicResource(
      api,
      Bob,
      'pending',
      collectionIdBob,
      nftAlice,
      src,
      metadata,
      license,
      thumb,
    );

    const tx = acceptNftResource(api, Bob, collectionIdBob, wrongNft, resourceId);

    await expectTxFailure(/rmrkCore\.ResourceDoesntExist/, tx);
  });


  after(() => {
    api.disconnect();
  });
});
