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

import {expect} from 'chai';
import type {IKeyringPair} from '@polkadot/types/types';
import {itEth, usingEthPlaygrounds, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import type {IEvent, TCollectionMode} from '@unique-nft/playgrounds/types.js';
import {Pallets, requirePalletsOrSkip} from '@unique/test-utils/util.js';
import {CollectionLimitField, TokenPermissionField, CreateCollectionData} from '@unique/test-utils/eth/types.js';
import type {NormalizedEvent} from '@unique/test-utils/eth/types.js';

let donor: IKeyringPair;

before(async function () {
  await usingEthPlaygrounds(async (_helper, privateKey) => {
    donor = await privateKey({url: import.meta.url});
  });
});

function clearEvents(ethEvents: {[key: string]: NormalizedEvent} | NormalizedEvent[] | null, subEvents: IEvent[]) {
  if(ethEvents instanceof Array) ethEvents.splice(0);
  else if(ethEvents !== null) Object.keys(ethEvents).forEach(key => delete ethEvents[key]);

  subEvents.splice(0);
}

async function testCollectionCreatedAndDestroy(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionCreated', 'CollectionDestroyed']}]);

  const {collectionAddress, events: ethEvents} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();

  await helper.wait.newBlocks(10);
  expect(ethEvents.CollectionCreated).to.be.like({
    args: {
      owner: owner.address,
      collectionId: collectionAddress,
    },
  });

  expect(subEvents).to.containSubset([{method: 'CollectionCreated'}]);

  {
    const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

    const receipt = await (await collectionHelper.destroyCollection.send(collectionAddress)).wait(...waitParams);
    const events = helper.eth.normalizeEvents(receipt!);

    await helper.wait.newBlocks(10);
    expect(events.CollectionDestroyed).to.be.like({
      args: {
        collectionId: collectionAddress,
      },
    });
    expect(subEvents).to.containSubset([{method: 'CollectionDestroyed'}]);
  }

  unsubscribe();
}

async function testCollectionPropertySetAndDeleted(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionPropertySet', 'CollectionPropertyDeleted']}]);

  {
    await (
      await collection.setCollectionProperties.send([{key: 'A', value: new Uint8Array([0, 1, 2, 3])}])
    ).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([{args: {collectionId: collectionAddress}}]);
    expect(subEvents).to.containSubset([{method: 'CollectionPropertySet'}]);

    clearEvents(ethEvents, subEvents);
  }

  {
    await (await collection.deleteCollectionProperties.send(['A'])).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionPropertyDeleted'}]);
  }
  unsubscribe();
}

async function testPropertyPermissionSet(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);

  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['PropertyPermissionSet']}]);

  await (
    await collection.setTokenPropertyPermissions.send([
      ['A', [
        [TokenPermissionField.Mutable, true],
        [TokenPermissionField.TokenOwner, true],
        [TokenPermissionField.CollectionAdmin, true]],
      ],
    ])
  ).wait(...waitParams);

  await helper.wait.newBlocks(10);
  expect(ethEvents).to.containSubset([
    {
      args: {
        collectionId: collectionAddress,
      },
    },
  ]);
  expect(subEvents).to.containSubset([{method: 'PropertyPermissionSet'}]);

  unsubscribe();
}

async function testAllowListAddressAddedAndRemoved(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const user = helper.ethCrossAccount.createAccount();

  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['AllowListAddressAdded', 'AllowListAddressRemoved']}]);

  {
    await (await collection.addToCollectionAllowListCross.send(user)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'AllowListAddressAdded'}]);

    clearEvents(ethEvents, subEvents);
  }
  {
    await (await collection.removeFromCollectionAllowListCross.send(user)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'AllowListAddressRemoved'}]);
  }
  unsubscribe();
}

