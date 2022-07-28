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

import {approve, createCollection, createRefungibleToken, transfer, transferFrom, UNIQUE} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, evmCollection, evmCollectionHelpers, GAS_ARGS, getCollectionAddressFromResult, itWeb3, normalizeEvents, recordEthFee, recordEvents, subToEth, tokenIdToAddress, transferBalanceToEth} from './util/helpers';
import reFungibleTokenAbi from './reFungibleTokenAbi.json';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Refungible token: Information getting', () => {
  itWeb3('totalSupply', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: caller})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: caller, ...GAS_ARGS});
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('200');
  });

  itWeb3('balanceOf', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: caller})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: caller, ...GAS_ARGS});
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('200');
  });

  itWeb3('decimals', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: caller})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: caller, ...GAS_ARGS});
    const decimals = await contract.methods.decimals().call();

    expect(decimals).to.equal('0');
  });
});

// FIXME: Need erc721 for ReFubgible.
describe.skip('Check ERC721 token URI for ReFungible', () => {
  itWeb3('Empty tokenURI', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, owner);
    let result = await helper.methods.createERC721MetadataCompatibleCollection('Mint collection', '1', '1', '').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = evmCollection(web3, owner, collectionIdAddress, {type: 'ReFungible'});
    
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
    const contract = evmCollection(web3, owner, collectionIdAddress, {type: 'ReFungible'});
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();
    
    // Set URL
    await contract.methods.setProperty(nextTokenId, 'url', Buffer.from('Token URI')).send();
      
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
    const contract = evmCollection(web3, owner, collectionIdAddress, {type: 'ReFungible'});
    
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
    const contract = evmCollection(web3, owner, collectionIdAddress, {type: 'ReFungible'});
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();
          
    // Set suffix
    const suffix = '/some/suffix';
    await contract.methods.setProperty(nextTokenId, 'suffix', Buffer.from(suffix)).send();

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

describe('Refungible: Plain calls', () => {
  itWeb3('Can perform approve()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: owner})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);

    const spender = createEthAccount(web3);

    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

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
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: owner})).itemId;

    const spender = createEthAccount(web3);
    await transferBalanceToEth(api, alice, spender);

    const receiver = createEthAccount(web3);

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

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
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: owner})).itemId;

    const receiver = createEthAccount(web3);
    await transferBalanceToEth(api, alice, receiver);

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

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

  itWeb3('Can perform repartition()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const receiver = createEthAccount(web3);
    await transferBalanceToEth(api, alice, receiver);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n, {Ethereum: owner})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.repartition(200).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(200);
    await contract.methods.transfer(receiver, 110).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(90);
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(110);
    
    await expect(contract.methods.repartition(80).send({from: owner})).to.eventually.be.rejected;

    await contract.methods.transfer(receiver, 90).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(0);
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(200);

    await contract.methods.repartition(150).send({from: receiver});
    await expect(contract.methods.transfer(owner, 160).send({from: receiver})).to.eventually.be.rejected;
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(150);
  });

  itWeb3('Can repartition with increased amount', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n, {Ethereum: owner})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

    const result = await contract.methods.repartition(200).send();
    const events = normalizeEvents(result.events);

    expect(events).to.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: owner,
          value: '100',
        },
      },
    ]);
  });

  itWeb3('Can repartition with decreased amount', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {name: 'token name', mode: {type: 'ReFungible'}})).collectionId;

    const owner = createEthAccount(web3);
    await transferBalanceToEth(api, alice, owner);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n, {Ethereum: owner})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

    const result = await contract.methods.repartition(50).send();
    const events = normalizeEvents(result.events);
    expect(events).to.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: owner,
          to: '0x0000000000000000000000000000000000000000',
          value: '50',
        },
      },
    ]);
  });
});

describe('Refungible: Fees', () => {
  itWeb3('approve() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const spender = createEthAccount(web3);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: owner})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.approve(spender, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transferFrom() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const spender = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: owner})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

    await contract.methods.approve(spender, 100).send({from: owner});

    const cost = await recordEthFee(api, spender, () => contract.methods.transferFrom(owner, spender, 100).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });

  itWeb3('transfer() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;

    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n, {Ethereum: owner})).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address, {from: owner, ...GAS_ARGS});

    const cost = await recordEthFee(api, owner, () => contract.methods.transfer(receiver, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
  });
});

describe('Refungible: Substrate calls', () => {
  itWeb3('Events emitted for approve()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;

    const receiver = createEthAccount(web3);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n)).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address);

    const events = await recordEvents(contract, async () => {
      expect(await approve(api, collectionId, tokenId, alice, {Ethereum: receiver}, 100n)).to.be.true;
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

  itWeb3('Events emitted for transferFrom()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
    const bob = privateKeyWrapper('//Bob');

    const receiver = createEthAccount(web3);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n)).itemId;
    expect(await approve(api, collectionId, tokenId, alice, bob.address, 100n)).to.be.true;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address);

    const events = await recordEvents(contract, async () => {
      expect(await transferFrom(api, collectionId, tokenId, bob, alice, {Ethereum: receiver},  51n)).to.be.true;
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

  itWeb3('Events emitted for transfer()', async ({web3, api, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;

    const receiver = createEthAccount(web3);

    const tokenId = (await createRefungibleToken(api, alice, collectionId, 200n)).itemId;

    const address = tokenIdToAddress(collectionId, tokenId);
    const contract = new web3.eth.Contract(reFungibleTokenAbi as any, address);

    const events = await recordEvents(contract, async () => {
      expect(await transfer(api, collectionId, tokenId, alice, {Ethereum: receiver},  51n)).to.be.true;
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
