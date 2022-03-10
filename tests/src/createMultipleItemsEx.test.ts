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

import {expect} from 'chai';
import privateKey from './substrate/privateKey';
import usingApi, {executeTransaction} from './substrate/substrate-api';
import {createCollectionExpectSuccess} from './util/helpers';

describe('createMultipleItemsEx', () => {
  it('can initialize multiple NFT with different owners', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
          constData: '0x0000',
          variableData: '0x1111',
        }, {
          owner: {substrate: bob.address},
          constData: '0x2222',
          variableData: '0x3333',
        }, {
          owner: {substrate: charlie.address},
          constData: '0x4444',
          variableData: '0x5555',
        },
      ];

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        NFT: data,
      }));
      const tokens = await api.query.nonfungible.tokenData.entries(collection);
      const json = tokens.map(([, token]) => token.toJSON());
      expect(json).to.be.deep.equal(data);
    });
  });

  it('fails when trying to set multiple owners when creating multiple refungibles', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');

    await usingApi(async (api) => {
      // Polkadot requires map, and yet requires keys to be JSON encoded
      const users = new Map();
      users.set(JSON.stringify({substrate: alice.address}), 1);
      users.set(JSON.stringify({substrate: bob.address}), 1);

      // TODO: better error message?
      await expect(executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        RefungibleMultipleItems: [
          {users},
          {users},
        ],
      }))).to.be.rejectedWith(/^refungible\.NotRefungibleDataUsedToMintFungibleCollectionToken$/);
    });
  });
});
