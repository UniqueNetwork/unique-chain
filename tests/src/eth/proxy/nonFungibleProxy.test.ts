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

import privateKey from '../../substrate/privateKey';
import {createCollectionExpectSuccess, createItemExpectSuccess} from '../../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents} from '../util/helpers';
import nonFungibleAbi from '../nonFungibleAbi.json';
import {expect} from 'chai';
import {submitTransactionAsync} from '../../substrate/substrate-api';
import Web3 from 'web3';
import {readFile} from 'fs/promises';
import {ApiPromise} from '@polkadot/api';

async function proxyWrap(api: ApiPromise, web3: Web3, wrapped: any) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await createEthAccountWithBalance(api, web3);
  const proxyContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/UniqueNFTProxy.abi`)).toString()), undefined, {
    from: owner,
    ...GAS_ARGS,
  });
  const proxy = await proxyContract.deploy({data: (await readFile(`${__dirname}/UniqueNFTProxy.bin`)).toString(), arguments: [wrapped.options.address]}).send({from: owner});
  return proxy;
}

describe('NFT (Via EVM proxy): Information getting', () => {
  itWeb3('totalSupply', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);

    await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: alice.address});

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('1');
  });

  itWeb3('balanceOf', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('3');
  });

  itWeb3('ownerOf', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe('NFT (Via EVM proxy): Plain calls', () => {
  itWeb3('Can perform mint()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));

    const changeAdminTx = api.tx.unique.addCollectionAdmin(collection, {Ethereum: contract.options.address});
    await submitTransactionAsync(alice, changeAdminTx);

    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      const result = await contract.methods.mintWithTokenURI(
        receiver,
        nextTokenId,
        'Test URI',
      ).send({from: caller});
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver,
            tokenId: nextTokenId,
          },
        },
      ]);

      expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
    }
  });
  itWeb3('Can perform mintBulk()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collection, {Ethereum: contract.options.address});
    await submitTransactionAsync(alice, changeAdminTx);

    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      const result = await contract.methods.mintBulkWithTokenURI(
        receiver,
        [
          [nextTokenId, 'Test URI 0'],
          [+nextTokenId + 1, 'Test URI 1'],
          [+nextTokenId + 2, 'Test URI 2'],
        ],
      ).send({from: caller});
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver,
            tokenId: nextTokenId,
          },
        },
        {
          address,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver,
            tokenId: String(+nextTokenId + 1),
          },
        },
        {
          address,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver,
            tokenId: String(+nextTokenId + 2),
          },
        },
      ]);

      expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI 0');
      expect(await contract.methods.tokenURI(+nextTokenId + 1).call()).to.be.equal('Test URI 1');
      expect(await contract.methods.tokenURI(+nextTokenId + 2).call()).to.be.equal('Test URI 2');
    }
  });

  itWeb3('Can perform burn()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: contract.options.address});

    const changeAdminTx = api.tx.unique.addCollectionAdmin(collection, {Ethereum: contract.options.address});
    await submitTransactionAsync(alice, changeAdminTx);

    {
      const result = await contract.methods.burn(tokenId).send({from: caller});
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: contract.options.address,
            to: '0x0000000000000000000000000000000000000000',
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }
  });

  itWeb3('Can perform approve()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address));
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: contract.options.address});

    {
      const result = await contract.methods.approve(spender, tokenId).send({from: caller, ...GAS_ARGS});
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Approval',
          args: {
            owner: contract.options.address,
            approved: spender,
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }
  });

  itWeb3('Can perform transferFrom()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const owner = await createEthAccountWithBalance(api, web3);

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const contract = await proxyWrap(api, web3, evmCollection);
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    await evmCollection.methods.approve(contract.options.address, tokenId).send({from: owner});

    {
      const result = await contract.methods.transferFrom(owner, receiver, tokenId).send({from: caller});
      const events = normalizeEvents(result.events);
      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: owner,
            to: receiver,
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }

    {
      const balance = await contract.methods.balanceOf(contract.options.address).call();
      expect(+balance).to.equal(0);
    }
  });

  itWeb3('Can perform transfer()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: contract.options.address});

    {
      const result = await contract.methods.transfer(receiver, tokenId).send({from: caller});
      const events = normalizeEvents(result.events);
      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: contract.options.address,
            to: receiver,
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }

    {
      const balance = await contract.methods.balanceOf(contract.options.address).call();
      expect(+balance).to.equal(0);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }
  });
});
