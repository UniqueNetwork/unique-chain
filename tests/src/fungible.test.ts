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
import { U128_MAX } from './util/helpers';

import { usingPlaygrounds } from './util/playgrounds';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let bob: IKeyringPair;

describe('integration test: Fungible functionality:', () => {
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Create fungible collection and token', async () => {
    await usingPlaygrounds(async helper => {
        const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'trest'});
        const defaultTokenId = await collection.getLastTokenId();
        expect(defaultTokenId).to.be.equal(0);

        await collection.mint(alice, {Substrate: alice.address}, U128_MAX);
        const aliceBalance = await collection.getBalance({Substrate: alice.address});
        const itemCountAfter = await collection.getLastTokenId();

        expect(itemCountAfter).to.be.equal(defaultTokenId);
        expect(aliceBalance).to.be.equal(U128_MAX);
    });
  });
  
  it('RPC method tokenOnewrs for fungible collection and token', async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      const facelessCrowd = Array(7).fill(0).map((_, i) => ({Substrate: privateKey(`//Alice+${i}`).address}));

      const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

      await collection.mint(alice, {Substrate: alice.address}, U128_MAX);

      await collection.transfer(alice, {Substrate: bob.address}, 1000n);
      await collection.transfer(alice, ethAcc, 900n);
      
      for (let i = 0; i < 7; i++) {
        await collection.transfer(alice, facelessCrowd[i], 1n);
      } 

      const owners = await collection.getTop10Owners();

      // What to expect
      expect(owners).to.deep.include.members([{Substrate: alice.address}, ethAcc, {Substrate: bob.address}, ...facelessCrowd]);
      expect(owners.length).to.be.equal(10);
      
      const eleven = privateKey('//ALice+11');
      expect(await collection.transfer(alice, {Substrate: eleven.address}, 10n)).to.be.true;
      expect((await collection.getTop10Owners()).length).to.be.equal(10);
    });
  });
  
  it('Transfer token', async () => {
    await usingPlaygrounds(async helper => {
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
      await collection.mint(alice, {Substrate: alice.address}, 500n);

      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(500n);
      expect(await collection.transfer(alice, {Substrate: bob.address}, 60n)).to.be.true;
      expect(await collection.transfer(alice, ethAcc, 140n)).to.be.true;

      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(300n);
      expect(await collection.getBalance({Substrate: bob.address})).to.be.equal(60n);
      expect(await collection.getBalance(ethAcc)).to.be.equal(140n);

      await expect(collection.transfer(alice, {Substrate: bob.address}, 350n)).to.eventually.be.rejected;
    });
  });

  it('Tokens multiple creation', async () => {
    await usingPlaygrounds(async helper => {
      const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

      await collection.mintWithOneOwner(alice, {Substrate: alice.address}, [
        {value: 500n},
        {value: 400n},
        {value: 300n}
      ]);

      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(1200n);
    });
  });

  it('Burn some tokens ', async () => {
    await usingPlaygrounds(async helper => {
      const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
      await collection.mint(alice, {Substrate: alice.address}, 500n);

      expect(await collection.isTokenExists(0)).to.be.true;
      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(500n);
      expect(await collection.burnTokens(alice, 499n)).to.be.true;
      expect(await collection.isTokenExists(0)).to.be.true;
      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(1n);
    });
  });
  
  it('Burn all tokens ', async () => {
    await usingPlaygrounds(async helper => {
      const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
      await collection.mint(alice, {Substrate: alice.address}, 500n);

      expect(await collection.isTokenExists(0)).to.be.true;
      expect(await collection.burnTokens(alice, 500n)).to.be.true;
      expect(await collection.isTokenExists(0)).to.be.true;

      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(0n);
      expect(await collection.getTotalPieces()).to.be.equal(0n);
    });
  });

  it('Set allowance for token', async () => {
    await usingPlaygrounds(async helper => {
      const collection = await helper.ft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      await collection.mint(alice, {Substrate: alice.address}, 100n);

      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(100n);
      
      expect(await collection.approveTokens(alice, {Substrate: bob.address}, 60n)).to.be.true;
      expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(60n);
      expect(await collection.getBalance({Substrate: bob.address})).to.be.equal(0n);

      expect(await collection.transferFrom(bob, {Substrate: alice.address}, {Substrate: bob.address}, 20n)).to.be.true;
      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(80n);
      expect(await collection.getBalance({Substrate: bob.address})).to.be.equal(20n);
      expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(40n);

      await collection.burnTokensFrom(bob, {Substrate: alice.address}, 10n);

      expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(70n);
      expect(await collection.getApprovedTokens({Substrate: alice.address}, {Substrate: bob.address})).to.be.equal(30n);
      expect(await collection.transferFrom(bob, {Substrate: alice.address}, ethAcc, 10n)).to.be.true;
      expect(await collection.getBalance(ethAcc)).to.be.equal(10n);
    });
  });
});
