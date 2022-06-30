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

import {createCollectionExpectSuccess, createFungibleItemExpectSuccess} from '../../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents} from '../util/helpers';
import fungibleAbi from '../fungibleAbi.json';
import {expect} from 'chai';
import {ApiPromise} from '@polkadot/api';
import Web3 from 'web3';
import {readFile} from 'fs/promises';
import {IKeyringPair} from '@polkadot/types/types';

async function proxyWrap(api: ApiPromise, web3: Web3, wrapped: any, privateKeyWrapper: (account: string) => IKeyringPair) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
  const proxyContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/UniqueFungibleProxy.abi`)).toString()), undefined, {
    from: owner,
    ...GAS_ARGS,
  });
  const proxy = await proxyContract.deploy({data: (await readFile(`${__dirname}/UniqueFungibleProxy.bin`)).toString(), arguments: [wrapped.options.address]}).send({from: owner});
  return proxy;
}

describe('Fungible (Via EVM proxy): Information getting', () => {
  itWeb3('totalSupply', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Substrate: alice.address});

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}), privateKeyWrapper);
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('200');
  });

  itWeb3('balanceOf', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}), privateKeyWrapper);
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('200');
  });
});

describe('Fungible (Via EVM proxy): Plain calls', () => {
  itWeb3('Can perform approve()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}), privateKeyWrapper);
    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: contract.options.address});

    {
      const result = await contract.methods.approve(spender, 100).send({from: caller});
      const events = normalizeEvents(result.events);

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

  itWeb3('Can perform transferFrom()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const evmCollection = new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const contract = await proxyWrap(api, web3, evmCollection, privateKeyWrapper);

    await evmCollection.methods.approve(contract.options.address, 100).send({from: owner});

    {
      const result = await contract.methods.transferFrom(owner, receiver, 49).send({from: caller});
      const events = normalizeEvents(result.events);
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

  itWeb3('Can perform transfer()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}), privateKeyWrapper);
    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: contract.options.address});

    {
      const result = await contract.methods.transfer(receiver, 50).send({from: caller});
      const events = normalizeEvents(result.events);
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
