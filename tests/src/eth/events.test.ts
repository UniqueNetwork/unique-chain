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

import { expect } from 'chai';
import {IKeyringPair} from '@polkadot/types/types';
import { EthUniqueHelper, itEth, usingEthPlaygrounds } from './util';
import { TCollectionMode } from '../util/playgrounds/types';

let donor: IKeyringPair;
  
before(async function () {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
    donor = await privateKey({filename: __filename});
    });
});

async function testCollectionCreatedAndDestroy(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
        const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionCreated', 'CollectionDestroyed']}]);
        const {collectionAddress, events: ethEvents} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
        {
            expect(ethEvents).to.be.like([
                {
                    event: 'CollectionCreated',
                    args: {
                        owner: owner,
                        collectionId: collectionAddress
                    }
                }
            ]);
            expect(subEvents).to.be.like([{method: 'CollectionCreated'}]);
            ethEvents.pop();
            subEvents.pop();
        }
        {
            const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
            let result = await collectionHelper.methods.destroyCollection(collectionAddress).send({from:owner});
            expect(result.events).to.be.like({
                CollectionDestroyed: {
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            });
            expect(subEvents).to.be.like([{method: 'CollectionDestroyed'}]);
        }
        unsubscribe();
}

async function testCollectionPropertySetAndCollectionPropertyDeleted(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
    const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    
    let {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionPropertySet', 'CollectionPropertyDeleted']}]);
    {
        const ethEvents: any = [];
        collectionHelper.events.allEvents((_: any, event: any) => {
            ethEvents.push(event);
        });
        await collection.methods.setCollectionProperties([{key: 'A', value: [0,1,2,3]}]).send({from:owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionPropertySet'}]);
        subEvents.pop();
    }
    {
        const ethEvents: any = [];
        collectionHelper.events.allEvents((_: any, event: any) => {
            ethEvents.push(event);
        });
        await collection.methods.deleteCollectionProperties(['A']).send({from:owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionPropertyDeleted'}]);
    }
    unsubscribe();
}

async function testPropertyPermissionSet(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
    const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    const eethEvents: any = [];
    collectionHelper.events.allEvents((_: any, event: any) => {
        eethEvents.push(event);
    });
    const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['PropertyPermissionSet']}]);
    await collection.methods.setTokenPropertyPermission('testKey', true, true, true).send({from: owner});
    expect(eethEvents).to.be.like([
        {
            event: 'CollectionChanged',
            returnValues: {
                collectionId: collectionAddress
            }
        }
    ]);
    expect(subEvents).to.be.like([{method: 'PropertyPermissionSet'}]);
    unsubscribe();
}

async function testAllowListAddressAddedAndAllowListAddressRemoved(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
        const user = helper.ethCrossAccount.createAccount();
        const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
        const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
        const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
        const ethEvents: any[] = [];
        collectionHelper.events.allEvents((_: any, event: any) => {
            ethEvents.push(event);
        });

        const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['AllowListAddressAdded', 'AllowListAddressRemoved']}]);
        {
            await collection.methods.addToCollectionAllowListCross(user).send({from: owner});
            expect(ethEvents).to.be.like([
                {
                    event: 'CollectionChanged',
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            ]);
            expect(subEvents).to.be.like([{method: 'AllowListAddressAdded'}]);
            ethEvents.pop();
            subEvents.pop();
        }
        {
            await collection.methods.removeFromCollectionAllowListCross(user).send({from: owner});
            expect(ethEvents.length).to.be.eq(1);
            expect(ethEvents).to.be.like([
                {
                    event: 'CollectionChanged',
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            ]);
            expect(subEvents).to.be.like([{method: 'AllowListAddressRemoved'}]);
        }
        unsubscribe();
}

async function testCollectionAdminAddedAndCollectionAdminRemoved(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const user = helper.ethCrossAccount.createAccount();
    const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
    const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    const ethEvents: any = [];
    collectionHelper.events.allEvents((_: any, event: any) => {
        ethEvents.push(event);
    });
    const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionAdminAdded', 'CollectionAdminRemoved']}]);
    {
        await collection.methods.addCollectionAdminCross(user).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionAdminAdded'}]);
        ethEvents.pop();
        subEvents.pop();
    }
    {
        await collection.methods.removeCollectionAdminCross(user).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionAdminRemoved'}]);
    }
    unsubscribe();
}

async function testCollectionLimitSet(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
    const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    const ethEvents: any = [];
    collectionHelper.events.allEvents((_: any, event: any) => {
        ethEvents.push(event);
    });
    const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionLimitSet']}]);
    {
        await collection.methods.setCollectionLimit('ownerCanTransfer', 0n).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionLimitSet'}]);
    }
    unsubscribe();
}

async function testCollectionOwnedChanged(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const new_owner = helper.ethCrossAccount.createAccount();
    const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
    const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    const ethEvents: any = [];
    collectionHelper.events.allEvents((_: any, event: any) => {
        ethEvents.push(event);
    });
    const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionOwnedChanged']}]);
    {
        await collection.methods.changeCollectionOwnerCross(new_owner).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionOwnedChanged'}]);
    }
    unsubscribe();
}

async function testCollectionPermissionSet(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
    const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    const ethEvents: any = [];
    collectionHelper.events.allEvents((_: any, event: any) => {
        ethEvents.push(event);
    });
    const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['CollectionPermissionSet']}]);
    {
        await collection.methods.setCollectionMintMode(true).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionPermissionSet'}]);
        ethEvents.pop();
        subEvents.pop();
    }
    {
        await collection.methods.setCollectionAccess(1).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'CollectionPermissionSet'}]);
    }
    unsubscribe();
}

