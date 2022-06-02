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
import usingApi from './substrate/substrate-api';
import {
  addToAllowListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectFailure,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enableAllowListExpectSuccess,
  findNotExistingCollection,
  setMintPermissionExpectFailure,
  setMintPermissionExpectSuccess,
  addCollectionAdminExpectSuccess,
} from './util/helpers';

describe('Integration Test setMintPermission', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
      bob = privateKeyWrapper!('//Bob');
    });
  });

  it('ensure allow-listed non-privileged address can mint tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await addToAllowListExpectSuccess(alice, collectionId, bob.address);

      await createItemExpectSuccess(bob, collectionId, 'NFT');
    });
  });

  it('can be enabled twice', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
    });
  });

  it('can be disabled twice', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await setMintPermissionExpectSuccess(alice, collectionId, false);
      await setMintPermissionExpectSuccess(alice, collectionId, false);
    });
  });
});

describe('Negative Integration Test setMintPermission', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
      bob = privateKeyWrapper!('//Bob');
    });
  });

  it('fails on not existing collection', async () => {
    await usingApi(async (api) => {
      const nonExistingCollection = await findNotExistingCollection(api);
      await setMintPermissionExpectFailure(alice, nonExistingCollection, true);
    });
  });

  it('fails on removed collection', async () => {
    await usingApi(async () => {
      const removedCollectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await destroyCollectionExpectSuccess(removedCollectionId);

      await setMintPermissionExpectFailure(alice, removedCollectionId, true);
    });
  });

  it('fails when not collection owner tries to set mint status', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await enableAllowListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectFailure(bob, collectionId, true);
  });

  it('Collection admin fails on set', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      await setMintPermissionExpectFailure(bob, collectionId, true);
    });
  });

  it('ensure non-allow-listed non-privileged address can\'t mint tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);

      await createItemExpectFailure(bob, collectionId, 'NFT');
    });
  });
});
