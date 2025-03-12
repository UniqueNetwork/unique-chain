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

import type {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';
import {Pallets} from '@unique/test-utils/util.js';
import type {IEthCrossAccountId} from '@unique-nft/playgrounds/types.js';
import {usingEthPlaygrounds, itEth, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {CreateCollectionData} from '@unique/test-utils/eth/types.js';

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
      donor = await privateKey({url: import.meta.url});
    });
  });

  [
    // {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    // {mode: 'ft' as const, requiredPallets: []},
  ].map(testCase => {
    itEth.ifWithPallets(`PAM can add account admin by owner for ${testCase.mode}`, testCase.requiredPallets, async ({helper, privateKey}) => {
      // arrange
      const owner = await helper.eth.createAccountWithBalance(donor);
      const adminSub = await privateKey('//admin2');
      const adminEth = helper.eth.createAccount();

      const adminDeprecated = helper.eth.createAccount();
      const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
      const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);

      const {collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('A', 'B', 'C', testCase.mode)).send();
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner, true);

      // Check isOwnerOrAdminCross returns false:
      expect(await collectionEvm.isOwnerOrAdminCross.staticCall(adminCrossSub)).to.be.false;
      expect(await collectionEvm.isOwnerOrAdminCross.staticCall(adminCrossEth)).to.be.false;
      expect(await collectionEvm.isOwnerOrAdminCross.staticCall(helper.ethCrossAccount.fromAddress(adminDeprecated))).to.be.false;

      // Soft-deprecated: can addCollectionAdmin
      await (await collectionEvm.addCollectionAdmin.send(adminDeprecated)).wait(...waitParams);
      // Can addCollectionAdminCross for substrate and ethereum address
      await (await collectionEvm.addCollectionAdminCross.send(adminCrossSub)).wait(...waitParams);
      await (await collectionEvm.addCollectionAdminCross.send(adminCrossEth)).wait(...waitParams);

      // 1. Expect api.rpc.unique.adminlist returns admins:
      const adminListRpc = await helper.collection.getAdmins(collectionId);
      expect(adminListRpc).to.has.length(3);
      expect(adminListRpc).to.be.deep.contain.members([
        {Ethereum: adminDeprecated.address.toLowerCase()},
        {Ethereum: adminEth.address.toLowerCase()},
        {Substrate: adminSub.address},
      ]);

      // 2. Expect methods.collectionAdmins == api.rpc.unique.adminlist
      let adminListEth = await collectionEvm.collectionAdmins.staticCall();
      adminListEth = adminListEth.map((element: IEthCrossAccountId) => helper.address.convertCrossAccountFromEthCrossAccount(element));
      expect(adminListRpc).to.be.like(adminListEth);

      // 3. check isOwnerOrAdminCross returns true:
      expect(await collectionEvm.isOwnerOrAdminCross.staticCall(adminCrossSub)).to.be.true;
      expect(await collectionEvm.isOwnerOrAdminCross.staticCall(adminCrossEth)).to.be.true;
      expect(await collectionEvm.isOwnerOrAdminCross.staticCall(helper.ethCrossAccount.fromAddress(adminDeprecated))).to.be.true;
    });
  });

  itEth('cross account admin can mint', async ({helper}) => {
    // arrange: create collection and accounts
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleNFTCollection(owner, 'Mint collection', 'a', 'b', 'uri');
    const adminEth = (await helper.eth.createAccountWithBalance(donor));
    const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);
    const [adminSub] = await helper.arrange.createAccounts([100n], donor);
    const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    const adminCollectionEvm = helper.eth.changeContractCaller(collectionEvm, adminEth);

    // cannot mint while not admin
    await expect(adminCollectionEvm.mint.send(owner)).to.be.rejected;
    await expect(helper.nft.mintToken(adminSub, {collectionId, owner: {Ethereum: owner.address}})).to.be.rejectedWith(/common.PublicMintingNotAllowed/);

    // admin (sub and eth) can mint token:
    await (await collectionEvm.addCollectionAdminCross.send(adminCrossEth)).wait(...waitParams);
    await (await collectionEvm.addCollectionAdminCross.send(adminCrossSub)).wait(...waitParams);

    await (await adminCollectionEvm.mint.send(owner)).wait(...waitParams);
    await helper.nft.mintToken(adminSub, {collectionId, owner: {Ethereum: owner.address}});

    expect(await helper.collection.getLastTokenId(collectionId)).to.eq(2);
  });

  itEth('cannot add invalid cross account admin', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const [admin] = await helper.arrange.createAccounts([100n, 100n], donor);

    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const adminCross = {
      eth: helper.address.substrateToEth(admin.address),
      sub: admin.addressRaw,
    };
    await expect(collectionEvm.addCollectionAdminCross.send(adminCross)).to.be.rejected;
  });

  itEth('can verify owner with methods.isOwnerOrAdmin[Cross]', async ({helper, privateKey}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const adminDeprecated = helper.eth.createAccount();
    const admin1Cross = helper.ethCrossAccount.fromKeyringPair(await privateKey('admin'));
    const admin2Cross = helper.ethCrossAccount.fromAddress(helper.address.substrateToEth((await privateKey('admin3')).address));
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    // Soft-deprecated:
    expect(await collectionEvm.isOwnerOrAdmin.staticCall(adminDeprecated)).to.be.false;
    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(admin1Cross)).to.be.false;
    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(admin2Cross)).to.be.false;

    await (await collectionEvm.addCollectionAdmin.send(adminDeprecated)).wait(...waitParams);
    await (await collectionEvm.addCollectionAdminCross.send(admin1Cross)).wait(...waitParams);
    await (await collectionEvm.addCollectionAdminCross.send(admin2Cross)).wait(...waitParams);

    // Soft-deprecated: isOwnerOrAdmin returns true
    expect(await collectionEvm.isOwnerOrAdmin.staticCall(adminDeprecated)).to.be.true;
    // Expect isOwnerOrAdminCross return true
    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(admin1Cross)).to.be.true;
    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(admin2Cross)).to.be.true;
  });

  // Soft-deprecated
  itEth('(!negative tests!) Add admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const admin = await helper.eth.createAccountWithBalance(donor);
    
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    await (await collectionEvm.addCollectionAdmin.send(admin)).wait(...waitParams);

    const user = helper.eth.createAccount();
    const adminCollectionEvm = helper.eth.changeContractCaller(collectionEvm, admin)
    await expect(adminCollectionEvm.addCollectionAdmin.staticCall(user))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(1);
    expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
      .to.be.eq(admin.address.toLocaleLowerCase());
  });

  // Soft-deprecated
  itEth('(!negative tests!) Add admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const notAdmin = await helper.eth.createAccountWithBalance(donor);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    const user = helper.eth.createAccount();
    const notAdminCollectionEvm = helper.eth.changeContractCaller(collectionEvm, notAdmin)
    await expect(notAdminCollectionEvm.addCollectionAdmin.staticCall(user))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });

  itEth('(!negative tests!) Add [cross] admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const [admin, notAdmin] = await helper.arrange.createAccounts([10n, 10n], donor);
    const adminCross = helper.ethCrossAccount.fromKeyringPair(admin);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await (await collectionEvm.addCollectionAdminCross.send(adminCross)).wait(...waitParams);

    const notAdminCross = helper.ethCrossAccount.fromKeyringPair(notAdmin);
    await expect(collectionEvm.addCollectionAdminCross.staticCall(notAdminCross, {from: adminCross.eth}))
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
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const [notAdmin1] = await helper.arrange.createAccounts([10n], donor);
    const notAdmin1Cross = helper.ethCrossAccount.fromKeyringPair(notAdmin1);
    await expect(collectionEvm.addCollectionAdminCross.staticCall(notAdmin1Cross, {from: notAdmin0}))
      .to.be.rejectedWith('NoPermission');

    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });
});

