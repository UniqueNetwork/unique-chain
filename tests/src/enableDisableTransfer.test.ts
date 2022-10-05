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
import {itSub, usingPlaygrounds, expect} from './util/playgrounds';

describe('Enable/Disable Transfers', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('User can transfer token with enabled transfer flag', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
      limits: {
        transfersEnabled: true,
      },
    });
    const token = await collection.mintToken(alice, {Substrate: alice.address});
    await token.transfer(alice, {Substrate: bob.address});
    expect(await token.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSub('User can\'n transfer token with disabled transfer flag', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
      limits: {
        transfersEnabled: false,
      },
    });
    const token = await collection.mintToken(alice, {Substrate: alice.address});
    await expect(token.transfer(alice, {Substrate: bob.address})).to.be.rejectedWith(/common\.TransferNotAllowed/);
  });
});

describe('Negative Enable/Disable Transfers', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Non-owner cannot change transfer flag', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
      limits: {
        transfersEnabled: true,
      },
    });

    await expect(collection.setLimits(bob, {transfersEnabled: false})).to.be.rejectedWith(/common\.NoPermission/);
  });
});
