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

import {itEth, usingEthPlaygrounds, expect, waitParams, hexlifyString} from '@unique/test-utils/eth/util.js';
import {Pallets} from '@unique/test-utils/util.js';
import type {IProperty, ITokenPropertyPermission} from '@unique-nft/playgrounds/types.js';
import type {IKeyringPair} from '@polkadot/types/types';

describe('EVM collection properties', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
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
      await collection.addAdmin(alice, {Ethereum: caller.address});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(address, 'nft', caller, testCase.method === 'setCollectionProperty');

      // collectionProperties returns an empty array if no properties:
      expect(await collectionEvm.collectionProperties.staticCall([])).to.be.like([]);
      expect(await collectionEvm.collectionProperties.staticCall(['NonExistingKey'])).to.be.like([]);

      await (await collectionEvm[testCase.method].send(...testCase.methodParams, {from: caller})).wait(...waitParams);

      const raw = (await collection.getData())?.raw;
      expect(raw.properties).to.deep.equal(testCase.expectedProps);

      // collectionProperties returns properties:
      expect(await collectionEvm.collectionProperties.staticCall([])).to.be.like(testCase.expectedProps.map(prop => helper.ethProperty.property(prop.key, prop.value)));
    }));

  itEth('Cannot set invalid properties', async({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: []});
    await collection.addAdmin(alice, {Ethereum: caller.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', caller);

    await expect(contract.setCollectionProperties.send([{key: '', value: Buffer.from('val1')}], {from: caller})).to.be.rejected;
    await expect(contract.setCollectionProperties.send([{key: 'déjà vu', value: Buffer.from('hmm...')}], {from: caller})).to.be.rejected;
    await expect(contract.setCollectionProperties.send([{key: 'a'.repeat(257), value: Buffer.from('val3')}], {from: caller})).to.be.rejected;

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
    itEth.ifWithPallets(`Collection properties can be deleted: ${testCase.method}() for ${testCase.mode}`, testCase.mode === 'rft' ? [Pallets.ReFungible] : [], async({helper}) => {
      const properties = [
        {key: 'testKey1', value: 'testValue1'},
        {key: 'testKey2', value: 'testValue2'},
        {key: 'testKey3', value: 'testValue3'}];
      const caller = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper[testCase.mode].mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties});

      await collection.addAdmin(alice, {Ethereum: caller.address});

      const address = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(address, 'nft', caller, testCase.method === 'deleteCollectionProperty');

      await (await contract[testCase.method].send(...testCase.methodParams, {from: caller})).wait(...waitParams);

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
      const collectionEvm = await helper.ethNativeContract.collection(address, 'nft', caller, testCase.method === 'deleteCollectionProperty');

      await expect(collectionEvm[testCase.method].send(...testCase.methodParams, {from: caller})).to.be.rejected;
      expect(await collection.getProperties()).to.deep.eq(properties);
    }));

  itEth('Can be read', async({helper}) => {
    const caller = helper.eth.createAccount();
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'test', tokenPrefix: 'test', properties: [{key: 'testKey', value: 'testValue'}]});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'nft', caller);

    const value = await contract.collectionProperty.staticCall('testKey');
    expect(value).to.equal(hexlifyString('testValue'));
  });
});

describe('Supports ERC721Metadata', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
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

      const collectionHelpers = await helper.ethNativeContract.collectionHelpers(caller);
      const bruhCollectionHelpers = helper.eth.changeContractCaller(collectionHelpers, bruh);

      const creatorMethod = testCase.case === 'rft' ? 'createRFTCollection' : 'createNFTCollection';

      const {collectionId, collectionAddress} = await helper.eth[creatorMethod](caller, 'n', 'd', 'p');
      const bruhCross = helper.ethCrossAccount.fromAddress(bruh);

      const contract = await helper.ethNativeContract.collectionById(collectionId, testCase.case, caller);
      await (await contract.addCollectionAdminCross.send(bruhCross)).wait(...waitParams); // to check that admin will work too

      const collection1 = helper.nft.getCollectionObject(collectionId);
      const data1 = await collection1.getData();
      expect(data1?.raw.flags.erc721metadata).to.be.false;
      expect(await contract.supportsInterface.staticCall('0x5b5e139f')).to.be.false;

      await (
        await bruhCollectionHelpers.makeCollectionERC721MetadataCompatible.send(
          collectionAddress,
          BASE_URI,
        )
      ).wait(...waitParams);

      expect(await contract.supportsInterface.staticCall('0x5b5e139f')).to.be.true;

      const collection2 = helper.nft.getCollectionObject(collectionId);
      const data2 = await collection2.getData();
      expect(data2?.raw.flags.erc721metadata).to.be.true;

      const propertyPermissions = data2?.raw.tokenPropertyPermissions;
      expect(propertyPermissions?.length).to.equal(2);

      expect(propertyPermissions.find((tpp: ITokenPropertyPermission) => tpp.key === 'URI' && tpp.permission.mutable && tpp.permission.collectionAdmin && !tpp.permission.tokenOwner)).to.be.not.null;

      expect(propertyPermissions.find((tpp: ITokenPropertyPermission) => tpp.key === 'URISuffix' && tpp.permission.mutable && tpp.permission.collectionAdmin && !tpp.permission.tokenOwner)).to.be.not.null;

      expect(data2?.raw.properties?.find((property: IProperty) => property.key === 'baseURI' && property.value === BASE_URI)).to.be.not.null;

      const token1tx = await contract.mint.send(bruh);
      const token1Receipt = await token1tx.wait(...waitParams);
      const tokenId1 = helper.eth.normalizeEvents(token1Receipt!).Transfer.args.tokenId;

      expect(await contract.tokenURI.staticCall(tokenId1)).to.equal(BASE_URI);

      await (await contract.setProperties(tokenId1, [{key: 'URISuffix', value: Buffer.from(SUFFIX)}])).wait(...waitParams);
      expect(await contract.tokenURI.staticCall(tokenId1)).to.equal(BASE_URI + SUFFIX);

      await (await contract.setProperties(tokenId1, [{key: 'URI', value: Buffer.from(URI)}])).wait(...waitParams);
      expect(await contract.tokenURI.staticCall(tokenId1)).to.equal(URI);

      await (await contract.deleteProperties(tokenId1, ['URI'])).wait(...waitParams);
      expect(await contract.tokenURI.staticCall(tokenId1)).to.equal(BASE_URI + SUFFIX);

      const token2tx = await contract.mintWithTokenURI.send(bruh, URI);
      const token2Receipt = await token2tx.wait(...waitParams);
      const tokenId2 = helper.eth.normalizeEvents(token2Receipt!).Transfer.args.tokenId;

      expect(await contract.tokenURI.staticCall(tokenId2)).to.equal(URI);

      await (await contract.deleteProperties(tokenId2, ['URI'])).wait(...waitParams);
      expect(await contract.tokenURI.staticCall(tokenId2)).to.equal(BASE_URI);

      await (await contract.setProperties(tokenId2, [{key: 'URISuffix', value: Buffer.from(SUFFIX)}])).wait(...waitParams);
      expect(await contract.tokenURI.staticCall(tokenId2)).to.equal(BASE_URI + SUFFIX);
    }));
});
