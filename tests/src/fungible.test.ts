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

import {default as usingApi} from './substrate/substrate-api';
import {IKeyringPair} from '@polkadot/types/types';
import {
  getBalance,
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
} from './util/helpers';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: Fungible functionality:', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Create fungible collection and token', async () => {
    await usingApi(async api => {
      const createCollectionResult = await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}});
      expect(createCollectionResult.success).to.be.true;
      const collectionId  = createCollectionResult.collectionId;
      const defaultTokenId = await getLastTokenId(api, collectionId);
      const aliceTokenId = await createFungibleItemExpectSuccess(alice, collectionId, {Value: U128_MAX}, alice.address);
      const aliceBalance = await getBalance(api, collectionId, alice, aliceTokenId); 
      const itemCountAfter = await getLastTokenId(api, collectionId);
      
      // What to expect
      // tslint:disable-next-line:no-unused-expression
      expect(itemCountAfter).to.be.equal(defaultTokenId);
      expect(aliceBalance).to.be.equal(U128_MAX);
    });
  });
  
  it('RPC method tokenOnewrs for fungible collection and token', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      const facelessCrowd = Array.from(Array(7).keys()).map(i => normalizeAccountId(privateKeyWrapper(i.toString())));
      
      const createCollectionResult = await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}});
      const collectionId = createCollectionResult.collectionId;
      const aliceTokenId = await createFungibleItemExpectSuccess(alice, collectionId, {Value: U128_MAX}, alice.address);
     
      await transfer(api, collectionId, aliceTokenId, alice, bob, 1000n);
      await transfer(api, collectionId, aliceTokenId, alice, ethAcc, 900n);
            
      for (let i = 0; i < 7; i++) {
        await transfer(api, collectionId, aliceTokenId, alice, facelessCrowd[i], 1);
      } 
      
      const owners = await api.rpc.unique.tokenOwners(collectionId, aliceTokenId);
      const ids = (owners.toJSON() as CrossAccountId[]).map(s => normalizeAccountId(s));
      const aliceID = normalizeAccountId(alice);
      const bobId = normalizeAccountId(bob);

      // What to expect
      // tslint:disable-next-line:no-unused-expression
      expect(ids).to.deep.include.members([aliceID, ethAcc, bobId, ...facelessCrowd]);
      expect(owners.length == 10).to.be.true;
      
      const eleven = privateKeyWrapper('11');
      expect(await transfer(api, collectionId, aliceTokenId, alice, eleven, 10n)).to.be.true;
      expect((await api.rpc.unique.tokenOwners(collectionId, aliceTokenId)).length).to.be.equal(10);
    });
  });
  
  it('Transfer token', async () => {
    await usingApi(async api => {
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      const collectionId = (await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}})).collectionId;
      const tokenId = await createFungibleItemExpectSuccess(alice, collectionId, {Value: 500n}, alice.address);

      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(500n);
      expect(await transfer(api, collectionId, tokenId, alice, bob, 60n)).to.be.true;
      expect(await transfer(api, collectionId, tokenId, alice, ethAcc, 140n)).to.be.true;

      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(300n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(60n);
      expect(await getBalance(api, collectionId, ethAcc, tokenId)).to.be.equal(140n);
      await expect(transfer(api, collectionId, tokenId, alice, bob, 350n)).to.eventually.be.rejected;
    });
  });

  it('Tokens multiple creation', async () => {
    await usingApi(async api => {
      const collectionId = (await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}})).collectionId;
      
      const args = [
        {Fungible: {Value: 500n}},
        {Fungible: {Value: 400n}},
        {Fungible: {Value: 300n}},
      ];
      
      await createMultipleItemsExpectSuccess(alice, collectionId, args);
      expect(await getBalance(api, collectionId, alice, 0)).to.be.equal(1200n);
    });   
  });

  it('Burn some tokens ', async () => {
    await usingApi(async api => {   
      const collectionId = (await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}})).collectionId;
      const tokenId = (await createFungibleItemExpectSuccess(alice, collectionId, {Value: 500n}, alice.address));
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(500n);
      expect(await burnItem(api, alice, collectionId, tokenId, 499n)).to.be.true;
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(1n);
    });
  });
  
  it('Burn all tokens ', async () => {
    await usingApi(async api => {   
      const collectionId = (await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}})).collectionId;
      const tokenId = (await createFungibleItemExpectSuccess(alice, collectionId, {Value: 500n}, alice.address));
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await burnItem(api, alice, collectionId, tokenId, 500n)).to.be.true;
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(0n);
      expect((await api.rpc.unique.totalPieces(collectionId, tokenId)).value.toBigInt()).to.be.equal(0n);
    });
  });

  it('Set allowance for token', async () => {
    await usingApi(async api => {
      const collectionId = (await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}})).collectionId;
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      
      const tokenId = (await createFungibleItemExpectSuccess(alice, collectionId, {Value: 100n}, alice.address));
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(100n);

      expect(await approve(api, collectionId, tokenId, alice, bob, 60n)).to.be.true;
      expect(await getAllowance(api, collectionId, alice, bob, tokenId)).to.be.equal(60n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(0n);
      
      expect(await transferFrom(api, collectionId, tokenId, bob, alice, bob,  20n)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(80n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(20n);
      expect(await getAllowance(api, collectionId, alice, bob, tokenId)).to.be.equal(40n);
      
      await burnFromExpectSuccess(bob, alice, collectionId, tokenId, 10n);
     
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(70n);
      expect(await getAllowance(api, collectionId, alice, bob, tokenId)).to.be.equal(30n);
      expect(await transferFrom(api, collectionId, tokenId, bob, alice, ethAcc,  10n)).to.be.true;
      expect(await getBalance(api, collectionId, ethAcc, tokenId)).to.be.equal(10n);
    });
  });
});
