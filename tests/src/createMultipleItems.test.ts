//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import { assert } from 'chai';
import { alicesPublicKey } from './accounts';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';

const idCollection = 12;

describe('Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  it('Create  0x31, 0x32, 0x33 items in active NFT collection and verify tokens data in chain', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });
});

describe('Negative Integration Test createMultipleItems(collection_id, owner, items_data):', () => {
  it('Create token with not existing type', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Create token in not existing collection', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Create token that has reached the maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Create tokens with different types', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Create tokens in not existing collection', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Create tokens with different data limits <> maximum data limit', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });
});

describe.skip('integration test: ext. createMultipleItems():', () => {
  it('Create two NFT tokens in active NFT collection', async () => {
    await usingApi(async (api) => {
      const AitemListIndex = await api.query.nft.itemListIndex(idCollection);
      console.log(`itemListIndex count (before): ${AitemListIndex}`);
      const args = ['NFT', 'NFT'];
      const alicePrivateKey = privateKey('//Alice');
      const createMultipleItems = await api.tx.nft
      .createMultipleItems(idCollection, alicesPublicKey, args)
      .signAndSend(alicePrivateKey);
      // tslint:disable-next-line: no-unused-expression
      assert.exists(createMultipleItems, 'createMultipleItems is neither `null` or `undefined`');
      console.log(`Ext. createMultipleItems submitted with hash: ${createMultipleItems}`);
      await waitNewBlocks(api);
      const BitemListIndex = await api.query.nft.itemListIndex(idCollection);
      console.log(`itemListIndex count (after): ${BitemListIndex}`);
      if (BitemListIndex === AitemListIndex) { assert.fail('Corret token not added in collection!'); }
    });
  });
  it('(!negative test!) Create two Fungible tokens in active NFT collection', async () => {
    await usingApi(async (api) => {
      const AitemListIndex = await api.query.nft.itemListIndex(idCollection);
      console.log(`itemListIndex count (before): ${AitemListIndex}`);
      const args = ['Fungible', 'Fungible'];
      const alicePrivateKey = privateKey('//Alice');
      const createMultipleItems = await api.tx.nft
      .createMultipleItems(idCollection, alicesPublicKey, args)
      .signAndSend(alicePrivateKey);
      // tslint:disable-next-line: no-unused-expression
      assert.exists(createMultipleItems, 'createMultipleItems is neither `null` or `undefined`');
      console.log(`Ext. createMultipleItems submitted with hash: ${createMultipleItems}`);
      await waitNewBlocks(api);
      const BitemListIndex = await api.query.nft.itemListIndex(idCollection);
      console.log(`itemListIndex count (after): ${BitemListIndex}`);
      if (BitemListIndex > AitemListIndex) { assert.fail('Incorrect token added in collection!'); }
    });
  });
  it('(!negative test!) Create two ReFungible tokens in active NFT collection', async () => {
    await usingApi(async (api) => {
      const AitemListIndex = await api.query.nft.itemListIndex(idCollection);
      console.log(`itemListIndex count (before): ${AitemListIndex}`);
      const args = ['ReFungible', 'ReFungible'];
      const alicePrivateKey = privateKey('//Alice');
      const createMultipleItems = await api.tx.nft
      .createMultipleItems(idCollection, alicesPublicKey, args)
      .signAndSend(alicePrivateKey);
      // tslint:disable-next-line: no-unused-expression
      assert.exists(createMultipleItems, 'createMultipleItems is neither `null` or `undefined`');
      console.log(`Ext. createMultipleItems submitted with hash: ${createMultipleItems}`);
      await waitNewBlocks(api);
      const BitemListIndex = await api.query.nft.itemListIndex(idCollection);
      console.log(`itemListIndex count (after): ${BitemListIndex}`);
      if (BitemListIndex > AitemListIndex) { assert.fail('Incorrect token added in collection!'); }
    });
  });
});
