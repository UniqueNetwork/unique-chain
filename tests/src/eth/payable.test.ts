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

import type {IKeyringPair} from '@polkadot/types/types';

import {itEth, expect, usingEthPlaygrounds} from './util/index.js';
import {EthUniqueHelper} from './util/playgrounds/unique.dev.js';
import {makeNames} from '../util/index.js';

const {dirname} = makeNames(import.meta.url);

describe('EVM payable contracts', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
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
    const [alice] = await helper.arrange.createAccounts([40n], donor);

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

  itEth('Balance can be retrieved from evm contract', async({helper}) => {
    const FEE_BALANCE = 10n * helper.balance.getOneTokenNominal();
    const CONTRACT_BALANCE = 1n * helper.balance.getOneTokenNominal();

    const deployer = await helper.eth.createAccountWithBalance(donor);
    const contract = await helper.eth.deployCollectorContract(deployer);
    const [alice] = await helper.arrange.createAccounts([20n], donor);

    const web3 = helper.getWeb3();

    await web3.eth.sendTransaction({from: deployer, to: contract.options.address, value: CONTRACT_BALANCE.toString(), gas: helper.eth.DEFAULT_GAS});

    const [receiver] = await helper.arrange.createAccounts([0n], donor);

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

describe('EVM transaction fees', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Fee is withdrawn from the user', async({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const contract = await helper.eth.deployFlipper(deployer);

    const initialCallerBalance = await helper.balance.getEthereum(caller);
    await contract.methods.flip().send({from: caller});
    const finalCallerBalance = await helper.balance.getEthereum(caller);
    expect(finalCallerBalance < initialCallerBalance).to.be.true;
  });

  itEth('Fee for nested calls is withdrawn from the user', async({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const contract = await deployProxyContract(helper, deployer);

    const initialCallerBalance = await helper.balance.getEthereum(caller);
    const initialContractBalance = await helper.balance.getEthereum(contract.options.address);
    await contract.methods.flip().send({from: caller});
    const finalCallerBalance = await helper.balance.getEthereum(caller);
    const finalContractBalance = await helper.balance.getEthereum(contract.options.address);
    expect(finalCallerBalance < initialCallerBalance).to.be.true;
    expect(finalContractBalance == initialContractBalance).to.be.true;
  });

  itEth('Fee for nested calls to native methods is withdrawn from the user', async({helper}) => {
    const CONTRACT_BALANCE = 2n * helper.balance.getOneTokenNominal();

    const deployer = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const contract = await deployProxyContract(helper, deployer);

    const collectionAddress = (await contract.methods.createNFTCollection().send({from: caller, value: Number(CONTRACT_BALANCE)})).events.CollectionCreated.returnValues.collection;
    const initialCallerBalance = await helper.balance.getEthereum(caller);
    const initialContractBalance = await helper.balance.getEthereum(contract.options.address);
    await contract.methods.mintNftToken(collectionAddress).send({from: caller});
    const finalCallerBalance = await helper.balance.getEthereum(caller);
    const finalContractBalance = await helper.balance.getEthereum(contract.options.address);
    expect(finalCallerBalance < initialCallerBalance).to.be.true;
    expect(finalContractBalance == initialContractBalance).to.be.true;
  });

  itEth('Fee for nested calls to create*Collection methods is withdrawn from the user and from the contract', async({helper}) => {
    const CONTRACT_BALANCE = 2n * helper.balance.getOneTokenNominal();
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const contract = await deployProxyContract(helper, deployer);

    const initialCallerBalance = await helper.balance.getEthereum(caller);
    const initialContractBalance = await helper.balance.getEthereum(contract.options.address);
    await contract.methods.createNFTCollection().send({from: caller, value: Number(CONTRACT_BALANCE)});
    const finalCallerBalance = await helper.balance.getEthereum(caller);
    const finalContractBalance = await helper.balance.getEthereum(contract.options.address);
    expect(finalCallerBalance < initialCallerBalance).to.be.true;
    expect(finalContractBalance == initialContractBalance).to.be.true;
  });

  itEth('Negative test: call createNFTCollection with wrong fee', async({helper}) => {
    const SMALL_FEE = 1n * helper.balance.getOneTokenNominal();
    const BIG_FEE = 3n * helper.balance.getOneTokenNominal();
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collectionHelper = await helper.ethNativeContract.collectionHelpers(caller);

    await expect(collectionHelper.methods.createNFTCollection('A', 'B', 'C').call({value: Number(SMALL_FEE)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
    await expect(collectionHelper.methods.createNFTCollection('A', 'B', 'C').call({value: Number(BIG_FEE)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
  });

  itEth('Negative test: call createRFTCollection with wrong fee', async({helper}) => {
    const SMALL_FEE = 1n * helper.balance.getOneTokenNominal();
    const BIG_FEE = 3n * helper.balance.getOneTokenNominal();
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collectionHelper = await helper.ethNativeContract.collectionHelpers(caller);

    await expect(collectionHelper.methods.createRFTCollection('A', 'B', 'C').call({value: Number(SMALL_FEE)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
    await expect(collectionHelper.methods.createRFTCollection('A', 'B', 'C').call({value: Number(BIG_FEE)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
  });

  itEth('Get collection creation fee', async({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    expect(await helper.eth.getCollectionCreationFee(deployer)).to.be.equal(String(2n * helper.balance.getOneTokenNominal()));
  });

  async function deployProxyContract(helper: EthUniqueHelper, deployer: string) {
    return await helper.ethContract.deployByCode(
      deployer,
      'ProxyContract',
      `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.6;

      import {CollectionHelpers} from "../api/CollectionHelpers.sol";
      import {UniqueNFT} from "../api/UniqueNFT.sol";

      error Value(uint256 value);

      contract ProxyContract {
        bool value = false;
        address innerContract;

        event CollectionCreated(address collection);
        event TokenMinted(uint256 tokenId);

        receive() external payable {}

        constructor() {
          innerContract = address(new InnerContract());
        }

        function flip() public {
          value = !value;
          InnerContract(innerContract).flip();
        }

        function createNFTCollection() external payable {
          address collectionHelpers = 0x6C4E9fE1AE37a41E93CEE429e8E1881aBdcbb54F;
		      address nftCollection = CollectionHelpers(collectionHelpers).createNFTCollection{value: msg.value}("A", "B", "C");
          emit CollectionCreated(nftCollection);
        }

        function mintNftToken(address collectionAddress) external  {
          UniqueNFT collection = UniqueNFT(collectionAddress);
          uint256 tokenId = collection.mint(msg.sender);
          emit TokenMinted(tokenId);
        }

        function getValue() external view returns (bool) {
          return InnerContract(innerContract).getValue();
        }
      }

      contract InnerContract {
        bool value = false;
        function flip() external {
          value = !value;
        }
        function getValue() external view returns (bool) {
          return value;
        }
      }
      `,
      [
        {
          solPath: 'api/CollectionHelpers.sol',
          fsPath: `${dirname}/api/CollectionHelpers.sol`,
        },
        {
          solPath: 'api/UniqueNFT.sol',
          fsPath: `${dirname}/api/UniqueNFT.sol`,
        },
      ],
    );
  }
});
