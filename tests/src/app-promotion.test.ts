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
import {
  normalizeAccountId,
  getModuleNames,
  Pallets,
} from './util/helpers';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {usingPlaygrounds} from './util/playgrounds';

import {encodeAddress} from '@polkadot/util-crypto';
import {stringToU8a} from '@polkadot/util';
import {ApiPromise} from '@polkadot/api';
import {SponsoringMode, contractHelpers, createEthAccountWithBalance, deployFlipper, itWeb3, transferBalanceToEth} from './eth/util/helpers';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let palletAdmin: IKeyringPair;
let nominal: bigint;
const palletAddress = calculatePalleteAddress('appstake');
let accounts: IKeyringPair[] = [];

before(async function () {
  await usingPlaygrounds(async (helper, privateKeyWrapper) => {
    if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
    alice = privateKeyWrapper('//Alice');
    palletAdmin = privateKeyWrapper('//Charlie'); // TODO use custom address
    await helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: palletAdmin.address})));
    nominal = helper.balance.getOneTokenNominal();
    await helper.balance.transferToSubstrate(alice, palletAdmin.address, 1000n * nominal);
    await helper.balance.transferToSubstrate(alice, palletAddress, 1000n * nominal);
    if (!promotionStartBlock) {
      promotionStartBlock = (await helper.api!.query.parachainSystem.lastRelayChainBlockNumber()).toNumber();
    }
    await helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.startAppPromotion(promotionStartBlock!)));
    accounts = await helper.arrange.createCrowd(100, 1000n, alice); // create accounts-pool to speed up tests
  });
});

after(async function () {
  await usingPlaygrounds(async (helper) => {
  });
});

