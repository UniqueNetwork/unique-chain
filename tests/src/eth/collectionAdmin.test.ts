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
import {expect} from 'chai';
import {Pallets} from '../util';
import {IEthCrossAccountId} from '../util/playgrounds/types';
import {usingEthPlaygrounds, itEth} from './util';
import {EthUniqueHelper} from './util/playgrounds/unique.dev';

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
      donor = await privateKey({filename: __filename});
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    {mode: 'ft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`can add account admin by owner for ${testCase.mode}`, testCase.requiredPallets, async ({helper, privateKey}) => {
      // arrange
      const owner = await helper.eth.createAccountWithBalance(donor);
      const adminSub = await privateKey('//admin2');
      const adminEth = helper.eth.createAccount().toLowerCase();
  
      const adminDeprecated = helper.eth.createAccount().toLowerCase();
      const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
      const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);
      
      const {collectionAddress, collectionId} = await helper.eth.createCollection(testCase.mode, owner, 'A', 'B', 'C');
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner, true);

      // Check isOwnerOrAdminCross returns false:
      expect(await collectionEvm.methods.isOwnerOrAdminCross(adminCrossSub).call()).to.be.false;
      expect(await collectionEvm.methods.isOwnerOrAdminCross(adminCrossEth).call()).to.be.false;
      expect(await collectionEvm.methods.isOwnerOrAdminCross(helper.ethCrossAccount.fromAddress(adminDeprecated)).call()).to.be.false;
      
      // Soft-deprecated: can addCollectionAdmin 
      await collectionEvm.methods.addCollectionAdmin(adminDeprecated).send();
      // Can addCollectionAdminCross for substrate and ethereum address
      await collectionEvm.methods.addCollectionAdminCross(adminCrossSub).send();
      await collectionEvm.methods.addCollectionAdminCross(adminCrossEth).send();
  
      // 1. Expect api.rpc.unique.adminlist returns admins:
      const adminListRpc = await helper.collection.getAdmins(collectionId);
      expect(adminListRpc).to.has.length(3);
      expect(adminListRpc).to.be.deep.contain.members([{Substrate: adminSub.address}, {Ethereum: adminEth}, {Ethereum: adminDeprecated}]);
  
      // 2. Expect methods.collectionAdmins == api.rpc.unique.adminlist
      let adminListEth = await collectionEvm.methods.collectionAdmins().call();
      adminListEth = adminListEth.map((element: IEthCrossAccountId) => {
        return helper.address.convertCrossAccountFromEthCrossAccount(element);
      });
      expect(adminListRpc).to.be.like(adminListEth);

      // 3. check isOwnerOrAdminCross returns true:
      expect(await collectionEvm.methods.isOwnerOrAdminCross(adminCrossSub).call()).to.be.true;
      expect(await collectionEvm.methods.isOwnerOrAdminCross(adminCrossEth).call()).to.be.true;
      expect(await collectionEvm.methods.isOwnerOrAdminCross(helper.ethCrossAccount.fromAddress(adminDeprecated)).call()).to.be.true;
    });
  });

  itEth('cross account admin can mint', async ({helper}) => {
    // arrange: create collection and accounts
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Mint collection', 'a', 'b', 'uri');
    const adminEth = (await helper.eth.createAccountWithBalance(donor)).toLowerCase();
    const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);
    const [adminSub] = await helper.arrange.createAccounts([100n], donor);
    const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    
    // cannot mint while not admin
    await expect(collectionEvm.methods.mint(owner).send({from: adminEth})).to.be.rejected;
    await expect(helper.nft.mintToken(adminSub, {collectionId, owner: {Ethereum: owner}})).to.be.rejectedWith(/common.PublicMintingNotAllowed/);
    
    // admin (sub and eth) can mint token:
    await collectionEvm.methods.addCollectionAdminCross(adminCrossEth).send();
    await collectionEvm.methods.addCollectionAdminCross(adminCrossSub).send();
    await collectionEvm.methods.mint(owner).send({from: adminEth});
    await helper.nft.mintToken(adminSub, {collectionId, owner: {Ethereum: owner}});

    expect(await helper.collection.getLastTokenId(collectionId)).to.eq(2);
  });

  itEth('cannot add invalid cross account admin', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const [admin] = await helper.arrange.createAccounts([100n, 100n], donor);

    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const adminCross = {
      eth: helper.address.substrateToEth(admin.address),
      sub: admin.addressRaw,
    };
    await expect(collectionEvm.methods.addCollectionAdminCross(adminCross).send()).to.be.rejected;
  });

  itEth('can verify owner with methods.isOwnerOrAdmin[Cross]', async ({helper, privateKey}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const adminDeprecated = helper.eth.createAccount();
    const admin1Cross = helper.ethCrossAccount.fromKeyringPair(await privateKey('admin'));
    const admin2Cross = helper.ethCrossAccount.fromAddress(helper.address.substrateToEth((await privateKey('admin3')).address));
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
  
    // Soft-deprecated:
    expect(await collectionEvm.methods.isOwnerOrAdmin(adminDeprecated).call()).to.be.false;
    expect(await collectionEvm.methods.isOwnerOrAdminCross(admin1Cross).call()).to.be.false;
    expect(await collectionEvm.methods.isOwnerOrAdminCross(admin2Cross).call()).to.be.false;

    await collectionEvm.methods.addCollectionAdmin(adminDeprecated).send();
    await collectionEvm.methods.addCollectionAdminCross(admin1Cross).send();
    await collectionEvm.methods.addCollectionAdminCross(admin2Cross).send();

    // Soft-deprecated: isOwnerOrAdmin returns true
    expect(await collectionEvm.methods.isOwnerOrAdmin(adminDeprecated).call()).to.be.true;
    // Expect isOwnerOrAdminCross return true
    expect(await collectionEvm.methods.isOwnerOrAdminCross(admin1Cross).call()).to.be.true;
    expect(await collectionEvm.methods.isOwnerOrAdminCross(admin2Cross).call()).to.be.true;
  });

  // Soft-deprecated
  itEth('(!negative tests!) Add admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const admin = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    await collectionEvm.methods.addCollectionAdmin(admin).send();

    const user = helper.eth.createAccount();
    await expect(collectionEvm.methods.addCollectionAdmin(user).call({from: admin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(admin.toLocaleLowerCase());
  });

  // Soft-deprecated
  itEth('(!negative tests!) Add admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const notAdmin = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    const user = helper.eth.createAccount();
    await expect(collectionEvm.methods.addCollectionAdmin(user).call({from: notAdmin}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });

  itEth('(!negative tests!) Add [cross] admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const [admin, notAdmin] = await helper.arrange.createAccounts([10n, 10n], donor);
    const adminCross = helper.ethCrossAccount.fromKeyringPair(admin);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdminCross(adminCross).send();

    const notAdminCross = helper.ethCrossAccount.fromKeyringPair(notAdmin);
    await expect(collectionEvm.methods.addCollectionAdminCross(notAdminCross).call({from: adminCross.eth}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(1);
    
    const admin0Cross = helper.ethCrossAccount.fromKeyringPair(adminList[0]);
    expect(admin0Cross.eth.toLocaleLowerCase())
      .to.be.eq(adminCross.eth.toLocaleLowerCase());
  });

  itEth('(!negative tests!) Add [cross] admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const notAdmin0 = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const [notAdmin1] = await helper.arrange.createAccounts([10n], donor);
    const notAdmin1Cross = helper.ethCrossAccount.fromKeyringPair(notAdmin1);
    await expect(collectionEvm.methods.addCollectionAdminCross(notAdmin1Cross).call({from: notAdmin0}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });
});

describe('Remove collection admins', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  // Soft-deprecated
  itEth('Remove admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const newAdmin = helper.eth.createAccount();
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
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

  itEth('Remove [cross] admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const [adminSub] = await helper.arrange.createAccounts([10n], donor);
    const adminEth = (await helper.eth.createAccountWithBalance(donor)).toLowerCase();
    const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
    const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);

    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdminCross(adminCrossSub).send();
    await collectionEvm.methods.addCollectionAdminCross(adminCrossEth).send();

    {
      const adminList = await helper.collection.getAdmins(collectionId);
      expect(adminList).to.deep.include({Substrate: adminSub.address});
      expect(adminList).to.deep.include({Ethereum: adminEth});
    }

    await collectionEvm.methods.removeCollectionAdminCross(adminCrossSub).send();
    await collectionEvm.methods.removeCollectionAdminCross(adminCrossEth).send();
    const adminList = await helper.collection.getAdmins(collectionId);
    expect(adminList.length).to.be.eq(0);

    // Non admin cannot mint:
    await expect(helper.nft.mintToken(adminSub, {collectionId, owner: {Substrate: adminSub.address}})).to.be.rejectedWith(/common.PublicMintingNotAllowed/);
    await expect(collectionEvm.methods.mint(adminEth).send({from: adminEth})).to.be.rejected;
  });

  // Soft-deprecated
  itEth('(!negative tests!) Remove admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

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

  // Soft-deprecated
  itEth('(!negative tests!) Remove admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

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

  itEth('(!negative tests!) Remove [cross] admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const [admin1] = await helper.arrange.createAccounts([10n], donor);
    const admin1Cross = helper.ethCrossAccount.fromKeyringPair(admin1);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdminCross(admin1Cross).send();
    
    const [admin2] = await helper.arrange.createAccounts([10n], donor);
    const admin2Cross = helper.ethCrossAccount.fromKeyringPair(admin2);
    await collectionEvm.methods.addCollectionAdminCross(admin2Cross).send();

    await expect(collectionEvm.methods.removeCollectionAdminCross(admin1Cross).call({from: admin2Cross.eth}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(2);
    expect(adminList.toString().toLocaleLowerCase())
      .to.be.deep.contains(admin1.address.toLocaleLowerCase())
      .to.be.deep.contains(admin2.address.toLocaleLowerCase());
  });

  itEth('(!negative tests!) Remove [cross] admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const [adminSub] = await helper.arrange.createAccounts([10n], donor);
    const adminSubCross = helper.ethCrossAccount.fromKeyringPair(adminSub);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.methods.addCollectionAdminCross(adminSubCross).send();
    const notAdminEth = await helper.eth.createAccountWithBalance(donor);

    await expect(collectionEvm.methods.removeCollectionAdminCross(adminSubCross).call({from: notAdminEth}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asSubstrate.toString().toLocaleLowerCase())
      .to.be.eq(adminSub.address.toLocaleLowerCase());
  });
});

// Soft-deprecated
describe('Change owner tests', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Change owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    await collectionEvm.methods.changeCollectionOwner(newOwner).send();

    expect(await collectionEvm.methods.isOwnerOrAdmin(owner).call()).to.be.false;
    expect(await collectionEvm.methods.isOwnerOrAdmin(newOwner).call()).to.be.true;
  });

  itEth('change owner call fee', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    const cost = await recordEthFee(helper, owner, () => collectionEvm.methods.changeCollectionOwner(newOwner).send());
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0);
  });

  itEth('(!negative tests!) call setOwner by non owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    await expect(collectionEvm.methods.changeCollectionOwner(newOwner).send({from: newOwner})).to.be.rejected;
    expect(await collectionEvm.methods.isOwnerOrAdmin(newOwner).call()).to.be.false;
  });
});

