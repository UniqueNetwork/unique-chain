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

  itEth('Deploy', async ({helper}) => {
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);

    await deployMarket(helper, marketOwner);
  });

  itEth('Put + Buy', async ({helper}) => {
    const marketOwner = await helper.eth.createAccountWithBalance(donor, 600n);
    const sellerCross = await helper.ethCrossAccount.createAccountWithBalance(donor, 600n);
    const {collectionId, collectionAddress} = await helper.eth.createNFTCollection(marketOwner, 'Sponsor', 'absolutely anything', 'ROC');
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', marketOwner);
    const result = await contract.methods.mint(sellerCross.eth).send();
    const tokenId = result.events.Transfer.returnValues.tokenId;

    const market = await deployMarket(helper, marketOwner);

    await contract.methods.approve(market.options.address, tokenId).send({from: sellerCross.eth});
    const putResult = await market.methods.put(collectionId, tokenId, 1, 1, sellerCross).send({from: sellerCross.eth});
    expect(putResult.events.TokenIsUpForSale).is.not.undefined;

    const buyerCross = await helper.ethCrossAccount.createAccountWithBalance(donor, 600n);
    const buyResult = await market.methods.buy(collectionId, tokenId, 1, buyerCross).send({from: buyerCross.eth, value: 1});
    expect(buyResult.events.TokenIsPurchased).is.not.undefined;
  });
});
