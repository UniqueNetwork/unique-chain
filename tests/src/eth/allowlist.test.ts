import { expect } from 'chai';
import waitNewBlocks from '../substrate/wait-new-blocks';
import { setContractSponsoringRateLimitExpectFailure } from '../util/helpers';
import { contractHelpers, createEthAccount, createEthAccountWithBalance, deployFlipper, itWeb3, usingWeb3Http } from './util/helpers';

describe('EVM allowlist', () => {
  itWeb3('Contract allowlist can be toggled', async ({ api }) => {
    await usingWeb3Http(async web3Http => {
      const owner = await createEthAccountWithBalance(api, web3Http);
      const flipper = await deployFlipper(web3Http, owner);
      await waitNewBlocks(api, 1);
      const randomUser = createEthAccount(web3Http);

      const helpers = contractHelpers(web3Http, owner);

      // Any user is allowed by default
      expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;
      expect(await helpers.methods.allowed(flipper.options.address, randomUser).call()).to.be.true;
      await waitNewBlocks(api, 1);

      // Enable
      await helpers.methods.toggleAllowlist(flipper.options.address, true).send({ from: owner });
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.true;
      expect(await helpers.methods.allowed(flipper.options.address, randomUser).call()).to.be.false;

      // Disable
      await helpers.methods.toggleAllowlist(flipper.options.address, false).send({ from: owner });
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.allowlistEnabled(flipper.options.address).call()).to.be.false;
      expect(await helpers.methods.allowed(flipper.options.address, randomUser).call()).to.be.true;
    });
  });

  itWeb3.only('Non-whitelisted user can\'t call contract with allowlist enabled', async ({ api }) => {
    await usingWeb3Http(async web3Http => {
      const owner = await createEthAccountWithBalance(api, web3Http);
      const flipper = await deployFlipper(web3Http, owner);
      await waitNewBlocks(api, 1);
      const caller = await createEthAccountWithBalance(api, web3Http);

      const helpers = contractHelpers(web3Http, owner);

      // User can flip with allowlist disabled
      await flipper.methods.flip().send({ from: caller });
      await waitNewBlocks(api, 1);
      expect(await flipper.methods.getValue().call()).to.be.true;

      // Tx will be reverted if user is not in whitelist
      await helpers.methods.toggleAllowlist(flipper.options.address, true).send({ from: owner });
      await expect(flipper.methods.flip().send({ from: caller })).to.rejected;
      await waitNewBlocks(api, 1);
      expect(await flipper.methods.getValue().call()).to.be.true;

      // Adding caller to allowlist will make contract callable again
      await helpers.methods.toggleAllowed(flipper.options.address, caller, true).send({from: owner});
      await flipper.methods.flip().send({ from: caller });
      await waitNewBlocks(api, 1);
      expect(await flipper.methods.getValue().call()).to.be.false;
    });
  });
});