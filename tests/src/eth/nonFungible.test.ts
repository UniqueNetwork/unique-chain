//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../substrate/privateKey';
import {approveExpectSuccess, burnItemExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess, setVariableMetaDataExpectSuccess, transferExpectSuccess, transferFromExpectSuccess, UNIQUE, setMetadataUpdatePermissionFlagExpectSuccess} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents, recordEthFee, recordEvents, subToEth, transferBalanceToEth} from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import {expect} from 'chai';
import {submitTransactionAsync} from '../substrate/substrate-api';

describe('NFT: Information getting', () => {
  itWeb3('totalSupply', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const caller = await createEthAccountWithBalance(api, web3);

    await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: alice.address});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('1');
  });

  itWeb3('balanceOf', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum:caller});
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
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
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe('NFT: Plain calls', () => {
  itWeb3('Can perform mint()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    const changeAdminTx = api.tx.nft.addCollectionAdmin(collection, {Ethereum: caller});
    await submitTransactionAsync(alice, changeAdminTx);
    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

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
    const changeAdminTx = api.tx.nft.addCollectionAdmin(collection, {Ethereum: caller});
    await submitTransactionAsync(alice, changeAdminTx);
    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

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

    const owner = await createEthAccountWithBalance(api, web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    {
      const result = await contract.methods.burn(tokenId).send({from: owner});
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address,
          event: 'Transfer',
          args: {
            from: owner,
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

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const spender = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    {
      const result = await contract.methods.approve(spender, tokenId).send({from: owner, ...GAS_ARGS});
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

  itWeb3('Can perform transferFrom()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const spender = createEthAccount(web3);
    await transferBalanceToEth(api, alice, spender);

    const receiver = createEthAccount(web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, tokenId).send({from: owner});

    {
      const result = await contract.methods.transferFrom(owner, receiver, tokenId).send({from: spender});
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

  itWeb3('Can perform transfer()', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const receiver = createEthAccount(web3);
    await transferBalanceToEth(api, alice, receiver);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    {
      const result = await contract.methods.transfer(receiver, tokenId).send({from: owner});
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

  itWeb3('Can perform getVariableMetadata', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);

    const item = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});
    await setMetadataUpdatePermissionFlagExpectSuccess(alice, collection, 'Admin');
    await setVariableMetaDataExpectSuccess(alice, collection, item, [1, 2, 3]);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    expect(await contract.methods.getVariableMetadata(item).call()).to.be.equal('0x010203');
  });

  itWeb3('Can perform setVariableMetadata', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);

    const item = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    expect(await contract.methods.setVariableMetadata(item, '0x010203').send({from: owner}));
    expect(await contract.methods.getVariableMetadata(item).call()).to.be.equal('0x010203');
  });
});

describe('NFT: Fees', () => {
  itWeb3('approve() call fee is less than 0.2UNQ', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const spender = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.approve(spender, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transferFrom() call fee is less than 0.2UNQ', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const spender = await createEthAccountWithBalance(api, web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, tokenId).send({from: owner});

    const cost = await recordEthFee(api, spender, () => contract.methods.transferFrom(owner, spender, tokenId).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transfer() call fee is less than 0.2UNQ', async ({web3, api}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const owner = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.transfer(receiver, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });
});

describe('NFT: Substrate calls', () => {
  itWeb3('Events emitted for mint()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    let tokenId: number;
    const events = await recordEvents(contract, async () => {
      tokenId = await createItemExpectSuccess(alice, collection, 'NFT');
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: subToEth(alice.address),
          tokenId: tokenId!.toString(),
        },
      },
    ]);
  });

  itWeb3('Events emitted for burn()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT');
    const events = await recordEvents(contract, async () => {
      await burnItemExpectSuccess(alice, collection, tokenId);
    });

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: subToEth(alice.address),
          to: '0x0000000000000000000000000000000000000000',
          tokenId: tokenId.toString(),
        },
      },
    ]);
  });

  itWeb3('Events emitted for approve()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT');

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await approveExpectSuccess(collection, tokenId, alice, {Ethereum: receiver}, 1);
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

  itWeb3('Events emitted for transferFrom()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');

    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT');
    await approveExpectSuccess(collection, tokenId, alice, bob.address, 1);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferFromExpectSuccess(collection, tokenId, bob, alice, {Ethereum: receiver}, 1, 'NFT');
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

  itWeb3('Events emitted for transfer()', async ({web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');

    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT');

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address);

    const events = await recordEvents(contract, async () => {
      await transferExpectSuccess(collection, tokenId, alice, {Ethereum: receiver}, 1, 'NFT');
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
