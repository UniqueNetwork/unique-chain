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
import {itSub, Pallets, usingPlaygrounds, expect} from '../util/playgrounds';
import {UniqueNFTCollection, UniqueRFTCollection} from '../util/playgrounds/unique';

describe('Integration Test: Access Rights to Token Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 10n], donor);
    });
  });
    
  itSub('Reads access rights to properties of a collection', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const propertyRights = (await helper.callRpc('api.query.common.collectionPropertyPermissions', [collection.collectionId])).toJSON();
    expect(propertyRights).to.be.empty;
  });
    
  async function testSetsAccessRightsToProperties(collection: UniqueNFTCollection | UniqueRFTCollection) {  
    await expect(collection.setTokenPropertyPermissions(alice, [{key: 'skullduggery', permission: {mutable: true}}]))
      .to.be.fulfilled;
  
    await collection.addAdmin(alice, {Substrate: bob.address});
  
    await expect(collection.setTokenPropertyPermissions(bob, [{key: 'mindgame', permission: {collectionAdmin: true, tokenOwner: false}}]))
      .to.be.fulfilled;
  
    const propertyRights = await collection.getPropertyPermissions(['skullduggery', 'mindgame']);
    expect(propertyRights).to.include.deep.members([
      {key: 'skullduggery', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}},
      {key: 'mindgame', permission: {mutable: false, collectionAdmin: true, tokenOwner: false}},
    ]);
  }
  
  itSub('Sets access rights to properties of a collection (NFT)', async ({helper}) =>  {
    await testSetsAccessRightsToProperties(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Sets access rights to properties of a collection (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    await testSetsAccessRightsToProperties(await helper.rft.mintCollection(alice));
  });
    
  async function testChangesAccessRightsToProperty(collection: UniqueNFTCollection | UniqueRFTCollection) {
    await expect(collection.setTokenPropertyPermissions(alice, [{key: 'skullduggery', permission: {mutable: true, collectionAdmin: true}}]))
      .to.be.fulfilled;
  
    await expect(collection.setTokenPropertyPermissions(alice, [{key: 'skullduggery', permission: {mutable: false, tokenOwner: true}}]))
      .to.be.fulfilled;
  
    const propertyRights = await collection.getPropertyPermissions();
    expect(propertyRights).to.be.deep.equal([
      {key: 'skullduggery', permission: {'mutable': false, 'collectionAdmin': false, 'tokenOwner': true}},
    ]);
  }
  
  itSub('Changes access rights to properties of a NFT collection', async ({helper}) =>  {
    await testChangesAccessRightsToProperty(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Changes access rights to properties of a ReFungible collection', [Pallets.ReFungible], async ({helper}) => {
    await testChangesAccessRightsToProperty(await helper.rft.mintCollection(alice));
  });
});
  
describe('Negative Integration Test: Access Rights to Token Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });
  
  async function testPreventsFromSettingAccessRightsNotAdminOrOwner(collection: UniqueNFTCollection | UniqueRFTCollection) {
    await expect(collection.setTokenPropertyPermissions(bob, [{key: 'skullduggery', permission: {mutable: true, tokenOwner: true}}]))
      .to.be.rejectedWith(/common\.NoPermission/);
  
    const propertyRights = await collection.getPropertyPermissions(['skullduggery']);
    expect(propertyRights).to.be.empty;
  }
  
  itSub('Prevents from setting access rights to properties of a NFT collection if not an onwer/admin', async ({helper}) =>  {
    await testPreventsFromSettingAccessRightsNotAdminOrOwner(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Prevents from setting access rights to properties of a ReFungible collection if not an onwer/admin', [Pallets.ReFungible], async ({helper}) => {
    await testPreventsFromSettingAccessRightsNotAdminOrOwner(await helper.rft.mintCollection(alice));
  });
  
  async function testPreventFromAddingTooManyPossibleProperties(collection: UniqueNFTCollection | UniqueRFTCollection) {  
    const constitution = [];
    for (let i = 0; i < 65; i++) {
      constitution.push({
        key: 'property_' + i,
        permission: Math.random() > 0.5 ? {mutable: true, collectionAdmin: true, tokenOwner: true} : {},
      });
    }
  
    await expect(collection.setTokenPropertyPermissions(alice, constitution))
      .to.be.rejectedWith(/common\.PropertyLimitReached/);
  
    const propertyRights = await collection.getPropertyPermissions();
    expect(propertyRights).to.be.empty;
  }
  
  itSub('Prevents from adding too many possible properties (NFT)', async ({helper}) =>  {
    await testPreventFromAddingTooManyPossibleProperties(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Prevents from adding too many possible properties (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    await testPreventFromAddingTooManyPossibleProperties(await helper.rft.mintCollection(alice));
  });
  
  async function testPreventAccessRightsModifiedIfConstant(collection: UniqueNFTCollection | UniqueRFTCollection) {
    await expect(collection.setTokenPropertyPermissions(alice, [{key: 'skullduggery', permission: {mutable: false, tokenOwner: true}}]))
      .to.be.fulfilled;
  
    await expect(collection.setTokenPropertyPermissions(alice, [{key: 'skullduggery', permission: {collectionAdmin: true}}]))
      .to.be.rejectedWith(/common\.NoPermission/);
  
    const propertyRights = await collection.getPropertyPermissions(['skullduggery']);
    expect(propertyRights).to.deep.equal([
      {key: 'skullduggery', permission: {'mutable': false, 'collectionAdmin': false, 'tokenOwner': true}},
    ]);
  }
  
  itSub('Prevents access rights to be modified if constant (NFT)', async ({helper}) =>  {
    await testPreventAccessRightsModifiedIfConstant(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Prevents access rights to be modified if constant (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    await testPreventAccessRightsModifiedIfConstant(await helper.rft.mintCollection(alice));
  });
  
  async function testPreventsAddingPropertiesWithInvalidNames(collection: UniqueNFTCollection | UniqueRFTCollection) {
    const invalidProperties = [
      [{key: 'skullduggery', permission: {tokenOwner: true}}, {key: 'im possible', permission: {collectionAdmin: true}}],
      [{key: 'G#4', permission: {tokenOwner: true}}],
      [{key: 'HÆMILTON', permission: {mutable: false, collectionAdmin: true, tokenOwner: true}}],
    ];
  
    for (let i = 0; i < invalidProperties.length; i++) {
      await expect(
        collection.setTokenPropertyPermissions(alice, invalidProperties[i]), 
        `on setting the new badly-named property #${i}`,
      ).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
    }
  
    await expect(
      collection.setTokenPropertyPermissions(alice, [{key: '', permission: {}}]), 
      'on rejecting an unnamed property',
    ).to.be.rejectedWith(/common\.EmptyPropertyKey/);
  
    const correctKey = '--0x03116e387820CA05'; // PolkadotJS would parse this as an already encoded hex-string
    await expect(
      collection.setTokenPropertyPermissions(alice, [
        {key: correctKey, permission: {collectionAdmin: true}},
      ]), 
      'on setting the correctly-but-still-badly-named property',
    ).to.be.fulfilled;
  
    const keys = invalidProperties.flatMap(propertySet => propertySet.map(property => property.key)).concat(correctKey).concat('');
  
    const propertyRights = await collection.getPropertyPermissions(keys);
    expect(propertyRights).to.be.deep.equal([
      {key: correctKey, permission: {mutable: false, collectionAdmin: true, tokenOwner: false}},
    ]);
  }
  
  itSub('Prevents adding properties with invalid names (NFT)', async ({helper}) =>  {
    await testPreventsAddingPropertiesWithInvalidNames(await helper.nft.mintCollection(alice));
  });
  
  itSub.ifWithPallets('Prevents adding properties with invalid names (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    await testPreventsAddingPropertiesWithInvalidNames(await helper.rft.mintCollection(alice));
  });
});