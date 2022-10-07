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
import * as solc from 'solc';
import {EthUniqueHelper} from './util/playgrounds/unique.dev';
import {itEth, expect, SponsoringMode, usingEthPlaygrounds} from '../eth/util/playgrounds';
import {usingPlaygrounds} from '../util/playgrounds';
import {CompiledContract} from './util/playgrounds/types';

describe('Sponsoring EVM contracts', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Self sponsored can be set by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);
    const helpers = helper.ethNativeContract.contractHelpers(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itEth('Set self sponsored events', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(owner);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    
    const result = await helpers.methods.selfSponsoredEnable(flipper.options.address).send();
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

  itEth('Self sponsored can not be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.selfSponsoredEnable(flipper.options.address).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsoring can be set by the address that has deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner})).to.be.not.rejected;
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;
  });

  itEth('Sponsoring cannot be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsoringMode(notOwner, SponsoringMode.Allowlisted).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
  });
  
  itEth('Sponsor can be set by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.true;
  });
  
  itEth('Set sponsor event', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    
    const result = await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
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
  
  itEth('Sponsor can not be set by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasPendingSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsorship can be confirmed by the address that pending as sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor})).to.be.not.rejected;
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itEth('Confirm sponsorship event', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    const result = await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
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
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).call({from: notSponsor})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Sponsorship can not be confirmed by the address that not set as sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notSponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.confirmSponsorship(flipper.options.address).call({from: notSponsor})).to.be.rejectedWith('NoPendingSponsor');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Get self sponsored sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.selfSponsoredEnable(flipper.options.address).send();
    
    const result = await helpers.methods.sponsor(flipper.options.address).call();

    expect(result[0]).to.be.eq(flipper.options.address);
    expect(result[1]).to.be.eq('0');
  });

  itEth('Get confirmed sponsor', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    
    const result = await helpers.methods.sponsor(flipper.options.address).call();

    expect(result[0]).to.be.eq(sponsor);
    expect(result[1]).to.be.eq('0');
  });

  itEth('Sponsor can be removed by the address that deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
    
    await helpers.methods.removeSponsor(flipper.options.address).send();
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
  });

  itEth('Remove sponsor event', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    
    const result = await helpers.methods.removeSponsor(flipper.options.address).send();
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
  });

  itEth('Sponsor can not be removed by the address that did not deployed the contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const notOwner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
    
    await expect(helpers.methods.removeSponsor(flipper.options.address).call({from: notOwner})).to.be.rejectedWith('NoPermission');
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itEth('In generous mode, non-allowlisted user transaction will be sponsored', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    const sponsorBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(sponsor));
    const callerBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(caller));

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from sponsor instead of caller
    const sponsorBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(sponsor));
    const callerBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(caller));
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    expect(callerBalanceAfter).to.be.eq(callerBalanceBefore);
  });

  itEth('In generous mode, non-allowlisted user transaction will be self sponsored', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
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

  itEth('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should decrease (allowlisted)', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = helper.eth.createAccount();
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    const sponsorBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(sponsor));
    expect(sponsorBalanceBefore).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from flipper instead of caller
    const sponsorBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(sponsor));
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
  });

  itEth('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should not decrease (non-allowlisted)', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccount();
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await helper.eth.transferBalanceFromSubstrate(donor, flipper.options.address);

    const originalFlipperBalance = await helper.balance.getEthereum(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await expect(flipper.methods.flip().send({from: caller})).to.be.rejectedWith(/InvalidTransaction::Payment/);
    expect(await flipper.methods.getValue().call()).to.be.false;

    // Balance should be taken from flipper instead of caller
    // FIXME the comment is wrong! What check should be here?
    const balanceAfter = await helper.balance.getEthereum(flipper.options.address);
    expect(balanceAfter).to.be.equals(originalFlipperBalance);
  });

  itEth('Sponsoring is set, an address that has UNQ can send a transaction and it works. User balance should not change', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    const sponsorBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(sponsor));
    const callerBalanceBefore = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(caller));

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    const sponsorBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(sponsor));
    const callerBalanceAfter = await helper.balance.getSubstrate(await helper.address.ethToSubstrate(caller));
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    expect(callerBalanceAfter).to.be.equals(callerBalanceBefore);
  });

  itEth('Sponsoring is limited, with setContractRateLimit. The limitation is working if transactions are sent more often, the sender pays the commission.', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);
    
    const originalCallerBalance = await helper.balance.getEthereum(caller);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 10).send({from: owner});

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});

    const originalFlipperBalance = await helper.balance.getEthereum(sponsor);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;
    expect(await helper.balance.getEthereum(caller)).to.be.equals(originalCallerBalance);

    const newFlipperBalance = await helper.balance.getEthereum(sponsor);
    expect(newFlipperBalance).to.be.not.equals(originalFlipperBalance);

    await flipper.methods.flip().send({from: caller});
    expect(await helper.balance.getEthereum(sponsor)).to.be.equal(newFlipperBalance);
    expect(await helper.balance.getEthereum(caller)).to.be.not.equals(originalCallerBalance);
  });

  // TODO: Find a way to calculate default rate limit
  itEth('Default rate limit equals 7200', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringRateLimit(flipper.options.address).call()).to.be.equals('7200');
  });
});

describe('Sponsoring Fee Limit', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let DEFAULT_GAS: number;

  function compileTestContract() {
    if (!testContract) {
      const input = {
        language: 'Solidity',
        sources: {
          ['TestContract.sol']: {
            content:
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
          },
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['*'],
            },
          },
        },
      };
      const json = JSON.parse(solc.compile(JSON.stringify(input)));
      const out = json.contracts['TestContract.sol']['TestContract'];
  
      testContract = {
        abi: out.abi,
        object: '0x' + out.evm.bytecode.object,
      };
    }
    return testContract;
  }
  
  async function deployTestContract(helper: EthUniqueHelper, owner: string) {
    const web3 = helper.getWeb3();
    const compiled = compileTestContract();
    const testContract = new web3.eth.Contract(compiled.abi, undefined, {
      data: compiled.object,
      from: owner,
      gas: DEFAULT_GAS,
    });
    return await testContract.deploy({data: compiled.object}).send({from: owner});
  }

  before(async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([100n], donor);
      DEFAULT_GAS = helper.eth.DEFAULT_GAS;
    });
  });

  let testContract: CompiledContract;

  itEth('Default fee limit', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    expect(await helpers.methods.sponsoringFeeLimit(flipper.options.address).call()).to.be.equals('115792089237316195423570985008687907853269984665640564039457584007913129639935');
  });

  itEth('Set fee limit', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
    const flipper = await helper.eth.deployFlipper(owner);

    await helpers.methods.setSponsoringFeeLimit(flipper.options.address, 100).send();
    expect(await helpers.methods.sponsoringFeeLimit(flipper.options.address).call()).to.be.equals('100');
  });

  itEth('Negative test - set fee limit by non-owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const stranger = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);
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
    await testContract.methods.test(100).send({from: user, gas: 2_000_000});
    expect(await helper.balance.getEthereum(user)).to.be.equal(originalUserBalance);

    await testContract.methods.test(100).send({from: user, gas: 2_100_000});
    expect(await helper.balance.getEthereum(user)).to.not.be.equal(originalUserBalance);
  });

  itEth('Negative test - check that evm.call transactions exceeding fee limit are not executed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = helper.ethNativeContract.contractHelpers(owner);

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
