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

describe('Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([20n, 10n], donor);
    });
  });

  itSub('Remove collection admin', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionAdmin-1', tokenPrefix: 'RCA'});
    const collectionInfo = await collection.getData();
    expect(collectionInfo?.raw.owner.toString()).to.be.deep.eq(alice.address);
    // first - add collection admin Bob
    await collection.addAdmin(alice, {Substrate: bob.address});

    const adminListAfterAddAdmin = await collection.getAdmins();
    expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: bob.address});

    // then remove bob from admins of collection
    await collection.removeAdmin(alice, {Substrate: bob.address});

    const adminListAfterRemoveAdmin = await collection.getAdmins();
    expect(adminListAfterRemoveAdmin).not.to.be.deep.contains({Substrate: bob.address});
  });

  itSub('Remove admin from collection that has no admins', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionAdmin-2', tokenPrefix: 'RCA'});

    const adminListBeforeAddAdmin = await collection.getAdmins();
    expect(adminListBeforeAddAdmin).to.have.lengthOf(0);

    await collection.removeAdmin(alice, {Substrate: alice.address});
  });
});

describe('Negative Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([20n, 10n, 10n], donor);
    });
  });

  itSub('Can\'t remove collection admin from not existing collection', async ({helper}) => {
    const collectionId = (1 << 32) - 1;

    await expect(helper.collection.removeAdmin(alice, collectionId, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Can\'t remove collection admin from deleted collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionAdmin-Neg-2', tokenPrefix: 'RCA'});

    expect(await collection.burn(alice)).to.be.true;

    await expect(helper.collection.removeAdmin(alice, collection.collectionId, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Regular user can\'t remove collection admin', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionAdmin-Neg-3', tokenPrefix: 'RCA'});

    await collection.addAdmin(alice, {Substrate: bob.address});

    await expect(collection.removeAdmin(charlie, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Admin can\'t remove collection admin.', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'RemoveCollectionAdmin-Neg-4', tokenPrefix: 'RCA'});
    
    await collection.addAdmin(alice, {Substrate: bob.address});
    await collection.addAdmin(alice, {Substrate: charlie.address});

    const adminListAfterAddAdmin = await collection.getAdmins();
    expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: bob.address});
    expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: charlie.address});

    await expect(collection.removeAdmin(charlie, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.NoPermission/);

    const adminListAfterRemoveAdmin = await collection.getAdmins();
    expect(adminListAfterRemoveAdmin).to.be.deep.contains({Substrate: bob.address});
    expect(adminListAfterRemoveAdmin).to.be.deep.contains({Substrate: charlie.address});
  });
});
