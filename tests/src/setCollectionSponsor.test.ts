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
import {createCollectionExpectSuccess,
  setCollectionSponsorExpectSuccess,
  destroyCollectionExpectSuccess,
  setCollectionSponsorExpectFailure,
  addCollectionAdminExpectSuccess,
  getCreatedCollectionCount,
  requirePallets,
  Pallets
} from './util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

chai.use(chaiAsPromised);

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('integration test: ext. setCollectionSponsor():', () => {

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  it('Set NFT collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Set Fungible collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Set ReFungible collection sponsor', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });

  it('Set the same sponsor repeatedly', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Replace collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await setCollectionSponsorExpectSuccess(collectionId, charlie.address);
  });
  it('Collection admin add sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await setCollectionSponsorExpectSuccess(collectionId, charlie.address, '//Bob');
  });
});

describe('(!negative test!) integration test: ext. setCollectionSponsor():', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      charlie = privateKeyWrapper('//Charlie');
    });
  });

  it('(!negative test!) Add sponsor with a non-owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectFailure(collectionId, bob.address, '//Bob');
  });
  it('(!negative test!) Add sponsor to a collection that never existed', async () => {
    // Find the collection that never existed
    let collectionId = 0;
    await usingApi(async (api) => {
      collectionId = await getCreatedCollectionCount(api) + 1;
    });

    await setCollectionSponsorExpectFailure(collectionId, bob.address);
  });
  it('(!negative test!) Add sponsor to a collection that was destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
    await setCollectionSponsorExpectFailure(collectionId, bob.address);
  });
});
