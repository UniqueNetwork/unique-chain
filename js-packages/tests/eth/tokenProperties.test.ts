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

import type {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';
import {itEth, usingEthPlaygrounds, expect} from './util/index.js';
import type {ITokenPropertyPermission} from '@unique-nft/playgrounds/types.js';
import {Pallets} from '@unique/test-utils/util.js';
import {UniqueNFTCollection, UniqueNFToken, UniqueRFTCollection} from '@unique-nft/playgrounds/unique.js';
import {CreateCollectionData, TokenPermissionField} from './util/playgrounds/types.js';

describe('EVM token properties', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([1000n], donor);
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Can set all possible token property permissions`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const caller = await helper.ethCrossAccount.createAccountWithBalance(donor);
      for(const [mutable,collectionAdmin, tokenOwner] of cartesian([], [false, true], [false, true], [false, true])) {
        const {collectionId, collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
        const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);
        await collection.methods.addCollectionAdminCross(caller).send({from: owner});

        await collection.methods.setTokenPropertyPermissions([
          ['testKey', [
            [TokenPermissionField.Mutable, mutable],
            [TokenPermissionField.TokenOwner, tokenOwner],
            [TokenPermissionField.CollectionAdmin, collectionAdmin]],
          ],
        ]).send({from: caller.eth});

        expect(await helper[testCase.mode].getPropertyPermissions(collectionId)).to.be.deep.equal([{
          key: 'testKey',
          permission: {mutable, collectionAdmin, tokenOwner},
        }]);

        expect(await collection.methods.tokenPropertyPermissions().call({from: caller.eth})).to.be.like([
          ['testKey', [
            [TokenPermissionField.Mutable.toString(), mutable],
            [TokenPermissionField.TokenOwner.toString(), tokenOwner],
            [TokenPermissionField.CollectionAdmin.toString(), collectionAdmin]],
          ],
        ]);
      }
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Can set multiple token property permissions as owner`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionId, collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      await collection.methods.setTokenPropertyPermissions([
        ['testKey_0', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
        ['testKey_1', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, false],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
        ['testKey_2', [
          [TokenPermissionField.Mutable, false],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, false]],
        ],
      ]).send({from: owner});

      expect(await helper[testCase.mode].getPropertyPermissions(collectionId)).to.be.deep.equal([
        {
          key: 'testKey_0',
          permission: {mutable: true, tokenOwner: true, collectionAdmin: true},
        },
        {
          key: 'testKey_1',
          permission: {mutable: true, tokenOwner: false, collectionAdmin: true},
        },
        {
          key: 'testKey_2',
          permission: {mutable: false, tokenOwner: true, collectionAdmin: false},
        },
      ]);

      expect(await collection.methods.tokenPropertyPermissions().call({from: owner})).to.be.like([
        ['testKey_0', [
          [TokenPermissionField.Mutable.toString(), true],
          [TokenPermissionField.TokenOwner.toString(), true],
          [TokenPermissionField.CollectionAdmin.toString(), true]],
        ],
        ['testKey_1', [
          [TokenPermissionField.Mutable.toString(), true],
          [TokenPermissionField.TokenOwner.toString(), false],
          [TokenPermissionField.CollectionAdmin.toString(), true]],
        ],
        ['testKey_2', [
          [TokenPermissionField.Mutable.toString(), false],
          [TokenPermissionField.TokenOwner.toString(), true],
          [TokenPermissionField.CollectionAdmin.toString(), false]],
        ],
      ]);
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Can set multiple token property permissions as admin`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const caller = await helper.ethCrossAccount.createAccountWithBalance(donor);

      const {collectionId, collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);
      await collection.methods.addCollectionAdminCross(caller).send({from: owner});

      await collection.methods.setTokenPropertyPermissions([
        ['testKey_0', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
        ['testKey_1', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, false],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
        ['testKey_2', [
          [TokenPermissionField.Mutable, false],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, false]],
        ],
      ]).send({from: caller.eth});

      expect(await helper[testCase.mode].getPropertyPermissions(collectionId)).to.be.deep.equal([
        {
          key: 'testKey_0',
          permission: {mutable: true, tokenOwner: true, collectionAdmin: true},
        },
        {
          key: 'testKey_1',
          permission: {mutable: true, tokenOwner: false, collectionAdmin: true},
        },
        {
          key: 'testKey_2',
          permission: {mutable: false, tokenOwner: true, collectionAdmin: false},
        },
      ]);

      expect(await collection.methods.tokenPropertyPermissions().call({from: caller.eth})).to.be.like([
        ['testKey_0', [
          [TokenPermissionField.Mutable.toString(), true],
          [TokenPermissionField.TokenOwner.toString(), true],
          [TokenPermissionField.CollectionAdmin.toString(), true]],
        ],
        ['testKey_1', [
          [TokenPermissionField.Mutable.toString(), true],
          [TokenPermissionField.TokenOwner.toString(), false],
          [TokenPermissionField.CollectionAdmin.toString(), true]],
        ],
        ['testKey_2', [
          [TokenPermissionField.Mutable.toString(), false],
          [TokenPermissionField.TokenOwner.toString(), true],
          [TokenPermissionField.CollectionAdmin.toString(), false]],
        ],
      ]);

    }));

  [
    {
      method: 'setProperties',
      methodParams: [[{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}]],
      expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}],
    },
    {
      method: 'setProperty' /*Soft-deprecated*/,
      methodParams: ['testKey1', Buffer.from('testValue1')],
      expectedProps: [{key: 'testKey1', value: 'testValue1'}],
    },
  ].map(testCase =>
    itEth(`[${testCase.method}] Can be set`, async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper.nft.mintCollection(alice, {
        tokenPropertyPermissions: [{
          key: 'testKey1',
          permission: {
            collectionAdmin: true,
          },
        }, {
          key: 'testKey2',
          permission: {
            collectionAdmin: true,
          },
        }],
      });

      await collection.addAdmin(alice, {Ethereum: caller});
      const token = await collection.mintToken(alice);

      const collectionEvm = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller, testCase.method === 'setProperty');

      await collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).send({from: caller});

      const properties = await token.getProperties();
      expect(properties).to.deep.equal(testCase.expectedProps);
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`Can be multiple set/read for ${testCase.mode}`, testCase.requiredPallets, async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);

      const properties = Array(5).fill(0).map((_, i) => ({key: `key_${i}`, value: Buffer.from(`value_${i}`)}));
      const permissions: ITokenPropertyPermission[] = properties.map(p => ({key: p.key, permission: {tokenOwner: true,
        collectionAdmin: true,
        mutable: true}}));

      const collection = await helper[testCase.mode].mintCollection(alice, {
        tokenPrefix: 'ethp',
        tokenPropertyPermissions: permissions,
      }) as UniqueNFTCollection | UniqueRFTCollection;

      const token = await collection.mintToken(alice);

      const valuesBefore = await token.getProperties(properties.map(p => p.key));
      expect(valuesBefore).to.be.deep.equal([]);


      await collection.addAdmin(alice, {Ethereum: caller});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      expect(await contract.methods.properties(token.tokenId, []).call()).to.be.deep.equal([]);

      await contract.methods.setProperties(token.tokenId, properties).send({from: caller});

      const values = await token.getProperties(properties.map(p => p.key));
      expect(values).to.be.deep.equal(properties.map(p => ({key: p.key, value: p.value.toString()})));

      expect(await contract.methods.properties(token.tokenId, []).call()).to.be.like(properties
        .map(p => helper.ethProperty.property(p.key, p.value.toString())));

      expect(await contract.methods.properties(token.tokenId, [properties[0].key]).call())
        .to.be.like([helper.ethProperty.property(properties[0].key, properties[0].value.toString())]);
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`Can be deleted for ${testCase.mode}`, testCase.requiredPallets, async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper[testCase.mode].mintCollection(alice, {
        tokenPropertyPermissions: [{
          key: 'testKey',
          permission: {
            mutable: true,
            collectionAdmin: true,
          },
        },
        {
          key: 'testKey_1',
          permission: {
            mutable: true,
            collectionAdmin: true,
          },
        }],
      });

      const token = await collection.mintToken(alice);
      await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}, {key: 'testKey_1', value: 'testValue_1'}]);
      expect(await token.getProperties()).to.has.length(2);

      await collection.addAdmin(alice, {Ethereum: caller});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      await contract.methods.deleteProperties(token.tokenId, ['testKey', 'testKey_1']).send({from: caller});

      const result = await token.getProperties(['testKey', 'testKey_1']);
      expect(result.length).to.equal(0);
    }));

  itEth('Can be read', async({helper}) => {
    const caller = helper.eth.createAccount();
    const collection = await helper.nft.mintCollection(alice, {
      tokenPropertyPermissions: [{
        key: 'testKey',
        permission: {
          collectionAdmin: true,
        },
      }],
    });

    const token = await collection.mintToken(alice);
    await token.setProperties(alice, [{key: 'testKey', value: 'testValue'}]);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', caller);

    const value = await contract.methods.property(token.tokenId, 'testKey').call();
    expect(value).to.equal(helper.getWeb3().utils.toHex('testValue'));
  });
});

describe('EVM token properties negative', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let caller: string;
  let aliceCollection: UniqueNFTCollection;
  let token: UniqueNFToken;
  const tokenProps = [{key: 'testKey_1', value: 'testValue_1'}, {key: 'testKey_2', value: 'testValue_2'}];
  let collectionEvm: Contract;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  beforeEach(async () => {
    // 1. create collection with props: testKey_1, testKey_2
    // 2. create token and set props testKey_1, testKey_2
    await usingEthPlaygrounds(async (helper) => {
      aliceCollection = await helper.nft.mintCollection(alice, {
        tokenPropertyPermissions: [{
          key: 'testKey_1',
          permission: {
            mutable: true,
            collectionAdmin: true,
          },
        },
        {
          key: 'testKey_2',
          permission: {
            mutable: true,
            collectionAdmin: true,
          },
        }],
      });
      token = await aliceCollection.mintToken(alice);
      await token.setProperties(alice, tokenProps);
      collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(aliceCollection.collectionId), 'nft', caller, true);
    });
  });

  [
    {method: 'setProperty', methodParams: [tokenProps[1].key, Buffer.from('newValue')]},
    {method: 'setProperties', methodParams: [[{key: tokenProps[1].key, value: Buffer.from('newValue')}]]},
  ].map(testCase =>
    itEth(`[${testCase.method}] Cannot set properties of non-owned collection`, async ({helper}) => {
      caller = await helper.eth.createAccountWithBalance(donor);
      collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(aliceCollection.collectionId), 'nft', caller, true);
      // Caller not an owner and not an admin, so he cannot set properties:
      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).call({from: caller})).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).send({from: caller})).to.be.rejected;

      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.methods.properties(token.tokenId, []).call();
      expect(actualProps).to.deep.eq(expectedProps);
    }));

  [
    {method: 'setProperty', methodParams: ['testKey_3', Buffer.from('testValue3')]},
    {method: 'setProperties', methodParams: [[{key: 'testKey_3', value: Buffer.from('testValue3')}]]},
  ].map(testCase =>
    itEth(`[${testCase.method}] Cannot set non-existing properties`, async ({helper}) => {
      caller = await helper.eth.createAccountWithBalance(donor);
      collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(aliceCollection.collectionId), 'nft', caller, true);
      await helper.collection.addAdmin(alice, aliceCollection.collectionId, {Ethereum: caller});

      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).call({from: caller})).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).send({from: caller})).to.be.rejected;

      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.methods.properties(token.tokenId, []).call();
      expect(actualProps).to.deep.eq(expectedProps);
    }));

  [
    {method: 'deleteProperty', methodParams: ['testKey_2']},
    {method: 'deleteProperties', methodParams: [['testKey_2']]},
  ].map(testCase =>
    itEth(`[${testCase.method}] Cannot delete properties of non-owned collection`, async ({helper}) => {
      caller = await helper.eth.createAccountWithBalance(donor);
      collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(aliceCollection.collectionId), 'nft', caller, testCase.method == 'deleteProperty');
      // Caller not an owner and not an admin, so he cannot set properties:
      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).call({from: caller})).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).send({from: caller})).to.be.rejected;

      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.methods.properties(token.tokenId, []).call();
      expect(actualProps).to.deep.eq(expectedProps);
    }));

  [
    {method: 'deleteProperty', methodParams: ['testKey_3']},
    {method: 'deleteProperties', methodParams: [['testKey_3']]},
  ].map(testCase =>
    itEth(`[${testCase.method}] Cannot delete non-existing properties`, async ({helper}) => {
      caller = await helper.eth.createAccountWithBalance(donor);
      collectionEvm = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(aliceCollection.collectionId), 'nft', caller, testCase.method == 'deleteProperty');
      await helper.collection.addAdmin(alice, aliceCollection.collectionId, {Ethereum: caller});
      // Caller cannot delete non-existing properties:
      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).call({from: caller})).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm.methods[testCase.method](token.tokenId, ...testCase.methodParams).send({from: caller})).to.be.rejected;
      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.methods.properties(token.tokenId, []).call();
      expect(actualProps).to.deep.eq(expectedProps);
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Cannot set token property permissions as non owner or admin`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const caller = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      await expect(collection.methods.setTokenPropertyPermissions([
        ['testKey_0', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
      ]).call({from: caller})).to.be.rejectedWith('NoPermission');
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Cannot set token property permissions with invalid character`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      await expect(collection.methods.setTokenPropertyPermissions([
        // "Space" is invalid character
        ['testKey 0', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
      ]).call({from: owner})).to.be.rejectedWith('InvalidCharacterInPropertyKey');
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Can reconfigure token property permissions to stricter ones`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      // 1. Owner sets strict property-permissions:
      await collection.methods.setTokenPropertyPermissions([
        ['testKey', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
      ]).send({from: owner});

      // 2. Owner can set stricter property-permissions:
      for(const values of [[true, true, false], [true, false, false], [false, false, false]]) {
        await collection.methods.setTokenPropertyPermissions([
          ['testKey', [
            [TokenPermissionField.Mutable, values[0]],
            [TokenPermissionField.TokenOwner, values[1]],
            [TokenPermissionField.CollectionAdmin, values[2]]],
          ],
        ]).send({from: owner});
      }

      expect(await helper[testCase.mode].getPropertyPermissions(collectionId)).to.be.deep.equal([{
        key: 'testKey',
        permission: {mutable: false, collectionAdmin: false, tokenOwner: false},
      }]);
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Cannot reconfigure token property permissions to less strict ones`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      // 1. Owner sets strict property-permissions:
      await collection.methods.setTokenPropertyPermissions([
        ['testKey', [
          [TokenPermissionField.Mutable, false],
          [TokenPermissionField.TokenOwner, false],
          [TokenPermissionField.CollectionAdmin, false]],
        ],
      ]).send({from: owner});

      // 2. Owner cannot set less strict property-permissions:
      for(const values of [[true, false, false], [false, true, false], [false, false, true]]) {
        await expect(collection.methods.setTokenPropertyPermissions([
          ['testKey', [
            [TokenPermissionField.Mutable, values[0]],
            [TokenPermissionField.TokenOwner, values[1]],
            [TokenPermissionField.CollectionAdmin, values[2]]],
          ],
        ]).call({from: owner})).to.be.rejectedWith('NoPermission');
      }
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Can't be multiple set/read for non-existent token`, testCase.requiredPallets, async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);

      const properties = Array(5).fill(0).map((_, i) => ({key: `key_${i}`, value: Buffer.from(`value_${i}`)}));
      const permissions: ITokenPropertyPermission[] = properties.map(p => ({key: p.key, permission: {tokenOwner: true,
        collectionAdmin: true,
        mutable: true}}));

      const collection = await helper[testCase.mode].mintCollection(alice, {
        tokenPrefix: 'ethp',
        tokenPropertyPermissions: permissions,
      }) as UniqueNFTCollection | UniqueRFTCollection;

      await collection.addAdmin(alice, {Ethereum: caller});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      await expect(contract.methods.setProperties(1, properties).call({from: caller})).to.be.rejectedWith('TokenNotFound');
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Can't be deleted for non-existent token`, testCase.requiredPallets, async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper[testCase.mode].mintCollection(alice, {
        tokenPropertyPermissions: [{
          key: 'testKey',
          permission: {
            mutable: true,
            collectionAdmin: true,
          },
        },
        {
          key: 'testKey_1',
          permission: {
            mutable: true,
            collectionAdmin: true,
          },
        }],
      });


      await collection.addAdmin(alice, {Ethereum: caller});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      await expect(contract.methods.deleteProperties(1, ['testKey', 'testKey_1']).call({from: caller})).to.be.rejectedWith('TokenNotFound');
    }));
});


type ElementOf<A> = A extends readonly (infer T)[] ? T : never;
function* cartesian<T extends Array<Array<any>>, R extends Array<any>>(internalRest: [...R], ...args: [...T]): Generator<[...R, ...{[K in keyof T]: ElementOf<T[K]>}]> {
  if(args.length === 0) {
    yield internalRest as any;
    return;
  }
  for(const value of args[0]) {
    yield* cartesian([...internalRest, value], ...args.slice(1)) as any;
  }
}
