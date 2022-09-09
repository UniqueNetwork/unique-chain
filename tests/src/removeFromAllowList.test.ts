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
import {IKeyringPair} from '@polkadot/types/types';
import {itSub, usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeFromAllowList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('ensure bob is not in allowlist after removal', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveFromAllowList-1', tokenPrefix: 'RFAL'});

    const collectionInfo = await collection.getData();
    expect(collectionInfo!.raw.permissions.access).to.not.equal('AllowList');

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addToAllowList(alice, {Substrate: bob.address});
    expect(await collection.getAllowList()).to.deep.contains({Substrate: bob.address});
    
    await collection.removeFromAllowList(alice, {Substrate: bob.address});
    expect(await collection.getAllowList()).to.be.empty;
  });

  itSub('allows removal from collection with unset allowlist status', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveFromAllowList-2', tokenPrefix: 'RFAL'});

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addToAllowList(alice, {Substrate: bob.address});
    expect(await collection.getAllowList()).to.deep.contains({Substrate: bob.address});

    await collection.setPermissions(alice, {access: 'Normal'});
    
    await collection.removeFromAllowList(alice, {Substrate: bob.address});
    expect(await collection.getAllowList()).to.be.empty;
  });
});

describe('Negative Integration Test removeFromAllowList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('fails on removal from not existing collection', async ({helper}) => {
    const nonExistentCollectionId = (1 << 32) - 1;
    await expect(helper.collection.removeFromAllowList(alice, nonExistentCollectionId, {Substrate: alice.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('fails on removal from removed collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveFromAllowList-3', tokenPrefix: 'RFAL'});
    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addToAllowList(alice, {Substrate: bob.address});

    await collection.burn(alice);
    await expect(collection.removeFromAllowList(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });
});

describe('Integration Test removeFromAllowList with collection admin permissions', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });

  itSub('ensure address is not in allowlist after removal', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveFromAllowList-4', tokenPrefix: 'RFAL'});
    
    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addAdmin(alice, {Substrate: bob.address});

    await collection.addToAllowList(bob, {Substrate: charlie.address});
    await collection.removeFromAllowList(bob, {Substrate: charlie.address});

    expect(await collection.getAllowList()).to.be.empty;
  });

  itSub('Collection admin allowed to remove from allowlist with unset allowlist status', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveFromAllowList-5', tokenPrefix: 'RFAL'});

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, {Substrate: charlie.address});

    await collection.setPermissions(bob, {access: 'Normal'});
    await collection.removeFromAllowList(bob, {Substrate: charlie.address});

    expect(await collection.getAllowList()).to.be.empty;
  });

  itSub('Regular user can`t remove from allowlist', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveFromAllowList-6', tokenPrefix: 'RFAL'});

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addToAllowList(alice, {Substrate: charlie.address});

    await expect(collection.removeFromAllowList(bob, {Substrate: charlie.address}))
      .to.be.rejectedWith(/common\.NoPermission/);
    expect(await collection.getAllowList()).to.deep.contain({Substrate: charlie.address});
  });
});
