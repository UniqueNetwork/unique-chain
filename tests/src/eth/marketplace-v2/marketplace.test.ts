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
import {readFile} from 'fs/promises';
import {EthUniqueHelper, itEth, usingEthPlaygrounds} from '../util';
import {makeNames} from '../../util';
import {expect} from 'chai';
import Web3 from 'web3';

const {dirname} = makeNames(import.meta.url);

describe('Market V2 Contract', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  async function deployMarket(helper: EthUniqueHelper, marketOwner: string) {
    return await helper.ethContract.deployByCode(
      marketOwner,
      'Market',
      (await readFile(`${dirname}/Market.sol`)).toString(),
      [
        {
          solPath: '@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol',
          fsPath: `${dirname}/../api/UniqueNFT.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/utils/introspection/IERC165.sol',
          fsPath: `${dirname}/../../../node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/utils/introspection/ERC165Checker.sol',
          fsPath: `${dirname}/../../../node_modules/@openzeppelin/contracts/utils/introspection/ERC165Checker.sol`,
        },
        {
          solPath: '@openzeppelin/contracts/token/ERC721/IERC721.sol',
          fsPath: `${dirname}/../../../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol`,
        },
        {
          solPath: '@unique-nft/solidity-interfaces/contracts/CollectionHelpers.sol',
          fsPath: `${dirname}/../api/CollectionHelpers.sol`,
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
      [1, 0],
    );
  }

  function substrateAddressToHex(sub: Uint8Array| string, web3: Web3) {
    if(typeof sub === 'string')
      return web3.utils.padLeft(web3.utils.toHex(web3.utils.toBN(sub)), 64);
    else if(sub instanceof Uint8Array)
      return web3.utils.padLeft(web3.utils.bytesToHex(Array.from(sub)), 64);
  }

  itEth('Deploy', async ({helper}) => {
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);

    await deployMarket(helper, marketOwner);
  });

  itEth('Put + Buy [eth]', async ({helper}) => {
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);
    const market = await deployMarket(helper, marketOwner);

    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(marketOwner, 'Sponsor', 'absolutely anything', 'ROC');
    const collection = await helper.ethNativeContract.collection(collectionAddress, 'nft', marketOwner);

    const sellerCross = await helper.ethCrossAccount.createAccountWithBalance(donor, 600n);
    const result = await collection.methods.mintCross(sellerCross, []).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    await collection.methods.approve(market.options.address, tokenId).send({from: sellerCross.eth});

    const putResult = await market.methods.put(collectionId, tokenId, 1, 1, sellerCross).send({from: sellerCross.eth});
    expect(putResult.events.TokenIsUpForSale).is.not.undefined;
    let ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(sellerCross.eth);
    expect(ownerCross.sub).to.be.eq(sellerCross.sub);

    const buyerCross = await helper.ethCrossAccount.createAccountWithBalance(donor, 600n);
    const buyResult = await market.methods.buy(collectionId, tokenId, 1, buyerCross).send({from: buyerCross.eth, value: 1});
    expect(buyResult.events.TokenIsPurchased).is.not.undefined;
    ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(buyerCross.eth);
    expect(ownerCross.sub).to.be.eq(buyerCross.sub);
  });

  itEth('Put + Buy [sub]', async ({helper}) => {
    const PRICE = 1n;
    const web3 = helper.getWeb3();
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);
    const market = await deployMarket(helper, marketOwner);

    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(marketOwner, 'Sponsor', 'absolutely anything', 'ROC');
    const collection = await helper.ethNativeContract.collection(collectionAddress, 'nft', marketOwner);

    const [seller] = await helper.arrange.createAccounts([600n], donor);
    const sellerMirror = helper.address.substrateToEth(seller.address);
    const sellerCross = helper.ethCrossAccount.fromKeyringPair(seller);
    const result = await collection.methods.mintCross(sellerCross, []).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;
    await helper.nft.approveToken(seller, collectionId, tokenId, {Ethereum: market.options.address}, 1n);

    await helper.eth.sendEVM(seller, market.options.address, market.methods.put(collectionId, tokenId, PRICE, 1, sellerCross).encodeABI(), '0');
    let ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(sellerCross.eth);
    expect(substrateAddressToHex(ownerCross.sub, web3)).to.be.eq(substrateAddressToHex(sellerCross.sub, web3));

    const [buyer] = await helper.arrange.createAccounts([600n], donor);
    const buyerMirror = helper.address.substrateToEth(buyer.address);
    const buyerCross = helper.ethCrossAccount.fromKeyringPair(buyer);
    await helper.eth.transferBalanceFromSubstrate(donor, buyerMirror, 1n);
    //TODO: change balance check to helper.balance.getSubstrate when implementation of sendMoney will be fixed in contract
    const sellerBalance = BigInt(await web3.eth.getBalance(sellerMirror));
    await helper.eth.sendEVM(buyer, market.options.address, market.methods.buy(collectionId, tokenId, 1, buyerCross).encodeABI(), PRICE.toString());
    const sellerBalanceAfterBuy = BigInt(await web3.eth.getBalance(sellerMirror));
    ownerCross = await collection.methods.ownerOfCross(tokenId).call();
    expect(ownerCross.eth).to.be.eq(buyerCross.eth);
    expect(substrateAddressToHex(ownerCross.sub, web3)).to.be.eq(substrateAddressToHex(buyerCross.sub, web3));
    expect(sellerBalance + PRICE).to.be.equal(sellerBalanceAfterBuy);
  });
});
