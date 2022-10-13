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

import {Pallets, requirePalletsOrSkip} from '../util';
import {EthUniqueHelper, expect, itEth, usingEthPlaygrounds} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';


describe('Refungible token: Information getting', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice, {tokenPrefix: 'MUON'});
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: caller});

    const contract = helper.ethNativeContract.rftTokenById(collection.collectionId, tokenId, caller);
    const totalSupply = await contract.methods.totalSupply().call();
    expect(totalSupply).to.equal('200');
  });

  itEth('balanceOf', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice, {tokenPrefix: 'MUON'});
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: caller});

    const contract = helper.ethNativeContract.rftTokenById(collection.collectionId, tokenId, caller);
    const balance = await contract.methods.balanceOf(caller).call();
    expect(balance).to.equal('200');
  });

  itEth('decimals', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice, {tokenPrefix: 'MUON'});
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: caller});

    const contract = helper.ethNativeContract.rftTokenById(collection.collectionId, tokenId, caller);
    const decimals = await contract.methods.decimals().call();
    expect(decimals).to.equal('0');
  });
});

// FIXME: Need erc721 for ReFubgible.
describe('Check ERC721 token URI for ReFungible', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
    });
  });

  async function setup(helper: EthUniqueHelper, tokenPrefix: string, propertyKey?: string, propertyValue?: string): Promise<{contract: Contract, nextTokenId: string}> {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
    let result = await collectionHelper.methods.createERC721MetadataCompatibleCollection('Mint collection', 'a', 'b', tokenPrefix).send({value: Number(2n * helper.balance.getOneTokenNominal())});
    const collectionAddress = helper.ethAddress.normalizeAddress(result.events.CollectionCreated.returnValues.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await contract.methods.mint(
      receiver,
      nextTokenId,
    ).send();

    if (propertyKey && propertyValue) {
      // Set URL or suffix
      await contract.methods.setProperty(nextTokenId, propertyKey, Buffer.from(propertyValue)).send();
    }

    const event = result.events.Transfer;
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(nextTokenId);

    return {contract, nextTokenId};
  }

  itEth('Empty tokenURI', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, '');
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('');
  });

  itEth('TokenURI from url', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_', 'url', 'Token URI');
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Token URI');
  });

  itEth('TokenURI from baseURI + tokenId', async ({helper}) => {
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_');
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('BaseURI_' + nextTokenId);
  });

  itEth('TokenURI from baseURI + suffix', async ({helper}) => {
    const suffix = '/some/suffix';
    const {contract, nextTokenId} = await setup(helper, 'BaseURI_', 'suffix', suffix);
    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('BaseURI_' + suffix);
  });
});

