//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import { Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  getGenericResult,
  destroyCollectionExpectSuccess,
  normalizeAccountId,
  addCollectionAdminExpectSuccess,
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
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Burn item in NFT collection', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 1);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      // Get the item
      const item: any = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON();
      // What to expect
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(item).to.be.null;
    });
  });

  it('Burn item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0 }});
    await createItemExpectSuccess(alice, collectionId, createMode); // Helper creates 10 fungible tokens
    const tokenId = 0; // ignored

    await usingApi(async (api) => {
      // Destroy 1 of 10
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 1);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);

      // Get alice balance
      const balance: any = (await api.query.nft.fungibleItemList(collectionId, alice.address)).toJSON();

      // What to expect
      expect(result.success).to.be.true;
      expect(balance).to.be.not.null;
      expect(balance.value).to.be.equal(9);
    });
  });

  it('Burn item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode }});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 100);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);

      // Get alice balance
      const balance: any = (await api.query.nft.reFungibleItemList(collectionId, tokenId)).toJSON();

      // What to expect
      expect(result.success).to.be.true;
      expect(balance).to.be.null;
    });
  });

  it('Burn owned portion of item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      // Transfer 1/100 of the token to Bob
      const transfertx = api.tx.nft.transfer(normalizeAccountId(bob.address), collectionId, tokenId, 1);
      const events1 = await submitTransactionAsync(alice, transfertx);
      const result1 = getGenericResult(events1);

      // Get balances
      const balanceBefore: any = (await api.query.nft.reFungibleItemList(collectionId, tokenId)).toJSON();

      // Bob burns his portion
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 1);
      const events2 = await submitTransactionAsync(bob, tx);
      const result2 = getGenericResult(events2);

      // Get balances
      const balance: any = (await api.query.nft.reFungibleItemList(collectionId, tokenId)).toJSON();
      // console.log(balance);

      // What to expect before burning
      expect(result1.success).to.be.true;
      expect(balanceBefore).to.be.not.null;
      expect(balanceBefore.owner.length).to.be.equal(2);
      expect(balanceBefore.owner[0].owner).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(balanceBefore.owner[0].fraction).to.be.equal(99);
      expect(balanceBefore.owner[1].owner).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(balanceBefore.owner[1].fraction).to.be.equal(1);

      // What to expect after burning
      expect(result2.success).to.be.true;
      expect(balance).to.be.not.null;
      expect(balance.owner.length).to.be.equal(1);
      expect(balance.owner[0].fraction).to.be.equal(99);
      expect(balance.owner[0].owner).to.be.deep.equal(normalizeAccountId(alice.address));
    });

  });

});

describe('integration test: ext. burnItem() with admin permissions:', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Burn item in NFT collection', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode}});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 1);
      const events = await submitTransactionAsync(bob, tx);
      const result = getGenericResult(events);
      // Get the item
      const item: any = (await api.query.nft.nftItemList(collectionId, tokenId)).toJSON();
      // What to expect
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(item).to.be.null;
    });
  });


  it('Burn item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0 }});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode); // Helper creates 10 fungible tokens
    await addCollectionAdminExpectSuccess(alice, collectionId, bob);

    await usingApi(async (api) => {
      // Destroy 1 of 10
      const tx = api.tx.nft.burnFrom(collectionId, normalizeAccountId(alice.address), tokenId, 1);
      const events = await submitTransactionAsync(bob, tx);
      const result = getGenericResult(events);

      // Get alice balance
      const balance: any = (await api.query.nft.fungibleItemList(collectionId, alice.address)).toJSON();

      // What to expect
      expect(result.success).to.be.true;
      expect(balance).to.be.not.null;
      expect(balance.Value).to.be.equal(9);
    });
  });

  it('Burn item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode }});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);
    await addCollectionAdminExpectSuccess(alice, collectionId, bob);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnFrom(collectionId, normalizeAccountId(alice.address), tokenId, 100);
      const events = await submitTransactionAsync(bob, tx);
      const result = getGenericResult(events);
      // Get alice balance
      const balance: any = (await api.query.nft.reFungibleItemList(collectionId, tokenId)).toJSON();

      // What to expect
      expect(result.success).to.be.true;
      expect(balance).to.be.null;
    });
  });
});

describe('Negative integration test: ext. burnItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Burn a token in a destroyed collection', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode }});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);
    await destroyCollectionExpectSuccess(collectionId);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 0);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Burn a token that was never created', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode }});
    const tokenId = 10;

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 1);
      const badTransaction = async function () { 
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Burn a token using the address that does not own it', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode }});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 0);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(bob, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Transfer a burned a token', async () => {
    const createMode = 'NFT';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode }});
    const tokenId = await createItemExpectSuccess(alice, collectionId, createMode);

    await usingApi(async (api) => {

      const burntx = api.tx.nft.burnItem(collectionId, tokenId, 1);
      const events1 = await submitTransactionAsync(alice, burntx);
      const result1 = getGenericResult(events1);
      expect(result1.success).to.be.true;

      const tx = api.tx.nft.transfer(normalizeAccountId(bob.address), collectionId, tokenId, 0);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;
    });

  });

  it('Burn more than owned in Fungible collection', async () => {
    const createMode = 'Fungible';
    const collectionId = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0 }});
    // Helper creates 10 fungible tokens
    await createItemExpectSuccess(alice, collectionId, createMode);
    const tokenId = 0; // ignored

    await usingApi(async (api) => {
      // Destroy 11 of 10
      const tx = api.tx.nft.burnItem(collectionId, tokenId, 11);
      const badTransaction = async function () {
        await submitTransactionExpectFailAsync(alice, tx);
      };
      await expect(badTransaction()).to.be.rejected;

      // Get alice balance
      const balance: any = (await api.query.nft.fungibleItemList(collectionId, alice.address)).toJSON();

      // What to expect
      expect(balance).to.be.not.null;
      expect(balance.value).to.be.equal(10);
    });

  });

});
