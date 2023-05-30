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
import {itEth, usingEthPlaygrounds} from '../util';
import {makeNames} from '../../util';

const {dirname} = makeNames(import.meta.url);

describe('Market V2 Contract', () => {
  let donor: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Deploy', async ({helper}) => {
    const matcherOwner = await helper.eth.createAccountWithBalance(donor, 600n);

    await helper.ethContract.deployByCode(
      matcherOwner,
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
  });
});
