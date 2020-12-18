import { assert } from 'chai';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';

describe('integration test: ext. createCollection():', () => {
  it('Create new NFT collection', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const AcollectionCount = await api.query.nft.collectionCount();
      await api.tx.nft
            .createCollection('1', '1', '1', 'NFT')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BcollectionCount = await api.query.nft.collectionCount();
      if (BcollectionCount === AcollectionCount) {assert.fail('Error: NFT collection NOT created.'); }
    });
  });
  it('Create new Fungible collection', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const AcollectionCount = await api.query.nft.collectionCount();
      await api.tx.nft
            .createCollection('1', '1', '1', 'Fungible')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BcollectionCount = await api.query.nft.collectionCount();
      if (BcollectionCount === AcollectionCount) {assert.fail('Error: Fungible collection NOT created.'); }    });
  });
  it('Create new ReFungible collection', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const AcollectionCount = await api.query.nft.collectionCount();
      await api.tx.nft
            .createCollection('1', '1', '1', 'ReFungible')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BcollectionCount = await api.query.nft.collectionCount();
      if (BcollectionCount === AcollectionCount) {assert.fail('Error: ReFungible collection NOT created.'); }    });
  });
});

describe('(!negative test!) integration test: ext. createCollection():', () => {
  it('(!negative test!) create new NFT collection whith incorrect data (mode)', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const AcollectionCount = await api.query.nft.collectionCount();
      await api.tx.nft
            .createCollection('1', '1', '1', 'BadMode')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BcollectionCount = await api.query.nft.collectionCount();
      if (BcollectionCount > AcollectionCount) {assert.fail('Error: Incorrect collection created.'); }
    });
  });
  it('(!negative test!) create new NFT collection whith incorrect data (token_prefix)', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const AcollectionCount = await api.query.nft.collectionCount();
      await api.tx.nft
            .createCollection('1', '1', '0x999', 'NFT')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BcollectionCount = await api.query.nft.collectionCount();
      if (BcollectionCount > AcollectionCount) {assert.fail('Incorrect data (token_prefix) created.'); }
    });
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_name)', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const AcollectionCount = await api.query.nft.collectionCount();
      await api.tx.nft
            .createCollection('BadName', '1', '1', 'NFT')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BcollectionCount = await api.query.nft.collectionCount();
      if (BcollectionCount > AcollectionCount) {assert.fail('Incorrect data (collection_name) created.'); }    });
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_description)', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const AcollectionCount = await api.query.nft.collectionCount();
      await api.tx.nft
            .createCollection('1', 'BadDesk', '1', 'NFT')
            .signAndSend(alicePrivateKey);
      await waitNewBlocks(api);
      const BcollectionCount = await api.query.nft.collectionCount();
      if (BcollectionCount > AcollectionCount) {assert.fail('Incorrect data (collection_desc) created.'); }    });
  });
});
