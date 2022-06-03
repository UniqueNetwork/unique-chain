// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {ApiPromise} from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {addCollectionAdminExpectSuccess, createCollectionExpectSuccess, destroyCollectionExpectSuccess, getAdminList, normalizeAccountId, queryCollectionExpectSuccess} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  it('Add collection admin.', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');

      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.equal(alice.address);

      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, changeAdminTx);

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).to.be.deep.contains(normalizeAccountId(bob.address));
    });
  });

  it('Add admin using added collection admin.', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//CHARLIE');

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
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper('//Alice');
      const nonOwner = privateKeyWrapper('//Bob_stash');

      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(alice.address));
      await expect(submitTransactionExpectFailAsync(nonOwner, changeAdminTx)).to.be.rejected;

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).not.to.be.deep.contains(normalizeAccountId(alice.address));

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });
  it("Can't add collection admin of not existing collection.", async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = (1 << 32) - 1;
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');

      const changeOwnerTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it("Can't add an admin to a destroyed collection.", async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      await destroyCollectionExpectSuccess(collectionId);
      const changeOwnerTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Add an admin to a collection that has reached the maximum number of admins limit', async () => {
    await usingApi(async (api: ApiPromise, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const accounts = [
        privateKeyWrapper('//AdminTest/1').address,
        privateKeyWrapper('//AdminTest/2').address,
        privateKeyWrapper('//AdminTest/3').address,
        privateKeyWrapper('//AdminTest/4').address,
        privateKeyWrapper('//AdminTest/5').address,
        privateKeyWrapper('//AdminTest/6').address,
        privateKeyWrapper('//AdminTest/7').address,
      ];
      const collectionId = await createCollectionExpectSuccess();

      const chainAdminLimit = (api.consts.common.collectionAdminsLimit as any).toNumber();
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
