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

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setschemaversion
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {itSub, usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test setPublicAccessMode(): ', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('Runs extrinsic with collection id parameters, sets the allowlist mode for the collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'PublicAccess-1', tokenPrefix: 'TF'});
    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collection.addToAllowList(alice, {Substrate: bob.address});
    
    await expect(collection.mintToken(bob, {Substrate: bob.address})).to.be.not.rejected;
  });

  itSub('Allowlisted collection limits', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'PublicAccess-2', tokenPrefix: 'TF'});
    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    
    await expect(collection.mintToken(bob, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });

  itSub('setPublicAccessMode by collection admin', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'PublicAccess-Neg-4', tokenPrefix: 'TF'});
    await collection.addAdmin(alice, {Substrate: bob.address});

    await expect(collection.setPermissions(bob, {access: 'AllowList'})).to.be.not.rejected;
  });
});

describe('Negative Integration Test ext. setPublicAccessMode(): ', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    });
  });

  itSub('Sets a non-existent collection', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.collection.setPermissions(alice, collectionId, {access: 'AllowList'}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Sets the collection that has been deleted', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'PublicAccess-Neg-1', tokenPrefix: 'TF'});
    await collection.burn(alice);

    await expect(collection.setPermissions(alice, {access: 'AllowList'}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Re-sets the list mode already set in quantity', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'PublicAccess-Neg-2', tokenPrefix: 'TF'});
    await collection.setPermissions(alice, {access: 'AllowList'});
    await collection.setPermissions(alice, {access: 'AllowList'});
  });

  itSub('Executes method as a malefactor', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'PublicAccess-Neg-3', tokenPrefix: 'TF'});

    await expect(collection.setPermissions(bob, {access: 'AllowList'}))
      .to.be.rejectedWith(/common\.NoPermission/);
  });
});
