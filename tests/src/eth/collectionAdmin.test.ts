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

import {IKeyringPair} from '@polkadot/types/types';
import {IEthCrossAccountId} from '../util/playgrounds/types';
import {usingEthPlaygrounds, itEth, expect, EthUniqueHelper} from './util/playgrounds';

async function recordEthFee(helper: EthUniqueHelper, userAddress: string, call: () => Promise<any>) {
  const before = await helper.balance.getSubstrate(helper.address.ethToSubstrate(userAddress));
  await call();
  await helper.wait.newBlocks(1);
  const after = await helper.balance.getSubstrate(helper.address.ethToSubstrate(userAddress));

  expect(after < before).to.be.true;

  return before - after;
}

describe('Add collection admins', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  itEth('Add admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const newAdmin = helper.eth.createAccount();

    await collectionEvm.methods.addCollectionAdmin(newAdmin).send();
    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(newAdmin.toLocaleLowerCase());
  });

  itEth.skip('Add substrate admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const [newAdmin] = await helper.arrange.createAccounts([10n], donor);
    await collectionEvm.methods.addCollectionAdminSubstrate(newAdmin.addressRaw).send();

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
      .to.be.eq(newAdmin.address.toLocaleLowerCase());
  });

  itEth('Verify owner or admin', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const newAdmin = helper.eth.createAccount();
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
  
    expect(await collectionEvm.methods.isOwnerOrAdmin(newAdmin).call()).to.be.false;
    await collectionEvm.methods.addCollectionAdmin(newAdmin).send();
    expect(await collectionEvm.methods.isOwnerOrAdmin(newAdmin).call()).to.be.true;
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
    
  itEth('(!negative tests!) Add admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const admin = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdmin(admin).send();

    const user = helper.eth.createAccount();
    await expect(collectionEvm.methods.addCollectionAdmin(user).call({from: admin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(admin.toLocaleLowerCase());
  });

  itEth('(!negative tests!) Add admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const notAdmin = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const user = helper.eth.createAccount();
    await expect(collectionEvm.methods.addCollectionAdmin(user).call({from: notAdmin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });

  itEth.skip('(!negative tests!) Add substrate admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const admin = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdmin(admin).send();

    const [notAdmin] = await helper.arrange.createAccounts([10n], donor);
    await expect(collectionEvm.methods.addCollectionAdminSubstrate(notAdmin.addressRaw).call({from: admin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(admin.toLocaleLowerCase());
  });

  itEth.skip('(!negative tests!) Add substrate admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const notAdmin0 = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const [notAdmin1] = await helper.arrange.createAccounts([10n], donor);
    await expect(collectionEvm.methods.addCollectionAdminSubstrate(notAdmin1.addressRaw).call({from: notAdmin0}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });
});

describe('Remove collection admins', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  itEth('Remove admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const newAdmin = helper.eth.createAccount();
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdmin(newAdmin).send();

    {
      const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
      expect(adminList.length).to.be.eq(1);
      expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
        .to.be.eq(newAdmin.toLocaleLowerCase());
    }

    await collectionEvm.methods.removeCollectionAdmin(newAdmin).send();
    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });

  itEth.skip('Remove substrate admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const [newAdmin] = await helper.arrange.createAccounts([10n], donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdminSubstrate(newAdmin.addressRaw).send();
    {
      const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
      expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
        .to.be.eq(newAdmin.address.toLocaleLowerCase());
    }

    await collectionEvm.methods.removeCollectionAdminSubstrate(newAdmin.addressRaw).send();
    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });

  itEth('(!negative tests!) Remove admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const admin0 = await helper.eth.createAccountWithBalance(donor);
    await collectionEvm.methods.addCollectionAdmin(admin0).send();
    const admin1 = await helper.eth.createAccountWithBalance(donor);
    await collectionEvm.methods.addCollectionAdmin(admin1).send();

    await expect(collectionEvm.methods.removeCollectionAdmin(admin1).call({from: admin0}))
      .to.be.rejectedWith('NoPermission');
    {
      const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
      expect(adminList.length).to.be.eq(2);
      expect(adminList.toString().toLocaleLowerCase())
        .to.be.deep.contains(admin0.toLocaleLowerCase())
        .to.be.deep.contains(admin1.toLocaleLowerCase());
    }
  });

  itEth('(!negative tests!) Remove admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const admin = await helper.eth.createAccountWithBalance(donor);
    await collectionEvm.methods.addCollectionAdmin(admin).send();
    const notAdmin = helper.eth.createAccount();

    await expect(collectionEvm.methods.removeCollectionAdmin(admin).call({from: notAdmin}))
      .to.be.rejectedWith('NoPermission');
    {
      const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
      expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
        .to.be.eq(admin.toLocaleLowerCase());
      expect(adminList.length).to.be.eq(1);
    }
  });

  itEth.skip('(!negative tests!) Remove substrate admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const [adminSub] = await helper.arrange.createAccounts([10n], donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdminSubstrate(adminSub.addressRaw).send();
    const adminEth = await helper.eth.createAccountWithBalance(donor);
    await collectionEvm.methods.addCollectionAdmin(adminEth).send();

    await expect(collectionEvm.methods.removeCollectionAdminSubstrate(adminSub.addressRaw).call({from: adminEth}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(2);
    expect(adminList.toString().toLocaleLowerCase())
      .to.be.deep.contains(adminSub.address.toLocaleLowerCase())
      .to.be.deep.contains(adminEth.toLocaleLowerCase());
  });

  itEth.skip('(!negative tests!) Remove substrate admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

    const [adminSub] = await helper.arrange.createAccounts([10n], donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdminSubstrate(adminSub.addressRaw).send();
    const notAdminEth = await helper.eth.createAccountWithBalance(donor);

    await expect(collectionEvm.methods.removeCollectionAdminSubstrate(adminSub.addressRaw).call({from: notAdminEth}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
      .to.be.eq(adminSub.address.toLocaleLowerCase());
  });
});

describe('Change owner tests', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  itEth('Change owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    await collectionEvm.methods.setOwner(newOwner).send();

    expect(await collectionEvm.methods.isOwnerOrAdmin(owner).call()).to.be.false;
    expect(await collectionEvm.methods.isOwnerOrAdmin(newOwner).call()).to.be.true;
  });

  itEth('change owner call fee', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const cost = await recordEthFee(helper, owner, () => collectionEvm.methods.setOwner(newOwner).send());
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0);
  });

  itEth('(!negative tests!) call setOwner by non owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    await expect(collectionEvm.methods.setOwner(newOwner).send({from: newOwner})).to.be.rejected;
    expect(await collectionEvm.methods.isOwnerOrAdmin(newOwner).call()).to.be.false;
  });
});

