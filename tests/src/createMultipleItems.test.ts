//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  getGenericResult,
  IFungibleTokenDataType,
  IReFungibleTokenDataType,
  normalizeAccountId,
  setCollectionLimitsExpectSuccess,
  addCollectionAdminExpectSuccess,
  ICollectionLimits,		
  getDefaultCollectionLimits,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

interface ITokenDataType {
  Owner: number[];
  ConstData: number[];
  VariableData: number[];
}

describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  it('Create  0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      const Alice = privateKey('//Alice');
      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await submitTransactionAsync(Alice, createMultipleItemsTx);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      const token1Data = (await api.query.nft.nftItemList(collectionId, 1)).toJSON() as unknown as ITokenDataType;
      const token2Data = (await api.query.nft.nftItemList(collectionId, 2)).toJSON() as unknown as ITokenDataType;
      const token3Data = (await api.query.nft.nftItemList(collectionId, 3)).toJSON() as unknown as ITokenDataType;

      expect(token1Data.Owner).to.be.deep.equal(normalizeAccountId(Alice.address));
      expect(token2Data.Owner).to.be.deep.equal(normalizeAccountId(Alice.address));
      expect(token3Data.Owner).to.be.deep.equal(normalizeAccountId(Alice.address));

      expect(token1Data.ConstData.toString()).to.be.equal('0x31');
      expect(token2Data.ConstData.toString()).to.be.equal('0x32');
      expect(token3Data.ConstData.toString()).to.be.equal('0x33');

      expect(token1Data.VariableData.toString()).to.be.equal('0x31');
      expect(token2Data.VariableData.toString()).to.be.equal('0x32');
      expect(token3Data.VariableData.toString()).to.be.equal('0x33');
    });
  });

  it('Create  0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      const Alice = privateKey('//Alice');
      const args = [
        {fungible: { value: 1 }},
        {fungible: { value: 2 }},
        {fungible: { value: 3 }},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await submitTransactionAsync(Alice, createMultipleItemsTx);
      const token1Data = (await api.query.nft.fungibleItemList(collectionId, Alice.address) as any).toJSON() as unknown as IFungibleTokenDataType;

      expect(token1Data.Value).to.be.equal(6); // 1 + 2 + 3
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      const Alice = privateKey('//Alice');
      const args = [
        {refungible: {const_data: [0x31], variable_data: [0x31], pieces: 1}},
        {refungible: {const_data: [0x32], variable_data: [0x32], pieces: 1}},
        {refungible: {const_data: [0x33], variable_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await submitTransactionAsync(Alice, createMultipleItemsTx);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      const token1Data = (await api.query.nft.reFungibleItemList(collectionId, 1) as any).toJSON() as unknown as IReFungibleTokenDataType;
      const token2Data = (await api.query.nft.reFungibleItemList(collectionId, 2) as any).toJSON() as unknown as IReFungibleTokenDataType;
      const token3Data = (await api.query.nft.reFungibleItemList(collectionId, 3) as any).toJSON() as unknown as IReFungibleTokenDataType;

      expect(token1Data.Owner[0].Owner).to.be.deep.equal(normalizeAccountId(Alice.address));
      expect(token1Data.Owner[0].Fraction).to.be.equal(1);

      expect(token2Data.Owner[0].Owner).to.be.deep.equal(normalizeAccountId(Alice.address));
      expect(token2Data.Owner[0].Fraction).to.be.equal(1);

      expect(token3Data.Owner[0].Owner).to.be.deep.equal(normalizeAccountId(Alice.address));
      expect(token3Data.Owner[0].Fraction).to.be.equal(1);

      expect(token1Data.ConstData.toString()).to.be.equal('0x31');
      expect(token2Data.ConstData.toString()).to.be.equal('0x32');
      expect(token3Data.ConstData.toString()).to.be.equal('0x33');

      expect(token1Data.VariableData.toString()).to.be.equal('0x31');
      expect(token2Data.VariableData.toString()).to.be.equal('0x32');
      expect(token3Data.VariableData.toString()).to.be.equal('0x33');
    });
  });

  it('Can mint amount of items equals to collection limits', async () => {
    await usingApi(async (api) => {
      const alice = privateKey('//Alice');

      const collectionId = await createCollectionExpectSuccess();
      const collectionLimits: ICollectionLimits = getDefaultCollectionLimits();
      collectionLimits.TokenLimit = 2;

      await setCollectionLimitsExpectSuccess(alice, collectionId, collectionLimits);
      const args = [
        { nft: ['A', 'A'] },
        { nft: ['B', 'B'] },
      ];
      const createMultipleItemsTx = api.tx.nft.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
      const events = await submitTransactionAsync(alice, createMultipleItemsTx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    });
  });
});

