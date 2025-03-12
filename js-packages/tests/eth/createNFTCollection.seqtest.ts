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

import type {IKeyringPair} from '@polkadot/types/types';
import {waitParams, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';


describe('Create NFT collection from EVM', () => {
  let donor: IKeyringPair;

  before(async function () {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
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
    const {collectionId, collectionAddress, events} = await helper.eth.createNFTCollection(owner, name, description, prefix);

    expect(events).to.be.deep.equal({
      'CollectionCreated': {
        address: '0x6C4E9fE1AE37a41E93CEE429e8E1881aBdcbb54F',
        event: 'CollectionCreated',
        args: {
          owner: owner.address,
          collectionId: collectionAddress,
        },
      },
    });

    const collectionCountAfter = +(await helper.callRpc('api.rpc.unique.collectionStats')).created;

    const collection = helper.nft.getCollectionObject(collectionId);
    const data = (await collection.getData())!;

    expect(collectionCountAfter - collectionCountBefore).to.be.eq(1);
    expect(collectionId).to.be.eq(collectionCountAfter);
    expect(data.name).to.be.eq(name);
    expect(data.description).to.be.eq(description);
    expect(data.raw.tokenPrefix).to.be.eq(prefix);
    expect(data.raw.mode).to.be.eq('NFT');

    const options = await collection.getOptions();
    expect(options.tokenPropertyPermissions).to.be.empty;
  });

  // this test will occasionally fail when in async environment.
  itEth('Check collection address exist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const expectedCollectionId = +(await helper.callRpc('api.rpc.unique.collectionStats')).created + 1;
    const expectedCollectionAddress = helper.ethAddress.fromCollectionId(expectedCollectionId);
    const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);

    expect(await collectionHelpers.isCollectionExist.staticCall(expectedCollectionAddress)).to.be.false;

    await (
      await collectionHelpers
        .createNFTCollection
        .send('A', 'A', 'A', {value: 2n * helper.balance.getOneTokenNominal()})
    ).wait(...waitParams);

    expect(await collectionHelpers.isCollectionExist.staticCall(expectedCollectionAddress)).to.be.true;
  });
});
