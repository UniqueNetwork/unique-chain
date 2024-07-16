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

import type {IKeyringPair} from '@polkadot/types/types';
import {readFile} from 'fs/promises';
import {itEth, usingEthPlaygrounds, expect, SponsoringMode} from '@unique/test-utils/eth/util.js';
import {makeNames} from '@unique/test-utils/util.js';

const {dirname} = makeNames(import.meta.url);
const EVM_ABI_DIR = `${dirname}/../../../evm-abi`;

describe('Matcher contract usage', () => {
  const PRICE = 2000n;
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let aliceMirror: string;
  let aliceDoubleMirror: string;
  let seller: IKeyringPair;
  let sellerMirror: string;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  beforeEach(async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      [alice] = await helper.arrange.createAccounts([1000n], donor);
      aliceMirror = helper.address.substrateToEth(alice.address).toLowerCase();
      aliceDoubleMirror = helper.address.ethToSubstrate(aliceMirror);
      seller = await privateKey(`//Seller/${Date.now()}`);
      sellerMirror = helper.address.substrateToEth(seller.address).toLowerCase();

      await helper.balance.transferToSubstrate(donor, aliceDoubleMirror, 10_000_000_000_000_000_000n);
    });
  });

  itEth('With UNQ', async ({helper}) => {
    const matcherOwner = await helper.eth.createAccountWithBalance(donor);
    const matcher = await helper.ethContract.deployByCode(matcherOwner, 'MarketPlace', (await readFile(`${dirname}/MarketPlace.sol`)).toString(), [{solPath: 'api/UniqueNFT.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`}], helper.eth.DEFAULT_GAS * 2);

    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(matcherOwner);
    await helpers.methods.setSponsoringMode(matcher.options.address, SponsoringMode.Allowlisted).send({from: matcherOwner});
    await helpers.methods.setSponsoringRateLimit(matcher.options.address, 1).send({from: matcherOwner});

    await helpers.methods.setSponsor(matcher.options.address, sponsor).send({from: matcherOwner});
    await helpers.methods.confirmSponsorship(matcher.options.address).send({from: sponsor});

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}, pendingSponsor: {Substrate: alice.address}});
    await collection.confirmSponsorship(alice);
    await collection.addToAllowList(alice, {Substrate: aliceDoubleMirror});
    const evmCollection = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');
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
    const matcherOwner = await helper.eth.createAccountWithBalance(donor);
    const matcher = await helper.ethContract.deployByCode(matcherOwner, 'MarketPlace', (await readFile(`${dirname}/MarketPlace.sol`)).toString(), [{solPath: 'api/UniqueNFT.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`}], helper.eth.DEFAULT_GAS * 2);

    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const escrow = await helper.eth.createAccountWithBalance(donor);
    await matcher.methods.setEscrow(escrow, true).send({from: matcherOwner});
    const helpers = await helper.ethNativeContract.contractHelpers(matcherOwner);
    await helpers.methods.setSponsoringMode(matcher.options.address, SponsoringMode.Allowlisted).send({from: matcherOwner});
    await helpers.methods.setSponsoringRateLimit(matcher.options.address, 1).send({from: matcherOwner});

    await helpers.methods.setSponsor(matcher.options.address, sponsor).send({from: matcherOwner});
    await helpers.methods.confirmSponsorship(matcher.options.address).send({from: sponsor});

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}, pendingSponsor: {Substrate: alice.address}});
    await collection.confirmSponsorship(alice);
    await collection.addToAllowList(alice, {Substrate: aliceDoubleMirror});
    const evmCollection = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');
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

  itEth('Sell tokens from substrate user via EVM contract', async ({helper}) => {
    const matcherOwner = await helper.eth.createAccountWithBalance(donor);
    const matcher = await helper.ethContract.deployByCode(matcherOwner, 'MarketPlace', (await readFile(`${dirname}/MarketPlace.sol`)).toString(), [{solPath: 'api/UniqueNFT.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`}], helper.eth.DEFAULT_GAS * 2);

    await helper.eth.transferBalanceFromSubstrate(donor, matcher.options.address);

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}});
    const evmCollection = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');

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
