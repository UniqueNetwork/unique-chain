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
  addToAllowListExpectFail,
  getCreatedCollectionCount,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('Integration Test ext. addToAllowList()', () => {

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
  });

  it('Allowlisted minting: list restrictions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectSuccess(alice, collectionId, bob.address);
    await enableAllowListExpectSuccess(alice, collectionId);
    await enablePublicMintingExpectSuccess(alice, collectionId);
    await createItemExpectSuccess(bob, collectionId, 'NFT', bob.address);
  });
});

describe('Negative Integration Test ext. addToAllowList()', () => {

  it('Allow list an address in the collection that does not exist', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const bob = privateKeyWrapper('//Bob');

      const tx = api.tx.unique.addToAllowList(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('Allow list an address in the collection that was destroyed', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const tx = api.tx.unique.addToAllowList(collectionId, normalizeAccountId(bob.address));
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });

  it('Allow list an address in the collection that does not have allow list access enabled', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const ferdie = privateKeyWrapper('//Ferdie');
      const collectionId = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionId);
      await enablePublicMintingExpectSuccess(alice, collectionId);
      const tx = api.tx.unique.createItem(collectionId, normalizeAccountId(ferdie.address), 'NFT');
      await expect(submitTransactionExpectFailAsync(ferdie, tx)).to.be.rejected;
    });
  });

});

describe('Integration Test ext. addToAllowList() with collection admin permissions:', () => {

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  it('Negative. Add to the allow list by regular user', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToAllowListExpectFail(bob, collectionId, charlie.address);
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the allow list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToAllowListExpectSuccess(bob, collectionId, charlie.address);
  });

  it('Allowlisted minting: list restrictions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await addToAllowListExpectSuccess(bob, collectionId, charlie.address);

    // allowed only for collection owner
    await enableAllowListExpectSuccess(alice, collectionId);
    await enablePublicMintingExpectSuccess(alice, collectionId);

    await createItemExpectSuccess(charlie, collectionId, 'NFT', charlie.address);
  });
});
