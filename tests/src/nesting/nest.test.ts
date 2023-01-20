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
import {expect, itSub, Pallets, usingPlaygrounds} from '../util';

describe('Integration Test: Composite nesting tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  /// TODO move
  itSub('Performs the full suite: bundles a token, transfers, and unnests', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Create an immediately nested token
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());

    // Create a token to be nested
    const newToken = await collection.mintToken(alice);

    // Nest
    await newToken.nest(alice, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());

    // Move bundle to different user
    await targetToken.transfer(alice, {Substrate: bob.address});
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());

    // Unnest
    await newToken.unnest(bob, targetToken, {Substrate: bob.address});
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(await newToken.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });
});

describe('Integration Test: Various token type nesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob, charlie] = await helper.arrange.createAccounts([200n, 10n, 10n], donor);
    });
  });

  itSub.ifWithPallets('ReFungible: getTopmostOwner works correctly with Nesting', [Pallets.ReFungible], async({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice, {
      permissions: {
        nesting: {
          tokenOwner: true,
        },
      },
    });
    const collectionRFT = await helper.rft.mintCollection(alice);

    const nft = await collectionNFT.mintToken(alice, {Substrate: alice.address});
    const rft = await collectionRFT.mintToken(alice, 100n, {Substrate: alice.address});

    expect(await rft.getTopmostOwner()).deep.equal({Substrate: alice.address});

    await rft.transfer(alice, nft.nestingAccount(), 40n);

    expect(await rft.getTopmostOwner()).deep.equal(null);

    await rft.transfer(alice, nft.nestingAccount(), 60n);

    expect(await rft.getTopmostOwner()).deep.equal({Substrate: alice.address});

    await rft.transferFrom(alice, nft.nestingAccount(), {Substrate: alice.address}, 30n);

    expect(await rft.getTopmostOwner()).deep.equal(null);

    await rft.transferFrom(alice, nft.nestingAccount(), {Substrate: alice.address}, 70n);

    expect(await rft.getTopmostOwner()).deep.equal({Substrate: alice.address});
  });
});

describe('Negative Test: Nesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 50n], donor);
    });
  });

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
    const collectionAlice = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true, nesting: {collectionAdmin: true}}});
    const targetTokenBob = await collectionAlice.mintToken(alice, {Substrate: bob.address});
    await collectionAlice.addToAllowList(alice, {Substrate: bob.address});
    await collectionAlice.addToAllowList(alice, targetTokenBob.nestingAccount());

    // Try to create a nested token as token owner when it's disallowed
    await expect(collectionAlice.mintToken(bob, targetTokenBob.nestingAccount()))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    // Try to create a token to be nested and nest
    const newToken = await collectionAlice.mintToken(bob);
    await expect(newToken.nest(bob, targetTokenBob))
      .to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);

    expect(await targetTokenBob.getChildren()).to.be.length(0);
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
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());
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

});
