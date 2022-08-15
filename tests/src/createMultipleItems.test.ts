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

import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync, executeTransaction} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  getGenericResult,
  normalizeAccountId,
  setCollectionLimitsExpectSuccess,
  addCollectionAdminExpectSuccess,
  getBalance,
  getTokenOwner,
  getLastTokenId,
  getCreatedCollectionCount,
  createCollectionWithPropsExpectSuccess,
  createMultipleItemsWithPropsExpectSuccess,
  getTokenProperties,
  requirePallets,
  Pallets,
  checkPalletsPresence,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  it('Create 0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);

      const alice = privateKeyWrapper('//Alice');
      await submitTransactionAsync(
        alice, 
        api.tx.unique.setTokenPropertyPermissions(collectionId, [{key: 'data', permission: {tokenOwner: true}}]),
      );
      
      const args = [
        {NFT: {properties: [{key: 'data', value: '1'}]}},
        {NFT: {properties: [{key: 'data', value: '2'}]}},
        {NFT: {properties: [{key: 'data', value: '3'}]}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect((await getTokenProperties(api, collectionId, 1, ['data']))[0].value).to.be.equal('1');
      expect((await getTokenProperties(api, collectionId, 2, ['data']))[0].value).to.be.equal('2');
      expect((await getTokenProperties(api, collectionId, 3, ['data']))[0].value).to.be.equal('3');
    });
  });

  it('Create 0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKeyWrapper('//Alice');
      const args = [
        {Fungible: {value: 1}},
        {Fungible: {value: 2}},
        {Fungible: {value: 3}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const token1Data = await getBalance(api, collectionId, alice.address, 0);

      expect(token1Data).to.be.equal(6n); // 1 + 2 + 3
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKeyWrapper('//Alice');
      const args = [
        {ReFungible: {pieces: 1}},
        {ReFungible: {pieces: 2}},
        {ReFungible: {pieces: 3}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getBalance(api, collectionId, alice.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, alice.address, 2)).to.be.equal(2n);
      expect(await getBalance(api, collectionId, alice.address, 3)).to.be.equal(3n);
    });
  });

  it('Can mint amount of items equals to collection limits', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Alice');

      const collectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, collectionId, {
        tokenLimit: 2,
      });
      const args = [
        {NFT: {}},
        {NFT: {}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      const events = await submitTransactionAsync(alice, createMultipleItemsTx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT with property Admin', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: false}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKeyWrapper('//Alice');
      const args = [
        {NFT: {properties: [{key: 'k', value: 'v1'}]}},
        {NFT: {properties: [{key: 'k', value: 'v2'}]}},
        {NFT: {properties: [{key: 'k', value: 'v3'}]}},
      ];

      await createMultipleItemsWithPropsExpectSuccess(alice, collectionId, args);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect((await getTokenProperties(api, collectionId, 1, ['k']))[0].value).to.be.equal('v1');
      expect((await getTokenProperties(api, collectionId, 2, ['k']))[0].value).to.be.equal('v2');
      expect((await getTokenProperties(api, collectionId, 3, ['k']))[0].value).to.be.equal('v3');
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT with property AdminConst', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'k', permission: {mutable: false, collectionAdmin: true, tokenOwner: false}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKeyWrapper('//Alice');
      const bob = privateKeyWrapper('//Bob');
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {NFT: {properties: [{key: 'k', value: 'v1'}]}},
        {NFT: {properties: [{key: 'k', value: 'v2'}]}},
        {NFT: {properties: [{key: 'k', value: 'v3'}]}},
      ];

      await createMultipleItemsWithPropsExpectSuccess(alice, collectionId, args);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect((await getTokenProperties(api, collectionId, 1, ['k']))[0].value).to.be.equal('v1');
      expect((await getTokenProperties(api, collectionId, 2, ['k']))[0].value).to.be.equal('v2');
      expect((await getTokenProperties(api, collectionId, 3, ['k']))[0].value).to.be.equal('v3');
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT with property itemOwnerOrAdmin', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKeyWrapper('//Alice');
      const args = [
        {NFT: {properties: [{key: 'k', value: 'v1'}]}},
        {NFT: {properties: [{key: 'k', value: 'v2'}]}},
        {NFT: {properties: [{key: 'k', value: 'v3'}]}},
      ];

      await createMultipleItemsWithPropsExpectSuccess(alice, collectionId, args);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect((await getTokenProperties(api, collectionId, 1, ['k']))[0].value).to.be.equal('v1');
      expect((await getTokenProperties(api, collectionId, 2, ['k']))[0].value).to.be.equal('v2');
      expect((await getTokenProperties(api, collectionId, 3, ['k']))[0].value).to.be.equal('v3');
    });
  });
});

