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

import {expect, itEth, usingEthPlaygrounds} from './util/index.js';
import type {IKeyringPair} from '@polkadot/types/types';

describe('Fungible: Plain calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let owner: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice, owner] = await helper.arrange.createAccounts([30n, 20n], donor);
    });
  });

  [
    'substrate' as const,
    'ethereum' as const,
  ].map(testCase => {
    itEth(`Can perform mintCross() for ${testCase} address`, async ({helper}) => {
      // 1. Create receiver depending on the test case:
      const receiverEth = helper.eth.createAccount();
      const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
      const receiverSub = owner;
      const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(owner);

      const ethOwner = await helper.eth.createAccountWithBalance(donor);
      const collection = await helper.ft.mintCollection(alice);
      await collection.addAdmin(alice, {Ethereum: ethOwner});

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', ethOwner);

      // 2. Mint tokens:
      const result = await collectionEvm.methods.mintCross(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, 100).send();

      const event = result.events.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.returnValues.to).to.equal(testCase === 'ethereum' ? receiverEth : helper.address.substrateToEth(receiverSub.address));
      expect(event.returnValues.value).to.equal('100');

      // 3. Get balance depending on the test case:
      let balance;
      if(testCase === 'ethereum') balance = await collection.getBalance({Ethereum: receiverEth});
      else if(testCase === 'substrate') balance = await collection.getBalance({Substrate: receiverSub.address});
      // 3.1 Check balance:
      expect(balance).to.eq(100n);
    });
  });

  itEth('Can perform mintBulk()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const bulkSize = 3;
    const receivers = [...new Array(bulkSize)].map(() => helper.eth.createAccount());
    const collection = await helper.ft.mintCollection(alice);
    await collection.addAdmin(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const result = await contract.methods.mintBulk(Array.from({length: bulkSize}, (_, i) => (
      [receivers[i], (i + 1) * 10]
    ))).send();
    const events = result.events.Transfer.sort((a: any, b: any) => +a.returnValues.value - b.returnValues.value);
    for(let i = 0; i < bulkSize; i++) {
      const event = events[i];
      expect(event.address).to.equal(collectionAddress);
      expect(event.returnValues.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.returnValues.to).to.equal(receivers[i]);
      expect(event.returnValues.value).to.equal(String(10 * (i + 1)));
    }
  });

  // Soft-deprecated
  itEth('Can perform burn()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.addAdmin(alice, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

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
    {
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const spenderCross = helper.ethCrossAccount.fromAddress(spender);
      const allowance = await contract.methods.allowanceCross(ownerCross, spenderCross).call();
      expect(+allowance).to.equal(100);
    }
  });

  itEth('Can perform approveCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const spenderSub = (await helper.arrange.createAccounts([1n], donor))[0];
    const spenderCrossEth = helper.ethCrossAccount.fromAddress(spender);
    const spenderCrossSub = helper.ethCrossAccount.fromKeyringPair(spenderSub);


    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    {
      const result = await contract.methods.approveCross(spenderCrossEth, 100).send({from: owner});
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


    {
      const result = await contract.methods.approveCross(spenderCrossSub, 100).send({from: owner});
      const event = result.events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.owner).to.be.equal(owner);
      expect(event.returnValues.spender).to.be.equal(helper.address.substrateToEth(spenderSub.address));
      expect(event.returnValues.value).to.be.equal('100');
    }

    {
      const allowance = await collection.getApprovedTokens({Ethereum: owner}, {Substrate: spenderSub.address});
      expect(allowance).to.equal(100n);
    }

    {
      //TO-DO expect with future allowanceCross(owner, spenderCrossEth).call()
    }
  });

  itEth('Non-owner and non admin cannot approveCross', async ({helper}) => {
    const nonOwner = await helper.eth.createAccountWithBalance(donor);
    const nonOwnerCross = helper.ethCrossAccount.fromAddress(nonOwner);
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice, {name: 'A', description: 'B', tokenPrefix: 'C'});
    await collection.mint(alice, 100n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    await expect(collectionEvm.methods.approveCross(nonOwnerCross, 20).call({from: nonOwner})).to.be.rejectedWith('CantApproveMoreThanOwned');
  });


  itEth('Can perform burnFromCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.ft.mintCollection(owner, {name: 'A', description: 'B', tokenPrefix: 'C'}, 0);

    await collection.mint(owner, 200n, {Substrate: owner.address});
    await collection.approveTokens(owner, {Ethereum: sender}, 100n);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'ft');

    const fromBalanceBefore = await collection.getBalance({Substrate: owner.address});

    const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);
    const result = await contract.methods.burnFromCross(ownerCross, 49).send({from: sender});
    const events = result.events;

    expect(events).to.be.like({
      Transfer: {
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        returnValues: {
          from: helper.address.substrateToEth(owner.address),
          to: '0x0000000000000000000000000000000000000000',
          value: '49',
        },
      },
      Approval: {
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        returnValues: {
          owner: helper.address.substrateToEth(owner.address),
          spender: sender,
          value: '51',
        },
        event: 'Approval',
      },
    });

    const fromBalanceAfter = await collection.getBalance({Substrate: owner.address});
    expect(fromBalanceBefore - fromBalanceAfter).to.be.eq(49n);
  });

  itEth('Can perform transferFrom()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

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

  itEth('Can perform transferCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: sender});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', sender);

    {
      // Can transferCross to ethereum address:
      const result = await collectionEvm.methods.transferCross(receiverCrossEth, 50).send({from: sender});
      // Check events:
      const event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(sender);
      expect(event.returnValues.to).to.be.equal(receiverEth);
      expect(event.returnValues.value).to.be.equal('50');
      // Sender's balance decreased:
      const ownerBalance = await collectionEvm.methods.balanceOf(sender).call();
      expect(+ownerBalance).to.equal(150);
      // Receiver's balance increased:
      const receiverBalance = await collectionEvm.methods.balanceOf(receiverEth).call();
      expect(+receiverBalance).to.equal(50);
    }

    {
      // Can transferCross to substrate address:
      const result = await collectionEvm.methods.transferCross(receiverCrossSub, 50).send({from: sender});
      // Check events:
      const event = result.events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.returnValues.from).to.be.equal(sender);
      expect(event.returnValues.to).to.be.equal(helper.address.substrateToEth(donor.address));
      expect(event.returnValues.value).to.be.equal('50');
      // Sender's balance decreased:
      const senderBalance = await collection.getBalance({Ethereum: sender});
      expect(senderBalance).to.equal(100n);
      // Receiver's balance increased:
      const balance = await collection.getBalance({Substrate: donor.address});
      expect(balance).to.equal(50n);
    }
  });

  ['transfer', 'transferCross'].map(testCase => itEth(`Cannot ${testCase} incorrect amount`, async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
    const BALANCE = 200n;
    const BALANCE_TO_TRANSFER = BALANCE + 100n;

    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, BALANCE, {Ethereum: sender});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', sender);

    // 1. Cannot transfer more than have
    const receiver = testCase === 'transfer' ? receiverEth : receiverCrossEth;
    await expect(collectionEvm.methods[testCase](receiver, BALANCE_TO_TRANSFER).send({from: sender})).to.be.rejected;
    // 2. Zero transfer allowed (EIP-20):
    await collectionEvm.methods[testCase](receiver, 0n).send({from: sender});
  }));


  itEth('Can perform transfer()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

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

  itEth('Can perform transferFromCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.ft.mintCollection(owner, {name: 'A', description: 'B', tokenPrefix: 'C'}, 0);

    const receiver = helper.eth.createAccount();

    await collection.mint(owner, 200n, {Substrate: owner.address});
    await collection.approveTokens(owner, {Ethereum: sender}, 100n);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'ft');

    const from = helper.ethCrossAccount.fromKeyringPair(owner);
    const to = helper.ethCrossAccount.fromAddress(receiver);

    const fromBalanceBefore = await collection.getBalance({Substrate: owner.address});
    const toBalanceBefore = await collection.getBalance({Ethereum: receiver});

    const result = await contract.methods.transferFromCross(from, to, 51).send({from: sender});

    expect(result.events).to.be.like({
      Transfer: {
        address,
        event: 'Transfer',
        returnValues: {
          from: helper.address.substrateToEth(owner.address),
          to: receiver,
          value: '51',
        },
      },
      Approval: {
        address,
        event: 'Approval',
        returnValues: {
          owner: helper.address.substrateToEth(owner.address),
          spender: sender,
          value: '49',
        },
      }});

    const fromBalanceAfter = await collection.getBalance({Substrate: owner.address});
    expect(fromBalanceBefore - fromBalanceAfter).to.be.eq(51n);
    const toBalanceAfter = await collection.getBalance({Ethereum: receiver});
    expect(toBalanceAfter - toBalanceBefore).to.be.eq(51n);
  });

  itEth('Check balanceOfCross()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {});
    const owner = await helper.ethCrossAccount.createAccountWithBalance(donor);
    const other = await helper.ethCrossAccount.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner.eth);

    expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq('0');
    expect(await collectionEvm.methods.balanceOfCross(other).call({from: owner.eth})).to.be.eq('0');

    await collection.mint(alice, 100n, {Ethereum: owner.eth});
    expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq('100');
    expect(await collectionEvm.methods.balanceOfCross(other).call({from: owner.eth})).to.be.eq('0');

    await collectionEvm.methods.transferCross(other, 50n).send({from: owner.eth});
    expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq('50');
    expect(await collectionEvm.methods.balanceOfCross(other).call({from: owner.eth})).to.be.eq('50');

    await collectionEvm.methods.transferCross(other, 50n).send({from: owner.eth});
    expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq('0');
    expect(await collectionEvm.methods.balanceOfCross(other).call({from: owner.eth})).to.be.eq('100');

    await collectionEvm.methods.transferCross(owner, 100n).send({from: other.eth});
    expect(await collectionEvm.methods.balanceOfCross(owner).call({from: owner.eth})).to.be.eq('100');
    expect(await collectionEvm.methods.balanceOfCross(other).call({from: owner.eth})).to.be.eq('0');
  });
});

