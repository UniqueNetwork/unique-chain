//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setschemaversion
import {ApiPromise} from '@polkadot/api';
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
  enablePublicMintingExpectSuccess,
  enableAllowListExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
  getCreatedCollectionCount,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Integration Test setPublicAccessMode(): ', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Run extrinsic with collection id parameters, set the allowlist mode for the collection', async () => {
    await usingApi(async () => {
      const collectionId: number = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionId);
      await enablePublicMintingExpectSuccess(alice, collectionId);
      await addToAllowListExpectSuccess(alice, collectionId, bob.address);
      await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
    });
  });

  it('Allowlisted collection limits', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionId);
      await enablePublicMintingExpectSuccess(alice, collectionId);
      const tx = api.tx.nft.createItem(collectionId, normalizeAccountId(bob.address), 'NFT');
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
});

describe('Negative Integration Test ext. setPublicAccessMode(): ', () => {
  it('Set a non-existent collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: radix
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const tx = api.tx.nft.setPublicAccessMode(collectionId, 'AllowList');
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('Set the collection that has been deleted', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const tx = api.tx.nft.setPublicAccessMode(collectionId, 'AllowList');
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('Re-set the list mode already set in quantity', async () => {
    await usingApi(async () => {
      const collectionId: number = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionId);
      await enableAllowListExpectSuccess(alice, collectionId);
    });
  });

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      const tx = api.tx.nft.setPublicAccessMode(collectionId, 'AllowList');
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
});

describe('Negative Integration Test ext. collection admin setPublicAccessMode(): ', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });
  it('setPublicAccessMode by collection admin', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const tx = api.tx.nft.setPublicAccessMode(collectionId, 'AllowList');
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
});
