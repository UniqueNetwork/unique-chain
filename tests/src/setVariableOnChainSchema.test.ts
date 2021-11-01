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
  addCollectionAdminExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Schema: any;
let largeSchema: any;

before(async () => {
  await usingApi(async () => {
    const keyring = new Keyring({ type: 'sr25519' });
    Alice = keyring.addFromUri('//Alice');
    Bob = keyring.addFromUri('//Bob');
    Schema = '0x31';
    largeSchema = new Array(4097).fill(0xff);

  });
});
describe('Integration Test ext. setVariableOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.owner).to.be.eq(Alice.address);
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, Schema);
      await submitTransactionAsync(Alice, setSchema);
    });
  });

  it('Checking collection data using the setVariableOnChainSchema parameter', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, Schema);
      await submitTransactionAsync(Alice, setSchema);
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.variableOnChainSchema.toString()).to.be.eq(Schema);

    });
  });
});

describe('Integration Test ext. collection admin setVariableOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.owner).to.be.eq(Alice.address);
      await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, Schema);
      await submitTransactionAsync(Bob, setSchema);
    });
  });

  it('Checking collection data using the setVariableOnChainSchema parameter', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await addCollectionAdminExpectSuccess(Alice, collectionId, Bob);
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, Schema);
      await submitTransactionAsync(Bob, setSchema);
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.variableOnChainSchema.toString()).to.be.eq(Schema);

    });
  });
});

describe('Negative Integration Test ext. setVariableOnChainSchema()', () => {

  it('Set a non-existent collection', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: radix
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, Schema);
      await expect(submitTransactionExpectFailAsync(Alice, setSchema)).to.be.rejected;
    });
  });

  it('Set a previously deleted collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, Schema);
      await expect(submitTransactionExpectFailAsync(Alice, setSchema)).to.be.rejected;
    });
  });

  it('Set invalid data in schema (size too large:> 1024b)', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, largeSchema);
      await expect(submitTransactionExpectFailAsync(Alice, setSchema)).to.be.rejected;
    });
  });

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection: any = (await api.query.nft.collectionById(collectionId)).toJSON();
      expect(collection.owner).to.be.eq(Alice.address);
      const setSchema = api.tx.nft.setVariableOnChainSchema(collectionId, Schema);
      await expect(submitTransactionExpectFailAsync(Bob, setSchema)).to.be.rejected;
    });
  });

});
