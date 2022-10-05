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
import {expect, itSub, Pallets, usingPlaygrounds} from './util/playgrounds';


describe('integration test: ext. burnItem():', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Burn item in NFT collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);

    await token.burn(alice);
    expect(await token.doesExist()).to.be.false;
  });

  itSub('Burn item in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {}, 10);
    await collection.mint(alice, 10n);

    await collection.burnTokens(alice, 1n);
    expect(await collection.getBalance({Substrate: alice.address})).to.eq(9n);
  });

  itSub.ifWithPallets('Burn item in ReFungible collection', [Pallets.ReFungible], async function({helper}) {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);

    await token.burn(alice, 90n);
    expect(await token.getBalance({Substrate: alice.address})).to.eq(10n);

    await token.burn(alice, 10n);
    expect(await token.getBalance({Substrate: alice.address})).to.eq(0n);
  });

  itSub.ifWithPallets('Burn owned portion of item in ReFungible collection', [Pallets.ReFungible], async function({helper}) {
    const collection = await helper.rft.mintCollection(alice);
    const token = await collection.mintToken(alice, 100n);

    await token.transfer(alice, {Substrate: bob.address}, 1n);

    expect(await token.getBalance({Substrate: alice.address})).to.eq(99n);
    expect(await token.getBalance({Substrate: bob.address})).to.eq(1n);

    await token.burn(bob, 1n);

    expect(await token.getBalance({Substrate: alice.address})).to.eq(99n);
    expect(await token.getBalance({Substrate: bob.address})).to.eq(0n);
  });
});

describe('integration test: ext. burnItem() with admin permissions:', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Burn item in NFT collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const token = await collection.mintToken(alice);

    await token.burnFrom(bob, {Substrate: alice.address});
    expect(await token.doesExist()).to.be.false;
  });

  itSub('Burn item in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {}, 0);
    await collection.setLimits(alice, {ownerCanTransfer: true});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await collection.mint(alice, 10n);

    await collection.burnTokensFrom(bob, {Substrate: alice.address}, 1n);
    expect(await collection.getBalance({Substrate: alice.address})).to.eq(9n);
  });

  itSub.ifWithPallets('Burn item in ReFungible collection', [Pallets.ReFungible], async function({helper}) {
    const collection = await helper.rft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const token = await collection.mintToken(alice, 100n);

    await token.burnFrom(bob, {Substrate: alice.address}, 100n);
    expect(await token.doesExist()).to.be.false;
  });
});

describe('Negative integration test: ext. burnItem():', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Burn a token that was never created', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    await expect(collection.burnToken(alice, 10)).to.be.rejectedWith('common.TokenNotFound');
  });

  itSub('Burn a token using the address that does not own it', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);

    await expect(token.burn(bob)).to.be.rejectedWith('common.NoPermission');
  });

  itSub('Transfer a burned token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await token.burn(alice);

    await expect(token.transfer(alice, {Substrate: bob.address})).to.be.rejectedWith('common.TokenNotFound');
  });

  itSub('Burn more than owned in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {}, 0);
    await collection.mint(alice, 10n);

    await expect(collection.burnTokens(alice, 11n)).to.be.rejectedWith('common.TokenValueTooLow');
    expect(await collection.getBalance({Substrate: alice.address})).to.eq(10n);
  });
});
