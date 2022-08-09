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
import {default as usingApi} from './substrate/substrate-api';
import {createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  destroyCollectionExpectFailure,
  setCollectionLimitsExpectSuccess,
  addCollectionAdminExpectSuccess,
  getCreatedCollectionCount,
  createItemExpectSuccess,
  requirePallets,
  Pallets
} from './util/helpers';

chai.use(chaiAsPromised);

describe('integration test: ext. destroyCollection():', () => {
  it('NFT collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
  });
  it('Fungible collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await destroyCollectionExpectSuccess(collectionId);
  });
  it('ReFungible collection can be destroyed', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('(!negative test!) integration test: ext. destroyCollection():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('(!negative test!) Destroy a collection that never existed', async () => {
    await usingApi(async (api) => {
      // Find the collection that never existed
      const collectionId = await getCreatedCollectionCount(api) + 1;
      await destroyCollectionExpectFailure(collectionId);
    });
  });
  it('(!negative test!) Destroy a collection that has already been destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
    await destroyCollectionExpectFailure(collectionId);
  });
  it('(!negative test!) Destroy a collection using non-owner account', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectFailure(collectionId, '//Bob');
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
  });
  it('(!negative test!) Destroy a collection using collection admin account', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await destroyCollectionExpectFailure(collectionId, '//Bob');
  });
  it('fails when OwnerCanDestroy == false', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionLimitsExpectSuccess(alice, collectionId, {ownerCanDestroy: false});

    await destroyCollectionExpectFailure(collectionId, '//Alice');
  });
  it('fails when a collection still has a token', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await createItemExpectSuccess(alice, collectionId, 'NFT');

    await destroyCollectionExpectFailure(collectionId, '//Alice');
  });
});
