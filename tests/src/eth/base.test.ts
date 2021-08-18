
import { createEthAccount, createEthAccountWithBalance, deployFlipper, ethBalanceViaSub, GAS_ARGS, itWeb3, recordEthFee } from './util/helpers';
import { expect } from 'chai';
import { UNIQUE } from '../util/helpers';

describe('Contract calls', () => {
  itWeb3('Call of simple contract fee is less than 0.2 UNQ', async ({ web3, api }) => {
    const deployer = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3 as any, deployer);

    const cost = await recordEthFee(api, deployer, () => flipper.methods.flip());
    expect(cost < BigInt(0.2 * Number(UNIQUE))).to.be.true;
  });

  itWeb3('Balance transfer fee is less than 0.2 UNQ', async ({ web3, api }) => {
    const userA = await createEthAccountWithBalance(api, web3);
    const userB = createEthAccount(web3);

    const cost = await recordEthFee(api, userA, () => web3.eth.sendTransaction({ from: userA, to: userB, value: '1000000', ...GAS_ARGS }));
    expect(cost - await ethBalanceViaSub(api, userB) < BigInt(0.2 * Number(UNIQUE))).to.be.true;
  });
});