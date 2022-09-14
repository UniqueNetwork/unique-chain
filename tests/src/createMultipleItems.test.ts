// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute itSub and/or modify
// itSub under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that itSub will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {IKeyringPair} from '@polkadot/types/types';
import {
  normalizeAccountId,
} from './util/helpers';
import {usingPlaygrounds, expect, Pallets, itSub} from './util/playgrounds';


describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  itSub('Create 0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async ({helper}) => {
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

  itSub('Create 0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async ({helper}) => {
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
    await helper.ft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, args, {Substrate: alice.address});
    expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(6n);
  });

  itSub.ifWithPallets('Create 0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', [Pallets.ReFungible], async ({helper}) => {
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

  itSub('Can mint amount of items equals to collection limits', async ({helper}) => {
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

  itSub('Create 0x31, 0x32, 0x33 items in active NFT with property Admin', async ({helper}) => {
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

  itSub('Create 0x31, 0x32, 0x33 items in active NFT with property AdminConst', async ({helper}) => {
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

  itSub('Create 0x31, 0x32, 0x33 items in active NFT with property itemOwnerOrAdmin', async ({helper}) => {
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

describe('Negative Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Regular user cannot create items in active NFT collection', async ({helper}) => {
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

  itSub('Regular user cannot create items in active Fungible collection', async ({helper}) => {
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
    const mintTx = async () => helper.ft.mintMultipleTokensWithOneOwner(bob, collection.collectionId, args, {Substrate: alice.address});
    await expect(mintTx()).to.be.rejectedWith(/common\.PublicMintingNotAllowed/);
  });

  itSub.ifWithPallets('Regular user cannot create items in active ReFungible collection', [Pallets.ReFungible], async ({helper}) => {
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

  itSub('Create token in not existing collection', async ({helper}) => {
    const collectionId = 1_000_000;
    const args = [
      {},
      {},
    ];
    const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(bob, collectionId, {Substrate: alice.address}, args);
    await expect(mintTx()).to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('Create NFTs that has reached the maximum data limit', async ({helper}) => {
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
    await expect(mintTx()).to.be.rejectedWith('Verification Error');
  });

  itSub.ifWithPallets('Create Refungible tokens that has reached the maximum data limit', [Pallets.ReFungible], async ({helper}) => {
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
    await expect(mintTx()).to.be.rejectedWith('Verification Error');
  });

  itSub.ifWithPallets('Create tokens with different types', [Pallets.ReFungible], async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
    });

    const types = ['NFT', 'Fungible', 'ReFungible'];
    const mintTx = helper.api?.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), types);
    await expect(helper.signTransaction(alice, mintTx)).to.be.rejected;
  });

  itSub('Create tokens with different data limits <> maximum data limit', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {key: 'data', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}},
      ],
    });
    const args = [
      {properties: [{key: 'data', value: 'A'}]},
      {properties: [{key: 'data', value: 'B'.repeat(32769)}]},
    ];
    const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
    await expect(mintTx()).to.be.rejectedWith('Verification Error');
  });

  itSub('Fails when minting tokens exceeds collectionLimits amount', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {key: 'data', permission: {tokenOwner: true, mutable: true, collectionAdmin: true}},
      ],
      limits: {
        tokenLimit: 1,
      },
    });
    const args = [
      {},
      {},
    ];
    const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
    await expect(mintTx()).to.be.rejectedWith(/common\.CollectionTokenLimitExceeded/);
  });

  itSub('User doesnt have editing rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      tokenPropertyPermissions: [
        {key: 'data', permission: {tokenOwner: false, mutable: true, collectionAdmin: false}},
      ],
    });
    const args = [
      {properties: [{key: 'data', value: 'A'}]},
    ];
    const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
    await expect(mintTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Adding property without access rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
      properties: [
        {
          key: 'data',
          value: 'v',
        },
      ],
    });
    const args = [
      {properties: [{key: 'data', value: 'A'}]},
    ];
    const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
    await expect(mintTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Adding more than 64 prps', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'name',
      description: 'descr',
      tokenPrefix: 'COL',
    });
    const prps = [];

    for (let i = 0; i < 65; i++) {
      prps.push({key: `key${i}`, value: `value${i}`});
    }

    const args = [
      {properties: prps},
      {properties: prps},
      {properties: prps},
    ];

    const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
    await expect(mintTx()).to.be.rejectedWith('Verification Error');
  });
});