describe('Fungible: Fees', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([20n], donor);
    });
  });

  itEth('approve() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.approve(spender, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const cost = await helper.eth.recordCallFee(owner, () => contract.methods.transfer(receiver, 100).send({from: owner}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal())));
  });
});

describe('Fungible: Substrate calls', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let owner: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice, owner] = await helper.arrange.createAccounts([20n, 20n], donor);
    });
  });

  itEth('Events emitted for approve()', async ({helper}) => {
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n);

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await collection.approveTokens(alice, {Ethereum: receiver}, 100n);
    if(events.length == 0) await helper.wait.newBlocks(1);
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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await collection.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver}, 51n);
    if(events.length == 0) await helper.wait.newBlocks(1);
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
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft');

    const events: any = [];
    contract.events.allEvents((_: any, event: any) => {
      events.push(event);
    });

    await collection.transfer(alice, {Ethereum:receiver}, 51n);
    if(events.length == 0) await helper.wait.newBlocks(1);
    const event = events[0];

    expect(event.event).to.be.equal('Transfer');
    expect(event.address).to.be.equal(collectionAddress);
    expect(event.returnValues.from).to.be.equal(helper.address.substrateToEth(alice.address));
    expect(event.returnValues.to).to.be.equal(receiver);
    expect(event.returnValues.value).to.be.equal('51');
  });

  itEth('Events emitted for transferFromCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.ft.mintCollection(owner, {name: 'A', description: 'B', tokenPrefix: 'C'}, 0);

    const receiver = helper.eth.createAccount();

    await collection.mint(owner, 200n, {Substrate: owner.address});
    await collection.approveTokens(owner, {Ethereum: sender}, 100n);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'ft');

    const from = helper.ethCrossAccount.fromKeyringPair(owner);
    const to = helper.ethCrossAccount.fromAddress(receiver);

    const result = await contract.methods.transferFromCross(from, to, 51).send({from: sender});

    expect(result.events).to.be.like({
      Transfer: {
        address,
        event: 'Transfer',
        returnValues: {
          from: helper.address.substrateToEth(owner.address),
          to: receiver,
          value: '51',
        },
      },
      Approval: {
        address,
        event: 'Approval',
        returnValues: {
          owner: helper.address.substrateToEth(owner.address),
          spender: sender,
          value: '49',
        },
      }});
  });
});
