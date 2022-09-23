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

/*import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  addCollectionAdminExpectSuccess,
  CollectionMode,
  createCollectionExpectSuccess,
  setCollectionPermissionsExpectSuccess,
  createItemExpectSuccess,
  getCreateCollectionResult,
  transferExpectSuccess,
} from '../util/helpers';*/
import {IKeyringPair} from '@polkadot/types/types';
import {itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds, expect} from '../util/playgrounds';
import {UniqueCollectionBase, UniqueHelper, UniqueNFTCollection, UniqueNFTToken, UniqueRFTCollection, UniqueRFTToken} from '../util/playgrounds/unique';

// ---------- COLLECTION PROPERTIES

describe('Integration Test: Collection Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('Properties are initially empty', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    expect(await collection.getProperties()).to.be.empty;
  });

  async function testSetsPropertiesForCollection(collection: UniqueCollectionBase) {
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

  async function testCheckValidNames(collection: UniqueCollectionBase) {
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

  async function testChangesProperties(collection: UniqueCollectionBase) {
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

  async function testDeleteProperties(collection: UniqueCollectionBase) {
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
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 10n], donor);
    });
  });
  
  async function testFailsSetPropertiesIfNotOwnerOrAdmin(collection: UniqueCollectionBase) {  
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
  
  async function testFailsSetPropertiesThatExeedLimits(collection: UniqueCollectionBase) {
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
  
  async function testFailsSetMorePropertiesThanAllowed(collection: UniqueCollectionBase) {
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
  
  async function testFailsSetPropertiesWithInvalidNames(collection: UniqueCollectionBase) {
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

// ---------- ACCESS RIGHTS

describe('Integration Test: Access Rights to Token Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 10n], donor);
    });
  });
  
  itSub('Reads access rights to properties of a collection', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const propertyRights = (await helper.api!.query.common.collectionPropertyPermissions(collection.collectionId)).toJSON();
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
      const donor = privateKey('//Alice');
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

// ---------- TOKEN PROPERTIES

describe('Integration Test: Token Properties', () => {
  let alice: IKeyringPair; // collection owner
  let bob: IKeyringPair; // collection admin
  let charlie: IKeyringPair; // token owner

  let permissions: {permission: any, signers: IKeyringPair[]}[];

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });

    // todo:playgrounds probably separate these tests later
    permissions = [
      {permission: {mutable: true, collectionAdmin: true}, signers: [alice, bob]},
      {permission: {mutable: false, collectionAdmin: true}, signers: [alice, bob]},
      {permission: {mutable: true, tokenOwner: true}, signers: [charlie]},
      {permission: {mutable: false, tokenOwner: true}, signers: [charlie]},
      {permission: {mutable: true, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie]},
      {permission: {mutable: false, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie]},
    ];
  });
  
  async function testReadsYetEmptyProperties(token: UniqueNFTToken | UniqueRFTToken) {
    const properties = await token.getProperties();
    expect(properties).to.be.empty;

    const tokenData = await token.getData();
    expect(tokenData!.properties).to.be.empty;
  }

  itSub('Reads yet empty properties of a token (NFT)', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testReadsYetEmptyProperties(token);
  });

  itSub.ifWithPallets('Reads yet empty properties of a token (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testReadsYetEmptyProperties(token);
  });

  async function testAssignPropertiesAccordingToPermissions(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint) {
    await token.collection.addAdmin(alice, {Substrate: bob.address});
    await token.transfer(alice, {Substrate: charlie.address}, pieces);

    const propertyKeys: string[] = [];
    let i = 0;
    for (const permission of permissions) {
      i++;
      let j = 0;
      for (const signer of permission.signers) {
        j++;
        const key = i + '_' + signer.address;
        propertyKeys.push(key);

        await expect(
          token.collection.setTokenPropertyPermissions(alice, [{key: key, permission: permission.permission}]), 
          `on setting permission #${i} by alice`,
        ).to.be.fulfilled;

        await expect(
          token.setProperties(signer, [{key: key, value: 'Serotonin increase'}]), 
          `on adding property #${i} by signer #${j}`,
        ).to.be.fulfilled;
      }
    }

    const properties = await token.getProperties(propertyKeys);
    const tokenData = await token.getData();
    for (let i = 0; i < properties.length; i++) {
      expect(properties[i].value).to.be.equal('Serotonin increase');
      expect(tokenData!.properties[i].value).to.be.equal('Serotonin increase');
    }
  }

  itSub('Assigns properties to a token according to permissions (NFT)', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testAssignPropertiesAccordingToPermissions(token, 1n);
  });

  itSub.ifWithPallets('Assigns properties to a token according to permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    await testAssignPropertiesAccordingToPermissions(token, 100n);
  });

  async function testChangesPropertiesAccordingPermission(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint) {
    await token.collection.addAdmin(alice, {Substrate: bob.address});
    await token.transfer(alice, {Substrate: charlie.address}, pieces);

    const propertyKeys: string[] = [];
    let i = 0;
    for (const permission of permissions) {
      i++;
      if (!permission.permission.mutable) continue;
      
      let j = 0;
      for (const signer of permission.signers) {
        j++;
        const key = i + '_' + signer.address;
        propertyKeys.push(key);

        await expect(
          token.collection.setTokenPropertyPermissions(alice, [{key: key, permission: permission.permission}]), 
          `on setting permission #${i} by alice`,
        ).to.be.fulfilled;

        await expect(
          token.setProperties(signer, [{key, value: 'Serotonin increase'}]), 
          `on adding property #${i} by signer #${j}`,
        ).to.be.fulfilled;

        await expect(
          token.setProperties(signer, [{key, value: 'Serotonin stable'}]), 
          `on changing property #${i} by signer #${j}`,
        ).to.be.fulfilled;
      }
    }

    const properties = await token.getProperties(propertyKeys);
    const tokenData = await token.getData();
    for (let i = 0; i < properties.length; i++) {
      expect(properties[i].value).to.be.equal('Serotonin stable');
      expect(tokenData!.properties[i].value).to.be.equal('Serotonin stable');
    }
  }

  itSub('Changes properties of a token according to permissions (NFT)', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testChangesPropertiesAccordingPermission(token, 1n);
  });

  itSub.ifWithPallets('Changes properties of a token according to permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    await testChangesPropertiesAccordingPermission(token, 100n);
  });

  async function testDeletePropertiesAccordingPermission(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint) {
    await token.collection.addAdmin(alice, {Substrate: bob.address});
    await token.transfer(alice, {Substrate: charlie.address}, pieces);

    const propertyKeys: string[] = [];
    let i = 0;

    for (const permission of permissions) {
      i++;
      if (!permission.permission.mutable) continue;
      
      let j = 0;
      for (const signer of permission.signers) {
        j++;
        const key = i + '_' + signer.address;
        propertyKeys.push(key);

        await expect(
          token.collection.setTokenPropertyPermissions(alice, [{key: key, permission: permission.permission}]), 
          `on setting permission #${i} by alice`,
        ).to.be.fulfilled;

        await expect(
          token.setProperties(signer, [{key, value: 'Serotonin increase'}]), 
          `on adding property #${i} by signer #${j}`,
        ).to.be.fulfilled;

        await expect(
          token.deleteProperties(signer, [key]), 
          `on deleting property #${i} by signer #${j}`,
        ).to.be.fulfilled;
      }
    }

    expect(await token.getProperties(propertyKeys)).to.be.empty;
    expect((await token.getData())!.properties).to.be.empty;
  }
  
  itSub('Deletes properties of a token according to permissions (NFT)', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testDeletePropertiesAccordingPermission(token, 1n);
  });

  itSub.ifWithPallets('Deletes properties of a token according to permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    await testDeletePropertiesAccordingPermission(token, 100n);
  });

  itSub('Assigns properties to a nested token according to permissions', async ({helper}) =>  {
    const collectionA = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const collectionB = await helper.nft.mintCollection(alice);
    const targetToken = await collectionA.mintToken(alice);
    const nestedToken = await collectionB.mintToken(alice, targetToken.nestingAccount());

    await collectionB.addAdmin(alice, {Substrate: bob.address});
    await targetToken.transfer(alice, {Substrate: charlie.address});

    const propertyKeys: string[] = [];
    let i = 0;
    for (const permission of permissions) {
      i++;
      let j = 0;
      for (const signer of permission.signers) {
        j++;
        const key = i + '_' + signer.address;
        propertyKeys.push(key);
        
        await expect(
          nestedToken.collection.setTokenPropertyPermissions(alice, [{key: key, permission: permission.permission}]), 
          `on setting permission #${i} by alice`,
        ).to.be.fulfilled;

        await expect(
          nestedToken.setProperties(signer, [{key, value: 'Serotonin increase'}]), 
          `on adding property #${i} by signer #${j}`,
        ).to.be.fulfilled;
      }

    }

    const properties = await nestedToken.getProperties(propertyKeys);
    const tokenData = await nestedToken.getData();
    for (let i = 0; i < properties.length; i++) {
      expect(properties[i].value).to.be.equal('Serotonin increase');
      expect(tokenData!.properties[i].value).to.be.equal('Serotonin increase');
    }
    expect(await targetToken.getProperties()).to.be.empty;
  });

  itSub('Changes properties of a nested token according to permissions', async ({helper}) =>  {
    const collectionA = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const collectionB = await helper.nft.mintCollection(alice);
    const targetToken = await collectionA.mintToken(alice);
    const nestedToken = await collectionB.mintToken(alice, targetToken.nestingAccount());

    await collectionB.addAdmin(alice, {Substrate: bob.address});
    await targetToken.transfer(alice, {Substrate: charlie.address});

    const propertyKeys: string[] = [];
    let i = 0;
    for (const permission of permissions) {
      i++;
      if (!permission.permission.mutable) continue;
      
      let j = 0;
      for (const signer of permission.signers) {
        j++;
        const key = i + '_' + signer.address;
        propertyKeys.push(key);

        await expect(
          nestedToken.collection.setTokenPropertyPermissions(alice, [{key: key, permission: permission.permission}]), 
          `on setting permission #${i} by alice`,
        ).to.be.fulfilled;

        await expect(
          nestedToken.setProperties(signer, [{key, value: 'Serotonin increase'}]), 
          `on adding property #${i} by signer #${j}`,
        ).to.be.fulfilled;

        await expect(
          nestedToken.setProperties(signer, [{key, value: 'Serotonin stable'}]), 
          `on changing property #${i} by signer #${j}`,
        ).to.be.fulfilled;
      }
    }

    const properties = await nestedToken.getProperties(propertyKeys);
    const tokenData = await nestedToken.getData();
    for (let i = 0; i < properties.length; i++) {
      expect(properties[i].value).to.be.equal('Serotonin stable');
      expect(tokenData!.properties[i].value).to.be.equal('Serotonin stable');
    }
    expect(await targetToken.getProperties()).to.be.empty;
  });

  itSub('Deletes properties of a nested token according to permissions', async ({helper}) =>  {
    const collectionA = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const collectionB = await helper.nft.mintCollection(alice);
    const targetToken = await collectionA.mintToken(alice);
    const nestedToken = await collectionB.mintToken(alice, targetToken.nestingAccount());

    await collectionB.addAdmin(alice, {Substrate: bob.address});
    await targetToken.transfer(alice, {Substrate: charlie.address});

    const propertyKeys: string[] = [];
    let i = 0;
    for (const permission of permissions) {
      i++;
      if (!permission.permission.mutable) continue;
      
      let j = 0;
      for (const signer of permission.signers) {
        j++;
        const key = i + '_' + signer.address;
        propertyKeys.push(key);

        await expect(
          nestedToken.collection.setTokenPropertyPermissions(alice, [{key: key, permission: permission.permission}]), 
          `on setting permission #${i} by alice`,
        ).to.be.fulfilled;

        await expect(
          nestedToken.setProperties(signer, [{key, value: 'Serotonin increase'}]), 
          `on adding property #${i} by signer #${j}`,
        ).to.be.fulfilled;

        await expect(
          nestedToken.deleteProperties(signer, [key]), 
          `on deleting property #${i} by signer #${j}`,
        ).to.be.fulfilled;
      }
    }

    expect(await nestedToken.getProperties(propertyKeys)).to.be.empty;
    expect((await nestedToken.getData())!.properties).to.be.empty;
    expect(await targetToken.getProperties()).to.be.empty;
  });
});

