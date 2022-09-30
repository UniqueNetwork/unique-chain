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
import {GAS_ARGS} from './util/helpers';

import {itEth, expect, usingEthPlaygrounds, EthUniqueHelper} from './util/playgrounds';

describe('EVM payable contracts', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  itEth('Update proxy contract', async({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const proxyContract = await deployProxyContract(helper, deployer);
    const realContractV1 = await deployRealContractV1(helper, deployer);
    const realContractV1proxy = new helper.web3!.eth.Contract(realContractV1.options.jsonInterface, proxyContract.options.address, {from: caller, ...GAS_ARGS});
    await proxyContract.methods.updateVersion(realContractV1.options.address).send();
    
    await realContractV1proxy.methods.flip().send();
    await realContractV1proxy.methods.flip().send();
    await realContractV1proxy.methods.flip().send();
    const value1 = await realContractV1proxy.methods.getValue().call();
    const flipCount1 = await realContractV1proxy.methods.getFlipCount().call();
    expect(flipCount1).to.be.equal('3');
    expect(value1).to.be.equal(true);
    const realContractV2 = await deployRealContractV2(helper, deployer);
    const realContractV2proxy = new helper.web3!.eth.Contract(realContractV2.options.jsonInterface, proxyContract.options.address, {from: caller, ...GAS_ARGS});
    await proxyContract.methods.updateVersion(realContractV2.options.address).send();
    await realContractV2proxy.methods.flip().send();
    await realContractV2proxy.methods.flip().send();
    const value2 = await realContractV2proxy.methods.getValue().call();
    const flipCount2 = await realContractV2proxy.methods.getFlipCount().call();
    expect(value2).to.be.equal(true);
    expect(flipCount2).to.be.equal('1');
  });

  async function deployProxyContract(helper: EthUniqueHelper, deployer: string) {
    return await helper.ethContract.deployByCode(deployer, 'ProxyContract', `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.6;
      
      contract ProxyContract {
        event NewEvent(uint data);
        receive() external payable {}
        bytes32 private constant implementationSlot =  bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1);
        constructor() {}
        function updateVersion(address newContractAddress) external {
          bytes32 slot = implementationSlot;
          assembly {
            sstore(slot, newContractAddress)
          }
        }
        fallback() external {
          bytes32 slot = implementationSlot;
          assembly {
            let ptr := mload(0x40)
            let contractAddress := sload(slot)
            
            calldatacopy(ptr, 0, calldatasize())
            
            let result := delegatecall(gas(), contractAddress, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            
            returndatacopy(ptr, 0, size)
            
            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
          }
        }
      }
      
      interface RealContract {
        function flip() external;
        function getValue() external view returns (bool);
        function getFlipCount() external view returns (uint);
      }`);
  }

  async function deployRealContractV1(helper: EthUniqueHelper, deployer: string) {
    return await helper.ethContract.deployByCode(deployer, 'RealContractV1', `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.6;
  
      contract RealContractV1 {
        bool value = false;
        uint flipCount = 0;
        function flip() external {
          value = !value;
          flipCount++;
        }
        function getValue() external view returns (bool) {
          return value;
        }
        function getFlipCount() external view returns (uint) {
          return flipCount;
        }
      }`);
  }

  async function deployRealContractV2(helper: EthUniqueHelper, deployer: string) {
    return await helper.ethContract.deployByCode(deployer, 'RealContractV2', `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.6;
  
      contract RealContractV2 {
        bool value = false;
        uint flipCount = 10;
        function flip() external {
          value = !value;
          flipCount--;
        }
        function getValue() external view returns (bool) {
          return value;
        }
        function getFlipCount() external view returns (uint) {
          return flipCount;
        }
      }`);
  }
});