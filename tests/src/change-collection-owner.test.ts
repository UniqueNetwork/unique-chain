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
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {createCollectionExpectSuccess,
  addCollectionAdminExpectSuccess,
  setCollectionSponsorExpectSuccess,
  confirmSponsorshipExpectSuccess,
  removeCollectionSponsorExpectSuccess,
  enableAllowListExpectSuccess,
  setMintPermissionExpectSuccess,
  destroyCollectionExpectSuccess,
  setCollectionSponsorExpectFailure,
  confirmSponsorshipExpectFailure,
  removeCollectionSponsorExpectFailure,
  enableAllowListExpectFail,
  setMintPermissionExpectFailure,
  destroyCollectionExpectFailure,
  setPublicAccessModeExpectSuccess,
  queryCollectionExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  it('Changing owner changes owner address', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');

      const collection =await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.deep.eq(alice.address);

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await submitTransactionAsync(alice, changeOwnerTx);

      const collectionAfterOwnerChange = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange.owner.toString()).to.be.deep.eq(bob.address);
    });
  });
});

describe('Integration Test changeCollectionOwner(collection_id, new_owner) special checks for exOwner:', () => {
  it('Changing the owner of the collection is not allowed for the former owner', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');

      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.deep.eq(alice.address);

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await submitTransactionAsync(alice, changeOwnerTx);

      const badChangeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, alice.address);
      await expect(submitTransactionExpectFailAsync(alice, badChangeOwnerTx)).to.be.rejected;

      const collectionAfterOwnerChange = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange.owner.toString()).to.be.deep.eq(bob.address);
    });
  });

  it('New collectionOwner has access to sponsorship management operations in the collection', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');
      const charlie = privateKeyWrapper!('//Charlie');

      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.deep.eq(alice.address);

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await submitTransactionAsync(alice, changeOwnerTx);

      const collectionAfterOwnerChange = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange.owner.toString()).to.be.deep.eq(bob.address);

      // After changing the owner of the collection, all privileged methods are available to the new owner
      // The new owner of the collection has access to sponsorship management operations in the collection
      await setCollectionSponsorExpectSuccess(collectionId, charlie.address, '//Bob');
      await confirmSponsorshipExpectSuccess(collectionId, '//Charlie');
      await removeCollectionSponsorExpectSuccess(collectionId, '//Bob');

      // The new owner of the collection has access to operations for managing the collection parameters
      const collectionLimits = {
        accountTokenOwnershipLimit: 1,
        sponsoredMintSize: 1,
        tokenLimit: 1,
        sponsorTransferTimeout: 1,
        ownerCanTransfer: true,
        ownerCanDestroy: true,
      };
      const tx1 = api.tx.unique.setCollectionLimits(
        collectionId,
        collectionLimits,
      );
      await submitTransactionAsync(bob, tx1);

      await setPublicAccessModeExpectSuccess(bob, collectionId, 'AllowList');
      await enableAllowListExpectSuccess(bob, collectionId);
      await setMintPermissionExpectSuccess(bob, collectionId, true);
      await destroyCollectionExpectSuccess(collectionId, '//Bob');
    });
  });

  it('New collectionOwner has access to changeCollectionOwner', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');
      const charlie = privateKeyWrapper!('//Charlie');

      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.deep.eq(alice.address);

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await submitTransactionAsync(alice, changeOwnerTx);

      const collectionAfterOwnerChange = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange.owner.toString()).to.be.deep.eq(bob.address);

      const changeOwnerTx2 = api.tx.unique.changeCollectionOwner(collectionId, charlie.address);
      await submitTransactionAsync(bob, changeOwnerTx2);

      // ownership lost
      const collectionAfterOwnerChange2 = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange2.owner.toString()).to.be.deep.eq(charlie.address);
    });
  });
});

describe('Negative Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  it('Not owner can\'t change owner.', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await expect(submitTransactionExpectFailAsync(bob, changeOwnerTx)).to.be.rejected;

      const collectionAfterOwnerChange = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange.owner.toString()).to.be.deep.eq(alice.address);

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Collection admin can\'t change owner.', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');

      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await expect(submitTransactionExpectFailAsync(bob, changeOwnerTx)).to.be.rejected;

      const collectionAfterOwnerChange = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange.owner.toString()).to.be.deep.eq(alice.address);

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Can\'t change owner of a non-existing collection.', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = (1<<32) - 1;
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Former collectionOwner not allowed to sponsorship management operations in the collection', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKeyWrapper!('//Alice');
      const bob = privateKeyWrapper!('//Bob');
      const charlie = privateKeyWrapper!('//Charlie');

      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.deep.eq(alice.address);

      const changeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, bob.address);
      await submitTransactionAsync(alice, changeOwnerTx);

      const badChangeOwnerTx = api.tx.unique.changeCollectionOwner(collectionId, alice.address);
      await expect(submitTransactionExpectFailAsync(alice, badChangeOwnerTx)).to.be.rejected;

      const collectionAfterOwnerChange = await queryCollectionExpectSuccess(api, collectionId);
      expect(collectionAfterOwnerChange.owner.toString()).to.be.deep.eq(bob.address);

      await setCollectionSponsorExpectFailure(collectionId, charlie.address, '//Alice');
      await confirmSponsorshipExpectFailure(collectionId, '//Alice');
      await removeCollectionSponsorExpectFailure(collectionId, '//Alice');

      const collectionLimits = {
        accountTokenOwnershipLimit: 1,
        sponsoredMintSize: 1,
        tokenLimit: 1,
        sponsorTransferTimeout: 1,
        ownerCanTransfer: true,
        ownerCanDestroy: true,
      };
      const tx1 = api.tx.unique.setCollectionLimits(
        collectionId,
        collectionLimits,
      );
      await expect(submitTransactionExpectFailAsync(alice, tx1)).to.be.rejected;

      await enableAllowListExpectFail(alice, collectionId);
      await setMintPermissionExpectFailure(alice, collectionId, true);
      await destroyCollectionExpectFailure(collectionId, '//Alice');
    });
  });
});
