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

describe('ReFungible-specific nesting tests', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([200n], donor);
    });
  });

  itSub.ifWithPallets('ReFungible: getTopmostOwner works correctly with Nesting', [Pallets.ReFungible], async({helper}) => {
    const collectionNFT = await helper.nft.mintCollection(alice, {
      permissions: {
        nesting: {
          tokenOwner: true,
        },
      },
    });
    const collectionRFT = await helper.rft.mintCollection(alice);

    const nft = await collectionNFT.mintToken(alice, {Substrate: alice.address});
    const rft = await collectionRFT.mintToken(alice, 100n, {Substrate: alice.address});

    expect(await rft.getTopmostOwner()).deep.equal({Substrate: alice.address});

    await rft.transfer(alice, nft.nestingAccount(), 40n);

    expect(await rft.getTopmostOwner()).deep.equal(null);

    await rft.transfer(alice, nft.nestingAccount(), 60n);

    expect(await rft.getTopmostOwner()).deep.equal({Substrate: alice.address});

    await rft.transferFrom(alice, nft.nestingAccount(), {Substrate: alice.address}, 30n);

    expect(await rft.getTopmostOwner()).deep.equal(null);

    await rft.transferFrom(alice, nft.nestingAccount(), {Substrate: alice.address}, 70n);

    expect(await rft.getTopmostOwner()).deep.equal({Substrate: alice.address});
  });
});
