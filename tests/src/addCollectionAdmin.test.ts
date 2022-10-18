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

describe('Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itSub('Add collection admin.', async ({helper}) => {
    const [alice, bob] = await helper.arrange.createAccounts([10n, 10n], donor);
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'Collection Name', description: 'Collection Description', tokenPrefix: 'COL'});

    const collection = await helper.collection.getData(collectionId);
    expect(collection!.normalizedOwner!).to.be.equal(helper.address.normalizeSubstrate(alice.address));

    await helper.nft.addAdmin(alice, collectionId, {Substrate: bob.address});

    const adminListAfterAddAdmin = await helper.collection.getAdmins(collectionId);
    expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: bob.address});
  });
});

describe('Negative Integration Test addCollectionAdmin(collection_id, new_admin_id):', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itSub("Not owner can't add collection admin.", async ({helper}) => {
    const [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'Collection Name', description: 'Collection Description', tokenPrefix: 'COL'});

    const collection = await helper.collection.getData(collectionId);
    expect(collection?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(alice.address));

    const changeAdminTxBob = async () => helper.collection.addAdmin(bob, collectionId, {Substrate: bob.address});
    const changeAdminTxCharlie = async () => helper.collection.addAdmin(bob, collectionId, {Substrate: charlie.address});
    await expect(changeAdminTxCharlie()).to.be.rejectedWith(/common\.NoPermission/);
    await expect(changeAdminTxBob()).to.be.rejectedWith(/common\.NoPermission/);

    const adminListAfterAddAdmin = await helper.collection.getAdmins(collectionId);
    expect(adminListAfterAddAdmin).to.be.not.deep.contains({Substrate: charlie.address});
    expect(adminListAfterAddAdmin).to.be.not.deep.contains({Substrate: bob.address});
  });

  itSub("Admin can't add collection admin.", async ({helper}) => {
    const [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'Collection Name', description: 'Collection Description', tokenPrefix: 'COL'});

    await collection.addAdmin(alice, {Substrate: bob.address});

    const adminListAfterAddAdmin = await collection.getAdmins();
    expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: bob.address});

    const changeAdminTxCharlie = async () => collection.addAdmin(bob, {Substrate: charlie.address});
    await expect(changeAdminTxCharlie()).to.be.rejectedWith(/common\.NoPermission/);

    const adminListAfterAddNewAdmin = await collection.getAdmins();
    expect(adminListAfterAddNewAdmin).to.be.deep.contains({Substrate: bob.address});
    expect(adminListAfterAddNewAdmin).to.be.not.deep.contains({Substrate: charlie.address});
  });

  itSub("Can't add collection admin of not existing collection.", async ({helper}) => {
    const [alice, bob] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    const collectionId = (1 << 32) - 1;

    const addAdminTx = async () => helper.collection.addAdmin(alice, collectionId, {Substrate: bob.address});
    await expect(addAdminTx()).to.be.rejectedWith(/common\.CollectionNotFound/);

    // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
    await helper.nft.mintCollection(alice, {name: 'Collection Name', description: 'Collection Description', tokenPrefix: 'COL'});
  });

  itSub("Can't add an admin to a destroyed collection.", async ({helper}) => {
    const [alice, bob] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'Collection Name', description: 'Collection Description', tokenPrefix: 'COL'});

    await collection.burn(alice);
    const addAdminTx = async () => collection.addAdmin(alice, {Substrate: bob.address});
    await expect(addAdminTx()).to.be.rejectedWith(/common\.CollectionNotFound/);

    // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
    await helper.nft.mintCollection(alice, {name: 'Collection Name', description: 'Collection Description', tokenPrefix: 'COL'});
  });

  itSub('Add an admin to a collection that has reached the maximum number of admins limit', async ({helper}) => {
    const [alice, ...accounts] = await helper.arrange.createAccounts([10n, 0n, 0n, 0n, 0n, 0n, 0n, 0n], donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'Collection Name', description: 'Collection Description', tokenPrefix: 'COL'});

    const chainAdminLimit = (helper.getApi().consts.common.collectionAdminsLimit as any).toNumber();
    expect(chainAdminLimit).to.be.equal(5);

    for (let i = 0; i < chainAdminLimit; i++) {
      await collection.addAdmin(alice, {Substrate: accounts[i].address});
      const adminListAfterAddAdmin = await collection.getAdmins();
      expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: accounts[i].address});
    }

    const addExtraAdminTx = async () => collection.addAdmin(alice, {Substrate: accounts[chainAdminLimit].address});
    await expect(addExtraAdminTx()).to.be.rejectedWith(/common\.CollectionAdminCountExceeded/);
  });
});
