import { expect } from 'chai';
import waitNewBlocks from '../substrate/wait-new-blocks';
import { createEthAccountWithBalance, deployFlipper, itWeb3, contractHelpers } from './util/helpers';

describe('Helpers sanity check', () => {
  itWeb3('Contract owner is recorded', async ({ api, web3 }) => {
    const owner = await createEthAccountWithBalance(api, web3);

    const flipper = await deployFlipper(web3, owner);
    await waitNewBlocks(api, 1);

    expect(await contractHelpers(web3, owner).methods.contractOwner(flipper.options.address).call()).to.be.equal(owner);
  });

  itWeb3('Flipper is working', async ({ api, web3 }) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, owner);
    await waitNewBlocks(api, 1);

    expect(await flipper.methods.getValue().call()).to.be.false;
    await flipper.methods.flip().send({ from: owner });
    await waitNewBlocks(api, 1);
    expect(await flipper.methods.getValue().call()).to.be.true;
  });
});