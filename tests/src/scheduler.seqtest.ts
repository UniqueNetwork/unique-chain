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

import {expect, itSched, itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {DevUniqueHelper} from './util/playgrounds/unique.dev';

describe('Scheduling token and balance transfers', () => {
  let superuser: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.UniqueScheduler]);

      superuser = await privateKey('//Alice');
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);

      await helper.testUtils.enable();
    });
  });

  beforeEach(async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.wait.noScheduledTasks();
    });
  });

  itSched('Can delay a transfer of an owned token', async (scheduleKind, {helper}) => {
    const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'schd'});
    const token = await collection.mintToken(alice);
    const scheduledId = scheduleKind == 'named' ? helper.arrange.makeScheduledId() : undefined;
    const blocksBeforeExecution = 4;
    await helper.scheduler.scheduleAfter(blocksBeforeExecution, {scheduledId})
      .nft.transferToken(alice, collection.collectionId, token.tokenId, {Substrate: bob.address});
    const executionBlock = await helper.chain.getLatestBlockNumber() + blocksBeforeExecution + 1;

    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});

    await helper.wait.forParachainBlockNumber(executionBlock);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSched('Can transfer funds periodically', async (scheduleKind, {helper}) => {
    const scheduledId = scheduleKind == 'named' ? helper.arrange.makeScheduledId() : undefined;
    const waitForBlocks = 1;

    const amount = 1n * helper.balance.getOneTokenNominal();
    const periodic = {
      period: 2,
      repetitions: 2,
    };

    const bobsBalanceBefore = await helper.balance.getSubstrate(bob.address);

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId, periodic})
      .balance.transferToSubstrate(alice, bob.address, amount);
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.wait.forParachainBlockNumber(executionBlock);

    const bobsBalanceAfterFirst = await helper.balance.getSubstrate(bob.address);
    expect(bobsBalanceAfterFirst)
      .to.be.equal(
        bobsBalanceBefore + 1n * amount,
        '#1 Balance of the recipient should be increased by 1 * amount',
      );

    await helper.wait.forParachainBlockNumber(executionBlock + periodic.period);

    const bobsBalanceAfterSecond = await helper.balance.getSubstrate(bob.address);
    expect(bobsBalanceAfterSecond)
      .to.be.equal(
        bobsBalanceBefore + 2n * amount,
        '#2 Balance of the recipient should be increased by 2 * amount',
      );
  });

  itSub('Can cancel a scheduled operation which has not yet taken effect', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'schd'});
    const token = await collection.mintToken(alice);

    const scheduledId = helper.arrange.makeScheduledId();
    const waitForBlocks = 4;

    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId})
      .nft.transferToken(alice, collection.collectionId, token.tokenId, {Substrate: bob.address});
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.scheduler.cancelScheduled(alice, scheduledId);

    await helper.wait.forParachainBlockNumber(executionBlock);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('Can cancel a periodic operation (transfer of funds)', async ({helper}) => {
    const waitForBlocks = 1;
    const periodic = {
      period: 3,
      repetitions: 2,
    };

    const scheduledId = helper.arrange.makeScheduledId();

    const amount = 1n * helper.balance.getOneTokenNominal();

    const bobsBalanceBefore = await helper.balance.getSubstrate(bob.address);

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId, periodic})
      .balance.transferToSubstrate(alice, bob.address, amount);
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.wait.forParachainBlockNumber(executionBlock);

    const bobsBalanceAfterFirst = await helper.balance.getSubstrate(bob.address);

    expect(bobsBalanceAfterFirst)
      .to.be.equal(
        bobsBalanceBefore + 1n * amount,
        '#1 Balance of the recipient should be increased by 1 * amount',
      );

    await helper.scheduler.cancelScheduled(alice, scheduledId);
    await helper.wait.forParachainBlockNumber(executionBlock + periodic.period);

    const bobsBalanceAfterSecond = await helper.balance.getSubstrate(bob.address);
    expect(bobsBalanceAfterSecond)
      .to.be.equal(
        bobsBalanceAfterFirst,
        '#2 Balance of the recipient should not be changed',
      );
  });

  itSched('scheduler will not insert more tasks than allowed', async (scheduleKind, {helper}) => {
    const maxScheduledPerBlock = 50;
    let fillScheduledIds = new Array(maxScheduledPerBlock);
    let extraScheduledId = undefined;

    if(scheduleKind == 'named') {
      const scheduledIds = helper.arrange.makeScheduledIds(maxScheduledPerBlock + 1);
      fillScheduledIds = scheduledIds.slice(0, maxScheduledPerBlock);
      extraScheduledId = scheduledIds[maxScheduledPerBlock];
    }

    // Since the dev node has Instant Seal,
    // we need a larger gap between the current block and the target one.
    //
    // We will schedule `maxScheduledPerBlock` transaction into the target block,
    // so we need at least `maxScheduledPerBlock`-wide gap.
    // We add some additional blocks to this gap to mitigate possible PolkadotJS delays.
    const waitForBlocks = await helper.arrange.isDevNode() ? maxScheduledPerBlock + 5 : 5;

    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks;

    const amount = 1n * helper.balance.getOneTokenNominal();

    const balanceBefore = await helper.balance.getSubstrate(bob.address);

    // Fill the target block
    for(let i = 0; i < maxScheduledPerBlock; i++) {
      await helper.scheduler.scheduleAt(executionBlock, {scheduledId: fillScheduledIds[i]})
        .balance.transferToSubstrate(superuser, bob.address, amount);
    }

    // Try to schedule a task into a full block
    await expect(helper.scheduler.scheduleAt(executionBlock, {scheduledId: extraScheduledId})
      .balance.transferToSubstrate(superuser, bob.address, amount))
      .to.be.rejectedWith(/scheduler\.AgendaIsExhausted/);

    await helper.wait.forParachainBlockNumber(executionBlock);

    const balanceAfter = await helper.balance.getSubstrate(bob.address);

    expect(balanceAfter > balanceBefore).to.be.true;

    const diff = balanceAfter - balanceBefore;
    expect(diff).to.be.equal(amount * BigInt(maxScheduledPerBlock));
  });

  itSched.ifWithPallets('Scheduled tasks are transactional', [Pallets.TestUtils], async (scheduleKind, {helper}) => {
    const scheduledId = scheduleKind == 'named' ? helper.arrange.makeScheduledId() : undefined;
    const waitForBlocks = 4;

    const initTestVal = 42;
    const changedTestVal = 111;

    await helper.testUtils.setTestValue(alice, initTestVal);

    await helper.scheduler.scheduleAfter<DevUniqueHelper>(waitForBlocks, {scheduledId})
      .testUtils.setTestValueAndRollback(alice, changedTestVal);
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.wait.forParachainBlockNumber(executionBlock);

    const testVal = await helper.testUtils.testValue();
    expect(testVal, 'The test value should NOT be commited')
      .to.be.equal(initTestVal);
  });

  itSched.ifWithPallets('Scheduled tasks should take correct fees', [Pallets.TestUtils], async function(scheduleKind, {helper}) {
    const scheduledId = scheduleKind == 'named' ? helper.arrange.makeScheduledId() : undefined;
    const waitForBlocks = 4;
    const periodic = {
      period: 2,
      repetitions: 2,
    };

    const dummyTx = helper.constructApiCall('api.tx.testUtils.justTakeFee', []);
    const scheduledLen = dummyTx.callIndex.length;

    const expectedScheduledFee = (await helper.getPaymentInfo(alice, dummyTx, scheduledLen))
      .partialFee.toBigInt();

    await helper.scheduler.scheduleAfter<DevUniqueHelper>(waitForBlocks, {scheduledId, periodic})
      .testUtils.justTakeFee(alice);
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    const aliceInitBalance = await helper.balance.getSubstrate(alice.address);
    let diff;

    await helper.wait.forParachainBlockNumber(executionBlock);

    const aliceBalanceAfterFirst = await helper.balance.getSubstrate(alice.address);
    expect(
      aliceBalanceAfterFirst < aliceInitBalance,
      '[after execution #1] Scheduled task should take a fee',
    ).to.be.true;

    diff = aliceInitBalance - aliceBalanceAfterFirst;
    expect(diff).to.be.equal(
      expectedScheduledFee,
      'Scheduled task should take the right amount of fees',
    );

    await helper.wait.forParachainBlockNumber(executionBlock + periodic.period);

    const aliceBalanceAfterSecond = await helper.balance.getSubstrate(alice.address);
    expect(
      aliceBalanceAfterSecond < aliceBalanceAfterFirst,
      '[after execution #2] Scheduled task should take a fee',
    ).to.be.true;

    diff = aliceBalanceAfterFirst - aliceBalanceAfterSecond;
    expect(diff).to.be.equal(
      expectedScheduledFee,
      'Scheduled task should take the right amount of fees',
    );
  });

  // Check if we can cancel a scheduled periodic operation
  // in the same block in which it is running
  itSub.ifWithPallets('Can cancel the periodic sheduled tx when the tx is running', [Pallets.TestUtils], async ({helper}) => {
    const currentBlockNumber = await helper.chain.getLatestBlockNumber();
    const blocksBeforeExecution = 10;
    const firstExecutionBlockNumber = currentBlockNumber + blocksBeforeExecution;

    const [
      scheduledId,
      scheduledCancelId,
    ] = helper.arrange.makeScheduledIds(2);

    const periodic = {
      period: 5,
      repetitions: 5,
    };

    const initTestVal = 0;
    const incTestVal = initTestVal + 1;
    const finalTestVal = initTestVal + 2;

    await helper.testUtils.setTestValue(alice, initTestVal);

    await helper.scheduler.scheduleAt<DevUniqueHelper>(firstExecutionBlockNumber, {scheduledId, periodic})
      .testUtils.incTestValue(alice);

    // Cancel the inc tx after 2 executions
    // *in the same block* in which the second execution is scheduled
    await helper.scheduler.scheduleAt(
      firstExecutionBlockNumber + periodic.period,
      {scheduledId: scheduledCancelId},
    ).scheduler.cancelScheduled(alice, scheduledId);

    await helper.wait.forParachainBlockNumber(firstExecutionBlockNumber);

    // execution #0
    expect(await helper.testUtils.testValue())
      .to.be.equal(incTestVal);

    await helper.wait.forParachainBlockNumber(firstExecutionBlockNumber + periodic.period);

    // execution #1
    expect(await helper.testUtils.testValue())
      .to.be.equal(finalTestVal);

    for(let i = 1; i < periodic.repetitions; i++) {
      await helper.wait.forParachainBlockNumber(firstExecutionBlockNumber + periodic.period * (i + 1));
      expect(await helper.testUtils.testValue())
        .to.be.equal(finalTestVal);
    }
  });

  itSub.ifWithPallets('A scheduled operation can cancel itself', [Pallets.TestUtils], async ({helper}) => {
    const scheduledId = helper.arrange.makeScheduledId();
    const waitForBlocks = 4;
    const periodic = {
      period: 2,
      repetitions: 5,
    };

    const initTestVal = 0;
    const maxTestVal = 2;

    await helper.testUtils.setTestValue(alice, initTestVal);

    await helper.scheduler.scheduleAfter<DevUniqueHelper>(waitForBlocks, {scheduledId, periodic})
      .testUtils.selfCancelingInc(alice, scheduledId, maxTestVal);
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.wait.forParachainBlockNumber(executionBlock);

    // execution #0
    expect(await helper.testUtils.testValue())
      .to.be.equal(initTestVal + 1);

    await helper.wait.forParachainBlockNumber(executionBlock + periodic.period);

    // execution #1
    expect(await helper.testUtils.testValue())
      .to.be.equal(initTestVal + 2);

    await helper.wait.forParachainBlockNumber(executionBlock + 2 * periodic.period);

    // <canceled>
    expect(await helper.testUtils.testValue())
      .to.be.equal(initTestVal + 2);
  });

  itSub('Root can cancel any scheduled operation', async ({helper}) => {
    const collection = await helper.nft.mintCollection(bob, {tokenPrefix: 'schd'});
    const token = await collection.mintToken(bob);

    const scheduledId = helper.arrange.makeScheduledId();
    const waitForBlocks = 4;

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId})
      .nft.transferToken(bob, collection.collectionId, token.tokenId, {Substrate: alice.address});
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.getSudo().scheduler.cancelScheduled(superuser, scheduledId);

    await helper.wait.forParachainBlockNumber(executionBlock);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSched('Root can set prioritized scheduled operation', async (scheduleKind, {helper}) => {
    const scheduledId = scheduleKind == 'named' ? helper.arrange.makeScheduledId() : undefined;
    const waitForBlocks = 4;

    const amount = 42n * helper.balance.getOneTokenNominal();

    const balanceBefore = await helper.balance.getSubstrate(charlie.address);

    await helper.getSudo()
      .scheduler.scheduleAfter(waitForBlocks, {scheduledId, priority: 42})
      .balance.forceTransferToSubstrate(superuser, bob.address, charlie.address, amount);
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.wait.forParachainBlockNumber(executionBlock);

    const balanceAfter = await helper.balance.getSubstrate(charlie.address);

    expect(balanceAfter > balanceBefore).to.be.true;

    const diff = balanceAfter - balanceBefore;
    expect(diff).to.be.equal(amount);
  });

  itSub("Root can change scheduled operation's priority", async ({helper}) => {
    const collection = await helper.nft.mintCollection(bob, {tokenPrefix: 'schd'});
    const token = await collection.mintToken(bob);

    const scheduledId = helper.arrange.makeScheduledId();
    const waitForBlocks = 6;

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId})
      .nft.transferToken(bob, collection.collectionId, token.tokenId, {Substrate: alice.address});
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    const priority = 112;
    await helper.getSudo().scheduler.changePriority(superuser, scheduledId, priority);

    const priorityChanged = await helper.wait.expectEvent(waitForBlocks, helper.getApi().events.uniqueScheduler.PriorityChanged) as any;

    const [blockNumber, index] = priorityChanged.task;
    expect(blockNumber.toNumber()).to.be.equal(executionBlock);
    expect(index.toNumber()).to.be.equal(0);

    expect(priorityChanged.priority.toNumber()).to.be.equal(priority);
  });

  itSub('Prioritized operations execute in valid order', async ({helper}) => {
    const [
      scheduledFirstId,
      scheduledSecondId,
    ] = helper.arrange.makeScheduledIds(2);

    const currentBlockNumber = await helper.chain.getLatestBlockNumber();
    const blocksBeforeExecution = 6;
    const firstExecutionBlockNumber = currentBlockNumber + blocksBeforeExecution;

    const prioHigh = 0;
    const prioLow = 255;

    const periodic = {
      period: 6,
      repetitions: 2,
    };

    const amount = 1n * helper.balance.getOneTokenNominal();

    // Scheduler a task with a lower priority first, then with a higher priority
    await helper.getSudo().scheduler.scheduleAt(firstExecutionBlockNumber, {
      scheduledId: scheduledFirstId,
      priority: prioLow,
      periodic,
    }).balance.forceTransferToSubstrate(superuser, alice.address, bob.address, amount);

    await helper.getSudo().scheduler.scheduleAt(firstExecutionBlockNumber, {
      scheduledId: scheduledSecondId,
      priority: prioHigh,
      periodic,
    }).balance.forceTransferToSubstrate(superuser, alice.address, bob.address, amount);

    const capture = await helper.arrange.captureEvents('scheduler', 'Dispatched');

    await helper.wait.forParachainBlockNumber(firstExecutionBlockNumber);

    // Flip priorities
    await helper.getSudo().scheduler.changePriority(superuser, scheduledFirstId, prioHigh);
    await helper.getSudo().scheduler.changePriority(superuser, scheduledSecondId, prioLow);

    await helper.wait.forParachainBlockNumber(firstExecutionBlockNumber + periodic.period);

    const dispatchEvents = capture.extractCapturedEvents();
    expect(dispatchEvents.length).to.be.equal(4);

    const dispatchedIds = dispatchEvents.map(r => r.event.data[1].toString());

    const firstExecuctionIds = [dispatchedIds[0], dispatchedIds[1]];
    const secondExecuctionIds = [dispatchedIds[2], dispatchedIds[3]];

    expect(firstExecuctionIds[0]).to.be.equal(scheduledSecondId);
    expect(firstExecuctionIds[1]).to.be.equal(scheduledFirstId);

    expect(secondExecuctionIds[0]).to.be.equal(scheduledFirstId);
    expect(secondExecuctionIds[1]).to.be.equal(scheduledSecondId);
  });

  itSched('Periodic operations always can be rescheduled', async (scheduleKind, {helper}) => {
    const maxScheduledPerBlock = 50;
    const numFilledBlocks = 3;
    const ids = helper.arrange.makeScheduledIds(numFilledBlocks * maxScheduledPerBlock + 1);
    const periodicId = scheduleKind == 'named' ? ids[0] : undefined;
    const fillIds = ids.slice(1);

    const fillScheduleFn = scheduleKind == 'named' ? 'scheduleNamed' : 'schedule';

    const initTestVal = 0;
    const firstExecTestVal = 1;
    const secondExecTestVal = 2;
    await helper.testUtils.setTestValue(alice, initTestVal);

    const currentBlockNumber = await helper.chain.getLatestBlockNumber();
    const blocksBeforeExecution = 8;
    const firstExecutionBlockNumber = currentBlockNumber + blocksBeforeExecution;

    const period = 5;

    const periodic = {
      period,
      repetitions: 2,
    };

    // Fill `numFilledBlocks` blocks beginning from the block in which the second execution should occur
    const txs = [];
    for(let offset = 0; offset < numFilledBlocks; offset ++) {
      for(let i = 0; i < maxScheduledPerBlock; i++) {

        const scheduledTx = helper.constructApiCall('api.tx.balances.transfer', [bob.address, 1n]);

        const when = firstExecutionBlockNumber + period + offset;
        const mandatoryArgs = [when, null, null, scheduledTx];
        const scheduleArgs = scheduleKind == 'named'
          ? [fillIds[i + offset * maxScheduledPerBlock], ...mandatoryArgs]
          : mandatoryArgs;

        const tx = helper.constructApiCall(`api.tx.scheduler.${fillScheduleFn}`, scheduleArgs);

        txs.push(tx);
      }
    }
    await helper.executeExtrinsic(alice, 'api.tx.testUtils.batchAll', [txs], true);

    await helper.scheduler.scheduleAt<DevUniqueHelper>(firstExecutionBlockNumber, {
      scheduledId: periodicId,
      periodic,
    }).testUtils.incTestValue(alice);

    await helper.wait.forParachainBlockNumber(firstExecutionBlockNumber);
    expect(await helper.testUtils.testValue()).to.be.equal(firstExecTestVal);

    await helper.wait.forParachainBlockNumber(firstExecutionBlockNumber + period + numFilledBlocks);

    // The periodic operation should be postponed by `numFilledBlocks`
    for(let i = 0; i < numFilledBlocks; i++) {
      expect(await helper.testUtils.testValue(firstExecutionBlockNumber + period + i)).to.be.equal(firstExecTestVal);
    }

    // After the `numFilledBlocks` the periodic operation will eventually be executed
    expect(await helper.testUtils.testValue()).to.be.equal(secondExecTestVal);
  });

  itSched('scheduled operations does not change nonce', async (scheduleKind, {helper}) => {
    const scheduledId = scheduleKind == 'named' ? helper.arrange.makeScheduledId() : undefined;
    const blocksBeforeExecution = 4;

    await helper.scheduler
      .scheduleAfter<DevUniqueHelper>(blocksBeforeExecution, {scheduledId})
      .balance.transferToSubstrate(alice, bob.address, 1n);
    const executionBlock = await helper.chain.getLatestBlockNumber() + blocksBeforeExecution + 1;

    const initNonce = await helper.chain.getNonce(alice.address);

    await helper.wait.forParachainBlockNumber(executionBlock);

    const finalNonce = await helper.chain.getNonce(alice.address);

    expect(initNonce).to.be.equal(finalNonce);
  });
});

