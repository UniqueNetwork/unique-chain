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

itSub.ifWithPallets('Cannot nest in non existing token', [Pallets.ReFungible], async ({helper}) => {
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
    const _ft = await ftCollectionForNesting.mint(alice, 100n);
    await expect(nft.transfer(alice, testCase.token.nestingAccount())).to.be.rejectedWith(testCase.error);
    await expect(rft.transfer(alice, testCase.token.nestingAccount())).to.be.rejectedWith(testCase.error);
    await expect(ftCollectionForNesting.transfer(alice, testCase.token.nestingAccount(), 50n)).to.be.rejectedWith(testCase.error);
  }
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
