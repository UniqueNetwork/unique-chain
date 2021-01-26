import { IKeyringPair } from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
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

  let collectionId: number;
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');

      collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    });
  });

  it('execute setMintPermission', async () => {
    await usingApi(async () => {
      await enableWhiteListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
    });
  });

  it('ensure white-listed non-privileged address can mint tokens', async () => {
    await usingApi(async () => {
      await addToWhiteListExpectSuccess(alice, collectionId, bob.address);
      await createItemExpectSuccess(bob, collectionId, 'NFT');
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
