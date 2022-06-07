// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

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

describe.only('Add collection admins', () => {
  itWeb3('Add admin by owner', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
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

  itWeb3('Add substrate admin by owner', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const newAdmin = privateKey('//Alice');
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdminSubstrate(newAdmin.addressRaw).send();
    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
      .to.be.eq(newAdmin.address.toLocaleLowerCase());
  });

  itWeb3('(!negative tests!) Add admin by admin is not allowed', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const result = await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);

    const admin = await createEthAccountWithBalance(api, web3);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    await collectionEvm.methods.addCollectionAdmin(admin).send();
    {
      const adminList = await api.rpc.unique.adminlist(collectionId);
      expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
        .to.be.eq(admin.toLocaleLowerCase());
    }
    
    const user = await createEthAccount(web3);
    await collectionEvm.methods.addCollectionAdmin(user).send({from: admin});
    const adminList = await api.rpc.unique.adminlist(collectionId);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(admin.toLocaleLowerCase());
    expect(adminList.length).to.be.eq(1);
  });
});