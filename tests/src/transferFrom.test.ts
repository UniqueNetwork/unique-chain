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
import {itSub, Pallets, usingPlaygrounds, expect} from './util/playgrounds';

describe('Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob, charlie] = await helper.arrange.createAccounts([20n, 10n, 10n], donor);
    });
  });

  itSub('[nft] Execute the extrinsic and check nftItemList - owner of token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-1', description: '', tokenPrefix: 'TF'});
    const nft = await collection.mintToken(alice);
    await nft.approve(alice, {Substrate: bob.address});
    expect(await nft.isApproved({Substrate: bob.address})).to.be.true;

    await nft.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address});
    expect(await nft.getOwner()).to.be.deep.equal({Substrate: charlie.address});
  });

  itSub('[fungible] Execute the extrinsic and check nftItemList - owner of token', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'TransferFrom-2', description: '', tokenPrefix: 'TF'});
    await collection.mint(alice, 10n);
    await collection.approveTokens(alice, {Substrate: bob.address}, 7n);
    expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(7n);
    
    await collection.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}, 6n);
    expect(await collection.getBalance({Substrate: charlie.address})).to.be.equal(6n);
    expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(4n);
    expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(1n);
  });

  itSub.ifWithPallets('[refungible] Execute the extrinsic and check nftItemList - owner of token', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'TransferFrom-3', description: '', tokenPrefix: 'TF'});
    const rft = await collection.mintToken(alice, 10n);
    await rft.approve(alice, {Substrate: bob.address}, 7n);
    expect(await rft.getApprovedPieces({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(7n);
    
    await rft.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}, 6n);
    expect(await rft.getBalance({Substrate: charlie.address})).to.be.equal(6n);
    expect(await rft.getBalance({Substrate: alice.address})).to.be.equal(4n);
    expect(await rft.getApprovedPieces({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(1n);
  });

  itSub('Should reduce allowance if value is big', async ({helper}) => {
    // fungible
    const collection = await helper.ft.mintCollection(alice, {name: 'TransferFrom-4', description: '', tokenPrefix: 'TF'});
    await collection.mint(alice, 500000n);

    await collection.approveTokens(alice, {Substrate: bob.address}, 500000n);
    expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(500000n);
    await collection.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}, 500000n);
    expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(0n);
  });

  itSub('can be called by collection owner on non-owned item when OwnerCanTransfer == true', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-5', description: '', tokenPrefix: 'TF'});
    await collection.setLimits(alice, {ownerCanTransfer: true});

    const nft = await collection.mintToken(alice, {Substrate: bob.address});
    await nft.transferFrom(alice, {Substrate: bob.address}, {Substrate: charlie.address});
    expect(await nft.getOwner()).to.be.deep.equal({Substrate: charlie.address});
  });
});

