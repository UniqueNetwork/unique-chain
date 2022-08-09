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

import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  setCollectionSponsorExpectSuccess,
  confirmSponsorshipExpectSuccess,
  createItemExpectSuccess,
  transferExpectSuccess,
  normalizeAccountId,
  getNextSponsored,
  requirePallets,
  Pallets
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;



describe('Integration Test getNextSponsored(collection_id, owner, item_id):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('NFT', async () => {
    await usingApi(async (api: ApiPromise) => {

      // Not existing collection 
      expect(await getNextSponsored(api, 0, normalizeAccountId(alice), 0)).to.be.equal(-1);

      const collectionId = await createCollectionExpectSuccess();
      const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      // Check with Disabled sponsoring state
      expect(await getNextSponsored(api, collectionId, normalizeAccountId(alice), itemId)).to.be.equal(-1);
      await setCollectionSponsorExpectSuccess(collectionId, bob.address);

      // Check with Unconfirmed sponsoring state
      expect(await getNextSponsored(api, collectionId, normalizeAccountId(alice), itemId)).to.be.equal(-1);
      await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

      // Check with Confirmed sponsoring state
      expect(await getNextSponsored(api, collectionId, normalizeAccountId(alice), itemId)).to.be.equal(0);

      // After transfer
      await transferExpectSuccess(collectionId, itemId, alice, bob, 1);
      expect(await getNextSponsored(api, collectionId, normalizeAccountId(alice), itemId)).to.be.lessThanOrEqual(5);

      // Not existing token 
      expect(await getNextSponsored(api, collectionId, normalizeAccountId(alice), itemId+1)).to.be.equal(-1);
    });
  });

  it('Fungible', async () => {
    await usingApi(async (api: ApiPromise) => {

      const createMode = 'Fungible';
      const funCollectionId = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
      await createItemExpectSuccess(alice, funCollectionId, createMode);
      await setCollectionSponsorExpectSuccess(funCollectionId, bob.address);
      await confirmSponsorshipExpectSuccess(funCollectionId, '//Bob');
      expect(await getNextSponsored(api, funCollectionId, normalizeAccountId(alice), 0)).to.be.equal(0);

      await transferExpectSuccess(funCollectionId, 0, alice, bob, 10, 'Fungible');
      expect(await getNextSponsored(api, funCollectionId, normalizeAccountId(alice), 0)).to.be.lessThanOrEqual(5);
    });
  });

  it('ReFungible', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api: ApiPromise) => {

      const createMode = 'ReFungible';
      const refunCollectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
      const refunItemId = await createItemExpectSuccess(alice, refunCollectionId, createMode);
      await setCollectionSponsorExpectSuccess(refunCollectionId, bob.address);
      await confirmSponsorshipExpectSuccess(refunCollectionId, '//Bob');
      expect(await getNextSponsored(api, refunCollectionId, normalizeAccountId(alice), refunItemId)).to.be.equal(0);

      await transferExpectSuccess(refunCollectionId, refunItemId, alice, bob, 10, 'ReFungible');
      expect(await getNextSponsored(api, refunCollectionId, normalizeAccountId(alice), refunItemId)).to.be.lessThanOrEqual(5);

      // Not existing token 
      expect(await getNextSponsored(api, refunCollectionId, normalizeAccountId(alice), refunItemId+1)).to.be.equal(-1);
    });
  });
});
