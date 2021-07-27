import { expect } from 'chai';
import privateKey from '../substrate/privateKey';
import waitNewBlocks from '../substrate/wait-new-blocks';
import { contractHelpers, createEthAccount, createEthAccountWithBalance, deployCollector, deployFlipper, itWeb3, transferBalanceToEth, usingWeb3Http } from './util/helpers';

describe('EVM sponsoring', () => {
  itWeb3('Fee is deducted from contract if sponsoring is enabled', async ({api, web3}) => {
    await usingWeb3Http(async web3Http => {
      const alice = privateKey('//Alice');

      const owner = await createEthAccountWithBalance(api, web3Http);
      const caller = createEthAccount(web3Http);
      const originalCallerBalance = await web3.eth.getBalance(caller);
      expect(originalCallerBalance).to.be.equal('0');

      const flipper = await deployFlipper(web3Http, owner);
      await waitNewBlocks(api, 1);
      
      const helpers = contractHelpers(web3Http, owner);
      expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.false;
      await helpers.methods.toggleSponsoring(flipper.options.address, true).send({from: owner});
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(flipper.options.address).call()).to.be.true;

      await transferBalanceToEth(api, alice, flipper.options.address);
      await waitNewBlocks(api, 2);

      const originalFlipperBalance = await web3.eth.getBalance(flipper.options.address);
      expect(originalFlipperBalance).to.be.not.equal('0');

      await flipper.methods.flip().send({ from: caller });
      await waitNewBlocks(api, 1);
      expect(await flipper.methods.getValue().call()).to.be.true;

      // Balance should be taken from flipper instead of caller
      expect(await web3.eth.getBalance(caller)).to.be.equals(originalCallerBalance);
      expect(await web3.eth.getBalance(flipper.options.address)).to.be.not.equals(originalFlipperBalance);
    });
  });
  itWeb3('...but this doesn\'t applies to payable value', async ({api, web3}) => {
    await usingWeb3Http(async web3Http => {
      const alice = privateKey('//Alice');

      const owner = await createEthAccountWithBalance(api, web3Http);
      const caller = await createEthAccountWithBalance(api, web3Http);
      await waitNewBlocks(api, 1);
      const originalCallerBalance = await web3.eth.getBalance(caller);
      expect(originalCallerBalance).to.be.not.equal('0');

      const collector = await deployCollector(web3Http, owner);
      await waitNewBlocks(api, 1);
      
      const helpers = contractHelpers(web3Http, owner);
      expect(await helpers.methods.sponsoringEnabled(collector.options.address).call()).to.be.false;
      await helpers.methods.toggleSponsoring(collector.options.address, true).send({from: owner});
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(collector.options.address).call()).to.be.true;

      await transferBalanceToEth(api, alice, collector.options.address);
      await waitNewBlocks(api, 2);

      const originalCollectorBalance = await web3.eth.getBalance(collector.options.address);
      expect(originalCollectorBalance).to.be.not.equal('0');

      await collector.methods.giveMoney().send({ from: caller, value: '10000' });
      await waitNewBlocks(api, 1);

      // Balance will be taken from both caller (value) and from collector (fee)
      expect(await web3.eth.getBalance(caller)).to.be.equals((BigInt(originalCallerBalance) - 10000n).toString());
      expect(await web3.eth.getBalance(collector.options.address)).to.be.not.equals(originalCollectorBalance);
      expect(await collector.methods.getCollected().call()).to.be.equal('10000');
    });
  });
});