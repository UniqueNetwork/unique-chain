//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  IReFungibleTokenDataType,
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
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, Alice.address, args);
      await submitTransactionAsync(Alice, createMultipleItemsTx);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      const token1Data = await api.query.nft.nftItemList(collectionId, 1) as unknown as ITokenDataType;
      const token2Data = await api.query.nft.nftItemList(collectionId, 2) as unknown as ITokenDataType;
      const token3Data = await api.query.nft.nftItemList(collectionId, 3) as unknown as ITokenDataType;

      expect(token1Data.Owner.toString()).to.be.equal(Alice.address);
      expect(token2Data.Owner.toString()).to.be.equal(Alice.address);
      expect(token3Data.Owner.toString()).to.be.equal(Alice.address);

      expect(token1Data.ConstData.toString()).to.be.equal('0x31');
      expect(token2Data.ConstData.toString()).to.be.equal('0x32');
      expect(token3Data.ConstData.toString()).to.be.equal('0x33');

      expect(token1Data.VariableData.toString()).to.be.equal('0x31');
      expect(token2Data.VariableData.toString()).to.be.equal('0x32');
      expect(token3Data.VariableData.toString()).to.be.equal('0x33');
    });
  });

  it('Create  0x31, 0x32, 0x33 items in active ReFungible collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      const itemsListIndexBefore = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexBefore.toNumber()).to.be.equal(0);
      const Alice = privateKey('//Alice');
      const args = [
        { Refungible: ['0x31', '0x31'] },
        { Refungible: ['0x32', '0x32'] },
        { Refungible: ['0x33', '0x33'] },
      ];
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, Alice.address, args);
      await submitTransactionAsync(Alice, createMultipleItemsTx);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      const token1Data = await api.query.nft.reFungibleItemList(collectionId, 1) as unknown as IReFungibleTokenDataType;
      const token2Data = await api.query.nft.reFungibleItemList(collectionId, 2) as unknown as IReFungibleTokenDataType;
      const token3Data = await api.query.nft.reFungibleItemList(collectionId, 3) as unknown as IReFungibleTokenDataType;

      expect(token1Data.Owner[0].Owner.toString()).to.be.equal(Alice.address);
      expect(token1Data.Owner[0].Fraction.toNumber()).to.be.equal(1);

      expect(token2Data.Owner[0].Owner.toString()).to.be.equal(Alice.address);
      expect(token2Data.Owner[0].Fraction.toNumber()).to.be.equal(1);

      expect(token3Data.Owner[0].Owner.toString()).to.be.equal(Alice.address);
      expect(token3Data.Owner[0].Fraction.toNumber()).to.be.equal(1);

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
  it('Create token with not existing type', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      try {
        const args = [{ invalid: null }, { invalid: null }, { invalid: null }];
        const createMultipleItemsTx = await api.tx.nft
          .createMultipleItems(collectionId, Alice.address, args);
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
      const Alice = privateKey('//Alice');
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, Alice.address, ['NFT', 'NFT', 'NFT']);
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
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, Alice.address, args);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;

      // ReFungible
      const collectionIdReFungible =
        await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      const argsReFungible = [
        { ReFungible: ['1'.repeat(2049), '1'.repeat(2049)] },
        { ReFungible: ['2'.repeat(2049), '2'.repeat(2049)] },
        { ReFungible: ['3'.repeat(2049), '3'.repeat(2049)] },
      ];
      const createMultipleItemsTxFungible = await api.tx.nft
        .createMultipleItems(collectionIdReFungible, Alice.address, argsReFungible);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTxFungible)).to.be.rejected;
    });
  });

  it('Create tokens with different types', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, Alice.address, ['NFT', 'Fungible', 'ReFungible']);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;
      // garbage collection :-D
      await destroyCollectionExpectSuccess(collectionId);
    });
  });

  it('Create tokens with different data limits <> maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      const Alice = privateKey('//Alice');
      const args = [
        { nft: ['A', 'A'] },
        { nft: ['B', 'B'.repeat(2049)] },
        { nft: ['C'.repeat(2049), 'C'] },
      ];
      const createMultipleItemsTx = await api.tx.nft
        .createMultipleItems(collectionId, Alice.address, args);
      await expect(submitTransactionExpectFailAsync(Alice, createMultipleItemsTx)).to.be.rejected;
    });
  });
});
