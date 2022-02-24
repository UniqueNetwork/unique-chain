//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
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

describe('Scheduling token and balance transfers', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async() => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Can schedule a transfer of an owned token with delay', async () => {
    await usingApi(async () => {
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(alice, nftCollectionId, 'NFT');
      await setCollectionSponsorExpectSuccess(nftCollectionId, alice.address);
      await confirmSponsorshipExpectSuccess(nftCollectionId);

      await scheduleTransferAndWaitExpectSuccess(nftCollectionId, newNftTokenId, alice, bob, 1, 4);
    });
  });

  it('Can transfer funds periodically', async () => {
    await usingApi(async () => {
      const waitForBlocks = 4;
      const period = 2;
      await scheduleTransferFundsPeriodicExpectSuccess(1n * UNIQUE, alice, bob, waitForBlocks, period, 2);
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
      // no need to wait to check, fees must be deducted on scheduling, immediately
      await scheduleTransferExpectSuccess(collectionId, tokenId, alice, bob, 0, 4);
      const bobBalanceAfter = await getFreeBalance(bob);
      // expect(aliceBalanceAfter == aliceBalanceBefore).to.be.true; // will not work; alice gives away money as a sender for the scheduler
      expect(bobBalanceAfter < bobBalanceBefore).to.be.true;
    });
  });

  it('Schedules and dispatches a transaction even if the caller has no funds at the time of the dispatch', async () => {
    await usingApi(async (api) => {
      // Find an empty, unused account
      const zeroBalance = await findUnusedAddress(api);

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
      await scheduleTransferExpectSuccess(collectionId, tokenId, zeroBalance, alice, 1, waitForBlocks);

      // Get rid of the account's funds before the scheduled transaction takes place
      const emptyBalanceTx = api.tx.balances.setBalance(zeroBalance.address, 0, 0); // do not null reserved?
      const sudoTx = api.tx.sudo.sudo(emptyBalanceTx as any);
      const events = await submitTransactionAsync(alice, sudoTx);
      expect(getGenericResult(events).success).to.be.true;

      // Wait for a certain number of blocks, discarding the ones that already happened while accepting the late transactions
      await waitNewBlocks(waitForBlocks - 3);

      expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal(normalizeAccountId(alice.address));
    });
  });

  it('Sponsor going bankrupt does not impact a scheduled transaction', async () => {
    const collectionId = await createCollectionExpectSuccess();

    await usingApi(async (api) => {
      const zeroBalance = await findUnusedAddress(api);
      const balanceTx = api.tx.balances.transfer(zeroBalance.address, 1n * UNIQUE);
      await submitTransactionAsync(alice, balanceTx);

      await setCollectionSponsorExpectSuccess(collectionId, zeroBalance.address);
      await confirmSponsorshipByKeyExpectSuccess(collectionId, zeroBalance);

      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', alice.address);

      const waitForBlocks = 5;
      await scheduleTransferExpectSuccess(collectionId, tokenId, alice, zeroBalance, 1, waitForBlocks);

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

    await usingApi(async (api) => {
      const zeroBalance = await findUnusedAddress(api);

      await enablePublicMintingExpectSuccess(alice, collectionId);
      await addToAllowListExpectSuccess(alice, collectionId, zeroBalance.address);

      const bobBalanceBefore = await getFreeBalance(bob);

      const createData = {nft: {const_data: [], variable_data: []}};
      const creationTx = api.tx.unique.createItem(collectionId, normalizeAccountId(zeroBalance), createData as any);

      /*const badTransaction = async function () {
        await submitTransactionExpectFailAsync(zeroBalance, zeroToAlice);
      };
      await expect(badTransaction()).to.be.rejectedWith('Inability to pay some fees');*/

      await scheduleExpectFailure(creationTx, zeroBalance, 3, 1, 3);

      expect(await getFreeBalance(bob)).to.be.equal(bobBalanceBefore);
    });
  });
});
