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

import {expect} from 'chai';
import {isAllowlisted} from '../util/helpers';
import {
  contractHelpers,
  createEthAccount,
  createEthAccountWithBalance,
  deployFlipper,
  evmCollection,
  evmCollectionHelpers,
  getCollectionAddressFromResult,
  itWeb3,
} from './util/helpers';

describe('EVM contract allowlist', () => {
  itWeb3('Contract allowlist can be toggled', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

    // Any user is allowed by default
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;

    // Enable
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.true;

    // Disable
    await helpers.methods.toggleAllowlist(flipper.options.address, false).send({from: owner});
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;
  });

  itWeb3('Non-allowlisted user can\'t call contract with allowlist enabled', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const helpers = contractHelpers(web3, owner);

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
  itWeb3('Collection allowlist can be added and removed by [eth] address', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const user = createEthAccount(web3);
    
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    const result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.true;
    
    await collectionEvm.methods.removeFromCollectionAllowList(user).send({from: owner});
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
  });

  itWeb3('Collection allowlist can be added and removed by [sub] address', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const user = privateKeyWrapper('//Alice');
    
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    const result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    
    expect(await isAllowlisted(api, collectionId, user)).to.be.false;
    await collectionEvm.methods.addToCollectionAllowListSubstrate(user.addressRaw).send({from: owner});
    expect(await isAllowlisted(api, collectionId, user)).to.be.true;

    await collectionEvm.methods.removeFromCollectionAllowListSubstrate(user.addressRaw).send({from: owner});
    expect(await isAllowlisted(api, collectionId, user)).to.be.false;
  });

  itWeb3('Collection allowlist can not be add and remove [eth] address by not owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const user = createEthAccount(web3);
    
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    const result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
    await expect(collectionEvm.methods.addToCollectionAllowList(user).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.false;
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
    
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.true;
    await expect(collectionEvm.methods.removeFromCollectionAllowList(user).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await collectionEvm.methods.allowed(user).call({from: owner})).to.be.true;
  });

  itWeb3('Collection allowlist can not be add and remove [sub] address by not owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const user = privateKeyWrapper('//Alice');
    
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    const result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    
    expect(await isAllowlisted(api, collectionId, user)).to.be.false;
    await expect(collectionEvm.methods.addToCollectionAllowListSubstrate(user.addressRaw).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await isAllowlisted(api, collectionId, user)).to.be.false;
    await collectionEvm.methods.addToCollectionAllowListSubstrate(user.addressRaw).send({from: owner});
    
    expect(await isAllowlisted(api, collectionId, user)).to.be.true;
    await expect(collectionEvm.methods.removeFromCollectionAllowListSubstrate(user.addressRaw).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await isAllowlisted(api, collectionId, user)).to.be.true;
  });
});
