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

describe('Negative Test: Unnesting', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 50n], donor);
    });
  });

  // TODO: make this test a bit more generic
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

  [
    {restrictedMode: true},
    {restrictedMode: false},
  ].map(testCase => {
    itSub(`Fungible: disallows a non-Owner to unnest someone else's token ${testCase.restrictedMode ? '(Restricted nesting)' : ''}`, async ({helper}) => {
      const collectionNFT = await helper.nft.mintCollection(alice);
      const collectionFT = await helper.ft.mintCollection(alice);
      const targetToken = await collectionNFT.mintToken(alice, {Substrate: bob.address});

      await collectionNFT.setPermissions(alice, {nesting: {
        collectionAdmin: true, tokenOwner: true, restricted: testCase.restrictedMode ? [collectionFT.collectionId] : null,
      }});

      // Nest some tokens as Alice into Bob's token
      await collectionFT.mint(alice, 5n, targetToken.nestingAccount());

      // Try to pull it out as Alice still
      await expect(collectionFT.transferFrom(alice, targetToken.nestingAccount(), {Substrate: bob.address}, 1n))
        .to.be.rejectedWith(/common\.ApprovedValueTooLow/);
      expect(await collectionFT.getBalance(targetToken.nestingAccount())).to.be.equal(5n);
    });
  });
});