describe('Remove collection admins', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  // Soft-deprecated
  itEth('Remove admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const newAdmin = helper.eth.createAccount();
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    await (await collectionEvm.addCollectionAdmin.send(newAdmin)).wait(...waitParams);

    {
      const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
      expect(adminList.length).to.be.eq(1);
      expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
        .to.be.eq(newAdmin.address.toLocaleLowerCase());
    }

    await (await collectionEvm.removeCollectionAdmin.send(newAdmin)).wait(...waitParams);
    const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
    expect(adminList.length).to.be.eq(0);
  });

  itEth('Remove [cross] admin by owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const [adminSub] = await helper.arrange.createAccounts([10n], donor);
    const adminEth = await helper.eth.createAccountWithBalance(donor);
    const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
    const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);

    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await (await collectionEvm.addCollectionAdminCross.send(adminCrossSub)).wait(...waitParams);
    await (await collectionEvm.addCollectionAdminCross.send(adminCrossEth)).wait(...waitParams);

    {
      const adminList = await helper.collection.getAdmins(collectionId);
      expect(adminList).to.deep.include({Substrate: adminSub.address});
      expect(adminList).to.deep.include({Ethereum: adminEth.address.toLowerCase()});
    }

    await (await collectionEvm.removeCollectionAdminCross.send(adminCrossSub)).wait(...waitParams);
    await (await collectionEvm.removeCollectionAdminCross.send(adminCrossEth)).wait(...waitParams);
    const adminList = await helper.collection.getAdmins(collectionId);
    expect(adminList.length).to.be.eq(0);

    // Non admin cannot mint:
    await expect(helper.nft.mintToken(adminSub, {collectionId, owner: {Substrate: adminSub.address}})).to.be.rejectedWith(/common.PublicMintingNotAllowed/);
    await expect(collectionEvm.mint.send(adminEth, {from: adminEth})).to.be.rejected;
  });

  // Soft-deprecated
  itEth('(!negative tests!) Remove admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    const admin0 = await helper.eth.createAccountWithBalance(donor);
    await (await collectionEvm.addCollectionAdmin.send(admin0)).wait(...waitParams);

    const admin1 = await helper.eth.createAccountWithBalance(donor);
    await (await collectionEvm.addCollectionAdmin.send(admin1)).wait(...waitParams);

    await expect(collectionEvm.removeCollectionAdmin.staticCall(admin1, {from: admin0}))
      .to.be.rejectedWith('NoPermission');
    {
      const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
      expect(adminList.length).to.be.eq(2);
      expect(adminList.toString().toLocaleLowerCase())
        .to.be.deep.contains(admin0.address.toLocaleLowerCase())
        .to.be.deep.contains(admin1.address.toLocaleLowerCase());
    }
  });

  // Soft-deprecated
  itEth('(!negative tests!) Remove admin by USER is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    const admin = await helper.eth.createAccountWithBalance(donor);
    await (await collectionEvm.addCollectionAdmin.send(admin)).wait(...waitParams);

    const notAdmin = helper.eth.createAccount();

    await expect(collectionEvm.removeCollectionAdmin.staticCall(admin, {from: notAdmin}))
      .to.be.rejectedWith('NoPermission');
    {
      const adminList = await helper.callRpc('api.rpc.unique.adminlist', [collectionId]);
      expect(adminList[0].asEthereum.toString().toLocaleLowerCase())
        .to.be.eq(admin.address.toLocaleLowerCase());
      expect(adminList.length).to.be.eq(1);
    }
  });

  itEth('(!negative tests!) Remove [cross] admin by ADMIN is not allowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

    const [admin1] = await helper.arrange.createAccounts([10n], donor);
    const admin1Cross = helper.ethCrossAccount.fromKeyringPair(admin1);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await (await collectionEvm.addCollectionAdminCross.send(admin1Cross)).wait(...waitParams);

    const [admin2] = await helper.arrange.createAccounts([10n], donor);
    const admin2Cross = helper.ethCrossAccount.fromKeyringPair(admin2);
    await (await collectionEvm.addCollectionAdminCross.send(admin2Cross)).wait(...waitParams);

    await expect(collectionEvm.removeCollectionAdminCross.staticCall(admin1Cross, {from: admin2Cross.eth}))
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
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    await collectionEvm.addCollectionAdminCross.send(adminSubCross);
    const notAdminEth = await helper.eth.createAccountWithBalance(donor);

    const notAdminCollectionEvm = helper.eth.changeContractCaller(collectionEvm, notAdminEth);
    await expect(notAdminCollectionEvm.removeCollectionAdminCross.staticCall(adminSubCross))
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
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Change owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    await (await collectionEvm.changeCollectionOwner.send(newOwner)).wait(...waitParams);

    expect(await collectionEvm.isOwnerOrAdmin.staticCall(owner)).to.be.false;
    expect(await collectionEvm.isOwnerOrAdmin.staticCall(newOwner)).to.be.true;
  });

  itEth('change owner call fee', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);
    const cost = await recordEthFee(
      helper,
      owner.address,
      async () => await (await collectionEvm.changeCollectionOwner.send(newOwner)).wait(...waitParams),
    );
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0);
  });

  itEth('(!negative tests!) call setOwner by non owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const newOwner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

    const notAdminCollectionEvm = helper.eth.changeContractCaller(collectionEvm, newOwner);
    await expect(notAdminCollectionEvm.changeCollectionOwner.send(newOwner)).to.be.rejected;

    expect(await collectionEvm.isOwnerOrAdmin.staticCall(newOwner)).to.be.false;
  });
});

