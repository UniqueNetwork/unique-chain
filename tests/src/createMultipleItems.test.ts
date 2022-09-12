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
import {usingPlaygrounds} from './util/playgrounds';

chai.use(chaiAsPromised);
const expect = chai.expect;

let donor: IKeyringPair;

before(async () => {
  await usingPlaygrounds(async (_, privateKey) => {
    donor = privateKey('//Alice');
  });
});

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
        tokenPropertyPermissions: [
          {key: 'data', permission: {tokenOwner: true, mutable: false, collectionAdmin: false}},
        ],
      });
      const args = [
        {properties: [{key: 'data', value: '1'}]},
        {properties: [{key: 'data', value: '2'}]},
        {properties: [{key: 'data', value: '3'}]},
      ];
      const tokens = await helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      for (const [i, token] of tokens.entries()) {
        const tokenData = await token.getData();
        expect(tokenData?.normalizedOwner).to.be.deep.equal({Substrate: alice.address});
        expect(tokenData?.properties[0].value).to.be.equal(args[i].properties[0].value);
      }
    });
  });

  it('Create 0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
      });
      const args = [
        {value: 1n},
        {value: 2n},
        {value: 3n},
      ];
      await helper.ft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(6n);
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
      });
      const args = [
        {pieces: 1n},
        {pieces: 2n},
        {pieces: 3n},
      ];
      const tokens = await helper.rft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);

      for (const [i, token] of tokens.entries()) {
        expect(await token.getBalance({Substrate: alice.address})).to.be.equal(BigInt(i + 1));
      }
    });
  });

  it('Can mint amount of items equals to collection limits', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
        limits: {
          tokenLimit: 2,
        },
      });
      const args = [{}, {}];
      await helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT with property Admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
        tokenPropertyPermissions: [
          {key: 'data', permission: {tokenOwner: false, mutable: true, collectionAdmin: true}},
        ],
      });
      const args = [
        {properties: [{key: 'data', value: '1'}]},
        {properties: [{key: 'data', value: '2'}]},
        {properties: [{key: 'data', value: '3'}]},
      ];
      const tokens = await helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      for (const [i, token] of tokens.entries()) {
        const tokenData = await token.getData();
        expect(tokenData?.normalizedOwner).to.be.deep.equal({Substrate: alice.address});
        expect(tokenData?.properties[0].value).to.be.equal(args[i].properties[0].value);
      }
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT with property AdminConst', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
        tokenPropertyPermissions: [
          {key: 'data', permission: {tokenOwner: false, mutable: false, collectionAdmin: true}},
        ],
      });
      const args = [
        {properties: [{key: 'data', value: '1'}]},
        {properties: [{key: 'data', value: '2'}]},
        {properties: [{key: 'data', value: '3'}]},
      ];
      const tokens = await helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      for (const [i, token] of tokens.entries()) {
        const tokenData = await token.getData();
        expect(tokenData?.normalizedOwner).to.be.deep.equal({Substrate: alice.address});
        expect(tokenData?.properties[0].value).to.be.equal(args[i].properties[0].value);
      }
    });
  });

  it('Create 0x31, 0x32, 0x33 items in active NFT with property itemOwnerOrAdmin', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
        tokenPropertyPermissions: [
          {key: 'data', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}},
        ],
      });
      const args = [
        {properties: [{key: 'data', value: '1'}]},
        {properties: [{key: 'data', value: '2'}]},
        {properties: [{key: 'data', value: '3'}]},
      ];
      const tokens = await helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      for (const [i, token] of tokens.entries()) {
        const tokenData = await token.getData();
        expect(tokenData?.normalizedOwner).to.be.deep.equal({Substrate: alice.address});
        expect(tokenData?.properties[0].value).to.be.equal(args[i].properties[0].value);
      }
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
    await usingPlaygrounds(async (helper) => {
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  it('Regular user cannot create items in active NFT collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
      });
      const args = [
        {},
        {},
      ];
      const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(bob, collection.collectionId, {Substrate: alice.address}, args);
      await expect(mintTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
    });
  });

  it('Regular user cannot create items in active Fungible collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
      });
      const args = [
        {value: 1n},
        {value: 2n},
        {value: 3n},
      ];
      const mintTx = async () => helper.ft.mintMultipleTokensWithOneOwner(bob, collection.collectionId, {Substrate: alice.address}, args);
      await expect(mintTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
    });
  });

  it('Regular user cannot create items in active ReFungible collection', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
      });
      const args = [
        {pieces: 1n},
        {pieces: 1n},
        {pieces: 1n},
      ];
      const mintTx = async () => helper.rft.mintMultipleTokensWithOneOwner(bob, collection.collectionId, {Substrate: alice.address}, args);
      await expect(mintTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
    });
  });

  it('Create token in not existing collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collectionId = 1_000_000;
      const args = [
        {},
        {},
      ];
      const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(bob, collectionId, {Substrate: alice.address}, args);
      await expect(mintTx()).to.be.rejectedWith(/common\.CollectionNotFound/);
    });
  });

  it('Create NFTs that has reached the maximum data limit', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
        tokenPropertyPermissions: [
          {key: 'data', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}},
        ],
      });
      const args = [
        {properties: [{key: 'data', value: 'A'.repeat(32769)}]},
        {properties: [{key: 'data', value: 'B'.repeat(32769)}]},
        {properties: [{key: 'data', value: 'C'.repeat(32769)}]},
      ];
      const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Create Refungible tokens that has reached the maximum data limit', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
        tokenPropertyPermissions: [
          {key: 'data', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}},
        ],
      });
      const args = [
        {pieces: 10n, properties: [{key: 'data', value: 'A'.repeat(32769)}]},
        {pieces: 10n, properties: [{key: 'data', value: 'B'.repeat(32769)}]},
        {pieces: 10n, properties: [{key: 'data', value: 'C'.repeat(32769)}]},
      ];
      const mintTx = async () => helper.rft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Create tokens with different types', async () => {
    await usingPlaygrounds(async (helper) => {
      const {collectionId} = await helper.nft.mintCollection(alice, {
        name: 'name',
        description: 'descr',
        tokenPrefix: 'COL',
      });

      //FIXME:
      const types = ['NFT', 'Fungible', 'ReFungible'];
      const mintTx = helper.api?.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), types);
      await expect(helper.signTransaction(alice, mintTx)).to.be.rejected;
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
