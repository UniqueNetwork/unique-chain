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
  findUnusedAddress,
  setCollectionLimitsExpectSuccess,
  setCollectionSponsorExpectSuccess,
  setVariableMetaDataExpectFailure,
  setVariableMetaDataExpectSuccess,
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
    await setCollectionLimitsExpectSuccess(alice, collectionId, {
      sponsoredDataRateLimit: 0,
    });

    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', userWithNoBalance.address);
    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
  });

  it('sponsored setVariableMetaData can\'t be called twice without pause for free', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId);
    await setCollectionLimitsExpectSuccess(alice, collectionId, {
      sponsoredDataRateLimit: 10,
    });

    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', userWithNoBalance.address);
    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
    await setVariableMetaDataExpectFailure(userWithNoBalance, collectionId, itemId, [1, 2, 3]);
  });

  it('sponsored setVariableMetaData can\'t be called for free with variable metadata above collection limits', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId);
    await setCollectionLimitsExpectSuccess(alice, collectionId, {
      sponsoredDataRateLimit: 0,
      sponsoredDataSize: 1,
    });
    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', userWithNoBalance.address);

    await setVariableMetaDataExpectSuccess(userWithNoBalance, collectionId, itemId, [1]);
    await setVariableMetaDataExpectFailure(userWithNoBalance, collectionId, itemId, [1, 2]);
  });

  it('Default value of rate limit does not sponsor setting variable metadata', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await confirmSponsorshipExpectSuccess(collectionId);

    const itemId = await createItemExpectSuccess(alice, collectionId, 'NFT', userWithNoBalance.address);
    await setVariableMetaDataExpectFailure(userWithNoBalance, collectionId, itemId, [1]);
  });

});
