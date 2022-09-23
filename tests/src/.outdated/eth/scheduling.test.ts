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
import {subToEth} from './util/helpers';
import {waitNewBlocks, Pallets} from '../util/helpers';
import {EthUniqueHelper, itEth} from './util/playgrounds';

describe('Scheduing EVM smart contracts', () => {

  itEth.ifWithPallets('Successfully schedules and periodically executes an EVM contract', [Pallets.Scheduler], async ({helper, privateKey}) => {
    const alice = privateKey('//Alice');

    const scheduledId = await helper.arrange.makeScheduledId();

    const deployer = await helper.eth.createAccountWithBalance(alice);
    const flipper = await helper.eth.deployFlipper(deployer);

    const initialValue = await flipper.methods.getValue().call();
    await helper.eth.transferBalanceFromSubstrate(alice, subToEth(alice.address));

    const waitForBlocks = 4;
    const periodic = {
      period: 2,
      repetitions: 2,
    };

    await helper.scheduler.scheduleAfter<EthUniqueHelper>(scheduledId, waitForBlocks, {periodic})
      .eth.callEVM(
        alice,
        flipper.options.address,
        flipper.methods.flip().encodeABI(),
        '0',
      );

    expect(await flipper.methods.getValue().call()).to.be.equal(initialValue);
    
    await waitNewBlocks(waitForBlocks + 1);
    expect(await flipper.methods.getValue().call()).to.be.not.equal(initialValue);

    await waitNewBlocks(periodic.period);
    expect(await flipper.methods.getValue().call()).to.be.equal(initialValue);
  });
});
