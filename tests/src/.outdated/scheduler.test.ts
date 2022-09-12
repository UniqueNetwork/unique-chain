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

import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  default as usingApi,
  executeTransaction,
  submitTransactionAsync,
  submitTransactionExpectFailAsync,
} from '../substrate/substrate-api';
import {
  createItemExpectSuccess,
  createCollectionExpectSuccess,
  scheduleTransferExpectSuccess,
  scheduleTransferAndWaitExpectSuccess,
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
  scheduleTransferFundsExpectSuccess,
  getFreeBalance,
  confirmSponsorshipByKeyExpectSuccess,
  scheduleExpectFailure,
  scheduleAfter,
  cancelScheduled,
  requirePallets,
  Pallets,
  getBlockNumber,
  scheduleAt,
} from '../deprecated-helpers/helpers';
import {IKeyringPair, SignatureOptions} from '@polkadot/types/types';
import {RuntimeDispatchInfo} from '@polkadot/types/interfaces';
import {ApiPromise} from '@polkadot/api';
import {objectSpread} from '@polkadot/util';

chai.use(chaiAsPromised);

// Check that there are no failing Dispatched events in the block
function checkForFailedSchedulerEvents(api: ApiPromise, events: any[]) {
  return new Promise((res, rej) => {
    let schedulerEventPresent = false;
    
    for (const {event} of events) {
      if (api.events.scheduler.Dispatched.is(event)) {
        schedulerEventPresent = true;
        const result = event.data.result;
        if (result.isErr) {
          const decoded = api.registry.findMetaError(result.asErr.asModule);
          const {method, section} = decoded;
          rej(new Error(`${section}.${method}`));
        }
      }
    }
    res(schedulerEventPresent);
  });
}

