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
import {itEth, usingEthPlaygrounds, expect, SponsoringMode, confirmations} from '@unique/test-utils/eth/util.js';
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
    const matcher = await helper.ethContract.deployByCode(matcherOwner, 'MarketPlace', (await readFile(`${dirname}/MarketPlace.sol`)).toString(), [{solPath: 'api/UniqueNFT.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`}], helper.eth.DEFAULT_GAS_LIMIT * 2n);

    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const helpers = await helper.ethNativeContract.contractHelpers(matcherOwner);
    await (await helpers.setSponsoringMode.send(await matcher.getAddress(), SponsoringMode.Allowlisted, {from: matcherOwner})).wait(confirmations);
    await (await helpers.setSponsoringRateLimit.send(await matcher.getAddress(), 1, {from: matcherOwner})).wait(confirmations);

    await (await helpers.setSponsor.send(await matcher.getAddress(), sponsor, {from: matcherOwner})).wait(confirmations);
    await (await helpers.confirmSponsorship.send(await matcher.getAddress(), {from: sponsor})).wait(confirmations);

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}, pendingSponsor: {Substrate: alice.address}});
    await collection.confirmSponsorship(alice);
    await collection.addToAllowList(alice, {Substrate: aliceDoubleMirror});
    const evmCollection = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');
    await helper.eth.transferBalanceFromSubstrate(donor, aliceMirror);

    await (await helpers.toggleAllowed.send(await matcher.getAddress(), aliceMirror, true, {from: matcherOwner})).wait(confirmations);
    await (await helpers.toggleAllowed.send(await matcher.getAddress(), sellerMirror, true, {from: matcherOwner})).wait(confirmations);

    const token = await collection.mintToken(alice, {Ethereum: sellerMirror});

    // Token is owned by seller initially
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: sellerMirror});

    // Ask
    {
      await helper.eth.sendEVM(seller, await evmCollection.getAddress(), (await evmCollection.approve.populateTransaction(await matcher.getAddress(), token.tokenId)).data, '0');
      await helper.eth.sendEVM(seller, await matcher.getAddress(), (await matcher.addAsk.populateTransaction(PRICE, '0x0000000000000000000000000000000000000001', await evmCollection.getAddress(), token.tokenId)).data, '0');
    }

    // Token is transferred to matcher
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: (await matcher.getAddress()).toLowerCase()});

    // Buy
    {
      const sellerBalanceBeforePurchase = await helper.balance.getSubstrate(seller.address);
      await helper.eth.sendEVM(alice, await matcher.getAddress(), (await matcher.buy.populateTransaction(await evmCollection.getAddress(), token.tokenId)).data, PRICE.toString());
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
    const matcher = await helper.ethContract.deployByCode(matcherOwner, 'MarketPlace', (await readFile(`${dirname}/MarketPlace.sol`)).toString(), [{solPath: 'api/UniqueNFT.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`}], helper.eth.DEFAULT_GAS_LIMIT * 2n);

    const sponsor = await helper.eth.createAccountWithBalance(donor);
    const escrow = await helper.eth.createAccountWithBalance(donor);
    await (await matcher.setEscrow.send(escrow, true, {from: matcherOwner})).wait(confirmations);
    const helpers = await helper.ethNativeContract.contractHelpers(matcherOwner);
    await (await helpers.setSponsoringMode.send(await matcher.getAddress(), SponsoringMode.Allowlisted, {from: matcherOwner})).wait(confirmations);
    await (await helpers.setSponsoringRateLimit.send(await matcher.getAddress(), 1, {from: matcherOwner})).wait(confirmations);

    await (await helpers.setSponsor.send(await matcher.getAddress(), sponsor, {from: matcherOwner})).wait(confirmations);
    await (await helpers.confirmSponsorship.send(await matcher.getAddress(), {from: sponsor})).wait(confirmations);

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}, pendingSponsor: {Substrate: alice.address}});
    await collection.confirmSponsorship(alice);
    await collection.addToAllowList(alice, {Substrate: aliceDoubleMirror});
    const evmCollection = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');
    await helper.eth.transferBalanceFromSubstrate(donor, aliceMirror);


    await (await helpers.toggleAllowed.send(await matcher.getAddress(), aliceMirror, true, {from: matcherOwner})).wait(confirmations);

    await (await helpers.toggleAllowed.send(await matcher.getAddress(), sellerMirror, true, {from: matcherOwner})).wait(confirmations);

    const token = await collection.mintToken(alice, {Ethereum: sellerMirror});

    // Token is owned by seller initially
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: sellerMirror});

    // Ask  
    {
      await helper.eth.sendEVM(seller, await evmCollection.getAddress(), (await evmCollection.approve.populateTransaction(await matcher.getAddress(), token.tokenId)).data, '0');
      await helper.eth.sendEVM(seller, await matcher.getAddress(), (await matcher.addAsk.populateTransaction(PRICE, '0x0000000000000000000000000000000000000001', await evmCollection.getAddress(), token.tokenId)).data, '0');
    }

    // Token is transferred to matcher
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: (await matcher.getAddress()).toLowerCase()});

    // Give buyer KSM
    await (await matcher.depositKSM.send(PRICE, aliceMirror, {from: escrow})).wait(confirmations);

    // Buy
    {
      expect(await matcher.balanceKSM.staticCall(sellerMirror)).to.be.equal('0');
      expect(await matcher.balanceKSM.staticCall(aliceMirror)).to.be.equal(PRICE.toString());

      await helper.eth.sendEVM(alice, await matcher.getAddress(), (await matcher.buyKSM.populateTransaction(await evmCollection.getAddress(), token.tokenId, aliceMirror, aliceMirror)).data, '0');

      // Price is removed from buyer balance, and added to seller
      expect(await matcher.balanceKSM.staticCall(aliceMirror)).to.be.equal('0');
      expect(await matcher.balanceKSM.staticCall(sellerMirror)).to.be.equal(PRICE.toString());
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
    const matcher = await helper.ethContract.deployByCode(matcherOwner, 'MarketPlace', (await readFile(`${dirname}/MarketPlace.sol`)).toString(), [{solPath: 'api/UniqueNFT.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`}], helper.eth.DEFAULT_GAS_LIMIT * 2n);

    await helper.eth.transferBalanceFromSubstrate(donor, await matcher.getAddress());

    const collection = await helper.nft.mintCollection(alice, {limits: {sponsorApproveTimeout: 1}});
    const evmCollection = await helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collection.collectionId), 'nft');

    await helper.balance.transferToSubstrate(donor, seller.address, 100_000_000_000_000_000_000n);

    const token = await collection.mintToken(alice, {Ethereum: sellerMirror});

    // Token is owned by seller initially
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: sellerMirror});

    // Ask
    {
      await helper.eth.sendEVM(seller, await evmCollection.getAddress(), (await evmCollection.approve.populateTransaction(await matcher.getAddress(), token.tokenId)).data, '0');
      await helper.eth.sendEVM(seller, await matcher.getAddress(), (await matcher.addAsk.populateTransaction(PRICE, '0x0000000000000000000000000000000000000001', await evmCollection.getAddress(), token.tokenId)).data, '0');
    }

    // Token is transferred to matcher
    expect(await token.getOwner()).to.be.deep.equal({Ethereum: (await matcher.getAddress()).toLowerCase()});

    // Buy
    {
      const sellerBalanceBeforePurchase = await helper.balance.getSubstrate(seller.address);
      await helper.eth.sendEVM(alice, await matcher.getAddress(), (await matcher.buy.populateTransaction(await evmCollection.getAddress(), token.tokenId)).data, PRICE.toString());
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
