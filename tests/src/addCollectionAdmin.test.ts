import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import { createCollectionExpectSuccess } from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  it('Add collection admin.', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const collection: any = (await api.query.nft.collection(collectionId));
      expect(collection.Owner.toString()).to.be.eq(alice.address);

      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, bob.address);
      await submitTransactionAsync(alice, changeAdminTx);

      const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterAddAdmin).to.be.contains(bob.address);
    });
  });
});

describe('Negative Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  it("Not owner can't add collection admin.", async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const nonOwner = privateKey('//Bob_stash');

      const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, alice.address);
      await expect(submitTransactionExpectFailAsync(nonOwner, changeAdminTx)).to.be.rejected;

      const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterAddAdmin).not.to.be.contains(alice.address);

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

      const changeOwnerTx = api.tx.nft.addCollectionAdmin(collectionId, bob.address);
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });
});
