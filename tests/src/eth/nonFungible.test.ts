//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../substrate/privateKey';
import { approveExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess, transferExpectSuccess, transferFromExpectSuccess, UNIQUE } from '../util/helpers';
import { collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents, recordEthFee, recordEvents, subToEth, transferBalanceToEth } from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import { expect } from 'chai';
import waitNewBlocks from '../substrate/wait-new-blocks';

describe('NFT: Information getting', () => {
  itWeb3('totalSupply', async ({ api, web3 }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);

    await createItemExpectSuccess(alice, collection, 'NFT', { substrate: alice.address });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
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
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
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
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe('NFT: Plain calls', () => {
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
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, tokenId).send({ from: owner });

    {
      const result = await contract.methods.transferFrom(owner, receiver, tokenId).send({ from: spender });
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
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    {
      const result = await contract.methods.transfer(receiver, tokenId).send({ from: owner });
      await waitNewBlocks(api, 1);
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

describe('NFT: Fees', () => {
  itWeb3('approve() call fee is less than 0.2UNQ', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const spender = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: owner });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, { from: owner, ...GAS_ARGS });

    const cost = await recordEthFee(api, owner, () => contract.methods.approve(spender, tokenId).send({ from: owner }));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transferFrom() call fee is less than 0.2UNQ', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');
  
    const owner = await createEthAccountWithBalance(api, web3);
    const spender = await createEthAccountWithBalance(api, web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: owner });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, { from: owner, ...GAS_ARGS });

    await contract.methods.approve(spender, tokenId).send({ from: owner });

    const cost = await recordEthFee(api, spender, () => contract.methods.transferFrom(owner, spender, tokenId).send({ from: spender }));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transfer() call fee is less than 0.2UNQ', async ({ web3, api }) => {
    const collection = await createCollectionExpectSuccess({
      mode: { type: 'NFT' },
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', { ethereum: owner });

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, { from: owner, ...GAS_ARGS });

    const cost = await recordEthFee(api, owner, () => contract.methods.transfer(receiver, tokenId).send({ from: owner }));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });
});

describe('NFT: Substrate calls', () => {
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