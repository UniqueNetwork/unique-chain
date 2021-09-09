﻿//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise } from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {createCollectionExpectSuccess, destroyCollectionExpectSuccess, normalizeAccountId} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  it('Add collection admin.', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.Owner).to.be.equal(alice.address);

      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await submitTransactionAsync(alice, changeAdminTx);

      const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterAddAdmin).to.be.contains(normalizeAccountId(bob.address));
    });
  });

  it('Add admin using added collection admin.', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//CHARLIE');

      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.Owner).to.be.equal(Alice.address);

      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTx);

      const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterAddAdmin).to.be.contains(normalizeAccountId(Bob.address));

      const changeAdminTxCharlie = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(Charlie.address));
      await submitTransactionAsync(Bob, changeAdminTxCharlie);
      const adminListAfterAddNewAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterAddNewAdmin).to.be.contains(normalizeAccountId(Bob.address));
      expect(adminListAfterAddNewAdmin).to.be.contains(normalizeAccountId(Charlie.address));
    });
  });
});

describe('Negative Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  it("Not owner can't add collection admin.", async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const nonOwner = privateKey('//Bob_stash');

      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(alice.address));
      await expect(submitTransactionExpectFailAsync(nonOwner, changeAdminTx)).to.be.rejected;

      const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterAddAdmin).not.to.be.contains(normalizeAccountId(alice.address));

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

      const changeOwnerTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it("Can't add an admin to a destroyed collection.", async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      await destroyCollectionExpectSuccess(collectionId);
      const changeOwnerTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await expect(submitTransactionExpectFailAsync(Alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Add an admin to a collection that has reached the maximum number of admins limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const accounts = [
        'GsvVmjr1CBHwQHw84pPHMDxgNY3iBLz6Qn7qS3CH8qPhrHz',
        'FoQJpPyadYccjavVdTWxpxU7rUEaYhfLCPwXgkfD6Zat9QP',
        'JKspFU6ohf1Grg3Phdzj2pSgWvsYWzSfKghhfzMbdhNBWs5',
        'Fr4NzY1udSFFLzb2R3qxVQkwz9cZraWkyfH4h3mVVk7BK7P',
        'DfnTB4z7eUvYRqcGtTpFsLC69o6tvBSC1pEv8vWPZFtCkaK',
        'HnMAUz7r2G8G3hB27SYNyit5aJmh2a5P4eMdDtACtMFDbam',
        'DE14BzQ1bDXWPKeLoAqdLAm1GpyAWaWF1knF74cEZeomTBM',
      ];
      const collectionId = await createCollectionExpectSuccess();

      const chainAdminLimit = (api.consts.nft.collectionAdminsLimit as any).toNumber();
      expect(chainAdminLimit).to.be.equal(5);

      for (let i = 0; i < chainAdminLimit; i++) {
        const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(accounts[i]));
        await submitTransactionAsync(Alice, changeAdminTx);
        const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
        expect(adminListAfterAddAdmin).to.be.contains(normalizeAccountId(accounts[i]));
      }

      const tx = api.tx.nft.addCollectionAdmin(collectionId, normalizeAccountId(accounts[chainAdminLimit]));
      await expect(submitTransactionExpectFailAsync(Alice, tx)).to.be.rejected;
    });
  });
});
