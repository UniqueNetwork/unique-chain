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

import {Pallets} from '@unique/test-utils/util.js';
import {confirmations, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {CreateCollectionData} from '@unique/test-utils/eth/types.js';


describe('ERC-721 call methods', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  [
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'nft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: name/symbol/description`, testCase.requiredPallets, async ({helper}) => {
      const callerEth = await helper.eth.createAccountWithBalance(donor);
      const [callerSub] = await helper.arrange.createAccounts([100n], donor);
      const [name, description, tokenPrefix] = ['Name', 'Description', 'Symbol'];

      const {collection: collectionEth} = await helper.eth.createCollection(callerEth, new CreateCollectionData(name, description, tokenPrefix, testCase.mode)).send();
      await collectionEth.mint.send(callerEth, {from: callerEth});
      const {collectionId} = await helper[testCase.mode].mintCollection(callerSub, {name, description, tokenPrefix});
      const collectionSub = await helper.ethNativeContract.collectionById(collectionId, testCase.mode, callerEth);

      // Can get name/symbol/description for Eth collection
      expect(await collectionEth.name.staticCall()).to.eq(name);
      expect(await collectionEth.symbol.staticCall()).to.eq(tokenPrefix);
      expect(await collectionEth.description.staticCall()).to.eq(description);
      // Can get name/symbol/description for Sub collection
      expect(await collectionSub.name.staticCall()).to.eq(name);
      expect(await collectionSub.symbol.staticCall()).to.eq(tokenPrefix);
      expect(await collectionSub.description.staticCall()).to.eq(description);
    });
  });

  [
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'nft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: totalSupply`, testCase.requiredPallets, async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);

      const {collection} = await helper.eth.createCollection(caller, new CreateCollectionData('TotalSupply', '6', '6', testCase.mode)).send();
      await (await collection.mint.send(caller)).wait(confirmations);

      const totalSupply = await collection.totalSupply.staticCall();
      expect(totalSupply).to.equal('1');
    });
  });

  [
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'nft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: balanceOf`, testCase.requiredPallets, async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);

      const {collection} = await helper.eth.createCollection(caller, new CreateCollectionData('BalanceOf', 'Descroption', 'Prefix', testCase.mode)).send();
      await (await collection.mint.send(caller)).wait(confirmations);
      await (await collection.mint.send(caller)).wait(confirmations);
      await (await collection.mint.send(caller)).wait(confirmations);

      const balance = await collection.balanceOf.staticCall(caller);
      expect(balance).to.equal('3');
    });
  });

  [
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'nft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: ownerOf`, testCase.requiredPallets, async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const {collection} = await helper.eth.createCollection(caller, new CreateCollectionData('OwnerOf', '6', '6', testCase.mode)).send();

      const mintTx = await collection.mint.send(caller);
      const mintReceipt = await mintTx.wait(confirmations);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      const tokenId = mintEvents.Transfer.args.tokenId;
      
      const owner = await collection.ownerOf.staticCall(tokenId);
      expect(owner).to.equal(caller);
    });
  });

  [
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    // TODO {mode: 'nft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`${testCase.mode.toUpperCase()}: ownerOf after burn`, testCase.requiredPallets, async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const receiver = helper.eth.createAccount();
      const {collection, collectionId} = await helper.eth.createCollection(caller, new CreateCollectionData('OwnerOf-AfterBurn', '6', '6', testCase.mode)).send();

      const mintTx = await collection.mint.send(caller);
      const mintReceipt = await mintTx.wait(confirmations);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      const tokenId = mintEvents.Transfer.args.tokenId;
      const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, +tokenId, caller, true);

      await (await tokenContract.repartition.send(2)).wait(confirmations);
      await (await tokenContract.transfer.send(receiver, 1)).wait(confirmations);

      await (await tokenContract.burnFrom.send(caller, 1)).wait(confirmations);

      const owner = await collection.ownerOf.staticCall(tokenId);
      expect(owner).to.equal(receiver);
    });
  });

  itEth.ifWithPallets('RFT: ownerOf for partial ownership', [Pallets.ReFungible], async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const {collectionId, collectionAddress} = await helper.eth.createRFTCollection(caller, 'Partial-OwnerOf', '6', '6');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const mintTx = await contract.mint.send(caller);
    const mintReceipt = await mintTx.wait(confirmations);
    const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

    const tokenId = mintEvents.Transfer.args.tokenId;
    const tokenContract = await helper.ethNativeContract.rftTokenById(collectionId, +tokenId, caller);

    await (await tokenContract.repartition.send(2)).wait(confirmations);
    await (await tokenContract.transfer.send(receiver, 1)).wait(confirmations);

    const owner = await contract.ownerOf.staticCall(tokenId);
    expect(owner).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
  });
});
