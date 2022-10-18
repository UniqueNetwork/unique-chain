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
import {itSub, Pallets, usingPlaygrounds, expect} from '../util';
import {UniqueBaseCollection} from '../util/playgrounds/unique';

describe('Integration Test: Collection Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });
  
  itSub('Properties are initially empty', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    expect(await collection.getProperties()).to.be.empty;
  });
  
  async function testSetsPropertiesForCollection(collection: UniqueBaseCollection) {
    // As owner
    await expect(collection.setProperties(alice, [{key: 'electron', value: 'come bond'}])).to.be.fulfilled;
  
    await collection.addAdmin(alice, {Substrate: bob.address});
  
    // As administrator
    await expect(collection.setProperties(bob, [{key: 'black_hole'}])).to.be.fulfilled;
  
    const properties = await collection.getProperties();
    expect(properties).to.include.deep.members([
      {key: 'electron', value: 'come bond'},
      {key: 'black_hole', value: ''},
    ]);
  }
  
  itSub('Sets properties for a NFT collection', async ({helper}) =>  {
    await testSetsPropertiesForCollection(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Sets properties for a ReFungible collection', [Pallets.ReFungible], async ({helper}) => {
    await testSetsPropertiesForCollection(await helper.rft.mintCollection(alice));
  });
  
  async function testCheckValidNames(collection: UniqueBaseCollection) {
    // alpha symbols
    await expect(collection.setProperties(alice, [{key: 'answer'}])).to.be.fulfilled;
  
    // numeric symbols
    await expect(collection.setProperties(alice, [{key: '451'}])).to.be.fulfilled;
  
    // underscore symbol
    await expect(collection.setProperties(alice, [{key: 'black_hole'}])).to.be.fulfilled;
  
    // dash symbol
    await expect(collection.setProperties(alice, [{key: '-'}])).to.be.fulfilled;
  
    // dot symbol
    await expect(collection.setProperties(alice, [{key: 'once.in.a.long.long.while...', value: 'you get a little lost'}])).to.be.fulfilled;
  
    const properties = await collection.getProperties();
    expect(properties).to.include.deep.members([
      {key: 'answer', value: ''},
      {key: '451', value: ''},
      {key: 'black_hole', value: ''},
      {key: '-', value: ''},
      {key: 'once.in.a.long.long.while...', value: 'you get a little lost'},
    ]);
  }
  
  itSub('Check valid names for NFT collection properties keys', async ({helper}) =>  {
    await testCheckValidNames(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Check valid names for ReFungible collection properties keys', [Pallets.ReFungible], async ({helper}) => {
    await testCheckValidNames(await helper.rft.mintCollection(alice));
  });
  
  async function testChangesProperties(collection: UniqueBaseCollection) {
    await expect(collection.setProperties(alice, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: ''}])).to.be.fulfilled;
  
    // Mutate the properties
    await expect(collection.setProperties(alice, [{key: 'black_hole', value: 'LIGO'}])).to.be.fulfilled;
  
    const properties = await collection.getProperties();
    expect(properties).to.include.deep.members([
      {key: 'electron', value: 'come bond'},
      {key: 'black_hole', value: 'LIGO'},
    ]);
  }
  
  itSub('Changes properties of a NFT collection', async ({helper}) =>  {
    await testChangesProperties(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Changes properties of a ReFungible collection', [Pallets.ReFungible], async ({helper}) => {
    await testChangesProperties(await helper.rft.mintCollection(alice));
  });
  
  async function testDeleteProperties(collection: UniqueBaseCollection) {
    await expect(collection.setProperties(alice, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: 'LIGO'}])).to.be.fulfilled;
  
    await expect(collection.deleteProperties(alice, ['electron'])).to.be.fulfilled;
  
    const properties = await collection.getProperties(['black_hole', 'electron']);
    expect(properties).to.be.deep.equal([
      {key: 'black_hole', value: 'LIGO'},
    ]);
  }
  
  itSub('Deletes properties of a NFT collection', async ({helper}) =>  {
    await testDeleteProperties(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Deletes properties of a ReFungible collection', [Pallets.ReFungible], async ({helper}) => {
    await testDeleteProperties(await helper.rft.mintCollection(alice));
  });
});
  
