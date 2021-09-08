//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../../substrate/privateKey';
import { createCollectionExpectSuccess, createFungibleItemExpectSuccess } from '../../util/helpers';
import { collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents } from '../util/helpers';
import fungibleAbi from '../fungibleAbi.json';
import { expect } from 'chai';
import { ApiPromise } from '@polkadot/api';
import Web3 from 'web3';
import { readFile } from 'fs/promises';

async function proxyWrap(api: ApiPromise, web3: Web3, wrapped: any) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await createEthAccountWithBalance(api, web3);
  const Proxy = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/UniqueFungibleProxy.abi`)).toString()), undefined, {
    from: owner,
    ...GAS_ARGS,
  });
  const proxy = await Proxy.deploy({ data: (await readFile(`${__dirname}/UniqueFungibleProxy.bin`)).toString(), arguments: [wrapped.options.address] }).send({ from: owner });
  return proxy;
}

describe('Fungible (Via EVM proxy): Information getting', () => {
  itWeb3('totalSupply', async ({ api, web3 }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
  
    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { substrate: alice.address });

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const totalSupply = await contract.methods.totalSupply().call();

    // FIXME: always equals to 0, because this method is not implemented
    expect(totalSupply).to.equal('0');
  });

  itWeb3('balanceOf', async ({ api, web3 }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: caller });

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('200');
  });
});

describe('Fungible (Via EVM proxy): Plain calls', () => {
  itWeb3('Can perform approve()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: contract.options.address });

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

  itWeb3('Can perform transferFrom()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const owner = await createEthAccountWithBalance(api, web3);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: owner });

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const evmCollection = new web3.eth.Contract(fungibleAbi as any, address, { from: caller, ...GAS_ARGS });
    const contract = await proxyWrap(api, web3, evmCollection);

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

  itWeb3('Can perform transfer()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: contract.options.address });

    {
      const result = await contract.methods.transfer(receiver, 50).send({ from: caller});
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
