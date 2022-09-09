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

describe('Integration Test setMintPermission', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('ensure allow-listed non-privileged address can mint tokens', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetMintPermission-1', description: '', tokenPrefix: 'SMP'});
    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addToAllowList(alice, {Substrate: bob.address});

    await expect(collection.mintToken(bob, {Substrate: bob.address})).to.not.be.rejected;
  });

  itSub('can be enabled twice', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetMintPermission-2', description: '', tokenPrefix: 'SMP'});
    expect((await collection.getData())?.raw.permissions.access).to.not.equal('AllowList');

    await collection.setPermissions(alice, {mintMode: true});
    await collection.setPermissions(alice, {mintMode: true});
    expect((await collection.getData())?.raw.permissions.mintMode).to.be.true;
  });

  itSub('can be disabled twice', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetMintPermission-3', description: '', tokenPrefix: 'SMP'});
    expect((await collection.getData())?.raw.permissions.access).to.equal('Normal');

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    expect((await collection.getData())?.raw.permissions.access).to.equal('AllowList');
    expect((await collection.getData())?.raw.permissions.mintMode).to.equal(true);

    await collection.setPermissions(alice, {access: 'Normal', mintMode: false});
    await collection.setPermissions(alice, {access: 'Normal', mintMode: false});
    expect((await collection.getData())?.raw.permissions.access).to.equal('Normal');
    expect((await collection.getData())?.raw.permissions.mintMode).to.equal(false);
  });

  itSub('Collection admin success on set', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetMintPermission-4', description: '', tokenPrefix: 'SMP'});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await collection.setPermissions(bob, {access: 'AllowList', mintMode: true});
    
    expect((await collection.getData())?.raw.permissions.access).to.equal('AllowList');
    expect((await collection.getData())?.raw.permissions.mintMode).to.equal(true);
  });
});

describe('Negative Integration Test setMintPermission', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('fails on not existing collection', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.collection.setPermissions(alice, collectionId, {mintMode: true}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('fails on removed collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetMintPermission-Neg-1', tokenPrefix: 'SMP'});
    await collection.burn(alice);

    await expect(collection.setPermissions(alice, {mintMode: true}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('fails when non-owner tries to set mint status', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetMintPermission-Neg-2', tokenPrefix: 'SMP'});

    await expect(collection.setPermissions(bob, {mintMode: true}))
      .to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('ensure non-allow-listed non-privileged address can\'t mint tokens', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetMintPermission-Neg-3', tokenPrefix: 'SMP'});
    await collection.setPermissions(alice, {mintMode: true});

    await expect(collection.mintToken(bob, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });
});
