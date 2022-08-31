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
import {usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  it('Remove collection admin.', async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
      
      const collectionInfo = await collection.getData();
      expect(collectionInfo?.raw.owner.toString()).to.be.deep.eq(alice.address);
      // first - add collection admin Bob
      await collection.addAdmin(alice, {Substrate: bob.address});

      const adminListAfterAddAdmin = await collection.getAdmins();
      expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: helper.address.normalizeSubstrate(bob.address)});

      // then remove bob from admins of collection
      await collection.removeAdmin(alice, {Substrate: bob.address});

      const adminListAfterRemoveAdmin = await collection.getAdmins();
      expect(adminListAfterRemoveAdmin).not.to.be.deep.contains({Substrate: helper.address.normalizeSubstrate(bob.address)});
    });
  });

  it('Remove admin from collection that has no admins', async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const alice = privateKey('//Alice');
      const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

      const adminListBeforeAddAdmin = await collection.getAdmins();
      expect(adminListBeforeAddAdmin).to.have.lengthOf(0);

      // await expect(collection.removeAdmin(alice, {Substrate: alice.address})).to.be.rejectedWith('Unable to remove collection admin');
      await collection.removeAdmin(alice, {Substrate: alice.address});
    });
  });
});

describe('Negative Integration Test removeCollectionAdmin(collection_id, account_id):', () => {
  it('Can\'t remove collection admin from not existing collection', async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = (1 << 32) - 1;
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      await expect(helper.collection.removeAdmin(alice, collectionId, {Substrate: bob.address})).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    });
  });

  it('Can\'t remove collection admin from deleted collection', async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

      expect(await collection.burn(alice)).to.be.true;

      await expect(helper.collection.removeAdmin(alice, collection.collectionId, {Substrate: bob.address})).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    });
  });

  it('Regular user can\'t remove collection admin', async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//Charlie');
      const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

      await collection.addAdmin(alice, {Substrate: bob.address});

      await expect(collection.removeAdmin(charlie, {Substrate: bob.address})).to.be.rejected;

      // Verifying that nothing bad happened (network is live, new collections can be created, etc.)
      await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    });
  });

  it('Admin can\'t remove collection admin.', async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//Charlie');
      const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
      
      await collection.addAdmin(alice, {Substrate: bob.address});
      await collection.addAdmin(alice, {Substrate: charlie.address});

      const adminListAfterAddAdmin = await collection.getAdmins();
      expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: helper.address.normalizeSubstrate(bob.address)});
      expect(adminListAfterAddAdmin).to.be.deep.contains({Substrate: helper.address.normalizeSubstrate(charlie.address)});

      await expect(collection.removeAdmin(charlie, {Substrate: bob.address})).to.be.rejected;

      const adminListAfterRemoveAdmin = await collection.getAdmins();
      expect(adminListAfterRemoveAdmin).to.be.deep.contains({Substrate: helper.address.normalizeSubstrate(bob.address)});
      expect(adminListAfterRemoveAdmin).to.be.deep.contains({Substrate: helper.address.normalizeSubstrate(charlie.address)});
    });
  });
});