async function testCollectionAdminAddedAndRemoved(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const user = helper.ethCrossAccount.createAccount();

  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionAdminAdded', 'CollectionAdminRemoved']}]);

  {
    await (await collection.addCollectionAdminCross.send(user)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionAdminAdded'}]);

    clearEvents(ethEvents, subEvents);
  }

  {
    await (await collection.removeCollectionAdminCross.send(user)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionAdminRemoved'}]);
  }

  unsubscribe();
}

async function testCollectionLimitSet(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);

  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionLimitSet']}]);

  {
    await (
      await collection.setCollectionLimit.send({field: CollectionLimitField.OwnerCanTransfer, value: {status: true, value: 0}})
    ).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionLimitSet'}]);
  }

  unsubscribe();
}

async function testCollectionOwnerChanged(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const newOwner = helper.ethCrossAccount.createAccount();

  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionOwnerChanged']}]);

  {
    await (await collection.changeCollectionOwnerCross.send(newOwner)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionOwnerChanged'}]);
  }

  unsubscribe();
}

async function testCollectionPermissionSet(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);

  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionPermissionSet']}]);

  {
    await (await collection.setCollectionMintMode.send(true)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionPermissionSet'}]);

    clearEvents(ethEvents, subEvents);
  }

  {
    await (await collection.setCollectionAccess.send(1)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionPermissionSet'}]);
  }

  unsubscribe();
}

async function testCollectionSponsorSetAndConfirmedAndThenRemoved(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const sponsor = await helper.eth.createAccountWithBalance(donor);

  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);

  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  collectionHelper.on('CollectionChanged', (collectionId) => {
    ethEvents.push({args: {collectionId}});
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{
    section: 'common', names: ['CollectionSponsorSet', 'SponsorshipConfirmed', 'CollectionSponsorRemoved',
    ]}]);

  {
    const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
    await (await collection.setCollectionSponsorCross.send(sponsorCross)).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([{
      args: {
        collectionId: collectionAddress,
      },
    }]);
    expect(subEvents).to.containSubset([{method: 'CollectionSponsorSet'}]);

    clearEvents(ethEvents, subEvents);
  }

  {
    const collectionFromSponsor = helper.eth.changeContractCaller(collection, sponsor);
    await (await collectionFromSponsor.confirmCollectionSponsorship.send()).wait(...waitParams);


    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'SponsorshipConfirmed'}]);

    clearEvents(ethEvents, subEvents);
  }

  {
    await (await collection.removeCollectionSponsor.send()).wait(...waitParams);

    await helper.wait.newBlocks(10);
    expect(ethEvents).to.containSubset([
      {
        args: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionSponsorRemoved'}]);
  }

  unsubscribe();
}

async function testTokenPropertySetAndDeleted(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', mode, 18)).send();
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);

  const mintReceipt = await (await collection.mint.send(owner)).wait(...waitParams);
  const tokenId = helper.eth.normalizeEvents(mintReceipt!).Transfer.args.tokenId;

  await (
    await collection.setTokenPropertyPermissions.send([
      ['A', [
        [TokenPermissionField.Mutable, true],
        [TokenPermissionField.TokenOwner, true],
        [TokenPermissionField.CollectionAdmin, true]],
      ],
    ])
  ).wait(...waitParams);

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['TokenPropertySet', 'TokenPropertyDeleted']}]);

  {
    const tx = await collection.setProperties.send(tokenId, [{key: 'A', value: new Uint8Array([1, 2, 3])}]);

    const receipt = await tx.wait(...waitParams);

    const ethEvents = helper.eth.normalizeEvents(receipt!);

    await helper.wait.newBlocks(10);
    expect(ethEvents.TokenChanged).to.be.like({
      args: {
        tokenId: tokenId,
      },
    });
    expect(subEvents).to.containSubset([{method: 'TokenPropertySet'}]);

    clearEvents(null, subEvents);
  }

  {
    const tx = await collection.deleteProperties.send(tokenId, ['A']);
    const receipt = await tx.wait(...waitParams);
    const ethEvents = helper.eth.normalizeEvents(receipt!);

    await helper.wait.newBlocks(10);
    expect(ethEvents.TokenChanged).to.be.like({
      args: {
        tokenId: tokenId,
      },
    });
    expect(subEvents).to.containSubset([{method: 'TokenPropertyDeleted'}]);
  }

  unsubscribe();
}

describe('[FT] Sync sub & eth events', () => {
  const mode: TCollectionMode = 'ft';

  itEth('CollectionCreated and CollectionDestroyed events', async ({helper}) => {
    await testCollectionCreatedAndDestroy(helper, mode);
  });

  itEth('CollectionChanged event for CollectionPropertySet and CollectionPropertyDeleted', async ({helper}) => {
    await testCollectionPropertySetAndDeleted(helper, mode);
  });

  itEth('CollectionChanged event for AllowListAddressAdded, AllowListAddressRemoved', async ({helper}) => {
    await testAllowListAddressAddedAndRemoved(helper, mode);
  });

  itEth('CollectionChanged event for CollectionAdminAdded, CollectionAdminRemoved', async ({helper}) => {
    await testCollectionAdminAddedAndRemoved(helper, mode);
  });

  itEth('CollectionChanged event for CollectionLimitSet', async ({helper}) => {
    await testCollectionLimitSet(helper, mode);
  });

  itEth('CollectionChanged event for CollectionOwnerChanged', async ({helper}) => {
    await testCollectionOwnerChanged(helper, mode);
  });

  itEth('CollectionChanged event for CollectionPermissionSet', async ({helper}) => {
    await testCollectionPermissionSet(helper, mode);
  });

  itEth('CollectionChanged event for CollectionSponsorSet, SponsorshipConfirmed, CollectionSponsorRemoved', async ({helper}) => {
    await testCollectionSponsorSetAndConfirmedAndThenRemoved(helper, mode);
  });
});

