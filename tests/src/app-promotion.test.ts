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

import {encodeAddress, mnemonicGenerate} from '@polkadot/util-crypto';
import {stringToU8a} from '@polkadot/util';
import {ApiPromise} from '@polkadot/api';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let palletAdmin: IKeyringPair;
let nominal: bigint;
let promotionStartBlock: number | null = null;
const palletAddress = calculatePalleteAddress('appstake');

before(async function () {
  await usingPlaygrounds(async (helper, privateKeyWrapper) => {
    if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
    alice = privateKeyWrapper('//Alice');
    bob = privateKeyWrapper('//Bob');
    palletAdmin = privateKeyWrapper('//palletAdmin');
    nominal = helper.balance.getOneTokenNominal();
    await helper.balance.transferToSubstrate(alice, palletAdmin.address, 100n * nominal);
    await helper.balance.transferToSubstrate(alice, palletAddress, 100n * nominal);
    if (!promotionStartBlock) {
      promotionStartBlock = (await helper.api!.query.parachainSystem.lastRelayChainBlockNumber()).toNumber();
    }
    await helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.startAppPromotion(promotionStartBlock!)));
  });
});

after(async function () {
  await usingPlaygrounds(async (helper) => {
    await helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.stopAppPromotion()));
  });
});

describe('app-promotions.stake extrinsic', () => {
  it('should change balance state to "locked", add it to "staked" map, and increase "totalStaked" amount', async () => {
    await usingPlaygrounds(async (helper) => {
      const totalStakedBefore = await helper.staking.getTotalStaked();
      const [staker] = await helper.arrange.creteAccounts([10n], alice);
   
      // Minimum stake amount is 1:
      await expect(helper.staking.stake(staker, nominal - 1n)).to.be.eventually.rejected;
      await helper.staking.stake(staker, nominal);
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(nominal);

      // TODO add helpers to assert bigints. Check balance close to 10
      expect(await helper.balance.getSubstrate(staker.address) - 9n * nominal >= (nominal / 2n)).to.be.true;
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(nominal);
      // it is potentially flaky test. Promotion can credited some tokens. Maybe we need to use closeTo? 
      expect(await helper.staking.getTotalStaked()).to.be.equal(totalStakedBefore + nominal); // total tokens amount staked in app-promotion increased 

      await helper.staking.stake(staker, 2n * nominal);
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(3n * nominal);
      
      const stakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map((x) => x[1]);
      expect(stakedPerBlock).to.be.deep.equal([nominal, 2n * nominal]);
    });
  });
  
  it('should reject transaction if stake amount is more than total free balance', async () => {
    await usingPlaygrounds(async helper => { 
      const [staker] = await helper.arrange.creteAccounts([10n], alice);

      // Can't stake full balance because Alice needs to pay some fee
      await expect(helper.staking.stake(staker, 10n * nominal)).to.be.eventually.rejected;
      await helper.staking.stake(staker, 7n * nominal);

      // Can't stake 4 tkn because Alice has ~3 free tkn, and 7 locked
      await expect(helper.staking.stake(staker, 4n * nominal)).to.be.eventually.rejected; 
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(7n * nominal);
    });
  });
  
  it('for different accounts in one block is possible', async () => {
    await usingPlaygrounds(async helper => {
      const crowd = await helper.arrange.creteAccounts([10n, 10n, 10n, 10n], alice);
      
      const crowdStartsToStake = crowd.map(user => helper.staking.stake(user, nominal));
      await expect(Promise.all(crowdStartsToStake)).to.be.eventually.fulfilled;

      const crowdStakes = await Promise.all(crowd.map(address => helper.staking.getTotalStaked({Substrate: address.address})));
      expect(crowdStakes).to.deep.equal([nominal, nominal, nominal, nominal]);
    });
  });
  // TODO it('Staker stakes 5 times in one block with nonce');
  // TODO it('Staked balance appears as locked in the balance pallet');
  // TODO it('Alice stakes huge amount of tokens');
});

