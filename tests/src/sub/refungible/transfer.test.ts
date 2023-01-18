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

describe('Refungible transfer tests', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itSub('Can transfer token pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);

    expect(await token.transfer(alice, {Substrate: bob.address}, 60n)).to.be.true;
    // 1. Can transfer less or equal than have:
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(40n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(60n);
  });

  itSub('Cannot transfer incorrect amount of token pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const tokenAlice = await collection.mintToken(alice, 10n, {Substrate: alice.address});
    const tokenBob = await collection.mintToken(alice, 10n, {Substrate: bob.address});

    // 1. Alice cannot transfer Bob's token:
    await expect(tokenBob.transfer(alice, {Substrate: charlie.address}, 0n)).to.be.rejectedWith('common.TokenValueTooLow');
    await expect(tokenBob.transfer(alice, {Substrate: charlie.address}, 1n)).to.be.rejectedWith('common.TokenValueTooLow');
    await expect(tokenBob.transfer(alice, {Substrate: charlie.address}, 10n)).to.be.rejectedWith('common.TokenValueTooLow');
    await expect(tokenBob.transfer(alice, {Substrate: charlie.address}, 100n)).to.be.rejectedWith('common.TokenValueTooLow');

    // 2. Alice cannot transfer non-existing token:
    await expect(collection.transferToken(alice, 100, {Substrate: charlie.address}, 0n)).to.be.rejectedWith('common.TokenValueTooLow');
    await expect(collection.transferToken(alice, 100, {Substrate: charlie.address}, 1n)).to.be.rejectedWith('common.TokenValueTooLow');

    // 3. Cannot transfer more than have:
    await expect(tokenAlice.transfer(alice, {Substrate: bob.address}, 11n))
      .to.eventually.be.rejectedWith(/common\.TokenValueTooLow/);

    // 4. Zero transfer allowed (EIP-20):
    await tokenAlice.transfer(alice, {Substrate: charlie.address}, 0n);

    expect(await tokenAlice.getTop10Owners()).to.deep.eq([{Substrate: alice.address}]);
    expect(await tokenBob.getTop10Owners()).to.deep.eq([{Substrate: bob.address}]);
    expect(await tokenAlice.getBalance({Substrate: alice.address})).to.eq(10n);
    expect(await tokenBob.getBalance({Substrate: bob.address})).to.eq(10n);
    expect(await tokenBob.getBalance({Substrate: charlie.address})).to.eq(0n);
  });
});