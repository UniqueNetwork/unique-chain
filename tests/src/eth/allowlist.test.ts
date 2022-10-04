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
import {itEth, usingEthPlaygrounds, expect} from './util/playgrounds';

describe('EVM contract allowlist', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
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
      donor = privateKey('//Alice');
    });
  });

  itEth('Collection allowlist can be added and removed by [eth] address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const user = helper.eth.createAccount();

    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.true;

    await collectionEvm.methods.removeFromCollectionAllowList(user).send({from: owner});
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
  });

  // TODO: Temprorary off. Need refactor
  // itEth('Collection allowlist can be added and removed by [sub] address', async ({helper}) => {
  //   const owner = await helper.eth.createAccountWithBalance(donor);
  //   const user = donor;

  //   const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
  //   const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

  //   expect(await helper.collection.allowed(collectionId, {Substrate: user.address})).to.be.false;
  //   await collectionEvm.methods.addToCollectionAllowListSubstrate(user.addressRaw).send({from: owner});
  //   expect(await helper.collection.allowed(collectionId, {Substrate: user.address})).to.be.true;

  //   await collectionEvm.methods.removeFromCollectionAllowListSubstrate(user.addressRaw).send({from: owner});
  //   expect(await helper.collection.allowed(collectionId, {Substrate: user.address})).to.be.false;
  // });

  itEth('Collection allowlist can not be add and remove [eth] address by not owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const user = helper.eth.createAccount();

    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
    await expect(collectionEvm.methods.addToCollectionAllowList(user).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});

    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.true;
    await expect(collectionEvm.methods.removeFromCollectionAllowList(user).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.true;
  });

  // TODO: Temprorary off. Need refactor
  // itEth('Collection allowlist can not be add and remove [sub] address by not owner', async ({helper}) => {
  //   const owner = await helper.eth.createAccountWithBalance(donor);
  //   const notOwner = await helper.eth.createAccountWithBalance(donor);
  //   const user = donor;

  //   const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
  //   const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

  //   expect(await helper.collection.allowed(collectionId, {Substrate: user.address})).to.be.false;
  //   await expect(collectionEvm.methods.addToCollectionAllowListSubstrate(user.addressRaw).call({from: notOwner})).to.be.rejectedWith('NoPermission');
  //   expect(await helper.collection.allowed(collectionId, {Substrate: user.address})).to.be.false;
  //   await collectionEvm.methods.addToCollectionAllowListSubstrate(user.addressRaw).send({from: owner});

  //   expect(await helper.collection.allowed(collectionId, {Substrate: user.address})).to.be.true;
  //   await expect(collectionEvm.methods.removeFromCollectionAllowListSubstrate(user.addressRaw).call({from: notOwner})).to.be.rejectedWith('NoPermission');
  //   expect(await helper.collection.allowed(collectionId, {Substrate: user.address})).to.be.true;
  // });
});
