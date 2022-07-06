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
import usingApi, {executeTransaction} from './substrate/substrate-api';
import {addCollectionAdminExpectSuccess, createCollectionExpectSuccess, createCollectionWithPropsExpectSuccess, getBalance, getLastTokenId} from './util/helpers';

describe('Integration Test: createMultipleItemsEx', () => {
  it('can initialize multiple NFT with different owners', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
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
    const collection = await createCollectionWithPropsExpectSuccess({mode: {type: 'NFT'}, propPerm: [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: false}}]});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      const data = [
        {
          owner: {substrate: alice.address},
          properties: [{key: 'k', value: 'v1'}],
        }, {
          owner: {substrate: bob.address},
          properties: [{key: 'k', value: 'v2'}],
        }, {
          owner: {substrate: charlie.address},
          properties: [{key: 'k', value: 'v3'}],
        },
      ];

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        NFT: data,
      }));
      for (let i = 1; i < 4; i++) {
        expect(await api.rpc.unique.tokenProperties(collection, i)).not.to.be.empty;
      }
    });
  });

  it('createMultipleItemsEx with property AdminConst', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({mode: {type: 'NFT'}, propPerm: [{key: 'k', permission: {mutable: false, collectionAdmin: true, tokenOwner: false}}]});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      const data = [
        {
          owner: {substrate: alice.address},
          properties: [{key: 'k', value: 'v1'}],
        }, {
          owner: {substrate: bob.address},
          properties: [{key: 'k', value: 'v2'}],
        }, {
          owner: {substrate: charlie.address},
          properties: [{key: 'k', value: 'v3'}],
        },
      ];

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        NFT: data,
      }));
      for (let i = 1; i < 4; i++) {
        expect(await api.rpc.unique.tokenProperties(collection, i)).not.to.be.empty;
      }
    });
  });

  it('createMultipleItemsEx with property itemOwnerOrAdmin', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({mode: {type: 'NFT'}, propPerm: [{key: 'k', permission: {mutable: false, collectionAdmin: true, tokenOwner: true}}]});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      const data = [
        {
          owner: {substrate: alice.address},
          properties: [{key: 'k', value: 'v1'}],
        }, {
          owner: {substrate: bob.address},
          properties: [{key: 'k', value: 'v2'}],
        }, {
          owner: {substrate: charlie.address},
          properties: [{key: 'k', value: 'v3'}],
        },
      ];

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        NFT: data,
      }));
      for (let i = 1; i < 4; i++) {
        expect(await api.rpc.unique.tokenProperties(collection, i)).not.to.be.empty;
      }
    });
  });

  it('can initialize fungible with multiple owners', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');

      const users = new Map();
      users.set(JSON.stringify({Substrate: alice.address}), 50);
      users.set(JSON.stringify({Substrate: bob.address}), 100);

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        Fungible: users,
      }));

      expect(await getBalance(api, collection, alice.address, 0)).to.equal(50n);
      expect(await getBalance(api, collection, bob.address, 0)).to.equal(100n);
    });
  });

  it('can initialize an RFT with multiple owners', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');

      const users = new Map();
      users.set(JSON.stringify({Substrate: alice.address}), 1);
      users.set(JSON.stringify({Substrate: bob.address}), 2);

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        RefungibleMultipleOwners: {
          users: users,
        },
      }));
      
      const itemsListIndexAfter = await getLastTokenId(api, collection);
      expect(itemsListIndexAfter).to.be.equal(1);

      expect(await getBalance(api, collection, alice.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collection, bob.address, 1)).to.be.equal(2n);
    });
  });

  it('can initialize multiple RFTs with the same owner', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');

      const item1User = new Map();
      item1User.set(JSON.stringify({Substrate: alice.address}), 1);

      const item2User = new Map();
      item2User.set(JSON.stringify({Substrate: alice.address}), 3);

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        RefungibleMultipleItems: [
          {users: item1User},
          {users: item2User},
        ],
      }));
      
      const itemsListIndexAfter = await getLastTokenId(api, collection);
      expect(itemsListIndexAfter).to.be.equal(2);

      expect(await getBalance(api, collection, alice.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collection, alice.address, 2)).to.be.equal(3n);
    });
  });
});

