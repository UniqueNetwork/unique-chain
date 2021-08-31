//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { default as usingApi } from './substrate/substrate-api';
import chai from 'chai';
import { Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import { 
  createCollectionExpectSuccess, 
  createItemExpectSuccess,
  addCollectionAdminExpectSuccess,
} from './util/helpers';

const expect = chai.expect;
let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: ext. createItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
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
    await addCollectionAdminExpectSuccess(alice, newCollectionID, bob);
    await createItemExpectSuccess(bob, newCollectionID, createMode);
  });
  it('Create new item in Fungible collection with collection admin permissions', async () => {
    const createMode = 'Fungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    await addCollectionAdminExpectSuccess(alice, newCollectionID, bob);
    await createItemExpectSuccess(bob, newCollectionID, createMode);
  });
  it('Create new item in ReFungible collection with collection admin permissions', async () => {
    const createMode = 'ReFungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await addCollectionAdminExpectSuccess(alice, newCollectionID, bob);
    await createItemExpectSuccess(bob, newCollectionID, createMode);
  });
});

describe('Negative integration test: ext. createItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
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
});
