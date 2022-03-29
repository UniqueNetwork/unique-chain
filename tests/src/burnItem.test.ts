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

import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  getGenericResult,
  destroyCollectionExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
  getBalance,
  isTokenExists,
} from './util/helpers';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: ext. burnItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Burn item in NFT collection', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 1);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);

      expect(result.success).to.be.true;
      // Get the item
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.false;
    });
  });

  it('Burn item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    await createItemExpectSuccess(alice, collectionId, createMode); // Helper creates 10 fungible tokens
    const tokenId = 0; // ignored

    await usingApi(async (api) => {
      // Destroy 1 of 10
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 1);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);

      // Get alice balance
      const balance = await getBalance(api, collectionId, alice.address, 0);

      // What to expect
      expect(result.success).to.be.true;
      expect(balance).to.be.equal(9n);
    });
  });

  it('Burn item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 100);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);

      // Get alice balance
      const balance = await getBalance(api, collectionId, alice.address, tokenId);

      // What to expect
      expect(result.success).to.be.true;
      expect(balance).to.be.equal(0n);
    });
  });

  it('Burn owned portion of item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      // Transfer 1/100 of the token to Bob
      const transfertx = api.tx.unique.transfer(normalizeAccountId(bob.address), collectionId, tokenId, 1);
      const events1 = await submitTransactionAsync(alice, transfertx);
      const result1 = getGenericResult(events1);

      // Get balances
      const bobBalanceBefore = await getBalance(api, collectionId, bob.address, tokenId);
      const aliceBalanceBefore = await getBalance(api, collectionId, alice.address, tokenId);

      // Bob burns his portion
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 1);
      const events2 = await submitTransactionAsync(bob, tx);
      const result2 = getGenericResult(events2);

      // Get balances
      const bobBalanceAfter = await getBalance(api, collectionId, bob.address, tokenId);
      const aliceBalanceAfter = await getBalance(api, collectionId, alice.address, tokenId);
      // console.log(balance);

      // What to expect before burning
      expect(result1.success).to.be.true;
      expect(aliceBalanceBefore).to.be.equal(99n);
      expect(bobBalanceBefore).to.be.equal(1n);

      // What to expect after burning
      expect(result2.success).to.be.true;
      expect(aliceBalanceAfter).to.be.equal(99n);
      expect(bobBalanceAfter).to.be.equal(0n);
    });

  });

});

describe('integration test: ext. burnItem() with admin permissions:', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Burn item in NFT collection', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 1);
      const events = await submitTransactionAsync(bob, tx);
      const result = getGenericResult(events);

      expect(result.success).to.be.true;
      // Get the item
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.false;
    });
  });

  // TODO: burnFrom
  it('Burn item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode); // Helper creates 10 fungible tokens
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);

    await usingApi(async (api) => {
      // Destroy 1 of 10
      const tx = api.tx.unique.burnFrom(collectionId, normalizeAccountId(alice.address), tokenId, 1);
      const events = await submitTransactionAsync(bob, tx);
      const result = getGenericResult(events);

      // Get alice balance
      const balance = await getBalance(api, collectionId, alice.address, 0);

      // What to expect
      expect(result.success).to.be.true;
      expect(balance).to.be.equal(9n);
    });
  });

  // TODO: burnFrom
  it('Burn item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnFrom(collectionId, normalizeAccountId(alice.address), tokenId, 100);
      const events = await submitTransactionAsync(bob, tx);
      const result = getGenericResult(events);
      // Get alice balance
      expect(result.success).to.be.true;
      // Get the item
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.false;
    });
  });
});

describe('Negative integration test: ext. burnItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Burn a token in a destroyed collection', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);
    await destroyCollectionExpectSuccess(collectionId);

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 0);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Burn a token that was never created', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = 10;

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 1);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Burn a token using the address that does not own it', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 1);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(bob, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Transfer a burned a token', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {

      const burntx = api.tx.unique.burnItem(collectionId, tokenId, 1);
      const events1 = await submitTransactionAsync(alice, burntx);
      const result1 = getGenericResult(events1);
      expect(result1.success).to.be.true;

      const tx = api.tx.unique.transfer(normalizeAccountId(bob.address), collectionId, tokenId, 1);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Burn more than owned in Fungible collection', async () => {
    const createMode = 'Fungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    // Helper creates 10 fungible tokens
    await createItemExpectSuccess(alice, collectionId, createMode);
    const tokenId = 0; // ignored

    await usingApi(async (api) => {
      // Destroy 11 of 10
      const tx = api.tx.unique.burnItem(collectionId, tokenId, 11);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;

      // Get alice balance
      const balance = await getBalance(api, collectionId, alice.address, 0);

      // What to expect
      expect(balance).to.be.equal(10n);
    });

  });

});