describe('Integration Test createMultipleItems(collection_id, owner, items_data) with collection admin permissions:', () => {

  let Alice: IKeyringPair;
  let Bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      await addCollectionAdminExpectSuccess(Alice, collectionId, Bob); 
      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Bob.address), args);
      await submitTransactionAsync(Bob, createMultipleItemsTx);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      const token1Data = (await api.query.nft.nftItemList(collectionId, 1)).toJSON() as unknown as ITokenDataType;
      const token2Data = (await api.query.nft.nftItemList(collectionId, 2)).toJSON() as unknown as ITokenDataType;
      const token3Data = (await api.query.nft.nftItemList(collectionId, 3)).toJSON() as unknown as ITokenDataType;

      expect(token1Data.Owner).to.be.deep.equal(normalizeAccountId(Bob.address));
      expect(token2Data.Owner).to.be.deep.equal(normalizeAccountId(Bob.address));
      expect(token3Data.Owner).to.be.deep.equal(normalizeAccountId(Bob.address));

      expect(token1Data.ConstData.toString()).to.be.equal('0x31');
      expect(token2Data.ConstData.toString()).to.be.equal('0x32');
      expect(token3Data.ConstData.toString()).to.be.equal('0x33');

      expect(token1Data.VariableData.toString()).to.be.equal('0x31');
      expect(token2Data.VariableData.toString()).to.be.equal('0x32');
      expect(token3Data.VariableData.toString()).to.be.equal('0x33');
    });
  });

  it('Create  0x01, 0x02, 0x03 items in active Fungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      await addCollectionAdminExpectSuccess(Alice, collectionId, Bob); 
      const args = [
        {fungible: { value: 1 }},
        {fungible: { value: 2 }},
        {fungible: { value: 3 }},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Bob.address), args);
      await submitTransactionAsync(Bob, createMultipleItemsTx);
      const token1Data = (await api.query.nft.fungibleItemList(collectionId, Bob.address) as any).toJSON() as unknown as IFungibleTokenDataType;

      expect(token1Data.Value).to.be.equal(6); // 1 + 2 + 3
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      await addCollectionAdminExpectSuccess(Alice, collectionId, Bob); 
      const args = [
        {refungible: {const_data: [0x31], variable_data: [0x31], pieces: 1}},
        {refungible: {const_data: [0x32], variable_data: [0x32], pieces: 1}},
        {refungible: {const_data: [0x33], variable_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Bob.address), args);
      await submitTransactionAsync(Bob, createMultipleItemsTx);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      const token1Data = (await api.query.nft.reFungibleItemList(collectionId, 1) as any).toJSON() as unknown as IReFungibleTokenDataType;
      const token2Data = (await api.query.nft.reFungibleItemList(collectionId, 2) as any).toJSON() as unknown as IReFungibleTokenDataType;
      const token3Data = (await api.query.nft.reFungibleItemList(collectionId, 3) as any).toJSON() as unknown as IReFungibleTokenDataType;

      expect(token1Data.Owner[0].Owner).to.be.deep.equal(normalizeAccountId(Bob.address));
      expect(token1Data.Owner[0].Fraction).to.be.equal(1);

      expect(token2Data.Owner[0].Owner).to.be.deep.equal(normalizeAccountId(Bob.address));
      expect(token2Data.Owner[0].Fraction).to.be.equal(1);

      expect(token3Data.Owner[0].Owner).to.be.deep.equal(normalizeAccountId(Bob.address));
      expect(token3Data.Owner[0].Fraction).to.be.equal(1);

      expect(token1Data.ConstData.toString()).to.be.equal('0x31');
      expect(token2Data.ConstData.toString()).to.be.equal('0x32');
      expect(token3Data.ConstData.toString()).to.be.equal('0x33');

      expect(token1Data.VariableData.toString()).to.be.equal('0x31');
      expect(token2Data.VariableData.toString()).to.be.equal('0x32');
      expect(token3Data.VariableData.toString()).to.be.equal('0x33');
    });
  });
});

