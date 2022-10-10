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

import {IKeyringPair} from '@polkadot/types/types';
import {itSub, usingPlaygrounds, Pallets, requirePalletsOrSkip} from './util/playgrounds';
import {DevUniqueHelper} from './util/playgrounds/unique.dev';
import {itEth, expect, SponsoringMode} from './eth/util/playgrounds';

let donor: IKeyringPair;
let palletAdmin: IKeyringPair;
let nominal: bigint;
let palletAddress: string;
let accounts: IKeyringPair[];
const LOCKING_PERIOD = 20n; // 20 blocks of relay
const UNLOCKING_PERIOD = 10n; // 10 blocks of parachain
const rewardAvailableInBlock = (stakedInBlock: bigint) => {
  if (stakedInBlock % LOCKING_PERIOD === 0n) return stakedInBlock + 20n;
  return (stakedInBlock - stakedInBlock % LOCKING_PERIOD) + (LOCKING_PERIOD * 2n);
};

describe('App promotion', () => {
  before(async function () {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.AppPromotion]);
      donor = await privateKey({filename: __filename});
      palletAddress = helper.arrange.calculatePalleteAddress('appstake');
      palletAdmin = await privateKey('//PromotionAdmin');
      nominal = helper.balance.getOneTokenNominal();
      await helper.balance.transferToSubstrate(donor, palletAdmin.address, 1000n * nominal);
      await helper.balance.transferToSubstrate(donor, palletAddress, 1000n * nominal);
      accounts = await helper.arrange.createCrowd(100, 1000n, donor); // create accounts-pool to speed up tests
    });
  });

  describe('stake extrinsic', () => {  
    itSub('should "lock" staking balance, add it to "staked" map, and increase "totalStaked" amount', async ({helper}) => {
      const [staker, recepient] = [accounts.pop()!, accounts.pop()!];
      const totalStakedBefore = await helper.staking.getTotalStaked();
  
      // Minimum stake amount is 100:
      await expect(helper.staking.stake(staker, 100n * nominal - 1n)).to.be.rejected;
      await helper.staking.stake(staker, 100n * nominal);
  
      // Staker balance is: miscFrozen: 100, feeFrozen: 100, reserved: 0n...
      // ...so he can not transfer 900
      expect (await helper.balance.getSubstrateFull(staker.address)).to.contain({miscFrozen: 100n * nominal, feeFrozen: 100n * nominal, reserved: 0n});
      await expect(helper.balance.transferToSubstrate(staker, recepient.address, 900n * nominal)).to.be.rejectedWith('balances.LiquidityRestrictions');
      
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(100n * nominal);
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n);
      // it is potentially flaky test. Promotion can credited some tokens. Maybe we need to use closeTo? 
      expect(await helper.staking.getTotalStaked()).to.be.equal(totalStakedBefore + 100n * nominal); // total tokens amount staked in app-promotion increased 
  
      
      await helper.staking.stake(staker, 200n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(300n * nominal);
      const totalStakedPerBlock = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      expect(totalStakedPerBlock[0].amount).to.equal(100n * nominal);
      expect(totalStakedPerBlock[1].amount).to.equal(200n * nominal);
    });
  
    itSub('should allow to create maximum 10 stakes for account', async ({helper}) => {
      const [staker] = await helper.arrange.createAccounts([2000n], donor);
      for (let i = 0; i < 10; i++) {
        await helper.staking.stake(staker, 100n * nominal);
      }
  
      // can have 10 stakes
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(1000n * nominal);
      expect(await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).to.have.length(10);
  
      await expect(helper.staking.stake(staker, 100n * nominal)).to.be.rejectedWith('appPromotion.NoPermission');
  
      // After unstake can stake again
      await helper.staking.unstake(staker);
      await helper.staking.stake(staker, 100n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.equal(100n * nominal);
    });
    
    itSub('should reject transaction if stake amount is more than total free balance minus frozen', async ({helper}) => {
      const staker = accounts.pop()!;
  
      // Can't stake full balance because Alice needs to pay some fee
      await expect(helper.staking.stake(staker, 1000n * nominal)).to.be.rejected;
      await helper.staking.stake(staker, 500n * nominal);
  
      // Can't stake 500 tkn because Alice has Less than 500 transferable;
      await expect(helper.staking.stake(staker, 500n * nominal)).to.be.rejectedWith('balances.LiquidityRestrictions'); 
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(500n * nominal);
    });
    
    itSub('for different accounts in one block is possible', async ({helper}) => {
      const crowd = [accounts.pop()!, accounts.pop()!, accounts.pop()!, accounts.pop()!];
        
      const crowdStartsToStake = crowd.map(user => helper.staking.stake(user, 100n * nominal));
      await expect(Promise.all(crowdStartsToStake)).to.be.fulfilled;
  
      const crowdStakes = await Promise.all(crowd.map(address => helper.staking.getTotalStaked({Substrate: address.address})));
      expect(crowdStakes).to.deep.equal([100n * nominal, 100n * nominal, 100n * nominal, 100n * nominal]);
    });
  });
  
  describe('unstake extrinsic', () => {  
    itSub('should change balance state from "frozen" to "reserved", add it to "pendingUnstake" map, and subtract it from totalStaked', async ({helper}) => {
      const [staker, recepient] = [accounts.pop()!, accounts.pop()!];
      const totalStakedBefore = await helper.staking.getTotalStaked();
      await helper.staking.stake(staker, 900n * nominal);
      await helper.staking.unstake(staker);
  
      // Right after unstake balance is reserved
      // Staker can not transfer 
      expect(await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 900n * nominal, miscFrozen: 0n, feeFrozen: 0n});
      await expect(helper.balance.transferToSubstrate(staker, recepient.address, 100n * nominal)).to.be.rejectedWith('balances.InsufficientBalance');
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(900n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(0n);
      expect(await helper.staking.getTotalStaked()).to.be.equal(totalStakedBefore);
    });
  
    itSub('should unlock balance after unlocking period ends and remove it from "pendingUnstake"', async ({helper}) => {
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.unstake(staker);
      const [pendingUnstake] = await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address});
  
      // Wait for unstaking period. Balance now free ~1000; reserved, frozen, miscFrozeb: 0n
      await helper.wait.forParachainBlockNumber(pendingUnstake.block);
      expect(await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 0n, miscFrozen: 0n, feeFrozen: 0n});
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n);
  
      // staker can transfer:
      await helper.balance.transferToSubstrate(staker, donor.address, 998n * nominal);
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(1n);
    });
  
    itSub('should successfully unstake multiple stakes', async ({helper}) => {
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.stake(staker, 200n * nominal);
      await helper.staking.stake(staker, 300n * nominal);
  
      // staked: [100, 200, 300]; unstaked: 0
      let totalPendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      let pendingUnstake = await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address});
      let stakes = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      expect(totalPendingUnstake).to.be.deep.equal(0n);
      expect(pendingUnstake).to.be.deep.equal([]);
      expect(stakes[0].amount).to.equal(100n * nominal);
      expect(stakes[1].amount).to.equal(200n * nominal);
      expect(stakes[2].amount).to.equal(300n * nominal);
       
      // Can unstake multiple stakes
      await helper.staking.unstake(staker);
      pendingUnstake = await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address});
      totalPendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      stakes = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      expect(totalPendingUnstake).to.be.equal(600n * nominal);
      expect(stakes).to.be.deep.equal([]);
      expect(pendingUnstake[0].amount).to.equal(600n * nominal);
  
      expect (await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 600n * nominal, feeFrozen: 0n, miscFrozen: 0n});
      await helper.wait.forParachainBlockNumber(pendingUnstake[0].block);
      expect (await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 0n, feeFrozen: 0n, miscFrozen: 0n});
      expect (await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n);
    });
  
    itSub('should not have any effects if no active stakes', async ({helper}) => {
      const staker = accounts.pop()!;
        
      // unstake has no effect if no stakes at all
      await helper.staking.unstake(staker);
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(0n);
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n); // TODO bigint closeTo helper
  
      // TODO stake() unstake() waitUnstaked() unstake();
  
      // can't unstake if there are only pendingUnstakes
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.unstake(staker);
      await helper.staking.unstake(staker);
  
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(100n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(0n);
    });
  
    itSub('should keep different unlocking block for each unlocking stake', async ({helper}) => {
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.unstake(staker);
      await helper.staking.stake(staker, 120n * nominal);
      await helper.staking.unstake(staker);
  
      const unstakingPerBlock = await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address});
      expect(unstakingPerBlock).has.length(2);
      expect(unstakingPerBlock[0].amount).to.equal(100n * nominal);
      expect(unstakingPerBlock[1].amount).to.equal(120n * nominal);
    });
  
    itSub('should be possible for different accounts in one block', async ({helper}) => {
      const stakers = [accounts.pop()!, accounts.pop()!, accounts.pop()!];
  
      await Promise.all(stakers.map(staker => helper.staking.stake(staker, 100n * nominal)));
      await Promise.all(stakers.map(staker => helper.staking.unstake(staker)));
  
      await Promise.all(stakers.map(async (staker) => {
        expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(100n * nominal);
        expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(0n);
      }));
    });
  });
  
  describe('collection sponsoring', () => {
    itSub('should actually sponsor transactions', async ({helper}) => {
      const api = helper.getApi();
      const [collectionOwner, tokenSender, receiver] = [accounts.pop()!, accounts.pop()!, accounts.pop()!];
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'Name', description: 'Description', tokenPrefix: 'Prefix', limits: {sponsorTransferTimeout: 0}});
      const token = await collection.mintToken(collectionOwner, {Substrate: tokenSender.address});
      await helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collection.collectionId));
      const palletBalanceBefore = await helper.balance.getSubstrate(palletAddress);
  
      await token.transfer(tokenSender, {Substrate: receiver.address});
      expect (await token.getOwner()).to.be.deep.equal({Substrate: receiver.address});
      const palletBalanceAfter = await helper.balance.getSubstrate(palletAddress);
  
      // senders balance the same, transaction has sponsored
      expect (await helper.balance.getSubstrate(tokenSender.address)).to.be.equal(1000n * nominal);
      expect (palletBalanceBefore > palletBalanceAfter).to.be.true;
    });
  
    itSub('can not be set by non admin', async ({helper}) => {
      const api = helper.getApi();
      const [collectionOwner, nonAdmin] = [accounts.pop()!, accounts.pop()!];
  
      const collection  = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
        
      await expect(helper.signTransaction(nonAdmin, api.tx.appPromotion.sponsorCollection(collection.collectionId))).to.be.rejected;
      expect((await collection.getData())?.raw.sponsorship).to.equal('Disabled');
    });
  
    itSub('should set pallet address as confirmed admin', async ({helper}) => {
      const api = helper.getApi();
      const [collectionOwner, oldSponsor] = [accounts.pop()!, accounts.pop()!];
        
      // Can set sponsoring for collection without sponsor
      const collectionWithoutSponsor = await helper.nft.mintCollection(collectionOwner, {name: 'No-sponsor', description: 'New Collection', tokenPrefix: 'Promotion'});
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collectionWithoutSponsor.collectionId))).to.be.fulfilled;
      expect((await collectionWithoutSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
  
      // Can set sponsoring for collection with unconfirmed sponsor
      const collectionWithUnconfirmedSponsor = await helper.nft.mintCollection(collectionOwner, {name: 'Unconfirmed', description: 'New Collection', tokenPrefix: 'Promotion', pendingSponsor: oldSponsor.address});
      expect((await collectionWithUnconfirmedSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Unconfirmed: oldSponsor.address});
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collectionWithUnconfirmedSponsor.collectionId))).to.be.fulfilled;
      expect((await collectionWithUnconfirmedSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
  
      // Can set sponsoring for collection with confirmed sponsor
      const collectionWithConfirmedSponsor = await helper.nft.mintCollection(collectionOwner, {name: 'Confirmed', description: 'New Collection', tokenPrefix: 'Promotion', pendingSponsor: oldSponsor.address});
      await collectionWithConfirmedSponsor.confirmSponsorship(oldSponsor);
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collectionWithConfirmedSponsor.collectionId))).to.be.fulfilled;
      expect((await collectionWithConfirmedSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
    });
  
    itSub('can be overwritten by collection owner', async ({helper}) => {    
      const api = helper.getApi();
      const [collectionOwner, newSponsor] = [accounts.pop()!, accounts.pop()!];
      const collection  = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
        
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collectionId))).to.be.fulfilled;
        
      // Collection limits still can be changed by the owner
      expect(await collection.setLimits(collectionOwner, {sponsorTransferTimeout: 0})).to.be.true;
      expect((await collection.getData())?.raw.limits.sponsorTransferTimeout).to.be.equal(0);
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
  
      // Collection sponsor can be changed too
      expect((await collection.setSponsor(collectionOwner, newSponsor.address))).to.be.true;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Unconfirmed: newSponsor.address});
    });
    
    itSub('should not overwrite collection limits set by the owner earlier', async ({helper}) => {
      const api = helper.getApi();
      const limits = {ownerCanDestroy: true, ownerCanTransfer: true, sponsorTransferTimeout: 0};
      const collectionWithLimits = await helper.nft.mintCollection(accounts.pop()!, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion', limits});
  
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collectionWithLimits.collectionId))).to.be.fulfilled;
      expect((await collectionWithLimits.getData())?.raw.limits).to.be.deep.contain(limits);
    });
    
    itSub('should reject transaction if collection doesn\'t exist', async ({helper}) => {
      const api = helper.getApi();
      const collectionOwner = accounts.pop()!;
        
      // collection has never existed
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(999999999))).to.be.rejected;
      // collection has been burned
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await collection.burn(collectionOwner);
  
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collection.collectionId))).to.be.rejected;
    });
  });
  
  describe('stopSponsoringCollection', () => {
    itSub('can not be called by non-admin', async ({helper}) => {
      const api = helper.getApi();
      const [collectionOwner, nonAdmin] = [accounts.pop()!, accounts.pop()!];
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
        
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collection.collectionId))).to.be.fulfilled;
        
      await expect(helper.signTransaction(nonAdmin, api.tx.appPromotion.stopSponsoringCollection(collection.collectionId))).to.be.rejected;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
    });
  
    itSub('should set sponsoring as disabled', async ({helper}) => {
      const api = helper.getApi();
      const [collectionOwner, recepient] = [accounts.pop()!, accounts.pop()!];
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion', limits: {sponsorTransferTimeout: 0}});
      const token = await collection.mintToken(collectionOwner, {Substrate: collectionOwner.address});
        
      await helper.signTransaction(palletAdmin, api.tx.appPromotion.sponsorCollection(collection.collectionId));
      await helper.signTransaction(palletAdmin, api.tx.appPromotion.stopSponsoringCollection(collection.collectionId));
        
      expect((await collection.getData())?.raw.sponsorship).to.be.equal('Disabled');
  
      // Transactions are not sponsored anymore:
      const ownerBalanceBefore = await helper.balance.getSubstrate(collectionOwner.address);
      await token.transfer(collectionOwner, {Substrate: recepient.address});
      const ownerBalanceAfter = await helper.balance.getSubstrate(collectionOwner.address);
      expect(ownerBalanceAfter < ownerBalanceBefore).to.be.equal(true);
    });
  
    itSub('should not affect collection which is not sponsored by pallete', async ({helper}) => {
      const api = helper.getApi();
      const collectionOwner = accounts.pop()!;
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion', pendingSponsor: collectionOwner.address});
      await collection.confirmSponsorship(collectionOwner);
        
      await expect(helper.signTransaction(palletAdmin, api.tx.appPromotion.stopSponsoringCollection(collection.collectionId))).to.be.rejected;
        
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: collectionOwner.address});
    });
  
    itSub('should reject transaction if collection does not exist', async ({helper}) => {    
      const collectionOwner = accounts.pop()!;
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
        
      await collection.burn(collectionOwner);
      await expect(helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.stopSponsoringCollection', [collection.collectionId], true)).to.be.rejectedWith('common.CollectionNotFound');
      await expect(helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.stopSponsoringCollection', [999_999_999], true)).to.be.rejectedWith('common.CollectionNotFound');
    });
  });
  
  describe('contract sponsoring', () => {
    itEth('should set palletes address as a sponsor', async ({helper}) => {
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner); // await deployFlipper(web3, contractOwner);
      const contractHelper = helper.ethNativeContract.contractHelpers(contractOwner);
  
      await helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.sponsorContract', [flipper.options.address]);
      
      expect(await contractHelper.methods.hasSponsor(flipper.options.address).call()).to.be.true;  
      expect((await helper.callRpc('api.query.evmContractHelpers.owner', [flipper.options.address])).toJSON()).to.be.equal(contractOwner);  
      expect((await helper.callRpc('api.query.evmContractHelpers.sponsoring', [flipper.options.address])).toJSON()).to.deep.equal({
        confirmed: {
          substrate: palletAddress,
        },
      });
    });
  
    itEth('should overwrite sponsoring mode and existed sponsor', async ({helper}) => {
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner); // await deployFlipper(web3, contractOwner);
      const contractHelper = helper.ethNativeContract.contractHelpers(contractOwner);
  
      await expect(contractHelper.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.fulfilled;
  
      // Contract is self sponsored
      expect((await helper.callRpc('api.query.evmContractHelpers.sponsoring', [flipper.options.address])).toJSON()).to.be.deep.equal({
        confirmed: {
          ethereum: flipper.options.address.toLowerCase(),
        },
      });
  
      // set promotion sponsoring
      await helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.sponsorContract', [flipper.options.address], true);
  
      // new sponsor is pallet address
      expect(await contractHelper.methods.hasSponsor(flipper.options.address).call()).to.be.true;  
      expect((await helper.callRpc('api.query.evmContractHelpers.owner', [flipper.options.address])).toJSON()).to.be.equal(contractOwner);  
      expect((await helper.callRpc('api.query.evmContractHelpers.sponsoring', [flipper.options.address])).toJSON()).to.deep.equal({
        confirmed: {
          substrate: palletAddress,
        },
      });
    });
  
    itEth('can be overwritten by contract owner', async ({helper}) => {
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner); // await deployFlipper(web3, contractOwner);
      const contractHelper = helper.ethNativeContract.contractHelpers(contractOwner);
  
      // contract sponsored by pallet
      await helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.sponsorContract', [flipper.options.address], true);
  
      // owner sets self sponsoring
      await expect(contractHelper.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;
  
      expect(await contractHelper.methods.hasSponsor(flipper.options.address).call()).to.be.true;  
      expect((await helper.callRpc('api.query.evmContractHelpers.owner', [flipper.options.address])).toJSON()).to.be.equal(contractOwner);  
      expect((await helper.callRpc('api.query.evmContractHelpers.sponsoring', [flipper.options.address])).toJSON()).to.deep.equal({
        confirmed: {
          ethereum: flipper.options.address.toLowerCase(),
        },
      });
    });
  
    itEth('can not be set by non admin', async ({helper}) => {
      const nonAdmin = accounts.pop()!;
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner); // await deployFlipper(web3, contractOwner);
      const contractHelper = helper.ethNativeContract.contractHelpers(contractOwner);
  
      await expect(contractHelper.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.fulfilled;
  
      // nonAdmin calls sponsorContract
      await expect(helper.executeExtrinsic(nonAdmin, 'api.tx.appPromotion.sponsorContract', [flipper.options.address], true)).to.be.rejectedWith('appPromotion.NoPermission');
  
      // contract still self-sponsored 
      expect((await helper.callRpc('api.query.evmContractHelpers.sponsoring', [flipper.options.address])).toJSON()).to.deep.equal({
        confirmed: {
          ethereum: flipper.options.address.toLowerCase(),
        },
      });
    });
  
    itEth('should actually sponsor transactions', async ({helper}) => {
      // Contract caller
      const caller = await helper.eth.createAccountWithBalance(donor, 1000n);
      const palletBalanceBefore = await helper.balance.getSubstrate(palletAddress);
          
      // Deploy flipper
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner); // await deployFlipper(web3, contractOwner);
      const contractHelper = helper.ethNativeContract.contractHelpers(contractOwner);
      
      // Owner sets to sponsor every tx
      await contractHelper.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: contractOwner});
      await contractHelper.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: contractOwner});
      await helper.eth.transferBalanceFromSubstrate(donor, flipper.options.address, 1000n); // transferBalanceToEth(api, alice, flipper.options.address, 1000n);
  
      // Set promotion to the Flipper
      await helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.sponsorContract', [flipper.options.address], true);
  
      // Caller calls Flipper
      await flipper.methods.flip().send({from: caller});
      expect(await flipper.methods.getValue().call()).to.be.true;
  
      // The contracts and caller balances have not changed
      const callerBalance = await helper.balance.getEthereum(caller);
      const contractBalanceAfter = await helper.balance.getEthereum(flipper.options.address);
      expect(callerBalance).to.be.equal(1000n * nominal);
      expect(1000n * nominal === contractBalanceAfter).to.be.true;
  
      // The pallet balance has decreased
      const palletBalanceAfter = await helper.balance.getSubstrate(palletAddress);
      expect(palletBalanceAfter < palletBalanceBefore).to.be.true;
    });
  });
  
  describe('stopSponsoringContract', () => {  
    itEth('should remove pallet address from contract sponsors', async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor, 1000n);
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner);
      await helper.eth.transferBalanceFromSubstrate(donor, flipper.options.address);
      const contractHelper = helper.ethNativeContract.contractHelpers(contractOwner);
  
      await contractHelper.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: contractOwner});
      await helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.sponsorContract', [flipper.options.address], true);
      await helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.stopSponsoringContract', [flipper.options.address], true);
  
      expect(await contractHelper.methods.hasSponsor(flipper.options.address).call()).to.be.false;  
      expect((await helper.callRpc('api.query.evmContractHelpers.owner', [flipper.options.address])).toJSON()).to.be.equal(contractOwner);  
      expect((await helper.callRpc('api.query.evmContractHelpers.sponsoring', [flipper.options.address])).toJSON()).to.deep.equal({
        disabled: null,
      });
  
      await flipper.methods.flip().send({from: caller});
      expect(await flipper.methods.getValue().call()).to.be.true;
  
      const callerBalance = await helper.balance.getEthereum(caller);
      const contractBalanceAfter = await helper.balance.getEthereum(flipper.options.address);
  
      // caller payed for call
      expect(1000n * nominal > callerBalance).to.be.true;
      // todo:playgrounds look into. why did it work before with 1000n, and is now 100n?
      expect(contractBalanceAfter).to.be.equal(100n * nominal);
    });
  
    itEth('can not be called by non-admin', async ({helper}) => {
      const nonAdmin = accounts.pop()!;
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner);
  
      await helper.executeExtrinsic(palletAdmin, 'api.tx.appPromotion.sponsorContract', [flipper.options.address]);
      await expect(helper.executeExtrinsic(nonAdmin, 'api.tx.appPromotion.stopSponsoringContract', [flipper.options.address]))
        .to.be.rejectedWith(/appPromotion\.NoPermission/);
    });
  
    itEth('should not affect a contract which is not sponsored by pallete', async ({helper}) => {
      const nonAdmin = accounts.pop()!;
      const contractOwner = (await helper.eth.createAccountWithBalance(donor, 1000n)).toLowerCase();
      const flipper = await helper.eth.deployFlipper(contractOwner);
      const contractHelper = helper.ethNativeContract.contractHelpers(contractOwner);
      await expect(contractHelper.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.fulfilled;
  
      await expect(helper.executeExtrinsic(nonAdmin, 'api.tx.appPromotion.stopSponsoringContract', [flipper.options.address], true)).to.be.rejectedWith('appPromotion.NoPermission');
    });
  });
  
  describe('rewards', () => {
    itSub('can not be called by non admin', async ({helper}) => {
      const nonAdmin = accounts.pop()!;
      await expect(helper.admin.payoutStakers(nonAdmin, 100)).to.be.rejectedWith('appPromotion.NoPermission');
    });
  
    itSub('should increase total staked', async ({helper}) => {
      const staker = accounts.pop()!;
      const totalStakedBefore = await helper.staking.getTotalStaked();
      await helper.staking.stake(staker, 100n * nominal);
  
      // Wait for rewards and pay
      const [stakedInBlock] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      await helper.wait.forRelayBlockNumber(rewardAvailableInBlock(stakedInBlock.block));
      const totalPayout = (await helper.admin.payoutStakers(palletAdmin, 100)).reduce((prev, payout) => prev + payout.payout, 0n);
  
      const totalStakedAfter = await helper.staking.getTotalStaked();
      expect(totalStakedAfter).to.equal(totalStakedBefore + (100n * nominal) + totalPayout);
      // staker can unstake
      await helper.staking.unstake(staker);
      expect(await helper.staking.getTotalStaked()).to.be.equal(totalStakedAfter - calculateIncome(100n * nominal, 10n));
    });
  
    itSub('should credit 0.05% for staking period', async ({helper}) => {    
      const staker = accounts.pop()!;
  
      await waitPromotionPeriodDoesntEnd(helper);
        
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.stake(staker, 200n * nominal);
  
      // wait rewards are available:
      const [_stake1, stake2] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      await helper.wait.forRelayBlockNumber(rewardAvailableInBlock(stake2.block));
  
      const payoutToStaker = (await helper.admin.payoutStakers(palletAdmin, 100)).find((payout) => payout.staker === staker.address)?.payout;
      expect(payoutToStaker + 300n * nominal).to.equal(calculateIncome(300n * nominal, 10n));
  
      const totalStakedPerBlock = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      expect(totalStakedPerBlock[0].amount).to.equal(calculateIncome(100n * nominal, 10n));
      expect(totalStakedPerBlock[1].amount).to.equal(calculateIncome(200n * nominal, 10n));
    });
  
    itSub('shoud be paid for more than one period if payments was missed', async ({helper}) => {
      const staker = accounts.pop()!;
  
      await helper.staking.stake(staker, 100n * nominal);
      // wait for two rewards are available:
      let [stake] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      await helper.wait.forRelayBlockNumber(rewardAvailableInBlock(stake.block) + LOCKING_PERIOD);
  
      await helper.admin.payoutStakers(palletAdmin, 100);
      [stake] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      const frozenBalanceShouldBe = calculateIncome(100n * nominal, 10n, 2);
      expect(stake.amount).to.be.equal(frozenBalanceShouldBe);
  
      const stakerFullBalance = await helper.balance.getSubstrateFull(staker.address);
  
      expect(stakerFullBalance).to.contain({reserved: 0n, feeFrozen: frozenBalanceShouldBe, miscFrozen: frozenBalanceShouldBe});
    });
    
    itSub('should not be credited for unstaked (reserved) balance', async ({helper}) => {
      // staker unstakes before rewards has been payed
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      const [stake] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      await helper.wait.forRelayBlockNumber(rewardAvailableInBlock(stake.block) + LOCKING_PERIOD);
      await helper.staking.unstake(staker);
        
      // so he did not receive any rewards
      const totalBalanceBefore = await helper.balance.getSubstrate(staker.address);
      await helper.admin.payoutStakers(palletAdmin, 100);
      const totalBalanceAfter = await helper.balance.getSubstrate(staker.address);
  
      expect(totalBalanceBefore).to.be.equal(totalBalanceAfter);
    });
    
    itSub('should bring compound interest', async ({helper}) => {
      const staker = accounts.pop()!;
              
      await helper.staking.stake(staker, 100n * nominal);
  
      let [stake] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      await helper.wait.forRelayBlockNumber(rewardAvailableInBlock(stake.block));
        
      await helper.admin.payoutStakers(palletAdmin, 100);
      [stake] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      expect(stake.amount).to.equal(calculateIncome(100n * nominal, 10n));
        
      await helper.wait.forRelayBlockNumber(rewardAvailableInBlock(stake.block) + LOCKING_PERIOD);
      await helper.admin.payoutStakers(palletAdmin, 100);
      [stake] = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      expect(stake.amount).to.equal(calculateIncome(100n * nominal, 10n, 2));
    });
  
    itSub.skip('can be paid 1000 rewards in a time', async ({helper}) => {
      // all other stakes should be unstaked
      const oneHundredStakers = await helper.arrange.createCrowd(100, 1050n, donor);
  
      // stakers stakes 10 times each
      for (let i = 0; i < 10; i++) {
        await Promise.all(oneHundredStakers.map(staker => helper.staking.stake(staker, 100n * nominal)));
      }
      await helper.wait.newBlocks(40);
      await helper.admin.payoutStakers(palletAdmin, 100);
    });
  
    itSub.skip('can handle 40.000 rewards', async ({helper}) => {
      const crowdStakes = async () => {
        // each account in the crowd stakes 2 times
        const crowd = await helper.arrange.createCrowd(500, 300n, donor);
        await Promise.all(crowd.map(account => helper.staking.stake(account, 100n * nominal)));
        await Promise.all(crowd.map(account => helper.staking.stake(account, 100n * nominal)));
        // 
      };
  
      for (let i = 0; i < 40; i++) {
        await crowdStakes();
      }
  
      // TODO pay rewards for some period
    });
  });
});

function calculateIncome(base: bigint, calcPeriod: bigint, iter = 0): bigint {
  const DAY = 7200n;
  const ACCURACY = 1_000_000_000n;
  const income = base + base * (ACCURACY * (calcPeriod * 5n) / (10_000n * DAY)) / ACCURACY ;
  
  if (iter > 1) {
    return calculateIncome(income, calcPeriod, iter - 1);
  } else return income;
}

// Wait while promotion period less than specified block, to avoid boundary cases
// 0 if this should be the beginning of the period.
async function waitPromotionPeriodDoesntEnd(helper: DevUniqueHelper, waitBlockLessThan = LOCKING_PERIOD / 3n) {
  const relayBlockNumber = (await helper.callRpc('api.query.parachainSystem.validationData', [])).value.relayParentNumber.toNumber(); // await helper.chain.getLatestBlockNumber();
  const currentPeriodBlock = BigInt(relayBlockNumber) % LOCKING_PERIOD;

  if (currentPeriodBlock > waitBlockLessThan) {
    await helper.wait.forRelayBlockNumber(BigInt(relayBlockNumber) + LOCKING_PERIOD - currentPeriodBlock);
  }
}
