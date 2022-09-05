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

import {approveExpectSuccess, createCollection, createCollectionExpectSuccess, createFungibleItemExpectSuccess, transferExpectSuccess, transferFromExpectSuccess, UNIQUE} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, evmCollection, GAS_ARGS, itWeb3, normalizeEvents, recordEthFee, recordEvents, subToEth, transferBalanceToEth} from './util/helpers';
import fungibleAbi from './fungibleAbi.json';
import {expect} from 'chai';
import {submitTransactionAsync} from '../substrate/substrate-api';

describe('Fungible: Information getting', () => {
  itWeb3('totalSupply', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Substrate: alice.address});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS});
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
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('200');
  });
});

describe('Fungible: Plain calls', () => {
  itWeb3('Can perform mint()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const collection = await createCollection(api, alice, {
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });

    const receiver = createEthAccount(web3);

    const collectionIdAddress = collectionIdToAddress(collection.collectionId);
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collection.collectionId, {Ethereum: owner});
    await submitTransactionAsync(alice, changeAdminTx);

    const collectionContract = evmCollection(web3, owner, collectionIdAddress, {type: 'Fungible', decimalPoints: 0});
    const result = await collectionContract.methods.mint(receiver, 100).send();
    const events = normalizeEvents(result.events);
    
    expect(events).to.be.deep.equal([
      {
        address: collectionIdAddress,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: receiver,
          value: '100',
        },
      },
    ]);
  });

  itWeb3('Can perform mintBulk()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const collection = await createCollection(api, alice, {
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver1 = createEthAccount(web3);
    const receiver2 = createEthAccount(web3);
    const receiver3 = createEthAccount(web3);

    const collectionIdAddress = collectionIdToAddress(collection.collectionId);
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collection.collectionId, {Ethereum: owner});
    await submitTransactionAsync(alice, changeAdminTx);

    const collectionContract = evmCollection(web3, owner, collectionIdAddress, {type: 'Fungible', decimalPoints: 0});
    const result = await collectionContract.methods.mintBulk([
      [receiver1, 10],
      [receiver2, 20],
      [receiver3, 30],
    ]).send();
    const events = normalizeEvents(result.events);

    expect(events).to.be.deep.contain({
      address:collectionIdAddress,
      event: 'Transfer',
      args: {
        from: '0x0000000000000000000000000000000000000000',
        to: receiver1,
        value: '10',
      },
    });
    
    expect(events).to.be.deep.contain({
      address:collectionIdAddress,
      event: 'Transfer',
      args: {
        from: '0x0000000000000000000000000000000000000000',
        to: receiver2,
        value: '20',
      },
    });
    
    expect(events).to.be.deep.contain({
      address:collectionIdAddress,
      event: 'Transfer',
      args: {
        from: '0x0000000000000000000000000000000000000000',
        to: receiver3,
        value: '30',
      },
    });
  });

  itWeb3('Can perform burn()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const collection = await createCollection(api, alice, {
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collection.collectionId, {Ethereum: owner});
    await submitTransactionAsync(alice, changeAdminTx);
    const receiver = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const collectionIdAddress = collectionIdToAddress(collection.collectionId);
    const collectionContract = evmCollection(web3, owner, collectionIdAddress, {type: 'Fungible', decimalPoints: 0});
    await collectionContract.methods.mint(receiver, 100).send();

    const result = await collectionContract.methods.burnFrom(receiver, 49).send({from: receiver});
    
    const events = normalizeEvents(result.events);

    expect(events).to.be.deep.equal([
      {
        address: collectionIdAddress,
        event: 'Transfer',
        args: {
          from: receiver,
          to: '0x0000000000000000000000000000000000000000',
          value: '49',
        },
      },
    ]);

    const balance = await collectionContract.methods.balanceOf(receiver).call();
    expect(balance).to.equal('51');
  });

  itWeb3('Can perform approve()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

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

  itWeb3('Can perform transferFrom()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

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

  itWeb3('Can perform transfer()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

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
  itWeb3('approve() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const spender = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.approve(spender, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transferFrom() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const spender = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, 100).send({from: owner});

    const cost = await recordEthFee(api, spender, () => contract.methods.transferFrom(owner, spender, 100).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transfer() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.transfer(receiver, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });
});

describe('Fungible: Substrate calls', () => {
  itWeb3('Events emitted for approve()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

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

  itWeb3('Events emitted for transferFrom()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');
    const bob = privateKeyWrapper('//Bob');

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

  itWeb3('Events emitted for transfer()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper('//Alice');

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
