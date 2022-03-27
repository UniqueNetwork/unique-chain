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
import {default as usingApi} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  enableAllowListExpectSuccess,
  addToAllowListExpectSuccess,
  removeFromAllowListExpectSuccess,
  isAllowlisted,
  findNotExistingCollection,
  removeFromAllowListExpectFailure,
  disableAllowListExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
} from './util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import privateKey from './substrate/privateKey';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeFromAllowList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('ensure bob is not in allowlist after removal', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await addToAllowListExpectSuccess(alice, collectionId, bob.address);

      await removeFromAllowListExpectSuccess(alice, collectionId, normalizeAccountId(bob.address));
      expect(await isAllowlisted(api, collectionId, bob.address)).to.be.false;
    });
  });

  it('allows removal from collection with unset allowlist status', async () => {
    await usingApi(async () => {
      const collectionWithoutAllowlistId = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionWithoutAllowlistId);
      await addToAllowListExpectSuccess(alice, collectionWithoutAllowlistId, bob.address);
      await disableAllowListExpectSuccess(alice, collectionWithoutAllowlistId);

      await removeFromAllowListExpectSuccess(alice, collectionWithoutAllowlistId, normalizeAccountId(bob.address));
    });
  });
});

describe('Negative Integration Test removeFromAllowList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('fails on removal from not existing collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await findNotExistingCollection(api);

      await removeFromAllowListExpectFailure(alice, collectionId, normalizeAccountId(bob.address));
    });
  });

  it('fails on removal from removed collection', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionId);
      await addToAllowListExpectSuccess(alice, collectionId, bob.address);
      await destroyCollectionExpectSuccess(collectionId);

      await removeFromAllowListExpectFailure(alice, collectionId, normalizeAccountId(bob.address));
    });
  });
});

describe('Integration Test removeFromAllowList with collection admin permissions', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
    });
  });

  it('ensure address is not in allowlist after removal', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableAllowListExpectSuccess(alice, collectionId);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      await addToAllowListExpectSuccess(alice, collectionId, charlie.address);
      await removeFromAllowListExpectSuccess(bob, collectionId, normalizeAccountId(charlie.address));
      expect(await isAllowlisted(api, collectionId, charlie.address)).to.be.false;
    });
  });

  it('Collection admin allowed to remove from allowlist with unset allowlist status', async () => {
    await usingApi(async () => {
      const collectionWithoutAllowlistId = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionWithoutAllowlistId);
      await addCollectionAdminExpectSuccess(alice, collectionWithoutAllowlistId, bob.address);
      await addToAllowListExpectSuccess(alice, collectionWithoutAllowlistId, charlie.address);
      await disableAllowListExpectSuccess(alice, collectionWithoutAllowlistId);
      await removeFromAllowListExpectSuccess(bob, collectionWithoutAllowlistId, normalizeAccountId(charlie.address));
    });
  });

  it('Regular user can`t remove from allowlist', async () => {
    await usingApi(async () => {
      const collectionWithoutAllowlistId = await createCollectionExpectSuccess();
      await enableAllowListExpectSuccess(alice, collectionWithoutAllowlistId);
      await addToAllowListExpectSuccess(alice, collectionWithoutAllowlistId, charlie.address);
      await removeFromAllowListExpectFailure(bob, collectionWithoutAllowlistId, normalizeAccountId(charlie.address));
    });
  });
});
