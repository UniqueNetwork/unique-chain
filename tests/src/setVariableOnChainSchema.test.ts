//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  addCollectionAdminExpectSuccess,
  queryCollectionExpectSuccess,
  getCreatedCollectionCount,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let schema: any;
let largeSchema: any;

before(async () => {
  await usingApi(async () => {
    const keyring = new Keyring({type: 'sr25519'});
    alice = keyring.addFromUri('//Alice');
    bob = keyring.addFromUri('//Bob');
    schema = '0x31';
    largeSchema = new Array(4097).fill(0xff);

  });
});
describe('Integration Test ext. setVariableOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.eq(alice.address);
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, schema);
      await submitTransactionAsync(alice, setSchema);
    });
  });

  it('Checking collection data using the setVariableOnChainSchema parameter', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, schema);
      await submitTransactionAsync(alice, setSchema);
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.variableOnChainSchema.toString()).to.be.eq(schema);

    });
  });
});

describe('Integration Test ext. collection admin setVariableOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.eq(alice.address);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, schema);
      await submitTransactionAsync(bob, setSchema);
    });
  });

  it('Checking collection data using the setVariableOnChainSchema parameter', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, schema);
      await submitTransactionAsync(bob, setSchema);
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.variableOnChainSchema.toString()).to.be.eq(schema);

    });
  });
});

describe('Negative Integration Test ext. setVariableOnChainSchema()', () => {

  it('Set a non-existent collection', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: radix
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, schema);
      await expect(submitTransactionExpectFailAsync(alice, setSchema)).to.be.rejected;
    });
  });

  it('Set a previously deleted collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, schema);
      await expect(submitTransactionExpectFailAsync(alice, setSchema)).to.be.rejected;
    });
  });

  it('Set invalid data in schema (size too large:> 1024b)', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, largeSchema);
      await expect(submitTransactionExpectFailAsync(alice, setSchema)).to.be.rejected;
    });
  });

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.eq(alice.address);
      const setSchema = api.tx.unique.setVariableOnChainSchema(collectionId, schema);
      await expect(submitTransactionExpectFailAsync(bob, setSchema)).to.be.rejected;
    });
  });

});
