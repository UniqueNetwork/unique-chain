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

import {expect} from 'chai';
import {submitTransactionAsync} from '../substrate/substrate-api';
import {createEthAccountWithBalance, GAS_ARGS, itWeb3} from './util/helpers';

describe('EVM Migrations', () => {
  itWeb3('Deploy contract saved state', async ({web3, api, privateKeyWrapper}) => {
    /*
      contract StatefulContract {
        uint counter;
        mapping (uint => uint) kv;

        function inc() public {
          counter = counter + 1;
        }
        function counterValue() public view returns (uint) {
          return counter;
        }

        function set(uint key, uint value) public {
          kv[key] = value;
        }

        function get(uint key) public view returns (uint) {
          return kv[key];
        }
      }
    */
    const ADDRESS = '0x4956bf52ef9ed8789f21bc600e915e0d961079f6';
    const CODE = '0x608060405234801561001057600080fd5b506004361061004c5760003560e01c80631ab06ee514610051578063371303c01461006d5780637bfdec3b146100775780639507d39a14610095575b600080fd5b61006b60048036038101906100669190610160565b6100c5565b005b6100756100e1565b005b61007f6100f8565b60405161008c91906101af565b60405180910390f35b6100af60048036038101906100aa9190610133565b610101565b6040516100bc91906101af565b60405180910390f35b8060016000848152602001908152602001600020819055505050565b60016000546100f091906101ca565b600081905550565b60008054905090565b600060016000838152602001908152602001600020549050919050565b60008135905061012d8161025e565b92915050565b60006020828403121561014957610148610259565b5b60006101578482850161011e565b91505092915050565b6000806040838503121561017757610176610259565b5b60006101858582860161011e565b92505060206101968582860161011e565b9150509250929050565b6101a981610220565b82525050565b60006020820190506101c460008301846101a0565b92915050565b60006101d582610220565b91506101e083610220565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156102155761021461022a565b5b828201905092915050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600080fd5b61026781610220565b811461027257600080fd5b5056fea26469706673582212206a02d2fb5c244105ab884961479c1aee3b4c1011e4b5530ab483eb22344a865664736f6c63430008060033';
    const DATA = [
      // counter = 10
      ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x000000000000000000000000000000000000000000000000000000000000000a'],
      // kv = {1: 1, 2: 2, 3: 3, 4: 4},
      ['0xcc69885fda6bcc1a4ace058b4a62bf5e179ea78fd58a1ccd71c22cc9b688792f', '0x0000000000000000000000000000000000000000000000000000000000000001'],
      ['0xd9d16d34ffb15ba3a3d852f0d403e2ce1d691fb54de27ac87cd2f993f3ec330f', '0x0000000000000000000000000000000000000000000000000000000000000002'],
      ['0x7dfe757ecd65cbd7922a9c0161e935dd7fdbcc0e999689c7d31633896b1fc60b', '0x0000000000000000000000000000000000000000000000000000000000000003'],
      ['0xedc95719e9a3b28dd8e80877cb5880a9be7de1a13fc8b05e7999683b6b567643', '0x0000000000000000000000000000000000000000000000000000000000000004'],
    ];

    const alice = privateKeyWrapper!('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);

    await submitTransactionAsync(alice, api.tx.sudo.sudo(api.tx.evmMigration.begin(ADDRESS) as any));
    await submitTransactionAsync(alice, api.tx.sudo.sudo(api.tx.evmMigration.setData(ADDRESS, DATA as any) as any));
    await submitTransactionAsync(alice, api.tx.sudo.sudo(api.tx.evmMigration.finish(ADDRESS, CODE) as any));

    const contract = new web3.eth.Contract([
      {
        inputs: [],
        name: 'counterValue',
        outputs: [{
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{
          internalType: 'uint256',
          name: 'key',
          type: 'uint256',
        }],
        name: 'get',
        outputs: [{
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        }],
        stateMutability: 'view',
        type: 'function',
      },
    ], ADDRESS, {from: caller, ...GAS_ARGS});

    expect(await contract.methods.counterValue().call()).to.be.equal('10');
    for (let i = 1; i <= 4; i++) {
      expect(await contract.methods.get(i).call()).to.be.equal(i.toString());
    }
  });
});