describe('app-promotions.stake extrinsic', () => {
  it('should "lock" staking balance, add it to "staked" map, and increase "totalStaked" amount', async () => {
    await usingPlaygrounds(async (helper) => {
      const [staker, recepient] = [accounts.pop()!, accounts.pop()!];
      const totalStakedBefore = await helper.staking.getTotalStaked();

      // Minimum stake amount is 100:
      await expect(helper.staking.stake(staker, 100n * nominal - 1n)).to.be.eventually.rejected;
      await helper.staking.stake(staker, 100n * nominal);

      // Staker balance is: miscFrozen: 100, feeFrozen: 100, reserved: 0n...
      // ...so he can not transfer 900
      expect (await helper.balance.getSubstrateFull(staker.address)).to.contain({miscFrozen: 100n * nominal, feeFrozen: 100n * nominal, reserved: 0n});
      await expect(helper.balance.transferToSubstrate(staker, recepient.address, 900n * nominal)).to.be.rejected;
      
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(100n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(100n * nominal);
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n);
      // it is potentially flaky test. Promotion can credited some tokens. Maybe we need to use closeTo? 
      expect(await helper.staking.getTotalStaked()).to.be.equal(totalStakedBefore + 100n * nominal); // total tokens amount staked in app-promotion increased 

      
      await helper.staking.stake(staker, 200n * nominal);
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(300n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(300n * nominal);
      expect((await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map((x) => x[1])).to.be.deep.equal([100n * nominal, 200n * nominal]);
    });
  });

  it('should allow to create maximum 10 stakes for account', async () => {
    await usingPlaygrounds(async (helper) => {
      const [staker] = await helper.arrange.createAccounts([2000n], alice);
      console.log(staker.address);
      for (let i = 0; i < 10; i++) {
        await helper.staking.stake(staker, 100n * nominal);
      }

      // can have 10 stakes
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(1000n * nominal);
      expect(await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).to.have.length(10);

      await expect(helper.staking.stake(staker, 100n * nominal)).to.be.rejected;

      // After unstake can stake again
      await helper.staking.unstake(staker);
      await helper.staking.stake(staker, 100n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.equal(100n * nominal);
    });
  });
  
  it('should reject transaction if stake amount is more than total free balance minus frozen', async () => {
    await usingPlaygrounds(async helper => { 
      const staker = accounts.pop()!;

      // Can't stake full balance because Alice needs to pay some fee
      await expect(helper.staking.stake(staker, 1000n * nominal)).to.be.eventually.rejected;
      await helper.staking.stake(staker, 500n * nominal);

      // Can't stake 500 tkn because Alice has Less than 500 transferable;
      await expect(helper.staking.stake(staker, 500n * nominal)).to.be.eventually.rejected; 
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(500n * nominal);
    });
  });
  
  it('for different accounts in one block is possible', async () => {
    await usingPlaygrounds(async helper => {
      const crowd = [accounts.pop()!, accounts.pop()!, accounts.pop()!, accounts.pop()!];
      
      const crowdStartsToStake = crowd.map(user => helper.staking.stake(user, 100n * nominal));
      await expect(Promise.all(crowdStartsToStake)).to.be.eventually.fulfilled;

      const crowdStakes = await Promise.all(crowd.map(address => helper.staking.getTotalStaked({Substrate: address.address})));
      expect(crowdStakes).to.deep.equal([100n * nominal, 100n * nominal, 100n * nominal, 100n * nominal]);
    });
  });
});

describe('unstake balance extrinsic', () => {  
  it('should change balance state from "frozen" to "reserved", add it to "pendingUnstake" map, and subtract it from totalStaked', async () => {
    await usingPlaygrounds(async helper => {
      const [staker, recepient] = [accounts.pop()!, accounts.pop()!];
      const totalStakedBefore = await helper.staking.getTotalStaked();
      await helper.staking.stake(staker, 900n * nominal);
      await helper.staking.unstake(staker);

      // Right after unstake balance is reserved
      // Staker can not transfer 
      expect(await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 900n * nominal, miscFrozen: 0n, feeFrozen: 0n});
      await expect(helper.balance.transferToSubstrate(staker, recepient.address, 100n * nominal)).to.be.rejected;
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(900n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(0n);
      expect(await helper.staking.getTotalStaked()).to.be.equal(totalStakedBefore);
    });
  });

  it('should unlock balance after unlocking period ends and remove it from "pendingUnstake"', async () => {
    // TODO Flaky test
    await usingPlaygrounds(async (helper) => {
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.unstake(staker);

      // Wait for unstaking period. Balance now free ~1000; reserved, frozen, miscFrozeb: 0n
      await waitForRelayBlock(helper.api!, 20);
      expect(await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 0n, miscFrozen: 0n, feeFrozen: 0n});
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n);

      // staker can transfer:
      await helper.balance.transferToSubstrate(staker, alice.address, 998n * nominal);
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(1n);
    });
  });

  it('should successfully unstake multiple stakes', async () => {
    await usingPlaygrounds(async helper => {
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.stake(staker, 200n * nominal);
      await helper.staking.stake(staker, 300n * nominal);

      // staked: [100, 200, 300]; unstaked: 0
      let pendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      let unstakedPerBlock = (await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address})).map(stake => stake[1]);
      let stakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(stake => stake[1]);
      expect(pendingUnstake).to.be.deep.equal(0n);
      expect(unstakedPerBlock).to.be.deep.equal([]);
      expect(stakedPerBlock).to.be.deep.equal([100n * nominal, 200n * nominal, 300n * nominal]);
     
      // Can unstake multiple stakes
      await helper.staking.unstake(staker);
      pendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      unstakedPerBlock = (await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address})).map(stake => stake[1]);
      stakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(stake => stake[1]);
      expect(pendingUnstake).to.be.equal(600n * nominal);
      expect(stakedPerBlock).to.be.deep.equal([]);
      expect(unstakedPerBlock).to.be.deep.equal([600n * nominal]);

      expect (await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 600n * nominal, feeFrozen: 0n, miscFrozen: 0n});
      await waitForRelayBlock(helper.api!, 20);
      expect (await helper.balance.getSubstrateFull(staker.address)).to.deep.contain({reserved: 0n, feeFrozen: 0n, miscFrozen: 0n});
      expect (await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n);
    });
  });

  it('should not have any effects if no active stakes', async () => {
    await usingPlaygrounds(async (helper) => {
      const staker = accounts.pop()!;
      
      // unstake has no effect if no stakes at all
      await helper.staking.unstake(staker);
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(0n);
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(0n);
      expect(await helper.balance.getSubstrate(staker.address) / nominal).to.be.equal(999n); // TODO bigint closeTo helper

      // TODO stake() unstake() waitUnstaked() unstake();

      // can't unstake if there are only pendingUnstakes
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.unstake(staker);
      await helper.staking.unstake(staker);

      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(100n * nominal);
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(100n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(0n);
    });
  });

  it('should keep different unlocking block for each unlocking stake', async () => {
    await usingPlaygrounds(async (helper) => {
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.unstake(staker);
      await helper.staking.stake(staker, 120n * nominal);
      await helper.staking.unstake(staker);

      const unstakingPerBlock = await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address});
      expect(unstakingPerBlock).has.length(2);
      expect(unstakingPerBlock[0][1]).to.equal(100n * nominal);
      expect(unstakingPerBlock[1][1]).to.equal(120n * nominal);
    });
  });

  it('should be possible for different accounts in one block', async () => {
    await usingPlaygrounds(async (helper) => {
      const stakers = [accounts.pop()!, accounts.pop()!, accounts.pop()!];

      await Promise.all(stakers.map(staker => helper.staking.stake(staker, 100n * nominal)));
      await Promise.all(stakers.map(staker => helper.staking.unstake(staker)));

      await Promise.all(stakers.map(async (staker) => {
        expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(100n * nominal);
        expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(0n);
      }));
    });
  });

  // TODO for different accounts in one block is possible
});

