//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {ApiPromise} from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {createCollectionExpectSuccess, destroyCollectionExpectSuccess, getAdminList, normalizeAccountId, queryCollectionExpectSuccess} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  it('Remove collection admin.', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
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

  it('Remove collection admin by admin.', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//Charlie');
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.eq(alice.address);
      // first - add collection admin Bob
      const addAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, addAdminTx);

      const addAdminTx2 = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(charlie.address));
      await submitTransactionAsync(alice, addAdminTx2);

      const adminListAfterAddAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterAddAdmin).to.be.deep.contains(normalizeAccountId(bob.address));

      // then remove bob from admins of collection
      const removeAdminTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(charlie, removeAdminTx);

      const adminListAfterRemoveAdmin = await getAdminList(api, collectionId);
      expect(adminListAfterRemoveAdmin).not.to.be.deep.contains(normalizeAccountId(bob.address));
    });
  });

  it('Remove admin from collection that has no admins', async () => {
    await usingApi(async (api: ApiPromise) => {
      const alice = privateKey('//Alice');
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
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = (1 << 32) - 1;
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const changeOwnerTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Can\'t remove collection admin from deleted collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      await destroyCollectionExpectSuccess(collectionId);

      const changeOwnerTx = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Regular user Can\'t remove collection admin', async () => {
    await usingApi(async (api: ApiPromise) => {
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
});
