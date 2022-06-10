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
  scheduleTransferFundsPeriodicExpectSuccess,
  getFreeBalance,
  confirmSponsorshipByKeyExpectSuccess,
  scheduleExpectFailure,
} from './util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

chai.use(chaiAsPromised);

describe.skip('Scheduling token and balance transfers', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let scheduledIdBase: string;
  let scheduledIdSlider: number;

  before(async() => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });

    scheduledIdBase = '0x' + '0'.repeat(31);
    scheduledIdSlider = 0;
  });

  // Loop scheduledId around 10. Unless there are concurrent tasks with long periods/repetitions, tests' tasks' ids shouldn't ovelap.
  function makeScheduledId(): string {
    return scheduledIdBase + ((scheduledIdSlider++) % 10);
  }

  it('Can schedule a transfer of an owned token with delay', async () => {
    await usingApi(async () => {
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setCollectionSponsorExpectSuccess(nftCollectionId, alice.address);
      await confirmSponsorshipExpectSuccess(nftCollectionId);

      await scheduleTransferAndWaitExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 1, 4, makeScheduledId());
    });
  });

  it('Can transfer funds periodically', async () => {
    await usingApi(async () => {
      const waitForBlocks = 4;
      const period = 2;
      await scheduleTransferFundsPeriodicExpectSuccess(1n * UNIQUE, alice, bob, waitForBlocks, makeScheduledId(), period, 2);
      const bobsBalanceBefore = await getFreeBalance(bob);

      // discounting already waited-for operations
      await waitNewBlocks(waitForBlocks - 2);
      const bobsBalanceAfterFirst = await getFreeBalance(bob);
      expect(bobsBalanceAfterFirst > bobsBalanceBefore).to.be.true;

      await waitNewBlocks(period);
      const bobsBalanceAfterSecond = await getFreeBalance(bob);
      expect(bobsBalanceAfterSecond > bobsBalanceAfterFirst).to.be.true;
    });
  });

  it('Can sponsor scheduling a transaction', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await confirmSponsorshipExpectSuccess(collectionId, '//Bob');

    await usingApi(async () => {
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      const bobBalanceBefore = await getFreeBalance(bob);
      const waitForBlocks = 4;
      // no need to wait to check, fees must be deducted on scheduling, immediately
      await scheduleTransferExpectSuccess(collectionId, tokenId, alice, bob, 0, waitForBlocks, makeScheduledId());
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
      await scheduleTransferExpectSuccess(collectionId, tokenId, zeroBalance, alice, 1, waitForBlocks, makeScheduledId());

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
      await scheduleTransferExpectSuccess(collectionId, tokenId, alice, zeroBalance, 1, waitForBlocks, makeScheduledId());

      const emptyBalanceSponsorTx = api.tx.balances.setBalance(zeroBalance.address, 0, 0);
      const sudoTx = api.tx.sudo.sudo(emptyBalanceSponsorTx as any);
      const events = await submitTransactionAsync(alice, sudoTx);
      expect(getGenericResult(events).success).to.be.true;

      // Wait for a certain number of blocks, save for the ones that already happened while accepting the late transactions
      await waitNewBlocks(waitForBlocks - 3);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(zeroBalance.address));
    });
  });

  it.skip('Exceeding sponsor rate limit without having enough funds prevents scheduling a periodic transaction', async () => {
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

      await scheduleExpectFailure(creationTx, zeroBalance, 3, makeScheduledId(), 1, 3);

      expect(await getFreeBalance(bob)).to.be.equal(bobBalanceBefore);
    });
  });
});
