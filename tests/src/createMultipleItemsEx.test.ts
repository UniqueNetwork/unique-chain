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
import {usingPlaygrounds, expect, Pallets, itSub} from './util/playgrounds';
import usingApi, {executeTransaction} from './substrate/substrate-api';
import {createCollectionExpectSuccess, getBalance, getLastTokenId, getTokenProperties, requirePallets} from './util/helpers';
import {IProperty} from './util/playgrounds/types';

describe('Integration Test: createMultipleItemsEx', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itSub('can initialize multiple NFT with different owners', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
    });
    const args = [
      {
        owner: {Substrate: alice.address},
      },
      {
        owner: {Substrate: bob.address},
      },
      {
        owner: {Substrate: charlie.address},
      },
    ];

    const tokens = await collection.mintMultipleTokens(alice, args);
    for (const [i, token] of tokens.entries()) {
      expect(await token.getOwner()).to.be.deep.equal(args[i].owner);
    }
  });

  itSub('createMultipleItemsEx with property Admin', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {
          key: 'k',
          permission: {
            mutable: true,
            collectionAdmin: true,
            tokenOwner: false,
          },
        },
      ],
    });

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: [{key: 'k', value: 'v1'}],
      },
      {
        owner: {Substrate: bob.address},
        properties: [{key: 'k', value: 'v2'}],
      },
      {
        owner: {Substrate: charlie.address},
        properties: [{key: 'k', value: 'v3'}],
      },
    ];

    const tokens = await collection.mintMultipleTokens(alice, args);
    for (const [i, token] of tokens.entries()) {
      expect(await token.getOwner()).to.be.deep.equal(args[i].owner);
      expect(await token.getData()).to.not.be.empty;
    }
  });

  itSub('createMultipleItemsEx with property AdminConst', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {
          key: 'k',
          permission: {
            mutable: false,
            collectionAdmin: true,
            tokenOwner: false,
          },
        },
      ],
    });

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: [{key: 'k', value: 'v1'}],
      },
      {
        owner: {Substrate: bob.address},
        properties: [{key: 'k', value: 'v2'}],
      },
      {
        owner: {Substrate: charlie.address},
        properties: [{key: 'k', value: 'v3'}],
      },
    ];

    const tokens = await collection.mintMultipleTokens(alice, args);
    for (const [i, token] of tokens.entries()) {
      expect(await token.getOwner()).to.be.deep.equal(args[i].owner);
      expect(await token.getData()).to.not.be.empty;
    }
  });

  itSub('createMultipleItemsEx with property itemOwnerOrAdmin', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {
          key: 'k',
          permission: {
            mutable: false,
            collectionAdmin: true,
            tokenOwner: true,
          },
        },
      ],
    });

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: [{key: 'k', value: 'v1'}],
      },
      {
        owner: {Substrate: bob.address},
        properties: [{key: 'k', value: 'v2'}],
      },
      {
        owner: {Substrate: charlie.address},
        properties: [{key: 'k', value: 'v3'}],
      },
    ];

    const tokens = await collection.mintMultipleTokens(alice, args);
    for (const [i, token] of tokens.entries()) {
      expect(await token.getOwner()).to.be.deep.equal(args[i].owner);
      expect(await token.getData()).to.not.be.empty;
    }
  });

  it.skip('can initialize fungible with multiple owners', async () => {
    const collection = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        Fungible: new Map([
          [JSON.stringify({Substrate: alice.address}), 50],
          [JSON.stringify({Substrate: bob.address}), 100],
        ]),
      }));

      expect(await getBalance(api, collection, alice.address, 0)).to.equal(50n);
      expect(await getBalance(api, collection, bob.address, 0)).to.equal(100n);
    });
  });

  it.skip('can initialize an RFT with multiple owners', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      const collection = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      await executeTransaction(
        api,
        alice,
        api.tx.unique.setTokenPropertyPermissions(collection, [{key: 'data', permission: {tokenOwner: true}}]),
      );

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        RefungibleMultipleOwners: {
          users: new Map([
            [JSON.stringify({Substrate: alice.address}), 1],
            [JSON.stringify({Substrate: bob.address}), 2],
          ]),
          properties: [
            {key: 'data', value: 'testValue'},
          ],
        },
      }));

      const itemsListIndexAfter = await getLastTokenId(api, collection);
      expect(itemsListIndexAfter).to.be.equal(1);

      expect(await getBalance(api, collection, alice.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collection, bob.address, 1)).to.be.equal(2n);
      expect((await getTokenProperties(api, collection, 1, ['data']))[0].value).to.be.equal('testValue');
    });
  });

  it.skip('can initialize multiple RFTs with the same owner', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');
      const collection = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      await executeTransaction(
        api,
        alice,
        api.tx.unique.setTokenPropertyPermissions(collection, [{key: 'data', permission: {tokenOwner: true}}]),
      );

      await executeTransaction(api, alice, api.tx.unique.createMultipleItemsEx(collection, {
        RefungibleMultipleItems: [
          {
            user: {Substrate: alice.address}, pieces: 1,
            properties: [
              {key: 'data', value: 'testValue1'},
            ],
          },
          {
            user: {Substrate: alice.address}, pieces: 3,
            properties: [
              {key: 'data', value: 'testValue2'},
            ],
          },
        ],
      }));

      const itemsListIndexAfter = await getLastTokenId(api, collection);
      expect(itemsListIndexAfter).to.be.equal(2);

      expect(await getBalance(api, collection, alice.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collection, alice.address, 2)).to.be.equal(3n);
      expect((await getTokenProperties(api, collection, 1, ['data']))[0].value).to.be.equal('testValue1');
      expect((await getTokenProperties(api, collection, 2, ['data']))[0].value).to.be.equal('testValue2');
    });
  });
});

