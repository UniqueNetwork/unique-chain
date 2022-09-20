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
import usingApi from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';
import {deployFlipper, toggleFlipValueExpectFailure, toggleFlipValueExpectSuccess} from './util/contracthelpers';
import {
  enableContractSponsoringExpectSuccess,
  findUnusedAddress,
  setContractSponsoringRateLimitExpectFailure,
  setContractSponsoringRateLimitExpectSuccess,
} from './util/helpers';

// todo:playgrounds skipped~postponed test
describe.skip('Integration Test setContractSponsoringRateLimit', () => {
  it('ensure sponsored contract can\'t be called twice without pause for free', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const user = await findUnusedAddress(api, privateKeyWrapper);

      const [flipper, deployer] = await deployFlipper(api, privateKeyWrapper);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await setContractSponsoringRateLimitExpectSuccess(deployer, flipper.address, 10);
      await toggleFlipValueExpectSuccess(user, flipper);
      await toggleFlipValueExpectFailure(user, flipper);
    });
  });

  it('ensure sponsored contract can be called twice with pause for free', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const user = await findUnusedAddress(api, privateKeyWrapper);

      const [flipper, deployer] = await deployFlipper(api, privateKeyWrapper);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await setContractSponsoringRateLimitExpectSuccess(deployer, flipper.address, 1);
      await toggleFlipValueExpectSuccess(user, flipper);
      await waitNewBlocks(api, 1);
      await toggleFlipValueExpectSuccess(user, flipper);
    });
  });
});

describe.skip('Negative Integration Test setContractSponsoringRateLimit', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  it('fails when called for non-contract address', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const user = await findUnusedAddress(api, privateKeyWrapper);

      await setContractSponsoringRateLimitExpectFailure(alice, user.address, 1);
    });
  });

  it('fails when called by non-owning user', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const [flipper] = await deployFlipper(api, privateKeyWrapper);

      await setContractSponsoringRateLimitExpectFailure(alice, flipper.address, 1);
    });
  });
});
