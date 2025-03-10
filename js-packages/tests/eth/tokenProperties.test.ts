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
import {Contract} from 'ethers';
import {itEth, usingEthPlaygrounds, expect, waitParams, hexlifyString} from '@unique/test-utils/eth/util.js';
import type {ITokenPropertyPermission} from '@unique-nft/playgrounds/types.js';
import {Pallets} from '@unique/test-utils/util.js';
import {UniqueNFTCollection, UniqueNFToken, UniqueRFTCollection} from '@unique-nft/playgrounds/unique.js';
import {CreateCollectionData, TokenPermissionField} from '@unique/test-utils/eth/types.js';
import {HDNodeWallet} from 'ethers';
import {Result} from 'ethers';

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

      const caller = await helper.eth.createAccountWithBalance(donor);
      const crossCaller = helper.ethCrossAccount.fromAddress(caller);

      for(const [mutable,collectionAdmin, tokenOwner] of cartesian([], [false, true], [false, true], [false, true])) {
        const {collectionId, collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
        const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

        await (await collection.addCollectionAdminCross.send(crossCaller)).wait(...waitParams);
        const callerCollection = helper.eth.changeContractCaller(collection, caller);

        await (
          await callerCollection.setTokenPropertyPermissions.send([[
            'testKey',
            [
              [TokenPermissionField.Mutable, mutable],
              [TokenPermissionField.TokenOwner, tokenOwner],
              [TokenPermissionField.CollectionAdmin, collectionAdmin],
            ],
          ]])
        ).wait(...waitParams);

        const subPermissions = await helper[testCase.mode].getPropertyPermissions(collectionId);
        expect(subPermissions).to.be.deep.equal([{
          key: 'testKey',
          permission: {mutable, collectionAdmin, tokenOwner},
        }]);

        const ethPermissions = await callerCollection.tokenPropertyPermissions.staticCall();
        expect(ethPermissions.toArray(/* deep */ true)).to.be.deep.equal([
          ['testKey', [
            [BigInt(TokenPermissionField.Mutable), mutable],
            [BigInt(TokenPermissionField.TokenOwner), tokenOwner],
            [BigInt(TokenPermissionField.CollectionAdmin), collectionAdmin]],
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

      await (
        await collection.setTokenPropertyPermissions.send([
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
        ])
      ).wait(...waitParams);

      const subPermissions = await helper[testCase.mode].getPropertyPermissions(collectionId);
      expect(subPermissions).to.be.deep.equal([
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

      const ethPermissions = await collection.tokenPropertyPermissions.staticCall();
      expect(ethPermissions.toArray(/* deep */ true)).to.be.deep.equal([
        ['testKey_0', [
          [BigInt(TokenPermissionField.Mutable), true],
          [BigInt(TokenPermissionField.TokenOwner), true],
          [BigInt(TokenPermissionField.CollectionAdmin), true]],
        ],
        ['testKey_1', [
          [BigInt(TokenPermissionField.Mutable), true],
          [BigInt(TokenPermissionField.TokenOwner), false],
          [BigInt(TokenPermissionField.CollectionAdmin), true]],
        ],
        ['testKey_2', [
          [BigInt(TokenPermissionField.Mutable), false],
          [BigInt(TokenPermissionField.TokenOwner), true],
          [BigInt(TokenPermissionField.CollectionAdmin), false]],
        ],
      ]);
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Can set multiple token property permissions as admin`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const caller = await await helper.eth.createAccountWithBalance(donor);
      const callerCross = await await helper.ethCrossAccount.fromAddress(caller);

      const {collectionId, collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      await (await collection.addCollectionAdminCross.send(callerCross)).wait(...waitParams);
      const callerCollection = helper.eth.changeContractCaller(collection, caller);

      await (
        await callerCollection.setTokenPropertyPermissions.send([
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
        ])
      ).wait(...waitParams);

      const subPermissions = await helper[testCase.mode].getPropertyPermissions(collectionId);
      expect(subPermissions).to.be.deep.equal([
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

      const ethPermissions = await callerCollection.tokenPropertyPermissions.staticCall();
      expect(ethPermissions.toArray(/* deep */ true)).to.be.deep.equal([
        ['testKey_0', [
          [BigInt(TokenPermissionField.Mutable), true],
          [BigInt(TokenPermissionField.TokenOwner), true],
          [BigInt(TokenPermissionField.CollectionAdmin), true]],
        ],
        ['testKey_1', [
          [BigInt(TokenPermissionField.Mutable), true],
          [BigInt(TokenPermissionField.TokenOwner), false],
          [BigInt(TokenPermissionField.CollectionAdmin), true]],
        ],
        ['testKey_2', [
          [BigInt(TokenPermissionField.Mutable), false],
          [BigInt(TokenPermissionField.TokenOwner), true],
          [BigInt(TokenPermissionField.CollectionAdmin), false]],
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

      await collection.addAdmin(alice, {Ethereum: caller.address});
      const token = await collection.mintToken(alice);

      const collectionEvm = await helper.ethNativeContract.collectionById(collection.collectionId, 'nft', caller, testCase.method === 'setProperty');
      const callerCollectionEvm = helper.eth.changeContractCaller(collectionEvm, caller);

      await (
        await callerCollectionEvm[testCase.method].send(token.tokenId, ...testCase.methodParams)
      ).wait(...waitParams);

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
      const permissions: ITokenPropertyPermission[] = properties.map(p => ({
        key: p.key,
        permission: {tokenOwner: true, collectionAdmin: true, mutable: true},
      }));

      const collection = await helper[testCase.mode].mintCollection(alice, {
        tokenPrefix: 'ethp',
        tokenPropertyPermissions: permissions,
      }) as UniqueNFTCollection | UniqueRFTCollection;

      const token = await collection.mintToken(alice);

      const valuesBefore = await token.getProperties(properties.map(p => p.key));
      expect(valuesBefore).to.be.deep.equal([]);

      await collection.addAdmin(alice, {Ethereum: caller.address});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      expect(await contract.properties.staticCall(token.tokenId, [])).to.be.deep.equal([]);

      await (
        await contract.setProperties.send(token.tokenId, properties)
      ).wait(...waitParams);

      const values = await token.getProperties(properties.map(p => p.key));
      expect(values).to.be.deep.equal(properties.map(p => ({key: p.key, value: p.value.toString()})));

      expect(await contract.properties.staticCall(token.tokenId, [])).to.be.like(properties
        .map(p => helper.ethProperty.property(p.key, p.value.toString())));

      expect(await contract.properties.staticCall(token.tokenId, [properties[0].key]))
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

      await collection.addAdmin(alice, {Ethereum: caller.address});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      await (
        await contract.deleteProperties.send(token.tokenId, ['testKey', 'testKey_1'])
      ).wait(...waitParams);

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

    const value = await contract.property.staticCall(token.tokenId, 'testKey');
    expect(value).to.equal(hexlifyString('testValue'));
  });
});

describe('EVM token properties negative', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let caller: HDNodeWallet;
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
      collectionEvm = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(aliceCollection.collectionId),
        'nft',
        caller,
        /* mergeDeprecated */ true,
      );

      // Caller not an owner and not an admin, so he cannot set properties:
      await expect(collectionEvm[testCase.method].staticCall(token.tokenId, ...testCase.methodParams)).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm[testCase.method].send(token.tokenId, ...testCase.methodParams)).to.be.rejected;

      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.properties.staticCall(token.tokenId, []);
      expect(actualProps).to.deep.eq(expectedProps);
    }));

  [
    {method: 'setProperty', methodParams: ['testKey_3', Buffer.from('testValue3')]},
    {method: 'setProperties', methodParams: [[{key: 'testKey_3', value: Buffer.from('testValue3')}]]},
  ].map(testCase =>
    itEth(`[${testCase.method}] Cannot set non-existing properties`, async ({helper}) => {
      caller = await helper.eth.createAccountWithBalance(donor);
      collectionEvm = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(aliceCollection.collectionId),
        'nft',
        caller,
        /* mergeDeprecated */ true,
      );

      await helper.collection.addAdmin(alice, aliceCollection.collectionId, {Ethereum: caller.address});

      await expect(collectionEvm[testCase.method].staticCall(token.tokenId, ...testCase.methodParams)).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm[testCase.method].send(token.tokenId, ...testCase.methodParams)).to.be.rejected;

      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.properties.staticCall(token.tokenId, []);
      expect(actualProps).to.deep.eq(expectedProps);
    }));

  [
    {method: 'deleteProperty', methodParams: ['testKey_2']},
    {method: 'deleteProperties', methodParams: [['testKey_2']]},
  ].map(testCase =>
    itEth(`[${testCase.method}] Cannot delete properties of non-owned collection`, async ({helper}) => {
      caller = await helper.eth.createAccountWithBalance(donor);
      collectionEvm = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(aliceCollection.collectionId),
        'nft',
        caller,
        /* mergeDeprecated */ testCase.method == 'deleteProperty',
      );

      // Caller not an owner and not an admin, so he cannot set properties:
      await expect(collectionEvm[testCase.method].staticCall(token.tokenId, ...testCase.methodParams)).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm[testCase.method].send(token.tokenId, ...testCase.methodParams)).to.be.rejected;

      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.properties.staticCall(token.tokenId, []);
      expect(actualProps).to.deep.eq(expectedProps);
    }));

  [
    {method: 'deleteProperty', methodParams: ['testKey_3']},
    {method: 'deleteProperties', methodParams: [['testKey_3']]},
  ].map(testCase =>
    itEth(`[${testCase.method}] Cannot delete non-existing properties`, async ({helper}) => {
      caller = await helper.eth.createAccountWithBalance(donor);
      collectionEvm = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(aliceCollection.collectionId),
        'nft',
        caller,
        /* mergeDeprecated */ testCase.method == 'deleteProperty',
      );

      await helper.collection.addAdmin(alice, aliceCollection.collectionId, {Ethereum: caller.address});

      // Caller cannot delete non-existing properties:
      await expect(collectionEvm[testCase.method].staticCall(token.tokenId, ...testCase.methodParams)).to.be.rejectedWith('NoPermission');
      await expect(collectionEvm[testCase.method].send(token.tokenId, ...testCase.methodParams)).to.be.rejected;

      // Props have not changed:
      const expectedProps = tokenProps.map(p => helper.ethProperty.property(p.key, p.value.toString()));
      const actualProps = await collectionEvm.properties.staticCall(token.tokenId, []);
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

      await expect(helper.eth.changeContractCaller(collection, caller).setTokenPropertyPermissions.staticCall([['testKey_0', [
        [TokenPermissionField.Mutable, true],
        [TokenPermissionField.TokenOwner, true],
        [TokenPermissionField.CollectionAdmin, true]],
      ]])).to.be.rejectedWith('NoPermission');
    }));

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase =>
    itEth.ifWithPallets(`[${testCase.mode}] Cannot set token property permissions with invalid character`, testCase.requiredPallets, async({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      await expect(collection.setTokenPropertyPermissions.staticCall([
        // "Space" is invalid character
        ['testKey 0', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
      ])).to.be.rejectedWith('InvalidCharacterInPropertyKey');
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
      await (
        await collection.setTokenPropertyPermissions.send([
          ['testKey', [
            [TokenPermissionField.Mutable, true],
            [TokenPermissionField.TokenOwner, true],
            [TokenPermissionField.CollectionAdmin, true]],
          ],
        ])
      ).wait(...waitParams);

      // 2. Owner can set stricter property-permissions:
      for(const values of [[true, true, false], [true, false, false], [false, false, false]]) {
        await (
          await collection.setTokenPropertyPermissions.send([
            ['testKey', [
              [TokenPermissionField.Mutable, values[0]],
              [TokenPermissionField.TokenOwner, values[1]],
              [TokenPermissionField.CollectionAdmin, values[2]]],
            ],
          ])
        ).wait(...waitParams);
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
      await (
        await collection.setTokenPropertyPermissions.send([
          ['testKey', [
            [TokenPermissionField.Mutable, false],
            [TokenPermissionField.TokenOwner, false],
            [TokenPermissionField.CollectionAdmin, false]],
          ],
        ])
      ).wait(...waitParams);

      // 2. Owner cannot set less strict property-permissions:
      for(const values of [[true, false, false], [false, true, false], [false, false, true]]) {
        await expect(collection.setTokenPropertyPermissions.staticCall([
          ['testKey', [
            [TokenPermissionField.Mutable, values[0]],
            [TokenPermissionField.TokenOwner, values[1]],
            [TokenPermissionField.CollectionAdmin, values[2]]],
          ],
        ])).to.be.rejectedWith('NoPermission');
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

      await collection.addAdmin(alice, {Ethereum: caller.address});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      await expect(contract.setProperties.staticCall(1, properties)).to.be.rejectedWith('TokenNotFound');
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

      await collection.addAdmin(alice, {Ethereum: caller.address});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, testCase.mode, caller);

      await expect(contract.deleteProperties.staticCall(1, ['testKey', 'testKey_1'])).to.be.rejectedWith('TokenNotFound');
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