describe('Negative Integration Test: Collection Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 10n], donor);
    });
  });
    
  async function testFailsSetPropertiesIfNotOwnerOrAdmin(collection: UniqueBaseCollection) {  
    await expect(collection.setProperties(bob, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: 'LIGO'}]))
      .to.be.rejectedWith(/common\.NoPermission/);
  
    expect(await collection.getProperties()).to.be.empty;
  }
  
  itSub('Fails to set properties in a NFT collection if not its onwer/administrator', async ({helper}) =>  {
    await testFailsSetPropertiesIfNotOwnerOrAdmin(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Fails to set properties in a ReFungible collection if not its onwer/administrator', [Pallets.ReFungible], async ({helper}) => {
    await testFailsSetPropertiesIfNotOwnerOrAdmin(await helper.rft.mintCollection(alice));
  });
    
  async function testFailsSetPropertiesThatExeedLimits(collection: UniqueBaseCollection) {
    const spaceLimit = (await (collection.helper!.api! as any).query.common.collectionProperties(collection.collectionId)).spaceLimit.toNumber();
    
    // Mute the general tx parsing error, too many bytes to process
    {
      console.error = () => {};
      await expect(collection.setProperties(alice, [
        {key: 'electron', value: 'low high '.repeat(Math.ceil(spaceLimit! / 9))},
      ])).to.be.rejected;
    }
  
    expect(await collection.getProperties(['electron'])).to.be.empty;
  
    await expect(collection.setProperties(alice, [
      {key: 'electron', value: 'low high '.repeat(Math.ceil(spaceLimit! / 18))}, 
      {key: 'black_hole', value: '0'.repeat(Math.ceil(spaceLimit! / 2))}, 
    ])).to.be.rejectedWith(/common\.NoSpaceForProperty/);
  
    expect(await collection.getProperties(['electron', 'black_hole'])).to.be.empty;
  }
  
  itSub('Fails to set properties that exceed the limits (NFT)', async ({helper}) =>  {
    await testFailsSetPropertiesThatExeedLimits(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Fails to set properties that exceed the limits (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    await testFailsSetPropertiesThatExeedLimits(await helper.rft.mintCollection(alice));
  });
    
  async function testFailsSetMorePropertiesThanAllowed(collection: UniqueBaseCollection) {
    const propertiesToBeSet = [];
    for (let i = 0; i < 65; i++) {
      propertiesToBeSet.push({
        key: 'electron_' + i,
        value: Math.random() > 0.5 ? 'high' : 'low',
      });
    }
  
    await expect(collection.setProperties(alice, propertiesToBeSet)).
      to.be.rejectedWith(/common\.PropertyLimitReached/);
  
    expect(await collection.getProperties()).to.be.empty;
  }
  
  itSub('Fails to set more properties than it is allowed (NFT)', async ({helper}) =>  {
    await testFailsSetMorePropertiesThanAllowed(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Fails to set more properties than it is allowed (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    await testFailsSetMorePropertiesThanAllowed(await helper.rft.mintCollection(alice));
  });
    
  async function testFailsSetPropertiesWithInvalidNames(collection: UniqueBaseCollection) {
    const invalidProperties = [
      [{key: 'electron', value: 'negative'}, {key: 'string theory', value: 'understandable'}],
      [{key: 'Mr/Sandman', value: 'Bring me a gene'}],
      [{key: 'déjà vu', value: 'hmm...'}],
    ];
  
    for (let i = 0; i < invalidProperties.length; i++) {
      await expect(
        collection.setProperties(alice, invalidProperties[i]), 
        `on rejecting the new badly-named property #${i}`,
      ).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
    }
  
    await expect(
      collection.setProperties(alice, [{key: '', value: 'nothing must not exist'}]), 
      'on rejecting an unnamed property',
    ).to.be.rejectedWith(/common\.EmptyPropertyKey/);
  
    await expect(
      collection.setProperties(alice, [{key: 'CRISPR-Cas9', value: 'rewriting nature!'}]), 
      'on setting the correctly-but-still-badly-named property',
    ).to.be.fulfilled;
  
    const keys = invalidProperties.flatMap(propertySet => propertySet.map(property => property.key)).concat('CRISPR-Cas9').concat('');
  
    const properties = await collection.getProperties(keys);
    expect(properties).to.be.deep.equal([
      {key: 'CRISPR-Cas9', value: 'rewriting nature!'},
    ]);
  
    for (let i = 0; i < invalidProperties.length; i++) {
      await expect(
        collection.deleteProperties(alice, invalidProperties[i].map(propertySet => propertySet.key)), 
        `on trying to delete the non-existent badly-named property #${i}`,
      ).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
    }
  }
  
  itSub('Fails to set properties with invalid names (NFT)', async ({helper}) =>  {
    await testFailsSetPropertiesWithInvalidNames(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Fails to set properties with invalid names (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    await testFailsSetPropertiesWithInvalidNames(await helper.rft.mintCollection(alice));
  });
});
  