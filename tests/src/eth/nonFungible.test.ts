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

import {approveExpectSuccess, burnItemExpectSuccess, createCollectionExpectSuccess, createItemExpectSuccess, transferExpectSuccess, transferFromExpectSuccess, UNIQUE} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, evmCollection, evmCollectionHelpers, GAS_ARGS, getCollectionAddressFromResult, itWeb3, normalizeEvents, recordEthFee, recordEvents, subToEth, transferBalanceToEth} from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import {expect} from 'chai';
import {submitTransactionAsync} from '../substrate/substrate-api';

describe('NFT: Information getting', () => {
  itWeb3('totalSupply', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: alice.address});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('1');
  });

  itWeb3('balanceOf', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum:caller});
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});
    await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('3');
  });

  itWeb3('ownerOf', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe.only('Check ERC721 token URI', () => {
  itWeb3('Empty tokenURI', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, owner);
    let result = await helper.methods.createERC721MetadataCompatibleCollection('Mint collection', '1', '1', '').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = evmCollection(web3, owner, collectionIdAddress);
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();

    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

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

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('');
  });

  itWeb3('TokenURI from url', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, owner);
    let result = await helper.methods.createERC721MetadataCompatibleCollection('Mint collection', '1', '1', 'BaseURI_').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = evmCollection(web3, owner, collectionIdAddress);
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();
    
    // Set URL
    await contract.methods.setProperty(nextTokenId, 'u', Buffer.from('Token URI')).send();
      
    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

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

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Token URI');
  });

  itWeb3('TokenURI from baseURI + tokenId', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, owner);
    let result = await helper.methods.createERC721MetadataCompatibleCollection('Mint collection', '1', '1', 'BaseURI_').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = evmCollection(web3, owner, collectionIdAddress);
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();
          
    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

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

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('BaseURI_' + nextTokenId);
  });

  itWeb3('TokenURI from baseURI + suffix', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, owner);
    let result = await helper.methods.createERC721MetadataCompatibleCollection('Mint collection', '1', '1', 'BaseURI_').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = evmCollection(web3, owner, collectionIdAddress);
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();
          
    // Set suffix
    const suffix = '/some/suffix';
    await contract.methods.setProperty(nextTokenId, 's', Buffer.from(suffix)).send();

    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

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

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('BaseURI_' + suffix);
  });
});

describe('NFT: Plain calls', () => {
  itWeb3.only('Can perform mint()', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, owner);
    let result = await helper.methods.createNonfungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = evmCollection(web3, owner, collectionIdAddress);
    const nextTokenId = await contract.methods.nextTokenId().call();

    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mintWithTokenURI(
      receiver,
      nextTokenId,
      'Test URI',
    ).send();

    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

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

    // TODO: this wont work right now, need release 919000 first
    // await helper.methods.setOffchainSchema(collectionIdAddress, 'https://offchain-service.local/token-info/{id}').send();
    // const tokenUri = await contract.methods.tokenURI(nextTokenId).call();
    // expect(tokenUri).to.be.equal(`https://offchain-service.local/token-info/${nextTokenId}`);
  });

  //TODO: CORE-302 add eth methods
  itWeb3.skip('Can perform mintBulk()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collection, {Ethereum: caller});
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

  itWeb3('Can perform burn()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

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

  itWeb3('Can perform approve()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

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

  itWeb3('Can perform transferFrom()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

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

  itWeb3('Can perform transfer()', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

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
});

describe('NFT: Fees', () => {
  itWeb3('approve() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const spender = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.approve(spender, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transferFrom() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const spender = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, tokenId).send({from: owner});

    const cost = await recordEthFee(api, spender, () => contract.methods.transferFrom(owner, spender, tokenId).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transfer() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);

    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: owner});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.transfer(receiver, tokenId).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });
});

describe('NFT: Substrate calls', () => {
  itWeb3('Events emitted for mint()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

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

  itWeb3('Events emitted for burn()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

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

  itWeb3('Events emitted for approve()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

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

  itWeb3('Events emitted for transferFrom()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');
    const bob = privateKeyWrapper('//Bob');

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

  itWeb3('Events emitted for transfer()', async ({web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper('//Alice');

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

describe('Common metadata', () => {
  itWeb3('Returns collection name', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'NFT'},
    });
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const name = await contract.methods.name().call();

    expect(name).to.equal('token name');
  });

  itWeb3('Returns symbol name', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      tokenPrefix: 'TOK',
      mode: {type: 'NFT'},
    });
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    const symbol = await contract.methods.symbol().call();

    expect(symbol).to.equal('TOK');
  });
});