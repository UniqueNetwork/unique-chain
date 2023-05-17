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
import {expect, itSub, Pallets, usingPlaygrounds} from '../../util';
import {UniqueNFTCollection, UniqueRFTCollection} from '../../util/playgrounds/unique';

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Common nesting tests', () => {
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  [
    {mode: 'nft' as const, restrictedMode: true, requiredPallets: []},
    {mode: 'nft' as const, restrictedMode: false, requiredPallets: []},
    {mode: 'rft' as const, restrictedMode: true, requiredPallets: [Pallets.ReFungible]},
    {mode: 'rft' as const, restrictedMode: false, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase => {
    itSub.ifWithPallets(`Token owner can nest ${testCase.mode.toUpperCase()} in NFT if "tokenOwner" permission set ${testCase.restrictedMode ? 'in restricted mode': ''}`, testCase.requiredPallets, async ({helper}) => {
      // Only NFT can be target for nesting in
      const targetNFTCollection = await helper.nft.mintCollection(alice);
      const targetTokenBob = await targetNFTCollection.mintToken(alice, {Substrate: bob.address});

      const collectionForNesting = await helper[testCase.mode].mintCollection(bob);
      // permissions should be set:
      await targetNFTCollection.setPermissions(alice, {
        nesting: {tokenOwner: true, restricted: testCase.restrictedMode ? [collectionForNesting.collectionId] : null},
      });

      // 1. Bob can immediately create nested token:
      const nestedToken1 = testCase.mode === 'nft'
        ? await (collectionForNesting as UniqueNFTCollection).mintToken(bob, targetTokenBob.nestingAccount())
        : await (collectionForNesting as UniqueRFTCollection).mintToken(bob, 10n, targetTokenBob.nestingAccount());
      expect(await nestedToken1.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
      expect(await nestedToken1.getOwner()).to.be.deep.equal(targetTokenBob.nestingAccount().toLowerCase());

      // 2. Bob can mint and nest token:
      const nestedToken2 = await collectionForNesting.mintToken(bob);
      await nestedToken2.nest(bob, targetTokenBob);
      expect(await nestedToken2.getTopmostOwner()).to.be.deep.equal({Substrate: bob.address});
      expect(await nestedToken2.getOwner()).to.be.deep.equal(targetTokenBob.nestingAccount().toLowerCase());
    });
  });


  [
    {restrictedMode: true},
    {restrictedMode: false},
  ].map(testCase => {
    itSub(`Token owner can nest FT in NFT if "tokenOwner" permission set  ${testCase.restrictedMode ? 'in restricted mode': ''}`, async ({helper}) => {
      // Only NFT allows nesting, permissions should be set:
      const targetNFTCollection = await helper.nft.mintCollection(alice);
      const targetTokenBob = await targetNFTCollection.mintToken(alice, {Substrate: bob.address});

      const collectionForNesting = await helper.ft.mintCollection(bob);
      // permissions should be set:
      await targetNFTCollection.setPermissions(alice, {
        nesting: {tokenOwner: true, restricted: testCase.restrictedMode ? [collectionForNesting.collectionId] : null},
      });

      // 1. Alice can immediately create nested tokens:
      await collectionForNesting.mint(bob, 100n, targetTokenBob.nestingAccount());
      expect(await collectionForNesting.getTop10Owners()).deep.eq([targetTokenBob.nestingAccount().toLowerCase()]);
      expect(await collectionForNesting.getBalance(targetTokenBob.nestingAccount())).eq(100n);

      // 2. Alice can mint and nest token:
      await collectionForNesting.mint(bob, 100n);
      await collectionForNesting.transfer(bob, targetTokenBob.nestingAccount(), 50n);
      expect(await collectionForNesting.getBalance(targetTokenBob.nestingAccount())).eq(150n);
      expect(await targetTokenBob.getChildren()).to.be.deep.equal([{collectionId: collectionForNesting.collectionId, tokenId: 0}]);
    });
  });

  [
    {restrictedMode: true},
    {restrictedMode: false},
  ].map(testCase => {
    itSub(`Token owner can nest Native FT in NFT if "tokenOwner" permission set  ${testCase.restrictedMode ? 'in restricted mode': ''}`, async ({helper}) => {
      // Only NFT allows nesting, permissions should be set:
      const targetNFTCollection = await helper.nft.mintCollection(alice);
      const targetTokenBob = await targetNFTCollection.mintToken(alice, {Substrate: bob.address});
      expect(await targetTokenBob.getChildren()).to.be.empty;

      const collectionForNesting = helper.ft.getCollectionObject(0);
      // permissions should be set:
      await targetNFTCollection.setPermissions(alice, {
        nesting: {tokenOwner: true, restricted: testCase.restrictedMode ? [collectionForNesting.collectionId] : null},
      });

      // Bob can nest Native FT into their NFT:
      await collectionForNesting.transfer(bob, targetTokenBob.nestingAccount(), 50n);
      expect(await collectionForNesting.getBalance(targetTokenBob.nestingAccount())).eq(50n);
      expect(await targetTokenBob.getChildren()).to.be.deep.equal([{collectionId: 0, tokenId: 0}]);
    });
  });


  itSub.ifWithPallets('Owner can unnest tokens using transferFrom', [Pallets.ReFungible], async ({helper}) => {
    const collectionToNest = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const tokenA = await collectionToNest.mintToken(alice);
    const tokenB = await collectionToNest.mintToken(alice);

    // Create a nested token
    const nftCollectionToBeNested = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const rftCollectionToBeNested = await helper.rft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const ftCollectionToBeNested = await helper.ft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const nativeFtCollectionToBeNested = helper.ft.getCollectionObject(0);

    const nestedNFT = await nftCollectionToBeNested.mintToken(alice, tokenA.nestingAccount());
    const nestedRFT = await rftCollectionToBeNested.mintToken(alice, 100n, tokenA.nestingAccount());
    const _nestedFT = await ftCollectionToBeNested.mint(alice, 100n, tokenA.nestingAccount());
    await nativeFtCollectionToBeNested.transfer(alice, tokenA.nestingAccount(), 100n);
    expect(await nestedNFT.getOwner()).to.be.deep.equal(tokenA.nestingAccount().toLowerCase());
    expect(await nestedRFT.getOwner()).to.be.deep.equal(tokenA.nestingAccount().toLowerCase());
    expect(await ftCollectionToBeNested.getBalance(tokenA.nestingAccount())).to.equal(100n);
    expect(await nativeFtCollectionToBeNested.getBalance(tokenA.nestingAccount())).to.equal(100n);

    expect(await tokenA.getChildren()).to.be.length(4);
    expect(await tokenB.getChildren()).to.be.length(0);

    // Transfer the nested token to another token
    await nestedNFT.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount());
    await nestedRFT.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount(), 25n);
    await ftCollectionToBeNested.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount(), 25n);
    await nativeFtCollectionToBeNested.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount(), 25n);

    expect(await nestedNFT.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await nestedNFT.getOwner()).to.be.deep.equal(tokenB.nestingAccount().toLowerCase());

    expect(await nestedRFT.getBalance(tokenB.nestingAccount())).to.equal(25n);
    expect(await nestedRFT.getBalance(tokenA.nestingAccount())).to.equal(75n);

    expect(await ftCollectionToBeNested.getBalance(tokenB.nestingAccount())).to.equal(25n);
    expect(await ftCollectionToBeNested.getBalance(tokenA.nestingAccount())).to.equal(75n);

    expect(await nativeFtCollectionToBeNested.getBalance(tokenB.nestingAccount())).to.equal(25n);
    expect(await nativeFtCollectionToBeNested.getBalance(tokenA.nestingAccount())).to.equal(75n);

    // RFT, FT, and native FT
    expect(await tokenA.getChildren()).to.be.length(3);
    // NFT, RFT, FT, and native FT
    expect(await tokenB.getChildren()).to.be.length(4);
  });
});
