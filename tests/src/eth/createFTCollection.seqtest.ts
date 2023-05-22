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
import {Pallets, requirePalletsOrSkip} from '../util';
import {expect, itEth, usingEthPlaygrounds} from './util';

const DECIMALS = 18;

describe.only('Create FT collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Fungible]);
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Create collection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const name = 'CollectionEVM';
    const description = 'Some description';
    const prefix = 'token prefix';

    // todo:playgrounds this might fail when in async environment.
    const collectionCountBefore = +(await helper.callRpc('api.rpc.unique.collectionStats')).created;

    const {collectionId} = await helper.eth.createFungibleCollection(owner, name, DECIMALS, description, prefix);

    const collectionCountAfter = +(await helper.callRpc('api.rpc.unique.collectionStats')).created;
    const data = (await helper.ft.getData(collectionId))!;

    expect(collectionCountAfter - collectionCountBefore).to.be.eq(1);
    expect(collectionId).to.be.eq(collectionCountAfter);
    expect(data.name).to.be.eq(name);
    expect(data.description).to.be.eq(description);
    expect(data.raw.tokenPrefix).to.be.eq(prefix);
    expect(data.raw.mode).to.be.deep.eq({Fungible: DECIMALS.toString()});
  });

  // todo:playgrounds this test will fail when in async environment.
  itEth('Check collection address exist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const expectedCollectionId = +(await helper.callRpc('api.rpc.unique.collectionStats')).created + 1;
    const expectedCollectionAddress = helper.ethAddress.fromCollectionId(expectedCollectionId);
    const collectionHelpers = await helper.ethNativeContract.collectionHelpers(owner);

    expect(await collectionHelpers.methods
      .isCollectionExist(expectedCollectionAddress)
      .call()).to.be.false;


    await helper.eth.createFungibleCollection(owner, 'A', DECIMALS, 'A', 'A');


    expect(await collectionHelpers.methods
      .isCollectionExist(expectedCollectionAddress)
      .call()).to.be.true;
  });
});
