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
import {itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds, expect} from '../../util';

describe('integration test: Refungible functionality:', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 10n], donor);
    });
  });

  itSub('Repartition', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);

    expect(await token.repartition(alice, 200n)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(200n);
    expect(await token.getTotalPieces()).to.be.equal(200n);

    expect(await token.transfer(alice, {Substrate: bob.address}, 110n)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(90n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(110n);

    await expect(token.repartition(alice, 80n))
      .to.eventually.be.rejectedWith(/refungible\.RepartitionWhileNotOwningAllPieces/);

    expect(await token.transfer(alice, {Substrate: bob.address}, 90n)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(0n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(200n);

    expect(await token.repartition(bob, 150n)).to.be.true;
    await expect(token.transfer(bob, {Substrate: alice.address}, 160n))
      .to.eventually.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub('Repartition with increased amount', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    await token.repartition(alice, 200n);
    const chainEvents = helper.chainLog.slice(-1)[0].events;
    const event = chainEvents?.find(helper.getApi().events.common.ItemCreated.is);
    expect(event?.eq({
      section: 'common',
      method: 'ItemCreated',
      index: [66, 2],
      data: [
        collection.collectionId,
        token.tokenId,
        {substrate: alice.address},
        100,
      ],
    })).to.be.true;
  });

  itSub('Repartition with decreased amount', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    await token.repartition(alice, 50n);
    const chainEvents = helper.chainLog.slice(-1)[0].events;
    const event = chainEvents?.find(helper.getApi().events.common.ItemDestroyed.is);
    expect(event?.eq({
      section: 'common',
      method: 'ItemDestroyed',
      index: [66, 3],
      data: [
        collection.collectionId,
        token.tokenId,
        {substrate: alice.address},
        50,
      ],
    })).to.be.true;
  });
});

