//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  addCollectionAdminExpectSuccess,
  setChainLimitsExpectFailure,
  IChainLimits,
} from './util/helpers';

describe('Negative Integration Test setChainLimits', () => {
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
        CollectionNumbersLimit : 1,
        AccountTokenOwnershipLimit: 1,
        CollectionAdminsLimit: 1,
        CustomDataLimit: 1,
        NftSponsorTimeout: 1,
        FungibleSponsorTimeout: 1,
        RefungibleSponsorTimeout: 1,
        OffchainSchemaLimit: 1,
        VariableOnChainSchemaLimit: 1,
        ConstOnChainSchemaLimit: 1,
      };
    });
  });

  it('Collection owner cannot set chain limits', async () => {
    await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await setChainLimitsExpectFailure(alice, limits);
  });

  it('Collection admin cannot set chain limits', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
    await addCollectionAdminExpectSuccess(alice, collectionId, bob);
    await setChainLimitsExpectFailure(bob, limits);
  });
  
  it('Regular user cannot set chain limits', async () => {
    await setChainLimitsExpectFailure(dave, limits);
  });
});
