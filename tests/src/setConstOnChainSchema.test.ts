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
let shema: any;
let largeShema: any;

before(async () => {
  await usingApi(async () => {
    const keyring = new Keyring({type: 'sr25519'});
    alice = keyring.addFromUri('//Alice');
    bob = keyring.addFromUri('//Bob');
    shema = '0x31';
    largeShema = new Array(1024 * 1024 + 10).fill(0xff);
  });
});
describe('Integration Test ext. setConstOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.eq(alice.address);
      const setShema = api.tx.unique.setConstOnChainSchema(collectionId, shema);
      await submitTransactionAsync(alice, setShema);
    });
  });

  it('Collection admin can set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.eq(alice.address);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const setShema = api.tx.unique.setConstOnChainSchema(collectionId, shema);
      await submitTransactionAsync(bob, setShema);
    });
  });

  it('Checking collection data using the ConstOnChainSchema parameter', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setShema = api.tx.unique.setConstOnChainSchema(collectionId, shema);
      await submitTransactionAsync(alice, setShema);
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.constOnChainSchema.toString()).to.be.eq(shema);
    });
  });
});

describe('Negative Integration Test ext. setConstOnChainSchema()', () => {

  it('Set a non-existent collection', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: radix
      const collectionId = await getCreatedCollectionCount(api) + 1;
      const setShema = api.tx.unique.setConstOnChainSchema(collectionId, shema);
      await expect(submitTransactionExpectFailAsync(alice, setShema)).to.be.rejected;
    });
  });

  it('Set a previously deleted collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const setShema = api.tx.unique.setConstOnChainSchema(collectionId, shema);
      await expect(submitTransactionExpectFailAsync(alice, setShema)).to.be.rejected;
    });
  });

  it('Set invalid data in schema (size too large:> 1MB)', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setShema = api.tx.unique.setConstOnChainSchema(collectionId, largeShema);
      await expect(submitTransactionExpectFailAsync(alice, setShema)).to.be.rejected;
    });
  });

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = await queryCollectionExpectSuccess(api, collectionId);
      expect(collection.owner.toString()).to.be.eq(alice.address);
      const setShema = api.tx.unique.setConstOnChainSchema(collectionId, shema);
      await expect(submitTransactionExpectFailAsync(bob, setShema)).to.be.rejected;
    });
  });

});
