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
import { expect } from 'chai';
import { itEth, usingEthPlaygrounds } from './util';

describe.only('NFT events', () => {
    let donor: IKeyringPair;
  
    before(async function () {
      await usingEthPlaygrounds(async (_helper, privateKey) => {
        donor = await privateKey({filename: __filename});
      });
    });

    itEth('Create event', async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionAddress, events} = await helper.eth.createCollecion('createNFTCollection', owner, 'A', 'B', 'C');
        expect(events).to.be.like([
            {
                event: 'CollectionCreated',
                args: {
                    owner: owner,
                    collectionId: collectionAddress
                }
            }
        ]);
    });

    itEth('Destroy event', async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionAddress} = await helper.eth.createCollecion('createNFTCollection', owner, 'A', 'B', 'C');
        const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
        let resutl = await collectionHelper.methods.destroyCollection(collectionAddress).send({from:owner});
        expect(resutl.events).to.be.like({
            CollectionDestroyed: {
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        });
    });
    
    itEth('CollectionChanged event for CollectionPropertySet and CollectionPropertyDeleted', async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionAddress} = await helper.eth.createCollecion('createNFTCollection', owner, 'A', 'B', 'C');
        const collection = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
        const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
        
        {
            const events: any = [];
            collectionHelper.events.allEvents((_: any, event: any) => {
                events.push(event);
            });
            await collection.methods.setCollectionProperties([{key: 'A', value: [0,1,2,3]}]).send({from:owner});
            expect(events).to.be.like([
                {
                    event: 'CollectionChanged',
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            ]);
        }
        {
            const events: any = [];
            collectionHelper.events.allEvents((_: any, event: any) => {
                events.push(event);
            });
            await collection.methods.deleteCollectionProperties(['A']).send({from:owner});
            expect(events).to.be.like([
                {
                    event: 'CollectionChanged',
                    returnValues: {
                        collectionId: collectionAddress
                    }
                }
            ]);
        }

    });
    
    itEth('CollectionChanged event for PropertyPermissionSet', async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionAddress} = await helper.eth.createCollecion('createNFTCollection', owner, 'A', 'B', 'C');
        const collection = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
        const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
        const events: any = [];
        collectionHelper.events.allEvents((_: any, event: any) => {
            events.push(event);
        });
        await collection.methods.setTokenPropertyPermission('testKey', true, true, true).send({from: owner});
        expect(events).to.be.like([
            {
                event: 'CollectionChanged',
                returnValues: {
                    collectionId: collectionAddress
                }
            }
        ]);
    });
    
    // itEth('CollectionChanged event for AllowListAddressAdded', async ({helper}) => {
    //     const owner = await helper.eth.createAccountWithBalance(donor);
    //     const user = await helper.eth.createAccount();
    //     const userCross = helper.ethCrossAccount.fromAddress(user);
    //     const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    //   // allow list does not need to be enabled to add someone in advance
    //     const collection = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    //     const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    //     const events: any = [];
    //     collectionHelper.events.allEvents((_: any, event: any) => {
    //         events.push(event);
    //     });
    //     await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    //     expect(events).to.be.like([
    //         {
    //             event: 'CollectionChanged',
    //             returnValues: {
    //                 collectionId: collectionAddress
    //             }
    //         }
    //     ]);
    // });
});