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
import {expect, itSub, Pallets, usingPlaygrounds} from '../util/playgrounds';

describe('Integration Test: Composite nesting tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('Performs the full suite: bundles a token, transfers, and unnests', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Create an immediately nested token
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
    
    // Create a token to be nested
    const newToken = await collection.mintToken(alice);

    // Nest
    await newToken.nest(alice, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());

    // Move bundle to different user
    await targetToken.transfer(alice, {Substrate: bob.address});
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());

    // Unnest
    await newToken.unnest(bob, targetToken, {Substrate: bob.address});
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSub('Transfers an already bundled token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const tokenA = await collection.mintToken(alice);
    const tokenB = await collection.mintToken(alice);

    // Create a nested token
    const tokenC = await collection.mintToken(alice, tokenA.nestingAccount());
    expect(await tokenC.getOwner()).to.be.deep.equal(tokenA.nestingAccount());
    
    // Transfer the nested token to another token
    await expect(tokenC.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount())).to.be.fulfilled;
    expect(await tokenC.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await tokenC.getOwner()).to.be.deep.equal(tokenB.nestingAccount());
  });

  itSub('Checks token children', async ({helper}) => {
    const collectionA = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const collectionB = await helper.ft.mintCollection(alice);
    
    const targetToken = await collectionA.mintToken(alice);
    expect((await targetToken.getChildren()).length).to.be.equal(0, 'Children length check at creation');

    // Create a nested NFT token
    const tokenA = await collectionA.mintToken(alice, targetToken.nestingAccount());
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
    ], 'Children contents check at nesting #1').and.be.length(1, 'Children length check at nesting #1');

    // Create then nest
    const tokenB = await collectionA.mintToken(alice);
    await tokenB.nest(alice, targetToken);
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: tokenB.tokenId, collectionId: collectionA.collectionId},
    ], 'Children contents check at nesting #2').and.be.length(2, 'Children length check at nesting #2');

    // Move token B to a different user outside the nesting tree
    await tokenB.unnest(alice, targetToken, {Substrate: bob.address});
    expect(await targetToken.getChildren()).to.be.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
    ], 'Children contents check at nesting #3 (unnesting)').and.be.length(1, 'Children length check at nesting #3 (unnesting)');

    // Create a fungible token in another collection and then nest
    await collectionB.mint(alice, 10n);
    await collectionB.transfer(alice, targetToken.nestingAccount(), 2n);
    expect(await targetToken.getChildren()).to.be.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: 0, collectionId: collectionB.collectionId},
    ], 'Children contents check at nesting #4 (from another collection)')
      .and.be.length(2, 'Children length check at nesting #4 (from another collection)');
    
    // Move part of the fungible token inside token A deeper in the nesting tree
    await collectionB.transferFrom(alice, targetToken.nestingAccount(), tokenA.nestingAccount(), 1n);
    expect(await targetToken.getChildren()).to.be.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: 0, collectionId: collectionB.collectionId},
    ], 'Children contents check at nesting #5 (deeper)').and.be.length(2, 'Children length check at nesting #5 (deeper)');
    expect(await tokenA.getChildren()).to.be.have.deep.members([
      {tokenId: 0, collectionId: collectionB.collectionId},
    ], 'Children contents check at nesting #5.5 (deeper)').and.be.length(1, 'Children length check at nesting #5.5 (deeper)');

    // Move the remaining part of the fungible token inside token A deeper in the nesting tree
    await collectionB.transferFrom(alice, targetToken.nestingAccount(), tokenA.nestingAccount(), 1n);
    expect(await targetToken.getChildren()).to.be.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
    ], 'Children contents check at nesting #6 (deeper)').and.be.length(1, 'Children length check at nesting #6 (deeper)');
    expect(await tokenA.getChildren()).to.be.have.deep.members([
      {tokenId: 0, collectionId: collectionB.collectionId},
    ], 'Children contents check at nesting #6.5 (deeper)').and.be.length(1, 'Children length check at nesting #6.5 (deeper)');
  });
});

