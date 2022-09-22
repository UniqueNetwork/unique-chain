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
import {itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds, expect} from './util/playgrounds';

const MAX_REFUNGIBLE_PIECES = 1_000_000_000_000_000_000_000n;

describe('integration test: Refungible functionality:', async () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([100n, 10n], donor);
    });
  });
  
  itSub('Create refungible collection and token', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const itemCountBefore = await collection.getLastTokenId();
    const token = await collection.mintToken(alice, 100n);
    
    const itemCountAfter = await collection.getLastTokenId();
    
    // What to expect
    expect(token?.tokenId).to.be.gte(itemCountBefore);
    expect(itemCountAfter).to.be.equal(itemCountBefore + 1);
    expect(itemCountAfter.toString()).to.be.equal(token?.tokenId.toString());
  });
  
  itSub('Checking RPC methods when interacting with maximum allowed values (MAX_REFUNGIBLE_PIECES)', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    
    const token = await collection.mintToken(alice, MAX_REFUNGIBLE_PIECES);
    
    expect(await collection.getTokenBalance(token.tokenId, {Substrate: alice.address})).to.be.equal(MAX_REFUNGIBLE_PIECES);
    
    await collection.transferToken(alice, token.tokenId, {Substrate: bob.address}, MAX_REFUNGIBLE_PIECES);
    expect(await collection.getTokenBalance(token.tokenId, {Substrate: bob.address})).to.be.equal(MAX_REFUNGIBLE_PIECES);
    expect(await token.getTotalPieces()).to.be.equal(MAX_REFUNGIBLE_PIECES);
    
    await expect(collection.mintToken(alice, MAX_REFUNGIBLE_PIECES + 1n))
      .to.eventually.be.rejectedWith(/refungible\.WrongRefungiblePieces/);
  });
  
  itSub('RPC method tokenOnewrs for refungible collection and token', async ({helper, privateKey}) => {
    const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
    const facelessCrowd = Array(7).fill(0).map((_, i) => ({Substrate: privateKey(`//Alice+${i}`).address}));

    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const token = await collection.mintToken(alice, 10_000n);

    await token.transfer(alice, {Substrate: bob.address}, 1000n);
    await token.transfer(alice, ethAcc, 900n);
    
    for (let i = 0; i < 7; i++) {
      await token.transfer(alice, facelessCrowd[i], 50n * BigInt(i + 1));
    } 

    const owners = await token.getTop10Owners();

    // What to expect
    expect(owners).to.deep.include.members([{Substrate: alice.address}, ethAcc, {Substrate: bob.address}, ...facelessCrowd]);
    expect(owners.length).to.be.equal(10);
    
    const eleven = privateKey('//ALice+11');
    expect(await token.transfer(alice, {Substrate: eleven.address}, 10n)).to.be.true;
    expect((await token.getTop10Owners()).length).to.be.equal(10);
  });
  
  itSub('Transfer token pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);

    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(100n);
    expect(await token.transfer(alice, {Substrate: bob.address}, 60n)).to.be.true;
    
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(40n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(60n);
    
    await expect(token.transfer(alice, {Substrate: bob.address}, 41n))
      .to.eventually.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub('Create multiple tokens', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    // TODO: fix mintMultipleTokens
    // await collection.mintMultipleTokens(alice, [
    //   {owner: {Substrate: alice.address}, pieces: 1n},
    //   {owner: {Substrate: alice.address}, pieces: 2n},
    //   {owner: {Substrate: alice.address}, pieces: 100n},
    // ]);
    await helper.rft.mintMultipleTokensWithOneOwner(alice, collection.collectionId, {Substrate: alice.address}, [
      {pieces: 1n}, 
      {pieces: 2n}, 
      {pieces: 100n},
    ]);
    const lastTokenId = await collection.getLastTokenId();
    expect(lastTokenId).to.be.equal(3);
    expect(await collection.getTokenBalance(lastTokenId, {Substrate: alice.address})).to.be.equal(100n);
  });

  itSub('Burn some pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    expect(await collection.isTokenExists(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(100n);
    expect((await token.burn(alice, 99n)).success).to.be.true;
    expect(await collection.isTokenExists(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(1n);
  });

  itSub('Burn all pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    
    expect(await collection.isTokenExists(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(100n);

    expect((await token.burn(alice, 100n)).success).to.be.true;
    expect(await collection.isTokenExists(token.tokenId)).to.be.false;
  });

  itSub('Burn some pieces for multiple users', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);

    expect(await collection.isTokenExists(token.tokenId)).to.be.true;
    
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(100n);
    expect(await token.transfer(alice, {Substrate: bob.address}, 60n)).to.be.true;

    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(40n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(60n);

    expect((await token.burn(alice, 40n)).success).to.be.true;

    expect(await collection.isTokenExists(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(0n);

    expect((await token.burn(bob, 59n)).success).to.be.true;

    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(1n);
    expect(await collection.isTokenExists(token.tokenId)).to.be.true;

    expect((await token.burn(bob, 1n)).success).to.be.true;

    expect(await collection.isTokenExists(token.tokenId)).to.be.false;
  });

  itSub('Set allowance for token', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(100n);

    expect(await token.approve(alice, {Substrate: bob.address}, 60n)).to.be.true;
    expect(await token.getApprovedPieces({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(60n);

    expect(await token.transferFrom(bob, {Substrate: alice.address}, {Substrate: bob.address}, 20n)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(80n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(20n);
    expect(await token.getApprovedPieces({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(40n);
  });

  itSub('Repartition', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);

    expect(await token.repartition(alice, 200n)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(200n);
    expect(await token.getTotalPieces()).to.be.equal(200n);
    
    expect(await token.transfer(alice, {Substrate: bob.address}, 110n)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(90n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(110n);
    
    await expect(token.repartition(alice, 80n))
      .to.eventually.be.rejectedWith(/refungible\.RepartitionWhileNotOwningAllPieces/);
    
    expect(await token.transfer(alice, {Substrate: bob.address}, 90n)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(0n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(200n);

    expect(await token.repartition(bob, 150n)).to.be.true;
    await expect(token.transfer(bob, {Substrate: alice.address}, 160n))
      .to.eventually.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub('Repartition with increased amount', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    await token.repartition(alice, 200n);
    const chainEvents = helper.chainLog.slice(-1)[0].events;
    expect(chainEvents).to.deep.include({
      section: 'common',
      method: 'ItemCreated',
      index: [66, 2],
      data: [
        collection.collectionId,
        token.tokenId,
        {substrate: alice.address}, 
        100n,
      ],
      phase: {applyExtrinsic: 2},
    });
  });

  itSub('Repartition with decreased amount', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    await token.repartition(alice, 50n);
    const chainEvents = helper.chainLog.slice(-1)[0].events;
    expect(chainEvents).to.deep.include({
      method: 'ItemDestroyed',
      section: 'common',
      index: [66, 3],
      data: [
        collection.collectionId,
        token.tokenId,
        {substrate: alice.address}, 
        50n,
      ],
      phase: {applyExtrinsic: 2},
    });
  });
  
  itSub('Create new collection with properties', async ({helper}) => {
    const properties = [{key: 'key1', value: 'val1'}];
    const tokenPropertyPermissions = [{key: 'key1', permission: {tokenOwner: true, mutable: false, collectionAdmin: true}}];
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test', properties, tokenPropertyPermissions});
    const info = await collection.getData();
    expect(info?.raw.properties).to.be.deep.equal(properties);
    expect(info?.raw.tokenPropertyPermissions).to.be.deep.equal(tokenPropertyPermissions);
  });
});

