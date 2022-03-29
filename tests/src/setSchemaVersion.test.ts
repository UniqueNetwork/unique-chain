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

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setschemaversion
import {ApiPromise, Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi, {submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  getCreatedCollectionCount,
  getCreateItemResult,
  getDetailedCollectionInfo,
  addCollectionAdminExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

/*
1. We create collection.
2. Save just created collection id.
3. Use this id for setSchemaVersion.
*/
describe('setSchemaVersion positive', () => {
  let tx;
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
    });
  });
  it('execute setSchemaVersion with image url and unique ', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
      tx = api.tx.unique.setSchemaVersion(collectionIdForTesting, 'Unique');
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemResult(events);
      const collectionInfo = await getDetailedCollectionInfo(api, collectionIdForTesting);
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo).to.be.exist;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo ? collectionInfo.schemaVersion.toString() : '').to.be.equal('Unique');
    });
  });
});

describe('Collection admin setSchemaVersion positive', () => {
  let tx;
  let collectionIdForTesting: any;

  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
      await addCollectionAdminExpectSuccess(alice, collectionIdForTesting, bob.address);
    });
  });
  it('execute setSchemaVersion with image url and unique ', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.unique.setSchemaVersion(collectionIdForTesting, 'Unique');
      const events = await submitTransactionAsync(bob, tx);
      const result = getCreateItemResult(events);
      const collectionInfo = await getDetailedCollectionInfo(api, collectionIdForTesting);
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo).to.be.exist;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo ? collectionInfo.schemaVersion.toString() : '').to.be.equal('Unique');
    });
  });

  it('validate schema version with just entered data', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.unique.setSchemaVersion(collectionIdForTesting, 'ImageURL');
      const events = await submitTransactionAsync(bob, tx);
      const result = getCreateItemResult(events);
      const collectionInfo = await getDetailedCollectionInfo(api, collectionIdForTesting);
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo).to.be.exist;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo ? collectionInfo.schemaVersion.toString() : '').to.be.equal('ImageURL');
    });
  });
});

describe('setSchemaVersion negative', () => {
  let tx;
  let collectionIdForTesting: any;
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      charlie = keyring.addFromUri('//Charlie');
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
    });
  });
  it('execute setSchemaVersion for not exists collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionCount = await getCreatedCollectionCount(api);
      const nonExistedCollectionId = collectionCount + 1;
      tx = api.tx.unique.setSchemaVersion(nonExistedCollectionId, 'ImageURL');
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });
  it('execute setSchemaVersion for deleted collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      await destroyCollectionExpectSuccess(collectionIdForTesting);
      tx = api.tx.unique.setSchemaVersion(collectionIdForTesting, 'ImageURL');
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
    });
  });
  it('Regular user can`t execute setSchemaVersion with image url and unique ', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.unique.setSchemaVersion(collectionIdForTesting, 'Unique');
      await expect(submitTransactionAsync(charlie, tx)).to.be.rejected;
    });
  });
});
