//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {IKeyringPair} from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  addCollectionAdminExpectSuccess,
  setChainLimitsExpectFailure,
  IChainLimits,
} from './util/helpers';

describe.skip('Negative Integration Test setChainLimits', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let dave: IKeyringPair;
  let limits: IChainLimits;

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      dave = privateKey('//Dave');
      limits = {
        collectionNumbersLimit : 1,
        accountTokenOwnershipLimit: 1,
        collectionsAdminsLimit: 1,
        customDataLimit: 1,
        nftSponsorTransferTimeout: 1,
        fungibleSponsorTransferTimeout: 1,
        refungibleSponsorTransferTimeout: 1,
        offchainSchemaLimit: 1,
        variableOnChainSchemaLimit: 1,
        constOnChainSchemaLimit: 1,
      };
    });
  });

  it('Collection owner cannot set chain limits', async () => {
    await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setChainLimitsExpectFailure(alice, limits);
  });

  it('Collection admin cannot set chain limits', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await setChainLimitsExpectFailure(bob, limits);
  });

  it('Regular user cannot set chain limits', async () => {
    await setChainLimitsExpectFailure(dave, limits);
  });
});
