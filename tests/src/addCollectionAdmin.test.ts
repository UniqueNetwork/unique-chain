//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {ApiPromise} from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {addCollectionAdminExpectSuccess, createCollectionExpectSuccess, destroyCollectionExpectSuccess, getAdminList, normalizeAccountId, queryCollectionExpectSuccess} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  it('Add collection admin.', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.equal(alice.address);

      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, changeAdminTx);

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).to.be.deep.contains(normalizeAccountId(bob.address));
    });
  });

  it('Add admin using added collection admin.', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//CHARLIE');

      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.equal(alice.address);

      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, changeAdminTx);

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).to.be.deep.contains(normalizeAccountId(bob.address));

      const changeAdminTxCharlie = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(charlie.address));
      await submitTransactionAsync(bob, changeAdminTxCharlie);
      const adminListAfterAddNewAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddNewAdmin).to.be.deep.contains(normalizeAccountId(bob.address));
      expect(adminListAfterAddNewAdmin).to.be.deep.contains(normalizeAccountId(charlie.address));
    });
  });
});

describe('Negative Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  it("Not owner can't add collection admin.", async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const nonOwner = privateKey('//Bob_stash');

      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(alice.address));
      await expect(submitTransactionExpectFailAsync(nonOwner, changeAdminTx)).to.be.rejected;

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).not.to.be.deep.contains(normalizeAccountId(alice.address));

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });
  it("Can't add collection admin of not existing collection.", async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = (1 << 32) - 1;
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const changeOwnerTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it("Can't add an admin to a destroyed collection.", async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      await destroyCollectionExpectSuccess(collectionId);
      const changeOwnerTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Add an admin to a collection that has reached the maximum number of admins limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const alice = privateKey('//Alice');
      const accounts = [
        privateKey('//AdminTest/1').address,
        privateKey('//AdminTest/2').address,
        privateKey('//AdminTest/3').address,
        privateKey('//AdminTest/4').address,
        privateKey('//AdminTest/5').address,
        privateKey('//AdminTest/6').address,
        privateKey('//AdminTest/7').address,
      ];
      const collectionId = await createCollectionExpectSuccess();

      const chainAdminLimit = api.consts.common.collectionAdminsLimit.toNumber();
      expect(chainAdminLimit).to.be.equal(5);

      for (let i = 0; i < chainAdminLimit; i++) {
        await addCollectionAdminExpectSuccess(alice, collectionId, accounts[i]);
        const adminListAfterAddAdmin = await getAdminList(api, collectionId);
        expect(adminListAfterAddAdmin).to.be.deep.contains(normalizeAccountId(accounts[i]));
      }

      const tx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(accounts[chainAdminLimit]));
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });
});
