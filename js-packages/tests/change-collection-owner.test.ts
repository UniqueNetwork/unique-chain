﻿// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
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

import type {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds, expect, itSub} from '@unique/test-utils/util.js';
import {NON_EXISTENT_COLLECTION_ID} from '@unique-nft/playgrounds/types.js';

describe('Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Changing owner changes owner address', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const beforeChanging = await helper.collection.getData(collection.collectionId);
    expect(beforeChanging?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(alice.address));

    await collection.changeOwner(alice, bob.address);
    const afterChanging = await helper.collection.getData(collection.collectionId);
    expect(afterChanging?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(bob.address));
  });
});

describe('Integration Test changeCollectionOwner(collection_id, new_owner) special checks for exOwner:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itSub('Changing the owner of the collection is not allowed for the former owner', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});

    await collection.changeOwner(alice, bob.address);

    const changeOwnerTx = () => collection.changeOwner(alice, alice.address);
    await expect(changeOwnerTx()).to.be.rejectedWith(/common\.NoPermission/);

    const afterChanging = await helper.collection.getData(collection.collectionId);
    expect(afterChanging?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(bob.address));
  });

  itSub('New collectionOwner has access to sponsorship management operations in the collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await collection.changeOwner(alice, bob.address);

    const afterChanging = await helper.collection.getData(collection.collectionId);
    expect(afterChanging?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(bob.address));

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

  itSub('New collectionOwner has access to changeCollectionOwner', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await collection.changeOwner(alice, bob.address);
    await collection.changeOwner(bob, charlie.address);
    const collectionData = await collection.getData();
    expect(collectionData?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(charlie.address));
  });
});

describe('Negative Integration Test changeCollectionOwner(collection_id, new_owner):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itSub('Not owner can\'t change owner.', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const changeOwnerTx = () => collection.changeOwner(bob, bob.address);
    await expect(changeOwnerTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Collection admin can\'t change owner.', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const changeOwnerTx = () => collection.changeOwner(bob, bob.address);
    await expect(changeOwnerTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Can\'t change owner of a non-existing collection.', async ({helper}) => {
    const collectionId = NON_EXISTENT_COLLECTION_ID;
    const changeOwnerTx = () => helper.collection.changeOwner(bob, collectionId, bob.address);
    await expect(changeOwnerTx()).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Former collectionOwner not allowed to sponsorship management operations in the collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await collection.changeOwner(alice, bob.address);

    const changeOwnerTx = () => collection.changeOwner(alice, alice.address);
    await expect(changeOwnerTx()).to.be.rejectedWith(/common\.NoPermission/);

    const afterChanging = await helper.collection.getData(collection.collectionId);
    expect(afterChanging?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(bob.address));

    const setSponsorTx = () => collection.setSponsor(alice, charlie.address);
    const confirmSponsorshipTx = () => collection.confirmSponsorship(alice);
    const removeSponsorTx = () => collection.removeSponsor(alice);
    await expect(setSponsorTx()).to.be.rejectedWith(/common\.NoPermission/);
    await expect(confirmSponsorshipTx()).to.be.rejectedWith(/common\.ConfirmSponsorshipFail/);
    await expect(removeSponsorTx()).to.be.rejectedWith(/common\.NoPermission/);

    const limits = {
      accountTokenOwnershipLimit: 1,
      tokenLimit: 1,
      sponsorTransferTimeout: 1,
      ownerCanDestroy: true,
      ownerCanTransfer: true,
    };

    const setLimitsTx = () => collection.setLimits(alice, limits);
    await expect(setLimitsTx()).to.be.rejectedWith(/common\.NoPermission/);

    const setPermissionTx = () => collection.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await expect(setPermissionTx()).to.be.rejectedWith(/common\.NoPermission/);

    const burnTx = () => collection.burn(alice);
    await expect(burnTx()).to.be.rejectedWith(/common\.NoPermission/);
  });
});