describe('Refungible: Plain calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  itEth('Can perform approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    {
      const result = await contract.methods.approve(spender, 100).send({from: owner});
      const event = result.events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.spender).to.be.equal(spender);
      expect(event.returnValues.value).to.be.equal('100');
    }

    {
      const allowance = await contract.methods.allowance(owner, spender).call();
      expect(+allowance).to.equal(100);
    }
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    await contract.methods.approve(spender, 100).send();

    {
      const result = await contract.methods.transferFrom(owner, receiver, 49).send({from: spender});
      let event = result.events.Transfer;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.returnValues.from).to.be.equal(owner);
      expect(event.returnValues.to).to.be.equal(receiver);
      expect(event.returnValues.value).to.be.equal('49');

      event = result.events.Approval;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.spender).to.be.equal(spender);
      expect(event.returnValues.value).to.be.equal('51');
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

  itEth('Can perform transfer()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    {
      const result = await contract.methods.transfer(receiver, 50).send({from: owner});
      const event = result.events.Transfer;
      expect(event.address).to.be.equal(tokenAddress);
      expect(event.returnValues.from).to.be.equal(owner);
      expect(event.returnValues.to).to.be.equal(receiver);
      expect(event.returnValues.value).to.be.equal('50');
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

  itEth('Can perform repartition()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    await contract.methods.repartition(200).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(200);
    await contract.methods.transfer(receiver, 110).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(90);
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(110);

    await expect(contract.methods.repartition(80).send({from: owner})).to.eventually.be.rejected; // Transaction is reverted

    await contract.methods.transfer(receiver, 90).send({from: owner});
    expect(+await contract.methods.balanceOf(owner).call()).to.be.equal(0);
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(200);

    await contract.methods.repartition(150).send({from: receiver});
    await expect(contract.methods.transfer(owner, 160).send({from: receiver})).to.eventually.be.rejected; // Transaction is reverted
    expect(+await contract.methods.balanceOf(receiver).call()).to.be.equal(150);
  });

  itEth('Can repartition with increased amount', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    const result = await contract.methods.repartition(200).send();

    const event = result.events.Transfer;
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.be.equal(owner);
    expect(event.returnValues.value).to.be.equal('100');
  });

  itEth('Can repartition with decreased amount', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    const result = await contract.methods.repartition(50).send();
    const event = result.events.Transfer;
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal(owner);
    expect(event.returnValues.to).to.be.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.value).to.be.equal('50');
  });

  itEth('Receiving Transfer event on burning into full ownership', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const {collectionId, collectionAddress} = await helper.eth.createRefungibleCollection(caller, 'Devastation', '6', '6');
    const contract = helper.ethNativeContract.collection(collectionAddress, 'rft', caller);

    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(caller, tokenId).send();
    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);
    const tokenContract = helper.ethNativeContract.rftToken(tokenAddress, caller);

    await tokenContract.methods.repartition(2).send();
    await tokenContract.methods.transfer(receiver, 1).send();

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    await tokenContract.methods.burnFrom(caller, 1).send();

    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.tokenId).to.be.equal(tokenId);
  });
});

describe('Refungible: Fees', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  itEth('approve() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 100n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.approve(spender, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    await contract.methods.approve(spender, 100).send({from: owner});

    const cost = await helper.eth.recordCallFee(spender, () => contract.methods.transferFrom(owner, spender, 100).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const {tokenId} = await collection.mintToken(alice, 200n, {Ethereum: owner});

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.transfer(receiver, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });
});

describe('Refungible: Substrate calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([50n], donor);
    });
  });

  itEth('Events emitted for approve()', async ({helper}) => {
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 200n);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress);

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    expect(await token.approve(alice, {Ethereum: receiver}, 100n)).to.be.true;
    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];

    expect(event.event).to.be.equal('Approval');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.spender).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('100');
  });

  itEth('Events emitted for transferFrom()', async ({helper}) => {
    const [bob] = await helper.arrange.createAccounts([10n], donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 200n);
    await token.approve(alice, {Substrate: bob.address}, 100n);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress);

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    expect(await token.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver},  51n)).to.be.true;
    if (events.length == 0) await helper.wait.newBlocks(1);

    let event = events[0];
    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('51');

    event = events[1];
    expect(event.event).to.be.equal('Approval');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.spender).to.be.equal(helper.address.substrateToEth(bob.address));
    expect(event.returnValues.value).to.be.equal('49');
  });

  itEth('Events emitted for transfer()', async ({helper}) => {
    const receiver = helper.eth.createAccount();
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 200n);

    const tokenAddress = helper.ethAddress.fromTokenId(collection.collectionId, token.tokenId);
    const contract = helper.ethNativeContract.rftToken(tokenAddress);

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    expect(await token.transfer(alice, {Ethereum: receiver},  51n)).to.be.true;
    if (events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];

    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(tokenAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('51');
  });
});

describe('ERC 1633 implementation', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Default parent token address and id', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {collectionId, collectionAddress} = await helper.eth.createRefungibleCollection(owner, 'Sands', '', 'GRAIN');
    const collectionContract = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
    
    const tokenId = await collectionContract.methods.nextTokenId().call();
    await collectionContract.methods.mint(owner, tokenId).send();
    const tokenAddress = helper.ethAddress.fromTokenId(collectionId, tokenId);
    const tokenContract = helper.ethNativeContract.rftToken(tokenAddress, owner);

    expect(await tokenContract.methods.parentToken().call()).to.be.equal(collectionAddress);
    expect(await tokenContract.methods.parentTokenId().call()).to.be.equal(tokenId);
  });
});
