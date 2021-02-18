//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';
import { deployFlipper, toggleFlipValueExpectFailure, toggleFlipValueExpectSuccess } from './util/contracthelpers';
import {
  enableContractSponsoringExpectSuccess,
  findUnusedAddress,
  setContractSponsoringRateLimitExpectFailure,
  setContractSponsoringRateLimitExpectSuccess,
} from './util/helpers';

describe('Integration Test setContractSponsoringRateLimit', () => {
  it('ensure sponsored contract can\'t be called twice without pause for free', async () => {
    await usingApi(async (api) => {
      const user = await findUnusedAddress(api);

      const [flipper, deployer] = await deployFlipper(api);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await setContractSponsoringRateLimitExpectSuccess(deployer, flipper.address, 10);
      await toggleFlipValueExpectSuccess(user, flipper);
      await toggleFlipValueExpectFailure(user, flipper);
    });
  });

  it('ensure sponsored contract can be called twice with pause for free', async () => {
    await usingApi(async (api) => {
      const user = await findUnusedAddress(api);

      const [flipper, deployer] = await deployFlipper(api);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await setContractSponsoringRateLimitExpectSuccess(deployer, flipper.address, 1);
      await toggleFlipValueExpectSuccess(user, flipper);
      await waitNewBlocks(api, 1);
      await toggleFlipValueExpectSuccess(user, flipper);
    });
  });
});

describe('Negative Integration Test setContractSponsoringRateLimit', () => {
  let alice: IKeyringPair;

  before(async () => {
    alice = privateKey('//Alice');
  });

  it('fails when called for non-contract address', async () => {
    await usingApi(async (api) => {
      const user = await findUnusedAddress(api);

      await setContractSponsoringRateLimitExpectFailure(alice, user.address, 1);
    });
  });

  it('fails when called by non-owning user', async () => {
    await usingApi(async (api) => {
      const [flipper, _] = await deployFlipper(api);

      await setContractSponsoringRateLimitExpectFailure(alice, flipper.address, 1);
    });
  });
});