describe('unstake balance extrinsic', () => {  
  it('should change balance state to "reserved", add it to "pendingUnstake" map, and subtract it from totalStaked', async () => {
    await usingPlaygrounds(async helper => {
      const totalStakedBefore = await helper.staking.getTotalStaked();
      const [staker] = await helper.arrange.creteAccounts([10n], alice);
      await helper.staking.stake(staker, 5n * nominal);
      await helper.staking.unstake(staker, 3n * nominal);

      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(3n * nominal);
      expect(await helper.staking.getTotalStaked({Substrate: staker.address})).to.be.equal(2n * nominal);
      expect(await helper.staking.getTotalStaked()).to.be.equal(totalStakedBefore + 2n * nominal);
    });
  });

  it('should remove from the "staked" map starting from the oldest entry', async () => {
    await usingPlaygrounds(async helper => {
      const [staker] = await helper.arrange.creteAccounts([100n], alice);
      await helper.staking.stake(staker, 10n * nominal);
      await helper.staking.stake(staker, 20n * nominal);
      await helper.staking.stake(staker, 30n * nominal);

      // staked: [10, 20, 30]; unstaked: 0
      let pendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      let unstakedPerBlock = (await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address})).map(stake => stake[1]);
      let stakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(stake => stake[1]);
      expect(pendingUnstake).to.be.deep.equal(0n);
      expect(unstakedPerBlock).to.be.deep.equal([]);
      expect(stakedPerBlock).to.be.deep.equal([10n * nominal, 20n * nominal, 30n * nominal]);
     
      // Can unstake the part of a stake
      await helper.staking.unstake(staker, 5n * nominal);
      pendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      unstakedPerBlock = (await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address})).map(stake => stake[1]);
      stakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(stake => stake[1]);
      expect(pendingUnstake).to.be.equal(5n * nominal);
      expect(stakedPerBlock).to.be.deep.equal([5n * nominal, 20n * nominal, 30n * nominal]);
      expect(unstakedPerBlock).to.be.deep.equal([5n * nominal]);

      // Can unstake one stake totally and one more partially
      await helper.staking.unstake(staker, 10n * nominal);
      pendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      unstakedPerBlock = (await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address})).map(stake => stake[1]);
      stakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(stake => stake[1]);
      expect(pendingUnstake).to.be.equal(15n * nominal);
      expect(stakedPerBlock).to.be.deep.equal([15n * nominal, 30n * nominal]);
      expect(unstakedPerBlock).to.deep.equal([5n * nominal, 10n * nominal]);

      // Can totally unstake 2 stakes in one tx
      await helper.staking.unstake(staker, 45n * nominal);
      pendingUnstake = await helper.staking.getPendingUnstake({Substrate: staker.address});
      unstakedPerBlock = (await helper.staking.getPendingUnstakePerBlock({Substrate: staker.address})).map(stake => stake[1]);
      stakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(stake => stake[1]);
      expect(pendingUnstake).to.be.equal(60n * nominal);
      expect(stakedPerBlock).to.deep.equal([]);
      expect(unstakedPerBlock).to.deep.equal([5n * nominal, 10n * nominal, 45n * nominal]);
    });
  });

  it('should reject transaction if unstake amount is greater than staked', async () => {
    await usingPlaygrounds(async (helper) => {
      const [staker] = await helper.arrange.creteAccounts([10n], alice);
      
      // can't unstsake more than one stake amount
      await helper.staking.stake(staker, 1n * nominal);
      await expect(helper.staking.unstake(staker, 1n * nominal + 1n)).to.be.eventually.rejected;
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(0n);
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(1n * nominal);

      // can't unstsake more than two stakes amount
      await helper.staking.stake(staker, 1n * nominal);
      await expect(helper.staking.unstake(staker, 2n * nominal + 1n)).to.be.eventually.rejected;
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(0n);
      expect(await helper.staking.getTotalStakingLocked({Substrate: staker.address})).to.be.equal(2n * nominal);

      // can't unstake more than have with nonce // TODO not sure we need this assertion
      const nonce1 = await helper.chain.getNonce(staker.address);
      const nonce2 = nonce1 + 1;
      const unstakeMoreThanHaveWithNonce = Promise.all([
        helper.signTransaction(staker, helper.constructApiCall('api.tx.promotion.unstake', [1n * nominal]), 'unstaking 1', {nonce: nonce1}),
        helper.signTransaction(staker, helper.constructApiCall('api.tx.promotion.unstake', [1n * nominal + 1n]), 'unstaking 1+', {nonce: nonce2}),
      ]);
      await expect(unstakeMoreThanHaveWithNonce).to.be.rejected;
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(1n * nominal);
    });
  });

  it('should allow to unstake even smallest unit', async () => {
    await usingPlaygrounds(async (helper) => {
      const [staker] = await helper.arrange.creteAccounts([10n], alice);
      await helper.staking.stake(staker, nominal);
      // unstake .000...001 is possible
      await helper.staking.unstake(staker, 1n);
      expect(await helper.staking.getPendingUnstake({Substrate: staker.address})).to.be.equal(1n);
    });
  });

  it('should work fine if stake amount is smallest unit', async () => {
    await usingPlaygrounds(async (helper) => {
      const [staker] = await helper.arrange.creteAccounts([10n], alice);
      await helper.staking.stake(staker, nominal);
      await helper.staking.unstake(staker, nominal - 1n);
      await waitForRecalculationBlock(helper.api!);

      // Everything fine, blockchain alive
      await helper.nft.mintCollection(staker, {name: 'name', description: 'description', tokenPrefix: 'prefix'});
    });
  });

  // TODO will return balance to "available" state after the period of unstaking is finished, and subtract it from "pendingUnstake
  // TODO for different accounts in one block is possible
});