describe('Change substrate owner tests', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Change owner [cross]', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const ownerEth = await helper.eth.createAccountWithBalance(donor);
    const ownerCrossEth = helper.ethCrossAccount.fromAddress(ownerEth);
    const [ownerSub] = await helper.arrange.createAccounts([10n], donor);
    const ownerCrossSub = helper.ethCrossAccount.fromKeyringPair(ownerSub);

    const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(ownerCrossSub)).to.be.false;

    // Can set ethereum owner:
    await (await collectionEvm.changeCollectionOwnerCross.send(ownerCrossEth)).wait(...waitParams);
    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(ownerCrossEth)).to.be.true;
    expect(await helper.collection.getData(collectionId))
      .to.have.property('normalizedOwner').that.is.eq(helper.address.ethToSubstrate(ownerEth));

    // Can set Substrate owner:
    await (await collectionEvm.changeCollectionOwnerCross.send(ownerCrossSub)).wait(...waitParams);
    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(ownerCrossSub)).to.be.true;
    expect(await helper.collection.getData(collectionId))
      .to.have.property('normalizedOwner').that.is.eq(helper.address.normalizeSubstrate(ownerSub.address));
  });

  itEth.skip('change owner call fee', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const [newOwner] = await helper.arrange.createAccounts([10n], donor);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const cost = await recordEthFee(
      helper,
      owner.address,
      async () => await (await collectionEvm.setOwnerSubstrate.send(newOwner.addressRaw)).wait(...waitParams),
    );
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
    expect(cost > 0);
  });

  itEth('(!negative tests!) call setOwner by non owner [cross]', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const otherReceiver = await helper.eth.createAccountWithBalance(donor);
    const [newOwner] = await helper.arrange.createAccounts([10n], donor);
    const newOwnerCross = helper.ethCrossAccount.fromKeyringPair(newOwner);
    const {collectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const otherCollectionEvm = helper.eth.changeContractCaller(collectionEvm, otherReceiver);
    await expect(otherCollectionEvm.changeCollectionOwnerCross.send(newOwnerCross)).to.be.rejected;

    expect(await collectionEvm.isOwnerOrAdminCross.staticCall(newOwnerCross)).to.be.false;
  });
});
