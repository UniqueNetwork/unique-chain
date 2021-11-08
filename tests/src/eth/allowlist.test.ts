import {expect} from 'chai';
import {contractHelpers, createEthAccount, createEthAccountWithBalance, deployFlipper, itWeb3} from './util/helpers';

describe('EVM allowlist', () => {
  itWeb3('Contract allowlist can be toggled', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const randomUser = createEthAccount(web3);

    const helpers = contractHelpers(web3, owner);

    // Any user is allowed by default
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;
    expect(await helpers.methods.allowed(flipper.options.address, randomUser).call()).to.be.true;

    // Enable
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.true;
    expect(await helpers.methods.allowed(flipper.options.address, randomUser).call()).to.be.false;

    // Disable
    await helpers.methods.toggleAllowlist(flipper.options.address, false).send({from: owner});
    expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;
    expect(await helpers.methods.allowed(flipper.options.address, randomUser).call()).to.be.true;
  });

  itWeb3('Non-whitelisted user can\'t call contract with allowlist enabled', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    const caller = await createEthAccountWithBalance(api, web3);

    const helpers = contractHelpers(web3, owner);

    // User can flip with allowlist disabled
    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Tx will be reverted if user is not in whitelist
    await helpers.methods.toggleAllowlist(flipper.options.address, true).send({from: owner});
    await expect(flipper.methods.flip().send({from: caller})).to.rejected;
    expect(await flipper.methods.getValue().call()).to.be.true;

    // Adding caller to allowlist will make contract callable again
    await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});
    await flipper.methods.flip().send({from: caller});
    expect(await flipper.methods.getValue().call()).to.be.false;
  });
});
