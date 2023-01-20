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
import {expect, itSub, usingPlaygrounds} from '../../util';

describe('Composite nesting tests', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('Checks token children e2e', async ({helper}) => {
    const collectionA = await helper.nft.mintCollection(alice, {permissions: {nesting: {tokenOwner: true}}});
    const collectionB = await helper.ft.mintCollection(alice);
    const collectionC = await helper.rft.mintCollection(alice);

    const targetToken = await collectionA.mintToken(alice);
    expect((await targetToken.getChildren()).length).to.be.equal(0, 'Children length check at creation');

    // Create a nested NFT token
    const tokenA = await collectionA.mintToken(alice, targetToken.nestingAccount());
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
    ]).and.has.length(1);

    // Create then nest
    const tokenB = await collectionA.mintToken(alice);
    await tokenB.nest(alice, targetToken);
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: tokenB.tokenId, collectionId: collectionA.collectionId},
    ]).and.has.length(2);

    // Move token B to a different user outside the nesting tree
    await tokenB.unnest(alice, targetToken, {Substrate: bob.address});
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
    ]).and.has.length(1);

    // Create a fungible token in another collection and then nest
    await collectionB.mint(alice, 10n);
    await collectionB.transfer(alice, targetToken.nestingAccount(), 2n);
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: 0, collectionId: collectionB.collectionId},
    ]).and.has.length(2);

    // Create a refungible token in another collection and then nest
    const tokenC = await collectionC.mintToken(alice, 10n);
    await tokenC.transfer(alice, targetToken.nestingAccount(), 2n);
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: 0, collectionId: collectionB.collectionId},
      {tokenId: tokenC.tokenId, collectionId: collectionC.collectionId},
    ]).and.has.length(3);

    // Burn all nested pieces
    await tokenC.burnFrom(alice, targetToken.nestingAccount(), 2n);
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: 0, collectionId: collectionB.collectionId},
    ])
      .and.has.length(2);

    // Move part of the fungible token inside token A deeper in the nesting tree
    await collectionB.transferFrom(alice, targetToken.nestingAccount(), tokenA.nestingAccount(), 1n);
    expect(await targetToken.getChildren()).to.be.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
      {tokenId: 0, collectionId: collectionB.collectionId},
    ]).and.has.length(2);
    // Nested token also has children now:
    expect(await tokenA.getChildren()).to.have.deep.members([
      {tokenId: 0, collectionId: collectionB.collectionId},
    ]).and.has.length(1);

    // Move the remaining part of the fungible token inside token A deeper in the nesting tree
    await collectionB.transferFrom(alice, targetToken.nestingAccount(), tokenA.nestingAccount(), 1n);
    expect(await targetToken.getChildren()).to.have.deep.members([
      {tokenId: tokenA.tokenId, collectionId: collectionA.collectionId},
    ]).and.has.length(1);
    expect(await tokenA.getChildren()).to.have.deep.members([
      {tokenId: 0, collectionId: collectionB.collectionId},
    ]).and.has.length(1);
  });
});
