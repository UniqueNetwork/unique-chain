// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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
import {IKeyringPair} from '@polkadot/types/types';
import {EthUniqueHelper, itEth, usingEthPlaygrounds} from './util';
import {IEvent, TCollectionMode} from '../util/playgrounds/types';
import {Pallets, requirePalletsOrSkip} from '../util';
import {CollectionLimitField, TokenPermissionField, NormalizedEvent} from './util/playgrounds/types';

let donor: IKeyringPair;

before(async function () {
  await usingEthPlaygrounds(async (_helper, privateKey) => {
    donor = await privateKey({url: import.meta.url});
  });
});

function clearEvents(ethEvents: NormalizedEvent[] | null, subEvents: IEvent[]) {
  if (ethEvents !== null) {
    ethEvents.splice(0);
  }
  subEvents.splice(0);
}

async function testCollectionCreatedAndDestroy(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionCreated', 'CollectionDestroyed']}]);
  const {collectionAddress, events: ethEvents} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  await helper.wait.newBlocks(1);
  {
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionCreated',
        args: {
          owner: owner,
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionCreated'}]);
    clearEvents(ethEvents, subEvents);
  }
  {
    const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
    const result = await collectionHelper.methods.destroyCollection(collectionAddress).send({from:owner});
    await helper.wait.newBlocks(1);
    expect(result.events).to.containSubset({
      CollectionDestroyed: {
        returnValues: {
          collectionId: collectionAddress,
        },
      },
    });
    expect(subEvents).to.containSubset([{method: 'CollectionDestroyed'}]);
  }
  unsubscribe();
}

async function testCollectionPropertySetAndDeleted(helper: EthUniqueHelper, mode: TCollectionMode) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);

  const ethEvents: any = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionPropertySet', 'CollectionPropertyDeleted']}]);
  {
    await collection.methods.setCollectionProperties([{key: 'A', value: [0,1,2,3]}]).send({from:owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionPropertySet'}]);
    clearEvents(ethEvents, subEvents);
  }
  {
    await collection.methods.deleteCollectionProperties(['A']).send({from:owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
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
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
  const ethEvents: any = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['PropertyPermissionSet']}]);
  await collection.methods.setTokenPropertyPermissions([
    ['A', [
      [TokenPermissionField.Mutable, true],
      [TokenPermissionField.TokenOwner, true],
      [TokenPermissionField.CollectionAdmin, true]],
    ],
  ]).send({from: owner});
  await helper.wait.newBlocks(1);
  expect(ethEvents).to.containSubset([
    {
      event: 'CollectionChanged',
      returnValues: {
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
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
  const ethEvents: any[] = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['AllowListAddressAdded', 'AllowListAddressRemoved']}]);
  {
    await collection.methods.addToCollectionAllowListCross(user).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'AllowListAddressAdded'}]);
    clearEvents(ethEvents, subEvents);
  }
  {
    await collection.methods.removeFromCollectionAllowListCross(user).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
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
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
  const ethEvents: any = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionAdminAdded', 'CollectionAdminRemoved']}]);
  {
    await collection.methods.addCollectionAdminCross(user).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionAdminAdded'}]);
    clearEvents(ethEvents, subEvents);
  }
  {
    await collection.methods.removeCollectionAdminCross(user).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
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
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
  const ethEvents: any = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionLimitSet']}]);
  {
    await collection.methods.setCollectionLimit({field: CollectionLimitField.OwnerCanTransfer, value: {status: true, value: 0}}).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
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
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
  const ethEvents: any = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionOwnerChanged']}]);
  {
    await collection.methods.changeCollectionOwnerCross(newOwner).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
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
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
  const ethEvents: any = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionPermissionSet']}]);
  {
    await collection.methods.setCollectionMintMode(true).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'CollectionPermissionSet'}]);
    clearEvents(ethEvents, subEvents);
  }
  {
    await collection.methods.setCollectionAccess(1).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
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
  const sponsor = await helper.ethCrossAccount.createAccountWithBalance(donor);
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const collectionHelper = await helper.ethNativeContract.collectionHelpers(owner);
  const ethEvents: any = [];
  collectionHelper.events.allEvents((_: any, event: any) => {
    ethEvents.push(event);
  });
  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{
    section: 'common', names: ['CollectionSponsorSet', 'SponsorshipConfirmed', 'CollectionSponsorRemoved',
    ]}]);
  {
    await collection.methods.setCollectionSponsorCross(sponsor).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([{
      event: 'CollectionChanged',
      returnValues: {
        collectionId: collectionAddress,
      },
    }]);
    expect(subEvents).to.containSubset([{method: 'CollectionSponsorSet'}]);
    clearEvents(ethEvents, subEvents);
  }
  {
    await collection.methods.confirmCollectionSponsorship().send({from: sponsor.eth});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
          collectionId: collectionAddress,
        },
      },
    ]);
    expect(subEvents).to.containSubset([{method: 'SponsorshipConfirmed'}]);
    clearEvents(ethEvents, subEvents);
  }
  {
    await collection.methods.removeCollectionSponsor().send({from: owner});
    await helper.wait.newBlocks(1);
    expect(ethEvents).to.containSubset([
      {
        event: 'CollectionChanged',
        returnValues: {
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
  const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
  const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
  const result = await collection.methods.mint(owner).send({from: owner});
  const tokenId = result.events.Transfer.returnValues.tokenId;
  await collection.methods.setTokenPropertyPermissions([
    ['A', [
      [TokenPermissionField.Mutable, true],
      [TokenPermissionField.TokenOwner, true],
      [TokenPermissionField.CollectionAdmin, true]],
    ],
  ]).send({from: owner});

  const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['TokenPropertySet', 'TokenPropertyDeleted']}]);
  {
    const result = await collection.methods.setProperties(tokenId, [{key: 'A', value: [1,2,3]}]).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(result.events.TokenChanged).to.be.like({
      event: 'TokenChanged',
      returnValues: {
        tokenId: tokenId,
      },
    });
    expect(subEvents).to.containSubset([{method: 'TokenPropertySet'}]);
    clearEvents(null, subEvents);
  }
  {
    const result = await collection.methods.deleteProperties(tokenId, ['A']).send({from: owner});
    await helper.wait.newBlocks(1);
    expect(result.events.TokenChanged).to.be.like({
      event: 'TokenChanged',
      returnValues: {
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
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      const _donor = await privateKey({url: import.meta.url});
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
