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

import {expect} from 'chai';
import {getCreatedCollectionCount, getDetailedCollectionInfo} from '../util/helpers';
import {collectionIdFromAddress, contractHelpers, createEthAccountWithBalance, itWeb3} from './util/helpers';

describe.only('Create collection from EVM', () => {
  itWeb3('Create collection', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const helpers = contractHelpers(web3, owner);
    const collectionName = 'CollectionEVM';
    const description = 'Some description';
    const tokenPrefix = 'token prefix';
  
    const collectionCountBefore = await getCreatedCollectionCount(api);
    const result = await helpers.methods
      .create721Collection(collectionName, description, tokenPrefix)
      .send();
    const collectionCountAfter = await getCreatedCollectionCount(api);
  
    const collectionId = collectionIdFromAddress(result.events[0].raw.topics[2]);
    expect(collectionCountAfter - collectionCountBefore).to.be.eq(1);
    expect(collectionId).to.be.eq(collectionCountAfter);
      
    const collection = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collection.name.map(v => String.fromCharCode(v.toNumber())).join('')).to.be.eq(collectionName);
    expect(collection.description.map(v => String.fromCharCode(v.toNumber())).join('')).to.be.eq(description);
    expect(collection.tokenPrefix.toHuman()).to.be.eq(tokenPrefix);
    expect(collection.schemaVersion.type).to.be.eq('ImageURL');
  });
});