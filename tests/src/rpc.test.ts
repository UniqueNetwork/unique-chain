import {expect} from 'chai';
import usingApi from './substrate/substrate-api';
import {createCollectionExpectSuccess, getTokenOwner} from './util/helpers';

describe('Chain rpc extension', () => {
  it('Get block author', async () => {
    await usingApi(async api => {
      const blockHash = await api.rpc.chain.getBlockHash(1);
      const ba = await api.rpc.chainEx.getBlockAuthor(blockHash);
      expect(ba).to.be.not.empty;
    });
  });
});

describe('getTokenOwner', () => {
  it('returns None for fungible collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await expect(getTokenOwner(api, collection, 0)).to.be.rejectedWith(/^owner == null$/);
    });
  });
});