describe('Scheduling token and balance transfers', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await requirePallets(this, [Pallets.Scheduler]);

    await usingApi(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });


  it('Can delay a transfer of an owned token', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const scheduledId = await makeScheduledId();

      await scheduleTransferAndWaitExpectSuccess(api, collectionId, tokenId, alice, bob, 1, 4, scheduledId);
    });
  });

  it('Can transfer funds periodically', async () => {
    await usingApi(async api => {
      const scheduledId = await makeScheduledId();
      const waitForBlocks = 1;
      const period = 2;
      const repetitions = 2;

      const amount = 1n * UNIQUE;

      await scheduleTransferFundsExpectSuccess(api, amount, alice, bob, waitForBlocks, scheduledId, period, repetitions);
      const bobsBalanceBefore = await getFreeBalance(bob);

      await waitNewBlocks(waitForBlocks + 1);
      const bobsBalanceAfterFirst = await getFreeBalance(bob);
      expect(bobsBalanceAfterFirst)
        .to.be.equal(
          bobsBalanceBefore + 1n * amount,
          '#1 Balance of the recipient should be increased by 1 * amount',
        );

      await waitNewBlocks(period);
      const bobsBalanceAfterSecond = await getFreeBalance(bob);
      expect(bobsBalanceAfterSecond)
        .to.be.equal(
          bobsBalanceBefore + 2n * amount,
          '#2 Balance of the recipient should be increased by 2 * amount',
        );
    });
  });

  it('Can cancel a scheduled operation which has not yet taken effect', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const scheduledId = await makeScheduledId();
      const waitForBlocks = 4;

      const amount = 1;

      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, amount, waitForBlocks, scheduledId);
      await expect(cancelScheduled(api, alice, scheduledId)).to.not.be.rejected;

      await waitNewBlocks(waitForBlocks);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(alice.address));
    });
  });

  it('Can cancel a periodic operation (transfer of funds)', async () => {
    await usingApi(async api => {
      const waitForBlocks = 1;
      const period = 3;
      const repetitions = 2;

      const scheduledId = await makeScheduledId();
      const amount = 1n * UNIQUE;

      const bobsBalanceBefore = await getFreeBalance(bob);
      await scheduleTransferFundsExpectSuccess(api, amount, alice, bob, waitForBlocks, scheduledId, period, repetitions);

      await waitNewBlocks(waitForBlocks + 1);
      const bobsBalanceAfterFirst = await getFreeBalance(bob);
      expect(bobsBalanceAfterFirst)
        .to.be.equal(
          bobsBalanceBefore + 1n * amount,
          '#1 Balance of the recipient should be increased by 1 * amount',
        );

      await expect(cancelScheduled(api, alice, scheduledId)).to.not.be.rejected;

      await waitNewBlocks(period);
      const bobsBalanceAfterSecond = await getFreeBalance(bob);
      expect(bobsBalanceAfterSecond)
        .to.be.equal(
          bobsBalanceAfterFirst,
          '#2 Balance of the recipient should not be changed',
        );
    });
  });

  it('Scheduled tasks are transactional', async function() {
    await requirePallets(this, [Pallets.TestUtils]);

    await usingApi(async api => {
      const scheduledId = await makeScheduledId();
      const waitForBlocks = 4;

      const initTestVal = 42;
      const changedTestVal = 111;

      const initTx = api.tx.testUtils.setTestValue(initTestVal);
      await submitTransactionAsync(alice, initTx);

      const changeErrTx = api.tx.testUtils.setTestValueAndRollback(changedTestVal);

      await expect(scheduleAfter(
        api,
        changeErrTx,
        alice,
        waitForBlocks,
        scheduledId,
      )).to.not.be.rejected;

      await waitNewBlocks(waitForBlocks + 1);

      const testVal = (await api.query.testUtils.testValue()).toNumber();
      expect(testVal, 'The test value should NOT be commited')
        .not.to.be.equal(changedTestVal)
        .and.to.be.equal(initTx);
    });
  });

  it('Scheduled tasks should take correct fees', async function() {
    await requirePallets(this, [Pallets.TestUtils]);

    await usingApi(async api => {
      const scheduledId = await makeScheduledId();
      const waitForBlocks = 8;
      const period = 2;
      const repetitions = 2;

      const dummyTx = api.tx.testUtils.justTakeFee();
  
      const signingInfo = await api.derive.tx.signingInfo(alice.address);

      // We need to sign the tx because
      // unsigned transactions does not have an inclusion fee
      dummyTx.sign(alice, {
        blockHash: api.genesisHash,
        genesisHash: api.genesisHash,
        runtimeVersion: api.runtimeVersion,
        nonce: signingInfo.nonce,
      });

      const scheduledLen = dummyTx.callIndex.length;

      const queryInfo = await api.call.transactionPaymentApi.queryInfo(
        dummyTx.toHex(),
        scheduledLen,
      );

      const expectedScheduledFee = (await queryInfo as RuntimeDispatchInfo)
        .partialFee.toBigInt();

      await expect(scheduleAfter(
        api,
        dummyTx,
        alice,
        waitForBlocks,
        scheduledId,
        period,
        repetitions,
      )).to.not.be.rejected;

      await waitNewBlocks(1);

      const aliceInitBalance = await getFreeBalance(alice);
      let diff;

      await waitNewBlocks(waitForBlocks);

      const aliceBalanceAfterFirst = await getFreeBalance(alice);
      expect(
        aliceBalanceAfterFirst < aliceInitBalance,
        '[after execution #1] Scheduled task should take a fee',
      ).to.be.true;

      diff = aliceInitBalance - aliceBalanceAfterFirst;
      expect(diff).to.be.equal(
        expectedScheduledFee,
        'Scheduled task should take the right amount of fees',
      );

      await waitNewBlocks(period);

      const aliceBalanceAfterSecond = await getFreeBalance(alice);
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
  });

  // Check if we can cancel a scheduled periodic operation
  // in the same block in which it is running
  it('Can cancel the periodic sheduled tx when the tx is running', async () => {
    await usingApi(async api => {
      const currentBlockNumber = await getBlockNumber(api);
      const blocksBeforeExecution = 10;
      const firstExecutionBlockNumber = currentBlockNumber + blocksBeforeExecution;
      
      const scheduledId = await makeScheduledId();
      const scheduledCancelId = await makeScheduledId();

      const period = 5;
      const repetitions = 5;

      const initTestVal = 0;
      const incTestVal = initTestVal + 1;
      const finalTestVal = initTestVal + 2;
      await executeTransaction(
        api,
        alice,
        api.tx.testUtils.setTestValue(initTestVal),
      );

      const incTx = api.tx.testUtils.incTestValue();
      const cancelTx = api.tx.scheduler.cancelNamed(scheduledId);

      await expect(scheduleAt(
        api, 
        incTx,
        alice, 
        firstExecutionBlockNumber, 
        scheduledId, 
        period, 
        repetitions,
      )).to.not.be.rejected;

      // Cancel the inc tx after 2 executions
      // *in the same block* in which the second execution is scheduled
      await expect(scheduleAt(
        api,
        cancelTx,
        alice,
        firstExecutionBlockNumber + period,
        scheduledCancelId,
      )).to.not.be.rejected;

      await waitNewBlocks(blocksBeforeExecution);

      // execution #0
      expect((await api.query.testUtils.testValue()).toNumber())
        .to.be.equal(incTestVal);

      await waitNewBlocks(period);

      // execution #1
      expect((await api.query.testUtils.testValue()).toNumber())
        .to.be.equal(finalTestVal);

      for (let i = 1; i < repetitions; i++) {
        await waitNewBlocks(period);
        expect((await api.query.testUtils.testValue()).toNumber())
          .to.be.equal(finalTestVal);
      }
    });
  });

  it('A scheduled operation can cancel itself', async () => {
    await usingApi(async api => {
      const scheduledId = await makeScheduledId();
      const waitForBlocks = 8;
      const period = 2;
      const repetitions = 5;

      const initTestVal = 0;
      const maxTestVal = 2;

      await executeTransaction(
        api,
        alice,
        api.tx.testUtils.setTestValue(initTestVal),
      );

      const selfCancelingTx = api.tx.testUtils.selfCancelingInc(scheduledId, maxTestVal);

      await expect(scheduleAfter(
        api,
        selfCancelingTx,
        alice,
        waitForBlocks,
        scheduledId,
        period,
        repetitions,
      )).to.not.be.rejected;

      await waitNewBlocks(waitForBlocks + 1);

      // execution #0
      expect((await api.query.testUtils.testValue()).toNumber())
        .to.be.equal(initTestVal + 1);

      await waitNewBlocks(period);

      // execution #1
      expect((await api.query.testUtils.testValue()).toNumber())
        .to.be.equal(initTestVal + 2);

      await waitNewBlocks(period);

      // <canceled>
      expect((await api.query.testUtils.testValue()).toNumber())
        .to.be.equal(initTestVal + 2);
    });
  });
});

