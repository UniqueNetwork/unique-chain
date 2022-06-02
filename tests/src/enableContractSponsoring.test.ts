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
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi from './substrate/substrate-api';
import {deployFlipper, getFlipValue, toggleFlipValueExpectSuccess} from './util/contracthelpers';
import {
  enableContractSponsoringExpectFailure,
  enableContractSponsoringExpectSuccess,
  findUnusedAddress,
  setContractSponsoringRateLimitExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe.skip('Integration Test enableContractSponsoring', () => {
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

describe.skip('Negative Integration Test enableContractSponsoring', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
    });
  });

  it('fails when called for non-contract address', async () => {
    await usingApi(async (api) => {
      const user = await findUnusedAddress(api);

      await enableContractSponsoringExpectFailure(alice, user.address, true);
    });
  });

  it('fails when called by non-owning user', async () => {
    await usingApi(async (api) => {
      const [flipper] = await deployFlipper(api);

      await enableContractSponsoringExpectFailure(alice, flipper.address, true);
    });
  });
});
