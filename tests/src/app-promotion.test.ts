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

import {default as usingApi, submitTransactionAsync} from './substrate/substrate-api';
import {IKeyringPair, ITuple} from '@polkadot/types/types';
import {
  
  createMultipleItemsExpectSuccess,
  isTokenExists,
  getLastTokenId,
  getAllowance,
  approve,
  transferFrom,
  createCollection,
  transfer,
  burnItem,
  normalizeAccountId,
  CrossAccountId,
  createFungibleItemExpectSuccess,
  U128_MAX,
  burnFromExpectSuccess,
  UNIQUE,
  getModuleNames,
  Pallets,
  getBlockNumber,
} from './util/helpers';

import chai, {use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {usingPlaygrounds} from './util/playgrounds';
import {default as waitNewBlocks} from './substrate/wait-new-blocks';

import {encodeAddress, hdEthereum, mnemonicGenerate} from '@polkadot/util-crypto';
import {stringToU8a} from '@polkadot/util';
import {UniqueHelper} from './util/playgrounds/unique';
import {ApiPromise} from '@polkadot/api';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let palletAdmin: IKeyringPair;
let nominal: bigint;
let promotionStartBlock: number | null = null;

describe('app-promotions.stake extrinsic', () => {
  before(async function() {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin)));
      nominal = helper.balance.getOneTokenNominal();
      await helper.signTransaction(alice, tx);
    });
  });
  it('will change balance state to "locked", add it to "staked" map, and increase "totalStaked" amount', async () => {
    // arrange: Alice balance = 1000
    // act:     Alice calls appPromotion.stake(100)
    // assert:  Alice locked balance equal 100
    // assert:  Alice free balance closeTo 900
    // assert:  query appPromotion.staked(Alice) equal [100]
    // assert:  query appPromotion.totalStaked() increased by 100
    // act:     Alice extrinsic appPromotion.stake(200)
  
    // assert:  Alice locked balance equal 300
    // assert:  query appPromotion.staked(Alice) equal [100, 200]
    // assert:  query appPromotion.totalStaked() increased by 200
    
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      const totalStakedBefore = (await helper.api!.rpc.unique.totalStaked()).toBigInt();
      const staker = await createUser();
   
      
      
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(nominal / 2n))).to.be.eventually.rejected;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(1n * nominal))).to.be.eventually.fulfilled;
      expect((await helper.api!.rpc.unique.totalStakingLocked(normalizeAccountId(staker))).toBigInt()).to.be.equal(nominal);
      expect(9n * nominal - await helper.balance.getSubstrate(staker.address) <= nominal / 2n).to.be.true;
      expect((await helper.api!.rpc.unique.totalStaked(normalizeAccountId(staker))).toBigInt()).to.be.equal(nominal);
      expect((await helper.api!.rpc.unique.totalStaked()).toBigInt()).to.be.equal(totalStakedBefore + nominal);
      
      await waitNewBlocks(helper.api!, 1);
      
      
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(2n * nominal))).to.be.eventually.fulfilled;
      expect((await helper.api!.rpc.unique.totalStakingLocked(normalizeAccountId(staker))).toBigInt()).to.be.equal(3n * nominal);
      
      const stakedPerBlock = (await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([block, amount]) => [block.toBigInt(), amount.toBigInt()]);
      expect(stakedPerBlock.map((x) => x[1])).to.be.deep.equal([nominal, 2n * nominal]);
    });
  });
  
  it('will throws if stake amount is more than total free balance', async () => {
    // arrange: Alice balance = 1000
    // assert:  Alice calls appPromotion.stake(1000) throws /// because Alice needs some fee

    // act:     Alice calls appPromotion.stake(700)
    // assert:  Alice calls appPromotion.stake(400) throws /// because Alice has ~300 free QTZ and 700 locked

    await usingPlaygrounds(async helper => { 
      
      const staker = await createUser();
      
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(10n * nominal))).to.be.eventually.rejected;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(7n * nominal))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(4n * nominal))).to.be.eventually.rejected;
      
    });
  });
  
  it('for different accounts in one block is possible', async () => {
    // arrange: Alice, Bob, Charlie, Dave balance = 1000
    // arrange: Alice, Bob, Charlie, Dave calls appPromotion.stake(100) in the same time

    // assert:  query appPromotion.staked(Alice/Bob/Charlie/Dave) equal [100]
    await usingPlaygrounds(async helper => {
      const crowd = [];
      for(let i = 4; i--;) crowd.push(await createUser());
      
      const promises = crowd.map(async user => helper.signTransaction(user, helper.api!.tx.promotion.stake(nominal)));
      await expect(Promise.all(promises)).to.be.eventually.fulfilled;
    
      for (let i = 0; i < crowd.length; i++){
        expect((await helper.api!.rpc.unique.totalStaked(normalizeAccountId(crowd[i]))).toBigInt()).to.be.equal(nominal);  
      }
    });
  });

});

