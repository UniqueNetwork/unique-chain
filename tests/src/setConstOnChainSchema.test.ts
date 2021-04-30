//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  normalizeAccountId,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Shema: any;
let largeShema: any;

before(async () => {
  await usingApi(async (api) => {
    const keyring = new Keyring({ type: 'sr25519' });
    Alice = keyring.addFromUri('//Alice');
    Bob = keyring.addFromUri('//Bob');
    Shema = '0x31';
    largeShema = new Array(4097).fill(0xff);

  });
});
describe('Integration Test ext. setConstOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
      await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.Owner).to.be.deep.eq(normalizeAccountId(Alice.address));
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await submitTransactionAsync(Alice, setShema);
    });
  });

  it('Checking collection data using the ConstOnChainSchema parameter', async () => {
      await usingApi(async (api) => {
        const collectionId = await createCollectionExpectSuccess();
        const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
        await submitTransactionAsync(Alice, setShema);
        const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
        expect(collection.ConstOnChainSchema.toString()).to.be.eq(Shema);

    });
  });
});

describe('Negative Integration Test ext. setConstOnChainSchema()', () => {

  it('Set a non-existent collection', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: radix
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await expect(submitTransactionExpectFailAsync(Alice, setShema)).to.be.rejected;
    });
  });

  it('Set a previously deleted collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await expect(submitTransactionExpectFailAsync(Alice, setShema)).to.be.rejected;
    });
  });

  it('Set invalid data in schema (size too large:> 1024b)', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, largeShema);
      await expect(submitTransactionExpectFailAsync(Alice, setShema)).to.be.rejected;
    });
  });

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.Owner).to.be.deep.eq(normalizeAccountId(Alice.address));
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await expect(submitTransactionExpectFailAsync(Bob, setShema)).to.be.rejected;
    });
  });

});
