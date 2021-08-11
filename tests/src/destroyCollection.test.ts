//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import { createCollectionExpectSuccess, 
  destroyCollectionExpectSuccess, 
  destroyCollectionExpectFailure, 
  setCollectionLimitsExpectSuccess,
  addCollectionAdminExpectSuccess,
  ICollectionLimits,		
  getDefaultCollectionLimits,
} from './util/helpers';

chai.use(chaiAsPromised);

describe('integration test: ext. destroyCollection():', () => {
  it('NFT collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
  });
  it('Fungible collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await destroyCollectionExpectSuccess(collectionId);
  });
  it('ReFungible collection can be destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await destroyCollectionExpectSuccess(collectionId);
  });
});

describe('(!negative test!) integration test: ext. destroyCollection():', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('(!negative test!) Destroy a collection that never existed', async () => {
    await usingApi(async (api) => {
      // Find the collection that never existed
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      await destroyCollectionExpectFailure(collectionId);
    });
  });
  it('(!negative test!) Destroy a collection that has already been destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
    await destroyCollectionExpectFailure(collectionId);
  });
  it('(!negative test!) Destroy a collection using non-owner account', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectFailure(collectionId, '//Bob');
    await destroyCollectionExpectSuccess(collectionId, '//Alice');
  });
  it('(!negative test!) Destroy a collection using collection admin account', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob);
    await destroyCollectionExpectFailure(collectionId, '//Bob');
  });
  it('fails when OwnerCanDestroy == false', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const collectionLimits: ICollectionLimits = getDefaultCollectionLimits();
    collectionLimits.OwnerCanDestroy = false;
    await setCollectionLimitsExpectSuccess(alice, collectionId, collectionLimits);

    await destroyCollectionExpectFailure(collectionId, '//Alice');
  });
});
