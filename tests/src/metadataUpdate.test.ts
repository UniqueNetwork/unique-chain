
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
  setMetadataUpdatePermissionFlagExpectSuccess,
  setVariableMetaDataExpectSuccess,
  setMintPermissionExpectSuccess,
  addToWhiteListExpectSuccess,
  addCollectionAdminExpectSuccess,
  setVariableMetaDataExpectFailure,
  setMetadataUpdatePermissionFlagExpectFailure
} from './util/helpers';

chai.use(chaiAsPromised);

describe('Metadata update permissions ', () => {
  it('Set variable metadata with ItemOwner permission flag', async () => {
    await usingApi(async () => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');

      const data = [1, 2, 254, 255];

      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await setMetadataUpdatePermissionFlagExpectSuccess(Alice, nftCollectionId, "ItemOwner");

      await setVariableMetaDataExpectSuccess(Alice, nftCollectionId, newNftTokenId, data);
    });
  });

  it('User can\'n set variable metadata with ItemOwner permission flag', async () => {
    await usingApi(async () => {
        const Alice = privateKey('//Alice');
        const Bob = privateKey('//Bob');
  
        const data = [1, 2, 254, 255];
  
        // nft
        const nftCollectionId = await createCollectionExpectSuccess();
        const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
        await setMetadataUpdatePermissionFlagExpectSuccess(Alice, nftCollectionId, "ItemOwner");

        await setMintPermissionExpectSuccess(Alice, nftCollectionId, true);
        await addToWhiteListExpectSuccess(Alice, nftCollectionId, Bob.address);
        await addCollectionAdminExpectSuccess(Alice, nftCollectionId, Bob);
  
        await setVariableMetaDataExpectFailure(Bob, nftCollectionId, newNftTokenId, data);
    });
  });

  it('Admin can set variable metadata with Admin permission flag', async () => {
    await usingApi(async () => {
        const Alice = privateKey('//Alice');
        const Bob = privateKey('//Bob');
  
        const data = [1, 2, 254, 255];
  
        // nft
        const nftCollectionId = await createCollectionExpectSuccess();
        const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
        await setMetadataUpdatePermissionFlagExpectSuccess(Alice, nftCollectionId, "Admin");

        await setMintPermissionExpectSuccess(Alice, nftCollectionId, true);
        await addToWhiteListExpectSuccess(Alice, nftCollectionId, Bob.address);
        await addCollectionAdminExpectSuccess(Alice, nftCollectionId, Bob);
  
        await setVariableMetaDataExpectSuccess(Bob, nftCollectionId, newNftTokenId, data);
    });
  });

  it('Nobody can set variable metadata with None flag', async () => {
    await usingApi(async () => {
        const Alice = privateKey('//Alice');
        const Bob = privateKey('//Bob');
  
        const data = [1, 2, 254, 255];
  
        // nft
        const nftCollectionId = await createCollectionExpectSuccess();
        const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
        await setMetadataUpdatePermissionFlagExpectSuccess(Alice, nftCollectionId, "None");
  
        await setVariableMetaDataExpectFailure(Alice, nftCollectionId, newNftTokenId, data);
    });
  });

  it('Nobody can set variable metadata flag after freeze', async () => {
    await usingApi(async () => {
        const Alice = privateKey('//Alice');
        const Bob = privateKey('//Bob');
  
        const data = [1, 2, 254, 255];
  
        // nft
        const nftCollectionId = await createCollectionExpectSuccess();
        await setMetadataUpdatePermissionFlagExpectSuccess(Alice, nftCollectionId, "None");
        await setMetadataUpdatePermissionFlagExpectFailure(Alice, nftCollectionId, "Admin");
        
    });
  });
});
