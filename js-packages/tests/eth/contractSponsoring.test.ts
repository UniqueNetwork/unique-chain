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
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {itEth, expect, SponsoringMode, usingEthPlaygrounds, waitParams} from '@unique/test-utils/eth/util.js';
import {usingPlaygrounds} from '@unique/test-utils/util.js';
import type {CompiledContract} from '@unique/test-utils/eth/types.js';
import {HDNodeWallet} from 'ethers';
import {Contract} from 'ethers';

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
    const flipperAddress = await flipper.getAddress();
    const helpers = await helper.ethNativeContract.contractHelpers(owner);

    // 1. owner can set selfSponsoring:
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
    const result = await (await helpers.selfSponsoredEnable.send(flipperAddress)).wait(...waitParams);
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.true;

    // 1.1 Can get sponsor using sponsor:
    const actualSponsorOpt = await helpers.sponsor.staticCall(flipperAddress);
    expect(actualSponsorOpt.status).to.be.true;
    const actualSponsor = actualSponsorOpt.value;
    expect(actualSponsor.eth).to.eq(flipperAddress);
    expect(actualSponsor.sub).to.eq(0n);

    // 2. Events should be:
    const ethEvents = helper.eth.helper.eth.rebuildEvents(result!);
    expect(ethEvents).to.be.deep.equal([
      {
        address: flipperAddress,
        event: 'ContractSponsorSet',
        args: {
          contractAddress: flipperAddress,
          sponsor: flipperAddress,
        },
      },
      {
        address: flipperAddress,
        event: 'ContractSponsorshipConfirmed',
        args: {
          contractAddress: flipperAddress,
          sponsor: flipperAddress,
        },
      },
    ]);
  });

  itEth('Self sponsoring cannot be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;

    await expect((<Contract>helpers.connect(notOwner)).selfSponsoredEnable.staticCall(flipperAddress))
      .to.be.rejectedWith('NoPermission');

    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
  });

  itEth('Sponsoring can be set by the address that has deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.sponsoringEnabled.staticCall(flipperAddress)).to.be.false;
    await (await helpers.setSponsoringMode.send(flipperAddress, SponsoringMode.Allowlisted)).wait(...waitParams);
    expect(await helpers.sponsoringEnabled.staticCall(flipperAddress)).to.be.true;
  });

  itEth('Sponsoring cannot be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.sponsoringEnabled.staticCall(flipperAddress)).to.be.false;
    await expect((<Contract>helpers.connect(notOwner)).setSponsoringMode.staticCall(notOwner, SponsoringMode.Allowlisted)).to.be.rejectedWith('NoPermission');
    expect(await helpers.sponsoringEnabled.staticCall(flipperAddress)).to.be.false;
  });

  itEth('Sponsor can be set by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    // 1. owner can set a sponsor:
    expect(await helpers.hasPendingSponsor.staticCall(flipperAddress)).to.be.false;
    const result = await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);
    expect(await helpers.hasPendingSponsor.staticCall(flipperAddress)).to.be.true;

    // 2. Events should be:
    const events = helper.eth.rebuildEvents(result!);
    expect(events).to.be.deep.equal([
      {
        address: flipperAddress,
        event: 'ContractSponsorSet',
        args: {
          contractAddress: flipperAddress,
          sponsor: sponsor.address,
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
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.hasPendingSponsor.staticCall(flipperAddress)).to.be.false;
    await expect((<Contract>helpers.connect(notOwner)).setSponsor.staticCall(flipperAddress, sponsor)).to.be.rejectedWith('NoPermission');
    expect(await helpers.hasPendingSponsor.staticCall(flipperAddress)).to.be.false;
  });

  itEth('Sponsorship can be confirmed by the address that pending as sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
    await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);

    // 1. sponsor can confirm sponsorship:
    const result = await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(flipperAddress)).wait(...waitParams);
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.true;

    // 1.1 Can get sponsor using sponsor:
    const actualSponsorOpt = await helpers.sponsor.staticCall(flipperAddress);
    expect(actualSponsorOpt.status).to.be.true;
    const actualSponsor = actualSponsorOpt.value;
    expect(actualSponsor.eth).to.eq(sponsor.address);
    expect(actualSponsor.sub).to.eq(0n);

    // 2. Events should be:
    const events = helper.eth.rebuildEvents(result!);
    expect(events).to.be.deep.equal([
      {
        address: flipperAddress,
        event: 'ContractSponsorshipConfirmed',
        args: {
          contractAddress: flipperAddress,
          sponsor: sponsor.address,
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
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
    await expect(helpers.setSponsor.send(flipperAddress, sponsor)).to.be.not.rejected;
    await expect((<Contract>helpers.connect(notSponsor)).confirmSponsorship.staticCall(flipperAddress)).to.be.rejectedWith('NoPermission');
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
  });

  itEth('Sponsorship can not be confirmed by the address that not set as sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notSponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
    await expect((<Contract>helpers.connect(notSponsor)).confirmSponsorship.staticCall(flipperAddress)).to.be.rejectedWith('NoPendingSponsor');
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
  });

  itEth('Sponsor can be removed by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
    await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);
    await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(flipperAddress)).wait(...waitParams);
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.true;
    // 1. Can remove sponsor:
    const result = await (await helpers.removeSponsor.send(flipperAddress)).wait(...waitParams);
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;

    // 2. Events should be:
    const events = helper.eth.rebuildEvents(result!);
    expect(events).to.be.deep.equal([
      {
        address: flipperAddress,
        event: 'ContractSponsorRemoved',
        args: {
          contractAddress: flipperAddress,
        },
      },
    ]);

    // TODO: why call method reverts?
    // const actualSponsor = await helpers.sponsor(flipperAddress).call();
    // expect(actualSponsor.eth).to.eq(sponsor);
    // expect(actualSponsor.sub).to.eq('0');
  });

  itEth('Sponsor can not be removed by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.false;
    await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);
    await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(flipperAddress)).wait(...waitParams);
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.true;

    await expect((<Contract>helpers.connect(notOwner)).removeSponsor.staticCall(flipperAddress)).to.be.rejectedWith('NoPermission');
    await expect((<Contract>helpers.connect(notOwner)).removeSponsor.send(flipperAddress)).to.be.rejected;
    expect(await helpers.hasSponsor.staticCall(flipperAddress)).to.be.true;
  });

  itEth('In generous mode, non-allowlisted user transaction will be sponsored', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);
    await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(flipperAddress)).wait(...waitParams);

    await (await helpers.setSponsoringMode.send(flipperAddress, SponsoringMode.Generous)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(flipperAddress, 0)).wait(...waitParams);

    const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    const callerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(caller));

    await (await (<Contract>flipper.connect(caller)).flip.send()).wait(...waitParams);
    expect(await flipper.getValue.staticCall()).to.be.true;

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
    const flipperAddress = await flipper.getAddress();

    await (await helpers.selfSponsoredEnable.send(flipperAddress)).wait(...waitParams);

    await (await helpers.setSponsoringMode.send(flipperAddress, SponsoringMode.Generous)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(flipperAddress, 0)).wait(...waitParams);

    await helper.eth.transferBalanceFromSubstrate(donor, flipperAddress);

    const contractBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(flipperAddress));
    const callerBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(caller));

    await (await (<Contract>flipper.connect(caller)).flip.send()).wait(...waitParams);
    expect(await flipper.getValue.staticCall()).to.be.true;

    // Balance should be taken from sponsor instead of caller
    const contractBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(flipperAddress));
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
      await helper.eth.transferBalanceFromSubstrate(donor, caller.address, testCase.balance);
      const helpers = await helper.ethNativeContract.contractHelpers(owner);
      const flipper = await helper.eth.deployFlipper(owner);
      const flipperAddress = await flipper.getAddress();

      await (await helpers.toggleAllowlist.send(flipperAddress, true)).wait(...waitParams);
      await (await helpers.toggleAllowed.send(flipperAddress, caller, true)).wait(...waitParams);

      await (await helpers.setSponsoringMode.send(flipperAddress, SponsoringMode.Allowlisted)).wait(...waitParams);
      await (await helpers.setSponsoringRateLimit.send(flipperAddress, 0)).wait(...waitParams);

      await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);
      await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(flipperAddress)).wait(...waitParams);

      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceBefore > 0n).to.be.true;

      await (await (<Contract>flipper.connect(caller)).flip.send()).wait(...waitParams);
      expect(await flipper.getValue.staticCall()).to.be.true;

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
    const flipperAddress = await flipper.getAddress();

    await helper.eth.transferBalanceFromSubstrate(donor, flipperAddress);
    expect(await flipper.getValue.staticCall()).to.be.false;

    // flipper address has some tokens:
    const originalFlipperBalance = await helper.balance.getEthereum(flipperAddress);
    expect(originalFlipperBalance > 0n).to.be.true;

    // Set Allowlisted sponsoring mode. caller is not in allow list:
    await (await contractHelpers.toggleAllowlist.send(flipperAddress, true)).wait(...waitParams);
    await (await contractHelpers.setSponsoringMode.send(flipperAddress, SponsoringMode.Allowlisted)).wait(...waitParams);
    await (await contractHelpers.setSponsoringRateLimit.send(flipperAddress, 0)).wait(...waitParams);

    // 1. Caller has no UNQ and is not in allow list. So he cannot flip:
    await expect((<Contract>flipper.connect(caller)).flip.send()).to.be.rejectedWith('execution reverted: "target contract is allowlisted"');
    expect(await flipper.getValue.staticCall()).to.be.false;

    // Flipper's balance does not change:
    const balanceAfter = await helper.balance.getEthereum(flipperAddress);
    expect(balanceAfter).to.be.equal(originalFlipperBalance);
  });

  itEth('Sponsoring is limited, with setContractRateLimit. The limitation is working if transactions are sent more often, the sender pays the commission.', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    const originalCallerBalance = await helper.balance.getEthereum(caller);
    await (await helpers.toggleAllowlist.send(flipperAddress, true)).wait(...waitParams);
    await (await helpers.toggleAllowed.send(flipperAddress, caller, true)).wait(...waitParams);

    await (await helpers.setSponsoringMode.send(flipperAddress, SponsoringMode.Allowlisted)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(flipperAddress, 10)).wait(...waitParams);

    await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);
    await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(flipperAddress)).wait(...waitParams);

    const originalFlipperBalance = await helper.balance.getEthereum(sponsor);
    expect(originalFlipperBalance > 0n).to.be.true;

    await (await (<Contract>flipper.connect(caller)).flip.send()).wait(...waitParams);
    expect(await flipper.getValue.staticCall()).to.be.true;
    expect(await helper.balance.getEthereum(caller)).to.be.equal(originalCallerBalance);

    const newFlipperBalance = await helper.balance.getEthereum(sponsor);
    expect(newFlipperBalance).to.be.not.equal(originalFlipperBalance);

    await (await (<Contract>flipper.connect(caller)).flip.send()).wait(...waitParams);
    // todo:playgrounds fails rarely (expected 99893341659775672580n to equal 99912598679356033129n) (again, 99893341659775672580n)
    expect(await helper.balance.getEthereum(sponsor)).to.be.equal(newFlipperBalance);
    expect(await helper.balance.getEthereum(caller)).to.be.not.equal(originalCallerBalance);
  });

  // TODO: Find a way to calculate default rate limit
  itEth('Default rate limit equal 14400', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.sponsoringRateLimit.staticCall(flipperAddress)).to.be.equal(14400n);
  });

  itEth('Gas price boundaries', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    await (await helpers.setSponsor.send(flipperAddress, sponsor)).wait(...waitParams);
    await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(flipperAddress)).wait(...waitParams);

    await (await helpers.setSponsoringMode.send(flipperAddress, SponsoringMode.Generous)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(flipperAddress, 0)).wait(...waitParams);

    let sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
    let callerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(caller));

    let expectValue = await flipper.getValue.staticCall();

    const flip = async (gasPrice: bigint, shouldPass = true) => {
      await (await (<Contract>flipper.connect(caller)).flip.send({gasPrice: gasPrice})).wait(...waitParams);
      expectValue = !expectValue;
      expect(await flipper.getValue.staticCall()).to.be.eq(expectValue);
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

  async function deployTestContract(helper: EthUniqueHelper, owner: HDNodeWallet) {
    const compiled = await compileTestContract(helper);
    return await helper.ethContract.deployByAbi(owner, compiled.abi, compiled.bytecode);
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
    const flipperAddress = await flipper.getAddress();

    expect(await helpers.sponsoringFeeLimit.staticCall(flipperAddress))
      .to.be.equal(115792089237316195423570985008687907853269984665640564039457584007913129639935n);
  });

  itEth('Set fee limit', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    await (await helpers.setSponsoringFeeLimit.send(flipperAddress, 100)).wait(...waitParams);
    expect(await helpers.sponsoringFeeLimit.staticCall(flipperAddress)).to.be.equal(100n);
  });

  itEth('Negative test - set fee limit by non-owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const stranger = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    const flipperAddress = await flipper.getAddress();

    await expect((<Contract>helpers.connect(stranger)).setSponsoringFeeLimit.send(flipperAddress, 100)).to.be.rejected;
  });

  itEth('Negative test - check that eth transactions exceeding fee limit are not executed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const user = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);

    const testContract = await deployTestContract(helper, owner);

    await (await helpers.setSponsoringMode.send(await testContract.getAddress(), SponsoringMode.Generous)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(await testContract.getAddress(), 0)).wait(...waitParams);

    await (await helpers.setSponsor.send(await testContract.getAddress(), sponsor)).wait(...waitParams);
    await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship(await testContract.getAddress())).wait(...waitParams);

    const gasPrice = BigInt(await helper.eth.getGasPrice());

    await (await helpers.setSponsoringFeeLimit.send(await testContract.getAddress(), 2_000_000n * gasPrice)).wait(...waitParams);

    const originalUserBalance = await helper.balance.getEthereum(user);
    await (await (<Contract>testContract.connect(user)).test.send(100, {gas: 2_000_000, maxFeePerGas: gasPrice})).wait(...waitParams);
    expect(await helper.balance.getEthereum(user)).to.be.equal(originalUserBalance);

    await (await (<Contract>testContract.connect(user)).test.send(100, {gas: 2_100_000, maxFeePerGas: gasPrice})).wait(...waitParams);
    expect(await helper.balance.getEthereum(user)).to.not.be.equal(originalUserBalance);
  });

  itEth('Negative test - check that evm.call transactions exceeding fee limit are not executed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(owner);

    const testContract = await deployTestContract(helper, owner);

    await (await helpers.setSponsoringMode.send(await testContract.getAddress(), SponsoringMode.Generous)).wait(...waitParams);
    await (await helpers.setSponsoringRateLimit.send(await testContract.getAddress(), 0)).wait(...waitParams);

    await (await helpers.setSponsor.send(await testContract.getAddress(), sponsor)).wait(...waitParams);
    await (await (<Contract>helpers.connect(sponsor)).confirmSponsorship.send(await testContract.getAddress())).wait(...waitParams);

    const gasPrice = BigInt(await helper.eth.getGasPrice());

    await (await helpers.setSponsoringFeeLimit.send(await testContract.getAddress(), 2_000_000n * gasPrice)).wait(...waitParams);

    const originalAliceBalance = await helper.balance.getSubstrate(alice.address);

    await helper.eth.sendEVM(
      alice,
      await testContract.getAddress(),
      (await testContract.test.populateTransaction(100)).data,
      '0',
      2_000_000,
    );
    // expect((await api.query.system.account(alice.address)).data.free.toBigInt()).to.be.equal(originalAliceBalance);
    expect(await helper.balance.getSubstrate(alice.address)).to.be.equal(originalAliceBalance);

    await helper.eth.sendEVM(
      alice,
      await testContract.getAddress(),
      (await testContract.test.populateTransaction(100)).data,
      '0',
      2_100_000,
    );
    expect(await helper.balance.getSubstrate(alice.address)).to.not.be.equal(originalAliceBalance);
  });
});