describe('Admin adress', () => {
  it('can be set by sudo only', async () => {
    await usingPlaygrounds(async (helper) => {
      const nonAdmin = accounts.pop()!;
      // nonAdmin can not set admin not from himself nor as a sudo
      await expect(helper.signTransaction(nonAdmin, helper.api!.tx.promotion.setAdminAddress({Substrate: nonAdmin.address}))).to.be.eventually.rejected;
      await expect(helper.signTransaction(nonAdmin, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: nonAdmin.address})))).to.be.eventually.rejected;

      // Alice can
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: palletAdmin.address})))).to.be.eventually.fulfilled;
    });
  });
  
  it('can be any valid CrossAccountId', async () => {
    // We are not going to set an eth address as a sponsor,
    // but we do want to check, it doesn't break anything;
    await usingPlaygrounds(async (helper) => {
      const account = accounts.pop()!;
      const ethAccount = helper.address.substrateToEth(account.address); 
      // Alice sets Ethereum address as a sudo. Then Substrate address back...
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Ethereum: ethAccount})))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: palletAdmin.address})))).to.be.eventually.fulfilled;
      
      // ...It doesn't break anything;
      const collection = await helper.nft.mintCollection(account, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await expect(helper.signTransaction(account, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
    });
  });

  it('can be reassigned', async () => {
    await usingPlaygrounds(async (helper) => {
      const [oldAdmin, newAdmin, collectionOwner] = [accounts.pop()!, accounts.pop()!, accounts.pop()!];
      const collection  = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(oldAdmin))))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(newAdmin))))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(oldAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
      
      await expect(helper.signTransaction(newAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.fulfilled;
    });
  });
});