describe('Negative test: createMultipleItemsEx', () => {
  it('No editing rights', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}],
      propPerm:   [{key: 'key1', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}]});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      await addCollectionAdminExpectSuccess(alice, collection, bob.address);
      const data = [
        {
          owner: {substrate: alice.address},
          properties: [{key: 'key1', value: 'v2'}],
        }, {
          owner: {substrate: bob.address},
          properties: [{key: 'key1', value: 'v2'}],
        }, {
          owner: {substrate: charlie.address},
          properties: [{key: 'key1', value: 'v2'}],
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});
      // await executeTransaction(api, alice, tx);

      //await submitTransactionExpectFailAsync(alice, tx);
      await expect(executeTransaction(api, alice, tx)).to.be.rejectedWith(/common\.NoPermission/);
    });
  });

  it('User doesnt have editing rights', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}],
      propPerm:   [{key: 'key1', permission: {mutable: false, collectionAdmin: false, tokenOwner: false}}]});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      await addCollectionAdminExpectSuccess(alice, collection, bob.address);
      const data = [
        {
          owner: {substrate: alice.address},
          properties: [{key: 'key1', value: 'v2'}],
        }, {
          owner: {substrate: alice.address},
          properties: [{key: 'key1', value: 'v2'}],
        }, {
          owner: {substrate: alice.address},
          properties: [{key: 'key1', value: 'v2'}],
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});
      // await executeTransaction(api, alice, tx);

      //await submitTransactionExpectFailAsync(alice, tx);
      await expect(executeTransaction(api, alice, tx)).to.be.rejectedWith(/common\.NoPermission/);
    });
  });

  it('Adding property without access rights', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}]});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      await addCollectionAdminExpectSuccess(alice, collection, bob.address);
      const data = [
        {
          owner: {substrate: alice.address},
          properties: [{key: 'key1', value: 'v2'}],
        }, {
          owner: {substrate: bob.address},
          properties: [{key: 'key1', value: 'v2'}],
        }, {
          owner: {substrate: charlie.address},
          properties: [{key: 'key1', value: 'v2'}],
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});

      await expect(executeTransaction(api, alice, tx)).to.be.rejectedWith(/common\.NoPermission/);
      //await submitTransactionExpectFailAsync(alice, tx);
    });
  });

  it('Adding more than 64 properties', async () => {
    const propPerms = [{key: 'key', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}];

    for (let i = 0; i < 65; i++) {
      propPerms.push({key: `key${i}`, permission: {mutable: true, collectionAdmin: true, tokenOwner: true}});
    }

    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      await expect(executeTransaction(api, alice, api.tx.unique.setTokenPropertyPermissions(collection, propPerms))).to.be.rejectedWith(/common\.PropertyLimitReached/);
    });
  });

  it('Trying to add bigger property than allowed', async () => {
    const collection = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}]});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      await addCollectionAdminExpectSuccess(alice, collection, bob.address);
      const data = [
        {
          owner: {substrate: alice.address}, properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}],
        }, {
          owner: {substrate: bob.address}, properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}],
        }, {
          owner: {substrate: charlie.address}, properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}],
        },
      ];

      const tx = api.tx.unique.createMultipleItemsEx(collection, {NFT: data});

      //await submitTransactionExpectFailAsync(alice, tx);
      await expect(executeTransaction(api, alice, tx)).to.be.rejectedWith(/common\.NoPermission/);
    });
  });

  it('can initialize multiple NFT with different owners', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
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
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const charlie = privateKeyWrapper('//Charlie');
      const data = [
        {
          owner: {substrate: alice.address},
        }, {
          owner: {substrate: bob.address},
        }, {
          owner: {substrate: charlie.address},
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
    
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
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
