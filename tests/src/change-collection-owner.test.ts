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
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

let donor: IKeyringPair;

before(async () => {
  await usingPlaygrounds(async (_, privateKey) => {
    donor = privateKey('//Alice');
  });
});

describe('Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  it('Changing owner changes owner address', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const beforeChanging = await helper.collection.getData(collection.collectionId);
      expect(beforeChanging?.normalizedOwner).to.be.equal(alice.address);

      await collection.changeOwner(alice, bob.address);
      const afterChanging = await helper.collection.getData(collection.collectionId);
      expect(afterChanging?.normalizedOwner).to.be.equal(bob.address);
    });
  });
});

describe('Integration Test changeCollectionOwner(collection_id, new_owner) special checks for exOwner:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  it('Changing the owner of the collection is not allowed for the former owner', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});

      await collection.changeOwner(alice, bob.address);

      const changeOwnerTx = async () => collection.changeOwner(alice, alice.address);
      await expect(changeOwnerTx()).to.be.rejected;

      const afterChanging = await helper.collection.getData(collection.collectionId);
      expect(afterChanging?.normalizedOwner).to.be.equal(bob.address);
    });
  });

  it('New collectionOwner has access to sponsorship management operations in the collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.changeOwner(alice, bob.address);

      const afterChanging = await helper.collection.getData(collection.collectionId);
      expect(afterChanging?.normalizedOwner).to.be.equal(bob.address);

      await collection.setSponsor(bob, charlie.address);
      await collection.confirmSponsorship(charlie);
      await collection.removeSponsor(bob);
      const limits = {
        accountTokenOwnershipLimit: 1,
        tokenLimit: 1,
        sponsorTransferTimeout: 1,
        ownerCanDestroy: true,
        ownerCanTransfer: true,
      };

      await collection.setLimits(bob, limits);
      const gotLimits = await collection.getEffectiveLimits();
      expect(gotLimits).to.be.deep.contains(limits);

      await collection.setPermissions(bob, {access: 'AllowList', mintMode: true});

      await collection.burn(bob);
      const collectionData = await helper.collection.getData(collection.collectionId);
      expect(collectionData).to.be.null;
    });
  });

  it('New collectionOwner has access to changeCollectionOwner', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.changeOwner(alice, bob.address);
      await collection.changeOwner(bob, charlie.address);
      const collectionData = await collection.getData();
      expect(collectionData?.normalizedOwner).to.be.equal(charlie.address);
    });
  });
});

describe('Negative Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  it('Not owner can\'t change owner.', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const changeOwnerTx = async () => collection.changeOwner(bob, bob.address);
      await expect(changeOwnerTx()).to.be.rejected;
    });
  });

  it('Collection admin can\'t change owner.', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.addAdmin(alice, {Substrate: bob.address});
      const changeOwnerTx = async () => collection.changeOwner(bob, bob.address);
      await expect(changeOwnerTx()).to.be.rejected;
    });
  });

  it('Can\'t change owner of a non-existing collection.', async () => {
    await usingPlaygrounds(async (helper) => {
      const collectionId = (1 << 32) - 1;
      const changeOwnerTx = async () => helper.collection.changeOwner(bob, collectionId, bob.address);
      await expect(changeOwnerTx()).to.be.rejected;
    });
  });

  it('Former collectionOwner not allowed to sponsorship management operations in the collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.changeOwner(alice, bob.address);

      const changeOwnerTx = async () => collection.changeOwner(alice, alice.address);
      await expect(changeOwnerTx()).to.be.rejected;

      const afterChanging = await helper.collection.getData(collection.collectionId);
      expect(afterChanging?.normalizedOwner).to.be.equal(bob.address);

      const setSponsorTx = async () => collection.setSponsor(alice, charlie.address);
      const confirmSponsorshipTx = async () => collection.confirmSponsorship(alice);
      const removeSponsorTx = async () => collection.removeSponsor(alice);
      await expect(setSponsorTx()).to.be.rejected;
      await expect(confirmSponsorshipTx()).to.be.rejected;
      await expect(removeSponsorTx()).to.be.rejected;

      const limits = {
        accountTokenOwnershipLimit: 1,
        tokenLimit: 1,
        sponsorTransferTimeout: 1,
        ownerCanDestroy: true,
        ownerCanTransfer: true,
      };

      const setLimitsTx = async () => collection.setLimits(alice, limits);
      await expect(setLimitsTx()).to.be.rejected;

      const setPermissionTx = async () => collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
      await expect(setPermissionTx()).to.be.rejected;

      const burnTx = async () => collection.burn(alice);
      await expect(burnTx()).to.be.rejected;
    });
  });
});
