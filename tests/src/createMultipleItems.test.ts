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
import privateKey from './substrate/privateKey';
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
  getConstMetadata,
  getCreatedCollectionCount,
  createCollectionWithPropsExpectSuccess,
  getCreateItemsResult,
  createMultipleItemsWithPropsExpectSuccess,
  createMultipleItemsWithPropsExpectFailure,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  it('Create  0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const args = [{Nft: {const_data: '0x31'}},
        {Nft: {const_data: '0x32'}},
        {Nft: {const_data: '0x33'}}];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Create  0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
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

  it('Create  0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const args = [
        {ReFungible: {const_data: [0x31], pieces: 1}},
        {ReFungible: {const_data: [0x32], pieces: 1}},
        {ReFungible: {const_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getBalance(api, collectionId, alice.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, alice.address, 2)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, alice.address, 3)).to.be.equal(1n);

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Can mint amount of items equals to collection limits', async () => {
    await usingApi(async (api) => {
      const alice = privateKey('//Alice');

      const collectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, collectionId, {
        tokenLimit: 2,
      });
      const args = [
        {NFT: {const_data: 'A'}},
        {NFT: {const_data: 'B'}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      const events = await submitTransactionAsync(alice, createMultipleItemsTx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active NFT with property Admin', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: false}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const args = [{Nft: {const_data: '0x31', properties: [{key: 'k', value: 'v1'}]}},
        {Nft: {const_data: '0x32', properties: [{key: 'k', value: 'v2'}]}},
        {Nft: {const_data: '0x33', properties: [{key: 'k', value: 'v3'}]}}];

      await createMultipleItemsWithPropsExpectSuccess(alice, collectionId, args);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active NFT with property AdminConst', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'k', permission: {mutable: false, collectionAdmin: true, tokenOwner: false}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [{Nft: {const_data: '0x31', properties: [{key: 'k', value: 'v1'}]}},
        {Nft: {const_data: '0x32', properties: [{key: 'k', value: 'v2'}]}},
        {Nft: {const_data: '0x33', properties: [{key: 'k', value: 'v3'}]}}];

      await createMultipleItemsWithPropsExpectSuccess(alice, collectionId, args);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active NFT with property itemOwnerOrAdmin', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const args = [{Nft: {const_data: '0x31', properties: [{key: 'k', value: 'v1'}]}},
        {Nft: {const_data: '0x32', properties: [{key: 'k', value: 'v2'}]}},
        {Nft: {const_data: '0x33', properties: [{key: 'k', value: 'v3'}]}}];

      await createMultipleItemsWithPropsExpectSuccess(alice, collectionId, args);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });
});

describe('Integration Test createMultipleItems(collection_id, owner, items_data) with collection admin permissions:', () => {

  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [{Nft: {const_data: '0x31'}},
        {Nft: {const_data: '0x32'}},
        {Nft: {const_data: '0x33'}}];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(bob.address));

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Create  0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
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

  it('Create  0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {ReFungible: {const_data: [0x31], pieces: 1}},
        {ReFungible: {const_data: [0x32], pieces: 1}},
        {ReFungible: {const_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getBalance(api, collectionId, bob.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, bob.address, 2)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, bob.address, 3)).to.be.equal(1n);

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });
});

describe('Negative Integration Test createMultipleItems(collection_id, owner, items_data):', () => {

  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Regular user cannot create items in active NFT collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [{Nft: {const_data: '0x31'}},
        {Nft: {const_data: '0x32'}},
        {Nft: {const_data: '0x33'}}];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionAsync(bob, createMultipleItemsTx)).to.be.rejected;
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
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionAsync(bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Regular user cannot create items in active ReFungible collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [
        {ReFungible: {const_data: [0x31], pieces: 1}},
        {ReFungible: {const_data: [0x32], pieces: 1}},
        {ReFungible: {const_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionAsync(bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Create token in not existing collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), ['NFT', 'NFT', 'NFT']);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Create NFT and Re-fungible tokens that has reached the maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      // NFT
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const args = [
        {NFT: {const_data: 'A'.repeat(2049)}},
        {NFT: {const_data: 'B'.repeat(2049)}},
        {NFT: {const_data: 'C'.repeat(2049)}},
      ];
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;

      // ReFungible
      const collectionIdReFungible =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const argsReFungible = [
        {ReFungible: ['1'.repeat(2049), 10]},
        {ReFungible: ['2'.repeat(2049), 10]},
        {ReFungible: ['3'.repeat(2049), 10]},
      ];
      const createMultipleItemsTxFungible = api.tx.unique
        .createMultipleItems(collectionIdReFungible, normalizeAccountId(alice.address), argsReFungible);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTxFungible)).to.be.rejected;
    });
  });

  it('Create tokens with different types', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const createMultipleItemsTx = api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), ['NFT', 'Fungible', 'ReFungible']);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
      // garbage collection :-D
      await destroyCollectionExpectSuccess(collectionId);
    });
  });

  it('Create tokens with different data limits <> maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const args = [
        {NFT: {const_data: 'A'}},
        {NFT: {const_data: 'B'.repeat(2049)}},
      ];
      const createMultipleItemsTx = await api.tx.unique
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
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
        {NFT: {const_data: 'A'}},
        {NFT: {const_data: 'B'}},
      ];
      const createMultipleItemsTx = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('No editing rights', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}],
        propPerm:   [{key: 'key1', permission: {mutable: false, collectionAdmin: false, tokenOwner: true}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [{Nft: {const_data: '0x31', properties: [{key: 'key1', value: 'v2'}]}},
        {Nft: {const_data: '0x32'}},
        {Nft: {const_data: '0x33'}}];

      await createMultipleItemsWithPropsExpectFailure(bob, collectionId, args);
    });
  });

  it('User doesnt have editing rights', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}],
        propPerm:   [{key: 'key1', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [{Nft: {const_data: '0x31', properties: [{key: 'key1', value: 'v2'}]}},
        {Nft: {const_data: '0x32'}},
        {Nft: {const_data: '0x33'}}];

      await createMultipleItemsWithPropsExpectFailure(bob, collectionId, args);
    });
  });

  it('Adding property without access rights', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({properties: [{key: 'k', value: 'v1'}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [{Nft: {const_data: '0x31', properties: [{key: 'k', value: 'v'}]}},
        {Nft: {const_data: '0x32'}},
        {Nft: {const_data: '0x33'}}];

      await createMultipleItemsWithPropsExpectFailure(bob, collectionId, args);
    });
  });

  it('Adding more than 64 prps', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({properties: [{key: 'key1', value: 'v'}],
        propPerm:   [{key: 'key1', permission: {mutable: true, collectionAdmin: true, tokenOwner: false}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);

      const prps = [];

      for (let i = 0; i < 65; i++) {
        prps.push({key: `key${i}`, value: `value${i}`});
      }

      const args = [{Nft: {const_data: '0x31', properties: prps}},
        {Nft: {const_data: '0x32', properties: prps}},
        {Nft: {const_data: '0x33', properties: prps}}];

      createMultipleItemsWithPropsExpectFailure(alice, collectionId, args);
    });
  });

  it('Trying to add bigger property than allowed', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionWithPropsExpectSuccess({propPerm:   [{key: 'k', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}}]});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [{Nft: {const_data: '0x31', properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}]}},
        {Nft: {const_data: '0x32', properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}]}},
        {Nft: {const_data: '0x33', properties: [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}]}}];

      createMultipleItemsWithPropsExpectFailure(alice, collectionId, args);
    });
  });
});
