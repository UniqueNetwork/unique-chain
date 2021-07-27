//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../substrate/privateKey';
import { approveExpectSuccess, createCollectionExpectSuccess, createFungibleItemExpectSuccess, transferExpectSuccess, transferFromExpectSuccess } from '../util/helpers';
import { collectionIdToAddress, createEthAccount, itWeb3, normalizeEvents, recordEvents, subToEth, transferBalanceToEth } from './util/helpers';
import fungibleAbi from './fungibleAbi.json';
import { expect } from 'chai';

describe('Information getting', () => {
  itWeb3('totalSupply', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { substrate: alice.address });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);
    const totalSupply = await contract.methods.totalSupply().call();

    // FIXME: always equals to 0, because this method is not implemented
    expect(totalSupply).to.equal('0');
  });

  itWeb3('balanceOf', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');

    const caller = createEthAccount(web3);
    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: caller });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('200');
  });
});

describe('Plain calls', () => {
  itWeb3('Can perform approve()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner, 999999999999999);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: owner });

    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    {
      const result = await contract.methods.approve(spender, 100).send({ from: owner, gas: '0x1000000', gasPrice: '0x01' });
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Approval',
          args: {
            owner,
            spender,
            value: '100',
          },
        },
      ]);
    }

    {
      const allowance = await contract.methods.allowance(owner, spender).call();
      expect(+allowance).to.equal(100);
    }
  });

  itWeb3('Can perform transferFrom()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner, 999999999999999);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: owner });

    const spender = createEthAccount(web3);
    await transferBalanceToEth(api, alice, spender, 999999999999999);

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    await contract.methods.approve(spender, 100).send({ from: owner, gas: '0x1000000', gasPrice: '0x01' });

    {
      const result = await contract.methods.transferFrom(owner, receiver, 49).send({ from: spender, gas: '0x1000000', gasPrice: '0x01' });
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
            spender,
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

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner, 999999999999999);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, { ethereum: owner });

    const receiver = createEthAccount(web3);
    await transferBalanceToEth(api, alice, receiver, 999999999999999);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    {
      const result = await contract.methods.transfer(receiver, 50).send({ from: owner, gas: '0x1000000', gasPrice: '0x01' });
      const events = normalizeEvents(result.events);
      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: owner,
            to: receiver,
            value: '50',
          },
        },
      ]);
    }

    {
      const balance = await contract.methods.balanceOf(owner).call();
      expect(+balance).to.equal(150);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(50);
    }
  });
});

describe('Substrate calls', () => {
  itWeb3('Events emitted for approve()', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await approveExpectSuccess(collection, 1, alice, { ethereum: receiver }, 100);
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Approval',
        args: {
          owner: subToEth(alice.address),
          spender: receiver,
          value: '100',
        },
      },
    ]);
  });

  itWeb3('Events emitted for transferFrom()', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');

    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n });
    await approveExpectSuccess(collection, 1, alice, bob, 100);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferFromExpectSuccess(collection, 1, bob, alice, { ethereum: receiver }, 51, 'Fungible');
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: subToEth(alice.address),
          to: receiver,
          value: '51',
        },
      },
      {
        address,
        event: 'Approval',
        args: {
          owner: subToEth(alice.address),
          spender: subToEth(bob.address),
          value: '49',
        },
      },
    ]);
  });

  itWeb3('Events emitted for transfer()', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'Fungible', decimalPoints: 0 },
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, { Value: 200n });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferExpectSuccess(collection, 1, alice, { ethereum: receiver }, 51, 'Fungible');
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: subToEth(alice.address),
          to: receiver,
          value: '51',
        },
      },
    ]);
  });
});