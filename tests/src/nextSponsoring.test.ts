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
import {expect, itSub, Pallets, usingPlaygrounds} from './util/playgrounds';

const SPONSORING_TIMEOUT = 5;

describe('Integration Test getNextSponsored(collection_id, owner, item_id):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([20n, 10n], donor);
    });
  });

  itSub('NFT', async ({helper}) => {
    // Non-existing collection
    expect(await helper.collection.getTokenNextSponsored(0, 0, {Substrate: alice.address})).to.be.null;

    const collection = await helper.nft.mintCollection(alice, {});
    const token = await collection.mintToken(alice);

    // Check with Disabled sponsoring state
    expect(await token.getNextSponsored({Substrate: alice.address})).to.be.null;
    
    // Check with Unconfirmed sponsoring state
    await collection.setSponsor(alice, bob.address);
    expect(await token.getNextSponsored({Substrate: alice.address})).to.be.null;

    // Check with Confirmed sponsoring state
    await collection.confirmSponsorship(bob);
    expect(await token.getNextSponsored({Substrate: alice.address})).to.be.equal(0);

    // Check after transfer
    await token.transfer(alice, {Substrate: bob.address});
    expect(await token.getNextSponsored({Substrate: alice.address})).to.be.lessThanOrEqual(SPONSORING_TIMEOUT);

    // Non-existing token 
    expect(await collection.getTokenNextSponsored(0, {Substrate: alice.address})).to.be.null;
  });

  itSub('Fungible', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {});
    await collection.mint(alice, 10n);

    // Check with Disabled sponsoring state
    expect(await collection.getTokenNextSponsored(0, {Substrate: alice.address})).to.be.null;

    await collection.setSponsor(alice, bob.address);
    await collection.confirmSponsorship(bob);
    
    // Check with Confirmed sponsoring state
    expect(await collection.getTokenNextSponsored(0, {Substrate: alice.address})).to.be.equal(0);

    // Check after transfer
    await collection.transfer(alice, {Substrate: bob.address});
    expect(await collection.getTokenNextSponsored(0, {Substrate: alice.address})).to.be.lessThanOrEqual(SPONSORING_TIMEOUT);
  });

  itSub.ifWithPallets('ReFungible', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {});
    const token = await collection.mintToken(alice, 10n);

    // Check with Disabled sponsoring state
    expect(await token.getNextSponsored({Substrate: alice.address})).to.be.null;

    await collection.setSponsor(alice, bob.address);
    await collection.confirmSponsorship(bob);

    // Check with Confirmed sponsoring state
    expect(await token.getNextSponsored({Substrate: alice.address})).to.be.equal(0);

    // Check after transfer
    await token.transfer(alice, {Substrate: bob.address});
    expect(await token.getNextSponsored({Substrate: alice.address})).to.be.lessThanOrEqual(SPONSORING_TIMEOUT);

    // Non-existing token 
    expect(await collection.getTokenNextSponsored(0, {Substrate: alice.address})).to.be.null;
  });
});
