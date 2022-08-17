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
import getBalance, {getBalanceSingle} from './substrate/get-balance';
import {unique} from './interfaces/definitions';
import {usingPlaygrounds} from './util/playgrounds';
import {default as waitNewBlocks} from './substrate/wait-new-blocks';

import BN from 'bn.js';
import {mnemonicGenerate} from '@polkadot/util-crypto';
import {UniqueHelper} from './util/playgrounds/unique';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let palletAdmin: IKeyringPair;
let nominal: bigint; 

describe('integration test: AppPromotion', () => {
  before(async function() {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(palletAdmin.addressRaw));
      nominal = helper.balance.getOneTokenNominal();
      await submitTransactionAsync(alice, tx);
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
   
      const firstStakedBlock = await helper.chain.getLatestBlockNumber();
      
      await expect(submitTransactionAsync(staker, helper.api!.tx.promotion.stake(1n * nominal))).to.be.eventually.fulfilled;
      expect((await helper.api!.rpc.unique.totalStakingLocked(normalizeAccountId(staker))).toBigInt()).to.be.equal(nominal);
      expect(9n * nominal - await helper.balance.getSubstrate(staker.address) <= nominal / 2n).to.be.true;
      expect((await helper.api!.rpc.unique.totalStaked(normalizeAccountId(staker))).toBigInt()).to.be.equal(nominal);
      expect((await helper.api!.rpc.unique.totalStaked()).toBigInt()).to.be.equal(totalStakedBefore + nominal);
      
      await waitNewBlocks(helper.api!, 1);
      const secondStakedBlock = await helper.chain.getLatestBlockNumber();
      
      await expect(submitTransactionAsync(staker, helper.api!.tx.promotion.stake(2n * nominal))).to.be.eventually.fulfilled;
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
      
      await expect(submitTransactionAsync(staker, helper.api!.tx.promotion.stake(10n * nominal))).to.be.eventually.rejected;
      await expect(submitTransactionAsync(staker, helper.api!.tx.promotion.stake(7n * nominal))).to.be.eventually.fulfilled;
      await expect(submitTransactionAsync(staker, helper.api!.tx.promotion.stake(4n * nominal))).to.be.eventually.rejected;
      
    });
  });
  
  it.skip('for different accounts in one block is possible', async () => {
    // arrange: Alice, Bob, Charlie, Dave balance = 1000
    // arrange: Alice, Bob, Charlie, Dave calls appPromotion.stake(100) in the same time

    // assert:  query appPromotion.staked(Alice/Bob/Charlie/Dave) equal [100]
    await usingPlaygrounds(async helper => {
      const crowd = await creteAccounts([10n, 10n, 10n, 10n], alice, helper);
      // const promises = crowd.map(async user => submitTransactionAsync(user, helper.api!.tx.promotion.stake(nominal)));
      // await expect(Promise.all(promises)).to.be.eventually.fulfilled;
    });
  });

});

describe.skip('unstake balance extrinsic', () => {
  before(async function() {
    await usingPlaygrounds(async (helper, privateKeyWrapper) => {
      if (!getModuleNames(helper.api!).includes(Pallets.AppPromotion)) this.skip();
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      const tx = helper.api!.tx.sudo.sudo(helper.api!.tx.promotion.setAdminAddress(palletAdmin.addressRaw));
      nominal = helper.balance.getOneTokenNominal();
      await submitTransactionAsync(alice, tx);
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
  });
});



async function createUser(amount?: bigint) {
  return await usingPlaygrounds(async (helper, privateKeyWrapper) => {
    const user: IKeyringPair = privateKeyWrapper(`//Alice+${(new Date()).getTime()}`);
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