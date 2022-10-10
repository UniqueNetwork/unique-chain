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
import {Pallets, requirePalletsOrSkip} from '../util/playgrounds';
import {expect, itEth, usingEthPlaygrounds} from './util/playgrounds';


describe('Destroy Collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible, Pallets.NFT]);
      donor = privateKey('//Alice');
    });
  });

  
  itEth('(!negative test!) RFT', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const signer = await helper.eth.createAccountWithBalance(donor);
    
    const unexistedCollection = helper.ethAddress.fromCollectionId(1000000);
    
    const {collectionAddress} = await helper.eth.createRefungibleCollection(owner, 'Limits', 'absolutely anything', 'OLF');
    const collectionHelper = helper.ethNativeContract.collectionHelpers(signer);
    
    await expect(collectionHelper.methods
      .destroyCollection(collectionAddress)
      .send({from: signer})).to.be.rejected;
    
    await expect(collectionHelper.methods
      .destroyCollection(unexistedCollection)
      .send({from: signer})).to.be.rejected;
    
    expect(await collectionHelper.methods
      .isCollectionExist(unexistedCollection)
      .call()).to.be.false;
  });
  
  itEth('(!negative test!) NFT', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const signer = await helper.eth.createAccountWithBalance(donor);
    
    const unexistedCollection = helper.ethAddress.fromCollectionId(1000000);
    
    const {collectionAddress} = await helper.eth.createNonfungibleCollection(owner, 'Limits', 'absolutely anything', 'OLF');
    const collectionHelper = helper.ethNativeContract.collectionHelpers(signer);
    
    await expect(collectionHelper.methods
      .destroyCollection(collectionAddress)
      .send({from: signer})).to.be.rejected;
    
    await expect(collectionHelper.methods
      .destroyCollection(unexistedCollection)
      .send({from: signer})).to.be.rejected;
    
    expect(await collectionHelper.methods
      .isCollectionExist(unexistedCollection)
      .call()).to.be.false;
  });
});