describe('unstake balance extrinsic', () => {
  before(async function () {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin)));
      nominal = helper.balance.getOneTokenNominal();
      await helper.signTransaction(alice, tx);
    });
  });
  
  it('will change balance state to "reserved", add it to "pendingUnstake" map, and subtract it from totalStaked', async () => {
    // arrange: Alice balance = 1000
    // arrange: Alice calls appPromotion.stake(Alice, 500)

    // act:     Alice calls appPromotion.unstake(300)
    // assert:  Alice reserved balance to equal 300
    // assert:  query appPromotion.staked(Alice) equal [200] /// 500 - 300
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [300]
    // assert:  query appPromotion.totalStaked() decreased by 300
    await usingPlaygrounds(async helper => {
      const totalStakedBefore = (await helper.api!.rpc.unique.totalStaked()).toBigInt();
      const staker = await createUser();
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(5n * nominal))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.unstake(3n * nominal))).to.be.eventually.fulfilled;
      expect((await helper.api!.rpc.unique.pendingUnstake(normalizeAccountId(staker.address))).toBigInt()).to.be.equal(3n * nominal);
      expect((await helper.api!.rpc.unique.totalStaked(normalizeAccountId(staker))).toBigInt()).to.be.equal(2n * nominal);
      expect((await helper.api!.rpc.unique.totalStaked()).toBigInt()).to.be.equal(totalStakedBefore + 2n * nominal);
    });
  });
  it('will remove from the "staked" map starting from the oldest entry', async () => {
    // arrange: Alice balance = 1000
    // arrange: Alice stakes 100
    // arrange: Alice stakes 200
    // arrange: Alice stakes 300

    // assert Alice stake is [100, 200, 300]


    // act:     Alice calls appPromotion.unstake(30)
    // assert:  query appPromotion.staked(Alice) to equal [70, 200, 300] /// Can unstake part of stake
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [30]

    // act:     Alice calls appPromotion.unstake(170)
    // assert:  query appPromotion.staked(Alice) to equal [100, 300] /// Can unstake one stake totally and one more partialy
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [30, 170]

    // act:     Alice calls appPromotion.unstake(400)
    // assert:  query appPromotion.staked(Alice) to equal [100, 300] /// Can totally unstake 2 stakes in one tx
    // assert:  query appPromotion.pendingUnstake(Alice) to equal [30, 170, 400]
    await usingPlaygrounds(async helper => {
      const totalStakedBefore = (await helper.api!.rpc.unique.totalStaked()).toBigInt();
      const staker = await createUser();
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(1n * nominal))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(2n * nominal))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(3n * nominal))).to.be.eventually.fulfilled;
      let stakedPerBlock = (await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt());
      expect(stakedPerBlock).to.be.deep.equal([nominal, 2n * nominal, 3n * nominal]);
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.unstake(3n * nominal / 10n))).to.be.eventually.fulfilled;
      expect((await helper.api!.rpc.unique.pendingUnstake(normalizeAccountId(staker.address))).toBigInt()).to.be.equal(3n * nominal / 10n);
      stakedPerBlock = (await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt());
      
      expect(stakedPerBlock).to.be.deep.equal([7n * nominal / 10n, 2n * nominal, 3n * nominal]);
      
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.unstake(17n * nominal / 10n))).to.be.eventually.fulfilled;
      stakedPerBlock = (await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt());
      expect(stakedPerBlock).to.be.deep.equal([nominal, 3n * nominal]);
      const unstakedPerBlock = (await helper.api!.rpc.unique.pendingUnstakePerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt());
      
      expect(unstakedPerBlock).to.be.deep.equal([3n * nominal / 10n, 17n * nominal / 10n]);
      
      await waitNewBlocks(helper.api!, 1);
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.unstake(4n * nominal))).to.be.eventually.fulfilled;
      expect((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt())).to.be.deep.equal([]);
      expect((await helper.api!.rpc.unique.pendingUnstakePerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt())).to.be.deep.equal([3n * nominal / 10n, 17n * nominal / 10n, 4n * nominal]);
    });
    
  });
});