describe('Change substrate owner tests', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  itEth.skip('Change owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const [newOwner] = await helper.arrange.createAccounts([10n], donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    expect(await collectionEvm.methods.isOwnerOrAdmin(owner).call()).to.be.true;
    expect(await collectionEvm.methods.isOwnerOrAdminSubstrate(newOwner.addressRaw).call()).to.be.false;

    await collectionEvm.methods.setOwnerSubstrate(newOwner.addressRaw).send();

    expect(await collectionEvm.methods.isOwnerOrAdmin(owner).call()).to.be.false;
    expect(await collectionEvm.methods.isOwnerOrAdminSubstrate(newOwner.addressRaw).call()).to.be.true;
  });

  itEth.skip('change owner call fee', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const [newOwner] = await helper.arrange.createAccounts([10n], donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const cost = await recordEthFee(helper, owner, () => collectionEvm.methods.setOwnerSubstrate(newOwner.addressRaw).send());
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0);
  });

  itEth.skip('(!negative tests!) call setOwner by non owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const otherReceiver = await helper.eth.createAccountWithBalance(donor);
    const [newOwner] = await helper.arrange.createAccounts([10n], donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    await expect(collectionEvm.methods.setOwnerSubstrate(newOwner.addressRaw).send({from: otherReceiver})).to.be.rejected;
    expect(await collectionEvm.methods.isOwnerOrAdminSubstrate(newOwner.addressRaw).call()).to.be.false;
  });
});
