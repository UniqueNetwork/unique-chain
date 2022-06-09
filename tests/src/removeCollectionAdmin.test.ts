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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {createCollectionExpectSuccess, destroyCollectionExpectSuccess, getAdminList, normalizeAccountId, queryCollectionExpectSuccess} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  it('Remove collection admin.', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.deep.eq(alice.address);
      // first - add collection admin Bob
      const addAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, addAdminTx);

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).to.be.deep.contains(normalizeAccountId(bob.address));

      // then remove bob from admins of collection
      const removeAdminTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, removeAdminTx);

      const adminListAfterRemoveAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterRemoveAdmin).not.to.be.deep.contains(normalizeAccountId(bob.address));
    });
  });

  it('Remove admin from collection that has no admins', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const collectionId = await createCollectionExpectSuccess();

      const adminListBeforeAddAdmin = await getAdminList(api, collectionId);
      expect(adminListBeforeAddAdmin).to.have.lengthOf(0);

      const tx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(alice.address));
      await submitTransactionAsync(alice, tx);
    });
  });
});

describe('Negative Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  it('Can\'t remove collection admin from not existing collection', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = (1 << 32) - 1;
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');

      const changeOwnerTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Can\'t remove collection admin from deleted collection', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');

      await destroyCollectionExpectSuccess(collectionId);

      const changeOwnerTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Regular user can\'t remove collection admin', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//Charlie');

      const addAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, addAdminTx);

      const changeOwnerTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(charlie, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Admin can\'t remove collection admin.', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//Charlie');

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).to.be.deep.contains(normalizeAccountId(bob.address));

      const removeAdminTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionAsync(charlie, removeAdminTx)).to.be.rejected;

      const adminListAfterRemoveAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterRemoveAdmin).to.be.deep.contains(normalizeAccountId(bob.address));
      expect(adminListAfterRemoveAdmin).to.be.deep.contains(normalizeAccountId(charlie.address));
    });
  });
});
