//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  confirmSponsorshipExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  findNotExistingCollection,
  findUnusedAddress,
  setCollectionLimitsExpectSuccess,
  setCollectionSponsorExpectSuccess,
  setVariableMetaDataExpectFailure,
  setVariableMetaDataExpectSuccess,
  setVariableMetaDataSponsoringRateLimitExpectFailure,
  setVariableMetaDataSponsoringRateLimitExpectSuccess,
} from './util/helpers';

describe('Integration Test setVariableMetadataSponsoringRateLimit', () => {
  let alice: IKeyringPair;
  let userWithNoBalance: IKeyringPair;

  before(async () => {
    await usingApi(async (api) => {
      alice = privateKey('//Alice');
      userWithNoBalance = await findUnusedAddress(api);
    });
  });

  it('sponsored setVariableMetaData can be called twice with pause for free', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId);
    await setVariableMetaDataSponsoringRateLimitExpectSuccess(alice, collectionId, 1);

    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', userWithNoBalance.address);
    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
  });

  it('sponsored setVariableMetaData can\'t be called twice without pause for free', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId);
    await setVariableMetaDataSponsoringRateLimitExpectSuccess(alice, collectionId, 10);

    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', userWithNoBalance.address);
    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
    await setVariableMetaDataExpectFailure(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
  });

  it('sponsored setVariableMetaData can\'t be called for free with variable metadata above collection limits', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId);
    await setVariableMetaDataSponsoringRateLimitExpectSuccess(alice, collectionId, 1);
    await setCollectionLimitsExpectSuccess(alice, collectionId, {
      SponsoredDataSize: 1,
    });
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', userWithNoBalance.address);

    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1]);
    await setVariableMetaDataExpectFailure(userWithNoBalance, collectionId, itemId, [1, 2]);
  });
});

describe('Negative Integration Test setVariableMetadataSponsoringRateLimit', () => {
  let alice: IKeyringPair;
  let nonExistingCollection: number;

  before(async () => {
    await usingApi(async (api) => {
      alice = privateKey('//Alice');
      nonExistingCollection = await findNotExistingCollection(api);
    });
  });

  it('fails when called with non-existing collection id', async () => {
    await setVariableMetaDataSponsoringRateLimitExpectFailure(alice, nonExistingCollection, 1);
  });

  it('fails when called by non collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setVariableMetaDataSponsoringRateLimitExpectFailure(alice, collectionId, 1);
  });
});
