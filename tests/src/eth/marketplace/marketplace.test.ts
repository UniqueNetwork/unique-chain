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

import {usingPlaygrounds} from './../../util/playgrounds/index';
import {IKeyringPair} from '@polkadot/types/types';
import {readFile} from 'fs/promises';
import {collectionIdToAddress, contractHelpers, GAS_ARGS, SponsoringMode} from '../util/helpers';
import nonFungibleAbi from '../nonFungibleAbi.json';

import {itEth, expect} from '../util/playgrounds';

const PRICE = 2000n;

describe('Matcher contract usage', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let aliceMirror: string;
  let aliceDoubleMirror: string;
  let seller: IKeyringPair;
  let sellerMirror: string;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      donor = privateKey('//Alice');
    }); 
  });

  beforeEach(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      [alice] = await helper.arrange.createAccounts([10000n], donor);
      aliceMirror = helper.address.substrateToEth(alice.address).toLowerCase();
      aliceDoubleMirror = helper.address.ethToSubstrate(aliceMirror);
      seller = privateKey(`//Seller/${Date.now()}`);
      sellerMirror = helper.address.substrateToEth(seller.address).toLowerCase();

      await helper.balance.transferToSubstrate(donor, aliceDoubleMirror, 10_000_000_000_000_000_000n);
    });
  });

  itEth('With UNQ', async ({helper}) => {
    const web3 = helper.web3!;

    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const matcherOwner = await helper.eth.createAccountWithBalance(donor);
    const matcherContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlace.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await matcherContract.deploy({data: (await readFile(`${__dirname}/MarketPlace.bin`)).toString(), arguments:[matcherOwner]}).send({from: matcherOwner});
    const helpers = contractHelpers(web3, matcherOwner);
    await helpers.methods.setSponsoringMode(matcher.options.address, SponsoringMode.Allowlisted).send({from: matcherOwner});
    await helpers.methods.setSponsoringRateLimit(matcher.options.address, 1).send({from: matcherOwner});
    
    await helpers.methods.setSponsor(matcher.options.address, sponsor).send({from: matcherOwner});
    await helpers.methods.confirmSponsorship(matcher.options.address).send({from: sponsor});

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}, pendingSponsor: alice.address});
    await collection.confirmSponsorship(alice);
    await collection.addToAllowList(alice, {Substrate: aliceDoubleMirror});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collection.collectionId), {from: matcherOwner});
    await helper.eth.transferBalanceFromSubstrate(donor, aliceMirror);

    await helpers.methods.toggleAllowed(matcher.options.address, aliceMirror, true).send({from: matcherOwner});
    await helpers.methods.toggleAllowed(matcher.options.address, sellerMirror, true).send({from: matcherOwner});

    const token = await collection.mintToken(alice, {Ethereum: sellerMirror});

    // Token is owned by seller initially
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: sellerMirror});

    // Ask
    {
      await helper.eth.sendEVM(seller, evmCollection.options.address, evmCollection.methods.approve(matcher.options.address, token.tokenId).encodeABI(), '0');
      await helper.eth.sendEVM(seller, matcher.options.address, matcher.methods.addAsk(PRICE, '0x0000000000000000000000000000000000000001', evmCollection.options.address, token.tokenId).encodeABI(), '0');
    }

    // Token is transferred to matcher
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: matcher.options.address.toLowerCase()});

    // Buy
    {
      const sellerBalanceBeforePurchase = await helper.balance.getSubstrate(seller.address);
      await helper.eth.sendEVM(alice, matcher.options.address, matcher.methods.buy(evmCollection.options.address, token.tokenId).encodeABI(), PRICE.toString());
      expect(await helper.balance.getSubstrate(seller.address) - sellerBalanceBeforePurchase === PRICE);
    }

    // Token is transferred to evm account of alice
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: aliceMirror});

    // Transfer token to substrate side of alice
    await token.transferFrom(alice, {Ethereum: aliceMirror}, {Substrate: alice.address});

    // Token is transferred to substrate account of alice, seller received funds
    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itEth('With escrow', async ({helper}) => {
    const web3 = helper.web3!;

    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const matcherOwner = await helper.eth.createAccountWithBalance(donor);
    const escrow = await helper.eth.createAccountWithBalance(donor);
    const matcherContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlace.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await matcherContract.deploy({data: (await readFile(`${__dirname}/MarketPlace.bin`)).toString(), arguments: [matcherOwner]}).send({from: matcherOwner, gas: 10000000});
    await matcher.methods.setEscrow(escrow).send({from: matcherOwner});
    const helpers = contractHelpers(web3, matcherOwner);
    await helpers.methods.setSponsoringMode(matcher.options.address, SponsoringMode.Allowlisted).send({from: matcherOwner});
    await helpers.methods.setSponsoringRateLimit(matcher.options.address, 1).send({from: matcherOwner});
    
    await helpers.methods.setSponsor(matcher.options.address, sponsor).send({from: matcherOwner});
    await helpers.methods.confirmSponsorship(matcher.options.address).send({from: sponsor});

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}, pendingSponsor: alice.address});
    await collection.confirmSponsorship(alice);
    await collection.addToAllowList(alice, {Substrate: aliceDoubleMirror});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collection.collectionId), {from: matcherOwner});
    await helper.eth.transferBalanceFromSubstrate(donor, aliceMirror);


    await helpers.methods.toggleAllowed(matcher.options.address, aliceMirror, true).send({from: matcherOwner});

    await helpers.methods.toggleAllowed(matcher.options.address, sellerMirror, true).send({from: matcherOwner});

    const token = await collection.mintToken(alice, {Ethereum: sellerMirror});

    // Token is owned by seller initially
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: sellerMirror});

    // Ask
    {
      await helper.eth.sendEVM(seller, evmCollection.options.address, evmCollection.methods.approve(matcher.options.address, token.tokenId).encodeABI(), '0');
      await helper.eth.sendEVM(seller, matcher.options.address, matcher.methods.addAsk(PRICE, '0x0000000000000000000000000000000000000001', evmCollection.options.address, token.tokenId).encodeABI(), '0');
    }

    // Token is transferred to matcher
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: matcher.options.address.toLowerCase()});

    // Give buyer KSM
    await matcher.methods.depositKSM(PRICE, aliceMirror).send({from: escrow});

    // Buy
    {
      expect(await matcher.methods.balanceKSM(sellerMirror).call()).to.be.equal('0');
      expect(await matcher.methods.balanceKSM(aliceMirror).call()).to.be.equal(PRICE.toString());

      await helper.eth.sendEVM(alice, matcher.options.address, matcher.methods.buyKSM(evmCollection.options.address, token.tokenId, aliceMirror, aliceMirror).encodeABI(), '0');

      // Price is removed from buyer balance, and added to seller
      expect(await matcher.methods.balanceKSM(aliceMirror).call()).to.be.equal('0');
      expect(await matcher.methods.balanceKSM(sellerMirror).call()).to.be.equal(PRICE.toString());
    }

    // Token is transferred to evm account of alice
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: aliceMirror});

    // Transfer token to substrate side of alice
    await token.transferFrom(alice, {Ethereum: aliceMirror}, {Substrate: alice.address});

    // Token is transferred to substrate account of alice, seller received funds
    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itEth('Sell tokens from substrate user via EVM contract', async ({helper, privateKey}) => {
    const web3 = helper.web3!;

    const matcherOwner = await helper.eth.createAccountWithBalance(donor);
    const matcherContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlace.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await matcherContract.deploy({data: (await readFile(`${__dirname}/MarketPlace.bin`)).toString(), arguments:[matcherOwner]}).send({from: matcherOwner});
    await helper.eth.transferBalanceFromSubstrate(donor, matcher.options.address);

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collection.collectionId), {from: matcherOwner});

    await helper.balance.transferToSubstrate(donor, seller.address, 100_000_000_000_000_000_000n);
    
    const token = await collection.mintToken(alice, {Ethereum: sellerMirror});

    // Token is owned by seller initially
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: sellerMirror});

    // Ask
    {
      await helper.eth.sendEVM(seller, evmCollection.options.address, evmCollection.methods.approve(matcher.options.address, token.tokenId).encodeABI(), '0');
      await helper.eth.sendEVM(seller, matcher.options.address, matcher.methods.addAsk(PRICE, '0x0000000000000000000000000000000000000001', evmCollection.options.address, token.tokenId).encodeABI(), '0');
    }

    // Token is transferred to matcher
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: matcher.options.address.toLowerCase()});

    // Buy
    {
      const sellerBalanceBeforePurchase = await helper.balance.getSubstrate(seller.address);
      await helper.eth.sendEVM(alice, matcher.options.address, matcher.methods.buy(evmCollection.options.address, token.tokenId).encodeABI(), PRICE.toString());
      expect(await helper.balance.getSubstrate(seller.address) - sellerBalanceBeforePurchase === PRICE);
    }

    // Token is transferred to evm account of alice
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: aliceMirror});

    // Transfer token to substrate side of alice
    await token.transferFrom(alice, {Ethereum: aliceMirror}, {Substrate: alice.address});

    // Token is transferred to substrate account of alice, seller received funds
    expect(await token.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });
});
