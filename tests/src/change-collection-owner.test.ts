//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import { createCollectionExpectSuccess, createCollectionExpectFailure } from "./util/helpers";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  it('Changing owner changes owner.', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.Owner.toString()).to.be.eq(alice.address);

      const changeOwnerTx = api.tx.nft.changeCollectionOwner(collectionId, bob.address);
      await submitTransactionAsync(alice, changeOwnerTx);

      const collectionAfterOwnerChange: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collectionAfterOwnerChange.Owner.toString()).to.be.eq(bob.address);
    });
  });
});

describe('Negative Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  it(`Not owner can't change owner.`, async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const changeOwnerTx = api.tx.nft.changeCollectionOwner(collectionId, bob.address);
      await expect(submitTransactionExpectFailAsync(bob, changeOwnerTx)).to.be.rejected;

      const collectionAfterOwnerChange: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collectionAfterOwnerChange.Owner.toString()).to.be.eq(alice.address);

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });
  it(`Can't change owner of not existing collection.`, async () => {
    await usingApi(async api => {
      const collectionId = (1<<32) - 1;
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const changeOwnerTx = api.tx.nft.changeCollectionOwner(collectionId, bob.address);
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });
});
