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
    const proxyContract = await deployProxyContract(helper, deployer);
    const realContractV1 = await deployRealContractV1(helper, deployer);
    await proxyContract.methods.updateVersion(realContractV1.options.address).send();
    await proxyContract.methods.flip().send();
    await proxyContract.methods.flip().send();
    await proxyContract.methods.flip().send();
    const value1 = await proxyContract.methods.getValue().call();
    const flipCount1 = await proxyContract.methods.getFlipCount().call();
    expect(value1).to.be.equal(true);
    expect(flipCount1).to.be.equal('3');
    const realContractV2 = await deployRealContractV2(helper, deployer);
    await proxyContract.methods.updateVersion(realContractV2.options.address).send();
    await proxyContract.methods.flip().send();
    await proxyContract.methods.flip().send();
    const value2 = await proxyContract.methods.getValue().call();
    const flipCount2 = await proxyContract.methods.getFlipCount().call();
    expect(value2).to.be.equal(true);
    expect(flipCount2).to.be.equal('1');
  });

  async function deployProxyContract(helper: EthUniqueHelper, deployer: string) {
    return await helper.ethContract.deployByCode(deployer, 'ProxyContract', `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.6;
      
      contract ProxyContract {
        address realContract;
        event NewEvent(uint data);
        receive() external payable {}
        constructor() {}
        function updateVersion(address newContractAddress) external {
          realContract = newContractAddress;
        }
        function flip() external {
          RealContract(realContract).flip();
        }
        function getValue() external view returns (bool) {
          return RealContract(realContract).getValue();
        }
        function getFlipCount() external view returns (uint) {
            return RealContract(realContract).getFlipCount();
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