describe('Integration Test: Various token type nesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([50n, 10n, 10n], donor);
    });
  });

  itSub('Admin (NFT): allows an Admin to nest a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {collectionAdmin: true}}});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const targetToken = await collection.mintToken(alice, {Substrate: charlie.address});

    // Create an immediately nested token
    const nestedToken = await collection.mintToken(bob, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());

    // Create a token to be nested and nest
    const newToken = await collection.mintToken(bob);
    await newToken.nest(bob, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
  });

  itSub('Admin (NFT): Admin and Token Owner can operate together', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {collectionAdmin: true, tokenOwner: true}}});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const targetToken = await collection.mintToken(alice, {Substrate: charlie.address});

    // Create an immediately nested token by an administrator
    const nestedToken = await collection.mintToken(bob, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());

    // Create a token to be nested and nest
    const newToken = await collection.mintToken(alice, {Substrate: charlie.address});
    await newToken.nest(charlie, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
  });

  itSub('Admin (NFT): allows an Admin to nest a token (Restricted nesting)', async ({helper}) => {
    const collectionA = await helper.nft.mintCollection(alice);
    await collectionA.addAdmin(alice, {Substrate: bob.address});
    const collectionB = await helper.nft.mintCollection(alice);
    await collectionB.addAdmin(alice, {Substrate: bob.address});
    await collectionA.setPermissions(alice, {nesting: {collectionAdmin: true, restricted:[collectionB.collectionId]}});
    const targetToken = await collectionA.mintToken(alice, {Substrate: charlie.address});

    // Create an immediately nested token
    const nestedToken = await collectionB.mintToken(bob, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());

    // Create a token to be nested and nest
    const newToken = await collectionB.mintToken(bob);
    await newToken.nest(bob, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
  });

  // ---------- Non-Fungible ----------

  itSub('NFT: allows an Owner to nest/unnest their token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true}}});
    await collection.addToAllowList(alice, {Substrate: charlie.address});
    const targetToken = await collection.mintToken(charlie);
    await collection.addToAllowList(alice, targetToken.nestingAccount());

    // Create an immediately nested token
    const nestedToken = await collection.mintToken(charlie, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());

    // Create a token to be nested and nest
    const newToken = await collection.mintToken(charlie);
    await newToken.nest(charlie, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
  });

  itSub('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async ({helper}) => {
    const collectionA = await helper.nft.mintCollection(alice);
    const collectionB = await helper.nft.mintCollection(alice);
    //await collectionB.addAdmin(alice, {Substrate: bob.address});
    const targetToken = await collectionA.mintToken(alice, {Substrate: charlie.address});

    await collectionA.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true, restricted:[collectionB.collectionId]}});
    await collectionA.addToAllowList(alice, {Substrate: charlie.address});
    await collectionA.addToAllowList(alice, targetToken.nestingAccount());

    await collectionB.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collectionB.addToAllowList(alice, {Substrate: charlie.address});
    await collectionB.addToAllowList(alice, targetToken.nestingAccount());

    // Create an immediately nested token
    const nestedToken = await collectionB.mintToken(charlie, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());

    // Create a token to be nested and nest
    const newToken = await collectionB.mintToken(charlie);
    await newToken.nest(charlie, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
  });

  // ---------- Fungible ----------

  itSub('Fungible: allows an Owner to nest/unnest their token', async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true}}});
    const collectionFT = await helper.ft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice, {Substrate: charlie.address});

    await collectionNFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionNFT.addToAllowList(alice, targetToken.nestingAccount());

    await collectionFT.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collectionFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionFT.addToAllowList(alice, targetToken.nestingAccount());

    // Create an immediately nested token
    await collectionFT.mint(charlie, 5n, targetToken.nestingAccount());
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(5n);

    // Create a token to be nested and nest
    await collectionFT.mint(charlie, 5n);
    await collectionFT.transfer(charlie, targetToken.nestingAccount(), 2n);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(7n);
  });

  itSub('Fungible: allows an Owner to nest/unnest their token (Restricted nesting)', async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice);
    const collectionFT = await helper.ft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice, {Substrate: charlie.address});

    await collectionNFT.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true, restricted:[collectionFT.collectionId]}});
    await collectionNFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionNFT.addToAllowList(alice, targetToken.nestingAccount());

    await collectionFT.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collectionFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionFT.addToAllowList(alice, targetToken.nestingAccount());

    // Create an immediately nested token
    await collectionFT.mint(charlie, 5n, targetToken.nestingAccount());
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(5n);

    // Create a token to be nested and nest
    await collectionFT.mint(charlie, 5n);
    await collectionFT.transfer(charlie, targetToken.nestingAccount(), 2n);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(7n);
  });

  // ---------- Re-Fungible ----------

  itSub.ifWithPallets('ReFungible: allows an Owner to nest/unnest their token', [Pallets.ReFungible], async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true}}});
    const collectionRFT = await helper.rft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice, {Substrate: charlie.address});

    await collectionNFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionNFT.addToAllowList(alice, targetToken.nestingAccount());

    await collectionRFT.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collectionRFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionRFT.addToAllowList(alice, targetToken.nestingAccount());

    // Create an immediately nested token
    const nestedToken = await collectionRFT.mintToken(charlie, 5n, targetToken.nestingAccount());
    expect(await nestedToken.getBalance(targetToken.nestingAccount())).to.be.equal(5n);

    // Create a token to be nested and nest
    const newToken = await collectionRFT.mintToken(charlie, 5n);
    await newToken.transfer(charlie, targetToken.nestingAccount(), 2n);
    expect(await newToken.getBalance(targetToken.nestingAccount())).to.be.equal(2n);
  });

  itSub.ifWithPallets('ReFungible: allows an Owner to nest/unnest their token (Restricted nesting)', [Pallets.ReFungible], async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice);
    const collectionRFT = await helper.rft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice, {Substrate: charlie.address});

    await collectionNFT.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true, restricted:[collectionRFT.collectionId]}});
    await collectionNFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionNFT.addToAllowList(alice, targetToken.nestingAccount());

    await collectionRFT.setPermissions(alice, {access: 'AllowList', mintMode: true});
    await collectionRFT.addToAllowList(alice, {Substrate: charlie.address});
    await collectionRFT.addToAllowList(alice, targetToken.nestingAccount());

    // Create an immediately nested token
    const nestedToken = await collectionRFT.mintToken(charlie, 5n, targetToken.nestingAccount());
    expect(await nestedToken.getBalance(targetToken.nestingAccount())).to.be.equal(5n);

    // Create a token to be nested and nest
    const newToken = await collectionRFT.mintToken(charlie, 5n);
    await newToken.transfer(charlie, targetToken.nestingAccount(), 2n);
    expect(await newToken.getBalance(targetToken.nestingAccount())).to.be.equal(2n);
  });
});

