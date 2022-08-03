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

import {createCollectionExpectSuccess, transfer, UNIQUE} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, evmCollection, evmCollectionHelpers, GAS_ARGS, getCollectionAddressFromResult, itWeb3, normalizeEvents, recordEthFee, tokenIdToAddress} from './util/helpers';
import reFungibleAbi from './reFungibleAbi.json';
import reFungibleTokenAbi from './reFungibleTokenAbi.json';
import {expect} from 'chai';

describe('Refungible: Information getting', () => {
  itWeb3('totalSupply', async ({api, web3, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});
    const nextTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, nextTokenId).send();
    const totalSupply = await contract.methods.totalSupply().call();
    expect(totalSupply).to.equal('1');
  });

  itWeb3('balanceOf', async ({api, web3, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(caller, nextTokenId).send();
    }
    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(caller, nextTokenId).send();
    }
    {
      const nextTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(caller, nextTokenId).send();
    }

    const balance = await contract.methods.balanceOf(caller).call();

    expect(balance).to.equal('3');
  });

  itWeb3('ownerOf', async ({api, web3, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(caller);
  });

  itWeb3('ownerOf after burn', async ({api, web3, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const tokenAddress = tokenIdToAddress(collectionId, tokenId);
    const tokenContract = new web3.eth.Contract(reFungibleTokenAbi as any, tokenAddress, {from: caller, ...GAS_ARGS});

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    await tokenContract.methods.burnFrom(caller, 1).send();

    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal(receiver);
  });

  itWeb3('ownerOf for partial ownership', async ({api, web3, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const tokenAddress = tokenIdToAddress(collectionId, tokenId);
    const tokenContract = new web3.eth.Contract(reFungibleTokenAbi as any, tokenAddress, {from: caller, ...GAS_ARGS});

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    const owner = await contract.methods.ownerOf(tokenId).call();

    expect(owner).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
  });
});

describe('Refungible: Plain calls', () => {
  itWeb3('Can perform mint()', async ({web3, api, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, owner);
    let result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const receiver = createEthAccount(web3);
    const contract = evmCollection(web3, owner, collectionIdAddress, {type: 'ReFungible'});
    const nextTokenId = await contract.methods.nextTokenId().call();

    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mintWithTokenURI(
      receiver,
      nextTokenId,
      'Test URI',
    ).send();

    const events = normalizeEvents(result.events);

    expect(events).to.include.deep.members([
      {
        address: collectionIdAddress,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: receiver,
          tokenId: nextTokenId,
        },
      },
    ]);

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
  });

  itWeb3('Can perform mintBulk()', async ({web3, api, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const receiver = createEthAccount(web3);

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
      ).send();
      const events = normalizeEvents(result.events);

      expect(events).to.include.deep.members([
        {
          address: collectionIdAddress,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver,
            tokenId: nextTokenId,
          },
        },
        {
          address: collectionIdAddress,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: receiver,
            tokenId: String(+nextTokenId + 1),
          },
        },
        {
          address: collectionIdAddress,
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
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();
    {
      const result = await contract.methods.burn(tokenId).send();
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address: collectionIdAddress,
          event: 'Transfer',
          args: {
            from: caller,
            to: '0x0000000000000000000000000000000000000000',
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }
  });

  itWeb3('Can perform transferFrom()', async ({web3, api, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const receiver = createEthAccount(web3);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();
    {
      const result = await contract.methods.transferFrom(caller, receiver, tokenId).send();
      const events = normalizeEvents(result.events);
      expect(events).to.include.deep.members([
        {
          address: collectionIdAddress,
          event: 'Transfer',
          args: {
            from: caller,
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
      const balance = await contract.methods.balanceOf(caller).call();
      expect(+balance).to.equal(0);
    }
  });

  itWeb3('Can perform transfer()', async ({web3, api, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const receiver = createEthAccount(web3);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    {
      const result = await contract.methods.transfer(receiver, tokenId).send();
      const events = normalizeEvents(result.events);
      expect(events).to.include.deep.members([
        {
          address: collectionIdAddress,
          event: 'Transfer',
          args: {
            from: caller,
            to: receiver,
            tokenId: tokenId.toString(),
          },
        },
      ]);
    }

    {
      const balance = await contract.methods.balanceOf(caller).call();
      expect(+balance).to.equal(0);
    }

    {
      const balance = await contract.methods.balanceOf(receiver).call();
      expect(+balance).to.equal(1);
    }
  });

  itWeb3('transfer event on transfer from partial ownership to full ownership', async ({api, web3, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const tokenAddress = tokenIdToAddress(collectionId, tokenId);
    const tokenContract = new web3.eth.Contract(reFungibleTokenAbi as any, tokenAddress, {from: caller, ...GAS_ARGS});

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    let transfer;
    contract.events.Transfer({}, function(_error: any, event: any){ transfer = event;});
    await tokenContract.methods.transfer(receiver, 1).send();
    const events = normalizeEvents([transfer]);
    expect(events).to.deep.equal([
      {
        address: collectionIdAddress,
        event: 'Transfer',
        args: {
          from: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
          to: receiver,
          tokenId: tokenId.toString(),
        },
      },
    ]);
  });

  itWeb3('transfer event on transfer from full ownership to partial ownership', async ({api, web3, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const tokenAddress = tokenIdToAddress(collectionId, tokenId);
    const tokenContract = new web3.eth.Contract(reFungibleTokenAbi as any, tokenAddress, {from: caller, ...GAS_ARGS});

    await tokenContract.methods.repartition(2).send();
    
    let transfer;
    contract.events.Transfer({}, function(_error: any, event: any){ transfer = event;});
    await tokenContract.methods.transfer(receiver, 1).send();

    const events = normalizeEvents([transfer]);
    expect(events).to.deep.equal([
      {
        address: collectionIdAddress,
        event: 'Transfer',
        args: {
          from: caller,
          to: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
          tokenId: tokenId.toString(),
        },
      },
    ]);
  });
});

describe('RFT: Fees', () => {
  itWeb3('transferFrom() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const receiver = createEthAccount(web3);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const cost = await recordEthFee(api, caller, () => contract.methods.transferFrom(caller, receiver, tokenId).send());
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
    expect(cost > 0n);
  });

  itWeb3('transfer() call fee is less than 0.2UNQ', async ({web3, api, privateKeyWrapper}) => {
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const helper = evmCollectionHelpers(web3, caller);
    const result = await helper.methods.createRefungibleCollection('Mint collection', '6', '6').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const contract = evmCollection(web3, caller, collectionIdAddress, {type: 'ReFungible'});

    const receiver = createEthAccount(web3);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();

    const cost = await recordEthFee(api, caller, () => contract.methods.transfer(receiver, tokenId).send());
    expect(cost < BigInt(0.2 * Number(UNIQUE)));
    expect(cost > 0n);
  });
});

describe('Common metadata', () => {
  itWeb3('Returns collection name', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'ReFungible'},
    });
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const address = collectionIdToAddress(collection);
    const contract = evmCollection(web3, caller, address, {type: 'ReFungible'});
    const name = await contract.methods.name().call();

    expect(name).to.equal('token name');
  });

  itWeb3('Returns symbol name', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      tokenPrefix: 'TOK',
      mode: {type: 'ReFungible'},
    });
    const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const address = collectionIdToAddress(collection);
    const contract = evmCollection(web3, caller, address, {type: 'ReFungible'});
    const symbol = await contract.methods.symbol().call();

    expect(symbol).to.equal('TOK');
  });
});