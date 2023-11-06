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
import {itSub, Pallets, usingPlaygrounds, expect, requirePalletsOrSkip, sizeOfProperty} from '../util/index.js';

describe('Integration Test: Collection Properties with sudo', () => {
  let superuser: IKeyringPair;
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      superuser = await privateKey('//Alice');
      const donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'ft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testSuite => describe(`${testSuite.mode.toUpperCase()}`, () => {
    before(async function() {
      // eslint-disable-next-line require-await
      await usingPlaygrounds(async helper => {
        requirePalletsOrSkip(this, helper, testSuite.requiredPallets);
      });
    });

    itSub('Repairing an unbroken collection\'s properties preserves the consumed space', async({helper}) => {
      const properties = [
        {key: 'sea-creatures', value: 'mermaids'},
        {key: 'goldenratio', value: '1.6180339887498948482045868343656381177203091798057628621354486227052604628189'},
      ];
      const collection = await helper[testSuite.mode].mintCollection(alice, {properties});

      const newProperty = {key: 'space', value: ' '.repeat(4096)};
      await collection.setProperties(alice, [newProperty]);
      const originalSpace = await collection.getPropertiesConsumedSpace();
      expect(originalSpace).to.be.equal(sizeOfProperty(properties[0]) + sizeOfProperty(properties[1]) + sizeOfProperty(newProperty));

      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.unique.forceRepairCollection', [collection.collectionId], true);
      const recomputedSpace = await collection.getPropertiesConsumedSpace();
      expect(recomputedSpace).to.be.equal(originalSpace);
    });
  }));
});
