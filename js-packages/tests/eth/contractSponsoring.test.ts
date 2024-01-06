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
import {EthUniqueHelper} from './util/playgrounds/unique.dev.js';
import {itEth, expect, SponsoringMode, usingEthPlaygrounds} from './util/index.js';
import {usingPlaygrounds} from '@unique/test-utils/util.js';
import type {CompiledContract} from './util/playgrounds/types.js';

describe('Sponsoring EVM contracts', () => {
  let donor: IKeyringPair;
  let nominal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      nominal = helper.balance.getOneTokenNominal();
    });
  });

  itEth('Self sponsoring can be set by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);

    // 1. owner can set selfSponsoring:
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    const result = await helpers.methods.selfSponsoredEnable(flipper.options.address).send({from: owner});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;

    // 1.1 Can get sponsor using methods.sponsor:
    const actualSponsorOpt = await helpers.methods.sponsor(flipper.options.address).call();
    expect(actualSponsorOpt.status).to.be.true;
    const actualSponsor = actualSponsorOpt.value;
    expect(actualSponsor.eth).to.eq(flipper.options.address);
    expect(actualSponsor.sub).to.eq('0');

    // 2. Events should be:
    const ethEvents = helper.eth.helper.eth.normalizeEvents(result.events);
    expect(ethEvents).to.be.deep.equal([
      {
        address: flipper.options.address,
        event: 'ContractSponsorSet',
        args: {
          contractAddress: flipper.options.address,
          sponsor: flipper.options.address,
        },
      },
      {
        address: flipper.options.address,
        event: 'ContractSponsorshipConfirmed',
        args: {
          contractAddress: flipper.options.address,
          sponsor: flipper.options.address,
        },
      },
    ]);
  });

  itEth('Self sponsoring cannot be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.selfSponsoredEnable(flipper.options.address).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsoring can be set by the address that has deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;
  });

  itEth('Sponsoring cannot be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsoringMode(notOwner, SponsoringMode.Allowlisted).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsor can be set by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    // 1. owner can set a sponsor:
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
    const result = await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.true;

    // 2. Events should be:
    const events = helper.eth.normalizeEvents(result.events);
    expect(events).to.be.deep.equal([
      {
        address: flipper.options.address,
        event: 'ContractSponsorSet',
        args: {
          contractAddress: flipper.options.address,
          sponsor: sponsor,
        },
      },
    ]);
  });

  itEth('Sponsor cannot be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsorship can be confirmed by the address that pending as sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();

    // 1. sponsor can confirm sponsorship:
    const result = await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;

    // 1.1 Can get sponsor using methods.sponsor:
    const actualSponsorOpt = await helpers.methods.sponsor(flipper.options.address).call();
    expect(actualSponsorOpt.status).to.be.true;
    const actualSponsor = actualSponsorOpt.value;
    expect(actualSponsor.eth).to.eq(sponsor);
    expect(actualSponsor.sub).to.eq('0');

    // 2. Events should be:
    const events = helper.eth.normalizeEvents(result.events);
    expect(events).to.be.deep.equal([
      {
        address: flipper.options.address,
        event: 'ContractSponsorshipConfirmed',
        args: {
          contractAddress: flipper.options.address,
          sponsor: sponsor,
        },
      },
    ]);
  });

  itEth('Sponsorship can not be confirmed by the address that not pending as sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const notSponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).call({from: notSponsor})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsorship can not be confirmed by the address that not set as sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notSponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).call({from: notSponsor})).to.be.rejectedWith('NoPendingSponsor');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsor can be removed by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
    // 1. Can remove sponsor:
    const result = await helpers.methods.removeSponsor(flipper.options.address).send();
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;

    // 2. Events should be:
    const events = helper.eth.normalizeEvents(result.events);
    expect(events).to.be.deep.equal([
      {
        address: flipper.options.address,
        event: 'ContractSponsorRemoved',
        args: {
          contractAddress: flipper.options.address,
        },
      },
    ]);

    // TODO: why call method reverts?
    // const actualSponsor = await helpers.methods.sponsor(flipper.options.address).call();
    // expect(actualSponsor.eth).to.eq(sponsor);
    // expect(actualSponsor.sub).to.eq('0');
  });

  itEth('Sponsor can not be removed by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;

    await expect(helpers.methods.removeSponsor(flipper.options.address).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    await expect(helpers.methods.removeSponsor(flipper.options.address).send({from: notOwner})).to.be.rejected;
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itEth('In generous mode, non-allowlisted user transaction will be sponsored', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    const callerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(caller));

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from sponsor instead of caller
    const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    const callerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(caller));
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    expect(callerBalanceAfter).to.be.eq(callerBalanceBefore);
  });

  itEth('In generous mode, non-allowlisted user transaction will be self sponsored', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.selfSponsoredEnable(flipper.options.address).send();

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await helper.eth.transferBalanceFromSubstrate(donor, flipper.options.address);

    const contractBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(flipper.options.address));
    const callerBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(caller));

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from sponsor instead of caller
    const contractBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(flipper.options.address));
    const callerBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(caller));
    expect(contractBalanceAfter < contractBalanceBefore).to.be.true;
    expect(callerBalanceAfter).to.be.eq(callerBalanceBefore);
  });

  [
    {balance: 0n, label: '0'},
    {balance: 10n, label: '10'},
  ].map(testCase => {
    itEth(`Allow-listed address that has ${testCase.label} UNQ can call a contract. Sponsor balance should decrease`, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const caller = helper.eth.createAccount();
      await helper.eth.transferBalanceFromSubstrate(donor, caller, testCase.balance);
      const helpers = await helper.ethNativeContract.contractHelpers(owner);
      const flipper = await helper.eth.deployFlipper(owner);

      await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
      await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

      await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
      await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

      await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
      await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceBefore > 0n).to.be.true;

      await flipper.methods.flip().send({from: caller});
      expect(await flipper.methods.getValue().call()).to.be.true;

      // Balance should be taken from flipper instead of caller
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
      // Caller's balance does not change:
      const callerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(caller));
      expect(callerBalanceAfter).to.eq(testCase.balance * nominal);
    });
  });

  itEth('Non-allow-listed address can call a contract. Sponsor balance should not decrease', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const caller = helper.eth.createAccount();
    const contractHelpers = await helper.ethNativeContract.contractHelpers(owner);

    // Deploy flipper and send some tokens:
    const flipper = await helper.eth.deployFlipper(owner);
    await helper.eth.transferBalanceFromSubstrate(donor, flipper.options.address);
    expect(await flipper.methods.getValue().call()).to.be.false;
    // flipper address has some tokens:
    const originalFlipperBalance = await helper.balance.getEthereum(flipper.options.address);
    expect(originalFlipperBalance > 0n).to.be.true;

    // Set Allowlisted sponsoring mode. caller is not in allow list:
    await contractHelpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await contractHelpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await contractHelpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    // 1. Caller has no UNQ and is not in allow list. So he cannot flip:
    await expect(flipper.methods.flip().send({from: caller})).to.be.rejectedWith(/Returned error: insufficient funds for gas \* price \+ value/);
    expect(await flipper.methods.getValue().call()).to.be.false;

    // Flipper's balance does not change:
    const balanceAfter = await helper.balance.getEthereum(flipper.options.address);
    expect(balanceAfter).to.be.equal(originalFlipperBalance);
  });

  itEth('Sponsoring is limited, with setContractRateLimit. The limitation is working if transactions are sent more often, the sender pays the commission.', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    const originalCallerBalance = await helper.balance.getEthereum(caller);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 10).send({from: owner});

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    const originalFlipperBalance = await helper.balance.getEthereum(sponsor);
    expect(originalFlipperBalance > 0n).to.be.true;

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;
    expect(await helper.balance.getEthereum(caller)).to.be.equal(originalCallerBalance);

    const newFlipperBalance = await helper.balance.getEthereum(sponsor);
    expect(newFlipperBalance).to.be.not.equal(originalFlipperBalance);

    await flipper.methods.flip().send({from: caller});
    // todo:playgrounds fails rarely (expected 99893341659775672580n to equal 99912598679356033129n) (again, 99893341659775672580n)
    expect(await helper.balance.getEthereum(sponsor)).to.be.equal(newFlipperBalance);
    expect(await helper.balance.getEthereum(caller)).to.be.not.equal(originalCallerBalance);
  });

  // TODO: Find a way to calculate default rate limit
  itEth('Default rate limit equal 7200', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringRateLimit(flipper.options.address).call()).to.be.equal('7200');
  });

  itEth('Gas price boundaries', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    let sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    let callerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(caller));

    let expectValue = await flipper.methods.getValue().call();

    const flip = async (gasPrice: bigint, shouldPass = true) => {
      await flipper.methods.flip().send({from: caller, gasPrice: gasPrice});
      expectValue = !expectValue;
      expect(await flipper.methods.getValue().call()).to.be.eq(expectValue);
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      const callerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(caller));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.eq(shouldPass);
      expect(callerBalanceAfter === callerBalanceBefore).to.be.eq(shouldPass);
      sponsorBalanceBefore = sponsorBalanceAfter;
      callerBalanceBefore = callerBalanceAfter;
    };

    const gasPrice = BigInt((await helper.eth.getGasPrice())!);
    await flip(gasPrice);
    await flip(gasPrice * 2n);
    await flip(gasPrice * 21n / 10n);
    await flip(gasPrice * 22n / 10n, false);
  });
});

