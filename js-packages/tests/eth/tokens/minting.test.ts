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
import {Pallets} from '@unique/test-utils/util.js';
import {waitParams, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import {CreateCollectionData} from '@unique/test-utils/eth/types.js';


describe('Minting tokens', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([30n, 20n], donor);
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: Can mint() for Substrate collection`, testCase.requiredPallets, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const receiver = helper.eth.createAccount();
      const mintingParams = testCase.mode === 'ft' ? [receiver, 100] : [receiver];

      const collection = await helper[testCase.mode].mintCollection(alice);
      await collection.addAdmin(alice, {Ethereum: owner.address});

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const contract = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      const mintTx = await contract.mint.send(...mintingParams);
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      // Check events:
      const event = mintEvents.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.equal(receiver);
      if(testCase.mode === 'ft')
        expect(event.args.value).to.equal('100');

      // Check token exist:
      if(testCase.mode === 'ft') {
        expect(await helper.ft.getBalance(collection.collectionId, {Ethereum: receiver.address})).to.eq(100n);
      } else {
        const tokenId = event.args.tokenId;
        expect(tokenId).to.be.equal('1');
        expect(await helper.collection.getLastTokenId(collection.collectionId)).to.eq(1);
        expect(await contract.ownerOfCross.staticCall(tokenId)).to.be.like([receiver, '0']);
      }
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: Can mint() for Ethereum collection`, testCase.requiredPallets, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const receiver = helper.eth.createAccount();
      const mintingParams = testCase.mode === 'ft' ? [receiver, 100] : [receiver];

      const {collection, collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('Name', 'Desc', 'Prefix', testCase.mode)).send();

      const mintTx = await collection.mint.send(...mintingParams);
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      // Check events:
      const event = mintEvents.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.equal(receiver);
      if(testCase.mode === 'ft')
        expect(event.args.value).to.equal('100');

      // Check token exist:
      if(testCase.mode === 'ft') {
        expect(await helper.ft.getBalance(collectionId, {Ethereum: receiver.address})).to.eq(100n);
      } else {
        const tokenId = event.args.tokenId;
        expect(tokenId).to.be.equal('1');
        expect(await helper.collection.getLastTokenId(collectionId)).to.eq(1);
        expect(await collection.ownerOfCross.staticCall(tokenId)).to.be.like([receiver, '0']);
      }
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: Can mint() for Ethereum collection`, testCase.requiredPallets, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const receiver = helper.eth.createAccount();
      const mintingParams = testCase.mode === 'ft' ? [receiver, 100] : [receiver];

      const {collection, collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('Name', 'Desc', 'Prefix', testCase.mode)).send();

      const mintTx = await collection.mint.send(...mintingParams);
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      // Check events:
      const event = mintEvents.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.equal(receiver);
      if(testCase.mode === 'ft')
        expect(event.args.value).to.equal('100');

      // Check token exist:
      if(testCase.mode === 'ft') {
        expect(await helper.ft.getBalance(collectionId, {Ethereum: receiver.address})).to.eq(100n);
      } else {
        const tokenId = event.args.tokenId;
        expect(tokenId).to.be.equal('1');
        expect(await helper.collection.getLastTokenId(collectionId)).to.eq(1);
        expect(await collection.ownerOfCross.staticCall(tokenId)).to.be.like([receiver, '0']);
      }
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: Can mintWithTokenURI() for Ethereum collection`, testCase.requiredPallets, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const receiver = helper.eth.createAccount();

      const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Mint collection', '6', '6', '');
      const contract = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

      const mintTx = await contract.mintWithTokenURI.send(receiver, 'Test URI');
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      const event = mintEvents.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.tokenId).to.be.equal('1');
      expect(event.args.from).to.be.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.be.equal(receiver);

      expect(await contract.tokenURI.staticCall(event.args.tokenId)).to.be.equal('Test URI');
      expect(await contract.ownerOfCross.staticCall(event.args.tokenId)).to.be.like([receiver, '0']);
      // TODO: this wont work right now, need release 919000 first
      // await helper.methods.setOffchainSchema(collectionIdAddress, 'https://offchain-service.local/token-info/{id}').send();
      // const tokenUri = await contract.methods.tokenURI(nextTokenId).call();
      // expect(tokenUri).to.be.equal(`https://offchain-service.local/token-info/${nextTokenId}`);
    });
  });
});
