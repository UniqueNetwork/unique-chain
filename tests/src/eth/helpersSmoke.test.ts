import { expect } from 'chai';
import waitNewBlocks from '../substrate/wait-new-blocks';
import { createEthAccountWithBalance, deployFlipper, itWeb3, usingWeb3Http, contractHelpers } from './util/helpers';

itWeb3('Contract owner is recorded', async ({ api, web3 }) => {
  await usingWeb3Http(async web3Http => {
    const owner = await createEthAccountWithBalance(api, web3Http);

    const flipper = await deployFlipper(web3Http, owner);
    await waitNewBlocks(api, 1);

    expect(await contractHelpers(web3, owner).methods.contractOwner(flipper.options.address).call()).to.be.equal(owner);
  });
});

itWeb3('Flipper is working', async({api}) => {
  await usingWeb3Http(async web3Http => {
    const owner = await createEthAccountWithBalance(api, web3Http);
    const flipper = await deployFlipper(web3Http, owner);
    await waitNewBlocks(api, 1);

    expect(await flipper.methods.getValue().call()).to.be.false;
    await flipper.methods.flip().send({from: owner});
    await waitNewBlocks(api, 1);
    expect(await flipper.methods.getValue().call()).to.be.true;
  });
});