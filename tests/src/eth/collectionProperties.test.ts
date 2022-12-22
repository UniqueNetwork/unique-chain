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

import {itEth, usingEthPlaygrounds, expect} from './util';
import {Pallets} from '../util';
import {IProperty, ITokenPropertyPermission} from '../util/playgrounds/types';
import {IKeyringPair} from '@polkadot/types/types';

describe('EVM collection properties', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice] = await _helper.arrange.createAccounts([50n], donor);
    });
  });

  // Soft-deprecated: setCollectionProperty
  [
    {method: 'setCollectionProperties', mode: 'nft' as const, methodParams: [[{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}]], expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}]}, 
    {method: 'setCollectionProperties', mode: 'rft' as const, methodParams: [[{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}]], expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}]}, 
    {method: 'setCollectionProperties', mode: 'ft' as const, methodParams: [[{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}]], expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}]}, 
    {method: 'setCollectionProperty', mode: 'nft' as const, methodParams: ['testKey', Buffer.from('testValue')], expectedProps: [{key: 'testKey', value: 'testValue'}]},
  ].map(testCase => 
    itEth.ifWithPallets(`Collection properties can be set: ${testCase.method}() for ${testCase.mode}`, testCase.mode === 'rft' ? [Pallets.ReFungible] : [], async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper[testCase.mode].mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: []});
      await collection.addAdmin(alice, {Ethereum: caller});
      
      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const collectionEvm = helper.ethNativeContract.collection(address, 'nft', caller, testCase.method === 'setCollectionProperty');

      // collectionProperties returns an empty array if no properties: 
      expect(await collectionEvm.methods.collectionProperties([]).call()).to.be.like([]);
      expect(await collectionEvm.methods.collectionProperties(['NonExistingKey']).call()).to.be.like([]);

      await collectionEvm.methods[testCase.method](...testCase.methodParams).send({from: caller});

      const raw = (await collection.getData())?.raw;
      expect(raw.properties).to.deep.equal(testCase.expectedProps);

      // collectionProperties returns properties: 
      expect(await collectionEvm.methods.collectionProperties([]).call()).to.be.like(testCase.expectedProps.map(prop => helper.ethProperty.property(prop.key, prop.value)));
    }));

  itEth('Cannot set invalid properties', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: []});
    await collection.addAdmin(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    await expect(contract.methods.setCollectionProperties([{key: '', value: Buffer.from('val1')}]).send({from: caller})).to.be.rejected;
    await expect(contract.methods.setCollectionProperties([{key: 'déjà vu', value: Buffer.from('hmm...')}]).send({from: caller})).to.be.rejected;
    await expect(contract.methods.setCollectionProperties([{key: 'a'.repeat(257), value: Buffer.from('val3')}]).send({from: caller})).to.be.rejected;
    // TODO add more expects
    const raw = (await collection.getData())?.raw;
    expect(raw.properties).to.deep.equal([]);
  });


  // Soft-deprecated: deleteCollectionProperty
  [
    {method: 'deleteCollectionProperties', mode: 'nft' as const, methodParams: [['testKey1', 'testKey2']], expectedProps: [{key: 'testKey3', value: 'testValue3'}]},
    {method: 'deleteCollectionProperties', mode: 'rft' as const, methodParams: [['testKey1', 'testKey2']], expectedProps: [{key: 'testKey3', value: 'testValue3'}]},
    {method: 'deleteCollectionProperties', mode: 'ft' as const, methodParams: [['testKey1', 'testKey2']], expectedProps: [{key: 'testKey3', value: 'testValue3'}]},
    {method: 'deleteCollectionProperty', mode: 'nft' as const, methodParams: ['testKey1'], expectedProps: [{key: 'testKey2', value: 'testValue2'}, {key: 'testKey3', value: 'testValue3'}]}, 
  ].map(testCase => 
    itEth(`Collection properties can be deleted: ${testCase.method}() for ${testCase.mode}`, async({helper}) => {
      const properties = [
        {key: 'testKey1', value: 'testValue1'},
        {key: 'testKey2', value: 'testValue2'},
        {key: 'testKey3', value: 'testValue3'}];
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper[testCase.mode].mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties});
  
      await collection.addAdmin(alice, {Ethereum: caller});
  
      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = helper.ethNativeContract.collection(address, 'nft', caller, testCase.method === 'deleteCollectionProperty');
  
      await contract.methods[testCase.method](...testCase.methodParams).send({from: caller});
  
      const raw = (await collection.getData())?.raw;
  
      expect(raw.properties.length).to.equal(testCase.expectedProps.length);
      expect(raw.properties).to.deep.equal(testCase.expectedProps);
    }));

  
  [
    {method: 'deleteCollectionProperties', methodParams: [['testKey2']]},
    {method: 'deleteCollectionProperty', methodParams: ['testKey2']},
  ].map(testCase => 
    itEth(`cannot ${testCase.method}() of non-owned collections`, async ({helper}) => {
      const properties = [
        {key: 'testKey1', value: 'testValue1'},
        {key: 'testKey2', value: 'testValue2'},
      ];
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const collectionEvm = helper.ethNativeContract.collection(address, 'nft', caller, testCase.method === 'deleteCollectionProperty');

      await expect(collectionEvm.methods[testCase.method](...testCase.methodParams).send({from: caller})).to.be.rejected;
      expect(await collection.getProperties()).to.deep.eq(properties);
    }));

  itEth('Can be read', async({helper}) => {
    const caller = helper.eth.createAccount();
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: [{key: 'testKey', value: 'testValue'}]});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const value = await contract.methods.collectionProperty('testKey').call();
    expect(value).to.equal(helper.getWeb3().utils.toHex('testValue'));
  });
});

