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
import {usingPlaygrounds, expect, itSub, Pallets} from './util/playgrounds';
import {ICollectionCreationOptions, IProperty} from './util/playgrounds/types';
import {UniqueHelper} from './util/playgrounds/unique';

async function mintCollectionHelper(helper: UniqueHelper, signer: IKeyringPair, options: ICollectionCreationOptions, type?: 'nft' | 'fungible' | 'refungible') {
  let collection;
  if (type === 'nft') {
    collection = await helper.nft.mintCollection(signer, options);
  } else if (type === 'fungible') {
    collection = await helper.ft.mintCollection(signer, options, 0);
  } else {
    collection = await helper.rft.mintCollection(signer, options);
  }
  const data = await collection.getData();
  expect(data?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(signer.address));
  expect(data?.name).to.be.equal(options.name);
  expect(data?.description).to.be.equal(options.description);
  expect(data?.raw.tokenPrefix).to.be.equal(options.tokenPrefix);
  if (options.properties) {
    expect(data?.raw.properties).to.be.deep.equal(options.properties);
  }

  if (options.tokenPropertyPermissions) {
    expect(data?.raw.tokenPropertyPermissions).to.be.deep.equal(options.tokenPropertyPermissions);
  }

  return collection;
}

describe('integration test: ext. createCollection():', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });
  itSub('Create new NFT collection', async ({helper}) => {
    await mintCollectionHelper(helper, alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 'nft');
  });
  itSub('Create new NFT collection whith collection_name of maximum length (64 bytes)', async ({helper}) => {
    await mintCollectionHelper(helper, alice, {name: 'A'.repeat(64), description: 'descr', tokenPrefix: 'COL'}, 'nft');
  });
  itSub('Create new NFT collection whith collection_description of maximum length (256 bytes)', async ({helper}) => {
    await mintCollectionHelper(helper, alice, {name: 'name', description: 'A'.repeat(256), tokenPrefix: 'COL'}, 'nft');
  });
  itSub('Create new NFT collection whith token_prefix of maximum length (16 bytes)', async ({helper}) => {
    await mintCollectionHelper(helper, alice, {name: 'name', description: 'descr', tokenPrefix: 'A'.repeat(16)}, 'nft');
  });

  itSub('Create new Fungible collection', async ({helper}) => {
    await mintCollectionHelper(helper, alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'}, 'fungible');
  });

  itSub.ifWithPallets('Create new ReFungible collection', [Pallets.ReFungible], async ({helper}) => {
    await mintCollectionHelper(helper, alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'}, 'refungible');
  });

  itSub('create new collection with properties', async ({helper}) => {
    await mintCollectionHelper(helper, alice, {
      name: 'name', description: 'descr', tokenPrefix: 'COL',
      properties: [{key: 'key1', value: 'val1'}],
      tokenPropertyPermissions: [{key: 'key1', permission: {tokenOwner: true, mutable: false, collectionAdmin: true}}],
    }, 'nft');
  });

  itSub('Create new collection with extra fields', async ({helper}) => {
    const collection = await mintCollectionHelper(helper, alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'}, 'fungible');
    await collection.setPermissions(alice, {access: 'AllowList'});
    await collection.setLimits(alice, {accountTokenOwnershipLimit: 3});
    const data = await collection.getData();
    const limits = await collection.getEffectiveLimits();
    const raw = data?.raw;

    expect(data?.normalizedOwner).to.be.equal(helper.address.normalizeSubstrate(alice.address));
    expect(data?.name).to.be.equal('name');
    expect(data?.description).to.be.equal('descr');
    expect(raw.permissions.access).to.be.equal('AllowList');
    expect(raw.mode).to.be.deep.equal({Fungible: '0'});
    expect(limits.accountTokenOwnershipLimit).to.be.equal(3);
  });

  itSub('New collection is not external', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL'});
    const data = await collection.getData();
    expect(data?.raw.readOnly).to.be.false;
  });
});

describe('(!negative test!) integration test: ext. createCollection():', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  itSub('(!negative test!) create new NFT collection whith incorrect data (collection_name)', async ({helper}) => {
    const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'A'.repeat(65), description: 'descr', tokenPrefix: 'COL'});
    await expect(mintCollectionTx()).to.be.rejectedWith('Verification Error');
  });
  itSub('(!negative test!) create new NFT collection whith incorrect data (collection_description)', async ({helper}) => {
    const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'A'.repeat(257), tokenPrefix: 'COL'});
    await expect(mintCollectionTx()).to.be.rejectedWith('Verification Error');
  });
  itSub('(!negative test!) create new NFT collection whith incorrect data (token_prefix)', async ({helper}) => {
    const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'A'.repeat(17)});
    await expect(mintCollectionTx()).to.be.rejectedWith('Verification Error');
  });
  
  itSub('(!negative test!) fails when bad limits are set', async ({helper}) => {
    const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL', limits: {tokenLimit: 0}});
    await expect(mintCollectionTx()).to.be.rejectedWith(/common\.CollectionTokenLimitExceeded/);
  });

  itSub('(!negative test!) create collection with incorrect property limit (64 elements)', async ({helper}) => {
    const props: IProperty[] = [];

    for (let i = 0; i < 65; i++) {
      props.push({key: `key${i}`, value: `value${i}`});
    }
    const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL', properties: props});
    await expect(mintCollectionTx()).to.be.rejectedWith('Verification Error');
  });

  itSub('(!negative test!) create collection with incorrect property limit (40 kb)', async ({helper}) => {
    const props: IProperty[] = [];

    for (let i = 0; i < 32; i++) {
      props.push({key: `key${i}`.repeat(80), value: `value${i}`.repeat(80)});
    }

    const mintCollectionTx = async () => helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL', properties: props});
    await expect(mintCollectionTx()).to.be.rejectedWith('Verification Error');
  });
});
