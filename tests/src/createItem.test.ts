import { assert } from 'chai';
import { alicesPublicKey } from './accounts';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';
import { createCollectionExpectSuccess } from './util/helpers';

describe('integration test: ext. createItem():', () => {
  it('Create new item in NFT collection', async () => {
    await usingApi(async (api) => {
      const createMode = 'NFT';
      const alicePrivateKey = privateKey('//Alice');
      await createCollectionExpectSuccess('0', '0', '0', createMode);
      await waitNewBlocks(api);
      const newCollectionID = await api.query.nft.createdCollectionCount();
      const AnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      await api.tx.nft
            .createItem(newCollectionID, alicesPublicKey, createMode)
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      if (BnftItemList === AnftItemList) {assert.fail(`Error: new item in ${createMode} collection NOT created.`); }
    });
  });
  it('Create new item in Fungible collection', async () => {
    await usingApi(async (api) => {
      const createMode = 'Fungible';
      const alicePrivateKey = privateKey('//Alice');
      await createCollectionExpectSuccess('0', '0', '0', createMode);
      await waitNewBlocks(api);
      const newCollectionID = await api.query.nft.createdCollectionCount();
      const AnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      await api.tx.nft
            .createItem(newCollectionID, alicesPublicKey, createMode)
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      if (BnftItemList === AnftItemList) {assert.fail(`Error: new item in ${createMode} collection NOT created.`); }
    });
  });
  it('Create new item in ReFungible collection', async () => {
    await usingApi(async (api) => {
      const createMode = 'ReFungible';
      const alicePrivateKey = privateKey('//Alice');
      await createCollectionExpectSuccess('0', '0', '0', createMode);
      await waitNewBlocks(api);
      const newCollectionID = await api.query.nft.createdCollectionCount();
      const AnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      await api.tx.nft
            .createItem(newCollectionID, alicesPublicKey, 'ReFungible')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BnftItemList = await api.query.nft.itemListIndex(newCollectionID);
      if (BnftItemList === AnftItemList) {assert.fail(`Error: new item in ${createMode} collection NOT created.`); }
    });
  });
});
