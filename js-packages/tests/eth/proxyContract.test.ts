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

import {itEth, expect, usingEthPlaygrounds, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {HDNodeWallet} from 'ethers';
import {Contract} from 'ethers';

describe('EVM payable contracts', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Update proxy contract', async({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const proxyContract = await deployProxyContract(helper, deployer);

    const realContractV1 = await deployRealContractV1(helper, deployer);
    const realContractV1proxy = new Contract(await proxyContract.getAddress(), realContractV1.interface, caller);
    await (await proxyContract.updateVersion.send(await realContractV1.getAddress())).wait(...waitParams);

    await (await realContractV1proxy.flip.send()).wait(...waitParams);
    await (await realContractV1proxy.flip.send()).wait(...waitParams);
    await (await realContractV1proxy.flip.send()).wait(...waitParams);
    const value1 = await realContractV1proxy.getValue.staticCall();
    const flipCount1 = await realContractV1proxy.getFlipCount.staticCall();
    expect(flipCount1).to.be.equal(3n);
    expect(value1).to.be.equal(true);

    const realContractV2 = await deployRealContractV2(helper, deployer);
    const realContractV2proxy = new Contract(await proxyContract.getAddress(), realContractV2.interface, caller);
    await (await proxyContract.updateVersion.send(await realContractV2.getAddress())).wait(...waitParams);

    await (await realContractV2proxy.flip.send()).wait(...waitParams);
    await (await realContractV2proxy.flip.send()).wait(...waitParams);
    await (await realContractV2proxy.setStep.send(5)).wait(...waitParams);
    await (await realContractV2proxy.increaseFlipCount.send()).wait(...waitParams);
    const value2 = await realContractV2proxy.getValue.staticCall();
    const flipCount2 = await realContractV2proxy.getFlipCount.staticCall();
    expect(value2).to.be.equal(true);
    expect(flipCount2).to.be.equal(6n);
  });

  async function deployProxyContract(helper: EthUniqueHelper, deployer: HDNodeWallet) {
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

  async function deployRealContractV1(helper: EthUniqueHelper, deployer: HDNodeWallet) {
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

  async function deployRealContractV2(helper: EthUniqueHelper, deployer: HDNodeWallet) {
    return await helper.ethContract.deployByCode(deployer, 'RealContractV2', `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.6;
  
      contract RealContractV2 {
        bool value = false;
        uint flipCount = 10;
        uint step = 1;
        function flip() external {
          value = !value;
          flipCount--;
        }
        function setStep(uint value) external {
          step = value;
        }
        function increaseFlipCount() external {
          flipCount = flipCount + step;
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