describe('Negative Test: Scheduling', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await requirePallets(this, [Pallets.Scheduler]);

    await usingApi(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it("Can't overwrite a scheduled ID", async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const scheduledId = await makeScheduledId();
      const waitForBlocks = 4;
      const amount = 1;

      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, amount, waitForBlocks, scheduledId);
      await expect(scheduleAfter(
        api, 
        api.tx.balances.transfer(alice.address, 1n * UNIQUE), 
        bob, 
        /* period = */ 2, 
        scheduledId,
      )).to.be.rejectedWith(/scheduler\.FailedToSchedule/);

      const bobsBalanceBefore = await getFreeBalance(bob);

      await waitNewBlocks(waitForBlocks + 1);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(bobsBalanceBefore).to.be.equal(await getFreeBalance(bob));
    });
  });

  it("Can't cancel an operation which is not scheduled", async () => {
    await usingApi(async api => {
      const scheduledId = await makeScheduledId();
      await expect(cancelScheduled(api, alice, scheduledId)).to.be.rejectedWith(/scheduler\.NotFound/);
    });
  });

  it("Can't cancel a non-owned scheduled operation", async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const scheduledId = await makeScheduledId();
      const waitForBlocks = 8;

      const amount = 1;

      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, amount, waitForBlocks, scheduledId);
      await expect(cancelScheduled(api, bob, scheduledId)).to.be.rejectedWith(/BadOrigin/);

      await waitNewBlocks(waitForBlocks + 1);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(bob.address));
    });
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
