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

import {
  createCollection,
  itApi,
  normalizeAccountId,
  getCreateItemResult,
  CrossAccountId,
} from './util/helpers';

import {usingPlaygrounds, expect, itSub, Pallets} from './util/playgrounds';
import {IProperty} from './util/playgrounds/types';
import {executeTransaction} from './substrate/substrate-api';
import {DevUniqueHelper} from './util/playgrounds/unique.dev';

async function mintTokenHelper(helper: DevUniqueHelper, collection: any, signer: IKeyringPair, owner: CrossAccountId, type: 'nft' | 'fungible' | 'refungible'='nft', properties?: IProperty[]) {
  let token;
  const itemCountBefore = await helper.collection.getLastTokenId(collection.collectionId);
  const itemBalanceBefore = (await helper.api!.rpc.unique.balance(collection.collectionId, owner, 0)).toBigInt();
  if (type === 'nft') {
    token = await collection.mintToken(signer, owner, properties);
  } else if (type === 'fungible') {
    await collection.mint(signer, 10n, owner);
  } else {
    token = await collection.mintToken(signer, 100n, owner, properties);
  }

  const itemCountAfter = await helper.collection.getLastTokenId(collection.collectionId);
  const itemBalanceAfter = (await helper.api!.rpc.unique.balance(collection.collectionId, owner, 0)).toBigInt();

  if (type === 'fungible') {
    expect(itemBalanceAfter - itemBalanceBefore).to.be.equal(10n);
  } else {
    expect(itemCountAfter).to.be.equal(itemCountBefore + 1);
  }

  return token;
}