describe('Negative test: createMultipleItemsEx', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itSub('No editing rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {
          key: 'k',
          permission: {
            mutable: true,
            collectionAdmin: false,
            tokenOwner: false,
          },
        },
      ],
    });

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: [{key: 'k', value: 'v1'}],
      },
      {
        owner: {Substrate: bob.address},
        properties: [{key: 'k', value: 'v2'}],
      },
      {
        owner: {Substrate: charlie.address},
        properties: [{key: 'k', value: 'v3'}],
      },
    ];

    await expect(collection.mintMultipleTokens(alice, args)).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('User doesnt have editing rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {
          key: 'k',
          permission: {
            mutable: false,
            collectionAdmin: false,
            tokenOwner: false,
          },
        },
      ],
    });

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: [{key: 'k', value: 'v1'}],
      },
      {
        owner: {Substrate: bob.address},
        properties: [{key: 'k', value: 'v2'}],
      },
      {
        owner: {Substrate: charlie.address},
        properties: [{key: 'k', value: 'v3'}],
      },
    ];

    await expect(collection.mintMultipleTokens(alice, args)).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Adding property without access rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
    });

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: [{key: 'k', value: 'v1'}],
      },
      {
        owner: {Substrate: bob.address},
        properties: [{key: 'k', value: 'v2'}],
      },
      {
        owner: {Substrate: charlie.address},
        properties: [{key: 'k', value: 'v3'}],
      },
    ];

    await expect(collection.mintMultipleTokens(alice, args)).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Adding more than 64 properties', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {
          key: 'k',
          permission: {
            mutable: true,
            collectionAdmin: true,
            tokenOwner: true,
          },
        },
      ],
    });

    const properties: IProperty[] = [];

    for (let i = 0; i < 65; i++) {
      properties.push({key: `k${i}`, value: `v${i}`});
    }

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: properties,
      },
      {
        owner: {Substrate: bob.address},
        properties: properties,
      },
      {
        owner: {Substrate: charlie.address},
        properties: properties,
      },
    ];

    await expect(collection.mintMultipleTokens(alice, args)).to.be.rejectedWith('Verification Error');
  });

  itSub('Trying to add bigger property than allowed', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {
          key: 'k',
          permission: {
            mutable: true,
            collectionAdmin: true,
            tokenOwner: true,
          },
        },
      ],
    });

    const args = [
      {
        owner: {Substrate: alice.address},
        properties: [{key: 'k', value: 'A'.repeat(32769)}],
      },
      {
        owner: {Substrate: bob.address},
        properties: [{key: 'k', value: 'A'.repeat(32769)}],
      },
      {
        owner: {Substrate: charlie.address},
        properties: [{key: 'k', value: 'A'.repeat(32769)}],
      },
    ];

    await expect(collection.mintMultipleTokens(alice, args)).to.be.rejectedWith('Verification Error');
  });
});
