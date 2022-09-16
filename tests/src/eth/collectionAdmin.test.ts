// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.
// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {expect} from 'chai';
import {IKeyringPair} from '@polkadot/types/types';
import privateKey from '../substrate/privateKey';
import {UNIQUE} from '../util/helpers';
import {
  createEthAccount,
  createEthAccountWithBalance, 
  evmCollection, 
  evmCollectionHelpers, 
  getCollectionAddressFromResult, 
  itWeb3,
  recordEthFee,
} from './util/helpers';
import {itEth, usingEthPlaygrounds} from './util/playgrounds';
import {IEthCrossAccountId} from '../util/playgrounds/types';

describe('Add collection admins', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });
  
  itWeb3('Add admin by owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const newAdmin = createEthAccount(web3);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdmin(newAdmin).send();
    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(newAdmin.toLocaleLowerCase());
  });

  itWeb3('Add substrate admin by owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const newAdmin = privateKeyWrapper('//Alice');
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdminSubstrate(newAdmin.addressRaw).send();

    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
      .to.be.eq(newAdmin.address.toLocaleLowerCase());
  });

  itEth('Check adminlist', async ({helper, privateKey}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
        
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const admin1 = helper.eth.createAccount();
    const admin2 = privateKey('admin');
    await collectionEvm.methods.addCollectionAdmin(admin1).send();
    await collectionEvm.methods.addCollectionAdminSubstrate(admin2.addressRaw).send();

    const adminListRpc = await helper.collection.getAdmins(collectionId);
    let adminListEth = await collectionEvm.methods.collectionAdmins().call();
    adminListEth = adminListEth.map((element: IEthCrossAccountId) => {
      return helper.address.convertCrossAccountFromEthCrossAcoount(element);
    });
    expect(adminListRpc).to.be.like(adminListEth);
  });

  itWeb3('Verify owner or admin', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);

    const newAdmin = createEthAccount(web3);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    expect(await collectionEvm.methods.isOwnerOrAdmin(newAdmin).call()).to.be.false;
    await collectionEvm.methods.addCollectionAdmin(newAdmin).send();
    expect(await collectionEvm.methods.isOwnerOrAdmin(newAdmin).call()).to.be.true;
  });

  itWeb3('(!negative tests!) Add admin by ADMIN is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const admin = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdmin(admin).send();
    
    const user = createEthAccount(web3);
    await expect(collectionEvm.methods.addCollectionAdmin(user).call({from: admin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(admin.toLocaleLowerCase());
  });

  itWeb3('(!negative tests!) Add admin by USER is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const notAdmin = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    
    const user = createEthAccount(web3);
    await expect(collectionEvm.methods.addCollectionAdmin(user).call({from: notAdmin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(0);
  });

  itWeb3('(!negative tests!) Add substrate admin by ADMIN is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const admin = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdmin(admin).send();

    const notAdmin = privateKey('//Alice');
    await expect(collectionEvm.methods.addCollectionAdminSubstrate(notAdmin.addressRaw).call({from: admin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(admin.toLocaleLowerCase());
  });
  
  itWeb3('(!negative tests!) Add substrate admin by USER is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const notAdmin0 = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    const notAdmin1 = privateKey('//Alice');
    await expect(collectionEvm.methods.addCollectionAdminSubstrate(notAdmin1.addressRaw).call({from: notAdmin0}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(0);
  });
});

describe('Remove collection admins', () => {
  itWeb3('Remove admin by owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const newAdmin = createEthAccount(web3);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdmin(newAdmin).send();
    {
      const adminList = await api.rpc.unique.adminlist(collectionId);
      expect(adminList.length).to.be.eq(1);
      expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
        .to.be.eq(newAdmin.toLocaleLowerCase());
    }

    await collectionEvm.methods.removeCollectionAdmin(newAdmin).send();
    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(0);
  });

  itWeb3('Remove substrate admin by owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const newAdmin = privateKeyWrapper('//Alice');
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdminSubstrate(newAdmin.addressRaw).send();
    {
      const adminList = await api.rpc.unique.adminlist(collectionId);
      expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
        .to.be.eq(newAdmin.address.toLocaleLowerCase());
    }
    
    await collectionEvm.methods.removeCollectionAdminSubstrate(newAdmin.addressRaw).send();
    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(0);
  });

  itWeb3('(!negative tests!) Remove admin by ADMIN is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

    const admin0 = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    await collectionEvm.methods.addCollectionAdmin(admin0).send();
    const admin1 = createEthAccount(web3);
    await collectionEvm.methods.addCollectionAdmin(admin1).send();

    await expect(collectionEvm.methods.removeCollectionAdmin(admin1).call({from: admin0}))
      .to.be.rejectedWith('NoPermission');
    {
      const adminList = await api.rpc.unique.adminlist(collectionId);
      expect(adminList.length).to.be.eq(2);
      expect(adminList.toString().toLocaleLowerCase())
        .to.be.deep.contains(admin0.toLocaleLowerCase())
        .to.be.deep.contains(admin1.toLocaleLowerCase());
    }
  });

  itWeb3('(!negative tests!) Remove admin by USER is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

    const admin = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    await collectionEvm.methods.addCollectionAdmin(admin).send();
    const notAdmin = createEthAccount(web3);

    await expect(collectionEvm.methods.removeCollectionAdmin(admin).call({from: notAdmin}))
      .to.be.rejectedWith('NoPermission');
    {
      const adminList = await api.rpc.unique.adminlist(collectionId);
      expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
        .to.be.eq(admin.toLocaleLowerCase());
      expect(adminList.length).to.be.eq(1);
    }
  });

  itWeb3('(!negative tests!) Remove substrate admin by ADMIN is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const adminSub = privateKeyWrapper('//Alice');
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdminSubstrate(adminSub.addressRaw).send();
    const adminEth = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    await collectionEvm.methods.addCollectionAdmin(adminEth).send();

    await expect(collectionEvm.methods.removeCollectionAdminSubstrate(adminSub.addressRaw).call({from: adminEth}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(2);
    expect(adminList.toString().toLocaleLowerCase())
      .to.be.deep.contains(adminSub.address.toLocaleLowerCase())
      .to.be.deep.contains(adminEth.toLocaleLowerCase());
  });

  itWeb3('(!negative tests!) Remove substrate admin by USER is not allowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const adminSub = privateKeyWrapper('//Alice');
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdminSubstrate(adminSub.addressRaw).send();
    const notAdminEth = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    await expect(collectionEvm.methods.removeCollectionAdminSubstrate(adminSub.addressRaw).call({from: notAdminEth}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
      .to.be.eq(adminSub.address.toLocaleLowerCase());
  });
});

describe('Change owner tests', () => {
  itWeb3('Change owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const newOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
  
    await collectionEvm.methods.setOwner(newOwner).send();
  
    expect(await collectionEvm.methods.isOwnerOrAdmin(owner).call()).to.be.false;
    expect(await collectionEvm.methods.isOwnerOrAdmin(newOwner).call()).to.be.true;
  });

  itWeb3('change owner call fee', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const newOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

    const cost = await recordEthFee(api, owner, () => collectionEvm.methods.setOwner(newOwner).send());
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
    expect(cost > 0);
  });

  itWeb3('(!negative tests!) call setOwner by non owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const newOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
  
    await expect(collectionEvm.methods.setOwner(newOwner).send({from: newOwner})).to.be.rejected;
    expect(await collectionEvm.methods.isOwnerOrAdmin(newOwner).call()).to.be.false;
  });
});

