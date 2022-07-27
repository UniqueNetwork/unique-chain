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
  createCollectionExpectSuccess,
  getBalance,
  createMultipleItemsExpectSuccess,
  isTokenExists,
  getLastTokenId,
  getAllowance,
  approve,
  transferFrom,
  createCollection,
  createRefungibleToken,
  transfer,
  burnItem,
  repartitionRFT,
  createCollectionWithPropsExpectSuccess,
  getDetailedCollectionInfo,
  normalizeAccountId,
  CrossAccountId,
  getCreateItemsResult,
  getDestroyItemsResult,
} from './util/helpers';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: Refungible functionality:', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  it('Create refungible collection and token', async () => {
    await usingApi(async api => {
      const createCollectionResult = await createCollection(api, alice, {mode: {type: 'ReFungible'}});
      expect(createCollectionResult.success).to.be.true;
      const collectionId  = createCollectionResult.collectionId;
      
      const itemCountBefore = await getLastTokenId(api, collectionId);
      const result = await createRefungibleToken(api, alice, collectionId, 100n);
      
      const itemCountAfter = await getLastTokenId(api, collectionId);
      
      // What to expect
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      expect(itemCountAfter).to.be.equal(itemCountBefore + 1);
      expect(collectionId).to.be.equal(result.collectionId);
      expect(itemCountAfter.toString()).to.be.equal(result.itemId.toString());
    });
  });
  
  it('RPC method tokenOnewrs for refungible collection and token', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      const facelessCrowd = Array.from(Array(7).keys()).map(i => normalizeAccountId(privateKeyWrapper(i.toString())));
      
      const createCollectionResult = await createCollection(api, alice, {mode: {type: 'ReFungible'}});
      const collectionId = createCollectionResult.collectionId;
      
      const result = await createRefungibleToken(api, alice, collectionId, 10_000n);
      const aliceTokenId = result.itemId;
      
      
      await transfer(api, collectionId, aliceTokenId, alice, bob, 1000n);
      await transfer(api, collectionId, aliceTokenId, alice, ethAcc, 900n);
      
      for (let i = 0; i < 7; i++) {
        await transfer(api, collectionId, aliceTokenId, alice, facelessCrowd[i], 50*(i+1));
      } 
      
      const owners = await api.rpc.unique.tokenOwners(collectionId, aliceTokenId);
      const ids = (owners.toJSON() as CrossAccountId[]).map(s => normalizeAccountId(s));
      
      const aliceID = normalizeAccountId(alice);
      const bobId = normalizeAccountId(bob);
      
      // What to expect
      // tslint:disable-next-line:no-unused-expression
      expect(ids).to.deep.include.members([aliceID, ethAcc, bobId, ...facelessCrowd]);
      expect(owners.length).to.be.equal(10);
      
      const eleven = privateKeyWrapper('11');
      expect(await transfer(api, collectionId, aliceTokenId, alice, eleven, 10n)).to.be.true;
      expect((await api.rpc.unique.tokenOwners(collectionId, aliceTokenId)).length).to.be.equal(10);
    });
  });
  
  it('Transfer token pieces', async () => {
    await usingApi(async api => {
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;

      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(100n);
      expect(await transfer(api, collectionId, tokenId, alice, bob, 60n)).to.be.true;

      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(40n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(60n);
      await expect(transfer(api, collectionId, tokenId, alice, bob, 41n)).to.eventually.be.rejected;
    });
  });

  it('Create multiple tokens', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    const args = [
      {ReFungible: {pieces: 1}},
      {ReFungible: {pieces: 2}},
      {ReFungible: {pieces: 100}},
    ];
    await createMultipleItemsExpectSuccess(alice, collectionId, args);

    await usingApi(async api => {      
      const tokenId = await getLastTokenId(api, collectionId);
      expect(tokenId).to.be.equal(3);
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(100n);
    });
  });

  it('Burn some pieces', async () => {
    await usingApi(async api => {   
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(100n);
      expect(await burnItem(api, alice, collectionId, tokenId, 99n)).to.be.true;
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(1n);
    });
  });

  it('Burn all pieces', async () => {
    await usingApi(async api => {   
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(100n);
      expect(await burnItem(api, alice, collectionId, tokenId, 100n)).to.be.true;
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.false;
    });
  });

  it('Burn some pieces for multiple users', async () => {
    await usingApi(async api => {   
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;

      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(100n);
      expect(await transfer(api, collectionId, tokenId, alice, bob, 60n)).to.be.true;

      
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(40n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(60n);
      expect(await burnItem(api, alice, collectionId, tokenId, 40n)).to.be.true;

      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(0n);
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await burnItem(api, bob, collectionId, tokenId, 59n)).to.be.true;

      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(1n);
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.true;
      expect(await burnItem(api, bob, collectionId, tokenId, 1n)).to.be.true;
      
      expect(await isTokenExists(api, collectionId, tokenId)).to.be.false;
    });
  });

  it('Set allowance for token', async () => {
    await usingApi(async api => {
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;

      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(100n);

      expect(await approve(api, collectionId, tokenId, alice, bob, 60n)).to.be.true;
      expect(await getAllowance(api, collectionId, alice, bob, tokenId)).to.be.equal(60n);

      expect(await transferFrom(api, collectionId, tokenId, bob, alice, bob,  20n)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(80n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(20n);
      expect(await getAllowance(api, collectionId, alice, bob, tokenId)).to.be.equal(40n);
    });
  });

  it('Repartition', async () => {
    await usingApi(async api => {
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;

      expect(await repartitionRFT(api, collectionId, alice, tokenId, 200n)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(200n);

      expect(await transfer(api, collectionId, tokenId, alice, bob, 110n)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(90n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(110n);

      await expect(repartitionRFT(api, collectionId, alice, tokenId, 80n)).to.eventually.be.rejected;

      expect(await transfer(api, collectionId, tokenId, alice, bob, 90n)).to.be.true;
      expect(await getBalance(api, collectionId, alice, tokenId)).to.be.equal(0n);
      expect(await getBalance(api, collectionId, bob, tokenId)).to.be.equal(200n);

      expect(await repartitionRFT(api, collectionId, bob, tokenId, 150n)).to.be.true;
      await expect(transfer(api, collectionId, tokenId, bob, alice, 160n)).to.eventually.be.rejected;
    });
  });

  it('Repartition with increased amount', async () => {
    await usingApi(async api => {
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;

      const tx = api.tx.unique.repartition(collectionId, tokenId, 200n);
      const events = await submitTransactionAsync(alice, tx);
      const substrateEvents = getCreateItemsResult(events);
      expect(substrateEvents).to.include.deep.members([
        {
          success: true,
          collectionId,
          itemId: tokenId,
          recipient: {Substrate: alice.address},
          amount: 100,
        },
      ]);
    });
  });

  it('Repartition with decreased amount', async () => {
    await usingApi(async api => {
      const collectionId = (await createCollection(api, alice, {mode: {type: 'ReFungible'}})).collectionId;
      const tokenId = (await createRefungibleToken(api, alice, collectionId, 100n)).itemId;

      const tx = api.tx.unique.repartition(collectionId, tokenId, 50n);
      const events = await submitTransactionAsync(alice, tx);
      const substrateEvents = getDestroyItemsResult(events);
      expect(substrateEvents).to.include.deep.members([
        {
          success: true,
          collectionId,
          itemId: tokenId,
          owner: {Substrate: alice.address},
          amount: 50,
        },
      ]);
    });
  });
});

describe('Test Refungible properties:', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });
  
  it('Сreate new collection with properties', async () => {
    await usingApi(async api => {
      const properties = [{key: 'key1', value: 'val1'}];
      const propertyPermissions = [{key: 'key1', permission: {tokenOwner: true, mutable: false, collectionAdmin: true}}];
      const collectionId = await createCollectionWithPropsExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'ReFungible'},
        properties: properties,
        propPerm: propertyPermissions, 
      });
      const collection = (await getDetailedCollectionInfo(api, collectionId))!;
      expect(collection.properties.toHuman()).to.be.deep.equal(properties);
      expect(collection.tokenPropertyPermissions.toHuman()).to.be.deep.equal(propertyPermissions);
    });
  });
});
