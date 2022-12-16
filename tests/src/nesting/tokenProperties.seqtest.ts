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
import {itSub, Pallets, usingPlaygrounds, expect, requirePalletsOrSkip} from '../util';

describe('Integration Test: Token Properties', () => {
  let superuser: IKeyringPair;
  let alice: IKeyringPair; // collection owner

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      superuser = await privateKey('//Alice');
      const donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  [
    {mode: 'nft' as const, pieces: undefined, requiredPallets: []},
    {mode: 'rft' as const, pieces: 100n, requiredPallets: [Pallets.ReFungible]}, 
  ].map(testSuite => describe(`${testSuite.mode.toUpperCase()}`, () => {
    before(async function() {
      // eslint-disable-next-line require-await
      await usingPlaygrounds(async helper => {
        requirePalletsOrSkip(this, helper, testSuite.requiredPallets);
      });
    });
    
    itSub('force_repair_item preserves valid consumed space', async({helper}) => {
      const propKey = 'tok-prop';

      const collection = await helper[testSuite.mode].mintCollection(alice, {
        tokenPropertyPermissions: [
          {
            key: propKey,
            permission: {mutable: true, tokenOwner: true},
          },
        ],
      });
      const token = await (
        testSuite.pieces
          ? collection.mintToken(alice, testSuite.pieces)
          : collection.mintToken(alice)
      );

      const propDataSize = 4096;
      const propData = 'a'.repeat(propDataSize);

      await token.setProperties(alice, [{key: propKey, value: propData}]);
      const originalSpace = await token.getTokenPropertiesConsumedSpace();
      expect(originalSpace).to.be.equal(propDataSize);

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.unique.forceRepairItem', [token.collectionId, token.tokenId], true);
      const recomputedSpace = await token.getTokenPropertiesConsumedSpace();
      expect(recomputedSpace).to.be.equal(originalSpace);
    });
  }));
});