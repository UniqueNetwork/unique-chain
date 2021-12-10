
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, deployFlipper, ethBalanceViaSub, GAS_ARGS, itWeb3, recordEthFee} from './util/helpers';
import {expect} from 'chai';
import {createCollectionExpectSuccess, createItemExpectSuccess, UNIQUE} from '../util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import privateKey from '../substrate/privateKey';

describe('Contract calls', () => {
  itWeb3('Call of simple contract fee is less than 0.2 UNQ', async ({web3, api}) => {
    const deployer = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, deployer);

    const cost = await recordEthFee(api, deployer, () => flipper.methods.flip().send({from: deployer}));
    expect(cost < BigInt(0.2 * Number(UNIQUE))).to.be.true;
  });

  itWeb3('Balance transfer fee is less than 0.2 UNQ', async ({web3, api}) => {
    const userA = await createEthAccountWithBalance(api, web3);
    const userB = createEthAccount(web3);

    const cost = await recordEthFee(api, userA, () => web3.eth.sendTransaction({from: userA, to: userB, value: '1000000', ...GAS_ARGS}));
    expect(cost - await ethBalanceViaSub(api, userB) < BigInt(0.2 * Number(UNIQUE))).to.be.true;
  });

  itWeb3('NFT transfer is close to 0.15 UNQ', async ({web3, api}) => {
    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const alice = privateKey('//Alice');
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const itemId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    const cost = await recordEthFee(api, caller, () => contract.methods.transfer(receiver, itemId).send(caller));

    const fee = Number(cost) / Number(UNIQUE);
    const expectedFee = 0.15;
    const tolerance = 0.00001;

    expect(Math.abs(fee - expectedFee)).to.be.lessThan(tolerance);
  });
});
