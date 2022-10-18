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
import {itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds, expect} from '../util';
import {UniqueHelper, UniqueNFToken, UniqueRFToken} from '../util/playgrounds/unique';

describe('Integration Test: Token Properties', () => {
  let alice: IKeyringPair; // collection owner
  let bob: IKeyringPair; // collection admin
  let charlie: IKeyringPair; // token owner

  let permissions: {permission: any, signers: IKeyringPair[]}[];

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });

    permissions = [
      {permission: {mutable: true, collectionAdmin: true}, signers: [alice, bob]},
      {permission: {mutable: false, collectionAdmin: true}, signers: [alice, bob]},
      {permission: {mutable: true, tokenOwner: true}, signers: [charlie]},
      {permission: {mutable: false, tokenOwner: true}, signers: [charlie]},
      {permission: {mutable: true, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie]},
      {permission: {mutable: false, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie]},
    ];
  });

  async function mintCollectionWithAllPermissionsAndToken(helper: UniqueHelper, mode: 'NFT' | 'RFT'): Promise<[UniqueNFToken | UniqueRFToken, bigint]> {
    const collection = await (mode == 'NFT' ? helper.nft : helper.rft).mintCollection(alice, {
      tokenPropertyPermissions: permissions.flatMap(({permission, signers}, i) => 
        signers.map(signer => {return {key: `${i+1}_${signer.address}`, permission};})),
    });
    return mode == 'NFT' ? [await collection.mintToken(alice), 1n] : [await collection.mintToken(alice, 100n), 100n];
  }
  
  async function testReadsYetEmptyProperties(token: UniqueNFToken | UniqueRFToken) {
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

  async function testAssignPropertiesAccordingToPermissions(token: UniqueNFToken | UniqueRFToken, pieces: bigint) {
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
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'NFT');
    await testAssignPropertiesAccordingToPermissions(token, amount);
  });

  itSub.ifWithPallets('Assigns properties to a token according to permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'RFT');
    await testAssignPropertiesAccordingToPermissions(token, amount);
  });

  async function testChangesPropertiesAccordingPermission(token: UniqueNFToken | UniqueRFToken, pieces: bigint) {
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
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'NFT');
    await testChangesPropertiesAccordingPermission(token, amount);
  });

  itSub.ifWithPallets('Changes properties of a token according to permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'RFT');
    await testChangesPropertiesAccordingPermission(token, amount);
  });

  async function testDeletePropertiesAccordingPermission(token: UniqueNFToken | UniqueRFToken, pieces: bigint) {
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
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'NFT');
    await testDeletePropertiesAccordingPermission(token, amount);
  });

  itSub.ifWithPallets('Deletes properties of a token according to permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'RFT');
    await testDeletePropertiesAccordingPermission(token, amount);
  });

  itSub('Assigns properties to a nested token according to permissions', async ({helper}) =>  {
    const collectionA = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const collectionB = await helper.nft.mintCollection(alice, {
      tokenPropertyPermissions: permissions.flatMap(({permission, signers}, i) => 
        signers.map(signer => {return {key: `${i+1}_${signer.address}`, permission};})),
    });
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
    const collectionB = await helper.nft.mintCollection(alice, {
      tokenPropertyPermissions: permissions.flatMap(({permission, signers}, i) => 
        signers.map(signer => {return {key: `${i+1}_${signer.address}`, permission};})),
    });
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
    const collectionB = await helper.nft.mintCollection(alice, {
      tokenPropertyPermissions: permissions.flatMap(({permission, signers}, i) => 
        signers.map(signer => {return {key: `${i+1}_${signer.address}`, permission};})),
    });
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
      const donor = await privateKey({filename: __filename});
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

  async function mintCollectionWithAllPermissionsAndToken(helper: UniqueHelper, mode: 'NFT' | 'RFT'): Promise<[UniqueNFToken | UniqueRFToken, bigint]> {
    const collection = await (mode == 'NFT' ? helper.nft : helper.rft).mintCollection(alice, {
      tokenPropertyPermissions: constitution.map(({permission}, i) => {return {key: `${i+1}`, permission};}),
    });
    return mode == 'NFT' ? [await collection.mintToken(alice), 1n] : [await collection.mintToken(alice, 100n), 100n];
  }

  async function getConsumedSpace(api: any, collectionId: number, tokenId: number, mode: 'NFT' | 'RFT'): Promise<number> {
    return (await (mode == 'NFT' ? api.query.nonfungible : api.query.refungible).tokenProperties(collectionId, tokenId)).toJSON().consumedSpace;
  }

  async function prepare(token: UniqueNFToken | UniqueRFToken, pieces: bigint): Promise<number> {
    await token.collection.addAdmin(alice, {Substrate: bob.address});
    await token.transfer(alice, {Substrate: charlie.address}, pieces);

    let i = 0;
    for (const passage of constitution) {
      i++;
      const signer = passage.signers[0];
      await expect(
        token.setProperties(signer, [{key: `${i}`, value: 'Serotonin increase'}]), 
        `on adding property ${i} by ${signer.address}`,
      ).to.be.fulfilled;
    }

    const originalSpace = await getConsumedSpace(token.collection.helper.getApi(), token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    return originalSpace;
  }

  async function testForbidsChangingDeletingPropertiesUserOutsideOfPermissions(token: UniqueNFToken | UniqueRFToken, pieces: bigint) {
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

    const consumedSpace = await getConsumedSpace(token.collection.helper.getApi(), token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids changing/deleting properties of a token if the user is outside of permissions (NFT)', async ({helper}) =>  {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'NFT');
    await testForbidsChangingDeletingPropertiesUserOutsideOfPermissions(token, amount);
  });

  itSub.ifWithPallets('Forbids changing/deleting properties of a token if the user is outside of permissions (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'RFT');
    await testForbidsChangingDeletingPropertiesUserOutsideOfPermissions(token, amount);
  });

  async function testForbidsChangingDeletingPropertiesIfPropertyImmutable(token: UniqueNFToken | UniqueRFToken, pieces: bigint) {
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
  
    const consumedSpace = await getConsumedSpace(token.collection.helper.getApi(), token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids changing/deleting properties of a token if the property is permanent (immutable) (NFT)', async ({helper}) =>  {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'NFT');
    await testForbidsChangingDeletingPropertiesIfPropertyImmutable(token, amount);
  });

  itSub.ifWithPallets('Forbids changing/deleting properties of a token if the property is permanent (immutable) (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'RFT');
    await testForbidsChangingDeletingPropertiesIfPropertyImmutable(token, amount);
  });

  async function testForbidsAddingPropertiesIfPropertyNotDeclared(token: UniqueNFToken | UniqueRFToken, pieces: bigint) {
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
      
    const consumedSpace = await getConsumedSpace(token.collection.helper.getApi(), token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids adding properties to a token if the property is not declared / forbidden with the \'None\' permission (NFT)', async ({helper}) =>  {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'NFT');
    await testForbidsAddingPropertiesIfPropertyNotDeclared(token, amount);
  });

  itSub.ifWithPallets('Forbids adding properties to a token if the property is not declared / forbidden with the \'None\' permission (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'RFT');
    await testForbidsAddingPropertiesIfPropertyNotDeclared(token, amount);
  });

  async function testForbidsAddingTooManyProperties(token: UniqueNFToken | UniqueRFToken, pieces: bigint) {
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
    const consumedSpace = await getConsumedSpace(token.collection.helper.getApi(), token.collectionId, token.tokenId, pieces == 1n ? 'NFT' : 'RFT'); 
    expect(consumedSpace).to.be.equal(originalSpace);
  }

  itSub('Forbids adding too many properties to a token (NFT)', async ({helper}) =>  {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'NFT');
    await testForbidsAddingTooManyProperties(token, amount);
  });

  itSub.ifWithPallets('Forbids adding too many properties to a token (ReFungible)', [Pallets.ReFungible], async ({helper}) => {
    const [token, amount] = await mintCollectionWithAllPermissionsAndToken(helper, 'RFT');
    await testForbidsAddingTooManyProperties(token, amount);
  });
});

describe('ReFungible token properties permissions tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      const donor = await privateKey({filename: __filename});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  async function prepare(helper: UniqueHelper): Promise<UniqueRFToken> {
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

  itSub('Forbids mutating token property with tokenOwner==true when signer doesn\'t have all pieces', async ({helper}) =>  {
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
