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
import {itEth, expect, usingEthPlaygrounds} from './util';

const getContractSource = (collectionAddress: string, contractAddress: string): string => {
  return `
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.0;
  interface ITest {
    function ztestzzzzzzz() external returns (uint256 n);
  }
  contract Test {
    event Result(bool, uint256);
    function test1() public {
        try
            ITest(${collectionAddress}).ztestzzzzzzz()
        returns (uint256 n) {
            // enters
            emit Result(true, n); // => [true, BigNumber { value: "43648854190028290368124427828690944273759144372138548774646036134290060795932" }]
        } catch {
            emit Result(false, 0);
        }
    }
    function test2() public {
        try
            ITest(${contractAddress}).ztestzzzzzzz()
        returns (uint256 n) {
            emit Result(true, n);
        } catch {
            // enters
            emit Result(false, 0); // => [ false, BigNumber { value: "0" } ]
        }
    }
    function test3() public {
      ITest(${collectionAddress}).ztestzzzzzzz();
    }
  }
  `;
};


describe('Evm Coder tests', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });
  
  itEth('Call non-existing function', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.eth.createNonfungibleCollection(owner, 'EVMCODER', '', 'TEST');
    const contract = await helper.ethContract.deployByCode(owner, 'Test', getContractSource(collection.collectionAddress, '0x1bfed5D614b886b9Ab2eA4CBAc22A96B7EC29c9c'));
    const testContract = await helper.ethContract.deployByCode(owner, 'Test', getContractSource(collection.collectionAddress, contract.options.address));
    {
      const result = await testContract.methods.test1().send();
      expect(result.events.Result.returnValues).to.deep.equal({
        '0': false,
        '1': '0',
      });
    }
    {
      const result = await testContract.methods.test2().send();
      expect(result.events.Result.returnValues).to.deep.equal({
        '0': false,
        '1': '0',
      });
    }
    {
      await expect(testContract.methods.test3().call())
        .to.be.rejectedWith(/unrecognized selector: 0xd9f02b36$/g);
    }
  });
});
