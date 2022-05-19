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
import usingApi, {executeTransaction, submitTransactionAsync} from './substrate/substrate-api';
import {createCollectionExpectSuccess, createCollectionWithPropsExpectSuccess, addCollectionAdminExpectSuccess, getCreateItemsResult} from './util/helpers';

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
        }, {
          owner: {substrate: bob.address},
          constData: '0x2222',
        }, {
          owner: {substrate: charlie.address},
          constData: '0x4444',
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

  it('createMultipleItemsEx with property Admin', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
          constData: '0x0000',
        }, {
          owner: {substrate: bob.address},
          constData: '0x2222',
        }, {
          owner: {substrate: charlie.address},
          constData: '0x4444',
        },
      ];

      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.setPropertyPermissions(collection, [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: false}}]),
      )).to.not.be.rejected;

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        NFT: data,
      }));
      const tokens = await api.query.nonfungible.tokenData.entries(collection);
      const json = tokens.map(([, token]) => token.toJSON());
      expect(json).to.be.deep.equal(data);
    });
  });

  it('createMultipleItemsEx with property AdminConst', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
          constData: '0x0000',
        }, {
          owner: {substrate: bob.address},
          constData: '0x2222',
        }, {
          owner: {substrate: charlie.address},
          constData: '0x4444',
        },
      ];
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.setPropertyPermissions(collection, [{key: 'k', permission: {mutable: false, collectionAdmin: true, tokenOwner: false}}]),
      )).to.not.be.rejected;

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        NFT: data,
      }));


      const tokens = await api.query.nonfungible.tokenData.entries(collection);
      const json = tokens.map(([, token]) => token.toJSON());
      expect(json).to.be.deep.equal(data);
    });
  });

  it('createMultipleItemsEx with property itemOwnerOrAdmin', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
          constData: '0x0000',
        }, {
          owner: {substrate: bob.address},
          constData: '0x2222',
        }, {
          owner: {substrate: charlie.address},
          constData: '0x4444',
        },
      ];
      await expect(executeTransaction(
        api,
        alice,
        api.tx.unique.setPropertyPermissions(collection, [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}]),
      )).to.not.be.rejected;

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        NFT: data,
      }));


      const tokens = await api.query.nonfungible.tokenData.entries(collection);
      const json = tokens.map(([, token]) => token.toJSON());
      expect(json).to.be.deep.equal(data);
    });
  });

  it('No editing rights', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}],
      propPerm:   [{key: 'key1', mutable: true, collectionAdmin: false, tokenOwner: false}]});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await addCollectionAdminExpectSuccess(alice, collection, bob.address);
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});
      await executeTransaction(api, alice, tx);

      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemsResult(events);

      for (const elem of result) {
        await expect(executeTransaction(
          api,
          bob,
          api.tx.unique.setTokenProperties(elem.collectionId, elem.itemId, [{key: 'key1', value: 'v2'}]),
        )).to.be.rejected;
      }
    });
  });

  it('User doesnt have editing rights', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}],
      propPerm:   [{key: 'key1', mutable: false, collectionAdmin: false, tokenOwner: false}]});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await addCollectionAdminExpectSuccess(alice, collection, bob.address);
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});
      await executeTransaction(api, alice, tx);

      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemsResult(events);

      for (const elem of result) {
        await expect(executeTransaction(
          api,
          bob,
          api.tx.unique.setTokenProperties(elem.collectionId, elem.itemId, [{key: 'key1', value: 'v2'}]),
        )).to.be.rejected;
      }
    });
  });

  it('Adding property without access rights', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}]});
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await addCollectionAdminExpectSuccess(alice, collection, bob.address);
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});
      await executeTransaction(api, alice, tx);

      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemsResult(events);

      for (const elem of result) {
        await expect(executeTransaction(
          api,
          bob,
          api.tx.unique.setTokenProperties(elem.collectionId, elem.itemId, [{key: 'key1', value: 'v2'}]),
        )).to.be.rejected;
      }
    });
  });

  it('Adding more than 64 prps', async () => {
    const collection = await createCollectionWithPropsExpectSuccess();
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await addCollectionAdminExpectSuccess(alice, collection, bob.address);
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});
      await executeTransaction(api, alice, tx);

      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemsResult(events);

      const prps = [];

      for (let i = 0; i < 65; i++) {
        prps.push({key: `key${i}`, value: `value${i}`});
      }

      await expect(executeTransaction(api, bob, api.tx.unique.setCollectionProperties(collection, prps))).to.be.rejectedWith(/common\.PropertyLimitReached/);


      for (const elem of result) {
        await expect(executeTransaction(
          api,
          bob,
          api.tx.unique.setTokenProperties(elem.collectionId, elem.itemId, prps),
        )).to.be.rejected;
      }
    });
  });

  it('Trying to add bigger property than allowed', async () => {
    const collection = await createCollectionWithPropsExpectSuccess();
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await addCollectionAdminExpectSuccess(alice, collection, bob.address);
    await usingApi(async (api) => {
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});
      await executeTransaction(api, alice, tx);

      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemsResult(events);

      const prps = [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}];

      await expect(executeTransaction(api, bob, api.tx.unique.setCollectionProperties(collection, prps))).to.be.rejectedWith(/common\.NoSpaceForProperty/);


      for (const elem of result) {
        await expect(executeTransaction(
          api,
          bob,
          api.tx.unique.setTokenProperties(elem.collectionId, elem.itemId, prps),
        )).to.be.rejected;
      }
    });
  });

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
        }, {
          owner: {substrate: bob.address},
          constData: '0x2222',
        }, {
          owner: {substrate: charlie.address},
          constData: '0x4444',
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
        }, {
          owner: {substrate: bob.address},
          constData: '0x2222',
        }, {
          owner: {substrate: charlie.address},
          constData: '0x4444',
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
'';
