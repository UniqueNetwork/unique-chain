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
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  normalizeAccountId,
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

describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper) => {
      [alice] = await helper.arrange.createAccounts([100n], donor);
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
        {properties: [{key: 'data', value: 'A'}]},
        {properties: [{key: 'data', value: 'B'.repeat(32769)}]},
      ];
      const mintTx = async () => helper.nft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, args);
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Fails when minting tokens exceeds collectionLimits amount', async () => {
    await usingPlaygrounds(async (helper) => {
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
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('User doesnt have editing rights', async () => {
    await usingPlaygrounds(async (helper) => {
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
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Adding property without access rights', async () => {
    await usingPlaygrounds(async (helper) => {
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
      await expect(mintTx()).to.be.rejected;
    });
  });

  it('Adding more than 64 prps', async () => {
    await usingPlaygrounds(async (helper) => {
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
      await expect(mintTx()).to.be.rejected;
    });
  });
});