describe('Admin adress', () => {
  it('can be set by sudo only', async () => {
    await usingPlaygrounds(async (helper) => {
      // Bob can not set admin not from himself nor as a sudo
      await expect(helper.signTransaction(bob, helper.api!.tx.promotion.setAdminAddress({Substrate: bob.address}))).to.be.eventually.rejected;
      await expect(helper.signTransaction(bob, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: bob.address})))).to.be.eventually.rejected;

      // Alice can
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: palletAdmin.address})))).to.be.eventually.fulfilled;
    });
  });
  
  it('can be any valid CrossAccountId', async () => {
    // We are not going to set an eth address as a sponsor,
    // but we do want to check, it doesn't break anything;
    await usingPlaygrounds(async (helper) => {
      const [charlie] = await helper.arrange.creteAccounts([10n], alice);
      const ethCharlie = helper.address.substrateToEth(charlie.address); 
      // Alice sets Ethereum address as a sudo. Then Substrate address back...
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Ethereum: ethCharlie})))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress({Substrate: palletAdmin.address})))).to.be.eventually.fulfilled;
      
      // ...It doesn't break anything;
      const collection = await helper.nft.mintCollection(charlie, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await expect(helper.signTransaction(charlie, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
    });
  });

  it('can be reassigned', async () => {
    await usingPlaygrounds(async (helper) => {
      const [oldAdmin, newAdmin, collectionOwner] = await helper.arrange.creteAccounts([10n, 10n, 10n], alice);
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
    
  it('can not be set by non admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, nonAdmin] = await helper.arrange.creteAccounts([10n, 10n], alice);

      const collection  = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(nonAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
      expect((await collection.getData())?.raw.sponsorship).to.equal('Disabled');
    });
  });

  it('should set pallet address as confirmed admin', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, oldSponsor] = await helper.arrange.creteAccounts([20n, 20n], alice);
      
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
      const [collectionOwner, newSponsor] = await helper.arrange.creteAccounts([20n, 0n], alice);
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
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(999999999))).to.be.eventually.rejected;
    });
  });

  it('should reject transaction if collection was burnt', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner] = await helper.arrange.creteAccounts([10n], alice);
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await collection.burn(collectionOwner);

      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
    });
  });
});

describe('app-promotion stopSponsoringCollection', () => {
  it('can not be called by non-admin', async () => {    
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner, nonAdmin] = await helper.arrange.creteAccounts([10n, 10n], alice);
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.fulfilled;
      
      await expect(helper.signTransaction(nonAdmin, helper.api!.tx.promotion.stopSponsorignCollection(collection.collectionId))).to.be.eventually.rejected;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: palletAddress});
    });
  });

  it('should set sponsoring as disabled', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner] = await helper.arrange.creteAccounts([10n, 10n], alice);
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsorignCollection(collection.collectionId))).to.be.eventually.fulfilled;
      
      expect((await collection.getData())?.raw.sponsorship).to.be.equal('Disabled');
    });
  });

  it('should not affect collection which is not sponsored by pallete', async () => {
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner] = await helper.arrange.creteAccounts([10n, 10n], alice);
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion', pendingSponsor: collectionOwner.address});
      await collection.confirmSponsorship(collectionOwner);
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsorignCollection(collection.collectionId))).to.be.eventually.rejected;
      
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: collectionOwner.address});
    });
  });

  it('should reject transaction if collection does not exist', async () => {    
    await usingPlaygrounds(async (helper) => {
      const [collectionOwner] = await helper.arrange.creteAccounts([10n], alice);
      const collection = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await collection.burn(collectionOwner);
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsorignCollection(collection.collectionId))).to.be.eventually.rejected;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsorignCollection(999999999))).to.be.eventually.rejected;
    });
  });
});

describe('app-promotion contract sponsoring', () => {
  it('will set contract sponsoring mode and set palletes address as a sponsor', async () => {
    // arrange: Alice deploys Flipper
    
    // act:     Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  contract.sponsoringMode = TODO
    // assert:  contract.sponsor to be PalleteAddress
  });

  it('will overwrite sponsoring mode and existed sponsor', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Alice sets self sponsoring for Flipper

    // act:     Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  contract.sponsoringMode = TODO
    // assert:  contract.sponsor to be PalleteAddress
  });

  it('can be overwritten by contract owner', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)

    // act:     Alice sets self sponsoring for Flipper

    // assert:  contract.sponsoringMode = Self
    // assert:  contract.sponsor to be contract
  });

  it('can not be set by non admin', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Alice sets self sponsoring for Flipper

    // assert:  Random calls appPromotion.sponsorContract(Flipper.address) throws
    // assert:  contract.sponsoringMode = Self
    // assert:  contract.sponsor to be contract
  });

  it('will return unused gas fee to app-promotion pallete', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  Bob calls Flipper - expect balances deposit event do not appears for Bob /// Unused gas fee returns to contract
    // assert:  Bobs balance the same
  });

  it('will failed for non contract address', async () => {
    // arrange: web3 creates new address - 0x0

    // assert: Admin calls appPromotion.sponsorContract(0x0) throws
    // assert: Admin calls appPromotion.sponsorContract(Substrate address) throws
  });

  it('will actually sponsor transactions', async () => {
    // TODO test it because this is a new way of contract sponsoring
  });
});

