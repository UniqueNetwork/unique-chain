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

import {default as usingApi, executeTransaction} from './substrate/substrate-api';
import chai from 'chai';
import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  addCollectionAdminExpectSuccess,
  createCollectionWithPropsExpectSuccess,
} from './util/helpers';

const expect = chai.expect;
let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: ext. createItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Create new item in NFT collection', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });
  it('Create new item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });
  it('Create new item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });
  it('Create new item in NFT collection with collection admin permissions', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await addCollectionAdminExpectSuccess(alice, newCollectionID, bob.address);
    await createItemExpectSuccess(bob, newCollectionID, createMode);
  });
  it('Create new item in Fungible collection with collection admin permissions', async () => {
    const createMode = 'Fungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    await addCollectionAdminExpectSuccess(alice, newCollectionID, bob.address);
    await createItemExpectSuccess(bob, newCollectionID, createMode);
  });
  it('Create new item in ReFungible collection with collection admin permissions', async () => {
    const createMode = 'ReFungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await addCollectionAdminExpectSuccess(alice, newCollectionID, bob.address);
    await createItemExpectSuccess(bob, newCollectionID, createMode);
  });

  it('Set property Admin', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionWithPropsExpectSuccess({mode: {type: createMode}, 
      properties: [{key: 'key1', value: 'val1'}], 
      propPerm:   [{key: 'key1', mutable: true, collectionAdmin: true, tokenOwner: false}]});
    
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });

  it('Set property AdminConst', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionWithPropsExpectSuccess({mode: {type: createMode}, 
      properties: [{key: 'key1', value: 'val1'}], 
      propPerm:   [{key: 'key1', mutable: false, collectionAdmin: true, tokenOwner: false}]});
    
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });

  it('Set property itemOwnerOrAdmin', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionWithPropsExpectSuccess({mode: {type: createMode}, 
      properties: [{key: 'key1', value: 'val1'}], 
      propPerm:   [{key: 'key1', mutable: true, collectionAdmin: true, tokenOwner: true}]});
    
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });
});

describe('Negative integration test: ext. createItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Regular user cannot create new item in NFT collection', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await expect(createItemExpectSuccess(bob, newCollectionID, createMode)).to.be.rejected;
  });
  it('Regular user cannot create new item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    await expect(createItemExpectSuccess(bob, newCollectionID, createMode)).to.be.rejected;
  });
  it('Regular user cannot create new item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await expect(createItemExpectSuccess(bob, newCollectionID, createMode)).to.be.rejected;
  });

  it('No editing rights', async () => {
    await usingApi(async api => {
      const createMode = 'NFT';
      const newCollectionID = await createCollectionWithPropsExpectSuccess({mode: {type: createMode}, 
        propPerm:   [{key: 'key1', mutable: false, collectionAdmin: false, tokenOwner: false}]});

      const token = await createItemExpectSuccess(alice, newCollectionID, 'NFT');
      await addCollectionAdminExpectSuccess(alice, newCollectionID, bob.address);

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setTokenProperties(newCollectionID, token, [{key: 'key1', value: 'v2'}]), 
      )).to.be.rejected;
    });
  });

  it('User doesnt have editing rights', async () => {
    await usingApi(async api => {
      const newCollectionID = await createCollectionWithPropsExpectSuccess({propPerm: [{key: 'key1', mutable: true, collectionAdmin: false, tokenOwner: false}]});
      const token = await createItemExpectSuccess(alice, newCollectionID, 'NFT');

      await expect(executeTransaction(
        api, 
        bob, 
        api.tx.unique.setTokenProperties(newCollectionID, token, [{key: 'key1', value: 'v2'}]), 
      )).to.be.rejected;
    });
  });

  it('Adding property without access rights', async () => {
    await usingApi(async api => {
      const createMode = 'NFT';
      const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});

      const token = await createItemExpectSuccess(alice, newCollectionID, 'NFT');
      await addCollectionAdminExpectSuccess(alice, newCollectionID, bob.address);
      
      await expect(executeTransaction(
        api, 
        bob, 
        api.tx.unique.setTokenProperties(newCollectionID, token, [{key: 'key1', value: 'v2'}]), 
      )).to.be.rejected;
    });
  });

  it('Adding more than 64 prps', async () => {
    await usingApi(async api => {
      const createMode = 'NFT';

      const prps = [];

      for (let i = 0; i < 65; i++) {
        prps.push({key: `key${i}`, value: `value${i}`});
      }

      const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
      
      await expect(executeTransaction(api, alice, api.tx.unique.setCollectionProperties(newCollectionID, prps))).to.be.rejectedWith(/common\.PropertyLimitReached/);
    });
  });

  it('Trying to add bigger property than allowed', async () => {
    await usingApi(async api => {
      const createMode = 'NFT';
      const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
      
      await expect(executeTransaction(api, alice, api.tx.unique.setCollectionProperties(newCollectionID, [{key: 'k', value: 'vvvvvv'.repeat(5000)}, {key: 'k2', value: 'vvv'.repeat(5000)}]))).to.be.rejectedWith(/common\.NoSpaceForProperty/);
    });
  });
});