describe('App-promotion collection sponsoring', () => {
  before(async function () {
    await usingPlaygrounds(async (helper) => {
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: palletAdmin.address}));
      await helper.signTransaction(alice, tx);
    });
  });

  it('should actually sponsor transactions', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, tokenSender, receiver] = [accounts.pop()!, accounts.pop()!, accounts.pop()!];
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'Name', description: 'Description', tokenPrefix: 'Prefix', limits: {sponsorTransferTimeout: 0}});
      const token = await collection.mintToken(collectionOwner, {Substrate: tokenSender.address});
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId));
      const palletBalanceBefore = await helper.balance.getSubstrate(palletAddress);

      await token.transfer(tokenSender, {Substrate: receiver.address});
      expect (await token.getOwner()).to.be.deep.equal({Substrate: receiver.address});
      const palletBalanceAfter = await helper.balance.getSubstrate(palletAddress);

      // senders balance the same, transaction has sponsored
      expect (await helper.balance.getSubstrate(tokenSender.address)).to.be.equal(1000n * nominal);
      expect (palletBalanceBefore > palletBalanceAfter).to.be.true;
    });
  });

  it('can not be set by non admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, nonAdmin] = [accounts.pop()!, accounts.pop()!];

      const collection  = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(nonAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
      expect((await collection.getData())?.raw.sponsorship).to.equal('Disabled');
    });
  });

  it('should set pallet address as confirmed admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, oldSponsor] = [accounts.pop()!, accounts.pop()!];
      
      // Can set sponsoring for collection without sponsor
      const collectionWithoutSponsor = await helper.nft.mintCollection(collectionOwner, {name: 'No-sponsor', description: 'New Collection', tokenPrefix: 'Promotion'});
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionWithoutSponsor.collectionId))).to.be.eventually.fulfilled;
      expect((await collectionWithoutSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});

      // Can set sponsoring for collection with unconfirmed sponsor
      const collectionWithUnconfirmedSponsor = await helper.nft.mintCollection(collectionOwner, {name: 'Unconfirmed', description: 'New Collection', tokenPrefix: 'Promotion', pendingSponsor: oldSponsor.address});
      expect((await collectionWithUnconfirmedSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Unconfirmed: oldSponsor.address});
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionWithUnconfirmedSponsor.collectionId))).to.be.eventually.fulfilled;
      expect((await collectionWithUnconfirmedSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});

      // Can set sponsoring for collection with confirmed sponsor
      const collectionWithConfirmedSponsor = await helper.nft.mintCollection(collectionOwner, {name: 'Confirmed', description: 'New Collection', tokenPrefix: 'Promotion', pendingSponsor: oldSponsor.address});
      await collectionWithConfirmedSponsor.confirmSponsorship(oldSponsor);
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionWithConfirmedSponsor.collectionId))).to.be.eventually.fulfilled;
      expect((await collectionWithConfirmedSponsor.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
    });
  });

  it('can be overwritten by collection owner', async () => {    
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, newSponsor] = [accounts.pop()!, accounts.pop()!];
      const collection  = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      
      // Collection limits still can be changed by the owner
      expect(await collection.setLimits(collectionOwner, {sponsorTransferTimeout: 0})).to.be.true;
      expect((await collection.getData())?.raw.limits.sponsorTransferTimeout).to.be.equal(0);
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});

      // Collection sponsor can be changed too
      expect((await collection.setSponsor(collectionOwner, newSponsor.address))).to.be.true;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Unconfirmed: newSponsor.address});
    });
  });
  
  it('should not overwrite collection limits set by the owner earlier', async () => {
    await usingPlaygrounds(async (helper) => {
      const limits = {ownerCanDestroy: true, ownerCanTransfer: true, sponsorTransferTimeout: 0};
      const collectionWithLimits = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion', limits});

      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionWithLimits.collectionId))).to.be.eventually.fulfilled;
      expect((await collectionWithLimits.getData())?.raw.limits).to.be.deep.contain(limits);
    });
  });
  
  it('should reject transaction if collection doesn\'t exist', async () => {
    await usingPlaygrounds(async (helper) => {
      const collectionOwner = accounts.pop()!;
      
      // collection has never existed
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(999999999))).to.be.eventually.rejected;
      // collection has been burned
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await collection.burn(collectionOwner);

      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
    });
  });
});

describe('app-promotion stopSponsoringCollection', () => {
  it('can not be called by non-admin', async () => {    
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, nonAdmin] = [accounts.pop()!, accounts.pop()!];
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.fulfilled;
      
      await expect(helper.signTransaction(nonAdmin, helper.api!.tx.promotion.stopSponsoringCollection(collection.collectionId))).to.be.eventually.rejected;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
    });
  });

  it('should set sponsoring as disabled', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, recepient] = [accounts.pop()!, accounts.pop()!];
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion', limits: {sponsorTransferTimeout: 0}});
      const token = await collection.mintToken(collectionOwner, {Substrate: collectionOwner.address});
      
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId));
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsoringCollection(collection.collectionId));
      
      expect((await collection.getData())?.raw.sponsorship).to.be.equal('Disabled');

      // Transactions are not sponsored anymore:
      const ownerBalanceBefore = await helper.balance.getSubstrate(collectionOwner.address);
      await token.transfer(collectionOwner, {Substrate: recepient.address});
      const ownerBalanceAfter = await helper.balance.getSubstrate(collectionOwner.address);
      expect(ownerBalanceAfter < ownerBalanceBefore).to.be.equal(true);
    });
  });

  it('should not affect collection which is not sponsored by pallete', async () => {
    await usingPlaygrounds(async (helper) => {
      const collectionOwner = accounts.pop()!;
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion', pendingSponsor: collectionOwner.address});
      await collection.confirmSponsorship(collectionOwner);
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsoringCollection(collection.collectionId))).to.be.eventually.rejected;
      
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: collectionOwner.address});
    });
  });

  it('should reject transaction if collection does not exist', async () => {    
    await usingPlaygrounds(async (helper) => {
      const collectionOwner = accounts.pop()!;
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await collection.burn(collectionOwner);
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsoringCollection(collection.collectionId))).to.be.eventually.rejected;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsoringCollection(999999999))).to.be.eventually.rejected;
    });
  });
});

