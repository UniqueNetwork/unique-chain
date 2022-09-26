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

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setchainlimits
import {IKeyringPair} from '@polkadot/types/types';
import {executeTransaction} from '../substrate/substrate-api';
import {uniqueEventMessage, normalizeAccountId} from '../util/helpers';
import {usingPlaygrounds, itSub, expect} from '../util/playgrounds';

describe('Create Multiple Items Event event ', () => {
  let alice: IKeyringPair;
  const checkSection = 'ItemCreated';
  const checkTreasury = 'Deposit';
  const checkSystem = 'ExtrinsicSuccess';
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });
  itSub('Check event from createMultipleItems(): ', async ({helper}) => {
    const {collectionId} = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const args = [{NFT: {}}, {NFT: {}}, {NFT: {}}];
    const createMultipleItemsTx = helper.api!.tx.unique.createMultipleItems(collectionId, normalizeAccountId(alice.address), args);
    const events = await executeTransaction(helper.api!, alice, createMultipleItemsTx);
    const msg = JSON.stringify(uniqueEventMessage(events));
    expect(msg).to.be.contain(checkSection);
    expect(msg).to.be.contain(checkTreasury);
    expect(msg).to.be.contain(checkSystem);
  });
});
