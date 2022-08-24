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
import {
  contractHelpers,
  createEthAccountWithBalance,
  transferBalanceToEth,
  deployFlipper,
  itWeb3,
  SponsoringMode,
  createEthAccount,
  ethBalanceViaSub,
} from './util/helpers';
import {evmToAddress} from '@polkadot/util-crypto';

describe('Sponsoring EVM contracts', () => {
  itWeb3('Self sponsored can be set by the address that deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itWeb3('Self sponsored can not be set by the address that did not deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.selfSponsoredEnable(flipper.options.address).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itWeb3('Sponsoring can be set by the address that has deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner})).to.be.not.rejected;
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;
  });

  itWeb3('Sponsoring cannot be set by the address that did not deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsoringMode(notOwner, SponsoringMode.Allowlisted).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
  });
  
  itWeb3('Sponsor can be set by the address that deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.true;
  });
  
  itWeb3('Sponsor can not be set by the address that did not deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
  });

  itWeb3('Sponsorship can be confirmed by the address that pending as sponsor', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor})).to.be.not.rejected;
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itWeb3('Sponsorship can not be confirmed by the address that not pending as sponsor', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notSponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).call({from: notSponsor})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itWeb3('Sponsorship can not be confirmed by the address that not set as sponsor', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notSponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).call({from: notSponsor})).to.be.rejectedWith('NoPendingSponsor');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itWeb3('Get self sponsored sponsor', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    await helpers.methods.selfSponsoredEnable(flipper.options.address).send();
    
    const result = await helpers.methods.getSponsor(flipper.options.address).call();

    expect(result[0]).to.be.eq(flipper.options.address);
    expect(result[1]).to.be.eq('0');
  });

  itWeb3('Get confirmed sponsor', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    
    const result = await helpers.methods.getSponsor(flipper.options.address).call();

    expect(result[0]).to.be.eq(sponsor);
    expect(result[1]).to.be.eq('0');
  });

  itWeb3('Sponsor can be removed by the address that deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
    
    await helpers.methods.removeSponsor(flipper.options.address).send();
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itWeb3('Sponsor can not be removed by the address that did not deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const notOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
    
    await expect(helpers.methods.removeSponsor(flipper.options.address).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itWeb3('In generous mode, non-allowlisted user transaction will be sponsored', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    const sponsorBalanceBefore = await ethBalanceViaSub(api, sponsor);
    const callerBalanceBefore = await ethBalanceViaSub(api, caller);

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from sponsor instead of caller
    const sponsorBalanceAfter = await ethBalanceViaSub(api, sponsor);
    const callerBalanceAfter = await ethBalanceViaSub(api, caller);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    expect(callerBalanceAfter).to.be.eq(callerBalanceBefore);
  });

  itWeb3('In generous mode, non-allowlisted user transaction will be self sponsored', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

    await helpers.methods.selfSponsoredEnable(flipper.options.address).send();

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await transferBalanceToEth(api, alice, flipper.options.address);

    const contractBalanceBefore = await ethBalanceViaSub(api, flipper.options.address);
    const callerBalanceBefore = await ethBalanceViaSub(api, caller);

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from sponsor instead of caller
    const contractBalanceAfter = await ethBalanceViaSub(api, flipper.options.address);
    const callerBalanceAfter = await ethBalanceViaSub(api, caller);
    expect(contractBalanceAfter < contractBalanceBefore).to.be.true;
    expect(callerBalanceAfter).to.be.eq(callerBalanceBefore);
  });

  itWeb3('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should decrease (allowlisted)', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const caller = createEthAccount(web3);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    const sponsorBalanceBefore = await ethBalanceViaSub(api, sponsor);
    expect(sponsorBalanceBefore).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from flipper instead of caller
    const sponsorBalanceAfter = await ethBalanceViaSub(api, sponsor);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
  });

  itWeb3('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should not decrease (non-allowlisted)', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const caller = createEthAccount(web3);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await expect(flipper.methods.flip().send({from: caller})).to.be.rejectedWith(/InvalidTransaction::Payment/);
    expect(await flipper.methods.getValue().call()).to.be.false;

    // Balance should be taken from flipper instead of caller
    const balanceAfter = await web3.eth.getBalance(flipper.options.address);
    expect(+balanceAfter).to.be.equals(+originalFlipperBalance);
  });

  itWeb3('Sponsoring is set, an address that has UNQ can send a transaction and it works. User balance should not change', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    const sponsorBalanceBefore = await ethBalanceViaSub(api, sponsor);
    const callerBalanceBefore = await ethBalanceViaSub(api, caller);

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    const sponsorBalanceAfter = await ethBalanceViaSub(api, sponsor);
    const callerBalanceAfter = await ethBalanceViaSub(api, caller);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    expect(callerBalanceAfter).to.be.equals(callerBalanceBefore);
  });

  itWeb3('Sponsoring is limited, with setContractRateLimit. The limitation is working if transactions are sent more often, the sender pays the commission.', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const originalCallerBalance = await web3.eth.getBalance(caller);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 10).send({from: owner});

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    const originalFlipperBalance = await web3.eth.getBalance(sponsor);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;
    expect(await web3.eth.getBalance(caller)).to.be.equals(originalCallerBalance);

    const newFlipperBalance = await web3.eth.getBalance(sponsor);
    expect(newFlipperBalance).to.be.not.equals(originalFlipperBalance);

    await flipper.methods.flip().send({from: caller});
    expect(await web3.eth.getBalance(sponsor)).to.be.equal(newFlipperBalance);
    expect(await web3.eth.getBalance(caller)).to.be.not.equals(originalCallerBalance);
  });

  // TODO: Find a way to calculate default rate limit
  itWeb3('Default rate limit equals 7200', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.getSponsoringRateLimit(flipper.options.address).call()).to.be.equals('7200');
  });
});
