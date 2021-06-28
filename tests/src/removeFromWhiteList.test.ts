//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi } from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  enableWhiteListExpectSuccess,
  addToWhiteListExpectSuccess,
  removeFromWhiteListExpectSuccess,
  isWhitelisted,
  findNotExistingCollection,
  removeFromWhiteListExpectFailure,
  disableWhiteListExpectSuccess,
  normalizeAccountId,
} from './util/helpers';
import { IKeyringPair } from '@polkadot/types/types';
import privateKey from './substrate/privateKey';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeFromWhiteList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('ensure bob is not in whitelist after removal', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
      await enableWhiteListExpectSuccess(alice, collectionId);
      await addToWhiteListExpectSuccess(alice, collectionId, bob.address);

      await removeFromWhiteListExpectSuccess(alice, collectionId, normalizeAccountId(bob.address));
      expect(await isWhitelisted(collectionId, bob.address)).to.be.false;
    });
  });

  it('allows removal from collection with unset whitelist status', async () => {
    await usingApi(async () => {
      const collectionWithoutWhitelistId = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(alice, collectionWithoutWhitelistId);
      await addToWhiteListExpectSuccess(alice, collectionWithoutWhitelistId, bob.address);
      await disableWhiteListExpectSuccess(alice, collectionWithoutWhitelistId);

      await removeFromWhiteListExpectSuccess(alice, collectionWithoutWhitelistId, normalizeAccountId(bob.address));
    });
  });
});

describe('Negative Integration Test removeFromWhiteList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('fails on removal from not existing collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await findNotExistingCollection(api);

      await removeFromWhiteListExpectFailure(alice, collectionId, normalizeAccountId(bob.address));
    });
  });

  it('fails on removal from removed collection', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(alice, collectionId);
      await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
      await destroyCollectionExpectSuccess(collectionId);

      await removeFromWhiteListExpectFailure(alice, collectionId, normalizeAccountId(bob.address));
    });
  });
});
