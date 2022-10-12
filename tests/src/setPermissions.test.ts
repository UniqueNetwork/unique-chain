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
import {itSub, usingPlaygrounds, expect} from './util';

describe('Integration Test: Set Permissions', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('can all be enabled twice', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetPermissions-1', tokenPrefix: 'SP'});
    expect((await collection.getData())?.raw.permissions.access).to.not.equal('AllowList');

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {collectionAdmin: true, tokenOwner: true, restricted: [1, 2]}});
    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {collectionAdmin: true, tokenOwner: true, restricted: [1, 2]}});
    
    const permissions = (await collection.getData())?.raw.permissions;
    expect(permissions).to.be.deep.equal({
      access: 'AllowList', 
      mintMode: true, 
      nesting: {collectionAdmin: true, tokenOwner: true, restricted: [1, 2]},
    });
  });

  itSub('can all be disabled twice', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetPermissions-2', tokenPrefix: 'SP'});
    expect((await collection.getData())?.raw.permissions.access).to.equal('Normal');

    await collection.setPermissions(alice, {access: 'AllowList', nesting: {collectionAdmin: false, tokenOwner: true, restricted: [1, 2]}});
    expect((await collection.getData())?.raw.permissions).to.be.deep.equal({
      access: 'AllowList', 
      mintMode: false, 
      nesting: {collectionAdmin: false, tokenOwner: true, restricted: [1, 2]},
    });

    await collection.setPermissions(alice, {access: 'Normal', mintMode: false, nesting: {}});
    await collection.setPermissions(alice, {access: 'Normal', mintMode: false, nesting: {}});
    expect((await collection.getData())?.raw.permissions).to.be.deep.equal({
      access: 'Normal', 
      mintMode: false, 
      nesting: {collectionAdmin: false, tokenOwner: false, restricted: null},
    });
  });

  itSub('collection admin can set permissions', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetPermissions-2', tokenPrefix: 'SP'});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await collection.setPermissions(bob, {access: 'AllowList', mintMode: true});
    
    expect((await collection.getData())?.raw.permissions.access).to.equal('AllowList');
    expect((await collection.getData())?.raw.permissions.mintMode).to.equal(true);
  });
});

describe('Negative Integration Test: Set Permissions', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('fails on not existing collection', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.collection.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: true}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('fails on removed collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetPermissions-Neg-1', tokenPrefix: 'SP'});
    await collection.burn(alice);

    await expect(collection.setPermissions(alice, {access: 'AllowList', mintMode: true}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('fails when non-owner tries to set permissions', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'SetPermissions-Neg-2', tokenPrefix: 'SP'});

    await expect(collection.setPermissions(bob, {access: 'AllowList', mintMode: true}))
      .to.be.rejectedWith(/common\.NoPermission/);
  });
});