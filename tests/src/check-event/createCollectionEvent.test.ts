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
import {usingPlaygrounds, itSub, expect} from '../util/playgrounds';
import {IEvent} from '../util/playgrounds/types';

describe('Create collection event ', () => {
  let alice: IKeyringPair;
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });
  itSub('Check event from createCollection(): ', async ({helper}) => {
    await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const event = helper.chainLog[helper.chainLog.length - 1].events as IEvent[];
    const eventStrings = event.map(e => `${e.section}.${e.method}`);

    expect(eventStrings).to.contains('common.CollectionCreated');
    expect(eventStrings).to.contains('treasury.Deposit');
    expect(eventStrings).to.contains('system.ExtrinsicSuccess');
  });
});
