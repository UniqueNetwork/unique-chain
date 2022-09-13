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

import {
  default as usingApi,
  submitTransactionAsync,
  submitTransactionExpectFailAsync,
} from '../substrate/substrate-api';
import {
  createItemExpectSuccess,
  createCollectionExpectSuccess,
  scheduleTransferExpectSuccess,
  setCollectionSponsorExpectSuccess,
  confirmSponsorshipExpectSuccess,
  findUnusedAddress,
  UNIQUE,
  enablePublicMintingExpectSuccess,
  addToAllowListExpectSuccess,
  waitNewBlocks,
  makeScheduledId,
  normalizeAccountId,
  getTokenOwner,
  getGenericResult,
  getFreeBalance,
  confirmSponsorshipByKeyExpectSuccess,
  scheduleExpectFailure,
  scheduleAfter,
} from './util/helpers';
import {expect, itSub, Pallets, usingPlaygrounds} from './util/playgrounds';
import {IKeyringPair} from '@polkadot/types/types';

describe('Scheduling token and balance transfers', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  itSub.ifWithPallets('Can delay a transfer of an owned token', [Pallets.Scheduler], async ({helper}) => {
    const collection = await helper.nft.mintDefaultCollection(alice);
    const token = await collection.mintToken(alice);
    const schedulerId = await helper.scheduler.makeScheduledId();
    const blocksBeforeExecution = 4;

    await token.scheduleAfter(schedulerId, blocksBeforeExecution)
      .transfer(alice, {Substrate: bob.address});

    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});

    await helper.wait.newBlocks(blocksBeforeExecution + 1);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSub.ifWithPallets('Can transfer funds periodically', [Pallets.Scheduler], async ({helper}) => {
    const scheduledId = await helper.scheduler.makeScheduledId();
    const waitForBlocks = 1;

    const amount = 1n * UNIQUE;
    const periodic = {
      period: 2,
      repetitions: 2,
    };

    const bobsBalanceBefore = await helper.balance.getSubstrate(bob.address);

    await helper.scheduler.scheduleAfter(scheduledId, waitForBlocks, {periodic})
      .balance.transferToSubstrate(alice, bob.address, amount);

    await helper.wait.newBlocks(waitForBlocks + 1);

    const bobsBalanceAfterFirst = await helper.balance.getSubstrate(bob.address);
    expect(bobsBalanceAfterFirst)
      .to.be.equal(
        bobsBalanceBefore + 1n * amount,
        '#1 Balance of the recipient should be increased by 1 * amount',
      );

    await helper.wait.newBlocks(periodic.period);

    const bobsBalanceAfterSecond = await helper.balance.getSubstrate(bob.address);
    expect(bobsBalanceAfterSecond)
      .to.be.equal(
        bobsBalanceBefore + 2n * amount,
        '#2 Balance of the recipient should be increased by 2 * amount',
      );
  });

  itSub.ifWithPallets('Can cancel a scheduled operation which has not yet taken effect', [Pallets.Scheduler], async ({helper}) => {
    const collection = await helper.nft.mintDefaultCollection(alice);
    const token = await collection.mintToken(alice);

    const scheduledId = await helper.scheduler.makeScheduledId();
    const waitForBlocks = 4;

    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});

    await token.scheduleAfter(scheduledId, waitForBlocks)
      .transfer(alice, {Substrate: bob.address});

    await helper.scheduler.cancelScheduled(alice, scheduledId);

    await waitNewBlocks(waitForBlocks + 1);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub.ifWithPallets('Can cancel a periodic operation (transfer of funds)', [Pallets.Scheduler], async ({helper}) => {
    const waitForBlocks = 1;
    const periodic = {
      period: 3,
      repetitions: 2,
    };

    const scheduledId = await helper.scheduler.makeScheduledId();

    const amount = 1n * UNIQUE;

    const bobsBalanceBefore = await helper.balance.getSubstrate(bob.address);

    await helper.scheduler.scheduleAfter(scheduledId, waitForBlocks, {periodic})
      .balance.transferToSubstrate(alice, bob.address, amount);

    await helper.wait.newBlocks(waitForBlocks + 1);

    const bobsBalanceAfterFirst = await helper.balance.getSubstrate(bob.address);

    expect(bobsBalanceAfterFirst)
      .to.be.equal(
        bobsBalanceBefore + 1n * amount,
        '#1 Balance of the recipient should be increased by 1 * amount',
      );

    await helper.scheduler.cancelScheduled(alice, scheduledId);
    await helper.wait.newBlocks(periodic.period);

    const bobsBalanceAfterSecond = await helper.balance.getSubstrate(bob.address);
    expect(bobsBalanceAfterSecond)
      .to.be.equal(
        bobsBalanceAfterFirst,
        '#2 Balance of the recipient should not be changed',
      );
  });

  itSub.ifWithPallets('Scheduled tasks are transactional', [Pallets.Scheduler, Pallets.TestUtils], async ({helper}) => {
    const scheduledId = await helper.scheduler.makeScheduledId();
    const waitForBlocks = 4;

    const initTestVal = 42;
    const changedTestVal = 111;

    await helper.executeExtrinsic(
      alice,
      'api.tx.testUtils.setTestValue',
      [initTestVal],
      true,
    );

    await helper.scheduler.scheduleAfter(scheduledId, waitForBlocks)
      .executeExtrinsic(
        alice,
        'api.tx.testUtils.setTestValueAndRollback',
        [changedTestVal],
        true,
      );

    await helper.wait.newBlocks(waitForBlocks + 1);

    const testVal = (await helper.api!.query.testUtils.testValue()).toNumber();
    expect(testVal, 'The test value should NOT be commited')
      .to.be.equal(initTestVal);
  });

  itSub.ifWithPallets('Scheduled tasks should take correct fees', [Pallets.Scheduler, Pallets.TestUtils], async function({helper}) {
    const scheduledId = await helper.scheduler.makeScheduledId();
    const waitForBlocks = 8;
    const periodic = {
      period: 2,
      repetitions: 2,
    };

    const dummyTx = helper.constructApiCall('api.tx.testUtils.justTakeFee', []);
    const scheduledLen = dummyTx.callIndex.length;

    const expectedScheduledFee = (await helper.getPaymentInfo(alice, dummyTx, scheduledLen))
      .partialFee.toBigInt();

    await helper.scheduler.scheduleAfter(scheduledId, waitForBlocks, {periodic})
      .executeExtrinsic(alice, 'api.tx.testUtils.justTakeFee', [], true);

    await helper.wait.newBlocks(1);

    const aliceInitBalance = await helper.balance.getSubstrate(alice.address);
    let diff;

    await helper.wait.newBlocks(waitForBlocks);

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

    await helper.wait.newBlocks(periodic.period);

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
  itSub.ifWithPallets('Can cancel the periodic sheduled tx when the tx is running', [Pallets.Scheduler, Pallets.TestUtils], async ({helper}) => {
    const currentBlockNumber = await helper.chain.getLatestBlockNumber();
    const blocksBeforeExecution = 10;
    const firstExecutionBlockNumber = currentBlockNumber + blocksBeforeExecution;

    const [
      scheduledId,
      scheduledCancelId,
    ] = await helper.scheduler.makeScheduledIds(2);

    const periodic = {
      period: 5,
      repetitions: 5,
    };

    const initTestVal = 0;
    const incTestVal = initTestVal + 1;
    const finalTestVal = initTestVal + 2;

    await helper.executeExtrinsic(
      alice,
      'api.tx.testUtils.setTestValue',
      [initTestVal],
      true,
    );

    await helper.scheduler.scheduleAt(scheduledId, firstExecutionBlockNumber, {periodic})
      .executeExtrinsic(
        alice,
        'api.tx.testUtils.incTestValue',
        [],
        true,
      );

    // Cancel the inc tx after 2 executions
    // *in the same block* in which the second execution is scheduled
    await helper.scheduler.scheduleAt(scheduledCancelId, firstExecutionBlockNumber + periodic.period)
      .scheduler.cancelScheduled(alice, scheduledId);

    await helper.wait.newBlocks(blocksBeforeExecution);

    // execution #0
    expect((await helper.api!.query.testUtils.testValue()).toNumber())
      .to.be.equal(incTestVal);

    await helper.wait.newBlocks(periodic.period);

    // execution #1
    expect((await helper.api!.query.testUtils.testValue()).toNumber())
      .to.be.equal(finalTestVal);

    for (let i = 1; i < periodic.repetitions; i++) {
      await waitNewBlocks(periodic.period);
      expect((await helper.api!.query.testUtils.testValue()).toNumber())
        .to.be.equal(finalTestVal);
    }
  });

  itSub.ifWithPallets('A scheduled operation can cancel itself', [Pallets.Scheduler, Pallets.TestUtils], async ({helper}) => {
    const scheduledId = await helper.scheduler.makeScheduledId();
    const waitForBlocks = 8;
    const periodic = {
      period: 2,
      repetitions: 5,
    };

    const initTestVal = 0;
    const maxTestVal = 2;

    await helper.executeExtrinsic(
      alice,
      'api.tx.testUtils.setTestValue',
      [initTestVal],
      true,
    );

    await helper.scheduler.scheduleAfter(scheduledId, waitForBlocks, {periodic})
      .executeExtrinsic(
        alice,
        'api.tx.testUtils.selfCancelingInc',
        [scheduledId, maxTestVal],
        true,
      );

    await helper.wait.newBlocks(waitForBlocks + 1);

    // execution #0
    expect((await helper.api!.query.testUtils.testValue()).toNumber())
      .to.be.equal(initTestVal + 1);

    await helper.wait.newBlocks(periodic.period);

    // execution #1
    expect((await helper.api!.query.testUtils.testValue()).toNumber())
      .to.be.equal(initTestVal + 2);

    await helper.wait.newBlocks(periodic.period);

    // <canceled>
    expect((await helper.api!.query.testUtils.testValue()).toNumber())
      .to.be.equal(initTestVal + 2);
  });
});

describe('Negative Test: Scheduling', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  itSub.ifWithPallets("Can't overwrite a scheduled ID", [Pallets.Scheduler, Pallets.TestUtils], async ({helper}) => {
    const collection = await helper.nft.mintDefaultCollection(alice);
    const token = await collection.mintToken(alice);

    const scheduledId = await helper.scheduler.makeScheduledId();
    const waitForBlocks = 4;

    await token.scheduleAfter(scheduledId, waitForBlocks)
      .transfer(alice, {Substrate: bob.address});

    await expect(helper.scheduler.scheduleAfter(scheduledId, waitForBlocks)
      .balance.transferToSubstrate(alice, bob.address, 1n * UNIQUE))
      .to.be.rejectedWith(/scheduler\.FailedToSchedule/);

    const bobsBalanceBefore = await helper.balance.getSubstrate(bob.address);

    await helper.wait.newBlocks(waitForBlocks + 1);

    const bobsBalanceAfter = await helper.balance.getSubstrate(bob.address);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
    expect(bobsBalanceBefore).to.be.equal(bobsBalanceAfter);
  });

  itSub.ifWithPallets("Can't cancel an operation which is not scheduled", [Pallets.Scheduler, Pallets.TestUtils], async ({helper}) => {
    const scheduledId = await helper.scheduler.makeScheduledId();
    await expect(helper.scheduler.cancelScheduled(alice, scheduledId))
      .to.be.rejectedWith(/scheduler\.NotFound/);
  });

  itSub.ifWithPallets("Can't cancel a non-owned scheduled operation", [Pallets.Scheduler, Pallets.TestUtils], async ({helper}) => {
    const collection = await helper.nft.mintDefaultCollection(alice);
    const token = await collection.mintToken(alice);

    const scheduledId = await helper.scheduler.makeScheduledId();
    const waitForBlocks = 8;

    await token.scheduleAfter(scheduledId, waitForBlocks)
      .transfer(alice, {Substrate: bob.address});

    await expect(helper.scheduler.cancelScheduled(bob, scheduledId))
      .to.be.rejectedWith(/badOrigin/);

    await helper.wait.newBlocks(waitForBlocks + 1);

    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });
});

