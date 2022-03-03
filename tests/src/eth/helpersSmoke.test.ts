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
import {createEthAccountWithBalance, deployFlipper, itWeb3, contractHelpers} from './util/helpers';

describe('Helpers sanity check', () => {
  itWeb3('Contract owner is recorded', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);

    const flipper = await deployFlipper(web3, owner);

    expect(await contractHelpers(web3, owner).methods.contractOwner(flipper.options.address).call()).to.be.equal(owner);
  });

  itWeb3('Flipper is working', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);

    expect(await flipper.methods.getValue().call()).to.be.false;
    await flipper.methods.flip().send({from: owner});
    expect(await flipper.methods.getValue().call()).to.be.true;
  });
});