describe('Negative Test: Scheduling', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.UniqueScheduler]);

      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);

      await helper.testUtils.enable();
    });
  });

  itSub("Can't overwrite a scheduled ID", async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'schd'});
    const token = await collection.mintToken(alice);

    const scheduledId = helper.arrange.makeScheduledId();
    const waitForBlocks = 4;

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId})
      .nft.transferToken(alice, collection.collectionId, token.tokenId, {Substrate: bob.address});
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    const scheduled = helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId});
    await expect(scheduled.balance.transferToSubstrate(alice, bob.address, 1n * helper.balance.getOneTokenNominal()))
      .to.be.rejectedWith(/scheduler\.FailedToSchedule/);

    const bobsBalanceBefore = await helper.balance.getSubstrate(bob.address);

    await helper.wait.forParachainBlockNumber(executionBlock);

    const bobsBalanceAfter = await helper.balance.getSubstrate(bob.address);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(bobsBalanceBefore).to.be.equal(bobsBalanceAfter);
  });

  itSub("Can't cancel an operation which is not scheduled", async ({helper}) => {
    const scheduledId = helper.arrange.makeScheduledId();
    await expect(helper.scheduler.cancelScheduled(alice, scheduledId))
      .to.be.rejectedWith(/scheduler\.NotFound/);
  });

  itSub("Can't cancel a non-owned scheduled operation", async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {tokenPrefix: 'schd'});
    const token = await collection.mintToken(alice);

    const scheduledId = helper.arrange.makeScheduledId();
    const waitForBlocks = 4;

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId})
      .nft.transferToken(alice, collection.collectionId, token.tokenId, {Substrate: bob.address});
    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await expect(helper.scheduler.cancelScheduled(bob, scheduledId))
      .to.be.rejectedWith(/BadOrigin/);

    await helper.wait.forParachainBlockNumber(executionBlock);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSched("Regular user can't set prioritized scheduled operation", async (scheduleKind, {helper}) => {
    const scheduledId = scheduleKind == 'named' ? helper.arrange.makeScheduledId() : undefined;
    const waitForBlocks = 4;

    const amount = 42n * helper.balance.getOneTokenNominal();

    const balanceBefore = await helper.balance.getSubstrate(bob.address);

    const scheduled = helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId, priority: 42});

    await expect(scheduled.balance.transferToSubstrate(alice, bob.address, amount))
      .to.be.rejectedWith(/BadOrigin/);

    const executionBlock = await helper.chain.getLatestBlockNumber() + waitForBlocks + 1;

    await helper.wait.forParachainBlockNumber(executionBlock);

    const balanceAfter = await helper.balance.getSubstrate(bob.address);

    expect(balanceAfter).to.be.equal(balanceBefore);
  });

  itSub("Regular user can't change scheduled operation's priority", async ({helper}) => {
    const collection = await helper.nft.mintCollection(bob, {tokenPrefix: 'schd'});
    const token = await collection.mintToken(bob);

    const scheduledId = helper.arrange.makeScheduledId();
    const waitForBlocks = 4;

    await helper.scheduler.scheduleAfter(waitForBlocks, {scheduledId})
      .nft.transferToken(bob, collection.collectionId, token.tokenId, {Substrate: alice.address});

    const priority = 112;
    await expect(helper.scheduler.changePriority(alice, scheduledId, priority))
      .to.be.rejectedWith(/BadOrigin/);

    await helper.wait.expectEvent(waitForBlocks, helper.getApi().events.uniqueScheduler.PriorityChanged);
  });
});

