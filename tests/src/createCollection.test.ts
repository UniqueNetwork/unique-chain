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
import {usingPlaygrounds} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';
import {IProperty} from './util/playgrounds/types';

chai.use(chaiAsPromised);
const expect = chai.expect;

let donor: IKeyringPair;

before(async () => {
  await usingPlaygrounds(async (_, privateKey) => {
    donor = privateKey('//Alice');
  });
});

let alice: IKeyringPair;

describe('integration test: ext. createCollection():', () => {
  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });
  it('Create new NFT collection', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    });
  });
  it('Create new NFT collection whith collection_name of maximum length (64 bytes)', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.nft.mintCollection(alice, {name: 'A'.repeat(64), description: 'descr', tokenPrefix: 'COL'});
    });
  });
  it('Create new NFT collection whith collection_description of maximum length (256 bytes)', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.nft.mintCollection(alice, {name: 'name', description: 'A'.repeat(256), tokenPrefix: 'COL'});
    });
  });
  it('Create new NFT collection whith token_prefix of maximum length (16 bytes)', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'A'.repeat(16)});
    });
  });
  it('Create new Fungible collection', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.ft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'}, 0);
    });
  });
  it('Create new ReFungible collection', async function() {
    await usingPlaygrounds(async (helper) => {
      await helper.rft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'});
    });
  });

  it('create new collection with properties', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL',
        properties: [{key: 'key1', value: 'val1'}],
        tokenPropertyPermissions: [{key: 'key1', permission: {tokenOwner: true, mutable: false, collectionAdmin: true}}],
      });
    });
  });

  it('Create new collection with extra fields', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.ft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'}, 8);
      await collection.setPermissions(alice, {access: 'AllowList'});
      await collection.setLimits(alice, {accountTokenOwnershipLimit: 3});
      const data = await collection.getData();
      const limits = await collection.getEffectiveLimits();
      const raw = data?.raw;

      expect(data?.normalizedOwner).to.be.equal(alice.address);
      expect(data?.name).to.be.equal('name');
      expect(data?.description).to.be.equal('descr');
      expect(raw.permissions.access).to.be.equal('AllowList');
      expect(raw.mode).to.be.deep.equal({Fungible: '8'});
      expect(limits.accountTokenOwnershipLimit).to.be.equal(3);
    });
  });

  it('New collection is not external', async () => {
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'});
      const data = await collection.getData();
      expect(data?.raw.readOnly).to.be.false;
    });
  });
});

describe('(!negative test!) integration test: ext. createCollection():', () => {
  it('(!negative test!) create new NFT collection whith incorrect data (collection_name)', async () => {
    await usingPlaygrounds(async (helper) => {
      const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'A'.repeat(65), description: 'descr', tokenPrefix: 'COL'});
      await expect(mintCollectionTx()).to.be.rejected;
    });
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_description)', async () => {
    await usingPlaygrounds(async (helper) => {
      const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'A'.repeat(257), tokenPrefix: 'COL'});
      await expect(mintCollectionTx()).to.be.rejected;
    });
  });
  it('(!negative test!) create new NFT collection whith incorrect data (token_prefix)', async () => {
    await usingPlaygrounds(async (helper) => {
      const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'A'.repeat(17)});
      await expect(mintCollectionTx()).to.be.rejected;
    });
  });
  it('(!negative test!) fails when bad limits are set', async () => {
    await usingPlaygrounds(async (helper) => {
      const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL', limits: {tokenLimit: 0}});
      await expect(mintCollectionTx()).to.be.rejected;
    });
  });

  it('(!negative test!) create collection with incorrect property limit (64 elements)', async () => {
    const props: IProperty[] = [];

    for (let i = 0; i < 65; i++) {
      props.push({key: `key${i}`, value: `value${i}`});
    }
    await usingPlaygrounds(async (helper) => {
      const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL', properties: props});
      await expect(mintCollectionTx()).to.be.rejected;
    });
  });

  it('(!negative test!) create collection with incorrect property limit (40 kb)', async () => {
    const props: IProperty[] = [];

    for (let i = 0; i < 32; i++) {
      props.push({key: `key${i}`.repeat(80), value: `value${i}`.repeat(80)});
    }
    await usingPlaygrounds(async (helper) => {
      const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL', properties: props});
      await expect(mintCollectionTx()).to.be.rejected;
    });
  });
});
