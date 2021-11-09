//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi, {submitTransactionExpectFailAsync} from './substrate/substrate-api';
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

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('Integration Test ext. White list tests', () => {

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('Owner can add address to white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
  });

  it('Admin can add address to white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToWhiteListExpectSuccess(bob, collectionId, charlie.address);
  });

  it('Non-privileged user cannot add address to white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectFail(bob, collectionId, charlie.address);
  });

  it('Nobody can add address to white list of non-existing collection', async () => {
    const collectionId = (1<<32) - 1;
    await addToWhiteListExpectFail(alice, collectionId, bob.address);
  });

  it('Nobody can add address to white list of destroyed collection', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
    await addToWhiteListExpectFail(alice, collectionId, bob.address);
  });

  it('If address is already added to white list, nothing happens', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
    await addToWhiteListAgainExpectSuccess(alice, collectionId, bob.address);
  });

  it('Owner can remove address from white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
    await removeFromWhiteListExpectSuccess(alice, collectionId, normalizeAccountId(bob));
  });

  it('Admin can remove address from white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await removeFromWhiteListExpectSuccess(bob, collectionId, normalizeAccountId(charlie));
  });

  it('Non-privileged user cannot remove address from white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await removeFromWhiteListExpectFailure(bob, collectionId, normalizeAccountId(charlie));
  });

  it('Nobody can remove address from white list of non-existing collection', async () => {
    const collectionId = (1<<32) - 1;
    await removeFromWhiteListExpectFailure(alice, collectionId, normalizeAccountId(charlie));
  });

  it('Nobody can remove address from white list of deleted collection', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
    await removeFromWhiteListExpectFailure(alice, collectionId, normalizeAccountId(charlie));
  });

  it('If address is already removed from white list, nothing happens', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await removeFromWhiteListExpectSuccess(alice, collectionId, normalizeAccountId(charlie));
    await removeFromWhiteListExpectSuccess(alice, collectionId, normalizeAccountId(charlie));
  });

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred from a non-whitelisted address with transfer or transferFrom. Test1', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred from a non-whitelisted address with transfer or transferFrom. Test2', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, alice.address);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await removeFromWhiteListExpectSuccess(alice, collectionId, normalizeAccountId(alice));

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred to a non-whitelisted address with transfer or transferFrom. Test1', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, alice.address);

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to WhiteList, tokens can’t be transferred to a non-whitelisted address with transfer or transferFrom. Test2', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, alice.address);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await removeFromWhiteListExpectSuccess(alice, collectionId, normalizeAccountId(alice));

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to WhiteList, tokens can’t be destroyed by a non-whitelisted address (even if it owned them before enabling WhiteList mode)', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, itemId, /*normalizeAccountId(Alice.address),*/ 11);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });
  });

  it('If Public Access mode is set to WhiteList, token transfers can’t be Approved by a non-whitelisted address (see Approve method)', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await approveExpectFail(collectionId, itemId, alice, bob);
  });

  it('If Public Access mode is set to WhiteList, tokens can be transferred to a whitelisted address with transfer.', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, alice.address);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await transferExpectSuccess(collectionId, itemId, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to WhiteList, tokens can be transferred to a whitelisted address with transferFrom.', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, alice.address);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, alice, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to WhiteList, tokens can be transferred from a whitelisted address with transfer', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, alice.address);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await transferExpectSuccess(collectionId, itemId, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to WhiteList, tokens can be transferred from a whitelisted address with transferFrom', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableWhiteListExpectSuccess(alice, collectionId);
    await addToWhiteListExpectSuccess(alice, collectionId, alice.address);
    await addToWhiteListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, alice, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens can be created by admin', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and white-listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectFailure(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-white listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await createItemExpectFailure(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by admin', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-white listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await createItemExpectFailure(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to WhiteList, and Mint Permission is set to true, tokens can be created by non-privileged and white listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });
});