describe('Integration Test createMultipleItems(collection_id, owner, items_data) with collection admin permissions:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'data', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {NFT: {properties: [{key: 'data', value: 'v1'}]}},
        {NFT: {properties: [{key: 'data', value: 'v2'}]}},
        {NFT: {properties: [{key: 'data', value: 'v3'}]}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(bob.address));

      expect((await getTokenProperties(api, collectionId, 1, ['data']))[0].value).to.be.equal('v1');
      expect((await getTokenProperties(api, collectionId, 2, ['data']))[0].value).to.be.equal('v2');
      expect((await getTokenProperties(api, collectionId, 3, ['data']))[0].value).to.be.equal('v3');
    });
  });

  it('Create 0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {Fungible: {value: 1}},
        {Fungible: {value: 2}},
        {Fungible: {value: 3}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const token1Data = await getBalance(api, collectionId, bob.address, 0);

      expect(token1Data).to.be.equal(6n); // 1 + 2 + 3
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {ReFungible: {pieces: 1}},
        {ReFungible: {pieces: 2}},
        {ReFungible: {pieces: 3}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getBalance(api, collectionId, bob.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, bob.address, 2)).to.be.equal(2n);
      expect(await getBalance(api, collectionId, bob.address, 3)).to.be.equal(3n);
    });
  });
});