// Implementation of the functionality tested here was postponed/shelved
describe.skip('Sponsoring scheduling', () => {
  // let alice: IKeyringPair;
  // let bob: IKeyringPair;

  // before(async() => {
  //   await usingApi(async (_, privateKey) => {
  //     alice = privateKey('//Alice');
  //     bob = privateKey('//Bob');
  //   });
  // });

  it('Can sponsor scheduling a transaction', async () => {
    // const collectionId = await createCollectionExpectSuccess();
    // await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    // await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    // await usingApi(async api => {
    //   const scheduledId = await makeScheduledId();
    //   const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

    //   const bobBalanceBefore = await getFreeBalance(bob);
    //   const waitForBlocks = 4;
    //   // no need to wait to check, fees must be deducted on scheduling, immediately
    //   await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, 0, waitForBlocks, scheduledId);
    //   const bobBalanceAfter = await getFreeBalance(bob);
    //   // expect(aliceBalanceAfter == aliceBalanceBefore).to.be.true;
    //   expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    //   // wait for sequentiality matters
    //   await waitNewBlocks(waitForBlocks - 1);
    // });
  });

  it('Schedules and dispatches a transaction even if the caller has no funds at the time of the dispatch', async () => {
    // await usingApi(async (api, privateKey) => {
    //   // Find an empty, unused account
    //   const zeroBalance = await findUnusedAddress(api, privateKey);

    //   const collectionId = await createCollectionExpectSuccess();

    //   // Add zeroBalance address to allow list
    //   await enablePublicMintingExpectSuccess(alice, collectionId);
    //   await addToAllowListExpectSuccess(alice, collectionId, zeroBalance.address);

    //   // Grace zeroBalance with money, enough to cover future transactions
    //   const balanceTx = api.tx.balances.transfer(zeroBalance.address, 1n * UNIQUE);
    //   await submitTransactionAsync(alice, balanceTx);

    //   // Mint a fresh NFT
    //   const tokenId = await createItemExpectSuccess(zeroBalance, collectionId, 'NFT');
    //   const scheduledId = await makeScheduledId();

    //   // Schedule transfer of the NFT a few blocks ahead
    //   const waitForBlocks = 5;
    //   await scheduleTransferExpectSuccess(api, collectionId, tokenId, zeroBalance, alice, 1, waitForBlocks, scheduledId);

    //   // Get rid of the account's funds before the scheduled transaction takes place
    //   const balanceTx2 = api.tx.balances.transfer(alice.address, UNIQUE * 68n / 100n);
    //   const events = await submitTransactionAsync(zeroBalance, balanceTx2);
    //   expect(getGenericResult(events).success).to.be.true;
    //   /*const emptyBalanceTx = api.tx.balances.setBalance(zeroBalance.address, 0, 0); // do not null reserved?
    //   const sudoTx = api.tx.sudo.sudo(emptyBalanceTx as any);
    //   const events = await submitTransactionAsync(alice, sudoTx);
    //   expect(getGenericResult(events).success).to.be.true;*/

    //   // Wait for a certain number of blocks, discarding the ones that already happened while accepting the late transactions
    //   await waitNewBlocks(waitForBlocks - 3);

    //   expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(alice.address));
    // });
  });

  it('Sponsor going bankrupt does not impact a scheduled transaction', async () => {
    // const collectionId = await createCollectionExpectSuccess();

    // await usingApi(async (api, privateKey) => {
    //   const zeroBalance = await findUnusedAddress(api, privateKey);
    //   const balanceTx = api.tx.balances.transfer(zeroBalance.address, 1n * UNIQUE);
    //   await submitTransactionAsync(alice, balanceTx);

    //   await setCollectionSponsorExpectSuccess(collectionId, zeroBalance.address);
    //   await confirmSponsorshipByKeyExpectSuccess(collectionId, zeroBalance);

    //   const scheduledId = await makeScheduledId();
    //   const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

    //   const waitForBlocks = 5;
    //   await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, zeroBalance, 1, waitForBlocks, scheduledId);

    //   const emptyBalanceSponsorTx = api.tx.balances.setBalance(zeroBalance.address, 0, 0);
    //   const sudoTx = api.tx.sudo.sudo(emptyBalanceSponsorTx as any);
    //   const events = await submitTransactionAsync(alice, sudoTx);
    //   expect(getGenericResult(events).success).to.be.true;

    //   // Wait for a certain number of blocks, save for the ones that already happened while accepting the late transactions
    //   await waitNewBlocks(waitForBlocks - 3);

    //   expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(zeroBalance.address));
    // });
  });

  it('Exceeding sponsor rate limit without having enough funds prevents scheduling a periodic transaction', async () => {
    // const collectionId = await createCollectionExpectSuccess();
    // await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    // await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    // await usingApi(async (api, privateKey) => {
    //   const zeroBalance = await findUnusedAddress(api, privateKey);

    //   await enablePublicMintingExpectSuccess(alice, collectionId);
    //   await addToAllowListExpectSuccess(alice, collectionId, zeroBalance.address);

    //   const bobBalanceBefore = await getFreeBalance(bob);

    //   const createData = {nft: {const_data: [], variable_data: []}};
    //   const creationTx = api.tx.unique.createItem(collectionId, normalizeAccountId(zeroBalance), createData as any);
    //   const scheduledId = await makeScheduledId();

    //   /*const badTransaction = async function () {
    //     await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
    //   };
    //   await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees');*/

    //   await expect(scheduleAfter(api, creationTx, zeroBalance, 3, scheduledId, 1, 3)).to.be.rejectedWith(/Inability to pay some fees/);

    //   expect(await getFreeBalance(bob)).to.be.equal(bobBalanceBefore);
    // });
  });
});