describe('Negative Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob, charlie] = await helper.arrange.createAccounts([50n, 10n, 10n], donor);
    });
  });

  itSub('transferFrom for a collection that does not exist', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.collection.approveToken(alice, collectionId, 0, {Substrate: bob.address}, 1n))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
    await expect(helper.collection.transferTokenFrom(bob, collectionId, 0, {Substrate: alice.address}, {Substrate: bob.address}, 1n))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  /* itSub('transferFrom for a collection that was destroyed', async ({helper}) => {
      this test copies approve negative test
  }); */

  /* itSub('transferFrom a token that does not exist', async ({helper}) => {
    this test copies approve negative test
  }); */

  /* itSub('transferFrom a token that was deleted', async ({helper}) => {
    this test copies approve negative test
  }); */

  itSub('[nft] transferFrom for not approved address', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-Neg-1', description: '', tokenPrefix: 'TF'});
    const nft = await collection.mintToken(alice);

    await expect(nft.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await nft.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('[fungible] transferFrom for not approved address', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'TransferFrom-Neg-1', description: '', tokenPrefix: 'TF'});
    await collection.mint(alice, 10n);

    await expect(collection.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}, 5n))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await collection.getBalance({Substrate: alice.address})).to.be.deep.equal(10n);
    expect(await collection.getBalance({Substrate: bob.address})).to.be.deep.equal(0n);
    expect(await collection.getBalance({Substrate: charlie.address})).to.be.deep.equal(0n);
  });

  itSub.ifWithPallets('[refungible] transferFrom for not approved address', [Pallets.ReFungible], async({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'TransferFrom-Neg-3', description: '', tokenPrefix: 'TF'});
    const rft = await collection.mintToken(alice, 10n);

    await expect(rft.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await rft.getBalance({Substrate: alice.address})).to.be.deep.equal(10n);
    expect(await rft.getBalance({Substrate: bob.address})).to.be.deep.equal(0n);
    expect(await rft.getBalance({Substrate: charlie.address})).to.be.deep.equal(0n);
  });

  itSub('[nft] transferFrom incorrect token count', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-Neg-4', description: '', tokenPrefix: 'TF'});
    const nft = await collection.mintToken(alice);

    await nft.approve(alice, {Substrate: bob.address});
    expect(await nft.isApproved({Substrate: bob.address})).to.be.true;

    await expect(helper.collection.transferTokenFrom(
      bob, 
      collection.collectionId, 
      nft.tokenId, 
      {Substrate: alice.address}, 
      {Substrate: charlie.address}, 
      2n,
    )).to.be.rejectedWith(/nonfungible\.NonfungibleItemsHaveNoAmount/);
    expect(await nft.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('[fungible] transferFrom incorrect token count', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'TransferFrom-Neg-5', description: '', tokenPrefix: 'TF'});
    await collection.mint(alice, 10n);

    await collection.approveTokens(alice, {Substrate: bob.address}, 2n);
    expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.eq(2n);

    await expect(collection.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}, 5n))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await collection.getBalance({Substrate: alice.address})).to.be.deep.equal(10n);
    expect(await collection.getBalance({Substrate: bob.address})).to.be.deep.equal(0n);
    expect(await collection.getBalance({Substrate: charlie.address})).to.be.deep.equal(0n);
  });

  itSub.ifWithPallets('[refungible] transferFrom incorrect token count', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'TransferFrom-Neg-6', description: '', tokenPrefix: 'TF'});
    const rft = await collection.mintToken(alice, 10n);

    await rft.approve(alice, {Substrate: bob.address}, 5n);
    expect(await rft.getApprovedPieces({Substrate: alice.address}, {Substrate: bob.address})).to.be.eq(5n);

    await expect(rft.transferFrom(bob, {Substrate: alice.address}, {Substrate: charlie.address}, 7n))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await rft.getBalance({Substrate: alice.address})).to.be.deep.equal(10n);
    expect(await rft.getBalance({Substrate: bob.address})).to.be.deep.equal(0n);
    expect(await rft.getBalance({Substrate: charlie.address})).to.be.deep.equal(0n);
  });

  itSub('[nft] execute transferFrom from account that is not owner of collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-Neg-7', description: '', tokenPrefix: 'TF'});
    const nft = await collection.mintToken(alice);

    await expect(nft.approve(charlie, {Substrate: bob.address})).to.be.rejectedWith(/common\.CantApproveMoreThanOwned/);
    expect(await nft.isApproved({Substrate: bob.address})).to.be.false;

    await expect(nft.transferFrom(
      charlie,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await nft.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('[fungible] execute transferFrom from account that is not owner of collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'TransferFrom-Neg-8', description: '', tokenPrefix: 'TF'});
    await collection.mint(alice, 10000n);

    await expect(collection.approveTokens(charlie, {Substrate: bob.address}, 1n)).to.be.rejectedWith(/common\.CantApproveMoreThanOwned/);
    expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.eq(0n);
    expect(await collection.getApprovedTokens({Substrate: charlie.address}, {Substrate: bob.address})).to.be.eq(0n);

    await expect(collection.transferFrom(
      charlie,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await collection.getBalance({Substrate: alice.address})).to.be.deep.equal(10000n);
    expect(await collection.getBalance({Substrate: bob.address})).to.be.deep.equal(0n);
    expect(await collection.getBalance({Substrate: charlie.address})).to.be.deep.equal(0n);
  });

  itSub.ifWithPallets('[refungible] execute transferFrom from account that is not owner of collection', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'TransferFrom-Neg-9', description: '', tokenPrefix: 'TF'});
    const rft = await collection.mintToken(alice, 10000n);

    await expect(rft.approve(charlie, {Substrate: bob.address}, 1n)).to.be.rejectedWith(/common\.CantApproveMoreThanOwned/);
    expect(await rft.getApprovedPieces({Substrate: alice.address}, {Substrate: bob.address})).to.be.eq(0n);
    expect(await rft.getApprovedPieces({Substrate: charlie.address}, {Substrate: bob.address})).to.be.eq(0n);

    await expect(rft.transferFrom(
      charlie,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await rft.getBalance({Substrate: alice.address})).to.be.deep.equal(10000n);
    expect(await rft.getBalance({Substrate: bob.address})).to.be.deep.equal(0n);
    expect(await rft.getBalance({Substrate: charlie.address})).to.be.deep.equal(0n);
  });

  itSub('transferFrom burnt token before approve NFT', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-Neg-10', description: '', tokenPrefix: 'TF'});
    await collection.setLimits(alice, {ownerCanTransfer: true});
    const nft = await collection.mintToken(alice);

    await nft.burn(alice);
    await expect(nft.approve(alice, {Substrate: bob.address})).to.be.rejectedWith(/common\.TokenNotFound/);

    await expect(nft.transferFrom(
      bob,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
  });

  itSub('transferFrom burnt token before approve Fungible', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'TransferFrom-Neg-11', description: '', tokenPrefix: 'TF'});
    await collection.setLimits(alice, {ownerCanTransfer: true});
    await collection.mint(alice, 10n);

    await collection.burnTokens(alice, 10n);
    await expect(collection.approveTokens(alice, {Substrate: bob.address})).to.be.not.rejected;

    await expect(collection.transferFrom(
      alice,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub.ifWithPallets('transferFrom burnt token before approve ReFungible', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'TransferFrom-Neg-12', description: '', tokenPrefix: 'TF'});
    await collection.setLimits(alice, {ownerCanTransfer: true});
    const rft = await collection.mintToken(alice, 10n);

    await rft.burn(alice, 10n);
    await expect(rft.approve(alice, {Substrate: bob.address})).to.be.rejectedWith(/common\.CantApproveMoreThanOwned/);

    await expect(rft.transferFrom(
      alice,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub('transferFrom burnt token after approve NFT', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-Neg-13', description: '', tokenPrefix: 'TF'});
    const nft = await collection.mintToken(alice);

    await nft.approve(alice, {Substrate: bob.address});
    expect(await nft.isApproved({Substrate: bob.address})).to.be.true;

    await nft.burn(alice);

    await expect(nft.transferFrom(
      bob,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
  });

  itSub('transferFrom burnt token after approve Fungible', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'TransferFrom-Neg-14', description: '', tokenPrefix: 'TF'});
    await collection.mint(alice, 10n);

    await collection.approveTokens(alice, {Substrate: bob.address});
    expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.eq(1n);

    await collection.burnTokens(alice, 10n);

    await expect(collection.transferFrom(
      bob,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub.ifWithPallets('transferFrom burnt token after approve ReFungible', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'TransferFrom-Neg-15', description: '', tokenPrefix: 'TF'});
    const rft = await collection.mintToken(alice, 10n);

    await rft.approve(alice, {Substrate: bob.address}, 10n);
    expect(await rft.getApprovedPieces({Substrate: alice.address}, {Substrate: bob.address})).to.be.eq(10n);

    await rft.burn(alice, 10n);

    await expect(rft.transferFrom(
      bob,
      {Substrate: alice.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
  });

  itSub('fails when called by collection owner on non-owned item when OwnerCanTransfer == false', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'TransferFrom-Neg-16', description: '', tokenPrefix: 'TF'});
    const nft = await collection.mintToken(alice, {Substrate: bob.address});

    await collection.setLimits(alice, {ownerCanTransfer: false});

    await expect(nft.transferFrom(
      alice,
      {Substrate: bob.address}, 
      {Substrate: charlie.address},
    )).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
  });
});