describe('Negative Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Regular user cannot create items in active NFT collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [{NFT: {}},
        {NFT: {}},
        {NFT: {}}];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(executeTransaction(api, bob, createMultipleItemsTx)).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
    });
  });

  it('Regular user cannot create items in active Fungible collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [
        {Fungible: {value: 1}},
        {Fungible: {value: 2}},
        {Fungible: {value: 3}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(executeTransaction(api, bob, createMultipleItemsTx)).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
    });
  });

  it('Regular user cannot create items in active ReFungible collection', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [
        {ReFungible: {pieces: 1}},
        {ReFungible: {pieces: 1}},
        {ReFungible: {pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(executeTransaction(api, bob, createMultipleItemsTx)).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
    });
  });

  it('Create token in not existing collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), ['NFT', 'NFT', 'NFT']);
      await expect(executeTransaction(api, alice, createMultipleItemsTx)).to.be.rejectedWith(/common\.CollectionNotFound/);
    });
  });

  it('Create NFTs that has reached the maximum data limit', async function() {
    await usingApi(async (api, privateKeyWrapper) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({
        propPerm: [{key: 'key', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}],
      });
      const alice = privateKeyWrapper('//Alice');
      const args = [
        {NFT: {properties: [{key: 'key', value: 'A'.repeat(32769)}]}},
        {NFT: {properties: [{key: 'key', value: 'B'.repeat(32769)}]}},
        {NFT: {properties: [{key: 'key', value: 'C'.repeat(32769)}]}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Create Refungible tokens that has reached the maximum data limit', async function() {
    await requirePallets(this, [Pallets.ReFungible]);

    await usingApi(async api => {
      const collectionIdReFungible =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      {
        const argsReFungible = [
          {ReFungible: [10, [['key', 'A'.repeat(32769)]]]},
          {ReFungible: [10, [['key', 'B'.repeat(32769)]]]},
          {ReFungible: [10, [['key', 'C'.repeat(32769)]]]},
        ];
        const createMultipleItemsTxFungible = api.tx.unique
          .createMultipleItems(collectionIdReFungible, normalizeAccountId(alice.address), argsReFungible);
        await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTxFungible)).to.be.rejected;
      }
      {
        const argsReFungible = [
          {ReFungible: {properties: [{key: 'key', value: 'A'.repeat(32769)}]}},
          {ReFungible: {properties: [{key: 'key', value: 'B'.repeat(32769)}]}},
          {ReFungible: {properties: [{key: 'key', value: 'C'.repeat(32769)}]}},
        ];
        const createMultipleItemsTxFungible = api.tx.unique
          .createMultipleItems(collectionIdReFungible, normalizeAccountId(alice.address), argsReFungible);
        await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTxFungible)).to.be.rejected;
      }
    });
  });

  it('Create tokens with different types', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();

      const types = ['NFT', 'Fungible'];

      if (await checkPalletsPresence([Pallets.ReFungible])) {
        types.push('ReFungible');
      }

      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), types);
      await expect(executeTransaction(api, alice, createMultipleItemsTx)).to.be.rejectedWith(/nonfungible\.NotNonfungibleDataUsedToMintFungibleCollectionToken/);
      // garbage collection :-D // lol
      await destroyCollectionExpectSuccess(collectionId);
    });
  });

  it('Create tokens with different data limits <> maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({
        propPerm: [{key: 'key', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}],
      });
      const args = [
        {NFT: {properties: [{key: 'key', value: 'A'}]}},
        {NFT: {properties: [{key: 'key', value: 'B'.repeat(32769)}]}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Fails when minting tokens exceeds collectionLimits amount', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, collectionId, {
        tokenLimit: 1,
      });
      const args = [
        {NFT: {}},
        {NFT: {}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(executeTransaction(api, alice, createMultipleItemsTx)).to.be.rejectedWith(/common\.CollectionTokenLimitExceeded/);
    });
  });

  it('User doesnt have editing rights', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({
        propPerm: [{key: 'key1', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}],
      });
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {NFT: {properties: [{key: 'key1', value: 'v2'}]}},
        {NFT: {}},
        {NFT: {}},
      ];

      const tx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await expect(executeTransaction(api, bob, tx)).to.be.rejectedWith(/common\.NoPermission/);
    });
  });

  it('Adding property without access rights', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({properties: [{key: 'k', value: 'v1'}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [{NFT: {properties: [{key: 'k', value: 'v'}]}},
        {NFT: {}},
        {NFT: {}}];

      const tx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await expect(executeTransaction(api, bob, tx)).to.be.rejectedWith(/common\.NoPermission/);
    });
  });

  it('Adding more than 64 prps', async () => {
    await usingApi(async (api: ApiPromise) => {
      const propPerms = [{key: 'key', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}];
      for (let i = 0; i < 65; i++) {
        propPerms.push({key: `key${i}`, permission: {mutable: true, collectionAdmin: true, tokenOwner: true}});
      }

      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});

      const tx1 = api.tx.unique.setTokenPropertyPermissions(collectionId, propPerms);
      await expect(executeTransaction(api, alice, tx1)).to.be.rejectedWith(/common\.PropertyLimitReached/);

      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);

      const prps = [];

      for (let i = 0; i < 65; i++) {
        prps.push({key: `key${i}`, value: `value${i}`});
      }

      const args = [
        {NFT: {properties: prps}},
        {NFT: {properties: prps}},
        {NFT: {properties: prps}},
      ];

      // there are no permissions, but will fail anyway because of too much weight for a block
      const tx2 = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, tx2)).to.be.rejected;
    });
  });

  it('Trying to add bigger property than allowed', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({
        propPerm: [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}],
      });
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [{NFT: {properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}]}},
        {NFT: {properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}]}},
        {NFT: {properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}]}}];

      const tx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(executeTransaction(api, alice, tx)).to.be.rejectedWith(/common\.NoPermission/);
    });
  });
});
