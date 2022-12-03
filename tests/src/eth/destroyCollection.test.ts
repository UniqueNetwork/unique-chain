// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {IKeyringPair} from '@polkadot/types/types';
import {Pallets} from '../util';
import {expect, itEth, usingEthPlaygrounds} from './util';

describe('Destroy Collection from EVM', function() {
  let donor: IKeyringPair;
  const testCases = [
    {method: 'createRFTCollection' as const, params: ['Limits', 'absolutely anything', 'OLF'], requiredPallets: [Pallets.ReFungible]},
    {method: 'createNFTCollection' as const, params: ['Limits', 'absolutely anything', 'OLF'], requiredPallets: [Pallets.NFT]},
    {method: 'createFTCollection' as const, params: ['Limits', 'absolutely anything', 'OLF', 18], requiredPallets: [Pallets.Fungible]},
  ];

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  testCases.map((testCase) => 
    itEth.ifWithPallets(`(!negative test!) ${testCase.method}`, testCase.requiredPallets, async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const signer = await helper.eth.createAccountWithBalance(donor);
      
      const unexistedCollection = helper.ethAddress.fromCollectionId(1000000);
      
      const collectionHelpers = helper.ethNativeContract.collectionHelpers(signer);
      const {collectionAddress} = await helper.eth.createCollecion(testCase.method, owner, ...testCase.params as [string, string, string, number?]);

      // cannot burn collec
      await expect(collectionHelpers.methods
        .destroyCollection(collectionAddress)
        .send({from: signer})).to.be.rejected;
      
      await expect(collectionHelpers.methods
        .destroyCollection(unexistedCollection)
        .send({from: signer})).to.be.rejected;
      
      expect(await collectionHelpers.methods
        .isCollectionExist(unexistedCollection)
        .call()).to.be.false;
      
      expect(await collectionHelpers.methods
        .isCollectionExist(collectionAddress)
        .call()).to.be.true;
    }));
});