describe('Negative Test: Nesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 50n], donor);
    });
  });

  itSub('Disallows excessive token nesting', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    let token = await collection.mintToken(alice);

    const maxNestingLevel = 5;

    // Create a nested-token matryoshka
    for (let i = 0; i < maxNestingLevel; i++) {
      token = await collection.mintToken(alice, token.nestingAccount());
    }

    // The nesting depth is limited by `maxNestingLevel`
    await expect(collection.mintToken(alice, token.nestingAccount()))
      .to.be.rejectedWith(/structure\.DepthLimit/);
    expect(await token.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await token.getChildren()).to.be.length(0);
  });

  // ---------- Admin ------------

  itSub('Admin (NFT): disallows an Admin to operate nesting when only TokenOwner is allowed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const targetToken = await collection.mintToken(alice);

    // Try to create an immediately nested token as collection admin when it's disallowed
    await expect(collection.mintToken(bob, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    // Try to create a token to be nested and nest
    const newToken = await collection.mintToken(bob);
    await expect(newToken.nest(bob, targetToken))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSub('Admin (NFT): disallows a Token Owner to operate nesting when only Admin is allowed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true, nesting: {collectionAdmin: true}}});
    const targetToken = await collection.mintToken(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, targetToken.nestingAccount());

    // Try to create a nested token as token owner when it's disallowed
    await expect(collection.mintToken(bob, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    // Try to create a token to be nested and nest
    const newToken = await collection.mintToken(bob);
    await expect(newToken.nest(bob, targetToken))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSub('Admin (NFT): disallows an Admin to unnest someone else\'s token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {limits: {ownerCanTransfer: true}, permissions: {access: 'AllowList', mintMode: true, nesting: {collectionAdmin: true}}});
    //await collection.addAdmin(alice, {Substrate: bob.address});
    const targetToken = await collection.mintToken(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, targetToken.nestingAccount());

    // Try to nest somebody else's token
    const newToken = await collection.mintToken(bob);
    await expect(newToken.nest(alice, targetToken))
      .to.be.rejectedWith(/common\.NoPermission/);

    // Try to unnest a token belonging to someone else as collection admin
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());
    await expect(nestedToken.unnest(alice, targetToken, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.AddressNotInAllowlist/);

    expect(await targetToken.getChildren()).to.be.length(1);
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount());
  });

  itSub('Admin (NFT): disallows an Admin to nest a token from an unlisted collection (Restricted nesting)', async ({helper}) => {
    const collectionA = await helper.nft.mintCollection(alice);
    const collectionB = await helper.nft.mintCollection(alice);
    await collectionA.setPermissions(alice, {nesting: {collectionAdmin: true, restricted: [collectionA.collectionId]}});
    const targetToken = await collectionA.mintToken(alice);

    // Try to create a nested token from another collection
    await expect(collectionB.mintToken(alice, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

    // Create a token in another collection yet to be nested and try to nest
    const newToken = await collectionB.mintToken(alice);
    await expect(newToken.nest(alice, targetToken))
      .to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  // ---------- Non-Fungible ----------

  itSub('NFT: disallows to nest token if nesting is disabled', async ({helper}) => {
    // Collection is implicitly not allowed nesting at creation
    const collection = await helper.nft.mintCollection(alice);
    const targetToken = await collection.mintToken(alice);

    // Try to create a nested token as token owner when it's disallowed
    await expect(collection.mintToken(alice, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    // Try to create a token to be nested and nest
    const newToken = await collection.mintToken(alice);
    await expect(newToken.nest(alice, targetToken))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('NFT: disallows a non-Owner to nest someone else\'s token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const targetToken = await collection.mintToken(alice);

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true}});
    await collection.addToAllowList(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, targetToken.nestingAccount());

    // Try to create a token to be nested and nest
    const newToken = await collection.mintToken(alice);
    await expect(newToken.nest(bob, targetToken)).to.be.rejectedWith(/common\.NoPermission/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('NFT: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const targetToken = await collection.mintToken(alice);

    await collection.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true}});
    await collection.addToAllowList(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, targetToken.nestingAccount());

    const collectionB = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true}});
    await collectionB.addToAllowList(alice, {Substrate: bob.address});
    await collectionB.addToAllowList(alice, targetToken.nestingAccount());

    // Try to create a token to be nested and nest
    const newToken = await collectionB.mintToken(alice);
    await expect(newToken.nest(bob, targetToken)).to.be.rejectedWith(/common\.NoPermission/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('NFT: disallows to nest token in an unlisted collection', async ({helper}) => {
    // Create collection with restricted nesting -- even self is not allowed
    const collection = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true, restricted: []}}});
    const targetToken = await collection.mintToken(alice, {Substrate: bob.address});

    await collection.addToAllowList(alice, {Substrate: bob.address});
    await collection.addToAllowList(alice, targetToken.nestingAccount());

    // Try to mint in own collection after allowlisting the accounts
    await expect(collection.mintToken(bob, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
  });

  // ---------- Fungible ----------

  itSub('Fungible: disallows to nest token if nesting is disabled', async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice);
    const collectionFT = await helper.ft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice);

    // Try to create an immediately nested token
    await expect(collectionFT.mint(alice, 5n, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    // Try to create a token to be nested and nest
    await collectionFT.mint(alice, 5n);
    await expect(collectionFT.transfer(alice, targetToken.nestingAccount(), 2n))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);
    expect(await collectionFT.getBalance({Substrate: alice.address})).to.be.equal(5n);
  });

  itSub('Fungible: disallows a non-Owner to unnest someone else\'s token', async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice, {permissions: {nesting: {collectionAdmin: true, tokenOwner: true}}});
    const collectionFT = await helper.ft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice, {Substrate: bob.address});

    // Nest some tokens as Alice into Bob's token
    await collectionFT.mint(alice, 5n, targetToken.nestingAccount());

    // Try to pull it out
    await expect(collectionFT.transferFrom(alice, targetToken.nestingAccount(), {Substrate: bob.address}, 1n))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(5n);
  });

  itSub('Fungible: disallows a non-Owner to unnest someone else\'s token (Restricted nesting)', async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice);
    const collectionFT = await helper.ft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice, {Substrate: bob.address});

    await collectionNFT.setPermissions(alice, {nesting: {collectionAdmin: true, tokenOwner: true, restricted: [collectionFT.collectionId]}});

    // Nest some tokens as Alice into Bob's token
    await collectionFT.mint(alice, 5n, targetToken.nestingAccount());

    // Try to pull it out as Alice still
    await expect(collectionFT.transferFrom(alice, targetToken.nestingAccount(), {Substrate: bob.address}, 1n))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(5n);
  });

  itSub('Fungible: disallows to nest token in an unlisted collection', async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice, {permissions: {nesting: {collectionAdmin: true, tokenOwner: true, restricted: []}}});
    const collectionFT = await helper.ft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice);

    // Try to mint an immediately nested token
    await expect(collectionFT.mint(alice, 5n, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

    // Mint a token and try to nest it
    await collectionFT.mint(alice, 5n);
    await expect(collectionFT.transfer(alice, targetToken.nestingAccount(), 1n))
      .to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(0n);
    expect(await collectionFT.getBalance({Substrate: alice.address})).to.be.equal(5n);
  });

  // ---------- Re-Fungible ----------

  itSub.ifWithPallets('ReFungible: disallows to nest token if nesting is disabled', [Pallets.ReFungible], async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice);
    const collectionRFT = await helper.rft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice);

    // Try to create an immediately nested token
    await expect(collectionRFT.mintToken(alice, 5n, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    // Try to create a token to be nested and nest
    const token = await collectionRFT.mintToken(alice, 5n);
    await expect(token.transfer(alice, targetToken.nestingAccount(), 2n))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(5n);
  });

  itSub.ifWithPallets('ReFungible: disallows a non-Owner to nest someone else\'s token', [Pallets.ReFungible], async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice);
    const collectionRFT = await helper.rft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice);

    await collectionNFT.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true}});
    await collectionNFT.addToAllowList(alice, {Substrate: bob.address});
    await collectionNFT.addToAllowList(alice, targetToken.nestingAccount());

    // Try to create a token to be nested and nest
    const newToken = await collectionRFT.mintToken(alice);
    await expect(newToken.transfer(bob, targetToken.nestingAccount())).to.be.rejectedWith(/common\.TokenValueTooLow/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getBalance({Substrate: alice.address})).to.be.equal(1n);

    // Nest some tokens as Alice into Bob's token
    await newToken.transfer(alice, targetToken.nestingAccount());

    // Try to pull it out
    await expect(newToken.transferFrom(bob, targetToken.nestingAccount(), {Substrate: alice.address}, 1n))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await newToken.getBalance(targetToken.nestingAccount())).to.be.equal(1n);
  });

  itSub.ifWithPallets('ReFungible: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', [Pallets.ReFungible], async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice);
    const collectionRFT = await helper.rft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice);

    await collectionNFT.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true, restricted: [collectionRFT.collectionId]}});
    await collectionNFT.addToAllowList(alice, {Substrate: bob.address});
    await collectionNFT.addToAllowList(alice, targetToken.nestingAccount());

    // Try to create a token to be nested and nest
    const newToken = await collectionRFT.mintToken(alice);
    await expect(newToken.transfer(bob, targetToken.nestingAccount())).to.be.rejectedWith(/common\.TokenValueTooLow/);

    expect(await targetToken.getChildren()).to.be.length(0);
    expect(await newToken.getBalance({Substrate: alice.address})).to.be.equal(1n);

    // Nest some tokens as Alice into Bob's token
    await newToken.transfer(alice, targetToken.nestingAccount());

    // Try to pull it out
    await expect(newToken.transferFrom(bob, targetToken.nestingAccount(), {Substrate: alice.address}, 1n))
      .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await newToken.getBalance(targetToken.nestingAccount())).to.be.equal(1n);
  });

  itSub.ifWithPallets('ReFungible: disallows to nest token to an unlisted collection', [Pallets.ReFungible], async ({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true, restricted: []}}});
    const collectionRFT = await helper.rft.mintCollection(alice);
    const targetToken = await collectionNFT.mintToken(alice);

    // Try to create an immediately nested token
    await expect(collectionRFT.mintToken(alice, 5n, targetToken.nestingAccount()))
      .to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

    // Try to create a token to be nested and nest
    const token = await collectionRFT.mintToken(alice, 5n);
    await expect(token.transfer(alice, targetToken.nestingAccount(), 2n))
      .to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(5n);
  });
});