// Implementation of the functionality tested here was postponed/shelved
describe.skip('Sponsoring scheduling', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async() => {
    await usingApi(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Can sponsor scheduling a transaction', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async api => {
      const scheduledId = await makeScheduledId();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      const bobBalanceBefore = await getFreeBalance(bob);
      const waitForBlocks = 4;
      // no need to wait to check, fees must be deducted on scheduling, immediately
      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, 0, waitForBlocks, scheduledId);
      const bobBalanceAfter = await getFreeBalance(bob);
      // expect(aliceBalanceAfter == aliceBalanceBefore).to.be.true;
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
      // wait for sequentiality matters
      await waitNewBlocks(waitForBlocks - 1);
    });
  });

  it('Schedules and dispatches a transaction even if the caller has no funds at the time of the dispatch', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      // Find an empty, unused account
      const zeroBalance = await findUnusedAddress(api, privateKeyWrapper);

      const collectionId = await createCollectionExpectSuccess();

      // Add zeroBalance address to allow list
      await enablePublicMintingExpectSuccess(alice, collectionId);
      await addToAllowListExpectSuccess(alice, collectionId, zeroBalance.address);

      // Grace zeroBalance with money, enough to cover future transactions
      const balanceTx = api.tx.balances.transfer(zeroBalance.address, 1n * UNIQUE);
      await submitTransactionAsync(alice, balanceTx);

      // Mint a fresh NFT
      const tokenId = await createItemExpectSuccess(zeroBalance, collectionId, 'NFT');
      const scheduledId = await makeScheduledId();

      // Schedule transfer of the NFT a few blocks ahead
      const waitForBlocks = 5;
      await scheduleTransferExpectSuccess(api, collectionId, tokenId, zeroBalance, alice, 1, waitForBlocks, scheduledId);

      // Get rid of the account's funds before the scheduled transaction takes place
      const balanceTx2 = api.tx.balances.transfer(alice.address, UNIQUE * 68n / 100n);
      const events = await submitTransactionAsync(zeroBalance, balanceTx2);
      expect(getGenericResult(events).success).to.be.true;
      /*const emptyBalanceTx = api.tx.balances.setBalance(zeroBalance.address, 0, 0); // do not null reserved?
      const sudoTx = api.tx.sudo.sudo(emptyBalanceTx as any);
      const events = await submitTransactionAsync(alice, sudoTx);
      expect(getGenericResult(events).success).to.be.true;*/

      // Wait for a certain number of blocks, discarding the ones that already happened while accepting the late transactions
      await waitNewBlocks(waitForBlocks - 3);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(alice.address));
    });
  });

  it('Sponsor going bankrupt does not impact a scheduled transaction', async () => {
    const collectionId = await createCollectionExpectSuccess();

    await usingApi(async (api, privateKeyWrapper) => {
      const zeroBalance = await findUnusedAddress(api, privateKeyWrapper);
      const balanceTx = api.tx.balances.transfer(zeroBalance.address, 1n * UNIQUE);
      await submitTransactionAsync(alice, balanceTx);

      await setCollectionSponsorExpectSuccess(collectionId, zeroBalance.address);
      await confirmSponsorshipByKeyExpectSuccess(collectionId, zeroBalance);

      const scheduledId = await makeScheduledId();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      const waitForBlocks = 5;
      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, zeroBalance, 1, waitForBlocks, scheduledId);

      const emptyBalanceSponsorTx = api.tx.balances.setBalance(zeroBalance.address, 0, 0);
      const sudoTx = api.tx.sudo.sudo(emptyBalanceSponsorTx as any);
      const events = await submitTransactionAsync(alice, sudoTx);
      expect(getGenericResult(events).success).to.be.true;

      // Wait for a certain number of blocks, save for the ones that already happened while accepting the late transactions
      await waitNewBlocks(waitForBlocks - 3);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(zeroBalance.address));
    });
  });

  it('Exceeding sponsor rate limit without having enough funds prevents scheduling a periodic transaction', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async (api, privateKeyWrapper) => {
      const zeroBalance = await findUnusedAddress(api, privateKeyWrapper);

      await enablePublicMintingExpectSuccess(alice, collectionId);
      await addToAllowListExpectSuccess(alice, collectionId, zeroBalance.address);

      const bobBalanceBefore = await getFreeBalance(bob);

      const createData = {nft: {const_data: [], variable_data: []}};
      const creationTx = api.tx.unique.createItem(collectionId, normalizeAccountId(zeroBalance), createData as any);
      const scheduledId = await makeScheduledId();

      /*const badTransaction = async function () {
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };
      await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees');*/

      await expect(scheduleAfter(api, creationTx, zeroBalance, 3, scheduledId, 1, 3)).to.be.rejectedWith(/Inability to pay some fees/);

      expect(await getFreeBalance(bob)).to.be.equal(bobBalanceBefore);
    });
  });
});
