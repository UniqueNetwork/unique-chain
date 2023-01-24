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
import {itEth} from '../../eth/util';

describe('Nesting', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase => {
    itSub.ifWithPallets(`Owner can nest ${testCase.mode.toUpperCase()}`, testCase.requiredPallets, async ({helper}) => {
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

  itSub('Owner can nest FT', async ({helper}) => {
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
});

describe('Nesting negative', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testCase => {
    itSub.ifWithPallets(`Owner cannot nest ${testCase.mode.toUpperCase()} if nesting not allowed`, testCase.requiredPallets, async ({helper}) => {
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

  itSub('Owner cannot nest FT if nesting not allowed', async ({helper}) => {
    // Create default collection, permissions are not set:
    const aliceNFTCollection = await helper.nft.mintCollection(alice);
    const targetToken = await aliceNFTCollection.mintToken(alice);

    const collectionForNesting = await helper.ft.mintCollection(alice);

    // 1. Alice cannot create immediately nested tokens:
    await expect(collectionForNesting.mint(alice, 100n, targetToken.nestingAccount())).to.be.rejectedWith('common.UserIsNotAllowedToNest');

    // 2. Alice can mint and nest token:
    await collectionForNesting.mint(alice, 100n);
    await expect(collectionForNesting.transfer(alice, targetToken.nestingAccount(), 50n)).to.be.rejectedWith('common.UserIsNotAllowedToNest');
  });

  itSub.ifWithPallets('Cannot nest to a future collection', [Pallets.ReFungible], async ({helper}) => {
    const nonExistingCollectionId = await helper.collection.getTotalCount() + 1000;
    const futureToken = helper.nft.getTokenObject(nonExistingCollectionId, 1);

    const nftCollectionForNesting = await helper.nft.mintCollection(alice);
    const rftCollectionForNesting = await helper.rft.mintCollection(alice);
    const ftCollectionForNesting = await helper.ft.mintCollection(alice);

    // 1. Alice cannot create nested token to future token
    await expect(nftCollectionForNesting.mintToken(alice, futureToken.nestingAccount())).to.be.rejectedWith('CollectionNotFound');
    await expect(rftCollectionForNesting.mintToken(alice, 10n, futureToken.nestingAccount())).to.be.rejectedWith('CollectionNotFound');
    await expect(ftCollectionForNesting.mint(alice, 10n, futureToken.nestingAccount())).to.be.rejectedWith('CollectionNotFound');

    // 2. Alice cannot mint and nest token:
    const nft = await nftCollectionForNesting.mintToken(alice);
    const rft = await rftCollectionForNesting.mintToken(alice, 100n);
    const _ft = await ftCollectionForNesting.mint(alice, 100n);
    await expect(nft.transfer(alice, futureToken.nestingAccount())).to.be.rejectedWith('CollectionNotFound');
    await expect(rft.transfer(alice, futureToken.nestingAccount())).to.be.rejectedWith('CollectionNotFound');
    await expect(ftCollectionForNesting.transfer(alice, futureToken.nestingAccount(), 50n)).to.be.rejectedWith('CollectionNotFound');
  });

  itSub.ifWithPallets('Cannot nest to a future token in a NFT collection', [Pallets.ReFungible], async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice);
    // To avoid UserIsNotAllowedToNest error
    await helper.collection.setPermissions(alice, collectionId, {nesting: {collectionAdmin: true}});
    const futureToken = helper.nft.getTokenObject(collectionId, 1);

    const nftCollectionForNesting = await helper.nft.mintCollection(alice);
    const rftCollectionForNesting = await helper.rft.mintCollection(alice);
    const ftCollectionForNesting = await helper.ft.mintCollection(alice);

    // 1. Alice cannot create nested token to future token
    await expect(nftCollectionForNesting.mintToken(alice, futureToken.nestingAccount())).to.be.rejectedWith('TokenNotFound');
    await expect(rftCollectionForNesting.mintToken(alice, 10n, futureToken.nestingAccount())).to.be.rejectedWith('TokenNotFound');
    await expect(ftCollectionForNesting.mint(alice, 10n, futureToken.nestingAccount())).to.be.rejectedWith('TokenNotFound');

    // 2. Alice cannot mint and nest token:
    const nft = await nftCollectionForNesting.mintToken(alice);
    const rft = await rftCollectionForNesting.mintToken(alice, 100n);
    const _ft = await ftCollectionForNesting.mint(alice, 100n);
    await expect(nft.transfer(alice, futureToken.nestingAccount())).to.be.rejectedWith('TokenNotFound');
    await expect(rft.transfer(alice, futureToken.nestingAccount())).to.be.rejectedWith('TokenNotFound');
    await expect(ftCollectionForNesting.transfer(alice, futureToken.nestingAccount(), 50n)).to.be.rejectedWith('TokenNotFound');
  });

  itEth.ifWithPallets('Cannot nest to collection address', [Pallets.ReFungible], async({helper}) => {
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

  itEth.ifWithPallets('Cannot nest in RFT or FT', [Pallets.ReFungible], async ({helper}) => {
  // Create default collection, permissions are not set:
    const rftCollection = await helper.rft.mintCollection(alice);
    const ftCollection = await helper.ft.mintCollection(alice);

    const rftToken = await rftCollection.mintToken(alice);
    const _ftToken = await ftCollection.mint(alice, 100n);

    const collectionForNesting = await helper.nft.mintCollection(alice);

    // 1. Alice cannot create immediately nested tokens:
    await expect(collectionForNesting.mintToken(alice, rftToken.nestingAccount())).to.be.rejectedWith('refungible.RefungibleDisallowsNesting');
    await expect(collectionForNesting.mintToken(alice, {Ethereum: helper.ethAddress.fromTokenId(ftCollection.collectionId, 0)})).to.be.rejectedWith('fungible.FungibleDisallowsNesting');

    // 2. Alice cannot mint and nest token:
    const nestedToken2 = await collectionForNesting.mintToken(alice);
    await expect(nestedToken2.nest(alice, rftToken)).to.be.rejectedWith('refungible.RefungibleDisallowsNesting');
    await expect(ftCollection.transfer(alice, {Ethereum: helper.ethAddress.fromTokenId(ftCollection.collectionId, 0)})).to.be.rejectedWith('fungible.FungibleDisallowsNesting');
  });
});
