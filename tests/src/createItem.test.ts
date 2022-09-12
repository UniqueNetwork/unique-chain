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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {IKeyringPair} from '@polkadot/types/types';
import {
  createCollection,
  itApi,
  normalizeAccountId,
  getCreateItemResult,
} from './util/helpers';
import {usingPlaygrounds} from './util/playgrounds';
import {IProperty} from './util/playgrounds/types';
import {executeTransaction} from './substrate/substrate-api';

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

describe('integration test: ext. ():', () => {
  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  it('Create new item in NFT collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.mintToken(alice, {Substrate: alice.address});
    });
  });
  it('Create new item in Fungible collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await collection.mint(alice, {Substrate: alice.address}, 10n);
    });
  });
  itApi.skip('Check events on create new item in Fungible collection', async ({api}) => {
    const createMode = 'Fungible';

    const newCollectionID = (await createCollection(api, alice, {mode: {type: createMode, decimalPoints: 0}})).collectionId;

    const to = normalizeAccountId(alice);
    {
      const createData = {fungible: {value: 100}};
      const tx = api.tx.unique.createItem(newCollectionID, to, createData as any);
      const events = await executeTransaction(api, alice, tx);
      const result = getCreateItemResult(events);
      expect(result.amount).to.be.equal(100);
      expect(result.collectionId).to.be.equal(newCollectionID);
      expect(result.recipient).to.be.deep.equal(to);
    }
    {
      const createData = {fungible: {value: 50}};
      const tx = api.tx.unique.createItem(newCollectionID, to, createData as any);
      const events = await executeTransaction(api, alice, tx);
      const result = getCreateItemResult(events);
      expect(result.amount).to.be.equal(50);
      expect(result.collectionId).to.be.equal(newCollectionID);
      expect(result.recipient).to.be.deep.equal(to);
    }

  });
  it('Create new item in ReFungible collection', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.mintToken(alice, {Substrate: alice.address}, 100n);
    });
  });
  it('Create new item in NFT collection with collection admin permissions', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.addAdmin(alice, {Substrate: bob.address});
      await collection.mintToken(bob, {Substrate: alice.address});
    });
  });
  it('Create new item in Fungible collection with collection admin permissions', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      await collection.addAdmin(alice, {Substrate: bob.address});
      await collection.mint(bob, {Substrate: alice.address}, 10n);
    });
  });
  it('Create new item in ReFungible collection with collection admin permissions', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      await collection.addAdmin(alice, {Substrate: bob.address});
      await collection.mintToken(bob, {Substrate: alice.address}, 100n);
    });
  });

  it('Set property Admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL',
        properties: [{key: 'k', value: 'v'}],
        tokenPropertyPermissions: [{key: 'k', permission: {tokenOwner: false, mutable: true, collectionAdmin: true}}],
      });
      await collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    });
  });

  it('Set property AdminConst', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL',
        properties: [{key: 'k', value: 'v'}],
        tokenPropertyPermissions: [{key: 'k', permission: {tokenOwner: false, mutable: false, collectionAdmin: true}}],
      });
      await collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    });
  });

  it('Set property itemOwnerOrAdmin', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL',
        properties: [{key: 'k', value: 'v'}],
        tokenPropertyPermissions: [{key: 'k', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}}],
      });
      await collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    });
  });

  it('Check total pieces of Fungible token', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      const amount = 10n;
      await collection.mint(alice, {Substrate: bob.address}, amount);
      {
        const totalPieces = await collection.getTotalPieces();
        expect(totalPieces).to.be.equal(amount);
      }
      await collection.transfer(bob, {Substrate: alice.address}, 1n);
      {
        const totalPieces = await collection.getTotalPieces();
        expect(totalPieces).to.be.equal(amount);
      }
    });
  });

  it('Check total pieces of NFT token', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const amount = 1n;
      const token = await collection.mintToken(alice, {Substrate: bob.address});
      {
        const totalPieces = await helper.api?.rpc.unique.totalPieces(collection.collectionId, token.tokenId);
        expect(totalPieces?.unwrap().toBigInt()).to.be.equal(amount);
      }
      await token.transfer(bob, {Substrate: alice.address});
      {
        const totalPieces = await helper.api?.rpc.unique.totalPieces(collection.collectionId, token.tokenId);
        expect(totalPieces?.unwrap().toBigInt()).to.be.equal(amount);
      }
    });
  });

  it('Check total pieces of ReFungible token', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const amount = 100n;
      const token = await collection.mintToken(alice, {Substrate: bob.address}, amount);
      {
        const totalPieces = await token.getTotalPieces();
        expect(totalPieces).to.be.equal(amount);
      }
      await token.transfer(bob, {Substrate: alice.address}, 60n);
      {
        const totalPieces = await token.getTotalPieces();
        expect(totalPieces).to.be.equal(amount);
      }
    });
  });
});

describe('Negative integration test: ext. createItem():', () => {
  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  it('Regular user cannot create new item in NFT collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const mintTx = async () => collection.mintToken(bob, {Substrate: bob.address});
      await expect(mintTx()).to.be.rejected;
    });
  });
  it('Regular user cannot create new item in Fungible collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      const mintTx = async () => collection.mint(bob, {Substrate: bob.address}, 10n);
      await expect(mintTx()).to.be.rejected;
    });
  });
  it('Regular user cannot create new item in ReFungible collection', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const mintTx = async () => collection.mintToken(bob, {Substrate: bob.address});
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('No editing rights', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
        tokenPropertyPermissions: [{key: 'k', permission: {mutable: false, collectionAdmin: false, tokenOwner: false}}],
      });
      const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('User doesnt have editing rights', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
        tokenPropertyPermissions: [{key: 'k', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}],
      });
      const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Adding property without access rights', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Adding more than 64 prps', async () => {
    const props: IProperty[] = [];

    for (let i = 0; i < 65; i++) {
      props.push({key: `key${i}`, value: `value${i}`});
    }

    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, props);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Trying to add bigger property than allowed', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
        tokenPropertyPermissions: [
          {key: 'k1', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}},
          {key: 'k2', permission: {mutable: true, collectionAdmin: true, tokenOwner: true}},
        ],
      });
      const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, [
        {key: 'k1', value: 'vvvvvv'.repeat(5000)},
        {key: 'k2', value: 'vvv'.repeat(5000)},
      ]);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Check total pieces for invalid Fungible token', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
      const invalidTokenId = 1_000_000;
      expect((await helper.api?.rpc.unique.totalPieces(collection.collectionId, invalidTokenId))?.isNone).to.be.true;
      expect((await helper.api?.rpc.unique.tokenData(collection.collectionId, invalidTokenId))?.pieces.toBigInt()).to.be.equal(0n);
    });
  });

  it('Check total pieces for invalid NFT token', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const invalidTokenId = 1_000_000;
      expect((await helper.api?.rpc.unique.totalPieces(collection.collectionId, invalidTokenId))?.isNone).to.be.true;
      expect((await helper.api?.rpc.unique.tokenData(collection.collectionId, invalidTokenId))?.pieces.toBigInt()).to.be.equal(0n);
    });
  });

  it('Check total pieces for invalid Refungible token', async function() {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
      const invalidTokenId = 1_000_000;
      expect((await helper.api?.rpc.unique.totalPieces(collection.collectionId, invalidTokenId))?.isNone).to.be.true;
      expect((await helper.api?.rpc.unique.tokenData(collection.collectionId, invalidTokenId))?.pieces.toBigInt()).to.be.equal(0n);
    });
  });
});
