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
import {itEth, expect, SponsoringMode} from '../eth/util/playgrounds';
import {usingPlaygrounds} from './../util/playgrounds/index';

describe('EVM sponsoring', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Fee is deducted from contract if sponsoring is enabled', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = helper.eth.createAccount();
    const originalCallerBalance = await helper.balance.getEthereum(caller);

    expect(originalCallerBalance).to.be.equal(0n);

    const flipper = await helper.eth.deployFlipper(owner);

    const helpers = helper.ethNativeContract.contractHelpers(owner);

    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});
    
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send({from: owner});
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    const originalSponsorBalance = await helper.balance.getEthereum(sponsor);
    expect(originalSponsorBalance).to.be.not.equal(0n);

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from flipper instead of caller
    expect(await helper.balance.getEthereum(caller)).to.be.equal(originalCallerBalance);
    expect(await helper.balance.getEthereum(sponsor)).to.be.not.equal(originalSponsorBalance);
  });

  itEth('...but this doesn\'t applies to payable value', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const originalCallerBalance = await helper.balance.getEthereum(caller);

    expect(originalCallerBalance).to.be.not.equal(0n);

    const collector = await helper.eth.deployCollectorContract(owner);

    const helpers = helper.ethNativeContract.contractHelpers(owner);

    await helpers.methods.toggleAllowlist(collector.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(collector.options.address, caller, true).send({from: owner});

    expect(await helpers.methods.sponsoringEnabled(collector.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(collector.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(collector.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(collector.options.address).call()).to.be.true;

    await helpers.methods.setSponsor(collector.options.address, sponsor).send({from: owner});
    await helpers.methods.confirmSponsorship(collector.options.address).send({from: sponsor});

    const originalSponsorBalance = await helper.balance.getEthereum(sponsor);
    expect(originalSponsorBalance).to.be.not.equal(0n);

    await collector.methods.giveMoney().send({from: caller, value: '10000'});

    // Balance will be taken from both caller (value) and from collector (fee)
    expect(await helper.balance.getEthereum(caller)).to.be.equals((originalCallerBalance - 10000n));
    expect(await helper.balance.getEthereum(sponsor)).to.be.not.equals(originalSponsorBalance);
    expect(await collector.methods.getCollected().call()).to.be.equal('10000');
  });
});
