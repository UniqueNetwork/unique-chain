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

import {readFile} from 'fs/promises';
import {IKeyringPair} from '@polkadot/types/types';
import {EthUniqueHelper, itEth, usingEthPlaygrounds, expect} from '../util/playgrounds';


async function proxyWrap(helper: EthUniqueHelper, wrapped: any, donor: IKeyringPair) {
  // Proxy owner has no special privilegies, we don't need to reuse them
  const owner = await helper.eth.createAccountWithBalance(donor);
  const web3 = helper.getWeb3();
  const proxyContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/UniqueNFTProxy.abi`)).toString()), undefined, {
    from: owner,
    gas: helper.eth.DEFAULT_GAS,
  });
  const proxy = await proxyContract.deploy({data: (await readFile(`${__dirname}/UniqueNFTProxy.bin`)).toString(), arguments: [wrapped.options.address]}).send({from: owner});
  return proxy;
}

describe('NFT (Via EVM proxy): Information getting', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    await collection.mintToken(alice, {Substrate: alice.address});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const totalSupply = await contract.methods.totalSupply().call();

    expect(totalSupply).to.equal('1');
  });

  itEth('balanceOf', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const caller = await helper.eth.createAccountWithBalance(donor);
    await collection.mintMultipleTokens(alice, [
      {owner: {Ethereum: caller}},
      {owner: {Ethereum: caller}},
      {owner: {Ethereum: caller}},
    ]);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('3');
  });

  itEth('ownerOf', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const caller = await helper.eth.createAccountWithBalance(donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });
});

describe('NFT (Via EVM proxy): Plain calls', () => {
  let alice: IKeyringPair;
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itEth('Can perform mint()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'A', 'A', 'A');
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collectionEvmOwned = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
    const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', caller);
    const contract = await proxyWrap(helper, collectionEvm, donor);
    await collectionEvmOwned.methods.addCollectionAdmin(contract.options.address).send();

    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      const result = await contract.methods.mintWithTokenURI(
        receiver,
        nextTokenId,
        'Test URI',
      ).send({from: caller});
      const events = helper.eth.normalizeEvents(result.events);
      events[0].address = events[0].address.toLocaleLowerCase();

      expect(events).to.be.deep.equal([
        {
          address: collectionAddress.toLocaleLowerCase(),
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

  //TODO: CORE-302 add eth methods
  itEth.skip('Can perform mintBulk()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(donor, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});

    const caller = await helper.eth.createAccountWithBalance(donor, 30n);
    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    await collection.addAdmin(donor, {Ethereum: contract.options.address});

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
      const events = helper.eth.normalizeEvents(result.events);

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

  itEth('Can perform burn()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: contract.options.address});
    await collection.addAdmin(alice, {Ethereum: contract.options.address});

    {
      const result = await contract.methods.burn(tokenId).send({from: caller});
      const events = helper.eth.normalizeEvents(result.events);

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

  itEth('Can perform approve()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: contract.options.address});

    {
      const result = await contract.methods.approve(spender, tokenId).send({from: caller, gas: helper.eth.DEFAULT_GAS});
      const events = helper.eth.normalizeEvents(result.events);

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

  itEth('Can perform transferFrom()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    const owner = await helper.eth.createAccountWithBalance(donor);

    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: owner});

    await evmCollection.methods.approve(contract.options.address, tokenId).send({from: owner});

    {
      const result = await contract.methods.transferFrom(owner, receiver, tokenId).send({from: caller});
      const events = helper.eth.normalizeEvents(result.events);
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

  itEth('Can perform transfer()', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const evmCollection = helper.ethNativeContract.collection(address, 'nft', caller);
    const contract = await proxyWrap(helper, evmCollection, donor);
    const {tokenId} = await collection.mintToken(alice, {Ethereum: contract.options.address});

    {
      const result = await contract.methods.transfer(receiver, tokenId).send({from: caller});
      const events = helper.eth.normalizeEvents(result.events);
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