describe('app-promotion stopSponsoringContract', () => {
  before(async function () {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      await helper.balance.transferToSubstrate(alice, palletAdmin.address, 10n * helper.balance.getOneTokenNominal());
      await helper.balance.transferToSubstrate(alice, palletAddress, 10n * helper.balance.getOneTokenNominal());
      
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin)));
      await helper.signTransaction(alice, tx);
      
      nominal = helper.balance.getOneTokenNominal();
    });
  });
  
  it('will set contract sponsoring mode as disabled', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)
    
    // act:     Admin calls appPromotion.stopSponsoringContract(Flipper.address)
    // assert:  contract sponsoring mode = TODO

    // act:     Bob calls Flipper

    // assert:  PalleteAddress balance did not change
    // assert:  Bobs balance less than before /// Bob payed some fee
  });

  it('can not be called by non-admin', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Admin calls appPromotion.sponsorContract(Flipper.address)

    // assert:  Random calls appPromotion.stopSponsoringContract(Flipper.address) throws
    // assert:  contract sponsor is PallereAddress
  });

  it('will not affect a contract which is not sponsored by pallete', async () => {
    // arrange: Alice deploys Flipper
    // arrange: Alice sets self sponsoring for Flipper
    
    // act:     Admin calls appPromotion.stopSponsoringContract(Flipper.address) throws

    // assert:  contract.sponsoringMode = Self
    // assert:  contract.sponsor to be contract
  });

  it('will failed for non contract address', async () => {
    // arrange: web3 creates new address - 0x0

    // expect stopSponsoringContract(0x0) throws
  });
});

describe('app-promotion rewards', () => {
  it('should credit 0.05% for staking period', async () => {    
    await usingPlaygrounds(async helper => {
      const [staker] = await helper.arrange.creteAccounts([50n], alice);
      await waitForRecalculationBlock(helper.api!);
      
      await helper.staking.stake(staker, 1n * nominal);
      await helper.staking.stake(staker, 2n * nominal);
      await waitForRelayBlock(helper.api!, 36);
      
      const totalStakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(s => s[1]);
      expect(totalStakedPerBlock).to.be.deep.equal([calculateIncome(nominal, 10n), calculateIncome(2n * nominal, 10n)]);
    });
  });
  
  it('should not be credited for unstaked (reserved) balance', async () => {
    await usingPlaygrounds(async helper => {
      expect.fail('Implement me after unstake method will be fixed');
    });
  });
  
  it('should bring compound interest', async () => {
    await usingPlaygrounds(async helper => {
      const [staker] = await helper.arrange.creteAccounts([80n], alice);
      
      await waitForRecalculationBlock(helper.api!);
      
      await helper.staking.stake(staker, 10n * nominal);
      await helper.staking.stake(staker, 20n * nominal);
      await helper.staking.stake(staker, 30n * nominal);
      
      await waitForRelayBlock(helper.api!, 34);
      let totalStakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(s => s[1]);
      expect(totalStakedPerBlock).to.deep.equal([calculateIncome(10n * nominal, 10n), calculateIncome(20n * nominal, 10n), calculateIncome(30n * nominal, 10n)]);
      
      await waitForRelayBlock(helper.api!, 20);
      totalStakedPerBlock = (await helper.staking.getTotalStakedPerBlock({Substrate: staker.address})).map(s => s[1]);
      expect(totalStakedPerBlock).to.deep.equal([calculateIncome(10n * nominal, 10n, 2), calculateIncome(20n * nominal, 10n, 2), calculateIncome(30n * nominal, 10n, 2)]);      
    });
  });

  // TODO (load test. Can pay reward for 10000 addresses)
});


function waitForRecalculationBlock(api: ApiPromise): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    const unsubscribe = await  api.query.system.events((events) => {
     
      events.forEach((record) => {
      
        const {event, phase} = record;
        const types = event.typeDef;
        
        if (event.section === 'promotion' && event.method === 'StakingRecalculation') {
          unsubscribe();
          resolve();
        }
      });
    });
  });
}

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
