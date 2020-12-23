import { assert } from 'chai';
import { alicesPublicKey } from './accounts';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';
import { 
  createCollectionExpectSuccess, 
  createItemExpectSuccess
} from './util/helpers';

describe('integration test: ext. createItem():', () => {
  it('Create new item in NFT collection', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionExpectSuccess('0', '0', '0', createMode);
    await createItemExpectSuccess(newCollectionID, createMode, '//Alice');
  });
  it('Create new item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const newCollectionID = await createCollectionExpectSuccess('0', '0', '0', createMode);
    await createItemExpectSuccess(newCollectionID, createMode, '//Alice');
  });
  it('Create new item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const newCollectionID = await createCollectionExpectSuccess('0', '0', '0', createMode);
    await createItemExpectSuccess(newCollectionID, createMode, '//Alice');
  });
});