describe('app-promotion contract sponsoring', () => {
  itWeb3('should set palletes address as a sponsor', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);
      const contractMethods = contractHelpers(web3, contractOwner);

      await helper.signTransaction(palletAdmin, api.tx.promotion.sponsorConract(flipper.options.address));
      
      expect(await contractMethods.methods.hasSponsor(flipper.options.address).call()).to.be.true;  
      expect((await api.query.evmContractHelpers.owner(flipper.options.address)).toJSON()).to.be.equal(contractOwner);  
      expect((await api.query.evmContractHelpers.sponsoring(flipper.options.address)).toJSON()).to.deep.equal({
        confirmed: {
          substrate: palletAddress,
        },
      });
    });
  });

  itWeb3('should overwrite sponsoring mode and existed sponsor', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);
      const contractMethods = contractHelpers(web3, contractOwner);

      await expect(contractMethods.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;

      // Contract is self sponsored
      expect((await api.query.evmContractHelpers.sponsoring(flipper.options.address)).toJSON()).to.be.deep.equal({
        confirmed: {
          ethereum: flipper.options.address.toLowerCase(),
        },
      });

      // set promotion sponsoring
      await helper.signTransaction(palletAdmin, api.tx.promotion.sponsorConract(flipper.options.address));

      // new sponsor is pallet address
      expect(await contractMethods.methods.hasSponsor(flipper.options.address).call()).to.be.true;  
      expect((await api.query.evmContractHelpers.owner(flipper.options.address)).toJSON()).to.be.equal(contractOwner);  
      expect((await api.query.evmContractHelpers.sponsoring(flipper.options.address)).toJSON()).to.deep.equal({
        confirmed: {
          substrate: palletAddress,
        },
      });
    });
  });

  itWeb3('can be overwritten by contract owner', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {      
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);
      const contractMethods = contractHelpers(web3, contractOwner);

      // contract sponsored by pallet
      await helper.signTransaction(palletAdmin, api.tx.promotion.sponsorConract(flipper.options.address));

      // owner sets self sponsoring
      await expect(contractMethods.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;

      expect(await contractMethods.methods.hasSponsor(flipper.options.address).call()).to.be.true;  
      expect((await api.query.evmContractHelpers.owner(flipper.options.address)).toJSON()).to.be.equal(contractOwner);  
      expect((await api.query.evmContractHelpers.sponsoring(flipper.options.address)).toJSON()).to.deep.equal({
        confirmed: {
          ethereum: flipper.options.address.toLowerCase(),
        },
      });
    });
  });

  itWeb3('can not be set by non admin', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {      
      const nonAdmin = accounts.pop()!;
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);
      const contractMethods = contractHelpers(web3, contractOwner);

      await expect(contractMethods.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;

      // nonAdmin calls sponsorConract
      await expect(helper.signTransaction(nonAdmin, api.tx.promotion.sponsorConract(flipper.options.address))).to.be.rejected;

      // contract still self-sponsored 
      expect((await api.query.evmContractHelpers.sponsoring(flipper.options.address)).toJSON()).to.deep.equal({
        confirmed: {
          ethereum: flipper.options.address.toLowerCase(),
        },
      });
    });

    itWeb3('should be rejected for non-contract address', async ({api, web3, privateKeyWrapper}) => {
      await usingPlaygrounds(async (helper) => {

      });
    });
  });

  itWeb3('should actually sponsor transactions', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {      
      const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);
      const contractHelper = contractHelpers(web3, contractOwner);
      await contractHelper.methods.setSponsoringRateLimit(flipper.options.address, 0).send({from: contractOwner});
      await contractHelper.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: contractOwner});
      await transferBalanceToEth(api, alice, flipper.options.address, 1000n);

      await helper.signTransaction(palletAdmin, api.tx.promotion.sponsorConract(flipper.options.address));
      await flipper.methods.flip().send({from: caller});
      expect(await flipper.methods.getValue().call()).to.be.true;

      const callerBalance = await helper.balance.getEthereum(caller);
      const contractBalanceAfter = await helper.balance.getEthereum(flipper.options.address);

      expect(callerBalance).to.be.equal(1000n * nominal);
      expect(1000n * nominal > contractBalanceAfter).to.be.true;
    });
  });
});

