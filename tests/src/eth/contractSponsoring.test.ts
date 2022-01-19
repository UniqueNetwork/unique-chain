//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../substrate/privateKey';
import {expect} from 'chai';
import {
  contractHelpers,
  createEthAccountWithBalance,
  transferBalanceToEth,
  deployFlipper,
  itWeb3,
  SponsoringMode,
  createEthAccount,
} from './util/helpers';

describe('Sponsoring EVM contracts', () => {
  itWeb3('Sponsoring can be set by the address that has deployed the contract', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;
  });

  itWeb3('Sponsoring cannot be set by the address that did not deployed the contract', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const notOwner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await expect(helpers.methods.setSponsoringMode(notOwner, SponsoringMode.Allowlisted).send({from: notOwner})).to.rejected;
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
  });

  itWeb3('In generous mode, non-allowlisted user transaction will be sponsored', async ({ api, web3 }) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccountWithBalance(api, web3);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Balance should be taken from flipper instead of caller
    const balanceAfter = await web3.eth.getBalance(flipper.options.address);
    expect(+balanceAfter).to.be.lessThan(+originalFlipperBalance);
  });

  itWeb3('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should decrease (allowlisted)', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccount(api);

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
    const balanceAfter = await web3.eth.getBalance(flipper.options.address);
    expect(+balanceAfter).to.be.lessThan(+originalFlipperBalance);
  });

  itWeb3('Sponsoring is set, an address that has no UNQ can send a transaction and it works. Sponsor balance should not decrease (non-allowlisted)', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccount(api);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);

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
    const balanceAfter = await web3.eth.getBalance(flipper.options.address);
    expect(+balanceAfter).to.be.equals(+originalFlipperBalance);
  });

  itWeb3('Sponsoring is set, an address that has UNQ can send a transaction and it works. User balance should not change', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccountWithBalance(api, web3);
    const originalCallerBalance = await web3.eth.getBalance(caller);

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

    expect(await web3.eth.getBalance(caller)).to.be.equals(originalCallerBalance);
  });

  itWeb3('Sponsoring is limited, with setContractRateLimit. The limitation is working if transactions are sent more often, the sender pays the commission.', async ({api, web3}) => {
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const caller = await createEthAccountWithBalance(api, web3);
    const originalCallerBalance = await web3.eth.getBalance(caller);

    const flipper = await deployFlipper(web3, owner);

    const helpers = contractHelpers(web3, owner);
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});

    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
    await helpers.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Allowlisted).send({from: owner});
    await helpers.methods.setSponsoringRateLimit(flipper.options.address, 10).send({from: owner});
    expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

    await transferBalanceToEth(api, alice, flipper.options.address);

    const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
    expect(originalFlipperBalance).to.be.not.equal('0');

    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;
    expect(await web3.eth.getBalance(caller)).to.be.equals(originalCallerBalance);

    await flipper.methods.flip().send({from: caller});
    expect(await web3.eth.getBalance(caller)).to.be.not.equals(originalCallerBalance);
  });

  // TODO: Find a way to calculate default rate limit
  itWeb3('Default rate limit equals 7200', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const helpers = contractHelpers(web3, owner);
    expect(await helpers.methods.getSponsoringRateLimit(flipper.options.address).call()).to.be.equals('7200');
  });
});
