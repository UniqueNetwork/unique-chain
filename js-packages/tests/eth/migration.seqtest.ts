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

import {expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {Struct} from '@polkadot/types';

import type {IEvent} from '@unique-nft/playgrounds/types.js';
import type {InterfaceTypes} from '@polkadot/types/types/registry';
import {ApiPromise} from '@polkadot/api';
import { Contract } from 'ethers';

const encodeEvent = (api: ApiPromise, pallet: string, palletEvents: string, event: string, fields: any) => {
  const palletIndex = api.runtimeMetadata.asV14.pallets.find(p => p.name.toString() == pallet)!.index.toNumber();
  const eventMeta = api.events[palletEvents][event].meta;
  const eventIndex = eventMeta.index.toNumber();
  const data = [
    palletIndex, eventIndex,
  ];
  const metaEvent = api.registry.findMetaEvent(new Uint8Array(data));
  data.push(...new Struct(api.registry, {data: metaEvent}, {data: fields}).toU8a());

  const typeName = api.registry.lookup.names.find(n => n.endsWith('RuntimeEvent'))!;
  const obj = api.registry.createType(typeName, new Uint8Array(data)) as InterfaceTypes['RuntimeEvent'];
  return obj.toHex();
};

describe('EVM Migrations', () => {
  let superuser: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      superuser = await privateKey('//Alice');
      charlie = await privateKey('//Charlie');
    });
  });

  // todo:playgrounds requires sudo, look into later
  itEth('Deploy contract saved state', async ({helper}) => {
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

    const caller = await helper.eth.createAccountWithBalance(superuser);

    const txBegin = helper.constructApiCall('api.tx.evmMigration.begin', [ADDRESS]);
    const txSetData = helper.constructApiCall('api.tx.evmMigration.setData', [ADDRESS, DATA]);
    const txFinish = helper.constructApiCall('api.tx.evmMigration.finish', [ADDRESS, CODE]);
    await expect(helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [txBegin])).to.be.fulfilled;
    await expect(helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [txSetData])).to.be.fulfilled;
    await expect(helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [txFinish])).to.be.fulfilled;

    const web3 = helper.getWeb3();
    const contract = new Contract(
      ADDRESS,
      [
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
      ],
      caller,
    );

    expect(await contract.counterValue.staticCall()).to.be.equal('10');
    for(let i = 1; i <= 4; i++) {
      expect(await contract.get.staticCall(i)).to.be.equal(i.toString());
    }
  });
  itEth('Fake collection creation on substrate side', async ({helper}) => {
    const txInsertEvents = helper.constructApiCall('api.tx.evmMigration.insertEvents', [[
      encodeEvent(helper.getApi(), 'Common', 'common', 'CollectionCreated', [
        // Collection Id
        9999,
        // Collection mode: NFT
        1,
        // Owner
        charlie.address,
      ]),
    ]]);
    await helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [txInsertEvents]);
    const event = helper.chainLog[helper.chainLog.length - 1].events as IEvent[];
    const eventStrings = event.map(e => `${e.section}.${e.method}`);

    expect(eventStrings).to.contain('common.CollectionCreated');
  });
  itEth('Fake token creation on substrate side', async ({helper}) => {
    const txInsertEvents = helper.constructApiCall('api.tx.evmMigration.insertEvents', [[
      encodeEvent(helper.getApi(), 'Common', 'common', 'ItemCreated', [
        // Collection Id
        9999,
        // TokenId
        9999,
        // Owner
        {Substrate: charlie.address},
        // Amount
        1,
      ]),
    ]]);
    await helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [txInsertEvents]);
    const event = helper.chainLog[helper.chainLog.length - 1].events as IEvent[];
    const eventStrings = event.map(e => `${e.section}.${e.method}`);

    expect(eventStrings).to.contain('common.ItemCreated');
  });
  itEth('Fake token creation on ethereum side', async ({helper}) => {
    throw new Error('unimplemented');
    
    // const collection = await helper.nft.mintCollection(superuser);
    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const caller = await helper.eth.createAccountWithBalance(superuser);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // {
    //   const txInsertEthLogs = helper.constructApiCall('api.tx.evmMigration.insertEthLogs', [[
    //     {
    //     // Contract, which has emitted this log
    //       address: collectionAddress,

    //       topics: [
    //         // First topic - event signature
    //         helper.getWeb3().eth.abi.encodeEventSignature('Transfer(address,address,uint256)'),
    //         // Rest of topics - indexed event fields in definition order
    //         helper.getWeb3().eth.abi.encodeParameter('address', '0x' + '00'.repeat(20)),
    //         helper.getWeb3().eth.abi.encodeParameter('address', caller),
    //         helper.getWeb3().eth.abi.encodeParameter('uint256', 9999),
    //       ],

    //       // Every field coming from event, which is not marked as indexed, should be encoded here
    //       // NFT transfer has no such fields, but here is an example for some other possible event:
    //       // data: helper.getWeb3().eth.abi.encodeParameters(['uint256', 'address'], [22, collectionAddress])
    //       data: [],
    //     },
    //   ]]);
    //   await helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [txInsertEthLogs]);
    // }

    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal('0x' + '00'.repeat(20));
    // expect(event.args.to).to.be.equal(caller);
    // expect(event.args.tokenId).to.be.equal('9999');
  });
});
