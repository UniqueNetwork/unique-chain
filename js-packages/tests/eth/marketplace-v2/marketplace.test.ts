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
import {SponsoringMode, waitParams, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {makeNames, expect} from '@unique/test-utils/util.js';
import {HDNodeWallet, toBeHex, zeroPadBytes} from 'ethers';

const {dirname} = makeNames(import.meta.url);

const MARKET_FEE = 1n;

describe('Market V2 Contract', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});

      const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);

      await deployMarket(helper, marketOwner);
    });
  });

  async function deployMarket(helper: EthUniqueHelper, marketOwner: HDNodeWallet) {
    const nodeModulesDir = `${dirname}/../../../node_modules`;
    const solApiDir = `${dirname}/../../../evm-abi/api`;
    return await helper.ethContract.deployByCode(
      marketOwner,
      'Market',
      (await readFile(`${dirname}/Market.sol`)).toString(),
      [
        {
          solPath: '@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol',
          fsPath: `${solApiDir}/UniqueNFT.sol`,
        },
        {
          solPath: '@unique-nft/solidity-interfaces/contracts/UniqueFungible.sol',
          fsPath: `${solApiDir}/UniqueFungible.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/utils/introspection/IERC165.sol',
          fsPath: `${nodeModulesDir}/@openzeppelin/contracts/utils/introspection/IERC165.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/access/Ownable.sol',
          fsPath: `${nodeModulesDir}/@openzeppelin/contracts/access/Ownable.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/utils/Context.sol',
          fsPath: `${nodeModulesDir}/@openzeppelin/contracts/utils/Context.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/security/ReentrancyGuard.sol',
          fsPath: `${nodeModulesDir}/@openzeppelin/contracts/security/ReentrancyGuard.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol',
          fsPath: `${nodeModulesDir}/@openzeppelin/contracts/utils/introspection/ERC165Checker.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/token/ERC721/IERC721.sol',
          fsPath: `${nodeModulesDir}/@openzeppelin/contracts/token/ERC721/IERC721.sol`,
        },
        {
          solPath: '@unique-nft/solidity-interfaces/contracts/CollectionHelpers.sol',
          fsPath: `${solApiDir}/CollectionHelpers.sol`,
        },
        {
          solPath: 'royalty/UniqueRoyaltyHelper.sol',
          fsPath: `${dirname}/royalty/UniqueRoyaltyHelper.sol`,
        },
        {
          solPath: 'royalty/UniqueRoyalty.sol',
          fsPath: `${dirname}/royalty/UniqueRoyalty.sol`,
        },
        {
          solPath: 'royalty/LibPart.sol',
          fsPath: `${dirname}/royalty/LibPart.sol`,
        },
      ],
      15000000n,
      [MARKET_FEE, 0],
    );
  }

  function substrateAddressToHex(sub: Uint8Array | string | bigint) {
    if(typeof sub === 'string' || typeof sub === 'bigint')
      return toBeHex(sub, 64);
    else if(sub instanceof Uint8Array)
      return zeroPadBytes(sub, 64);
    else
      throw `invalid substrate address type: ${typeof(sub)}`
  }

  itEth('Put + Buy [eth]', async ({helper}) => {
    const ONE_TOKEN = helper.balance.getOneTokenNominal();
    const PRICE = 2n * ONE_TOKEN;  // 2 UNQ
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 60000n);
    const market = await deployMarket(helper, marketOwner);
    const contractHelpers = helper.ethNativeContract.contractHelpers(marketOwner);

    // Set external sponsoring
    await (await contractHelpers.setSponsor.send(await market.getAddress(), marketOwner)).wait(...waitParams);
    await (await contractHelpers.confirmSponsorship.send(await market.getAddress())).wait(...waitParams);

    // Configure sponsoring
    await (await contractHelpers.setSponsoringMode.send(await market.getAddress(), SponsoringMode.Generous)).wait(...waitParams);
    await (await contractHelpers.setSponsoringRateLimit.send(await market.getAddress(), 0)).wait(...waitParams);

    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(marketOwner, 'Sponsor', 'absolutely anything', 'ROC');
    const collection = helper.ethNativeContract.collection(collectionAddress, 'nft', marketOwner, true);

    // Set collection sponsoring
    await (await collection.setCollectionSponsor.send(marketOwner)).wait(...waitParams);
    await (await collection.confirmCollectionSponsorship.send()).wait(...waitParams);

    const seller = helper.eth.createAccount();
    const sellerCross = helper.ethCrossAccount.fromAddress(seller.address);
    const mintCrossTx = await collection.mintCross.send(sellerCross, []);
    const mintCrossReceipt = await mintCrossTx.wait(...waitParams);
    const events = helper.eth.normalizeEvents(mintCrossReceipt!);

    const tokenId = events.Transfer.args.tokenId;
    await (await collection.approve.send(await market.getAddress(), tokenId, {})).wait(...waitParams);

    // Seller has no funds at all, his transactions are sponsored
    const sellerBalance = await helper.balance.getEthereum(sellerCross.eth);
    expect(sellerBalance).to.be.eq(0n);

    const putTx = await helper.eth.changeContractCaller(market, seller)
      .put.send(collectionId, tokenId, PRICE.toString(), 1, sellerCross, {gasLimit: 1_000_000n});
    const putReceipt = await putTx.wait(...waitParams);
    const putEvents = helper.eth.normalizeEvents(putReceipt!);
    expect(putEvents.TokenIsUpForSale).is.not.undefined;

    // Seller balance are still 0
    const sellerBalanceAfter = await helper.balance.getEthereum(sellerCross.eth);
    expect(sellerBalanceAfter).to.be.eq(0n);


    let [ownerCrossEth, ownerCrossSub] = (await collection.ownerOfCross.staticCall(tokenId)).toArray();
    expect(ownerCrossEth).to.be.eq(sellerCross.eth);
    expect(ownerCrossSub).to.be.eq(sellerCross.sub);

    const buyer = await helper.eth.createAccountWithBalance(donor, 10n);
    const buyerCross = helper.ethCrossAccount.fromAddress(buyer);

    // Buyer has only 10 UNQ
    const buyerBalance = await helper.balance.getEthereum(buyer.address);
    expect(buyerBalance).to.be.eq(10n * ONE_TOKEN);

    const buyTx = await helper.eth.changeContractCaller(market, buyer)
      .buy.send(collectionId, tokenId, 1, buyerCross, {value: PRICE, gasLimit: 1_000_000n});

    const buyReceipt = await buyTx.wait(...waitParams);
    const buyEvents = helper.eth.normalizeEvents(buyReceipt!);
    expect(buyEvents.TokenIsPurchased).is.not.undefined;

    // Buyer pays only value, transaction use sponsoring
    const buyerBalanceAfter = await helper.balance.getEthereum(buyer.address);
    expect(buyerBalanceAfter).to.be.eq(10n * ONE_TOKEN - PRICE);

    // TODO: Replace 0n with buyerCross.sub
    expect(await collection.ownerOfCross.staticCall(tokenId)).to.be.like([buyerCross.eth, 0n]);
  });

  itEth('Put + Buy [sub]', async ({helper}) => {
    const ONE_TOKEN = helper.balance.getOneTokenNominal();
    const PRICE = 2n * ONE_TOKEN;  // 2 UNQ

    const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);
    const market = await deployMarket(helper, marketOwner);
    const contractHelpers = helper.ethNativeContract.contractHelpers(marketOwner);

    // Set self sponsoring from contract balance
    await (await contractHelpers.selfSponsoredEnable.send(await market.getAddress())).wait(...waitParams);
    await helper.eth.transferBalanceFromSubstrate(donor, await market.getAddress(), 10n);

    // Configure sponsoring
    await (await contractHelpers.setSponsoringMode.send(await market.getAddress(), SponsoringMode.Generous)).wait(...waitParams);
    await (await contractHelpers.setSponsoringRateLimit.send(await market.getAddress(), 0)).wait(...waitParams);

    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(marketOwner, 'Sponsor', 'absolutely anything', 'ROC');
    const collection = helper.ethNativeContract.collection(collectionAddress, 'nft', marketOwner, true);

    // Set collection sponsoring
    await (await collection.setCollectionSponsor.send(marketOwner)).wait(...waitParams);
    await (await collection.confirmCollectionSponsorship.send()).wait(...waitParams);

    const seller = helper.util.fromSeed(`//Market-seller-${(new Date()).getTime()}`);
    const sellerCross = helper.ethCrossAccount.fromKeyringPair(seller);

    // Seller has no funds at all, his transactions are sponsored
    {
      const sellerBalance = await helper.balance.getSubstrate(seller.address);
      expect(sellerBalance).to.be.eq(0n);
    }

    const mintCrossTx = await collection.mintCross.send(sellerCross, []);
    const mintCrossReceipt = await mintCrossTx.wait(...waitParams);
    const mintCrossEvents = helper.eth.normalizeEvents(mintCrossReceipt!);
    const tokenId = mintCrossEvents.Transfer.args.tokenId;
    await helper.nft.approveToken(seller, collectionId, +tokenId, {Ethereum: await market.getAddress()});

    await helper.eth.sendEVM(seller, await market.getAddress(), (await market.put.populateTransaction(collectionId, tokenId, PRICE, 1, sellerCross)).data, '0');
    
    // Seller balance is still zero
    {
      const sellerBalance = await helper.balance.getSubstrate(seller.address);
      expect(sellerBalance).to.be.eq(0n);
    }

    {

      let [ownerCrossEth, ownerCrossSub] = (await collection.ownerOfCross.staticCall(tokenId)).toArray();
      expect(ownerCrossEth).to.be.eq(sellerCross.eth);
      expect(substrateAddressToHex(ownerCrossSub)).to.be.eq(substrateAddressToHex(sellerCross.sub));
    }

    const [buyer] = await helper.arrange.createAccounts([600n], donor);
    
    // Buyer has only expected balance
    {
      const buyerBalance = await helper.balance.getSubstrate(buyer.address);
      expect(buyerBalance).to.be.eq(600n * ONE_TOKEN);
    }
    
    const buyerCross = helper.ethCrossAccount.fromKeyringPair(buyer);

    const buyerBalanceBefore = await helper.balance.getSubstrate(buyer.address);
    await helper.eth.sendEVM(buyer, await market.getAddress(), (await market.buy.populateTransaction(collectionId, tokenId, 1, buyerCross)).data, PRICE.toString());
    const buyerBalanceAfter = await helper.balance.getSubstrate(buyer.address);
    
    // Buyer balance not changed: transaction is sponsored
    expect(buyerBalanceBefore).to.be.eq(buyerBalanceAfter + PRICE);

    // Seller got only PRICE - MARKET_FEE
    const sellerBalanceAfterBuy = BigInt(await helper.balance.getSubstrate(seller.address));
    expect(sellerBalanceAfterBuy).to.be.eq(PRICE * (100n - MARKET_FEE) / 100n);

    let [ownerCrossEth, ownerCrossSub] = (await collection.ownerOfCross.staticCall(tokenId)).toArray();
    expect(ownerCrossEth).to.be.eq(buyerCross.eth);
    expect(substrateAddressToHex(ownerCrossSub)).to.be.eq(substrateAddressToHex(buyerCross.sub));
  });
});
