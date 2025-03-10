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

import {waitParams, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
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
      await collection.addAdmin(alice, {Ethereum: ethOwner.address});

      const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', ethOwner);

      // 2. Mint tokens:
      const mintTx = await collectionEvm.mintCross.send(testCase === 'ethereum' ? receiverCrossEth : receiverCrossSub, 100);
      const mintReceipt = await mintTx.wait(...waitParams);
      const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

      const event = mintEvents.Transfer;
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.equal(testCase === 'ethereum' ? receiverEth.address : helper.address.substrateToEth(receiverSub.address));
      expect(event.args.value).to.equal('100');

      // 3. Get balance depending on the test case:
      let balance;
      if(testCase === 'ethereum') balance = await collection.getBalance({Ethereum: receiverEth.address});
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
    await collection.addAdmin(alice, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const mintTx = await contract.mintBulk.send(Array.from({length: bulkSize}, (_, i) => (
      [receivers[i], (i + 1) * 10]
    )));
    const mintReceipt = await mintTx.wait(...waitParams);
    const mintEvents = helper.eth.rebuildEvents(mintReceipt!)
      .filter((event) => event.event === 'Transfer')
      .sort((a, b) => +a.args.value - +b.args.value);

    for(let i = 0; i < bulkSize; i++) {
      const event = mintEvents[i];
      expect(event.address).to.equal(collectionAddress);
      expect(event.args.from).to.equal('0x0000000000000000000000000000000000000000');
      expect(event.args.to).to.equal(receivers[i]);
      expect(event.args.value).to.equal(String(10 * (i + 1)));
    }
  });

  // Soft-deprecated
  itEth('Can perform burn()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.addAdmin(alice, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
    await (await contract.mint.send(receiver, 100)).wait(...waitParams);

    const receiverContract = helper.eth.changeContractCaller(contract, receiver);
    const burnTx = await receiverContract.burnFrom.send(receiver, 49);
    const burnReceipt = await burnTx.wait(...waitParams);
    const burnEvents = helper.eth.normalizeEvents(burnReceipt!);

    const event = burnEvents.Transfer;
    expect(event.address).to.equal(collectionAddress);
    expect(event.args.from).to.equal(receiver.address);
    expect(event.args.to).to.equal('0x0000000000000000000000000000000000000000');
    expect(event.args.value).to.equal('49');

    const balance = await contract.balanceOf.staticCall(receiver.address);
    expect(balance).to.equal('51');
  });

  itEth('Can perform approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    {
      const tx = await contract.approve.send(spender, 100);
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      const event = events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.owner).to.be.equal(owner.address);
      expect(event.args.spender).to.be.equal(spender.address);
      expect(event.args.value).to.be.equal('100');
    }

    {
      const allowance = await contract.allowance.staticCall(owner.address, spender.address);
      expect(allowance).to.equal(100n);
    }

    {
      const ownerCross = helper.ethCrossAccount.fromAddress(owner);
      const spenderCross = helper.ethCrossAccount.fromAddress(spender);
      const allowance = await contract.allowanceCross.staticCall(ownerCross, spenderCross);
      expect(allowance).to.equal(100n);
    }
  });

  itEth('Can perform approveCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const spenderSub = (await helper.arrange.createAccounts([1n], donor))[0];
    const spenderCrossEth = helper.ethCrossAccount.fromAddress(spender);
    const spenderCrossSub = helper.ethCrossAccount.fromKeyringPair(spenderSub);

    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    {
      const tx = await contract.approveCross.send(spenderCrossEth, 100);
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      const event = events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.owner).to.be.equal(owner.address);
      expect(event.args.spender).to.be.equal(spender.address);
      expect(event.args.value).to.be.equal('100');
    }

    {
      const allowance = await contract.allowance.staticCall(owner.address, spender.address);
      expect(allowance).to.equal(100n);
    }

    {
      const tx = await contract.approveCross.send(spenderCrossSub, 100);
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      const event = events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.owner).to.be.equal(owner.address);
      expect(event.args.spender).to.be.equal(helper.address.substrateToEth(spenderSub.address));
      expect(event.args.value).to.be.equal('100');
    }

    {
      const allowance = await collection.getApprovedTokens({Ethereum: owner.address}, {Substrate: spenderSub.address});
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
    await collection.mint(alice, 100n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const nonOwnerCollectionEvm = helper.eth.changeContractCaller(collectionEvm, nonOwner);
    await expect(nonOwnerCollectionEvm.approveCross.staticCall(nonOwnerCross, 20n)).to.be.rejectedWith('CantApproveMoreThanOwned');
  });


  itEth('Can perform burnFromCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.ft.mintCollection(owner, {name: 'A', description: 'B', tokenPrefix: 'C'}, 0);

    await collection.mint(owner, 200n, {Substrate: owner.address});
    await collection.approveTokens(owner, {Ethereum: sender.address}, 100n);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'ft');

    const fromBalanceBefore = await collection.getBalance({Substrate: owner.address});

    const ownerCross = helper.ethCrossAccount.fromKeyringPair(owner);

    const tx = await contract.burnFromCross.send(ownerCross, 49, {from: sender});
    const receipt = await tx.wait(...waitParams);
    const events = helper.eth.normalizeEvents(receipt!);

    expect(events).to.be.equal({
      Transfer: {
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        event: 'Transfer',
        args: {
          from: helper.address.substrateToEth(owner.address),
          to: '0x0000000000000000000000000000000000000000',
          value: '49',
        },
      },
      Approval: {
        address: helper.ethAddress.fromCollectionId(collection.collectionId),
        args: {
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
    await collection.mint(alice, 200n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    await (await contract.approve.send(spender, 100)).wait(...waitParams);

    {
      const spenderContract = helper.eth.changeContractCaller(contract, spender);

      const tx = await spenderContract.transferFrom.send(owner, receiver, 49n);
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      let event = events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(owner.address);
      expect(event.args.to).to.be.equal(receiver.address);
      expect(event.args.value).to.be.equal('49');

      event = events.Approval;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.owner).to.be.equal(owner.address);
      expect(event.args.spender).to.be.equal(spender.address);
      expect(event.args.value).to.be.equal('51');
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(balance).to.equal(49n);
    }

    {
      const balance = await contract.balanceOf.staticCall(owner.address);
      expect(balance).to.equal(151n);
    }
  });

  itEth('Can perform transferCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);
    const receiverEth = await helper.eth.createAccountWithBalance(donor);
    const receiverCrossEth = helper.ethCrossAccount.fromAddress(receiverEth);
    const receiverCrossSub = helper.ethCrossAccount.fromKeyringPair(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: sender.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', sender);

    {
      // Can transferCross to ethereum address:
      const tx = await collectionEvm.transferCross.send(receiverCrossEth, 50, {from: sender});
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      // Check events:
      const event = events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(sender.address);
      expect(event.args.to).to.be.equal(receiverEth.address);
      expect(event.args.value).to.be.equal('50');

      // Sender's balance decreased:
      const ownerBalance = await collectionEvm.balanceOf.staticCall(sender);
      expect(ownerBalance).to.equal(150n);

      // Receiver's balance increased:
      const receiverBalance = await collectionEvm.balanceOf.staticCall(receiverEth);
      expect(receiverBalance).to.equal(50n);
    }

    {
      // Can transferCross to substrate address:
      const tx = await collectionEvm.transferCross.send(receiverCrossSub, 50, {from: sender});
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      // Check events:
      const event = events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(sender.address);
      expect(event.args.to).to.be.equal(helper.address.substrateToEth(donor.address));
      expect(event.args.value).to.be.equal('50');

      // Sender's balance decreased:
      const senderBalance = await collection.getBalance({Ethereum: sender.address});
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
    await collection.mint(alice, BALANCE, {Ethereum: sender.address});
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', sender);

    // 1. Cannot transfer more than have
    const receiver = testCase === 'transfer' ? receiverEth : receiverCrossEth;
    await expect(collectionEvm[testCase].send(receiver, BALANCE_TO_TRANSFER, {from: sender})).to.be.rejected;

    // 2. Zero transfer allowed (EIP-20):
    await (await collectionEvm[testCase].send(receiver, 0n, {from: sender})).wait(...waitParams);
  }));


  itEth('Can perform transfer()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    {
      const tx = await contract.transfer.send(receiver, 50);
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      const event = events.Transfer;
      expect(event.address).to.be.equal(collectionAddress);
      expect(event.args.from).to.be.equal(owner.address);
      expect(event.args.to).to.be.equal(receiver.address);
      expect(event.args.value).to.be.equal('50');
    }

    {
      const balance = await contract.balanceOf.staticCall(owner.address);
      expect(balance).to.equal(150n);
    }

    {
      const balance = await contract.balanceOf.staticCall(receiver);
      expect(balance).to.equal(50n);
    }
  });

  itEth('Can perform transferFromCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.ft.mintCollection(owner, {name: 'A', description: 'B', tokenPrefix: 'C'}, 0);

    const receiver = helper.eth.createAccount();

    await collection.mint(owner, 200n, {Substrate: owner.address});
    await collection.approveTokens(owner, {Ethereum: sender.address}, 100n);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'ft');

    const from = helper.ethCrossAccount.fromKeyringPair(owner);
    const to = helper.ethCrossAccount.fromAddress(receiver);

    const fromBalanceBefore = await collection.getBalance({Substrate: owner.address});
    const toBalanceBefore = await collection.getBalance({Ethereum: receiver.address});

    const tx = await contract.transferFromCross.send(from, to, 51, {from: sender});
    const receipt = await tx.wait(...waitParams);
    const events = helper.eth.normalizeEvents(receipt!);

    expect(events).to.be.like({
      Transfer: {
        address,
        event: 'Transfer',
        args: {
          from: helper.address.substrateToEth(owner.address),
          to: receiver.address,
          value: '51',
        },
      },
      Approval: {
        address,
        event: 'Approval',
        args: {
          owner: helper.address.substrateToEth(owner.address),
          spender: sender.address,
          value: '49',
        },
      }});

    const fromBalanceAfter = await collection.getBalance({Substrate: owner.address});
    expect(fromBalanceBefore - fromBalanceAfter).to.be.eq(51n);
    const toBalanceAfter = await collection.getBalance({Ethereum: receiver.address});
    expect(toBalanceAfter - toBalanceBefore).to.be.eq(51n);
  });

  itEth('Check balanceOfCross()', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {});
    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const other = await helper.eth.createAccountWithBalance(donor, 100n);
    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    expect(await collectionEvm.balanceOfCross.staticCall(owner.address)).to.be.eq(0n);
    expect(await collectionEvm.balanceOfCross.staticCall(other.address)).to.be.eq(0n);

    await collection.mint(alice, 100n, {Ethereum: owner.address});
    expect(await collectionEvm.balanceOfCross.staticCall(owner.address)).to.be.eq(100n);
    expect(await collectionEvm.balanceOfCross.staticCall(other.address)).to.be.eq(0n);

    await collectionEvm.transferCross(other.address, 50n, {from: owner});
    expect(await collectionEvm.balanceOfCross.staticCall(owner.address)).to.be.eq(50n);
    expect(await collectionEvm.balanceOfCross.staticCall(other.address)).to.be.eq(50n);

    await collectionEvm.transferCross(other.address, 50n, {from: owner});
    expect(await collectionEvm.balanceOfCross.staticCall(owner.address)).to.be.eq(0n);
    expect(await collectionEvm.balanceOfCross.staticCall(other.address)).to.be.eq(100n);

    await collectionEvm.transferCross(owner.address, 100n, {from: other});
    expect(await collectionEvm.balanceOfCross.staticCall(owner.address)).to.be.eq(100n);
    expect(await collectionEvm.balanceOfCross.staticCall(other.address)).to.be.eq(0n);
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
    await collection.mint(alice, 200n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const cost = await helper.eth.recordCallFee(
      owner.address,
      async () => await (await contract.approve.send(spender, 100)).wait(...waitParams),
    );
    expect(cost < (BigInt(0.2) * helper.balance.getOneTokenNominal()));
  });

  itEth('transferFrom() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = await helper.eth.createAccountWithBalance(donor);
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    await (await contract.approve.send(spender, 100)).wait(...waitParams);

    const contractContract = helper.eth.changeContractCaller(contract, spender);
    const cost = await helper.eth.recordCallFee(
      spender.address,
      async () => await (await contractContract.transferFrom.send(owner, spender, 100n)).wait(...waitParams),
    );
    expect(cost < (helper.balance.getOneTokenNominal() / 5n));
  });

  itEth('transfer() call fee is less than 0.2UNQ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();
    const collection = await helper.ft.mintCollection(alice);
    await collection.mint(alice, 200n, {Ethereum: owner.address});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const cost = await helper.eth.recordCallFee(
      owner.address,
      async () => await (await contract.transfer.send(receiver, 100)).wait(...waitParams),
    );
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
    // TODO: Refactor this
    // const receiver = helper.eth.createAccount();
    // const collection = await helper.ft.mintCollection(alice);
    // await collection.mint(alice, 200n);

    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await collection.approveTokens(alice, {Ethereum: receiver.address}, 100n);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.event).to.be.equal('Approval');
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.spender).to.be.equal(receiver);
    // expect(event.args.value).to.be.equal('100');
  });

  itEth('Events emitted for transferFrom()', async ({helper}) => {
    // TODO: Refactor this
    // const [bob] = await helper.arrange.createAccounts([10n], donor);
    // const receiver = helper.eth.createAccount();
    // const collection = await helper.ft.mintCollection(alice);
    // await collection.mint(alice, 200n);
    // await collection.approveTokens(alice, {Substrate: bob.address}, 100n);

    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await collection.transferFrom(bob, {Substrate: alice.address}, {Ethereum: receiver.address}, 51n);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // let event = events[0];

    // expect(event.event).to.be.equal('Transfer');
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.to).to.be.equal(receiver);
    // expect(event.args.value).to.be.equal('51');

    // event = events[1];
    // expect(event.event).to.be.equal('Approval');
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.owner).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.spender).to.be.equal(helper.address.substrateToEth(bob.address));
    // expect(event.args.value).to.be.equal('49');
  });

  itEth('Events emitted for transfer()', async ({helper}) => {
    // TODO: Refactor this
    // const receiver = helper.eth.createAccount();
    // const collection = await helper.ft.mintCollection(alice);
    // await collection.mint(alice, 200n);

    // const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    // const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft');

    // const events: any = [];
    // contract.events.allEvents((_: any, event: any) => {
    //   events.push(event);
    // });

    // await collection.transfer(alice, {Ethereum:receiver}, 51n);
    // if(events.length == 0) await helper.wait.newBlocks(1);
    // const event = events[0];

    // expect(event.event).to.be.equal('Transfer');
    // expect(event.address).to.be.equal(collectionAddress);
    // expect(event.args.from).to.be.equal(helper.address.substrateToEth(alice.address));
    // expect(event.args.to).to.be.equal(receiver);
    // expect(event.args.value).to.be.equal('51');
  });

  itEth('Events emitted for transferFromCross()', async ({helper}) => {
    const sender = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.ft.mintCollection(owner, {name: 'A', description: 'B', tokenPrefix: 'C'}, 0);

    const receiver = helper.eth.createAccount();

    await collection.mint(owner, 200n, {Substrate: owner.address});
    await collection.approveTokens(owner, {Ethereum: sender.address}, 100n);

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(address, 'ft', sender);

    const from = helper.ethCrossAccount.fromKeyringPair(owner);
    const to = helper.ethCrossAccount.fromAddress(receiver);

    const transferTx = await contract.transferFromCross.send(from, to, 51);
    const transferReceipt = await transferTx.wait(...waitParams);
    const transferEvents = helper.eth.normalizeEvents(transferReceipt!);

    expect(transferEvents).to.be.like({
      Transfer: {
        address,
        event: 'Transfer',
        args: {
          from: helper.address.substrateToEth(owner.address),
          to: receiver,
          value: '51',
        },
      },
      Approval: {
        address,
        event: 'Approval',
        args: {
          owner: helper.address.substrateToEth(owner.address),
          spender: sender,
          value: '49',
        },
      }});
  });
});