describe('Negative Integration Test createMultipleItems(collection_id, owner, items_data):', () => {

  let Alice: IKeyringPair;
  let Bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
    });
  });

  it('Regular user cannot create items in active NFT collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await expect(submitTransactionAsync(Bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Regular user cannot create items in active Fungible collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      const args = [
        {fungible: { value: 1 }},
        {fungible: { value: 2 }},
        {fungible: { value: 3 }},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await expect(submitTransactionAsync(Bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Regular user cannot create items in active ReFungible collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      const args = [
        {refungible: {const_data: [0x31], variable_data: [0x31], pieces: 1}},
        {refungible: {const_data: [0x32], variable_data: [0x32], pieces: 1}},
        {refungible: {const_data: [0x33], variable_data: [0x33], pieces: 1}},
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await expect(submitTransactionAsync(Bob, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Create token with not existing type', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      try {
        const args = [{ invalid: null }, { invalid: null }, { invalid: null }];
        const createMultipleItemsTx = await api.tx.nft
          .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
        await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }
    });
  });

  it('Create token in not existing collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), ['NFT', 'NFT', 'NFT']);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Create NFT and Re-fungible tokens that has reached the maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      // NFT
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      const args = [
        { nft: ['A'.repeat(2049), 'A'.repeat(2049)] },
        { nft: ['B'.repeat(2049), 'B'.repeat(2049)] },
        { nft: ['C'.repeat(2049), 'C'.repeat(2049)] },
      ];
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;

      // ReFungible
      const collectionIdReFungible =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const argsReFungible = [
        { ReFungible: ['1'.repeat(2049), '1'.repeat(2049), 10] },
        { ReFungible: ['2'.repeat(2049), '2'.repeat(2049), 10] },
        { ReFungible: ['3'.repeat(2049), '3'.repeat(2049), 10] },
      ];
      const createMultipleItemsTxFungible = api.tx.nft
        .createMultipleItems(collectionIdReFungible, normalizeAccountId(Alice.address), argsReFungible);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTxFungible)).to.be.rejected;
    });
  });

  it('Create tokens with different types', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const createMultipleItemsTx = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), ['NFT', 'Fungible', 'ReFungible']);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;
      // garbage collection :-D
      await destroyCollectionExpectSuccess(collectionId);
    });
  });

  it('Create tokens with different data limits <> maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const args = [
        { nft: ['A', 'A'] },
        { nft: ['B', 'B'.repeat(2049)] },
        { nft: ['C'.repeat(2049), 'C'] },
      ];
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;
    });
  });

  it('Fails when minting tokens exceeds collectionLimits amount', async () => {
    await usingApi(async (api) => {

      const collectionId = await createCollectionExpectSuccess();
      const collectionLimits: ICollectionLimits = getDefaultCollectionLimits();
      collectionLimits.TokenLimit = 1;
      await setCollectionLimitsExpectSuccess(Alice, collectionId, collectionLimits);
      const args = [
        { nft: ['A', 'A'] },
        { nft: ['B', 'B'] },
      ];
      const createMultipleItemsTx = api.tx.nft.createMultipleItems(collectionId, normalizeAccountId(Alice.address), args);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;
    });
  });
});
