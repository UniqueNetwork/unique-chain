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
  enableAllowListExpectSuccess,
  setMintPermissionExpectSuccess,
  addCollectionAdminExpectSuccess,
  disableAllowListExpectSuccess,
} from './util/helpers';

describe('Integration Test public minting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
      bob = privateKeyWrapper!('//Bob');
    });
  });

  it('If the AllowList mode is enabled, then the address added to the allowlist and not the owner or administrator can create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await addToAllowListExpectSuccess(alice, collectionId, bob.address);

      await createItemExpectSuccess(bob, collectionId, 'NFT');
    });
  });

  it('If the AllowList mode is enabled, address not included in allowlist that is regular user cannot create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await createItemExpectFailure(bob, collectionId, 'NFT');
    });
  });

  it('If the AllowList mode is enabled, address not included in allowlist that is admin can create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      await createItemExpectSuccess(bob, collectionId, 'NFT');
    });
  });

  it('If the AllowList mode is enabled, address not included in allowlist that is owner can create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await createItemExpectSuccess(alice, collectionId, 'NFT');
    });
  });

  it('If the AllowList mode is disabled, owner can create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await disableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await createItemExpectSuccess(alice, collectionId, 'NFT');
    });
  });

  it('If the AllowList mode is disabled, collection admin can create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await disableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      await createItemExpectSuccess(bob, collectionId, 'NFT');
    });
  });

  it('If the AllowList mode is disabled, regular user can`t create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await disableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await createItemExpectFailure(bob, collectionId, 'NFT');
    });
  });
});

describe('Integration Test private minting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
      bob = privateKeyWrapper!('//Bob');
    });
  });

  it('Address that is the not owner or not admin cannot create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, false);
      await addToAllowListExpectSuccess(alice, collectionId, bob.address);
      await createItemExpectFailure(bob, collectionId, 'NFT');
    });
  });

  it('Address that is collection owner can create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await disableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, false);
      await createItemExpectSuccess(alice, collectionId, 'NFT');
    });
  });

  it('Address that is admin can create tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await disableAllowListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, false);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      await createItemExpectSuccess(bob, collectionId, 'NFT');
    });
  });
});