describe('Negative Integration Test: Token Properties', () => {
  let alice: IKeyringPair; // collection owner
  let bob: IKeyringPair; // collection admin
  let charlie: IKeyringPair; // token owner

  let constitution: {permission: any, signers: IKeyringPair[], sinner: IKeyringPair}[];

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      let dave: IKeyringPair;
      [alice, bob, charlie, dave] = await helper.arrange.createAccounts([100n, 100n, 100n, 100n], donor);

      // todo:playgrounds probably separate these tests later
      constitution = [
        {permission: {mutable: true, collectionAdmin: true}, signers: [alice, bob], sinner: charlie},
        {permission: {mutable: false, collectionAdmin: true}, signers: [alice, bob], sinner: charlie},
        {permission: {mutable: true, tokenOwner: true}, signers: [charlie], sinner: alice},
        {permission: {mutable: false, tokenOwner: true}, signers: [charlie], sinner: alice},
        {permission: {mutable: true, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie], sinner: dave},
        {permission: {mutable: false, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie], sinner: dave},
      ];
    });
  });

  async function getConsumedSpace(api: any, collectionId: number, tokenId: number, mode: 'NFT' | 'RFT'): Promise<number> {
    return (await (mode == 'NFT' ? api.query.nonfungible : api.query.refungible).tokenProperties(collectionId, tokenId)).toJSON().consumedSpace;
  }

  async function prepare(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint): Promise<number> {
    await token.collection.addAdmin(alice, {Substrate: bob.address});
    await token.transfer(alice, {Substrate: charlie.address}, pieces);

    let i = 0;
    for (const passage of constitution) {
      i++;
      const signer = passage.signers[0];
      
      await expect(
        token.collection.setTokenPropertyPermissions(alice, [{key: `${i}`, permission: passage.permission}]), 
        `on setting permission ${i} by alice`,
      ).to.be.fulfilled;

      await expect(
        token.setProperties(signer, [{key: `${i}`, value: 'Serotonin increase'}]), 
        `on adding property ${i} by ${signer.address}`,
      ).to.be.fulfilled;
    }

    const originalSpace = await getConsumedSpace(token.collection.helper.api, token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    return originalSpace;
  }

  async function testForbidsChangingDeletingPropertiesUserOutsideOfPermissions(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint) {
    const originalSpace = await prepare(token, pieces);

    let i = 0;
    for (const forbiddance of constitution) {
      i++;
      if (!forbiddance.permission.mutable) continue;

      await expect(
        token.setProperties(forbiddance.sinner, [{key: `${i}`, value: 'Serotonin down'}]), 
        `on failing to change property ${i} by the malefactor`,
      ).to.be.rejectedWith(/common\.NoPermission/);

      await expect(
        token.deleteProperties(forbiddance.sinner, [`${i}`]), 
        `on failing to delete property ${i} by the malefactor`,
      ).to.be.rejectedWith(/common\.NoPermission/);
    }

    const consumedSpace = await getConsumedSpace(token.collection.helper.api, token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids changing/deleting properties of a token if the user is outside of permissions (NFT)', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testForbidsChangingDeletingPropertiesUserOutsideOfPermissions(token, 1n);
  });

  itSub.ifWithPallets('Forbids changing/deleting properties of a token if the user is outside of permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    await testForbidsChangingDeletingPropertiesUserOutsideOfPermissions(token, 100n);
  });

  async function testForbidsChangingDeletingPropertiesIfPropertyImmutable(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint) {
    const originalSpace = await prepare(token, pieces);

    let i = 0;
    for (const permission of constitution) {
      i++;
      if (permission.permission.mutable) continue;

      await expect(
        token.setProperties(permission.signers[0], [{key: `${i}`, value: 'Serotonin down'}]), 
        `on failing to change property ${i} by signer #0`,
      ).to.be.rejectedWith(/common\.NoPermission/);

      await expect(
        token.deleteProperties(permission.signers[0], [i.toString()]), 
        `on failing to delete property ${i} by signer #0`,
      ).to.be.rejectedWith(/common\.NoPermission/);
    }
  
    const consumedSpace = await getConsumedSpace(token.collection.helper.api, token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids changing/deleting properties of a token if the property is permanent (immutable) (NFT)', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testForbidsChangingDeletingPropertiesIfPropertyImmutable(token, 1n);
  });

  itSub.ifWithPallets('Forbids changing/deleting properties of a token if the property is permanent (immutable) (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    await testForbidsChangingDeletingPropertiesIfPropertyImmutable(token, 100n);
  });

  async function testForbidsAddingPropertiesIfPropertyNotDeclared(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint) {
    const originalSpace = await prepare(token, pieces);

    await expect(
      token.setProperties(alice, [{key: 'non-existent', value: 'I exist!'}]), 
      'on failing to add a previously non-existent property',
    ).to.be.rejectedWith(/common\.NoPermission/);
      
    await expect(
      token.collection.setTokenPropertyPermissions(alice, [{key: 'now-existent', permission: {}}]), 
      'on setting a new non-permitted property',
    ).to.be.fulfilled;

    await expect(
      token.setProperties(alice, [{key: 'now-existent', value: 'I exist!'}]), 
      'on failing to add a property forbidden by the \'None\' permission',
    ).to.be.rejectedWith(/common\.NoPermission/);

    expect(await token.getProperties(['non-existent', 'now-existent'])).to.be.empty;
      
    const consumedSpace = await getConsumedSpace(token.collection.helper.api, token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids adding properties to a token if the property is not declared / forbidden with the \'None\' permission (NFT)', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testForbidsAddingPropertiesIfPropertyNotDeclared(token, 1n);
  });

  itSub.ifWithPallets('Forbids adding properties to a token if the property is not declared / forbidden with the \'None\' permission (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    await testForbidsAddingPropertiesIfPropertyNotDeclared(token, 100n);
  });

  async function testForbidsAddingTooManyProperties(token: UniqueNFTToken | UniqueRFTToken, pieces: bigint) {
    const originalSpace = await prepare(token, pieces);

    await expect(
      token.collection.setTokenPropertyPermissions(alice, [
        {key: 'a_holy_book', permission: {collectionAdmin: true, tokenOwner: true}}, 
        {key: 'young_years', permission: {collectionAdmin: true, tokenOwner: true}},
      ]), 
      'on setting new permissions for properties',
    ).to.be.fulfilled;

    // Mute the general tx parsing error
    {
      console.error = () => {};
      await expect(token.setProperties(alice, [{key: 'a_holy_book', value: 'word '.repeat(6554)}]))
        .to.be.rejected;
    }

    await expect(token.setProperties(alice, [
      {key: 'a_holy_book', value: 'word '.repeat(3277)}, 
      {key: 'young_years', value: 'neverending'.repeat(1490)},
    ])).to.be.rejectedWith(/common\.NoSpaceForProperty/);
  
    expect(await token.getProperties(['a_holy_book', 'young_years'])).to.be.empty;
    const consumedSpace = await getConsumedSpace(token.collection.helper.api, token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids adding too many properties to a token (NFT)', async ({helper}) =>  {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await testForbidsAddingTooManyProperties(token, 1n);
  });

  itSub.ifWithPallets('Forbids adding too many properties to a token (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    await testForbidsAddingTooManyProperties(token, 100n);
  });
});

