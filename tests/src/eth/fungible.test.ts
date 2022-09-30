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

import {expect, itEth, usingEthPlaygrounds} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';

describe('Fungible: Information getting', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('totalSupply', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n);

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'ft', caller);
    const totalSupply = await contract.methods.totalSupply().call();
    expect(totalSupply).to.equal('200');
  });

  itEth('balanceOf', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: caller});

    const contract = helper.ethNativeContract.collectionById(collection.collectionId, 'ft', caller);
    const balance = await contract.methods.balanceOf(caller).call();
    expect(balance).to.equal('200');
  });
});

describe('Fungible: Plain calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Can perform mint()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.addAdmin(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const result = await contract.methods.mint(receiver, 100).send();
    
    const event = result.events.Transfer;
    expect(event.address).to.equal(collectionAddress);
    expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.to).to.equal(receiver);
    expect(event.returnValues.value).to.equal('100');
  });

  itEth('Can perform mintBulk()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const bulkSize = 3;
    const receivers = [...new Array(bulkSize)].map(() => helper.eth.createAccount());
    const collection = await helper.ft.mintCollection(alice);
    await collection.addAdmin(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const result = await contract.methods.mintBulk(Array.from({length: bulkSize}, (_, i) => (
      [receivers[i], (i + 1) * 10]
    ))).send();
    const events = result.events.Transfer.sort((a: any, b: any) => +a.returnValues.value - b.returnValues.value);
    for (let i = 0; i < bulkSize; i++) {
      const event = events[i];
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.returnValues.to).to.equal(receivers[i]);
      expect(event.returnValues.value).to.equal(String(10 * (i + 1)));
    }
  });

  itEth('Can perform burn()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.addAdmin(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);
    await contract.methods.mint(receiver, 100).send();

    const result = await contract.methods.burnFrom(receiver, 49).send({from: receiver});
    
    const event = result.events.Transfer;
    expect(event.address).to.equal(collectionAddress);
    expect(event.returnValues.from).to.equal(receiver);
    expect(event.returnValues.to).to.equal('0x0000000000000000000000000000000000000000');
    expect(event.returnValues.value).to.equal('49');

    const balance = await contract.methods.balanceOf(receiver).call();
    expect(balance).to.equal('51');
  });

  itEth('Can perform approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    {
      const result = await contract.methods.approve(spender, 100).send({from: owner});

      const event = result.events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
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
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    await contract.methods.approve(spender, 100).send();

    {
      const result = await contract.methods.transferFrom(owner, receiver, 49).send({from: spender});
      
      let event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(owner);
      expect(event.returnValues.to).to.be.equal(receiver);
      expect(event.returnValues.value).to.be.equal('49');

      event = result.events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
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
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    {
      const result = await contract.methods.transfer(receiver, 50).send({from: owner});
      
      const event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
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
});

describe('Fungible: Fees', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });
  
  itEth('approve() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.approve(spender, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    await contract.methods.approve(spender, 100).send({from: owner});

    const cost = await helper.eth.recordCallFee(spender, () => contract.methods.transferFrom(owner, spender, 100).send({from: spender}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.transfer(receiver, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });
});

describe('Fungible: Substrate calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('Events emitted for approve()', async ({helper}) => {
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    await collection.approveTokens(alice, {Ethereum: receiver}, 100n);

    const event = events[0];
    expect(event.event).to.be.equal('Approval');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.spender).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('100');
  });

  itEth('Events emitted for transferFrom()', async ({helper}) => {
    const [bob] = await helper.arrange.createAccounts([10n], donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n);
    await collection.approveTokens(alice, {Substrate: bob.address}, 100n);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    await collection.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver}, 51n);

    let event = events[0];
    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('51');

    event = events[1];
    expect(event.event).to.be.equal('Approval');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.spender).to.be.equal(helper.address.substrateToEth(bob.address));
    expect(event.returnValues.value).to.be.equal('49');
  });

  itEth('Events emitted for transfer()', async ({helper}) => {
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(collectionAddress, 'ft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });
    await collection.transfer(alice, {Ethereum:receiver}, 51n);

    const event = events[0];
    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('51');
  });
});
