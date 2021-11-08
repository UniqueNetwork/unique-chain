import {expect} from 'chai';
import privateKey from '../substrate/privateKey';
import {submitTransactionAsync} from '../substrate/substrate-api';
import {createEthAccountWithBalance, deployCollector, GAS_ARGS, itWeb3, subToEth} from './util/helpers';
import {evmToAddress} from '@polkadot/util-crypto';
import {getGenericResult} from '../util/helpers';
import {getBalanceSingle, transferBalanceExpectSuccess} from '../substrate/get-balance';

describe('EVM payable contracts', () => {
  itWeb3('Evm contract can receive wei from eth account', async ({api, web3}) => {
    const deployer = await createEthAccountWithBalance(api, web3);
    const contract = await deployCollector(web3, deployer);

    await web3.eth.sendTransaction({from: deployer, to: contract.options.address, value: '10000', ...GAS_ARGS});

    expect(await contract.methods.getCollected().call()).to.be.equal('10000');
  });

  itWeb3('Evm contract can receive wei from substrate account', async ({api, web3}) => {
    const deployer = await createEthAccountWithBalance(api, web3);
    const contract = await deployCollector(web3, deployer);
    const alice = privateKey('//Alice');

    // Transaction fee/value will be payed from subToEth(sender) evm balance,
    // which is backed by evmToAddress(subToEth(sender)) substrate balance
    await transferBalanceExpectSuccess(api, alice, evmToAddress(subToEth(alice.address)), '1000000000000');

    {
      const tx = api.tx.evm.call(
        subToEth(alice.address),
        contract.options.address,
        contract.methods.giveMoney().encodeABI(),
        '10000',
        GAS_ARGS.gas,
        GAS_ARGS.gasPrice,
        null,
      );
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    }

    expect(await contract.methods.getCollected().call()).to.be.equal('10000');
  });

  // We can't handle sending balance to backing storage of evm balance, because evmToAddress operation is irreversible
  itWeb3('Wei sent directly to backing storage of evm contract balance is unaccounted', async({api, web3}) => {
    const deployer = await createEthAccountWithBalance(api, web3);
    const contract = await deployCollector(web3, deployer);
    const alice = privateKey('//Alice');

    await transferBalanceExpectSuccess(api, alice, evmToAddress(contract.options.address), '10000');

    expect(await contract.methods.getUnaccounted().call()).to.be.equal('10000');
  });

  itWeb3('Balance can be retrieved from evm contract', async({api, web3}) => {
    const FEE_BALANCE = 10n ** 18n;
    const CONTRACT_BALANCE = 10n ** 14n;

    const deployer = await createEthAccountWithBalance(api, web3);
    const contract = await deployCollector(web3, deployer);
    const alice = privateKey('//Alice');

    await web3.eth.sendTransaction({from: deployer, to: contract.options.address, value: CONTRACT_BALANCE.toString(), ...GAS_ARGS});

    const receiver = privateKey(`//Receiver${Date.now()}`);

    // First receive balance on eth balance of bob
    {
      const ethReceiver = subToEth(receiver.address);
      expect(await web3.eth.getBalance(ethReceiver)).to.be.equal('0');
      await contract.methods.withdraw(ethReceiver).send({from: deployer});
      expect(await web3.eth.getBalance(ethReceiver)).to.be.equal(CONTRACT_BALANCE.toString());
    }

    // Some balance is required to pay fee for evm.withdraw call
    await transferBalanceExpectSuccess(api, alice, receiver.address, FEE_BALANCE.toString());

    // Withdraw balance from eth to substrate
    {
      const initialReceiverBalance = await getBalanceSingle(api, receiver.address);
      const tx = api.tx.evm.withdraw(
        subToEth(receiver.address),
        CONTRACT_BALANCE.toString(),
      );
      const events = await submitTransactionAsync(receiver, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
      const finalReceiverBalance = await getBalanceSingle(api, receiver.address);

      expect(finalReceiverBalance > initialReceiverBalance).to.be.true;
    }
  });
});