describe('Admin adress', () => {
  before(async function () {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      await helper.balance.transferToSubstrate(alice, palletAdmin.address, 10n * helper.balance.getOneTokenNominal());
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin)));
      
      await helper.signTransaction(alice, tx);
      
      nominal = helper.balance.getOneTokenNominal();
    });
  });

  it('can be set by sudo only', async () => {
    // assert:  Sudo calls appPromotion.setAdminAddress(Alice) /// Sudo successfully sets Alice as admin
    // assert:  Bob calls appPromotion.setAdminAddress(Bob) throws /// Random account can not set admin
    // assert:  Alice calls appPromotion.setAdminAddress(Bob) throws /// Admin account can not set admin
    await usingPlaygrounds(async (helper) => {
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(alice))))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(bob, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(bob))))).to.be.eventually.rejected;
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(bob))))).to.be.eventually.fulfilled;
    });
    
  });
  
  it('can be any valid CrossAccountId', async () => {
    /// We are not going to set an eth address as a sponsor,
    /// but we do want to check, it doesn't break anything;

    // arrange: Charlie creates Punks
    // arrange: Sudo calls appPromotion.setAdminAddress(0x0...) success
    // arrange: Sudo calls appPromotion.setAdminAddress(Alice) success
    
    // assert:  Alice calls appPromotion.sponsorCollection(Punks.id) success
    
    await usingPlaygrounds(async (helper) => {
      
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(ethAcc)))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin))))).to.be.eventually.fulfilled;
      
      const collection  = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.fulfilled;
    });
    
  });

  it('can be reassigned', async () => {
    // arrange: Charlie creates Punks
    // arrange: Sudo calls appPromotion.setAdminAddress(Alice)
    // act:     Sudo calls appPromotion.setAdminAddress(Bob)

    // assert:  Alice calls appPromotion.sponsorCollection(Punks.id) throws /// Alice can not set collection sponsor
    // assert:  Bob calls appPromotion.sponsorCollection(Punks.id) successful /// Bob can set collection sponsor

    // act:     Sudo calls appPromotion.setAdminAddress(null) successful /// Sudo can set null as a sponsor
    // assert:  Bob calls appPromotion.stopSponsoringCollection(Punks.id) throws /// Bob is no longer an admin
    
    await usingPlaygrounds(async (helper) => {
      const collection  = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(alice))))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(alice, helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(bob))))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(alice, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.rejected;
      
      await expect(helper.signTransaction(bob, helper.api!.tx.promotion.sponsorCollection(collection.collectionId))).to.be.eventually.fulfilled;
    });
    
  });

});