describe('integration test: ext. ():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Create new item in NFT collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await mintTokenHelper(helper, collection, alice, {Substrate: alice.address});
  });
  itSub('Create new item in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
    await mintTokenHelper(helper, collection, alice, {Substrate: alice.address}, 'fungible');
  });
  itSub('Check events on create new item in Fungible collection', async ({helper}) => {
    const {collectionId} = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const api = helper.api!;


    const to = normalizeAccountId(alice);
    {
      const createData = {fungible: {value: 100}};
      const tx = api.tx.unique.createItem(collectionId, to, createData as any);
      const events = await executeTransaction(api, alice, tx);
      const result = getCreateItemResult(events);
      expect(result.amount).to.be.equal(100);
      expect(result.collectionId).to.be.equal(collectionId);
      expect(result.recipient).to.be.deep.equal(to);
    }
    {
      const createData = {fungible: {value: 50}};
      const tx = api.tx.unique.createItem(collectionId, to, createData as any);
      const events = await executeTransaction(api, alice, tx);
      const result = getCreateItemResult(events);
      expect(result.amount).to.be.equal(50);
      expect(result.collectionId).to.be.equal(collectionId);
      expect(result.recipient).to.be.deep.equal(to);
    }
  });
  itSub.ifWithPallets('Create new item in ReFungible collection', [Pallets.ReFungible], async ({helper}) =>  {
    const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await mintTokenHelper(helper, collection, alice, {Substrate: alice.address}, 'refungible');
  });
  itSub('Create new item in NFT collection with collection admin permissions', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await mintTokenHelper(helper, collection, bob, {Substrate: alice.address});
  });
  itSub('Create new item in Fungible collection with collection admin permissions', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
    await collection.addAdmin(alice, {Substrate: bob.address});
    await mintTokenHelper(helper, collection, bob, {Substrate: alice.address}, 'fungible');
  });
  itSub.ifWithPallets('Create new item in ReFungible collection with collection admin permissions', [Pallets.ReFungible], async ({helper}) =>  {
    const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await mintTokenHelper(helper, collection, bob, {Substrate: alice.address}, 'refungible');
  });

  itSub('Set property Admin', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL',
      properties: [{key: 'k', value: 'v'}],
      tokenPropertyPermissions: [{key: 'k', permission: {tokenOwner: false, mutable: true, collectionAdmin: true}}],
    });
    await mintTokenHelper(helper, collection, alice, {Substrate: bob.address}, 'nft', [{key: 'k', value: 'v'}]);
  });

  itSub('Set property AdminConst', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL',
      properties: [{key: 'k', value: 'v'}],
      tokenPropertyPermissions: [{key: 'k', permission: {tokenOwner: false, mutable: false, collectionAdmin: true}}],
    });
    await mintTokenHelper(helper, collection, alice, {Substrate: bob.address}, 'nft', [{key: 'k', value: 'v'}]);
  });

  itSub('Set property itemOwnerOrAdmin', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'name', description: 'descr', tokenPrefix: 'COL',
      properties: [{key: 'k', value: 'v'}],
      tokenPropertyPermissions: [{key: 'k', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}}],
    });
    await mintTokenHelper(helper, collection, alice, {Substrate: bob.address}, 'nft', [{key: 'k', value: 'v'}]);
  });

  itSub('Check total pieces of Fungible token', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
    const amount = 10n;
    await mintTokenHelper(helper, collection, alice, {Substrate: bob.address}, 'fungible');
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

  itSub('Check total pieces of NFT token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const amount = 1n;
    const token = await mintTokenHelper(helper, collection, alice, {Substrate: bob.address});
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

  itSub.ifWithPallets('Check total pieces of ReFungible token', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const amount = 100n;
    const token = await mintTokenHelper(helper, collection, alice, {Substrate: bob.address}, 'refungible');
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

describe('Negative integration test: ext. createItem():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Regular user cannot create new item in NFT collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const mintTx = async () => collection.mintToken(bob, {Substrate: bob.address});
    await expect(mintTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
  });
  itSub('Regular user cannot create new item in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
    const mintTx = async () => collection.mint(bob, 10n, {Substrate: bob.address});
    await expect(mintTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
  });
  itSub('Regular user cannot create new item in ReFungible collection', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const mintTx = async () => collection.mintToken(bob, 100n, {Substrate: bob.address});
    await expect(mintTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
  });

  itSub('No editing rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
      tokenPropertyPermissions: [{key: 'k', permission: {mutable: false, collectionAdmin: false, tokenOwner: false}}],
    });
    const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    await expect(mintTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('User doesnt have editing rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
      tokenPropertyPermissions: [{key: 'k', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}],
    });
    const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    await expect(mintTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Adding property without access rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    await expect(mintTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Adding more than 64 prps', async ({helper}) => {
    const props: IProperty[] = [];

    for (let i = 0; i < 65; i++) {
      props.push({key: `key${i}`, value: `value${i}`});
    }


    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const mintTx = async () => collection.mintToken(alice, {Substrate: bob.address}, props);
    await expect(mintTx()).to.be.rejectedWith('Verification Error');
  });

  itSub('Trying to add bigger property than allowed', async ({helper}) => {
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
    await expect(mintTx()).to.be.rejectedWith(/common\.NoSpaceForProperty/);
  });

  itSub('Check total pieces for invalid Fungible token', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'}, 0);
    const invalidTokenId = 1_000_000;
    expect((await helper.api?.rpc.unique.totalPieces(collection.collectionId, invalidTokenId))?.isNone).to.be.true;
    expect((await helper.api?.rpc.unique.tokenData(collection.collectionId, invalidTokenId))?.pieces.toBigInt()).to.be.equal(0n);
  });

  itSub('Check total pieces for invalid NFT token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const invalidTokenId = 1_000_000;
    expect((await helper.api?.rpc.unique.totalPieces(collection.collectionId, invalidTokenId))?.isNone).to.be.true;
    expect((await helper.api?.rpc.unique.tokenData(collection.collectionId, invalidTokenId))?.pieces.toBigInt()).to.be.equal(0n);
  });

  itSub.ifWithPallets('Check total pieces for invalid Refungible token', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL'});
    const invalidTokenId = 1_000_000;
    expect((await helper.api?.rpc.unique.totalPieces(collection.collectionId, invalidTokenId))?.isNone).to.be.true;
    expect((await helper.api?.rpc.unique.tokenData(collection.collectionId, invalidTokenId))?.pieces.toBigInt()).to.be.equal(0n);
  });
});
