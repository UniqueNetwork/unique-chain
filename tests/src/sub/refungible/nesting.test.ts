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
import {expect, itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds} from '../../util';

describe('Refungible nesting', () => {
  let alice: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      const donor = await privateKey({filename: __filename});
      [alice, charlie] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  [
    {restrictedMode: true},
    {restrictedMode: false},
  ].map(testCase => {
    itSub(`Owner can nest their token${testCase.restrictedMode ? ': Restricted mode' : ''}`, async ({helper}) => {
      const collectionNFT = await helper.nft.mintCollection(alice, {permissions: {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true}}});
      const collectionRFT = await helper.rft.mintCollection(alice);
      const targetToken = await collectionNFT.mintToken(alice, {Substrate: charlie.address});

      await collectionNFT.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true, restricted: testCase.restrictedMode ? [collectionRFT.collectionId] : null}});
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
      expect(await newToken.getBalance({Substrate: charlie.address})).to.be.equal(3n);
    });
  });

  itSub('owner can unnest nested token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Owner mints nested RFT token:
    const collectionRFT = await helper.rft.mintCollection(alice);
    const token = await collectionRFT.mintToken(alice, 10n, targetToken.nestingAccount());

    // 1.1 Owner can partially unnest token pieces with transferFrom:
    await token.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}, 9n);
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(9n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(1n);

    // 1.2 Owner can unnest all pieces:
    await token.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}, 1n);
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(10n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(0n);
  });

  itSub('owner can burn nested token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Owner mints nested RFT token:
    const collectionRFT = await helper.rft.mintCollection(alice);
    const token = await collectionRFT.mintToken(alice, 10n, targetToken.nestingAccount());

    // 1.1 Owner can partially burnFrom nested pieces:
    await token.burnFrom(alice, targetToken.nestingAccount(), 6n);
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(0n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(4n);
    expect(await targetToken.getChildren()).to.has.length(1);

    // 1.1 Owner can burnFrom all nested pieces:
    await token.burnFrom(alice, targetToken.nestingAccount(), 4n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(0n);
    expect(await targetToken.getChildren()).to.has.length(0);
    expect(await token.doesExist()).to.be.false;
  });
});

describe('Refungible nesting negative tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 50n], donor);
    });
  });

  itSub('cannot nest token if nesting is disabled', async ({helper}) => {
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

  [
    {restrictedMode: true},
    {restrictedMode: false},
  ].map(testCase => {
    itSub(`non-Owner cannot nest someone else's token${testCase.restrictedMode ? ': Restricted mode' : ''}`, async ({helper}) => {
      const collectionNFT = await helper.nft.mintCollection(alice);
      const collectionRFT = await helper.rft.mintCollection(alice);
      const targetToken = await collectionNFT.mintToken(alice);

      await collectionNFT.setPermissions(alice, {access: 'AllowList', mintMode: true, nesting: {tokenOwner: true, restricted: testCase.restrictedMode ? [collectionRFT.collectionId] : null}});
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
  });

  itSub('ReFungible: disallows to nest token to an unlisted collection', async ({helper}) => {
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