describe('[NFT] Sync sub & eth events', () => {
  const mode: TCollectionMode = 'nft';

  itEth('CollectionCreated and CollectionDestroyed events', async ({helper}) => {
    await testCollectionCreatedAndDestroy(helper, mode);
  });

  itEth('CollectionChanged event for CollectionPropertySet and CollectionPropertyDeleted', async ({helper}) => {
    await testCollectionPropertySetAndDeleted(helper, mode);
  });

  itEth('CollectionChanged event for PropertyPermissionSet', async ({helper}) => {
    await testPropertyPermissionSet(helper, mode);
  });

  itEth('CollectionChanged event for AllowListAddressAdded, AllowListAddressRemoved', async ({helper}) => {
    await testAllowListAddressAddedAndRemoved(helper, mode);
  });

  itEth('CollectionChanged event for CollectionAdminAdded, CollectionAdminRemoved', async ({helper}) => {
    await testCollectionAdminAddedAndRemoved(helper, mode);
  });

  itEth('CollectionChanged event for CollectionLimitSet', async ({helper}) => {
    await testCollectionLimitSet(helper, mode);
  });

  itEth('CollectionChanged event for CollectionOwnerChanged', async ({helper}) => {
    await testCollectionOwnerChanged(helper, mode);
  });

  itEth('CollectionChanged event for CollectionPermissionSet', async ({helper}) => {
    await testCollectionPermissionSet(helper, mode);
  });

  itEth('CollectionChanged event for CollectionSponsorSet, SponsorshipConfirmed, CollectionSponsorRemoved', async ({helper}) => {
    await testCollectionSponsorSetAndConfirmedAndThenRemoved(helper, mode);
  });

  itEth('CollectionChanged event for TokenPropertySet, TokenPropertyDeleted', async ({helper}) => {
    await testTokenPropertySetAndDeleted(helper, mode);
  });
});

describe('[RFT] Sync sub & eth events', () => {
  const mode: TCollectionMode = 'rft';

  before(async function() {
    await usingEthPlaygrounds((helper) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      return Promise.resolve();
    });
  });

  itEth('CollectionCreated and CollectionDestroyed events', async ({helper}) => {
    await testCollectionCreatedAndDestroy(helper, mode);
  });

  itEth('CollectionChanged event for CollectionPropertySet and CollectionPropertyDeleted', async ({helper}) => {
    await testCollectionPropertySetAndDeleted(helper, mode);
  });

  itEth('CollectionChanged event for PropertyPermissionSet', async ({helper}) => {
    await testPropertyPermissionSet(helper, mode);
  });

  itEth('CollectionChanged event for AllowListAddressAdded, AllowListAddressRemoved', async ({helper}) => {
    await testAllowListAddressAddedAndRemoved(helper, mode);
  });

  itEth('CollectionChanged event for CollectionAdminAdded, CollectionAdminRemoved', async ({helper}) => {
    await testCollectionAdminAddedAndRemoved(helper, mode);
  });

  itEth('CollectionChanged event for CollectionLimitSet', async ({helper}) => {
    await testCollectionLimitSet(helper, mode);
  });

  itEth('CollectionChanged event for CollectionOwnerChanged', async ({helper}) => {
    await testCollectionOwnerChanged(helper, mode);
  });

  itEth('CollectionChanged event for CollectionPermissionSet', async ({helper}) => {
    await testCollectionPermissionSet(helper, mode);
  });

  itEth('CollectionChanged event for CollectionSponsorSet, SponsorshipConfirmed, CollectionSponsorRemoved', async ({helper}) => {
    await testCollectionSponsorSetAndConfirmedAndThenRemoved(helper, mode);
  });

  itEth('CollectionChanged event for TokenPropertySet, TokenPropertyDeleted', async ({helper}) => {
    await testTokenPropertySetAndDeleted(helper, mode);
  });
});
