import {expect} from 'chai';
import usingApi from './substrate/substrate-api';
import {createCollectionExpectSuccess, getTokenOwner} from './util/helpers';

describe('getTokenOwner', () => {
  it('returns None for fungible collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await expect(getTokenOwner(api, collection, 0)).to.be.rejectedWith(/^owner == null$/);
    });
  });
});