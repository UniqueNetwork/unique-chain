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
import {usingPlaygrounds, expect, itSub} from './util/playgrounds';

describe('Integration Test ext. Allow list tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itSub('Owner can add address to allow list', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    const allowList = await helper.nft.getAllowList(collectionId);
    expect(allowList).to.be.deep.contains({Substrate: bob.address});
  });

  itSub('Admin can add address to allow list', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addAdmin(alice, collectionId, {Substrate: bob.address});

    await helper.nft.addToAllowList(bob, collectionId, {Substrate: charlie.address});
    const allowList = await helper.nft.getAllowList(collectionId);
    expect(allowList).to.be.deep.contains({Substrate: charlie.address});
  });

  itSub('Non-privileged user cannot add address to allow list', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const addToAllowListTx = async () => helper.nft.addToAllowList(bob, collectionId, {Substrate: charlie.address});
    await expect(addToAllowListTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Nobody can add address to allow list of non-existing collection', async ({helper}) => {
    const collectionId = (1<<32) - 1;
    const addToAllowListTx = async () => helper.nft.addToAllowList(bob, collectionId, {Substrate: charlie.address});
    await expect(addToAllowListTx()).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Nobody can add address to allow list of destroyed collection', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.collection.burn(alice, collectionId);
    const addToAllowListTx = async () => helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    await expect(addToAllowListTx()).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('If address is already added to allow list, nothing happens', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    const allowList = await helper.nft.getAllowList(collectionId);
    expect(allowList).to.be.deep.contains({Substrate: bob.address});
  });

  itSub('Owner can remove address from allow list', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});

    await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address});

    const allowList = await helper.nft.getAllowList(collectionId);

    expect(allowList).to.be.not.deep.contains({Substrate: bob.address});
  });

  itSub('Admin can remove address from allow list', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addAdmin(alice, collectionId, {Substrate: charlie.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    await helper.collection.removeFromAllowList(charlie, collectionId, {Substrate: bob.address});

    const allowList = await helper.nft.getAllowList(collectionId);

    expect(allowList).to.be.not.deep.contains({Substrate: bob.address});
  });

  itSub('Non-privileged user cannot remove address from allow list', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
    const removeTx = async () => helper.collection.removeFromAllowList(bob, collectionId, {Substrate: charlie.address});
    await expect(removeTx()).to.be.rejectedWith(/common\.NoPermission/);
    const allowList = await helper.nft.getAllowList(collectionId);

    expect(allowList).to.be.deep.contains({Substrate: charlie.address});
  });

  itSub('Nobody can remove address from allow list of non-existing collection', async ({helper}) => {
    const collectionId = (1<<32) - 1;
    const removeTx = async () => helper.collection.removeFromAllowList(bob, collectionId, {Substrate: charlie.address});
    await expect(removeTx()).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Nobody can remove address from allow list of deleted collection', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    await helper.collection.burn(alice, collectionId);
    const removeTx = async () => helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address});

    await expect(removeTx()).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('If address is already removed from allow list, nothing happens', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address});
    const allowListBefore = await helper.nft.getAllowList(collectionId);
    expect(allowListBefore).to.be.not.deep.contains({Substrate: bob.address});

    await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: bob.address});

    const allowListAfter = await helper.nft.getAllowList(collectionId);
    expect(allowListAfter).to.be.not.deep.contains({Substrate: bob.address});
  });

  itSub('If Public Access mode is set to AllowList, tokens can’t be transferred from a non-allowlisted address with transfer or transferFrom. Test1', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});

    const transferResult = async () => helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    await expect(transferResult()).to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });

  itSub('If Public Access mode is set to AllowList, tokens can’t be transferred from a non-allowlisted address with transfer or transferFrom. Test2', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
    await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: alice.address});

    const transferResult = async () => helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    await expect(transferResult()).to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });

  itSub('If Public Access mode is set to AllowList, tokens can’t be transferred to a non-allowlisted address with transfer or transferFrom. Test1', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});

    const transferResult = async () => helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    await expect(transferResult()).to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });

  itSub('If Public Access mode is set to AllowList, tokens can’t be transferred to a non-allowlisted address with transfer or transferFrom. Test2', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});

    await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    await helper.collection.removeFromAllowList(alice, collectionId, {Substrate: alice.address});

    const transferResult = async () => helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    await expect(transferResult()).to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });

  itSub('If Public Access mode is set to AllowList, tokens can’t be destroyed by a non-allowlisted address (even if itSub owned them before enabling AllowList mode)', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    const burnTx = async () => helper.nft.burnToken(bob, collectionId, tokenId);
    await expect(burnTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('If Public Access mode is set to AllowList, token transfers can’t be Approved by a non-allowlisted address (see Approve method)', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    const approveTx = async () => helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: bob.address});
    await expect(approveTx()).to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });

  itSub('If Public Access mode is set to AllowList, tokens can be transferred to a allowlisted address with transfer.', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
    await helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner.Substrate).to.be.equal(charlie.address);
  });

  itSub('If Public Access mode is set to AllowList, tokens can be transferred to a allowlisted address with transferFrom.', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
    await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});

    await helper.nft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: alice.address}, {Substrate: charlie.address});
    const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner.Substrate).to.be.equal(charlie.address);
  });

  itSub('If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transfer', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});

    await helper.nft.transferToken(alice, collectionId, tokenId, {Substrate: charlie.address});
    const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner.Substrate).to.be.equal(charlie.address);
  });

  itSub('If Public Access mode is set to AllowList, tokens can be transferred from a allowlisted address with transferFrom', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList'});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: alice.address});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: charlie.address});
    await helper.nft.approveToken(alice, collectionId, tokenId, {Substrate: charlie.address});

    await helper.nft.transferTokenFrom(alice, collectionId, tokenId, {Substrate: alice.address}, {Substrate: charlie.address});
    const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner.Substrate).to.be.equal(charlie.address);
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by owner', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: false});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    const token = await helper.nft.getToken(collectionId, tokenId);
    expect(token).to.be.not.null;
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens can be created by admin', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: false});
    await helper.collection.addAdmin(alice, collectionId, {Substrate: bob.address});
    const {tokenId} = await helper.nft.mintToken(bob, {collectionId: collectionId, owner: bob.address});
    const token = await helper.nft.getToken(collectionId, tokenId);
    expect(token).to.be.not.null;
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and allow-listed address', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: false});
    await helper.collection.addToAllowList(alice, collectionId, {Substrate: bob.address});
    const mintTokenTx = async () => helper.nft.mintToken(bob, {collectionId: collectionId, owner: bob.address});
    await expect(mintTokenTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to false, tokens cannot be created by non-privileged and non-allow listed address', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: false});
    const mintTokenTx = async () => helper.nft.mintToken(bob, {collectionId: collectionId, owner: bob.address});
    await expect(mintTokenTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by owner', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: true});
    const {tokenId} = await helper.nft.mintToken(alice, {collectionId: collectionId, owner: alice.address});
    const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner.Substrate).to.be.equal(alice.address);
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by admin', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: true});
    await helper.nft.addAdmin(alice, collectionId, {Substrate: bob.address});
    const {tokenId} = await helper.nft.mintToken(bob, {collectionId: collectionId, owner: bob.address});
    const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner.Substrate).to.be.equal(bob.address);
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens cannot be created by non-privileged and non-allow listed address', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: true});
    const mintTokenTx = async () => helper.nft.mintToken(bob, {collectionId: collectionId, owner: bob.address});
    await expect(mintTokenTx()).to.be.rejectedWith(/common\.AddressNotInAllowlist/);
  });

  itSub('If Public Access mode is set to AllowList, and Mint Permission is set to true, tokens can be created by non-privileged and allow listed address', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await helper.nft.setPermissions(alice, collectionId, {access: 'AllowList', mintMode: true});
    await helper.nft.addToAllowList(alice, collectionId, {Substrate: bob.address});
    const {tokenId} = await helper.nft.mintToken(bob, {collectionId: collectionId, owner: bob.address});
    const owner = await helper.nft.getTokenOwner(collectionId, tokenId);
    expect(owner.Substrate).to.be.equal(bob.address);
  });
});