describe('Supports ERC721Metadata', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  [
    {case: 'nft' as const},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase => 
    itEth.ifWithPallets(`ERC721Metadata property can be set for ${testCase.case} collection`, testCase.requiredPallets || [], async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const bruh = await helper.eth.createAccountWithBalance(donor);
  
      const BASE_URI = 'base/';
      const SUFFIX = 'suffix1';
      const URI = 'uri1';
  
      const collectionHelpers = helper.ethNativeContract.collectionHelpers(caller);
      const creatorMethod = testCase.case === 'rft' ? 'createRFTCollection' : 'createNFTCollection';
  
      const {collectionId, collectionAddress} = await helper.eth[creatorMethod](caller, 'n', 'd', 'p');
      const bruhCross = helper.ethCrossAccount.fromAddress(bruh);
  
      const contract = helper.ethNativeContract.collectionById(collectionId, testCase.case, caller);
      await contract.methods.addCollectionAdminCross(bruhCross).send(); // to check that admin will work too
  
      const collection1 = helper.nft.getCollectionObject(collectionId);
      const data1 = await collection1.getData();
      expect(data1?.raw.flags.erc721metadata).to.be.false;
      expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.false;
  
      await collectionHelpers.methods.makeCollectionERC721MetadataCompatible(collectionAddress, BASE_URI)
        .send({from: bruh});
  
      expect(await contract.methods.supportsInterface('0x5b5e139f').call()).to.be.true;
  
      const collection2 = helper.nft.getCollectionObject(collectionId);
      const data2 = await collection2.getData();
      expect(data2?.raw.flags.erc721metadata).to.be.true;
  
      const propertyPermissions = data2?.raw.tokenPropertyPermissions;
      expect(propertyPermissions?.length).to.equal(2);
  
      expect(propertyPermissions.find((tpp: ITokenPropertyPermission) => {
        return tpp.key === 'URI' && tpp.permission.mutable && tpp.permission.collectionAdmin && !tpp.permission.tokenOwner;
      })).to.be.not.null;
  
      expect(propertyPermissions.find((tpp: ITokenPropertyPermission) => {
        return tpp.key === 'URISuffix' && tpp.permission.mutable && tpp.permission.collectionAdmin && !tpp.permission.tokenOwner;
      })).to.be.not.null;
  
      expect(data2?.raw.properties?.find((property: IProperty) => {
        return property.key === 'baseURI' && property.value === BASE_URI;
      })).to.be.not.null;
  
      const token1Result = await contract.methods.mint(bruh).send();
      const tokenId1 = token1Result.events.Transfer.returnValues.tokenId;
  
      expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(BASE_URI);
  
      await contract.methods.setProperties(tokenId1, [{key: 'URISuffix', value: Buffer.from(SUFFIX)}]).send();
      expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(BASE_URI + SUFFIX);
  
      await contract.methods.setProperties(tokenId1, [{key: 'URI', value: Buffer.from(URI)}]).send();
      expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(URI);
  
      await contract.methods.deleteProperties(tokenId1, ['URI']).send();
      expect(await contract.methods.tokenURI(tokenId1).call()).to.equal(BASE_URI + SUFFIX);
  
      const token2Result = await contract.methods.mintWithTokenURI(bruh, URI).send();
      const tokenId2 = token2Result.events.Transfer.returnValues.tokenId;
  
      expect(await contract.methods.tokenURI(tokenId2).call()).to.equal(URI);
  
      await contract.methods.deleteProperties(tokenId2, ['URI']).send();
      expect(await contract.methods.tokenURI(tokenId2).call()).to.equal(BASE_URI);
  
      await contract.methods.setProperties(tokenId2, [{key: 'URISuffix', value: Buffer.from(SUFFIX)}]).send();
      expect(await contract.methods.tokenURI(tokenId2).call()).to.equal(BASE_URI + SUFFIX);
    }));
});

