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

describe('Collection admin', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([200n, 10n, 10n], donor);
    });
  });

  [
    {restricted: true},
    {restricted: false},
  ].map(testCase => {
    itSub(`can nest tokens if "collectionAdmin" permission set ${testCase.restricted ? ', in restricted mode' : ''}`, async ({helper}) => {
      const collectionA = await helper.nft.mintCollection(alice);
      await collectionA.addAdmin(alice, {Substrate: bob.address});
      const collectionB = await helper.nft.mintCollection(alice);
      await collectionB.addAdmin(alice, {Substrate: bob.address});
      // Collection has permission for collectionAdmin to nest:
      await collectionA.setPermissions(alice, {nesting:
        {collectionAdmin: true, restricted: testCase.restricted ? [collectionA.collectionId, collectionB.collectionId] : null},
      });
      // Token for nesting in from collectionA:
      const targetTokenA = await collectionA.mintToken(alice, {Substrate: charlie.address});

      // 1. Create an immediately nested tokens:
      // 1.1 From own collection:
      const nestedTokenA = await collectionA.mintToken(bob, targetTokenA.nestingAccount());
      // 1.2 From different collection:
      const nestedTokenB = await collectionB.mintToken(bob, targetTokenA.nestingAccount());
      expect(await nestedTokenA.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
      expect(await nestedTokenA.getOwner()).to.be.deep.equal(targetTokenA.nestingAccount().toLowerCase());
      expect(await nestedTokenB.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
      expect(await nestedTokenB.getOwner()).to.be.deep.equal(targetTokenA.nestingAccount().toLowerCase());

      // 2. Create a token to be nested and nest:
      const newNestedTokenA = await collectionA.mintToken(bob);
      const newNestedTokenB = await collectionB.mintToken(bob);
      // 2.1 From own collection:
      await newNestedTokenA.nest(bob, targetTokenA);
      // 2.2 From different collection:
      await newNestedTokenB.nest(bob, targetTokenA);
      expect(await newNestedTokenB.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
      expect(await newNestedTokenB.getOwner()).to.be.deep.equal(targetTokenA.nestingAccount().toLowerCase());
    });
  });

  itSub('can operate together with token owner if "collectionAdmin" and "tokenOwner" permissions set', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {permissions: {nesting: {collectionAdmin: true, tokenOwner: true}}});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const targetToken = await collection.mintToken(alice, {Substrate: charlie.address});

    // Admin can create an immediately nested token:
    const nestedToken = await collection.mintToken(bob, targetToken.nestingAccount());
    expect(await nestedToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await nestedToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());

    // Owner can create and and nest:
    const newToken = await collection.mintToken(alice, {Substrate: charlie.address});
    await newToken.nest(charlie, targetToken);
    expect(await newToken.getTopmostOwner()).to.be.deep.equal({Substrate: charlie.address});
    expect(await newToken.getOwner()).to.be.deep.equal(targetToken.nestingAccount().toLowerCase());
  });
});

