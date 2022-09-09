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
import {itSub, usingPlaygrounds, expect} from './util/playgrounds';

describe('integration test: ext. removeCollectionSponsor():', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('Removing NFT collection sponsor stops sponsorship', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-1', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await collection.confirmSponsorship(bob);
    await collection.removeSponsor(alice);

    // Find unused address
    const [zeroBalance] = await helper.arrange.createAccounts([0n], donor);

    // Mint token for unused address
    const token = await collection.mintToken(alice, {Substrate: zeroBalance.address});

    // Transfer this tokens from unused address to Alice - should fail
    const sponsorBalanceBefore = await helper.balance.getSubstrate(bob.address);
    await expect(token.transfer(zeroBalance, {Substrate: alice.address}))
      .to.be.rejectedWith('Inability to pay some fees');
    const sponsorBalanceAfter = await helper.balance.getSubstrate(bob.address);

    expect(sponsorBalanceAfter).to.be.equal(sponsorBalanceBefore);
  });

  itSub('Remove a sponsor after it was already removed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-2', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await collection.confirmSponsorship(bob);
    await expect(collection.removeSponsor(alice)).to.not.be.rejected;
    await expect(collection.removeSponsor(alice)).to.not.be.rejected;
  });

  itSub('Remove sponsor in a collection that never had the sponsor set', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-3', tokenPrefix: 'RCS'});
    await expect(collection.removeSponsor(alice)).to.not.be.rejected;
  });

  itSub('Remove sponsor for a collection that had the sponsor set, but not confirmed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-4', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await expect(collection.removeSponsor(alice)).to.not.be.rejected;
  });

});

describe('(!negative test!) integration test: ext. removeCollectionSponsor():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([20n, 10n, 10n], donor);
    });
  });

  itSub('(!negative test!) Remove sponsor for a collection that never existed', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.collection.removeSponsor(alice, collectionId)).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('(!negative test!) Remove sponsor for a collection with collection admin permissions', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-Neg-1', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await collection.addAdmin(alice, {Substrate: charlie.address});
    await expect(collection.removeSponsor(charlie)).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('(!negative test!) Remove sponsor for a collection by regular user', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-Neg-2', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await expect(collection.removeSponsor(charlie)).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('(!negative test!) Remove sponsor in a destroyed collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-Neg-3', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await collection.burn(alice);
    await expect(collection.removeSponsor(alice)).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Set - remove - confirm: fails', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-Neg-4', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await collection.removeSponsor(alice);
    await expect(collection.confirmSponsorship(bob)).to.be.rejectedWith(/unique\.ConfirmUnsetSponsorFail/);
  });

  itSub('Set - confirm - remove - confirm: Sponsor cannot come back', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionSponsor-Neg-5', tokenPrefix: 'RCS'});
    await collection.setSponsor(alice, bob.address);
    await collection.confirmSponsorship(bob);
    await collection.removeSponsor(alice);
    await expect(collection.confirmSponsorship(bob)).to.be.rejectedWith(/unique\.ConfirmUnsetSponsorFail/);
  });
});
