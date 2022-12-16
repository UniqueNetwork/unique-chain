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
import {Pallets} from '../util';
import {itEth, usingEthPlaygrounds, expect, SponsoringMode} from './util';

describe('EVM contract allowlist', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Contract allowlist can be toggled', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);
    const helpers = helper.ethNativeContract.contractHelpers(owner);

    // Any user is allowed by default
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;

    // Enable
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.true;

    // Disable
    await helpers.methods.toggleAllowlist(flipper.options.address, false).send({from: owner});
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;
  });

  itEth('Non-allowlisted user can\'t call contract with allowlist enabled', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);
    const helpers = helper.ethNativeContract.contractHelpers(owner);

    // User can flip with allowlist disabled
    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Tx will be reverted if user is not in allowlist
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await expect(flipper.methods.flip().send({from: caller})).to.rejected;
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Adding caller to allowlist will make contract callable again
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});
    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.false;
  });
});

describe('EVM collection allowlist', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  // Soft-deprecated
  itEth('Collection allowlist can be added and removed by [eth] address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const user = helper.eth.createAccount();
    const crossUser = helper.ethCrossAccount.fromAddress(user);
    
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    expect(await collectionEvm.methods.allowlistedCross(crossUser).call({from: owner})).to.be.false;
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
    expect(await collectionEvm.methods.allowlistedCross(crossUser).call({from: owner})).to.be.true;

    await collectionEvm.methods.removeFromCollectionAllowList(user).send({from: owner});
    expect(await collectionEvm.methods.allowlistedCross(crossUser).call({from: owner})).to.be.false;
  });


  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, requiredPallets: []},
  ].map(testCase => 
    itEth(`Collection allowlist can be added and removed by [cross] address for ${testCase.mode}`, async ({helper}) => {
      const owner = (await helper.eth.createAccountWithBalance(donor)).toLowerCase();
      const [userSub] = await helper.arrange.createAccounts([10n], donor);
      const userEth = await helper.eth.createAccountWithBalance(donor);
      const mintParams = testCase.mode === 'ft' ? [userEth, 100] : [userEth];
      
      const {collectionAddress, collectionId} = await helper.eth.createCollection(testCase.mode, owner, 'A', 'B', 'C');
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);
      const userCrossSub = helper.ethCrossAccount.fromKeyringPair(userSub);
      const userCrossEth = helper.ethCrossAccount.fromAddress(userEth);
      const ownerCrossEth = helper.ethCrossAccount.fromAddress(owner);
      
      // Can addToCollectionAllowListCross:
      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.false;
      await collectionEvm.methods.addToCollectionAllowListCross(userCrossSub).send({from: owner});
      await collectionEvm.methods.addToCollectionAllowListCross(userCrossEth).send({from: owner});
      await collectionEvm.methods.addToCollectionAllowListCross(ownerCrossEth).send({from: owner});

      // Accounts are in allowed list:
      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.true;
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth})).to.be.true;
      expect(await collectionEvm.methods.allowlistedCross(userCrossSub).call({from: owner})).to.be.true;
      expect(await collectionEvm.methods.allowlistedCross(userCrossEth).call({from: owner})).to.be.true;
  
      await collectionEvm.methods.mint(...mintParams).send({from: owner}); // token #1
      await collectionEvm.methods.mint(...mintParams).send({from: owner}); // token #2
      await collectionEvm.methods.setCollectionAccess(SponsoringMode.Allowlisted).send({from: owner});
      
      // allowlisted account can transfer and transferCross from eth:
      await collectionEvm.methods.transfer(owner, 1).send({from: userEth});
      await collectionEvm.methods.transferCross(userCrossSub, 2).send({from: userEth});

      if (testCase.mode === 'ft') {
        expect(await helper.ft.getBalance(collectionId, {Ethereum: owner})).to.eq(1n);
        expect(await helper.ft.getBalance(collectionId, {Substrate: userSub.address})).to.eq(2n);
      } else {
        expect(await helper.nft.getTokenOwner(collectionId, 1)).to.deep.eq({Ethereum: owner});
        expect(await helper.nft.getTokenOwner(collectionId, 2)).to.deep.eq({Substrate: userSub.address});
      }

      // allowlisted cross substrate accounts can transfer from Substrate:
      testCase.mode === 'ft'
        ? await helper.ft.transfer(userSub, collectionId, {Ethereum: userEth}, 2n)
        : await helper.collection.transferToken(userSub, collectionId, 2, {Ethereum: userEth});
      
      // can removeFromCollectionAllowListCross:
      await collectionEvm.methods.removeFromCollectionAllowListCross(userCrossSub).send({from: owner});
      await collectionEvm.methods.removeFromCollectionAllowListCross(userCrossEth).send({from: owner});
      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.false;
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth})).to.be.false;
      expect(await collectionEvm.methods.allowlistedCross(userCrossSub).call({from: owner})).to.be.false;
      expect(await collectionEvm.methods.allowlistedCross(userCrossEth).call({from: owner})).to.be.false;
  
      // cannot transfer anymore
      await collectionEvm.methods.mint(...mintParams).send({from: owner});
      await expect(collectionEvm.methods.transfer(owner, 2).send({from: userEth})).to.be.rejectedWith(/Transaction has been reverted/);
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
    itEth.only(`Non-owner cannot add or remove from collection allowlist ${testCase.cross ? 'cross ' : ''}${testCase.mode}`, async ({helper}) => {
      // Select methods:
      const addToAllowList = testCase.cross ? 'addToCollectionAllowListCross' : 'addToCollectionAllowList';
      const removeFromAllowList = testCase.cross ? 'removeFromCollectionAllowListCross' : 'removeFromCollectionAllowList';

      const owner = await helper.eth.createAccountWithBalance(donor);
      const notOwner = await helper.eth.createAccountWithBalance(donor);
      const userSub = donor;
      const userCrossSub = helper.ethCrossAccount.fromKeyringPair(userSub);
      const userEth = helper.eth.createAccount();
      const userCrossEth = helper.ethCrossAccount.fromAddress(userEth);

      const {collectionAddress, collectionId} = await helper.eth.createCollection(testCase.mode, owner, 'A', 'B', 'C');
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner, !testCase.cross);
      
      expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.false;
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth})).to.be.false;
      
      // 1. notOwner cannot add to allow list:
      // 1.1 plain ethereum or cross address:
      await expect(collectionEvm.methods[addToAllowList](testCase.cross ? userCrossEth : userEth).call({from: notOwner})).to.be.rejectedWith('NoPermission');
      // 1.2 cross-substrate address:
      if (testCase.cross)
        await expect(collectionEvm.methods[addToAllowList](userCrossSub).call({from: notOwner})).to.be.rejectedWith('NoPermission');

      // 2. owner can add to allow list:
      // 2.1 plain ethereum or cross address:
      await collectionEvm.methods[addToAllowList](testCase.cross ? userCrossEth : userEth).send({from: owner});
      // 2.2 cross-substrate address:
      if (testCase.cross) {
        await collectionEvm.methods[addToAllowList](userCrossSub).send({from: owner});
        expect(await helper.collection.allowed(collectionId, {Substrate: userSub.address})).to.be.true;
      }
      expect(await helper.collection.allowed(collectionId, {Ethereum: userEth})).to.be.true;
    
      // 3. notOwner cannot remove from allow list:
      // 3.1 plain ethereum or cross address:
      await expect(collectionEvm.methods[removeFromAllowList](testCase.cross ? userCrossEth : userEth).call({from: notOwner})).to.be.rejectedWith('NoPermission');
      // 3.2 cross-substrate address:
      if (testCase.cross)
        await expect(collectionEvm.methods[removeFromAllowList](userCrossSub).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    }));
});
