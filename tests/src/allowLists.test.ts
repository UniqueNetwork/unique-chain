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
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enableAllowListExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
  addToAllowListExpectFail,
  removeFromAllowListExpectSuccess,
  removeFromAllowListExpectFailure,
  addToAllowListAgainExpectSuccess,
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

describe('Integration Test ext. Allow list tests', () => {

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('Owner can add address to allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
  });

  it('Admin can add address to allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToAllowListExpectSuccess(bob, collectionId, charlie.address);
  });

  it('Non-privileged user cannot add address to allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectFail(bob, collectionId, charlie.address);
  });

  it('Nobody can add address to allow list of non-existing collection', async () => {
    const collectionId = (1<<32) - 1;
    await addToAllowListExpectFail(alice, collectionId, bob.address);
  });

  it('Nobody can add address to allow list of destroyed collection', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
    await addToAllowListExpectFail(alice, collectionId, bob.address);
  });

  it('If address is already added to allow list, nothing happens', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
    await addToAllowListAgainExpectSuccess(alice, collectionId, bob.address);
  });

  it('Owner can remove address from allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
    await removeFromAllowListExpectSuccess(alice, collectionId, normalizeAccountId(bob));
  });

  it('Admin can remove address from allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await removeFromAllowListExpectSuccess(bob, collectionId, normalizeAccountId(charlie));
  });

  it('Non-privileged user cannot remove address from allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await removeFromAllowListExpectFailure(bob, collectionId, normalizeAccountId(charlie));
  });

  it('Nobody can remove address from allow list of non-existing collection', async () => {
    const collectionId = (1<<32) - 1;
    await removeFromAllowListExpectFailure(alice, collectionId, normalizeAccountId(charlie));
  });

  it('Nobody can remove address from allow list of deleted collection', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
    await removeFromAllowListExpectFailure(alice, collectionId, normalizeAccountId(charlie));
  });

  it('If address is already removed from allow list, nothing happens', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await removeFromAllowListExpectSuccess(alice, collectionId, normalizeAccountId(charlie));
    await removeFromAllowListExpectSuccess(alice, collectionId, normalizeAccountId(charlie));
  });

  it('If Public Access mode is set to AllowList, tokens can’t be transferred from a non-allowlisted address with transfer or transferFrom. Test1', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to AllowList, tokens can’t be transferred from a non-allowlisted address with transfer or transferFrom. Test2', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, alice.address);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await removeFromAllowListExpectSuccess(alice, collectionId, normalizeAccountId(alice));

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to AllowList, tokens can’t be transferred to a non-allowlisted address with transfer or transferFrom. Test1', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, alice.address);

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to AllowList, tokens can’t be transferred to a non-allowlisted address with transfer or transferFrom. Test2', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, alice.address);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await removeFromAllowListExpectSuccess(alice, collectionId, normalizeAccountId(alice));

    await transferExpectFailure(
      collectionId,
      itemId,
      alice,
      charlie,
      1,
    );
  });

  it('If Public Access mode is set to AllowList, tokens can’t be destroyed by a non-allowlisted address (even if it owned them before enabling AllowList mode)', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnItem(collectionId, itemId, /*normalizeAccountId(Alice.address),*/ 11);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });
  });

  it('If Public Access mode is set to AllowList, token transfers can’t be Approved by a non-allowlisted address (see Approve method)', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await approveExpectFail(collectionId, itemId, alice, bob);
  });

  it('If Public Access mode is set to AllowList, tokens can be transferred to a allowlisted address with transfer.', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, alice.address);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await transferExpectSuccess(collectionId, itemId, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to AllowList, tokens can be transferred to a alowlisted address with transferFrom.', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, alice.address);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, alice, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transfer', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, alice.address);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await transferExpectSuccess(collectionId, itemId, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transferFrom', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await addToAllowListExpectSuccess(alice, collectionId, alice.address);
    await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
    await approveExpectSuccess(collectionId, itemId, alice, charlie.address);
    await transferFromExpectSuccess(collectionId, itemId, alice, alice, charlie, 1, 'NFT');
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by admin', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and allow-listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectFailure(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-allow listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, false);
    await createItemExpectFailure(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by admin', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-allow listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await createItemExpectFailure(bob, collectionId, 'NFT', bob.address);
  });

  it('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by non-privileged and allow listed address', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectSuccess(alice, collectionId, true);
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });
});