describe('Change substrate owner tests', () => {
  itWeb3('Change owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const newOwner = privateKeyWrapper('//Alice');
    const collectionHelper = evmCollectionHelpers(web3, owner);
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
  
    expect(await collectionEvm.methods.isOwnerOrAdmin(owner).call()).to.be.true;
    expect(await collectionEvm.methods.isOwnerOrAdminSubstrate(newOwner.addressRaw).call()).to.be.false;
    
    await collectionEvm.methods.setOwnerSubstrate(newOwner.addressRaw).send();
  
    expect(await collectionEvm.methods.isOwnerOrAdmin(owner).call()).to.be.false;
    expect(await collectionEvm.methods.isOwnerOrAdminSubstrate(newOwner.addressRaw).call()).to.be.true;
  });

  itWeb3('change owner call fee', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const newOwner = privateKeyWrapper('//Alice');
    const collectionHelper = evmCollectionHelpers(web3, owner);
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

    const cost = await recordEthFee(api, owner, () => collectionEvm.methods.setOwnerSubstrate(newOwner.addressRaw).send());
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
    expect(cost > 0);
  });

  itWeb3('(!negative tests!) call setOwner by non owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const otherReceiver = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const newOwner = privateKeyWrapper('//Alice');
    const collectionHelper = evmCollectionHelpers(web3, owner);
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
  
    await expect(collectionEvm.methods.setOwnerSubstrate(newOwner.addressRaw).send({from: otherReceiver})).to.be.rejected;
    expect(await collectionEvm.methods.isOwnerOrAdminSubstrate(newOwner.addressRaw).call()).to.be.false;
  });
});