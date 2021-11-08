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
    largeShema = new Array(4097).fill(0xff);

  });
});
describe('Integration Test ext. setConstOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = (await api.query.common.collectionById(collectionId)).unwrap();
      expect(collection.owner.toString()).to.be.eq(alice.address);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, shema);
      await submitTransactionAsync(alice, setShema);
    });
  });

  it('Collection admin can set the scheme', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = (await api.query.common.collectionById(collectionId)).unwrap();
      expect(collection.owner.toString()).to.be.eq(alice.address);
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, shema);
      await submitTransactionAsync(bob, setShema);
    });
  });

  it('Checking collection data using the ConstOnChainSchema parameter', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, shema);
      await submitTransactionAsync(alice, setShema);
      const collection = (await api.query.common.collectionById(collectionId)).unwrap();
      expect(collection.constOnChainSchema.toString()).to.be.eq(shema);
    });
  });
});

describe('Negative Integration Test ext. setConstOnChainSchema()', () => {

  it('Set a non-existent collection', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: radix
      const collectionId = (await api.query.common.createdCollectionCount()).toNumber() + 1;
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, shema);
      await expect(submitTransactionExpectFailAsync(alice, setShema)).to.be.rejected;
    });
  });

  it('Set a previously deleted collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, shema);
      await expect(submitTransactionExpectFailAsync(alice, setShema)).to.be.rejected;
    });
  });

  it('Set invalid data in schema (size too large:> 1024b)', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, largeShema);
      await expect(submitTransactionExpectFailAsync(alice, setShema)).to.be.rejected;
    });
  });

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection = (await api.query.common.collectionById(collectionId)).unwrap();
      expect(collection.owner.toString()).to.be.eq(alice.address);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, shema);
      await expect(submitTransactionExpectFailAsync(bob, setShema)).to.be.rejected;
    });
  });

});