describe('App-promotion collection sponsoring', () => {
  before(async function () {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      await helper.balance.transferToSubstrate(alice, palletAdmin.address, 10n * helper.balance.getOneTokenNominal());
      await helper.balance.transferToSubstrate(alice, calculatePalleteAddress('appstake'), 10n * helper.balance.getOneTokenNominal());
       
      
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin)));
      await helper.signTransaction(alice, tx);
      
      // const txStart = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.startAppPromotion(promotionStartBlock));
      // await helper.signTransaction(alice, txStart);
      
      nominal = helper.balance.getOneTokenNominal();
    });
  });
    
  it('can not be set by non admin', async () => {
    
    
    // arrange: Charlie creates Punks
    // arrange: Sudo calls appPromotion.setAdminAddress(Alice)

    // assert:  Random calls appPromotion.sponsorCollection(Punks.id) throws /// Random account can not set sponsoring
    // assert:  Alice calls appPromotion.sponsorCollection(Punks.id) success /// Admin account can set sponsoring
    
    await usingPlaygrounds(async (helper) => {
      const colletcion  = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      
      const collectionId = colletcion.collectionId;
      
      await expect(helper.signTransaction(bob, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.rejected;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
    });
    
  });

  it('will set pallet address as confirmed admin for collection without sponsor', async () => {
    // arrange: Charlie creates Punks

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)

    // assert:  query collectionById: Punks sponsoring is confirmed by PalleteAddress
    
    await usingPlaygrounds(async (helper) => {
      const collection  = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;

      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: calculatePalleteAddress('appstake')});
    });
    
  });

  it('will set pallet address as confirmed admin for collection with unconfirmed sponsor', async () => {
    // arrange: Charlie creates Punks
    // arrange: Charlie calls setCollectionSponsor(Punks.Id, Dave) /// Dave is unconfirmed sponsor

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)

    // assert:  query collectionById: Punks sponsoring is confirmed by PalleteAddress
    
    await usingPlaygrounds(async (helper) => {
      const collection  = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await collection.setSponsor(alice, bob.address);
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Unconfirmed: bob.address});
      
      const collectionId = collection.collectionId;
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: calculatePalleteAddress('appstake')});
    });
    
  });

  it('will set pallet address as confirmed admin for collection with confirmed sponsor', async () => {
    // arrange: Charlie creates Punks
    // arrange: setCollectionSponsor(Punks.Id, Dave)
    // arrange: confirmSponsorship(Punks.Id, Dave) /// Dave is confirmed sponsor

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)

    // assert:  query collectionById: Punks sponsoring is confirmed by PalleteAddress
    
    await usingPlaygrounds(async (helper) => {
      const collection  = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await collection.setSponsor(alice, bob.address);
  
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Unconfirmed: bob.address});
      expect(await collection.confirmSponsorship(bob)).to.be.true;
      
      const collectionId = collection.collectionId;
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: calculatePalleteAddress('appstake')});
    });
  });

  it('can be overwritten by collection owner', async () => {
    // arrange: Charlie creates Punks
    // arrange: appPromotion.sponsorCollection(Punks.Id)  /// Sponsor of Punks is pallete

    // act:     Charlie calls unique.setCollectionLimits(limits) /// Charlie as owner can successfully change limits
    // assert:  query collectionById(Punks.id) 1. sponsored by pallete, 2. limits has been changed

    // act:     Charlie calls setCollectionSponsor(Dave) /// Collection owner reasignes sponsoring
    // assert:  query collectionById: Punks sponsoring is unconfirmed by Dave
    
    await usingPlaygrounds(async (helper) => {
      const collection  = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: calculatePalleteAddress('appstake')});
      
      expect(await collection.setLimits(alice, {sponsorTransferTimeout: 0})).to.be.true;
      expect((await collection.getData())?.raw.limits.sponsorTransferTimeout).to.be.equal(0);
      
      expect((await collection.setSponsor(alice, bob.address))).to.be.true;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Unconfirmed: bob.address});
    });
    
  });
  
  it('will keep collection limits set by the owner earlier', async () => {
    // arrange: const limits = {...all possible collection limits}
    // arrange: Charlie creates Punks
    // arrange: Charlie calls unique.setCollectionLimits(limits) /// Owner sets all possible limits

    // act:     Admin calls appPromotion.sponsorCollection(Punks.id)
    // assert:  query collectionById(Punks.id) returns limits
    
    await usingPlaygrounds(async (helper) => {
      
      const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      expect(await collection.setLimits(alice, {sponsorTransferTimeout: 0})).to.be.true;
      const limits = (await collection.getData())?.raw.limits;
      
      const collectionId = collection.collectionId;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      expect((await collection.getData())?.raw.limits).to.be.deep.equal(limits);
    });
    
  });
  
  it('will throw if collection doesn\'t exist', async () => {
    // assert:  Admin calls appPromotion.sponsorCollection(999999999999999) throw 
    await usingPlaygrounds(async (helper) => {
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(999999999))).to.be.eventually.rejected;
    });
  });

  it('will throw if collection was burnt', async () => {
    // arrange: Charlie creates Punks
    // arrange: Charlie burns Punks

    // assert:  Admin calls appPromotion.sponsorCollection(Punks.id) throw
    
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
      
      expect((await collection.burn(alice))).to.be.true;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.rejected;
    });
    
  });
});


