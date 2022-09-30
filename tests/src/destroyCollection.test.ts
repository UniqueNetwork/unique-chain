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
import {itSub, expect, usingPlaygrounds, Pallets} from './util/playgrounds';

describe('integration test: ext. destroyCollection():', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  itSub('NFT collection can be destroyed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    });
    await collection.burn(alice);
    expect(await collection.getData()).to.be.null;
  });
  itSub('Fungible collection can be destroyed', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    }, 0);
    await collection.burn(alice);
    expect(await collection.getData()).to.be.null;
  });
  itSub.ifWithPallets('ReFungible collection can be destroyed', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    });
    await collection.burn(alice);
    expect(await collection.getData()).to.be.null;
  });
});

describe('(!negative test!) integration test: ext. destroyCollection():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('(!negative test!) Destroy a collection that never existed', async ({helper}) => {
    const collectionId = 1_000_000;
    await expect(helper.collection.burn(alice, collectionId)).to.be.rejectedWith(/common\.CollectionNotFound/);
  });
  itSub('(!negative test!) Destroy a collection that has already been destroyed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    });
    await collection.burn(alice);
    await expect(collection.burn(alice)).to.be.rejectedWith(/common\.CollectionNotFound/);
  });
  itSub('(!negative test!) Destroy a collection using non-owner account', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    });
    await expect(collection.burn(bob)).to.be.rejectedWith(/common\.NoPermission/);
  });
  itSub('(!negative test!) Destroy a collection using collection admin account', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    });
    await collection.addAdmin(alice, {Substrate: bob.address});
    await expect(collection.burn(bob)).to.be.rejectedWith(/common\.NoPermission/);
  });
  itSub('fails when OwnerCanDestroy == false', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
      limits: {
        ownerCanDestroy: false,
      },
    });
    await expect(collection.burn(alice)).to.be.rejectedWith(/common\.NoPermission/);
  });
  itSub('fails when a collection still has a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    });
    await collection.mintToken(alice, {Substrate: alice.address});
    await expect(collection.burn(alice)).to.be.rejectedWith(/common\.CantDestroyNotEmptyCollection/);
  });
});
