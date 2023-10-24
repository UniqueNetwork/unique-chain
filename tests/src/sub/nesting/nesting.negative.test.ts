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

import type {IKeyringPair} from '@polkadot/types/types';
import {expect, itSub, Pallets, usingPlaygrounds} from '../../util/index.js';
import {UniqueFTCollection, UniqueNFTCollection, UniqueNFToken, UniqueRFTCollection, UniqueRFToken} from '../../util/playgrounds/unique.js';
import {itEth} from '../../eth/util/index.js';

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('Negative Test: Nesting', () => {
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase => {
    itSub.ifWithPallets(`Owner cannot nest ${testCase.mode.toUpperCase()} if nesting is disabled`, testCase.requiredPallets, async ({helper}) => {
      // Create default collection, permissions are not set:
      const aliceNFTCollection = await helper.nft.mintCollection(alice);
      const targetToken = await aliceNFTCollection.mintToken(alice);

      const collectionForNesting = await helper[testCase.mode].mintCollection(alice);

      // 1. Alice cannot create immediately nested tokens:
      const nestingTx = testCase.mode === 'nft'
        ? (collectionForNesting as UniqueNFTCollection).mintToken(alice, targetToken.nestingAccount())
        : (collectionForNesting as UniqueRFTCollection).mintToken(alice, 10n, targetToken.nestingAccount());
      await expect(nestingTx).to.be.rejectedWith('common.UserIsNotAllowedToNest');

      // 2. Alice cannot mint and nest token:
      const nestedToken2 = await collectionForNesting.mintToken(alice);
      await expect(nestedToken2.nest(alice, targetToken)).to.be.rejectedWith('common.UserIsNotAllowedToNest');
    });
  });

  [
    {mode: 'ft'},
    {mode: 'nativeFt'},
  ].map(testCase => {
    itSub(`Owner cannot nest [${testCase.mode}] if nesting is disabled (except for native fungible collection)`, async ({helper}) => {
    // Create default collection, permissions are not set:
      const aliceNFTCollection = await helper.nft.mintCollection(alice);
      const targetToken = await aliceNFTCollection.mintToken(alice);

      const collectionForNesting = testCase.mode === 'ft' ? await helper.ft.mintCollection(alice) : helper.ft.getCollectionObject(0);

      // Alice cannot create immediately nested tokens:
      if(testCase.mode === 'ft') {
        await expect(collectionForNesting.mint(alice, 100n, targetToken.nestingAccount())).to.be.rejectedWith('common.UserIsNotAllowedToNest');
      } else {
        await expect(collectionForNesting.transfer(alice, targetToken.nestingAccount(), 100n)).to.be.not.rejected;
      }

      // Alice can't mint and nest tokens:
      if(testCase.mode === 'ft') {
        await collectionForNesting.mint(alice, 100n);
      }

      if(testCase.mode === 'ft') {
        await expect(collectionForNesting.transfer(alice, targetToken.nestingAccount(), 50n)).to.be.rejectedWith('common.UserIsNotAllowedToNest');
      } else {
        await expect(collectionForNesting.transfer(alice, targetToken.nestingAccount(), 50n)).to.be.not.rejected;
      }
    });
  });

  [
    {mode: 'nft' as const},
    {mode: 'rft' as const},
    {mode: 'ft' as const},
    {mode: 'native ft' as const},
  ].map(testCase => {
    itSub(`Non-owner and non-admin cannot nest ${testCase.mode.toUpperCase()} in someone else's tokens (except for native fungible collection)`, async ({helper}) => {
      const targetCollection = await helper.nft.mintCollection(alice, {permissions:
        {nesting: {tokenOwner: true, collectionAdmin: true}},
      });
      const targetToken = await targetCollection.mintToken(alice);

      const nestedCollectionBob = await (
        testCase.mode === 'native ft'
          ? helper.ft.getCollectionObject(0)
          : helper[testCase.mode].mintCollection(bob)
      );

      let nestedTokenBob: UniqueNFToken | UniqueRFToken;
      switch (testCase.mode) {
        case 'nft': nestedTokenBob = await (nestedCollectionBob as UniqueNFTCollection).mintToken(bob); break;
        case 'rft': nestedTokenBob = await (nestedCollectionBob as UniqueRFTCollection).mintToken(bob, 100n); break;
        case 'ft': await (nestedCollectionBob as UniqueFTCollection).mint(bob, 100n); break;
        case 'native ft': await expect((nestedCollectionBob as UniqueFTCollection).mint(bob, 100n)).to.be.rejectedWith('common.UnsupportedOperation'); break;
      }

      // Bob non-owner of targetToken and non admin of targetCollection, so
      // 1. cannot mint nested token:
      switch (testCase.mode) {
        case 'nft': await expect((nestedCollectionBob as UniqueNFTCollection).mintToken(bob, targetToken.nestingAccount())).to.be.rejectedWith('common.UserIsNotAllowedToNest'); break;
        case 'rft': await expect((nestedCollectionBob as UniqueRFTCollection).mintToken(bob, 100n, targetToken.nestingAccount())).to.be.rejectedWith('common.UserIsNotAllowedToNest'); break;
        case 'ft': await expect((nestedCollectionBob as UniqueFTCollection).mint(bob, 100n, targetToken.nestingAccount())).to.be.rejectedWith('common.UserIsNotAllowedToNest'); break;
        case 'native ft': await expect((nestedCollectionBob as UniqueFTCollection).mint(bob, 100n, targetToken.nestingAccount())).to.be.rejectedWith('common.UnsupportedOperation'); break;
      }

      // 2. cannot nest existing token:
      switch (testCase.mode) {
        case 'nft':
        case 'rft': await expect(nestedTokenBob!.transfer(bob, targetToken.nestingAccount())).to.be.rejectedWith('common.UserIsNotAllowedToNest'); break;
        case 'ft': await expect((nestedCollectionBob as UniqueFTCollection).transfer(bob, targetToken.nestingAccount(), 100n)).to.be.rejectedWith('common.UserIsNotAllowedToNest'); break;
        case 'native ft': await expect((nestedCollectionBob as UniqueFTCollection).transfer(bob, targetToken.nestingAccount(), 100n)).to.be.not.rejected; break;
      }
    });
  });

  [
    {mode: 'nft' as const, nesting: {tokenOwner: true,  collectionAdmin: false}},
    {mode: 'nft' as const, nesting: {tokenOwner: false, collectionAdmin: true}},
  ].map(testCase => {
    itSub(`${testCase.nesting.tokenOwner ? 'Admin' : 'Token owner'} cannot nest when only ${testCase.nesting.tokenOwner ? 'tokenOwner' : 'collectionAdmin'} is allowed`, async ({helper}) => {
      // Create collection with tokenOwner or create collection with collectionAdmin permission:
      const targetCollection = await helper.nft.mintCollection(alice, {permissions: {nesting: testCase.nesting}});
      const targetTokenCharlie = await targetCollection.mintToken(alice, {Substrate: charlie.address});
      await targetCollection.addAdmin(alice, {Substrate: bob.address});

      const nestedCollectionCharlie = await helper[testCase.mode].mintCollection(charlie);
      const nestedCollectionBob = await helper[testCase.mode].mintCollection(bob);
      // if nesting permissions restricted for token owner – minter is bob (admin),
      // if collectionAdmin – charlie (owner)
      testCase.nesting.tokenOwner
        ? await expect(nestedCollectionBob.mintToken(bob, targetTokenCharlie.nestingAccount())).to.be.rejectedWith(/common\.UserIsNotAllowedToNest/)
        : await expect(nestedCollectionCharlie.mintToken(charlie, targetTokenCharlie.nestingAccount())).to.be.rejectedWith(/common\.UserIsNotAllowedToNest/);
    });
  });

  itSub.ifWithPallets('Cannot nest in non existing token (except for native fungible collection)', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    // To avoid UserIsNotAllowedToNest error
    await helper.collection.setPermissions(alice, collection.collectionId, {nesting: {collectionAdmin: true}});

    // The list of non-existing tokens:
    const tokenFromNonExistingCollection = helper.nft.getTokenObject(9999999, 1);
    const tokenBurnt = await collection.mintToken(alice);
    await tokenBurnt.burn(alice);
    const tokenNotMintedYet = helper.nft.getTokenObject(collection.collectionId, 2);

    // The list of collections to nest tokens from:
    const nftCollectionForNesting = await helper.nft.mintCollection(alice);
    const rftCollectionForNesting = await helper.rft.mintCollection(alice);
    const ftCollectionForNesting = await helper.ft.mintCollection(alice);
    const nativeFtCollectionForNesting = helper.ft.getCollectionObject(0);

    const testCases = [
      {token: tokenFromNonExistingCollection, error: 'CollectionNotFound'},
      {token: tokenBurnt, error: 'TokenNotFound'},
      {token: tokenNotMintedYet, error: 'TokenNotFound'},
    ];

    for(const testCase of testCases) {
      // 1. Alice cannot create nested token to non-existing token
      await expect(nftCollectionForNesting.mintToken(alice, testCase.token.nestingAccount())).to.be.rejectedWith(testCase.error);
      await expect(rftCollectionForNesting.mintToken(alice, 10n, testCase.token.nestingAccount())).to.be.rejectedWith(testCase.error);
      await expect(ftCollectionForNesting.mint(alice, 10n, testCase.token.nestingAccount())).to.be.rejectedWith(testCase.error);

      // 2. Alice cannot mint and nest token:
      const nft = await nftCollectionForNesting.mintToken(alice);
      const rft = await rftCollectionForNesting.mintToken(alice, 100n);
      await ftCollectionForNesting.mint(alice, 100n);
      await expect(nft.transfer(alice, testCase.token.nestingAccount())).to.be.rejectedWith(testCase.error);
      await expect(rft.transfer(alice, testCase.token.nestingAccount())).to.be.rejectedWith(testCase.error);
      await expect(ftCollectionForNesting.transfer(alice, testCase.token.nestingAccount(), 50n)).to.be.rejectedWith(testCase.error);
      await expect(nativeFtCollectionForNesting.transfer(alice, testCase.token.nestingAccount(), 50n)).to.be.not.rejected;
    }
  });

  itEth.ifWithPallets('Cannot nest in collection address', [Pallets.ReFungible], async({helper}) => {
    const existingCollection = await helper.nft.mintCollection(alice);
    const existingCollectionAddress = helper.ethAddress.fromCollectionId(existingCollection.collectionId);
    const futureCollectionAddress = helper.ethAddress.fromCollectionId(99999999);

    const nftCollectionForNesting = await helper.nft.mintCollection(alice);

    // 1. Alice cannot create nested token to collection address
    await expect(nftCollectionForNesting.mintToken(alice, {Ethereum: existingCollectionAddress})).to.be.rejectedWith('CantNestTokenUnderCollection');
    await expect(nftCollectionForNesting.mintToken(alice, {Ethereum: futureCollectionAddress})).to.be.rejectedWith('CantNestTokenUnderCollection');

    // 2. Alice cannot mint and nest token to collection address:
    const nft = await nftCollectionForNesting.mintToken(alice);
    await expect(nft.transfer(alice, {Ethereum: existingCollectionAddress})).to.be.rejectedWith('CantNestTokenUnderCollection');
    await expect(nft.transfer(alice, {Ethereum: futureCollectionAddress})).to.be.rejectedWith('CantNestTokenUnderCollection');
  });

  itEth.ifWithPallets('Cannot nest in RFT or FT (except for native fungible collection)', [Pallets.ReFungible], async ({helper}) => {
    // Create default collection, permissions are not set:
    const rftCollection = await helper.rft.mintCollection(alice);
    const ftCollection = await helper.ft.mintCollection(alice);
    const nativeFtCollection = helper.ft.getCollectionObject(0);

    const rftToken = await rftCollection.mintToken(alice);
    await ftCollection.mint(alice, 100n);

    const collectionForNesting = await helper.nft.mintCollection(alice);

    // 1. Alice cannot create immediately nested tokens:
    await expect(collectionForNesting.mintToken(alice, rftToken.nestingAccount())).to.be.rejectedWith('refungible.RefungibleDisallowsNesting');
    await expect(collectionForNesting.mintToken(alice, {Ethereum: helper.ethAddress.fromTokenId(ftCollection.collectionId, 0)})).to.be.rejectedWith('fungible.FungibleDisallowsNesting');
    await expect(collectionForNesting.mintToken(alice, {Ethereum: helper.ethAddress.fromTokenId(nativeFtCollection.collectionId, 0)})).to.be.rejectedWith('common.UnsupportedOperation');

    // 2. Alice cannot mint and nest token:
    const nestedToken2 = await collectionForNesting.mintToken(alice);
    await expect(nestedToken2.nest(alice, rftToken)).to.be.rejectedWith('refungible.RefungibleDisallowsNesting');
    await expect(ftCollection.transfer(alice, {Ethereum: helper.ethAddress.fromTokenId(ftCollection.collectionId, 0)})).to.be.rejectedWith('fungible.FungibleDisallowsNesting');
    await expect(nativeFtCollection.transfer(alice, {Ethereum: helper.ethAddress.fromTokenId(nativeFtCollection.collectionId, 0)})).to.be.not.rejected;
  });

  itSub('Cannot nest in restricted collection if collection is not in the list (except native fungible collection)', async ({helper}) => {
    const {collectionId: allowedCollectionId} = await helper.nft.mintCollection(alice);
    const notAllowedCollectionNFT = await helper.nft.mintCollection(alice);
    const notAllowedCollectionRFT = await helper.rft.mintCollection(alice);
    const notAllowedCollectionFT = await helper.ft.mintCollection(alice);
    const allowedCollectionNativeFT = helper.ft.getCollectionObject(0);

    // Collection restricted to allowedCollectionId
    const restrictedCollectionA = await helper.nft.mintCollection(alice, {permissions:
      {nesting: {tokenOwner: true, restricted: [allowedCollectionId]}},
    });
    // Create collection with restricted nesting -- even self is not allowed
    const restrictedCollectionB = await helper.nft.mintCollection(alice, {permissions:
      {nesting: {tokenOwner: true, restricted: []}},
    });

    const targetTokenA = await restrictedCollectionA.mintToken(alice);
    const targetTokenB = await restrictedCollectionB.mintToken(alice);

    // 1. Cannot mint in own collection after allowlisting the accounts:
    await expect(restrictedCollectionA.mintToken(alice, targetTokenA.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    await expect(restrictedCollectionB.mintToken(alice, targetTokenB.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);

    // 2. Cannot mint from notAllowedCollection:
    await expect(notAllowedCollectionNFT.mintToken(alice, targetTokenA.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    await expect(notAllowedCollectionNFT.mintToken(alice, targetTokenB.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    await expect(notAllowedCollectionRFT.mintToken(alice, 100n, targetTokenA.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    await expect(notAllowedCollectionRFT.mintToken(alice, 100n, targetTokenB.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    await expect(notAllowedCollectionFT.mint(alice, 100n, targetTokenA.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    await expect(notAllowedCollectionFT.mint(alice, 100n, targetTokenB.nestingAccount())).to.be.rejectedWith(/common\.SourceCollectionIsNotAllowedToNest/);
    await expect(allowedCollectionNativeFT.transfer(alice, targetTokenA.nestingAccount(), 100n)).to.be.not.rejected;
    await expect(allowedCollectionNativeFT.transfer(alice, targetTokenB.nestingAccount(), 100n)).to.be.not.rejected;
  });

  itSub('Cannot create nesting chains greater than 5', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    let token = await collection.mintToken(alice);

    const maxNestingLevel = 5;

    // Create a nested-token matryoshka
    for(let i = 0; i < maxNestingLevel; i++) {
      token = await collection.mintToken(alice, token.nestingAccount());
    }

    // The nesting depth is limited by `maxNestingLevel`
    // 1. Cannot mint:
    await expect(collection.mintToken(alice, token.nestingAccount()))
      .to.be.rejectedWith(/structure\.DepthLimit/);
    // 2. Cannot transfer:
    const anotherToken = await collection.mintToken(alice);
    await expect(anotherToken.transfer(alice, token.nestingAccount()))
      .to.be.rejectedWith(/structure\.DepthLimit/);
    // 3. Cannot nest FT pieces:
    const ftCollection = await helper.ft.mintCollection(alice);
    await expect(ftCollection.mint(alice, 100n, token.nestingAccount()))
      .to.be.rejectedWith(/structure\.DepthLimit/);

    expect(await token.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await token.getChildren()).to.has.length(0);
  });
});