describe('EVM collection property', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  [
    {case: 'nft' as const},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {case: 'ft' as const},
  ].map(testCase => 
    itEth.ifWithPallets(`can set/read properties ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
      const collection = await helper[testCase.case].mintCollection(donor, {name: 'A', description: 'B', tokenPrefix: 'C'});

      const sender = await helper.eth.createAccountWithBalance(donor, 100n);
      await collection.addAdmin(donor, {Ethereum: sender});
  
      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = helper.ethNativeContract.collection(collectionAddress, testCase.case, sender);
  
      const keys = ['key0', 'key1'];
  
      const writeProperties = [
        helper.ethProperty.property(keys[0], 'value0'),
        helper.ethProperty.property(keys[1], 'value1'),
      ];
  
      await contract.methods.setCollectionProperties(writeProperties).send();
      const readProperties = await contract.methods.collectionProperties([keys[0], keys[1]]).call();
      expect(readProperties).to.be.like(writeProperties);
    }));

  [
    {case: 'nft' as const},
    {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {case: 'ft' as const},
  ].map(testCase => 
    itEth.ifWithPallets(`can delete properties ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
      const collection = await helper[testCase.case].mintCollection(donor, {name: 'A', description: 'B', tokenPrefix: 'C'});

      const sender = await helper.eth.createAccountWithBalance(donor, 100n);
      await collection.addAdmin(donor, {Ethereum: sender});
  
      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = helper.ethNativeContract.collection(collectionAddress, testCase.case, sender);
  
      const keys = ['key0', 'key1', 'key2', 'key3'];
  
      {
        const writeProperties = [
          helper.ethProperty.property(keys[0], 'value0'),
          helper.ethProperty.property(keys[1], 'value1'),
          helper.ethProperty.property(keys[2], 'value2'),
          helper.ethProperty.property(keys[3], 'value3'),
        ];
  
        await contract.methods.setCollectionProperties(writeProperties).send();
        const readProperties = await contract.methods.collectionProperties([keys[0], keys[1], keys[2], keys[3]]).call();
        expect(readProperties).to.be.like(writeProperties);
      }
  
      {
        const expectedProperties = [
          helper.ethProperty.property(keys[0], 'value0'),
          helper.ethProperty.property(keys[1], 'value1'),
        ];
  
        await contract.methods.deleteCollectionProperties([keys[2], keys[3]]).send();
        const readProperties = await contract.methods.collectionProperties([]).call();
        expect(readProperties).to.be.like(expectedProperties);
      }
    }));
});
