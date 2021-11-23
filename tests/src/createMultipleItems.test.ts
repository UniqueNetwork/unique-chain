//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  getGenericResult,
  normalizeAccountId,
  setCollectionLimitsExpectSuccess,
  addCollectionAdminExpectSuccess,
  getBalance,
  getTokenOwner,
  getLastTokenId,
  getVariableMetadata,
  getConstMetadata,
  getCreatedCollectionCount,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  it('Create  0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const args = [{NFT: ['0x31', '0x31']}, {NFT: ['0x32', '0x32']}, {NFT: ['0x33', '0x33']}];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(alice.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(alice.address));

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);

      expect(await getVariableMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getVariableMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getVariableMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Create  0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const args = [
        {Fungible: {value: 1}},
        {Fungible: {value: 2}},
        {Fungible: {value: 3}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const token1Data = await getBalance(api, collectionId, alice.address, 0);

      expect(token1Data).to.be.equal(6n); // 1 + 2 + 3
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const alice = privateKey('//Alice');
      const args = [
        {ReFungible: {const_data: [0x31], variable_data: [0x31], pieces: 1}},
        {ReFungible: {const_data: [0x32], variable_data: [0x32], pieces: 1}},
        {ReFungible: {const_data: [0x33], variable_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await submitTransactionAsync(alice, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getBalance(api, collectionId, alice.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, alice.address, 2)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, alice.address, 3)).to.be.equal(1n);

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);

      expect(await getVariableMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getVariableMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getVariableMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Can mint amount of items equals to collection limits', async () => {
    await usingApi(async (api) => {
      const alice = privateKey('//Alice');

      const collectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, collectionId, {
        tokenLimit: 2,
      });
      const args = [
        {NFT: ['A', 'A']},
        {NFT: ['B', 'B']},
      ];
      const createMultipleItemsTx = api.tx.nft.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      const events = await submitTransactionAsync(alice, createMultipleItemsTx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    });
  });
});

describe('Integration Test createMultipleItems(collection_id, owner, items_data) with collection admin permissions:', () => {

  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [{NFT: ['0x31', '0x31']}, {NFT: ['0x32', '0x32']}, {NFT: ['0x33', '0x33']}];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getTokenOwner(api, collectionId, 1)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(await getTokenOwner(api, collectionId, 2)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(await getTokenOwner(api, collectionId, 3)).to.be.deep.equal(normalizeAccountId(bob.address));

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);

      expect(await getVariableMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getVariableMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getVariableMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });

  it('Create  0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {Fungible: {value: 1}},
        {Fungible: {value: 2}},
        {Fungible: {value: 3}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const token1Data = await getBalance(api, collectionId, bob.address, 0);

      expect(token1Data).to.be.equal(6n); // 1 + 2 + 3
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const args = [
        {ReFungible: {const_data: [0x31], variable_data: [0x31], pieces: 1}},
        {ReFungible: {const_data: [0x32], variable_data: [0x32], pieces: 1}},
        {ReFungible: {const_data: [0x33], variable_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(bob.address), args);
      await submitTransactionAsync(bob, createMultipleItemsTx);
      const itemsListIndexAfter = await getLastTokenId(api, collectionId);
      expect(itemsListIndexAfter).to.be.equal(3);

      expect(await getBalance(api, collectionId, bob.address, 1)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, bob.address, 2)).to.be.equal(1n);
      expect(await getBalance(api, collectionId, bob.address, 3)).to.be.equal(1n);

      expect(await getConstMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getConstMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getConstMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);

      expect(await getVariableMetadata(api, collectionId, 1)).to.be.deep.equal([0x31]);
      expect(await getVariableMetadata(api, collectionId, 2)).to.be.deep.equal([0x32]);
      expect(await getVariableMetadata(api, collectionId, 3)).to.be.deep.equal([0x33]);
    });
  });
});

describe('Negative Integration Test createMultipleItems(collection_id, owner, items_data):', () => {

  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Regular user cannot create items in active NFT collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [{NFT: ['0x31', '0x31']}, {NFT: ['0x32', '0x32']}, {NFT: ['0x33', '0x33']}];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionAsync(bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Regular user cannot create items in active Fungible collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [
        {Fungible: {value: 1}},
        {Fungible: {value: 2}},
        {Fungible: {value: 3}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionAsync(bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Regular user cannot create items in active ReFungible collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await getLastTokenId(api, collectionId);
      expect(itemsListIndexBefore).to.be.equal(0);
      const args = [
        {ReFungible: {const_data: [0x31], variable_data: [0x31], pieces: 1}},
        {ReFungible: {const_data: [0x32], variable_data: [0x32], pieces: 1}},
        {ReFungible: {const_data: [0x33], variable_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionAsync(bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Create token in not existing collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), ['NFT', 'NFT', 'NFT']);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Create NFT and Re-fungible tokens that has reached the maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      // NFT
      const collectionId = await createCollectionExpectSuccess();
      const alice = privateKey('//Alice');
      const args = [
        {NFT: ['A'.repeat(2049), 'A'.repeat(2049)]},
        {NFT: ['B'.repeat(2049), 'B'.repeat(2049)]},
        {NFT: ['C'.repeat(2049), 'C'.repeat(2049)]},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;

      // ReFungible
      const collectionIdReFungible =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const argsReFungible = [
        {ReFungible: ['1'.repeat(2049), '1'.repeat(2049), 10]},
        {ReFungible: ['2'.repeat(2049), '2'.repeat(2049), 10]},
        {ReFungible: ['3'.repeat(2049), '3'.repeat(2049), 10]},
      ];
      const createMultipleItemsTxFungible = api.tx.nft
        .createMultipleItems(collectionIdReFungible, normalizeAccountId(alice.address), argsReFungible);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTxFungible)).to.be.rejected;
    });
  });

  it('Create tokens with different types', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), ['NFT', 'Fungible', 'ReFungible']);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
      // garbage collection :-D
      await destroyCollectionExpectSuccess(collectionId);
    });
  });

  it('Create tokens with different data limits <> maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const args = [
        {NFT: ['A', 'A']},
        {NFT: ['B', 'B'.repeat(2049)]},
        {NFT: ['C'.repeat(2049), 'C']},
      ];
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Fails when minting tokens exceeds collectionLimits amount', async () => {
    await usingApi(async (api) => {

      const collectionId = await createCollectionExpectSuccess();
      await setCollectionLimitsExpectSuccess(alice, collectionId, {
        tokenLimit: 1,
      });
      const args = [
        {NFT: ['A', 'A']},
        {NFT: ['B', 'B']},
      ];
      const createMultipleItemsTx = api.tx.nft.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      await expect(submitTransactionExpectFailAsync(alice, createMultipleItemsTx)).to.be.rejected;
    });
  });
});