describe('app-promotion stopSponsoringContract', () => {  
  itWeb3('should remove pallet address from contract sponsors', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {      
      const caller = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);
      await transferBalanceToEth(api, alice, flipper.options.address);
      const contractHelper = contractHelpers(web3, contractOwner);
      await contractHelper.methods.setSponsoringMode(flipper.options.address, SponsoringMode.Generous).send({from: contractOwner});
      await helper.signTransaction(palletAdmin, api.tx.promotion.sponsorConract(flipper.options.address));
      await helper.signTransaction(palletAdmin, api.tx.promotion.stopSponsoringContract(flipper.options.address));

      expect(await contractHelper.methods.hasSponsor(flipper.options.address).call()).to.be.false;  
      expect((await api.query.evmContractHelpers.owner(flipper.options.address)).toJSON()).to.be.equal(contractOwner);  
      expect((await api.query.evmContractHelpers.sponsoring(flipper.options.address)).toJSON()).to.deep.equal({
        disabled: null,
      });

      await flipper.methods.flip().send({from: caller});
      expect(await flipper.methods.getValue().call()).to.be.true;

      const callerBalance = await helper.balance.getEthereum(caller);
      const contractBalanceAfter = await helper.balance.getEthereum(flipper.options.address);

      // caller payed for call
      expect(1000n * nominal > callerBalance).to.be.true;
      expect(contractBalanceAfter).to.be.equal(1000n * nominal);
    });
  });

  itWeb3('can not be called by non-admin', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {      
      const nonAdmin = accounts.pop()!;
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);

      await helper.signTransaction(palletAdmin, api.tx.promotion.sponsorConract(flipper.options.address));
      await expect(helper.signTransaction(nonAdmin, api.tx.promotion.stopSponsoringContract(flipper.options.address))).to.be.rejected;
    });
  });

  itWeb3('should not affect a contract which is not sponsored by pallete', async ({api, web3, privateKeyWrapper}) => {
    await usingPlaygrounds(async (helper) => {      
      const nonAdmin = accounts.pop()!;
      const contractOwner = (await createEthAccountWithBalance(api, web3, privateKeyWrapper)).toLowerCase();
      const flipper = await deployFlipper(web3, contractOwner);
      const contractHelper = contractHelpers(web3, contractOwner);
      await expect(contractHelper.methods.selfSponsoredEnable(flipper.options.address).send()).to.be.not.rejected;

      await expect(helper.signTransaction(nonAdmin, api.tx.promotion.stopSponsoringContract(flipper.options.address))).to.be.rejected;
    });
  });
});

