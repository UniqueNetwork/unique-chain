//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../substrate/privateKey';
import { approveExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess, transferExpectSuccess, transferFromExpectSuccess } from '../util/helpers';
import { collectionIdToAddress, createEthAccount, itWeb3, normalizeEvents, recordEvents, subToEth, transferBalanceToEth } from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import { expect } from 'chai';

describe('Information getting', () => {
  itWeb3('totalSupply', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    await createItemExpectSuccess(alice, collection, 'NFT', { substrate: alice.address });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);
    const totalSupply = await contract.methods.totalSupply().call();

    // FIXME: always equals to 0, because this method is not implemented
    expect(totalSupply).to.equal('0');
  });

  itWeb3('balanceOf', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const caller = createEthAccount(web3);
    await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });
    await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });
    await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('3');
  });

  itWeb3('ownerOf', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const caller = createEthAccount(web3);
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: caller });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);
    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe.only('Plain calls', () => {
  itWeb3('Can perform approve()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner, 999999999999999);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: owner });

    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    {
      const result = await contract.methods.approve(spender, tokenId).send({ from: owner, gas: '0x1000000', gasPrice: '0x01' });
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Approval',
          args: {
            owner,
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

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner, 999999999999999);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: owner });

    const spender = createEthAccount(web3);
    await transferBalanceToEth(api, alice, spender, 999999999999999);

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    await contract.methods.approve(spender, tokenId).send({ from: owner, gas: '0x1000000', gasPrice: '0x01' });

    {
      const result = await contract.methods.transferFrom(owner, receiver, tokenId).send({ from: spender, gas: '0x1000000', gasPrice: '0x01' });
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
      const balance = await contract.methods.balanceOf(owner).call();
      expect(+balance).to.equal(0);
    }
  });

  itWeb3('Can perform transfer()', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner, 999999999999999);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: owner });

    const receiver = createEthAccount(web3);
    await transferBalanceToEth(api, alice, receiver, 999999999999999);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    {
      const result = await contract.methods.transfer(receiver, tokenId).send({ from: owner, gas: '0x1000000', gasPrice: '0x01' });
      console.log(result);
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
      const balance = await contract.methods.balanceOf(owner).call();
      expect(+balance).to.equal(0);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }
  });
});

describe('Substrate calls', () => {
  itWeb3('Events emitted for approve()', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT');

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await approveExpectSuccess(collection, tokenId, alice, { ethereum: receiver }, 1);
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Approval',
        args: {
          owner: subToEth(alice.address),
          approved: receiver,
          tokenId: tokenId.toString(),
        },
      },
    ]);
  });

  itWeb3('Events emitted for transferFrom()', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');

    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT');
    await approveExpectSuccess(collection, tokenId, alice, bob, 1);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferFromExpectSuccess(collection, tokenId, bob, alice, { ethereum: receiver }, 1, 'NFT');
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: subToEth(alice.address),
          to: receiver,
          tokenId: tokenId.toString(),
        },
      },
    ]);
  });

  itWeb3('Events emitted for transfer()', async ({ web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT');

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferExpectSuccess(collection, tokenId, alice, { ethereum: receiver }, 1, 'NFT');
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: subToEth(alice.address),
          to: receiver,
          tokenId: tokenId.toString(),
        },
      },
    ]);
  });
});