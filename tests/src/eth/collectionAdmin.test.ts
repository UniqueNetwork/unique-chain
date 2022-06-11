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
import privateKey from '../substrate/privateKey';
import {
  createEthAccount,
  createEthAccountWithBalance, 
  evmCollection, 
  evmCollectionHelpers, 
  getCollectionAddressFromResult, 
  itWeb3,
} from './util/helpers';

describe('Add collection admins', () => {
  itWeb3('Add admin by owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const newAdmin = await createEthAccount(web3);
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
    
    const user = await createEthAccount(web3);
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
    
    const user = await createEthAccount(web3);
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

    const newAdmin = await createEthAccount(web3);
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
    const admin1 = await createEthAccount(web3);
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
    const notAdmin = await createEthAccount(web3);

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