describe('app-promotion rewards', () => {
  it('can not be called by non admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const nonAdmin = accounts.pop()!;
      await expect(helper.signTransaction(nonAdmin, helper.api!.tx.promotion.payoutStakers(100))).to.be.rejected;
    });
  });

  it('should credit 0.05% for staking period', async () => {    
    // TODO flaky test
    await usingPlaygrounds(async helper => {
      const staker = accounts.pop()!;
      
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.stake(staker, 200n * nominal);
      await waitForRelayBlock(helper.api!, 30);
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.payoutStakers(100));

      const totalStakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(s => s[1]);
      expect(totalStakedPerBlock).to.be.deep.equal([calculateIncome(100n * nominal, 10n), calculateIncome(200n * nominal, 10n)]);
    });
  });

  it('shoud be paid for more than one period if payments was missed', async () => {
    // TODO flaky test
    await usingPlaygrounds(async (helper) => {
      const staker = accounts.pop()!;

      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.stake(staker, 200n * nominal);

      await waitForRelayBlock(helper.api!, 55);
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.payoutStakers(100));
      const stakedPerBlock = await helper.staking.getTotalStakedPerBlock({Substrate: staker.address});
      expect(stakedPerBlock[0][1]).to.be.equal(calculateIncome(100n * nominal, 10n, 2));
      expect(stakedPerBlock[1][1]).to.be.equal(calculateIncome(200n * nominal, 10n, 2));

      const stakerFullBalance = await helper.balance.getSubstrateFull(staker.address);
      const frozenBalanceShouldBe = calculateIncome(300n * nominal, 10n, 2);

      expect(stakerFullBalance).to.contain({reserved: 0n, feeFrozen: frozenBalanceShouldBe, miscFrozen: frozenBalanceShouldBe});
    });
  });
  
  it('should not be credited for unstaked (reserved) balance', async () => {
    await usingPlaygrounds(async helper => {
      // staker unstakes before rewards has been initialized
      const staker = accounts.pop()!;
      await helper.staking.stake(staker, 100n * nominal);
      await waitForRelayBlock(helper.api!, 40);
      await helper.staking.unstake(staker);
      
      // so he did not receive any rewards
      const totalBalanceBefore = await helper.balance.getSubstrate(staker.address);
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.payoutStakers(100));
      const totalBalanceAfter = await helper.balance.getSubstrate(staker.address);

      expect(totalBalanceBefore).to.be.equal(totalBalanceAfter);
    });
  });
  
  it('should bring compound interest', async () => {
    // TODO flaky test
    await usingPlaygrounds(async helper => {
      const staker = accounts.pop()!;
            
      await helper.staking.stake(staker, 100n * nominal);
      await helper.staking.stake(staker, 200n * nominal);
      await helper.staking.stake(staker, 300n * nominal);
      
      await waitForRelayBlock(helper.api!, 34);
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.payoutStakers(100));
      let totalStakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(s => s[1]);
      expect(totalStakedPerBlock).to.deep.equal([calculateIncome(100n * nominal, 10n), calculateIncome(200n * nominal, 10n), calculateIncome(300n * nominal, 10n)]);
      
      await waitForRelayBlock(helper.api!, 20);
      await helper.signTransaction(palletAdmin, helper.api!.tx.promotion.payoutStakers(100));
      totalStakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(s => s[1]);
      expect(totalStakedPerBlock).to.deep.equal([calculateIncome(100n * nominal, 10n, 2), calculateIncome(200n * nominal, 10n, 2), calculateIncome(300n * nominal, 10n, 2)]);      
    });
  });

  it.skip('can handle 40.000 rewards', async () => {
    await usingPlaygrounds(async (helper) => {
      const [donor] = await helper.arrange.createAccounts([7_000_000n], alice);
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

async function waitForRelayBlock(api: ApiPromise, blocks = 1): Promise<void> {
  const current_block = (await api.query.parachainSystem.lastRelayChainBlockNumber()).toNumber();
  return new Promise<void>(async (resolve, reject) => {
    const unsubscribe = await api.query.parachainSystem.validationData(async (data) => {
      // console.log(`${current_block} || ${data.value.relayParentNumber.toNumber()}`);
      if (data.value.relayParentNumber.toNumber() - current_block >= blocks) {
        unsubscribe();
        resolve();
      }
    });
  });
}

function calculatePalleteAddress(palletId: any) {
  const address = stringToU8a(('modl' + palletId).padEnd(32, '\0'));
  return encodeAddress(address);
}

function calculateIncome(base: bigint, calcPeriod: bigint, iter = 0): bigint {
  const DAY = 7200n;
  const ACCURACY = 1_000_000_000n;
  const income = base + base * (ACCURACY * (calcPeriod * 5n) / (10_000n * DAY)) / ACCURACY ;
  
  if (iter > 1) {
    return calculateIncome(income, calcPeriod, iter - 1);
  } else return income;
}
