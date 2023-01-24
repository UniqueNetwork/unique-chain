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

describe('Refungible: burn', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);

      donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 10n], donor);
    });
  });

  itSub('can burn some pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);
    expect(await collection.doesTokenExist(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(100n);
    await token.burn(alice, 99n);
    expect(await collection.doesTokenExist(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(1n);
  });

  itSub('can burn all pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);

    expect(await collection.doesTokenExist(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(100n);

    await token.burn(alice, 100n);
    expect(await collection.doesTokenExist(token.tokenId)).to.be.false;
  });

  itSub('burn pieces for multiple users', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const token = await collection.mintToken(alice, 100n);

    await token.transfer(alice, {Substrate: bob.address}, 60n);

    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(40n);
    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(60n);

    await token.burn(alice, 40n);

    expect(await collection.doesTokenExist(token.tokenId)).to.be.true;
    expect(await token.getBalance({Substrate: alice.address})).to.be.equal(0n);

    await token.burn(bob, 59n);

    expect(await token.getBalance({Substrate: bob.address})).to.be.equal(1n);
    expect(await collection.doesTokenExist(token.tokenId)).to.be.true;

    await token.burn(bob, 1n);

    expect(await collection.doesTokenExist(token.tokenId)).to.be.false;
  });

  itSub('burn pieces by admin', async function({helper}) {
    const collection = await helper.rft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const token = await collection.mintToken(alice, 100n);

    await token.burnFrom(bob, {Substrate: alice.address}, 100n);
    expect(await token.doesExist()).to.be.false;
  });
});

describe('Refungible: burn negative tests', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
      donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('cannot burn non-owned token pieces', async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice);
    const aliceToken = await collection.mintToken(alice, 10n, {Substrate: alice.address});
    const bobToken = await collection.mintToken(alice, 10n, {Substrate: bob.address});

    // 1. Cannot burn non-owned token:
    await expect(bobToken.burn(alice, 0n)).to.be.rejectedWith('common.TokenValueTooLow');
    await expect(bobToken.burn(alice, 5n)).to.be.rejectedWith('common.TokenValueTooLow');
    // 2. Cannot burn non-existing token:
    await expect(helper.rft.burnToken(alice, 99999, 10)).to.be.rejectedWith('common.CollectionNotFound');
    await expect(helper.rft.burnToken(alice, collection.collectionId, 99999)).to.be.rejectedWith('common.TokenValueTooLow');
    // 3. Can burn zero amount of owned tokens (EIP-20)
    await aliceToken.burn(alice, 0n);

    // 4. Storage is not corrupted:
    expect(await aliceToken.getTop10Owners()).to.deep.eq([{Substrate: alice.address}]);
    expect(await bobToken.getTop10Owners()).to.deep.eq([{Substrate: bob.address}]);

    // 4.1 Tokens can be transfered:
    await aliceToken.transfer(alice, {Substrate: bob.address}, 10n);
    await bobToken.transfer(bob, {Substrate: alice.address}, 10n);
    expect(await aliceToken.getTop10Owners()).to.deep.eq([{Substrate: bob.address}]);
    expect(await bobToken.getTop10Owners()).to.deep.eq([{Substrate: alice.address}]);
  });
});
