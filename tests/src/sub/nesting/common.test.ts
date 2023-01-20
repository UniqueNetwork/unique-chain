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

before(async () => {
  await usingPlaygrounds(async (helper, privateKey) => {
    const donor = await privateKey({filename: __filename});
    [alice] = await helper.arrange.createAccounts([100n], donor);
  });
});

[
  {mode: 'nft' as const, requiredPallets: []},
  {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
].map(testCase => {
  itSub.ifWithPallets(`Owner can nest ${testCase.mode.toUpperCase()} in NFT`, testCase.requiredPallets, async ({helper}) => {
    // Only NFT allows nesting, permissions should be set:
    const aliceNFTCollection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await aliceNFTCollection.mintToken(alice);

    const collectionForNesting = await helper[testCase.mode].mintCollection(alice);

    // 1. Alice can immediately create nested token:
    const nestedToken1 = testCase.mode === 'nft'
      ? await (collectionForNesting as UniqueNFTCollection).mintToken(alice, targetToken.nestingAccount())
      : await (collectionForNesting as UniqueRFTCollection).mintToken(alice, 10n, targetToken.nestingAccount());
    expect(await nestedToken1.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await nestedToken1.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());

    // 2. Alice can mint and nest token:
    const nestedToken2 = await collectionForNesting.mintToken(alice);
    await nestedToken2.nest(alice, targetToken);
    expect(await nestedToken2.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
    expect(await nestedToken2.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());
  });
});


itSub('Owner can nest FT in NFT', async ({helper}) => {
  // Only NFT allows nesting, permissions should be set:
  const aliceNFTCollection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
  const targetToken = await aliceNFTCollection.mintToken(alice);

  const collectionForNesting = await helper.ft.mintCollection(alice);

  // 1. Alice can immediately create nested tokens:
  await collectionForNesting.mint(alice, 100n, targetToken.nestingAccount());
  expect(await collectionForNesting.getTop10Owners()).deep.eq([targetToken.nestingAccount().toLowerCase()]);
  expect(await collectionForNesting.getBalance(targetToken.nestingAccount())).eq(100n);

  // 2. Alice can mint and nest token:
  await collectionForNesting.mint(alice, 100n);
  await collectionForNesting.transfer(alice, targetToken.nestingAccount(), 50n);
  expect(await collectionForNesting.getBalance(targetToken.nestingAccount())).eq(150n);
});


itSub.ifWithPallets('Owner can transferFrom nested tokens', [Pallets.ReFungible], async ({helper}) => {
  const collectionToNest = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
  const tokenA = await collectionToNest.mintToken(alice);
  const tokenB = await collectionToNest.mintToken(alice);

  // Create a nested token
  const nftCollectionToBeNested = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
  const rftCollectionToBeNested = await helper.rft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
  const ftCollectionToBeNested = await helper.ft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});

  const nestedNFT = await nftCollectionToBeNested.mintToken(alice, tokenA.nestingAccount());
  const nestedRFT = await rftCollectionToBeNested.mintToken(alice, 100n, tokenA.nestingAccount());
  const _nestedFT = await ftCollectionToBeNested.mint(alice, 100n, tokenA.nestingAccount());
  expect(await nestedNFT.getOwner()).to.be.deep.equal(tokenA.nestingAccount().toLowerCase());
  expect(await nestedRFT.getOwner()).to.be.deep.equal(tokenA.nestingAccount().toLowerCase());
  expect(await ftCollectionToBeNested.getBalance(tokenA.nestingAccount())).to.equal(100n);

  // Transfer the nested token to another token
  await nestedNFT.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount());
  await nestedRFT.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount(), 25n);
  await ftCollectionToBeNested.transferFrom(alice, tokenA.nestingAccount(), tokenB.nestingAccount(), 25n);

  expect(await nestedNFT.getTopmostOwner()).to.be.deep.equal({Substrate: alice.address});
  expect(await nestedNFT.getOwner()).to.be.deep.equal(tokenB.nestingAccount().toLowerCase());

  expect(await nestedRFT.getBalance(tokenB.nestingAccount())).to.equal(25n);
  expect(await nestedRFT.getBalance(tokenA.nestingAccount())).to.equal(75n);

  expect(await ftCollectionToBeNested.getBalance(tokenB.nestingAccount())).to.equal(25n);
  expect(await ftCollectionToBeNested.getBalance(tokenA.nestingAccount())).to.equal(75n);
});
