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

import usingApi from './substrate/substrate-api';
import {deployFlipper, toggleFlipValueExpectFailure, toggleFlipValueExpectSuccess} from './util/contracthelpers';
import {addToContractAllowListExpectSuccess, isAllowlistedInContract, removeFromContractAllowListExpectFailure, removeFromContractAllowListExpectSuccess, toggleContractAllowlistExpectSuccess} from './util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';

describe.skip('Integration Test removeFromContractAllowList', () => {
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('user is no longer allowlisted after removal', async () => {
    await usingApi(async (api) => {
      const [flipper, deployer] = await deployFlipper(api);

      await addToContractAllowListExpectSuccess(deployer, flipper.address.toString(), bob.address);
      await removeFromContractAllowListExpectSuccess(deployer, flipper.address.toString(), bob.address);

      expect(await isAllowlistedInContract(flipper.address, bob.address)).to.be.false;
    });
  });

  it('user can\'t execute contract after removal', async () => {
    await usingApi(async (api) => {
      const [flipper, deployer] = await deployFlipper(api);
      await toggleContractAllowlistExpectSuccess(deployer, flipper.address.toString(), true);

      await addToContractAllowListExpectSuccess(deployer, flipper.address.toString(), bob.address);
      await toggleFlipValueExpectSuccess(bob, flipper);

      await removeFromContractAllowListExpectSuccess(deployer, flipper.address.toString(), bob.address);
      await toggleFlipValueExpectFailure(bob, flipper);
    });
  });

  it('can be called twice', async () => {
    await usingApi(async (api) => {
      const [flipper, deployer] = await deployFlipper(api);

      await addToContractAllowListExpectSuccess(deployer, flipper.address.toString(), bob.address);
      await removeFromContractAllowListExpectSuccess(deployer, flipper.address.toString(), bob.address);
      await removeFromContractAllowListExpectSuccess(deployer, flipper.address.toString(), bob.address);
    });
  });
});

describe.skip('Negative Integration Test removeFromContractAllowList', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('fails when called with non-contract address', async () => {
    await usingApi(async () => {
      await removeFromContractAllowListExpectFailure(alice, alice.address, bob.address);
    });
  });

  it('fails when executed by non owner', async () => {
    await usingApi(async (api) => {
      const [flipper] = await deployFlipper(api);

      await removeFromContractAllowListExpectFailure(alice, flipper.address.toString(), bob.address);
    });
  });
});
