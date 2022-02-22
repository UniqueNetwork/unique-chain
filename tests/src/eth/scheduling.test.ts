import {expect} from 'chai';
import {createEthAccountWithBalance, deployFlipper, GAS_ARGS, itWeb3, subToEth} from './util/helpers';
import {scheduleExpectSuccess, waitNewBlocks} from '../util/helpers';
import privateKey from '../substrate/privateKey';

describe('Scheduing EVM smart contracts', () => {
  itWeb3('Successfully schedules and periodically executes an EVM contract', async ({api, web3}) => {
    const deployer = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, deployer);
    const initialValue = await flipper.methods.getValue().call();
    const alice = privateKey('//Alice');

    {
      const tx = api.tx.evm.call(
        subToEth(alice.address),
        flipper.options.address,
        flipper.methods.flip().encodeABI(),
        '0',
        GAS_ARGS.gas,
        await web3.eth.getGasPrice(),
        null,
        null,
        [],
      );
      const waitForBlocks = 4;
      const periodBlocks = 2;

      await scheduleExpectSuccess(tx, alice, waitForBlocks, periodBlocks, 2);
      expect(await flipper.methods.getValue().call()).to.be.equal(initialValue);
      
      await waitNewBlocks(waitForBlocks - 1);
      expect(await flipper.methods.getValue().call()).to.be.not.equal(initialValue);
  
      await waitNewBlocks(periodBlocks);
      expect(await flipper.methods.getValue().call()).to.be.equal(initialValue);
    }
  });
});