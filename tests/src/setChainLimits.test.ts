// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

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
