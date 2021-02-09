//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import { deployFlipper, getFlipValue, toggleFlipValueExpectSuccess } from './util/contracthelpers';
import {
  enableContractSponsoringExpectFailure,
  enableContractSponsoringExpectSuccess,
  findUnusedAddress,
  setContractSponsoringRateLimitExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test enableContractSponsoring', () => {
  it('ensure tx fee is paid from endowment', async () => {
    await usingApi(async (api) => {
      const user = await findUnusedAddress(api);

      const [flipper, deployer] = await deployFlipper(api);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await setContractSponsoringRateLimitExpectSuccess(deployer, flipper.address, 1);
      await toggleFlipValueExpectSuccess(user, flipper);

      expect(await getFlipValue(flipper, deployer)).to.be.false;
    });
  });

  it('ensure it can be enabled twice', async () => {
    await usingApi(async (api) => {
      const [flipper, deployer] = await deployFlipper(api);

      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
    });
  });

  it('ensure it can be disabled twice', async () => {
    await usingApi(async (api) => {
      const [flipper, deployer] = await deployFlipper(api);

      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, false);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, false);
    });
  });

  it('ensure it can be re-enabled', async () => {
    await usingApi(async (api) => {
      const [flipper, deployer] = await deployFlipper(api);

      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, false);
      await enableContractSponsoringExpectSuccess(deployer, flipper.address, true);
    });
  });

});

describe('Negative Integration Test enableContractSponsoring', () => {
  let alice: IKeyringPair;

  before(async () => {
    alice = privateKey('//Alice');
  });

  it('fails when called for non-contract address', async () => {
    await usingApi(async (api) => {
      const user = await findUnusedAddress(api);

      await enableContractSponsoringExpectFailure(alice, user.address, true);
    });
  });

  it('fails when called by non-owning user', async () => {
    await usingApi(async (api) => {
      const [flipper, _] = await deployFlipper(api);

      await enableContractSponsoringExpectFailure(alice, flipper.address, true);
    });
  });
});
