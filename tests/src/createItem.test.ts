import { stringToU8a, u8aToString } from '@polkadot/util';
import { assert, expect } from 'chai';
import { alicesPublicKey } from './accounts';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';

async function createCollection(name, desk, pref, mode) {
  await usingApi(async (api) => {
    const alicePrivateKey = privateKey('//Alice');
    const AcollectionCount = await api.query.nft.collectionCount();
    try {await api.tx.nft
          .createCollection(name, desk, pref, mode)
          .signAndSend(alicePrivateKey);
         await waitNewBlocks(api);
         const BcollectionCount = await api.query.nft.collectionCount();
    // tslint:disable-next-line: max-line-length
         if (BcollectionCount === AcollectionCount) {assert.fail('Error: collection NOT created.'); }} catch { assert.fail('Create collection error.'); }
  });
}

describe('integration test: ext. createItem():', () => {
  it('Create new item in NFT collection', async () => {
    await usingApi(async (api) => {
      createCollection('1', '1', '0', 'NFT');
      const newCollectionID = await api.query.nft.createdCollectionCount();
      const alicePrivateKey = privateKey('//Alice');
      const AnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      await api.tx.nft
            .createItem(newCollectionID, alicesPublicKey, 'NFT')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      if (BnftItemList === AnftItemList) {assert.fail('Error: new item in NFT collection NOT created.'); }
    });
  });
  it('Create new item in Fungible collection', async () => {
    await usingApi(async (api) => {
      createCollection('1', '1', '0', 'Fungible');
      const newCollectionID = await api.query.nft.createdCollectionCount();
      const alicePrivateKey = privateKey('//Alice');
      const AnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      await api.tx.nft
            .createItem(newCollectionID, alicesPublicKey, 'Fungible')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      if (BnftItemList === AnftItemList) {assert.fail('Error: new item in Fungible collection NOT created.'); }
    });
  });
  it('Create new item in ReFungible collection', async () => {
    await usingApi(async (api) => {
      createCollection('1', '1', '0', 'ReFungible');
      const newCollectionID = await api.query.nft.createdCollectionCount();
      const alicePrivateKey = privateKey('//Alice');
      const AnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      await api.tx.nft
            .createItem(newCollectionID, alicesPublicKey, 'ReFungible')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      if (BnftItemList === AnftItemList) {assert.fail('Error: new item in ReFungible collection NOT created.'); }
    });
  });
});