describe('ReFungible token properties permissions tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  async function prepare(helper: UniqueHelper): Promise<UniqueRFTToken> {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);
    
    await collection.addAdmin(alice, {Substrate: bob.address});
    await collection.setTokenPropertyPermissions(alice, [{key: 'fractals', permission: {mutable: true, tokenOwner: true}}]);
    
    return token;
  }

  itSub('Forbids adding token property with tokenOwner==true when signer doesn\'t have all pieces', async ({helper}) =>  {
    const token = await prepare(helper);

    await token.transfer(alice, {Substrate: charlie.address}, 33n);

    await expect(token.setProperties(alice, [
      {key: 'fractals', value: 'multiverse'}, 
    ])).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Forbids mutating token property with tokenOwher==true when signer doesn\'t have all pieces', async ({helper}) =>  {
    const token = await prepare(helper);

    await expect(token.collection.setTokenPropertyPermissions(alice, [{key: 'fractals', permission: {mutable:true, tokenOwner: true}}]))
      .to.be.fulfilled;

    await expect(token.setProperties(alice, [
      {key: 'fractals', value: 'multiverse'}, 
    ])).to.be.fulfilled;

    await token.transfer(alice, {Substrate: charlie.address}, 33n);

    await expect(token.setProperties(alice, [
      {key: 'fractals', value: 'want to rule the world'}, 
    ])).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Forbids deleting token property with tokenOwner==true when signer doesn\'t have all pieces', async ({helper}) =>  {
    const token = await prepare(helper);

    await expect(token.setProperties(alice, [
      {key: 'fractals', value: 'one headline - why believe it'}, 
    ])).to.be.fulfilled;

    await token.transfer(alice, {Substrate: charlie.address}, 33n);

    await expect(token.deleteProperties(alice, ['fractals'])).
      to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Allows token property mutation with collectionOwner==true when admin doesn\'t have all pieces', async ({helper}) =>  {
    const token = await prepare(helper);

    await token.transfer(alice, {Substrate: charlie.address}, 33n);

    await expect(token.collection.setTokenPropertyPermissions(alice, [{key: 'fractals', permission: {mutable:true, collectionAdmin: true}}]))
      .to.be.fulfilled;

    await expect(token.setProperties(alice, [
      {key: 'fractals', value: 'multiverse'}, 
    ])).to.be.fulfilled;
  });
});
