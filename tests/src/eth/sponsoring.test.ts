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
import privateKey from '../substrate/privateKey';
import {contractHelpers, createEthAccount, createEthAccountWithBalance, deployCollector, deployFlipper, itWeb3, SponsoringMode, transferBalanceToEth} from './util/helpers';

describe('EVM sponsoring', () => {
  itWeb3('Fee is deducted from contract if sponsoring is enabled', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = createEthAccount(web3);
    const originalCallerBalance = await web3.eth.getBalance(caller);
    expect(originalCallerBalance).to.be.equal('0');

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from flipper instead of caller
    expect(await web3.eth.getBalance(caller)).to.be.equals(originalCallerBalance);
    expect(await web3.eth.getBalance(flipper.options.address)).to.be.not.equals(originalFlipperBalance);
  });
  itWeb3('...but this doesn\'t applies to payable value', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccountWithBalance(api, web3);
    const originalCallerBalance = await web3.eth.getBalance(caller);
    expect(originalCallerBalance).to.be.not.equal('0');

    const collector = await deployCollector(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(collector.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(collector.options.address, caller, true).send({from: owner});

    expect(await helpers.methods.sponsoringEnabled(collector.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(collector.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(collector.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(collector.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, collector.options.address);

    const originalCollectorBalance = await web3.eth.getBalance(collector.options.address);
    expect(originalCollectorBalance).to.be.not.equal('0');

    await collector.methods.giveMoney().send({from: caller, value: '10000'});

    // Balance will be taken from both caller (value) and from collector (fee)
    expect(await web3.eth.getBalance(caller)).to.be.equals((BigInt(originalCallerBalance) - 10000n).toString());
    expect(await web3.eth.getBalance(collector.options.address)).to.be.not.equals(originalCollectorBalance);
    expect(await collector.methods.getCollected().call()).to.be.equal('10000');
  });
});
