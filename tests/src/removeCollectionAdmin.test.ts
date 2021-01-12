import { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {createCollectionExpectSuccess, destroyCollectionExpectSuccess} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  it('Remove collection admin.', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const collection: any = (await api.query.nft.collection(collectionId));
      expect(collection.Owner.toString()).to.be.eq(Alice.address);
      // first - add collection admin Bob
      const addAdminTx = api.tx.nft.addCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, addAdminTx);

      const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterAddAdmin).to.be.contains(Bob.address);

      // then remove bob from admins of collection
      const removeAdminTx = api.tx.nft.removeCollectionAdmin(collectionId, Bob.address);
      await submitTransactionAsync(Alice, removeAdminTx);

      const adminListAfterRemoveAdmin: any = (await api.query.nft.adminList(collectionId));
      expect(adminListAfterRemoveAdmin).not.to.be.contains(Bob.address);
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

      const changeOwnerTx = api.tx.nft.removeCollectionAdmin(collectionId, bob.address);
      await expect(submitTransactionExpectFailAsync(alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Can\'t remove collection admin from deleted collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');

      await destroyCollectionExpectSuccess(collectionId);

      const changeOwnerTx = api.tx.nft.removeCollectionAdmin(collectionId, Bob.address);
      await expect(submitTransactionExpectFailAsync(Alice, changeOwnerTx)).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await createCollectionExpectSuccess();
    });
  });

  it('Remove admin from collection that has reached the maximum number of admins limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const accounts = [
        'GsvVmjr1CBHwQHw84pPHMDxgNY3iBLz6Qn7qS3CH8qPhrHz',
        'FoQJpPyadYccjavVdTWxpxU7rUEaYhfLCPwXgkfD6Zat9QP',
        'JKspFU6ohf1Grg3Phdzj2pSgWvsYWzSfKghhfzMbdhNBWs5',
        'JKspFU6ohf1Grg3Phdzj2pSgWvsYWzSfKghhfzMbdhNBWs5',
        'Fr4NzY1udSFFLzb2R3qxVQkwz9cZraWkyfH4h3mVVk7BK7P',
        'DfnTB4z7eUvYRqcGtTpFsLC69o6tvBSC1pEv8vWPZFtCkaK',
        'HnMAUz7r2G8G3hB27SYNyit5aJmh2a5P4eMdDtACtMFDbam',
        'DE14BzQ1bDXWPKeLoAqdLAm1GpyAWaWF1knF74cEZeomTBM',
      ];
      const collectionId = await createCollectionExpectSuccess();

      const chainLimit = await api.query.nft.chainLimit() as unknown as { collections_admins_limit: BN };
      const chainLimitNumber = chainLimit.collections_admins_limit.toNumber();
      expect(chainLimitNumber).to.be.equal(5);

      for (let i = 0; i < chainLimitNumber - 1; i++) {
        const changeAdminTx = api.tx.nft.addCollectionAdmin(collectionId, accounts[i]);
        await submitTransactionAsync(Alice, changeAdminTx);
        const adminListAfterAddAdmin: any = (await api.query.nft.adminList(collectionId));
        expect(adminListAfterAddAdmin).to.be.contains(accounts[i]);
      }

      const tx = api.tx.nft.removeCollectionAdmin(collectionId, accounts[1]);
      await expect(submitTransactionExpectFailAsync(Alice, tx)).to.be.rejected;
    });
  });
});
