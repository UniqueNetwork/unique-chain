//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi, { submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enableWhiteListExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
  addToWhiteListExpectFail,
  removeFromWhiteListExpectSuccess,
  removeFromWhiteListExpectFailure,
  addToWhiteListAgainExpectSuccess,
  transferExpectFailure,
  approveExpectSuccess,
  approveExpectFail,
  transferExpectSuccess,
  transferFromExpectSuccess,
  setMintPermissionExpectSuccess,
  createItemExpectFailure,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Charlie: IKeyringPair;

describe('Integration Test ext. White list tests', () => {

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Owner can add address to white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
  });

  it('Admin can add address to white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await addToWhiteListExpectSuccess(Bob, collectionId, Charlie.address);
  });

  it('Non-privileged user cannot add address to white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectFail(Bob, collectionId, Charlie.address);
  });

  it('Nobody can add address to white list of non-existing collection', async () => {
    const collectionId = (1<<32) - 1;
    await addToWhiteListExpectFail(Alice, collectionId, Bob.address);
  });

  it('Nobody can add address to white list of destroyed collection', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
    await addToWhiteListExpectFail(Alice, collectionId, Bob.address);
  });

  it('If address is already added to white list, nothing happens', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
    await addToWhiteListAgainExpectSuccess(Alice, collectionId, Bob.address);
  });

  it('Owner can remove address from white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
    await removeFromWhiteListExpectSuccess(Alice, collectionId, normalizeAccountId(Bob));
  });  

  it('Admin can remove address from white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await removeFromWhiteListExpectSuccess(Bob, collectionId, normalizeAccountId(Charlie));
  }); 

  it('Non-privileged user cannot remove address from white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await removeFromWhiteListExpectFailure(Bob, collectionId, normalizeAccountId(Charlie));
  }); 

  it('Nobody can remove address from white list of non-existing collection', async () => {
    const collectionId = (1<<32) - 1;
    await removeFromWhiteListExpectFailure(Alice, collectionId, normalizeAccountId(Charlie));
  }); 



  it('Nobody can remove address from white list of deleted collection', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
    await removeFromWhiteListExpectFailure(Alice, collectionId, normalizeAccountId(Charlie));
  }); 

  it('If address is already removed from white list, nothing happens', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await removeFromWhiteListExpectSuccess(Alice, collectionId, normalizeAccountId(Charlie));
    await removeFromWhiteListExpectSuccess(Alice, collectionId, normalizeAccountId(Charlie));
  }); 

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred from a non-whitelisted address with transfer or transferFrom. Test1', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);

    await transferExpectFailure(
      collectionId,
      itemId,
      Alice,
      Charlie,
      1,
    );
  }); 

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred from a non-whitelisted address with transfer or transferFrom. Test2', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Alice.address);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await approveExpectSuccess(collectionId, itemId, Alice, Charlie);
    await removeFromWhiteListExpectSuccess(Alice, collectionId, normalizeAccountId(Alice));

    await transferExpectFailure(
      collectionId,
      itemId,
      Alice,
      Charlie,
      1,
    );
  });   

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred to a non-whitelisted address with transfer or transferFrom. Test1', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Alice.address);

    await transferExpectFailure(
      collectionId,
      itemId,
      Alice,
      Charlie,
      1,
    );
  });   

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred to a non-whitelisted address with transfer or transferFrom. Test2', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Alice.address);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await approveExpectSuccess(collectionId, itemId, Alice, Charlie);
    await removeFromWhiteListExpectSuccess(Alice, collectionId, normalizeAccountId(Alice));

    await transferExpectFailure(
      collectionId,
      itemId,
      Alice,
      Charlie,
      1,
    );
  }); 

  it('If Public Access mode is set to WhiteList, tokens can’t be destroyed by a non-whitelisted address (even if it owned them before enabling WhiteList mode)', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, itemId, /*normalizeAccountId(Alice.address),*/ 11);
      const badTransaction = async function () { 
        await submitTransactionExpectFailAsync(Alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });
  });   
  
  it('If Public Access mode is set to WhiteList, token transfers can’t be Approved by a non-whitelisted address (see Approve method)', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await approveExpectFail(collectionId, itemId, Alice, Bob);
  });   
  
  it('If Public Access mode is set to WhiteList, tokens can be transferred to a whitelisted address with transfer.', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Alice.address);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await transferExpectSuccess(collectionId, itemId, Alice, Charlie, 1, 'NFT');
  });  

  it('If Public Access mode is set to WhiteList, tokens can be transferred to a whitelisted address with transferFrom.', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Alice.address);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await approveExpectSuccess(collectionId, itemId, Alice, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Alice, Alice, Charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to WhiteList, tokens can be transferred from a whitelisted address with transfer', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Alice.address);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await transferExpectSuccess(collectionId, itemId, Alice, Charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to WhiteList, tokens can be transferred from a whitelisted address with transferFrom', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await addToWhiteListExpectSuccess(Alice, collectionId, Alice.address);
    await addToWhiteListExpectSuccess(Alice, collectionId, Charlie.address);
    await approveExpectSuccess(collectionId, itemId, Alice, Charlie);
    await transferFromExpectSuccess(collectionId, itemId, Alice, Alice, Charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, false);
    await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by admin', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, false);
    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await createItemExpectSuccess(Bob, collectionId, 'NFT', Bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and white-listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, false);
    await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
    await createItemExpectFailure(Bob, collectionId, 'NFT', Bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-white listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, false);
    await createItemExpectFailure(Bob, collectionId, 'NFT', Bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, true);
    await createItemExpectSuccess(Alice, collectionId, 'NFT', Alice.address);
  });  

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by admin', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, true);
    await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
    await createItemExpectSuccess(Bob, collectionId, 'NFT', Bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-white listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, true);
    await createItemExpectFailure(Bob, collectionId, 'NFT', Bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by non-privileged and white listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await setMintPermissionExpectSuccess(Alice, collectionId, true);
    await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
    await createItemExpectSuccess(Bob, collectionId, 'NFT', Bob.address);
  });
});

