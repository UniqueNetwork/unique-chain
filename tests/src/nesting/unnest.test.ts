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

describe('Integration Test: Unnesting', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  itSub('NFT: allows the owner to successfully unnest a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);
    
    // Create a nested token
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());

    // Unnest
    await expect(nestedToken.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}), 'while unnesting').to.be.fulfilled;
    expect(await nestedToken.getOwner()).to.be.deep.equal({Substrate: alice.address});

    // Nest and burn
    await nestedToken.nest(alice, targetToken);
    await expect(nestedToken.burnFrom(alice, targetToken.nestingAccount()), 'while burning').to.be.fulfilled;
    await expect(nestedToken.getOwner()).to.be.rejected;
  });

  itSub('Fungible: allows the owner to successfully unnest a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    const collectionFT = await helper.ft.mintCollection(alice);
    
    // Nest and unnest
    await collectionFT.mint(alice, 10n, targetToken.nestingAccount());
    await expect(collectionFT.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}, 9n), 'while unnesting').to.be.fulfilled;
    expect(await collectionFT.getBalance({Substrate: alice.address})).to.be.equal(9n);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(1n);

    // Nest and burn
    await collectionFT.transfer(alice, targetToken.nestingAccount(), 5n);
    await expect(collectionFT.burnTokensFrom(alice, targetToken.nestingAccount(), 6n), 'while burning').to.be.fulfilled;
    expect(await collectionFT.getBalance({Substrate: alice.address})).to.be.equal(4n);
    expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(0n);
    expect(await targetToken.getChildren()).to.be.length(0);
  });

  itSub.ifWithPallets('ReFungible: allows the owner to successfully unnest a token', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    const collectionRFT = await helper.rft.mintCollection(alice);
    
    // Nest and unnest
    const token = await collectionRFT.mintToken(alice, 10n, targetToken.nestingAccount());
    await expect(token.transferFrom(alice, targetToken.nestingAccount(), {Substrate: alice.address}, 9n), 'while unnesting').to.be.fulfilled;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(9n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(1n);

    // Nest and burn
    await token.transfer(alice, targetToken.nestingAccount(), 5n);
    await expect(token.burnFrom(alice, targetToken.nestingAccount(), 6n), 'while burning').to.be.fulfilled;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(4n);
    expect(await token.getBalance(targetToken.nestingAccount())).to.be.equal(0n);
    expect(await targetToken.getChildren()).to.be.length(0);
  });
});

describe('Negative Test: Unnesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('Disallows a non-owner to unnest/burn a token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Create a nested token
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());

    // Try to unnest
    await expect(nestedToken.unnest(bob, targetToken, {Substrate: alice.address})).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());

    // Try to burn
    await expect(nestedToken.burnFrom(bob, targetToken.nestingAccount())).to.be.rejectedWith(/common\.ApprovedValueTooLow/);
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());
  });

  // todo another test for creating excessive depth matryoshka with Ethereum?

  // Recursive nesting
  itSub('Prevents Ouroboros creation', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const targetToken = await collection.mintToken(alice);

    // Fail to create a nested token ouroboros
    const nestedToken = await collection.mintToken(alice, targetToken.nestingAccount());
    await expect(targetToken.nest(alice, nestedToken)).to.be.rejectedWith(/^structure\.OuroborosDetected$/);
  });
});
