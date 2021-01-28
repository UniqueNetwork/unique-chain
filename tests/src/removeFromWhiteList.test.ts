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
} from './util/helpers';
import { IKeyringPair } from '@polkadot/types/types';
import privateKey from './substrate/privateKey';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test removeFromWhiteList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let collectionId: number;

  before(async () => {
    await usingApi(async (api) => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
      await enableWhiteListExpectSuccess(alice, collectionId);
      await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
    });
  });

  it('remove bob from whitelist', async () => {
    await usingApi(async () => {
      await removeFromWhiteListExpectSuccess(alice, collectionId, bob.address);
    });
  });

  it('ensure bob is no longer in whitelist', async () => {
    expect(await isWhitelisted(collectionId, bob.address)).to.be.false;
  });

  it('allows removal from collection with unset whitelist status', async () => {
    await usingApi(async () => {
      const collectionWithoutWhitelistId = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(alice, collectionWithoutWhitelistId);
      await addToWhiteListExpectSuccess(alice, collectionWithoutWhitelistId, bob.address);
      await disableWhiteListExpectSuccess(alice, collectionWithoutWhitelistId);

      await removeFromWhiteListExpectSuccess(alice, collectionWithoutWhitelistId, bob.address);
    });
  });
});

describe('Negative Integration Test removeFromWhiteList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api) => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('fails on removal from not existing collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await findNotExistingCollection(api);

      await removeFromWhiteListExpectFailure(alice, collectionId, bob.address);
    });
  });

  it('fails on removal from removed collection', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(alice, collectionId);
      await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
      await destroyCollectionExpectSuccess(collectionId);

      await removeFromWhiteListExpectFailure(alice, collectionId, bob.address);
    });
  });
});
