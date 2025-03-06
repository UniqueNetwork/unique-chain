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
import {itEth, usingEthPlaygrounds, expect, SponsoringMode, waitParams} from '@unique/test-utils/eth/util.js';
import {CreateCollectionData} from '@unique/test-utils/eth/types.js';

describe('EVM contract allowlist', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Contract allowlist can be toggled', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);
    const helpers = helper.ethNativeContract.contractHelpers(owner);

    // Any user is allowed by default
    expect(await helpers.allowlistEnabled.staticCall(await flipper.getAddress())).to.be.false;

    // Enable
    await (await helpers.toggleAllowlist.send(await flipper.getAddress(), true)).wait(...waitParams);
    expect(await helpers.allowlistEnabled.staticCall(await flipper.getAddress())).to.be.true;

    // Disable
    await (await helpers.toggleAllowlist.send(await flipper.getAddress(), false)).wait(...waitParams);
    expect(await helpers.allowlistEnabled.staticCall(await flipper.getAddress())).to.be.false;
  });

  itEth('Non-allowlisted user can\'t call contract with allowlist enabled', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);

    const caller = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerFlipper = helper.eth.changeContractCaller(flipper, caller);
    
    const helpers = await helper.ethNativeContract.contractHelpers(owner);

    // User can flip with allowlist disabled
    await (await nonOwnerFlipper.flip.send()).wait(...waitParams);
    expect(await flipper.getValue.staticCall()).to.be.true;

    // Tx will be reverted if user is not in allowlist
    await (await helpers.toggleAllowlist.send(await flipper.getAddress(), true)).wait(...waitParams);
    await expect(nonOwnerFlipper.flip.send()).to.rejected;
    expect(await flipper.getValue.staticCall()).to.be.true;

    // Adding caller to allowlist will make contract callable again
    await (await helpers.toggleAllowed.send(await flipper.getAddress(), caller, true)).wait(...waitParams);
    await (await nonOwnerFlipper.flip.send()).wait(...waitParams);
    expect(await flipper.getValue.staticCall()).to.be.false;
  });
});

