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

import privateKey from '../substrate/privateKey';
import {approveExpectSuccess, createCollectionExpectSuccess, createFungibleItemExpectSuccess, transferExpectSuccess, transferFromExpectSuccess, UNIQUE} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents, recordEthFee, recordEvents, subToEth, transferBalanceToEth} from './util/helpers';
import fungibleAbi from './fungibleAbi.json';
import {expect} from 'chai';

describe('Fungible: Information getting', () => {
  itWeb3('totalSupply', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Substrate: alice.address});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('200');
  });

  itWeb3('balanceOf', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('200');
  });
});

describe('Fungible: Plain calls', () => {
  itWeb3('Can perform approve()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    {
      const result = await contract.methods.approve(spender, 100).send({from: owner});
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

  itWeb3('Can perform transferFrom()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const spender = createEthAccount(web3);
    await transferBalanceToEth(api, alice, spender);

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, 100).send();

    {
      const result = await contract.methods.transferFrom(owner, receiver, 49).send({from: spender});
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

  itWeb3('Can perform transfer()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const receiver = createEthAccount(web3);
    await transferBalanceToEth(api, alice, receiver);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    {
      const result = await contract.methods.transfer(receiver, 50).send({from: owner});
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

describe('Fungible: Fees', () => {
  itWeb3('approve() call fee is less than 0.2UNQ', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const spender = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.approve(spender, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transferFrom() call fee is less than 0.2UNQ', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const spender = await createEthAccountWithBalance(api, web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, 100).send({from: owner});

    const cost = await recordEthFee(api, spender, () => contract.methods.transferFrom(owner, spender, 100).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transfer() call fee is less than 0.2UNQ', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.transfer(receiver, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });
});

describe('Fungible: Substrate calls', () => {
  itWeb3('Events emitted for approve()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await approveExpectSuccess(collection, 0, alice, {Ethereum: receiver}, 100);
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

  itWeb3('Events emitted for transferFrom()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');

    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n});
    await approveExpectSuccess(collection, 0, alice, bob.address, 100);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferFromExpectSuccess(collection, 0, bob, alice, {Ethereum: receiver}, 51, 'Fungible');
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

  itWeb3('Events emitted for transfer()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferExpectSuccess(collection, 0, alice, {Ethereum:receiver}, 51, 'Fungible');
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

describe('Fungible metadata', () => {
  itWeb3('Returns fungible decimals', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 6},
    });
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const decimals = await contract.methods.decimals().call();

    expect(+decimals).to.equal(6);
  });
});