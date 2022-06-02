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

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setschemaversion
import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
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
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
      bob = privateKeyWrapper!('//Bob');
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
      const tx = api.tx.unique.createItem(collectionId, normalizeAccountId(bob.address), 'NFT');
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
});

describe('Negative Integration Test ext. setPublicAccessMode(): ', () => {
  it('Set a non-existent collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: radix
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const tx = api.tx.unique.setCollectionPermissions(collectionId, {access: 'AllowList'});
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('Set the collection that has been deleted', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const tx = api.tx.unique.setCollectionPermissions(collectionId, {access: 'AllowList'});
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
      const tx = api.tx.unique.setCollectionPermissions(collectionId, {access: 'AllowList'});
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
});

describe('Negative Integration Test ext. collection admin setPublicAccessMode(): ', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
      bob = privateKeyWrapper!('//Bob');
    });
  });
  it('setPublicAccessMode by collection admin', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const tx = api.tx.unique.setCollectionPermissions(collectionId, {access: 'AllowList'});
      await expect(submitTransactionExpectFailAsync(bob, tx)).to.be.rejected;
    });
  });
});
