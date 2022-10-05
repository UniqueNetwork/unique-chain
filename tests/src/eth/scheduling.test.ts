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

import {expect} from 'chai';
import {createEthAccountWithBalance, deployFlipper, GAS_ARGS, itWeb3, subToEth, transferBalanceToEth} from './util/helpers';
import {scheduleExpectSuccess, waitNewBlocks, requirePallets, Pallets} from '../util/helpers';

// TODO mrshiposha update this test in #581
describe.skip('Scheduing EVM smart contracts', () => {
  before(async function() {
    await requirePallets(this, [Pallets.Scheduler]);
  });

  itWeb3('Successfully schedules and periodically executes an EVM contract', async ({api, web3, privateKeyWrapper}) => {
    const deployer = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, deployer);
    const initialValue = await flipper.methods.getValue().call();
    const alice = privateKeyWrapper('//Alice');
    await transferBalanceToEth(api, alice, subToEth(alice.address));

    {
      const tx = api.tx.evm.call(
        subToEth(alice.address),
        flipper.options.address,
        flipper.methods.flip().encodeABI(),
        '0',
        GAS_ARGS.gas,
        await web3.eth.getGasPrice(),
        null,
        null,
        [],
      );
      const waitForBlocks = 4;
      const periodBlocks = 2;

      await scheduleExpectSuccess(tx, alice, waitForBlocks, '0x' + '0'.repeat(32), periodBlocks, 2);
      expect(await flipper.methods.getValue().call()).to.be.equal(initialValue);
      
      await waitNewBlocks(waitForBlocks - 1);
      expect(await flipper.methods.getValue().call()).to.be.not.equal(initialValue);
  
      await waitNewBlocks(periodBlocks);
      expect(await flipper.methods.getValue().call()).to.be.equal(initialValue);
    }
  });
});
