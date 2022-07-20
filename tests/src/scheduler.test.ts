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
  submitTransactionAsync,
} from './substrate/substrate-api';
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
  normalizeAccountId,
  getTokenOwner,
  getGenericResult,
  scheduleTransferFundsExpectSuccess,
  getFreeBalance,
  confirmSponsorshipByKeyExpectSuccess,
  scheduleAfter,
  cancelScheduled,
} from './util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';

chai.use(chaiAsPromised);

const scheduledIdBase: string = '0x' + '0'.repeat(31);
let scheduledIdSlider = 0;

// Loop scheduledId around 10. Unless there are concurrent tasks with long periods/repetitions, tests' tasks' ids shouldn't ovelap.
function makeScheduledId(): string {
  return scheduledIdBase + ((scheduledIdSlider++) % 10);
}

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

  before(async() => {
    await usingApi(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });


  it('Can delay a transfer of an owned token', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');

      await scheduleTransferAndWaitExpectSuccess(api, collectionId, tokenId, alice, bob, 1, 4, makeScheduledId());
    });
  });

  it('Can transfer funds periodically', async () => {
    await usingApi(async api => {
      const waitForBlocks = 1;
      const period = 2;
      const repetitions = 2;

      await scheduleTransferFundsExpectSuccess(api, 1n * UNIQUE, alice, bob, waitForBlocks, makeScheduledId(), period, repetitions);
      const bobsBalanceBefore = await getFreeBalance(bob);

      await waitNewBlocks(waitForBlocks + 1);
      const bobsBalanceAfterFirst = await getFreeBalance(bob);
      expect(bobsBalanceAfterFirst > bobsBalanceBefore, '#1 Balance of the recipient did not increase').to.be.true;

      await waitNewBlocks(period);
      const bobsBalanceAfterSecond = await getFreeBalance(bob);
      expect(bobsBalanceAfterSecond > bobsBalanceAfterFirst, '#2 Balance of the recipient did not increase').to.be.true;
    });
  });

  it('Can cancel a scheduled operation which has not yet taken effect', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const scheduledId = makeScheduledId();
      const waitForBlocks = 4;

      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, 1, waitForBlocks, scheduledId);
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

      const scheduledId = makeScheduledId();

      const bobsBalanceBefore = await getFreeBalance(bob);
      await scheduleTransferFundsExpectSuccess(api, 1n * UNIQUE, alice, bob, waitForBlocks, scheduledId, period, repetitions);

      await waitNewBlocks(waitForBlocks + 1);
      const bobsBalanceAfterFirst = await getFreeBalance(bob);
      expect(bobsBalanceAfterFirst > bobsBalanceBefore, '#1 Balance of the recipient did not increase').to.be.true;

      await expect(cancelScheduled(api, alice, scheduledId)).to.not.be.rejected;

      await waitNewBlocks(period);
      const bobsBalanceAfterSecond = await getFreeBalance(bob);
      expect(bobsBalanceAfterSecond == bobsBalanceAfterFirst, '#2 Balance of the recipient changed').to.be.true;
    });
  });

  it('Can schedule a scheduled operation of canceling the scheduled operation', async () => {
    await usingApi(async api => {
      const scheduledId = makeScheduledId();

      const waitForBlocks = 2;
      const period = 3;
      const repetitions = 2;

      await expect(scheduleAfter(
        api, 
        api.tx.scheduler.cancelNamed(scheduledId), 
        alice, 
        waitForBlocks, 
        scheduledId, 
        period, 
        repetitions,
      )).to.not.be.rejected;


      await waitNewBlocks(waitForBlocks);

      // todo:scheduler debug line; doesn't work (and doesn't appear in events) when executed in the same block as the scheduled transaction
      //await expect(executeTransaction(api, alice, api.tx.scheduler.cancelNamed(scheduledId))).to.not.be.rejected;

      let schedulerEvents = 0;
      for (let i = 0; i < period * repetitions; i++) {
        const events = await api.query.system.events();
        schedulerEvents += await expect(checkForFailedSchedulerEvents(api, events)).to.not.be.rejected;
        await waitNewBlocks(1);
      }
      expect(schedulerEvents).to.be.equal(repetitions);
    });
  });

  after(async () => {
    // todo:scheduler to avoid the failed results of the previous test interfering with the next, delete after the problem is fixed
    await waitNewBlocks(6);
  });
});

describe('Negative Test: Scheduling', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async() => {
    await usingApi(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Can\'t overwrite a scheduled ID', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const scheduledId = makeScheduledId();

      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, 1, 4, scheduledId);
      await expect(scheduleAfter(
        api, 
        api.tx.balances.transfer(alice.address, 1n * UNIQUE), 
        bob, 
        2, 
        scheduledId,
      )).to.be.rejectedWith(/scheduler\.FailedToSchedule/);
      const bobsBalance = await getFreeBalance(bob);

      await waitNewBlocks(3);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(bob.address));
      expect(bobsBalance).to.be.equal(await getFreeBalance(bob));
    });
  });

  it('Can\'t cancel an operation which is not scheduled', async () => {
    await usingApi(async api => {
      const scheduledId = makeScheduledId();
      await expect(cancelScheduled(api, alice, scheduledId)).to.be.rejectedWith(/scheduler\.NotFound/);
    });
  });

  it('Can\'t cancel a non-owned scheduled operation', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const scheduledId = makeScheduledId();
      const waitForBlocks = 3;

      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, 1, waitForBlocks, scheduledId);
      await expect(cancelScheduled(api, bob, scheduledId)).to.be.rejected;

      await waitNewBlocks(waitForBlocks);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(alice.address));
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
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      const bobBalanceBefore = await getFreeBalance(bob);
      const waitForBlocks = 4;
      // no need to wait to check, fees must be deducted on scheduling, immediately
      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, bob, 0, waitForBlocks, makeScheduledId());
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

      // Schedule transfer of the NFT a few blocks ahead
      const waitForBlocks = 5;
      await scheduleTransferExpectSuccess(api, collectionId, tokenId, zeroBalance, alice, 1, waitForBlocks, makeScheduledId());

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

      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      const waitForBlocks = 5;
      await scheduleTransferExpectSuccess(api, collectionId, tokenId, alice, zeroBalance, 1, waitForBlocks, makeScheduledId());

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

      /*const badTransaction = async function () {
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };
      await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees');*/

      await expect(scheduleAfter(api, creationTx, zeroBalance, 3, makeScheduledId(), 1, 3)).to.be.rejectedWith(/Inability to pay some fees/);

      expect(await getFreeBalance(bob)).to.be.equal(bobBalanceBefore);
    });
  });
});
