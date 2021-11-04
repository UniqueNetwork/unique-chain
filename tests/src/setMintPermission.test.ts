//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {IKeyringPair} from '@polkadot/types/types';
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
  addCollectionAdminExpectSuccess,
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
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableWhiteListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await addToWhiteListExpectSuccess(alice, collectionId, bob.address);

      await createItemExpectSuccess(bob, collectionId, 'NFT');
    });
  });

  it('can be enabled twice', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await setMintPermissionExpectSuccess(alice, collectionId, true);
    });
  });

  it('can be disabled twice', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setMintPermissionExpectSuccess(alice, collectionId, true);
      await setMintPermissionExpectSuccess(alice, collectionId, false);
      await setMintPermissionExpectSuccess(alice, collectionId, false);
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
      const removedCollectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await destroyCollectionExpectSuccess(removedCollectionId);

      await setMintPermissionExpectFailure(alice, removedCollectionId, true);
    });
  });

  it('fails when not collection owner tries to set mint status', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await enableWhiteListExpectSuccess(alice, collectionId);
    await setMintPermissionExpectFailure(bob, collectionId, true);
  });

  it('Collection admin fails on set', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
      await setMintPermissionExpectFailure(bob, collectionId, true);
    });
  });

  it('ensure non-white-listed non-privileged address can\'t mint tokens', async () => {
    await usingApi(async () => {
      const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await enableWhiteListExpectSuccess(alice, collectionId);
      await setMintPermissionExpectSuccess(alice, collectionId, true);

      await createItemExpectFailure(bob, collectionId, 'NFT');
    });
  });
});
