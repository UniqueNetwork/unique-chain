import {getApiConnection} from '../substrate/substrate-api';
import {getModuleNames, Pallets} from '../util/helpers';
import {createCollection} from './util/tx';

describe('Integration test: create new collection', () => {
  let api: any;
  before(async function () {
    api = await getApiConnection();
    if (!getModuleNames(api).includes(Pallets.RmrkCore)) this.skip();
  });



  const alice = '//Alice';

  it('create NFT collection', async () => {
    await createCollection(api, alice, 'test-metadata', 42, 'test-symbol');
  });

  it('create NFT collection without token limit', async () => {
    await createCollection(api, alice, 'no-limit-metadata', null, 'no-limit-symbol');
  });

  after(() => { api.disconnect(); });
});
