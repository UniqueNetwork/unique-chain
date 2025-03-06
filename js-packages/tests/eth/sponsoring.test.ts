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

import type {IKeyringPair} from '@polkadot/types/types';
import {itEth, expect, SponsoringMode, waitParams} from '@unique/test-utils/eth/util.js';
import {usingPlaygrounds} from '@unique/test-utils/util.js';

describe('EVM sponsoring', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Fee is deducted from contract if sponsoring is enabled', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = helper.eth.createAccount();
    const originalCallerBalance = await helper.balance.getEthereum(caller);

    expect(originalCallerBalance).to.be.equal(0n);

    const flipper = await helper.eth.deployFlipper(owner);

    const helpers = await helper.ethNativeContract.contractHelpers(owner);

    await (await helpers.toggleAllowlist.send(await flipper.getAddress(), true)).wait(...waitParams);
    await (await helpers.toggleAllowed.send(await flipper.getAddress(), caller, true)).wait(...waitParams);

    await (await helpers.setSponsor.send(await flipper.getAddress(), sponsor)).wait(...waitParams);
    await (await helpers.confirmSponsorship.send(await flipper.getAddress(), {from: sponsor})).wait(...waitParams);

    expect(await helpers.sponsoringEnabled.staticCall(await flipper.getAddress())).to.be.false;
    await (await helpers.setSponsoringMode.send(await flipper.getAddress(), SponsoringMode.Allowlisted)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(await flipper.getAddress(), 0)).wait(...waitParams);
    expect(await helpers.sponsoringEnabled.staticCall(await flipper.getAddress())).to.be.true;

    const originalSponsorBalance = await helper.balance.getEthereum(sponsor);
    expect(originalSponsorBalance).to.be.not.equal(0n);

    await (await flipper.flip.send({from: caller})).wait(...waitParams);
    expect(await flipper.getValue.staticCall
      ()).to.be.true;

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

    const helpers = await helper.ethNativeContract.contractHelpers(owner);

    await (await helpers.toggleAllowlist.send(await collector.getAddress(), true)).wait(...waitParams);
    await (await helpers.toggleAllowed.send(await collector.getAddress(), caller, true)).wait(...waitParams);

    expect(await helpers.sponsoringEnabled.staticCall(await collector.getAddress())).to.be.false;
    await (await helpers.setSponsoringMode.send(await collector.getAddress(), SponsoringMode.Allowlisted)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(await collector.getAddress(), 0)).wait(...waitParams);
    expect(await helpers.sponsoringEnabled.staticCall(await collector.getAddress())).to.be.true;

    await (await helpers.setSponsor.send(await collector.getAddress(), sponsor)).wait(...waitParams);
    await (await helpers.confirmSponsorship.send(await collector.getAddress(), {from: sponsor})).wait(...waitParams);

    const originalSponsorBalance = await helper.balance.getEthereum(sponsor);
    expect(originalSponsorBalance).to.be.not.equal(0n);

    await (await collector.giveMoney.send({from: caller, value: '10000'})).wait(...waitParams);

    // Balance will be taken from both caller (value) and from collector (fee)
    expect(await helper.balance.getEthereum(caller)).to.be.equals((originalCallerBalance - 10000n));
    expect(await helper.balance.getEthereum(sponsor)).to.be.not.equals(originalSponsorBalance);
    expect(await collector.getCollected.staticCall()).to.be.equal('10000');
  });
});
