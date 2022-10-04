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
import {getEventMessage} from '../util/helpers';
import {usingPlaygrounds, expect, itSub} from '../util/playgrounds';


describe('Burn Item event ', () => {
  let alice: IKeyringPair;
  const checkSection = 'ItemDestroyed';
  const checkTreasury = 'Deposit';
  const checkSystem = 'ExtrinsicSuccess';
  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });
  itSub('Check event from burnItem(): ', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, {Substrate: alice.address});
    await token.burn(alice);

    const msg = JSON.stringify(getEventMessage(helper.chainLog[helper.chainLog.length - 1].events));
    expect(msg).to.be.contain(checkSection);
    expect(msg).to.be.contain(checkTreasury);
    expect(msg).to.be.contain(checkSystem);
  });
});
