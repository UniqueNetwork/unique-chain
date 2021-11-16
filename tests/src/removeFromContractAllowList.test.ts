//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {deployFlipper, toggleFlipValueExpectFailure, toggleFlipValueExpectSuccess} from './util/contracthelpers';
import {addToContractAllowListExpectSuccess, isAllowlistedInContract, removeFromContractAllowListExpectFailure, removeFromContractAllowListExpectSuccess, toggleContractAllowlistExpectSuccess} from './util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';

describe.skip('Integration Test removeFromContractAllowList', () => {
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      bob = privateKey('//Bob');
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
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
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
