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
import {IKeyringPair} from '@polkadot/types/types';
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
} from './util/helpers';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import getBalance from './substrate/get-balance';
import { unique } from './interfaces/definitions';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;
let palletAdmin: IKeyringPair;

describe('integration test: AppPromotion', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
      palletAdmin = privateKeyWrapper('//palletAdmin');
      const tx = api.tx.sudo.sudo(api.tx.promotion.setAdminAddress(palletAdmin.addressRaw));
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
    
    await usingApi(async (api, privateKeyWrapper) => {
      await submitTransactionAsync(alice, api.tx.balances.transfer(bob.addressRaw, 10n * UNIQUE));
      const [alicesBalanceBefore, bobsBalanceBefore] = await getBalance(api, [alice.address, bob.address]);
      
      console.log(`alice: ${alicesBalanceBefore} \n bob: ${bobsBalanceBefore}`);
      
      await submitTransactionAsync(alice, api.tx.promotion.stake(1n * UNIQUE));
      await submitTransactionAsync(bob, api.tx.promotion.stake(1n * UNIQUE));
      const alice_total_staked = (await (api.rpc.unique.totalStaked(normalizeAccountId(alice)))).toBigInt();
      const bob_total_staked = (await api.rpc.unique.totalStaked(normalizeAccountId(bob))).toBigInt();
       
      console.log(`alice staked: ${alice_total_staked} \n bob staked: ${bob_total_staked}, total staked: ${(await api.rpc.unique.totalStaked()).toBigInt()}`);
      
      
      
    });
  });

});