describe('Change substrate owner tests', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Change owner [cross]', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ownerEth = await helper.eth.createAccountWithBalance(donor);
    const ownerCrossEth = helper.ethCrossAccount.fromAddress(ownerEth);
    const [ownerSub] = await helper.arrange.createAccounts([10n], donor);
    const ownerCrossSub = helper.ethCrossAccount.fromKeyringPair(ownerSub);

    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    expect(await collectionEvm.methods.isOwnerOrAdminCross(ownerCrossSub).call()).to.be.false;

    // Can set ethereum owner:
    await collectionEvm.methods.changeCollectionOwnerCross(ownerCrossEth).send({from: owner});
    expect(await collectionEvm.methods.isOwnerOrAdminCross(ownerCrossEth).call()).to.be.true;
    expect(await helper.collection.getData(collectionId))
      .to.have.property('normalizedOwner').that.is.eq(helper.address.ethToSubstrate(ownerEth));
    
    // Can set Substrate owner:
    await collectionEvm.methods.changeCollectionOwnerCross(ownerCrossSub).send({from: ownerEth});
    expect(await collectionEvm.methods.isOwnerOrAdminCross(ownerCrossSub).call()).to.be.true;
    expect(await helper.collection.getData(collectionId))
      .to.have.property('normalizedOwner').that.is.eq(helper.address.normalizeSubstrate(ownerSub.address));
  });

  itEth.skip('change owner call fee', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const [newOwner] = await helper.arrange.createAccounts([10n], donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const cost = await recordEthFee(helper, owner, () => collectionEvm.methods.setOwnerSubstrate(newOwner.addressRaw).send());
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0);
  });

  itEth('(!negative tests!) call setOwner by non owner [cross]', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const otherReceiver = await helper.eth.createAccountWithBalance(donor);
    const [newOwner] = await helper.arrange.createAccounts([10n], donor);
    const newOwnerCross = helper.ethCrossAccount.fromKeyringPair(newOwner);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    await expect(collectionEvm.methods.changeCollectionOwnerCross(newOwnerCross).send({from: otherReceiver})).to.be.rejected;
    expect(await collectionEvm.methods.isOwnerOrAdminCross(newOwnerCross).call()).to.be.false;
  });
});