describe('app-promotion stopSponsoringCollection', () => {
  before(async function () {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      await helper.balance.transferToSubstrate(alice, palletAdmin.address, 10n * helper.balance.getOneTokenNominal());
      await helper.balance.transferToSubstrate(alice, calculatePalleteAddress('appstake'), 10n * helper.balance.getOneTokenNominal());
       
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin)));
      await helper.signTransaction(alice, tx);

      nominal = helper.balance.getOneTokenNominal();
    });
  });
  
  it('can not be called by non-admin', async () => {
    // arrange: Alice creates Punks
    // arrange: appPromotion.sponsorCollection(Punks.Id)

    // assert:  Random calls appPromotion.stopSponsoringCollection(Punks) throws
    // assert:  query collectionById(Punks.id): sponsoring confirmed by PalleteAddress
    
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      
      await expect(helper.signTransaction(bob, helper.api!.tx.promotion.stopSponsorignCollection(collectionId))).to.be.eventually.rejected;
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: calculatePalleteAddress('appstake')});
    });
  });

  it('will set sponsoring as disabled', async () => {
    // arrange: Alice creates Punks
    // arrange: appPromotion.sponsorCollection(Punks.Id)

    // act:     Admin calls appPromotion.stopSponsoringCollection(Punks)

    // assert:  query collectionById(Punks.id): sponsoring unconfirmed
    
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.sponsorCollection(collectionId))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsorignCollection(collectionId))).to.be.eventually.fulfilled;
      
      expect((await collection.getData())?.raw.sponsorship).to.be.equal('Disabled');
    });
  });

  it('will not affect collection which is not sponsored by pallete', async () => {
    // arrange: Alice creates Punks
    // arrange: Alice calls setCollectionSponsoring(Punks)
    // arrange: Alice calls confirmSponsorship(Punks)

    // act:     Admin calls appPromotion.stopSponsoringCollection(A)
    // assert:  query collectionById(Punks): Sponsoring: {Confirmed: Alice} /// Alice still collection owner
    
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
      expect(await collection.setSponsor(alice, alice.address)).to.be.true;
      expect(await collection.confirmSponsorship(alice)).to.be.true;
      
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsorignCollection(collectionId))).to.be.eventually.rejected;
      
      expect((await collection.getData())?.raw.sponsorship).to.be.deep.equal({Confirmed: alice.address});
    });
    
  });

  it('will throw if collection does not exist', async () => {
    // arrange: Alice creates Punks
    // arrange: Alice burns Punks

    // assert:  Admin calls appPromotion.stopSponsoringCollection(Punks.id) throws
    // assert:  Admin calls appPromotion.stopSponsoringCollection(999999999999999) throw
    
    await usingPlaygrounds(async (helper) => {
      const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      const collectionId = collection.collectionId;
      
      expect((await collection.burn(alice))).to.be.true;
      await expect(helper.signTransaction(palletAdmin, helper.api!.tx.promotion.stopSponsorignCollection(collectionId))).to.be.eventually.rejected;
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
      await helper.balance.transferToSubstrate(alice, calculatePalleteAddress('appstake'), 10n * helper.balance.getOneTokenNominal());
      
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
  const DAY = 7200n;
  
  
  before(async function () {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      if (promotionStartBlock == null) {
        promotionStartBlock = (await helper.api!.query.parachainSystem.lastRelayChainBlockNumber()).toNumber();
      }
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(normalizeAccountId(palletAdmin)));
      await helper.signTransaction(alice, tx);
      
      const txStart = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.startAppPromotion(promotionStartBlock!));
      await helper.signTransaction(alice, txStart);

      nominal = helper.balance.getOneTokenNominal();
    });
  });
  
  it('will credit 0.05% for staking period', async () => {
    // arrange: bob.stake(10000);
    // arrange: bob.stake(20000);
    // arrange: waitForRewards();

    // assert:  bob.staked to equal [10005, 20010]
    
    await usingPlaygrounds(async helper => {
      const staker = await createUser(50n * nominal);
      await waitForRecalculationBlock(helper.api!);
      
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(1n * nominal))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(2n * nominal))).to.be.eventually.fulfilled;
      await waitForRelayBlock(helper.api!, 36);
      
      
      expect((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker)))
        .map(([_, amount]) => amount.toBigInt()))
        .to.be.deep.equal([calculateIncome(nominal, 10n), calculateIncome(2n * nominal, 10n)]);
    });
    
  });
  
  it('will not be credited for unstaked (reserved) balance', async () => {
    // arrange: bob.stake(10000);
    // arrange: bob.unstake(5000);
    // arrange: waitForRewards();

    // assert:  bob.staked to equal [5002.5]
    await usingPlaygrounds(async helper => {
      const staker = await createUser(20n * nominal);
      await waitForRecalculationBlock(helper.api!);
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(10n * nominal))).to.be.eventually.fulfilled;
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.unstake(5n * nominal))).to.be.eventually.fulfilled;
      await waitForRelayBlock(helper.api!, 38);

      expect((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker)))
        .map(([_, amount]) => amount.toBigInt()))
        .to.be.deep.equal([calculateIncome(5n * nominal, 10n)]);
      
    });
    
  });
  
  it('will bring compound interest', async () => {
    // arrange: bob balance = 30000
    // arrange: bob.stake(10000);
    // arrange: bob.stake(10000);
    // arrange: waitForRewards();

    // assert:  bob.staked() equal [10005, 10005, 10005] /// 10_000 * 1.0005
    // act:     waitForRewards();

    // assert:  bob.staked() equal [10010.0025, 10010.0025, 10010.0025] /// 10_005 * 1.0005
    // act:     bob.unstake(10.0025)
    // assert:  bob.staked() equal [10000, 10010.0025, 10010.0025] /// 10_005 * 1.0005

    // act:     waitForRewards();
    // assert:  bob.staked() equal [10005, 10015,00750125, 10015,00750125] ///
    await usingPlaygrounds(async helper => {
      const staker = await createUser(40n * nominal);
      
      await waitForRecalculationBlock(helper.api!);
      // const foo = await helper.api!.registry.getChainProperties().

      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(10n * nominal))).to.be.eventually.fulfilled;
      // await waitNewBlocks(helper.api!, 1);
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(10n * nominal))).to.be.eventually.fulfilled;
      // await waitNewBlocks(helper.api!, 1);
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.stake(10n * nominal))).to.be.eventually.fulfilled;
      // console.log(await helper.balance.getSubstrate(staker.address));
      // await waitNewBlocks(helper.api!, 17);
      await waitForRelayBlock(helper.api!, 34);
      expect((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker)))
        .map(([_, amount]) => amount.toBigInt()))
        .to.be.deep.equal([calculateIncome(10n * nominal, 10n), calculateIncome(10n * nominal, 10n), calculateIncome(10n * nominal, 10n)]);
      
      // console.log(await getBlockNumber(helper.api!));
      // console.log((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([block, amount]) => [block.toBigInt(), amount.toBigInt()]));
      // console.log(`${calculateIncome(10n * nominal, 10n)} || ${calculateIncome(10n * nominal, 10n, 2)}`);
      // await waitNewBlocks(helper.api!, 10);
      await waitForRelayBlock(helper.api!, 20);
      // console.log((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt()));
      // console.log(await helper.balance.getSubstrate(staker.address));
      await expect(helper.signTransaction(staker, helper.api!.tx.promotion.unstake(calculateIncome(10n * nominal, 10n, 2) - 10n * nominal))).to.be.eventually.fulfilled;
      // console.log(calculateIncome(10n * nominal, 10n, 2));
      // console.log(calculateIncome(10n * nominal, 10n, 3));
      // console.log(calculateIncome(10n * nominal, 10n, 4));
      // console.log(calculateIncome(10n * nominal, 10n, 5));
      expect((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker)))
        .map(([_, amount]) => amount.toBigInt()))
        .to.be.deep.equal([10n * nominal, calculateIncome(10n * nominal, 10n, 2), calculateIncome(10n * nominal, 10n, 2)]);
      
      // console.log((await helper.api!.rpc.unique.totalStakedPerBlock(normalizeAccountId(staker))).map(([_, amount]) => amount.toBigInt()));
      
      // console.log(await helper.balance.getSubstrate(staker.address));
    });
    
  });
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

async function createUser(amount?: bigint) {
  return await usingPlaygrounds(async helper => {
    const user: IKeyringPair = helper.util.fromSeed(mnemonicGenerate());
    await helper.balance.transferToSubstrate(alice, user.address, amount ? amount : 10n * helper.balance.getOneTokenNominal());
    return user;
  });
}

const creteAccounts = async (balances: bigint[], donor: IKeyringPair, helper: UniqueHelper) => {
  let nonce = await helper.chain.getNonce(donor.address);
  const tokenNominal = helper.balance.getOneTokenNominal();
  const transactions = [];
  const accounts = [];
  for (const balance of balances) {
    const recepient = helper.util.fromSeed(mnemonicGenerate());
    accounts.push(recepient);
    if (balance !== 0n){
      const tx = helper.constructApiCall('api.tx.balances.transfer', [{Id: recepient.address}, balance * tokenNominal]);
      transactions.push(helper.signTransaction(donor, tx, 'account generation', {nonce}));
      nonce++;
    }
  }

  await Promise.all(transactions);
  return accounts;
};