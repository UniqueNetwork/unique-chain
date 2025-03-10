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
import {readFile} from 'fs/promises';
import type {IKeyringPair} from '@polkadot/types/types';
import {waitParams, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {makeNames} from '@unique/test-utils/util.js';

const {dirname} = makeNames(import.meta.url);

async function proxyWrap(helper: EthUniqueHelper, wrapped: any, donor: IKeyringPair) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await helper.eth.createAccountWithBalance(donor);

  const abiFileContent = await readFile(`${dirname}/UniqueFungibleProxy.abi`);
  const abi = JSON.parse(abiFileContent.toString());

  const bytecodeFileContent = await readFile(`${dirname}/UniqueFungibleProxy.bin`);
  const bytecode = bytecodeFileContent.toString();

  return await helper.ethContract.deployByAbi(owner, abi, bytecode, undefined, [await wrapped.getAddress()]);
}

describe('Fungible (Via EVM proxy): Information getting', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);
    await collection.mint(alice, 200n, {Substrate: alice.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const totalSupply = await contract.totalSupply.staticCall();

    expect(totalSupply).to.equal(200n);
  });

  itEth('balanceOf', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);

    await collection.mint(alice, 200n, {Ethereum: caller.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const balance = await contract.balanceOf.staticCall(caller.address);

    expect(balance).to.equal(200n);
  });
});

describe('Fungible (Via EVM proxy): Plain calls', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('Can perform approve()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    
    await collection.mint(alice, 200n, {Ethereum: await contract.getAddress()});

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const approveTx = await callerContract.approve.send(spender.address, 100n);
      const approveReceipt = await approveTx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(approveReceipt!);

      expect(events).to.be.deep.equal({
        Approval: {
          address,
          event: 'Approval',
          args: {
            owner: await contract.getAddress(),
            spender: spender.address,
            value: '100',
          },
        },
      });
    }

    {
      const allowance = await contract.allowance.staticCall(await contract.getAddress(), spender.address);
      expect(allowance).to.equal(100n);
    }
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    
    const caller = await helper.eth.createAccountWithBalance(donor);
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);

    await collection.mint(alice, 200n, {Ethereum: await contract.getAddress()});

    await (await evmCollection.approve.send(await contract.getAddress(), 50n)).wait(...waitParams);

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const transferTx = await callerContract.transferFrom.send(owner.address, receiver.address, 49n);
      const transferReceipt = await transferTx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(transferReceipt!);

      expect(events).to.be.deep.equal({
        Transfer: {
          address,
          event: 'Transfer',
          args: {
            from: owner.address,
            to: receiver.address,
            value: '49',
          },
        },
        Approval: {
          address,
          event: 'Approval',
          args: {
            owner: owner.address,
            spender: await contract.getAddress(),
            value: '51',
          },
        },
      });
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver.address);
      expect(balance).to.equal(49n);
    }

    {
      const balance = await contract.balanceOf.staticCall(owner.address);
      expect(balance).to.equal(151n);
    }
  });

  itEth('Can perform transfer()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = await helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    await collection.mint(alice, 200n, {Ethereum: await contract.getAddress()});

    {
      const callerContract = helper.eth.changeContractCaller(contract, caller);

      const transferTx = await callerContract.transfer.send(receiver.address, 50n);
      const transferReceipt = await transferTx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(transferReceipt!);

      expect(events).to.be.deep.equal({
        Transfer: {
          address,
          event: 'Transfer',
          args: {
            from: await contract.getAddress(),
            to: receiver.address,
            value: '50',
          },
        },
      });
    }

    {
      const balance = await contract.balanceOf.staticCall(await contract.getAddress());
      expect(balance).to.equal(150n);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(balance).to.equal(50n);
    }
  });
});