async function testCollectionSponsorSetAndSponsorshipConfirmedAndCollectionSponsorRemoved(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
        const sponsor = await helper.ethCrossAccount.createAccountWithBalance(donor);
        const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
        const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
        const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
        const ethEvents: any = [];
        collectionHelper.events.allEvents((_: any, event: any) => {
            ethEvents.push(event);
        });
        const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{
            section: 'common', names: ['CollectionSponsorSet', 'SponsorshipConfirmed', 'CollectionSponsorRemoved'
        ]}]);
        {
            await collection.methods.setCollectionSponsorCross(sponsor).send({from: owner});
            expect(ethEvents).to.be.like([
                {
                    event: 'CollectionChanged',
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            ]);
            expect(subEvents).to.be.like([{method: 'CollectionSponsorSet'}]);
            ethEvents.pop();
            subEvents.pop();
        }
        {
            await collection.methods.confirmCollectionSponsorship().send({from: sponsor.eth});
            expect(ethEvents).to.be.like([
                {
                    event: 'CollectionChanged',
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            ]);
            expect(subEvents).to.be.like([{method: 'SponsorshipConfirmed'}]);
            ethEvents.pop();
            subEvents.pop();
        }
        {
            await collection.methods.removeCollectionSponsor().send({from: owner});
            expect(ethEvents).to.be.like([
                {
                    event: 'CollectionChanged',
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            ]);
            expect(subEvents).to.be.like([{method: 'CollectionSponsorRemoved'}]);
        }
        unsubscribe();
}

async function testTokenPropertySetAndTokenPropertyDeleted(helper: EthUniqueHelper, mode: TCollectionMode) {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createCollection(mode, owner, 'A', 'B', 'C');
    const collection = await helper.ethNativeContract.collection(collectionAddress, mode, owner);
    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    const result = await collection.methods.mint(owner).send({from: owner});
    const tokenId = result.events.Transfer.returnValues.tokenId;
    await collection.methods.setTokenPropertyPermission('A', true, true, true).send({from: owner});


    const ethEvents: any = [];
    collectionHelper.events.allEvents((_: any, event: any) => {
        ethEvents.push(event);
    });
    const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'common', names: ['TokenPropertySet', 'TokenPropertyDeleted']}]);
    {
        await collection.methods.setProperties(tokenId, [{key: 'A', value: [1,2,3]}]).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'TokenChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'TokenPropertySet'}]);
        ethEvents.pop();
        subEvents.pop();
    }
    {
        await collection.methods.deleteProperties(tokenId, ['A']).send({from: owner});
        expect(ethEvents).to.be.like([
            {
                event: 'TokenChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
        expect(subEvents).to.be.like([{method: 'TokenPropertyDeleted'}]);
    }
    unsubscribe();
}

describe('[FT] Sync sub & eth events', () => {
    const mode: TCollectionMode = 'ft';

    itEth('CollectionCreated and CollectionDestroyed events', async ({helper}) => {
        await testCollectionCreatedAndDestroy(helper, mode);
    });

    itEth('CollectionChanged event for CollectionPropertySet and CollectionPropertyDeleted', async ({helper}) => {
        await testCollectionPropertySetAndCollectionPropertyDeleted(helper, mode);
    });
    
    itEth('CollectionChanged event for AllowListAddressAdded, AllowListAddressRemoved', async ({helper}) => {
        await testAllowListAddressAddedAndAllowListAddressRemoved(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionAdminAdded, CollectionAdminRemoved', async ({helper}) => {
        await testCollectionAdminAddedAndCollectionAdminRemoved(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionLimitSet', async ({helper}) => {
        await testCollectionLimitSet(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionOwnedChanged', async ({helper}) => {
        await testCollectionOwnedChanged(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionPermissionSet', async ({helper}) => {
        await testCollectionPermissionSet(helper, mode);
    });

    itEth('CollectionChanged event for CollectionSponsorSet, SponsorshipConfirmed, CollectionSponsorRemoved', async ({helper}) => {
        await testCollectionSponsorSetAndSponsorshipConfirmedAndCollectionSponsorRemoved(helper, mode);
    });
});

describe('[NFT] Sync sub & eth events', () => {
    const mode: TCollectionMode = 'nft';

    itEth('CollectionCreated and CollectionDestroyed events', async ({helper}) => {
        await testCollectionCreatedAndDestroy(helper, mode);
    });

    itEth('CollectionChanged event for CollectionPropertySet and CollectionPropertyDeleted', async ({helper}) => {
        await testCollectionPropertySetAndCollectionPropertyDeleted(helper, mode);
    });
    
    itEth('CollectionChanged event for PropertyPermissionSet', async ({helper}) => {
        await testPropertyPermissionSet(helper, mode);
    });
    
    itEth('CollectionChanged event for AllowListAddressAdded, AllowListAddressRemoved', async ({helper}) => {
        await testAllowListAddressAddedAndAllowListAddressRemoved(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionAdminAdded, CollectionAdminRemoved', async ({helper}) => {
        await testCollectionAdminAddedAndCollectionAdminRemoved(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionLimitSet', async ({helper}) => {
        await testCollectionLimitSet(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionOwnedChanged', async ({helper}) => {
        await testCollectionOwnedChanged(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionPermissionSet', async ({helper}) => {
        await testCollectionPermissionSet(helper, mode);
    });

    itEth('CollectionChanged event for CollectionSponsorSet, SponsorshipConfirmed, CollectionSponsorRemoved', async ({helper}) => {
        await testCollectionSponsorSetAndSponsorshipConfirmedAndCollectionSponsorRemoved(helper, mode);
    });
     
    itEth('CollectionChanged event for TokenPropertySet, TokenPropertyDeleted', async ({helper}) => {
        await testTokenPropertySetAndTokenPropertyDeleted(helper, mode);
    });
});

describe('[RFT] Sync sub & eth events', () => {
    const mode: TCollectionMode = 'rft';

    itEth('CollectionCreated and CollectionDestroyed events', async ({helper}) => {
        await testCollectionCreatedAndDestroy(helper, mode);
    });

    itEth('CollectionChanged event for CollectionPropertySet and CollectionPropertyDeleted', async ({helper}) => {
        await testCollectionPropertySetAndCollectionPropertyDeleted(helper, mode);
    });
    
    itEth('CollectionChanged event for PropertyPermissionSet', async ({helper}) => {
        await testPropertyPermissionSet(helper, mode);
    });
    
    itEth('CollectionChanged event for AllowListAddressAdded, AllowListAddressRemoved', async ({helper}) => {
        await testAllowListAddressAddedAndAllowListAddressRemoved(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionAdminAdded, CollectionAdminRemoved', async ({helper}) => {
        await testCollectionAdminAddedAndCollectionAdminRemoved(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionLimitSet', async ({helper}) => {
        await testCollectionLimitSet(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionOwnedChanged', async ({helper}) => {
        await testCollectionOwnedChanged(helper, mode);
    });
    
    itEth('CollectionChanged event for CollectionPermissionSet', async ({helper}) => {
        await testCollectionPermissionSet(helper, mode);
    });

    itEth('CollectionChanged event for CollectionSponsorSet, SponsorshipConfirmed, CollectionSponsorRemoved', async ({helper}) => {
        await testCollectionSponsorSetAndSponsorshipConfirmedAndCollectionSponsorRemoved(helper, mode);
    });
     
    itEth('CollectionChanged event for TokenPropertySet, TokenPropertyDeleted', async ({helper}) => {
        await testTokenPropertySetAndTokenPropertyDeleted(helper, mode);
    });
});
