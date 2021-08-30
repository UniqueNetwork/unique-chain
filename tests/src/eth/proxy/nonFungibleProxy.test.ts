//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../../substrate/privateKey';
import { createCollectionExpectSuccess, createItemExpectSuccess } from '../../util/helpers';
import { collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents } from '../util/helpers';
import nonFungibleAbi from '../nonFungibleAbi.json';
import { expect } from 'chai';
import waitNewBlocks from '../../substrate/wait-new-blocks';
import { submitTransactionAsync } from '../../substrate/substrate-api';
import Web3 from 'web3';
import { readFile } from 'fs/promises';
import { ApiPromise } from '@polkadot/api';

async function proxyWrap(api: ApiPromise, web3: Web3, wrapped: any) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await createEthAccountWithBalance(api, web3);
  const Proxy = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/UniqueNFTProxy.abi`)).toString()), undefined, {
    from: owner,
    ...GAS_ARGS,
  });
  const proxy = await Proxy.deploy({ data: (await readFile(`${__dirname}/UniqueNFTProxy.bin`)).toString(), arguments: [wrapped.options.address] }).send({ from: owner });
  return proxy;
}

describe('NFT (Via EVM proxy): Information getting', () => {
  itWeb3('totalSupply', async ({ api, web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);

    await createItemExpectSuccess(alice, collection, 'NFT', { substrate: alice.address });

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const totalSupply = await contract.methods.totalSupply().call();

    // FIXME: always equals to 0, because this method is not implemented
    expect(totalSupply).to.equal('0');
  });

  itWeb3('balanceOf', async ({ api, web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });
    await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });
    await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('3');
  });

  itWeb3('ownerOf', async ({ api, web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe('NFT (Via EVM proxy): Plain calls', () => {
  itWeb3('Can perform mint()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, { from: caller, ...GAS_ARGS }));

    const changeAdminTx = api.tx.nft.addCollectionAdmin(collection, { ethereum: contract.options.address });
    await submitTransactionAsync(alice, changeAdminTx);

    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      console.log('Before mint');
      const result = await contract.methods.mintWithTokenURI(
        receiver,
        nextTokenId,
        'Test URI',
      ).send({ from: caller });
      console.log('After mint');
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

      await waitNewBlocks(api, 1);
      expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
    }
  });

  itWeb3('Can perform burn()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    
    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: contract.options.address });

    const changeAdminTx = api.tx.nft.addCollectionAdmin(collection, { ethereum: contract.options.address });
    await submitTransactionAsync(alice, changeAdminTx);

    {
      const result = await contract.methods.burn(tokenId).send({ from: caller });
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

  itWeb3('Can perform approve()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address));
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: contract.options.address });

    {
      const result = await contract.methods.approve(spender, tokenId).send({ from: caller, gas: '0x1000000', gasPrice: '0x01' });
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

  itWeb3('Can perform transferFrom()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const owner = await createEthAccountWithBalance(api, web3);

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, address, { from: caller, ...GAS_ARGS });
    const contract = await proxyWrap(api, web3, evmCollection);
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: owner });

    await evmCollection.methods.approve(contract.options.address, tokenId).send({ from: owner });

    {
      const result = await contract.methods.transferFrom(owner, receiver, tokenId).send({ from: caller });
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

  itWeb3('Can perform transfer()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = await proxyWrap(api, web3, new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS}));
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: contract.options.address });

    {
      const result = await contract.methods.transfer(receiver, tokenId).send({ from: caller });
      await waitNewBlocks(api, 1);
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