describe('Sponsoring Fee Limit', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let testContract: CompiledContract;

  async function compileTestContract(helper: EthUniqueHelper) {
    if(!testContract) {
      testContract = await helper.ethContract.compile(
        'TestContract',
        `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;

        contract TestContract {
          event Result(bool);

          function test(uint32 cycles) public {
            uint256 counter = 0;
            while(true) {
              counter ++;
              if (counter > cycles){
                break;
              }
            }
            emit Result(true);
          }
        }
      `,
      );
    }
    return testContract;
  }

  async function deployTestContract(helper: EthUniqueHelper, owner: string) {
    const compiled = await compileTestContract(helper);
    return await helper.ethContract.deployByAbi(owner, compiled.abi, compiled.object);
  }

  before(async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  itEth('Default fee limit', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringFeeLimit(flipper.options.address).call()).to.be.equal('115792089237316195423570985008687907853269984665640564039457584007913129639935');
  });

  itEth('Set fee limit', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsoringFeeLimit(flipper.options.address, 100).send();
    expect(await helpers.methods.sponsoringFeeLimit(flipper.options.address).call()).to.be.equal('100');
  });

  itEth('Negative test - set fee limit by non-owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const stranger = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await expect(helpers.methods.setSponsoringFeeLimit(flipper.options.address, 100).send({from: stranger})).to.be.rejected;
  });

  itEth('Negative test - check that eth transactions exceeding fee limit are not executed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const user = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);

    const testContract = await deployTestContract(helper, owner);

    await helpers.methods.setSponsoringMode(testContract.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(testContract.options.address, 0).send({from: owner});

    await helpers.methods.setSponsor(testContract.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(testContract.options.address).send({from: sponsor});

    const gasPrice = BigInt(await helper.getWeb3().eth.getGasPrice());

    await helpers.methods.setSponsoringFeeLimit(testContract.options.address, 2_000_000n * gasPrice).send();

    const originalUserBalance = await helper.balance.getEthereum(user);
    await testContract.methods.test(100).send({from: user, gas: 2_000_000, maxFeePerGas: gasPrice.toString()});
    expect(await helper.balance.getEthereum(user)).to.be.equal(originalUserBalance);

    await testContract.methods.test(100).send({from: user, gas: 2_100_000, maxFeePerGas: gasPrice.toString()});
    expect(await helper.balance.getEthereum(user)).to.not.be.equal(originalUserBalance);
  });

  itEth('Negative test - check that evm.call transactions exceeding fee limit are not executed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);

    const testContract = await deployTestContract(helper, owner);

    await helpers.methods.setSponsoringMode(testContract.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(testContract.options.address, 0).send({from: owner});

    await helpers.methods.setSponsor(testContract.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(testContract.options.address).send({from: sponsor});

    const gasPrice = BigInt(await helper.getWeb3().eth.getGasPrice());

    await helpers.methods.setSponsoringFeeLimit(testContract.options.address, 2_000_000n * gasPrice).send();

    const originalAliceBalance = await helper.balance.getSubstrate(alice.address);

    await helper.eth.sendEVM(
      alice,
      testContract.options.address,
      testContract.methods.test(100).encodeABI(),
      '0',
      2_000_000,
    );
    // expect((await api.query.system.account(alice.address)).data.free.toBigInt()).to.be.equal(originalAliceBalance);
    expect(await helper.balance.getSubstrate(alice.address)).to.be.equal(originalAliceBalance);

    await helper.eth.sendEVM(
      alice,
      testContract.options.address,
      testContract.methods.test(100).encodeABI(),
      '0',
      2_100_000,
    );
    expect(await helper.balance.getSubstrate(alice.address)).to.not.be.equal(originalAliceBalance);
  });
});
