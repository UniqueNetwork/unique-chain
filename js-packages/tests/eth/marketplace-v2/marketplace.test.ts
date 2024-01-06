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

import * as web3 from 'web3';
import type {IKeyringPair} from '@polkadot/types/types';
import {readFile} from 'fs/promises';
import {SponsoringMode, itEth, usingEthPlaygrounds} from '../util/index.js';
import {EthUniqueHelper} from '../util/playgrounds/unique.dev.js';
import {makeNames, expect} from '@unique/test-utils/util.js';

const {dirname} = makeNames(import.meta.url);

const MARKET_FEE = 1;

describe('Market V2 Contract', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});

      const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);

      await deployMarket(helper, marketOwner);
    });
  });

  async function deployMarket(helper: EthUniqueHelper, marketOwner: string) {
    const nodeModulesDir = `${dirname}/../../../node_modules`;
    const solApiDir = `${dirname}/../api`;
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
      15000000,
      [MARKET_FEE, 0],
    );
  }

  function substrateAddressToHex(sub: Uint8Array| string, web3: web3.default) {
    if(typeof sub === 'string')
      return web3.utils.padLeft(web3.utils.toHex(web3.utils.toBN(sub)), 64);
    else if(sub instanceof Uint8Array)
      return web3.utils.padLeft(web3.utils.bytesToHex(Array.from(sub)), 64);
    throw Error('Infallible');
  }

  itEth('Put + Buy [eth]', async ({helper}) => {
    const ONE_TOKEN = helper.balance.getOneTokenNominal();
    const PRICE = 2n * ONE_TOKEN;  // 2 UNQ
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 60000n);
    const market = await deployMarket(helper, marketOwner);
    const contractHelpers = helper.ethNativeContract.contractHelpers(marketOwner);

    // Set external sponsoring
    await contractHelpers.methods.setSponsor(market.options.address, marketOwner).send({from: marketOwner});
    await contractHelpers.methods.confirmSponsorship(market.options.address).send({from: marketOwner});

    // Configure sponsoring
    await contractHelpers.methods.setSponsoringMode(market.options.address, SponsoringMode.Generous).send({from: marketOwner});
    await contractHelpers.methods.setSponsoringRateLimit(market.options.address, 0).send({from: marketOwner});

    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(marketOwner, 'Sponsor', 'absolutely anything', 'ROC');
    const collection = helper.ethNativeContract.collection(collectionAddress, 'nft', marketOwner, true);

    // Set collection sponsoring
    await collection.methods.setCollectionSponsor(marketOwner).send({from: marketOwner});
    await collection.methods.confirmCollectionSponsorship().send({from: marketOwner});

    const sellerCross = helper.ethCrossAccount.createAccount();
    const result = await collection.methods.mintCross(sellerCross, []).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    await collection.methods.approve(market.options.address, tokenId).send({from: sellerCross.eth});

    // Seller has no funds at all, his transactions are sponsored
    const sellerBalance = await helper.balance.getEthereum(sellerCross.eth);
    expect(sellerBalance).to.be.eq(0n);

    const putResult = await market.methods.put(collectionId, tokenId, PRICE.toString(), 1, sellerCross).send({
      from: sellerCross.eth, gasLimit: 1_000_000,
    });
    expect(putResult.events.TokenIsUpForSale).is.not.undefined;

    // Seller balance are still 0
    const sellerBalanceAfter = await helper.balance.getEthereum(sellerCross.eth);
    expect(sellerBalanceAfter).to.be.eq(0n);

    let ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(sellerCross.eth);
    expect(ownerCross.sub).to.be.eq(sellerCross.sub);

    const buyerCross = await helper.ethCrossAccount.createAccountWithBalance(donor, 10n);

    // Buyer has only 10 UNQ
    const buyerBalance = await helper.balance.getEthereum(buyerCross.eth);
    expect(buyerBalance).to.be.eq(10n * ONE_TOKEN);

    const buyResult = await market.methods.buy(collectionId, tokenId, 1, buyerCross).send({from: buyerCross.eth, value: PRICE.toString(), gasLimit: 1_000_000});
    expect(buyResult.events.TokenIsPurchased).is.not.undefined;

    // Buyer pays only value, transaction use sponsoring
    const buyerBalanceAfter = await helper.balance.getEthereum(buyerCross.eth);
    expect(buyerBalanceAfter).to.be.eq(10n * ONE_TOKEN - PRICE);

    ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(buyerCross.eth);
    expect(ownerCross.sub).to.be.eq(buyerCross.sub);
  });

  itEth('Put + Buy [sub]', async ({helper}) => {
    const ONE_TOKEN = helper.balance.getOneTokenNominal();
    const PRICE = 2n * ONE_TOKEN;  // 2 UNQ
    const web3 = helper.getWeb3();
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);
    const market = await deployMarket(helper, marketOwner);
    const contractHelpers = helper.ethNativeContract.contractHelpers(marketOwner);

    // Set self sponsoring from contract balance
    await contractHelpers.methods.selfSponsoredEnable(market.options.address).send({from: marketOwner});
    await helper.eth.transferBalanceFromSubstrate(donor, market.options.address, 10n);

    // Configure sponsoring
    await contractHelpers.methods.setSponsoringMode(market.options.address, SponsoringMode.Generous).send({from: marketOwner});
    await contractHelpers.methods.setSponsoringRateLimit(market.options.address, 0).send({from: marketOwner});

    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(marketOwner, 'Sponsor', 'absolutely anything', 'ROC');
    const collection = helper.ethNativeContract.collection(collectionAddress, 'nft', marketOwner, true);

    // Set collection sponsoring
    await collection.methods.setCollectionSponsor(marketOwner).send({from: marketOwner});
    await collection.methods.confirmCollectionSponsorship().send({from: marketOwner});

    const seller = helper.util.fromSeed(`//Market-seller-${(new Date()).getTime()}`);
    const sellerCross = helper.ethCrossAccount.fromKeyringPair(seller);

    // Seller has no funds at all, his transactions are sponsored
    {
      const sellerBalance = await helper.balance.getSubstrate(seller.address);
      expect(sellerBalance).to.be.eq(0n);
    }

    const result = await collection.methods.mintCross(sellerCross, []).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    await helper.nft.approveToken(seller, collectionId, tokenId, {Ethereum: market.options.address});

    await helper.eth.sendEVM(seller, market.options.address, market.methods.put(collectionId, tokenId, PRICE, 1, sellerCross).encodeABI(), '0');
    // Seller balance is still zero
    {
      const sellerBalance = await helper.balance.getSubstrate(seller.address);
      expect(sellerBalance).to.be.eq(0n);
    }
    let ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(sellerCross.eth);
    expect(substrateAddressToHex(ownerCross.sub, web3)).to.be.eq(substrateAddressToHex(sellerCross.sub, web3));

    const [buyer] = await helper.arrange.createAccounts([600n], donor);
    // Buyer has only expected balance
    {
      const buyerBalance = await helper.balance.getSubstrate(buyer.address);
      expect(buyerBalance).to.be.eq(600n * ONE_TOKEN);
    }
    const buyerCross = helper.ethCrossAccount.fromKeyringPair(buyer);

    const buyerBalanceBefore = await helper.balance.getSubstrate(buyer.address);
    await helper.eth.sendEVM(buyer, market.options.address, market.methods.buy(collectionId, tokenId, 1, buyerCross).encodeABI(), PRICE.toString());
    const buyerBalanceAfter = await helper.balance.getSubstrate(buyer.address);
    // Buyer balance not changed: transaction is sponsored
    expect(buyerBalanceBefore).to.be.eq(buyerBalanceAfter + PRICE);

    const sellerBalanceAfterBuy = BigInt(await helper.balance.getSubstrate(seller.address));
    ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(buyerCross.eth);
    expect(substrateAddressToHex(ownerCross.sub, web3)).to.be.eq(substrateAddressToHex(buyerCross.sub, web3));

    // Seller got only PRICE - MARKET_FEE
    expect(sellerBalanceAfterBuy).to.be.eq(PRICE * BigInt(100 - MARKET_FEE) / 100n);
  });
});
