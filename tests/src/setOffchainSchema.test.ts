//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  findNotExistingCollection,
  queryCollectionExpectSuccess,
  setOffchainSchemaExpectFailure,
  setOffchainSchemaExpectSuccess,
  addCollectionAdminExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

const DATA = [1, 2, 3, 4];

describe('Integration Test setOffchainSchema', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('execute setOffchainSchema, verify data was set', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setOffchainSchemaExpectSuccess(alice, collectionId, DATA);
      const collection = await queryCollectionExpectSuccess(api, collectionId);

      expect('0x' + Buffer.from(collection.offchainSchema).toString('hex')).to.be.equal('0x' + Buffer.from(DATA).toString('hex'));
    });
  });

  it('execute setOffchainSchema (collection admin), verify data was set', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      await setOffchainSchemaExpectSuccess(bob, collectionId, DATA);
      const collection = await queryCollectionExpectSuccess(api, collectionId);

      expect('0x' + Buffer.from(collection.offchainSchema).toString('hex')).to.be.equal('0x' + Buffer.from(DATA).toString('hex'));
    });
  });
});

describe('Negative Integration Test setOffchainSchema', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  let validCollectionId: number;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');

      validCollectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    });
  });

  it('fails on not existing collection id', async () => {
    const nonExistingCollectionId = await usingApi(findNotExistingCollection);

    await setOffchainSchemaExpectFailure(alice, nonExistingCollectionId, DATA);
  });

  it('fails on destroyed collection id', async () => {
    const destroyedCollectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await destroyCollectionExpectSuccess(destroyedCollectionId);

    await setOffchainSchemaExpectFailure(alice, destroyedCollectionId, DATA);
  });

  it('fails on too long data', async () => {
    const tooLongData = new Array(4097).fill(0xff);

    await setOffchainSchemaExpectFailure(alice, validCollectionId, tooLongData);
  });

  it('fails on execution by non-owner', async () => {
    await setOffchainSchemaExpectFailure(bob, validCollectionId, DATA);
  });
});
