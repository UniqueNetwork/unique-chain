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
import {createCollectionWithPropsExpectFailure, createCollectionExpectFailure, createCollectionExpectSuccess, getCreateCollectionResult, getDetailedCollectionInfo, createCollectionWithPropsExpectSuccess} from './util/helpers';

describe('integration test: ext. createCollection():', () => {
  it('Create new NFT collection', async () => {
    await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
  });
  it('Create new NFT collection whith collection_name of maximum length (64 bytes)', async () => {
    await createCollectionExpectSuccess({name: 'A'.repeat(64)});
  });
  it('Create new NFT collection whith collection_description of maximum length (256 bytes)', async () => {
    await createCollectionExpectSuccess({description: 'A'.repeat(256)});
  });
  it('Create new NFT collection whith token_prefix of maximum length (16 bytes)', async () => {
    await createCollectionExpectSuccess({tokenPrefix: 'A'.repeat(16)});
  });
  it('Create new Fungible collection', async () => {
    await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
  });
  it('Create new ReFungible collection', async () => {
    await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
  });

  it('create new collection with properties #1', async () => {
    await createCollectionWithPropsExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'},
      properties: [{key: 'key1', value: 'val1'}],
      propPerm:   [{key: 'key1', permission: {tokenOwner: true, mutable: false, collectionAdmin: true}}]});
  });

  it('create new collection with properties #2', async () => {
    await createCollectionWithPropsExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'},
      properties: [{key: 'key1', value: 'val1'}],
      propPerm:   [{key: 'key1', permission: {tokenOwner: true, mutable: false, collectionAdmin: true}}]});
  });

  it('create new collection with properties #3', async () => {
    await createCollectionWithPropsExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'},
      properties: [{key: 'key1', value: 'val1'}],
      propPerm:   [{key: 'key1', permission: {tokenOwner: true, mutable: false, collectionAdmin: true}}]});
  });

  it('Create new collection with extra fields', async () => {
    await usingApi(async api => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const tx = api.tx.unique.createCollectionEx({
        mode: {Fungible: 8},
        permissions: {
          access: 'AllowList',
        },
        name: [1],
        description: [2],
        tokenPrefix: '0x000000',
        pendingSponsor: bob.address,
        limits: {
          accountTokenOwnershipLimit: 3,
        },
      });
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateCollectionResult(events);

      const collection = (await getDetailedCollectionInfo(api, result.collectionId))!;
      expect(collection.owner.toString()).to.equal(alice.address);
      expect(collection.mode.asFungible.toNumber()).to.equal(8);
      expect(collection.permissions.access.toHuman()).to.equal('AllowList');
      expect(collection.name.map(v => v.toNumber())).to.deep.equal([1]);
      expect(collection.description.map(v => v.toNumber())).to.deep.equal([2]);
      expect(collection.tokenPrefix.toString()).to.equal('0x000000');
      expect(collection.sponsorship.asUnconfirmed.toString()).to.equal(bob.address);
      expect(collection.limits.accountTokenOwnershipLimit.unwrap().toNumber()).to.equal(3);
    });
  });
});

describe('(!negative test!) integration test: ext. createCollection():', () => {
  it('(!negative test!) create new NFT collection whith incorrect data (collection_name)', async () => {
    await createCollectionExpectFailure({name: 'A'.repeat(65), mode: {type: 'NFT'}});
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_description)', async () => {
    await createCollectionExpectFailure({description: 'A'.repeat(257), mode: {type: 'NFT'}});
  });
  it('(!negative test!) create new NFT collection whith incorrect data (token_prefix)', async () => {
    await createCollectionExpectFailure({tokenPrefix: 'A'.repeat(17), mode: {type: 'NFT'}});
  });
  it('fails when bad limits are set', async () => {
    await usingApi(async api => {
      const alice = privateKey('//Alice');
      const tx = api.tx.unique.createCollectionEx({mode: 'NFT', limits: {tokenLimit: 0}});
      await expect(executeTransaction(api, alice, tx)).to.be.rejectedWith(/^common.CollectionTokenLimitExceeded$/);
    });
  });

  it('(!negative test!) create collection with incorrect property limit (64 elements)', async () => {
    const props = [];

    for (let i = 0; i < 65; i++) {
      props.push({key: `key${i}`, value: `value${i}`});
    }

    await createCollectionWithPropsExpectFailure({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}, properties: props});
  });

  it('(!negative test!) create collection with incorrect property limit (40 kb)', async () => {
    const props = [];

    for (let i = 0; i < 32; i++) {
      props.push({key: `key${i}`.repeat(80), value: `value${i}`.repeat(80)});
    }

    await createCollectionWithPropsExpectFailure({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}, properties: props});
  });
});
