// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

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
    const tooLongData = new Array(8 * 1024 + 10).fill(0xff);

    await setOffchainSchemaExpectFailure(alice, validCollectionId, tooLongData);
  });

  it('fails on execution by non-owner', async () => {
    await setOffchainSchemaExpectFailure(bob, validCollectionId, DATA);
  });
});
