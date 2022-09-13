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

import * as solc from 'solc';
import {expect} from 'chai';
import {expectSubstrateEventsAtBlock} from '../util/helpers';
import Web3 from 'web3';

import {
  contractHelpers,
  createEthAccountWithBalance,
  transferBalanceToEth,
  deployFlipper,
  itWeb3,
  SponsoringMode,
  createEthAccount,
  ethBalanceViaSub,
  normalizeEvents,
  CompiledContract,
  GAS_ARGS,
  subToEth,
} from './util/helpers';
import {submitTransactionAsync} from '../substrate/substrate-api';

describe('Sponsoring EVM contracts', () => {
  itWeb3('Self sponsored can be set by the address that deployed the contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;
    expect(await helpers.methods.hasSponsor(flipper.options.address).call()).to.be.true;
  });

  itWeb3('Set self sponsored events', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    
    const result = await helpers.methods.selfSponsoredEnable(flipper.options.address).send();
    // console.log(result);
    const ethEvents = normalizeEvents(result.events);
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

    await expectSubstrateEventsAtBlock(
      api, 
      result.blockNumber,
      'evmContractHelpers',
      ['ContractSponsorSet','ContractSponsorshipConfirmed'],
    );
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
  
  itWeb3('Set sponsor event', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    
    const result = await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    const events = normalizeEvents(result.events);
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

    await expectSubstrateEventsAtBlock(
      api, 
      result.blockNumber,
      'evmContractHelpers',
      ['ContractSponsorSet'],
    );
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

  itWeb3('Confirm sponsorship event', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    await expect(helpers.methods.setSponsor(flipper.options.address, sponsor).send()).to.be.not.rejected;
    const result = await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    const events = normalizeEvents(result.events);
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

    await expectSubstrateEventsAtBlock(
      api, 
      result.blockNumber,
      'evmContractHelpers',
      ['ContractSponsorshipConfirmed'],
    );
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

  itWeb3('Remove sponsor event', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);

    await helpers.methods.setSponsor(flipper.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(flipper.options.address).send({from: sponsor});
    
    const result = await helpers.methods.removeSponsor(flipper.options.address).send();
    const events = normalizeEvents(result.events);
    expect(events).to.be.deep.equal([
      {
        address: flipper.options.address,
        event: 'ContractSponsorRemoved',
        args: {
          contractAddress: flipper.options.address,
        },
      },
    ]);

    await expectSubstrateEventsAtBlock(
      api, 
      result.blockNumber,
      'evmContractHelpers',
      ['ContractSponsorRemoved'],
    );
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

describe('Sponsoring Fee Limit', () => {

  let testContract: CompiledContract;
  
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
  
  async function deployTestContract(web3: Web3, owner: string) {
    const compiled = compileTestContract();
    const testContract = new web3.eth.Contract(compiled.abi, undefined, {
      data: compiled.object,
      from: owner,
      ...GAS_ARGS,
    });
    return await testContract.deploy({data: compiled.object}).send({from: owner});
  }

  itWeb3('Default fee limit', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.getSponsoringFeeLimit(flipper.options.address).call()).to.be.equals('115792089237316195423570985008687907853269984665640564039457584007913129639935');
  });

  itWeb3('Set fee limit', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    await helpers.methods.setSponsoringFeeLimit(flipper.options.address, 100).send();
    expect(await helpers.methods.getSponsoringFeeLimit(flipper.options.address).call()).to.be.equals('100');
  });

  itWeb3('Negative test - set fee limit by non-owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const stranger = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    await expect(helpers.methods.setSponsoringFeeLimit(flipper.options.address, 100).send({from: stranger})).to.be.rejected;
  });

  itWeb3('Negative test - check that eth transactions exceeding fee limit are not executed', async ({api, web3, privateKeyWrapper}) => {
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const user = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const testContract = await deployTestContract(web3, owner);
    const helpers = contractHelpers(web3, owner);
    
    await helpers.methods.setSponsoringMode(testContract.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(testContract.options.address, 0).send({from: owner});
    
    await helpers.methods.setSponsor(testContract.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(testContract.options.address).send({from: sponsor});

    const gasPrice = BigInt(await web3.eth.getGasPrice());

    await helpers.methods.setSponsoringFeeLimit(testContract.options.address, 2_000_000n * gasPrice).send();

    const originalUserBalance = await web3.eth.getBalance(user);
    await testContract.methods.test(100).send({from: user, gas: 2_000_000});
    expect(await web3.eth.getBalance(user)).to.be.equal(originalUserBalance);

    await testContract.methods.test(100).send({from: user, gas: 2_100_000});
    expect(await web3.eth.getBalance(user)).to.not.be.equal(originalUserBalance);
  });

  itWeb3('Negative test - check that evm.call transactions exceeding fee limit are not executed', async ({api, web3, privateKeyWrapper}) => {
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const testContract = await deployTestContract(web3, owner);
    const helpers = contractHelpers(web3, owner);
    
    await helpers.methods.setSponsoringMode(testContract.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(testContract.options.address, 0).send({from: owner});
    
    await helpers.methods.setSponsor(testContract.options.address, sponsor).send();
    await helpers.methods.confirmSponsorship(testContract.options.address).send({from: sponsor});

    const gasPrice = BigInt(await web3.eth.getGasPrice());

    await helpers.methods.setSponsoringFeeLimit(testContract.options.address, 2_000_000n * gasPrice).send();

    const alice = privateKeyWrapper('//Alice');
    const originalAliceBalance = (await api.query.system.account(alice.address)).data.free.toBigInt();
    
    await submitTransactionAsync(
      alice,
      api.tx.evm.call(
        subToEth(alice.address),
        testContract.options.address,
        testContract.methods.test(100).encodeABI(),
        Uint8Array.from([]),
        2_000_000n,
        gasPrice,
        null,
        null,
        [],
      ),
    );
    expect((await api.query.system.account(alice.address)).data.free.toBigInt()).to.be.equal(originalAliceBalance);
    
    await submitTransactionAsync(
      alice,
      api.tx.evm.call(
        subToEth(alice.address),
        testContract.options.address,
        testContract.methods.test(100).encodeABI(),
        Uint8Array.from([]),
        2_100_000n,
        gasPrice,
        null,
        null,
        [],
      ),
    );
    expect((await api.query.system.account(alice.address)).data.free.toBigInt()).to.not.be.equal(originalAliceBalance);
  });
});
