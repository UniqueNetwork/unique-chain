// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {IKeyringPair} from '@polkadot/types/types';

import {itEth, expect, usingEthPlaygrounds} from './util/playgrounds';

describe('EVM payable contracts', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  itEth('Evm contract can receive wei from eth account', async ({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const contract = await helper.eth.deployCollectorContract(deployer);

    const web3 = helper.getWeb3();

    await web3.eth.sendTransaction({from: deployer, to: contract.options.address, value: '10000', gas: helper.eth.DEFAULT_GAS});

    expect(await contract.methods.getCollected().call()).to.be.equal('10000');
  });

  itEth('Evm contract can receive wei from substrate account', async ({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const contract = await helper.eth.deployCollectorContract(deployer);
    const [alice] = await helper.arrange.createAccounts([10n], donor);

    const weiCount = '10000';

    // Transaction fee/value will be payed from subToEth(sender) evm balance,
    // which is backed by evmToAddress(subToEth(sender)) substrate balance
    await helper.eth.transferBalanceFromSubstrate(alice, helper.address.substrateToEth(alice.address), 5n);


    await helper.eth.sendEVM(alice, contract.options.address, contract.methods.giveMoney().encodeABI(), weiCount);

    expect(await contract.methods.getCollected().call()).to.be.equal(weiCount);
  });

  // We can't handle sending balance to backing storage of evm balance, because evmToAddress operation is irreversible
  itEth('Wei sent directly to backing storage of evm contract balance is unaccounted', async({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const contract = await helper.eth.deployCollectorContract(deployer);
    const [alice] = await helper.arrange.createAccounts([10n], donor);

    const weiCount = 10_000n;

    await helper.eth.transferBalanceFromSubstrate(alice, contract.options.address, weiCount, false);

    expect(await contract.methods.getUnaccounted().call()).to.be.equal(weiCount.toString());
  });

  itEth('Balance can be retrieved from evm contract', async({helper, privateKey}) => {
    const FEE_BALANCE = 10n * helper.balance.getOneTokenNominal();
    const CONTRACT_BALANCE = 1n * helper.balance.getOneTokenNominal();

    const deployer = await helper.eth.createAccountWithBalance(donor);
    const contract = await helper.eth.deployCollectorContract(deployer);
    const [alice] = await helper.arrange.createAccounts([20n], donor);

    const web3 = helper.getWeb3();

    await web3.eth.sendTransaction({from: deployer, to: contract.options.address, value: CONTRACT_BALANCE.toString(), gas: helper.eth.DEFAULT_GAS});

    const receiver = privateKey(`//Receiver${Date.now()}`);

    // First receive balance on eth balance of bob
    {
      const ethReceiver = helper.address.substrateToEth(receiver.address);
      expect(await web3.eth.getBalance(ethReceiver)).to.be.equal('0');
      await contract.methods.withdraw(ethReceiver).send({from: deployer});
      expect(await web3.eth.getBalance(ethReceiver)).to.be.equal(CONTRACT_BALANCE.toString());
    }

    // Some balance is required to pay fee for evm.withdraw call
    await helper.balance.transferToSubstrate(alice, receiver.address, FEE_BALANCE);
    // await transferBalanceExpectSuccess(api, alice, receiver.address, FEE_BALANCE.toString());

    // Withdraw balance from eth to substrate
    {
      const initialReceiverBalance = await helper.balance.getSubstrate(receiver.address);
      await helper.executeExtrinsic(receiver, 'api.tx.evm.withdraw', [helper.address.substrateToEth(receiver.address), CONTRACT_BALANCE.toString()], true);
      const finalReceiverBalance = await helper.balance.getSubstrate(receiver.address);

      expect(finalReceiverBalance > initialReceiverBalance).to.be.true;
    }
  });
});
