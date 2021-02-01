import { IKeyringPair } from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectFailure,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enableWhiteListExpectSuccess,
  findNotExistingCollection,
  setMintPermissionExpectFailure,
  setMintPermissionExpectSuccess,
} from './util/helpers';

describe('Integration Test setMintPermission', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('ensure white-listed non-privileged address can mint tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
      await enableWhiteListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await addToWhiteListExpectSuccess(alice, collectionId, bob.address);

      await createItemExpectSuccess(bob, collectionId, 'NFT');
    });
  });

  it('ensure non-white-listed non-privileged address can\'t mint tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
      await enableWhiteListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);

      await createItemExpectFailure(bob, collectionId, 'NFT');
    });
  });
});

describe('Negative Integration Test setMintPermission', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('fails on not existing collection', async () => {
    await usingApi(async (api) => {
      const nonExistingCollection = await findNotExistingCollection(api);
      await setMintPermissionExpectFailure(alice, nonExistingCollection, true);
    });
  });

  it('fails on removed collection', async () => {
    await usingApi(async () => {
      const removedCollectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
      await destroyCollectionExpectSuccess(removedCollectionId);

      await setMintPermissionExpectFailure(alice, removedCollectionId, true);
    });
  });

  it('fails when not collection owner tries to set mint status', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectFailure(bob, collectionId, true);
  });
});
