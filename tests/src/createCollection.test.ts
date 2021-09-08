//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi } from './substrate/substrate-api';
import { createCollectionExpectFailure, createCollectionExpectSuccess } from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('integration test: ext. createCollection():', () => {
  it('Create new NFT collection', async () => {
    await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
  });
  it('Create new NFT collection whith collection_name of maximum length (64 bytes)', async () => {
    await createCollectionExpectSuccess({name: 'A'.repeat(64)});
  });
  it('Create new NFT collection whith collection_description of maximum length (256 bytes)', async () => {
    await createCollectionExpectSuccess({description: 'A'.repeat(256)});
  });
  it('Create new NFT collection whith token_prefix of maximum length (16 bytes)', async () => {
    await createCollectionExpectSuccess({tokenPrefix: 'A'.repeat(16)});
  });
  it('Create new Fungible collection', async () => {
    await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
  });
  it('Create new ReFungible collection', async () => {
    await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
  });
});

describe('(!negative test!) integration test: ext. createCollection():', () => {
  it('(!negative test!) create new NFT collection whith incorrect data (mode)', async () => {
    await usingApi(async (api) => {
      const AcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString(), 10);

      const badTransaction = async () => {
        await createCollectionExpectSuccess({mode: {type: 'Invalid'}});
      };
      await expect(badTransaction()).to.be.rejected;

      const BcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString(), 10);
      expect(BcollectionCount).to.be.equal(AcollectionCount, 'Error: Incorrect collection created.');
    });
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_name)', async () => {
    await createCollectionExpectFailure({ name: 'A'.repeat(65), mode: {type: 'NFT'}});
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_description)', async () => {
    await createCollectionExpectFailure({ description: 'A'.repeat(257), mode: { type: 'NFT' }});
  });
  it('(!negative test!) create new NFT collection whith incorrect data (token_prefix)', async () => {
    await createCollectionExpectFailure({tokenPrefix: 'A'.repeat(17), mode: {type: 'NFT'}});
  });
});
