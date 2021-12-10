
//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  createItemExpectSuccess,
  createCollectionExpectSuccess,
  enablePublicMintingExpectSuccess,
  enableAllowListExpectSuccess,
  setMetadataUpdatePermissionFlagExpectSuccess,
  setVariableMetaDataExpectSuccess,
  setMintPermissionExpectSuccess,
  addToAllowListExpectSuccess,
  addCollectionAdminExpectSuccess,
  setVariableMetaDataExpectFailure,
  setMetadataUpdatePermissionFlagExpectFailure,
} from './util/helpers';

chai.use(chaiAsPromised);

describe('Metadata update permissions with ItemOwner flag', () => {
  it('ItemOwner can set variable metadata with ItemOwner permission flag', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'ItemOwner');

      await setVariableMetaDataExpectSuccess(alice, nftCollectionId, newNftTokenId, data);
    });
  });

  it('Admin can\'n set variable metadata with ItemOwner permission flag', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'ItemOwner');

      await setMintPermissionExpectSuccess(alice, nftCollectionId, true);
      await addToAllowListExpectSuccess(alice, nftCollectionId, bob.address);
      await addCollectionAdminExpectSuccess(alice, nftCollectionId, bob.address);

      await setVariableMetaDataExpectFailure(bob, nftCollectionId, newNftTokenId, data);
    });
  });

  it('User can\'n set variable metadata with ItemOwner permission flag', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'ItemOwner');

      await setMintPermissionExpectSuccess(alice, nftCollectionId, true);
      await setVariableMetaDataExpectFailure(bob, nftCollectionId, newNftTokenId, data);
    });
  });
});

describe('Metadata update permissions with Admin flag', () => {
  it('Admin can set variable metadata with Admin permission flag', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'Admin');

      await setMintPermissionExpectSuccess(alice, nftCollectionId, true);
      await addToAllowListExpectSuccess(alice, nftCollectionId, bob.address);
      await addCollectionAdminExpectSuccess(alice, nftCollectionId, bob.address);

      await setVariableMetaDataExpectSuccess(bob, nftCollectionId, newNftTokenId, data);
    });
  });

  it('User can\'n can set variable metadata with Admin permission flag', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'Admin');

      await setMintPermissionExpectSuccess(alice, nftCollectionId, true);
      await addToAllowListExpectSuccess(alice, nftCollectionId, bob.address);
      await addCollectionAdminExpectSuccess(alice, nftCollectionId, bob.address);

      await setVariableMetaDataExpectSuccess(bob, nftCollectionId, newNftTokenId, data);
    });
  });

  it('ItemOwner can\'n can set variable metadata with Admin permission flag', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      await enablePublicMintingExpectSuccess(alice, nftCollectionId);
      await addToAllowListExpectSuccess(alice, nftCollectionId, bob.address);
      await enableAllowListExpectSuccess(alice, nftCollectionId);
      const newNftTokenId = await createItemExpectSuccess(bob, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'Admin');

      await setVariableMetaDataExpectFailure(bob, nftCollectionId, newNftTokenId, data);
    });
  });
});

describe('Metadata update permissions with None flag', () => {
  it('Nobody can set variable metadata with None flag (Regular)', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'None');

      await setVariableMetaDataExpectFailure(bob, nftCollectionId, newNftTokenId, data);
    });
  });

  it('Nobody can set variable metadata with None flag (Admin)', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'None');

      await setMintPermissionExpectSuccess(alice, nftCollectionId, true);
      await addToAllowListExpectSuccess(alice, nftCollectionId, bob.address);
      await addCollectionAdminExpectSuccess(alice, nftCollectionId, bob.address);

      await setVariableMetaDataExpectFailure(bob, nftCollectionId, newNftTokenId, data);
    });
  });

  it('Nobody can set variable metadata with None flag (ItemOwner)', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'None');

      await setVariableMetaDataExpectFailure(alice, nftCollectionId, newNftTokenId, data);
    });
  });

  it('Nobody can set variable metadata flag after freeze', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      await setMetadataUpdatePermissionFlagExpectSuccess(alice, nftCollectionId, 'None');
      await setMetadataUpdatePermissionFlagExpectFailure(alice, nftCollectionId, 'Admin');
    });
  });
});
