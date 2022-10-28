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
import {IKeyringPair} from '@polkadot/types/types';
import {EthUniqueHelper, itEth, usingEthPlaygrounds} from '../util';

async function proxyWrap(helper: EthUniqueHelper, wrapped: any, donor: IKeyringPair) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await helper.eth.createAccountWithBalance(donor);
  const web3 = helper.getWeb3();
  const proxyContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/UniqueFungibleProxy.abi`)).toString()), undefined, {
    from: owner,
    gas: helper.eth.DEFAULT_GAS,
  });
  const proxy = await proxyContract.deploy({data: (await readFile(`${__dirname}/UniqueFungibleProxy.bin`)).toString(), arguments: [wrapped.options.address]}).send({from: owner});
  return proxy;
}

describe('Fungible (Via EVM proxy): Information getting', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);
    await collection.mint(alice, 200n, {Substrate: alice.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('200');
  });

  itEth('balanceOf', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);

    await collection.mint(alice, 200n, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('200');
  });
});

describe('Fungible (Via EVM proxy): Plain calls', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('Can perform approve()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    await collection.mint(alice, 200n, {Ethereum: contract.options.address});

    {
      const result = await contract.methods.approve(spender, 100).send({from: caller});
      const events = helper.eth.normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Approval',
          args: {
            owner: contract.options.address,
            spender,
            value: '100',
          },
        },
      ]);
    }

    {
      const allowance = await contract.methods.allowance(contract.options.address, spender).call();
      expect(+allowance).to.equal(100);
    }
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const owner = await helper.eth.createAccountWithBalance(donor);

    await collection.mint(alice, 200n, {Ethereum: owner});
    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);

    await evmCollection.methods.approve(contract.options.address, 100).send({from: owner});

    {
      const result = await contract.methods.transferFrom(owner, receiver, 49).send({from: caller});
      const events = helper.eth.normalizeEvents(result.events);
      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: owner,
            to: receiver,
            value: '49',
          },
        },
        {
          address,
          event: 'Approval',
          args: {
            owner,
            spender: contract.options.address,
            value: '51',
          },
        },
      ]);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(49);
    }

    {
      const balance = await contract.methods.balanceOf(owner).call();
      expect(+balance).to.equal(151);
    }
  });

  itEth('Can perform transfer()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}, 0);
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'ft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    await collection.mint(alice, 200n, {Ethereum: contract.options.address});

    {
      const result = await contract.methods.transfer(receiver, 50).send({from: caller});
      const events = helper.eth.normalizeEvents(result.events);
      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: contract.options.address,
            to: receiver,
            value: '50',
          },
        },
      ]);
    }

    {
      const balance = await contract.methods.balanceOf(contract.options.address).call();
      expect(+balance).to.equal(150);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(50);
    }
  });
});