describe('EVM collection allowlist', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  // Soft-deprecated
  itEth('Collection allowlist can be added and removed by [eth] address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const user = helper.eth.createAccount();
    const crossUser = helper.ethCrossAccount.fromAddress(user.address);

    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    expect(await collectionEvm.allowlistedCross.staticCall(crossUser)).to.be.false;
    await (await collectionEvm.addToCollectionAllowList.send(user)).wait(...waitParams);
    expect(await collectionEvm.allowlistedCross.staticCall(crossUser)).to.be.true;

    await (await collectionEvm.removeFromCollectionAllowList.send(user)).wait(...waitParams);
    expect(await collectionEvm.allowlistedCross.staticCall(crossUser)).to.be.false;
  });


  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, requiredPallets: []},
  ].map(testCase =>
    itEth.ifWithPallets(`Collection allowlist can be added and removed by [cross] address for ${testCase.mode}`, testCase.requiredPallets, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const [userSub] = await helper.arrange.createAccounts([10n], donor);
      const userEth = await helper.eth.createAccountWithBalance(donor);
      const mintParams = testCase.mode === 'ft' ? [userEth, 100] : [userEth];

      const {collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);
      const userCrossSub = helper.ethCrossAccount.fromKeyringPair(userSub);
      const userCrossEth = helper.ethCrossAccount.fromAddress(userEth.address);
      const ownerCrossEth = helper.ethCrossAccount.fromAddress(owner.address);

      // Can addToCollectionAllowListCross:
      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.false;
      await (await collectionEvm.addToCollectionAllowListCross.send(userCrossSub)).wait(...waitParams);
      await (await collectionEvm.addToCollectionAllowListCross.send(userCrossEth)).wait(...waitParams);
      await (await collectionEvm.addToCollectionAllowListCross.send(ownerCrossEth)).wait(...waitParams);

      // Accounts are in allowed list:
      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.true;
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth.address})).to.be.true;
      expect(await collectionEvm.allowlistedCross.staticCall(userCrossSub)).to.be.true;
      expect(await collectionEvm.allowlistedCross.staticCall(userCrossEth)).to.be.true;

      await (await collectionEvm.mint.send(...mintParams)).wait(...waitParams); // token #1
      await (await collectionEvm.mint.send(...mintParams)).wait(...waitParams); // token #2
      await (await collectionEvm.setCollectionAccess.send(SponsoringMode.Allowlisted)).wait(...waitParams);

      // allowlisted account can transfer and transferCross from eth:
      const userCollectionEvm = helper.eth.changeContractCaller(collectionEvm, userEth);
      await (await userCollectionEvm.transfer.send(owner, 1)).wait(...waitParams);
      await (await userCollectionEvm.transferCross.send(userCrossSub, 2)).wait(...waitParams);

      if(testCase.mode === 'ft') {
        expect(await helper.ft.getBalance(collectionId, {Ethereum: owner.address})).to.eq(1n);
        expect(await helper.ft.getBalance(collectionId, {Substrate: userSub.address})).to.eq(2n);
      } else {
        expect(await helper.nft.getTokenOwner(collectionId, 1)).to.deep.eq({Ethereum: owner.address});
        expect(await helper.nft.getTokenOwner(collectionId, 2)).to.deep.eq({Substrate: userSub.address});
      }

      // allowlisted cross substrate accounts can transfer from Substrate:
      testCase.mode === 'ft'
        ? await helper.ft.transfer(userSub, collectionId, {Ethereum: userEth.address}, 2n)
        : await helper.collection.transferToken(userSub, collectionId, 2, {Ethereum: userEth.address});

      // can removeFromCollectionAllowListCross:
      await (await collectionEvm.removeFromCollectionAllowListCross.send(userCrossSub)).wait(...waitParams);
      await (await collectionEvm.removeFromCollectionAllowListCross.send(userCrossEth)).wait(...waitParams);
      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.false;
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth.address})).to.be.false;
      expect(await collectionEvm.allowlistedCross.staticCall(userCrossSub)).to.be.false;
      expect(await collectionEvm.allowlistedCross.staticCall(userCrossEth)).to.be.false;

      // cannot transfer anymore
      await (await collectionEvm.mint.send(...mintParams)).wait(...waitParams);
      await expect(await (await userCollectionEvm.transfer.send(owner, 2)).wait(...waitParams)).to.be.rejectedWith(/Transaction has been reverted/);
    }));

  [
    // cross-methods
    {mode: 'nft' as const, cross: true, requiredPallets: []},
    {mode: 'rft' as const, cross: true, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, cross: true, requiredPallets: []},
    // soft-deprecated
    {mode: 'nft' as const, cross: false, requiredPallets: []},
    {mode: 'rft' as const, cross: false, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, cross: false, requiredPallets: []},
  ].map(testCase =>
    itEth.ifWithPallets(`Non-owner cannot add or remove from collection allowlist ${testCase.cross ? 'cross ' : ''}${testCase.mode}`, testCase.requiredPallets, async ({helper}) => {
      // Select methods:
      const addToAllowList = testCase.cross ? 'addToCollectionAllowListCross' : 'addToCollectionAllowList';
      const removeFromAllowList = testCase.cross ? 'removeFromCollectionAllowListCross' : 'removeFromCollectionAllowList';

      const owner = await helper.eth.createAccountWithBalance(donor);
      const notOwner = await helper.eth.createAccountWithBalance(donor);
      const userSub = donor;
      const userCrossSub = helper.ethCrossAccount.fromKeyringPair(userSub);
      const userEth = helper.eth.createAccount();
      const userCrossEth = helper.ethCrossAccount.fromAddress(userEth.address);

      const {collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner, !testCase.cross);
      const nonOwnerCollectionEvm = helper.eth.changeContractCaller(collectionEvm, notOwner)

      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.false;
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth.address})).to.be.false;

      // 1. notOwner cannot add to allow list:
      // 1.1 plain ethereum or cross address:
      await expect(nonOwnerCollectionEvm[addToAllowList].staticCall(testCase.cross ? userCrossEth : userEth)).to.be.rejectedWith('NoPermission');
      // 1.2 cross-substrate address:
      if(testCase.cross)
        await expect(nonOwnerCollectionEvm[addToAllowList].staticCall(userCrossSub)).to.be.rejectedWith('NoPermission');

      // 2. owner can add to allow list:
      // 2.1 plain ethereum or cross address:
      await (await collectionEvm[addToAllowList].send(testCase.cross ? userCrossEth : userEth)).wait(...waitParams);
      // 2.2 cross-substrate address:
      if(testCase.cross) {
        await (await collectionEvm[addToAllowList].send(userCrossSub)).wait(...waitParams);
        expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.true;
      }
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth.address})).to.be.true;

      // 3. notOwner cannot remove from allow list:
      // 3.1 plain ethereum or cross address:
      await expect(nonOwnerCollectionEvm[removeFromAllowList].staticCall(testCase.cross ? userCrossEth : userEth.address))
        .to.be.rejectedWith('NoPermission');
      
      // 3.2 cross-substrate address:
      if(testCase.cross)
        await expect(nonOwnerCollectionEvm[removeFromAllowList].staticCall(userCrossSub)).to.be.rejectedWith('NoPermission');
    }));
});
